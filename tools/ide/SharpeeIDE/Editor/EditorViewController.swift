// EditorViewController.swift
// Owns the Editor pane: a tab strip plus an NSTextView, configured for code editing.
// Public interface: openDocument(at:) opens a file in a new or existing tab;
// closeDocument(at:) closes a tab; switchTo(index:) activates a tab;
// hasUnsavedChanges(at:)/reloadFromDisk(at:) let a writer outside the editor
// (ADR-282's re-bless) avoid clobbering an open tab, and refresh it afterwards.
// Owner context: tools/ide — Editor pane.

import AppKit

/// Soft word-wrap preference, persisted globally (applies to all documents).
/// Defaults ON (David's ruling: text wraps in the story pane — Chord is prose);
/// the View → Word Wrap toggle still turns it off.
enum WordWrapPreference {
    private static let key = "SharpeeWordWrap"
    static var isEnabled: Bool {
        get { UserDefaults.standard.object(forKey: key) as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: key) }
    }
}

final class EditorViewController: NSViewController, NSTextViewDelegate {

    private let tabBar = TabBarView()
    private let scrollView = NSScrollView()
    private let textView = NSTextView()
    private var lineNumberRuler: LineNumberRulerView?
    private let placeholder = NSTextField(labelWithString: "Open a file from the project pane")
    private let highlighter = SyntaxHighlighter()
    private let transcriptHighlighter = TranscriptHighlighter()
    /// The two single-character ranges currently carrying the bracket-match background, so they
    /// can be cleared before the next match is applied.
    private var bracketRanges: [NSRange] = []

    private var documents: [Document] = []
    private var activeIndex: Int?
    /// Guards `textDidChange` while we replace the text view's contents programmatically.
    private var isSwappingContent = false

    var activeDocument: Document? {
        guard let i = activeIndex, documents.indices.contains(i) else { return nil }
        return documents[i]
    }

    /// Read-only view of the open documents' URLs, in tab order. Used for session persistence.
    var openDocumentURLs: [URL] { documents.map { $0.url } }

    /// Read-only view of the active tab index. Used for session persistence.
    var activeDocumentIndex: Int? { activeIndex }

    /// Fired whenever the open-document set or active index changes (open, close, switch).
    /// Not fired on dirty-flag toggles or content edits — those don't affect persistable state.
    var onStateChanged: (() -> Void)?

    /// Fired when a `.story` document becomes active (open, tab switch) with its URL and
    /// buffer content — the compose pipeline runs immediately (ADR-258 D5/D6).
    var onStoryActivated: ((URL, String) -> Void)?

    /// Fired on every edit to the active `.story` document with its URL and buffer content —
    /// the compose pipeline runs after a debounce (ADR-258 D5, Q3 ruling).
    var onStoryEdited: ((URL, String) -> Void)?

    /// Fired on every edit to ANY document (story, hatch module, browser page) —
    /// a source change invalidates the play surface (David's ruling).
    var onDocumentEdited: ((URL) -> Void)?

    /// The ranges currently carrying a diagnostic underline, so they can be cleared
    /// before the next compose result (or on edit, when they go stale).
    private var diagnosticUnderlineRanges: [NSRange] = []

    override func loadView() {
        let pane = ThemedPane(color: Theme.editorBackground)

        configureTabBar()
        configureTextView()
        configureScrollView()
        configurePlaceholder()

        tabBar.translatesAutoresizingMaskIntoConstraints = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        placeholder.translatesAutoresizingMaskIntoConstraints = false

        pane.addSubview(tabBar)
        pane.addSubview(scrollView)
        pane.addSubview(placeholder)

        NSLayoutConstraint.activate([
            tabBar.topAnchor.constraint(equalTo: pane.topAnchor),
            tabBar.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            tabBar.heightAnchor.constraint(equalToConstant: TabBarView.height),

            scrollView.topAnchor.constraint(equalTo: tabBar.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: pane.bottomAnchor),

            placeholder.centerXAnchor.constraint(equalTo: pane.centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: pane.centerYAnchor),
        ])

        view = pane
        refreshUI()

        NotificationCenter.default.addObserver(self, selector: #selector(fontPreferenceChanged),
                                               name: FontPreference.didChangeNotification,
                                               object: nil)
    }

