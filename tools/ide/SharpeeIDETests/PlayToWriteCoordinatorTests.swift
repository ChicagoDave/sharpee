// PlayToWriteCoordinatorTests.swift
// The play-to-write round's glue (ADR-333 D4/D4a) against the REAL editor: a
// phrase click opens the story at the phrase's line and arms the round; a
// platform-line click lands the `override message` block IN THE EDITOR'S
// BUFFER (undoable, unsaved) and arms; a click before the catalog arrived
// fetches it through the injected source and resolves again; a save inside
// the story while armed requests the build, a save elsewhere or while
// disarmed does not; the reload takes the session once.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class PlayToWriteCoordinatorTests: XCTestCase {

    private var tmp: URL!
    private var storyURL: URL!
    private var editor: EditorViewController!

    private static let story = """
    story
      title: Probe
      id: probe

    create the Market
      a room

      Stalls crowd the square.

    define phrase moods, cycling
      Calm.

      Tense.
    end phrase

    define phrase greet
      Hello there.
    end phrase
    """

    /// `market.description` and `greet` are single templates (inline-eligible);
    /// `moods` cycles two arms (editor). Spans match `story` above.
    private static let ir = """
    {"format":"story language 4","languageVersion":"5.3.0",
     "meta":{"title":"Probe","fields":{"id":"probe","authors":[]}},
     "entities":[],
     "phrases":{"defaultLocale":"en-US","locales":{"en-US":{
        "market.description":{"strategy":null,"variants":[{"text":"Stalls crowd the square.","markers":[]}],
                              "span":{"line":8,"column":3,"endLine":8,"endColumn":27}},
        "moods":{"strategy":"cycling","variants":[{"text":"Calm.","markers":[]},{"text":"Tense.","markers":[]}],
                 "span":{"line":10,"column":1,"endLine":14,"endColumn":11}},
        "greet":{"strategy":null,"variants":[{"text":"Hello there.","markers":[]}],
                 "span":{"line":16,"column":1,"endLine":18,"endColumn":11}}}}}}
    """

    private static let catalog = MessageCatalog(
        schemaVersion: 1, locale: "en-US",
        messages: [.init(id: "if.action.taking.taken", alias: "taking-taken", template: "Taken.")])

    override func setUpWithError() throws {
        try super.setUpWithError()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlayToWriteCoordinatorTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        storyURL = tmp.appendingPathComponent("probe.story")
        try Self.story.write(to: storyURL, atomically: true, encoding: .utf8)
        editor = EditorViewController()
        _ = editor.view
    }

    override func tearDownWithError() throws {
        editor = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        try super.tearDownWithError()
    }

    private func decodedIR() throws -> ComposeStoryIR {
        let payload = try ComposeJsonPayload.decode(from: Data("""
        {"schemaVersion":2,"diagnostics":[],"ir":\(Self.ir)}
        """.utf8))
        return try XCTUnwrap(payload.ir)
    }

    private func request(_ id: String, history: [String]) -> PlayEditRequest {
        PlayEditRequest(messageId: id, turn: 1, text: "", history: history)
    }

    /// UTF-16 offset of the first character of a 1-based line in `text`.
    private func offset(ofLine line: Int, in text: String) -> Int {
        let lines = text.components(separatedBy: "\n")
        return (lines.prefix(line - 1).joined(separator: "\n") as NSString).length + (line > 1 ? 1 : 0)
    }

    // MARK: A story phrase

    func testACyclingPhraseClickOpensTheStoryAtThePhrasesLineAndArmsTheRound() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        var inline: [PlayInlineEdit] = []
        coordinator.onInlineEditRequested = { inline.append($0) }
        coordinator.handle(request("moods", history: ["look"]), storyURL: storyURL, ir: try decodedIR())

        XCTAssertEqual(editor.openDocumentURLs, [storyURL])
        let text = try XCTUnwrap(editor.currentText(of: storyURL))
        XCTAssertEqual(editor.activeSelection?.location, offset(ofLine: 10, in: text), "the caret sits on the block's line")
        XCTAssertEqual(coordinator.session, PlayToWriteSession(messageId: "moods", history: ["look"]))
        XCTAssertTrue(inline.isEmpty, "two arms and a strategy are the editor's, never the inline field's")
    }

    // MARK: Inline editing (D4c)

    func testASingleTemplateClickAsksPlayForTheInlineFieldAndOpensNoTabAndArmsNothing() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        var inline: [PlayInlineEdit] = []
        coordinator.onInlineEditRequested = { inline.append($0) }
        coordinator.handle(PlayEditRequest(messageId: "market.description", turn: 3, text: "Stalls crowd the square.", history: ["look"]),
                           storyURL: storyURL, ir: try decodedIR())

        XCTAssertEqual(inline, [PlayInlineEdit(messageId: "market.description", turn: 3, template: "Stalls crowd the square.")])
        XCTAssertTrue(editor.openDocumentURLs.isEmpty, "the author is typing in Play, not the editor")
        XCTAssertNil(coordinator.session, "an Escape must leave nothing armed")
    }

    func testAnInlineCommitRewritesTheProseSavesTheFileArmsAndAsksForTheBuild() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        var builds = 0
        coordinator.onBuildRequested = { builds += 1 }
        editor.onDocumentSaved = { url in coordinator.documentSaved(url, storyURL: self.storyURL) }

        coordinator.commit(PlayInlineCommit(messageId: "market.description", turn: 3,
                                            text: "Stalls crowd the {square}.\nRain on the awnings.", history: ["look", "wait"]),
                           storyURL: storyURL, ir: try decodedIR())

        let onDisk = try String(contentsOf: storyURL, encoding: .utf8)
        XCTAssertTrue(onDisk.contains("  a room\n\n  Stalls crowd the {square}.\n  Rain on the awnings.\n\ndefine phrase moods"),
                      "the file carries the new prose, continuation line re-indented; was:\n\(onDisk)")
        XCTAssertFalse(editor.hasUnsavedChanges(at: storyURL), "the commit saved")
        XCTAssertEqual(coordinator.session, PlayToWriteSession(messageId: "market.description", history: ["look", "wait"]))
        XCTAssertEqual(builds, 1, "the save asked for the build, as ⌘S would")
    }

    func testAnInlineCommitOnADefinePhraseRewritesOnlyTheBody() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.commit(PlayInlineCommit(messageId: "greet", turn: nil, text: "Hi.\nTwice.", history: []),
                           storyURL: storyURL, ir: try decodedIR())

        let onDisk = try String(contentsOf: storyURL, encoding: .utf8)
        XCTAssertTrue(onDisk.contains("define phrase greet\n  Hi.\n  Twice.\nend phrase"), "was:\n\(onDisk)")
        XCTAssertTrue(onDisk.contains("define phrase moods, cycling\n  Calm.\n\n  Tense.\nend phrase"), "the neighbour is untouched")
        XCTAssertNotNil(coordinator.session)
    }

    func testAnInlineCommitOnAnIneligibleParagraphReportsAndWritesNothing() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        var reported: [String] = []
        coordinator.onUnresolved = { request, _ in reported.append(request.messageId) }
        coordinator.commit(PlayInlineCommit(messageId: "moods", turn: nil, text: "Only one.", history: []),
                           storyURL: storyURL, ir: try decodedIR())

        XCTAssertEqual(reported, ["moods"])
        XCTAssertEqual(try String(contentsOf: storyURL, encoding: .utf8), Self.story, "nothing wrote the file")
        XCTAssertNil(coordinator.session)
    }

    // MARK: A platform line (D4a)

    func testAPlatformLineClickLandsTheOverrideBlockInTheBufferUnsaved() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.catalog = Self.catalog
        coordinator.handle(request("if.action.taking.taken", history: ["take apple"]), storyURL: storyURL, ir: try decodedIR())

        let buffer = try XCTUnwrap(editor.currentText(of: storyURL))
        XCTAssertTrue(buffer.hasSuffix("\n\noverride message taking-taken\n  Taken.\nend override\n"), "buffer was:\n\(buffer)")
        XCTAssertTrue(editor.hasUnsavedChanges(at: storyURL), "an ordinary typing edit — the author saves it")
        XCTAssertEqual(try String(contentsOf: storyURL, encoding: .utf8), Self.story, "nothing wrote the file behind the author")
        let proseLine = buffer.components(separatedBy: "\n").firstIndex(of: "  Taken.")! + 1
        XCTAssertEqual(editor.activeSelection?.location, offset(ofLine: proseLine, in: buffer))
        XCTAssertEqual(coordinator.session?.history, ["take apple"])
    }

    func testAPlatformLineBeforeTheCatalogFetchesItThenResolves() throws {
        var asked: [URL] = []
        let coordinator = PlayToWriteCoordinator(editor: editor) { storyFile, completion in
            asked.append(storyFile)
            completion(.success(Self.catalog))
        }
        coordinator.handle(request("if.action.taking.taken", history: []), storyURL: storyURL, ir: try decodedIR())

        XCTAssertEqual(asked, [storyURL])
        XCTAssertEqual(coordinator.catalog, Self.catalog)
        XCTAssertTrue(try XCTUnwrap(editor.currentText(of: storyURL)).contains("override message taking-taken"))
        XCTAssertNotNil(coordinator.session)
    }

    func testAnUnresolvableParagraphReportsAndArmsNothing() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor) { _, completion in completion(.success(Self.catalog)) }
        var reported: [String] = []
        coordinator.onUnresolved = { request, _ in reported.append(request.messageId) }
        coordinator.handle(request("if.action.nothing.here", history: []), storyURL: storyURL, ir: try decodedIR())

        XCTAssertEqual(reported, ["if.action.nothing.here"])
        XCTAssertNil(coordinator.session)
        XCTAssertTrue(editor.openDocumentURLs.isEmpty)
    }

    // MARK: Topic rows (D4d)

    private static let market = """
    create the gems stallkeeper
      a person
      in the Market

      A stallkeeper behind a tray of glass.
    """

    /// The IR above plus the stallkeeper, declared in `market.chord`.
    private static let irWithStallkeeper = ir.replacingOccurrences(of: "\"entities\":[]", with: """
    "entities":[{"id":"gems-stallkeeper","name":"gems stallkeeper","isPlayable":false,"kinds":[{"name":"person"}],
                 "span":{"file":"market.chord","line":1,"column":1,"endLine":5,"endColumn":40},"topics":[]}]
    """)

    private func decodedIRWithStallkeeper() throws -> ComposeStoryIR {
        let payload = try ComposeJsonPayload.decode(from: Data("""
        {"schemaVersion":2,"diagnostics":[],"ir":\(Self.irWithStallkeeper)}
        """.utf8))
        return try XCTUnwrap(payload.ir)
    }

    private static let reply = "The gems stallkeeper says, \"I don't know anything about that.\""
    private static let askFacts = ["targetId": "a02", "targetName": "gems stallkeeper", "topic": "gems"]

    func testAnUnknownTopicClickOpensTheInlineFieldOnTheReplyAndOpensNoTab() throws {
        let marketURL = tmp.appendingPathComponent("market.chord")
        try Self.market.write(to: marketURL, atomically: true, encoding: .utf8)
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.catalog = Self.catalog
        var inline: [PlayInlineEdit] = []
        coordinator.onInlineEditRequested = { inline.append($0) }

        coordinator.handle(PlayEditRequest(messageId: "if.action.asking.unknown_topic", turn: 2, text: Self.reply,
                                           history: ["ask stallkeeper about gems"], facts: Self.askFacts),
                           storyURL: storyURL, ir: try decodedIRWithStallkeeper())

        XCTAssertEqual(inline, [PlayInlineEdit(messageId: "if.action.asking.unknown_topic", turn: 2, template: Self.reply)],
                       "the field starts from the reply being replaced")
        XCTAssertTrue(editor.openDocumentURLs.isEmpty)
        XCTAssertNil(coordinator.session)
        XCTAssertEqual(try String(contentsOf: storyURL, encoding: .utf8), Self.story, "no override block landed")
    }

    func testTheInlineCommitWritesTheRowAndPhraseIntoTheCharactersFileSavesAndArms() throws {
        let marketURL = tmp.appendingPathComponent("market.chord")
        try Self.market.write(to: marketURL, atomically: true, encoding: .utf8)
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.catalog = Self.catalog
        coordinator.onInlineEditRequested = { _ in }
        var builds = 0
        coordinator.onBuildRequested = { builds += 1 }
        editor.onDocumentSaved = { url in coordinator.documentSaved(url, storyURL: self.storyURL) }
        let ir = try decodedIRWithStallkeeper()
        coordinator.handle(PlayEditRequest(messageId: "if.action.asking.unknown_topic", turn: 2, text: Self.reply,
                                           history: ["ask stallkeeper about gems"], facts: Self.askFacts), storyURL: storyURL, ir: ir)

        coordinator.commit(PlayInlineCommit(messageId: "if.action.asking.unknown_topic", turn: 2,
                                            text: "'Gems?' He does not look up. 'Not for the likes of you.'",
                                            history: ["ask stallkeeper about gems"]), storyURL: storyURL, ir: ir)

        let onDisk = try String(contentsOf: marketURL, encoding: .utf8)
        XCTAssertEqual(onDisk, """
        create the gems stallkeeper
          a person
          in the Market

          A stallkeeper behind a tray of glass.

        define topics for the gems stallkeeper
          about "gems":
            phrase gems-stallkeeper-on-gems
        end topics

        define phrase gems-stallkeeper-on-gems
          'Gems?' He does not look up. 'Not for the likes of you.'
        end phrase
        """, "the block and phrase land right after the character")
        XCTAssertEqual(try String(contentsOf: storyURL, encoding: .utf8), Self.story, "the story file is untouched")
        XCTAssertFalse(editor.hasUnsavedChanges(at: marketURL), "saved")
        XCTAssertEqual(coordinator.session, PlayToWriteSession(messageId: "if.action.asking.unknown_topic", history: ["ask stallkeeper about gems"]))
        XCTAssertEqual(builds, 1)
    }

    func testACommitStillLandsWhenTheComposeHasMovedOnAndReportsWhenNothingWasArmed() throws {
        let marketURL = tmp.appendingPathComponent("market.chord")
        try Self.market.write(to: marketURL, atomically: true, encoding: .utf8)
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.catalog = Self.catalog
        coordinator.onInlineEditRequested = { _ in }
        var reported: [String] = []
        coordinator.onUnresolved = { request, _ in reported.append(request.messageId) }
        coordinator.handle(PlayEditRequest(messageId: "if.action.asking.unknown_topic", turn: 2, text: Self.reply,
                                           history: [], facts: Self.askFacts), storyURL: storyURL, ir: try decodedIRWithStallkeeper())

        // The compose is gone (nil IR): the armed round still writes.
        coordinator.commit(PlayInlineCommit(messageId: "if.action.asking.unknown_topic", turn: 2, text: "'No.'", history: []),
                           storyURL: storyURL, ir: nil)
        XCTAssertTrue(try String(contentsOf: marketURL, encoding: .utf8).contains("phrase gems-stallkeeper-on-gems"))
        XCTAssertTrue(reported.isEmpty)

        // Nothing armed and no compose: reported, never silent.
        coordinator.commit(PlayInlineCommit(messageId: "if.action.asking.unknown_topic", turn: 2, text: "'No.'", history: []),
                           storyURL: storyURL, ir: nil)
        XCTAssertEqual(reported, ["if.action.asking.unknown_topic"])
    }

    func testEditingASharedAnswerRepointsTheCharactersRowAtANewPhraseOnDisk() throws {
        // Two stallkeepers share `st-for-sale`; editing it while asking the gems
        // stallkeeper about the wares gives HIM a phrase of his own.
        let marketURL = tmp.appendingPathComponent("market.chord")
        try """
        create the gems stallkeeper
          a person
          in the Market

          A stallkeeper behind a tray of glass.

        define topics for the gems stallkeeper
          about "the wares":
            phrase st-for-sale
        end topics

        create the hat stallkeeper
          a person
          in the Market

          Hats.

        define topics for the hat stallkeeper
          about "the wares":
            phrase st-for-sale
        end topics

        define phrase st-for-sale
          'Wares.'
        end phrase
        """.write(to: marketURL, atomically: true, encoding: .utf8)
        let ir = try ComposeJsonPayload.decode(from: Data("""
        {"schemaVersion":2,"diagnostics":[],"ir":{"format":"story language 4","languageVersion":"5.3.0",
         "meta":{"title":"Probe","fields":{"id":"probe","authors":[]}},
         "entities":[
           {"id":"gems-stallkeeper","name":"gems stallkeeper","isPlayable":false,"kinds":[{"name":"person"}],
            "span":{"file":"market.chord","line":1,"column":1,"endLine":5,"endColumn":40},
            "topics":[{"filter":{"kind":"text","primary":"the wares","aliases":[]},"body":[{"kind":"phrase","phraseKey":"st-for-sale"}],"span":{}}]},
           {"id":"hat-stallkeeper","name":"hat stallkeeper","isPlayable":false,"kinds":[{"name":"person"}],
            "span":{"file":"market.chord","line":12,"column":1,"endLine":16,"endColumn":8},
            "topics":[{"filter":{"kind":"text","primary":"the wares","aliases":[]},"body":[{"kind":"phrase","phraseKey":"st-for-sale"}],"span":{}}]}],
         "phrases":{"defaultLocale":"en-US","locales":{"en-US":{
           "st-for-sale":{"strategy":null,"variants":[{"text":"'Wares.'","markers":[]}],"span":{"file":"market.chord","line":23,"column":1,"endLine":25,"endColumn":11}}}}}}}
        """.utf8)).ir!
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.onInlineEditRequested = { _ in }
        editor.onDocumentSaved = { url in coordinator.documentSaved(url, storyURL: self.storyURL) }

        coordinator.handle(PlayEditRequest(messageId: "st-for-sale", turn: 2, text: "'Wares.'", history: ["ask stallkeeper about the wares"],
                                           facts: ["actionId": "if.action.asking", "targetName": "gems stallkeeper", "topic": "the wares"]),
                           storyURL: storyURL, ir: ir)
        coordinator.commit(PlayInlineCommit(messageId: "st-for-sale", turn: 2, text: "'Glass, mostly. Some of it is even real.'",
                                            history: ["ask stallkeeper about the wares"]), storyURL: storyURL, ir: ir)

        let onDisk = try String(contentsOf: marketURL, encoding: .utf8)
        XCTAssertTrue(onDisk.contains("define topics for the gems stallkeeper\n  about \"the wares\":\n    phrase gems-stallkeeper-on-the-wares\nend topics\n\ndefine phrase gems-stallkeeper-on-the-wares\n  'Glass, mostly. Some of it is even real.'\nend phrase\n"), "was:\n\(onDisk)")
        XCTAssertTrue(onDisk.contains("define topics for the hat stallkeeper\n  about \"the wares\":\n    phrase st-for-sale\nend topics"), "the hat stallkeeper keeps the shared phrase")
        XCTAssertTrue(onDisk.contains("define phrase st-for-sale\n  'Wares.'\nend phrase"), "the shared phrase itself is untouched")
        XCTAssertNotNil(coordinator.session)
    }

    func testHoldingShiftGoesToTheCodeInsteadOfOpeningTheField() throws {
        let marketURL = tmp.appendingPathComponent("market.chord")
        try Self.market.write(to: marketURL, atomically: true, encoding: .utf8)
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.catalog = Self.catalog
        var inline: [PlayInlineEdit] = []
        coordinator.onInlineEditRequested = { inline.append($0) }

        // A single template: the editor opens at the prose, no field.
        coordinator.handle(PlayEditRequest(messageId: "market.description", turn: 1, text: "Stalls crowd the square.",
                                           history: ["look"], goToSource: true), storyURL: storyURL, ir: try decodedIR())
        XCTAssertTrue(inline.isEmpty)
        XCTAssertEqual(editor.openDocumentURLs, [storyURL])
        let text = try XCTUnwrap(editor.currentText(of: storyURL))
        XCTAssertEqual(editor.activeSelection?.location, offset(ofLine: 8, in: text), "the caret sits on the prose's line")
        XCTAssertEqual(coordinator.session, PlayToWriteSession(messageId: "market.description", history: ["look"]))

        // A reply the character has no answer for: the character's block opens.
        coordinator.handle(PlayEditRequest(messageId: "if.action.asking.unknown_topic", turn: 2, text: Self.reply,
                                           history: ["ask stallkeeper about gems"], facts: Self.askFacts, goToSource: true),
                           storyURL: storyURL, ir: try decodedIRWithStallkeeper())
        XCTAssertTrue(inline.isEmpty)
        XCTAssertEqual(editor.openDocumentURLs, [storyURL, marketURL])
        XCTAssertEqual(try String(contentsOf: marketURL, encoding: .utf8), Self.market, "nothing written")
        XCTAssertEqual(coordinator.session?.messageId, "if.action.asking.unknown_topic")
    }

    func testHoldingOptionStillLandsTheEverywhereOverride() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.catalog = MessageCatalog(schemaVersion: 1, locale: "en-US",
                                             messages: [.init(id: "if.action.asking.unknown_topic", alias: "asking-unknown-topic", template: "Nope.")])
        var inline: [PlayInlineEdit] = []
        coordinator.onInlineEditRequested = { inline.append($0) }
        coordinator.handle(PlayEditRequest(messageId: "if.action.asking.unknown_topic", turn: 2, text: Self.reply, history: [],
                                           facts: Self.askFacts, overrideEverywhere: true),
                           storyURL: storyURL, ir: try decodedIRWithStallkeeper())
        XCTAssertTrue(inline.isEmpty)
        XCTAssertTrue(try XCTUnwrap(editor.currentText(of: storyURL)).contains("override message asking-unknown-topic\n  Nope.\nend override"))
        XCTAssertNotNil(coordinator.session)
    }

    // MARK: The save that finishes the edit

    func testASaveInsideTheStoryWhileArmedRequestsTheBuild() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        var builds = 0
        coordinator.onBuildRequested = { builds += 1 }

        coordinator.documentSaved(storyURL, storyURL: storyURL)
        XCTAssertEqual(builds, 0, "not armed: a save is just a save")

        // `moods` cycles, so the click takes the editor path and arms at once
        // (a single template arms only when its inline field commits — D4c).
        coordinator.handle(request("moods", history: ["look"]), storyURL: storyURL, ir: try decodedIR())
        coordinator.documentSaved(tmp.appendingPathComponent("../elsewhere.story"), storyURL: storyURL)
        XCTAssertEqual(builds, 0, "a save outside the story never builds")
        coordinator.documentSaved(storyURL, storyURL: nil)
        XCTAssertEqual(builds, 0, "no story, no build")

        coordinator.documentSaved(storyURL, storyURL: storyURL)
        XCTAssertEqual(builds, 1)

        XCTAssertEqual(coordinator.takeSession(), PlayToWriteSession(messageId: "moods", history: ["look"]))
        XCTAssertNil(coordinator.takeSession(), "the reload takes the session once")
        coordinator.documentSaved(storyURL, storyURL: storyURL)
        XCTAssertEqual(builds, 1, "disarmed after the reload took it")
    }

    func testResetDisarmsAndForgetsTheCatalog() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.catalog = Self.catalog
        coordinator.handle(request("moods", history: []), storyURL: storyURL, ir: try decodedIR())
        XCTAssertNotNil(coordinator.session, "the editor path arms at the click")
        coordinator.reset()
        XCTAssertNil(coordinator.session)
        XCTAssertNil(coordinator.catalog)
    }
}
