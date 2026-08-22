// EditorFragmentTests.swift
// GH #287: an imported `.chord` fragment is Chord source in the editor — it
// asks its importing story to recompose when it opens or saves (never on a
// keystroke, since a fragment buffer cannot feed a compose), it does not
// fire the `.story`-only hooks, and the records a compose returns against the
// fragment's own file (`Span.file`, ADR-251 D6) underline in the fragment's
// tab. Real path: a real EditorViewController over real files, edits typed
// through the pane's NSTextView.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class EditorFragmentTests: XCTestCase {

    private var tmp: URL!
    private var editor: EditorViewController!
    private var storyURL: URL!
    private var fragmentURL: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-EditorFragment-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp.appendingPathComponent("regions"),
                                                withIntermediateDirectories: true)
        storyURL = tmp.appendingPathComponent("harbor.story")
        try "story\n  title: Harbor\n  authors: T\n  id: harbor\n\nimport \"regions/pier\"\n"
            .write(to: storyURL, atomically: true, encoding: .utf8)
        fragmentURL = tmp.appendingPathComponent("regions/pier.chord")
        try "create the Pier\n  a room\n\n  Planks.\n".write(to: fragmentURL, atomically: true, encoding: .utf8)
        editor = EditorViewController()
        _ = editor.view
    }

    override func tearDownWithError() throws {
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

    func testOpeningAFragmentAsksForItsStoryToRecomposeAndNotTheStoryHooks() throws {
        var fragmentRequests: [URL] = []
        var storyActivations: [URL] = []
        editor.onFragmentNeedsCompose = { fragmentRequests.append($0) }
        editor.onStoryActivated = { url, _ in storyActivations.append(url) }

        editor.openDocument(at: fragmentURL)

        XCTAssertEqual(fragmentRequests, [fragmentURL])
        XCTAssertEqual(storyActivations, [], "a fragment has no header — it is not composed as a story")
    }

    func testTypingInAFragmentInvalidatesButDoesNotCompose() throws {
        var fragmentRequests: [URL] = []
        var storyEdits: [URL] = []
        var documentEdits: [URL] = []
        editor.openDocument(at: fragmentURL)
        editor.onFragmentNeedsCompose = { fragmentRequests.append($0) }
        editor.onStoryEdited = { url, _ in storyEdits.append(url) }
        editor.onDocumentEdited = { documentEdits.append($0) }

        let tv = try textView()
        tv.insertText("\n", replacementRange: NSRange(location: tv.string.utf16.count, length: 0))

        XCTAssertEqual(documentEdits, [fragmentURL], "the play surface still invalidates")
        XCTAssertEqual(storyEdits, [])
        XCTAssertEqual(fragmentRequests, [], "the buffer cannot feed a compose; the save does")
    }

    func testSavingAFragmentAsksForItsStoryToRecompose() throws {
        var fragmentRequests: [URL] = []
        var reconciled: [URL] = []
        editor.openDocument(at: fragmentURL)
        editor.onFragmentNeedsCompose = { fragmentRequests.append($0) }
        editor.onStoryReconciled = { url, _ in reconciled.append(url) }

        let tv = try textView()
        tv.insertText("\n", replacementRange: NSRange(location: tv.string.utf16.count, length: 0))
        editor.saveActiveDocument()

        XCTAssertEqual(fragmentRequests, [fragmentURL])
        XCTAssertEqual(reconciled, [], "identity reconcile is `.story`-only (ADR-251 D3)")
        XCTAssertEqual(try String(contentsOf: fragmentURL, encoding: .utf8), "create the Pier\n  a room\n\n  Planks.\n\n")
    }

    func testAFragmentRecordUnderlinesInTheFragmentTab() throws {
        editor.openDocument(at: fragmentURL)
        let onPier = ComposeDiagnosticRecord(
            severity: .error, code: "analysis.x", message: "x", file: fragmentURL.path, line: 1,
            span: DiagnosticSpan(line: 1, column: 8, endLine: 1, endColumn: 16))
        let onStory = ComposeDiagnosticRecord(
            severity: .error, code: "analysis.y", message: "y", file: storyURL.path, line: 6,
            span: DiagnosticSpan(line: 6, column: 1, endLine: 6, endColumn: 7))

        editor.setDiagnostics([onPier, onStory], forFile: storyURL)

        let storage = try XCTUnwrap(try textView().textStorage)
        var underlined: [NSRange] = []
        storage.enumerateAttribute(.underlineStyle, in: NSRange(location: 0, length: storage.length)) { value, range, _ in
            if value != nil { underlined.append(range) }
        }
        XCTAssertEqual(underlined, [NSRange(location: 7, length: 8)],
                       "only the record naming the fragment underlines here; the story's stays in the story tab")
    }

    func testAFragmentOutsideTheStoryFolderIsNotUnderlinedAgainstThatStory() throws {
        let stray = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-EditorFragment-stray-\(UUID().uuidString).chord")
        try "create the Gull\n  a thing\n".write(to: stray, atomically: true, encoding: .utf8)
        defer { try? FileManager.default.removeItem(at: stray) }
        editor.openDocument(at: stray)
        let record = ComposeDiagnosticRecord(
            severity: .error, code: "analysis.x", message: "x", file: stray.path, line: 1,
            span: DiagnosticSpan(line: 1, column: 8, endLine: 1, endColumn: 12))

        editor.setDiagnostics([record], forFile: storyURL)

        let storage = try XCTUnwrap(try textView().textStorage)
        var any = false
        storage.enumerateAttribute(.underlineStyle, in: NSRange(location: 0, length: storage.length)) { value, _, _ in
            if value != nil { any = true }
        }
        XCTAssertFalse(any)
    }
}
