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
}

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
    static func resolve(messageId: String, ir: ComposeStoryIR, catalog: MessageCatalog?) throws -> PlayToWriteTarget {
        if let phrase = ir.phrases?.defaultLocaleNames.first(where: { $0.key == messageId }) {
            guard let span = phrase.span else { throw PlayToWriteError.phraseSpanMissing(key: messageId) }
            return .phrase(key: messageId, file: span.file, span: span)
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
        case .newOverride:
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
