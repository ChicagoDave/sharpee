// BuildPanelView.swift
// The bottom-docked build output pane: a read-only monospaced text view fed chunked
// stdout/stderr, scrolled to the tail. Plain streamed text — structured diagnostics
// live in the Problems tab (ADR-258 D5), fed by `compose --json` rather than by
// scraping build output.
// Public interface: BuildPanelView (append/clear), BuildPanelViewController (hosts it).
// Owner context: tools/ide — Build.

import AppKit

final class BuildPanelView: NSView {

    private static let font = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)

    private let scrollView = NSScrollView()
    private let textView = NSTextView()

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        textView.isEditable = false
        textView.isSelectable = true
        textView.drawsBackground = false
        textView.textColor = Theme.foreground
        textView.font = Self.font
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

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = Theme.playBackground.cgColor
    }

    /// Appends a chunk of build output and scrolls to the tail.
    func append(_ text: String) {
        guard !text.isEmpty else { return }
        textView.textStorage?.append(NSAttributedString(string: text, attributes: [
            .foregroundColor: Theme.foreground,
            .font: Self.font,
        ]))
        textView.scrollToEndOfDocument(nil)
    }

    /// Clears all output (called at the start of a build).
    func clear() {
        textView.textStorage?.setAttributedString(NSAttributedString(string: ""))
    }
}
