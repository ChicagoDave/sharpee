// PlayToWriteResolverTests.swift
// Play-to-write's resolver (ADR-333 D4/D4a), pure: a story phrase resolves to
// its span with the fragment file riding along (D2); a platform message
// resolves to the story's existing override or to a new block pre-filled
// with the pack's template (D4a); a phrase the IR names without a `span`
// fails BY NAME — the guard the ADR asks for against IR-field drift.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

final class PlayToWriteResolverTests: XCTestCase {

    private func ir(_ json: String) throws -> ComposeStoryIR {
        let payload = try ComposeJsonPayload.decode(from: Data("""
        {"schemaVersion":2,"diagnostics":[],"ir":\(json)}
        """.utf8))
        return try XCTUnwrap(payload.ir)
    }

    private static let storyIR = """
    {"format":"story language 4","languageVersion":"5.3.0",
     "meta":{"title":"Probe","fields":{"id":"probe","authors":[]}},
     "entities":[],
     "phrases":{"defaultLocale":"en-US","locales":{"en-US":{
        "market.description":{"strategy":null,"variants":[],
                              "span":{"line":12,"column":3,"endLine":12,"endColumn":40}},
        "night-wind":{"strategy":null,"variants":[],
                      "span":{"file":"regions/harbor.chord","line":7,"column":5,"endLine":8,"endColumn":2}},
        "spanless":{"strategy":null,"variants":[]}}}},
     "messageOverrides":{"defaultLocale":"en-US","locales":{"en-US":{
        "taking-taken-from":{"strategy":null,"variants":[],
                             "span":{"line":30,"column":1,"endLine":32,"endColumn":13}}}}}}
    """

    private static let catalog = MessageCatalog(
        schemaVersion: 1, locale: "en-US",
        messages: [
            .init(id: "if.action.taking.taken", alias: "taking-taken", template: "Taken."),
            .init(id: "if.action.taking.taken_from", alias: "taking-taken-from", template: "{You} {take} {the item} from {the container}."),
        ])

    // MARK: Story phrases

    func testAStoryPhraseResolvesToItsSpanInTheMainFile() throws {
        let target = try PlayToWrite.resolve(messageId: "market.description", ir: ir(Self.storyIR), catalog: nil)
        XCTAssertEqual(target, .phrase(key: "market.description", file: nil,
                                       span: DiagnosticSpan(line: 12, column: 3, endLine: 12, endColumn: 40)))
    }

    func testAFragmentPhraseCarriesItsFile() throws {
        let target = try PlayToWrite.resolve(messageId: "night-wind", ir: ir(Self.storyIR), catalog: nil)
        guard case .phrase(_, let file, let span) = target else { return XCTFail("expected a phrase target, got \(target)") }
        XCTAssertEqual(file, "regions/harbor.chord")
        XCTAssertEqual(span.line, 7)
        XCTAssertEqual(span.file, "regions/harbor.chord")
    }

    /// The IR-drift guard: a phrase without its `span` never becomes a silent jump.
    func testAPhraseWithoutASpanFailsByName() throws {
        XCTAssertThrowsError(try PlayToWrite.resolve(messageId: "spanless", ir: ir(Self.storyIR), catalog: nil)) { error in
            XCTAssertEqual(error as? PlayToWriteError, .phraseSpanMissing(key: "spanless"))
        }
    }

    // MARK: Platform messages (D4a)

    func testAPlatformIdWithNoOverrideBecomesANewBlockWithThePacksTemplate() throws {
        let target = try PlayToWrite.resolve(messageId: "if.action.taking.taken", ir: ir(Self.storyIR), catalog: Self.catalog)
        XCTAssertEqual(target, .newOverride(alias: "taking-taken", template: "Taken."))
    }

    func testAPlatformIdTheStoryAlreadyOverridesOpensThatBlock() throws {
        let target = try PlayToWrite.resolve(messageId: "if.action.taking.taken_from", ir: ir(Self.storyIR), catalog: Self.catalog)
        XCTAssertEqual(target, .existingOverride(alias: "taking-taken-from", file: nil,
                                                 span: DiagnosticSpan(line: 30, column: 1, endLine: 32, endColumn: 13)))
    }

    func testAPlatformIdBeforeTheCatalogArrivesSaysSo() throws {
        XCTAssertThrowsError(try PlayToWrite.resolve(messageId: "if.action.taking.taken", ir: ir(Self.storyIR), catalog: nil)) { error in
            XCTAssertEqual(error as? PlayToWriteError, .catalogUnavailable(id: "if.action.taking.taken"))
        }
    }

