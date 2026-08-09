// PlayThemeChromeTests.swift
// Real-path tests for the Play pane's theme chrome (go-live Phase 6b): a real
// WKWebView boots a real page over the pane's real custom-scheme handler, with
// the REAL vendored theme mirror (the app bundle's Resources/play-themes)
// supplying CSS the fixture story never shipped. The fixture page plays the
// browser client's part at boot: it applies its own default theme AFTER the
// IDE's document-start chrome ran — exactly the clobber the chrome's observer
// exists to win — and persists it the way the client's saveTheme does.
// Owner context: tools/ide — Tests.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class PlayThemeChromeTests: XCTestCase {

    private var tmp: URL!
    private var bundleDir: URL!
    private var play: PlayViewController!

    /// The client's boot, in fixture form: apply-and-persist its own theme
    /// (the story wired `story-default`), after the IDE chrome already ran.
    private static let fixtureHTML = """
    <html><body>
    <p>The den is quiet.</p>
    <script>
    localStorage.setItem('probe-theme', 'story-default');
    document.documentElement.setAttribute('data-theme', 'story-default');
    window.sessionMarker = 'alive';
    window.bootProbeReady = true;
    </script>
    </body></html>
    """

    override func setUpWithError() throws {
        super.setUp()
        UserDefaults.standard.removeObject(forKey: PlayViewController.themeChoiceDefaultsKey)
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlayThemeChromeTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        bundleDir = tmp.appendingPathComponent("dist/web/probe", isDirectory: true)
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        try Data(Self.fixtureHTML.utf8)
            .write(to: bundleDir.appendingPathComponent("index.html"))
    }

    override func tearDownWithError() throws {
        UserDefaults.standard.removeObject(forKey: PlayViewController.themeChoiceDefaultsKey)
        play = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    /// Builds the controller (reading UserDefaults, as the app does) and boots
    /// the fixture. Default resources = the test-host app bundle, so the theme
    /// catalog and the scheme handler's backfill run against the REAL vendored
    /// mirror.
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

    /// Polls until the page's `data-theme` equals `expected` (observer
    /// re-assertion is asynchronous), failing after 5s.
    private func waitForTheme(_ expected: String) async throws {
        var last: String?
        for _ in 0..<100 {
            last = try await play.evaluateInPlaySurface(
                "document.documentElement.getAttribute('data-theme')") as? String
            if last == expected { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("data-theme never became \(expected); last saw \(last ?? "nil")")
    }

    // MARK: - DOES: a picked theme is worn at boot, over the client's own apply

    func testAPickedThemeWinsTheClientsBootApply() async throws {
        UserDefaults.standard.set("paper", forKey: PlayViewController.themeChoiceDefaultsKey)
        try await boot()
        try await waitForTheme("paper")
    }

    /// The picked theme's CSS reaches the page even though the fixture story
    /// shipped no themes at all — the request travels the real scheme handler
    /// into the app's real vendored mirror.
    func testAnUnshippedPickedThemesCSSIsFetchableInThePage() async throws {
        UserDefaults.standard.set("paper", forKey: PlayViewController.themeChoiceDefaultsKey)
        try await boot()
        _ = try await play.evaluateInPlaySurface("""
        (function () {
          fetch('themes/paper.css').then(function (r) {
            window.themeFetchOK = r.ok;
            return r.text();
          }).then(function (t) { window.themeFetchHadBytes = t.length > 0; });
        })();
        """)
        for _ in 0..<100 {
            if let ok = try? await play.evaluateInPlaySurface("window.themeFetchOK === true && window.themeFetchHadBytes === true"),
               ok as? Bool == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("themes/paper.css never arrived from the vendored mirror")
    }

    // MARK: - REJECTS WHEN: no pick — the story's own theme stands

    func testStoryDefaultNeverTouchesTheClientsTheme() async throws {
        try await boot()
        // Give the observer every chance to misbehave before asserting.
        try await Task.sleep(nanoseconds: 200_000_000)
        let theme = try await play.evaluateInPlaySurface(
            "document.documentElement.getAttribute('data-theme')") as? String
        XCTAssertEqual(theme, "story-default",
                       "with no pick, the client's own boot apply must stand")
    }

    // MARK: - DOES: a live pick restyles the running page and persists

    func testALivePickRestylesWithoutRebootAndPersists() async throws {
        try await boot()
        play.applyThemeChoice("modern-dark")
        try await waitForTheme("modern-dark")
        let marker = try await play.evaluateInPlaySurface("window.sessionMarker") as? String
        XCTAssertEqual(marker, "alive", "a theme change must never reboot a played session")
        XCTAssertEqual(UserDefaults.standard.string(forKey: PlayViewController.themeChoiceDefaultsKey),
                       "modern-dark", "the pick survives an app relaunch via UserDefaults")
    }

    /// A pick made before anything is loaded still persists immediately and is
    /// worn by the NEXT boot — proving the re-baked boot script, not init's
    /// UserDefaults read, carries the choice onto the page.
    func testAPickMadeWhileUnloadedPersistsAndDressesTheNextBoot() async throws {
        play = PlayViewController()
        _ = play.view
        play.applyThemeChoice("modern-dark")
        XCTAssertEqual(UserDefaults.standard.string(forKey: PlayViewController.themeChoiceDefaultsKey),
                       "modern-dark", "the pick lands in UserDefaults with nothing loaded")

        play.load(bundleDirectory: bundleDir)
        for _ in 0..<100 {
            if let ready = try? await play.evaluateInPlaySurface("window.bootProbeReady === true"),
               ready as? Bool == true { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        try await waitForTheme("modern-dark")
    }

    func testBackToStoryDefaultRestoresTheClientsStoredThemeAndForgetsThePick() async throws {
        UserDefaults.standard.set("paper", forKey: PlayViewController.themeChoiceDefaultsKey)
        try await boot()
        try await waitForTheme("paper")

        play.applyThemeChoice(nil)
        try await waitForTheme("story-default")
        XCTAssertNil(UserDefaults.standard.string(forKey: PlayViewController.themeChoiceDefaultsKey),
                     "Story Default removes the persisted pick entirely")
    }

    // MARK: - The catalog reads the real mirror

    func testTheCatalogListsClassicPlusEveryVendoredBuiltIn() throws {
        let themes = PlayThemeCatalog.themes(inResources: Bundle.main.resourceURL)
        XCTAssertEqual(themes.first, PlayThemeCatalog.classic, "Classic leads the list")
        let names = themes.map(\.name)
        XCTAssertEqual(names, ["Classic", "Modern Dark", "Paper", "Retro Terminal", "System 6"],
                       "the app's vendored mirror carries every built-in — run tools/ide/vendor-play-themes.sh if this fails")
        let stylesheets = PlayThemeCatalog.stylesheetPaths(inResources: Bundle.main.resourceURL)
        XCTAssertEqual(stylesheets.count, 4, "classic has no stylesheet; every built-in has one")
        XCTAssertTrue(stylesheets.allSatisfy { $0.hasPrefix("themes/") && $0.hasSuffix(".css") })
    }

    func testAMissingMirrorDegradesToClassicAlone() throws {
        let nowhere = tmp.appendingPathComponent("no-such-resources", isDirectory: true)
        XCTAssertEqual(PlayThemeCatalog.themes(inResources: nowhere), [PlayThemeCatalog.classic])
        XCTAssertEqual(PlayThemeCatalog.stylesheetPaths(inResources: nowhere), [])
    }
}
