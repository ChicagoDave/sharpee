// LandingPageViewController.swift
// The launcher an author meets on launch: product name, the five most recent
// projects, and Open / Create Story / Close Chord Writer. It CHOOSES only —
// opening, scaffolding and quitting belong to LaunchCoordinator, so the modal
// never has to own a file panel, a sheet of its own, or the app lifecycle.
// Public interface: LandingPageViewController(recents:), onChoice, Choice.
// Owner context: tools/ide — Launch.

import AppKit

@MainActor
final class LandingPageViewController: NSViewController {

    /// What the author picked. There is no `cancel`: the landing page has no
    /// dismiss affordance, because an app with no project and no way back to the
    /// launcher is the state this modal exists to prevent.
    enum Choice: Equatable {
        case openRecent(URL)
        case open
        case createStory
        case quit
    }

    /// Stable handles for tests and accessibility.
    static let openIdentifier = "landing.open"
    static let createStoryIdentifier = "landing.createStory"
    static let quitIdentifier = "landing.quit"
    /// Recent rows are `landing.recent.0` … `landing.recent.4`.
    static func recentIdentifier(_ index: Int) -> String { "landing.recent.\(index)" }

    /// Invoked once, with the author's choice. The coordinator dismisses the
    /// sheet before acting on it.
    var onChoice: ((Choice) -> Void)?

    private let recents: [URL]

    /// - Parameter recents: projects to offer, newest first, already filtered to
    ///   ones that exist (see `LandingRecents.entries`). May be empty.
    init(recents: [URL]) {
        self.recents = recents
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not used — views are built in code") }

    override func loadView() {
        let container = NSView(frame: NSRect(x: 0, y: 0, width: 520, height: 0))

        let title = NSTextField(labelWithString: AppIdentity.productName)
        title.font = .systemFont(ofSize: 28, weight: .light)

        let tagline = NSTextField(labelWithString: "Write interactive fiction in Chord.")
        tagline.font = .systemFont(ofSize: 13)
        tagline.textColor = .secondaryLabelColor

        let stack = NSStackView(views: [title, tagline])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 4
        stack.setCustomSpacing(20, after: tagline)

        stack.addArrangedSubview(makeRecentsSection())
        stack.setCustomSpacing(20, after: stack.arrangedSubviews.last!)
        stack.addArrangedSubview(makeButtonRow())

        stack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor, constant: 28),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -28),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -24),
            container.widthAnchor.constraint(equalToConstant: 520),
        ])

        view = container
    }

    // MARK: - Sections

    private func makeRecentsSection() -> NSView {
        let heading = NSTextField(labelWithString: recents.isEmpty ? "No Projects Yet" : "Recent Projects")
        heading.font = .systemFont(ofSize: 11, weight: .semibold)
        heading.textColor = .secondaryLabelColor

        let section = NSStackView(views: [heading])
        section.orientation = .vertical
        section.alignment = .leading
        section.spacing = 8

        guard !recents.isEmpty else {
            let empty = NSTextField(labelWithString:
                "Create a story to begin, or open one you already have.")
            empty.font = .systemFont(ofSize: 12)
            empty.textColor = .secondaryLabelColor
            section.addArrangedSubview(empty)
            return section
        }

        for (index, url) in recents.enumerated() {
            let row = makeRecentRow(url: url, index: index)
            section.addArrangedSubview(row)
            NSLayoutConstraint.activate([
                row.widthAnchor.constraint(equalTo: section.widthAnchor),
                row.heightAnchor.constraint(equalToConstant: 42),
            ])
        }
        return section
    }

    /// One recent row: the folder's name over its abbreviated path. A button
    /// rather than a table — five rows never need selection, sorting or
    /// scrolling, and a button is what each row actually is.
    private func makeRecentRow(url: URL, index: Int) -> NSButton {
        let name = url.deletingPathExtension().lastPathComponent
        let path = (url.deletingLastPathComponent().path as NSString).abbreviatingWithTildeInPath

        // Indent the text rather than the button, so the hover highlight below
        // still runs the full width of the row.
        let indented = NSMutableParagraphStyle()
        indented.firstLineHeadIndent = 10
        indented.headIndent = 10
        indented.lineSpacing = 1

        let attributed = NSMutableAttributedString(
            string: name,
            attributes: [.font: NSFont.systemFont(ofSize: 13, weight: .medium),
                         .foregroundColor: NSColor.labelColor,
                         .paragraphStyle: indented])
        attributed.append(NSAttributedString(
            string: "\n" + path,
            attributes: [.font: NSFont.systemFont(ofSize: 11),
                         .foregroundColor: NSColor.secondaryLabelColor,
                         .paragraphStyle: indented]))

        let button = RecentRowButton(title: name, target: self, action: #selector(recentClicked(_:)))
        button.isBordered = false
        button.wantsLayer = true
        button.layer?.cornerRadius = 6
        button.usesSingleLineMode = false
        button.lineBreakMode = .byTruncatingMiddle
        button.alignment = .left
        button.attributedTitle = attributed
        button.tag = index
        button.toolTip = url.path
        button.setAccessibilityIdentifier(Self.recentIdentifier(index))
        button.setAccessibilityLabel(name)
        return button
    }

    private func makeButtonRow() -> NSView {
        let quit = NSButton(title: "Close \(AppIdentity.productName)",
                            target: self, action: #selector(quitClicked))
        quit.setAccessibilityIdentifier(Self.quitIdentifier)

        let open = NSButton(title: "Open…", target: self, action: #selector(openClicked))
        open.setAccessibilityIdentifier(Self.openIdentifier)

        let create = NSButton(title: "Create Story", target: self, action: #selector(createClicked))
        create.setAccessibilityIdentifier(Self.createStoryIdentifier)
        create.keyEquivalent = "\r"

        let spacer = NSView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)

        let row = NSStackView(views: [quit, spacer, open, create])
        row.orientation = .horizontal
        row.spacing = 10
        return row
    }

    // MARK: - Actions

    @objc private func recentClicked(_ sender: NSButton) {
        guard recents.indices.contains(sender.tag) else { return }
        onChoice?(.openRecent(recents[sender.tag]))
    }

    @objc private func openClicked() { onChoice?(.open) }

    @objc private func createClicked() { onChoice?(.createStory) }

    @objc private func quitClicked() { onChoice?(.quit) }
}

/// A borderless list row that lights up under the pointer, so the recents read
/// as things to click rather than a list of labels. Hover is the only state it
/// tracks — the landing page has no selection.
private final class RecentRowButton: NSButton {

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach(removeTrackingArea)
        addTrackingArea(NSTrackingArea(rect: bounds,
                                       options: [.mouseEnteredAndExited, .activeInKeyWindow, .inVisibleRect],
                                       owner: self))
    }

    override func mouseEntered(with event: NSEvent) { setHighlighted(true) }

    override func mouseExited(with event: NSEvent) { setHighlighted(false) }

    private func setHighlighted(_ on: Bool) {
        layer?.backgroundColor = on
            ? NSColor.selectedContentBackgroundColor.withAlphaComponent(0.18).cgColor
            : NSColor.clear.cgColor
    }
}
