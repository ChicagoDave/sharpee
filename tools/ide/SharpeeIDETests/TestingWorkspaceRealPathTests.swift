// TestingWorkspaceRealPathTests.swift
// ADR-304 real-path coverage: the testing workspace driven through a real
// MainWindowController — the real four-pane split, the real Play WKWebView
// reparented alive (D3), the real editor NSTextView's state across a
// round-trip (D4), and the modal single-exit shape (D1/D2). No stubs: every
// surface asserted on is the app's own.
// Owner context: tools/ide — Tests.

import AppKit
import WebKit
import XCTest
@testable import SharpeeIDE

@MainActor
final class TestingWorkspaceRealPathTests: XCTestCase {

    private var tmp: URL!

    /// A story page in fixture form: enough of a "played session" to carry a
    /// JS marker whose survival proves the web view was never reloaded (D3).
    private static let fixtureHTML = """
    <html><body>
    <p>The den is quiet.</p>
    <script>
    window.sessionMarker = 'alive';
    window.bootProbeReady = true;
    </script>
    </body></html>
    """

    override func setUpWithError() throws {
        try super.setUpWithError()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-TestingWorkspaceRealPathTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        try super.tearDownWithError()
    }

    // MARK: - DOES: entering moves Play left under the one exit; exiting restores

    func testSelectingTestingEntersTheWorkspaceAndTheOneExitRestoresTheLayout() throws {
        let controller = MainWindowController()
        let window = try XCTUnwrap(controller.window)
        window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
        window.orderFront(nil)
        defer { window.orderOut(nil) }
        pump()

        let content = try XCTUnwrap(window.contentView)
        let play = controller.playSurface
        let split = try XCTUnwrap(fourPaneSplit(in: content),
                                  "the main four-pane split is the layout under test")
        let leftPane = split.arrangedSubviews[2]
        let rightPane = split.arrangedSubviews[3]

        XCTAssertFalse(controller.isTestingWorkspaceActive)
        XCTAssertTrue(play.view.isDescendant(of: rightPane),
                      "Play starts in the right panel")
        XCTAssertNil(view(withIdentifier: "testing.workspace.exit", in: content),
                     "no exit affordance outside the workspace")

        // The entrance is the Testing tab (D1) — any route to it.
        controller.showTestingTab()
        pump()

        XCTAssertTrue(controller.isTestingWorkspaceActive)
        XCTAssertTrue(play.view.isDescendant(of: leftPane),
                      "Play took the left pane (D1)")
        XCTAssertTrue(controller.testingTab.view.isDescendant(of: rightPane),
                      "Testing holds the right pane (D1)")
        XCTAssertFalse(controller.testingTab.view.isHiddenOrHasHiddenAncestor,
                       "the Testing surface is on screen")
        let exitButton = try XCTUnwrap(
            view(withIdentifier: "testing.workspace.exit", in: content) as? NSButton,
            "the one unmissable Exit Testing button (D2)")

        // Modality (D2): programmatic tab switches neither dismantle the
        // workspace nor sneak other content into the locked right panel.
        controller.showPublishTab()
        controller.showBuildOutput()
        pump()
        XCTAssertTrue(controller.isTestingWorkspaceActive,
                      "tab switches never exit — there is exactly one exit")
        XCTAssertTrue(play.view.isDescendant(of: leftPane))
        XCTAssertFalse(controller.testingTab.view.isHiddenOrHasHiddenAncestor,
                       "the right panel stays the Testing surface while modal")

        exitButton.performClick(nil)
        pump()

        XCTAssertFalse(controller.isTestingWorkspaceActive)
        XCTAssertTrue(play.view.isDescendant(of: rightPane),
                      "Play returned to the right panel")
        XCTAssertNil(view(withIdentifier: "testing.workspace.exit", in: content),
                     "the exit bar leaves with the workspace")
    }

    // MARK: - DOES: a played session survives the round-trip (D3)

