// StoryHeaderLines.swift
// The one reader for a Chord story header's line shape (ADR-298): where the
// `story` block opens and which lines after it are `key: value` fields.
// Extracted so StoryHeaderIFID and StoryHeaderPublishSource cannot drift apart
// on what counts as a header field — two copies of this scanner would.
// Public interface: StoryHeaderLines.split(_:), .isStoryKeyword(_:), .field(in:).
// Owner context: tools/ide — Workspace.

import Foundation

enum StoryHeaderLines {

    /// An indented `key: value` header line.
    struct Field: Equatable {
        let indent: String
        let key: String
        /// Everything after the colon, trimmed — empty when the field has no value.
        let value: String
    }

    /// Splits into lines that still carry their newline, so offsets computed by
    /// summing line lengths match the original string exactly.
    static func split(_ source: String) -> [String] {
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

    /// The `story` keyword on its own line at column 1 — the header block's opener.
    static func isStoryKeyword(_ line: String) -> Bool {
        guard let first = line.first, !first.isWhitespace else { return false }
        return line.trimmingCharacters(in: .whitespacesAndNewlines) == "story"
    }

    /// An indented `key: value` header field, or nil for anything else — a blank
    /// line, a comment, a nested `use`/`on` block, or the end of the header.
    ///
    /// Callers stop scanning at the first nil: a key inside a nested block is
    /// not a header field, and treating it as one would edit the wrong line.
    static func field(in line: String) -> Field? {
        let indent = String(line.prefix { $0 == " " || $0 == "\t" })
        guard !indent.isEmpty else { return nil }
        let rest = line.dropFirst(indent.count)
        guard let colon = rest.firstIndex(of: ":") else { return nil }
        let key = String(rest[rest.startIndex..<colon])
        guard !key.isEmpty,
              key.allSatisfy({ $0.isLowercase || $0.isNumber || $0 == "-" }) else { return nil }
        let value = rest[rest.index(after: colon)...].trimmingCharacters(in: .whitespacesAndNewlines)
        return Field(indent: indent, key: key, value: value)
    }

    /// True when `line` is an item of a list-valued field opened at `indent` —
    /// a non-blank line indented deeper that carries no `key:` of its own.
    ///
    /// A field with an empty value (`authors:`) opens a list whose items sit on
    /// their own deeper-indented lines. Those items have no colon, so
    /// `field(in:)` reads them as non-fields and a scan that stops at the first
    /// nil stops in the MIDDLE of the header. Every header walk must step over
    /// them with this, or it will both miss fields that follow a list and, if
    /// it writes, split the list from its items.
    static func isListItem(_ line: String, under indent: String) -> Bool {
        guard field(in: line) == nil else { return false }
        let itemIndent = line.prefix { $0 == " " || $0 == "\t" }
        return !line.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && itemIndent.count > indent.count
    }
}