    func testAnIdNeitherStoryNorCatalogKnowsIsUnknown() throws {
        XCTAssertThrowsError(try PlayToWrite.resolve(messageId: "if.action.nothing.here", ir: ir(Self.storyIR), catalog: Self.catalog)) { error in
            XCTAssertEqual(error as? PlayToWriteError, .unknownMessage(id: "if.action.nothing.here"))
        }
    }

    // MARK: The override block and where it lands

    func testTheOverrideBlockIndentsEveryTemplateLine() {
        XCTAssertEqual(PlayToWrite.overrideBlock(alias: "taking-taken", template: "Taken."),
                       "override message taking-taken\n  Taken.\nend override\n")
        XCTAssertEqual(PlayToWrite.overrideBlock(alias: "about-credits", template: "One.\n\nTwo."),
                       "override message about-credits\n  One.\n\n  Two.\nend override\n")
    }

    func testAppendingAfterATrailingNewlineSeparatesWithOneBlankLine() {
        let source = "story\n  title: P\n\ncreate the Lab\n  a room\n"
        let edit = PlayToWrite.appendingOverride(alias: "taking-taken", template: "Taken.", to: source)
        XCTAssertEqual(edit.offset, (source as NSString).length)
        XCTAssertEqual(edit.text, "\noverride message taking-taken\n  Taken.\nend override\n")
        // 5 source lines, one blank, the header on 7, the prose on 8.
        XCTAssertEqual(edit.line, 8)
        let result = source + edit.text
        XCTAssertEqual(result.components(separatedBy: "\n")[edit.line - 1], "  Taken.")
    }

    func testAppendingWithoutATrailingNewlineAddsIt() {
        let source = "create the Lab\n  a room"
        let edit = PlayToWrite.appendingOverride(alias: "taking-taken", template: "Taken.", to: source)
        XCTAssertEqual(edit.text, "\n\noverride message taking-taken\n  Taken.\nend override\n")
        let result = source + edit.text
        XCTAssertEqual(result.components(separatedBy: "\n")[edit.line - 1], "  Taken.")
    }

    // MARK: Topic rows (D4d)

    private static let peopleIR = """
    {"format":"story language 4","languageVersion":"5.3.0",
     "meta":{"title":"Probe","fields":{"id":"probe","authors":[]}},
     "entities":[
       {"id":"gems-stallkeeper","name":"gems stallkeeper","isPlayable":false,"kinds":[{"name":"person"}],
        "span":{"file":"market.chord","line":10,"column":1,"endLine":14,"endColumn":1},"topics":[]},
       {"id":"tobias","name":"Tobias","isPlayable":false,"kinds":[{"name":"person"}],
        "span":{"line":20,"column":1,"endLine":24,"endColumn":1},
        "topics":[{"filter":{"kind":"text","primary":"the boiler","aliases":["boiler"]},"body":[{"kind":"phrase","phraseKey":"tobias-boiler"}],"span":{}},
                  {"filter":{"kind":"text","primary":"the wares","aliases":[]},"body":[{"kind":"phrase","phraseKey":"st-for-sale"}],"span":{}}]},
       {"id":"hat-stallkeeper","name":"hat stallkeeper","isPlayable":false,"kinds":[{"name":"person"}],
        "span":{"line":30,"column":1,"endLine":34,"endColumn":1},
        "topics":[{"filter":{"kind":"text","primary":"the wares","aliases":[]},"body":[{"kind":"phrase","phraseKey":"st-for-sale"}],"span":{}}]}],
     "phrases":{"defaultLocale":"en-US","locales":{"en-US":{
        "st-opener":{"strategy":null,"variants":[{"text":"'What do you want?'","markers":[]}],"span":{"line":40,"column":1,"endLine":42,"endColumn":11}},
        "st-for-sale":{"strategy":null,"variants":[{"text":"Wares.","markers":[]}],"span":{"line":44,"column":1,"endLine":46,"endColumn":11}},
        "tobias-boiler":{"strategy":null,"variants":[{"text":"The boiler.","markers":[]}],"span":{"line":48,"column":1,"endLine":50,"endColumn":11}}}}}}
    """
    private static let facts = ["targetId": "a02", "targetName": "gems stallkeeper", "topic": "gems"]

