// ChordLexer.swift
// Swift port of the Chord line lexer (packages/chord/src/lexer.ts, ADR-258 D7):
// splits `.story` source into logical lines, each carrying its indentation, raw
// text, and token stream. The editor tokenizes IN-PROCESS with this port —
// highlighting needs tokens, not a parse tree — and the port is pinned against
// the SAME committed golden token stream the TS lexer is pinned to
// (packages/chord/tests/fixtures/lexer-golden/lexer-golden.json): the TS vitest
// proves the golden still describes Chord, the Swift XCTest proves this port
// still matches the golden.
//
// Port fidelity notes:
// - Columns are UTF-16 code-unit offsets (JS string indexing), so spans agree
//   with the TS lexer byte-for-byte on the golden corpus.
// - Word/number classes mirror the TS regexes exactly:
//   WORD  = [A-Za-zÀ-ɏ][A-Za-z0-9À-ɏ'_-]*   (À-ɏ = U+00C0…U+024F)
//   NUMBER = [0-9]+(\.[0-9]+)*
// - The TS lexer's diagnostics (tab-in-indent, comment blank-line delimitation)
//   are compile concerns reported by `compose` (D5); the editor path needs only
//   tokens, so this port measures tabs (one column each) without reporting.
// Public interface: ChordLexer.lex(_:), ChordLine, ChordToken, ChordTokenKind.
// Owner context: tools/ide — Editor.

import Foundation

/// Token kinds, raw values matching the TS lexer's strings (golden JSON decode).
enum ChordTokenKind: String, Codable, Equatable, Sendable {
    case word       // identifiers, keywords, hyphenated keys, contractions
    case number     // 1, 20, 1.0.0
    case string     // "double-quoted"
    case colon
    case comma
    case lparen
    case rparen
    case lbracket   // `[` — list values
    case rbracket   // `]`
    case lbrace     // `{` — nested emit-payload objects
    case rbrace     // `}`
    case compare    // `>=`, `<=`, `>`, `<` — counter comparisons
    case punct      // any other single non-space character (prose punctuation)
}

struct ChordToken: Codable, Equatable, Sendable {
    let kind: ChordTokenKind
    /// Exact source text (for strings, WITHOUT the surrounding quotes).
    let text: String
    let span: DiagnosticSpan
}

/// One non-blank logical line of source.
struct ChordLine: Codable, Equatable, Sendable {
    /// 1-based source line number.
    let lineNo: Int
    /// Leading-space count (tabs count 1).
    let indent: Int
    /// Untrimmed source text.
    let raw: String
    /// Token stream of the trimmed text.
    let tokens: [ChordToken]
    /// True when a blank line (or start of file) immediately precedes this line.
    let afterBlank: Bool
    /// True for an indent-0 `##` comment line.
    let comment: Bool
}

enum ChordLexer {

    /// Tokenize source into logical lines (non-blank lines in source order).
    static func lex(_ source: String) -> [ChordLine] {
        var lines: [ChordLine] = []
        let rawLines = splitLines(source)
        var afterBlank = true // start of file counts as a paragraph boundary

        for (i, raw) in rawLines.enumerated() {
            let lineNo = i + 1
            if raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                afterBlank = true
                continue
            }

            let units = Array(raw.utf16)
            var indent = 0
            var col = 0
            while col < units.count, units[col] == 0x20 || units[col] == 0x09 {
                indent += 1
                col += 1
            }

            lines.append(ChordLine(
                lineNo: lineNo,
                indent: indent,
                raw: raw,
                tokens: tokenizeLine(units, lineNo: lineNo, start: col),
                afterBlank: afterBlank,
                comment: indent == 0 && raw.hasPrefix("##")))
            afterBlank = false
        }

