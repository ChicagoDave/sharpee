// TestController.swift
// Glue between the Test menu, the two testing surfaces and the TestRunner
// (ADR-277 D2/D3, ADR-301): discovers the open story's transcripts, starts
// run-all / tree / chain / single-file runs, feeds the stream to both surfaces,
// routes click-through to the editor, and surfaces pipeline failures (sharpee
// missing, schema mismatch, and the ADR-279 D4 fence-grammar/toolchain
// mismatch) as status lines.
//
// TWO SURFACES, ONE RUN. The Testing tab (ADR-301 D1) is the web bundle and
// receives RAW lines — it decodes the wire itself. The older Test panel is an
// NSOutlineView fed by the Swift mirror, and is kept because it still owns the
// ADR-282 D2 re-bless interaction that the tab's reading half does not cover;
// ADR-301 scopes editing to the next decision. Retiring it is a separate,
// confirmed step, not a side effect of this one.
// Public interface: TestController.attach(storyFile:), runAll(), runTree(),
// runChain(), runFile(_:), cancel(), isTesting.
// Owner context: tools/ide — Test.

import AppKit

@MainActor
final class TestController: TestRunnerDelegate {

    private let runner = TestRunner()
    private let model = TestPanelModel()
    private weak var window: MainWindowController?

    /// The story file tests run against (set on project open).
    private var storyFile: URL?

    /// The view-mode key the tab's choice is remembered under, per project
    /// (ADR-301 D4 — the mode never switches itself, so it must persist).
    private static let modeDefaultsKey = "TestingTabViewMode"

    init(window: MainWindowController) {
        self.window = window
        runner.delegate = self
        wireTestingTab(window.testingTab)
        let panel = window.testPanel
        panel.setModel(model)
        panel.onRunAll = { [weak self] in self?.runAll() }
        panel.onRunChain = { [weak self] in self?.runChain() }
        panel.onCancel = { [weak self] in self?.cancel() }
        panel.onOpenLocation = { [weak self] location in
            self?.window?.openDocument(at: location.file, line: location.line, column: location.column)
        }
        // ADR-282 D2. The editor is the only thing that knows a transcript has
        // unsaved edits, and it is the only reason to refuse a re-bless the
        // model would otherwise allow.
        panel.hostReblessObstacle = { [weak self] command in
            guard self?.window?.hasUnsavedChanges(at: URL(fileURLWithPath: command.file)) == true
            else { return nil }
            return "This transcript has unsaved edits — save or revert it first."
        }
        panel.onDidRebless = { [weak self] command in
            // The tab, if open, is now showing text that is no longer on disk.
            self?.window?.reloadFromDisk(at: URL(fileURLWithPath: command.file))
        }
    }

    /// Connects the web Testing tab's requests to this controller. The tab is
    /// the ADR-301 D1 surface; everything it asks for lands here, so the two
    /// surfaces drive one runner rather than each owning a run.
    private func wireTestingTab(_ tab: TestingTabViewController) {
        tab.onRunAll = { [weak self] in self?.runAll() }
        tab.onRunTree = { [weak self] in self?.runTree() }
        tab.onRunChain = { [weak self] in self?.runChain() }
        tab.onCancel = { [weak self] in self?.cancel() }
        tab.onOpenLocation = { [weak self] location in
            self?.window?.openDocument(at: location.file, line: location.line, column: location.column)
        }
        tab.onPersistMode = { mode in
            UserDefaults.standard.set(mode, forKey: Self.modeDefaultsKey)
        }
        if let mode = UserDefaults.standard.string(forKey: Self.modeDefaultsKey) {
            tab.restoreMode(mode)
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
        // The tab shows the suite before it has ever been run — a blank pane
        // reads as "no tests", which is a different and wrong claim.
        let tab = window?.testingTab
        tab?.beginRun(story: storyFile.deletingPathExtension().lastPathComponent)
        tab?.setDiscovered(model.entries.map(\.file.path))
    }

    /// Clears the panel (project closed).
    func detach() {
        storyFile = nil
        model.discover(storyDir: URL(fileURLWithPath: "/nonexistent"))
        window?.testPanel.reloadModel()
        window?.testingTab.beginRun(story: "No story open")
    }

    /// Runs the `tests/` subtree (`sharpee test <story> --json`).
    func runAll() {
        startRun { runner, story in runner.runAll(storyFile: story) }
    }

    /// Runs the suite as a tree (ADR-302): `continues:` parentage resolved, a
    /// shared prefix re-executed per sibling, blocked nodes reported `unreached`.
    func runTree() {
        startRun { runner, story in runner.runTree(storyFile: story) }
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
        window?.showTestingTab()
        window?.testPanel.reloadModel()
        let tab = window?.testingTab
        tab?.beginRun(story: storyFile.deletingPathExtension().lastPathComponent)
        tab?.setDiscovered(model.entries.map(\.file.path))
        launch(runner, storyFile)
    }

    // MARK: - TestRunnerDelegate

    func runner(_ runner: TestRunner, didReceiveLine line: String) {
        // Straight through, undecoded — the tab owns the wire (ADR-301 D1).
        window?.testingTab.deliver(line: line)
    }

    func runner(_ runner: TestRunner, didDecode record: TestResultRecord) {
        model.apply(record)
        window?.testPanel.reloadModel()
    }

    func runner(_ runner: TestRunner, didFailDecode error: Error) {
        // Only the Swift mirror failed here. The tab decodes the same stream
        // itself and says so in its own status line, so this note goes to the
        // panel alone rather than claiming the whole run is unreadable.
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
        let tab = window?.testingTab
        tab?.runFinished(ok: result.state == .passed)
        switch result.state {
        case .cancelled:
            panel?.setStatus("Cancelled")
            tab?.setStatus("Cancelled — results up to this point are kept.")
        case .failed where model.runEnd == nil:
            // The run died before its stream completed (launch/load failure) —
            // which is exactly where a fence-unaware toolchain fails, since it
            // cannot get past parsing the transcript (ADR-279 D4 / ADR-287).
            var status = "Test run failed (exit \(result.exitCode))"
            if let note = ToolchainFenceNote.note(transcripts: model.entries.map(\.file),
                                                  resolved: storyFile.flatMap {
                                                      ComposeRunner.resolveSharpee(near: $0)
                                                  },
                                                  bundled: BundledToolchain.executable()) {
                status += " — " + note
            }
            panel?.setStatus(status)
            tab?.setStatus(status)
        default:
            break // runSummary from run-end already rendered by reloadModel()
        }
    }
}
