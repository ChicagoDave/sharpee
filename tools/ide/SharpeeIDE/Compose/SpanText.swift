// SpanText.swift
// Converts a wire DiagnosticSpan (1-based line/column, end-exclusive column) into
// a UTF-16 character range over a document's text, so the editor can select and
// underline the exact offending range (ADR-258 D5) rather than a guessed one.
// Public interface: SpanText.characterRange(of:in:), underlineRange(of:in:).
// Owner context: tools/ide — Compose.

import Foundation

enum SpanText {

    /// The character range of `span` in `text`, or nil when the span falls outside
    /// the text (stale diagnostics against an edited buffer are expected — callers
    /// drop the underline rather than guess).
    static func characterRange(of span: DiagnosticSpan, in text: String) -> NSRange? {
        let ns = text as NSString
        guard let start = offset(line: span.line, column: span.column, in: ns),
              let end = offset(line: span.endLine, column: span.endColumn, in: ns),
              end >= start else { return nil }
        return NSRange(location: start, length: end - start)
    }

    /// The range to UNDERLINE for `span`: the whole span when it sits on one
    /// line, otherwise only its FIRST line.
    ///
    /// An underline is a point-at gesture, and a block-scoped diagnostic has a
    /// block-sized span — `analysis.missing-ifid` spans the entire `story`
    /// block, so an unclamped underline paints sixteen lines of thick yellow to
    /// say one field is absent. Clamping is the editor's call, not the
    /// analyzer's: the full span is still what the gutter flags and what
    /// click-through navigates to, so nothing about the diagnostic's scope is
    /// lost — only the squiggle stops shouting.
    static func underlineRange(of span: DiagnosticSpan, in text: String) -> NSRange? {
        guard span.endLine > span.line else { return characterRange(of: span, in: text) }
        let ns = text as NSString
        guard let start = offset(line: span.line, column: span.column, in: ns) else { return nil }
        var contentsEnd = 0
        ns.getLineStart(nil, end: nil, contentsEnd: &contentsEnd,
                        for: NSRange(location: start, length: 0))
        guard contentsEnd > start else { return nil }
        return NSRange(location: start, length: contentsEnd - start)
    }

    /// UTF-16 offset of the 1-based line/column, or nil when out of range. A column
    /// pointing one past the line's content (end-exclusive spans) is valid.
    private static func offset(line: Int, column: Int, in text: NSString) -> Int? {
        guard line >= 1, column >= 1 else { return nil }
        var lineStart = 0
        var current = 1
        while current < line {
            let searchRange = NSRange(location: lineStart, length: text.length - lineStart)
            let newline = text.range(of: "\n", range: searchRange)
            if newline.location == NSNotFound { return nil } // line beyond EOF
            lineStart = newline.location + 1
            current += 1
        }
        var contentsEnd = 0
        var lineEnd = 0
        text.getLineStart(nil, end: &lineEnd, contentsEnd: &contentsEnd,
                          for: NSRange(location: lineStart, length: 0))
        let target = lineStart + (column - 1)
        // Clamp target validity to the line itself (content plus its terminator slot).
        guard target <= contentsEnd else { return nil }
        return target
    }
}
