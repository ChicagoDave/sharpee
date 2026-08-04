// SkeinPlayGrowthTests.swift
// ADR-299 AC-1 real-path test (rule 13a): playing always grows the skein, end
// to end through the Play pane's own machinery — the PlaySurfaceScriptTests
// pattern. A real WKWebView loads a real page over the pane's real
// custom-scheme handler; the page posts real `turnEvents` messages (the exact
// `{command, response}` shape platform-browser's bridge posts); the pane's real
// handler grows a real `play-testing/<id>.skein` on disk, which the assertions
// read back with the real store. The pinned-seed injection (D5) is asserted
// from the page's own vantage: what `window.__SHARPEE_PLAY_SEED__` held when
// client scripts ran.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class SkeinPlayGrowthTests: XCTestCase {

    private var tmp: URL!
    private var bundleDir: URL!
    private var play: PlayViewController!

    /// A page that plays the browser client's part: records the seed global it
    /// booted with, and exposes the bridge-posting helper the test drives the
    /// way typed commands would.
    private static let fixtureHTML = """
    <html><body>
    <p>The den is quiet.</p>
    <script>
    window.seedAtBoot = window.__SHARPEE_PLAY_SEED__;
    window.postTurn = function (command, response) {
        window.webkit.messageHandlers.turnEvents.postMessage(
            JSON.stringify({ command: command, response: response }));
    };
    window.bootProbeReady = true;
    </script>
    </body></html>
    """

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SkeinPlayGrowthTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        bundleDir = tmp.appendingPathComponent("dist/web/probe", isDirectory: true)
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        try Data(Self.fixtureHTML.utf8)
            .write(to: bundleDir.appendingPathComponent("index.html"))
        play = PlayViewController()
        _ = play.view // force loadView, which installs the turnEvents handler
        // The open story's directory — where play-testing/ belongs (D7).
        play.storyDirectory = tmp
    }

    override func tearDownWithError() throws {
        play = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    private var skeinURL: URL {
        SkeinStore.url(forStoryId: "probe", projectRoot: tmp)
    }

    private func boot() async throws {
        play.load(bundleDirectory: bundleDir)
        try await waitForBootProbe()
    }

    private func waitForBootProbe() async throws {
        for _ in 0..<100 {
            if let ready = try? await play.evaluateInPlaySurface("window.bootProbeReady === true"),
               ready as? Bool == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("fixture page did not boot within 5s")
    }

    /// Posts a turn from the page over the real bridge, then waits until play
    /// sits on a node carrying `command` — delivery is asynchronous, and may
    /// even land before the posting evaluation's own completion resolves, so
    /// the wait is on the skein's state, not on "something changed".
    private func postTurn(_ command: String, _ response: String) async throws {
        let json = String(
            data: try JSONSerialization.data(withJSONObject: [command, response]),
            encoding: .utf8)!
        _ = try await play.evaluateInPlaySurface("window.postTurn(...\(json))")
        for _ in 0..<100 {
            if let skein = play.skein,
               skein.document.node(withId: skein.currentNodeId)?.command == command { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("turn '\(command)' did not reach the skein within 5s")
    }

    // MARK: - AC-1: playing grows the file; restart + divergence = two threads

    func testPlayingTurnsGrowsTheSkeinOnDisk() async throws {
        try await boot()
        try await postTurn("take lamp", "Taken.")
        try await postTurn("go north", "Cellar")

        let saved = try SkeinStore.read(from: skeinURL)
        XCTAssertEqual(saved.root.children.map(\.command), ["take lamp"])
        XCTAssertEqual(saved.root.children[0].children.map(\.command), ["go north"])
        XCTAssertEqual(saved.root.children[0].children[0].output, "Cellar")
    }

    func testRestartThenDivergingAtASharedPrefixYieldsTwoThreads() async throws {
        try await boot()
        try await postTurn("take lamp", "Taken.")
        try await postTurn("go north", "Cellar")

        play.restart()
        try await waitForBootProbe()
        try await postTurn("take lamp", "Taken.")
        try await postTurn("go south", "Garden")

        let saved = try SkeinStore.read(from: skeinURL)
        XCTAssertEqual(saved.root.children.map(\.command), ["take lamp"],
                       "the shared prefix is walked, never duplicated")
        XCTAssertEqual(saved.root.children[0].children.map(\.command),
                       ["go north", "go south"],
                       "restart + divergence must yield two threads in the file (AC-1)")
    }

    // MARK: - D5: the page boots with the skein's pinned seed

    func testThePageBootsWithTheSkeinsPinnedSeed() async throws {
        try await boot()

        let atBoot = try await play.evaluateInPlaySurface("window.seedAtBoot")
        XCTAssertEqual(atBoot as? Int, play.skein?.seed,
                       "client scripts must see the pinned seed at boot (D5)")

        // The seed survives restart AND matches what the file pins.
        try await postTurn("look", "A quiet den.")
        play.restart()
        try await waitForBootProbe()
        let afterRestart = try await play.evaluateInPlaySurface("window.seedAtBoot")
        XCTAssertEqual(afterRestart as? Int, try SkeinStore.read(from: skeinURL).seed,
                       "every thread runs at the skein's one seed (D5)")
    }

    // MARK: - AC-7 at the pane: an unreadable skein blocks the surface loudly

    func testAnUnreadableSkeinBlocksThePlaySurfaceWithTheReason() async throws {
        try FileManager.default.createDirectory(at: skeinURL.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try Data(#"{"schemaVersion": 99}"#.utf8).write(to: skeinURL)

        play.load(bundleDirectory: bundleDir)

        XCTAssertFalse(play.isLoaded, "an unreadable skein must not half-load the surface")
        XCTAssertNil(play.skein)
        // The authored file survives — refusal, not replacement.
        XCTAssertEqual(try Data(contentsOf: skeinURL), Data(#"{"schemaVersion": 99}"#.utf8))
    }
}
