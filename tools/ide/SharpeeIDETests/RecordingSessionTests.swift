// RecordingSessionTests.swift
// Covers Play-session recording (ADR-277 D5 as superseded by ADR-294 D2):
// session state (capture only while recording), the draft capture format for
// UNTAGGED turns (per turn `> command` + `[SKIP]` + `#`-comment response —
// the turn executes and advances state, asserting nothing), and the
// WKScriptMessage decode path into the session.
//
// ADR-282 Acceptance 3 SUPERSEDES this file's original closing test, which
// proved an unconditional all-draft save re-ran green through the real
// CLI. That save is now refused — a recording nobody vouched for asserts
// nothing an author meant — so the real-path test below pins the REFUSAL
// instead. The "a saved recording re-runs green" proof did not disappear: it
// moved to RecordingSaveAsTestTests, where the session has a bless in it and
// the assertion being replayed is a real one.

import WebKit
import XCTest
@testable import SharpeeIDE

@MainActor
final class RecordingSessionTests: XCTestCase {

    // MARK: - Session state

    func testCapturesOnlyWhileRecording() {
        let session = RecordingSession()
        session.record(command: "look", response: "ignored — not recording")
        XCTAssertTrue(session.turns.isEmpty)

        session.start()
        session.record(command: "take lamp", response: "Taken.")
        session.stop()
        session.record(command: "drop lamp", response: "ignored — stopped")

        XCTAssertEqual(session.turns, [RecordedTurn(command: "take lamp", response: "Taken.")])
    }

    func testStartDropsPriorCapture() {
        let session = RecordingSession()
        session.start()
        session.record(command: "look", response: "A room.")
        session.start()
        XCTAssertTrue(session.turns.isEmpty)
        XCTAssertTrue(session.isRecording)
    }

    // MARK: - Capture format (D5 as amended)

    func testSerializeWritesSkipWithCommentedResponse() {
        let session = RecordingSession()
        session.start()
        session.record(command: "take the brass lamp", response: "Taken.")
        session.record(command: "look", response: "A small square den.\nA lamp glints here.")
        session.stop()

        let source = session.serialize(title: "Recorded: smoke")
        XCTAssertEqual(source, """
        title: Recorded: smoke
        ---

        > look
        [SKIP]
        # The play session's own opening turn, replayed so the story banner
        # lands here. A fresh run prints it with the first command, and it
        # would otherwise be prepended to the first blessed response below.

        > take the brass lamp
        [SKIP]
        # Taken.

        > look
        [SKIP]
        # A small square den.
        # A lamp glints here.

        """)
    }

    // MARK: - Bridge decode into the session

    func testTurnEventsMessageLandsInTheSession() {
        let play = PlayViewController()
        play.recording.start()
        let body = #"{"command":"take lamp","response":"Taken."}"#
        play.userContentController(WKUserContentController(),
                                   didReceive: FakeScriptMessage(name: "turnEvents", body: body))
        XCTAssertEqual(play.recording.turns,
                       [RecordedTurn(command: "take lamp", response: "Taken.")])
    }

    func testMalformedTurnEventsBodyIsDroppedNotCrashed() {
        let play = PlayViewController()
        play.recording.start()
        play.userContentController(WKUserContentController(),
                                   didReceive: FakeScriptMessage(name: "turnEvents", body: "not json"))
        XCTAssertTrue(play.recording.turns.isEmpty)
    }

    /// The panel flow's write half: the file lands on disk with the serialized
    /// capture and the announce callback fires with the URL (Tests-panel
    /// re-discovery hook).
    func testWriteRecordingWritesTheFileAndAnnounces() throws {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-WriteRecording-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }

        let play = PlayViewController()
        play.recording.start()
        play.recording.record(command: "look", response: "A room.")
        play.recording.record(command: "wait", response: "Time passes.")
        // ADR-282 Acceptance 3: a save needs at least one of the author's own
        // assertions. One bless, one turn left untagged — the mixed shape the
        // save flow actually writes.
        play.recording.bless(turnAt: 1)
        play.recording.stop()
        var announced: URL?
        play.onTranscriptRecorded = { announced = $0 }

        let url = dir.appendingPathComponent("smoke.transcript")
        try play.writeRecording(to: url)

        XCTAssertEqual(announced, url)
        let written = try String(contentsOf: url, encoding: .utf8)
        XCTAssertTrue(written.hasPrefix("title: Recorded: smoke\n---\n"))
        XCTAssertTrue(written.contains("> look\n[SKIP]\n# A room.\n"))
        XCTAssertTrue(written.contains("> wait\n[OK]\ntext\nTime passes.\nend text\n"))
    }

    /// The refusal, at the write boundary rather than only in the panel flow —
    /// no caller can route around Acceptance 3 by calling this directly.
    func testWriteRecordingRefusesASessionNobodyBlessed() throws {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-WriteRefusal-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }

        let play = PlayViewController()
        play.recording.start()
        play.recording.record(command: "look", response: "A room.")
        play.recording.stop()
        var announced: URL?
        play.onTranscriptRecorded = { announced = $0 }

        let url = dir.appendingPathComponent("unvouched.transcript")
        XCTAssertThrowsError(try play.writeRecording(to: url)) { error in
            XCTAssertEqual(error as? RecordingSaveError, .noBlessedTurns)
        }

        XCTAssertFalse(FileManager.default.fileExists(atPath: url.path),
                       "a refused save must leave no file behind")
        XCTAssertNil(announced, "nothing was written, so the Tests panel must not be told to re-scan")
    }

    /// An untagged turn replays without asserting its text — the property the
    /// `[SKIP]` draft carries (ADR-294 D2: the turn executes, nothing is
    /// asserted), and the reason a mixed save's untagged turns survive story
    /// rewording. Pinned on the serialized text here; that the whole file
    /// really passes the CLI is RecordingSaveAsTestTests' job.
    func testAnUntaggedTurnAssertsNothingNotItsRecordedText() {
        let session = RecordingSession()
        session.start()
        session.record(command: "take the brass lamp",
                       response: "Text the author never vouched for")
        session.bless(turnAt: 0)
        session.record(command: "look", response: "Also never matched")
        session.stop()

        let source = session.serialize(title: "Recorded: smoke")
        XCTAssertTrue(source.contains("> look\n[SKIP]\n# Also never matched"),
                      "the untagged turn's recorded text stays a comment, never an assertion")
        XCTAssertFalse(source.contains("[OK]\ntext\nAlso never matched"),
                       "an untagged turn must not acquire an assertion it was never given")
    }
}

/// A constructible WKScriptMessage for driving the handler directly.
private final class FakeScriptMessage: WKScriptMessage {
    private let fakeName: String
    private let fakeBody: Any
    init(name: String, body: Any) {
        self.fakeName = name
        self.fakeBody = body
        super.init()
    }
    override var name: String { fakeName }
    override var body: Any { fakeBody }
}
