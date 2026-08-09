// StoryHeaderAutoAssertionTests.swift
// Covers StoryHeaderAutoAssertion (go-live Phase 6e): reading the
// `auto-assertion:` policy, producing in-place replacements that preserve the
// author's field order and indent, inserting after the last header field,
// removing the line for "let me decide" (nil), and refusing to edit sources
// with no `story` block or nothing to change. Assertions apply the edit and
// compare whole resulting sources — the same text the editor path would
// produce.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

final class StoryHeaderAutoAssertionTests: XCTestCase {

    private let header = """
    story
      title: Probe
      id: probe
      ifid: 5A2E4B77-1C3D-4E5F-8A9B-0C1D2E3F4A5B

    create the Lab
      a room
    """

    private func applied(_ policy: StoryHeaderAutoAssertion.Policy?, to source: String) -> String? {
        StoryHeaderAutoAssertion.edit(setting: policy, in: source).map {
            StoryHeaderAutoAssertion.apply($0, to: source)
        }
    }

    // MARK: - read

    func testAnAbsentFieldReadsAsNil() {
        XCTAssertNil(StoryHeaderAutoAssertion.read(from: header))
    }

    func testADeclaredPolicyReadsBack() {
        let source = header.replacingOccurrences(
            of: "  id: probe",
            with: "  id: probe\n  auto-assertion: all-emitted-text")
        XCTAssertEqual(StoryHeaderAutoAssertion.read(from: source), .allEmittedText)
    }

    func testAValueTheCompilerWouldRejectReadsAsNil() {
        // The parser rejects `auto-assertion: everything`; the menu must show
        // "let me decide", exactly as the runner will behave — never guess a
        // nearest policy.
        let source = header.replacingOccurrences(
            of: "  id: probe",
            with: "  id: probe\n  auto-assertion: everything")
        XCTAssertNil(StoryHeaderAutoAssertion.read(from: source))
    }

    func testAKeyOutsideTheHeaderIsNotTheField() {
        let source = header + "\n  auto-assertion: all-emitted-text\n"
        // The scan stops at the first non-field line (`create…`), so a
        // look-alike later in the file is body text, not the header field.
        XCTAssertNil(StoryHeaderAutoAssertion.read(from: source))
    }

    func testNoStoryBlockReadsAsNil() {
        XCTAssertNil(StoryHeaderAutoAssertion.read(from: "grammar\n  id: g\n"))
    }

    // MARK: - edit: insert

    func testInsertingLandsAfterTheLastHeaderFieldWithItsIndent() {
        let result = applied(.roomDescription, to: header)
        XCTAssertEqual(result, """
        story
          title: Probe
          id: probe
          ifid: 5A2E4B77-1C3D-4E5F-8A9B-0C1D2E3F4A5B
          auto-assertion: room-description

        create the Lab
          a room
        """)
    }

    // MARK: - edit: replace in place

    func testChangingThePolicyReplacesTheLineInPlace() {
        let source = header.replacingOccurrences(
            of: "  id: probe",
            with: "  id: probe\n  auto-assertion: room-description")
        let result = applied(.allEmittedText, to: source)
        XCTAssertEqual(result, header.replacingOccurrences(
            of: "  id: probe",
            with: "  id: probe\n  auto-assertion: all-emitted-text"))
    }

    // MARK: - edit: remove

    func testLetMeDecideRemovesTheLine() {
        let source = header.replacingOccurrences(
            of: "  id: probe",
            with: "  id: probe\n  auto-assertion: all-emitted-text")
        XCTAssertEqual(applied(nil, to: source), header)
    }

    // MARK: - edit: nothing to do

    func testLetMeDecideOnAnAbsentFieldIsNoEdit() {
        XCTAssertNil(StoryHeaderAutoAssertion.edit(setting: nil, in: header))
    }

    func testSettingTheAlreadyDeclaredPolicyIsNoEdit() {
        let source = header.replacingOccurrences(
            of: "  id: probe",
            with: "  id: probe\n  auto-assertion: room-description")
        XCTAssertNil(StoryHeaderAutoAssertion.edit(setting: .roomDescription, in: source))
    }

    func testNoStoryBlockRefusesToEdit() {
        XCTAssertNil(StoryHeaderAutoAssertion.edit(setting: .allEmittedText,
                                                   in: "grammar\n  id: g\n"))
    }
}
