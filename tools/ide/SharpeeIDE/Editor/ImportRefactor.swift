// ImportRefactor.swift
// The text half of File → New Import… and Edit → Extract Selection to Import…
// (GH #288): what a fragment name may be, where its file goes, what the import
// line reads, and how a selection snaps to whole declarations before it is
// moved. Pure functions over strings and ranges — no AppKit, no disk — so the
// commands' refusals and edits are tested without a window.
//
// Language facts encoded here so the author never meets them as a diagnostic:
// the import line carries no extension (the compiler appends `.chord`); a path
// is story-rooted, resolved against the `.story` file's folder, so
// `regions/harbor` is legal from any file; a fragment never carries the
// `story` header; and a fragment holds whole declarations only.
// Public interface: ImportRefactor.validatedName(_:), fragmentURL(for:storyDirectory:),
// importLine(for:), extraction(from:selection:name:), Refusal.
// Owner context: tools/ide — Editor.

import Foundation

enum ImportRefactor {

    /// Why a command would not proceed, in the author's words.
    struct Refusal: Error, Equatable {
        let message: String
    }

    /// A selection snapped to whole declarations and ready to move.
    struct Extraction: Equatable {
        /// The UTF-16 range of `source` that leaves the file — whole lines,
        /// from the first declaration's header through the last one's final line.
        let range: NSRange
        /// What the new fragment file holds: the snapped text, newline-terminated.
        let fragmentText: String
        /// What replaces `range` in place: the import line, newline-terminated
        /// when the removed text was.
        let replacement: String
    }

    // MARK: - Names

    /// The import name as the author typed it, cleaned and checked.
    ///
    /// - Parameter raw: the text from the name prompt.
    /// - Returns: the name to write into `import "<name>"`, or a refusal naming
    ///   the problem: empty, an extension the author should not type, an
    ///   absolute path, or a `..` segment that would leave the story folder.
    static func validatedName(_ raw: String) -> Result<String, Refusal> {
        var name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if name.hasSuffix("/") { name.removeLast() }
        guard !name.isEmpty else {
            return .failure(Refusal(message: "Give the import a name, such as regions/harbor."))
        }
        let lower = name.lowercased()
        if lower.hasSuffix(".chord") || lower.hasSuffix(".story") {
            return .failure(Refusal(message: "Leave the extension off — the import line names the file without it, and the file is always .chord."))
        }
        if name.hasPrefix("/") || name.hasPrefix("~") {
            return .failure(Refusal(message: "An import name is relative to the story's folder, so it cannot start with / or ~."))
        }
        let segments = name.split(separator: "/", omittingEmptySubsequences: false)
        if segments.contains(where: { $0.isEmpty }) {
            return .failure(Refusal(message: "An import name cannot contain an empty folder segment (//)."))
        }
        if segments.contains(where: { $0 == "." || $0 == ".." }) {
            return .failure(Refusal(message: "An import name cannot step outside the story's folder with . or .. segments."))
        }
        if name.contains("\"") || name.contains("\\") {
            return .failure(Refusal(message: "An import name cannot contain quotes or backslashes."))
        }
        return .success(name)
    }

    /// Where `name`'s fragment lives: `<story folder>/<name>.chord`.
    static func fragmentURL(for name: String, storyDirectory: URL) -> URL {
        storyDirectory.appendingPathComponent(name + ".chord")
    }

    /// The line that imports `name`, without a trailing newline.
    static func importLine(for name: String) -> String {
        "import \"\(name)\""
    }

    // MARK: - Extraction

