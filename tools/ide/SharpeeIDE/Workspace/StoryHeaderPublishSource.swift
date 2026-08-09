// StoryHeaderPublishSource.swift
// Reads and writes the `publish-source:` story-header field (ADR-284) — the
// field behind the Publish checkbox on the project tree's Story row.
//
// The checkbox is a VIEW over this field rather than a preference of its own:
// `sharpee publish` from a terminal reads the same line, so an IDE author and a
// terminal author get the identical artifact (ADR-284 D1). A preference stored
// in the app could not travel with the story and the two would disagree.
// Public interface: StoryHeaderPublishSource.read(from:), .edit(setting:in:),
// .apply(_:to:).
// Owner context: tools/ide — Workspace.

import Foundation

enum StoryHeaderPublishSource {

    /// The field's key, spelled as the Chord parser accepts it.
    static let key = "publish-source"

    /// A single replacement in the story source.
    ///
    /// Offset-and-length rather than a rewritten file, so the change can go
    /// through the editor's undoable text path (the same one the Problems
    /// panel's IFID fix uses) instead of overwriting an author's open buffer.
    /// An insertion is a zero-length replacement.
    struct Edit: Equatable {
        /// UTF-16 offset into the source, always at a line boundary.
        let offset: Int
        /// UTF-16 length being replaced; 0 to insert.
        let length: Int
        /// The line to write, including its trailing newline.
        let text: String
    }

    /// Whether the header asks for the source to be published.
    ///
    /// Absent means NO, matching the build's own default — a story that never
    /// mentions publishing never ships its source.
    ///
    /// - Parameter source: the whole `.story` file text.
    /// - Returns: true only for an explicit `yes`/`true`; false for `no`/`false`,
    ///   for an absent field, and for a value the compiler would reject (an
    ///   unparseable value is not a reason to start shipping someone's source).
    static func read(from source: String) -> Bool {
        guard let found = locate(in: source) else { return false }
        return found.field.value.lowercased() == "yes" || found.field.value.lowercased() == "true"
    }

    /// The edit that sets `publish-source:` to `value`.
    ///
    /// Written as `yes`/`no` — the author-facing spelling, and the one the rest
    /// of the header reads like. An existing line is replaced in place so the
    /// author's field order survives; a new line goes after the last header
    /// field, beside the other build-facing keys.
    ///
    /// - Parameters:
    ///   - value: true to ship the source with the artifact.
    ///   - source: the whole `.story` file text.
    /// - Returns: the edit to apply, or nil when the source declares no
    ///   top-level `story` block (there is no header to write into, and
    ///   inventing one would corrupt the file) or when the field already reads
    ///   as `value` (no edit means no spurious undo entry and no dirty tab).
    static func edit(setting value: Bool, in source: String) -> Edit? {
        let lines = StoryHeaderLines.split(source)
        guard let storyIndex = lines.firstIndex(where: { StoryHeaderLines.isStoryKeyword($0) }) else { return nil }

        let word = value ? "yes" : "no"

        if let found = locate(in: source) {
            if found.field.value.lowercased() == word { return nil }
            let newline = lines[found.index].hasSuffix("\n") ? "\n" : ""
            return Edit(offset: utf16Length(of: lines[..<found.index]),
                        length: lines[found.index].utf16.count,
                        text: "\(found.field.indent)\(key): \(word)\(newline)")
        }

        // No such field yet — and an absent field already means `no`, so
        // turning it off is nothing to write. Editing the author's header to
        // say what it already says is not an improvement.
        if !value { return nil }

        // Scan the header for its last simple field and match that line's
        // indent; scanning stops at the first non-field line, so the insert
        // never lands inside a nested `use`/`on` block.
        var lastFieldIndex: Int?
        var indent = "  "
        for index in (storyIndex + 1)..<lines.count {
            guard let field = StoryHeaderLines.field(in: lines[index]) else { break }
            lastFieldIndex = index
            indent = field.indent
        }
        let insertAfter = lastFieldIndex ?? storyIndex
        // A header whose last line lacks a newline would splice the new field
        // onto the end of it, so the edit supplies the missing break itself.
        let needsBreak = !lines[insertAfter].hasSuffix("\n")
        return Edit(offset: utf16Length(of: lines[...insertAfter]),
                    length: 0,
                    text: "\(needsBreak ? "\n" : "")\(indent)\(key): \(word)\n")
    }

    /// `source` with `edit` applied — the non-editor path, and what the tests
    /// assert on, so both read the same result the editor would produce.
    static func apply(_ edit: Edit, to source: String) -> String {
        let text = source as NSString
        return text.replacingCharacters(in: NSRange(location: edit.offset, length: edit.length),
                                        with: edit.text)
    }

    private static func utf16Length(of lines: ArraySlice<String>) -> Int {
        lines.reduce(0) { $0 + $1.utf16.count }
    }

    // MARK: - Locating the field

    private struct Found {
        let index: Int
        let field: StoryHeaderLines.Field
    }

    /// The `publish-source:` line within the story header, if it has one.
    private static func locate(in source: String) -> Found? {
        let lines = StoryHeaderLines.split(source)
        guard let storyIndex = lines.firstIndex(where: { StoryHeaderLines.isStoryKeyword($0) }) else { return nil }
        for index in (storyIndex + 1)..<lines.count {
            guard let field = StoryHeaderLines.field(in: lines[index]) else { return nil }
            if field.key == key { return Found(index: index, field: field) }
        }
        return nil
    }
}
