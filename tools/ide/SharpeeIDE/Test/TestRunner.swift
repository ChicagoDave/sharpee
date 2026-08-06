// TestRunner.swift
// Owns a single child `sharpee test … --json` process (ADR-277 D1/D2): spawns
// it with the same resolution as builds (workspace shim, else login-shell
// PATH), line-buffers its NDJSON stdout (chunks do not align with line
// boundaries), decodes each complete line as it arrives so the Tests panel
// fills live, and supports graceful cancel (SIGTERM, escalating to SIGKILL
// after 2s) — a cancelled run keeps every record already decoded. A
// schemaVersion mismatch is surfaced once and stops decoding (the "IDE is out
// of date" state), never a partial decode.
// Public interface: TestRunner.runAll(storyFile:), runChain(storyFile:),
// runFile(storyFile:transcript:), start(executable:arguments:...), cancel(),
// state, delegate.
// Owner context: tools/ide — Test.

import Foundation

@MainActor
protocol TestRunnerDelegate: AnyObject {
    /// One complete NDJSON line, verbatim, in stream order — delivered BEFORE
    /// it is decoded and whether or not the decode succeeds.
    ///
    /// This is the Testing tab's feed (ADR-301 D1): the tab is a TypeScript
    /// consumer that imports the wire contract directly, so handing it the raw
    /// line is what removes the Swift mirror from its path entirely. Decoding
    /// continues alongside for the Swift consumers that have no such option
    /// (Skein replay, re-bless). Has a default no-op — most delegates want the
    /// decoded record.
    func runner(_ runner: TestRunner, didReceiveLine line: String)
    /// One decoded NDJSON record, in stream order.
    func runner(_ runner: TestRunner, didDecode record: TestResultRecord)
    /// The stream stopped decoding (schema mismatch or malformed line).
    /// Fires at most once per run; subsequent lines are dropped.
    func runner(_ runner: TestRunner, didFailDecode error: Error)
    /// A chunk of UTF-8 stderr (diagnostics, validation detail).
    func runner(_ runner: TestRunner, didEmitStderr text: String)
    /// The runner's state changed (drives buttons and the status line).
    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State)
    /// The run finished (passed, failed, or cancelled).
    func runner(_ runner: TestRunner, didExit result: TestRunner.Result)
}

extension TestRunnerDelegate {
    func runner(_ runner: TestRunner, didReceiveLine line: String) {}
}

@MainActor
final class TestRunner {

    enum State: Equatable { case idle, running, passed, failed, cancelled }

    /// The terminal outcome reported via `didExit`.
    struct Result: Equatable {
        let state: State
        /// Process exit status (0 pass, 1 fail/error, 3 load error; signal otherwise).
        let exitCode: Int32
    }

    /// Seconds to wait after SIGTERM before escalating to SIGKILL.
    private static let killGracePeriod: TimeInterval = 2.0

    weak var delegate: TestRunnerDelegate?

    private(set) var state: State = .idle {
        didSet {
            guard state != oldValue else { return }
            delegate?.runner(self, didChangeState: state)
        }
    }

    var isRunning: Bool { state == .running }

    private var process: Process?
    private var killTimer: Timer?
    private var didRequestCancel = false
    private var lineBuffer = NDJSONLineBuffer()
    /// Set on the first decode failure — the stream contract is broken (or
    /// from a future toolchain); remaining lines are dropped, not guessed at.
    private var decodingStopped = false

    // MARK: - Production entries (ADR-277 D2/D3)

    /// Run every transcript under the story's `tests/` subtree.
    func runAll(storyFile: URL) {
        startSharpee(storyFile: storyFile, extraArguments: [])
    }

    /// Run the story's `walkthroughs/` chain (filename order, state persists —
    /// D3: `--chain` with no explicit files IS the chain request).
    func runChain(storyFile: URL) {
        startSharpee(storyFile: storyFile, extraArguments: ["--chain"])
    }

    /// Run the story's transcripts as a TREE (ADR-302): `continues:` parentage
    /// is resolved, a shared prefix is re-executed for each sibling, and a node
    /// whose ancestor failed is reported `unreached` rather than skipped.
    func runTree(storyFile: URL) {
        startSharpee(storyFile: storyFile, extraArguments: ["--tree"])
    }

    /// Run one `.transcript` file against the story.
    func runFile(storyFile: URL, transcript: URL) {
        startSharpee(storyFile: storyFile, extraArguments: [transcript.path])
    }

    /// Shared production spawn: `sharpee test <file>.story … --json` with the
    /// build/compose executable resolution (workspace shim, else PATH; never
    /// node_modules). A miss surfaces as an explicit failure with a hint.
    private func startSharpee(storyFile: URL, extraArguments: [String]) {
        guard let sharpee = ComposeRunner.resolveSharpee(near: storyFile) else {
            delegate?.runner(self, didEmitStderr:
                "sharpee not found — install the Sharpee CLI (or open a story inside a Sharpee checkout) to run tests.\n")
            state = .failed
            delegate?.runner(self, didExit: Result(state: .failed, exitCode: -1))
            return
        }
        start(executable: sharpee,
              arguments: ["test", storyFile.path] + extraArguments + ["--json"],
              workingDirectory: storyFile.deletingLastPathComponent(),
              environment: ShellEnvironment.buildEnvironment())
    }

