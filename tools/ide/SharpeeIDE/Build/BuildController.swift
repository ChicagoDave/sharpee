// BuildController.swift
// Bridges a BuildRunner to the window's Build panel: starts `./sharpee build`, streams
// its output into the panel (auto-showing it), and reports the final status. Owns the
// runner so the Build/Cancel menu actions and their validation can route through it.
// Public interface: BuildController.build(projectDir:), cancel(), isBuilding.
// Owner context: tools/ide — Build.

import AppKit

@MainActor
final class BuildController: BuildRunnerDelegate {

    private let runner = BuildRunner()
    private weak var window: MainWindowController?
    private var startUptime: TimeInterval = 0
    /// The project directory of the in-flight/last build (author mode, ADR-185).
    private var current: URL?

    init(window: MainWindowController) {
        self.window = window
        runner.delegate = self
    }

    /// True while a build is running — drives Cancel-menu enablement and blocks re-entry.
    var isBuilding: Bool { runner.isRunning }

    /// Author-mode build (ADR-185): run the project's installed `sharpee build` in the project
    /// directory. Reveals the panel, clears prior output, echoes the command, and starts the build.
    /// No-op if a build is already running.
    func build(projectDir: URL) {
        guard !runner.isRunning else { return }
        current = projectDir
        window?.setBuildPanelRepoRoot(projectDir)
        window?.setBuildPanelVisible(true)
        window?.clearBuildOutput()
        window?.appendBuildOutput("$ sharpee build\n\n")
        startUptime = ProcessInfo.processInfo.systemUptime
        runner.start(projectDir: projectDir)
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

        // After a successful build, refresh the Structure view (introspect) and reload the Play
        // pane from the freshly-built browser client (ADR-185).
        if result.state == .success, let projectDir = current {
            window?.introspectProject(projectRoot: projectDir)
            window?.reloadPlayAfterBuild(projectRoot: projectDir)
        }
    }
}
