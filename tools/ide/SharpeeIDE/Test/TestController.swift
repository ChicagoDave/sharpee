// TestController.swift
// Glue between the Test menu / Tests panel and the TestRunner (ADR-277 D2/D3):
// discovers the open story's transcripts into the panel model, starts
// run-all / chain / single-file runs, folds streamed records into the model
// (re-rendering live), routes click-through to the editor, and surfaces
// pipeline failures (sharpee missing, schema mismatch) as status lines.
// Public interface: TestController.attach(storyFile:), runAll(), runChain(),
// runFile(_:), cancel(), isTesting.
// Owner context: tools/ide — Test.

import AppKit

@MainActor
final class TestController: TestRunnerDelegate {

    private let runner = TestRunner()
    private let model = TestPanelModel()
    private weak var window: MainWindowController?

    /// The story file tests run against (set on project open).
    private var storyFile: URL?

    init(window: MainWindowController) {
        self.window = window
        runner.delegate = self
        let panel = window.testPanel
        panel.setModel(model)
        panel.onRunAll = { [weak self] in self?.runAll() }
        panel.onRunChain = { [weak self] in self?.runChain() }
        panel.onCancel = { [weak self] in self?.cancel() }
        panel.onOpenLocation = { [weak self] location in
            self?.window?.openDocument(at: location.file, line: location.line, column: location.column)
        }
    }

    /// True while a run is in flight — drives menu enablement and blocks re-entry.
    var isTesting: Bool { runner.isRunning }

    /// Points the panel at `storyFile`'s project: discovers `tests/` and the
    /// `walkthroughs/` chain and renders the tree (no run yet).
    func attach(storyFile: URL) {
        self.storyFile = storyFile
        model.discover(storyDir: storyFile.deletingLastPathComponent())
        window?.testPanel.reloadModel()
    }

    /// Clears the panel (project closed).
    func detach() {
        storyFile = nil
        model.discover(storyDir: URL(fileURLWithPath: "/nonexistent"))
        window?.testPanel.reloadModel()
    }

    /// Runs the `tests/` subtree (`sharpee test <story> --json`).
    func runAll() {
        startRun { runner, story in runner.runAll(storyFile: story) }
    }

    /// Runs the `walkthroughs/` chain (`--chain`, state persists — D3).
    func runChain() {
        startRun { runner, story in runner.runChain(storyFile: story) }
    }

    /// Runs one `.transcript` (the editor's current file).
    func runFile(_ transcript: URL) {
        startRun { runner, story in runner.runFile(storyFile: story, transcript: transcript) }
    }

    /// Cancels the in-flight run (SIGTERM → SIGKILL). Decoded records stay.
    func cancel() {
        runner.cancel()
    }

    private func startRun(_ launch: (TestRunner, URL) -> Void) {
        guard !runner.isRunning, let storyFile else { return }
        // Tests read DISK while the editor holds buffers — save first, or an
        // unsaved edit silently tests the old source (the build rule).
        guard window?.saveAllDocuments() != false else { return }
        model.discover(storyDir: storyFile.deletingLastPathComponent())
        model.reset()
        window?.showTestTab()
        window?.testPanel.reloadModel()
        launch(runner, storyFile)
    }

    // MARK: - TestRunnerDelegate

    func runner(_ runner: TestRunner, didDecode record: TestResultRecord) {
        model.apply(record)
        window?.testPanel.reloadModel()
    }

    func runner(_ runner: TestRunner, didFailDecode error: Error) {
        if case TestResultRecord.DecodeError.schemaVersionMismatch(let found, let expected) = error {
            window?.testPanel.setStatus(
                "IDE is out of date for this toolchain (test stream v\(found), IDE understands v\(expected))")
        } else {
            window?.testPanel.setStatus("Test output could not be decoded — \(error)")
        }
    }

    func runner(_ runner: TestRunner, didEmitStderr text: String) {
        // Validation/load detail already lands in error-status rows; stderr is
        // kept out of the panel to preserve the structured view.
    }

    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State) {
        window?.testPanel.setRunning(state == .running)
    }

    func runner(_ runner: TestRunner, didExit result: TestRunner.Result) {
        let panel = window?.testPanel
        panel?.reloadModel()
        switch result.state {
        case .cancelled:
            panel?.setStatus("Cancelled")
        case .failed where model.runEnd == nil:
            // The run died before its stream completed (launch/load failure).
            panel?.setStatus("Test run failed (exit \(result.exitCode))")
        default:
            break // runSummary from run-end already rendered by reloadModel()
        }
    }
}
