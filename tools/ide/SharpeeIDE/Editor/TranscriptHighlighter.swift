// TranscriptHighlighter.swift
// `.transcript` syntax highlighting (ADR-277 D4): a per-line classifier over
// the line-oriented transcript grammar — header `key: value` lines before the
// `---` separator, `> command` lines, `[...]` assertions/directives, `#`
// comments, `$` test-commands, everything else expected output. Deliberately
// NOT a lexer port and NOT pinned by a golden fixture (D4's ruling): a
// mis-classified line is cosmetic; the transcript runner stays authoritative.
// Public interface: canHighlight(_:), highlight(_:), classify(lines:) (the
// testable core), Classification.
// Owner context: tools/ide — Editor pane.

import AppKit

final class TranscriptHighlighter {

    /// What a transcript line is, per the parser's line-oriented grammar.
    enum Classification: Equatable {
        /// `key: value` before the `---` separator.
        case header
        /// The `---` header/body separator.
        case separator
        /// A `#` comment line (`#[` is an assertion form, not a comment).
        case comment
        /// A `> command` line.
        case command
        /// A `[...]` assertion or directive (`[OK]`, `[GOAL: x]`, `[WHILE: …]`).
        case assertion
        /// A `$save` / `$restore` / `$teleport`-style test command.
        case testCommand
        /// Expected-output prose (anything else).
        case expectedOutput
    }

    /// True if this highlighter can color the file at `url` (`.transcript` only).
    func canHighlight(_ url: URL) -> Bool {
        url.pathExtension.lowercased() == "transcript"
    }

    /// Classifies each line. Header state is positional: `key: value` lines
    /// classify as header only before the first `---` (the parser's rule).
    static func classify(lines: [String]) -> [Classification] {
        var inHeader = true
        return lines.map { line in
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if inHeader, trimmed == "---" {
                inHeader = false
                return .separator
            }
            if trimmed.hasPrefix("#") {
                return trimmed.hasPrefix("#[") ? .assertion : .comment
            }
            if trimmed.hasPrefix(">") { return .command }
            if trimmed.hasPrefix("[") { return .assertion }
            if trimmed.hasPrefix("$") { return .testCommand }
            if inHeader, !trimmed.isEmpty, isHeaderField(trimmed) { return .header }
            return .expectedOutput
        }
    }

    /// `key: value` with a word-ish key — the parser lowercases arbitrary keys.
    private static func isHeaderField(_ trimmed: String) -> Bool {
        guard let colon = trimmed.firstIndex(of: ":") else { return false }
        let key = trimmed[trimmed.startIndex..<colon]
        return !key.isEmpty && key.allSatisfy { $0.isLetter || $0.isNumber || $0 == "_" || $0 == "-" }
    }

    /// Color for one classification, or nil for base foreground.
    static func color(for classification: Classification) -> NSColor? {
        switch classification {
        case .header:         return Theme.tokenKeyword
        case .separator:      return Theme.tokenComment
        case .comment:        return Theme.tokenComment
        case .command:        return Theme.tokenKeyword
        case .assertion:      return Theme.tokenNumber
        case .testCommand:    return Theme.tokenString
        case .expectedOutput: return nil
        }
    }

    /// Applies whole-line classification colors over the document. Resets to
    /// the base foreground first so stale colors from a prior pass are cleared
    /// (the SyntaxHighlighter cadence — full pass per call).
    func highlight(_ storage: NSTextStorage) {
        let ns = storage.string as NSString
        let fullRange = NSRange(location: 0, length: ns.length)

        storage.beginEditing()
        defer { storage.endEditing() }
        storage.addAttribute(.foregroundColor, value: Theme.foreground, range: fullRange)

        var lines: [String] = []
        var lineRanges: [NSRange] = []
        ns.enumerateSubstrings(in: fullRange, options: [.byLines, .substringNotRequired]) { _, range, _, _ in
            lines.append(ns.substring(with: range))
            lineRanges.append(range)
        }

        for (index, classification) in Self.classify(lines: lines).enumerated() {
            guard let color = Self.color(for: classification) else { continue }
            storage.addAttribute(.foregroundColor, value: color, range: lineRanges[index])
        }
    }
}
