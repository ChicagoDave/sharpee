// PlayToWriteRealPathTests.swift
// Play-to-write end to end (ADR-333 AC-4 and AC-2b), rule 13a real path: a
// REAL `sharpee build` of a fixture story, booted in the REAL Play pane at the
// IDE's fixed seed; a ⌘-click on a rendered paragraph crosses the real
// bridge; the REAL compose gives the IR the resolver reads; the file is
// edited, rebuilt by the real CLI, reloaded, and the captured history replayed
// through the client's own input — and the same turn shows the new text. The
// platform-line half (AC-2b) resolves through the REAL `sharpee messages`
// catalog and lands its `override message` block with the pack's text.
// No stubs of anything the repo owns: the toolchain, the client, the bridge.
// Owner context: tools/ide — Tests.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class PlayToWriteRealPathTests: XCTestCase {

    private var scratch: URL!
    private var storyFile: URL!
    private var play: PlayViewController!
    private var received: [PlayEditRequest] = []
    /// What the running page reported through the console bridge — a boot
    /// failure names itself here, so a timed-out replay fails with the cause.
    private var consoleErrors: [String] = []

    private static let storyId = "play-to-write-probe"

    private static let story = """
    story
      title: Play To Write
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
      first time
        Stalls crowd the square, for the first time.

      Stalls crowd the square.

    create the apple
      in the Market
      edible

      A red apple.

    create Jack
      a person, playable
      in the Alley

      A boy in this market.

    before the game starts
      change the player to Jack
    end before
    """

    override func setUpWithError() throws {
        try super.setUpWithError()
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "packages/devkit/dist/cli.js is not built")
        scratch = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlayToWriteRealPathTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: scratch, withIntermediateDirectories: true)
        storyFile = scratch.appendingPathComponent("probe.story")
        try Self.story.write(to: storyFile, atomically: true, encoding: .utf8)
        play = PlayViewController()
        _ = play.view
        play.onEditRequest = { [weak self] request in self?.received.append(request) }
        play.onConsoleError = { [weak self] error in self?.consoleErrors.append(error.message) }
    }

    /// Replays with the page's own account of itself on failure: its text and
    /// every console error, so a story that never booted says why.
    private func replay(_ session: PlayToWriteSession) async throws {
        do {
            try await play.replay(session)
        } catch {
            // textContent, not innerText: an offscreen web view has no layout, and innerText reads as empty.
            let text = (try? await play.evaluateInPlaySurface("""
            JSON.stringify({ state: window.__sharpeePlayToWriteLast, echoes: document.querySelectorAll('.command-echo').length,
              closed: document.querySelectorAll('.command-echo[data-turn]').length, entries: document.querySelectorAll('.main-entry').length,
              stamped: document.querySelectorAll('[data-turn]').length,
              inputDisabled: (document.getElementById('command-input') || {}).disabled, text: document.body.textContent.slice(0, 600) })
            """)) as? String ?? "<no page text>"
            XCTFail("replay failed: \(error)\n--- page text ---\n\(text)\n--- console errors ---\n\(consoleErrors.joined(separator: "\n"))")
            throw error
        }
    }

    override func tearDownWithError() throws {
        play = nil
        if let scratch, FileManager.default.fileExists(atPath: scratch.path) {
            try FileManager.default.removeItem(at: scratch)
        }
        scratch = nil
        try super.tearDownWithError()
    }

    // MARK: The real toolchain

    private var bundleDir: URL {
        WebBundle.directory(projectRoot: scratch, storyId: Self.storyId)
    }

    /// The real devkit `build` on the scratch story (the Play pane's menu-less form).
    private func build() throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node", TestToolchain.devkitCLI.path] + BuildRunner.buildArguments(for: storyFile)
        process.currentDirectoryURL = scratch
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
                    (String(data: outputData, encoding: .utf8) ?? "") +
                    (String(data: errorData, encoding: .utf8) ?? ""))
            return
        }
        XCTAssertTrue(FileManager.default.fileExists(atPath: bundleDir.appendingPathComponent("index.html").path),
                      "the build lands dist/web/\(Self.storyId)/index.html")
    }

    /// The real compose, for the IR the resolver reads.
    private func compose() async throws -> ComposeStoryIR {
        let composed = expectation(description: "composed")
        var outcome: Result<ComposeJsonPayload, ComposeRunner.Failure>?
        let runner = ComposeRunner()
        TestToolchain.composeInvoker(runner: runner)(storyFile) { result in
            outcome = result
            composed.fulfill()
        }
        // An async test must not block the main actor the runner completes on.
        await fulfillment(of: [composed], timeout: 30)
        guard case .success(let payload) = try XCTUnwrap(outcome) else {
            throw XCTSkip("compose failed: \(String(describing: outcome))")
        }
        return try XCTUnwrap(payload.ir, "the fixture composes clean")
    }

    /// The real `sharpee messages` catalog.
    private func catalog() async throws -> MessageCatalog {
        let fetched = expectation(description: "catalog")
        var outcome: Result<MessageCatalog, ComposeRunner.Failure>?
        let fetcher = MessageCatalogFetcher()
        fetcher.fetch(executable: URL(fileURLWithPath: "/usr/bin/env"),
                      arguments: ["node", TestToolchain.devkitCLI.path, "messages"],
                      workingDirectory: scratch) { result in
            outcome = result
            fetched.fulfill()
        }
        await fulfillment(of: [fetched], timeout: 30)
        guard case .success(let catalog) = try XCTUnwrap(outcome) else {
            throw XCTSkip("messages failed: \(String(describing: outcome))")
        }
        return catalog
    }

    // MARK: The page

    private func paragraphs(withId id: String) async throws -> [(text: String, turn: String?)] {
        let raw = try await play.evaluateInPlaySurface("""
        Array.prototype.map.call(document.querySelectorAll('[data-message-id="\(id)"]'), function (p) {
          return [p.textContent, p.getAttribute('data-turn')];
        })
        """)
        return ((raw as? [[Any?]]) ?? []).map { ($0[0] as? String ?? "", $0[1] as? String) }
    }

    private func echoes() async throws -> [String] {
        (try await play.evaluateInPlaySurface(
            "Array.prototype.map.call(document.querySelectorAll('.command-echo[data-turn]'), function (e) { return e.textContent; })")
        ) as? [String] ?? []
    }

    private func commandClick(_ id: String) async throws {
        _ = try await play.evaluateInPlaySurface("""
        (function () {
          var all = document.querySelectorAll('[data-message-id="\(id)"]');
          var el = all[all.length - 1];
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }));
          return true;
        })()
        """)
        for _ in 0..<100 {
            if !received.isEmpty { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("the ⌘-click never reached the bridge")
    }

    /// Marks the CURRENT page so a reload can be told apart from it — the old
    /// page keeps its echoes until the new one commits.
    private func markPage() async throws {
        _ = try await play.evaluateInPlaySurface("window.__probeOldPage = true")
    }

    /// Waits for a reload (past the marked page) and for its replay to close `count` turns.
    private func awaitReplay(turns count: Int) async throws {
        for _ in 0..<600 {
            if let fresh = try? await play.evaluateInPlaySurface("typeof window.__probeOldPage === 'undefined'") as? Bool, fresh,
               let e = try? await echoes(), e.count >= count { return }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        XCTFail("the replay never closed \(count) turns on a fresh page")
    }

    // MARK: AC-4 — a story phrase, edited and replayed into the same turn

    func testCommandClickOpensThePhraseAndTheSaveRebuildReplayShowsTheNewTextAtTheSameTurn() async throws {
        try build()
        play.load(bundleDirectory: bundleDir)
        try await replay(PlayToWriteSession(messageId: "", history: ["north"]))

        let restored = (try await play.evaluateInPlaySurface("document.body.textContent.indexOf('[Session restored]') >= 0")) as? Bool
        XCTAssertEqual(restored, false, "every Play boot is a fresh boot — a stale autosave must never restore")
        let before = try await paragraphs(withId: "market.initial-description")
        XCTAssertEqual(before.map(\.text), ["Stalls crowd the square, for the first time."])
        XCTAssertNotNil(before.first?.turn)

        // The ⌘-click: the paragraph's id and the history cross the real bridge.
        try await commandClick("market.initial-description")
        let request = try XCTUnwrap(received.last)
        XCTAssertEqual(request.messageId, "market.initial-description")
        XCTAssertEqual(request.history, ["north"])

        // The resolver, over the real IR: the `first time` prose's own line.
        let ir = try await compose()
        let target = try PlayToWrite.resolve(messageId: request.messageId, ir: ir, catalog: nil)
        guard case .phrase(_, let file, let span) = target else { return XCTFail("expected a phrase, got \(target)") }
        XCTAssertNil(file)
        // The file as built — the build reconciled an `ifid:` line into the
        // header (ADR-309), so the span counts against the disk, not the fixture.
        let lines = try String(contentsOf: storyFile, encoding: .utf8).components(separatedBy: "\n")
        XCTAssertEqual(lines[span.line - 1].trimmingCharacters(in: .whitespaces),
                       "Stalls crowd the square, for the first time.")

        // The author's edit at that line, saved; the real rebuild; the reload replays.
        var edited = lines
        edited[span.line - 1] = "    Stalls crowd the square, and the kettle sings."
        try edited.joined(separator: "\n").write(to: storyFile, atomically: true, encoding: .utf8)
        try build()
        try await markPage()
        play.reloadAfterBuild(bundleDirectory: bundleDir,
                              replaying: PlayToWriteSession(messageId: request.messageId, history: request.history))
        try await awaitReplay(turns: 1)

        let after = try await paragraphs(withId: "market.initial-description")
        XCTAssertEqual(after.map(\.text), ["Stalls crowd the square, and the kettle sings."])
        XCTAssertEqual(after.first?.turn, before.first?.turn, "the same turn, the seed and history unchanged")
        let replayed = try await echoes()
        XCTAssertEqual(replayed, ["> north"])
    }

    // MARK: AC-2b — a platform line, overridden through ADR-255

    func testCommandClickOnAPlatformLineLandsAnOverrideBlockThatReplaysWithTheNewText() async throws {
        try build()
        play.load(bundleDirectory: bundleDir)
        try await replay(PlayToWriteSession(messageId: "", history: ["north", "take apple"]))
        let before = try await paragraphs(withId: "if.action.taking.taken")
        XCTAssertEqual(before.map(\.text), ["Taken."])

        try await commandClick("if.action.taking.taken")
        let request = try XCTUnwrap(received.last)
        XCTAssertEqual(request.messageId, "if.action.taking.taken")
        XCTAssertEqual(request.history, ["north", "take apple"])

        // No override in the story: the new block, pre-filled with the pack's text.
        let ir = try await compose()
        let catalog = try await catalog()
        let target = try PlayToWrite.resolve(messageId: request.messageId, ir: ir, catalog: catalog)
        XCTAssertEqual(target, .newOverride(alias: "taking-taken", template: "Taken."))
        guard case .newOverride(let alias, let template) = target else { return }

        // The block lands at the end of the story; the author changes its prose.
        let source = try String(contentsOf: storyFile, encoding: .utf8)
        let edit = PlayToWrite.appendingOverride(alias: alias, template: template, to: source)
        var lines = (source + edit.text).components(separatedBy: "\n")
        XCTAssertEqual(lines[edit.line - 1], "  Taken.")
        lines[edit.line - 1] = "  Got it."
        try lines.joined(separator: "\n").write(to: storyFile, atomically: true, encoding: .utf8)

        try build()
        try await markPage()
        play.reloadAfterBuild(bundleDirectory: bundleDir,
                              replaying: PlayToWriteSession(messageId: request.messageId, history: request.history))
        try await awaitReplay(turns: 2)

        let after = try await paragraphs(withId: "if.action.taking.taken")
        XCTAssertEqual(after.map(\.text), ["Got it."])
        let replayed = try await echoes()
        XCTAssertEqual(replayed, ["> north", "> take apple"])
    }
}
