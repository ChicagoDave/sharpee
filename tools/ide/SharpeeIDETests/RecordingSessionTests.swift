// RecordingSessionTests.swift
// Covers Play-session recording (ADR-277 D5): session state (capture only
// while recording), the capture format (per turn `> command` + `[OK: any]` +
// `#`-comment response, never asserted output), the WKScriptMessage decode
// path into the session, and the closing real-path proof (rule 13a): a
// serialized recording written into a real story's tests/ re-runs GREEN
// through the actual `sharpee test --json` CLI — despite the recorded
// response text never matching what the story prints.

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

    func testSerializeWritesOkAnyWithCommentedResponse() {
        let session = RecordingSession()
        session.start()
        session.record(command: "take the brass lamp", response: "Taken.")
        session.record(command: "look", response: "A small square den.\nA lamp glints here.")
        session.stop()

        let source = session.serialize(title: "Recorded: smoke")
        XCTAssertEqual(source, """
        title: Recorded: smoke
        ---

        > take the brass lamp
        [OK: any]
        # Taken.

        > look
        [OK: any]
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
        play.recording.stop()
        var announced: URL?
        play.onTranscriptRecorded = { announced = $0 }

        let url = dir.appendingPathComponent("smoke.transcript")
        try play.writeRecording(to: url)

        XCTAssertEqual(announced, url)
        let written = try String(contentsOf: url, encoding: .utf8)
        XCTAssertTrue(written.hasPrefix("title: Recorded: smoke\n---\n"))
        XCTAssertTrue(written.contains("> look\n[OK: any]\n# A room.\n"))
    }

    // MARK: - Real-path (rule 13a, Acceptance 7's core)

    /// A recorded session re-runs GREEN through the real CLI immediately: the
    /// `[OK: any]` presence assertions pass although the recorded `#` response
    /// text never matches the story's actual output.
    func testSerializedRecordingReRunsGreenThroughTheRealCLI() throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-RecordingTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(
            at: tempDir.appendingPathComponent("tests"), withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        let story = """
        story "Mini" by "T"
          id: mini
          version: 0.0.1

        create the Den
          a room

          A small square den.

        create the brass lamp
          in the Den

          It gleams dully.

        create the player
          starts in the Den

          You.

        """
        try story.write(to: tempDir.appendingPathComponent("mini.story"),
                        atomically: true, encoding: .utf8)

        let session = RecordingSession()
        session.start()
        session.record(command: "take the brass lamp", response: "RNG text that will differ on replay")
        session.record(command: "look", response: "Also never matched")
        session.stop()
        try session.serialize(title: "Recorded: smoke")
            .write(to: tempDir.appendingPathComponent("tests/recorded.transcript"),
                   atomically: true, encoding: .utf8)

        let runner = TestRunner()
        let delegate = RecordingRunObserver()
        runner.delegate = delegate
        let exited = expectation(description: "recorded transcript run exits")
        delegate.onExit = { exited.fulfill() }
        runner.start(executable: URL(fileURLWithPath: "/usr/bin/env"),
                     arguments: ["node", TestToolchain.devkitCLI.path, "test", tempDir.path, "--json"],
                     workingDirectory: tempDir,
                     environment: ShellEnvironment.buildEnvironment())
        wait(for: [exited], timeout: 120)

        XCTAssertEqual(delegate.result?.state, .passed, "recorded transcript must re-run green")
        XCTAssertEqual(delegate.result?.exitCode, 0)
        let ends = delegate.records.compactMap { record -> TestTranscriptEnd? in
            if case .transcriptEnd(let end) = record { return end } else { return nil }
        }
        XCTAssertEqual(ends.map(\.status), [.passed])
        XCTAssertEqual(ends.first?.passed, 2, "both recorded turns executed and passed")
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

@MainActor
private final class RecordingRunObserver: TestRunnerDelegate {
    private(set) var records: [TestResultRecord] = []
    var result: TestRunner.Result?
    var onExit: (() -> Void)?

    func runner(_ runner: TestRunner, didDecode record: TestResultRecord) { records.append(record) }
    func runner(_ runner: TestRunner, didFailDecode error: Error) {}
    func runner(_ runner: TestRunner, didEmitStderr text: String) {}
    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State) {}
    func runner(_ runner: TestRunner, didExit result: TestRunner.Result) {
        self.result = result
        onExit?()
    }
}
