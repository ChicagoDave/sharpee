// RecordingChainTests.swift
// ADR-282 D4's session-splitting rules, at the string/state boundary: where a
// checkpoint cuts, what the gesture does, and which segment carries the opening
// turn. The end-to-end proof that the produced chain runs is
// RecordingChainSaveTests — this file pins the rules a passing run could hide.

import XCTest
@testable import SharpeeIDE

@MainActor
final class RecordingChainTests: XCTestCase {

    private func session(_ commands: [String]) -> RecordingSession {
        let session = RecordingSession()
        session.start()
        for command in commands {
            session.record(command: command, response: "response to \(command)")
        }
        return session
    }

    // MARK: - Where a checkpoint cuts

    func testAnUnmarkedSessionIsOneSegment() {
        let session = self.session(["one", "two"])

        XCTAssertFalse(session.hasCheckpoints)
        XCTAssertEqual(session.segments.count, 1)
        XCTAssertEqual(session.segments[0].map(\.command), ["one", "two"])
    }

    func testACheckpointedTurnEndsItsSegment() {
        let session = self.session(["one", "two", "three"])
        session.setCheckpoint(true, turnAt: 0)

        XCTAssertEqual(session.segments.map { $0.map(\.command) },
                       [["one"], ["two", "three"]])
    }

    func testTwoCheckpointsSaveAsThreeSegments() {
        // Acceptance 4's exact scenario, at the data level.
        let session = self.session(["one", "two", "three", "four"])
        session.setCheckpoint(true, turnAt: 0)
        session.setCheckpoint(true, turnAt: 2)

        XCTAssertEqual(session.segments.map { $0.map(\.command) },
                       [["one"], ["two", "three"], ["four"]])
    }

    func testACheckpointOnTheLastTurnAddsNoEmptySegment() {
        // An author who marks the end of the last chapter meant the chapter,
        // not an empty file after it.
        let session = self.session(["one", "two"])
        session.setCheckpoint(true, turnAt: 1)

        XCTAssertEqual(session.segments.map { $0.map(\.command) }, [["one", "two"]])
    }

    func testAnEmptySessionHasNoSegments() {
        let session = RecordingSession()
        session.start()

        XCTAssertEqual(session.segments.count, 0)
    }

    // MARK: - The live gesture

    func testTheGestureMarksTheTurnOnScreenAndTakesItBack() {
        let session = self.session(["one", "two"])

        XCTAssertTrue(session.toggleCheckpointOnLatestTurn())
        XCTAssertTrue(session.turns[1].isCheckpoint)
        XCTAssertFalse(session.turns[0].isCheckpoint, "the gesture marks the latest turn only")

        XCTAssertTrue(session.toggleCheckpointOnLatestTurn())
        XCTAssertFalse(session.turns[1].isCheckpoint)
    }

    func testABlankResponseStillTakesACheckpoint() {
        // Unlike bless: a checkpoint says where the author reached, not that
        // the text was right.
        let session = RecordingSession()
        session.start()
        session.record(command: "wait", response: "")

        XCTAssertFalse(session.canBlessLatestTurn, "a blank response carries no bless (D2)")
        XCTAssertTrue(session.canCheckpointLatestTurn)
        XCTAssertTrue(session.toggleCheckpointOnLatestTurn())
        XCTAssertTrue(session.turns[0].isCheckpoint)
    }

    func testTheGestureIsUnavailableWithNothingCaptured() {
        let session = RecordingSession()
        session.start()

        XCTAssertFalse(session.canCheckpointLatestTurn)
        XCTAssertFalse(session.toggleCheckpointOnLatestTurn())
    }

    func testTheGestureIsUnavailableWhenNotRecording() {
        let session = self.session(["one"])
        session.stop()

        XCTAssertFalse(session.canCheckpointLatestTurn)
        XCTAssertFalse(session.toggleCheckpointOnLatestTurn())
        XCTAssertFalse(session.turns[0].isCheckpoint)
    }

    // MARK: - Serialization

    func testOnlyTheFirstSegmentCarriesTheOpeningTurn() {
        // ADR-282's chain amendment: `--chain` runs ONE game across the files,
        // so segments 2..N are not fresh runs and have no banner to absorb. An
        // opening `look` in each would insert turns that never happened and
        // shift the state the next segment inherits.
        let session = self.session(["one", "two"])
        session.setCheckpoint(true, turnAt: 0)
        session.bless(turnAt: 0)

        let sources = session.serializeChain(title: "Chain")

        XCTAssertEqual(sources.count, 2)
        XCTAssertTrue(sources[0].contains("> look"), "the first segment replays the client's own look")
        XCTAssertFalse(sources[1].contains("> look"), "later segments must not")
    }

    func testEachSegmentCarriesItsPositionInTheTitle() {
        let session = self.session(["one", "two"])
        session.setCheckpoint(true, turnAt: 0)

        let sources = session.serializeChain(title: "Cellar")

        XCTAssertTrue(sources[0].hasPrefix("title: Cellar - part 1 of 2"))
        XCTAssertTrue(sources[1].hasPrefix("title: Cellar - part 2 of 2"))
    }

    func testEachSegmentCarriesOnlyItsOwnTurns() {
        let session = self.session(["one", "two"])
        session.setCheckpoint(true, turnAt: 0)

        let sources = session.serializeChain(title: "Chain")

        XCTAssertTrue(sources[0].contains("> one"))
        XCTAssertFalse(sources[0].contains("> two"))
        XCTAssertTrue(sources[1].contains("> two"))
        XCTAssertFalse(sources[1].contains("> one"))
    }

    func testTheVerdictsRideIntoTheSegmentTheyBelongTo() {
        let session = self.session(["one", "two"])
        session.setCheckpoint(true, turnAt: 0)
        session.bless(turnAt: 1)

        let sources = session.serializeChain(title: "Chain")

        XCTAssertTrue(sources[0].contains("[OK: any]"), "the untagged turn keeps the draft assertion")
        XCTAssertFalse(sources[0].contains("\n[OK]"))
        XCTAssertTrue(sources[1].contains("[OK]"), "the blessed turn asserts its response")
        XCTAssertTrue(sources[1].contains("end text"))
    }

    func testAnUnmarkedSessionSerializesAsOneSourceIdenticalToTheSingleFileForm() {
        // A caller need not branch on hasCheckpoints to walk the segments, and
        // the two paths must not drift.
        let session = self.session(["one"])
        session.bless(turnAt: 0)

        XCTAssertEqual(session.serializeChain(title: "Solo"),
                       [session.serialize(title: "Solo - part 1 of 1")])
    }
}
