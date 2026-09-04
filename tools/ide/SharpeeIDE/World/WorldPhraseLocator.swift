// WorldPhraseLocator.swift
// Where in the source does a finding's phrase actually sit?
//
// A passage is a region, not a line: `stage.description` runs lines 34-38 and the
// phrase *tiring-house door* is on 37. The analyzer publishes the whole span
// (Amendment 2) because it cannot know which line inside it a reader means — only
// the text can say, and the IDE is the side holding the text.
//
// THE PROSE IS NOT THE SOURCE. What the analyzer read is the locale table's value:
// line breaks collapsed, and every variant joined. So a phrase is found by matching
// its WORDS against the source with flexible whitespace between them, never by
// offsetting into the passage text — the author may well have written *the hurricane*
// at the end of one line and *lamp* at the start of the next.
// Public interface: WorldPhraseLocator.locate(phrase:in:passage:).
// Owner context: tools/ide — World.

import Foundation

enum WorldPhraseLocator {

    /// Find a phrase inside the passage that reported it.
    ///
    /// The search is confined to the passage's own span: the same words very often
    /// appear elsewhere in the story, and a finding that jumps to another room's
    /// description is worse than one that jumps to the top of the right passage.
    ///
    /// - Parameters:
    ///   - phrase: the phrase as the finding names it, e.g. `hurricane lamp`
    ///   - source: the whole `.story` text
    ///   - passage: where the passage sits, from the analyzer
    /// - Returns: the phrase's own span, or the passage's first line when the words
    ///   cannot be found there (a re-flowed variant, a synonym table, an edit since
    ///   the build) — never nil, because a finding must always go somewhere
    static func locate(phrase: String, in source: String, passage: WorldSourceSpan?) -> DiagnosticSpan? {
        guard let passage else { return nil }
        let fallback = DiagnosticSpan(line: passage.line, column: 1,
                                      endLine: passage.line, endColumn: 1)

        let lines = source.components(separatedBy: .newlines)
        guard passage.line >= 1, passage.line <= lines.count else { return fallback }
        let last = min(passage.endLine, lines.count)

        // The region as one string, so a phrase broken across lines still matches.
        let region = lines[(passage.line - 1)..<last].joined(separator: "\n")
        guard let range = search(phrase: phrase, in: region) else { return fallback }

        let before = region[region.startIndex..<range.lowerBound]
        let inside = region[range]
        let startLine = passage.line + before.filter { $0 == "\n" }.count
        let startColumn = before.distance(from: before.lastIndex(of: "\n").map(region.index(after:))
                                            ?? before.startIndex,
                                          to: range.lowerBound) + 1
        let endLine = startLine + inside.filter { $0 == "\n" }.count
        let endColumn = endLine == startLine
            ? startColumn + inside.count
            : inside.distance(from: inside.lastIndex(of: "\n").map(inside.index(after:)) ?? inside.startIndex,
                              to: inside.endIndex) + 1

        return DiagnosticSpan(line: startLine, column: startColumn,
                              endLine: endLine, endColumn: endColumn)
    }

    /// Match a phrase's words against source text, tolerating line breaks.
    ///
    /// Word boundaries are enforced so *ale* does not match inside *tale*, and the
    /// gap between words is any run of whitespace, because the author's line breaks
    /// are theirs and the locale table's are not.
    ///
    /// - Parameters:
    ///   - phrase: the phrase, words separated by single spaces
    ///   - region: the source region to search
    /// - Returns: the matched range, or nil
    private static func search(phrase: String, in region: String) -> Range<String.Index>? {
        let words = phrase.split(separator: " ").map { NSRegularExpression.escapedPattern(for: String($0)) }
        guard !words.isEmpty else { return nil }
        let pattern = "(?<![\\w'-])" + words.joined(separator: "\\s+") + "(?![\\w'-])"
        guard let expression = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return nil
        }
        let whole = NSRange(region.startIndex..<region.endIndex, in: region)
        guard let match = expression.firstMatch(in: region, options: [], range: whole) else { return nil }
        return Range(match.range, in: region)
    }
}
