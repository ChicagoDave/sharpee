// EditorSaveAllTests.swift
// Build's save-precondition: the build reads DISK while compose reads the
// buffer, so ⌘B must flush every dirty document first — otherwise an unsaved
// header edit (version, blurb) silently builds the old source and the Play
// pane appears to ignore the change.

import XCTest
@testable import SharpeeIDE

@MainActor
final class EditorSaveAllTests: XCTestCase {

    private var tmp: URL!
    private var editor: EditorViewController!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-EditorSaveAllTests-\(UUID().uuidString)", isDirectory: true)
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

    private func makeFile(_ name: String, _ contents: String) throws -> URL {
        let url = tmp.appendingPathComponent(name)
        try contents.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    /// The editor's real edit path: type into the pane's NSTextView, then fire
    /// the delegate — direct Document mutation would be clobbered by the
    /// persist-on-switch sync.
    private func typeIntoActiveDocument(_ text: String) throws {
        let textView = try XCTUnwrap(findTextView(in: editor.view),
                                     "editor pane must host an NSTextView")
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

    func testSaveAllFlushesEveryDirtyDocumentToDisk() throws {
        let story = try makeFile("probe.story", "version: 0.1.0")
        let hatch = try makeFile("mod.ts", "export const a = 1")
        editor.openDocument(at: story)
        editor.openDocument(at: hatch)

        // Dirty the story tab, switch away (it becomes the inactive dirty tab),
        // then dirty the active hatch tab — both must flush on saveAll.
        editor.switchTo(index: 0)
        try typeIntoActiveDocument("version: 0.2.0")
        editor.switchTo(index: 1)
        try typeIntoActiveDocument("export const a = 2")

        XCTAssertTrue(editor.saveAllDocuments())

        XCTAssertEqual(try String(contentsOf: story, encoding: .utf8), "version: 0.2.0",
                       "the INACTIVE dirty tab must flush too — this is the ⌘B precondition")
        XCTAssertEqual(try String(contentsOf: hatch, encoding: .utf8), "export const a = 2")
    }

    func testSaveAllWithNothingDirtyIsACleanNoOp() throws {
        let story = try makeFile("probe.story", "version: 0.1.0")
        editor.openDocument(at: story)

        XCTAssertTrue(editor.saveAllDocuments())
        XCTAssertEqual(try String(contentsOf: story, encoding: .utf8), "version: 0.1.0")
    }
}
