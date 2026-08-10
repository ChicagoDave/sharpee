// StoryHeaderIFIDTests.swift
// The story header's `ifid:` line under ADR-309: reading the header's current
// value, and the edit that makes it render the config sidecar's value —
// inserted when missing, overwritten when an author changed it, refused when
// it already agrees. The header shapes here are the real ones: fernhill's
// (nested `use`/`on` blocks an edit must never reach into) and the
// `sharpee init` template's.
//
// The Problems panel's "Generate IFID" fix that this file used to cover
// retired with the `analysis.missing-ifid` diagnostic (ADR-309): the tool now
// guarantees the field, so there is no fix for an author to press.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class StoryHeaderIFIDTests: XCTestCase {

    // fernhill's header: simple fields, then `use`/`on` blocks that an `ifid:`
    // must never be dropped inside.
    private let fernhill = """
    ## The Folly at Fernhill — one winter night to find the deed.

    story
      title: The Folly at Fernhill
      authors: The Sharpee Project
      id: fernhill
      story-version: 0.3.0
      description: One cold winter night to find the deed.
      states: evening, midnight
      use state-machines
      use scoring
        rank "Trespasser" at 0

      on every turn while one chance in 12
        phrase distant-bell
      end on

    create the Grounds
      a region

    """
    // MARK: - Reconciliation edits (ADR-309 D3)

    func testEditOverwritesAHandEditedValueInPlace() {
        // The case `insertion(of:into:)` cannot serve — it refuses when the
        // field exists, because it was built for a one-shot fix, not for
        // reconciliation. Under ADR-309 an author's edit must not stick.
        let source = """
        story
          title: Harbor
          id: harbor
          ifid: HAND-EDITED
          story-version: 0.1.0

        """
        let edit = StoryHeaderIFID.edit(setting: "CANON-1234", in: source)
        let result = StoryHeaderIFID.apply(try! XCTUnwrap(edit), to: source)

        XCTAssertTrue(result.contains("  ifid: CANON-1234"))
        XCTAssertFalse(result.contains("HAND-EDITED"))
        // In place: the author's field order survives.
        let lines = result.components(separatedBy: "\n")
        XCTAssertEqual(lines[3], "  ifid: CANON-1234")
        XCTAssertEqual(lines[4], "  story-version: 0.1.0")
    }

    func testEditInsertsAMissingLineAfterId() {
        let source = "story\n  title: Harbor\n  id: harbor\n  story-version: 0.1.0\n"
        let edit = StoryHeaderIFID.edit(setting: "NEW-5678", in: source)
        let result = StoryHeaderIFID.apply(try! XCTUnwrap(edit), to: source)

        XCTAssertEqual(result, "story\n  title: Harbor\n  id: harbor\n  ifid: NEW-5678\n  story-version: 0.1.0\n")
    }

    func testEditRefusesWhenTheHeaderAlreadyReadsTheValue() {
        // No edit means no spurious undo entry and no dirty tab.
        let source = "story\n  id: harbor\n  ifid: SAME-9999\n"
        XCTAssertNil(StoryHeaderIFID.edit(setting: "SAME-9999", in: source))
    }

    func testEditNeverReachesIntoANestedBlock() {
        // fernhill's shape: an `ifid:` inside a `use`/`on` block is not the
        // header's field, and the reconciling edit must not touch it.
        let edit = StoryHeaderIFID.edit(setting: "FERN-0001", in: fernhill)
        let result = StoryHeaderIFID.apply(try! XCTUnwrap(edit), to: fernhill)

        let lines = result.components(separatedBy: "\n")
        let idIndex = try! XCTUnwrap(lines.firstIndex(of: "  id: fernhill"))
        XCTAssertEqual(lines[idIndex + 1], "  ifid: FERN-0001")
        XCTAssertTrue(result.contains("  use state-machines"), "the nested blocks are untouched")
    }

    func testReadReturnsTheHeaderValueAndIgnoresNestedFields() {
        XCTAssertEqual(StoryHeaderIFID.read(from: "story\n  id: h\n  ifid: READ-ME\n"), "READ-ME")
        XCTAssertNil(StoryHeaderIFID.read(from: fernhill), "fernhill's header declares none")
        XCTAssertNil(StoryHeaderIFID.read(from: "story\n  id: h\n  ifid:\n"), "an empty value is no value")
    }

    // MARK: - The minted identifier

    func testMintedIfidsMeetTheTreatyOfBabelShape() {
        let pattern = try! NSRegularExpression(pattern: "^[A-Z0-9-]{8,63}$")
        var seen = Set<String>()
        for _ in 0..<20 {
            let ifid = StoryHeaderIFID.mint()
            let range = NSRange(ifid.startIndex..., in: ifid)
            XCTAssertNotNil(pattern.firstMatch(in: ifid, range: range),
                            "\(ifid) must be uppercase A-Z/0-9/- and 8–63 characters (ADR-074)")
            seen.insert(ifid)
        }
        XCTAssertEqual(seen.count, 20, "each mint must be a distinct identifier")
    }
}
