// PlayToWrite.swift
// Play-to-write (ADR-333 D4/D4a): a ⌘-clicked paragraph in Play names the
// message that wrote it (`data-message-id`, ADR-333 D1-D3); this resolves that
// id to the place the author edits. A story phrase — descriptions included —
// resolves to its span in the retained IR (the fragment file rides on the
// span, ADR-333 D2). A platform id resolves to the story's existing
// `override message` block when it has one, else to a NEW block appended to
// the main story file, pre-filled with the pack's template (D4a) — the one
// ADR-255 artifact, nothing invented.
//
// A single-template phrase (one arm, no strategy — D4c) can instead be edited
// IN Play: `inlineTemplate` reads the template out of the source at the
// span and says what range a new text replaces, re-indented.
//
// Pure and view-free: the window applies the target (opens the editor,
// inserts the block, or hands Play the inline template) and owns the save →
// build → reload → replay loop.
// Public interface: PlayToWriteTarget, PlayToWriteError,
// PlayToWrite.resolve(messageId:ir:catalog:), overrideBlock(alias:template:),
// appendingOverride(alias:template:to:), isInlineEligible(_:),
// phraseName(for:target:ir:), inlineTemplate(source:span:), InlineTemplate,
// PlayToWriteSession.
// Owner context: tools/ide — Play.

import Foundation

/// Where a clicked paragraph's text lives.
enum PlayToWriteTarget: Equatable {
    /// A story phrase (or an entity description) at its span; `file` names the
    /// fragment relative to the main file's directory, nil for the main file.
    case phrase(key: String, file: String?, span: DiagnosticSpan)
    /// The story already overrides this platform message — its block's span.
    case existingOverride(alias: String, file: String?, span: DiagnosticSpan)
    /// A platform message the story does not override yet: the block to add.
    case newOverride(alias: String, template: String)
    /// An ask/tell reply about a known character (ADR-333 D4d): the answer
    /// belongs to THAT character and THAT topic — a `define topics for`
    /// row with its own phrase — never to a line other characters share.
    /// `hasTopics` says whether the character already has a block to merge
    /// the row into; `replacing` names the shared phrase the character's
    /// existing row for this topic fires, to be repointed at the new one.
    case topicRow(entityId: String, entityName: String, file: String?, topic: String, hasTopics: Bool,
                  span: DiagnosticSpan, replacing: String?)
}

/// The platform replies whose "who and what" make a topic row the right
/// edit: the asked-about-nothing and told-about-nothing defaults.
private let topicReplyIds: Set<String> = ["if.action.asking.unknown_topic", "if.action.telling.not_interested"]
/// The actions whose replies are about a character and a topic.
private let topicActionIds: Set<String> = ["if.action.asking", "if.action.telling"]

/// Why a paragraph could not be resolved. Each names what was missing so a
/// drift in the IR (a phrase without its `span`) fails loudly, never as a
/// silent jump to nowhere (ADR-333 Consequences: the decoder follows IR fields).
enum PlayToWriteError: Error, Equatable {
    /// The IR names the phrase but carries no `span` for it.
    case phraseSpanMissing(key: String)
    /// Not a story phrase, and not an overridable platform message.
    case unknownMessage(id: String)
    /// A platform id with no catalog loaded to name its alias and template.
    case catalogUnavailable(id: String)
    /// An inline commit whose paragraph no longer resolves to an in-place
    /// template (the source moved under it, or it was never eligible).
    case inlineTargetMissing(id: String)
}

enum PlayToWrite {

