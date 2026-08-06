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

    /// Property keys — a `name:` field rather than a structural keyword.
    ///
    /// ADR-298's closed story-header schema, MINUS the keys that are already
    /// structural keywords (`states`, `score`, `use`, `on`): those keep the
    /// keyword color, so a header reads as fields in one color and the block
    /// openers among them in another (David's ruling).
    static let properties: Set<String> = [
        "title", "authors", "testers", "ifid", "id", "story-version",
        "prologue", "description", "client", "theme", "template",
        "themes", "default-theme", "storage-prefix",
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

    /// Color for one token, given its neighbours on the same line.
    ///
    /// Two rules need the context a per-token view cannot supply:
    ///
    /// - A property key is a known name with a colon fused to it (`title:`),
    ///   which token kind alone cannot tell from the same word used in prose.
    ///   Keywords win, so `states:` stays a keyword and the two never collide.
    /// - A digit run fused to a word is part of a larger identifier — a UUID, a
    ///   hex value — not a numeric literal. The lexer stops a number at the
    ///   first non-digit, so `8221EC69` arrives as number(8221) + word(EC69);
    ///   coloring the number would paint the first four characters of an IFID.
    ///
    /// - Parameters:
    ///   - token: the token to color.
    ///   - previous: the preceding token on the same line, or nil at line start.
    ///   - next: the following token on the same line, or nil at end of line.
    /// - Returns: the color, or nil to leave the token at base foreground.
    static func color(for token: ChordToken,
                      precededBy previous: ChordToken? = nil,
                      followedBy next: ChordToken? = nil) -> NSColor? {
        if token.kind == .number,
           (previous?.kind == .word && fused(previous, token))
            || (next?.kind == .word && fused(token, next)) {
            return nil
        }
        if token.kind == .word,
           !keywords.contains(token.text.lowercased()),
           properties.contains(token.text.lowercased()),
           next?.kind == .colon, fused(token, next) {
            return Theme.tokenType
        }
        return color(for: token)
    }

    /// True when `left` ends exactly where `right` begins — no space between.
    private static func fused(_ left: ChordToken?, _ right: ChordToken?) -> Bool {
        guard let left, let right else { return false }
        return left.span.endColumn == right.span.column
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

            for (index, token) in line.tokens.enumerated() {
                let previous = index > 0 ? line.tokens[index - 1] : nil
                let next = index + 1 < line.tokens.count ? line.tokens[index + 1] : nil
                guard let color = Self.color(for: token, precededBy: previous, followedBy: next)
                else { continue }
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
