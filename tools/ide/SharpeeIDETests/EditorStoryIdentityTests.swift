// EditorStoryIdentityTests.swift
// The editor's half of ADR-309's save-time reconciliation: when saving a
// `.story` rewrites its `ifid:` line, the visible buffer must follow the file,
// and compose must re-run against the REAL file so a broken-config row is not
// lost to the snapshot path.
//
// Real path throughout: a real EditorViewController over real files, edits
// typed through the pane's NSTextView and the delegate the app uses.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class EditorStoryIdentityTests: XCTestCase {

    private var tmp: URL!
    private var editor: EditorViewController!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-EditorIdentity-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
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

    private static let story = """
    story
      title: Harbor
      authors: T
      id: harbor
      story-version: 0.1.0

    create the Quay
      a room

      Salt air.

    """

    @discardableResult
    private func makeStory(_ contents: String = story) throws -> URL {
        let url = tmp.appendingPathComponent("harbor.story")
        try contents.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private func findTextView(in view: NSView) -> NSTextView? {
        if let scroll = view as? NSScrollView, let tv = scroll.documentView as? NSTextView { return tv }
        for sub in view.subviews {
            if let found = findTextView(in: sub) { return found }
        }
        return nil
    }

    func testTheVisibleBufferFollowsAReconcilingSave() throws {
        // The buffer would otherwise show text the file no longer has — the
        // author's next keystroke would then write the stale version back.
        let url = try makeStory()
        editor.openDocument(at: url)

        editor.saveActiveDocument()

        let onDisk = try String(contentsOf: url, encoding: .utf8)
        let minted = try XCTUnwrap(StoryHeaderIFID.read(from: onDisk))
        let textView = try XCTUnwrap(findTextView(in: editor.view))
        XCTAssertEqual(textView.string, onDisk, "the pane must show what is on disk")
        XCTAssertTrue(textView.string.contains("ifid: \(minted)"))
    }

    func testAReconcilingSaveRecomposesTheRealFile() throws {
        let url = try makeStory()
        var recomposed: [URL] = []
        editor.onStoryReconciled = { url, _ in recomposed.append(url) }
        editor.openDocument(at: url)

        editor.saveActiveDocument()

        XCTAssertEqual(recomposed, [url], "the rewritten file must be re-composed")
    }

    func testABrokenConfigRecomposesEvenThoughNothingWasRewritten() throws {
        // The hole this callback exists to close: while editing, compose runs
        // against a hidden snapshot that has no config of its own, so the
        // `story-config.broken` row would vanish at the first keystroke and
        // never return. A save puts it back.
        let url = try makeStory("story\n  title: Harbor\n  id: harbor\n  ifid: KEPT-1\n\ncreate the Quay\n  a room\n\n  Salt air.\n")
        try "{ not json".write(to: tmp.appendingPathComponent("harbor.config.json"),
                               atomically: true, encoding: .utf8)
        var recomposed: [URL] = []
        editor.onStoryReconciled = { url, _ in recomposed.append(url) }
        editor.openDocument(at: url)

        editor.saveActiveDocument()

        XCTAssertEqual(recomposed, [url])
        // And the save still happened, untouched — a sidecar problem never
        // costs the author their text.
        XCTAssertEqual(try String(contentsOf: url, encoding: .utf8),
                       "story\n  title: Harbor\n  id: harbor\n  ifid: KEPT-1\n\ncreate the Quay\n  a room\n\n  Salt air.\n")
    }

    func testAnAlreadyConsistentSaveDoesNotRecompose() throws {
        let url = try makeStory()
        editor.openDocument(at: url)
        editor.saveActiveDocument() // first save mints + reconciles

        var recomposed: [URL] = []
        editor.onStoryReconciled = { url, _ in recomposed.append(url) }
        editor.saveActiveDocument()

        XCTAssertTrue(recomposed.isEmpty, "a no-op save must not trigger compose work")
    }

    func testSaveAllReconcilesToo_BufferFollowsAndComposeReruns() throws {
        // saveAll is the ⌘B precondition and carries its OWN copy of the
        // reload-and-notify logic; a reconciling save must behave there
        // exactly as it does under ⌘S.
        let url = try makeStory()
        var recomposed: [URL] = []
        editor.onStoryReconciled = { url, _ in recomposed.append(url) }
        editor.openDocument(at: url)

        // Dirty it through the real edit path so saveAll picks it up.
        let textView = try XCTUnwrap(findTextView(in: editor.view))
        textView.string = Self.story + "\ncreate the Pier\n  a room\n\n  Weathered boards.\n"
        editor.textDidChange(Notification(name: NSText.didChangeNotification))

        XCTAssertTrue(editor.saveAllDocuments())

        let onDisk = try String(contentsOf: url, encoding: .utf8)
        let minted = try XCTUnwrap(StoryHeaderIFID.read(from: onDisk))
        XCTAssertTrue(onDisk.contains("Weathered boards."), "the author's edit was saved")
        XCTAssertEqual(textView.string, onDisk, "the visible buffer follows a saveAll reconciliation")
        XCTAssertTrue(textView.string.contains("ifid: \(minted)"))
        XCTAssertEqual(recomposed, [url])
    }

    func testANonStoryDocumentNeverRecomposes() throws {
        let notes = tmp.appendingPathComponent("notes.md")
        try "# Notes\n".write(to: notes, atomically: true, encoding: .utf8)
        var recomposed: [URL] = []
        editor.onStoryReconciled = { url, _ in recomposed.append(url) }
        editor.openDocument(at: notes)

        editor.saveActiveDocument()

        XCTAssertTrue(recomposed.isEmpty)
    }
}
