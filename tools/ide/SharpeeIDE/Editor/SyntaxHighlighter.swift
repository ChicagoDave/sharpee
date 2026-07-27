// SyntaxHighlighter.swift
// Chord syntax highlighting via the in-process ChordLexer (ADR-258 D7): colors
// key off TokenKind — no parse tree, no tree-sitter. Comment lines color whole;
// strings, numbers, comparisons, and a curated structural-keyword set color by
// token; everything else (prose words, punctuation) stays at base foreground.
// Re-highlights the whole document per call (matches the editor's existing
// full-pass cadence).
// Public interface: `canHighlight(_:)` reports whether a URL is a supported
// language; `highlight(_:)` lexes an NSTextStorage and applies token colors.
// Owner context: tools/ide — Editor pane.

import AppKit

final class SyntaxHighlighter {

    /// Structural keywords colored as keywords when they appear as word tokens.
    /// A display choice, not language surface — the lexer has no keyword kind.
    /// Deliberately excludes words common in prose (`the`, `a`, `is`, `on`, …):
    /// token-level highlighting colors matches inside prose lines too, and a
    /// parse tree that could tell the difference is exactly what D7 declined.
    static let keywords: Set<String> = [
        "story", "grammar", "create", "define", "extend", "remove",
        "action", "actions", "use", "means", "directions",
        "phrase", "phrases", "starts", "announce",
        "state", "states", "counter", "counters", "channel", "channels",
        "score", "scores", "rank", "ranks", "sequence", "machine",
        "topics", "pronouns", "trait", "traits",
    ]

    /// Color for one token, or nil to leave it at base foreground.
    static func color(for token: ChordToken) -> NSColor? {
        switch token.kind {
        case .string:  return Theme.tokenString
        case .number:  return Theme.tokenNumber
        case .compare: return Theme.tokenKeyword
        case .word:    return keywords.contains(token.text.lowercased()) ? Theme.tokenKeyword : nil
        default:       return nil
        }
    }

    /// True if this highlighter can color the file at `url` (Chord `.story` only).
    func canHighlight(_ url: URL) -> Bool {
        url.pathExtension.lowercased() == "story"
    }

    /// Lexes `storage`'s contents and applies foreground token colors over the
    /// whole document. Resets every character to the base foreground first so
    /// stale colors from a prior pass are cleared.
    func highlight(_ storage: NSTextStorage) {
        let source = storage.string
        let ns = source as NSString
        let fullRange = NSRange(location: 0, length: ns.length)

        storage.beginEditing()
        defer { storage.endEditing() }
        storage.addAttribute(.foregroundColor, value: Theme.foreground, range: fullRange)

        let lineStarts = Self.lineStartOffsets(ns)

        for line in ChordLexer.lex(source) {
            guard line.lineNo - 1 < lineStarts.count else { continue }
            let lineStart = lineStarts[line.lineNo - 1]

            if line.comment {
                let length = (line.raw as NSString).length
                apply(Theme.tokenComment, at: NSRange(location: lineStart, length: length),
                      within: fullRange, to: storage)
                continue
            }

            for token in line.tokens {
                guard let color = Self.color(for: token) else { continue }
                let location = lineStart + token.span.column - 1
                let length = token.span.endColumn - token.span.column
                apply(color, at: NSRange(location: location, length: length),
                      within: fullRange, to: storage)
            }
        }
    }

    private func apply(_ color: NSColor, at range: NSRange, within fullRange: NSRange,
                       to storage: NSTextStorage) {
        guard range.location >= 0, NSMaxRange(range) <= fullRange.length else { return }
        storage.addAttribute(.foregroundColor, value: color, range: range)
    }

    /// UTF-16 offsets of each line start, splitting like the lexer (`\r\n`|`\n`|`\r`).
    private static func lineStartOffsets(_ text: NSString) -> [Int] {
        var starts: [Int] = [0]
        var i = 0
        while i < text.length {
            let c = text.character(at: i)
            if c == 0x0D { // `\r` (or `\r\n`)
                i += (i + 1 < text.length && text.character(at: i + 1) == 0x0A) ? 2 : 1
                starts.append(i)
            } else if c == 0x0A { // `\n`
                i += 1
                starts.append(i)
            } else {
                i += 1
            }
        }
        return starts
    }
}