    func testAnUnknownTopicReplyAboutAKnownCharacterIsThatCharactersTopicRow() throws {
        let target = try PlayToWrite.resolve(messageId: "if.action.asking.unknown_topic", ir: ir(Self.peopleIR),
                                             catalog: Self.catalog, facts: Self.facts)
        XCTAssertEqual(target, .topicRow(entityId: "gems-stallkeeper", entityName: "gems stallkeeper",
                                         file: "market.chord", topic: "gems", hasTopics: false,
                                         span: DiagnosticSpan(line: 10, column: 1, endLine: 14, endColumn: 1, file: "market.chord"),
                                         replacing: nil))
    }

    func testTheNameMatchIsCaseInsensitiveAndAnExistingTableIsReported() throws {
        let target = try PlayToWrite.resolve(messageId: "if.action.telling.not_interested", ir: ir(Self.peopleIR),
                                             catalog: Self.catalog, facts: ["targetName": "tobias", "topic": "the boiler"])
        XCTAssertEqual(target, .topicRow(entityId: "tobias", entityName: "Tobias", file: nil, topic: "the boiler", hasTopics: true,
                                         span: DiagnosticSpan(line: 20, column: 1, endLine: 24, endColumn: 1), replacing: nil))
    }

    func testHoldingOptionOrAnUnknownCharacterOrNoTopicFallsToTheOverride() throws {
        let catalog = MessageCatalog(schemaVersion: 1, locale: "en-US",
                                     messages: [.init(id: "if.action.asking.unknown_topic", alias: "asking-unknown-topic", template: "{capitalize the target} {verb:says target}, \"I don't know anything about that.\"")])
        let everywhere = try PlayToWrite.resolve(messageId: "if.action.asking.unknown_topic", ir: ir(Self.peopleIR),
                                                 catalog: catalog, facts: Self.facts, overrideEverywhere: true)
        guard case .newOverride(let alias, _) = everywhere else { return XCTFail("expected the override, got \(everywhere)") }
        XCTAssertEqual(alias, "asking-unknown-topic")
        let stranger = try PlayToWrite.resolve(messageId: "if.action.asking.unknown_topic", ir: ir(Self.peopleIR),
                                               catalog: catalog, facts: ["targetName": "a passing dog", "topic": "gems"])
        guard case .newOverride = stranger else { return XCTFail("a character the IR does not name is the override's, got \(stranger)") }
        let noTopic = try PlayToWrite.resolve(messageId: "if.action.asking.unknown_topic", ir: ir(Self.peopleIR),
                                              catalog: catalog, facts: ["targetName": "gems stallkeeper"])
        guard case .newOverride = noTopic else { return XCTFail("no topic, no row; got \(noTopic)") }
    }

    func testAGreetingRenderedForAnAskBecomesTheCharactersOwnRow() throws {
        // "ask stallkeeper about gems" on first contact renders the shared
        // greeting `st-opener` with the ask's facts on it (David, 2026-09-06:
        // editing that response must create the stallkeeper's own answer).
        let facts = ["actionId": "if.action.asking", "targetName": "gems stallkeeper", "topic": "gems"]
        let target = try PlayToWrite.resolve(messageId: "st-opener", ir: ir(Self.peopleIR), catalog: nil, facts: facts)
        guard case .topicRow(let id, _, _, let topic, _, _, let replacing) = target else { return XCTFail("expected a row, got \(target)") }
        XCTAssertEqual(id, "gems-stallkeeper"); XCTAssertEqual(topic, "gems"); XCTAssertNil(replacing)
    }

    func testARowsPhraseSharedWithAnotherCharacterIsRepointedNotEdited() throws {
        let facts = ["actionId": "if.action.asking", "targetName": "Tobias", "topic": "the wares"]
        let target = try PlayToWrite.resolve(messageId: "st-for-sale", ir: ir(Self.peopleIR), catalog: nil, facts: facts)
        guard case .topicRow(let id, _, _, let topic, let hasTopics, _, let replacing) = target else { return XCTFail("expected a row, got \(target)") }
        XCTAssertEqual(id, "tobias"); XCTAssertEqual(topic, "the wares"); XCTAssertTrue(hasTopics)
        XCTAssertEqual(replacing, "st-for-sale", "the row is repointed at a phrase of Tobias's own")
    }

