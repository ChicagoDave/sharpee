// SyntaxHighlighterTests.swift
// Chord highlighting via the in-process ChordLexer (ADR-258 D7): token-kind →
// color mapping, whole-line comment coloring, the full-range base-foreground
// reset, and `.story`-only language gating. Real path — drives the actual
// lexer over real Chord source, no stub tokenizer.

import XCTest
import AppKit
@testable import SharpeeIDE

final class SyntaxHighlighterTests: XCTestCase {

    // MARK: - Language gating (pure)

    func testCanHighlightChordStoriesOnly() {
        let h = SyntaxHighlighter()
        XCTAssertTrue(h.canHighlight(URL(fileURLWithPath: "/x/fernhill.story")))
        XCTAssertTrue(h.canHighlight(URL(fileURLWithPath: "/x/UPPER.STORY")))
        XCTAssertFalse(h.canHighlight(URL(fileURLWithPath: "/x/foo.ts")),
                       "the TypeScript path is dropped (ADR-258 D1/D3)")
        XCTAssertFalse(h.canHighlight(URL(fileURLWithPath: "/x/readme.md")))
    }

    // MARK: - Token-kind mapping (pure)

    func testColorMapsByTokenKind() {
        func token(_ kind: ChordTokenKind, _ text: String) -> ChordToken {
            ChordToken(kind: kind, text: text,
                       span: DiagnosticSpan(line: 1, column: 1, endLine: 1, endColumn: 1 + text.count))
        }
        XCTAssertEqual(SyntaxHighlighter.color(for: token(.string, "hi")), Theme.tokenString)
        XCTAssertEqual(SyntaxHighlighter.color(for: token(.number, "1.0.0")), Theme.tokenNumber)
        XCTAssertEqual(SyntaxHighlighter.color(for: token(.compare, ">=")), Theme.tokenKeyword)
        XCTAssertEqual(SyntaxHighlighter.color(for: token(.word, "create")), Theme.tokenKeyword)
        XCTAssertEqual(SyntaxHighlighter.color(for: token(.word, "Create")), Theme.tokenKeyword,
                       "keyword match is case-insensitive")
        XCTAssertNil(SyntaxHighlighter.color(for: token(.word, "lighthouse")),
                     "non-keyword words stay at base foreground")
        XCTAssertNil(SyntaxHighlighter.color(for: token(.punct, "—")))
    }

    // MARK: - Real path: lex + color application over Chord source

    private func highlighted(_ source: String) -> NSTextStorage {
        let storage = NSTextStorage(string: source)
        SyntaxHighlighter().highlight(storage)
        return storage
    }

    private func color(in storage: NSTextStorage, of needle: String) -> NSColor? {
        let location = (storage.string as NSString).range(of: needle).location
        guard location != NSNotFound else { return nil }
        return storage.attribute(.foregroundColor, at: location, effectiveRange: nil) as? NSColor
    }

    func testHighlightColorsChordHeaderLine() {
        let storage = highlighted("story \"Probe\" by \"Tests\"\n  id: probe\n  version: 1.0.0\n")
        XCTAssertEqual(color(in: storage, of: "story"), Theme.tokenKeyword)
        XCTAssertEqual(color(in: storage, of: "Probe"), Theme.tokenString)
        XCTAssertEqual(color(in: storage, of: "1.0.0"), Theme.tokenNumber)
    }

    func testHighlightColorsCommentLineWhole() {
        let storage = highlighted("## a file header comment\n\ncreate the Lab\n")
        XCTAssertEqual(color(in: storage, of: "## a file"), Theme.tokenComment)
        XCTAssertEqual(color(in: storage, of: "comment"), Theme.tokenComment,
                       "the WHOLE comment line colors, not just the ## marker")
        XCTAssertEqual(color(in: storage, of: "create"), Theme.tokenKeyword)
    }

    func testHighlightLeavesProseAtBaseForeground() {
        let storage = highlighted("create the Lab\n  a room\n\n  Dust motes hang in the light.\n")
        XCTAssertEqual(color(in: storage, of: "Dust"), Theme.foreground,
                       "prose words are not colorized")
        XCTAssertEqual(color(in: storage, of: "Lab"), Theme.foreground,
                       "entity names are ordinary words to the token layer")
    }

    func testHighlightResetsStaleColors() {
        let storage = NSTextStorage(string: "story \"X\" by \"Y\"\n")
        let highlighter = SyntaxHighlighter()
        highlighter.highlight(storage)
        // Replace content with prose only — the old keyword color must not survive.
        storage.replaceCharacters(in: NSRange(location: 0, length: storage.length),
                                  with: "plain prose only\n")
        highlighter.highlight(storage)
        XCTAssertEqual(color(in: storage, of: "plain"), Theme.foreground)
    }

    func testHighlightHandlesCounterComparisons() {
        let storage = highlighted("  when strikes >= 3\n")
        XCTAssertEqual(color(in: storage, of: ">="), Theme.tokenKeyword)
        XCTAssertEqual(color(in: storage, of: "3"), Theme.tokenNumber)
    }
}
