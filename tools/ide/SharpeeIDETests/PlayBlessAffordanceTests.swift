// PlayBlessAffordanceTests.swift
// ADR-282 D1 real-path test (rule 13a): the live bless gesture, end to end
// through the Play pane's own machinery.
//
// Nothing here is simulated except the author's hands. A real WKWebView loads a
// real page over the pane's real custom-scheme handler; the page posts a real
// `turnEvents` message; the pane's real `WKScriptMessageHandler` decodes it into
// the real `RecordingSession`; the bless gesture then reads a real
// `window.getSelection()` back out of that same live page. The only stand-in is
// the page itself, which plays the part the story's browser bundle plays in
// production — and it posts the exact `{command, response}` shape
// `platform-browser`'s bridge posts.
//
// What this pins that RecordingSessionBlessTests cannot: that a turn arriving
// over the bridge actually reaches the affordance (the wiring, not the model),
// and that the selection the gesture stores is one really read out of WebKit.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class PlayBlessAffordanceTests: XCTestCase {

    private var tmp: URL!
    private var bundleDir: URL!
    private var play: PlayViewController!

    /// The response the fixture page renders AND posts — the two must match, or
    /// the selection read back could not be a fragment of the recorded text.
    private static let response = """
    The cellar door hangs open, and the dark below is patient.

    [the lantern gutters]
    """

    /// A page that plays the browser client's part: render the turn, post it
    /// over the `turnEvents` bridge, and expose a helper for selecting a
    /// fragment of it the way an author's drag would.
    private static func fixtureHTML() -> String {
        let json = String(
            data: try! JSONSerialization.data(
                withJSONObject: ["command": "look", "response": response]),
            encoding: .utf8)!
        return """
        <html><body>
        <p id="para">The cellar door hangs open, and the dark below is patient.</p>
        <p id="tail">[the lantern gutters]</p>
        <script>
        window.selectFragment = function (start, end) {
            const node = document.getElementById('para').firstChild;
            const range = document.createRange();
            range.setStart(node, start);
            range.setEnd(node, end);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            return sel.toString();
        };
        window.webkit.messageHandlers.turnEvents.postMessage(JSON.stringify(\(json)));
        </script>
        </body></html>
        """
    }

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlayBlessAffordanceTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        bundleDir = tmp.appendingPathComponent("dist/web/probe", isDirectory: true)
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        try Data(Self.fixtureHTML().utf8)
            .write(to: bundleDir.appendingPathComponent("index.html"))
        play = PlayViewController()
        _ = play.view // force loadView, which installs the turnEvents handler
    }

    override func tearDownWithError() throws {
        play = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    /// Starts a recording, loads the fixture, and waits for the turn to arrive
    /// over the bridge. Polls rather than using a navigation delegate — the
    /// signal we actually want is the recorded turn, not the page load.
    private func playOneTurn() async throws {
        play.recording.start()
        play.load(bundleDirectory: bundleDir)
        for _ in 0..<100 {
            if play.recording.turns.count == 1 { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("no turn arrived over the turnEvents bridge within 5s")
    }

    // MARK: - DOES: a live turn becomes a blessable, then blessed, turn

    func testALiveTurnArrivesOverTheBridgeAndBecomesBlessable() async throws {
        XCTAssertFalse(play.canBlessLatestTurn, "nothing captured yet — no affordance")

        try await playOneTurn()

        XCTAssertEqual(play.recording.turns.first?.command, "look")
        XCTAssertEqual(play.recording.turns.first?.response, Self.response)
        XCTAssertTrue(play.canBlessLatestTurn,
                      "the affordance must appear with the response it belongs to (D1)")
    }

    func testBlessingWithNoSelectionRecordsAVerbatimVouch() async throws {
        try await playOneTurn()

        await play.blessLatestTurn()

        XCTAssertEqual(play.recording.turns.first?.verdict, .blessed(selection: nil))
        XCTAssertEqual(play.recording.blessedTurns.count, 1)
    }

    func testBlessingCarriesTheFragmentTheAuthorSelectedInTheLivePage() async throws {
        try await playOneTurn()

        // A real selection in the real page — the same state a mouse drag
        // leaves. Offsets pick "the dark below is patient" out of the paragraph.
        let selected = try await play.evaluateInPlaySurface("window.selectFragment(32, 57)")
        XCTAssertEqual(selected as? String, "the dark below is patient",
                       "fixture offsets drifted — the rest of this test proves nothing")

        await play.blessLatestTurn()

        XCTAssertEqual(play.recording.turns.first?.verdict,
                       .blessed(selection: "the dark below is patient"),
                       "the stored fragment must be the one read out of WebKit")
    }

    func testASecondGestureTakesTheVouchBack() async throws {
        try await playOneTurn()

        await play.blessLatestTurn()
        await play.blessLatestTurn()

        XCTAssertEqual(play.recording.turns.first?.verdict, .untagged)
        XCTAssertTrue(play.recording.blessedTurns.isEmpty)
    }

    // MARK: - REJECTS WHEN

    func testTheGestureDoesNothingBeforeAnyTurnHasBeenCaptured() async throws {
        play.recording.start()

        await play.blessLatestTurn()

        XCTAssertTrue(play.recording.turns.isEmpty)
        XCTAssertFalse(play.canBlessLatestTurn)
    }

    func testTheGestureDoesNothingWhenTheBridgeIsStreamingButNothingIsRecording() async throws {
        // Record was never pressed. The bridge streams every turn regardless —
        // the session picks — so nothing must be captured and nothing blessable.
        play.load(bundleDirectory: bundleDir)
        try await Task.sleep(nanoseconds: 500_000_000)

        XCTAssertTrue(play.recording.turns.isEmpty)
        XCTAssertFalse(play.canBlessLatestTurn)
        await play.blessLatestTurn()
        XCTAssertTrue(play.recording.blessedTurns.isEmpty)
    }
}
