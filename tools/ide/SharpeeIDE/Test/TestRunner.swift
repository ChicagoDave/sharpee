// TestRunner.swift
// Owns a single child `sharpee test … --json` process (ADR-277 D1/D2): spawns
// it with the same resolution as builds (workspace shim, else login-shell
// PATH), line-buffers its NDJSON stdout (chunks do not align with line
// boundaries), hands each complete line to its delegate as it arrives so the
// Testing tab fills live, and supports graceful cancel (SIGTERM, escalating to
// SIGKILL after 2s) — a cancelled run keeps everything already rendered.
// It does NOT decode: the tab owns the wire (ADR-301 D1), including deciding
// that a line is unreadable.
// Public interface: TestRunner.runTests(storyFile:),
// start(executable:arguments:...), cancel(), state, delegate.
// Owner context: tools/ide — Test.

import Foundation

@MainActor
protocol TestRunnerDelegate: AnyObject {
    /// One complete NDJSON line, verbatim, in stream order.
    ///
    /// The runner does not decode. Its consumer is the Testing tab, a
    /// TypeScript surface that imports the wire contract directly and validates
    /// each line with the wire's own guard (DEVARCH 8b) — a Swift decoder in
    /// front of it could only be a second opinion that drifts.
    func runner(_ runner: TestRunner, didReceiveLine line: String)
    /// A chunk of UTF-8 stderr (diagnostics, validation detail).
    func runner(_ runner: TestRunner, didEmitStderr text: String)
    /// The runner's state changed (drives buttons and the status line).
    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State)
    /// The run finished (passed, failed, or cancelled).
    func runner(_ runner: TestRunner, didExit result: TestRunner.Result)
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

    // MARK: - Production entries (ADR-277 D2/D3)

    /// Run the story's tests. `--tree` (ADR-302) is the ONLY run model the IDE
    /// offers, and this is the only production entry point.
    ///
    /// The two it replaced were not merely redundant, they were wrong here.
    /// Flat `tests` mode runs every transcript standalone from story start, so
    /// each one that `continues:` an ancestor fails for want of the state its
    /// parent builds — measured on `branch-stories/fernhill` 2026-08-06:
    /// **229 passed / 287 failed** flat, against **516 / 0** as a tree, same
    /// suite. And `--chain` scans `walkthroughs/`, which an IDE project does
    /// not have. Tree mode is also correct for a suite with no `continues:` at
    /// all — every transcript is simply a root (verified on
    /// `stories/cloak-of-darkness`, zero parentage, 81 passed).
    ///
    /// `--capture-output` rides along because the tab is an editing surface, not
    /// only a reporting one (go-live Phase 5, R1): promoting what the story said
    /// into an assertion needs the story's words on a PASSING turn, and the
    /// default stream carries `actualOutput` on failures only. The cost is the
    /// full text of every command crossing the wire on a green run, which is the
    /// trade the tab is here to make — the CLI's default is untouched.
    func runTests(storyFile: URL) {
        // Executable resolution is the build/compose one: workspace shim, else
        // PATH, never node_modules. A miss is an explicit failure with a hint,
        // not a silent no-run.
        guard let sharpee = ComposeRunner.resolveSharpee(near: storyFile) else {
            delegate?.runner(self, didEmitStderr:
                "sharpee not found — install the Sharpee CLI (or open a story inside a Sharpee checkout) to run tests.\n")
            state = .failed
            delegate?.runner(self, didExit: Result(state: .failed, exitCode: -1))
            return
        }
        start(executable: sharpee,
              arguments: Self.treeRunArguments(storyPath: storyFile.path),
              workingDirectory: storyFile.deletingLastPathComponent(),
              environment: ShellEnvironment.buildEnvironment())
    }

    /// The argument list a Testing-tab run uses, named rather than inlined so a
    /// test can drive the real CLI with the REAL arguments.
    ///
    /// The alternative — a hand-written list in the test — is how a flag can be
    /// removed from production while every test still passes, because the test
    /// supplies it itself. `--capture-output` is exactly that kind of flag: drop
    /// it and the tab still renders, just with the story's words missing from
    /// every passing turn. `--capture-world` is another: drop it and the
    /// inherited-state header and the per-turn world changes quietly vanish.
    static func treeRunArguments(storyPath: String) -> [String] {
        ["test", storyPath, "--tree", "--capture-output", "--capture-world", "--json"]
    }

    // MARK: - Spawn

    /// Spawns an arbitrary executable. This is the production spawn path; the
    /// sharpee overloads delegate here, and tests drive it directly with the
    /// real devkit CLI so the Process/pipe/line-buffer machinery is exercised.
    func start(executable: URL, arguments: [String], workingDirectory: URL,
               environment: [String: String]? = nil) {
        guard !isRunning else {
            assertionFailure("TestRunner.start called while a run is already in flight")
            return
        }
        didRequestCancel = false
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
                // against a truncated final line, which the tab rejects as
                // unreadable rather than folding.
                if let last = self.lineBuffer.flush() { self.emit(last) }
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
    /// grace period if it has not exited. Lines already delivered are kept — the
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

    // MARK: - Line delivery

    private func consumeStdout(_ chunk: Data) {
        for line in lineBuffer.append(chunk) {
            emit(line)
        }
    }

    private func emit(_ line: Data) {
        guard let text = String(data: line, encoding: .utf8) else { return }
        delegate?.runner(self, didReceiveLine: text)
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
