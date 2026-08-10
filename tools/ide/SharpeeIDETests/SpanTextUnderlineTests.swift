// SpanTextUnderlineTests.swift
// An underline is a point-at gesture, so a block-scoped diagnostic must not
// paint its whole block. The case that surfaced this was real: a warning
// reported against `branch-stories/fernhill`'s whole `story` block, line 5
// column 1 to line 20 column 9, rendered as sixteen lines of thick yellow to
// say one field was absent. (That particular diagnostic — the missing-IFID
// warning — retired with ADR-309; the clamping rule it taught us did not, and
// the spans below stand in for any block-scoped diagnostic.)
//
// Clamping is the EDITOR's call, not the analyzer's: the full span still drives
// the gutter flag and Problems click-through, so the diagnostic's real scope is
// never lost.

import XCTest
@testable import SharpeeIDE

final class SpanTextUnderlineTests: XCTestCase {

    /// A `story` block shaped like fernhill's, with the span the analyzer emits.
    private let source = """
    ## a file-header comment

    story
      title: The Folly at Fernhill
      authors: The Sharpee Project
      id: fernhill

    create the Hall
      a room
    """

    func testAMultiLineSpanUnderlinesOnlyItsFirstLine() throws {
        let span = DiagnosticSpan(line: 3, column: 1, endLine: 6, endColumn: 15)
        let range = try XCTUnwrap(SpanText.underlineRange(of: span, in: source))
        let underlined = (source as NSString).substring(with: range)

        XCTAssertEqual(underlined, "story",
                       "the block's first line, not the block")
        XCTAssertFalse(underlined.contains("\n"), "an underline never spans lines")
    }

    /// The common case must be untouched: a span already on one line underlines
    /// exactly the offending text, character for character.
    func testASingleLineSpanIsUnderlinedExactly() throws {
        let span = DiagnosticSpan(line: 4, column: 3, endLine: 4, endColumn: 8)
        let range = try XCTUnwrap(SpanText.underlineRange(of: span, in: source))
        XCTAssertEqual((source as NSString).substring(with: range), "title")
    }

    /// The clamp starts at the span's own column, not at the line's start — a
    /// multi-line span beginning mid-line still points at what it named.
    func testAMultiLineSpanStartingMidLineKeepsItsStartColumn() throws {
        let span = DiagnosticSpan(line: 4, column: 3, endLine: 6, endColumn: 5)
        let range = try XCTUnwrap(SpanText.underlineRange(of: span, in: source))
        XCTAssertEqual((source as NSString).substring(with: range),
                       "title: The Folly at Fernhill")
    }

    /// A stale diagnostic against an edited buffer is dropped, not guessed at —
    /// the behaviour `characterRange` already had, preserved through the clamp.
    func testASpanBeyondTheBufferYieldsNoUnderline() {
        let span = DiagnosticSpan(line: 400, column: 1, endLine: 402, endColumn: 3)
        XCTAssertNil(SpanText.underlineRange(of: span, in: source))
    }
}
