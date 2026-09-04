// ImportRefactorTests.swift
// GH #288: the text rules behind New Import and Extract Selection to Import —
// what a name may be, how a selection snaps to whole declarations, and what is
// refused (the story header; a selection with no declaration in it). Pure
// functions, so these run without a window; the editor's real-path half is
// EditorImportCommandTests.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

final class ImportRefactorTests: XCTestCase {

    // MARK: - Names

    func testANameIsTrimmedAndKeptAsTypedOtherwise() throws {
        XCTAssertEqual(try ImportRefactor.validatedName("  regions/harbor ").get(), "regions/harbor")
        XCTAssertEqual(try ImportRefactor.validatedName("npc-teisha").get(), "npc-teisha")
    }

    func testAnExtensionIsRefusedBecauseTheCompilerAppendsIt() {
        for raw in ["harbor.chord", "harbor.CHORD", "harbor.story"] {
            guard case .failure(let refusal) = ImportRefactor.validatedName(raw) else {
                return XCTFail("\(raw) should be refused")
            }
            XCTAssertTrue(refusal.message.contains("extension"), refusal.message)
        }
    }

    func testNamesThatLeaveTheStoryFolderAreRefused() {
        for raw in ["", "/abs", "~/x", "../up", "a/../b", "a//b", "a/./b", "say \"hi\""] {
            guard case .failure = ImportRefactor.validatedName(raw) else {
                return XCTFail("\(raw) should be refused")
            }
        }
    }

    func testFragmentURLAndImportLine() {
        let dir = URL(fileURLWithPath: "/stories/harbor")
        XCTAssertEqual(ImportRefactor.fragmentURL(for: "regions/pier", storyDirectory: dir).path,
                       "/stories/harbor/regions/pier.chord")
        XCTAssertEqual(ImportRefactor.importLine(for: "regions/pier"), "import \"regions/pier\"")
    }

    // MARK: - Snapping

    private let source = """
    story
      title: Harbor
      id: harbor

    create the Quay
      a room

      Salt air.

    define phrase gull-cry
      A gull cries.
    end phrase

    create the Pier
      a room

      Planks.

    """

    private func range(of text: String, in source: String) -> NSRange {
        (source as NSString).range(of: text)
    }

    func testASelectionInsideOneDeclarationSnapsToTheWholeDeclaration() throws {
        let selection = range(of: "Salt", in: source)
        let extraction = try ImportRefactor.extraction(from: source, selection: selection, name: "quay").get()
        XCTAssertEqual(extraction.fragmentText, "create the Quay\n  a room\n\n  Salt air.\n")
        XCTAssertEqual(extraction.replacement, "import \"quay\"\n")
        XCTAssertEqual((source as NSString).substring(with: extraction.range), extraction.fragmentText)
    }

    func testASelectionSpanningTwoDeclarationsTakesBothWhole() throws {
        let start = range(of: "Salt", in: source).location
        let end = range(of: "A gull", in: source).location + 2
        let extraction = try ImportRefactor.extraction(from: source, selection: NSRange(location: start, length: end - start), name: "x").get()
        XCTAssertEqual(extraction.fragmentText,
                       "create the Quay\n  a room\n\n  Salt air.\n\ndefine phrase gull-cry\n  A gull cries.\nend phrase\n")
    }

    func testASelectionStartingOnABlankLineStartsAtTheNextDeclaration() throws {
        // From the blank line before `define phrase` through its `end phrase`.
        let start = range(of: "\n\ndefine phrase", in: source).location + 1
        let end = range(of: "end phrase", in: source).location + 3
        let extraction = try ImportRefactor.extraction(from: source, selection: NSRange(location: start, length: end - start), name: "x").get()
        XCTAssertEqual(extraction.fragmentText, "define phrase gull-cry\n  A gull cries.\nend phrase\n")
    }

    func testASelectionEndingInsideTheLastDeclarationRunsToItsEndOfFile() throws {
        let selection = range(of: "the Pier", in: source)
        let extraction = try ImportRefactor.extraction(from: source, selection: selection, name: "x").get()
        XCTAssertEqual(extraction.fragmentText, "create the Pier\n  a room\n\n  Planks.\n")
        XCTAssertEqual(extraction.replacement, "import \"x\"\n")
    }

    func testTheImportLineDropsItsNewlineWhenTheRemovedTextHadNone() throws {
        let tail = "create the Pier\n  a room\n\n  Planks."
        let extraction = try ImportRefactor.extraction(from: tail, selection: NSRange(location: 0, length: 6), name: "x").get()
        XCTAssertEqual(extraction.fragmentText, tail + "\n")
        XCTAssertEqual(extraction.replacement, "import \"x\"")
    }

    func testACommentRunMovesAsItsOwnConstruct() throws {
        let src = "## The harbour.\n## Two lines.\n\ncreate the Quay\n  a room\n"
        let extraction = try ImportRefactor.extraction(from: src, selection: NSRange(location: 3, length: 2), name: "x").get()
        XCTAssertEqual(extraction.fragmentText, "## The harbour.\n## Two lines.\n")
    }

    // MARK: - Refusals

    func testAnEmptySelectionIsRefused() {
        guard case .failure(let refusal) = ImportRefactor.extraction(from: source, selection: NSRange(location: 40, length: 0), name: "x") else {
            return XCTFail("a caret is not a selection")
        }
        XCTAssertTrue(refusal.message.contains("Select"), refusal.message)
    }

    func testASelectionOfOnlyBlankLinesIsRefused() {
        let src = "create the Quay\n  a room\n\n\n\ncreate the Pier\n  a room\n"
        let blank = (src as NSString).range(of: "\n\n\n")
        guard case .failure = ImportRefactor.extraction(from: src, selection: NSRange(location: blank.location + 1, length: 1), name: "x") else {
            return XCTFail("blank lines hold no declaration")
        }
    }

    func testASelectionReachingTheStoryHeaderIsRefused() {
        let selection = range(of: "title: Harbor", in: source)
        guard case .failure(let refusal) = ImportRefactor.extraction(from: source, selection: selection, name: "x") else {
            return XCTFail("the header only lives in the .story file")
        }
        XCTAssertTrue(refusal.message.contains("story header"), refusal.message)
        XCTAssertFalse(refusal.message.contains("ADR"), "user-facing copy carries no ADR references")
    }

    func testAnImportLineInsideTheSelectionIsFineBecauseImportsNest() throws {
        let src = "create the Quay\n  a room\n\nimport \"npcs/teisha\"\n\ncreate the Pier\n  a room\n"
        let extraction = try ImportRefactor.extraction(from: src, selection: NSRange(location: 0, length: src.utf16.count), name: "x").get()
        XCTAssertEqual(extraction.fragmentText, src)
    }
}
