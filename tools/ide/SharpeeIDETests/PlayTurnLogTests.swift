// PlayTurnLogTests.swift
// The promotion log's semantics (ADR-305 D2/D3): a turn record appends, a
// restart fence clears the lineage AND the selection, malformed bodies change
// nothing, selection only ever holds ordinals the log knows, and the CLI
// payload stamps `selected` onto the RAW records — captures round-trip
// untouched, policy present only when declared, nil for an empty selection.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class PlayTurnLogTests: XCTestCase {

    private var log: PlayTurnLog!

    override func setUp() {
        super.setUp()
        log = PlayTurnLog()
    }

    private func turnBody(_ turn: Int, command: String = "look",
                          output: String = "The den is quiet.",
                          captures: String = "[]") -> String {
        """
        {"turn": \(turn), "command": "\(command)", "output": "\(output)", "captures": \(captures)}
        """
    }

    func testTurnRecordAppends() {
        XCTAssertEqual(log.ingest(messageBody: turnBody(1)), .turn(ordinal: 1))
        XCTAssertEqual(log.ingest(messageBody: turnBody(2, command: "north")), .turn(ordinal: 2))
        XCTAssertEqual(log.turns.map(\.turn), [1, 2])
        XCTAssertEqual(log.turns.map(\.command), ["look", "north"])
    }

    func testRestartFenceClearsLineageAndSelection() {
        log.ingest(messageBody: turnBody(1))
        log.ingest(messageBody: turnBody(2))
        log.setSelection([2])
        XCTAssertEqual(log.ingest(messageBody: #"{"restart": true, "turn": 3}"#),
                       .restart(firstOrdinal: 3))
        XCTAssertTrue(log.turns.isEmpty)
        XCTAssertTrue(log.selection.isEmpty)
    }

    func testMalformedBodyChangesNothing() {
        log.ingest(messageBody: turnBody(1))
        XCTAssertEqual(log.ingest(messageBody: "{not json"), .malformed)
        XCTAssertEqual(log.ingest(messageBody: #"{"turn": 2}"#), .malformed)
        XCTAssertEqual(log.turns.count, 1)
    }

    func testSelectionIntersectsKnownOrdinals() {
        log.ingest(messageBody: turnBody(1))
        log.ingest(messageBody: turnBody(2))
        log.setSelection([2, 9])
        XCTAssertEqual(log.selection, [2])
        XCTAssertEqual(log.selectionSpan?.first, 2)
        XCTAssertEqual(log.selectionSpan?.last, 2)
    }

    func testPayloadStampsSelectionOntoRawRecords() throws {
        log.ingest(messageBody: turnBody(1))
        log.ingest(messageBody: turnBody(
            2, command: "north", output: "North Hall",
            captures: #"[{"channel": "room-name", "values": ["North Hall"]}]"#))
        log.setSelection([2])

        let data = try XCTUnwrap(log.payloadJSON(policy: "room-name-and-description",
                                                 seed: 42, title: "probe"))
        let payload = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(payload["seed"] as? Int, 42)
        XCTAssertEqual(payload["policy"] as? String, "room-name-and-description")
        XCTAssertEqual(payload["title"] as? String, "probe")

        let turns = try XCTUnwrap(payload["turns"] as? [[String: Any]])
        XCTAssertEqual(turns.map { $0["selected"] as? Bool }, [false, true])
        // Captures round-trip untouched — Swift never re-shapes the record.
        let captures = try XCTUnwrap(turns[1]["captures"] as? [[String: Any]])
        XCTAssertEqual(captures.first?["channel"] as? String, "room-name")
        XCTAssertEqual(captures.first?["values"] as? [String], ["North Hall"])
    }

    func testPayloadOmitsPolicyWhenLetMeDecide() throws {
        log.ingest(messageBody: turnBody(1))
        log.setSelection([1])
        let data = try XCTUnwrap(log.payloadJSON(policy: nil, seed: 42, title: "probe"))
        let payload = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertNil(payload["policy"])
    }

    func testPayloadIsNilForEmptySelection() {
        log.ingest(messageBody: turnBody(1))
        XCTAssertNil(log.payloadJSON(policy: nil, seed: 42, title: "probe"))
    }
}
