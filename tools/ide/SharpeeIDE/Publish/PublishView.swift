// PublishView.swift
// The Publish tab (ADR-284, go-live item 1): the finish line for a story. A
// button that asks where the zip goes, the toolchain's own output streamed
// underneath, and — on success — the artifact's path with Reveal in Finder.
//
// Deliberately thin. The preconditions (compiles, has an identity) are checked by
// `sharpee publish` itself and reported in the output, NOT re-implemented here:
// a second IFID check in Swift is exactly the drift ADR-284 D1 exists to
// prevent. Since ADR-309 there is also nothing to fix — the story is given its
// IFID when it is created and the header is rendered from the config on every
// save — so the CLI's refusal is a backstop for a story whose config went
// missing, not a step an author is expected to meet.
// Public interface: setStory(_:), includeMenu, onPublish, onCancel, onReveal, append(_:),
// finish(succeeded:zipURL:).
// Owner context: tools/ide — Publish.

import AppKit

final class PublishView: NSView {

    /// Stable handles for tests and accessibility.
    static let publishIdentifier = "publish.run"
    static let revealIdentifier = "publish.reveal"

    /// The author asked to publish. The tab does not choose the destination —
    /// the controller owns the save panel, so this view stays testable headlessly.
    var onPublish: (() -> Void)?
    var onCancel: (() -> Void)?
    /// Show the produced artifact in Finder.
    var onReveal: ((URL) -> Void)?

    private let storyLabel = NSTextField(labelWithString: "No story open")
    private let publishButton = NSButton(title: "Publish…", target: nil, action: nil)
    /// ADR-290 D6 (GH #196): the author chooses whether the published page
    /// keeps the client's in-page menu. On by default; the label beside it
    /// carries the consequence of turning it off, at the point of choice.
    private let menuCheckbox = NSButton(checkboxWithTitle: "Include the in-page menu (Save, Restore, Restart, Quit)",
                                        target: nil, action: nil)
    private let menuNote = NSTextField(wrappingLabelWithString:
        "Off: the page has no Save, Restore, Restart or Quit unless your own page supplies them.")
    static let menuCheckboxIdentifier = "publish.include-menu"

    /// Whether the next publish keeps the in-page menu (the checkbox's state).
    var includeMenu: Bool {
        get { menuCheckbox.state == .on }
        set { menuCheckbox.state = newValue ? .on : .off }
    }
    private let cancelButton = NSButton(title: "Cancel", target: nil, action: nil)
    private let revealButton = NSButton(title: "Reveal in Finder", target: nil, action: nil)
    private let resultLabel = NSTextField(labelWithString: "")
    private let output = NSTextView()

    private var producedZip: URL?

    init() {
        super.init(frame: .zero)
        // Sibling tabs (BuildPanelView, IndexView) are plain NSViews over the
        // right panel's themed container; ThemedPane is final, so this matches
        // them rather than wrapping one.
        wantsLayer = true
        build()
    }

