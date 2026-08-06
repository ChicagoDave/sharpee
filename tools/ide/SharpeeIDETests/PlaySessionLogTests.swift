// PlaySessionLogTests.swift
// The Play pane's turn-events bridge (ADR-277 D5) as a rule-13a real-path test:
// a real WKWebView loads a real page over the pane's real custom-scheme handler,
// and the page posts the exact `{command, response}` shape platform-browser's
// bridge posts. Nothing is stubbed on the path under test.
//
// This replaces the bridge coverage that lived in SkeinPlayGrowthTests until
// ADR-300 retired the skein. The skein is gone; the bridge is not, because
// "play authors the transcript" (ADR-301) reads from exactly this log. Deleting
// the skein's tests without re-pinning the bridge would have quietly dropped the
// only proof that a played turn reaches Swift at all.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class PlaySessionLogTests: XCTestCase {

    private var tmp: URL!
    private var bundleDir: URL!
    private var play: PlayViewController!

    /// A page that plays the browser client's part: it exposes the same bridge
    /// call the real client makes after each turn renders, and records the seed
    /// it booted with so the injection can be asserted from the page's vantage.
    private static let fixtureHTML = """
    <html><body>
    <p>The folly is cold.</p>
    <script>
    window.seedAtBoot = window.__SHARPEE_PLAY_SEED__;
    window.postTurn = function (command, response) {
        window.webkit.messageHandlers.turnEvents.postMessage(
            JSON.stringify({ command: command, response: response }));
    };
    window.postRaw = function (body) {
        window.webkit.messageHandlers.turnEvents.postMessage(body);
    };
    window.bootProbeReady = true;
    </script>
    </body></html>
    """

    override func setUpWithError() throws {
        try super.setUpWithError()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlaySessionLogTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        bundleDir = tmp.appendingPathComponent("dist/web/probe", isDirectory: true)
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        try Data(Self.fixtureHTML.utf8)
            .write(to: bundleDir.appendingPathComponent("index.html"))
        play = PlayViewController()
        _ = play.view // force loadView, which installs the turnEvents handler
        play.storyDirectory = tmp
    }

    override func tearDownWithError() throws {
        play = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        try super.tearDownWithError()
    }

    private func boot() async throws {
        play.load(bundleDirectory: bundleDir)
        for _ in 0..<100 {
            if let ready = try? await play.evaluateInPlaySurface("window.bootProbeReady === true"),
               ready as? Bool == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("fixture page did not boot within 5s")
    }

    /// Waits for the log to reach `count` turns — the bridge hops actors, so the
    /// append is not synchronous with the page's postMessage.
    private func waitForTurns(_ count: Int) async throws {
        for _ in 0..<100 {
            if play.sessionLog.count >= count { return }
            try await Task.sleep(nanoseconds: 25_000_000)
        }
        XCTFail("expected \(count) logged turns, have \(play.sessionLog.count)")
    }

    func testEveryPlayedTurnLandsInTheSessionLogInOrder() async throws {
        var announced: [PlayViewController.PlayedTurn] = []
        play.onTurn = { announced.append($0) }
        try await boot()

        _ = try await play.evaluateInPlaySurface(
            "window.postTurn('north', 'The Long Gallery.')")
        _ = try await play.evaluateInPlaySurface(
            "window.postTurn('take the lamp', 'Taken.')")
        try await waitForTurns(2)

        XCTAssertEqual(play.sessionLog,
                       [.init(command: "north", response: "The Long Gallery."),
                        .init(command: "take the lamp", response: "Taken.")],
                       "the log IS the playthrough, in play order")
        XCTAssertEqual(announced, play.sessionLog,
                       "onTurn announces exactly what was logged")
    }

    /// The seed is injected before any client script runs, so a session can be
    /// reproduced. Asserted from the page's own vantage — what the global held
    /// when scripts executed — not from the Swift value that was meant to be set.
    func testThePageBootsAtThePinnedSeed() async throws {
        try await boot()
        let seed = try await play.evaluateInPlaySurface("window.seedAtBoot")
        XCTAssertEqual(seed as? Int, PlayViewController.pinnedPlaySeed,
                       "the client must boot at the pinned seed, before its own scripts run")
    }

    /// A restart abandons the playthrough. Carrying its turns forward would
    /// promote a transcript describing a sequence that never happened.
    func testRestartStartsAFreshSessionLog() async throws {
        try await boot()
        _ = try await play.evaluateInPlaySurface("window.postTurn('north', 'The Long Gallery.')")
        try await waitForTurns(1)

        play.restart()
        XCTAssertTrue(play.sessionLog.isEmpty, "a restart discards the abandoned playthrough")

        // And the fresh boot logs again, rather than the pane going deaf.
        for _ in 0..<100 {
            if let ready = try? await play.evaluateInPlaySurface("window.bootProbeReady === true"),
               ready as? Bool == true { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        _ = try await play.evaluateInPlaySurface("window.postTurn('look', 'The Hall.')")
        try await waitForTurns(1)
        XCTAssertEqual(play.sessionLog, [.init(command: "look", response: "The Hall.")])
    }

    /// Loading a (re)built bundle starts over: turns from the previous build
    /// describe a story that no longer exists.
    func testLoadingABundleClearsThePreviousSessionLog() async throws {
        try await boot()
        _ = try await play.evaluateInPlaySurface("window.postTurn('north', 'The Long Gallery.')")
        try await waitForTurns(1)

        play.load(bundleDirectory: bundleDir)
        XCTAssertTrue(play.sessionLog.isEmpty)
    }

    /// A malformed bridge message is ignored rather than logged as a turn with
    /// empty halves — a transcript promoted from that would assert on nothing.
    func testAMalformedBridgeMessageIsIgnoredNotLogged() async throws {
        try await boot()
        _ = try await play.evaluateInPlaySurface("window.postRaw('not json at all')")
        _ = try await play.evaluateInPlaySurface("window.postRaw(JSON.stringify({nope: 1}))")
        // Then a well-formed one, so the assertion cannot pass merely because
        // nothing has arrived yet.
        _ = try await play.evaluateInPlaySurface("window.postTurn('look', 'The Hall.')")
        try await waitForTurns(1)

        XCTAssertEqual(play.sessionLog, [.init(command: "look", response: "The Hall.")],
                       "only the well-formed turn was logged")
    }
}
