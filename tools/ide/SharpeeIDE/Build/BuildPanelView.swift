// BuildPanelView.swift
// The bottom-docked build output pane: a read-only monospaced NSTextView in a scroll
// view, fed chunked stdout/stderr from a BuildRunner. Auto-scrolls to the tail on append.
// Public interface: BuildPanelView (append/clear), BuildPanelViewController (hosts it).
// Owner context: tools/ide — Build.

import AppKit

final class BuildPanelView: NSView {

    private let scrollView = NSScrollView()
    private let textView = NSTextView()

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = Theme.playBackground.cgColor

        textView.isEditable = false
        textView.isSelectable = true
        textView.drawsBackground = false
        textView.textColor = Theme.foreground
        textView.font = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)
        textView.textContainerInset = NSSize(width: 8, height: 8)
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]

        scrollView.documentView = textView
        scrollView.hasVerticalScroller = true
        scrollView.drawsBackground = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(scrollView)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("BuildPanelView is not Storyboard-instantiable")
    }

    /// Appends a chunk of build output and scrolls to the tail.
    func append(_ text: String) {
        let attributed = NSAttributedString(string: text, attributes: [
            .foregroundColor: Theme.foreground,
            .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .regular),
        ])
        textView.textStorage?.append(attributed)
        textView.scrollToEndOfDocument(nil)
    }

    /// Clears all output (called at the start of a build).
    func clear() {
        textView.textStorage?.setAttributedString(NSAttributedString(string: ""))
    }
}

/// Hosts a BuildPanelView as a split-view item.
final class BuildPanelViewController: NSViewController {

    let panel = BuildPanelView()

    override func loadView() {
        view = panel
    }
}
