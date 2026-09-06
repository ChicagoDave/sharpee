// PlayToWriteSurfaceTests.swift
// The Play pane's play-to-write chrome (ADR-333 D4) against a real WKWebView:
// a fixture page plays the browser client's part — `[data-message-id]`
// paragraphs, a `#command-input` that renders an echo and stamps `data-turn`
// when the turn closes — and the assertions read what crossed the real
// `playEdit` bridge and what the real replay typed. The story itself is the
// real-path suite's job (PlayToWriteRealPathTests).
// Owner context: tools/ide — Tests.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class PlayToWriteSurfaceTests: XCTestCase {

    private var tmp: URL!
    private var bundleDir: URL!
    private var play: PlayViewController!

    /// The client's part: an opening paragraph, and a command loop that echoes,
    /// renders one paragraph per command, and closes the turn a tick later.
    private static let fixtureHTML = """
    <html><body>
    <div id="text-content">
      <p class="main-entry" data-message-id="alley.description">A quiet alley.</p>
    </div>
    <input id="command-input" type="text">
    <script>
    (function () {
      var n = 0;
      var input = document.getElementById('command-input');
      input.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var command = input.value; input.value = '';
        var slot = document.getElementById('text-content');
        var echo = document.createElement('div');
        echo.className = 'command-echo'; echo.textContent = '> ' + command;
        slot.appendChild(echo);
        var p = document.createElement('p');
        p.className = 'main-entry';
        p.setAttribute('data-message-id', command === 'north' ? 'market.initial-description' : 'if.action.taking.taken');
        p.textContent = command === 'north' ? 'Stalls crowd the square, for the first time.' : 'Taken.';
        slot.appendChild(p);
        setTimeout(function () {
          n += 1;
          echo.setAttribute('data-turn', String(n));
          p.setAttribute('data-turn', String(n));
        }, 30);
      });
      window.bootProbeReady = true;
    })();
    </script>
    </body></html>
    """

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlayToWriteSurfaceTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        bundleDir = tmp.appendingPathComponent("dist/web/probe", isDirectory: true)
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        try Data(Self.fixtureHTML.utf8).write(to: bundleDir.appendingPathComponent("index.html"))
        play = PlayViewController()
        _ = play.view
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
        play.load(bundleDirectory: bundleDir)
        for _ in 0..<200 {
            if let ready = try? await play.evaluateInPlaySurface("window.bootProbeReady === true"),
               ready as? Bool == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("the fixture page never booted")
    }

    private func click(_ selector: String, meta: Bool) async throws {
        _ = try await play.evaluateInPlaySurface("""
        (function () {
          var all = document.querySelectorAll('\(selector)');
          var el = all[all.length - 1];
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: \(meta) }));
          return true;
        })()
        """)
    }

    private func awaitRequest(timeout: TimeInterval = 5) async throws -> PlayEditRequest? {
        for _ in 0..<Int(timeout * 20) {
            if let request = received.last { return request }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        return nil
    }

    private var received: [PlayEditRequest] = []

    func testACommandClickPostsTheParagraphsIdAndTheSessionsHistory() async throws {
        try await boot()
        play.onEditRequest = { [weak self] request in self?.received.append(request) }

        try await play.replay(PlayToWriteSession(messageId: "", history: ["north"]))
        try await click("[data-message-id=\"market.initial-description\"]", meta: true)

        let awaited = try await awaitRequest()
        let request = try XCTUnwrap(awaited)
        XCTAssertEqual(request.messageId, "market.initial-description")
        XCTAssertEqual(request.turn, 1)
        XCTAssertEqual(request.text, "Stalls crowd the square, for the first time.")
        XCTAssertEqual(request.history, ["north"], "the history is the page's echoes, `> ` stripped")
    }

    func testAPlainClickStaysTheClients() async throws {
        try await boot()
        play.onEditRequest = { [weak self] request in self?.received.append(request) }

        try await click("[data-message-id=\"alley.description\"]", meta: false)
        try await Task.sleep(nanoseconds: 300_000_000)

        XCTAssertTrue(received.isEmpty, "a plain click never reaches the bridge")
    }

    func testReplayTypesEveryCommandAndWaitsForEachTurnToClose() async throws {
        try await boot()

        try await play.replay(PlayToWriteSession(messageId: "if.action.taking.taken", history: ["north", "take apple"]))

        let probe = try await play.evaluateInPlaySurface("JSON.stringify(window.__sharpeePlayToWriteLast)")
        let echoes = try await play.evaluateInPlaySurface(
            "Array.prototype.map.call(document.querySelectorAll('.command-echo[data-turn]'), function (e) { return e.textContent; })")
        XCTAssertEqual(echoes as? [String], ["> north", "> take apple"], "probe: \(String(describing: probe))")
        let focused = try await play.evaluateInPlaySurface(
            "document.querySelector('.sharpee-play-to-write-focus') && document.querySelector('.sharpee-play-to-write-focus').getAttribute('data-message-id')")
        XCTAssertEqual(focused as? String, "if.action.taking.taken", "the session's paragraph is brought into view")
    }

    // MARK: Inline editing (D4c)

    private var commits: [PlayInlineCommit] = []

    private func fieldState() async throws -> [String: Any] {
        let raw = try await play.evaluateInPlaySurface("""
        (function () {
          var f = document.querySelector('.sharpee-play-inline-edit');
          var p = document.querySelector('[data-message-id="market.initial-description"]');
          return JSON.stringify({ open: !!f, value: f ? f.value : null, focused: f ? document.activeElement === f : false,
                                  paragraph: p ? p.textContent : null });
        })()
        """) as? String ?? "{}"
        return (try? JSONSerialization.jsonObject(with: Data(raw.utf8)) as? [String: Any]) ?? [:]
    }

    private func key(_ key: String, shift: Bool = false) async throws {
        _ = try await play.evaluateInPlaySurface("""
        (function () {
          var f = document.querySelector('.sharpee-play-inline-edit');
          f.dispatchEvent(new KeyboardEvent('keydown', { key: '\(key)', shiftKey: \(shift), bubbles: true, cancelable: true }));
          return true;
        })()
        """)
    }

    private func awaitCommit(timeout: TimeInterval = 5) async throws -> PlayInlineCommit? {
        for _ in 0..<Int(timeout * 20) {
            if let commit = commits.last { return commit }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        return nil
    }

    func testBeginInlineEditSwapsTheParagraphForAFieldHoldingTheTemplate() async throws {
        try await boot()
        try await play.replay(PlayToWriteSession(messageId: "", history: ["north"]))

        let opened = try await play.beginInlineEditInPlaySurface(
            PlayInlineEdit(messageId: "market.initial-description", turn: 1, template: "Stalls crowd the {square}, for the first time."))
        XCTAssertTrue(opened)
        let state = try await fieldState()
        XCTAssertEqual(state["open"] as? Bool, true)
        XCTAssertEqual(state["value"] as? String, "Stalls crowd the {square}, for the first time.", "the TEMPLATE, not the rendered text")
        XCTAssertEqual(state["focused"] as? Bool, true)

        let missing = try await play.beginInlineEditInPlaySurface(PlayInlineEdit(messageId: "nowhere", turn: nil, template: "x"))
        XCTAssertFalse(missing, "no paragraph, no field")
    }

    func testEnterPostsTheNewTextWithTheHistoryAndRestoresTheParagraph() async throws {
        try await boot()
        play.onInlineCommit = { [weak self] commit in self?.commits.append(commit) }
        try await play.replay(PlayToWriteSession(messageId: "", history: ["north"]))
        _ = try await play.beginInlineEditInPlaySurface(
            PlayInlineEdit(messageId: "market.initial-description", turn: 1, template: "Stalls crowd the square, for the first time."))

        _ = try await play.evaluateInPlaySurface("document.querySelector('.sharpee-play-inline-edit').value = 'Stalls, and rain.\\nA second line.'; true")
        try await key("Enter", shift: true)
        let afterShiftEnter = try await fieldState()
        XCTAssertEqual(afterShiftEnter["open"] as? Bool, true, "Shift-Enter is a line break, not a commit")
        try await key("Enter")

        let awaited = try await awaitCommit()
        let commit = try XCTUnwrap(awaited)
        XCTAssertEqual(commit, PlayInlineCommit(messageId: "market.initial-description", turn: 1,
                                                text: "Stalls, and rain.\nA second line.", history: ["north"]))
        let state = try await fieldState()
        XCTAssertEqual(state["open"] as? Bool, false, "the field is gone")
        XCTAssertEqual(state["paragraph"] as? String, "Stalls crowd the square, for the first time.",
                       "the rendered text comes back until the replay rewrites it")
    }

    func testEscapeRestoresTheParagraphAndPostsNothing() async throws {
        try await boot()
        play.onInlineCommit = { [weak self] commit in self?.commits.append(commit) }
        try await play.replay(PlayToWriteSession(messageId: "", history: ["north"]))
        _ = try await play.beginInlineEditInPlaySurface(
            PlayInlineEdit(messageId: "market.initial-description", turn: 1, template: "Stalls crowd the square, for the first time."))

        _ = try await play.evaluateInPlaySurface("document.querySelector('.sharpee-play-inline-edit').value = 'Abandoned.'; true")
        try await key("Escape")
        try await Task.sleep(nanoseconds: 300_000_000)

        let state = try await fieldState()
        XCTAssertEqual(state["open"] as? Bool, false)
        XCTAssertEqual(state["paragraph"] as? String, "Stalls crowd the square, for the first time.")
        XCTAssertTrue(commits.isEmpty, "an Escape never reaches the bridge")
    }

    func testAReloadWithASessionReplaysItOnceThePageHasLoaded() async throws {
        try await boot()

        play.reloadAfterBuild(bundleDirectory: bundleDir,
                              replaying: PlayToWriteSession(messageId: "market.initial-description", history: ["north"]))

        var echoes: [String] = []
        for _ in 0..<200 {
            if let e = try? await play.evaluateInPlaySurface(
                "Array.prototype.map.call(document.querySelectorAll('.command-echo[data-turn]'), function (e) { return e.textContent; })") as? [String],
               !e.isEmpty { echoes = e; break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertEqual(echoes, ["> north"])
    }
}
