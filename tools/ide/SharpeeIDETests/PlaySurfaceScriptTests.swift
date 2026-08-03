// PlaySurfaceScriptTests.swift
// Real-path tests for the Play pane's injected surface chrome
// (playSurfaceScript): a real WKWebView boots a real page over the pane's real
// custom-scheme handler, and the assertions read the page's own observed state
// back out — what the page's scripts saw at boot (the client's
// autosave-restore vantage point) and the computed style WebKit actually
// applies to the client's menu bar.
//
// The fixture page plays the browser client's part: at parse time it records
// what `localStorage` held (exactly when the client's restore-on-start would
// read it), then writes an "autosave" the way the client does between turns.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class PlaySurfaceScriptTests: XCTestCase {

    private var tmp: URL!
    private var bundleDir: URL!
    private var play: PlayViewController!

    /// Records the storage the page saw AT BOOT (before any test writes), then
    /// leaves an autosave behind — the state a played session abandons.
    private static let fixtureHTML = """
    <html><body>
    <div id="menu-bar">File Settings Help</div>
    <p>The den is quiet.</p>
    <script>
    window.storageAtBoot = localStorage.getItem('probe-autosave');
    localStorage.setItem('probe-autosave', 'stale-world');
    window.bootProbeReady = true;
    </script>
    </body></html>
    """

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlaySurfaceScriptTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        bundleDir = tmp.appendingPathComponent("dist/web/probe", isDirectory: true)
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        try Data(Self.fixtureHTML.utf8)
            .write(to: bundleDir.appendingPathComponent("index.html"))
        play = PlayViewController()
        _ = play.view // force loadView, which installs playSurfaceScript
    }

    override func tearDownWithError() throws {
        play = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    /// Loads the fixture bundle and waits for its boot probe to run.
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

    // MARK: - DOES: every boot clears the origin's storage before page scripts run

    func testAStaleAutosaveIsGoneBeforeTheNextBootsScriptsRun() async throws {
        try await boot()
        // First boot on a fresh data store: nothing to see either way, but the
        // page has now left an autosave behind, the way a played session does.
        let saved = try await play.evaluateInPlaySurface("localStorage.getItem('probe-autosave')")
        XCTAssertEqual(saved as? String, "stale-world", "fixture must have written its autosave")

        // Re-load — the after-build path. The page's own boot-time read is the
        // proof: it ran after the injected clear, so the autosave must be gone.
        try await boot()
        let atBoot = try await play.evaluateInPlaySurface("window.storageAtBoot === null")
        XCTAssertEqual(atBoot as? Bool, true,
                       "boot scripts must never see a previous session's storage")
    }

    func testRestartAlsoBootsFresh() async throws {
        try await boot()
        _ = try await play.evaluateInPlaySurface("localStorage.setItem('probe-autosave', 'mid-session')")

        play.restart()
        try await waitForBootProbe()

        let atBoot = try await play.evaluateInPlaySurface("window.storageAtBoot === null")
        XCTAssertEqual(atBoot as? Bool, true,
                       "Restart is a fresh boot — no autosave resume")
    }

    // MARK: - DOES: the client's menu bar is hidden in the IDE surface

    func testTheClientMenuBarIsHiddenByComputedStyle() async throws {
        try await boot()
        let display = try await play.evaluateInPlaySurface(
            "getComputedStyle(document.getElementById('menu-bar')).display")
        XCTAssertEqual(display as? String, "none",
                       "#menu-bar is published-story chrome, hidden in the IDE's Play pane")
    }
}
