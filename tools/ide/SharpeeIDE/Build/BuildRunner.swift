// BuildRunner.swift
// Owns a single child `./sharpee build` process: spawns it, streams stdout/stderr to
// a delegate, tracks state (idle→building→success/failure/cancelled), and supports
// graceful cancel (SIGTERM, escalating to SIGKILL after 2s).
// Public interface: BuildRunner.start(settings:repoRoot:), cancel(), state, delegate.
// Owner context: tools/ide — Build.

import Foundation

@MainActor
protocol BuildRunnerDelegate: AnyObject {
    /// A chunk of UTF-8 stdout or stderr from the running build.
    func runner(_ runner: BuildRunner, didEmit text: String)
    /// The runner's state changed (drives the status-bar pill, panel visibility).
    func runner(_ runner: BuildRunner, didChangeState state: BuildRunner.State)
    /// The build finished (success, failure, or cancelled).
    func runner(_ runner: BuildRunner, didExit result: BuildRunner.Result)
}

@MainActor
final class BuildRunner {

    enum State: Equatable { case idle, building, success, failure, cancelled }

    /// The terminal outcome reported via `didExit`.
    struct Result: Equatable {
        let state: State
        /// Process exit status (0 on success; the child's code or signal otherwise).
        let exitCode: Int32
    }

    /// Seconds to wait after SIGTERM before escalating to SIGKILL.
    private static let killGracePeriod: TimeInterval = 2.0

    weak var delegate: BuildRunnerDelegate?

    private(set) var state: State = .idle {
        didSet {
            guard state != oldValue else { return }
            delegate?.runner(self, didChangeState: state)
        }
    }

    var isRunning: Bool { state == .building }

    private var process: Process?
    private var killTimer: Timer?
    private var didRequestCancel = false

    // MARK: - Start

    /// Starts `./sharpee build <args>` in `repoRoot` (the `./sharpee` wrapper lives at the
    /// monorepo root). The wrapper exits non-zero with a message if the devkit engine is
    /// unbuilt — that surfaces through `didEmit` + a `failure` result.
    func start(settings: BuildSettings, repoRoot: URL) {
        start(executable: repoRoot.appendingPathComponent("sharpee"),
              arguments: ["build"] + settings.toArguments(),
              workingDirectory: repoRoot,
              environment: ShellEnvironment.buildEnvironment())
    }

    /// Spawns an arbitrary executable. This is the production spawn path; the
    /// settings-based overload delegates here, and tests drive it directly with a
    /// fixture script so the real Process/pipe/signal machinery is exercised.
    /// `environment` overrides the inherited environment when provided (the settings
    /// path supplies the user's login-shell PATH so `node` is found).
    func start(executable: URL, arguments: [String], workingDirectory: URL,
               environment: [String: String]? = nil) {
        guard !isRunning else {
            assertionFailure("BuildRunner.start called while a build is already running")
            return
        }
        didRequestCancel = false

        let proc = Process()
        proc.executableURL = executable
        proc.arguments = arguments
        proc.currentDirectoryURL = workingDirectory
        if let environment { proc.environment = environment }

        let outPipe = Pipe()
        let errPipe = Pipe()
        proc.standardOutput = outPipe
        proc.standardError = errPipe

        let stream: @Sendable (FileHandle) -> Void = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.delegate?.runner(self, didEmit: text)
            }
        }
        outPipe.fileHandleForReading.readabilityHandler = stream
        errPipe.fileHandleForReading.readabilityHandler = stream

        proc.terminationHandler = { [weak self] finished in
            // Stop streaming, then drain any buffered tail so no output is lost
            // between the last readabilityHandler call and exit.
            outPipe.fileHandleForReading.readabilityHandler = nil
            errPipe.fileHandleForReading.readabilityHandler = nil
            let tailOut = (try? outPipe.fileHandleForReading.readToEnd()) ?? Data()
            let tailErr = (try? errPipe.fileHandleForReading.readToEnd()) ?? Data()
            let outText = String(data: tailOut, encoding: .utf8) ?? ""
            let errText = String(data: tailErr, encoding: .utf8) ?? ""
            Task { @MainActor [weak self] in
                guard let self else { return }
                if !outText.isEmpty { self.delegate?.runner(self, didEmit: outText) }
                if !errText.isEmpty { self.delegate?.runner(self, didEmit: errText) }
                self.handleTermination(of: finished)
            }
        }

        process = proc
        state = .building

        do {
            try proc.run()
        } catch {
            outPipe.fileHandleForReading.readabilityHandler = nil
            errPipe.fileHandleForReading.readabilityHandler = nil
            process = nil
            delegate?.runner(self, didEmit: "Failed to launch build: \(error.localizedDescription)\n")
            state = .failure
            delegate?.runner(self, didExit: Result(state: .failure, exitCode: -1))
        }
    }

    // MARK: - Cancel

    /// Requests cancellation of the running build: SIGTERM now, SIGKILL after a grace
    /// period if it hasn't exited. No-op when not building.
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

    // MARK: - Termination

    private func handleTermination(of finished: Process) {
        // Ignore stale termination callbacks from a prior process.
        guard finished === process else { return }
        killTimer?.invalidate()
        killTimer = nil

        let code = finished.terminationStatus
        let clean = finished.terminationReason == .exit && code == 0
        process = nil

        let outcome: State = didRequestCancel ? .cancelled : (clean ? .success : .failure)
        state = outcome
        delegate?.runner(self, didExit: Result(state: outcome, exitCode: code))
    }
}
