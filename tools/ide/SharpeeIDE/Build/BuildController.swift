// BuildController.swift
// Bridges a BuildRunner to the window's Build panel: starts
// `sharpee build <file>.story` (ADR-258 D4), streams its output into the panel
// (auto-showing it), and reports the final status. Owns the runner so the
// Build/Cancel menu actions and their validation can route through it. No npm
// housekeeping — a Chord story needs none (D2).
// Public interface: BuildController.build(storyFile:), cancel(), isBuilding.
// Owner context: tools/ide — Build.

import AppKit

@MainActor
final class BuildController: BuildRunnerDelegate {

    private let runner = BuildRunner()
    private weak var window: MainWindowController?
    private var startUptime: TimeInterval = 0

    /// The story file of the in-flight/last build.
    private var currentStory: URL?

    init(window: MainWindowController) {
        self.window = window
        runner.delegate = self
    }

    /// True while a build is running — drives Cancel-menu enablement and blocks re-entry.
    var isBuilding: Bool { runner.isRunning }

    /// Builds `storyFile` with the PATH-resolved `sharpee` (D4). Reveals the panel,
    /// clears prior output, echoes the command, and starts the build. No-op if a
    /// build is already running.
    func build(storyFile: URL) {
        guard !runner.isRunning else { return }
        currentStory = storyFile
        window?.showBuildOutput() // the right panel's Build tab, next to Play
        window?.clearBuildOutput()
        window?.appendBuildOutput("$ sharpee build \(storyFile.lastPathComponent)\n\n")
        startUptime = ProcessInfo.processInfo.systemUptime
        runner.start(storyFile: storyFile)
    }

    /// Requests cancellation of the running build (no-op when idle).
    func cancel() {
        runner.cancel()
    }

    // MARK: - BuildRunnerDelegate

    func runner(_ runner: BuildRunner, didEmit text: String) {
        window?.appendBuildOutput(text)
    }

    func runner(_ runner: BuildRunner, didChangeState state: BuildRunner.State) {
        if state == .building { window?.updateBuildStatus(.building) }
    }

    func runner(_ runner: BuildRunner, didExit result: BuildRunner.Result) {
        let duration = ProcessInfo.processInfo.systemUptime - startUptime

        let line: String
        let status: BuildStatusDisplay
        switch result.state {
        case .success:
            // The story report (the PR): name in lights + the numbers.
            let report = window?.storyBuildReport().map { "\n\($0)" } ?? ""
            line = "\n✓ Build succeeded.\n\(report)"
            status = .succeeded(duration: duration)
        case .failure:
            line = "\n✗ Build failed (exit \(result.exitCode)).\n"
            status = .failed(duration: duration)
        case .cancelled:
            line = "\n■ Build cancelled.\n"
            status = .cancelled(duration: duration)
        case .idle, .building:
            line = ""
            status = .idle
        }
        if !line.isEmpty { window?.appendBuildOutput(line) }
        window?.updateBuildStatus(status)

        // The project tree needs no refresh — it is source-derived via compose
        // (ADR-258 D6). Play reloads from the freshly-built dist/web/<id>/.
        if result.state == .success, let currentStory {
            window?.reloadPlayAfterBuild(projectRoot: currentStory.deletingLastPathComponent())
        }
    }
}
