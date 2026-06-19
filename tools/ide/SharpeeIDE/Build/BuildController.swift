// BuildController.swift
// Bridges a BuildRunner to the window's Build panel: starts `./sharpee build`, streams
// its output into the panel (auto-showing it), and reports the final status. Owns the
// runner so the Build/Cancel menu actions and their validation can route through it.
// Public interface: BuildController.build(settings:repoRoot:), cancel(), isBuilding.
// Owner context: tools/ide — Build.

import AppKit

@MainActor
final class BuildController: BuildRunnerDelegate {

    private let runner = BuildRunner()
    private weak var window: MainWindowController?
    private var startUptime: TimeInterval = 0

    init(window: MainWindowController) {
        self.window = window
        runner.delegate = self
    }

    /// True while a build is running — drives Cancel-menu enablement and blocks re-entry.
    var isBuilding: Bool { runner.isRunning }

    /// Reveals the panel, clears prior output, echoes the command, and starts the build.
    /// No-op if a build is already running.
    func build(settings: BuildSettings, repoRoot: URL) {
        guard !runner.isRunning else { return }
        window?.setBuildPanelRepoRoot(repoRoot)
        window?.setBuildPanelVisible(true)
        window?.clearBuildOutput()
        let command = (["./sharpee", "build"] + settings.toArguments()).joined(separator: " ")
        window?.appendBuildOutput("$ \(command)\n\n")
        startUptime = ProcessInfo.processInfo.systemUptime
        runner.start(settings: settings, repoRoot: repoRoot)
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
            line = "\n✓ Build succeeded.\n"
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
    }
}
