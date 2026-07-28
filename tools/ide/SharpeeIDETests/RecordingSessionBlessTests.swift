// RecordingSessionBlessTests.swift
// Covers the author's marks on a recorded session (ADR-282 D1/D4): the per-turn
// bless verdict with its optional selected fragment, withdrawing a bless, and
// checkpoint marks. Capture only — turning a blessed verdict into an `[OK]`
// assertion is Phase 2, and the last test here pins that Phase 1 did NOT change
// serialization, so ADR-277 D5's draft format is unregressed.
//
// ADR-277's own recording tests live in RecordingSessionTests; this file is
// deliberately separate so the two ADRs' expectations don't tangle.

import XCTest
@testable import SharpeeIDE

@MainActor
final class RecordingSessionBlessTests: XCTestCase {

    private func sessionWithTurns() -> RecordingSession {
        let session = RecordingSession()
        session.start()
        session.record(command: "look", response: "The cellar door hangs open.")
        session.record(command: "take lantern", response: "Taken.")
        session.record(command: "wait", response: "")
        return session
    }

    // MARK: - DOES: a bless records the author's vouch

    func testBlessingATurnRecordsTheVerdictAgainstThatTurnOnly() {
        let session = sessionWithTurns()

        XCTAssertTrue(session.bless(turnAt: 0))

        XCTAssertEqual(session.turns[0].verdict, .blessed(selection: nil))
        XCTAssertEqual(session.turns[1].verdict, .untagged,
                       "blessing one turn must not touch its neighbours")
    }

    func testBlessingWithNoSelectionAssertsTheWholeResponse() {
        let session = sessionWithTurns()
        session.bless(turnAt: 0)

        // nil selection is D2's "assert the full response" case — distinct from
        // a selection that happens to be empty.
        guard case .blessed(let selection) = session.turns[0].verdict else {
            return XCTFail("expected blessed")
        }
        XCTAssertNil(selection)
    }

    func testBlessingWithASelectionCarriesTheExactFragment() {
        let session = sessionWithTurns()
        session.bless(turnAt: 0, selection: "cellar door hangs open")

        XCTAssertEqual(session.turns[0].verdict,
                       .blessed(selection: "cellar door hangs open"))
    }

    func testReBlessingReplacesTheSelectionRatherThanStacking() {
        let session = sessionWithTurns()
        session.bless(turnAt: 0, selection: "cellar door")
        session.bless(turnAt: 0, selection: "hangs open")

        XCTAssertEqual(session.turns[0].verdict, .blessed(selection: "hangs open"))
        XCTAssertEqual(session.blessedTurns.count, 1, "re-blessing must not add a turn")
    }

    func testBlessedTurnsReportsOnlyTheVouchedOnes() {
        let session = sessionWithTurns()
        session.bless(turnAt: 1, selection: nil)

        XCTAssertEqual(session.blessedTurns.map(\.command), ["take lantern"])
    }

    // MARK: - REJECTS WHEN

    func testATurnWithAnEmptyResponseCannotBeBlessed() {
        let session = sessionWithTurns()

        // Blank output is a runner-level failure regardless of assertion, and an
        // empty fence is an ADR-287 validation error — so the Play pane shows no
        // affordance and the model refuses the gesture (D2).
        XCTAssertFalse(session.turns[2].isBlessable)
        XCTAssertFalse(session.bless(turnAt: 2))
        XCTAssertEqual(session.turns[2].verdict, .untagged)
        XCTAssertTrue(session.blessedTurns.isEmpty)
    }

    func testAWhitespaceOnlyResponseCountsAsEmpty() {
        let session = RecordingSession()
        session.start()
        session.record(command: "wait", response: "  \n\t \n ")

        XCTAssertFalse(session.turns[0].isBlessable,
                       "whitespace-only output would fence as empty — same failure, later")
        XCTAssertFalse(session.bless(turnAt: 0))
    }

    func testBlessingAnOutOfRangeTurnChangesNothing() {
        let session = sessionWithTurns()
        let before = session.turns

        XCTAssertFalse(session.bless(turnAt: 99))
        XCTAssertFalse(session.unbless(turnAt: -1))
        XCTAssertFalse(session.setCheckpoint(true, turnAt: 99))
        XCTAssertEqual(session.turns, before, "an out-of-range mark must leave the session untouched")
    }

    // MARK: - Withdrawing a bless

    func testUnblessingReturnsTheTurnToUntagged() {
        let session = sessionWithTurns()
        session.bless(turnAt: 0, selection: "cellar door")

        XCTAssertTrue(session.unbless(turnAt: 0))
        XCTAssertEqual(session.turns[0].verdict, .untagged)
        XCTAssertTrue(session.blessedTurns.isEmpty,
                      "a withdrawn bless must not still count toward the save-flow's bless check")
    }

    // MARK: - Checkpoints (D4)

    func testCheckpointsAreIndependentOfBlessing() {
        let session = sessionWithTurns()
        session.setCheckpoint(true, turnAt: 1)

        // A checkpoint splits the chain; it is not a vouch. An untagged turn can
        // carry one, and it must not make the turn count as blessed.
        XCTAssertTrue(session.turns[1].isCheckpoint)
        XCTAssertEqual(session.turns[1].verdict, .untagged)
        XCTAssertTrue(session.blessedTurns.isEmpty)
    }

    func testACheckpointCanBeCleared() {
        let session = sessionWithTurns()
        session.setCheckpoint(true, turnAt: 1)
        session.setCheckpoint(false, turnAt: 1)

        XCTAssertFalse(session.turns[1].isCheckpoint)
    }

    func testAnEmptyResponseTurnCanStillCarryACheckpoint() {
        let session = sessionWithTurns()

        // The empty-response rule is about ASSERTING, not about splitting: a
        // chapter boundary may well land on a turn that printed nothing.
        XCTAssertTrue(session.setCheckpoint(true, turnAt: 2))
        XCTAssertTrue(session.turns[2].isCheckpoint)
    }

    // MARK: - Phase boundary

    func testSerializationIsUnchangedByBlessingInThisPhase() {
        let session = sessionWithTurns()
        session.bless(turnAt: 0, selection: "cellar door")
        session.setCheckpoint(true, turnAt: 1)

        // Phase 1 CARRIES the marks; Phase 2 encodes them. Until then a blessed
        // turn must still serialize as ADR-277 D5's draft, so the recording
        // feature that already shipped is unregressed.
        let output = session.serialize(title: "Draft")
        XCTAssertTrue(output.contains("[OK: any]"))
        XCTAssertFalse(output.contains("[OK: contains"),
                       "Phase 1 must not start encoding assertions — that is Phase 2")
        XCTAssertEqual(output.components(separatedBy: "[OK: any]").count - 1, 3,
                       "every captured turn still carries the draft assertion")
    }
}
