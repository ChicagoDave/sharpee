// IntrospectionRunner.swift
// Runs the platform bundle's `--introspect` (ADR-184) as a child process, captures
// its stdout, and decodes the result into a ProjectManifest. Mirrors BuildRunner's
// Process/pipe machinery, but buffers stdout to completion (the manifest is one JSON
// document) rather than streaming. Status text the CLI writes to stderr is captured
// only to enrich a non-zero-exit error.
// Public interface: IntrospectionRunner.introspect(projectDir:completion:).
// Owner context: tools/ide — Project.

import Foundation

@MainActor
final class IntrospectionRunner {

    /// Why an introspection attempt failed.
    enum Failure: Error {
        /// The child process could not be launched.
        case launch(String)
        /// The child exited non-zero; carries the exit code and captured stderr.
        case nonZeroExit(code: Int32, stderr: String)
        /// The child exited 0 but its stdout did not decode as a ProjectManifest.
        case decode(Error)
    }

    typealias Completion = (Result<ProjectManifest, Failure>) -> Void

    private var process: Process?
    /// Held for the duration of a run so the @Sendable terminationHandler invokes it
    /// through `self` on the main actor rather than capturing a non-Sendable closure.
    private var pending: Completion?

    /// Author-mode entry point (ADR-185): run the project's installed `sharpee introspect`
    /// (the `@sharpee/devkit` bin) with the project directory as the working directory. The
    /// bin loads the built story + node_modules platform and emits the manifest. `node` is on
    /// the login-shell PATH the bin's shebang resolves against (via `ShellEnvironment`).
    func introspect(projectDir: URL, completion: @escaping Completion) {
        let bin = projectDir.appendingPathComponent("node_modules/.bin/sharpee")
        run(executable: bin,
            arguments: ["introspect"],
            workingDirectory: projectDir,
            environment: ShellEnvironment.buildEnvironment(),
            completion: completion)
    }

    /// Spawns `executable`, buffers stdout/stderr, and on exit either decodes the
    /// manifest (exit 0) or reports `nonZeroExit`. Tests drive this directly with a
    /// fixture script so the real Process/pipe/decode path is exercised without Node.
    func run(executable: URL, arguments: [String], workingDirectory: URL,
             environment: [String: String]? = nil, completion: @escaping Completion) {
        guard process == nil else {
            assertionFailure("IntrospectionRunner.run called while a run is in flight")
            return
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

        // Buffers, mutated only on the handler/termination threads then handed to
        // the main actor at termination.
        let outBuffer = DataBuffer()
        let errBuffer = DataBuffer()
        outPipe.fileHandleForReading.readabilityHandler = { handle in
            outBuffer.append(handle.availableData)
        }
        errPipe.fileHandleForReading.readabilityHandler = { handle in
            errBuffer.append(handle.availableData)
        }

        proc.terminationHandler = { [weak self] finished in
            outPipe.fileHandleForReading.readabilityHandler = nil
            errPipe.fileHandleForReading.readabilityHandler = nil
            outBuffer.append((try? outPipe.fileHandleForReading.readToEnd()) ?? Data())
            errBuffer.append((try? errPipe.fileHandleForReading.readToEnd()) ?? Data())
            let stdout = outBuffer.data
            let stderr = String(data: errBuffer.data, encoding: .utf8) ?? ""
            let code = finished.terminationStatus
            let clean = finished.terminationReason == .exit && code == 0
            Task { @MainActor [weak self] in
                guard let self, finished === self.process else { return }
                self.process = nil
                let completion = self.pending
                self.pending = nil
                completion?(Self.outcome(clean: clean, code: code, stdout: stdout, stderr: stderr))
            }
        }

        process = proc

        do {
            try proc.run()
        } catch {
            outPipe.fileHandleForReading.readabilityHandler = nil
            errPipe.fileHandleForReading.readabilityHandler = nil
            process = nil
            pending = nil
            completion(.failure(.launch(error.localizedDescription)))
        }
    }

    /// Maps a finished process into a decoded manifest or a typed failure.
    private static func outcome(clean: Bool, code: Int32, stdout: Data,
                                stderr: String) -> Result<ProjectManifest, Failure> {
        guard clean else {
            return .failure(.nonZeroExit(code: code, stderr: stderr))
        }
        do {
            return .success(try ProjectManifest.decode(from: stdout))
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
