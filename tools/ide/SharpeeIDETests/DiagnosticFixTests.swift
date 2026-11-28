// DiagnosticFixTests.swift
// ADR-409 D7.2, AC-10 in the macOS head: a refusal's fix, filled by the real
// compose, is offered in the editor's context menu and the Problems row, applies
// as one undoable edit, and Fix All over a story with several refusals leaves a
// source the real compose accepts. A fix whose buffer changed since the compose
// is never applied. Real path: the in-repo devkit CLI's `compose --json`, a real
// EditorViewController in a window, edits made through its NSTextView.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class DiagnosticFixTests: XCTestCase {

    private var tmp: URL!
    private var storyURL: URL!
    private var editor: EditorViewController!
    private var window: NSWindow!
    private var scheduler: ComposeScheduler!

    /// The clean probe story with five things: four the rule cannot work out a form
    /// for, and one (`candles`) it can.
    private static let refusalStory = TestToolchain.cleanStory.replacingOccurrences(
        of: "before the game starts",
        with: """
        create the houses
          a thing, plural
          in the Lab

          They are there.

        create the shelf
          a thing, singular
          in the Lab

          It is there.

        create the mice
          a thing, plural
          in the Lab

          They are there.

        create the pot of gold
          a thing, singular
          in the Lab

          It is there.

        create the candles
          a thing, plural
          in the Lab

          They are there.

        before the game starts
        """)

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-DiagnosticFix-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        storyURL = tmp.appendingPathComponent("probe.story")
        try Self.refusalStory.write(to: storyURL, atomically: true, encoding: .utf8)
        editor = EditorViewController()
        // A window gives the text view its undo manager, as in the app.
        window = NSWindow(contentViewController: editor)
        editor.openDocument(at: storyURL)
    }

    override func tearDownWithError() throws {
        scheduler = nil
        window = nil
        editor = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    private func textView() throws -> NSTextView {
        func find(_ view: NSView) -> NSTextView? {
            if let scroll = view as? NSScrollView, let tv = scroll.documentView as? NSTextView { return tv }
            for sub in view.subviews { if let found = find(sub) { return found } }
            return nil
        }
        return try XCTUnwrap(find(editor.view))
    }

    /// Composes the editor's buffer with the real CLI and hands the run to the
    /// editor, as MainWindow does; returns the run's records.
    @discardableResult
    private func composeBuffer() throws -> [ComposeDiagnosticRecord] {
        let content = try textView().string
        if scheduler == nil {
            // Set on the main actor, as the scheduler's own real-path test does.
            scheduler = ComposeScheduler()
            scheduler.composeInvoker = TestToolchain.composeInvoker(runner: ComposeRunner())
        }
        var outcome: ComposeScheduler.Outcome?
        let done = expectation(description: "compose")
        scheduler.onOutcome = { outcome = $0; done.fulfill() }
        scheduler.composeNow(storyURL: storyURL, content: content)
        wait(for: [done], timeout: 60)
        let finished = try XCTUnwrap(outcome)
        let payload = try finished.result.get()
        XCTAssertEqual(finished.composedContent, content)
        editor.setDiagnostics(payload.diagnostics, forFile: storyURL, composedContent: finished.composedContent)
        return payload.diagnostics
    }

    /// The UTF-16 offset of the first occurrence of `needle`.
    private func offset(of needle: String) throws -> Int {
        let range = (try textView().string as NSString).range(of: needle)
        XCTAssertNotEqual(range.location, NSNotFound, needle)
        return range.location
    }

    // MARK: - The pure model

    func testAFixBecomesItsChangesLastFirstAndRefusesASpanThatNoLongerFits() {
        let text = "ab\ncd\n"
        let fix = ComposeFix(label: "x", edits: [
            ComposeFixEdit(span: DiagnosticSpan(line: 1, column: 1, endLine: 1, endColumn: 2), text: "A"),
            ComposeFixEdit(span: DiagnosticSpan(line: 2, column: 2, endLine: 2, endColumn: 3), text: "D"),
        ])
        let changes = DiagnosticFixes.changes(for: fix, in: text)
        XCTAssertEqual(changes, [
            DiagnosticFixes.Change(range: NSRange(location: 4, length: 1), text: "D"),
            DiagnosticFixes.Change(range: NSRange(location: 0, length: 1), text: "A"),
        ])
        XCTAssertEqual(DiagnosticFixes.applying(changes ?? [], to: text), "Ab\ncD\n")

        let stale = ComposeFix(label: "x", edits: [
            ComposeFixEdit(span: DiagnosticSpan(line: 9, column: 1, endLine: 9, endColumn: 2), text: "Z"),
        ])
        XCTAssertNil(DiagnosticFixes.changes(for: stale, in: text), "a span past the buffer is not guessed at")
        let overlapping = ComposeFix(label: "x", edits: [
            ComposeFixEdit(span: DiagnosticSpan(line: 1, column: 1, endLine: 1, endColumn: 3), text: "1"),
            ComposeFixEdit(span: DiagnosticSpan(line: 1, column: 2, endLine: 1, endColumn: 3), text: "2"),
        ])
        XCTAssertNil(DiagnosticFixes.changes(for: overlapping, in: text))
    }

    func testFixAllSkipsAFixThatOverlapsOneAlreadyTakenAndRecordsInOtherFiles() {
        let text = "plural\n"
        func record(_ file: String, _ replacement: String) -> ComposeDiagnosticRecord {
            let span = DiagnosticSpan(line: 1, column: 1, endLine: 1, endColumn: 7)
            return ComposeDiagnosticRecord(severity: .error, code: "analysis.x", message: "m", file: file,
                                           line: 1, span: span,
                                           fix: ComposeFix(label: "l", edits: [ComposeFixEdit(span: span, text: replacement)]))
        }
        let changes = DiagnosticFixes.changesForAll(
            [record("/s.story", "plural of house"), record("/s.story", "plural of home"), record("/f.chord", "x")],
            inFile: "/s.story", text: text)
        XCTAssertEqual(DiagnosticFixes.applying(changes, to: text), "plural of house\n")
    }

    // MARK: - AC-10, through the real compose

    func testTheEditorOffersTheFilledFixAndApplyingItRecompilesWithoutThatRefusal() throws {
        let records = try composeBuffer()
        let fixed = records.filter { $0.fix != nil }
        XCTAssertEqual(fixed.map { $0.fix?.edits.first?.text }, [
            "plural of house", "singular of shelves", "plural of mouse", "singular of pots of gold",
        ])

        // The context menu at the houses' `plural` carries its fix, then Fix All.
        let houses = try offset(of: "a thing, plural\n  in the Lab\n\n  They are there.\n\ncreate the shelf")
        let items = editor.fixMenuItems(at: houses + "a thing, ".count + 2)
        XCTAssertEqual(items.map(\.title), ["Write `plural of house`", "Fix All (4)"])

        // Apply it through the menu item, as the author would.
        let item = try XCTUnwrap(items.first)
        _ = item.target?.perform(item.action, with: item)
        XCTAssertTrue(try textView().string.contains("create the houses\n  a thing, plural of house\n"))
        XCTAssertEqual(editor.currentFixRecords(), [], "the buffer moved on: the run's other fixes are stale")
        XCTAssertFalse(editor.applyFix(fixed[1]), "a stale fix is never applied")
        XCTAssertFalse(try textView().string.contains("singular of shelves"))

        let after = try composeBuffer()
        XCTAssertEqual(after.filter { $0.fix != nil }.count, 3)
        XCTAssertFalse(after.contains { $0.span?.line == fixed[0].span?.line && $0.code == fixed[0].code })
    }

    func testFixAllAppliesEveryFixAsOneUndoAndTheStoryComposesClean() throws {
        try composeBuffer()
        let before = try textView().string

        XCTAssertEqual(editor.applyAllFixes(), 4)
        let fixedText = try textView().string
        for line in ["a thing, plural of house", "a thing, singular of shelves",
                     "a thing, plural of mouse", "a thing, singular of pots of gold", "a thing, plural\n"] {
            XCTAssertTrue(fixedText.contains(line), line)
        }
        let after = try composeBuffer()
        XCTAssertEqual(after.filter { $0.severity == .error }, [], "Fix All leaves a source the compose accepts")

        // One undo takes back the whole Fix All.
        try textView().undoManager?.undo()
        XCTAssertEqual(try textView().string, before)
    }

    func testOneFixUndoesInOneStepNamedByItsLabel() throws {
        let records = try composeBuffer()
        let before = try textView().string
        let houses = try XCTUnwrap(records.first { $0.fix != nil })
        XCTAssertTrue(editor.applyFix(houses))
        XCTAssertNotEqual(try textView().string, before)
        XCTAssertEqual(try textView().undoManager?.undoActionName, "Write `plural of house`")
        try textView().undoManager?.undo()
        XCTAssertEqual(try textView().string, before)
    }

    func testAFixInAnImportedFragmentAppliesThereAndADirtyFragmentBlocksTheRest() throws {
        let regions = tmp.appendingPathComponent("regions", isDirectory: true)
        try FileManager.default.createDirectory(at: regions, withIntermediateDirectories: true)
        let fragmentURL = regions.appendingPathComponent("pier.chord")
        try """
        create the houses
          a thing, plural
          in the Lab

          They are there.

        create the mice
          a thing, plural
          in the Lab

          They are there.

        """.write(to: fragmentURL, atomically: true, encoding: .utf8)
        try TestToolchain.cleanStory
            .replacingOccurrences(of: "create the Lab", with: "import \"regions/pier\"\n\ncreate the Lab")
            .write(to: storyURL, atomically: true, encoding: .utf8)
        editor.reloadFromDisk(at: storyURL)

        let records = try composeBuffer()
        let fixes = records.filter { $0.fix != nil }
        XCTAssertEqual(fixes.map(\.file), [fragmentURL.path, fragmentURL.path], "both refusals are sited in the fragment")

        XCTAssertTrue(editor.applyFix(fixes[0]), "a clean fragment's fix is current")
        let fragmentText = try textView().string
        XCTAssertEqual(editor.activeDocument?.url.path, fragmentURL.path, "the fix opened the fragment")
        XCTAssertTrue(fragmentText.contains("create the houses\n  a thing, plural of house\n"))

        XCTAssertEqual(editor.currentFixRecords(), [], "the fragment has unsaved edits now")
        XCTAssertFalse(editor.applyFix(fixes[1]))
        XCTAssertFalse(try textView().string.contains("plural of mouse"))
    }

    func testAProblemsRowWithAFixShowsItsLabelAndHandsTheRecordBack() throws {
        let records = try composeBuffer()
        let view = ProblemsView(frame: NSRect(x: 0, y: 0, width: 900, height: 200))
        view.setProblems(records, for: storyURL)
        var handed: [ComposeDiagnosticRecord] = []
        view.onFix = { handed.append($0.record) }

        func buttons(_ v: NSView) -> [NSButton] {
            (v as? NSButton).map { [$0] } ?? v.subviews.flatMap(buttons)
        }
        view.layoutSubtreeIfNeeded()
        let table = try XCTUnwrap(view.subviews.compactMap { ($0 as? NSScrollView)?.documentView as? NSTableView }.first)
        let row = try XCTUnwrap(records.firstIndex { $0.fix != nil })
        let cell = try XCTUnwrap(table.view(atColumn: 0, row: row, makeIfNecessary: true))
        let button = try XCTUnwrap(buttons(cell).first)
        XCTAssertEqual(button.title, "Write `plural of house`")
        button.performClick(nil)
        XCTAssertEqual(handed, [records[row]])
    }
}
