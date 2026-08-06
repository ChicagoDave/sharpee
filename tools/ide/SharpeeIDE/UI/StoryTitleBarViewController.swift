// StoryTitleBarViewController.swift
// The window's top border: the chrome band itself, carrying the composed story's
// title centered on the window.
//
// Why this exists rather than NSWindow's own title: on macOS 26 a plain titled
// window draws its title leading-aligned, immediately after the traffic lights,
// and AppKit exposes no alignment knob. So the window turns on
// `fullSizeContentView` with a transparent titlebar, the native title is hidden
// (it still carries the story name for the Window menu and Mission Control), and
// this strip IS the titlebar band — the traffic lights float over its leading
// edge. No extra row: `setBandHeight(_:)` is driven from the window's real
// titlebar height, which goes to zero in full screen.
// Public interface: StoryTitleBarViewController.setTitle(_:), .setBandHeight(_:).
// Owner context: tools/ide — UI.

import AppKit

final class StoryTitleBarViewController: NSViewController {

    /// Accessibility identifier — the strip's stable handle for tests.
    static let labelIdentifier = "titlebar.storyTitle"

    /// Standard macOS titlebar height, used until the real window reports its own.
    static let defaultHeight: CGFloat = 28

    private let label = NSTextField(labelWithString: "")
    private var heightConstraint: NSLayoutConstraint?

    override func loadView() {
        let pane = ThemedPane(color: Theme.railBackground)

        label.alignment = .center
        label.lineBreakMode = .byTruncatingTail
        label.font = .systemFont(ofSize: 13, weight: .medium)
        label.textColor = Theme.foreground
        label.setAccessibilityIdentifier(Self.labelIdentifier)
        label.translatesAutoresizingMaskIntoConstraints = false
        pane.addSubview(label)

        let border = ThemedPane(color: Theme.border)
        border.translatesAutoresizingMaskIntoConstraints = false
        pane.addSubview(border)

        let height = pane.heightAnchor.constraint(equalToConstant: Self.defaultHeight)
        heightConstraint = height

        NSLayoutConstraint.activate([
            height,

            // Centered on the WINDOW, not on the space left over by the traffic
            // lights: the strip spans the full width, so its centre IS the
            // window's centre. The 80pt insets keep a long title from running
            // under the lights rather than shifting it off-centre.
            label.centerXAnchor.constraint(equalTo: pane.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: pane.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: pane.leadingAnchor, constant: 80),
            label.trailingAnchor.constraint(lessThanOrEqualTo: pane.trailingAnchor, constant: -80),

            border.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            border.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            border.bottomAnchor.constraint(equalTo: pane.bottomAnchor),
            border.heightAnchor.constraint(equalToConstant: 1),
        ])

        view = pane
    }

    /// Matches the strip to the window's real titlebar band, so it occupies the
    /// chrome rather than adding a row below it.
    ///
    /// - Parameter height: the window's titlebar height — 0 in full screen,
    ///   where the band does not exist and the strip must disappear with it.
    func setBandHeight(_ height: CGFloat) {
        loadViewIfNeeded()
        guard height >= 0, heightConstraint?.constant != height else { return }
        heightConstraint?.constant = height
        view.isHidden = height == 0
    }

    /// Sets the text the strip displays.
    ///
    /// - Parameter title: the composed story's title, or the product name when
    ///   no story has been composed (see `WindowTitle.title(for:)`).
    func setTitle(_ title: String) {
        loadViewIfNeeded()
        label.stringValue = title
    }
}