    /// Resolve a rendered paragraph's message id.
    ///
    /// - Parameters:
    ///   - messageId: the paragraph's `data-message-id`.
    ///   - ir: the retained Story IR (phrases and overrides carry spans).
    ///   - catalog: the platform message catalog, when fetched.
    /// - Returns: the edit target.
    /// - Throws: `PlayToWriteError` naming what was missing.
    static func resolve(messageId: String, ir: ComposeStoryIR, catalog: MessageCatalog?,
                        facts: [String: String] = [:], overrideEverywhere: Bool = false) throws -> PlayToWriteTarget {
        // D4d: the paragraph answered an ask or tell ABOUT something, to a
        // character the story declares — the platform default, or a story
        // phrase the action rendered (a greeting, a catch-all, a row).
        let topicContext: (entity: ComposeStoryIR.Entity, topic: String)? = {
            guard !overrideEverywhere,
                  topicReplyIds.contains(messageId) || facts["actionId"].map(topicActionIds.contains) == true,
                  let targetName = facts["targetName"], let topic = facts["topic"], !topic.isEmpty,
                  let entity = ir.allEntities.first(where: { $0.name.caseInsensitiveCompare(targetName) == .orderedSame })
            else { return nil }
            return (entity, topic)
        }()
        if let phrase = ir.phrases?.defaultLocaleNames.first(where: { $0.key == messageId }) {
            guard let span = phrase.span else { throw PlayToWriteError.phraseSpanMissing(key: messageId) }
            if let (entity, topic) = topicContext {
                // The character's own row for this topic fires this phrase, and
                // nobody else's does: edit the phrase in place. Otherwise the
                // answer becomes THIS character's own (David, 2026-09-06:
                // "editing that response should create a new custom response
                // for that specific stallkeeper") — a new row, or the existing
                // row repointed away from the shared phrase.
                let ownRow = entity.topicRows(answering: topic).contains { $0.phraseKeys.contains(messageId) }
                let sharedElsewhere = ir.allEntities.contains { other in
                    other.id != entity.id && other.topicRows.contains { $0.phraseKeys.contains(messageId) }
                }
                if ownRow && !sharedElsewhere {
                    return .phrase(key: messageId, file: span.file, span: span)
                }
                return .topicRow(entityId: entity.id, entityName: entity.name, file: entity.span.file, topic: topic,
                                 hasTopics: entity.topicCount > 0, span: entity.span, replacing: ownRow ? messageId : nil)
            }
            return .phrase(key: messageId, file: span.file, span: span)
        }
        if let (entity, topic) = topicContext, topicReplyIds.contains(messageId) {
            return .topicRow(entityId: entity.id, entityName: entity.name, file: entity.span.file,
                             topic: topic, hasTopics: entity.topicCount > 0, span: entity.span, replacing: nil)
        }
        guard let catalog else { throw PlayToWriteError.catalogUnavailable(id: messageId) }
        guard let entry = catalog.entry(forId: messageId) else {
            throw PlayToWriteError.unknownMessage(id: messageId)
        }
        if let existing = ir.messageOverrides?.defaultLocaleNames.first(where: { $0.key == entry.alias }) {
            guard let span = existing.span else { throw PlayToWriteError.phraseSpanMissing(key: entry.alias) }
            return .existingOverride(alias: entry.alias, file: span.file, span: span)
        }
        return .newOverride(alias: entry.alias, template: entry.template)
    }

    /// The `override message` block for an alias, its body the pack's template
    /// line for line (ADR-255 D1: the body IS a phrase body, end-terminated,
    /// so a multi-paragraph template survives).
    static func overrideBlock(alias: String, template: String) -> String {
        let body = template
            .components(separatedBy: "\n")
            .map { $0.isEmpty ? "" : "  " + $0 }
            .joined(separator: "\n")
        return "override message \(alias)\n\(body)\nend override\n"
    }

    /// The edit that appends a new override block to the main story source:
    /// the text to insert, the UTF-16 offset to insert it at (the end of the
    /// buffer), and the 1-based line the author lands on — the block's first
    /// body line, the prose itself.
    struct AppendEdit: Equatable {
        let text: String
        let offset: Int
        let line: Int
        /// UTF-16 length of the text `text` replaces at `offset`; 0 inserts.
        var length: Int = 0
    }

    /// Compute the append edit against the text that will be edited (the open
    /// buffer, per the editor's rule). A blank line separates the block from
    /// whatever ends the file.
    static func appendingOverride(alias: String, template: String, to source: String) -> AppendEdit {
        var prefix = ""
        if !source.isEmpty {
            if !source.hasSuffix("\n") { prefix = "\n\n" } else if !source.hasSuffix("\n\n") { prefix = "\n" }
        }
        // The header line is one past the newlines that precede it; the prose is the next line.
        let headerLine = (source + prefix).filter { $0 == "\n" }.count + 1
        return AppendEdit(text: prefix + overrideBlock(alias: alias, template: template),
                          offset: (source as NSString).length,
                          line: headerLine + 1)
    }

