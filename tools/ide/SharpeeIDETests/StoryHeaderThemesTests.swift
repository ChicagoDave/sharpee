// StoryHeaderThemesTests.swift
// Covers StoryHeaderThemes (go-live Phase 6c): reading the `themes:` list,
// producing in-place replacements that preserve the author's field order and
// indent, inserting after the last header field, removing the line for an
// empty list, and refusing to edit sources with no `story` block or nothing
// to change. Assertions apply the edit and compare whole resulting sources —
// the same text the editor path would produce.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

final class StoryHeaderThemesTests: XCTestCase {

    private let header = """
    story
      title: Probe
      id: probe
      ifid: 5A2E4B77-1C3D-4E5F-8A9B-0C1D2E3F4A5B

    create the Lab
      a room
    """

    private func applied(_ ids: [String], to source: String) -> String? {
        StoryHeaderThemes.edit(setting: ids, in: source).map {
            StoryHeaderThemes.apply($0, to: source)
        }
    }

    // MARK: - read

    func testAnAbsentFieldReadsAsEmpty() {
        XCTAssertEqual(StoryHeaderThemes.read(from: header), [])
    }

    func testACommaSeparatedListReadsInOrderTrimmed() {
        let source = header.replacingOccurrences(
            of: "  id: probe",
            with: "  id: probe\n  themes: modern-dark,  paper , system-6")
        XCTAssertEqual(StoryHeaderThemes.read(from: source),
                       ["modern-dark", "paper", "system-6"])
    }

    func testAKeyOutsideTheHeaderIsNotTheField() {
        let source = header + "\n  themes: paper\n"
        // The scan stops at the first non-field line (`create…`), so a
        // look-alike later in the file is body text, not the header field.
        XCTAssertEqual(StoryHeaderThemes.read(from: source), [])
    }

    func testNoStoryBlockReadsAsEmpty() {
        XCTAssertEqual(StoryHeaderThemes.read(from: "grammar\n  id: g\n"), [])
    }

    // MARK: - edit: insert

    func testInsertingLandsAfterTheLastHeaderFieldWithItsIndent() {
        let result = applied(["paper", "system-6"], to: header)
        XCTAssertEqual(result, """
        story
          title: Probe
          id: probe
          ifid: 5A2E4B77-1C3D-4E5F-8A9B-0C1D2E3F4A5B
          themes: paper, system-6

        create the Lab
          a room
        """)
    }

    /// A list-valued field (`authors:` with one indented name per line) must
    /// survive the insert whole. The scan reads a list item as a non-field, so
    /// before the list-aware step-over it stopped on the first author and the
    /// insert landed between `authors:` and its authors — leaving an empty list
    /// the compiler rejects (`parse.header-list-empty`), which corrupted the
    /// author's story on a theme toggle.
    func testInsertingLandsAfterAListValuedFieldNotInsideIt() {
        let source = """
        story
          title: Probe
          authors:
            Ada
            Grace
          id: probe

        create the Lab
          a room
        """
        XCTAssertEqual(applied(["paper", "system-6"], to: source), """
        story
          title: Probe
          authors:
            Ada
            Grace
          id: probe
          themes: paper, system-6

        create the Lab
          a room
        """)
    }

    /// The same list, last in the header — the insert goes after the final
    /// item, not between the key and its first value.
    func testInsertingAfterATrailingListKeepsTheListIntact() {
        let source = "story\n  title: Probe\n  authors:\n    Ada\n"
        XCTAssertEqual(applied(["paper"], to: source),
                       "story\n  title: Probe\n  authors:\n    Ada\n  themes: paper\n")
    }

    func testInsertingIntoAHeaderWithoutTrailingNewlineSuppliesTheBreak() {
        let bare = "story\n  id: probe"
        XCTAssertEqual(applied(["paper"], to: bare), "story\n  id: probe\n  themes: paper\n")
    }

    // MARK: - edit: replace in place

    func testReplacingKeepsTheAuthorsFieldOrder() {
        let source = header.replacingOccurrences(
            of: "  id: probe",
            with: "  themes: modern-dark\n  id: probe")
        let result = applied(["modern-dark", "paper"], to: source)
        XCTAssertEqual(result, header.replacingOccurrences(
            of: "  id: probe",
            with: "  themes: modern-dark, paper\n  id: probe"))
    }

    // MARK: - edit: remove

    func testAnEmptyListRemovesTheLineEntirely() {
        let source = header.replacingOccurrences(
            of: "  id: probe",
            with: "  id: probe\n  themes: paper")
        XCTAssertEqual(applied([], to: source), header)
    }

    // MARK: - edit: refusals

    func testNoStoryBlockRefuses() {
        XCTAssertNil(StoryHeaderThemes.edit(setting: ["paper"], in: "grammar\n  id: g\n"))
    }

    func testAnUnchangedListRefusesToDirtyTheTab() {
        let source = header.replacingOccurrences(
            of: "  id: probe",
            with: "  id: probe\n  themes: paper, system-6")
        XCTAssertNil(StoryHeaderThemes.edit(setting: ["paper", "system-6"], in: source))
    }

    func testAnEmptyListOverAnAbsentFieldRefuses() {
        XCTAssertNil(StoryHeaderThemes.edit(setting: [], in: header))
    }
}
