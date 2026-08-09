// StoryHeaderAutoAssertion.swift
// Reads and writes the `auto-assertion:` story-header field (go-live Phase
// 6e, #253) — the transcript auto-assertion policy behind Test →
// Auto-Assertion. On a bare (assertion-less) command's first test run, the
// runner writes the chosen assertion into the transcript; absent means
// "let me decide" (today's flow — the runner writes nothing).
//
// The menu is a VIEW over this field rather than a preference of its own:
// `sharpee test` from a terminal reads the same line, so an IDE author and a
// terminal author get the identical suite. A per-user preference could not
// reach the CLI and the two would disagree — the same argument that put
// `publish-source:` in the header. The editor owns the field the way it owns
// `themes:` — the author never types it (ADR-298 fielded schema).
// Public interface: StoryHeaderAutoAssertion.Policy,
// .read(from:), .edit(setting:in:), .apply(_:to:).
// Owner context: tools/ide — Workspace.

import Foundation

enum StoryHeaderAutoAssertion {

    /// The field's key, spelled as the Chord parser accepts it.
    static let key = "auto-assertion"

    /// The closed value set the Chord parser accepts. Raw values are the
    /// header spellings; "let me decide" is the ABSENCE of the field, so it
    /// is not a case here.
    enum Policy: String, CaseIterable {
        case allEmittedText = "all-emitted-text"
        case roomDescription = "room-description"
        case roomNameAndDescription = "room-name-and-description"

        /// The menu-facing name, matching the wording David chose in F8.
        var displayName: String {
            switch self {
            case .allEmittedText: return "All Emitted Text"
            case .roomDescription: return "Room Description"
            case .roomNameAndDescription: return "Room Name and Description"
            }
        }
    }

    /// A single replacement in the story source — same shape as
    /// `StoryHeaderThemes.Edit`, so it travels the editor's undoable replace
    /// path. An insertion is a zero-length replacement; a removal is a
    /// replacement with empty text.
    struct Edit: Equatable {
        /// UTF-16 offset into the source, always at a line boundary.
        let offset: Int
        /// UTF-16 length being replaced; 0 to insert.
        let length: Int
        /// The line to write, including its trailing newline; empty to remove.
        let text: String
    }

    /// The policy the header declares.
    ///
    /// - Parameter source: the whole `.story` file text.
    /// - Returns: the declared policy, or nil for an absent field, a source
    ///   with no `story` block, or a value the compiler would reject (an
    ///   unparseable value must read as "let me decide", exactly as the
    ///   parser treats it — never as some nearest policy).
    static func read(from source: String) -> Policy? {
        guard let found = locate(in: source) else { return nil }
        return Policy(rawValue: found.field.value.lowercased())
    }

    /// The edit that sets the policy to `policy`, or removes the line for nil.
    ///
    /// An existing line is replaced in place so the author's field order
    /// survives; a new line goes after the last header field. `nil` REMOVES
    /// the line — a header on "let me decide" says nothing, matching the
    /// runner's own default.
    ///
    /// - Parameters:
    ///   - policy: the policy to declare, or nil for "let me decide".
    ///   - source: the whole `.story` file text.
    /// - Returns: the edit to apply, or nil when the source declares no
    ///   top-level `story` block (inventing a header would corrupt the file)
    ///   or when the field already reads as `policy` (no edit means no
    ///   spurious undo entry and no dirty tab).
    static func edit(setting policy: Policy?, in source: String) -> Edit? {
        let lines = StoryHeaderLines.split(source)
        guard let storyIndex = lines.firstIndex(where: { StoryHeaderLines.isStoryKeyword($0) }) else { return nil }

        if let found = locate(in: source) {
            if Policy(rawValue: found.field.value.lowercased()) == policy { return nil }
            let lineOffset = utf16Length(of: lines[..<found.index])
            guard let policy else {
                // Remove the whole line, its newline included.
                return Edit(offset: lineOffset, length: lines[found.index].utf16.count, text: "")
            }
            let newline = lines[found.index].hasSuffix("\n") ? "\n" : ""
            return Edit(offset: lineOffset,
                        length: lines[found.index].utf16.count,
                        text: "\(found.field.indent)\(key): \(policy.rawValue)\(newline)")
        }

        // No such field yet — and an absent field already means "let me
        // decide", so choosing it is nothing to write.
        guard let policy else { return nil }

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
                    text: "\(needsBreak ? "\n" : "")\(indent)\(key): \(policy.rawValue)\n")
    }

    /// `source` with `edit` applied — the non-editor path, and what the tests
    /// assert on, so both read the same result the editor would produce.
    static func apply(_ edit: Edit, to source: String) -> String {
        let text = source as NSString
        return text.replacingCharacters(in: NSRange(location: edit.offset, length: edit.length),
                                        with: edit.text)
    }

    // MARK: - Internals

    private static func utf16Length(of lines: ArraySlice<String>) -> Int {
        lines.reduce(0) { $0 + $1.utf16.count }
    }

    private struct Found {
        let index: Int
        let field: StoryHeaderLines.Field
    }

    /// The `auto-assertion:` line within the story header, if it has one.
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
