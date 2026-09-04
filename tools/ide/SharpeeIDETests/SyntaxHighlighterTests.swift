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

    func testCanHighlightChordSourceOnly() {
        let h = SyntaxHighlighter()
        XCTAssertTrue(h.canHighlight(URL(fileURLWithPath: "/x/fernhill.story")))
        XCTAssertTrue(h.canHighlight(URL(fileURLWithPath: "/x/UPPER.STORY")))
        XCTAssertTrue(h.canHighlight(URL(fileURLWithPath: "/x/regions/harbor.chord")),
                      "an imported fragment is Chord source (ADR-251; GH #287)")
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
        // Chord 3.6.0 block nouns (ADR-325 timers, ADR-330 chapters); the
        // timer verbs and chapter reads stay uncolored by design.
        XCTAssertEqual(SyntaxHighlighter.color(for: token(.word, "timer")), Theme.tokenKeyword)
        XCTAssertEqual(SyntaxHighlighter.color(for: token(.word, "chapters")), Theme.tokenKeyword)
        XCTAssertNil(SyntaxHighlighter.color(for: token(.word, "interrupt")),
                     "timer verbs are statement verbs, never colored")
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

    // MARK: - Story-header properties

    /// Header fields color as properties, in their OWN color — a header must not
    /// read as though `title:` and `use` were the same kind of thing.
    func testStoryPropertiesColorDistinctlyFromStructuralKeywords() {
        let storage = highlighted("""
        story
          title: The Folly at Fernhill
          id: fernhill
          ifid: A1B2C3D4-E5F6-7890-ABCD-EF1234567890
          states: evening, midnight
          use scoring

        """)

        XCTAssertEqual(color(in: storage, of: "title"), Theme.tokenType)
        XCTAssertEqual(color(in: storage, of: "id:"), Theme.tokenType)
        XCTAssertEqual(color(in: storage, of: "ifid"), Theme.tokenType)

        XCTAssertEqual(color(in: storage, of: "states"), Theme.tokenKeyword,
                       "states stays a keyword — David asked for properties to differ from it")
        XCTAssertEqual(color(in: storage, of: "use"), Theme.tokenKeyword)
        XCTAssertNotEqual(Theme.tokenType, Theme.tokenKeyword,
                          "the two colors must actually be different")
    }

    /// An IFID is one identifier, not a number glued to words. The lexer stops a
    /// digit run at the first non-digit, so an unguarded highlighter painted
    /// `8221` of `8221EC69-…` as a numeric literal.
    func testAnIfidValueIsNotPartlyColoredAsANumber() {
        let storage = highlighted("""
        story
          id: fernhill
          ifid: 8221EC69-3D96-4F60-A057-99D1FE72000F

        """)

        XCTAssertEqual(color(in: storage, of: "8221"), Theme.foreground,
                       "the leading digits of an IFID are not a number")
        XCTAssertEqual(color(in: storage, of: "3D96"), Theme.foreground,
                       "nor are the digits leading each later group")
        XCTAssertEqual(color(in: storage, of: "99D1FE72000F"), Theme.foreground)
        XCTAssertEqual(color(in: storage, of: "ifid"), Theme.tokenType,
                       "the key still colors as a property")
    }

    func testRealNumericLiteralsStillColor() {
        let storage = highlighted("""
        story
          story-version: 0.3.0

        create the Hall
          a room

          on every turn while one chance in 12
            phrase distant-bell
          end on

        """)

        XCTAssertEqual(color(in: storage, of: "0.3.0"), Theme.tokenNumber,
                       "a version is a number and stays one")
        XCTAssertEqual(color(in: storage, of: "12"), Theme.tokenNumber,
                       "a standalone count is a number")
    }

    func testAPropertyNameWithoutItsColonIsNotAProperty() {
        let storage = highlighted("create the Book\n  a thing\n\n  The title is faded.\n")
        XCTAssertEqual(color(in: storage, of: "title"), Theme.foreground,
                       "a bare word in prose is prose — only `name:` is a property")
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
