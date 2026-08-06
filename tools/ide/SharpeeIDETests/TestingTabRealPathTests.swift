// TestingTabRealPathTests.swift
// ADR-301 acceptance, as a rule-13a real-path suite: no stub stands in for
// anything this repository owns. The bundle under test is the one shipped in
// the app; it is served by the real scheme handler into a real WKWebView; the
// events it renders come from a real `sharpee test --tree --json` run of the
// real branch-stories/fernhill through the real TestRunner; and every assertion
// reads the RENDERED page, not the bytes handed to it.
//
// Acceptance covered here: 1 (bundle over a scheme handler, no Swift mirror in
// the tab's path), 2 (a real tree run renders live, replays marked, totals
// matching the reporter), 3 (a broken interior node renders one failure plus a
// blocked count with its descendants present and marked unreached), 4 (the
// subtree-failure count on the parent row), 5 (all three modes render the same
// selection), 6 (double-click opens a document with click-through to file:line).

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class TestingTabRealPathTests: XCTestCase {

    private var tab: TestingTabViewController!
    private var runner: TestRunner!
    private var relay: LineRelay!

    private var fernhillStory: URL {
        TestToolchain.repoRoot.appendingPathComponent("branch-stories/fernhill/fernhill.story")
    }

    override func setUpWithError() throws {
        try super.setUpWithError()
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "devkit CLI not built — run `./repokit build`")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: fernhillStory.path),
                          "branch-stories/fernhill is not present")
        tab = TestingTabViewController()
        _ = tab.view // force loadView: installs the scheme handler and starts the page
        runner = TestRunner()
        relay = LineRelay(tab: tab)
        runner.delegate = relay
    }

    override func tearDownWithError() throws {
        runner = nil
        relay = nil
        tab = nil
        try super.tearDownWithError()
    }

    // MARK: - Acceptance 1 — the bundle, over a scheme handler, with no Swift mirror

    func testTheWebBundleShipsInTheAppAndBootsOverTheSchemeHandler() async throws {
        let index = try XCTUnwrap(TestingTabWebRoot.indexURL(),
                                  "the app has no testing-tab bundle — the web build did not run")
        XCTAssertEqual(index.deletingLastPathComponent().lastPathComponent,
                       TestingTabWebRoot.folderName)

        try await waitForPage()
        let scheme = try await tab.evaluateInTab("location.protocol") as? String
        XCTAssertEqual(scheme, "\(TestingTabSchemeHandler.scheme):",
                       "the page must be served over the custom scheme, never file://")

        // The wire's own guard is IN the page. That is what makes a Swift mirror
        // unnecessary here, so it is asserted rather than assumed.
        let decodes = try await tab.evaluateInTab(
            "typeof window.__sharpeeTesting === 'object' && typeof window.__sharpeeTesting.line === 'function'")
        XCTAssertEqual(decodes as? Bool, true)
    }

    /// A line from a version the page does not understand is REPORTED, not
    /// folded and not dropped — the wire's loud-rejection rule, enforced on the
    /// consumer that now owns the decision.
    func testAFutureSchemaLineSurfacesAsAStatusRatherThanBeingFolded() async throws {
        try await waitForPage()
        tab.deliver(line: #"{"schemaVersion":999,"seq":0,"elapsedMs":0,"type":"run-start","mode":"tests"}"#)
        try await settle()

        let status = try await tab.evaluateInTab("document.getElementById('status').textContent") as? String
        XCTAssertTrue(status?.contains("Unreadable line") == true,
                      "the tab must say the toolchain and it disagree; got \(status ?? "nil")")
        let rows = try await tab.evaluateInTab("document.querySelectorAll('#cols .crow').length") as? Int
        XCTAssertEqual(rows, 0, "nothing from an unreadable line may reach the tree")
    }

    // MARK: - One run model

    /// The toolbar offers exactly ONE run, and clicking it reaches the host.
    ///
    /// This is a regression test for a shipped bug, not a style preference. The
    /// tab shipped with Run All / Run Tree / Run Chain; the first ran the suite
    /// flat, which is wrong for a `continues:` tree (229 passed / 287 failed on
    /// fernhill against 516 / 0 as a tree), and the second scanned
    /// `walkthroughs/`, which an IDE project does not have. Both "worked" — they
    /// wired through correctly and produced wrong answers, which is why a wiring
    /// test would not have caught it and this asserts the BUTTON SET.
    func testTheToolbarOffersExactlyOneRunAndItReachesTheHost() async throws {
        try await waitForPage()

        let runButtons = try await tab.evaluateInTab(
            "Array.from(document.querySelectorAll('.runs button')).map(function (b) { return b.id; }).join(',')") as? String
        XCTAssertEqual(runButtons, "run,cancel",
                       "one run verb plus cancel — no flat or chain variant")
        let label = try await text("#run")
        XCTAssertEqual(label, "Run Tests")

        // And no Follow toggle: it re-armed itself every run, so it only ever
        // governed the run already being watched.
        let follow = try await count("#follow")
        XCTAssertEqual(follow, 0)

        var ran = 0
        tab.onRun = { ran += 1 }
        _ = try await tab.evaluateInTab("document.getElementById('run').click()")
        try await settle()
        XCTAssertEqual(ran, 1, "the run button must reach the host")
    }

    // MARK: - Acceptance 2 — a real tree run renders

    func testARealFernhillTreeRunRendersItsTreeReplaysAndTotals() async throws {
        try await waitForPage()
        try await runTree()

        // The reporter's own numbers for this suite: 552 commands, 518 authored
        // + 34 replayed. The tab recomputes them from the stream, so agreeing
        // with the reporter is a claim about the wire, not a copied constant.
        let commands = try await text("#tally-commands")
        let split = try await text("#tally-commands-sub")
        XCTAssertEqual(commands, "552")
        XCTAssertEqual(split, "518 authored · 34 replayed")

        let passed = try await text("#tally-pass")
        XCTAssertEqual(passed, "22", "every node in the suite passes")
        let failed = try await text("#tally-fail")
        let unreachedAtRest = try await text("#tally-unreached")
        XCTAssertEqual(failed, "0")
        XCTAssertEqual(unreachedAtRest, "0")

        // Five roots, and the tree is nested rather than flat.
        let roots = try await count("#cols .col:first-child .crow")
        XCTAssertEqual(roots, 5, "fernhill has five roots")

        // Replayed executions are MARKED, which is what stops them reading as
        // duplicate turns (ADR-302 D17).
        let replayTags = try await count("#cols .tag")
        XCTAssertGreaterThan(replayTags, 0, "a replayed ancestor must be tagged in the tree")

        // A node re-executed for its siblings still shows its own turns once.
        try await select(path: ["arrival"])
        let arrivalTurns = try await count(".preview .turn")
        XCTAssertEqual(arrivalTurns, 2, "arrival is 2 commands however many times it was replayed")
    }

    /// Acceptance 6: the document view lists every turn with its source line,
    /// and clicking one asks the host to open that exact `file:line`.
    func testOpeningADocumentListsEveryTurnAndClicksThroughToItsSourceLine() async throws {
        var opened: SourceLocation?
        tab.onOpenLocation = { opened = $0 }
        try await waitForPage()
        try await runTree()

        try await select(path: ["arrival", "concealment"])
        _ = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#cols .crow'));
          var row = rows.find(function (r) { return r.querySelector('.stem').textContent === 'concealment'; });
          row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        })();
        """)
        try await settle()

        let turnCount = try await count("#docview .turn")
        XCTAssertEqual(turnCount, 16, "concealment is 16 turns, all present in its document")
        let firstLine = try await text("#docview .turn:first-child .ln")
        XCTAssertEqual(firstLine, "12", "the first turn's own source line, from the wire")

        _ = try await tab.evaluateInTab("document.querySelector('#docview .turn .ln').click();")
        try await settle()

        let location = try XCTUnwrap(opened, "clicking a line number must reach the host")
        XCTAssertEqual(location.file.lastPathComponent, "concealment.transcript")
        XCTAssertEqual(location.line, 12)
    }

    /// Acceptance 5: the modes are three shapes over ONE selection.
    func testAllThreeModesRenderAndSwitchingThemPreservesTheSelection() async throws {
        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "key"])

        for mode in ["list", "documents", "column"] {
            _ = try await tab.evaluateInTab(
                "document.querySelector('[data-mode=\"\(mode)\"]').click();")
            try await settle()
            let pane = try await tab.evaluateInTab(
                "document.getElementById('pane-\(mode)').classList.contains('on')") as? Bool
            XCTAssertEqual(pane, true, "\(mode) mode must be the visible pane")
            let selected = try await text("#pathbar b")
            XCTAssertEqual(selected, "key", "the selection survives the switch to \(mode)")
        }
    }

    // MARK: - Acceptance 3 & 4 — one failure, and a count of what it blocked

    /// A deliberately broken INTERIOR node. Its descendants must be present and
    /// marked `unreached` — never absent (which would hide work) and never red
    /// (which would multiply one bug into a wall of failures, ADR-302 D13).
    func testABrokenInteriorNodeRendersOneFailurePlusABlockedCount() async throws {
        let key = TestToolchain.repoRoot
            .appendingPathComponent("branch-stories/fernhill/tests/transcripts/key.transcript")
        let original = try String(contentsOf: key, encoding: .utf8)
        // `key` is an interior node: 2 commands, four children hang off it.
        let broken = original.replacingOccurrences(of: "> search the doormat",
                                                   with: "> search the doormat\n> xyzzy the doormat\n[OK]")
        try XCTSkipIf(broken == original, "key.transcript no longer has the command this test breaks")
        try broken.write(to: key, atomically: true, encoding: .utf8)
        defer { try? original.write(to: key, atomically: true, encoding: .utf8) }

        try await waitForPage()
        try await runTree()

        let failures = try await text("#tally-fail")
        XCTAssertEqual(failures, "1", "one broken node is one failure")
        let unreached = try await text("#tally-unreached")
        XCTAssertGreaterThan(Int(unreached) ?? 0, 0,
                             "key's descendants must be reported, not silently absent")

        // Acceptance 4: the count rides the PARENT row, because Miller columns
        // show only the selected path and a failure off it is otherwise invisible.
        let badge = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#cols .crow'));
          var row = rows.find(function (r) { return r.querySelector('.stem').textContent === 'arrival'; });
          var badge = row && row.querySelector('.badge');
          return badge ? badge.textContent : null;
        })();
        """) as? String
        XCTAssertEqual(badge, "1", "arrival carries the count of failures beneath it")

        // The blocked descendants are present, marked, and not red.
        try await select(path: ["arrival", "key"])
        let blocked = try await tab.evaluateInTab("""
        (function () {
          var cols = document.querySelectorAll('#cols .col');
          var last = cols[cols.length - 2];
          return Array.from(last.querySelectorAll('.crow')).map(function (r) {
            return r.className;
          }).join('|');
        })();
        """) as? String
        XCTAssertTrue(blocked?.contains("unreached") == true,
                      "key's children must render as unreached; got \(blocked ?? "nil")")
        XCTAssertFalse(blocked?.contains("failed") == true,
                       "a blocked descendant is never a failure")
    }

    // MARK: - Driving the real run

    /// Runs the real tree suite through the real TestRunner and waits for the
    /// process to exit AND the page to have folded the whole stream.
    private func runTree() async throws {
        let exited = expectation(description: "tree run exits")
        relay.onExit = { exited.fulfill() }
        tab.beginRun(story: "fernhill")
        runner.start(executable: URL(fileURLWithPath: "/usr/bin/env"),
                     arguments: ["node", TestToolchain.devkitCLI.path,
                                 "test", fernhillStory.path, "--tree", "--json"],
                     workingDirectory: fernhillStory.deletingLastPathComponent(),
                     environment: ShellEnvironment.buildEnvironment())
        await fulfillment(of: [exited], timeout: 120)
        try await settle(times: 6)
    }

    /// Selects a node by clicking down its ancestry, one column at a time —
    /// which is the only way to reach it, and the point of Miller columns: a
    /// descendant has no row on screen until its parent is the selected path.
    /// Driving it any other way would test a shortcut the author does not have.
    private func select(path: [String]) async throws {
        for stem in path {
            let clicked = try await tab.evaluateInTab("""
            (function () {
              var rows = Array.from(document.querySelectorAll('#cols .crow'));
              var row = rows.find(function (r) { return r.querySelector('.stem').textContent === '\(stem)'; });
              if (!row) return false;
              row.click();
              return true;
            })();
            """) as? Bool
            XCTAssertEqual(clicked, true, "no row for '\(stem)' — its parent is not the selected path")
            try await settle()
        }
    }

    private func waitForPage() async throws {
        for _ in 0..<200 {
            if tab.isPageReady { return }
            try await Task.sleep(nanoseconds: 25_000_000)
        }
        XCTFail("the Testing tab's page did not report ready within 5s")
    }

    /// Lets queued line deliveries and the page's coalesced repaint land.
    private func settle(times: Int = 2) async throws {
        for _ in 0..<times {
            try await Task.sleep(nanoseconds: 80_000_000)
        }
    }

    private func text(_ selector: String) async throws -> String {
        let value = try await tab.evaluateInTab(
            "(document.querySelector('\(selector)') || {textContent: ''}).textContent")
        return (value as? String) ?? ""
    }

    private func count(_ selector: String) async throws -> Int {
        let value = try await tab.evaluateInTab("document.querySelectorAll('\(selector)').length")
        return (value as? Int) ?? -1
    }
}

/// Forwards the runner's raw lines into the tab, which is exactly what
/// TestController does in production — the seam under test is the tab's, not
/// the controller's window plumbing.
@MainActor
private final class LineRelay: TestRunnerDelegate {
    private let tab: TestingTabViewController
    var onExit: (() -> Void)?

    init(tab: TestingTabViewController) { self.tab = tab }

    func runner(_ runner: TestRunner, didReceiveLine line: String) {
        tab.deliver(line: line)
    }
    func runner(_ runner: TestRunner, didEmitStderr text: String) {}
    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State) {}
    func runner(_ runner: TestRunner, didExit result: TestRunner.Result) {
        tab.runFinished(ok: result.state == .passed)
        onExit?()
    }
}