    /// Snaps `selection` to whole top-level declarations and describes the move.
    ///
    /// A declaration is a column-0 line (its header) plus every indented, blank,
    /// or `end …` line that follows it up to the next column-0 header — Chord's
    /// indentation structure, which is the same rule the compiler uses to tell
    /// where a block ends. A `##` comment run is a top-level construct of its own
    /// and moves like one.
    ///
    /// - Parameters:
    ///   - source: the whole buffer.
    ///   - selection: the author's UTF-16 selection.
    ///   - name: the validated import name.
    /// - Returns: the snapped range and both texts, or a refusal: no selection,
    ///   a selection that covers no declaration, or one that reaches the `story`
    ///   header (which only the main file may carry).
    static func extraction(from source: String, selection: NSRange, name: String) -> Result<Extraction, Refusal> {
        guard selection.length > 0 else {
            return .failure(Refusal(message: "Select the declarations to move into the new import."))
        }
        let ns = source as NSString
        guard NSMaxRange(selection) <= ns.length else {
            return .failure(Refusal(message: "The selection no longer matches the text."))
        }
        let lines = Line.split(ns)
        guard !lines.isEmpty else {
            return .failure(Refusal(message: "There is nothing to extract."))
        }

        // The lines the selection touches. A selection ending exactly at the
        // start of a line has not touched that line.
        guard var first = lines.firstIndex(where: { NSMaxRange($0.range) > selection.location }) else {
            return .failure(Refusal(message: "Select the declarations to move into the new import."))
        }
        let lastTouched = NSMaxRange(selection) - 1
        guard var last = lines.lastIndex(where: { $0.range.location <= lastTouched }) else {
            return .failure(Refusal(message: "Select the declarations to move into the new import."))
        }

        // Snap the start: a blank line at the start means "from the next
        // declaration"; an indented or `end` line means "from the declaration
        // this belongs to".
        while first < lines.count, lines[first].kind == .blank { first += 1 }
        guard first < lines.count, first <= last else {
            return .failure(Refusal(message: "The selection holds no declaration to extract."))
        }
        while first > 0, lines[first].kind != .header { first -= 1 }
        guard lines[first].kind == .header else {
            return .failure(Refusal(message: "The selection starts inside a block with no header above it."))
        }

        // Snap the end: trim trailing blank lines, then run forward to the end
        // of the declaration the last selected line belongs to.
        while last > first, lines[last].kind == .blank { last -= 1 }
        var end = last
        while end + 1 < lines.count, lines[end + 1].kind != .header { end += 1 }
        while end > first, lines[end].kind == .blank { end -= 1 }

        for index in first...end where lines[index].kind == .header && lines[index].isStoryHeader {
            return .failure(Refusal(message: "The story header stays in the .story file — leave it out of the selection."))
        }

        let start = lines[first].range.location
        let stop = NSMaxRange(lines[end].range)
        let range = NSRange(location: start, length: stop - start)
        var removed = ns.substring(with: range)
        let endedWithNewline = removed.hasSuffix("\n")
        if !endedWithNewline { removed += "\n" }
        let replacement = importLine(for: name) + (endedWithNewline ? "\n" : "")
        return .success(Extraction(range: range, fragmentText: removed, replacement: replacement))
    }

    // MARK: - Lines

    /// One source line, with its newline when it has one.
    private struct Line {
        enum Kind {
            /// Only whitespace.
            case blank
            /// Column-0 text that opens a construct: a declaration header or a
            /// `##` comment line.
            case header
            /// Indented text, or a column-0 `end …` terminator — part of the
            /// construct above it.
            case body
        }

        let range: NSRange
        let kind: Kind
        /// A column-0 `story` header line.
        let isStoryHeader: Bool

        static func split(_ ns: NSString) -> [Line] {
            var lines: [Line] = []
            var index = 0
            var previousWasComment = false
            while index < ns.length {
                var lineStart = 0, lineEnd = 0, contentsEnd = 0
                ns.getLineStart(&lineStart, end: &lineEnd, contentsEnd: &contentsEnd,
                                for: NSRange(location: index, length: 0))
                let text = ns.substring(with: NSRange(location: lineStart, length: contentsEnd - lineStart))
                let isComment = text.hasPrefix("##")
                // A run of consecutive `##` lines is ONE comment construct: the
                // first line heads it, the rest continue it.
                let kind: Kind = (isComment && previousWasComment) ? .body : classify(text)
                lines.append(Line(range: NSRange(location: lineStart, length: lineEnd - lineStart),
                                  kind: kind, isStoryHeader: isStory(text)))
                previousWasComment = isComment
                index = lineEnd
            }
            return lines
        }

        private static func classify(_ text: String) -> Kind {
            guard let firstChar = text.first else { return .blank }
            if text.allSatisfy({ $0 == " " || $0 == "\t" }) { return .blank }
            if firstChar == " " || firstChar == "\t" { return .body }
            let firstWord = text.split(separator: " ", maxSplits: 1).first.map(String.init) ?? text
            return firstWord == "end" ? .body : .header
        }

        private static func isStory(_ text: String) -> Bool {
            let firstWord = text.split(whereSeparator: { $0 == " " || $0 == "\t" }).first.map(String.init)
            return firstWord == "story"
        }
    }
}
