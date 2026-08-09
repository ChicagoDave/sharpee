// StoryHeaderPublishSourceTests.swift
// Pins the `publish-source:` field the Publish checkbox writes (ADR-284).
// Every case asserts on the RESULTING SOURCE TEXT, not on a return flag: the
// file is what `sharpee publish` reads, so a write that returns success while
// producing a header the compiler rejects is the failure worth catching.
// Owner context: tools/ide — Workspace tests.

import XCTest
@testable import SharpeeIDE

final class StoryHeaderPublishSourceTests: XCTestCase {

    private let header = """
    story
      title: The Folly at Fernhill
      authors: The Sharpee Project
      id: fernhill
      ifid: 8221EC69-3D96-4F60-A057-99D1FE72000F

    define room hall
    end room

    """

    // MARK: - Reading

    func testAbsentFieldReadsAsFalse() {
        XCTAssertFalse(StoryHeaderPublishSource.read(from: header))
    }

    func testReadsEveryAcceptedTruthySpelling() {
        for word in ["yes", "true", "YES", "True"] {
            let source = header.replacingOccurrences(of: "  id: fernhill",
                                                     with: "  id: fernhill\n  publish-source: \(word)")
            XCTAssertTrue(StoryHeaderPublishSource.read(from: source), "\(word) should read as true")
        }
        for word in ["no", "false", "NO", "False"] {
            let source = header.replacingOccurrences(of: "  id: fernhill",
                                                     with: "  id: fernhill\n  publish-source: \(word)")
            XCTAssertFalse(StoryHeaderPublishSource.read(from: source), "\(word) should read as false")
        }
    }

    func testAnUnparseableValueReadsAsFalse() {
        // The compiler rejects this header outright. Until the author fixes it,
        // the checkbox must not show "shipping your source".
        let source = header.replacingOccurrences(of: "  id: fernhill",
                                                 with: "  id: fernhill\n  publish-source: maybe")
        XCTAssertFalse(StoryHeaderPublishSource.read(from: source))
    }

    func testAKeyInsideANestedBlockIsNotTheHeaderField() {
        let source = """
        story
          title: T
          authors: N

        define room hall
          publish-source: yes
        end room

        """
        XCTAssertFalse(StoryHeaderPublishSource.read(from: source))
    }

    // MARK: - Writing

    /// The source after setting the field, or nil when there is no edit to make.
    private func writing(_ value: Bool, into source: String) -> String? {
        guard let edit = StoryHeaderPublishSource.edit(setting: value, in: source) else { return nil }
        return StoryHeaderPublishSource.apply(edit, to: source)
    }

    func testInsertsTheFieldAfterTheLastHeaderField() {
        let written = writing(true, into: header)
        XCTAssertNotNil(written)
        XCTAssertTrue(written!.contains("  ifid: 8221EC69-3D96-4F60-A057-99D1FE72000F\n  publish-source: yes\n"),
                      "field should land after the last header field, at its indent:\n\(written!)")
        // The rest of the file is untouched.
        XCTAssertTrue(written!.contains("define room hall"))
        XCTAssertTrue(written!.contains("  title: The Folly at Fernhill"))
        // And it round-trips through the reader.
        XCTAssertTrue(StoryHeaderPublishSource.read(from: written!))
    }

    func testReplacesAnExistingLineInPlaceKeepingFieldOrder() {
        let source = header.replacingOccurrences(of: "  id: fernhill",
                                                 with: "  publish-source: yes\n  id: fernhill")
        let written = writing(false, into: source)
        XCTAssertNotNil(written)
        // Replaced where it was — not removed and re-appended.
        XCTAssertTrue(written!.contains("  publish-source: no\n  id: fernhill"), written!)
        // Exactly one such field survives; a duplicate would be a parse error.
        XCTAssertEqual(written!.components(separatedBy: "publish-source:").count - 1, 1)
        XCTAssertFalse(StoryHeaderPublishSource.read(from: written!))
    }

    func testWritesTheAuthorFacingSpelling() {
        let on = writing(true, into: header)!
        XCTAssertTrue(on.contains("publish-source: yes"))
        // `no` is only ever written over an existing `yes` — an absent field
        // already means no, so there is nothing to write in that direction.
        XCTAssertTrue(writing(false, into: on)!.contains("publish-source: no"))
    }

    func testTogglingTwiceReturnsTheHeaderToItsMeaning() {
        let on = writing(true, into: header)!
        let off = writing(false, into: on)!
        XCTAssertFalse(StoryHeaderPublishSource.read(from: off))
        XCTAssertEqual(off.components(separatedBy: "publish-source:").count - 1, 1)
    }

    func testHeaderWithoutATrailingNewlineDoesNotSpliceOntoTheLastField() {
        let source = "story\n  title: T\n  authors: N"
        XCTAssertEqual(writing(true, into: source), "story\n  title: T\n  authors: N\n  publish-source: yes\n")
    }

    func testRefusesASourceWithNoStoryBlock() {
        // Nothing to write into. Returning nil is what stops the caller from
        // saving an invented header over the author's file.
        XCTAssertNil(StoryHeaderPublishSource.edit(setting: true, in: "define room hall\nend room\n"))
    }

    func testNoEditWhenTheFieldAlreadyReadsThatWay() {
        // Re-asserting the current value must not dirty the author's tab or
        // push an undo entry that changes nothing.
        let on = writing(true, into: header)!
        XCTAssertNil(StoryHeaderPublishSource.edit(setting: true, in: on))
        XCTAssertNil(StoryHeaderPublishSource.edit(setting: false, in: header)) // absent already means no
    }
}
