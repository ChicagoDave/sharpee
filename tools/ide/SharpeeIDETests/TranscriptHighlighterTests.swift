// TranscriptHighlighterTests.swift
// Covers the `.transcript` line classifier (ADR-277 D4): one table-driven case
// per line kind, the positional header rule (`key: value` is a header only
// before `---`), the extension routing split against the Chord highlighter
// (`.story` regression), and highlight()'s actual attribute mutation on an
// NSTextStorage. No golden fixture — D4's own ruling.

import XCTest
@testable import SharpeeIDE

final class TranscriptHighlighterTests: XCTestCase {

    private typealias Kind = TranscriptHighlighter.Classification

    // MARK: - Classification (table-driven, one line of each kind)

    func testClassifiesOneLineOfEachKind() {
        let table: [(line: String, expected: Kind)] = [
            ("title: Mini smoke", .header),
            ("---", .separator),
            ("# player enters the den", .comment),
            ("> take the brass lamp", .command),
            ("[OK: contains \"Taken\"]", .assertion),
            ("[GOAL: bank-puzzle]", .assertion),
            ("[WHILE: entity \"troll\" alive]", .assertion),
            ("$save checkpoint-1", .testCommand),
            ("$teleport kitchen", .testCommand),
            ("A small square den.", .expectedOutput),
        ]
        let kinds = TranscriptHighlighter.classify(lines: table.map(\.line))
        for (index, entry) in table.enumerated() {
            XCTAssertEqual(kinds[index], entry.expected, "line: \(entry.line)")
        }
    }

    func testHeaderIsPositionalKeyValueAfterSeparatorIsExpectedOutput() {
        let kinds = TranscriptHighlighter.classify(lines: [
            "title: Mini",
            "story: mini",
            "---",
            "note: this is story prose now",
        ])
        XCTAssertEqual(kinds, [.header, .header, .separator, .expectedOutput])
    }

    func testHashBracketIsAnAssertionFormNotAComment() {
        XCTAssertEqual(TranscriptHighlighter.classify(lines: ["#[something]"]), [.assertion])
    }

    func testProseWithColonIsNotAHeaderField() {
        // "The sign reads: KEEP OUT" has a colon but a multi-word key.
        XCTAssertEqual(TranscriptHighlighter.classify(lines: ["The sign reads: KEEP OUT"]),
                       [.expectedOutput])
    }

    // MARK: - Routing (the `.story` regression check)

    @MainActor
    func testExtensionRoutingSplitsCleanlyFromChordHighlighter() {
        let transcript = URL(fileURLWithPath: "/s/tests/a.transcript")
        let story = URL(fileURLWithPath: "/s/mini.story")
        let transcriptHighlighter = TranscriptHighlighter()
        let chordHighlighter = SyntaxHighlighter()

        XCTAssertTrue(transcriptHighlighter.canHighlight(transcript))
        XCTAssertFalse(transcriptHighlighter.canHighlight(story),
                       "`.story` stays on the ChordLexer path — never the line classifier")
        XCTAssertTrue(chordHighlighter.canHighlight(story))
        XCTAssertFalse(chordHighlighter.canHighlight(transcript))
    }

    // MARK: - Attribute mutation

    func testHighlightColorsLinesByKindAndResetsStalePasses() {
        let source = "title: T\n---\n\n> look\n# note\nplain prose\n"
        let storage = NSTextStorage(string: source)
        // Poison every character with a stale color; highlight() must reset it.
        storage.addAttribute(.foregroundColor, value: NSColor.systemPink,
                             range: NSRange(location: 0, length: (source as NSString).length))

        TranscriptHighlighter().highlight(storage)

        func color(atLineStartOf substring: String) -> NSColor? {
            let location = (source as NSString).range(of: substring).location
            return storage.attribute(.foregroundColor, at: location, effectiveRange: nil) as? NSColor
        }
        XCTAssertEqual(color(atLineStartOf: "title: T"), Theme.tokenKeyword)
        XCTAssertEqual(color(atLineStartOf: "> look"), Theme.tokenKeyword)
        XCTAssertEqual(color(atLineStartOf: "# note"), Theme.tokenComment)
        XCTAssertEqual(color(atLineStartOf: "plain prose"), Theme.foreground,
                       "expected output resets to base — the stale pink is gone")
    }
}
