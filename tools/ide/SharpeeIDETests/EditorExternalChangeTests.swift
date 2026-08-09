// EditorExternalChangeTests.swift
// ADR-306 D9 / AC-3, both sides: an external write to a CLEAN buffer reloads
// it silently; a DIRTY buffer is badged and NEITHER side is clobbered until
// the author chooses. Asserted on buffer content AND file content — never on
// the badge alone. Real path: real files, the editor's real text view and
// delegate, the real DispatchSource watcher.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class EditorExternalChangeTests: XCTestCase {

    private var tmp: URL!
    private var editor: EditorViewController!

    override func setUpWithError() throws {
        try super.setUpWithError()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-ExternalChangeTests-\(UUID().uuidString)",
                                    isDirectory: true)
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
        try super.tearDown()
    }

    private func makeFile(_ name: String, _ contents: String) throws -> URL {
        let url = tmp.appendingPathComponent(name)
        try contents.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    /// The editor's real edit path: type into the pane's text view, then fire
    /// the delegate — direct Document mutation would be clobbered by the
    /// persist-on-switch sync.
    private func typeIntoActiveDocument(_ text: String) throws {
        let textView = try XCTUnwrap(findTextView(in: editor.view))
        textView.string = text
        editor.textDidChange(Notification(name: NSText.didChangeNotification))
    }

    private func findTextView(in view: NSView) -> NSTextView? {
        if let scroll = view as? NSScrollView, let tv = scroll.documentView as? NSTextView {
            return tv
        }
        for sub in view.subviews {
            if let found = findTextView(in: sub) { return found }
        }
        return nil
    }

    /// Pumps the main queue (the watcher delivers there) until `condition`.
    private func waitUntil(_ what: String, _ condition: () -> Bool) async throws {
        for _ in 0..<100 {
            if condition() { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("timed out waiting for \(what)")
    }

    func testCleanBufferReloadsSilentlyOnExternalWrite() async throws {
        let file = try makeFile("clean.transcript", "title: original\n")
        editor.openDocument(at: file)

        // The testing surface's writer rewrites the file (atomic replace).
        try "title: rewritten\n".write(to: file, atomically: true, encoding: .utf8)

        try await waitUntil("silent reload of the clean buffer") {
            self.editor.currentText(at: file) == "title: rewritten\n"
        }
        XCTAssertFalse(editor.hasUnsavedChanges(at: file),
                       "a silent reload leaves the buffer clean")
        XCTAssertTrue(editor.conflictedURLs.isEmpty, "clean reloads are not conflicts")
        // The file side is untouched by the reload.
        XCTAssertEqual(try String(contentsOf: file, encoding: .utf8), "title: rewritten\n")
    }

    func testDirtyBufferIsBadgedAndNeitherSideIsClobbered() async throws {
        let file = try makeFile("dirty.transcript", "title: original\n")
        editor.openDocument(at: file)
        try typeIntoActiveDocument("title: my unsaved edits\n")
        XCTAssertTrue(editor.hasUnsavedChanges(at: file))

        try "title: tool wrote this\n".write(to: file, atomically: true, encoding: .utf8)

        try await waitUntil("the conflict badge") {
            self.editor.conflictedURLs.contains(file)
        }
        // Neither side clobbered: the buffer keeps the author's edits, the
        // file keeps the tool's write — asserted on content, not the badge.
        XCTAssertEqual(editor.currentText(at: file), "title: my unsaved edits\n",
                       "the dirty buffer must NOT be silently reloaded")
        XCTAssertEqual(try String(contentsOf: file, encoding: .utf8), "title: tool wrote this\n",
                       "the file must NOT be silently overwritten by the buffer")
        XCTAssertTrue(editor.hasUnsavedChanges(at: file), "the buffer stays dirty until chosen")
    }

    func testOwnIdenticalWriteIsNeverAConflict() async throws {
        let file = try makeFile("same.transcript", "title: same\n")
        editor.openDocument(at: file)
        try typeIntoActiveDocument("title: same but dirty\n")

        // A write of exactly the buffer's content (e.g. the editor's own
        // save) has nothing to arbitrate.
        try "title: same but dirty\n".write(to: file, atomically: true, encoding: .utf8)

        // Give the watcher time to see it, then assert no conflict appeared.
        try await Task.sleep(nanoseconds: 500_000_000)
        XCTAssertTrue(editor.conflictedURLs.isEmpty,
                      "an identical write is our own save, not a conflict")
    }

    func testWatcherSurvivesAtomicReplaceChains() async throws {
        // Atomic writes rename a new vnode over the path — the watcher must
        // re-arm or the SECOND rewrite would go unseen.
        let file = try makeFile("chain.transcript", "v1\n")
        editor.openDocument(at: file)
        try "v2\n".write(to: file, atomically: true, encoding: .utf8)
        try await waitUntil("first reload") { self.editor.currentText(at: file) == "v2\n" }
        try "v3\n".write(to: file, atomically: true, encoding: .utf8)
        try await waitUntil("second reload — the re-armed watcher") {
            self.editor.currentText(at: file) == "v3\n"
        }
    }
}