    func testAPlayedSessionSurvivesEnteringAndLeavingTheWorkspace() async throws {
        let controller = MainWindowController()
        let window = try XCTUnwrap(controller.window)
        window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
        window.orderFront(nil)
        defer { window.orderOut(nil) }

        let bundleDir = tmp.appendingPathComponent("dist/web/probe", isDirectory: true)
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        try Data(Self.fixtureHTML.utf8).write(to: bundleDir.appendingPathComponent("index.html"))

        let play = controller.playSurface
        play.load(bundleDirectory: bundleDir)
        try await waitForBoot(of: play)

        let webViewBefore = try XCTUnwrap(firstWebView(in: play.view),
                                          "the loaded Play surface carries its web view")

        controller.showTestingTab()
        let markerInWorkspace = try await play.evaluateInPlaySurface("window.sessionMarker")
        XCTAssertEqual(markerInWorkspace as? String, "alive",
                       "the JS world survived the reparent — the page was never reloaded (D3)")

        controller.exitTestingWorkspace()
        let markerAfterExit = try await play.evaluateInPlaySurface("window.sessionMarker")
        XCTAssertEqual(markerAfterExit as? String, "alive",
                       "the JS world survived the trip back (D3)")
        XCTAssertTrue(firstWebView(in: play.view) === webViewBefore,
                      "the same WKWebView instance made the whole round-trip")
    }

    // MARK: - DOES: the editor returns exactly as left (D4)

    func testTheEditorReturnsWithDocumentCursorAndScrollIntact() throws {
        let controller = MainWindowController()
        let window = try XCTUnwrap(controller.window)
        window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
        window.orderFront(nil)
        defer { window.orderOut(nil) }
        pump()

        let content = try XCTUnwrap(window.contentView)
        let split = try XCTUnwrap(fourPaneSplit(in: content))
        let leftPane = split.arrangedSubviews[2]

        let lines = (1...300).map { "line \($0) of the story under edit" }
        let documentURL = tmp.appendingPathComponent("workspace-probe.story")
        try lines.joined(separator: "\n").write(to: documentURL, atomically: true, encoding: .utf8)
        controller.openDocument(at: documentURL)
        pump()

        let textView = try XCTUnwrap(firstTextView(in: leftPane),
                                     "opening a document puts the real editor text view on screen")
        textView.setSelectedRange(NSRange(location: 250, length: 12))
        textView.scrollRangeToVisible(NSRange(location: (textView.string as NSString).length - 5,
                                              length: 1))
        pump()
        let selectionBefore = textView.selectedRange()
        let scrollBefore = try XCTUnwrap(textView.enclosingScrollView).contentView.bounds.origin
        XCTAssertGreaterThan(scrollBefore.y, 0, "the probe actually scrolled somewhere")

        controller.showTestingTab()
        pump()
        XCTAssertTrue(textView.isHiddenOrHasHiddenAncestor,
                      "the editor is out of sight — hidden, never torn down")

        controller.exitTestingWorkspace()
        pump()

        XCTAssertFalse(textView.isHiddenOrHasHiddenAncestor,
                       "the editor is back on screen (D4)")
        XCTAssertEqual(controller.activeDocumentURL, documentURL,
                       "the open document survived (D4)")
        XCTAssertEqual(textView.selectedRange(), selectionBefore,
                       "the cursor is exactly where it was (D4)")
        XCTAssertEqual(try XCTUnwrap(textView.enclosingScrollView).contentView.bounds.origin,
                       scrollBefore,
                       "the scroll position is exactly where it was (D4)")
    }

    // MARK: - REJECTS WHEN: a build finishing inside the workspace must not break it