    func testACharactersOwnUnsharedAnswerEditsInPlaceAndShiftOrOptionNeverMakeARow() throws {
        let facts = ["actionId": "if.action.asking", "targetName": "tobias", "topic": "boiler"]
        let own = try PlayToWrite.resolve(messageId: "tobias-boiler", ir: ir(Self.peopleIR), catalog: nil, facts: facts)
        guard case .phrase(let key, _, _) = own else { return XCTFail("expected the phrase itself, got \(own)") }
        XCTAssertEqual(key, "tobias-boiler")
        // Outside an ask, a story phrase is just a phrase.
        let plain = try PlayToWrite.resolve(messageId: "st-opener", ir: ir(Self.peopleIR), catalog: nil, facts: ["itemName": "apple"])
        guard case .phrase = plain else { return XCTFail("expected the phrase, got \(plain)") }
        // ⌥ keeps the phrase too (the everywhere edit of a story phrase IS editing it).
        let everywhere = try PlayToWrite.resolve(messageId: "st-opener", ir: ir(Self.peopleIR), catalog: nil,
                                                 facts: ["actionId": "if.action.asking", "targetName": "gems stallkeeper", "topic": "gems"],
                                                 overrideEverywhere: true)
        guard case .phrase = everywhere else { return XCTFail("expected the phrase, got \(everywhere)") }
    }

    func testRepointingARowRewritesOnlyThatPhraseLineAndAddsThePhraseAfterTheBlock() throws {
        let source = """
        create Tobias
          a person

          A groundskeeper.

        define topics for tobias
          about "the wares":
            phrase st-for-sale
          about "the boiler", "boiler":
            phrase tobias-boiler
        end topics

        define topics for the hat stallkeeper
          about "the wares":
            phrase st-for-sale
        end topics
        """
        let edits = try XCTUnwrap(PlayToWrite.topicRowEdits(source: source, entityName: "Tobias", entityId: "tobias",
                                                            topic: "the wares", text: "'Rope and more rope.'", replacing: "st-for-sale"))
        XCTAssertEqual(edits.count, 2)
        XCTAssertEqual(edits[1].length, ("st-for-sale" as NSString).length, "a replacement, not an insertion")
        var edited = source as NSString
        for edit in edits { edited = edited.replacingCharacters(in: NSRange(location: edit.offset, length: edit.length), with: edit.text) as NSString }
        XCTAssertEqual(edited as String, """
        create Tobias
          a person

          A groundskeeper.

        define topics for tobias
          about "the wares":
            phrase tobias-on-the-wares
          about "the boiler", "boiler":
            phrase tobias-boiler
        end topics

        define phrase tobias-on-the-wares
          'Rope and more rope.'
        end phrase

        define topics for the hat stallkeeper
          about "the wares":
            phrase st-for-sale
        end topics
        """)
    }

    func testTheTopicPhraseKeyIsTheEntityAndASlugOfTheTopic() {
        XCTAssertEqual(PlayToWrite.topicPhraseKey(entityId: "gems-stallkeeper", topic: "gems"), "gems-stallkeeper-on-gems")
        XCTAssertEqual(PlayToWrite.topicPhraseKey(entityId: "tobias", topic: "The Boiler's Fire!"), "tobias-on-the-boiler-s-fire")
        XCTAssertEqual(PlayToWrite.topicPhraseKey(entityId: "tobias", topic: "???"), "tobias-on-topic")
    }

    private static let marketSource = """
    create the gems stallkeeper
      a person
      in the Market

      A stallkeeper behind a tray of glass.

    create the apple
      in the Market

      A red apple.
    """

    func testANewTableAndItsPhraseLandRightAfterTheCharactersCreateBlock() throws {
        let edits = try XCTUnwrap(PlayToWrite.topicRowEdits(source: Self.marketSource, entityName: "gems stallkeeper",
                                                            entityId: "gems-stallkeeper", topic: "gems", text: "'Not for the likes of you.'"))
        XCTAssertEqual(edits.count, 1)
        let edited = (Self.marketSource as NSString).replacingCharacters(in: NSRange(location: edits[0].offset, length: 0), with: edits[0].text)
        XCTAssertEqual(edited, """
        create the gems stallkeeper
          a person
          in the Market

          A stallkeeper behind a tray of glass.

        define topics for the gems stallkeeper
          about "gems":
            phrase gems-stallkeeper-on-gems
        end topics

        define phrase gems-stallkeeper-on-gems
          'Not for the likes of you.'
        end phrase

        create the apple
          in the Market

          A red apple.
        """)
        XCTAssertEqual(edited.components(separatedBy: "\n")[edits[0].line - 1], "define topics for the gems stallkeeper", "line is the block's header")
    }

