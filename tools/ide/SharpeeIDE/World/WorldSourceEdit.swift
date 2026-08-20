// WorldSourceEdit.swift
// The World tab's candidate list, made actionable: what text to change, and where,
// when the author accepts one of a card's offers (ADR-321 Amendment 3).
//
// It computes edits; it never applies them. The application goes through the
// editor's undoable `replaceText`, so an accepted offer is an ordinary typing edit
// the author can ⌘Z, see in a diff, and save when they choose — the same path the
// Problems panel's IFID fix already takes.
//
// IT NEVER WRITES PROSE. Adding `stout` to a door's `aka` line uses a word the
// author already wrote about that door; defining scenery writes the declaration and
// stops at the description, which is the author's to write. A tool that invents
// story text is a tool that has to be read suspiciously afterwards.
// Public interface: WorldSourceEdit, WorldSourceEdit.addingWord(_:to:in:),
// WorldSourceEdit.definingScenery(_:in:source:).
// Owner context: tools/ide — World.

import Foundation

/// Where a new thing goes: which room it is in, and what it is written beside.
///
/// The two are different questions and the corpus makes that plain. *the pen* is
/// named in William Shakespeare's topic list, so it belongs in the Tiring-House
/// (where he is) and it belongs NEXT TO HIM in the file (that is what named it). A
/// room hosting its own scenery is just the case where both answers coincide.
struct WorldRoomPlacement: Equatable {
    /// The room's authored name for the `in the …` line, when a room can be named.
    let room: String?
    /// The authored name of the thing whose prose named it — the file anchor.
    let host: String
}

/// One text change, ready for the editor.
struct WorldSourceEdit: Equatable {
    /// The UTF-16 range to replace; zero length for an insertion.
    let range: NSRange
    /// What to put there.
    let text: String
    /// Where to leave the author afterwards, 1-based.
    let line: Int
    /// What the offer was, for the undo-worthy sentence a surface shows.
    let summary: String
}

extension WorldSourceEdit {

    /// Teach an existing thing one more word the prose already calls it.
    ///
    /// Appends to the entity's `aka` line when it has one, and opens one under the
    /// kind line when it does not — matching the indentation that block actually uses.
    ///
    /// FOUND BY ITS `create` LINE, NOT BY LINE NUMBER. The analysis describes the story
    /// as it was BUILT; the text being edited is the author's buffer, which moves the
    /// moment they type or accept another offer. An edit anchored to a stale line
    /// number lands wherever that many lines now reach.
    ///
    /// - Parameters:
    ///   - word: the word to add, as the prose spells it
    ///   - name: the thing's authored name, e.g. `tiring-house door`
    ///   - text: the text that will be edited — the open buffer, not the file
    /// - Returns: the edit, or nil when the block cannot be found or already answers
    ///   to the word
    static func addingWord(_ word: String, toThingNamed name: String, in text: String) -> WorldSourceEdit? {
        let lines = text.components(separatedBy: "\n")
        guard let start = indexOfCreateLine(named: name, in: lines) else { return nil }
        let end = indexOfBlockEnd(from: start, in: lines)

        for index in (start + 1)..<end {
            let trimmed = lines[index].trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix("aka ") else { continue }
            // Already answers to it, WORD by word: `aka cock, water valve` is two
            // aliases and four words, and the parser resolves on the words — so adding
            // `water` would write a line that changes nothing.
            let known = Set((lines[start] + " " + trimmed.dropFirst(4))
                .lowercased()
                .split(whereSeparator: { !$0.isLetter && $0 != "-" && $0 != "'" })
                .map(String.init))
            if known.contains(word.lowercased()) { return nil }

            let offset = utf16Offset(ofLine: index, in: lines) + (lines[index] as NSString).length
            return WorldSourceEdit(range: NSRange(location: offset, length: 0),
                                   text: ", \(word)",
                                   line: index + 1,
                                   summary: "add “\(word)” to its aka line")
        }

        // No aka line: open one AFTER THE KIND LINE, not under `create`. The parser
        // takes it either way, but every block in every corpus story reads
        // `create the Iron Gates / a room / aka gates, gate` — shape, then aliases.
        let firstClause = start + 1
        let hasClause = firstClause < lines.count && isClauseLine(lines[firstClause])
        let anchor = hasClause ? firstClause : start
        let indent = hasClause ? leadingWhitespace(of: lines[anchor]) : "  "
        let offset = utf16Offset(ofLine: anchor, in: lines) + (lines[anchor] as NSString).length
        return WorldSourceEdit(range: NSRange(location: offset, length: 0),
                               text: "\n\(indent)aka \(word)",
                               line: anchor + 2,
                               summary: "give it an aka line naming “\(word)”")
    }

