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
// Pure and view-free: the window applies the target (opens the editor,
// inserts the block) and owns the save → build → reload → replay loop.
// Public interface: PlayToWriteTarget, PlayToWriteError,
// PlayToWrite.resolve(messageId:ir:catalog:), overrideBlock(alias:template:),
// appendingOverride(alias:template:to:), PlayToWriteSession.
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
