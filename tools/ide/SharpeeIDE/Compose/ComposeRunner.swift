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
// ComposeRunner.resolveSharpee(), ComposeRunner.resolve(near:searchPATH:bundledResources:).
// Owner context: tools/ide — Compose.

import Foundation

@MainActor
final class ComposeRunner {

    /// Why a compose attempt failed. Gate errors are NOT failures — they arrive
    /// as diagnostics inside a successful payload.
    enum Failure: Error {
        /// No `sharpee` executable from any tier — workspace shim, login-shell
        /// PATH, or the app's own bundled toolchain (ADR-279 D4). With a
        /// vendored toolchain present this is unreachable in a shipped build;
        /// it survives for dev builds assembled without the vendor step.
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

    /// Production entry point: compose `storyFile` with the resolved `sharpee`
    /// executable (workspace shim, else login-shell PATH, else the bundled
    /// toolchain — ADR-279 D4). Fails with `.sharpeeNotFound` when no tier
    /// yields one; the IDE never falls back to `node_modules/.bin` (D2).
    func compose(storyFile: URL, completion: @escaping Completion) {
        guard let sharpee = Self.resolveSharpee(near: storyFile) else {
            completion(.failure(.sharpeeNotFound))
            return
        }
        run(executable: sharpee,
            arguments: ["compose", storyFile.path, "--json"],
            workingDirectory: storyFile.deletingLastPathComponent(),
            environment: ShellEnvironment.buildEnvironment(),
            completion: completion)
    }

    /// The `sharpee` executable to invoke. Resolution order (ADR-279 D4):
    /// 1. When `near` sits inside the Sharpee monorepo, the workspace's own
    ///    `./sharpee` shim (ADR-187: in-repo, the wrapper IS the entry point) —
    ///    an in-repo story must track the LOCAL toolchain build, not whatever
    ///    version a global install happens to be.
    /// 2. Else the first `sharpee` on the login-shell PATH — the globally
    ///    installed `@sharpee/devkit` bin (the shipped author CLI).
    /// 3. Else the toolchain bundled inside the app (ADR-279 D4). Last, not
    ///    first: an author's deliberate global install still wins, and the
    ///    in-repo dev loop still tracks the local build. Tiers 1 and 2 are
    ///    unchanged from ADR-258 D2/Q1.
    /// A `.story` FILE target builds directly either way (no repokit redirect).
    /// Resolved per call — cheap (PATH is cached by ShellEnvironment), and picks
    /// up a mid-session install without relaunch.
    static func resolveSharpee(near: URL? = nil) -> URL? {
        resolve(near: near,
                searchPATH: ShellEnvironment.buildEnvironment()["PATH"],
                bundledResources: Bundle.main.resourceURL)
    }

    /// Resolution over injected inputs — the seam that lets tests pin the
    /// three-tier order (AC6) without mutating the process PATH or packaging
    /// an .app. `resolveSharpee` is this function bound to the live sources.
    ///
    /// - Parameters:
    ///   - near: a story file whose enclosing workspace supplies tier 1, if any.
    ///   - searchPATH: colon-separated directories for tier 2.
    ///   - bundledResources: the app bundle's `Resources` directory for tier 3.
    /// - Returns: the first tier that yields an executable file, else nil.
    static func resolve(near: URL?, searchPATH: String?, bundledResources: URL?) -> URL? {
        if let near, let shim = workspaceShim(near: near) { return shim }
        let fm = FileManager.default
        if let searchPATH {
            for dir in searchPATH.split(separator: ":") {
                let candidate = URL(fileURLWithPath: String(dir)).appendingPathComponent("sharpee")
                if fm.isExecutableFile(atPath: candidate.path) { return candidate }
            }
        }
        return BundledToolchain.executable(resourcesURL: bundledResources)
    }

    /// The enclosing Sharpee workspace's executable `./sharpee` shim, or nil
    /// when `near` is outside the monorepo (or the shim is absent).
    static func workspaceShim(near: URL) -> URL? {
        guard let root = WorkspaceRoot.find(from: near) else { return nil }
        let shim = root.appendingPathComponent("sharpee")
        return FileManager.default.isExecutableFile(atPath: shim.path) ? shim : nil
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
