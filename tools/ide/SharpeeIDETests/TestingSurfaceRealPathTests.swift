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
    /// Phase 5 parity: a typed `restart` behind confirm() replays the real
    /// client's sequence (ack turn → fence → fresh boot look), and a typed
    /// `save` opens a real `<dialog>` that resolves the turn only on close —
    /// the shapes the branch driver and the D7 dialog auto-drive ride on.
    private static let fixtureHTML = """
    <html><head><meta charset="utf-8"></head><body>
    <div class="sharpee-window">
      <div id="main-window"><div id="text-content"></div></div>
      <div id="input-area" class="sharpee-input-bar">
        <input id="command-input" type="text">
      </div>
    </div>
    <dialog id="save-dialog">
      <input type="text" id="save-name-input">
      <div id="save-slots-list"></div>
      <button id="save-confirm-btn">Save</button>
      <button id="save-cancel-btn">Cancel</button>
    </dialog>
    <script>
    (function () {
      var route = {
        'Iron Gates':    { north: 'Gravel Drive' },
        'Gravel Drive':  { north: 'Fountain Court', south: 'Iron Gates', east: 'Boiler Shed' },
        'Boiler Shed':   { west: 'Gravel Drive' },
        'Fountain Court':{ north: 'Entrance Hall', south: 'Gravel Drive' }
      };
      var current = 'Iron Gates';
      var n = 0;
      var lineage = 1;
      function post(o) {
        try { window.webkit.messageHandlers.turnEvents.postMessage(JSON.stringify(o)); } catch (e) {}
      }
      function renderTurn(command, echo, output) {
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
        var bodyText = output || ('You are in the ' + current + '.');
        var r = document.createElement('p');
        r.className = 'room-name';
        r.textContent = current;
        r.setAttribute('data-turn', n);
        tc.appendChild(r);
        var p = document.createElement('p');
        p.textContent = bodyText;
        p.setAttribute('data-turn', n);
        tc.appendChild(p);
        var token = current.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        post({ turn: n, command: command,
               output: current + '\\n' + bodyText,
               captures: [{ channel: 'room-name', values: [current] }],
               events: ['if.event.actor_moved'],
               world: { entities: [{ kind: 'npc', name: 'Tobias', token: 'tobias',
                                     location: { name: current, token: token } }] },
               lineage: lineage });
      }
      function bootLook() { renderTurn('look', false); }
      var tc = document.getElementById('text-content');
      var opening = document.createElement('p');
      opening.textContent = 'The cab is already grinding away down the lane.';
      tc.appendChild(opening);
      bootLook();
      var input = document.getElementById('command-input');
      input.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || !input.value.trim()) return;
        var command = input.value.trim();
        input.value = '';
        if (command === 'restart') {
          // The client's sequence (ADR-248): confirm, ack turn, fence, boot.
          if (!window.confirm('Are you sure?')) { renderTurn(command, true, 'Restart declined.'); return; }
          renderTurn(command, true, 'The story restarts.');
          lineage += 1;
          post({ restart: true, turn: n + 1, lineage: lineage });
          current = 'Iron Gates';
          bootLook();
          return;
        }
        if (command === 'save') {
          // The turn completes only when the dialog closes (the D7 shape).
          var dialog = document.getElementById('save-dialog');
          var handler = function () {
            dialog.removeEventListener('close', handler);
            var name = document.getElementById('save-name-input').value;
            var saved = dialog.returnValue === 'confirm' && name;
            window.fixtureLastSave = saved ? name : null;
            renderTurn(command, true, saved ? 'Saved as ' + name + '.' : 'Save cancelled.');
          };
          dialog.addEventListener('close', handler);
          document.getElementById('save-confirm-btn').onclick = function () { dialog.close('confirm'); };
          document.getElementById('save-cancel-btn').onclick = function () { dialog.close('cancel'); };
          document.getElementById('save-name-input').value = 'generated-name';
          dialog.showModal();
          return;
        }
        renderTurn(command, true);
      });
      window.fixtureRestart = function () {
        lineage += 1;
        post({ restart: true, turn: n + 1, lineage: lineage });
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

    private func boot(policy: String? = nil) async throws {
        surface = TestingSurfaceViewController(
            sessionStore: TestingSessionStore(fileURL: sidecarURL))
        _ = surface.view
        surface.testsDirectory = tmp.appendingPathComponent("tests", isDirectory: true)
        surface.policy = policy
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

        // The view state landed in the sidecar (D8 continuous persistence) —
        // the composite's model snapshot is position-keyed (Phase 5).
        try await waitForSidecarSegments()
        let object = try sidecarJSON()
        let segments = try sidecarSegments(object)
        XCTAssertEqual(segments.first?["startPos"] as? Int, 2)
        XCTAssertEqual(segments.first?["endPos"] as? Int, 3)
        // And the command log carries the session (boot look + two norths).
        let commands = try XCTUnwrap(object["commands"] as? [[String: Any]])
        XCTAssertEqual(commands.map { $0["command"] as? String }, ["look", "north", "north"])
        XCTAssertEqual(commands.first?["boot"] as? Bool, true)
    }

    /// The composite view state's model segments (Phase 5 sidecar shape).
    private func sidecarSegments(_ object: [String: Any]) throws -> [[String: Any]] {
        let state = try XCTUnwrap(object["viewState"] as? [String: Any])
        let modelSnap = try XCTUnwrap(state["model"] as? [String: Any])
        return try XCTUnwrap(modelSnap["segments"] as? [[String: Any]])
    }

    private func waitForSidecarSegments() async throws {
        for _ in 0..<100 {
            if let object = try? sidecarJSON(),
               let segments = try? sidecarSegments(object),
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

    /// Branch delete (David's ruling, 2026-08-09), end to end: the chip's ✕
    /// (armed, then confirmed) removes the branch — its FILE leaves the disk,
    /// the chip row goes (last sibling → the fork point dissolves and the
    /// auto-split prefix folds back into one transcript), and because the
    /// deleted branch was the VIEWED lineage, the surviving main line replays
    /// live: its cards return and typing continues it.
    func testChipDeleteRemovesTheBranchItsFileAndReplaysTheParent() async throws {
        try await playAndRangeThreeTurns()
        try await clickAction(2, "Branch…")
        try await commitActionPrompt(2, "east")
        try await waitFor("""
        (function () {
          var card = document.querySelector('[data-ts-ordinal="7"] .ts-prose');
          return !!card && card.textContent.indexOf('Boiler Shed') !== -1;
        })()
        """, "the alternate's card from the live replay")
        let branchFile = transcriptOnDisk("gravel-drive-to-boiler-shed-1")
        for _ in 0..<100 {
            if FileManager.default.fileExists(atPath: branchFile.path) { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertTrue(FileManager.default.fileExists(atPath: branchFile.path),
                      "fixture sanity: the branch's transcript landed on disk")

        // Two acts: arm, then confirm on the same control.
        _ = try await surface.evaluateInSurface(
            "document.querySelector('.ts-branch-chip .ts-chip-delete').click();")
        _ = try await surface.evaluateInSurface(
            "document.querySelector('.ts-branch-chip .ts-chip-delete').click();")

        // The main line replays live (the deleted branch was viewed): turn 3
        // returns visibly, the chips are gone, the branch card is gone.
        try await waitFor("""
        (function () {
          var main = document.querySelector('[data-ts-ordinal="3"]');
          return !!main && main.style.display !== 'none' &&
                 document.querySelectorAll('.ts-branch-chip').length === 0 &&
                 !document.querySelector('[data-ts-ordinal="7"]');
        })()
        """, "the surviving main line after the delete")

        // The branch's file leaves the disk; the fold-back means ONE main
        // transcript file spans 1–3 again (the auto-split parent's file and
        // the tail's file reconcile into the merged range's single name).
        for _ in 0..<100 {
            if !FileManager.default.fileExists(atPath: branchFile.path) { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertFalse(FileManager.default.fileExists(atPath: branchFile.path),
                       "the deleted branch's transcript must leave the disk")
        try await waitForFileContaining(transcriptOnDisk("iron-gates-to-fountain-court-3"),
                                        "> north", "the folded-back main transcript")
        // The fold-back IS the restructure-rename path now (Split is gone):
        // the auto-split head and tail stems rename away into the merged name.
        for _ in 0..<100 {
            if !FileManager.default.fileExists(
                   atPath: transcriptOnDisk("iron-gates-to-gravel-drive-2").path),
               !FileManager.default.fileExists(
                   atPath: transcriptOnDisk("gravel-drive-to-fountain-court-1").path) { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertFalse(FileManager.default.fileExists(
                           atPath: transcriptOnDisk("iron-gates-to-gravel-drive-2").path),
                       "the auto-split head's stem renames away on fold-back")
        XCTAssertFalse(FileManager.default.fileExists(
                           atPath: transcriptOnDisk("gravel-drive-to-fountain-court-1").path),
                       "the auto-split tail's stem renames away on fold-back")
    }

    /// ⌘Z (David's ruling, 2026-08-09): authoring gestures undo, and the
    /// auto-save writer follows — a claim added then undone leaves the FILE
    /// on disk without it, because undo is a model change like any other.
    func testCommandZUndoesAClaimAndTheFileFollows() async throws {
        try await playAndRangeThreeTurns()
        let file = transcriptOnDisk("iron-gates-to-fountain-court-3")
        try await waitForFileContaining(file, "> north", "the ranged transcript")

        _ = try await surface.evaluateInSurface("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="2"] .ts-actions button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'Not contains…') { buttons[i].click(); return; }
          }
        })();
        """)
        _ = try await surface.evaluateInSurface("""
        (function () {
          var field = document.querySelector('[data-ts-ordinal="2"] .ts-actions input');
          field.value = 'a grue';
          field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        })();
        """)
        try await waitForFileContaining(file, "a grue", "the authored claim in the file")

        _ = try await surface.evaluateInSurface("""
        document.dispatchEvent(new KeyboardEvent('keydown',
          { key: 'z', metaKey: true, bubbles: true, cancelable: true }));
        """)
        for _ in 0..<100 {
            if let text = try? String(contentsOf: file, encoding: .utf8),
               !text.contains("a grue") { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        let text = try String(contentsOf: file, encoding: .utf8)
        XCTAssertFalse(text.contains("a grue"),
                       "the undone claim must leave the file on disk")
        XCTAssertTrue(text.contains("> north"), "the range itself survives the undo")
    }

    // MARK: - The auto-save writer (design §4; a range is a file from its
    // first tick — David's ruling 2026-08-09)

    func testTickingTheOpeningCreatesItsTranscriptImmediately() async throws {
        try await boot()
        // The very first click: tick the opening. The transcript must land in
        // tests/ right away — the range is a file from its first tick (the
        // click-through found no file was created at all).
        try await tick(0)
        // A transcript from the opening is named for it (David 2026-08-09):
        // opening-<first room>, stable as the recording grows.
        let file = transcriptOnDisk("opening-iron-gates")
        try await waitForFileContaining(file, "title: opening-iron-gates", "the opening's file")
        let text = try String(contentsOf: file, encoding: .utf8)
        XCTAssertTrue(text.contains("seed: 42"))
        XCTAssertTrue(text.contains("> look"), "the boot look is the range's first command")

        // Playing on grows the file under the SAME stem — no rename churn.
        try await type("north")
        try await waitForFileContaining(file, "> north", "the grown recording")
    }

    func testClosingARangeWritesItsTranscriptAndReopeningKeepsIt() async throws {
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

        // Reopening the range keeps the file — it is a recording again, still
        // on disk and still growing (David 2026-08-09: every click lands).
        try await tick(3)   // untick the end
        try await waitFor("""
        document.querySelector('[data-ts-ordinal="3"] .ts-pick input').checked === false
        """, "the end untick landing")
        XCTAssertTrue(FileManager.default.fileExists(atPath: file.path),
                      "a reopened range's file stays on disk")
    }

    func testGesturesAuthorClaimsIntoTheWrittenFile() async throws {
        try await boot()
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 3", "cards")
        try await tick(1)
        try await tick(2)   // closed 1–2 → iron-gates-to-gravel-drive-2
        let file = transcriptOnDisk("iron-gates-to-gravel-drive-2")

        // Exact gesture: the file gains [OK] + the literal block.
        _ = try await surface.evaluateInSurface("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="2"] .ts-actions button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'Exact') { buttons[i].click(); return; }
          }
        })();
        """)
        try await waitForFileContaining(file, "end text", "the Exact literal block")

        // State picker (D6): open on turn 2, pick the digest fact — the file
        // gains an evaluable [STATE:] line, picker-sourced by construction.
        _ = try await surface.evaluateInSurface("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="2"] .ts-actions button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'State…') { buttons[i].click(); return; }
          }
        })();
        """)
        try await waitFor("document.querySelectorAll('.ts-picker .ts-item').length > 0",
                         "state picker facts")
        _ = try await surface.evaluateInSurface(
            "document.querySelector('.ts-picker .ts-item').click();")
        try await waitForFileContaining(file, "tobias.location = gravel-drive",
                                        "the picked [STATE:] claim")
        // The source panel is retired (David, 2026-08-09: unnecessary once
        // seen in action) — claim REMOVAL has no surface affordance today;
        // the model's remove* mutators stay vitest-covered for when one lands.
        let text = try String(contentsOf: file, encoding: .utf8)
        XCTAssertTrue(text.contains("end text"), "the Exact block is in the file")
    }

    /// The card's assertion list (round 4, David: "list the assertions in
    /// each box"): with an `auto-assertion:` policy, every in-range turn's
    /// card lists its synthesized default lines — the same lines its
    /// transcript carries. (Without a policy — 6e's let-me-decide — a turn
    /// has no defaults and the card shows its [SKIP] placeholder instead.)
    func testAPolicyStoryListsDefaultAssertionLinesInTheCards() async throws {
        try await boot(policy: "room-name-and-description")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 3", "cards")
        try await tick(0)   // open range from the opening — grows over turn 2
        try await waitFor("""
        (function () {
          var lines = document.querySelectorAll('[data-ts-ordinal="2"] .ts-asserts .ts-assert-line');
          for (var i = 0; i < lines.length; i++) {
            if (lines[i].textContent.indexOf('Gravel Drive') !== -1) return true;
          }
          return false;
        })()
        """, "the policy default listed in the turn's card")
        // The OPENING card lists its own default — its first prose line (the
        // story banner's title in the real client; the fixture's prologue).
        try await waitFor("""
        (function () {
          var lines = document.querySelectorAll('[data-ts-ordinal="0"] .ts-asserts .ts-assert-line');
          for (var i = 0; i < lines.length; i++) {
            if (lines[i].textContent.indexOf('grinding away') !== -1) return true;
          }
          return false;
        })()
        """, "the opening card's default line")
        // And the file carries exactly what the cards show.
        let file = transcriptOnDisk("opening-iron-gates")
        try await waitForFileContaining(file, "Gravel Drive", "the turn default in the file")
        try await waitForFileContaining(file, "grinding away", "the opening default in the file")
    }

    /// The card's assertion list (round 4): the ✕ on a rendered line must
    /// reach all the way to the file — gesture → DeleteRef → model mutator →
    /// writer, the exact wiring the round added.
    func testAssertionDeleteInTheCardRemovesItFromTheFile() async throws {
        try await boot()
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 3", "cards")
        try await tick(1)
        try await tick(2)   // closed 1–2 → iron-gates-to-gravel-drive-2
        let file = transcriptOnDisk("iron-gates-to-gravel-drive-2")

        // Author Exact on turn 2 — the file gains the literal block and the
        // card lists the [OK] tag as a deletable assertion line.
        _ = try await surface.evaluateInSurface("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="2"] .ts-actions button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'Exact') { buttons[i].click(); return; }
          }
        })();
        """)
        try await waitForFileContaining(file, "end text", "the Exact literal block")
        try await waitFor("""
        document.querySelectorAll('[data-ts-ordinal="2"] .ts-asserts .ts-assert-delete').length > 0
        """, "the card's deletable assertion line")

        // Click its ✕: the assertion leaves the model AND the file — the
        // claimless turn demotes to [SKIP] (no policy in this fixture).
        _ = try await surface.evaluateInSurface("""
        document.querySelector('[data-ts-ordinal="2"] .ts-asserts .ts-assert-delete').click();
        """)
        for _ in 0..<100 {
            if let text = try? String(contentsOf: file, encoding: .utf8),
               !text.contains("end text") { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        let text = try String(contentsOf: file, encoding: .utf8)
        XCTAssertFalse(text.contains("end text"), "the deleted block must leave the file")
        XCTAssertTrue(text.contains("[SKIP]"), "the pruned turn demotes to [SKIP] in place")
    }

    private func waitForFileContaining(_ file: URL, _ fragment: String,
                                       _ what: String) async throws {
        for _ in 0..<100 {
            if let text = try? String(contentsOf: file, encoding: .utf8),
               text.contains(fragment) { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("timed out waiting for \(what) in \(file.lastPathComponent)")
    }

    // MARK: - AC-5: the D6 picker at a synthetic large-story digest

    func testStatePickerFiltersGroupsFoldsAndAutoExpandsAtScale() async throws {
        try await boot()
        // A synthetic large digest: the fixture's next turn carries 60 facts.
        _ = try await surface.evaluateInSurface("""
        (function () {
          var entities = [];
          for (var i = 0; i < 30; i++) {
            entities.push({ kind: 'npc', name: 'Guard ' + i, token: 'guard-' + i,
                            location: { name: 'Post ' + i, token: 'post-' + i } });
            entities.push({ kind: 'item', name: 'Relic ' + i, token: 'relic-' + i,
                            location: { name: 'Vault ' + i, token: 'vault-' + i } });
          }
          window.webkit.messageHandlers.turnEvents.postMessage(JSON.stringify({
            turn: 2, command: 'wait', output: 'Time passes.',
            captures: [{ channel: 'room-name', values: ['Iron Gates'] }],
            events: [], world: { entities: entities }, lineage: 1 }));
          var tc = document.getElementById('text-content');
          var p = document.createElement('p');
          p.textContent = 'Time passes.';
          p.setAttribute('data-turn', 2);
          tc.appendChild(p);
        })();
        """)
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 3", "cards")

        _ = try await surface.evaluateInSurface("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="2"] .ts-actions button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'State…') { buttons[i].click(); return; }
          }
        })();
        """)
        try await waitFor("document.querySelectorAll('.ts-picker .ts-item').length === 60",
                         "all 60 facts flat")

        // Filter narrows the one list.
        _ = try await surface.evaluateInSurface("""
        (function () {
          var filter = document.querySelector('.ts-picker-filter');
          filter.value = 'relic 7';
          filter.dispatchEvent(new Event('input'));
        })();
        """)
        try await waitFor("document.querySelectorAll('.ts-picker .ts-item').length === 1",
                         "filter narrows to the one hit")

        // Grouped folds the SAME list into kind sections; folding hides rows.
        _ = try await surface.evaluateInSurface("""
        (function () {
          document.querySelector('.ts-picker-filter').value = '';
          document.querySelector('.ts-picker-filter').dispatchEvent(new Event('input'));
          document.querySelector('.ts-picker-group-toggle').click();
        })();
        """)
        try await waitFor("document.querySelectorAll('.ts-picker-section').length === 2",
                         "two kind sections")
        _ = try await surface.evaluateInSurface(
            "document.querySelector('.ts-picker-section').click();")
        try await waitFor("document.querySelectorAll('.ts-picker .ts-item').length === 30",
                         "a folded section hides its rows")

        // A live filter auto-expands every fold — a hit never hides (D6).
        _ = try await surface.evaluateInSurface("""
        (function () {
          var filter = document.querySelector('.ts-picker-filter');
          filter.value = 'guard 3';
          filter.dispatchEvent(new Event('input'));
        })();
        """)
        try await waitFor("""
        (function () {
          var items = document.querySelectorAll('.ts-picker .ts-item');
          for (var i = 0; i < items.length; i++) {
            if (items[i].textContent.indexOf('Guard 3 —') !== -1) return true;
          }
          return false;
        })()
        """, "the folded group's hit is visible under a live filter")
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

    /// David's acceptance (2026-08-09): untick everything (the writer removes
    /// the files) and the Testing tab reopens fresh — the opening and the
    /// boot look, no replayed commands. Unticked play is ephemeral.
    func testUntickingEverythingReopensAFreshSession() async throws {
        try await boot()
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4", "4 cards")
        try await tick(2)
        try await tick(3)   // closed 2–3, written to tests/
        try await waitForSidecarSegments()

        try await tick(3)   // untick the end — the range reopens
        try await tick(2)   // untick the start — the range (and its file) go
        try await waitFor("""
        document.querySelectorAll('#ts-cards .ts-turn .ts-title-strip').length ===
          Array.from(document.querySelectorAll('#ts-cards .ts-turn .ts-title-strip'))
            .filter(function (s) { return s.style.display === 'none'; }).length
        """, "no named range left")
        // The sidecar's persisted session trims to the suite: no segments,
        // no commands to replay.
        for _ in 0..<100 {
            if let object = try? sidecarJSON(),
               let state = object["viewState"] as? [String: Any],
               let modelSnap = state["model"] as? [String: Any],
               (modelSnap["segments"] as? [[String: Any]])?.isEmpty == true,
               let lineages = modelSnap["lineages"] as? [[String: Any]],
               (lineages.first?["turns"] as? [[String: Any]])?.isEmpty == true { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertFalse(FileManager.default.fileExists(
            atPath: transcriptOnDisk("iron-gates-to-fountain-court-2").path),
            "unticking removed the transcript from tests/")

        // Reopen: nothing replays — the tab is the opening and the boot look.
        surface = nil
        try await boot()
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 2",
                         "a fresh session — opening + boot look only")
    }

    /// David's report (2026-08-09, "commands are still showing"): a sidecar
    /// written BEFORE the write-side trim — commands recorded, no segments —
    /// must not type them back in. Ruling 11 scopes the restore side too.
    func testAStaleSidecarWithUntickedCommandsReopensFresh() async throws {
        let stale: [String: Any] = [
            "version": TestingSessionStore.version,
            "commands": [
                ["command": "look", "boot": true],
                ["command": "north", "boot": false],
                ["command": "north", "boot": false],
            ],
            "viewState": [
                "model": [
                    "lineages": [[
                        "id": 1,
                        "turns": [
                            ["command": "look", "boot": true],
                            ["command": "north", "boot": false],
                            ["command": "north", "boot": false],
                        ],
                    ]],
                    "active": 1,
                    "segments": [] as [[String: Any]],
                    "skipped": [] as [[String: Any]],
                ],
                "stems": [:] as [String: String],
                "dialogs": [] as [[Any]],
            ],
        ]
        try JSONSerialization.data(withJSONObject: stale).write(to: sidecarURL)

        try await boot()
        // The restore holds the input while it replays; with nothing worth
        // replaying it releases immediately — and no replayed cards follow.
        try await waitFor("""
        document.getElementById('command-input') &&
        document.getElementById('command-input').disabled === false
        """, "the restore settling")
        try await Task.sleep(nanoseconds: 500_000_000)
        let count = try await surface.evaluateInSurface(
            "document.querySelectorAll('#ts-cards .ts-turn').length")
        XCTAssertEqual(count as? Int, 2,
                       "unticked commands in a stale sidecar must not replay — opening + boot look only")
    }

    /// Branch… stays available while recording (David 2026-08-09, "why did
    /// you remove branch?"): forking used to require a CLOSED range, and the
    /// growing-recording flow never closes one — a covered turn inside an
    /// open recording must offer the gesture.
    func testBranchButtonShowsInsideAnOpenRecording() async throws {
        try await boot()
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4", "cards")
        try await tick(0)   // open recording from the opening — never closed
        try await waitFor("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="2"] .ts-actions button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === 'Branch…' && buttons[i].style.display !== 'none') return true;
          }
          return false;
        })()
        """, "the Branch gesture on a mid-recording turn")
    }

    /// The files are the truth (David 2026-08-09): a transcript deleted by
    /// hand does not resurrect on reopen — its segment dissolves instead of
    /// being re-written from defaults.
    func testAHandDeletedTranscriptDoesNotResurrectOnReopen() async throws {
        try await boot()
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4", "4 cards")
        try await tick(2)
        try await tick(3)
        let file = transcriptOnDisk("iron-gates-to-fountain-court-2")
        for _ in 0..<100 {
            if FileManager.default.fileExists(atPath: file.path) { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        try await waitForSidecarSegments()

        // The author deletes the file in Finder, then reopens.
        try FileManager.default.removeItem(at: file)
        surface = nil
        try await boot()

        // The replay still plays the recorded turns, but the segment whose
        // file vanished is gone — no named range, and the file stays deleted.
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4",
                         "replayed cards")
        try await waitFor("""
        (function () {
          var strip = document.querySelector('[data-ts-ordinal="2"] .ts-title-strip');
          return !strip || strip.style.display === 'none';
        })()
        """, "the deleted transcript's range dissolved")
        // Settle: the writer must not have re-created the file from defaults.
        try await Task.sleep(nanoseconds: 500_000_000)
        XCTAssertFalse(FileManager.default.fileExists(atPath: file.path),
                       "a hand-deleted transcript must never resurrect")
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

        // The opening card (ordinal 0) carries the banner + prologue. On the
        // REAL client that prose flushes inside the boot look's bracket
        // (stamped with the boot ordinal) — the fixture's unstamped head
        // cannot regress this, so it is pinned here against the real page.
        let openingText = try await surface.evaluateInSurface(
            "(document.querySelector('[data-ts-ordinal=\"0\"]') || {textContent:''}).textContent"
        ) as? String
        XCTAssertTrue(openingText?.contains("The Folly at Fernhill") == true,
                      "the opening card must carry the banner title; got: \(openingText ?? "nil")")
        let bootText = try await surface.evaluateInSurface(
            "(document.querySelector('[data-ts-ordinal=\"1\"]') || {textContent:''}).textContent"
        ) as? String
        XCTAssertFalse(bootText?.contains("The Folly at Fernhill") == true,
                       "the banner must not also sit in the boot turn's card")

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

    // MARK: - Phase 5: branching, lineage stickiness, and dialog auto-drive

    /// Clicks a labelled button in a card's action row.
    private func clickAction(_ ordinal: Int, _ label: String) async throws {
        _ = try await surface.evaluateInSurface("""
        (function () {
          var buttons = document.querySelectorAll('[data-ts-ordinal="\(ordinal)"] .ts-actions button');
          for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === \(jsString(label))) { buttons[i].click(); return; }
          }
        })();
        """)
    }

    /// Commits text into the inline action-row prompt (Branch…'s input).
    private func commitActionPrompt(_ ordinal: Int, _ text: String) async throws {
        _ = try await surface.evaluateInSurface("""
        (function () {
          var input = document.querySelector('[data-ts-ordinal="\(ordinal)"] .ts-actions input');
          input.value = \(jsString(text));
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        })();
        """)
    }

    /// Plays north twice and ranges 1–3 closed — the branch tests' opening.
    private func playAndRangeThreeTurns() async throws {
        try await boot()
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 4", "cards")
        try await tick(1)
        try await tick(3)
    }

    func testBranchGestureForksReplaysAndLandsTheAlternate() async throws {
        try await playAndRangeThreeTurns()

        // Branch… FROM turn 2 (the alternate replaces turn 3 — the gesture
        // runs from the state the card shows, David 2026-08-09): the driver
        // restarts the client, replays the prefix suppressed, and types the
        // alternate live.
        try await clickAction(2, "Branch…")
        try await commitActionPrompt(2, "east")

        // The alternate lands as an ordinary feed turn (ordinal 7: ack and
        // replay consumed 4–6) — a visible branch card with real prose.
        try await waitFor("""
        (function () {
          var card = document.querySelector('[data-ts-ordinal="7"] .ts-prose');
          return !!card && card.textContent.indexOf('Boiler Shed') !== -1;
        })()
        """, "the alternate's card from the live replay")
        let meta = try await surface.evaluateInSurface(
            "document.querySelector('[data-ts-ordinal=\"7\"] .ts-meta').textContent")
        XCTAssertEqual(meta as? String, "turn 7 · branch")

        // Lineage stickiness: the main line's turn 3 hides while the branch
        // is viewed. The shared prefix stays EXPANDED (David 2026-08-09:
        // the cards before a fork remain fully visible) — its cards show,
        // named by the strip on its first card.
        let stuck = try await surface.evaluateInSurface("""
        (function () {
          var strip = document.querySelector('[data-ts-ordinal="1"] .ts-auto-name');
          return document.querySelector('[data-ts-ordinal="3"]').style.display === 'none' &&
                 document.querySelector('[data-ts-ordinal="1"]').style.display !== 'none' &&
                 document.querySelector('[data-ts-ordinal="2"]').style.display !== 'none' &&
                 !!strip && strip.textContent.indexOf('iron-gates-to-gravel-drive-2') !== -1;
        })()
        """)
        XCTAssertEqual(stuck as? Bool, true)

        // The chip row: main line first, then the sibling — sibling selected.
        try await waitFor("document.querySelectorAll('.ts-branch-chip').length === 2",
                         "two sibling chips")
        let chips = try await surface.evaluateInSurface("""
        (function () {
          var chips = document.querySelectorAll('.ts-branch-chip');
          return !chips[0].className.match('ts-chip-selected') &&
                 !!chips[1].className.match('ts-chip-selected') &&
                 chips[1].textContent.indexOf('gravel-drive-to-boiler-shed-1') !== -1;
        })()
        """)
        let chipsHTML = try await surface.evaluateInSurface(
            "document.querySelector('.ts-branch-row').outerHTML") as? String
        XCTAssertEqual(chips as? Bool, true, "chip row was: \(chipsHTML ?? "nil")")

        // The branch's transcript landed in tests/, continuing from the
        // auto-split prefix — the durable artifact of the fork.
        let file = transcriptOnDisk("gravel-drive-to-boiler-shed-1")
        try await waitForFileContaining(file, "> east", "the branch transcript")
        let text = try String(contentsOf: file, encoding: .utf8)
        XCTAssertTrue(text.contains("continues: iron-gates-to-gravel-drive-2"),
                      "the branch continues from the auto-split prefix")
    }

    func testChipSwitchMakesTheSiblingLiveAndTypingContinuesIt() async throws {
        try await playAndRangeThreeTurns()
        try await clickAction(2, "Branch…")
        try await commitActionPrompt(2, "east")
        // Wait for the branch replay to COMPLETE — the driver re-enables the
        // input when done (a chip click during a replay is deliberately
        // swallowed).
        try await waitFor("""
        (function () {
          var card = document.querySelector('[data-ts-ordinal="7"] .ts-prose');
          return !!card && card.textContent.indexOf('Boiler Shed') !== -1 &&
                 document.getElementById('command-input').disabled === false;
        })()
        """, "the branch replay finishing")

        // Click the MAIN chip: the driver replays the main lineage live and
        // the retained cards come back — nothing was deleted by viewing.
        _ = try await surface.evaluateInSurface(
            "document.querySelectorAll('.ts-branch-chip')[0].click();")
        try await waitFor("""
        document.querySelector('[data-ts-ordinal="3"]').style.display !== 'none' &&
        document.querySelector('[data-ts-ordinal="7"]').style.display === 'none'
        """, "the main lineage restored, the branch hidden")

        // Typing now continues the MAIN lineage — the viewed lineage is the
        // live one, so the new turn goes north from Fountain Court. (Wait
        // out the switch replay first: typing is held while it drives.)
        try await waitFor("document.getElementById('command-input').disabled === false",
                         "the switch replay finishing")
        try await type("north")
        try await waitFor("""
        (function () {
          var cards = document.querySelectorAll('#ts-cards .ts-turn:not(.ts-branch-point)');
          var last = cards[cards.length - 1];
          return !!last && last.style.display !== 'none' &&
                 last.textContent.indexOf('Entrance Hall') !== -1;
        })()
        """, "a fresh main-lineage turn after the switch")
    }

    func testReopenRestoresTheForkTreeAndAuthoredClaimsSurvive() async throws {
        try await playAndRangeThreeTurns()

        // An authored claim (Exact on turn 2) — it must survive the reopen.
        try await clickAction(2, "Exact")
        try await clickAction(2, "Branch…")
        try await commitActionPrompt(2, "east")
        try await waitFor("document.querySelectorAll('.ts-branch-chip').length === 2", "chips")
        let prefixFile = transcriptOnDisk("iron-gates-to-gravel-drive-2")
        try await waitForFileContaining(prefixFile, "end text", "the Exact block in the prefix file")
        let branchFile = transcriptOnDisk("gravel-drive-to-boiler-shed-1")
        try await waitForFileContaining(branchFile, "> east", "the branch file")
        let prefixBefore = try String(contentsOf: prefixFile, encoding: .utf8)

        // A fresh surface over the same sidecar: the whole fork tree
        // restores by replay — root, then the branch, active lineage last.
        surface = nil
        try await boot()
        try await waitFor("""
        (function () {
          var cards = document.querySelectorAll('#ts-cards .ts-turn:not(.ts-branch-point)');
          for (var i = 0; i < cards.length; i++) {
            if (cards[i].style.display !== 'none' &&
                cards[i].textContent.indexOf('Boiler Shed') !== -1) return true;
          }
          return false;
        })()
        """, "the branch's card restored by replay")
        try await waitFor("document.querySelectorAll('.ts-branch-chip').length === 2",
                         "the chip row restored")
        // The branch was active at close — it is active (and live) again.
        let selected = try await surface.evaluateInSurface("""
        !!document.querySelectorAll('.ts-branch-chip')[1].className.match('ts-chip-selected')
        """)
        XCTAssertEqual(selected as? Bool, true)

        // THE CLOBBER FIX: the prefix file still carries the authored Exact
        // block, byte for byte — reopening re-hydrated claims from the file
        // instead of rewriting it with policy defaults.
        try await Task.sleep(nanoseconds: 500_000_000)
        let prefixAfter = try String(contentsOf: prefixFile, encoding: .utf8)
        XCTAssertEqual(prefixAfter, prefixBefore,
                       "reopening must never rewrite authored claims away")
    }

    func testHandEditedFileDetachesFromAutoWritesUntilTheAuthorTakesItBack() async throws {
        // Two transcripts via the only boundary that still makes two: a fork.
        // Range 1–3, branch from card 2 — the auto-split prefix (1–2) and the
        // branch's own file land on disk (sequential ticks now EXTEND one
        // transcript, David 2026-08-09, so a fork is the two-file shape).
        try await playAndRangeThreeTurns()
        try await clickAction(2, "Branch…")
        try await commitActionPrompt(2, "east")
        let head = transcriptOnDisk("iron-gates-to-gravel-drive-2")
        let tail = transcriptOnDisk("gravel-drive-to-boiler-shed-1")
        try await waitForFileContaining(head, "> north", "the prefix file")
        try await waitForFileContaining(tail, "> east", "the branch file")
        try await waitForSidecarSegments()

        // Hand-edit the branch file BEYOND the claim grammar: an exact block
        // whose literal text compose can never regenerate from live source.
        let tailText = try String(contentsOf: tail, encoding: .utf8)
        let handEdited = tailText.replacingOccurrences(
            of: "[SKIP]", with: "[OK]\ntext\nA hand-written line no replay produces.\nend text")
        XCTAssertNotEqual(handEdited, tailText)
        try Data(handEdited.utf8).write(to: tail)

        // Reopen: the fork tree replays; the branch re-hydrates as DIVERGED
        // and detaches — a gesture on the PREFIX must not touch its file.
        surface = nil
        try await boot()
        try await waitFor("""
        (function () {
          var cards = document.querySelectorAll('#ts-cards .ts-turn:not(.ts-branch-point)');
          for (var i = 0; i < cards.length; i++) {
            if (cards[i].style.display !== 'none' &&
                cards[i].textContent.indexOf('Boiler Shed') !== -1) return true;
          }
          return false;
        })()
        """, "the branch's card restored by replay")
        try await clickAction(2, "Exact")
        try await waitForFileContaining(head, "end text", "the prefix rewritten by the gesture")
        let tailAfterOtherGesture = try String(contentsOf: tail, encoding: .utf8)
        XCTAssertEqual(tailAfterOtherGesture, handEdited,
                       "a diverged file is never auto-written by gestures elsewhere")

        // A gesture ON the detached branch takes it back: the writer owns
        // the file again and the hand edit is superseded. The branch card's
        // ordinal is replay-fresh — read it off the visible card.
        let branchOrdinal = try await surface.evaluateInSurface("""
        (function () {
          var cards = document.querySelectorAll('#ts-cards .ts-turn:not(.ts-branch-point)');
          for (var i = 0; i < cards.length; i++) {
            if (cards[i].style.display !== 'none' &&
                cards[i].textContent.indexOf('Boiler Shed') !== -1) {
              return Number(cards[i].getAttribute('data-ts-ordinal'));
            }
          }
          return -1;
        })()
        """) as? Int ?? -1
        XCTAssertGreaterThan(branchOrdinal, 0, "the branch card must be on the board")
        try await clickAction(branchOrdinal, "Exact")
        for _ in 0..<100 {
            if let text = try? String(contentsOf: tail, encoding: .utf8),
               text != handEdited { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        let tailTakenBack = try String(contentsOf: tail, encoding: .utf8)
        XCTAssertNotEqual(tailTakenBack, handEdited,
                          "a gesture on the segment re-attaches its file to the writer")
    }

    func testSaveDialogOutcomeRecordsAndAutoDrivesUnderReplay() async throws {
        try await boot()
        // The author saves interactively: the dialog opens, they name it.
        try await type("save")
        try await waitFor("document.getElementById('save-dialog').open === true", "save dialog")
        _ = try await surface.evaluateInSurface("""
        (function () {
          document.getElementById('save-name-input').value = 'before-the-gates';
          document.getElementById('save-confirm-btn').click();
        })();
        """)
        try await waitFor("""
        (function () {
          var card = document.querySelector('[data-ts-ordinal="2"] .ts-prose');
          return !!card && card.textContent.indexOf('Saved as before-the-gates') !== -1;
        })()
        """, "the interactive save turn")
        try await tick(1)
        try await tick(2)
        try await waitForSidecarSegments()

        // Reopen: the replayed `save` opens its dialog again — the driver
        // applies the RECORDED outcome, and the turn completes (D7: no
        // stall, and the save is re-made under its own name).
        surface = nil
        try await boot()
        try await waitFor("""
        (function () {
          var cards = document.querySelectorAll('#ts-cards .ts-turn');
          for (var i = 0; i < cards.length; i++) {
            if (cards[i].textContent.indexOf('Saved as before-the-gates') !== -1) return true;
          }
          return false;
        })()
        """, "the replayed save turn completed with the recorded name")
        let replayedName = try await surface.evaluateInSurface("window.fixtureLastSave")
        XCTAssertEqual(replayedName as? String, "before-the-gates",
                       "the recorded slot name drove the replayed dialog")
    }

    /// The phase's exit state on the REAL engine: a real branch replays
    /// deterministically and lands as ordinary feed turns; switching between
    /// siblings shows exactly one coherent lineage. Skips (never fakes) when
    /// fernhill's bundle isn't built.
    func testRealFernhillBranchReplaysOnTheRealEngine() async throws {
        let repoRoot = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let fernhill = repoRoot.appendingPathComponent(
            "branch-stories/fernhill/dist/web/fernhill", isDirectory: true)
        try XCTSkipUnless(
            FileManager.default.fileExists(
                atPath: fernhill.appendingPathComponent("index-testing.html").path),
            "fernhill's browser bundle (with the testing page) is not built")

        surface = TestingSurfaceViewController(
            sessionStore: TestingSessionStore(fileURL: sidecarURL))
        _ = surface.view
        surface.testsDirectory = tmp.appendingPathComponent("tests", isDirectory: true)
        surface.load(bundleDirectory: fernhill)

        // Real boot, then three real norths: Gates → Drive → Court → Hall.
        for _ in 0..<300 {
            if let n = try? await surface.evaluateInSurface(
                "document.querySelectorAll('#ts-cards .ts-turn').length"),
               (n as? Int ?? 0) >= 2 { break }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        try await type("north")
        try await type("north")
        try await type("north")
        try await waitFor("""
        (function () {
          var card = document.querySelector('[data-ts-ordinal="4"] .ts-prose');
          return !!card && card.textContent.indexOf('Entrance Hall') !== -1;
        })()
        """, "the real walk reaching the Entrance Hall")
        try await tick(1)
        try await tick(4)

        // Branch… FROM turn 3 (the card whose state the alternate runs
        // from): the player stood in the Fountain Court, and fernhill's real
        // map goes east to the Boiler Shed. The
        // driver restarts the REAL engine (confirm stubbed), replays the two
        // norths, and plays the alternate live.
        try await clickAction(3, "Branch…")
        try await commitActionPrompt(3, "east")
        var landed = false
        for _ in 0..<300 {
            if let ok = try? await surface.evaluateInSurface("""
            (function () {
              var cards = document.querySelectorAll('#ts-cards .ts-turn:not(.ts-branch-point)');
              for (var i = 0; i < cards.length; i++) {
                if (cards[i].style.display !== 'none' &&
                    cards[i].textContent.indexOf('Boiler Shed') !== -1) return true;
              }
              return false;
            })()
            """), ok as? Bool == true { landed = true; break }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        XCTAssertTrue(landed, "the real branch's alternate must land as an ordinary feed turn")

        // Exactly one coherent lineage: main's turn 4 is hidden, the shared
        // prefix's cards stay expanded and visible (David 2026-08-09), and
        // the chip row names both siblings.
        let coherent = try await surface.evaluateInSurface("""
        (function () {
          return document.querySelector('[data-ts-ordinal="4"]').style.display === 'none' &&
                 document.querySelector('[data-ts-ordinal="2"]').style.display !== 'none' &&
                 document.querySelector('[data-ts-ordinal="3"]').style.display !== 'none' &&
                 document.querySelectorAll('.ts-branch-chip').length === 2;
        })()
        """)
        XCTAssertEqual(coherent as? Bool, true)

        // Switch back to the main line: the driver replays it live and the
        // column shows the other coherent lineage. (The branch drive must
        // finish first — a chip click during a replay is swallowed.)
        try await waitFor("document.getElementById('command-input').disabled === false",
                         "the branch replay finishing")
        _ = try await surface.evaluateInSurface(
            "document.querySelectorAll('.ts-branch-chip')[0].click();")
        var restored = false
        for _ in 0..<300 {
            if let ok = try? await surface.evaluateInSurface("""
            document.querySelector('[data-ts-ordinal="4"]').style.display !== 'none'
            """), ok as? Bool == true { restored = true; break }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        XCTAssertTrue(restored, "switching back must restore the main lineage's cards")
    }

    // MARK: - Phase 6 — the run column (design §7)

    /// The Run button, end to end and real-path: a click in the page posts
    /// over the bridge, Swift spawns the REAL `sharpee test --tree --json`
    /// over a real story project, the NDJSON stream relays back into the
    /// page, and the column fills — a PASS row, a FAIL row carrying the
    /// first failure on one line (the wire's new `failure` message), and
    /// the tally. The failing transcript also proves the run reads the
    /// files on DISK, not the session (no play happened in this session).
    func testRunButtonRunsTheRealTreeAndTheColumnFillsWithRowsAndTally() async throws {
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "devkit CLI not built — run `./repokit build`")
        let story = """
        story
          title: Mini
          authors: T
          id: mini
          story-version: 0.0.1
          ifid: CF7091CC-6182-43A4-8FE0-516273849FA0

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
        try Data(story.utf8).write(to: tmp.appendingPathComponent("mini.story"))
        let testsDir = tmp.appendingPathComponent("tests", isDirectory: true)
        try FileManager.default.createDirectory(at: testsDir, withIntermediateDirectories: true)
        try Data("""
        title: den
        ---

        > look
        [OK: contains "square den"]

        """.utf8).write(to: testsDir.appendingPathComponent("den.transcript"))
        try Data("""
        title: lamp
        continues: den
        ---

        > take lamp
        [OK: contains "no such text anywhere"]

        """.utf8).write(to: testsDir.appendingPathComponent("den-take-lamp-1.transcript"))

        try await boot()
        surface.storyFile = tmp.appendingPathComponent("mini.story")
        // A temp-dir story resolves no workspace shim and no PATH install —
        // inject the repo's real CLI, exactly as the tab's real-path suite
        // drives the same TestRunner.
        surface.sharpeeExecutableOverride = TestToolchain.devkitCLI

        _ = try await surface.evaluateInSurface(
            "document.getElementById('ts-run-btn').click();")

        // A real compile + tree run: generous, like the tab's real-CLI waits.
        for _ in 0..<1200 {
            if let done = try? await surface.evaluateInSurface(
                "!!document.querySelector('.ts-run-tally')"), done as? Bool == true { break }
            try await Task.sleep(nanoseconds: 100_000_000)
        }

        let tally = try await surface.evaluateInSurface(
            "(document.querySelector('.ts-run-tally') || {}).textContent || ''") as? String
        XCTAssertEqual(tally, "1 passing, 1 failures",
                       "the tree ran both files: den passed, den-take-lamp-1 failed")

        let rows = try await surface.evaluateInSurface("""
        Array.from(document.querySelectorAll('.ts-run-row')).map(function (row) {
          return row.querySelector('.ts-badge').textContent + '|' +
                 row.querySelector('.ts-name').textContent + '|' +
                 row.querySelector('.ts-why').textContent;
        }).join('\\n')
        """) as? String
        let lines = (rows ?? "").split(separator: "\n").map(String.init)
        XCTAssertEqual(lines.count, 2, "one row per transcript, branches included; got: \(rows ?? "")")
        XCTAssertEqual(lines.first, "PASS|den|1 turn")
        XCTAssertTrue(lines.last?.hasPrefix("FAIL|den-take-lamp-1|turn ") == true,
                      "the FAIL row leads with the failing turn; got: \(lines.last ?? "")")
        XCTAssertTrue(lines.last?.contains("does not contain \"no such text anywhere\"") == true,
                      "the first failure rides the row, verbatim from the runner; got: \(lines.last ?? "")")

        let buttonLabel = try await surface.evaluateInSurface(
            "document.getElementById('ts-run-btn').textContent") as? String
        XCTAssertEqual(buttonLabel, "Run", "the button re-arms when the run ends")
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