    func testWithoutACreateLineTheTableAndPhraseAreAppended() throws {
        // The character is declared elsewhere (an imported fragment, say): nothing to sit beside here.
        let edits = try XCTUnwrap(PlayToWrite.topicRowEdits(source: "story\n  title: P\n", entityName: "Lab",
                                                            entityId: "lab", topic: "x", text: "Y."))
        XCTAssertEqual(edits.count, 1)
        XCTAssertEqual(edits[0].offset, ("story\n  title: P\n" as NSString).length)
        XCTAssertEqual(edits[0].text, "\ndefine topics for the Lab\n  about \"x\":\n    phrase lab-on-x\nend topics\n\ndefine phrase lab-on-x\n  Y.\nend phrase\n")
    }

    func testAnExistingTableGainsTheRowBeforeItsEndAndThePhraseRightAfterTheBlock() throws {
        let source = """
        create the gems stallkeeper
          a person

          A stallkeeper.

        define topics for the gems stallkeeper
          about "prices":
            phrase gems-prices
        end topics

        create the apple
          in the Market
        """
        let edits = try XCTUnwrap(PlayToWrite.topicRowEdits(source: source, entityName: "Gems Stallkeeper",
                                                            entityId: "gems-stallkeeper", topic: "gems", text: "Two lines.\nOf answer."))
        XCTAssertEqual(edits.count, 2, "the phrase edit first (after the block), then the row (earlier offset)")
        XCTAssertGreaterThan(edits[0].offset, edits[1].offset)
        var edited = source as NSString
        for edit in edits { edited = edited.replacingCharacters(in: NSRange(location: edit.offset, length: 0), with: edit.text) as NSString }
        XCTAssertEqual(edited as String, """
        create the gems stallkeeper
          a person

          A stallkeeper.

        define topics for the gems stallkeeper
          about "prices":
            phrase gems-prices
          about "gems":
            phrase gems-stallkeeper-on-gems
        end topics

        define phrase gems-stallkeeper-on-gems
          Two lines.
          Of answer.
        end phrase

        create the apple
          in the Market
        """)
    }

    func testTheCreateBlockIsFoundInTheTextBeingEditedWhateverTheComposeSaid() {
        // A comment and a blank line inside the block, a `##` line after it,
        // and the whole file shifted by lines a compose never saw.
        let source = """
        ## a note the compose never saw
        ## and another

        create the Market
          a room

        create the Gems Stallkeeper
          a person
          ## his trade
          in the Market

          A stallkeeper behind a tray of glass.

        ## THE APPLE
        create the apple
          in the Market
        """
        XCTAssertEqual(PlayToWrite.createBlockEndLine(lines: source.components(separatedBy: "\n"), entityName: "gems stallkeeper"), 12)
        XCTAssertNil(PlayToWrite.createBlockEndLine(lines: source.components(separatedBy: "\n"), entityName: "nobody"))
        let edits = try! XCTUnwrap(PlayToWrite.topicRowEdits(source: source, entityName: "gems stallkeeper",
                                                             entityId: "gems-stallkeeper", topic: "gems", text: "No."))
        let edited = (source as NSString).replacingCharacters(in: NSRange(location: edits[0].offset, length: 0), with: edits[0].text)
        XCTAssertTrue(edited.contains("  A stallkeeper behind a tray of glass.\n\ndefine topics for the gems stallkeeper\n  about \"gems\":\n    phrase gems-stallkeeper-on-gems\nend topics\n\ndefine phrase gems-stallkeeper-on-gems\n  No.\nend phrase\n\n## THE APPLE\ncreate the apple"), "edited was:\n\(edited)")
    }

    func testATableWithoutItsEndYieldsNothing() {
        let broken = Self.marketSource + "\n\ndefine topics for the gems stallkeeper\n  about \"prices\":\n    phrase gems-prices\n"
        XCTAssertNil(PlayToWrite.topicRowEdits(source: broken, entityName: "gems stallkeeper", entityId: "gems-stallkeeper", topic: "gems", text: "x"))
    }

    // MARK: Inline editing (D4c)

