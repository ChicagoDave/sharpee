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
