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
    /// What the runner is currently doing — routes the success handler.
    private enum Operation { case build, install }

    /// The project directory + operation of the in-flight/last run (author mode, ADR-185).
    private var current: (dir: URL, op: Operation)?

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
        current = (projectDir, .build)
        window?.setBuildPanelRepoRoot(projectDir)
        window?.setBuildPanelVisible(true)
        window?.clearBuildOutput()
        window?.appendBuildOutput("$ sharpee build\n\n")
        startUptime = ProcessInfo.processInfo.systemUptime
        runner.start(projectDir: projectDir)
    }

    /// Author housekeeping (ADR-185): run `npm install` in the project to fetch the platform +
    /// the `sharpee` bin, streaming into the Build panel. Used automatically when an opened
    /// project has a `package.json` but no installed bin. No-op if a run is already in flight.
    func installDependencies(projectDir: URL) {
        guard !runner.isRunning else { return }
        current = (projectDir, .install)
        window?.setBuildPanelRepoRoot(projectDir)
        window?.setBuildPanelVisible(true)
        window?.clearBuildOutput()
        window?.appendBuildOutput("$ npm install\n\n")
        startUptime = ProcessInfo.processInfo.systemUptime
        runner.startInstall(projectDir: projectDir)
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

        // Route success by what just ran (ADR-185).
        if result.state == .success, let current {
            switch current.op {
            case .build:
                // Refresh the Structure view (introspect) and reload the Play pane.
                window?.introspectProject(projectRoot: current.dir)
                window?.reloadPlayAfterBuild(projectRoot: current.dir)
            case .install:
                // Deps are now installed; introspect if the project is already built (else the
                // build-gated tree stays empty until the author builds).
                let dist = current.dir.appendingPathComponent("dist/index.js")
                if FileManager.default.fileExists(atPath: dist.path) {
                    window?.introspectProject(projectRoot: current.dir)
                }
            }
        }
    }
}