        return lines
    }

    /// Split on `\r\n` | `\n` | `\r`, preserving empty lines (mirrors the TS split).
    private static func splitLines(_ source: String) -> [String] {
        source
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
            .components(separatedBy: "\n")
    }

    // MARK: - Tokenizer (UTF-16 code units — JS string semantics)

    private static func isWordStart(_ u: UInt16) -> Bool {
        (0x41...0x5A).contains(u) || (0x61...0x7A).contains(u) || (0x00C0...0x024F).contains(u)
    }

    private static func isWordContinue(_ u: UInt16) -> Bool {
        isWordStart(u) || (0x30...0x39).contains(u)
            || u == 0x27 /* ' */ || u == 0x5F /* _ */ || u == 0x2D /* - */
    }

    private static func isDigit(_ u: UInt16) -> Bool { (0x30...0x39).contains(u) }

    private static func text(_ units: [UInt16], _ range: Range<Int>) -> String {
        String(decoding: units[range], as: UTF16.self)
    }

    /// Single-line span from a 1-based column and length (mirrors spanOf).
    private static func span(_ lineNo: Int, _ column: Int, _ length: Int = 1) -> DiagnosticSpan {
        DiagnosticSpan(line: lineNo, column: column, endLine: lineNo, endColumn: column + length)
    }

    private static func tokenizeLine(_ units: [UInt16], lineNo: Int, start: Int) -> [ChordToken] {
        var tokens: [ChordToken] = []
        var pos = start

        while pos < units.count {
            let ch = units[pos]
            if ch == 0x20 { // space
                pos += 1
                continue
            }

            let column = pos + 1
            if ch == 0x22 { // `"`
                var close = -1
                var scan = pos + 1
                while scan < units.count {
                    if units[scan] == 0x22 { close = scan; break }
                    scan += 1
                }
                if close == -1 {
                    // A lone quote is prose punctuation (multi-line dialogue in
                    // prose blocks); positions that REQUIRE a string diagnose at
                    // parse time — not the editor's concern.
                    tokens.append(ChordToken(kind: .punct, text: "\"", span: span(lineNo, column)))
                    pos += 1
                } else {
                    tokens.append(ChordToken(kind: .string,
                                             text: text(units, (pos + 1)..<close),
                                             span: span(lineNo, column, close - pos + 1)))
                    pos = close + 1
                }
                continue
            }

            if isWordStart(ch) {
                var end = pos + 1
                while end < units.count, isWordContinue(units[end]) { end += 1 }
                tokens.append(ChordToken(kind: .word,
                                         text: text(units, pos..<end),
                                         span: span(lineNo, column, end - pos)))
                pos = end
                continue
            }

            if isDigit(ch) {
                var end = pos + 1
                while end < units.count, isDigit(units[end]) { end += 1 }
                // (\.[0-9]+)* — a dot only joins when followed by a digit.
                while end + 1 < units.count, units[end] == 0x2E, isDigit(units[end + 1]) {
                    end += 2
                    while end < units.count, isDigit(units[end]) { end += 1 }
                }
                tokens.append(ChordToken(kind: .number,
                                         text: text(units, pos..<end),
                                         span: span(lineNo, column, end - pos)))
                pos = end
                continue
            }

            if ch == 0x3E || ch == 0x3C { // `>` / `<`
                let hasEquals = pos + 1 < units.count && units[pos + 1] == 0x3D
                let length = hasEquals ? 2 : 1
                tokens.append(ChordToken(kind: .compare,
                                         text: text(units, pos..<(pos + length)),
                                         span: span(lineNo, column, length)))
                pos += length
                continue
            }

            let single: ChordTokenKind
            switch ch {
            case 0x3A: single = .colon
            case 0x2C: single = .comma
            case 0x28: single = .lparen
            case 0x29: single = .rparen
            case 0x5B: single = .lbracket
            case 0x5D: single = .rbracket
            case 0x7B: single = .lbrace
            case 0x7D: single = .rbrace
            default:   single = .punct
            }
            tokens.append(ChordToken(kind: single,
                                     text: text(units, pos..<(pos + 1)),
                                     span: span(lineNo, column)))
            pos += 1
        }

        return tokens
    }
}
