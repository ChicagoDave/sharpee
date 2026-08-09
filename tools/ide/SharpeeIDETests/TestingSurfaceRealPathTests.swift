// TestingSurfaceRealPathTests.swift
// The testing play surface, live (ADR-306 Phase 3): a real WKWebView boots a
// fixture testing page over the pane's real scheme handler, with the REAL
// committed surface bundle (Resources/testing-surface) injected over it. The
// fixture plays the browser client's part — `data-turn`-stamped elements, a
// `#command-input` that renders turns on Enter, feed records over the real
// `turnEvents` bridge — so these tests pin the actual seams: asset injection,
// record forwarding into the page, card building, rail ticks driving the
// segment model, auto-names in the DOM, the sidecar's continuous writes, the
// restart fence, corrupt-sidecar degraded mode (AC-2 at Phase-3 level), and
// restore-by-replay through the client's real input (AC-1's substrate).
// No stubs of anything the repo owns: the page, the bridges, the surface
// bundle, and the sidecar store are the production ones.
// Owner context: tools/ide — Tests.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class TestingSurfaceRealPathTests: XCTestCase {

    private var tmp: URL!
    private var bundleDir: URL!
    private var sidecarURL: URL!
    private var surface: TestingSurfaceViewController!

    /// The client's part, in fixture form: an opening (unstamped), a boot
    /// look, and a room graph walked by typed commands — each turn stamped
    /// into the DOM and posted over the feed exactly as `BrowserClient` does.
    private static let fixtureHTML = """
    <html><head><meta charset="utf-8"></head><body>
    <div class="sharpee-window">
      <div id="main-window"><div id="text-content"></div></div>
      <div id="input-area" class="sharpee-input-bar">
        <input id="command-input" type="text">
      </div>
    </div>
    <script>
    (function () {
      var route = {
        'Iron Gates':    { north: 'Gravel Drive' },
        'Gravel Drive':  { north: 'Fountain Court', south: 'Iron Gates' },
        'Fountain Court':{ north: 'Entrance Hall', south: 'Gravel Drive' }
      };
      var current = 'Iron Gates';
      var n = 0;
      function post(o) {
        try { window.webkit.messageHandlers.turnEvents.postMessage(JSON.stringify(o)); } catch (e) {}
      }
      function renderTurn(command, echo) {
        n += 1;
        var tc = document.getElementById('text-content');
        if (echo) {
          var e = document.createElement('div');
          e.className = 'command-echo';
          e.textContent = '> ' + command;
          e.setAttribute('data-turn', n);
          tc.appendChild(e);
        }
        var dest = (route[current] || {})[command];
        if (dest) current = dest;
        var r = document.createElement('p');
        r.className = 'room-name';
        r.textContent = current;
        r.setAttribute('data-turn', n);
        tc.appendChild(r);
        var p = document.createElement('p');
        p.textContent = 'You are in the ' + current + '.';
        p.setAttribute('data-turn', n);
        tc.appendChild(p);
        post({ turn: n, command: command,
               output: current + '\\nYou are in the ' + current + '.',
               captures: [{ channel: 'room-name', values: [current] }],
               events: [], lineage: 1 });
      }
      var tc = document.getElementById('text-content');
      var opening = document.createElement('p');
      opening.textContent = 'The cab is already grinding away down the lane.';
      tc.appendChild(opening);
      renderTurn('look', false);
      var input = document.getElementById('command-input');
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && input.value.trim()) {
          var command = input.value.trim();
          input.value = '';
          renderTurn(command, true);
        }
      });
      window.fixtureRestart = function () {
        post({ restart: true, turn: n + 1, lineage: 2 });
      };
      window.bootProbeReady = true;
    })();
    </script>
    </body></html>
    """

    override func setUpWithError() throws {
        try super.setUpWithError()
        try XCTSkipUnless(TestingSurfaceWebRoot.scriptURL() != nil,
                          TestingSurfaceWebRoot.missingNote)
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-TestingSurfaceTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        bundleDir = tmp.appendingPathComponent("dist/web/probe", isDirectory: true)
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        try Data(Self.fixtureHTML.utf8)
            .write(to: bundleDir.appendingPathComponent("index-testing.html"))
        sidecarURL = tmp.appendingPathComponent("probe-session.json")
    }

    override func tearDownWithError() throws {
        surface = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        try super.tearDownWithError()
    }

    private func boot() async throws {
        surface = TestingSurfaceViewController(
            sessionStore: TestingSessionStore(fileURL: sidecarURL))
        _ = surface.view
        surface.testsDirectory = tmp.appendingPathComponent("tests", isDirectory: true)
        surface.load(bundleDirectory: bundleDir)
        try await waitFor("window.bootProbeReady === true", "fixture boot")
    }

    private func transcriptOnDisk(_ stem: String) -> URL {
        tmp.appendingPathComponent("tests/\(stem).transcript")
    }

    /// Polls until `probe` evaluates true, failing after 5s.
    private func waitFor(_ probe: String, _ what: String) async throws {
        for _ in 0..<100 {
            if let ok = try? await surface.evaluateInSurface(probe), ok as? Bool == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("timed out waiting for \(what): \(probe)")
    }

    /// Types a command through the client's real input, as the author would.
    private func type(_ command: String) async throws {
        _ = try await surface.evaluateInSurface("""
        (function () {
          var input = document.getElementById('command-input');
          input.value = \(jsString(command));
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        })();
        """)
    }

    private func jsString(_ value: String) -> String {
        (try? JSONEncoder().encode(value))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "''"
    }

    private func tick(_ ordinal: Int) async throws {
        _ = try await surface.evaluateInSurface("""
        document.querySelector('[data-ts-ordinal="\(ordinal)"] .ts-pick input').click();
        """)
    }

    private func sidecarJSON() throws -> [String: Any] {
        let data = try Data(contentsOf: sidecarURL)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    // MARK: - The surface builds cards from real play

    func testSurfaceInjectsAndBuildsOpeningAndBootCards() async throws {
        try await boot()
        // The real committed surface.js loaded over the scheme handler and
        // built the layout plus two cards: the opening (0) and the boot look.
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 2",
                         "opening + boot cards")
        let openingMeta = try await surface.evaluateInSurface(
            "document.querySelector('[data-ts-ordinal=\"0\"] .ts-meta').textContent")
        XCTAssertEqual(openingMeta as? String, "opening")
        let bootMeta = try await surface.evaluateInSurface(
            "document.querySelector('[data-ts-ordinal=\"1\"] .ts-meta').textContent")
        XCTAssertEqual(bootMeta as? String, "turn 1 · boot")
        // The opening card holds the client's own rendered prologue element.
        try await waitFor("""
        document.querySelector('[data-ts-ordinal="0"] .ts-prose').textContent.indexOf('grinding away') !== -1
        """, "prologue prose moved into the opening card")
    }

    func testPlayedTurnsBecomeCardsWithTheClientsProse() async throws {
        try await boot()
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 2", "boot cards")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 3", "turn 2 card")
        try await waitFor("""
        document.querySelector('[data-ts-ordinal="2"] .ts-prose').textContent.indexOf('Gravel Drive') !== -1
        """, "turn 2 prose in its card")
    }

    // MARK: - Ranging, naming, and the sidecar

    func testTickingStartAndEndRangesASegmentWithTheDerivedName() async throws {
        try await boot()
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4", "4 cards")

        try await tick(2)
        try await tick(3)
        // The strip rides the range's first card with the route-derived name:
        // the player stood at Iron Gates when turn 2 began, ended at Fountain
        // Court, two turns.
        try await waitFor("""
        (function () {
          var strip = document.querySelector('[data-ts-ordinal="2"] .ts-auto-name');
          return !!strip && strip.textContent.indexOf('iron-gates-to-fountain-court-2') !== -1;
        })()
        """, "auto-named title strip")
        // The mid-range turn is implied, not ticked.
        let implied = try await surface.evaluateInSurface("""
        document.querySelector('[data-ts-ordinal="2"] .ts-pick input').checked === true &&
        document.querySelector('[data-ts-ordinal="3"] .ts-pick input').checked === true
        """)
        XCTAssertEqual(implied as? Bool, true)

        // The view state landed in the sidecar (D8 continuous persistence).
        try await waitForSidecarSegments()
        let object = try sidecarJSON()
        let state = try XCTUnwrap(object["viewState"] as? [String: Any])
        let segments = try XCTUnwrap(state["segments"] as? [[String: Any]])
        XCTAssertEqual(segments.first?["start"] as? Int, 2)
        XCTAssertEqual(segments.first?["end"] as? Int, 3)
        // And the command log carries the session (boot look + two norths).
        let commands = try XCTUnwrap(object["commands"] as? [[String: Any]])
        XCTAssertEqual(commands.map { $0["command"] as? String }, ["look", "north", "north"])
        XCTAssertEqual(commands.first?["boot"] as? Bool, true)
    }

    private func waitForSidecarSegments() async throws {
        for _ in 0..<100 {
            if let object = try? sidecarJSON(),
               let state = object["viewState"] as? [String: Any],
               let segments = state["segments"] as? [[String: Any]],
               !segments.isEmpty { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("timed out waiting for sidecar view state")
    }

    func testCollapseFoldsTheRangeIntoASummaryCard() async throws {
        try await boot()
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 3", "cards")
        try await tick(1)
        try await tick(2)
        _ = try await surface.evaluateInSurface("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="1"] .ts-title-strip button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'Collapse') { buttons[i].click(); return; }
          }
        })();
        """)
        try await waitFor("""
        (function () {
          var summary = document.querySelector('#ts-cards .ts-summary');
          return !!summary && summary.textContent.indexOf('turns 1–2') !== -1 &&
                 document.querySelector('[data-ts-ordinal="1"]').style.display === 'none';
        })()
        """, "summary card standing in for the collapsed range")
    }

    func testSplitHereAndMergeUpRoundTripThroughTheirButtons() async throws {
        try await boot()
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4", "cards")
        try await tick(1)
        try await tick(3)   // closed 1–3

        // Split here on turn 3: the tail becomes its own transcript,
        // continuing from the head — its strip appears on card 3.
        _ = try await surface.evaluateInSurface("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="3"] .ts-actions button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'Split here') { buttons[i].click(); return; }
          }
        })();
        """)
        try await waitFor("""
        (function () {
          var note = document.querySelector('[data-ts-ordinal="3"] .ts-strip-note');
          return !!note && note.style.display !== 'none' &&
                 note.textContent.indexOf('continues from') !== -1;
        })()
        """, "the tail's continues-from note after Split here")

        // Merge ↑ on the tail folds it back: one segment 1–3, strip on card
        // 1 only, and the sidecar's view state converges to the merged shape.
        _ = try await surface.evaluateInSurface("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="3"] .ts-title-strip button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'Merge ↑') { buttons[i].click(); return; }
          }
        })();
        """)
        try await waitFor("""
        (function () {
          var head = document.querySelector('[data-ts-ordinal="1"] .ts-title-strip');
          var tail = document.querySelector('[data-ts-ordinal="3"] .ts-title-strip');
          return !!head && head.style.display !== 'none' &&
                 !!tail && tail.style.display === 'none';
        })()
        """, "one strip on the merged range's first card")
        for _ in 0..<100 {
            if let object = try? sidecarJSON(),
               let state = object["viewState"] as? [String: Any],
               let segments = state["segments"] as? [[String: Any]],
               segments.count == 1,
               segments.first?["start"] as? Int == 1,
               segments.first?["end"] as? Int == 3 { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        let state = try XCTUnwrap(try sidecarJSON()["viewState"] as? [String: Any])
        let segments = try XCTUnwrap(state["segments"] as? [[String: Any]])
        XCTAssertEqual(segments.count, 1)
        XCTAssertEqual(segments.first?["start"] as? Int, 1)
        XCTAssertEqual(segments.first?["end"] as? Int, 3)
    }

    // MARK: - The auto-save writer (Phase 4, design §4)

    func testClosingARangeWritesItsTranscriptAndReopeningRemovesIt() async throws {
        try await boot()
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4", "cards")

        try await tick(2)
        try await tick(3)   // closed 2–3 → iron-gates-to-fountain-court-2
        let file = transcriptOnDisk("iron-gates-to-fountain-court-2")
        for _ in 0..<100 {
            if FileManager.default.fileExists(atPath: file.path) { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        let text = try String(contentsOf: file, encoding: .utf8)
        XCTAssertTrue(text.contains("title: iron-gates-to-fountain-court-2"))
        XCTAssertTrue(text.contains("seed: 42"))
        XCTAssertTrue(text.contains("> north"))
        // No policy in this fixture: in-range turns carry the 6e placeholder.
        XCTAssertTrue(text.contains("[SKIP]"))

        // Reopening the range takes the file back — an open range is not a
        // file yet (design §3).
        try await tick(3)   // untick the end
        for _ in 0..<100 {
            if !FileManager.default.fileExists(atPath: file.path) { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertFalse(FileManager.default.fileExists(atPath: file.path),
                       "a reopened range's file is removed until it closes again")
    }

    func testExtendingAClosedRangeRenamesItsFileOnDisk() async throws {
        try await boot()
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4", "cards")
        try await tick(2)
        try await tick(3)   // closed 2–3
        let before = transcriptOnDisk("iron-gates-to-fountain-court-2")
        for _ in 0..<100 {
            if FileManager.default.fileExists(atPath: before.path) { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertTrue(FileManager.default.fileExists(atPath: before.path))

        // Split at 3: head 2–2 renames, tail 3–3 continues from it — the old
        // stem's file goes, both new files land, the child names its parent.
        _ = try await surface.evaluateInSurface("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="3"] .ts-actions button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'Split here') { buttons[i].click(); return; }
          }
        })();
        """)
        let head = transcriptOnDisk("iron-gates-to-gravel-drive-1")
        let tail = transcriptOnDisk("gravel-drive-to-fountain-court-1")
        for _ in 0..<100 {
            if FileManager.default.fileExists(atPath: head.path),
               FileManager.default.fileExists(atPath: tail.path),
               !FileManager.default.fileExists(atPath: before.path) { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertFalse(FileManager.default.fileExists(atPath: before.path),
                       "the pre-split stem is renamed away")
        let tailText = try String(contentsOf: tail, encoding: .utf8)
        XCTAssertTrue(tailText.contains("continues: iron-gates-to-gravel-drive-1"),
                      "the tail continues from the head's NEW stem")
    }

    // MARK: - The restart fence

    func testRestartFenceClearsCardsAndSidecarTail() async throws {
        try await boot()
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 3", "cards")
        _ = try await surface.evaluateInSurface("window.fixtureRestart();")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 0",
                         "dead-lineage cards cleared")
        // The fence landed in the log, so the replay plan is empty.
        let reloaded = TestingSessionStore(fileURL: sidecarURL)
        XCTAssertTrue(reloaded.load())
        XCTAssertEqual(reloaded.replayPlan().replay, [])
    }

    // MARK: - D8: restore-by-replay, and the degraded mode (AC-1/AC-2 substrate)

    func testReopenRestoresByReplayThroughTheRealInput() async throws {
        try await boot()
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4", "4 cards")
        try await tick(2)
        try await tick(3)
        try await waitForSidecarSegments()

        // A fresh surface over the same sidecar: the boot plays itself, the
        // two norths replay through the client's real input, and the segment
        // structure re-applies — cards, range, and name as left.
        surface = nil
        try await boot()
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4",
                         "replayed cards")
        try await waitFor("""
        (function () {
          var strip = document.querySelector('[data-ts-ordinal="2"] .ts-auto-name');
          return !!strip && strip.textContent.indexOf('iron-gates-to-fountain-court-2') !== -1;
        })()
        """, "restored segment with its derived name")
    }

    func testCorruptSidecarDegradesToAFreshSessionWithoutError() async throws {
        try Data("corrupt{{{not json".utf8).write(to: sidecarURL)
        try await boot()
        // The page opens and plays normally — no error surface, just a fresh
        // session (opening + boot look).
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 2",
                         "fresh session cards")
        // The sidecar was replaced on the next session write (the boot look).
        for _ in 0..<100 {
            if let object = try? sidecarJSON(),
               object["version"] as? Int == TestingSessionStore.version { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        let object = try sidecarJSON()
        XCTAssertEqual(object["version"] as? Int, TestingSessionStore.version)
        let commands = try XCTUnwrap(object["commands"] as? [[String: Any]])
        XCTAssertEqual(commands.first?["command"] as? String, "look")
    }

    // MARK: - The real client (rule 13a: no stand-ins anywhere on this path)

    /// Fernhill's REAL devkit-built bundle: the actual `index-testing.html`
    /// the browser build emits, the actual `game.js` engine booting at the
    /// pinned seed, real turn records over the real bridge — the surface's
    /// cards built from a genuine play session. Skips (never fakes) when the
    /// bundle hasn't been built: `cd branch-stories/fernhill &&
    /// node ../../packages/devkit/dist/cli.js build fernhill.story --browser`.
    func testRealFernhillBundlePlaysIntoCardsOnTheRealEngine() async throws {
        let repoRoot = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()  // SharpeeIDETests
            .deletingLastPathComponent()  // ide
            .deletingLastPathComponent()  // tools
            .deletingLastPathComponent()  // repo root
        let fernhill = repoRoot.appendingPathComponent(
            "branch-stories/fernhill/dist/web/fernhill", isDirectory: true)
        try XCTSkipUnless(
            FileManager.default.fileExists(
                atPath: fernhill.appendingPathComponent("index-testing.html").path),
            "fernhill's browser bundle (with the testing page) is not built")

        surface = TestingSurfaceViewController(
            sessionStore: TestingSessionStore(fileURL: sidecarURL))
        _ = surface.view
        surface.load(bundleDirectory: fernhill)
        XCTAssertTrue(surface.isLoaded)

        // The real engine boots and its look becomes cards: the opening
        // (prologue + banner, unstamped) and turn 1 · boot.
        for _ in 0..<300 {
            if let n = try? await surface.evaluateInSurface(
                "document.querySelectorAll('#ts-cards .ts-turn').length"),
               (n as? Int ?? 0) >= 2 { break }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        let cards = try await surface.evaluateInSurface(
            "document.querySelectorAll('#ts-cards .ts-turn').length")
        XCTAssertGreaterThanOrEqual(cards as? Int ?? 0, 2,
                                    "the real engine's boot look must land as cards")

        // A REAL played turn: north from the Iron Gates is the Gravel Drive.
        try await type("north")
        try await waitFor("""
        (function () {
          var card = document.querySelector('[data-ts-ordinal="2"] .ts-prose');
          return !!card && card.textContent.indexOf('Gravel Drive') !== -1;
        })()
        """, "the real turn's prose in its card")

        // Ranging the real turns derives the name from real rooms.
        try await tick(2)
        var strip: String?
        for _ in 0..<40 {
            strip = try await surface.evaluateInSurface("""
            (document.querySelector('[data-ts-ordinal="2"] .ts-auto-name') || {textContent: ''}).textContent
            """) as? String
            if strip?.contains("iron-gates-to-gravel-drive-1") == true { break }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        XCTAssertTrue(strip?.contains("iron-gates-to-gravel-drive-1") == true,
                      "route-derived name from the real world's rooms — strip was: \(strip ?? "nil")")
    }

    // MARK: - Placeholder states

    func testABundleWithoutTheTestingPageNamesTheFix() async throws {
        let bare = tmp.appendingPathComponent("dist/web/bare", isDirectory: true)
        try FileManager.default.createDirectory(at: bare, withIntermediateDirectories: true)
        try Data("<html></html>".utf8).write(to: bare.appendingPathComponent("index.html"))
        surface = TestingSurfaceViewController(
            sessionStore: TestingSessionStore(fileURL: sidecarURL))
        _ = surface.view
        surface.load(bundleDirectory: bare)
        XCTAssertFalse(surface.isLoaded,
                       "a pre-ADR-306 bundle has no testing page — the surface must not load index.html")
    }
}
