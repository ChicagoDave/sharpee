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
            apply(target, storyURL: storyURL, request: request)
        } catch PlayToWriteError.catalogUnavailable {
            catalogSource(storyURL) { [weak self] result in
                guard let self else { return }
                switch result {
                case .success(let catalog):
                    self.catalog = catalog
                    do {
                        let target = try PlayToWrite.resolve(messageId: request.messageId, ir: ir, catalog: catalog)
                        self.apply(target, storyURL: storyURL, request: request)
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

    /// Open the editor on the resolved target and arm the round.
    private func apply(_ target: PlayToWriteTarget, storyURL: URL, request: PlayEditRequest) {
        let storyDir = storyURL.deletingLastPathComponent()
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