    // MARK: - Spawn

    /// Spawns an arbitrary executable. This is the production spawn path; the
    /// sharpee overloads delegate here, and tests drive it directly with the
    /// real devkit CLI so the Process/pipe/line-decode machinery is exercised.
    func start(executable: URL, arguments: [String], workingDirectory: URL,
               environment: [String: String]? = nil) {
        guard !isRunning else {
            assertionFailure("TestRunner.start called while a run is already in flight")
            return
        }
        didRequestCancel = false
        decodingStopped = false
        lineBuffer = NDJSONLineBuffer()

        let proc = Process()
        proc.executableURL = executable
        proc.arguments = arguments
        proc.currentDirectoryURL = workingDirectory
        if let environment { proc.environment = environment }

        let outPipe = Pipe()
        let errPipe = Pipe()
        proc.standardOutput = outPipe
        proc.standardError = errPipe

        // stdout: NDJSON records. Chunks hop to the main actor and pass through
        // the line buffer there — enqueue order on one actor preserves stream
        // order (the BuildRunner pattern).
        outPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            Task { @MainActor [weak self] in
                self?.consumeStdout(data)
            }
        }
        // stderr: human diagnostics, forwarded as text.
        errPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.delegate?.runner(self, didEmitStderr: text)
            }
        }

        proc.terminationHandler = { [weak self] finished in
            // Stop streaming, then drain any buffered tail so no record is lost
            // between the last readabilityHandler call and exit.
            outPipe.fileHandleForReading.readabilityHandler = nil
            errPipe.fileHandleForReading.readabilityHandler = nil
            let tailOut = (try? outPipe.fileHandleForReading.readToEnd()) ?? Data()
            let tailErr = (try? errPipe.fileHandleForReading.readToEnd()) ?? Data()
            let errText = String(data: tailErr, encoding: .utf8) ?? ""
            Task { @MainActor [weak self] in
                guard let self else { return }
                if !tailOut.isEmpty { self.consumeStdout(tailOut) }
                // A well-formed stream ends newline-terminated; flush defends
                // against a truncated final line (decode failure, reported).
                if let last = self.lineBuffer.flush() { self.decodeLine(last) }
                if !errText.isEmpty { self.delegate?.runner(self, didEmitStderr: errText) }
                self.handleTermination(of: finished)
            }
        }

        process = proc
        state = .running

        do {
            try proc.run()
        } catch {
            outPipe.fileHandleForReading.readabilityHandler = nil
            errPipe.fileHandleForReading.readabilityHandler = nil
            proc.terminationHandler = nil
            process = nil
            delegate?.runner(self, didEmitStderr: "Failed to launch test run: \(error.localizedDescription)\n")
            state = .failed
            delegate?.runner(self, didExit: Result(state: .failed, exitCode: -1))
        }
    }

    // MARK: - Cancel

    /// Requests cancellation of the running tests: SIGTERM now, SIGKILL after a
    /// grace period if it hasn't exited. Records already decoded are kept — the
    /// panel shows the run up to the cancel point. No-op when not running.
    func cancel() {
        guard isRunning, let proc = process else { return }
        didRequestCancel = true
        proc.terminate() // SIGTERM

        killTimer?.invalidate()
        killTimer = Timer.scheduledTimer(withTimeInterval: Self.killGracePeriod, repeats: false) { _ in
            Task { @MainActor [weak self] in
                guard let self, let proc = self.process, proc.isRunning else { return }
                kill(proc.processIdentifier, SIGKILL)
            }
        }
    }

    // MARK: - Decode

    private func consumeStdout(_ chunk: Data) {
        for line in lineBuffer.append(chunk) {
            decodeLine(line)
        }
    }

    private func decodeLine(_ line: Data) {
        // The raw line goes out first and unconditionally: the Testing tab is the
        // consumer that understands the wire best, and a line this Swift mirror
        // cannot decode is exactly the line the tab should still receive.
        if let text = String(data: line, encoding: .utf8) {
            delegate?.runner(self, didReceiveLine: text)
        }
        guard !decodingStopped else { return }
        do {
            let record = try TestResultRecord.decode(line: line)
            delegate?.runner(self, didDecode: record)
        } catch {
            decodingStopped = true
            delegate?.runner(self, didFailDecode: error)
        }
    }

    // MARK: - Termination

    private func handleTermination(of finished: Process) {
        // Ignore stale termination callbacks from a prior process.
        guard finished === process else { return }
        killTimer?.invalidate()
        killTimer = nil

        let code = finished.terminationStatus
        let clean = finished.terminationReason == .exit && code == 0
        process = nil

        let outcome: State = didRequestCancel ? .cancelled : (clean ? .passed : .failed)
        state = outcome
        delegate?.runner(self, didExit: Result(state: outcome, exitCode: code))
    }
}
