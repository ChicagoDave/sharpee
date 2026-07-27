// ComposeRunner.swift
// Runs `sharpee compose <file>.story --json` (ADR-258 D5) as a child process,
// buffers its stdout to completion (the payload is one JSON document), and
// decodes it into a ComposeJsonPayload. Mirrors IntrospectionRunner's
// Process/pipe machinery, with one difference the live-editing loop needs:
// starting a new run supersedes an in-flight one (the old process is terminated
// and its completion dropped) rather than asserting single-flight.
// Exit codes 0 (gate-clean) and 1 (gate errors) BOTH carry a valid payload —
// diagnostics are data here, not process failure.
// Public interface: ComposeRunner.compose(storyFile:completion:),
// run(executable:arguments:workingDirectory:environment:completion:),
// ComposeRunner.resolveSharpee().
// Owner context: tools/ide — Compose.

import Foundation

@MainActor
final class ComposeRunner {

    /// Why a compose attempt failed. Gate errors are NOT failures — they arrive
    /// as diagnostics inside a successful payload.
    enum Failure: Error {
        /// No `sharpee` executable on the login-shell PATH (production resolution, D2/D4).
        case sharpeeNotFound
        /// The child process could not be launched.
        case launch(String)
        /// The child exited outside {0, 1}; carries the exit code and captured stderr.
        case nonZeroExit(code: Int32, stderr: String)
        /// The child exited 0/1 but its stdout did not decode as a payload —
        /// including the loud schemaVersion rejection (D5).
        case decode(Error)
    }

    typealias Completion = (Result<ComposeJsonPayload, Failure>) -> Void

    private var process: Process?
    /// Held for the duration of a run so the @Sendable terminationHandler invokes it
    /// through `self` on the main actor. Dropped when a newer run supersedes it.
    private var pending: Completion?

    /// Production entry point: compose `storyFile` with the PATH-resolved `sharpee`
    /// executable. Fails with `.sharpeeNotFound` when the CLI is not installed —
    /// the IDE never falls back to `node_modules/.bin` (D2).
    func compose(storyFile: URL, completion: @escaping Completion) {
        guard let sharpee = Self.resolveSharpee() else {
            completion(.failure(.sharpeeNotFound))
            return
        }
        run(executable: sharpee,
            arguments: ["compose", storyFile.path, "--json"],
            workingDirectory: storyFile.deletingLastPathComponent(),
            environment: ShellEnvironment.buildEnvironment(),
            completion: completion)
    }

    /// The first executable named `sharpee` on the login-shell PATH, or nil.
    /// Resolved per call — cheap (PATH itself is cached by ShellEnvironment), and
    /// picks up a mid-session install without relaunching the IDE.
    static func resolveSharpee() -> URL? {
        guard let path = ShellEnvironment.buildEnvironment()["PATH"] else { return nil }
        let fm = FileManager.default
        for dir in path.split(separator: ":") {
            let candidate = URL(fileURLWithPath: String(dir)).appendingPathComponent("sharpee")
            if fm.isExecutableFile(atPath: candidate.path) { return candidate }
        }
        return nil
    }

    /// Spawns `executable`, buffers stdout/stderr, and on exit decodes the payload
    /// (exit 0 or 1) or reports `nonZeroExit`. Starting a run while one is in
    /// flight terminates the old process and drops its completion — the newest
    /// source state wins. Tests drive this directly with the real CLI bundle so the
    /// production Process/pipe/decode path is exercised.
    func run(executable: URL, arguments: [String], workingDirectory: URL,
             environment: [String: String]? = nil, completion: @escaping Completion) {
        if let stale = process {
            // Supersede: the stale handler's identity guard (`finished === self.process`)
            // fails once `process` is replaced below, so its completion never fires.
            pending = nil
            stale.terminationHandler = nil
            stale.terminate()
        }
        pending = completion

        let proc = Process()
        proc.executableURL = executable
        proc.arguments = arguments
        proc.currentDirectoryURL = workingDirectory
        if let environment { proc.environment = environment }

        let outPipe = Pipe()
        let errPipe = Pipe()
        proc.standardOutput = outPipe
        proc.standardError = errPipe

        // Blocking EOF reads on background queues — no readabilityHandler, so
        // there is no drain race to lose the tail of a large payload (a full
        // Story IR runs to hundreds of KB). The group completes only when BOTH
        // streams hit EOF (write ends close at process exit) AND the process
        // has reported its termination status.
        let outBuffer = DataBuffer()
        let errBuffer = DataBuffer()
        let group = DispatchGroup()
        group.enter()
        DispatchQueue.global(qos: .userInitiated).async {
            outBuffer.append(outPipe.fileHandleForReading.readDataToEndOfFile())
            group.leave()
        }
        group.enter()
        DispatchQueue.global(qos: .userInitiated).async {
            errBuffer.append(errPipe.fileHandleForReading.readDataToEndOfFile())
            group.leave()
        }

        group.enter() // left by terminationHandler
        proc.terminationHandler = { _ in group.leave() }

        // Notify on the MAIN queue: this closure is MainActor-isolated (it touches
        // self), and dispatching it to a global queue trips the Swift 6 runtime
        // isolation assertion — a SIGTRAP, not a compile error.
        group.notify(queue: .main) { [weak self] in
            // Identity guard FIRST: on the launch-failure path this fires for a
            // never-launched process, whose terminationStatus throws (ObjC).
            guard let self, proc === self.process else { return }
            let stdout = outBuffer.data
            let stderr = String(data: errBuffer.data, encoding: .utf8) ?? ""
            let code = proc.terminationStatus
            let exited = proc.terminationReason == .exit
            self.process = nil
            let completion = self.pending
            self.pending = nil
            completion?(Self.outcome(exited: exited, code: code, stdout: stdout, stderr: stderr))
        }

        process = proc

        do {
            try proc.run()
        } catch {
            // The child never ran: balance the termination enter (its handler
            // will never fire) and close the write ends so the EOF readers
            // unblock — otherwise the group deallocates with a pending enter,
            // which crashes. The identity guard (process is nil'd here) keeps
            // the group's completion from double-firing.
            proc.terminationHandler = nil
            group.leave()
            try? outPipe.fileHandleForWriting.close()
            try? errPipe.fileHandleForWriting.close()
            process = nil
            pending = nil
            completion(.failure(.launch(error.localizedDescription)))
            return
        }
    }

    /// Maps a finished process into a decoded payload or a typed failure.
    /// Exit 0 and exit 1 both decode — 1 means gate errors, which ARE the payload.
    private static func outcome(exited: Bool, code: Int32, stdout: Data,
                                stderr: String) -> Result<ComposeJsonPayload, Failure> {
        guard exited, code == 0 || code == 1 else {
            return .failure(.nonZeroExit(code: code, stderr: stderr))
        }
        do {
            return .success(try ComposeJsonPayload.decode(from: stdout))
        } catch {
            return .failure(.decode(error))
        }
    }
}

/// A tiny thread-safe append-only byte buffer for collecting pipe output off the
/// main actor before handing the bytes back at termination.
private final class DataBuffer: @unchecked Sendable {
    private let lock = NSLock()
    private var storage = Data()

    func append(_ chunk: Data) {
        guard !chunk.isEmpty else { return }
        lock.lock(); storage.append(chunk); lock.unlock()
    }

    var data: Data {
        lock.lock(); defer { lock.unlock() }
        return storage
    }
}
