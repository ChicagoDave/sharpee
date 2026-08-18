// StoryHeaderThemes.swift
// Reads and writes the `themes:` story-header field (ADR-188, go-live Phase
// 6c) — the list of built-in themes the story SHIPS, behind the Build →
// Shipped Themes corral. Classic is the client's `:root` baseline and never
// appears in the list; an absent field ships no built-ins.
//
// The corral is a VIEW over this field rather than a preference of its own:
// `sharpee build`/`publish` from a terminal read the same line, so an IDE
// author and a terminal author ship the identical theme set. The editor owns
// the field the way it owns `ifid:` and `publish-source:` — the author never
// types it (ADR-298 fielded schema).
// Public interface: StoryHeaderThemes.read(from:), .edit(setting:in:),
// .apply(_:to:).
// Owner context: tools/ide — Workspace.

import Foundation

enum StoryHeaderThemes {

    /// The field's key, spelled as the Chord parser accepts it.
    static let key = "themes"

    /// A single replacement in the story source — same shape as
    /// `StoryHeaderPublishSource.Edit`, so both travel the editor's undoable
    /// replace path. An insertion is a zero-length replacement; a removal is
    /// a replacement with empty text.
    struct Edit: Equatable {
        /// UTF-16 offset into the source, always at a line boundary.
        let offset: Int
        /// UTF-16 length being replaced; 0 to insert.
        let length: Int
        /// The line to write, including its trailing newline; empty to remove.
        let text: String
    }

    /// The shipped-theme ids the header declares, in the author's order.
    ///
    /// - Parameter source: the whole `.story` file text.
    /// - Returns: the comma-separated ids, trimmed, empty entries dropped;
    ///   `[]` for an absent field or a source with no `story` block.
    static func read(from source: String) -> [String] {
        guard let found = locate(in: source) else { return [] }
        return parse(found.field.value)
    }

    /// The edit that sets the shipped list to `ids` (order preserved).
    ///
    /// An existing line is replaced in place so the author's field order
    /// survives; a new line goes after the last header field. An empty `ids`
    /// REMOVES the line — a header that ships nothing says nothing, matching
    /// the build's own default.
    ///
    /// - Parameters:
    ///   - ids: the theme ids to ship, in the order they should be written.
    ///   - source: the whole `.story` file text.
    /// - Returns: the edit to apply, or nil when the source declares no
    ///   top-level `story` block (inventing a header would corrupt the file)
    ///   or when the field already reads as `ids` (no edit means no spurious
    ///   undo entry and no dirty tab).
    static func edit(setting ids: [String], in source: String) -> Edit? {
        let lines = StoryHeaderLines.split(source)
        guard let storyIndex = lines.firstIndex(where: { StoryHeaderLines.isStoryKeyword($0) }) else { return nil }

        if let found = locate(in: source) {
            if parse(found.field.value) == ids { return nil }
            let lineOffset = utf16Length(of: lines[..<found.index])
            if ids.isEmpty {
                // Remove the whole line, its newline included.
                return Edit(offset: lineOffset, length: lines[found.index].utf16.count, text: "")
            }
            let newline = lines[found.index].hasSuffix("\n") ? "\n" : ""
            return Edit(offset: lineOffset,
                        length: lines[found.index].utf16.count,
                        text: "\(found.field.indent)\(key): \(ids.joined(separator: ", "))\(newline)")
        }

        // No such field yet — and an absent field already ships nothing, so an
        // empty list is nothing to write.
        if ids.isEmpty { return nil }

        // Scan the header for its last simple field and match that line's
        // indent; scanning stops at the first non-field line, so the insert
        // never lands inside a nested `use`/`on` block.
        var lastFieldIndex: Int?
        var indent = "  "
        var index = storyIndex + 1
        while index < lines.count {
            guard let field = StoryHeaderLines.field(in: lines[index]) else { break }
            lastFieldIndex = index
            indent = field.indent
            index += 1

            // A field with no inline value opens a LIST (`authors:` followed by
            // one indented name per line). Its items carry no colon, so
            // `field(in:)` reads them as non-fields and the scan would stop on
            // the first one — landing this insert between `authors:` and its
            // authors, which empties the list and makes the header uncompilable
            // (`parse.header-list-empty`). Step over the items so the insert
            // lands after the whole list.
            guard field.value.isEmpty else { continue }
            while index < lines.count,
                  StoryHeaderLines.isListItem(lines[index], under: field.indent) {
                lastFieldIndex = index
                index += 1
            }
        }
        let insertAfter = lastFieldIndex ?? storyIndex
        // A header whose last line lacks a newline would splice the new field
        // onto the end of it, so the edit supplies the missing break itself.
        let needsBreak = !lines[insertAfter].hasSuffix("\n")
        return Edit(offset: utf16Length(of: lines[...insertAfter]),
                    length: 0,
                    text: "\(needsBreak ? "\n" : "")\(indent)\(key): \(ids.joined(separator: ", "))\n")
    }

    /// `source` with `edit` applied — the non-editor path, and what the tests
    /// assert on, so both read the same result the editor would produce.
    static func apply(_ edit: Edit, to source: String) -> String {
        let text = source as NSString
        return text.replacingCharacters(in: NSRange(location: edit.offset, length: edit.length),
                                        with: edit.text)
    }

    // MARK: - Internals

    private static func parse(_ value: String) -> [String] {
        value.split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    private static func utf16Length(of lines: ArraySlice<String>) -> Int {
        lines.reduce(0) { $0 + $1.utf16.count }
    }

    private struct Found {
        let index: Int
        let field: StoryHeaderLines.Field
    }

    /// The `themes:` line within the story header, if it has one.
    private static func locate(in source: String) -> Found? {
        let lines = StoryHeaderLines.split(source)
        guard let storyIndex = lines.firstIndex(where: { StoryHeaderLines.isStoryKeyword($0) }) else { return nil }
        var index = storyIndex + 1
        while index < lines.count {
            guard let field = StoryHeaderLines.field(in: lines[index]) else { return nil }
            if field.key == key { return Found(index: index, field: field) }
            index += 1
            // Step over a list-valued field's items, or the search ends on the
            // first one and never sees a `themes:` line written after the list.
            guard field.value.isEmpty else { continue }
            while index < lines.count,
                  StoryHeaderLines.isListItem(lines[index], under: field.indent) {
                index += 1
            }
        }
        return nil
    }
}
