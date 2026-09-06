// PlayPathRealPathTests.swift
// The walkthrough from the Testing tab (ADR-333 D5/D6, AC-5), rule 13a real
// path in two halves that share one tree document:
//  1. The REAL testing surface (the committed bundle over the pane's real
//     scheme handler) reopens a real `<story>.tests.json`, replays it to its
//     board, and its "Play this path" button posts the viewed line's
//     root-to-leaf commands over the real `testingSurface` bridge.
//  2. The REAL Play pane, over a REAL `sharpee build` of the story those
//     cards belong to, steps through exactly those commands from a fresh
//     boot and lists every `(TODO during play-testing …)` paragraph the path
//     printed, with its message id — descriptions (Phase 2) and phrases
//     alike — and the header's pull-down hands a picked stub back as an
//     edit request carrying the path as its history.
// No stubs of anything the repo owns.
// Owner context: tools/ide — Tests.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class PlayPathRealPathTests: XCTestCase {

    private var tmp: URL!
    private var storyFile: URL!
    private var surface: TestingSurfaceViewController!
    private var play: PlayViewController!

    private static let storyId = "play-path-probe"

    /// The story: a description stub on the apple (Phase 2 stamps it with the
    /// apple's key), a phrase stub on eating it.
    private static let story = """
    story
      title: Play Path
      authors:
        T
      id: \(storyId)
      story-version: 0.0.1

    create the Alley
      a room
      north to the Market

      A quiet alley.

    create the Market
      a room
      south to the Alley

      Stalls crowd the square.

    create the apple
      in the Market
      edible

      (TODO during play-testing — what the apple looks like)

      on the player eating
        phrase apple-first-bite
          (TODO during play-testing — the first bite)
      end on

    create Jack
      a person, playable
      in the Alley

      A boy in this market.

    before the game starts
      change the player to Jack
    end before
    """

    /// The tree document the Testing tab reopens: opening, boot, then the
    /// typed path — the walkthrough IS the tree (D5).
    private static let treeDocument = """
    {"version":1,"story":"\(storyId)","seed":42,"cards":[
      {"type":"opening"},
      {"type":"boot"},
      {"type":"turn","command":"north"},
      {"type":"turn","command":"x apple"},
      {"type":"turn","command":"eat apple"}
    ]}
    """

    /// The client's part for the surface half: a boot look and typed turns
    /// posted over the real `turnEvents` bridge, restart replaying the
    /// client's sequence (ack turn, fence, fresh boot) — enough for the
    /// surface's reopen replay to bind the document's cards.
    private static let surfaceFixtureHTML = """
    <html><head><meta charset="utf-8"></head><body>
    <div class="sharpee-window">
      <div id="main-window"><div id="text-content"></div></div>
      <div id="input-area" class="sharpee-input-bar"><input id="command-input" type="text"></div>
    </div>
    <script>
    (function () {
      var n = 0;
      function post(o) { try { window.webkit.messageHandlers.turnEvents.postMessage(JSON.stringify(o)); } catch (e) {} }
      function renderTurn(command, echo, output) {
        n += 1;
        var tc = document.getElementById('text-content');
        if (echo) {
          var e = document.createElement('div');
          e.className = 'command-echo'; e.textContent = '> ' + command; e.setAttribute('data-turn', n);
          tc.appendChild(e);
        }
        var p = document.createElement('p');
        p.className = 'main-entry'; p.textContent = output || ('You ' + command + '.'); p.setAttribute('data-turn', n);
        tc.appendChild(p);
        post({ turn: n, command: command, output: p.textContent, captures: [], events: [], lineage: 1 });
      }
      renderTurn('look', false, 'A quiet alley.');
      var input = document.getElementById('command-input');
      input.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || !input.value.trim()) return;
        var command = input.value.trim(); input.value = '';
        if (command === 'restart') {
          if (!window.confirm('Are you sure?')) { renderTurn(command, true, 'Restart declined.'); return; }
          renderTurn(command, true, 'The story restarts.');
          post({ restart: true, turn: n + 1, lineage: 1 });
          renderTurn('look', false, 'A quiet alley.');
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
        try XCTSkipUnless(TestingSurfaceWebRoot.scriptURL() != nil, TestingSurfaceWebRoot.missingNote)
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "packages/devkit/dist/cli.js is not built")
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlayPathRealPathTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        storyFile = tmp.appendingPathComponent("probe.story")
        try Self.story.write(to: storyFile, atomically: true, encoding: .utf8)
        try Self.treeDocument.write(to: tmp.appendingPathComponent("probe.tests.json"), atomically: true, encoding: .utf8)
    }

    override func tearDownWithError() throws {
        surface = nil
        play = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        try super.tearDownWithError()
    }

    private var bundleDir: URL { WebBundle.directory(projectRoot: tmp, storyId: Self.storyId) }

    /// The real devkit `build` (the Play pane's menu-less form).
    private func build() throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node", TestToolchain.devkitCLI.path] + BuildRunner.buildArguments(for: storyFile)
        process.currentDirectoryURL = tmp
        var environment = ShellEnvironment.buildEnvironment()
        environment["NODE_PATH"] = TestToolchain.repoRoot.appendingPathComponent("node_modules").path
        process.environment = environment
        let output = Pipe(), errors = Pipe()
        process.standardOutput = output
        process.standardError = errors
        try process.run()
        let outputData = output.fileHandleForReading.readDataToEndOfFile()
        let errorData = errors.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            XCTFail("sharpee build exited \(process.terminationStatus):\n" +
                    (String(data: outputData, encoding: .utf8) ?? "") + (String(data: errorData, encoding: .utf8) ?? ""))
            return
        }
    }

    private func waitFor(_ webView: @escaping (String) async throws -> Any?, _ probe: String, _ what: String) async throws {
        for _ in 0..<200 {
            if let ok = try? await webView(probe), ok as? Bool == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("timed out waiting for \(what): \(probe)")
    }

    // MARK: AC-5

    func testPlayThisPathStepsPlayThroughTheTreesPathAndListsEveryStubWithItsId() async throws {
        // 1. The testing surface reopens the document and offers the path.
        let sidecar = tmp.appendingPathComponent("probe-session.json")
        surface = TestingSurfaceViewController(sessionStore: TestingSessionStore(fileURL: sidecar))
        _ = surface.view
        surface.testDocumentURL = tmp.appendingPathComponent("probe.tests.json")
        // The surface serves `index-testing.html` from the bundle dir; the fixture stands in for the client HERE ONLY.
        let surfaceBundle = tmp.appendingPathComponent("surface-bundle", isDirectory: true)
        try FileManager.default.createDirectory(at: surfaceBundle, withIntermediateDirectories: true)
        try Data(Self.surfaceFixtureHTML.utf8).write(to: surfaceBundle.appendingPathComponent("index-testing.html"))
        var posted: [[String]] = []
        surface.onPlayPathRequested = { posted.append($0) }
        surface.load(bundleDirectory: surfaceBundle)
        try await waitFor({ try await self.surface.evaluateInSurface($0) }, "window.bootProbeReady === true", "surface boot")
        // The reopen replay binds the three typed cards; wait for the last one to land.
        try await waitFor({ try await self.surface.evaluateInSurface($0) },
                          "document.querySelectorAll('[data-ts-ordinal]').length >= 4", "the document's cards")

        _ = try await surface.evaluateInSurface("document.getElementById('ts-play-path-btn').click(); true")
        for _ in 0..<100 where posted.isEmpty { try await Task.sleep(nanoseconds: 50_000_000) }
        XCTAssertEqual(posted, [["north", "x apple", "eat apple"]], "the viewed line's path, root to leaf, in play order")
        let path = try XCTUnwrap(posted.first)

        // 2. The Play pane plays that path over the real story and lists the stubs.
        try build()
        play = PlayViewController()
        _ = play.view
        var listed: [[PlayStub]] = []
        play.onStubsListed = { listed.append($0) }
        play.play(path: path, bundleDirectory: bundleDir)
        for _ in 0..<600 where listed.isEmpty { try await Task.sleep(nanoseconds: 100_000_000) }
        let stubs = try XCTUnwrap(listed.first, "the replay never reported its stubs")

        // The keys the loader registers: the description's, and the entity-scoped phrase's.
        XCTAssertEqual(stubs.map(\.messageId), ["apple.description", "apple.apple-first-bite"])
        XCTAssertEqual(stubs.map(\.text), ["(TODO during play-testing — what the apple looks like)",
                                            "(TODO during play-testing — the first bite)"])
        XCTAssertEqual(stubs.compactMap(\.turn), [stubs[0].turn!, stubs[0].turn! + 1], "x apple, then eat apple")
        let echoes = try await play.evaluateInPlaySurface(
            "Array.prototype.map.call(document.querySelectorAll('.command-echo[data-turn]'), function (e) { return e.textContent; })") as? [String]
        XCTAssertEqual(echoes, ["> north", "> x apple", "> eat apple"], "every card typed, the examine included")

        // 3. A stub picked from the header comes back as an edit request carrying the path.
        var requests: [PlayEditRequest] = []
        play.onEditRequest = { requests.append($0) }
        let header = try XCTUnwrap(play.view.subviews.compactMap { $0 as? PlayHeaderView }.first)
        XCTAssertEqual(header.stubs, stubs)
        header.onStubSelected?(stubs[1])
        XCTAssertEqual(requests.map(\.messageId), ["apple.apple-first-bite"])
        XCTAssertEqual(requests.first?.history, path)

        // 4. A second path while Play is already showing one restarts from origin:
        //    a fresh boot, only the new path's turns, its own stubs listed.
        XCTAssertTrue(play.isLoaded)
        listed.removeAll()
        play.play(path: ["north", "x apple"], bundleDirectory: nil)
        for _ in 0..<600 where listed.isEmpty { try await Task.sleep(nanoseconds: 100_000_000) }
        let again = try XCTUnwrap(listed.first, "the second replay never reported its stubs")
        XCTAssertEqual(again.map(\.messageId), ["apple.description"], "the bite never happened this time")
        let echoesAgain = try await play.evaluateInPlaySurface(
            "Array.prototype.map.call(document.querySelectorAll('.command-echo[data-turn]'), function (e) { return e.textContent; })") as? [String]
        XCTAssertEqual(echoesAgain, ["> north", "> x apple"], "a fresh boot — the first path's turns are gone")
        XCTAssertEqual(header.stubs, again)
    }
}
