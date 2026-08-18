// StoryHeaderIFID.swift
// Mints a Treaty of Babel IFID (ADR-074) and works out where it belongs in a
// Chord story header (ADR-298 / ADR-309).
//
// Since ADR-309 the header's `ifid:` line is the tool's RENDERING of the
// config sidecar's value, so this file answers three questions for the save
// path: what does the header currently say (`read`), and what edit makes it
// say what the config says (`edit`) — inserting the line when it is missing,
// overwriting it when an author changed it. The older insert-only
// `insertion(of:into:)` retired with the Problems panel's Generate IFID fix
// and the `analysis.missing-ifid` diagnostic it hung on (ADR-309).
// Public interface: StoryHeaderIFID.mint(), .read(from:), .hasStoryBlock(_:),
//   .edit(setting:in:), .apply(_:to:).
// Owner context: tools/ide — Workspace.

import Foundation

enum StoryHeaderIFID {

    /// A single replacement in the story source — the same offset/length/text
    /// shape `StoryHeaderPublishSource` uses, so both header edits can travel
    /// the editor's undoable text path. An insertion is a zero-length replace.
    struct Edit: Equatable {
        /// UTF-16 offset into the source, always at a line boundary.
        let offset: Int
        /// UTF-16 length being replaced; 0 to insert.
        let length: Int
        /// The line to write, including its trailing newline.
        let text: String
    }

    /// A fresh IFID: an uppercase UUID v4, the Treaty of Babel recommendation
    /// (ADR-074) and the same shape `sharpee ifid generate` produces.
    static func mint() -> String {
        UUID().uuidString.uppercased()
    }

    /// Whether the source opens a top-level `story` block — the only kind of
    /// file that can carry a header `ifid:` line at all (a grammar file or a
    /// fragment has no identity to render).
    static func hasStoryBlock(_ source: String) -> Bool {
        StoryHeaderLines.split(source).contains { StoryHeaderLines.isStoryKeyword($0) }
    }

    /// The header's current `ifid:` value, or nil when it declares none.
    ///
    /// Scanning stops at the first non-field line, so an `ifid:` inside a
    /// nested `use`/`on` block is never mistaken for the header's.
    ///
    /// - Parameter source: the whole `.story` file text.
    /// - Returns: the trimmed value, or nil when absent or empty.
    static func read(from source: String) -> String? {
        guard let found = locate(in: source) else { return nil }
        return found.field.value.isEmpty ? nil : found.field.value
    }

    /// The edit that makes the header's `ifid:` line read `ifid` — ADR-309's
    /// reconciliation, in the editor's undoable-edit shape.
    ///
    /// An existing line is replaced in place (so the author's field order
    /// survives, and a hand-edited value does not stick); a missing line is
    /// inserted directly after `id:`, the two identity fields belonging
    /// together, matching the order `sharpee init`'s template writes.
    ///
    /// - Parameters:
    ///   - ifid: the config's value — the identity the header must render.
    ///   - source: the whole `.story` file text.
    /// - Returns: the edit to apply, or nil when the header already reads
    ///   `ifid` (no edit means no spurious undo entry and no dirty tab) or
    ///   when the source has no top-level `story` block to write into.
    static func edit(setting ifid: String, in source: String) -> Edit? {
        let lines = StoryHeaderLines.split(source)
        guard let storyIndex = lines.firstIndex(where: { StoryHeaderLines.isStoryKeyword($0) }) else { return nil }

        if let found = locate(in: source) {
            if found.field.value == ifid { return nil }
            let newline = lines[found.index].hasSuffix("\n") ? "\n" : ""
            return Edit(offset: utf16Length(of: lines[..<found.index]),
                        length: lines[found.index].utf16.count,
                        text: "\(found.field.indent)ifid: \(ifid)\(newline)")
        }

        // Absent: insert after `id:`, else after the last header field.
        var idIndex: Int?
        var idIndent: String?
        var lastFieldIndex: Int?
        var lastIndent = "  "
        var index = storyIndex + 1
        while index < lines.count {
            guard let field = StoryHeaderLines.field(in: lines[index]) else { break }
            if field.key == "id", idIndex == nil {
                idIndex = index
                idIndent = field.indent
            }
            lastFieldIndex = index
            lastIndent = field.indent
            index += 1
            // Step over a list-valued field's items (`authors:` and its
            // authors), or the scan stops mid-header and the insert lands
            // inside the list, emptying it.
            guard field.value.isEmpty else { continue }
            while index < lines.count,
                  StoryHeaderLines.isListItem(lines[index], under: field.indent) {
                lastFieldIndex = index
                index += 1
            }
        }
        let insertAfter = idIndex ?? lastFieldIndex ?? storyIndex
        let indent = idIndent ?? lastIndent
        // A header whose last line lacks a newline would splice the new field
        // onto the end of it, so the edit supplies the missing break itself.
        let needsBreak = !lines[insertAfter].hasSuffix("\n")
        return Edit(offset: utf16Length(of: lines[...insertAfter]),
                    length: 0,
                    text: "\(needsBreak ? "\n" : "")\(indent)ifid: \(ifid)\n")
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

    private struct Found {
        let index: Int
        let field: StoryHeaderLines.Field
    }

    /// The `ifid:` line within the story header, if it has one.
    private static func locate(in source: String) -> Found? {
        let lines = StoryHeaderLines.split(source)
        guard let storyIndex = lines.firstIndex(where: { StoryHeaderLines.isStoryKeyword($0) }) else { return nil }
        var index = storyIndex + 1
        while index < lines.count {
            guard let field = StoryHeaderLines.field(in: lines[index]) else { return nil }
            if field.key == "ifid" { return Found(index: index, field: field) }
            index += 1
            // Step over a list-valued field's items, or the search ends on the
            // first one and never sees an `ifid:` that follows the list.
            guard field.value.isEmpty else { continue }
            while index < lines.count,
                  StoryHeaderLines.isListItem(lines[index], under: field.indent) {
                index += 1
            }
        }
        return nil
    }

}