    /// Live font change: the story pane re-fonts in place (colors untouched).
    @objc private func fontPreferenceChanged() {
        textView.font = FontPreference.editorFont
        if let storage = textView.textStorage {
            storage.addAttribute(.font, value: FontPreference.editorFont,
                                 range: NSRange(location: 0, length: storage.length))
        }
        lineNumberRuler?.refresh()
    }

    override func viewDidLayout() {
        super.viewDidLayout()
        syncWrapWidth() // window/split resizes must re-wrap, never bounce back
    }

    // MARK: - Tab operations

    /// Opens a file in a new tab, or focuses the existing tab if the file is already open.
    /// Shows a modal alert if the file cannot be read as UTF-8 text.
    func openDocument(at url: URL) {
        if let existing = documents.firstIndex(where: { $0.url == url }) {
            switchTo(index: existing)
            return
        }
        do {
            let document = try Document.load(from: url)
            documents.append(document)
            switchTo(index: documents.count - 1)
            // switchTo already fires onStateChanged. The append is part of the same logical
            // change so a single notification is correct.
        } catch {
            let alert = NSAlert(error: error)
            alert.alertStyle = .warning
            alert.runModal()
        }
    }

    /// Opens (or focuses) `url`, then scrolls to and selects the 1-based `line`. Used by
    /// click-to-jump from a build diagnostic. `column` is reserved (the whole line is
    /// selected for visibility). No-op if the file couldn't be opened or the line is out
    /// of range.
    func openDocument(at url: URL, line: Int, column: Int = 1) {
        openDocument(at: url)
        guard activeDocument?.url == url, let range = characterRange(ofLine: line) else { return }
        textView.setSelectedRange(range)
        textView.scrollRangeToVisible(range)
        view.window?.makeFirstResponder(textView)
        lineNumberRuler?.errorLines = [line] // flag it in the gutter
    }

    /// Whether `url` is open in a tab carrying edits the author has not saved.
    ///
    /// Asked before anything outside the editor rewrites a file the editor
    /// holds (ADR-282's re-bless is the first such writer): overwriting would
    /// discard those edits, and saving the tab afterwards would discard the
    /// external write. Neither is the author's choice to lose silently.
    func hasUnsavedChanges(at url: URL) -> Bool {
        documents.contains { $0.url == url && $0.isDirty }
    }

    /// Re-reads `url` from disk into its open tab, if it has one.
    ///
    /// For use after something outside the editor rewrote the file, so the tab
    /// stops showing text that is no longer on disk. A dirty tab is left alone —
    /// callers must check `hasUnsavedChanges(at:)` BEFORE writing, not rely on
    /// this to arbitrate afterwards.
    func reloadFromDisk(at url: URL) {
        guard let index = documents.firstIndex(where: { $0.url == url }),
              !documents[index].isDirty,
              let reloaded = try? Document.load(from: url) else { return }
        documents[index] = reloaded
        if activeIndex == index { switchTo(index: index) }
    }

    /// Opens (or focuses) `url`, then selects the exact diagnostic span — the
    /// underline-range navigation Problems rows use (ADR-258 D5). Falls back to
    /// whole-line selection when the span no longer fits the buffer (stale record).
    func openDocument(at url: URL, span: DiagnosticSpan) {
        openDocument(at: url)
        guard activeDocument?.url == url else { return }
        if let range = SpanText.characterRange(of: span, in: textView.string), range.length > 0 {
            textView.setSelectedRange(range)
            textView.scrollRangeToVisible(range)
            view.window?.makeFirstResponder(textView)
            lineNumberRuler?.errorLines = [span.line]
        } else if let range = characterRange(ofLine: span.line) {
            textView.setSelectedRange(range)
            textView.scrollRangeToVisible(range)
            view.window?.makeFirstResponder(textView)
            lineNumberRuler?.errorLines = [span.line]
        }
    }

