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

    func testAppendingToAnEmptySourceStartsAtTheTop() {
        let edit = PlayToWrite.appendingOverride(alias: "taking-taken", template: "Taken.", to: "")
        XCTAssertEqual(edit.offset, 0)
        XCTAssertEqual(edit.line, 2)
        XCTAssertEqual(edit.text.components(separatedBy: "\n")[1], "  Taken.")
    }
}