    /// A one-line, author-facing account of why an edit did not happen.
    static func describe(_ error: Error, messageId: String) -> String {
        switch error as? PlayToWriteError {
        case .phraseSpanMissing(let key):
            return "Couldn't edit \(key): the compose carries no source position for it."
        case .unknownMessage(let id):
            return "Couldn't edit this paragraph: \(id) is neither a story phrase nor a platform message."
        case .catalogUnavailable:
            return "Couldn't edit this paragraph: the platform message catalog isn't available (`sharpee messages` failed)."
        case .inlineTargetMissing(let id):
            return "Couldn't write the edit for \(id): the source under it changed or can't be found — open the character's file and check its `define topics` block."
        case .none:
            return "Couldn't edit \(messageId): \(error.localizedDescription)"
        }
    }

    // MARK: Topic rows (ADR-333 D4d)

    /// The phrase key a topic row's answer is registered under:
    /// `<entity-id>-on-<topic-slug>`.
    static func topicPhraseKey(entityId: String, topic: String) -> String {
        let slug = topic.lowercased()
            .map { $0.isLetter || $0.isNumber ? String($0) : "-" }
            .joined()
            .split(separator: "-", omittingEmptySubsequences: true)
            .joined(separator: "-")
        return "\(entityId)-on-\(slug.isEmpty ? "topic" : slug)"
    }

    /// The 1-based last line of the character's `create` block in `lines`:
    /// the header `create [the|a|an] <name>` (case-insensitive), then every
    /// line up to the next top-level line (one that starts in column 1 and is
    /// not a `##` comment), trailing blank lines excluded. Nil when there is
    /// no such header.
    static func createBlockEndLine(lines: [String], entityName: String) -> Int? {
        let header = try? NSRegularExpression(
            pattern: "^create (the |a |an )?" + NSRegularExpression.escapedPattern(for: entityName) + "\\s*$",
            options: [.caseInsensitive])
        guard let header,
              let start = lines.firstIndex(where: { header.firstMatch(in: $0, range: NSRange(location: 0, length: ($0 as NSString).length)) != nil })
        else { return nil }
        var last = start
        for index in lines.indices.dropFirst(start + 1) {
            let line = lines[index]
            let topLevel = !line.isEmpty && !line.hasPrefix(" ") && !line.hasPrefix("\t") && !line.hasPrefix("##")
            if topLevel { break }
            if !line.trimmingCharacters(in: .whitespaces).isEmpty && !line.hasPrefix("##") { last = index }
        }
        return last + 1
    }

    /// The `about "<topic>":` row, pointing at the phrase.
    static func topicRowText(topic: String, phraseKey: String) -> String {
        let quoted = topic.replacingOccurrences(of: "\"", with: "'")
        return "  about \"\(quoted)\":\n    phrase \(phraseKey)\n"
    }