    /// Re-resolves the dynamic background whenever the effective appearance
    /// changes — the same job ThemedPane does for the panes that use it.
    override func updateLayer() {
        layer?.backgroundColor = Theme.editorBackground.cgColor
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not used — views are built in code") }

    private func build() {
        storyLabel.font = .systemFont(ofSize: 12, weight: .medium)
        storyLabel.textColor = Theme.foreground

        let blurb = NSTextField(wrappingLabelWithString:
            "Builds a self-contained browser version of the story and zips it. "
            + "Unzip anywhere and open index.html, or upload the zip to itch.io.")
        blurb.font = .systemFont(ofSize: 11)
        blurb.textColor = Theme.foregroundDim

        menuCheckbox.state = .on
        menuCheckbox.font = .systemFont(ofSize: 11)
        menuCheckbox.setAccessibilityIdentifier(Self.menuCheckboxIdentifier)
        menuNote.font = .systemFont(ofSize: 11)
        menuNote.textColor = Theme.foregroundDim

        publishButton.target = self
        publishButton.action = #selector(publishClicked)
        publishButton.keyEquivalent = "\r"
        publishButton.isEnabled = false
        publishButton.setAccessibilityIdentifier(Self.publishIdentifier)

        cancelButton.target = self
        cancelButton.action = #selector(cancelClicked)
        cancelButton.isHidden = true

        revealButton.target = self
        revealButton.action = #selector(revealClicked)
        revealButton.isHidden = true
        revealButton.setAccessibilityIdentifier(Self.revealIdentifier)

        resultLabel.font = .systemFont(ofSize: 11)
        resultLabel.textColor = Theme.foregroundDim
        resultLabel.lineBreakMode = .byTruncatingMiddle

        output.isEditable = false
        output.isSelectable = true
        output.drawsBackground = false
        output.font = .monospacedSystemFont(ofSize: 11, weight: .regular)
        output.textColor = Theme.foregroundDim
        output.textContainerInset = NSSize(width: 8, height: 8)

        let scroll = NSScrollView()
        scroll.documentView = output
        scroll.hasVerticalScroller = true
        scroll.drawsBackground = false

        let buttons = NSStackView(views: [publishButton, cancelButton, revealButton, resultLabel])
        buttons.orientation = .horizontal
        buttons.spacing = 8
        resultLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let stack = NSStackView(views: [storyLabel, blurb, menuCheckbox, menuNote, buttons, scroll])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: topAnchor, constant: 14),
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -14),
            scroll.widthAnchor.constraint(equalTo: stack.widthAnchor),
            buttons.widthAnchor.constraint(equalTo: stack.widthAnchor),
        ])
    }

    /// The story Publish would act on, or nil when no project is open. Publishing
    /// is disabled without one — there is nothing to publish.
    func setStory(_ storyURL: URL?) {
        if let storyURL {
            storyLabel.stringValue = storyURL.lastPathComponent
            publishButton.isEnabled = !isRunning
        } else {
            storyLabel.stringValue = "No story open"
            publishButton.isEnabled = false
        }
    }

    private(set) var isRunning = false

    /// A run started: clears the previous result and swaps Publish for Cancel.
    func begin() {
        isRunning = true
        producedZip = nil
        output.string = ""
        resultLabel.stringValue = ""
        revealButton.isHidden = true
        publishButton.isHidden = true
        cancelButton.isHidden = false
    }

    /// Appends streamed toolchain output, following the tail.
    func append(_ text: String) {
        output.textStorage?.append(NSAttributedString(
            string: text,
            attributes: [.font: NSFont.monospacedSystemFont(ofSize: 11, weight: .regular),
                         .foregroundColor: Theme.foregroundDim]))
        output.scrollToEndOfDocument(nil)
    }

    /// The run ended. On success the artifact is offered; on failure the output
    /// above is the explanation, so nothing is invented here.
    func finish(succeeded: Bool, zipURL: URL?) {
        isRunning = false
        publishButton.isHidden = false
        publishButton.isEnabled = storyLabel.stringValue != "No story open"
        cancelButton.isHidden = true
        producedZip = zipURL

        if succeeded, let zipURL {
            let size = (try? FileManager.default.attributesOfItem(atPath: zipURL.path)[.size] as? Int) ?? nil
            let mb = size.map { String(format: " (%.1f MB)", Double($0) / 1_048_576) } ?? ""
            resultLabel.stringValue = zipURL.lastPathComponent + mb
            revealButton.isHidden = false
        } else {
            resultLabel.stringValue = "Publish failed — see the output above."
            revealButton.isHidden = true
        }
    }

    // MARK: - Actions

    @objc private func publishClicked() { onPublish?() }

    @objc private func cancelClicked() { onCancel?() }

    @objc private func revealClicked() {
        guard let producedZip else { return }
        onReveal?(producedZip)
    }
}
