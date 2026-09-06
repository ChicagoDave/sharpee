// PlayToWriteCoordinator.swift
// The play-to-write round (ADR-333 D4/D4a), end to end, between the Play
// pane and the editor: a ⌘-clicked paragraph is resolved against the retained
// IR (and the platform catalog for a platform line), the editor is opened at
// the phrase — or a new `override message` block is inserted as an undoable
// typing edit — and the round is ARMED with the history Play captured. A save
// inside the story while armed asks the window to build; the reload after
// that build takes the session and replays it. Session-only (D4b): nothing
// here is written anywhere.
//
// Extracted from the window so the glue is testable against the REAL editor
// (the window class is private to its file).
// Public interface: PlayToWriteCoordinator, handle(_:storyURL:ir:),
// documentSaved(_:storyURL:), takeSession(), reset(), catalog, session,
// onBuildRequested, onUnresolved.
// Owner context: tools/ide — Play.

import AppKit

@MainActor
final class PlayToWriteCoordinator {

    /// How the platform message catalog is obtained for a story — the
    /// production fetcher runs `sharpee messages` beside it; tests inject.
    typealias CatalogSource = (URL, @escaping MessageCatalogFetcher.Completion) -> Void

    private let editor: EditorViewController
    private let catalogSource: CatalogSource

    /// The armed round, if any.
    private(set) var session: PlayToWriteSession?
    /// The platform catalog once fetched (or injected), per project.
    var catalog: MessageCatalog?

    /// The author finished an edit while a round was armed: build now, as ⌘B would.
    var onBuildRequested: (() -> Void)?
    /// A paragraph could not be resolved — the window decides how to say so.
    var onUnresolved: ((PlayEditRequest, Error) -> Void)?
    /// A ⌘-clicked paragraph is a single template (ADR-333 D4c): Play should
    /// open its inline field with this template instead of the editor. The
    /// round arms when the field commits, not now — an Escape leaves nothing behind.
    var onInlineEditRequested: ((PlayInlineEdit) -> Void)?

    init(editor: EditorViewController, catalogSource: CatalogSource? = nil) {
        self.editor = editor
        if let catalogSource {
            self.catalogSource = catalogSource
        } else {
            let fetcher = MessageCatalogFetcher()
            self.catalogSource = { storyFile, completion in fetcher.fetch(near: storyFile, completion: completion) }
        }
    }

    /// Resolve a ⌘-clicked paragraph, open the editor on it, and arm the round.
    /// A platform line clicked before the catalog arrived fetches it, then
    /// resolves again.
    func handle(_ request: PlayEditRequest, storyURL: URL, ir: ComposeStoryIR) {
        do {
            let target = try PlayToWrite.resolve(messageId: request.messageId, ir: ir, catalog: catalog)
            apply(target, storyURL: storyURL, request: request, ir: ir)
        } catch PlayToWriteError.catalogUnavailable {
            catalogSource(storyURL) { [weak self] result in
                guard let self else { return }
                switch result {
                case .success(let catalog):
                    self.catalog = catalog
                    do {
                        let target = try PlayToWrite.resolve(messageId: request.messageId, ir: ir, catalog: catalog)
                        self.apply(target, storyURL: storyURL, request: request, ir: ir)
                    } catch {
                        self.onUnresolved?(request, error)
                    }
                case .failure(let failure):
                    self.onUnresolved?(request, failure)
                }
            }
        } catch {
            onUnresolved?(request, error)
        }
    }

    /// Where a resolved target's text lives on disk, when it has a span.
    private func location(of target: PlayToWriteTarget, storyURL: URL) -> (url: URL, span: DiagnosticSpan)? {
        switch target {
        case .phrase(_, let file, let span), .existingOverride(_, let file, let span):
            let url = file.map { storyURL.deletingLastPathComponent().appendingPathComponent($0) } ?? storyURL
            return (url, span)
        case .newOverride:
            return nil
        }
    }

