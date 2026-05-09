// EditorViewController.swift
// Owns the Editor pane: an NSTextView in an NSScrollView, configured for code editing,
// displaying at most one Document at a time. (Tabs land in step 1.4.)
// Public interface: openDocument(at:) loads a file into the editor; closeDocument() clears it.
// Owner context: tools/ide — Editor pane.

import AppKit

final class EditorViewController: NSViewController {

    private let scrollView = NSScrollView()
    private let textView = NSTextView()
    private let placeholder = NSTextField(labelWithString: "Open a file from the project pane")

    private(set) var currentDocument: Document?

    override func loadView() {
        let pane = NSView()
        pane.wantsLayer = true
        pane.layer?.backgroundColor = Theme.editorBackground.cgColor

        configureTextView()
        configureScrollView()
        configurePlaceholder()

        scrollView.translatesAutoresizingMaskIntoConstraints = false
        placeholder.translatesAutoresizingMaskIntoConstraints = false

        pane.addSubview(scrollView)
        pane.addSubview(placeholder)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: pane.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: pane.bottomAnchor),

            placeholder.centerXAnchor.constraint(equalTo: pane.centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: pane.centerYAnchor),
        ])

        view = pane
        updateEmptyState()
    }

    /// Loads a file into the editor and replaces the previous document.
    /// Shows a modal alert if the file cannot be read as UTF-8 text.
    func openDocument(at url: URL) {
        do {
            let document = try Document.load(from: url)
            currentDocument = document
            textView.string = document.content
            textView.isEditable = true
            textView.undoManager?.removeAllActions()
            textView.scroll(.zero)
            updateEmptyState()
        } catch {
            let alert = NSAlert(error: error)
            alert.alertStyle = .warning
            alert.runModal()
        }
    }

    /// Clears the editor.
    func closeDocument() {
        currentDocument = nil
        textView.string = ""
        textView.isEditable = false
        textView.undoManager?.removeAllActions()
        updateEmptyState()
    }

    // MARK: - Setup

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

    private func updateEmptyState() {
        let empty = currentDocument == nil
        scrollView.isHidden = empty
        placeholder.isHidden = !empty
    }
}