    /// Index navigation (David's ruling): highlight the object's FIRST line and
    /// mark the gutter with the neutral accent dot — the red dot is reserved for
    /// errors. (The IR entity span can under-cover trailing blocks; first-line
    /// is the honest, sufficient target.)
    func openDocument(at url: URL, navigateTo span: DiagnosticSpan) {
        openDocument(at: url)
        guard activeDocument?.url == url, let range = characterRange(ofLine: span.line) else { return }
        textView.setSelectedRange(range)
        textView.scrollRangeToVisible(range)
        view.window?.makeFirstResponder(textView)
        lineNumberRuler?.errorLines = []
        lineNumberRuler?.navigationLines = [span.line]
    }

    /// Underlines each record's span in the active document (errors red, warnings
    /// yellow) and flags their lines in the gutter. Records for other files (hatch
    /// modules) are ignored. Cleared on the next edit — the following compose
    /// repaints against the new buffer.
    func setDiagnostics(_ records: [ComposeDiagnosticRecord], forFile url: URL) {
        clearDiagnosticUnderlines()
        guard let doc = activeDocument, doc.url == url,
              let storage = textView.textStorage else { return }

        var flaggedLines: Set<Int> = []
        for record in records {
            guard record.file == url.path, let span = record.span,
                  let range = SpanText.characterRange(of: span, in: textView.string),
                  range.length > 0, NSMaxRange(range) <= storage.length else { continue }
            let color: NSColor = record.severity == .error ? .systemRed : .systemYellow
            storage.addAttribute(.underlineStyle,
                                 value: NSUnderlineStyle.thick.rawValue, range: range)
            storage.addAttribute(.underlineColor, value: color, range: range)
            diagnosticUnderlineRanges.append(range)
            flaggedLines.insert(record.line)
        }
        lineNumberRuler?.errorLines = flaggedLines
    }

    private func clearDiagnosticUnderlines() {
        guard let storage = textView.textStorage else {
            diagnosticUnderlineRanges = []
            return
        }
        for r in diagnosticUnderlineRanges where NSMaxRange(r) <= storage.length {
            storage.removeAttribute(.underlineStyle, range: r)
            storage.removeAttribute(.underlineColor, range: r)
        }
        diagnosticUnderlineRanges = []
    }

    /// The character range of the 1-based `line` in the text view, or nil if out of range.
    private func characterRange(ofLine line: Int) -> NSRange? {
        guard line >= 1 else { return nil }
        let text = textView.string as NSString
        var start = 0
        var current = 1
        while current < line {
            let newline = text.range(of: "\n", range: NSRange(location: start, length: text.length - start))
            if newline.location == NSNotFound { return nil } // line beyond EOF
            start = newline.location + 1
            current += 1
        }
        var contentsEnd = 0
        text.getLineStart(nil, end: nil, contentsEnd: &contentsEnd,
                          for: NSRange(location: start, length: 0))
        return NSRange(location: start, length: contentsEnd - start)
    }

    /// Closes the tab at `index`. If the document is dirty, prompts the user with a
    /// Save / Cancel / Don't Save sheet and only proceeds based on their choice. If clean,
    /// removes immediately. If it was the active tab, advances to the next (or previous) tab.
    /// If `documents` becomes empty, the editor returns to its placeholder state.
    func closeDocument(at index: Int) {
        guard documents.indices.contains(index) else { return }
        // Make sure the active doc's content reflects the latest textView state before
        // we read its dirty flag.
        persistTextViewToActiveDocument()

        if documents[index].isDirty {
            promptCloseDirty(at: index)
            return
        }
        performClose(at: index)
    }

