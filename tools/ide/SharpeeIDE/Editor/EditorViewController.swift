// EditorViewController.swift
// Owns the Editor pane: a tab strip plus an NSTextView, configured for code editing.
// Public interface: openDocument(at:) opens a file in a new or existing tab;
// closeDocument(at:) closes a tab; switchTo(index:) activates a tab.
// Owner context: tools/ide — Editor pane.

import AppKit

final class EditorViewController: NSViewController, NSTextViewDelegate {

    private let tabBar = TabBarView()
    private let scrollView = NSScrollView()
    private let textView = NSTextView()
    private let placeholder = NSTextField(labelWithString: "Open a file from the project pane")

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

    override func loadView() {
        let pane = NSView()
        pane.wantsLayer = true
        pane.layer?.backgroundColor = Theme.editorBackground.cgColor

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
    }

    private func persistTextViewToActiveDocument() {
        guard let doc = activeDocument else { return }
        doc.content = textView.string
    }

    // MARK: - NSTextViewDelegate

    func textDidChange(_ notification: Notification) {
        guard !isSwappingContent, let doc = activeDocument else { return }
        doc.content = textView.string
        if !doc.isDirty {
            doc.isDirty = true
            refreshUI()
        }
    }

    // MARK: - Setup

    private func configureTabBar() {
        tabBar.onSelect = { [weak self] index in self?.switchTo(index: index) }
        tabBar.onClose = { [weak self] index in self?.closeDocument(at: index) }
    }

    private func configureTextView() {
        textView.font = NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)
        textView.textColor = Theme.foreground
        textView.backgroundColor = Theme.editorBackground
        textView.insertionPointColor = Theme.foreground
        textView.selectedTextAttributes = [
            .backgroundColor: NSColor(srgbRed: 0.3, green: 0.4, blue: 0.6, alpha: 0.5),
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

        // Code-editor sizing: container is wide enough for any line, view scrolls horizontally.
        let huge = CGFloat.greatestFiniteMagnitude
        textView.minSize = NSSize(width: 0, height: 0)
        textView.maxSize = NSSize(width: huge, height: huge)
        textView.isHorizontallyResizable = true
        textView.isVerticallyResizable = true
        textView.autoresizingMask = [.width]
        textView.textContainer?.widthTracksTextView = false
        textView.textContainer?.containerSize = NSSize(width: huge, height: huge)
    }

    private func configureScrollView() {
        scrollView.documentView = textView
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = true
        scrollView.autohidesScrollers = false
        scrollView.borderType = .noBorder
        scrollView.drawsBackground = false
    }

    private func configurePlaceholder() {
        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
        placeholder.isHidden = true
    }
}