    func testABuildFinishingInsideTheWorkspaceLoadsPlayWithoutBreakingModality() throws {
        let frozen = TestToolchain.repoRoot
            .appendingPathComponent("tools/ide/test-fixtures/fernhill-frozen")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: frozen.path),
                          "tools/ide/test-fixtures/fernhill-frozen is not present")
        // INSIDE the checkout, not /tmp: the app's compose resolves `sharpee`
        // by walking up from the story file (ADR-279 D4), and this test needs
        // the REAL compose to populate the IR that names dist/web/<id>.
        // Gitignored as .compose-scratch-*; removed below.
        let scratch = TestToolchain.repoRoot
            .appendingPathComponent("tools/ide/test-fixtures/.compose-scratch-\(UUID().uuidString)",
                                    isDirectory: true)
        try FileManager.default.copyItem(at: frozen, to: scratch)
        defer { try? FileManager.default.removeItem(at: scratch) }
        let storyFile = scratch.appendingPathComponent("fernhill.story")

        try withCleanDefaults {
            let controller = MainWindowController()
            let window = try XCTUnwrap(controller.window)
            window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
            window.orderFront(nil)
            defer { window.orderOut(nil) }
            pump()

            let content = try XCTUnwrap(window.contentView)
            let split = try XCTUnwrap(fourPaneSplit(in: content))
            let leftPane = split.arrangedSubviews[2]

            controller.loadProject(Project(rootURL: scratch))
            // reloadPlayAfterBuild resolves dist/web/<id> from the composed
            // header — poll for the populated IR the way the corral tests do.
            controller.composeStory(at: storyFile)
            var waited: TimeInterval = 0
            while controller.storyBuildReport() == nil && waited < 15 {
                pump(0.1)
                waited += 0.1
            }
            XCTAssertNotNil(controller.storyBuildReport(),
                            "no populated compose arrived — dist/web/<id> cannot resolve")

            // The "built" bundle the reload loads — the path only needs the
            // directory the composed id names.
            let bundleDir = scratch.appendingPathComponent("dist/web/fernhill", isDirectory: true)
            try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
            try Data(Self.fixtureHTML.utf8).write(to: bundleDir.appendingPathComponent("index.html"))
            controller.setPlayAfterBuild(true)

            controller.showTestingTab()
            pump()
            XCTAssertTrue(controller.isTestingWorkspaceActive)

            controller.reloadPlayAfterBuild(projectRoot: scratch)
            pump()

            XCTAssertTrue(controller.playSurface.isLoaded,
                          "the finishing build still loads the surface — suppression is about tabs, not loading")
            XCTAssertTrue(controller.isTestingWorkspaceActive,
                          "a finishing build never dismantles the workspace (D2)")
            XCTAssertTrue(controller.playSurface.view.isDescendant(of: leftPane),
                          "the loaded surface is the left pane's — where the author is looking")
            XCTAssertFalse(controller.testingTab.view.isHiddenOrHasHiddenAncestor,
                           "the right panel stays the Testing surface — no tab was brought forward")
        }
    }

    // MARK: - Helpers

    /// Runs `body` with recents and the persisted session cleared, restoring
    /// both afterward — loadProject writes real entries into each.
    private func withCleanDefaults(_ body: () throws -> Void) rethrows {
        let defaults = UserDefaults.standard
        let keys = [RecentProjectsStore.key, SessionStateStore.key]
        let saved = keys.map { defaults.object(forKey: $0) }
        defer {
            for (key, value) in zip(keys, saved) {
                if let value { defaults.set(value, forKey: key) }
                else { defaults.removeObject(forKey: key) }
            }
        }
        keys.forEach { defaults.removeObject(forKey: $0) }
        try body()
    }

    /// Spins the main run loop so AppKit layout and web-view work can settle.
    private func pump(_ seconds: TimeInterval = 0.1) {
        RunLoop.main.run(until: Date(timeIntervalSinceNow: seconds))
    }

    /// Polls the Play surface until the fixture page reports itself booted.
    private func waitForBoot(of play: PlayViewController) async throws {
        for _ in 0..<100 {
            if let ready = try? await play.evaluateInPlaySurface("window.bootProbeReady === true"),
               ready as? Bool == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("fixture page did not boot within 5s")
    }

    private func descendants(of view: NSView) -> [NSView] {
        view.subviews + view.subviews.flatMap { descendants(of: $0) }
    }

    private func view(withIdentifier identifier: String, in root: NSView) -> NSView? {
        descendants(of: root).first { $0.accessibilityIdentifier() == identifier }
    }

    /// The main window's four-pane split (rail / project / left pane / right panel).
    private func fourPaneSplit(in root: NSView) -> NSSplitView? {
        descendants(of: root).compactMap { $0 as? NSSplitView }
            .first { $0.arrangedSubviews.count == 4 }
    }

    private func firstWebView(in root: NSView) -> WKWebView? {
        descendants(of: root).compactMap { $0 as? WKWebView }.first
    }

    private func firstTextView(in root: NSView) -> NSTextView? {
        descendants(of: root).compactMap { $0 as? NSTextView }.first
    }
}