    private func promptCloseDirty(at index: Int) {
        let doc = documents[index]
        let alert = NSAlert()
        alert.messageText = "Do you want to save the changes to \(doc.url.lastPathComponent)?"
        alert.informativeText = "Your changes will be lost if you don't save them."
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Save")          // .alertFirstButtonReturn (default, rightmost)
        alert.addButton(withTitle: "Cancel")        // .alertSecondButtonReturn (Esc)
        alert.addButton(withTitle: "Don't Save")    // .alertThirdButtonReturn (⌘D)
        alert.buttons[2].keyEquivalent = "d"
        alert.buttons[2].keyEquivalentModifierMask = [.command]

        let handle: (NSApplication.ModalResponse) -> Void = { [weak self] response in
            self?.handleCloseAlert(response: response, index: index)
        }

        if let window = view.window {
            alert.beginSheetModal(for: window, completionHandler: handle)
        } else {
            handle(alert.runModal())
        }
    }

    private func handleCloseAlert(response: NSApplication.ModalResponse, index: Int) {
        guard documents.indices.contains(index) else { return }
        switch response {
        case .alertFirstButtonReturn: // Save
            let doc = documents[index]
            do {
                try doc.save()
                performClose(at: index)
            } catch {
                let alert = NSAlert(error: error)
                alert.alertStyle = .warning
                alert.runModal()
                // Save failed — leave the tab open so the user can retry.
                refreshUI()
            }
        case .alertThirdButtonReturn: // Don't Save
            performClose(at: index)
        default: // Cancel (.alertSecondButtonReturn)
            break
        }
    }

    private func performClose(at index: Int) {
        guard documents.indices.contains(index) else { return }

        let wasActive = (activeIndex == index)
        documents.remove(at: index)

        if documents.isEmpty {
            activeIndex = nil
        } else if wasActive {
            activeIndex = min(index, documents.count - 1)
        } else if let active = activeIndex, active > index {
            activeIndex = active - 1
        }

        loadActiveDocumentIntoTextView()
        refreshUI()
        onStateChanged?()
        if wasActive { notifyStoryActivated() }
    }

    /// Activates the tab at `index`. Persists the text view's edits to the previously-active
    /// document before swapping in the new one.
    func switchTo(index: Int) {
        guard documents.indices.contains(index) else { return }
        if activeIndex == index {
            refreshUI()
            return
        }
        persistTextViewToActiveDocument()
        activeIndex = index
        loadActiveDocumentIntoTextView()
        refreshUI()
        onStateChanged?()
        notifyStoryActivated()
    }

    /// Reports a newly-active `.story` document to the compose pipeline.
    private func notifyStoryActivated() {
        guard let doc = activeDocument, doc.url.pathExtension == "story" else { return }
        onStoryActivated?(doc.url, doc.content)
    }

    /// Clears all open documents and returns to the placeholder state.
    func closeAllDocuments() {
        documents.removeAll()
        activeIndex = nil
        loadActiveDocumentIntoTextView()
        refreshUI()
        onStateChanged?()
    }

    /// Writes the active document to disk as UTF-8 and clears its dirty flag.
    /// No-op when there is no active document. Presents a modal alert if the write fails.
    func saveActiveDocument() {
        guard let doc = activeDocument else { return }
        do {
            try doc.save()
            refreshUI()
        } catch {
            let alert = NSAlert(error: error)
            alert.alertStyle = .warning
            alert.runModal()
        }
    }

    /// Saves every dirty document (build-precondition: the build reads DISK,
    /// while compose reads the buffer — an unsaved buffer would silently build
    /// the old source). Returns false if any save failed (alert shown).
    @discardableResult
    func saveAllDocuments() -> Bool {
        persistTextViewToActiveDocument()
        var allSaved = true
        for doc in documents where doc.isDirty {
            do {
                try doc.save()
            } catch {
                allSaved = false
                let alert = NSAlert(error: error)
                alert.alertStyle = .warning
                alert.runModal()
            }
        }
        refreshUI()
        return allSaved
    }

