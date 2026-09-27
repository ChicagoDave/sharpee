// TestingSurfaceExitNoteTests.swift
// The note a failed Testing-tab run leaves the page (2026-09-27): a run the
// walker refuses closes its stream with an exit code and zero totals, and
// the only statement of WHY is on stderr — so the note carries stderr's
// tail, and a run that died silently says so rather than pointing at a
// report that never arrived.
// Owner context: tools/ide tests — TestingSurface.

import XCTest
@testable import SharpeeIDE

@MainActor
final class TestingSurfaceExitNoteTests: XCTestCase {

    func testANoteCarriesTheExitCodeAndTheDiagnosticsTail() {
        let note = TestingSurfaceViewController.exitNote(
            code: 2,
            diagnostics: "Tree document is malformed — 1 defect(s); nothing ran.\n  cards[3]: a 'boot' card is only valid at the main line's head\n")
        XCTAssertEqual(
            note,
            "The run exited 2.\nTree document is malformed — 1 defect(s); nothing ran.\n  cards[3]: a 'boot' card is only valid at the main line's head")
    }

    func testANoteWithNoDiagnosticsSaysTheRunEndedBeforeAnyLine() {
        XCTAssertEqual(TestingSurfaceViewController.exitNote(code: 3, diagnostics: "  \n"),
                       "The run exited 3 before any line ran.")
    }
}