    /// The inline template for a target, when the phrase is a single template
    /// and its source reads cleanly — nil sends the click to the editor.
    private func inlineTemplate(for target: PlayToWriteTarget, messageId: String, storyURL: URL, ir: ComposeStoryIR)
        -> (url: URL, template: PlayToWrite.InlineTemplate)? {
        guard let name = PlayToWrite.phraseName(for: messageId, target: target, ir: ir),
              PlayToWrite.isInlineEligible(name),
              let (url, span) = location(of: target, storyURL: storyURL),
              let source = editor.currentText(of: url),
              let template = PlayToWrite.inlineTemplate(source: source, span: span) else { return nil }
        return (url, template)
    }

    /// Open the editor on the resolved target and arm the round — or, for a
    /// single-template phrase, hand Play the inline field and arm nothing yet.
    private func apply(_ target: PlayToWriteTarget, storyURL: URL, request: PlayEditRequest, ir: ComposeStoryIR) {
        let storyDir = storyURL.deletingLastPathComponent()
        if let inline = inlineTemplate(for: target, messageId: request.messageId, storyURL: storyURL, ir: ir) {
            onInlineEditRequested?(PlayInlineEdit(messageId: request.messageId, turn: request.turn, template: inline.template.text))
            return
        }
        switch target {
        case .phrase(_, let file, let span), .existingOverride(_, let file, let span):
            let url = file.map { storyDir.appendingPathComponent($0) } ?? storyURL
            editor.openDocument(at: url, navigateTo: span)
        case .newOverride(let alias, let template):
            // The block lands as an ordinary typing edit — undoable, saved when
            // the author chooses — computed against the buffer, never the file.
            let source = editor.currentText(of: storyURL) ?? ""
            let edit = PlayToWrite.appendingOverride(alias: alias, template: template, to: source)
            editor.insertText(edit.text, at: edit.offset, in: storyURL)
            editor.openDocument(at: storyURL,
                                navigateTo: DiagnosticSpan(line: edit.line, column: 1, endLine: edit.line, endColumn: 1))
        }
        session = PlayToWriteSession(messageId: request.messageId, history: request.history)
    }

    /// The inline field committed (ADR-333 D4c): write the new template into
    /// the source at the phrase's span — an undoable edit in the editor's
    /// buffer, re-indented — arm the round with the history Play captured,
    /// and save, which asks for the build through `documentSaved` the way an
    /// author's ⌘S does. The reload after that build replays the session.
    ///
    /// The template is re-read against the CURRENT buffer at commit time, so
    /// a range computed when the field opened never goes stale.
    func commit(_ commit: PlayInlineCommit, storyURL: URL, ir: ComposeStoryIR) {
        let request = PlayEditRequest(messageId: commit.messageId, turn: commit.turn, text: commit.text, history: commit.history)
        do {
            let target = try PlayToWrite.resolve(messageId: commit.messageId, ir: ir, catalog: catalog)
            guard let inline = inlineTemplate(for: target, messageId: commit.messageId, storyURL: storyURL, ir: ir),
                  editor.replaceText(inline.template.replacement(for: commit.text), in: inline.template.range, in: inline.url)
            else { throw PlayToWriteError.inlineTargetMissing(id: commit.messageId) }
            session = PlayToWriteSession(messageId: commit.messageId, history: commit.history)
            editor.saveActiveDocument()
        } catch {
            session = nil
            onUnresolved?(request, error)
        }
    }

    /// A document was written to disk. Inside the open story while a round is
    /// armed, that is the author finishing the edit (ADR-333 D4): request the
    /// build. Anything else is ignored.
    func documentSaved(_ url: URL, storyURL: URL?) {
        guard session != nil, let storyURL else { return }
        let storyDir = storyURL.deletingLastPathComponent().standardizedFileURL.path
        guard url.standardizedFileURL.path.hasPrefix(storyDir) else { return }
        onBuildRequested?()
    }

    /// The armed round, handed to the reload that finishes it; disarms.
    func takeSession() -> PlayToWriteSession? {
        defer { session = nil }
        return session
    }

    /// Project open/close: nothing armed, no catalog.
    func reset() {
        session = nil
        catalog = nil
    }
}