    // MARK: - UI sync

    private func refreshUI() {
        let titles = Self.makeDisplayTitles(for: documents.map { $0.url })
        let models = titles.enumerated().map { index, title in
            TabModel(title: title, isDirty: documents[index].isDirty)
        }
        tabBar.setTabs(models, activeIndex: activeIndex)

        let hasDocuments = !documents.isEmpty
        tabBar.isHidden = !hasDocuments
        scrollView.isHidden = !hasDocuments
        placeholder.isHidden = hasDocuments
        textView.isEditable = hasDocuments
    }

    /// Smart-disambiguates a list of file URLs into display titles.
    /// Files with unique names render as the file name alone. Collisions are walked up
    /// the parent hierarchy by the minimum depth needed to make each member of the group unique
    /// — e.g. `traits/index.ts` vs `actions/index.ts`, lengthening to `src/traits/index.ts` only
    /// when the immediate parents also collide.
    static func makeDisplayTitles(for urls: [URL]) -> [String] {
        let components = urls.map { $0.pathComponents }
        var titles = urls.map { $0.lastPathComponent }

        var groups: [String: [Int]] = [:]
        for (i, t) in titles.enumerated() {
            groups[t, default: []].append(i)
        }

        for (_, indices) in groups where indices.count > 1 {
            let maxDepth = (indices.map { components[$0].count }.max() ?? 1)
            var depth = 2
            while depth <= maxDepth {
                let suffixes = indices.map { i -> String in
                    let comps = components[i]
                    return comps.suffix(min(depth, comps.count)).joined(separator: "/")
                }
                if Set(suffixes).count == indices.count {
                    for (k, i) in indices.enumerated() {
                        titles[i] = suffixes[k]
                    }
                    break
                }
                depth += 1
            }
            // Defensive: if we exited the loop without disambiguating (paths were genuinely
            // identical, which shouldn't happen on a real filesystem), fall back to full paths.
            if depth > maxDepth {
                for i in indices {
                    titles[i] = components[i].joined(separator: "/")
                }
            }
        }

        return titles
    }

    private func loadActiveDocumentIntoTextView() {
        isSwappingContent = true
        defer { isSwappingContent = false }
        textView.string = activeDocument?.content ?? ""
        textView.undoManager?.removeAllActions()
        textView.scroll(.zero)
        lineNumberRuler?.errorLines = [] // marks are document-specific
        lineNumberRuler?.navigationLines = []
        bracketRanges = [] // match highlights belong to the previous document
        applyWordWrap() // wrap policy is per-document (.story always wraps)
        diagnosticUnderlineRanges = [] // underline attrs died with the replaced text
        applyHighlighting()
    }

    /// Re-runs syntax highlighting over the current text storage when the active document is a
    /// supported language. No-op for unsupported files (they render at base foreground).
    /// Attribute-only edits do not fire `textDidChange`/`NSText.didChangeNotification`, so this
    /// does not recurse or churn the line-number ruler.
    private func applyHighlighting() {
        guard let url = activeDocument?.url, let storage = textView.textStorage else { return }
        // Per-extension dispatch: `.story` → ChordLexer (ADR-258 D7);
        // `.transcript` → the line classifier (ADR-277 D4). Never both.
        if highlighter.canHighlight(url) {
            highlighter.highlight(storage)
        } else if transcriptHighlighter.canHighlight(url) {
            transcriptHighlighter.highlight(storage)
        }
    }

    private func persistTextViewToActiveDocument() {
        guard let doc = activeDocument else { return }
        doc.content = textView.string
    }

    // MARK: - NSTextViewDelegate

