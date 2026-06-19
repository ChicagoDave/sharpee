// AutoIndenter.swift
// Pure newline-indent computation for the editor: given the text and the caret offset where
// Return was pressed, returns the whitespace to insert on the new line.
// Public interface: `indentOnNewline(text:caret:indentUnit:)`.
// Owner context: tools/ide — Editor pane.

import Foundation

enum AutoIndenter {

    private static let space: unichar = 0x20
    private static let tab: unichar = 0x09

    /// The whitespace to insert after a newline at `caret` (a UTF-16 offset): the current line's
    /// leading whitespace, plus one `indentUnit` when the last non-whitespace character before the
    /// caret is an opening bracket `(`, `[`, or `{`.
    static func indentOnNewline(text: String, caret: Int, indentUnit: String = "  ") -> String {
        let ns = text as NSString
        guard caret >= 0, caret <= ns.length else { return "" }

        let lineStart = ns.lineRange(for: NSRange(location: caret, length: 0)).location

        // Leading whitespace of the current line, bounded by the caret.
        var i = lineStart
        while i < caret {
            let c = ns.character(at: i)
            if c == space || c == tab { i += 1 } else { break }
        }
        var indent = ns.substring(with: NSRange(location: lineStart, length: i - lineStart))

        // One extra level if the last non-whitespace char before the caret opens a block.
        var j = caret - 1
        while j >= 0 {
            let c = ns.character(at: j)
            if c == space || c == tab { j -= 1 } else { break }
        }
        if j >= 0 {
            let c = ns.character(at: j)
            if c == 0x28 || c == 0x5B || c == 0x7B { indent += indentUnit }
        }

        return indent
    }
}
