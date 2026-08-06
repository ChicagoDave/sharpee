// TestController.swift
// Glue between the Test menu, the Testing tab and the TestRunner (ADR-301):
// discovers the open story's transcripts so the tab can show the suite at rest,
// starts the run, forwards the raw stream to the tab, routes click-through to
// the editor, and surfaces pipeline failures (sharpee missing, the ADR-279 D4
// fence-grammar/toolchain mismatch) as the tab's status line.
//
// ONE SURFACE, ONE RUN. The outline panel that used to sit beside the tab is
// retired, and the Swift decoder went with it: nothing here reads the run-event
// wire, because the tab imports `@sharpee/ide-protocol` and decodes it itself
// (DEVARCH 8b). Swift's whole remaining job is transport.
// Public interface: TestController.attach(storyFile:), detach(), runTests(),
// cancel(), isTesting.
// Owner context: tools/ide — Test.

import AppKit

@MainActor
final class TestController: TestRunnerDelegate {

    private let runner = TestRunner()
    private weak var window: MainWindowController?

    /// The story file tests run against (set on project open).
    private var storyFile: URL?

    /// Transcripts found on disk for the open story — what the tab shows before
    /// a run, and what the fence note inspects when a run dies early.
    private var discovered: [URL] = []

    /// Lines the current run has produced. A run that fails having emitted
    /// NOTHING never got as far as its stream, which is exactly where a
    /// fence-unaware toolchain fails (ADR-279 D4 / ADR-287) — that is the signal
    /// the fence note needs, and reading it takes no decoder.
    private var deliveredLines = 0

    /// The view-mode key the tab's choice is remembered under, per project
    /// (ADR-301 D4 — the mode never switches itself, so it must persist).
    private static let modeDefaultsKey = "TestingTabViewMode"

    init(window: MainWindowController) {
        self.window = window
        runner.delegate = self
        let tab = window.testingTab
        tab.onRun = { [weak self] in self?.runTests() }
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

    /// Points the tab at `storyFile`'s project: discovers its transcripts and
    /// shows them (no run yet).
    func attach(storyFile: URL) {
        self.storyFile = storyFile
        discovered = TranscriptDiscovery.transcripts(
            inStoryDirectory: storyFile.deletingLastPathComponent())
        let tab = window?.testingTab
        // A blank pane reads as "no tests", which is a different and wrong claim.
        tab?.beginRun(story: storyFile.deletingPathExtension().lastPathComponent)
        tab?.setDiscovered(discovered.map(\.path))
    }

    /// Clears the tab (project closed).
    func detach() {
        storyFile = nil
        discovered = []
        window?.testingTab.beginRun(story: "No story open")
    }

    /// Runs the story's tests. One entry, because there is one run model — see
    /// `TestRunner.runTests` for why the flat and chain modes were not merely
    /// redundant but wrong for an IDE project.
    func runTests() {
        guard !runner.isRunning, let storyFile else { return }
        // Tests read DISK while the editor holds buffers — save first, or an
        // unsaved edit silently tests the old source (the build rule).
        guard window?.saveAllDocuments() != false else { return }

        discovered = TranscriptDiscovery.transcripts(
            inStoryDirectory: storyFile.deletingLastPathComponent())
        deliveredLines = 0
        window?.showTestingTab()
        let tab = window?.testingTab
        tab?.beginRun(story: storyFile.deletingPathExtension().lastPathComponent)
        tab?.setDiscovered(discovered.map(\.path))
        runner.runTests(storyFile: storyFile)
    }

    /// Cancels the in-flight run (SIGTERM → SIGKILL). Results already rendered stay.
    func cancel() {
        runner.cancel()
    }

    // MARK: - TestRunnerDelegate

    func runner(_ runner: TestRunner, didReceiveLine line: String) {
        deliveredLines += 1
        window?.testingTab.deliver(line: line)
    }

    func runner(_ runner: TestRunner, didEmitStderr text: String) {
        // Validation and load detail arrive on the stream as `transcript-end`
        // events carrying a status; stderr is kept out of the tab to preserve
        // the structured view. A run producing stderr and NO stream is caught by
        // `didExit` below.
    }

    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State) {
        // The tab drives its own run/cancel enablement off the stream itself.
    }

    func runner(_ runner: TestRunner, didExit result: TestRunner.Result) {
        let tab = window?.testingTab
        tab?.runFinished(ok: result.state == .passed)
        switch result.state {
        case .cancelled:
            tab?.setStatus("Cancelled — results up to this point are kept.")
        case .failed where deliveredLines == 0:
            // The run died before writing a single event — a launch or load
            // failure, which is where a fence-unaware toolchain fails, since it
            // cannot get past parsing the transcript (ADR-279 D4 / ADR-287).
            var status = "Test run failed (exit \(result.exitCode)) — it produced no output."
            if let note = ToolchainFenceNote.note(transcripts: discovered,
                                                  resolved: storyFile.flatMap {
                                                      ComposeRunner.resolveSharpee(near: $0)
                                                  },
                                                  bundled: BundledToolchain.executable()) {
                status += " " + note
            }
            tab?.setStatus(status)
        default:
            break // the stream's own run-end is already rendered
        }
    }
}
