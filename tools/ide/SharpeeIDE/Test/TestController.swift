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

    /// True while the in-flight run is one that writes files (a recording run):
    /// its exit owes the Project pane a refresh, where an ordinary run does not.
    private var runLandsFiles = false

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
        tab.onRequestSource = { [weak self] file in self?.provideSource(for: file) }
        tab.onWriteTranscript = { [weak self] file, text in self?.writeTranscript(file, text) }
        tab.onCreateTranscript = { [weak self] name, text in self?.createTranscript(name, text) }
        tab.onTrashTranscript = { [weak self] file in self?.trashTranscript(file) }
        tab.onRecordGolden = { [weak self] file in self?.recordGolden(file) }
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
        tab?.setGoldens(goldenPaths())
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
        startRun(blessFile: nil)
    }

    /// Records `file`'s golden (ADR-294 D1): the same tree run, with just that
    /// node blessed (`--bless-file`). Only a file in the discovered suite may
    /// be recorded — the same boundary every read and write already honours.
    private func recordGolden(_ file: String) {
        let url = URL(fileURLWithPath: file)
        guard discovered.contains(where: { $0.path == url.path }) else {
            window?.testingTab.setStatus("\(url.lastPathComponent) is not in the discovered suite, so it was not recorded.")
            return
        }
        startRun(blessFile: url)
    }

    /// The one run entry. `blessFile` non-nil makes it a recording run.
    private func startRun(blessFile: URL?) {
        guard !runner.isRunning, let storyFile else { return }
        // A recording run lands a `.golden` on disk — a FILE change the
        // Project pane must see when the run exits, same as create and trash.
        runLandsFiles = blessFile != nil
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
        tab?.setGoldens(goldenPaths())
        runner.runTests(storyFile: storyFile, blessFile: blessFile)
    }

    /// Cancels the in-flight run (SIGTERM → SIGKILL). Results already rendered stay.
    func cancel() {
        runner.cancel()
    }

    /// Answers the page's `requestSource` against the suite discovered right now.
    ///
    /// The provider is built per request rather than held, because `discovered`
    /// changes on every attach and every run — a held copy would answer from the
    /// suite as it was when the project opened.
    private func provideSource(for file: String) {
        TranscriptSourceProvider(discovered: discovered).provide(file: file, to: window?.testingTab)
    }

    /// Writes the page's edit to disk, then tells everything that watches the
    /// project that the file changed.
    ///
    /// The announcement is D7's rule from ADR-290 — a write into the project has
    /// ONE owner for "who else observes this". Here that is the editor: a
    /// transcript open in a document window still shows the text from before the
    /// edit, and an author who then saves it puts the assertion back the way it
    /// was without ever being told they had two copies.
    /// Only a write that LANDED is announced, and it is announced at the resolved
    /// path rather than the one the page sent. A refused write must not ask the
    /// editor to reload a document — there is nothing new to read, and for a path
    /// outside the suite it would reach a file the provider just declined to
    /// touch.
    private func writeTranscript(_ file: String, _ text: String) {
        let written = TranscriptSourceProvider(discovered: discovered).write(
            file: file, text: text, to: window?.testingTab)
        if let written { window?.reloadFromDisk(at: written) }
    }

    /// Creates the page's new transcript and lets the project see it.
    ///
    /// A file appearing in the story is exactly the case ADR-290 D7 names: the
    /// write announces once, and the announcement fans out. Here that means
    /// re-discovering — otherwise the new transcript is invisible in the tab and
    /// in the sidebar until the project is reopened, which is the bug D7 exists
    /// for, in its original form.
    private func createTranscript(_ name: String, _ text: String) {
        guard let storyFile else {
            window?.testingTab.deliverCreateFailure(
                message: "No story is open, so there is nowhere to put a transcript.")
            return
        }
        let created = TranscriptSourceProvider(discovered: discovered).create(
            name: name, text: text,
            in: storyFile.deletingLastPathComponent(),
            to: window?.testingTab)
        if created != nil { rediscover(storyFile: storyFile) }
    }

    /// Moves a transcript to the Trash and lets the project see it go.
    private func trashTranscript(_ file: String) {
        let trashed = TranscriptSourceProvider(discovered: discovered).trash(
            file: file, to: window?.testingTab)
        if trashed != nil, let storyFile { rediscover(storyFile: storyFile) }
    }

    /// Re-reads the suite from disk and tells everything that shows files:
    /// the tab, and the Project pane.
    ///
    /// The sidebar's share is ADR-290 D7's observer, restored (it went with the
    /// outline Test panel, ADR-301 A1.2): the window owns HOW its pane rebuilds
    /// — this surface only announces that the project's files changed.
    private func rediscover(storyFile: URL) {
        discovered = TranscriptDiscovery.transcripts(
            inStoryDirectory: storyFile.deletingLastPathComponent())
        window?.testingTab.setDiscovered(discovered.map(\.path))
        window?.testingTab.setGoldens(goldenPaths())
        window?.refreshProjectTree()
    }

    /// The discovered transcripts that carry a recording, as tab-ready paths.
    private func goldenPaths() -> [String] {
        TranscriptDiscovery.goldens(among: discovered).map(\.path)
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
        // A recording run just changed which files have goldens; a plain run
        // costs one cheap re-check. Reported after EVERY exit so the tab's
        // tier facts always describe the disk as the run left it.
        tab?.setGoldens(goldenPaths())
        // A recording run also landed a FILE, which the Project pane must see
        // (ADR-290 D7). Only then: an ordinary run changes no files, and a
        // rebuild would cost the author their sidebar selection for nothing.
        if runLandsFiles {
            runLandsFiles = false
            window?.refreshProjectTree()
        }
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
