// StoryHeaderIFID.swift
// Mints a Treaty of Babel IFID (ADR-074) and works out where it belongs in a
// Chord story header (ADR-298), so the Problems panel can fix a missing `ifid:`
// in place instead of sending the author to the `sharpee ifid` CLI.
// Public interface: StoryHeaderIFID.mint(), StoryHeaderIFID.insertion(of:into:).
// Owner context: tools/ide — Workspace.

import Foundation

enum StoryHeaderIFID {

    /// Where an `ifid:` line goes and what to write there.
    struct Insertion: Equatable {
        /// Character offset into the source, always at a line boundary.
        let offset: Int
        /// The full line to splice in, including its trailing newline.
        let text: String
    }

    /// A fresh IFID: an uppercase UUID v4, the Treaty of Babel recommendation
    /// (ADR-074) and the same shape `sharpee ifid generate` produces.
    static func mint() -> String {
        UUID().uuidString.uppercased()
    }

    /// Locates the insertion point for `ifid` in a story source.
    ///
    /// The line goes directly after `id:` — the two are the story's identity
    /// fields and belong together (David's ruling), and it matches the order the
    /// `sharpee init` template writes. When the header has no `id:` the line
    /// falls back to after the LAST simple `key: value` field.
    ///
    /// Scanning stops at the first line that is not such a field: `use`/`on`
    /// open nested blocks, and an `ifid:` inside one would not be a header field
    /// at all.
    ///
    /// - Parameters:
    ///   - ifid: the identifier to write.
    ///   - source: the whole `.story` file text.
    /// - Returns: the offset and line text, or nil when the source has no
    ///   top-level `story` block or already declares an `ifid:`.
    static func insertion(of ifid: String, into source: String) -> Insertion? {
        let lines = splitKeepingLineEndings(source)
        guard let storyIndex = lines.firstIndex(where: { isStoryKeywordLine($0) }) else { return nil }

        var idIndex: Int?
        var idIndent: String?
        var lastFieldIndex: Int?
        var lastIndent = "  "

        for index in (storyIndex + 1)..<lines.count {
            guard let field = headerField(in: lines[index]) else { break }
            if field.key == "ifid" { return nil }
            if field.key == "id", idIndex == nil {
                idIndex = index
                idIndent = field.indent
            }
            lastFieldIndex = index
            lastIndent = field.indent
        }

        let insertAfter = idIndex ?? lastFieldIndex ?? storyIndex
        let indent = idIndent ?? lastIndent
        // Offset lands after the chosen line's newline — the start of the next line.
        let offset = lines[0...insertAfter].reduce(0) { $0 + $1.utf16.count }
        return Insertion(offset: offset, text: "\(indent)ifid: \(ifid)\n")
    }

    // MARK: - Line reading

    /// The `story` keyword on its own line at column 1 — the header block's opener.
    private static func isStoryKeywordLine(_ line: String) -> Bool {
        guard let first = line.first, !first.isWhitespace else { return false }
        return line.trimmingCharacters(in: .whitespacesAndNewlines) == "story"
    }

    /// An indented `key: value` header field, or nil for anything else — a blank
    /// line, a comment, a nested `use`/`on` block, or the end of the header.
    private static func headerField(in line: String) -> (indent: String, key: String)? {
        let indent = String(line.prefix { $0 == " " || $0 == "\t" })
        guard !indent.isEmpty else { return nil }
        let rest = line.dropFirst(indent.count)
        guard let colon = rest.firstIndex(of: ":") else { return nil }
        let key = String(rest[rest.startIndex..<colon])
        guard !key.isEmpty,
              key.allSatisfy({ $0.isLowercase || $0.isNumber || $0 == "-" }) else { return nil }
        return (indent, key)
    }

    /// Splits into lines that still carry their newline, so offsets computed by
    /// summing line lengths match the original string exactly.
    private static func splitKeepingLineEndings(_ source: String) -> [String] {
        var lines: [String] = []
        var current = ""
        for character in source {
            current.append(character)
            if character == "\n" {
                lines.append(current)
                current = ""
            }
        }
        if !current.isEmpty { lines.append(current) }
        return lines
    }
}
