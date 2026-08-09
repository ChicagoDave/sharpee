// PlayMarginRealPathTests.swift
// The play margin and turn feed, live (ADR-305 D1/D3/D4): a real WKWebView
// boots a fixture page over the pane's real scheme handler. The fixture plays
// the browser client's part — `data-turn`-stamped turn groups in the DOM and
// feed records posted over the real `turnEvents` bridge — so these tests pin
// the ACTUAL seams: the injected seed global, the bridge round-trip into the
// PlayTurnLog, the margin chrome's checkbox-per-turn overlay, the selection
// posting back over `playMargin`, and the restart fence's Swift→page floor
// push. No stubs: the page, the bridges, and the log are the production ones.
// Owner context: tools/ide — Tests.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class PlayMarginRealPathTests: XCTestCase {

    private var tmp: URL!
    private var bundleDir: URL!
    private var play: PlayViewController!

    /// The client's part, in fixture form: three played turns stamped into the
    /// DOM and posted over the feed, exactly as `BrowserClient` does.
    private static let fixtureHTML = """
    <html><body>
    <div id="main">
      <div class="command-echo" data-turn="1">&gt; look</div>
      <p class="main-entry" data-turn="1">The den is quiet.</p>
      <div class="command-echo" data-turn="2">&gt; north</div>
      <p class="main-entry" data-turn="2">North Hall.</p>
      <div class="command-echo" data-turn="3">&gt; south</div>
      <p class="main-entry" data-turn="3">Back again.</p>
    </div>
    <script>
    function post(o) {
      try { window.webkit.messageHandlers.turnEvents.postMessage(JSON.stringify(o)); } catch (e) {}
    }
    post({turn: 1, command: 'look', output: 'The den is quiet.', captures: []});
    post({turn: 2, command: 'north', output: 'North Hall.',
          captures: [{channel: 'room-name', values: ['North Hall']}]});
    post({turn: 3, command: 'south', output: 'Back again.', captures: []});
    window.bootProbeReady = true;
    </script>
    </body></html>
    """

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlayMarginTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        bundleDir = tmp.appendingPathComponent("dist/web/probe", isDirectory: true)
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        try Data(Self.fixtureHTML.utf8)
            .write(to: bundleDir.appendingPathComponent("index.html"))
    }

    override func tearDownWithError() throws {
        play = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    private func boot() async throws {
        play = PlayViewController()
        _ = play.view
        play.load(bundleDirectory: bundleDir)
        for _ in 0..<100 {
            if let ready = try? await play.evaluateInPlaySurface("window.bootProbeReady === true"),
               ready as? Bool == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("fixture page did not boot within 5s")
    }

    /// Polls until `probe` (a JS expression) evaluates true, failing after 5s.
    private func waitFor(_ probe: String, _ what: String) async throws {
        for _ in 0..<100 {
            if let ok = try? await play.evaluateInPlaySurface(probe), ok as? Bool == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("timed out waiting for \(what): \(probe)")
    }

    /// Polls a main-actor condition (the bridge hops actors), failing after 5s.
    private func waitForLog(_ what: String, _ condition: () -> Bool) async throws {
        for _ in 0..<100 {
            if condition() { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("timed out waiting for \(what)")
    }

    func testPlaySeedIsInjectedIntoTheLivePage() async throws {
        try await boot()
        let seed = try await play.evaluateInPlaySurface("window.__SHARPEE_PLAY_SEED__")
        XCTAssertEqual(seed as? Int, PlayViewController.idePlaySeed)
        XCTAssertEqual(PlayViewController.idePlaySeed, 42)
    }

    func testFeedRecordsCrossTheRealBridgeIntoTheLog() async throws {
        try await boot()
        try await waitForLog("3 feed records") { self.play.turnLog.turns.count == 3 }
        XCTAssertEqual(play.turnLog.turns.map(\.command), ["look", "north", "south"])
        // The structured capture crossed intact — raw record, no re-shaping.
        let captures = play.turnLog.turns[1].raw["captures"] as? [[String: Any]]
        XCTAssertEqual(captures?.first?["channel"] as? String, "room-name")
    }

    func testMarginOffersOneCheckboxPerTurnGroup() async throws {
        try await boot()
        try await waitFor(
            "document.querySelectorAll('#sharpee-play-margin [data-turn-select]').length === 3",
            "one checkbox per data-turn group")
    }

    func testCheckingAMarginBoxSelectsTheTurnInTheLog() async throws {
        try await boot()
        try await waitForLog("feed records") { self.play.turnLog.turns.count == 3 }
        try await waitFor(
            "document.querySelectorAll('#sharpee-play-margin [data-turn-select]').length === 3",
            "margin boxes")
        _ = try await play.evaluateInPlaySurface("""
        (function () {
          var box = document.querySelector('[data-turn-select="2"]');
          box.checked = true;
          box.dispatchEvent(new Event('change'));
        })();
        """)
        try await waitForLog("selection {2}") { self.play.turnLog.selection == [2] }
    }

    func testSwiftInitiatedResetsClearTheLog() async throws {
        // The two fence call sites that BYPASS the bridge (ADR-305 D3): the
        // header Restart and a fresh load are Swift-initiated resets — the
        // navigation never posts a feed event, so the clear must be asserted
        // here, not inferred from the bridge fence test below.
        try await boot()
        try await waitForLog("feed records") { self.play.turnLog.turns.count == 3 }
        play.turnLog.setSelection([2])

        play.restart()
        XCTAssertTrue(play.turnLog.turns.isEmpty, "header Restart starts a new lineage")
        XCTAssertTrue(play.turnLog.selection.isEmpty)

        // A fresh load clears a prior lineage too.
        try await boot()
        try await waitForLog("reloaded feed records") { self.play.turnLog.turns.count == 3 }
        play.turnLog.setSelection([1])
        play.load(bundleDirectory: bundleDir)
        XCTAssertTrue(play.turnLog.turns.isEmpty, "a fresh load starts a new lineage")
        XCTAssertTrue(play.turnLog.selection.isEmpty)
    }

    func testRestartFencesTheLogAndTheMargin() async throws {
        try await boot()
        try await waitForLog("feed records") { self.play.turnLog.turns.count == 3 }

        // The client's in-page reboot posts the fence (ADR-305 D3). Wrapped so
        // the evaluated value is undefined — postMessage returns a Promise,
        // which evaluateJavaScript cannot bridge.
        _ = try await play.evaluateInPlaySurface("""
        (function () {
          window.webkit.messageHandlers.turnEvents.postMessage(JSON.stringify({restart: true, turn: 4}));
        })();
        """)
        try await waitForLog("fenced log") { self.play.turnLog.turns.isEmpty }

        // Swift pushed the floor back into the page: dead-lineage turns are no
        // longer offered even though their DOM survives.
        try await waitFor(
            "document.querySelectorAll('#sharpee-play-margin [data-turn-select]').length === 0",
            "dead-lineage boxes removed")

        // The new lineage is offered as it arrives.
        _ = try await play.evaluateInPlaySurface("""
        (function () {
          var p = document.createElement('p');
          p.setAttribute('data-turn', '4');
          p.textContent = 'A fresh boot.';
          document.getElementById('main').appendChild(p);
          window.webkit.messageHandlers.turnEvents.postMessage(
            JSON.stringify({turn: 4, command: 'look', output: 'A fresh boot.', captures: []}));
        })();
        """)
        try await waitFor(
            "document.querySelectorAll('#sharpee-play-margin [data-turn-select=\"4\"]').length === 1",
            "new-lineage box")
        try await waitForLog("new lineage in log") { self.play.turnLog.turns.map(\.turn) == [4] }
    }
}
