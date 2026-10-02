// TestingSurfaceRealPathTests.swift
// The testing play surface, live (ADR-307): a real WKWebView boots a fixture
// testing page over the pane's real scheme handler, with the REAL committed
// surface bundle (Resources/testing-surface) injected over it. The fixture
// plays the browser client's part — `data-turn`-stamped elements, a
// `#command-input` that renders turns on Enter, feed records over the real
// `turnEvents` bridge — so these tests pin the actual seams: asset
// injection, record forwarding, card building, ALWAYS-RECORDING into the
// test tree (the `<story-id>.tests/` directory of segments — ADR-355;
// ADR-307 D1/D3), the opening
// defaults from real boot captures (open question D), branching as document
// structure (D2/D5), tail-cut (D4/Q-4), the author restart as a whole-tree
// replay, reopen-restores-to-an-identical-board (AC-1 through the real
// driver), refused/malformed document handling (AC-4), and the run column
// over the real CLI's document path. No stubs of anything the repo owns:
// the page, the bridges, the surface bundle, the sidecar store, and the
// document writer are the production ones.
// Owner context: tools/ide — Tests.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class TestingSurfaceRealPathTests: XCTestCase {

    private var tmp: URL!
    private var bundleDir: URL!
    private var sidecarURL: URL!
    private var documentURL: URL!
    private var surface: TestingSurfaceViewController!

    /// The client's part, in fixture form: an opening (unstamped), a boot
    /// look whose record carries the boot-flush captures (prologue + info —
    /// the opening defaults' carriers, exactly as the real client's first
    /// turn does), and a room graph walked by typed commands — each turn
    /// stamped into the DOM and posted over the feed exactly as
    /// `BrowserClient` does. A typed `restart` behind confirm() replays the
    /// real client's sequence (ack turn → fence → fresh boot look); a typed
    /// `save` opens a real `<dialog>` that resolves the turn only on close.
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
      function post(o) {
        try { window.webkit.messageHandlers.turnEvents.postMessage(JSON.stringify(o)); } catch (e) {}
      }
      function renderTurn(command, echo, output, boot) {
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
        var captures = [{ channel: 'room-name', values: [current] }];
        if (boot) {
          // The boot flush rides the boot look's record (the real client's
          // shape): the opening defaults read these captures.
          captures.push({ channel: 'prologue',
                          values: ['The cab is already grinding away down the lane.'] });
          captures.push({ channel: 'info',
                          values: [{ title: 'Probe', description: 'A fixture estate.' }] });
        }
        post({ turn: n, command: command,
               output: current + '\\n' + bodyText,
               captures: captures,
               events: ['if.event.actor_moved'],
               world: { entities: [{ kind: 'npc', name: 'Tobias', token: 'tobias',
                                     location: { name: current, token: token } }] },
               lineage: 1 });
      }
      function bootLook() { renderTurn('look', false, null, true); }
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
          post({ restart: true, turn: n + 1, lineage: 1 });
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
        documentURL = tmp.appendingPathComponent("probe.tests", isDirectory: true)
    }

    override func tearDownWithError() throws {
        surface = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        try super.tearDownWithError()
    }

    private func boot(policy: String? = nil,
                      regions: [String: String] = [:]) async throws {
        surface = TestingSurfaceViewController(
            sessionStore: TestingSessionStore(fileURL: sidecarURL))
        _ = surface.view
        surface.testTreeURL = documentURL
        surface.policy = policy
        surface.regionByRoom = regions
        surface.load(bundleDirectory: bundleDir)
        try await waitFor("window.bootProbeReady === true", "fixture boot")
    }

    /// Polls until `probe` evaluates true, failing after 8s.
    private func waitFor(_ probe: String, _ what: String) async throws {
        for _ in 0..<160 {
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

    /// The tree on disk, assembled into its nested shape — the manifest's
    /// fields plus `id` and `cards`, each fork card carrying `branches` of
    /// `{id, cards}` and its continuation's cards appended after it
    /// (ADR-355 D2-D5) — so assertions read the structure, not the file
    /// split. Fails when the directory is absent or any file is malformed.
    /// The shared reader's full validation is branch-tester's to test; this
    /// only links what the writer wrote.
    private func documentJSON() throws -> [String: Any] {
        let names = try FileManager.default.contentsOfDirectory(atPath: documentURL.path)
            .filter { !$0.hasPrefix(".") }
        var manifest: [String: Any] = [:]
        var segments: [String: [String: Any]] = [:]
        for name in names {
            let data = try Data(contentsOf: documentURL.appendingPathComponent(name))
            let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any], name)
            if name == "manifest.json" { manifest = object } else { segments[try XCTUnwrap(object["id"] as? String)] = object }
        }
        let root = try XCTUnwrap(segments.values.first { $0["parent"] == nil }, "a root segment")
        func build(_ segment: [String: Any]) -> [[String: Any]] {
            var cards = (segment["cards"] as? [[String: Any]]) ?? []
            let id = segment["id"] as? String
            let children = segments.values
                .filter { $0["parent"] as? String == id }
                .sorted { ($0["ordinal"] as? Int ?? 0) < ($1["ordinal"] as? Int ?? 0) }
            guard !children.isEmpty, !cards.isEmpty else { return cards }
            let branches = children.filter { ($0["ordinal"] as? Int ?? 0) > 0 }
            cards[cards.count - 1]["branches"] = branches.map { ["id": $0["id"] as Any, "cards": build($0)] }
            if let continuation = children.first(where: { ($0["ordinal"] as? Int) == 0 }) {
                cards.append(contentsOf: build(continuation))
            }
            return cards
        }
        var object = manifest
        object["id"] = root["id"]
        object["cards"] = build(root)
        return object
    }

    /// Every tree file's bytes by name — for "the tree did not change" checks.
    private func treeFileBytes() throws -> [String: Data] {
        var files: [String: Data] = [:]
        for name in try FileManager.default.contentsOfDirectory(atPath: documentURL.path) where !name.hasPrefix(".") {
            files[name] = try Data(contentsOf: documentURL.appendingPathComponent(name))
        }
        return files
    }

    /// Seeds the tree directory with exactly these files, as a prior session left them.
    private func writeTree(_ files: [String: String]) throws {
        try FileManager.default.createDirectory(at: documentURL, withIntermediateDirectories: true)
        for (name, text) in files {
            try Data(text.utf8).write(to: documentURL.appendingPathComponent(name))
        }
    }

    /// A one-segment tree's root file: the opening and the boot look.
    private static let rootSegment =
        #"{"cards": [{"id": "card0001", "type": "opening"}, {"id": "card0002", "type": "boot"}], "id": "root0000"}"#

    /// Every tree file's bytes together — for "the tree never says" checks.
    private func treeText() throws -> String {
        try FileManager.default.contentsOfDirectory(atPath: documentURL.path)
            .filter { !$0.hasPrefix(".") }
            .map { try String(contentsOf: documentURL.appendingPathComponent($0), encoding: .utf8) }
            .joined(separator: "\n")
    }

    private func documentCards() throws -> [[String: Any]] {
        try XCTUnwrap(try documentJSON()["cards"] as? [[String: Any]])
    }

    /// Polls until the document on disk satisfies `check`.
    private func waitForDocument(_ what: String,
                                 _ check: ([String: Any]) -> Bool) async throws {
        for _ in 0..<160 {
            if let object = try? documentJSON(), check(object) { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("timed out waiting for the document: \(what)")
    }

    /// Waits for the replay driver to release the input.
    private func waitForIdleInput() async throws {
        try await waitFor("""
        document.getElementById('command-input') &&
        document.getElementById('command-input').disabled === false
        """, "the driver releasing the input")
    }

    /// Boot + two norths — four cards (0, 1, 2, 3), the standard opening.
    private func playThreeTurns() async throws {
        try await boot()
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn:not(.ts-branch-point)').length === 4",
                         "4 cards")
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

    // MARK: - Always recording (D1/D3): the document IS the write target

    func testAlwaysRecordingWritesTheDocumentAndNothingElse() async throws {
        try await playThreeTurns()
        // Every played turn landed in the `<story-id>.tests/` tree — no tick,
        // no gesture, no `tests/` directory.
        try await waitForDocument("the played session") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            return cards.count == 4
        }
        let object = try documentJSON()
        XCTAssertEqual(object["version"] as? Int, 3, "the current tree version, the segmented format (ADR-355)")
        let rootId = try XCTUnwrap(object["id"] as? String)
        XCTAssertNotNil(rootId.range(of: "^[a-z0-9]{8}$", options: .regularExpression),
                        "the root segment carries an opaque 8-character id (ADR-355 D5)")
        XCTAssertTrue(FileManager.default.fileExists(
            atPath: documentURL.appendingPathComponent("\(rootId).json").path),
            "the main line's segment is its own file, named by its id")
        XCTAssertEqual(object["story"] as? String, "probe")
        XCTAssertEqual(object["seed"] as? Int, 42)
        let cards = try documentCards()
        XCTAssertEqual(cards.map { $0["type"] as? String },
                       ["opening", "boot", "turn", "turn"])
        XCTAssertEqual(cards.map { $0["command"] as? String },
                       [nil, nil, "north", "north"])
        XCTAssertFalse(FileManager.default.fileExists(
            atPath: tmp.appendingPathComponent("tests").path),
            "no tests/ directory is created — the document is the one artifact (AC-5's shape)")
    }

    // MARK: - The opening claims (open question D), RECORDED from real boot
    // captures into the document (David 2026-08-10: JSON = source of truth)

    func testOpeningClaimsRecordIntoTheDocumentAndDeletePlainly() async throws {
        try await boot(policy: "room-name-and-description")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 2", "cards")
        // The opening card lists prologue, title, description — synthesized
        // from the boot record's captures at RECORD time and PERSISTED into
        // the opening card (the JSON is the source of truth).
        try await waitFor("""
        (function () {
          var lines = document.querySelectorAll('[data-ts-ordinal="0"] .ts-asserts .ts-assert-line');
          if (lines.length !== 3) return false;
          return lines[0].textContent.indexOf('prologue') !== -1 &&
                 lines[1].textContent.indexOf('info.title is "Probe"') !== -1 &&
                 lines[2].textContent.indexOf('info.description') !== -1;
        })()
        """, "the opening card's three recorded claim lines")
        try await waitForDocument("the recorded opening claims") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            guard let assertions = cards.first?["assertions"] as? [String: Any],
                  let channels = assertions["channels"] as? [[String: Any]] else { return false }
            return channels.map { $0["id"] as? String }
                == ["prologue", "info.title", "info.description"]
        }

        // Deleting one is plain removal on the document — no narrowing
        // machinery, no noDefaults flag, the survivors simply remain.
        _ = try await surface.evaluateInSurface("""
        document.querySelector('[data-ts-ordinal="0"] .ts-asserts .ts-assert-line .ts-assert-delete').click();
        """)
        try await waitForDocument("the pruned opening claims") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            guard let assertions = cards.first?["assertions"] as? [String: Any],
                  let channels = assertions["channels"] as? [[String: Any]] else { return false }
            return assertions["noDefaults"] == nil
                && channels.map { $0["id"] as? String } == ["info.title", "info.description"]
        }
    }

    // MARK: - Assertion gestures author into the document; ⌘Z follows

    func testGesturesAuthorClaimsIntoTheDocumentAndUndoFollows() async throws {
        try await playThreeTurns()
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
        try await waitForDocument("the authored claim") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            let assertions = cards.count > 2 ? cards[2]["assertions"] as? [String: Any] : nil
            return (assertions?["notContains"] as? [String]) == ["a grue"]
        }

        // ⌘Z: the authored claim leaves the model AND the document — while
        // the card's RECORDED claims (persisted at play, David 2026-08-10)
        // stay exactly as recording wrote them.
        _ = try await surface.evaluateInSurface("""
        document.dispatchEvent(new KeyboardEvent('keydown',
          { key: 'z', metaKey: true, bubbles: true, cancelable: true }));
        """)
        try await waitForDocument("the undone claim gone, the recorded claims kept") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            guard cards.count > 2,
                  let assertions = cards[2]["assertions"] as? [String: Any] else { return false }
            return assertions["notContains"] == nil
                && (assertions["contains"] as? [String])?.isEmpty == false
        }
    }

    // MARK: - Branching (D2/D5): structure in the document, replay live

    func testBranchGestureForksReplaysAndRecordsTheStructure() async throws {
        try await playThreeTurns()

        // Branch… ON turn 2 (try a different command FROM its state): the
        // driver restarts the client, replays the prefix suppressed, and
        // types the alternate live — it lands as an ordinary feed turn.
        try await clickAction(2, "Branch…")
        try await commitActionPrompt(2, "east")
        try await waitFor("""
        (function () {
          var cards = document.querySelectorAll('#ts-cards .ts-turn:not(.ts-branch-point)');
          for (var i = 0; i < cards.length; i++) {
            if (cards[i].style.display !== 'none' &&
                cards[i].textContent.indexOf('Boiler Shed') !== -1) return true;
          }
          return false;
        })()
        """, "the alternate's card from the live replay")

        // The document gained the branch ON the fork card (D2) — the
        // alternative's own cards inside it, nothing renamed, nothing moved.
        try await waitForDocument("the branch structure") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            guard cards.count > 2,
                  let branches = cards[2]["branches"] as? [[String: Any]],
                  let branchCards = branches.first?["cards"] as? [[String: Any]] else { return false }
            return branchCards.map { $0["command"] as? String } == ["east"]
        }

        // The lineage cut: main's turn 3 hides while the branch is viewed;
        // the shared prefix stays visible. The chip row derives its labels
        // (Q-8) — nothing persisted.
        try await waitFor("""
        (function () {
          var main = document.querySelector('[data-ts-ordinal="3"]');
          var chips = document.querySelectorAll('.ts-branch-chip');
          if (!main || main.style.display !== 'none' || chips.length !== 2) return false;
          return chips[0].textContent.indexOf('opening-iron-gates') !== -1 &&
                 chips[1].textContent.indexOf('gravel-drive · east') !== -1 &&
                 !!chips[1].className.match('ts-chip-selected');
        })()
        """, "the lineage cut and the derived chip labels")
    }

    func testChipDeleteRemovesTheBranchFromTheDocumentAndReplaysTheParent() async throws {
        try await playThreeTurns()
        try await clickAction(2, "Branch…")
        try await commitActionPrompt(2, "east")
        try await waitFor("document.querySelectorAll('.ts-branch-chip').length === 2", "chips")
        try await waitForIdleInput()

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
                 document.querySelectorAll('.ts-branch-chip').length === 0;
        })()
        """, "the surviving main line after the delete")
        // And the branch left the DOCUMENT — no branches key anywhere.
        try await waitForDocument("the branch gone") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            return cards.count == 4 && cards.allSatisfy { $0["branches"] == nil }
        }
    }

    func testSelectingABranchTwiceRebindsItsCardsInsteadOfDoublingThem() async throws {
        try await playThreeTurns()
        try await clickAction(2, "Branch…")
        try await commitActionPrompt(2, "east")
        try await waitFor("document.querySelectorAll('.ts-branch-chip').length === 2", "chips")
        try await waitForIdleInput()

        // Back to the main line, then the branch again — each a driver boot
        // that types the visited line's own commands live (GH #541).
        _ = try await surface.evaluateInSurface(
            "document.querySelectorAll('.ts-branch-chip')[0].click();")
        try await waitFor("!document.querySelectorAll('.ts-branch-chip')[1].className.match('ts-chip-selected')",
                         "the main line selected")
        try await waitForIdleInput()
        _ = try await surface.evaluateInSurface(
            "document.querySelectorAll('.ts-branch-chip')[1].click();")
        try await waitFor("!!document.querySelectorAll('.ts-branch-chip')[1].className.match('ts-chip-selected')",
                         "the branch selected again")
        try await waitForIdleInput()
        try await Task.sleep(nanoseconds: 500_000_000)

        // The DOCUMENT holds the branch's command once …
        let cards = try documentCards()
        let branches = try XCTUnwrap(cards[2]["branches"] as? [[String: Any]])
        let branchCards = try XCTUnwrap(branches.first?["cards"] as? [[String: Any]])
        XCTAssertEqual(branchCards.map { $0["command"] as? String }, ["east"])
        // … and the board shows the alternate's card once, not twice.
        let shown = try await surface.evaluateInSurface("""
        (function () {
          var cards = document.querySelectorAll('#ts-cards .ts-turn:not(.ts-branch-point)');
          var n = 0;
          for (var i = 0; i < cards.length; i++) {
            if (cards[i].style.display !== 'none' &&
                cards[i].textContent.indexOf('Boiler Shed') !== -1) n += 1;
          }
          return n;
        })()
        """)
        XCTAssertEqual(shown as? Int, 1)
    }

    // MARK: - Tail-cut (D4/Q-4): the card's ✕, armed then confirmed

    func testTailCutDiscardsTheTailFromBoardAndDocument() async throws {
        try await playThreeTurns()
        // Arm, then confirm the card ✕ on turn 2: it and turn 3 go.
        _ = try await surface.evaluateInSurface(
            "document.querySelector('[data-ts-ordinal=\"2\"] .ts-card-delete').click();")
        _ = try await surface.evaluateInSurface(
            "document.querySelector('[data-ts-ordinal=\"2\"] .ts-card-delete').click();")
        try await waitFor("""
        !document.querySelector('[data-ts-ordinal="2"]') &&
        !document.querySelector('[data-ts-ordinal="3"]') &&
        document.querySelectorAll('#ts-cards .ts-turn').length === 2
        """, "the tail leaving the board")
        try await waitForDocument("the tail leaving the document") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            return cards.map { $0["type"] as? String } == ["opening", "boot"]
        }
        // The realign replay released the input — the session continues.
        try await waitForIdleInput()
        try await type("north")
        try await waitForDocument("play continuing after the cut") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            return cards.count == 3 && cards[2]["command"] as? String == "north"
        }
    }

    // MARK: - Region grouping (David 2026-08-10): derived groups, collapsible

    func testRegionGroupsRenderCollapseAndPersistViewState() async throws {
        // Fixture rooms mapped: Iron Gates + Gravel Drive → Grounds,
        // Fountain Court → Court. Boot + two norths = cards 0..3, walking
        // Grounds → Grounds → Court; the opening (no room) inherits Grounds.
        try await boot(regions: ["Iron Gates": "Grounds",
                                 "Gravel Drive": "Grounds",
                                 "Fountain Court": "Court"])
        try await type("north")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn:not(.ts-branch-point)').length === 4",
                         "4 cards")

        // Two group headers in play order, named by region alone.
        try await waitFor("""
        (function () {
          var headers = document.querySelectorAll('.ts-region-header');
          return headers.length === 2 &&
                 headers[0].textContent.indexOf('Grounds') !== -1 &&
                 headers[1].textContent.indexOf('Court') !== -1;
        })()
        """, "the two region headers")

        // Collapse Grounds: its three cards hide; the header stays.
        _ = try await surface.evaluateInSurface(
            "document.querySelectorAll('.ts-region-header')[0].click();")
        try await waitFor("""
        (function () {
          function hidden(n) {
            var el = document.querySelector('[data-ts-ordinal="' + n + '"]');
            return !!el && el.style.display === 'none';
          }
          var last = document.querySelector('[data-ts-ordinal="3"]');
          return hidden(0) && hidden(1) && hidden(2) &&
                 !!last && last.style.display !== 'none';
        })()
        """, "the collapsed Grounds cards, Court untouched")

        // Collapse state is view-state ephemera (D7): the sidecar carries
        // the group key — never the document.
        for _ in 0..<160 {
            if let data = try? Data(contentsOf: sidecarURL),
               let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
               let view = object["view"] as? [String: Any],
               (view["collapsed"] as? [String]) == ["Grounds#0"] { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        let data = try Data(contentsOf: sidecarURL)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let view = try XCTUnwrap(object["view"] as? [String: Any])
        XCTAssertEqual(view["collapsed"] as? [String], ["Grounds#0"])
        let documentText = try treeText()
        XCTAssertFalse(documentText.contains("Grounds"),
                       "regions and collapse never touch the document — derived + ephemera only")

        // Expand again: the cards return.
        _ = try await surface.evaluateInSurface(
            "document.querySelectorAll('.ts-region-header')[0].click();")
        try await waitFor("""
        document.querySelector('[data-ts-ordinal="1"]').style.display !== 'none'
        """, "the expanded Grounds cards")

        // The LAST group is the play point — collapsing it is refused
        // visually: its cards stay, its header stays open (▾).
        _ = try await surface.evaluateInSurface(
            "document.querySelectorAll('.ts-region-header')[1].click();")
        try await waitFor("""
        (function () {
          var last = document.querySelector('[data-ts-ordinal="3"]');
          var header = document.querySelectorAll('.ts-region-header')[1];
          return !!last && last.style.display !== 'none' &&
                 header.textContent.indexOf('▾') === 0;
        })()
        """, "the play-point group staying open")
    }

    // MARK: - The author restart replays the tree (D4)

    func testAuthorRestartReplaysTheTreeAndStripsTheAckTurn() async throws {
        try await playThreeTurns()
        let before = try treeFileBytes()

        try await type("restart")
        // The board clears, then the tree replays through the client's real
        // input: four cards again (fresh ordinals), same document.
        try await waitFor("""
        (function () {
          var cards = document.querySelectorAll('#ts-cards .ts-turn:not(.ts-branch-point)');
          if (cards.length !== 4) return false;
          var visible = 0;
          for (var i = 0; i < cards.length; i++) {
            if (cards[i].style.display !== 'none') visible += 1;
          }
          return visible === 4;
        })()
        """, "the replayed board")
        try await waitForIdleInput()
        // The ack turn ("the story restarts") never entered the document,
        // and the replay left it byte-identical.
        let after = try treeFileBytes()
        XCTAssertEqual(after, before,
                       "an author restart replays the tree — no tree file may change")
        let cards = try documentCards()
        XCTAssertFalse(cards.contains { $0["command"] as? String == "restart" },
                       "the restart ack is mechanics, not a recorded turn")
    }

    // MARK: - Reopen: the document deserializes and replays to the same board

    func testReopenRestoresFromTheDocumentToAnIdenticalBoard() async throws {
        try await playThreeTurns()
        try await clickAction(2, "Branch…")
        try await commitActionPrompt(2, "east")
        try await waitFor("document.querySelectorAll('.ts-branch-chip').length === 2", "chips")
        try await waitForIdleInput()
        try await waitForDocument("the branched session") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            return cards.count > 2 && cards[2]["branches"] != nil
        }
        let bytesBefore = try treeFileBytes()

        // A fresh surface over the same tree + sidecar: the main line
        // replays live, the branch fresh-boots, the active line (the branch)
        // ends up live and selected — the identical board (AC-1 through the
        // real driver).
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
        try await waitFor("""
        (function () {
          var chips = document.querySelectorAll('.ts-branch-chip');
          return chips.length === 2 && !!chips[1].className.match('ts-chip-selected');
        })()
        """, "the chip row restored with the branch active")
        try await waitForIdleInput()

        // AC-1: the reopened session re-serialized the same tree — byte for
        // byte, nothing gained, nothing lost.
        try await Task.sleep(nanoseconds: 500_000_000)
        let bytesAfter = try treeFileBytes()
        XCTAssertEqual(bytesAfter, bytesBefore,
                       "reopen must replay to the identical tree, every file byte for byte")
    }

    // MARK: - GH #540: the document's seed is the engine's seed

    func testADocumentPinnedAtItsOwnSeedBootsTheEngineAtThatSeed() async throws {
        try writeTree([
            "manifest.json": #"{"seed": 7, "story": "probe", "version": 3}"#,
            "root0000.json": Self.rootSegment,
        ])

        try await boot()
        // The page global the client's boot reads (ADR-305 D1) carries the
        // document's pin, not the IDE constant.
        let seed = try await surface.evaluateInSurface("window.__SHARPEE_PLAY_SEED__")
        XCTAssertEqual(seed as? Int, 7)
        // The surface adopted the document (no refusal notice) and recording
        // continues at that seed: the document written back keeps its pin.
        try await waitForIdleInput()
        let notice = try await surface.evaluateInSurface(
            "!!document.querySelector('.ts-notice') && document.querySelector('.ts-notice').textContent")
        XCTAssertEqual(notice as? Bool, false)
        try await type("north")
        try await waitForDocument("the played turn at the pinned seed") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            return cards.count == 3
        }
        XCTAssertEqual(try documentJSON()["seed"] as? Int, 7)
    }

    // MARK: - AC-4: refused and malformed documents

    func testANewerVersionDocumentShowsItsNoticeAndIsNeverWritten() async throws {
        try writeTree([
            "manifest.json": #"{"seed": 42, "story": "probe", "version": 99}"#,
            "root0000.json": Self.rootSegment,
        ])
        let newer = try treeFileBytes()

        try await boot()
        // The named message shows; the session still plays as a scratch board.
        try await waitFor("""
        (function () {
          var notice = document.querySelector('.ts-notice');
          return !!notice && notice.textContent.indexOf('version 99') !== -1;
        })()
        """, "the refusal notice")
        try await type("north")
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 3", "cards")
        try await Task.sleep(nanoseconds: 500_000_000)
        // The newer tree was never clobbered by this older writer.
        XCTAssertEqual(try treeFileBytes(), newer, "a refused tree is write-locked")
    }

    func testAMalformedTreeDegradesToAFreshTree() async throws {
        try writeTree([
            "manifest.json": #"{"seed": 42, "story": "probe", "version": 3}"#,
            "root0000.json": "not json {{{",
        ])
        try await boot()
        // The session opens fresh and plays; always-recording replaces the
        // malformed files with a valid tree — the unreadable segment goes.
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 2", "cards")
        try await waitForDocument("the fresh tree replacing the malformed files") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            return object["version"] as? Int == 3 && cards.count == 2
        }
        XCTAssertFalse(FileManager.default.fileExists(
            atPath: documentURL.appendingPathComponent("root0000.json").path),
            "the unreadable segment is removed, not left beside the fresh tree")
    }

    // MARK: - The D7 sidecar: view state only, degraded-tolerant

    func testSidecarCarriesViewStateOnlyAndCorruptionDegrades() async throws {
        try Data("corrupt{{{not json".utf8).write(to: sidecarURL)
        try await boot()
        try await waitFor("document.querySelectorAll('#ts-cards .ts-turn').length === 2",
                         "fresh session cards")
        // The sidecar was replaced by the page's first state post — view
        // state only, no command log (D7).
        for _ in 0..<160 {
            if let data = try? Data(contentsOf: sidecarURL),
               let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
               object["version"] as? Int == TestingSessionStore.version { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        let data = try Data(contentsOf: sidecarURL)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(object["version"] as? Int, TestingSessionStore.version)
        XCTAssertNil(object["commands"], "no command log — the document owns the session")
        let view = try XCTUnwrap(object["view"] as? [String: Any])
        // The active line is a segment id (ADR-355 D5): a fresh session's is
        // the main line, the tree's root segment.
        let rootId = try XCTUnwrap(try documentJSON()["id"] as? String)
        XCTAssertEqual(view["active"] as? String, rootId)
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
        try await waitForDocument("the save turn recorded") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            return cards.count == 3 && cards[2]["command"] as? String == "save"
        }

        // Reopen: the replayed `save` opens its dialog again — the driver
        // applies the RECORDED outcome from the sidecar's dialogs, and the
        // turn completes (no stall, the save re-made under its own name).
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

    // MARK: - The run column over the real CLI's document path (D6)

    /// The Run button, end to end and real-path: a click in the page posts
    /// over the bridge, Swift spawns the REAL `sharpee test --tree --json`,
    /// discovery prefers the project's tree document, the NDJSON stream
    /// relays back by DERIVED LABELS, and the column fills — a FAIL row
    /// carrying the first failure, a PASS row for the branch, the tally.
    func testRunButtonRunsTheRealTreeDocumentAndTheColumnFills() async throws {
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "devkit CLI not built — run `./repokit build`")
        let project = tmp.appendingPathComponent("proj", isDirectory: true)
        try FileManager.default.createDirectory(at: project, withIntermediateDirectories: true)
        let story = """
        story
          title: Mini
          authors:
            T
          id: mini
          story-version: 0.0.1
          ifid: CF7091CC-6182-43A4-8FE0-516273849FA0

        create the Den
          a room

          A small square den.

        create the brass lamp
          in the Den

          It gleams dully.

        create Alex
          a person
          playable
          starts in the Den

          You.

        before the game starts
          change the player to Alex
        end before

        """
        try Data(story.utf8).write(to: project.appendingPathComponent("mini.story"))
        // The tree as `segmentTree` writes it — canonical bytes (sorted keys,
        // two-space indent, one trailing newline), since `sharpee test`'s
        // canonical gate refuses anything else (ADR-355 D7): the main line
        // ends on the fork card, and its one branch is a segment of its own.
        let tree = project.appendingPathComponent("mini.tests", isDirectory: true)
        try FileManager.default.createDirectory(at: tree, withIntermediateDirectories: true)
        let manifest = """
        {
          "seed": 42,
          "story": "mini",
          "version": 3
        }

        """
        let root = """
        {
          "cards": [
            {
              "id": "card0001",
              "type": "opening"
            },
            {
              "assertions": {
                "contains": [
                  "A small square den"
                ]
              },
              "id": "card0002",
              "type": "boot"
            },
            {
              "assertions": {
                "contains": [
                  "no such text anywhere"
                ]
              },
              "command": "take lamp",
              "id": "card0003",
              "type": "turn"
            }
          ],
          "id": "root0000"
        }

        """
        let branch = """
        {
          "cards": [
            {
              "assertions": {
                "contains": [
                  "A small square den"
                ]
              },
              "command": "look",
              "id": "card0004",
              "type": "turn"
            }
          ],
          "id": "branch01",
          "ordinal": 1,
          "parent": "root0000"
        }

        """
        try Data(manifest.utf8).write(to: tree.appendingPathComponent("manifest.json"))
        try Data(root.utf8).write(to: tree.appendingPathComponent("root0000.json"))
        try Data(branch.utf8).write(to: tree.appendingPathComponent("branch01.json"))

        try await boot()
        surface.storyFile = project.appendingPathComponent("mini.story")
        // A temp-dir story resolves no workspace shim and no PATH install —
        // inject the repo's real CLI.
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
        // Every assertion counts (David 2026-08-10): the boot look and the
        // branch's look each pass their one claim; take-lamp fails its one —
        // the same counts the CLI human report shows (AC-2 parity).
        // The derived tier (ADR-356) rides the same run: the fixture's one
        // clause (`before the game starts`) is one derived branch, passing.
        XCTAssertEqual(tally, "2 cards passing, 2 assertions passing, 1 card failing, 1 assertion failing, 1 rule passing",
                       "the tally aggregates cards, assertions and rules from the detail")

        // The stream's rows key by line id (ADR-355 D5) and are titled by the
        // derived label the wire announced. (The fixture session's own line
        // shows as a dash row after them; only the stream rows carry badges.)
        let rows = try await surface.evaluateInSurface("""
        Array.from(document.querySelectorAll('.ts-run-row'))
          .filter(function (row) {
            var badge = row.querySelector('.ts-badge').textContent;
            return badge === 'PASS' || badge === 'FAIL';
          })
          .map(function (row) {
            return row.querySelector('.ts-badge').textContent + '|' +
                   row.querySelector('.ts-name').textContent + '|' +
                   row.querySelector('.ts-why').textContent;
          }).join('\\n')
        """) as? String
        let lines = (rows ?? "").split(separator: "\n").map(String.init)
        XCTAssertEqual(lines.count, 2, "one badged row per line; got: \(rows ?? "")")
        XCTAssertTrue(lines.first?.hasPrefix("FAIL|opening-den|") == true,
                      "the main line fails by its derived label; got: \(lines.first ?? "")")
        XCTAssertTrue(lines.first?.contains("does not contain \"no such text anywhere\"") == true,
                      "the first failure rides the row; got: \(lines.first ?? "")")
        // No turn count on the row: turns have no meaning unless the author
        // gives them meaning (David 2026-08-10).
        XCTAssertEqual(lines.last, "PASS|den · look|",
                       "the branch passes by its derived label, count-free")

        let buttonLabel = try await surface.evaluateInSurface(
            "document.getElementById('ts-run-btn').textContent") as? String
        XCTAssertEqual(buttonLabel, "Run", "the button re-arms when the run ends")
    }

    // MARK: - The derived tier's rows and the span click-through (GH #524 Phase 2)

    /// The REAL committed bundle folds `derived-branch` / `derived-summary`
    /// lines relayed through `runLine` exactly as a run would deliver them,
    /// renders the coverage strip and the derived rows, and a click on a
    /// span link travels the real `testingSurface` bridge to the
    /// `openSource` hook with the file resolved against the story.
    func testDerivedRowsRenderAndASpanClickReachesTheOpenSourceHook() async throws {
        try await boot()
        let project = tmp.appendingPathComponent("proj", isDirectory: true)
        let storyURL = project.appendingPathComponent("mini.story")
        surface.storyFile = storyURL

        var opened: [(URL, Int)] = []
        surface.openSource = { url, line in opened.append((url, line)) }

        // A run's worth of wire lines, the derived tier after the tree's.
        let lines: [String] = [
            #"{"schemaVersion":2,"seq":0,"elapsedMs":0,"type":"run-start","mode":"tree","transcriptCount":1,"seed":42}"#,
            #"{"schemaVersion":2,"seq":1,"elapsedMs":1,"type":"transcript-start","file":"opening-den","index":0}"#,
            #"{"schemaVersion":2,"seq":2,"elapsedMs":2,"type":"command-result","file":"opening-den","line":0,"input":"look","passed":true,"expectedFailure":false,"skipped":false}"#,
            #"{"schemaVersion":2,"seq":3,"elapsedMs":3,"type":"transcript-end","file":"opening-den","status":"passed","passed":1,"failed":0,"expectedFailures":0,"skipped":0,"duration":1}"#,
            #"{"schemaVersion":2,"seq":4,"elapsedMs":4,"type":"derived-branch","label":"vine · on pruning · when seedling","span":{"line":12,"column":1,"endLine":12,"endColumn":2},"status":"passed"}"#,
            #"{"schemaVersion":2,"seq":5,"elapsedMs":5,"type":"derived-branch","label":"Tobias · topic boiler","span":{"file":"npcs/tobias.chord","line":9,"column":1,"endLine":9,"endColumn":2},"status":"failed","failure":"emitted tobias-boiler-reply: not emitted","command":"ask tobias about boiler"}"#,
            #"{"schemaVersion":2,"seq":6,"elapsedMs":6,"type":"derived-branch","label":"boiler · on switching_on","span":{"line":271,"column":1,"endLine":271,"endColumn":2},"status":"skipped","shape":"negation","detail":"the guard already holds"}"#,
            #"{"schemaVersion":2,"seq":7,"elapsedMs":7,"type":"derived-summary","branches":{"declared":3,"exercised":2,"passed":1,"failed":1,"gaps":[{"label":"boiler · on switching_on","status":"skipped","shape":"negation","span":{"line":271,"column":1,"endLine":271,"endColumn":2}}]},"endings":{"declared":2,"reached":1,"unreached":[{"id":"dawn-comes","statement":"lose","line":636,"file":null}],"unnamed":[]},"rooms":{"declared":2,"entered":2,"unentered":[]}}"#,
            #"{"schemaVersion":2,"seq":8,"elapsedMs":8,"type":"run-end","totalPassed":1,"totalFailed":0,"totalExpectedFailures":0,"totalSkipped":0,"totalErrors":0,"totalUnreached":0,"totalDuration":8,"exitCode":1}"#,
        ]
        for line in lines {
            _ = try await surface.evaluateInSurface(
                "window.__sharpeeTestingSurface.runLine(\(jsString(line)));")
        }
        try await waitFor("!!document.querySelector('.ts-run-tally')", "the run to close")

        // The three ratios, the failed row with its claim, the SKIPPED row
        // grouped under its shape and never badged as a failure (D5a).
        let ratios = try await surface.evaluateInSurface(
            "Array.from(document.querySelectorAll('.ts-cov-ratio')).map(function (e) { return e.textContent; }).join('|')") as? String
        XCTAssertEqual(ratios, "2 / 3|1 / 2|2 / 2", "branches, endings, rooms — as the wire carried them")
        let failed = try await surface.evaluateInSurface("""
        Array.from(document.querySelectorAll('.ts-derived-row')).map(function (row) {
          return row.querySelector('.ts-badge').textContent + '|' + row.querySelector('.ts-name').textContent
            + '|' + row.querySelector('.ts-failure').textContent;
        }).join('\\n')
        """) as? String
        XCTAssertEqual(failed, "FAIL|Tobias · topic boiler|✗ emitted tobias-boiler-reply: not emitted",
                       "exactly one open row: the failure, with its claim")
        let shapes = try await surface.evaluateInSurface(
            "Array.from(document.querySelectorAll('.ts-group-head .ts-shape')).map(function (e) { return e.textContent; }).join('|')") as? String
        XCTAssertEqual(shapes, "negation", "the SKIPPED branch groups under its shape")
        let tally = try await surface.evaluateInSurface(
            "document.querySelector('.ts-run-tally').textContent") as? String
        XCTAssertEqual(tally, "1 card passing, 0 assertions passing, 1 rule passing, 1 rule failing, 1 skipped",
                       "the tally names rules and SKIPPED apart from failing")

        // Click the failed row's span: an imported file, resolved against the story.
        _ = try await surface.evaluateInSurface(
            "document.querySelector('.ts-derived-row .ts-src').click();")
        for _ in 0..<160 {
            if !opened.isEmpty { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertEqual(opened.count, 1, "one click, one open")
        XCTAssertEqual(opened.first?.0.standardizedFileURL,
                       project.appendingPathComponent("npcs/tobias.chord").standardizedFileURL,
                       "the span's file resolves beside the story")
        XCTAssertEqual(opened.first?.1, 9)

        // Click the unreached ending's span: the story file itself (null file).
        _ = try await surface.evaluateInSurface(
            "document.querySelector('.ts-cov-detail .ts-src').click();")
        for _ in 0..<160 {
            if opened.count >= 2 { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertEqual(opened.count, 2)
        XCTAssertEqual(opened.last?.0.standardizedFileURL, storyURL.standardizedFileURL,
                       "a null file is the story file")
        XCTAssertEqual(opened.last?.1, 636)
    }

    /// The resolver alone: nil without a story, the story for nil or empty,
    /// beside the story for a relative file, as given for an absolute one.
    func testSourceURLResolvesAgainstTheStoryFile() {
        let surface = TestingSurfaceViewController(
            sessionStore: TestingSessionStore(fileURL: sidecarURL))
        XCTAssertNil(surface.sourceURL(file: "a.chord"), "no story wired → nothing to open")

        let story = URL(fileURLWithPath: "/tmp/proj/mini.story")
        surface.storyFile = story
        XCTAssertEqual(surface.sourceURL(file: nil), story)
        XCTAssertEqual(surface.sourceURL(file: ""), story)
        XCTAssertEqual(surface.sourceURL(file: "npcs/tobias.chord")?.path, "/tmp/proj/npcs/tobias.chord")
        XCTAssertEqual(surface.sourceURL(file: "/elsewhere/x.chord")?.path, "/elsewhere/x.chord")
    }

    /// Fernhill's REAL derived tier, from the REAL process: the Run button
    /// spawns the real devkit CLI on a temp copy of `branch-stories/fernhill`
    /// (its story, tree document and sidecars — the repo's copy is never
    /// written), the Swift TestRunner relays every line unexamined, and the
    /// committed bundle renders the three ratios, the derived rules section
    /// and the span links from what the process said — the rendering claim
    /// the synthetic-lines test above cannot make. Numbers are checked for
    /// consistency with each other, not pinned: the story's rule count is
    /// the story's business.
    func testRunButtonOnRealFernhillRendersTheDerivedTierFromTheRealProcess() async throws {
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "devkit CLI not built — run `./repokit build`")
        let source = TestToolchain.repoRoot.appendingPathComponent("branch-stories/fernhill", isDirectory: true)
        try XCTSkipUnless(FileManager.default.fileExists(atPath: source.appendingPathComponent("fernhill.tests").path),
                          "branch-stories/fernhill has no test tree")
        // A scratch COPY of the story and its tree — the run never touches the
        // real story's directory (#497).
        let project = tmp.appendingPathComponent("fernhill", isDirectory: true)
        try FileManager.default.createDirectory(at: project, withIntermediateDirectories: true)
        for name in ["fernhill.story", "fernhill.tests", "fernhill.config.json",
                     "fernhill.world-ignore.json", "fernhill.recipe.json"] {
            let file = source.appendingPathComponent(name)
            if FileManager.default.fileExists(atPath: file.path) {
                try FileManager.default.copyItem(at: file, to: project.appendingPathComponent(name))
            }
        }

        try await boot()
        surface.storyFile = project.appendingPathComponent("fernhill.story")
        surface.sharpeeExecutableOverride = TestToolchain.devkitCLI
        var opened: [(URL, Int)] = []
        surface.openSource = { url, line in opened.append((url, line)) }

        _ = try await surface.evaluateInSurface(
            "document.getElementById('ts-run-btn').click();")
        for _ in 0..<1800 {
            if let done = try? await surface.evaluateInSurface(
                "!!document.querySelector('.ts-run-tally')"), done as? Bool == true { break }
            try await Task.sleep(nanoseconds: 100_000_000)
        }

        // Three ratios, each `n / m` with n ≤ m.
        let ratios = try await surface.evaluateInSurface(
            "Array.from(document.querySelectorAll('.ts-cov-ratio')).map(function (e) { return e.textContent; }).join('|')") as? String
        let parts = (ratios ?? "").split(separator: "|").map(String.init)
        XCTAssertEqual(parts.count, 3, "branches, endings, rooms; got: \(ratios ?? "nil")")
        var branchesDeclared = -1
        for (index, part) in parts.enumerated() {
            let numbers = part.split(separator: "/").compactMap { Int($0.trimmingCharacters(in: .whitespaces)) }
            XCTAssertEqual(numbers.count, 2, "a ratio is `n / m`; got: \(part)")
            if numbers.count == 2 {
                XCTAssertLessThanOrEqual(numbers[0], numbers[1], part)
                if index == 0 { branchesDeclared = numbers[1] }
            }
        }
        XCTAssertGreaterThan(branchesDeclared, 0, "fernhill declares rules")

        // The derived section names the same count the ratio's denominator does,
        // and its rows and groups account for every branch.
        let sections = try await surface.evaluateInSurface(
            "Array.from(document.querySelectorAll('.ts-run-section')).map(function (e) { return e.firstChild.textContent; }).join('|')") as? String
        XCTAssertEqual(sections?.hasPrefix("tree · "), true, "the tree section heads the rows; got: \(sections ?? "nil")")
        XCTAssertTrue(sections?.contains("derived rules · \(branchesDeclared)") == true,
                      "the derived section counts every declared branch; got: \(sections ?? "nil")")
        let accounted = try await surface.evaluateInSurface("""
        (function () {
          var open = document.querySelectorAll('.ts-derived-row').length;
          var grouped = 0;
          document.querySelectorAll('.ts-group-head .ts-count').forEach(function (e) {
            var n = parseInt(e.textContent, 10); if (!isNaN(n)) grouped += n;
          });
          return open + grouped;
        })()
        """) as? Int
        XCTAssertEqual(accounted, branchesDeclared, "failures open + passes by subject + SKIPPED by shape = declared")
        let tally = try await surface.evaluateInSurface(
            "document.querySelector('.ts-run-tally').textContent") as? String
        XCTAssertTrue(tally?.contains("rule") == true, "the tally counts rules; got: \(tally ?? "nil")")

        // A span link from the real wire opens the real story copy.
        let clicked = try await surface.evaluateInSurface(
            "(function () { var a = document.querySelector('#ts-run-results .ts-src'); if (!a) return null; a.click(); return a.textContent; })()") as? String
        XCTAssertNotNil(clicked, "the real run carries at least one span")
        for _ in 0..<160 {
            if !opened.isEmpty { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertEqual(opened.count, 1)
        XCTAssertEqual(opened.first?.0.deletingLastPathComponent().standardizedFileURL,
                       project.standardizedFileURL, "the span resolves inside the story copy")
        XCTAssertGreaterThan(opened.first?.1 ?? 0, 0)
    }

    // MARK: - The real client (rule 13a: no stand-ins anywhere on this path)

    /// Fernhill's REAL devkit-built bundle: the actual `index-testing.html`
    /// the browser build emits, the actual `game.js` engine booting at the
    /// pinned seed, real turn records over the real bridge — the surface's
    /// cards and DOCUMENT built from a genuine play session. Skips (never
    /// fakes) when the bundle hasn't been built: `cd branch-stories/fernhill
    /// && node ../../packages/devkit/dist/cli.js build fernhill.story
    /// --browser`.
    func testRealFernhillPlaysBranchesAndWritesTheDocumentOnTheRealEngine() async throws {
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
        // The tree writes into the TEST's temp dir — never the repo.
        documentURL = tmp.appendingPathComponent("fernhill.tests", isDirectory: true)
        surface.testTreeURL = documentURL
        surface.load(bundleDirectory: fernhill)
        XCTAssertTrue(surface.isLoaded)

        // The real engine boots and its look becomes cards: the opening
        // (prologue + banner) and turn 1 · boot.
        for _ in 0..<300 {
            if let n = try? await surface.evaluateInSurface(
                "document.querySelectorAll('#ts-cards .ts-turn').length"),
               (n as? Int ?? 0) >= 2 { break }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        let openingText = try await surface.evaluateInSurface(
            "(document.querySelector('[data-ts-ordinal=\"0\"]') || {textContent:''}).textContent"
        ) as? String
        XCTAssertTrue(openingText?.contains("The Folly at Fernhill") == true,
                      "the opening card must carry the banner title; got: \(openingText ?? "nil")")

        // Three real norths: Gates → Drive → Court → Hall.
        try await type("north")
        try await type("north")
        try await type("north")
        try await waitFor("""
        (function () {
          var card = document.querySelector('[data-ts-ordinal="4"] .ts-prose');
          return !!card && card.textContent.indexOf('Entrance Hall') !== -1;
        })()
        """, "the real walk reaching the Entrance Hall")

        // Branch… FROM turn 3 (the Fountain Court): fernhill's real map goes
        // east to the Boiler Shed. The driver restarts the REAL engine,
        // replays the prefix, and plays the alternate live.
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

        // Exactly one coherent lineage, chips labelled off the REAL rooms.
        let coherent = try await surface.evaluateInSurface("""
        (function () {
          var chips = document.querySelectorAll('.ts-branch-chip');
          return document.querySelector('[data-ts-ordinal="4"]').style.display === 'none' &&
                 document.querySelector('[data-ts-ordinal="2"]').style.display !== 'none' &&
                 chips.length === 2 &&
                 chips[0].textContent.indexOf('opening-iron-gates') !== -1 &&
                 chips[1].textContent.indexOf('fountain-court · east') !== -1;
        })()
        """)
        XCTAssertEqual(coherent as? Bool, true)

        // The TREE recorded the real session: opening/boot/three norths, the
        // branch on the third north (its own segment file), the pinned seed.
        try await waitForDocument("the real session with its branch") { object in
            let cards = (object["cards"] as? [[String: Any]]) ?? []
            return cards.count == 5 && cards[3]["branches"] != nil
        }
        let object = try documentJSON()
        XCTAssertEqual(object["story"] as? String, "fernhill")
        XCTAssertEqual(object["seed"] as? Int, 42)
        let cards = try XCTUnwrap(object["cards"] as? [[String: Any]])
        XCTAssertEqual(cards.map { $0["command"] as? String },
                       [nil, nil, "north", "north", "north"])
        let branches = try XCTUnwrap(cards[3]["branches"] as? [[String: Any]])
        let branchCards = try XCTUnwrap(branches.first?["cards"] as? [[String: Any]])
        XCTAssertEqual(branchCards.map { $0["command"] as? String }, ["east"])
        let branchId = try XCTUnwrap(branches.first?["id"] as? String)
        XCTAssertTrue(FileManager.default.fileExists(
            atPath: documentURL.appendingPathComponent("\(branchId).json").path),
            "the branch is a segment file of its own (ADR-355 D2)")

        // The OPENING's recorded claims persisted from the real boot flush
        // (David 2026-08-10 — the fresh-start regression: they were only
        // written on creation and lost on replay). fernhill's banner title
        // must be among them.
        let openingAssertions = try XCTUnwrap(cards[0]["assertions"] as? [String: Any],
                                              "the opening card carries its recorded claims")
        let openingChannels = try XCTUnwrap(openingAssertions["channels"] as? [[String: Any]])
        XCTAssertTrue(openingChannels.contains {
            $0["id"] as? String == "info.title"
                && $0["is"] as? String == "The Folly at Fernhill"
        }, "the recorded info.title claim rides the opening card; got: \(openingChannels)")
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
