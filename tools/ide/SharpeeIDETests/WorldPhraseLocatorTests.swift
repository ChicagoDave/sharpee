// WorldPhraseLocatorTests.swift
// A finding points at its phrase, not at the top of the passage that holds it
// (ADR-321 Amendment 2). Runs against the REAL Ides of March source where it can,
// because the case that made this necessary — *tiring-house door* on line 37 of a
// passage that starts on 34 — only exists in real prose.

import XCTest
@testable import SharpeeIDE

@MainActor
final class WorldPhraseLocatorTests: XCTestCase {

    private let passage = WorldSourceSpan(line: 34, column: 3, endLine: 38, endColumn: 14)

    /// A four-line description, as the author wrote it — phrase on the fourth line.
    private let source = """
    ## rooms

    create the Stage
      a room

      The stage of the new Globe, raw oak still pale from the saw. Two
      pillars painted like marble hold up the heavens, and the house's
      first play is chalked on the plot-board: JULIUS CAESAR. The
      tiring-house door stands west; the yard is south, over the lip of
      the boards.
    """

    /// The line the phrase is ON, not the line the passage starts on.
    func testFindsThePhraseInsideItsPassage() throws {
        // The passage occupies lines 6-10 of the fixture above.
        let span = WorldSourceSpan(line: 6, column: 3, endLine: 10, endColumn: 14)
        let located = try XCTUnwrap(WorldPhraseLocator.locate(phrase: "tiring-house door",
                                                              in: source, passage: span))
        XCTAssertEqual(located.line, 9, "the phrase is on the fourth line of the passage")
        XCTAssertEqual(located.endLine, 9)
        let lines = source.components(separatedBy: .newlines)
        let text = lines[located.line - 1]
        let start = text.index(text.startIndex, offsetBy: located.column - 1)
        let end = text.index(text.startIndex, offsetBy: located.endColumn - 1)
        XCTAssertEqual(String(text[start..<end]), "tiring-house door",
                       "the columns must bracket the phrase itself")
    }

    /// The author's line break falls where it falls; the locale table's does not.
    func testFindsAPhraseBrokenAcrossTwoLines() throws {
        let span = WorldSourceSpan(line: 6, column: 3, endLine: 10, endColumn: 14)
        let located = try XCTUnwrap(WorldPhraseLocator.locate(phrase: "first play",
                                                              in: source, passage: span))
        XCTAssertEqual(located.line, 8, "\"first\" opens line 8 after \"play\" ended line 7")
    }

    /// A word inside a longer word is not the phrase.
    func testDoesNotMatchInsideAnotherWord() throws {
        let span = WorldSourceSpan(line: 6, column: 3, endLine: 10, endColumn: 14)
        let located = try XCTUnwrap(WorldPhraseLocator.locate(phrase: "oak", in: source, passage: span))
        XCTAssertEqual(located.line, 6, "\"raw oak\" on line 6, never \"boards\" or \"plot-board\"")
    }

    /// The search never leaves the passage it was given.
    func testStaysInsideThePassageAndFallsBackToItsFirstLine() throws {
        let span = WorldSourceSpan(line: 3, column: 1, endLine: 4, endColumn: 9)
        let located = try XCTUnwrap(WorldPhraseLocator.locate(phrase: "tiring-house door",
                                                              in: source, passage: span))
        XCTAssertEqual(located.line, 3,
                       "the phrase is outside this passage — fall back to its first line, never jump away")
    }

    /// No passage, nowhere to go.
    func testNoPassageIsNoDestination() {
        XCTAssertNil(WorldPhraseLocator.locate(phrase: "anything", in: source, passage: nil))
    }

    /// The case from the screenshot, against the story on disk.
    func testLocatesTheRealIdesOfMarchPhrase() throws {
        let story = TestToolchain.repoRoot
            .appendingPathComponent("branch-stories/ides-of-march/ides-of-march.story")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: story.path),
                          "ides-of-march fixture not present in this checkout")
        let text = try String(contentsOf: story, encoding: .utf8)

        let located = try XCTUnwrap(WorldPhraseLocator.locate(phrase: "tiring-house door",
                                                              in: text, passage: passage))
        XCTAssertEqual(located.line, 37,
                       "stage.description spans 34-38 and the door is named on 37 — the row used to select 34")
    }
}