    /// The edits that land a topic row and its phrase in `source`, the
    /// character's file, BESIDE the character (David, 2026-09-06: the code
    /// must land near its owner, not at the end of the file). When the
    /// character already has a `define topics for` block, the row goes in
    /// before its `end topics` and the phrase lands right after that block;
    /// otherwise a new block and the phrase land right after the character's
    /// `create` block, or at the end of the file when the block cannot be
    /// found. Every position is read from `source` ITSELF — the text being
    /// edited — never from a compose span: a span describes the file as it
    /// was composed, and the buffer may have moved on (the author deleted an
    /// earlier addition and rebuilt; 2026-09-06, the insertion landed inside
    /// a phrase). Edits come LAST-FIRST so applying them in order never
    /// shifts an earlier offset. `line` on each edit is the 1-based line its
    /// text starts on.
    ///
    /// - Returns: nil when the block is found but has no `end topics`
    ///   (the source is mid-edit; the click falls back to the editor).
    static func topicRowEdits(source: String, entityName: String, entityId: String, topic: String, text: String,
                              replacing oldPhraseKey: String? = nil) -> [AppendEdit]? {
        let phraseKey = topicPhraseKey(entityId: entityId, topic: topic)
        let ns = source as NSString
        let lines = source.components(separatedBy: "\n")
        let createEndLine = createBlockEndLine(lines: lines, entityName: entityName)
        /// UTF-16 offset of the END of a 1-based line (before its newline).
        func endOfLine(_ line: Int) -> Int {
            let clamped = max(1, min(line, lines.count))
            return (lines.prefix(clamped).joined(separator: "\n") as NSString).length
        }
        /// UTF-16 offset of the START of a 1-based line.
        func startOfLine(_ line: Int) -> Int {
            line <= 1 ? 0 : (lines.prefix(line - 1).joined(separator: "\n") as NSString).length + 1
        }
        // The block header, article optional, case-insensitive.
        let pattern = "^define topics for (the |a |an )?" + NSRegularExpression.escapedPattern(for: entityName) + "\\s*$"
        let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .anchorsMatchLines])
        var headerLine: Int? = nil
        if let regex, let m = regex.firstMatch(in: source, range: NSRange(location: 0, length: ns.length)) {
            headerLine = ns.substring(to: m.range.location).components(separatedBy: "\n").count
        }
        let phraseBlock = "define phrase \(phraseKey)\n" + text.components(separatedBy: "\n").map { $0.isEmpty ? "" : "  " + $0 }.joined(separator: "\n") + "\nend phrase\n"
        if let headerLine {
            guard let endIndex = lines.indices.dropFirst(headerLine).first(where: { lines[$0].trimmingCharacters(in: .whitespaces) == "end topics" }) else { return nil }
            let endTopicsLine = endIndex + 1
            let phraseAfterBlock = AppendEdit(text: "\n\n" + phraseBlock.dropLast(), offset: endOfLine(endTopicsLine), line: endTopicsLine + 2)
            if let oldPhraseKey {
                // The character's own row for this topic fires a phrase others
                // share: repoint that one `phrase <old>` line at the new phrase.
                // The row is the `about` line naming the topic; its body runs to
                // the next `about` or `end topics`.
                let quoted = "\"" + topic.lowercased().replacingOccurrences(of: "\"", with: "'") + "\""
                var index = headerLine // 0-based index of the line AFTER the header
                while index < endIndex {
                    let line = lines[index]
                    let trimmed = line.trimmingCharacters(in: .whitespaces)
                    if trimmed.hasPrefix("about ") && trimmed.lowercased().contains(quoted) {
                        var bodyIndex = index + 1
                        while bodyIndex < endIndex, !lines[bodyIndex].trimmingCharacters(in: .whitespaces).hasPrefix("about ") {
                            let body = lines[bodyIndex]
                            if let range = body.range(of: "phrase " + oldPhraseKey),
                               body[range.upperBound...].trimmingCharacters(in: .whitespaces).isEmpty
                                || body[range.upperBound...].hasPrefix(" ") {
                                let keyStart = startOfLine(bodyIndex + 1)
                                    + (String(body[..<range.lowerBound]) as NSString).length + ("phrase " as NSString).length
                                return [
                                    phraseAfterBlock,
                                    AppendEdit(text: phraseKey, offset: keyStart, line: bodyIndex + 1, length: (oldPhraseKey as NSString).length),
                                ]
                            }
                            bodyIndex += 1
                        }
                    }
                    index += 1
                }
                // The row the compose described is not in this text: fall
                // through and add a row of its own.
            }
            let row = topicRowText(topic: topic, phraseKey: phraseKey)
            // The phrase right after the block (a blank line between); the
            // row before `end topics`. Phrase first: its offset is the later one.
            return [
                phraseAfterBlock,
                AppendEdit(text: row, offset: startOfLine(endTopicsLine), line: endTopicsLine),
            ]
        }
        let block = "define topics for the \(entityName)\n" + topicRowText(topic: topic, phraseKey: phraseKey) + "end topics\n"
        if let createEndLine, createEndLine >= 1, createEndLine <= lines.count {
            // Right after the character: a blank line, the block, a blank
            // line, the phrase — the line's own newline stays behind the phrase.
            let text = "\n\n" + block + "\n" + phraseBlock.dropLast()
            return [AppendEdit(text: text, offset: endOfLine(createEndLine), line: createEndLine + 2)]
        }
        var prefix = ""
        if !source.isEmpty {
            if !source.hasSuffix("\n") { prefix = "\n\n" } else if !source.hasSuffix("\n\n") { prefix = "\n" }
        }
        let blockLine = (source + prefix).filter { $0 == "\n" }.count + 1
        return [AppendEdit(text: prefix + block + "\n" + phraseBlock, offset: ns.length, line: blockLine)]
    }

    // MARK: Inline editing (ADR-333 D4c)

    /// Whether a phrase can be edited in place: one arm, no strategy. A
    /// cycling / random / multi-arm phrase opens the editor instead — the arms
    /// and their strategy are the author's to see whole.
    static func isInlineEligible(_ name: ComposeStoryIR.PhraseName) -> Bool {
        name.strategy == nil && name.variantCount == 1
    }

    /// The phrase name the resolver's target came from, when it is a story
    /// phrase or an existing override — nil for a new override (nothing to
    /// edit in place yet) or an id the IR does not name.
    static func phraseName(for messageId: String, target: PlayToWriteTarget, ir: ComposeStoryIR) -> ComposeStoryIR.PhraseName? {
        switch target {
        case .phrase:
            return ir.phrases?.defaultLocaleNames.first { $0.key == messageId }
        case .existingOverride(let alias, _, _):
            return ir.messageOverrides?.defaultLocaleNames.first { $0.key == alias }
        case .newOverride, .topicRow:
            return nil
        }
    }

    /// What the inline field edits: the template text as the author wrote it
    /// (indentation stripped), the UTF-16 range in the source it replaces,
    /// the indentation to restore on write-back, and which shape the span
    /// has. A prose span (a description) covers exactly the prose, so the
    /// range starts mid-line at the prose's column; a block span (`define
    /// phrase` / `override message`) covers the whole block, so the range is
    /// its body lines only, header and `end` untouched.
    struct InlineTemplate: Equatable {
        enum Kind: Equatable { case prose, block }
        let text: String
        let range: NSRange
        let indent: String
        let kind: Kind

        /// The source text that replaces `range` for a new template `text`:
        /// continuation lines get the indent back (a blank line stays blank),
        /// and a block body's first line too, since the range starts at its
        /// line start.
        func replacement(for newText: String) -> String {
            let lines = newText.components(separatedBy: "\n")
            return lines.enumerated().map { index, line in
                if line.isEmpty { return "" }
                if index == 0 && kind == .prose { return line }
                return indent + line
            }.joined(separator: "\n")
        }
    }

    /// Read the template at `span` out of `source`.
    ///
    /// - Returns: nil when the span does not fit the source, or a block has no
    ///   body lines — nothing to edit in place; the caller opens the editor.
    static func inlineTemplate(source: String, span: DiagnosticSpan) -> InlineTemplate? {
        let ns = source as NSString
        let lines = source.components(separatedBy: "\n")
        guard span.line >= 1, span.endLine >= span.line, span.endLine <= lines.count else { return nil }
        // UTF-16 offset of the start of each 1-based line.
        var starts: [Int] = [0]
        var offset = 0
        for line in lines.dropLast() {
            offset += (line as NSString).length + 1
            starts.append(offset)
        }
        func indentation(of line: String) -> String {
            String(line.prefix { $0 == " " || $0 == "\t" })
        }
        let first = lines[span.line - 1]
        let fromColumn = String(first.dropFirst(max(0, span.column - 1)))
        let isBlock = fromColumn.hasPrefix("define phrase") || fromColumn.hasPrefix("override message")
        if isBlock {
            let bodyFirst = span.line + 1, bodyLast = span.endLine - 1
            guard bodyLast >= bodyFirst else { return nil }
            let body = Array(lines[(bodyFirst - 1)...(bodyLast - 1)])
            let indent = indentation(of: body.first { !$0.isEmpty } ?? "")
            let text = body.map { $0.hasPrefix(indent) ? String($0.dropFirst(indent.count)) : $0 }.joined(separator: "\n")
            let start = starts[bodyFirst - 1]
            let end = starts[bodyLast - 1] + (lines[bodyLast - 1] as NSString).length
            return InlineTemplate(text: text, range: NSRange(location: start, length: end - start), indent: indent, kind: .block)
        }
        let start = starts[span.line - 1] + (span.column - 1)
        let end = starts[span.endLine - 1] + (span.endColumn - 1)
        guard start <= end, end <= ns.length else { return nil }
        let slice = ns.substring(with: NSRange(location: start, length: end - start))
        let indent = indentation(of: first)
        let sliceLines = slice.components(separatedBy: "\n")
        let text = sliceLines.enumerated().map { index, line in
            index == 0 ? line : (line.hasPrefix(indent) ? String(line.dropFirst(indent.count)) : line)
        }.joined(separator: "\n")
        return InlineTemplate(text: text, range: NSRange(location: start, length: end - start), indent: indent, kind: .prose)
    }
}

/// One play-to-write round: the paragraph the author ⌘-clicked, and the
/// command history Play captured at that moment — session-only (D4b), never
/// written anywhere. Armed by the click, consumed by the reload after the
/// build the save triggers.
struct PlayToWriteSession: Equatable {
    /// The clicked paragraph's message id — the paragraph to bring back into view.
    let messageId: String
    /// The commands typed since boot, in order, as Play captured them.
    let history: [String]
}
