// BracketMatcher.swift
// Pure bracket-pair matching for the editor: given text and a caret offset, finds the partner
// bracket via a balanced scan. Operates on UTF-16 units so results map directly to NSRange.
// Public interface: `match(in:caret:)`.
// Owner context: tools/ide — Editor pane.
//
// NOTE: v1 is a plain balanced scan — it does NOT yet skip brackets inside strings/comments.
// A tree-sitter-aware refinement (ignore delimiters inside (string)/(comment) nodes) is a
// follow-up, tracked alongside the broader highlighting work in plan-20260619-p2.

import Foundation

enum BracketMatcher {

    private static let openToClose: [unichar: unichar] = [
        0x28: 0x29, // ( )
        0x5B: 0x5D, // [ ]
        0x7B: 0x7D, // { }
    ]
    private static let closeToOpen: [unichar: unichar] = [
        0x29: 0x28, 0x5D: 0x5B, 0x7D: 0x7B,
    ]

    /// Returns the (bracket, partner) UTF-16 offsets when the caret is adjacent to a bracket that
    /// has a balanced partner. Prefers the character immediately before the caret (typical editor
    /// feel), then the character at the caret. Returns nil when neither side is a matched bracket.
    static func match(in units: [unichar], caret: Int) -> (bracket: Int, partner: Int)? {
        for pos in [caret - 1, caret] where pos >= 0 && pos < units.count {
            let ch = units[pos]
            if openToClose[ch] != nil, let partner = forward(units, from: pos) {
                return (pos, partner)
            }
            if closeToOpen[ch] != nil, let partner = backward(units, from: pos) {
                return (pos, partner)
            }
        }
        return nil
    }

    /// String convenience (used by tests); converts to UTF-16 units.
    static func match(in text: String, caret: Int) -> (bracket: Int, partner: Int)? {
        match(in: Array(text.utf16), caret: caret)
    }

    private static func forward(_ units: [unichar], from: Int) -> Int? {
        let open = units[from]
        let close = openToClose[open]!
        var depth = 0
        var i = from
        while i < units.count {
            let c = units[i]
            if c == open { depth += 1 }
            else if c == close { depth -= 1; if depth == 0 { return i } }
            i += 1
        }
        return nil
    }

    private static func backward(_ units: [unichar], from: Int) -> Int? {
        let close = units[from]
        let open = closeToOpen[close]!
        var depth = 0
        var i = from
        while i >= 0 {
            let c = units[i]
            if c == close { depth += 1 }
            else if c == open { depth -= 1; if depth == 0 { return i } }
            i -= 1
        }
        return nil
    }
}