    private static let source = """
    story
      title: Probe

    create the Market
      a room

      A market with {greet}.
      Second paragraph here.

    define phrase greet
      Hello there.
    end phrase

    define phrase moods, cycling
      Calm.

      Tense.
    end phrase

    override message taking-taken
      Got it.
    end override
    """

    func testASingleTemplateIsInlineEligibleAndACyclingOrMultiArmPhraseIsNot() {
        XCTAssertTrue(PlayToWrite.isInlineEligible(.init(key: "a", span: nil, strategy: nil, variantCount: 1)))
        XCTAssertFalse(PlayToWrite.isInlineEligible(.init(key: "b", span: nil, strategy: "cycling", variantCount: 1)))
        XCTAssertFalse(PlayToWrite.isInlineEligible(.init(key: "c", span: nil, strategy: nil, variantCount: 2)))
        XCTAssertFalse(PlayToWrite.isInlineEligible(.init(key: "d", span: nil, strategy: nil, variantCount: 0)))
    }

    func testAProseSpanYieldsTheProseWithContinuationIndentStrippedAndTheExactRange() throws {
        let span = DiagnosticSpan(line: 7, column: 3, endLine: 8, endColumn: 25)
        let template = try XCTUnwrap(PlayToWrite.inlineTemplate(source: Self.source, span: span))
        XCTAssertEqual(template.text, "A market with {greet}.\nSecond paragraph here.")
        XCTAssertEqual(template.kind, .prose)
        XCTAssertEqual(template.indent, "  ")
        XCTAssertEqual((Self.source as NSString).substring(with: template.range),
                       "A market with {greet}.\n  Second paragraph here.")
    }

    func testAProseReplacementReindentsContinuationLinesAndKeepsBlankLinesBlank() throws {
        let span = DiagnosticSpan(line: 7, column: 3, endLine: 8, endColumn: 25)
        let template = try XCTUnwrap(PlayToWrite.inlineTemplate(source: Self.source, span: span))
        XCTAssertEqual(template.replacement(for: "New line.\n\nAnother {greet}."), "New line.\n\n  Another {greet}.")
        let edited = (Self.source as NSString).replacingCharacters(in: template.range, with: template.replacement(for: "One line."))
        XCTAssertTrue(edited.contains("  a room\n\n  One line.\n\ndefine phrase greet"), "edited was:\n\(edited)")
    }

    func testABlockSpanYieldsOnlyTheBodyAndTheReplacementIndentsEveryLine() throws {
        let span = DiagnosticSpan(line: 10, column: 1, endLine: 12, endColumn: 11)
        let template = try XCTUnwrap(PlayToWrite.inlineTemplate(source: Self.source, span: span))
        XCTAssertEqual(template.text, "Hello there.")
        XCTAssertEqual(template.kind, .block)
        XCTAssertEqual((Self.source as NSString).substring(with: template.range), "  Hello there.")
        XCTAssertEqual(template.replacement(for: "Hi.\nTwice."), "  Hi.\n  Twice.")
        let edited = (Self.source as NSString).replacingCharacters(in: template.range, with: template.replacement(for: "Hi."))
        XCTAssertTrue(edited.contains("define phrase greet\n  Hi.\nend phrase"), "edited was:\n\(edited)")
    }

    func testAnOverrideBlockSpanIsABlockToo() throws {
        let span = DiagnosticSpan(line: 20, column: 1, endLine: 22, endColumn: 13)
        let template = try XCTUnwrap(PlayToWrite.inlineTemplate(source: Self.source, span: span))
        XCTAssertEqual(template.text, "Got it.")
        XCTAssertEqual(template.kind, .block)
    }

    func testASpanOutsideTheSourceOrABlockWithNoBodyYieldsNothing() {
        XCTAssertNil(PlayToWrite.inlineTemplate(source: Self.source, span: DiagnosticSpan(line: 40, column: 1, endLine: 41, endColumn: 1)))
        XCTAssertNil(PlayToWrite.inlineTemplate(source: "define phrase empty\nend phrase",
                                                span: DiagnosticSpan(line: 1, column: 1, endLine: 2, endColumn: 11)))
    }

    func testAppendingToAnEmptySourceStartsAtTheTop() {
        let edit = PlayToWrite.appendingOverride(alias: "taking-taken", template: "Taken.", to: "")
        XCTAssertEqual(edit.offset, 0)
        XCTAssertEqual(edit.line, 2)
        XCTAssertEqual(edit.text.components(separatedBy: "\n")[1], "  Taken.")
    }
}