    /// A NEW THING GOES NEXT TO WHAT NAMED IT, not at the end of the file (David's
    /// ruling). A story is read in the order it is written, and a tavern's fittings
    /// belong with the tavern; appending to the end scatters them across the file in
    /// the order the author happened to accept offers. The host need not be a room —
    /// *the pen* is named in a poet's topic list, and belongs beside the poet, in the
    /// room the poet is in. Only a passage that belongs to NOTHING — a story-level
    /// phrase with no owner at all — has no better place than the end.
    ///
    /// - Parameters:
    ///   - phrase: the phrase the prose used, as written
    ///   - placement: the room it goes in and the declaration it goes beside
    ///   - text: the text that will be edited — the open buffer, not the file
    /// - Returns: the edit, always — a story can always take one more declaration
    static func definingScenery(_ phrase: String,
                                placedBy placement: WorldRoomPlacement?,
                                in text: String) -> WorldSourceEdit {
        var block = "create the \(phrase)\n  scenery\n"
        if let room = placement?.room { block += "  in the \(room)\n" }

        let lines = text.components(separatedBy: "\n")
        guard let host = placement?.host,
              let start = indexOfCreateLine(named: host, in: lines) else {
            // No host to sit beside: the end of the file, and the END of the file —
            // measured on the text being edited, never on a copy of it read from disk.
            let length = (text as NSString).length
            let endsCleanly = text.hasSuffix("\n")
            return WorldSourceEdit(range: NSRange(location: length, length: 0),
                                   text: (endsCleanly ? "\n" : "\n\n") + block,
                                   line: lines.count + (endsCleanly ? 1 : 2),
                                   summary: "declare “\(phrase)” as scenery")
        }

        // After the HOST's own block, and after the blank lines it ends on, so the new
        // declaration sits between what named it and whatever came next, rather than
        // inside the gap the author left.
        var after = indexOfBlockEnd(from: start, in: lines)
        while after < lines.count, lines[after].trimmingCharacters(in: .whitespaces).isEmpty { after += 1 }
        let offset = utf16Offset(ofLine: after, in: lines)
        return WorldSourceEdit(range: NSRange(location: offset, length: 0),
                               text: block + "\n",
                               line: after + 1,
                               summary: placement?.room.map { "declare “\(phrase)” as scenery in the \($0)" }
                                   ?? "declare “\(phrase)” as scenery beside \(host)")
    }

    /// Open the line a thing's description goes on.
    ///
    /// Writes a blank line and an indent after the block's last clause — the shape
    /// every described thing in the corpus has — and stops. What goes on that line is
    /// prose, and prose is the author's; this only takes them to it with the cursor in
    /// the right column (ADR-321 Amendment 3).
    ///
    /// - Parameters:
    ///   - name: the thing's authored name
    ///   - text: the text that will be edited — the open buffer, not the file
    /// - Returns: the edit, or nil when the block cannot be found
    static func openingDescription(forThingNamed name: String, in text: String) -> WorldSourceEdit? {
        let lines = text.components(separatedBy: "\n")
        guard let start = indexOfCreateLine(named: name, in: lines) else { return nil }
        let end = indexOfBlockEnd(from: start, in: lines)
        let last = max(start, end - 1)
        let indent = last > start ? leadingWhitespace(of: lines[last]) : "  "

        let offset = utf16Offset(ofLine: last, in: lines) + (lines[last] as NSString).length
        return WorldSourceEdit(range: NSRange(location: offset, length: 0),
                               text: "\n\n\(indent)",
                               line: last + 3,
                               summary: "open a description line for \(name)")
    }

    /// Where a thing of this name is declared.
    ///
    /// Matches `create the Tavern`, `create Will Kemp` and `create the plot-board`
    /// alike — Chord's article is optional and the corpus uses both.
    ///
    /// - Parameters:
    ///   - name: the authored name
    ///   - lines: the text, split on newlines
    /// - Returns: the 0-based index of its `create` line, or nil
    static func indexOfCreateLine(named name: String, in lines: [String]) -> Int? {
        let wanted = name.lowercased()
        for (index, line) in lines.enumerated() {
            guard !line.hasPrefix(" "), !line.hasPrefix("\t") else { continue }
            var trimmed = line.trimmingCharacters(in: .whitespaces).lowercased()
            guard trimmed.hasPrefix("create ") else { continue }
            trimmed = String(trimmed.dropFirst("create ".count))
            if trimmed.hasPrefix("the ") { trimmed = String(trimmed.dropFirst(4)) }
            if trimmed == wanted { return index }
        }
        return nil
    }

    /// Where a block stops: the next line at column 0 that opens something else.
    ///
    /// Indentation scopes a Chord block, so anything unindented ends it — the next
    /// `create`, a `define`, a `##` divider, or the end of the text.
    ///
    /// - Parameters:
    ///   - start: the 0-based index of the block's opening line
    ///   - lines: the text, split on newlines
    /// - Returns: the 0-based index one past the block's last line
    static func indexOfBlockEnd(from start: Int, in lines: [String]) -> Int {
        var end = start + 1
        var lastContent = start + 1
        while end < lines.count {
            let line = lines[end]
            let blank = line.trimmingCharacters(in: .whitespaces).isEmpty
            if !blank && !line.hasPrefix(" ") && !line.hasPrefix("\t") { break }
            end += 1
            if !blank { lastContent = end }
        }
        return lastContent
    }

    /// The UTF-16 offset where a line begins.
    /// - Parameters:
    ///   - index: 0-based line index
    ///   - lines: the source, split on newlines
    /// - Returns: the offset of that line's first character
    private static func utf16Offset(ofLine index: Int, in lines: [String]) -> Int {
        var offset = 0
        for line in lines.prefix(index) { offset += (line as NSString).length + 1 }
        return offset
    }

    /// Whether a line is one of a block's clause lines — indented, and not blank.
    ///
    /// Description prose is indented too, but it follows a blank line, and this is
    /// only ever asked of the line directly under `create`.
    ///
    /// - Parameter line: the line to test
    /// - Returns: true when it belongs to the declaration's clauses
    private static func isClauseLine(_ line: String) -> Bool {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        return !trimmed.isEmpty && (line.hasPrefix(" ") || line.hasPrefix("\t"))
    }

    /// The indentation a line opens with.
    /// - Parameter line: the line to read
    /// - Returns: its leading whitespace, or two spaces when it has none
    private static func leadingWhitespace(of line: String) -> String {
        let indent = line.prefix { $0 == " " || $0 == "\t" }
        return indent.isEmpty ? "  " : String(indent)
    }
}