    func textDidChange(_ notification: Notification) {
        guard !isSwappingContent, let doc = activeDocument else { return }
        doc.content = textView.string
        lineNumberRuler?.errorLines = [] // editing invalidates the flagged error
        lineNumberRuler?.navigationLines = []
        clearDiagnosticUnderlines() // stale against the new buffer; the next compose repaints
        applyHighlighting() // spike: full re-highlight on each edit (incremental re-parse lands with Neon)
        if !doc.isDirty {
            doc.isDirty = true
            refreshUI()
        }
        if doc.url.pathExtension == "story" {
            onStoryEdited?(doc.url, doc.content)
        }
        onDocumentEdited?(doc.url)
    }

    /// Highlights the bracket adjacent to the caret and its balanced partner whenever the
    /// selection moves. Uses `.backgroundColor` so it never disturbs the syntax foreground colors.
    func textViewDidChangeSelection(_ notification: Notification) {
        updateBracketMatch()
    }

    /// Intercepts Return to carry the current line's indentation (and add one level after an
    /// opening bracket). Inserting via `insertText` keeps undo coherent and re-fires highlighting.
    func textView(_ textView: NSTextView, doCommandBy commandSelector: Selector) -> Bool {
        guard commandSelector == #selector(NSResponder.insertNewline(_:)), activeDocument != nil else {
            return false
        }
        let caret = textView.selectedRange().location
        let indent = AutoIndenter.indentOnNewline(text: textView.string, caret: caret)
        textView.insertText("\n" + indent, replacementRange: textView.selectedRange())
        return true
    }

    private func updateBracketMatch() {
        guard let storage = textView.textStorage else { return }

        // Clear the previous match first (guard against ranges invalidated by an edit).
        for r in bracketRanges where NSMaxRange(r) <= storage.length {
            storage.removeAttribute(.backgroundColor, range: r)
        }
        bracketRanges = []

        guard activeDocument != nil else { return }
        let caret = textView.selectedRange().location
        guard let m = BracketMatcher.match(in: textView.string, caret: caret) else { return }

        let ranges = [NSRange(location: m.bracket, length: 1), NSRange(location: m.partner, length: 1)]
        for r in ranges where NSMaxRange(r) <= storage.length {
            storage.addAttribute(.backgroundColor, value: Theme.bracketMatchBackground, range: r)
        }
        bracketRanges = ranges
    }

    // MARK: - Setup

    private func configureTabBar() {
        tabBar.onSelect = { [weak self] index in self?.switchTo(index: index) }
        tabBar.onClose = { [weak self] index in self?.closeDocument(at: index) }
    }

    private func configureTextView() {
        textView.font = FontPreference.editorFont
        textView.textColor = Theme.foreground
        textView.backgroundColor = Theme.editorBackground
        textView.insertionPointColor = Theme.foreground
        textView.selectedTextAttributes = [
            .backgroundColor: Theme.selectionBackground,
            .foregroundColor: Theme.foreground,
        ]
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.isAutomaticTextReplacementEnabled = false
        textView.isAutomaticSpellingCorrectionEnabled = false
        textView.isAutomaticDataDetectionEnabled = false
        textView.isAutomaticLinkDetectionEnabled = false
        textView.allowsUndo = true
        textView.isRichText = false
        textView.usesFontPanel = false
        textView.usesFindBar = true
        textView.isIncrementalSearchingEnabled = true
        textView.isEditable = false
        textView.textContainerInset = NSSize(width: 8, height: 12)
        textView.delegate = self

        let huge = CGFloat.greatestFiniteMagnitude
        textView.minSize = NSSize(width: 0, height: 0)
        textView.maxSize = NSSize(width: huge, height: huge)
        textView.isVerticallyResizable = true
        textView.autoresizingMask = [.width]
        applyWordWrap() // horizontal sizing depends on the Word Wrap preference
    }

    /// Toggles soft word wrap. Off (default): the container is unbounded and the view scrolls
    /// horizontally. On: the container tracks the view width and long lines wrap.
    func setWordWrap(_ enabled: Bool) {
        WordWrapPreference.isEnabled = enabled
        applyWordWrap()
    }

    /// Whether the ACTIVE document wraps: `.story` files always do (David's
    /// ruling — the story pane wraps, whatever the toggle says; an old stored
    /// preference must not leave prose scrolling sideways); other files follow
    /// the View → Word Wrap preference.
    private var effectiveWrap: Bool {
        if activeDocument?.url.pathExtension.lowercased() == "story" { return true }
        return WordWrapPreference.isEnabled
    }

    private func applyWordWrap() {
        let huge = CGFloat.greatestFiniteMagnitude
        guard let container = textView.textContainer else { return }
        if effectiveWrap {
            // Soft-wrap: the CONTAINER width is driven explicitly from the clip
            // width (syncWrapWidth), never via widthTracksTextView — the
            // tracking heuristics left the container stale (width 0 before the
            // first layout; frozen wide after a resize), which is why wrap
            // either didn't engage or fought window narrowing.
            scrollView.hasHorizontalScroller = false
            textView.isHorizontallyResizable = false
            textView.maxSize = NSSize(width: huge, height: huge)
            container.widthTracksTextView = false
            syncWrapWidth(force: true)
        } else {
            scrollView.hasHorizontalScroller = true
            textView.isHorizontallyResizable = true
            textView.maxSize = NSSize(width: huge, height: huge)
            container.widthTracksTextView = false
            container.containerSize = NSSize(width: huge, height: huge)
        }
    }

    private func configureScrollView() {
        scrollView.documentView = textView
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = true
        scrollView.autohidesScrollers = false
        scrollView.borderType = .noBorder
        scrollView.drawsBackground = false

        let ruler = LineNumberRulerView(textView: textView, scrollView: scrollView)
        scrollView.verticalRulerView = ruler
        scrollView.hasVerticalRuler = true
        scrollView.rulersVisible = true
        lineNumberRuler = ruler

        // Keep the gutter in sync with scrolling and editing.
        scrollView.contentView.postsBoundsChangedNotifications = true
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(refreshRuler),
                           name: NSView.boundsDidChangeNotification, object: scrollView.contentView)
        center.addObserver(self, selector: #selector(refreshRuler),
                           name: NSText.didChangeNotification, object: textView)
    }

    @objc private func refreshRuler() {
        syncWrapWidth()
        lineNumberRuler?.refresh()
    }

    /// Wrap mode keeps the CONTAINER (the thing TextKit actually wraps against)
    /// and the text-view frame exactly as wide as the clip view — re-synced on
    /// every clip-bounds change and layout pass, so wrap engages from first
    /// layout and window narrowing re-wraps instead of bouncing. The guard
    /// compares the container's width (the previous version compared the frame,
    /// which the autoresizing mask kept plausible while the container stayed
    /// stale — the "autowrap not working" bug).
    private func syncWrapWidth(force: Bool = false) {
        guard effectiveWrap, let container = textView.textContainer else { return }
        let clipWidth = scrollView.contentSize.width
        // Wrap INSIDE the visible area. Two width thieves must be subtracted:
        // the container inset (text draws offset by it), and — measured live,
        // because contentSize does NOT reliably exclude it — the line-number
        // ruler (46pt), which otherwise pushes every line's tail past the
        // divider by the gutter width.
        let rulerWidth = scrollView.verticalRulerView?.ruleThickness ?? 0
        let rulerAlreadyExcluded = (scrollView.frame.width - clipWidth) >= rulerWidth - 1
        let visibleWidth = rulerAlreadyExcluded ? clipWidth : clipWidth - rulerWidth
        let wrapWidth = visibleWidth - textView.textContainerInset.width * 2
        guard clipWidth > 0, wrapWidth > 50,
              force || abs(container.containerSize.width - wrapWidth) > 0.5 else { return }
        container.containerSize = NSSize(width: wrapWidth,
                                         height: CGFloat.greatestFiniteMagnitude)
        textView.setFrameSize(NSSize(width: clipWidth, height: textView.frame.height))
        textView.needsLayout = true
    }

    private func configurePlaceholder() {
        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
        placeholder.isHidden = true
    }
}
