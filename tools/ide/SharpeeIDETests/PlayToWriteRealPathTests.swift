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

    create the gems stallkeeper
      a person
      in the Market

      A stallkeeper behind a tray of glass.

    create Jack
      a person, playable
      in the Alley

      A boy in this market.

    define action humming
      grammar
        hum
      phrase hum-line

    define phrase hum-line
      A tune, half remembered.
    end phrase

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

    // MARK: D4c — the inline field, end to end

    private var inlineEdits: [PlayInlineEdit] = []
    private var commits: [PlayInlineCommit] = []

    /// The real coordinator over the real editor, wired the way the window wires it.
    private func coordinator(storyURL: URL) -> (PlayToWriteCoordinator, EditorViewController) {
        let editor = EditorViewController()
        _ = editor.view
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.onInlineEditRequested = { [weak self] edit in self?.inlineEdits.append(edit) }
        editor.onDocumentSaved = { url in coordinator.documentSaved(url, storyURL: storyURL) }
        play.onInlineCommit = { [weak self] commit in self?.commits.append(commit) }
        return (coordinator, editor)
    }

    /// Types into the open inline field and presses Enter, as the author would.
    private func typeIntoFieldAndCommit(_ text: String) async throws -> PlayInlineCommit {
        _ = try await play.evaluateInPlaySurface("""
        (function () {
          var f = document.querySelector('.sharpee-play-inline-edit');
          f.value = \(String(data: try JSONEncoder().encode(text), encoding: .utf8)!);
          f.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
          return true;
        })()
        """)
        for _ in 0..<100 {
            if let commit = commits.last { return commit }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("the inline commit never reached the bridge")
        throw XCTSkip("no commit")
    }

    func testCommandClickOnASingleTemplateOpensTheInlineFieldAndEnterRebuildsAndReplaysTheNewText() async throws {
        try build()
        play.load(bundleDirectory: bundleDir)
        try await replay(PlayToWriteSession(messageId: "", history: ["north"]))
        let before = try await paragraphs(withId: "market.initial-description")
        XCTAssertEqual(before.map(\.text), ["Stalls crowd the square, for the first time."])

        let ir = try await compose()
        let (coordinator, editor) = coordinator(storyURL: storyFile)
        var builds = 0
        coordinator.onBuildRequested = { builds += 1 }

        // The ⌘-click resolves to a single template: Play is asked for the
        // field, no editor tab opens, nothing is armed yet.
        try await commandClick("market.initial-description")
        coordinator.handle(try XCTUnwrap(received.last), storyURL: storyFile, ir: ir)
        let edit = try XCTUnwrap(inlineEdits.last)
        XCTAssertEqual(edit.template, "Stalls crowd the square, for the first time.")
        XCTAssertEqual(edit.messageId, "market.initial-description")
        XCTAssertTrue(editor.openDocumentURLs.isEmpty, "the author is typing in Play")
        XCTAssertNil(coordinator.session)

        // The field opens in the real page with the template; the author types and presses Enter.
        let opened = try await play.beginInlineEditInPlaySurface(edit)
        XCTAssertTrue(opened, "the field opened on the paragraph")
        let commit = try await typeIntoFieldAndCommit("Stalls crowd the square, and the kettle sings.")
        XCTAssertEqual(commit.history, ["north"])

        // The commit writes the source at the span (indent kept), saves, arms, asks for the build.
        coordinator.commit(commit, storyURL: storyFile, ir: ir)
        let onDisk = try String(contentsOf: storyFile, encoding: .utf8)
        XCTAssertTrue(onDisk.contains("  first time\n    Stalls crowd the square, and the kettle sings.\n"), "was:\n\(onDisk)")
        XCTAssertEqual(builds, 1)
        XCTAssertEqual(coordinator.session, PlayToWriteSession(messageId: "market.initial-description", history: ["north"]))

        // The real rebuild; the reload replays the session; the same turn shows the new text.
        try build()
        try await markPage()
        play.reloadAfterBuild(bundleDirectory: bundleDir, replaying: coordinator.takeSession())
        try await awaitReplay(turns: 1)
        let after = try await paragraphs(withId: "market.initial-description")
        XCTAssertEqual(after.map(\.text), ["Stalls crowd the square, and the kettle sings."])
        XCTAssertEqual(after.first?.turn, before.first?.turn, "the same turn, the seed and history unchanged")
    }

    func testAnInlineEditOfADefinePhraseBodyRewritesOnlyTheBodyAndReplays() async throws {
        try build()
        play.load(bundleDirectory: bundleDir)
        try await replay(PlayToWriteSession(messageId: "", history: ["hum"]))
        let before = try await paragraphs(withId: "hum-line")
        XCTAssertEqual(before.map(\.text), ["A tune, half remembered."])

        let ir = try await compose()
        let (coordinator, _) = coordinator(storyURL: storyFile)
        try await commandClick("hum-line")
        coordinator.handle(try XCTUnwrap(received.last), storyURL: storyFile, ir: ir)
        let edit = try XCTUnwrap(inlineEdits.last)
        XCTAssertEqual(edit.template, "A tune, half remembered.", "the block's body, not its header")

        let opened = try await play.beginInlineEditInPlaySurface(edit)
        XCTAssertTrue(opened, "the field opened on the paragraph")
        let commit = try await typeIntoFieldAndCommit("A tune, whole now.")
        coordinator.commit(commit, storyURL: storyFile, ir: ir)
        let onDisk = try String(contentsOf: storyFile, encoding: .utf8)
        XCTAssertTrue(onDisk.contains("define phrase hum-line\n  A tune, whole now.\nend phrase"), "was:\n\(onDisk)")

        try build()
        try await markPage()
        play.reloadAfterBuild(bundleDirectory: bundleDir, replaying: coordinator.takeSession())
        try await awaitReplay(turns: 1)
        let after = try await paragraphs(withId: "hum-line")
        XCTAssertEqual(after.map(\.text), ["A tune, whole now."])
    }

    // MARK: D4d — an ask reply becomes the character's own topic row, end to end

    func testCommandClickOnAnUnknownTopicReplyWritesTheCharactersTopicRowAndReplaysTheNewAnswerThenMergesASecond() async throws {
        try build()
        play.load(bundleDirectory: bundleDir)
        try await replay(PlayToWriteSession(messageId: "", history: ["north", "ask stallkeeper about gems"]))
        let before = try await paragraphs(withId: "if.action.asking.unknown_topic")
        XCTAssertEqual(before.map(\.text), ["The gems stallkeeper says, \"I don't know anything about that.\""])

        let ir = try await compose()
        let (coordinator, editor) = coordinator(storyURL: storyFile)
        coordinator.catalog = try await catalog()
        var builds = 0
        coordinator.onBuildRequested = { builds += 1 }

        // The ⌘-click carries the reply's facts across the real bridge, and
        // the coordinator asks for the inline field — no override block.
        try await commandClick("if.action.asking.unknown_topic")
        let request = try XCTUnwrap(received.last)
        XCTAssertEqual(request.facts["targetName"], "gems stallkeeper")
        XCTAssertEqual(request.facts["topic"], "gems")
        coordinator.handle(request, storyURL: storyFile, ir: ir)
        let edit = try XCTUnwrap(inlineEdits.last)
        XCTAssertEqual(edit.template, before[0].text, "the field starts from the reply being replaced")
        XCTAssertTrue(editor.openDocumentURLs.isEmpty)

        let opened = try await play.beginInlineEditInPlaySurface(edit)
        XCTAssertTrue(opened)
        let commit = try await typeIntoFieldAndCommit("'Gems?' He does not look up. 'Not for the likes of you.'")
        coordinator.commit(commit, storyURL: storyFile, ir: ir)
        var onDisk = try String(contentsOf: storyFile, encoding: .utf8)
        XCTAssertTrue(onDisk.contains("define topics for the gems stallkeeper\n  about \"gems\":\n    phrase gems-stallkeeper-on-gems\nend topics\n"), "was:\n\(onDisk)")
        XCTAssertTrue(onDisk.contains("define phrase gems-stallkeeper-on-gems\n  'Gems?' He does not look up. 'Not for the likes of you.'\nend phrase\n"))
        XCTAssertFalse(onDisk.contains("override message"), "the everywhere override was not the edit")
        // Beside the character: the block follows the stallkeeper's create block and precedes Jack's.
        let stallkeeperAt = try XCTUnwrap(onDisk.range(of: "create the gems stallkeeper")?.lowerBound)
        let blockAt = try XCTUnwrap(onDisk.range(of: "define topics for the gems stallkeeper")?.lowerBound)
        let phraseAt = try XCTUnwrap(onDisk.range(of: "define phrase gems-stallkeeper-on-gems")?.lowerBound)
        let jackAt = try XCTUnwrap(onDisk.range(of: "create Jack")?.lowerBound)
        XCTAssertTrue(stallkeeperAt < blockAt && blockAt < phraseAt && phraseAt < jackAt, "the code lands near its owner; file was:\n\(onDisk)")
        XCTAssertEqual(builds, 1)

        try build()
        try await markPage()
        play.reloadAfterBuild(bundleDirectory: bundleDir, replaying: coordinator.takeSession())
        try await awaitReplay(turns: 2)
        let answer = try await paragraphs(withId: "gems-stallkeeper-on-gems")
        XCTAssertEqual(answer.map(\.text), ["'Gems?' He does not look up. 'Not for the likes of you.'"])
        XCTAssertEqual(answer.first?.turn, before.first?.turn, "the same turn")
        let defaultLeft = try await paragraphs(withId: "if.action.asking.unknown_topic")
        XCTAssertTrue(defaultLeft.isEmpty, "the platform default no longer answers this character about gems; got \(defaultLeft.map(\.text))")

        // A second topic merges into the block the first one opened.
        received.removeAll(); inlineEdits.removeAll(); commits.removeAll()
        let ir2 = try await compose()
        XCTAssertEqual(ir2.allEntities.first { $0.id == "gems-stallkeeper" }?.topicCount, 1, "the real IR counts the row")
        try await play.replay(PlayToWriteSession(messageId: "", history: ["ask stallkeeper about prices"]))
        try await commandClick("if.action.asking.unknown_topic")
        coordinator.handle(try XCTUnwrap(received.last), storyURL: storyFile, ir: ir2)
        let opened2 = try await play.beginInlineEditInPlaySurface(try XCTUnwrap(inlineEdits.last))
        XCTAssertTrue(opened2)
        let commit2 = try await typeIntoFieldAndCommit("'Prices are for buyers.'")
        coordinator.commit(commit2, storyURL: storyFile, ir: ir2)
        onDisk = try String(contentsOf: storyFile, encoding: .utf8)
        XCTAssertTrue(onDisk.contains("  about \"gems\":\n    phrase gems-stallkeeper-on-gems\n  about \"prices\":\n    phrase gems-stallkeeper-on-prices\nend topics\n"), "was:\n\(onDisk)")
        XCTAssertEqual(onDisk.components(separatedBy: "define topics for the gems stallkeeper").count, 2, "one block, not two")
        let endTopicsAt = try XCTUnwrap(onDisk.range(of: "end topics")?.lowerBound)
        let pricesAt = try XCTUnwrap(onDisk.range(of: "define phrase gems-stallkeeper-on-prices")?.lowerBound)
        let jackAgainAt = try XCTUnwrap(onDisk.range(of: "create Jack")?.lowerBound)
        XCTAssertTrue(endTopicsAt < pricesAt && pricesAt < jackAgainAt, "the second phrase lands right after the block; file was:\n\(onDisk)")
        try build()
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
