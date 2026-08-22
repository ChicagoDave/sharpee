// EditorImportCommandTests.swift
// GH #288, real path: ImportCommands over a real EditorViewController and real
// files. New Import writes the fragment and puts the import line on its own
// line at the caret; Extract moves whole declarations to disk and leaves the
// import line exactly where they were; both refuse to overwrite an
// existing fragment and leave the buffer alone when they refuse.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class EditorImportCommandTests: XCTestCase {

    private var tmp: URL!
    private var editor: EditorViewController!
    private var storyURL: URL!

    private static let story = """
    story
      title: Harbor
      id: harbor

    create the Quay
      a room

      Salt air.

    create the Pier
      a room

      Planks.

    """

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-ImportCommands-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        storyURL = tmp.appendingPathComponent("harbor.story")
        try Self.story.write(to: storyURL, atomically: true, encoding: .utf8)
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

    private var commands: ImportCommands { ImportCommands(editor: editor, storyDirectory: tmp) }

    // MARK: - New Import

    func testNewImportWritesTheFragmentAndImportsItAtTheCaretsLine() throws {
        editor.openDocument(at: storyURL)
        let tv = try textView()
        // Caret in the middle of `create the Pier` — the import must land on
        // the line ABOVE it, whole, not inside the word.
        let caret = (Self.story as NSString).range(of: "the Pier").location
        tv.setSelectedRange(NSRange(location: caret, length: 0))

        let fragment = try commands.newImport(named: "regions/harbor", in: storyURL).get()

        XCTAssertEqual(fragment.path, tmp.appendingPathComponent("regions/harbor.chord").path)
        XCTAssertEqual(try String(contentsOf: fragment, encoding: .utf8), "", "a new import starts empty — the author writes it")
        let buffer = try XCTUnwrap(editor.currentText(of: storyURL))
        XCTAssertTrue(buffer.contains("  Salt air.\n\nimport \"regions/harbor\"\ncreate the Pier\n"), buffer)
        XCTAssertEqual(editor.activeDocument?.url, fragment, "the new fragment opens for writing")
        XCTAssertTrue(editor.currentText(at: storyURL) != nil, "the story tab stays open")
    }

    func testNewImportRefusesToOverwriteAnExistingFragmentAndLeavesTheBufferAlone() throws {
        try "create the Gull\n  a thing\n".write(to: tmp.appendingPathComponent("gull.chord"), atomically: true, encoding: .utf8)
        editor.openDocument(at: storyURL)

        guard case .failure(let refusal) = commands.newImport(named: "gull", in: storyURL) else {
            return XCTFail("an existing fragment must not be clobbered")
        }
        XCTAssertTrue(refusal.message.contains("already exists"), refusal.message)
        XCTAssertEqual(editor.currentText(of: storyURL), Self.story)
        XCTAssertEqual(try String(contentsOf: tmp.appendingPathComponent("gull.chord"), encoding: .utf8), "create the Gull\n  a thing\n")
    }

    // MARK: - Extract

    func testExtractMovesWholeDeclarationsToDiskAndLeavesTheImportLineInPlace() throws {
        editor.openDocument(at: storyURL)
        let tv = try textView()
        tv.setSelectedRange((Self.story as NSString).range(of: "Salt"))

        let fragment = try commands.extractSelection(tv.selectedRange(), in: storyURL, named: "quay").get()

        XCTAssertEqual(try String(contentsOf: fragment, encoding: .utf8), "create the Quay\n  a room\n\n  Salt air.\n")
        XCTAssertEqual(editor.currentText(of: storyURL),
                       "story\n  title: Harbor\n  id: harbor\n\nimport \"quay\"\n\ncreate the Pier\n  a room\n\n  Planks.\n")
        XCTAssertEqual(editor.activeDocument?.url, fragment)
    }

    func testExtractRefusesTheStoryHeaderBeforeTouchingAnything() throws {
        editor.openDocument(at: storyURL)
        let selection = (Self.story as NSString).range(of: "title: Harbor")

        XCTAssertThrowsError(try commands.checkSelection(selection, in: storyURL).get())
        guard case .failure = commands.extractSelection(selection, in: storyURL, named: "header") else {
            return XCTFail("the header stays in the .story file")
        }
        XCTAssertEqual(editor.currentText(of: storyURL), Self.story)
        XCTAssertFalse(FileManager.default.fileExists(atPath: tmp.appendingPathComponent("header.chord").path))
    }

    func testExtractFromAFragmentNestsTheNewImportInsideIt() throws {
        let market = tmp.appendingPathComponent("market.chord")
        try "create the Stall\n  a thing\n\ncreate Teisha\n  a person\n".write(to: market, atomically: true, encoding: .utf8)
        editor.openDocument(at: market)
        let selection = ("create the Stall\n  a thing\n\ncreate Teisha\n  a person\n" as NSString).range(of: "Teisha")

        let fragment = try commands.extractSelection(selection, in: market, named: "npc-teisha").get()

        XCTAssertEqual(try String(contentsOf: fragment, encoding: .utf8), "create Teisha\n  a person\n")
        XCTAssertEqual(editor.currentText(of: market), "create the Stall\n  a thing\n\nimport \"npc-teisha\"\n",
                       "a fragment may import — the market owns its people")
    }
}
