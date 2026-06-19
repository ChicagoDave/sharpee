// BottomPanelViewController.swift
// The bottom dock: a subtle tab strip over two surfaces — Build (build output / tsc
// diagnostics) and Game Errors (translated Play runtime errors). Build output routes to
// the former; captured play errors route to the latter (selecting + badging that tab).
// Public interface: buildPanel, gameErrors, addPlayError(_:), clearPlayErrors().
// Owner context: tools/ide — Build (bottom panel).

import AppKit

final class BottomPanelViewController: NSViewController {

    let buildPanel = BuildPanelView()
    let gameErrors = GameErrorsView()

    private let buildTab = TabItemView()
    private let errorsTab = TabItemView()
    private static let stripHeight: CGFloat = 30

    override func loadView() {
        let container = NSView()
        container.wantsLayer = true
        container.layer?.backgroundColor = Theme.playBackground.cgColor

        buildTab.setTitle("Build")
        errorsTab.setTitle("Game Errors")
        buildTab.onClick = { [weak self] in self?.select(buildVisible: true) }
        errorsTab.onClick = { [weak self] in self?.select(buildVisible: false) }

        let tabs = NSStackView(views: [buildTab, errorsTab])
        tabs.orientation = .horizontal
        tabs.spacing = 0
        tabs.alignment = .height
        tabs.distribution = .fill
        tabs.translatesAutoresizingMaskIntoConstraints = false

        let strip = NSView()
        strip.wantsLayer = true
        strip.layer?.backgroundColor = Theme.railBackground.cgColor
        strip.translatesAutoresizingMaskIntoConstraints = false
        strip.addSubview(tabs)

        let border = NSView()
        border.wantsLayer = true
        border.layer?.backgroundColor = Theme.border.cgColor
        border.translatesAutoresizingMaskIntoConstraints = false
        strip.addSubview(border)

        buildPanel.translatesAutoresizingMaskIntoConstraints = false
        gameErrors.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(strip)
        container.addSubview(buildPanel)
        container.addSubview(gameErrors)

        NSLayoutConstraint.activate([
            strip.topAnchor.constraint(equalTo: container.topAnchor),
            strip.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            strip.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            strip.heightAnchor.constraint(equalToConstant: Self.stripHeight),

            tabs.topAnchor.constraint(equalTo: strip.topAnchor),
            tabs.bottomAnchor.constraint(equalTo: strip.bottomAnchor),
            tabs.leadingAnchor.constraint(equalTo: strip.leadingAnchor, constant: 4),

            border.leadingAnchor.constraint(equalTo: strip.leadingAnchor),
            border.trailingAnchor.constraint(equalTo: strip.trailingAnchor),
            border.bottomAnchor.constraint(equalTo: strip.bottomAnchor),
            border.heightAnchor.constraint(equalToConstant: 1),

            buildPanel.topAnchor.constraint(equalTo: strip.bottomAnchor),
            buildPanel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            buildPanel.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            buildPanel.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            gameErrors.topAnchor.constraint(equalTo: buildPanel.topAnchor),
            gameErrors.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            gameErrors.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            gameErrors.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        view = container
        select(buildVisible: true)
    }

    /// Adds a play error to the Game Errors tab, badges the count, and selects that tab.
    func addPlayError(_ error: PlayConsoleError) {
        gameErrors.addError(error)
        errorsTab.setCount(gameErrors.errorCount)
        select(buildVisible: false)
    }

    /// Clears the Game Errors tab and resets its badge.
    func clearPlayErrors() {
        gameErrors.clear()
        errorsTab.setCount(0)
    }

    private func select(buildVisible: Bool) {
        buildTab.setActive(buildVisible)
        errorsTab.setActive(!buildVisible)
        buildPanel.isHidden = !buildVisible
        gameErrors.isHidden = buildVisible
    }
}

/// A single subtle tab: a text label (+ optional count badge) with an accent bar on top when
/// active. Mirrors the bottom-panel mock — no segmented-control pills.
private final class TabItemView: NSView {

    var onClick: (() -> Void)?

    private let titleLabel = NSTextField(labelWithString: "")
    private let badge = NSTextField(labelWithString: "")
    private let accentBar = NSView()

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        accentBar.wantsLayer = true
        accentBar.layer?.backgroundColor = Theme.accent.cgColor
        accentBar.isHidden = true
        accentBar.translatesAutoresizingMaskIntoConstraints = false

        titleLabel.font = NSFont.systemFont(ofSize: 11)
        titleLabel.textColor = Theme.foregroundDim

        badge.font = NSFont.systemFont(ofSize: 10, weight: .semibold)
        badge.textColor = Theme.railBackground
        badge.alignment = .center
        badge.wantsLayer = true
        badge.layer?.backgroundColor = NSColor.systemRed.cgColor
        badge.layer?.cornerRadius = 7
        badge.isHidden = true

        let stack = NSStackView(views: [titleLabel, badge])
        stack.orientation = .horizontal
        stack.spacing = 6
        stack.translatesAutoresizingMaskIntoConstraints = false

        addSubview(stack)
        addSubview(accentBar)

        NSLayoutConstraint.activate([
            stack.centerYAnchor.constraint(equalTo: centerYAnchor),
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
            accentBar.topAnchor.constraint(equalTo: topAnchor),
            accentBar.leadingAnchor.constraint(equalTo: leadingAnchor),
            accentBar.trailingAnchor.constraint(equalTo: trailingAnchor),
            accentBar.heightAnchor.constraint(equalToConstant: 2),
            badge.heightAnchor.constraint(equalToConstant: 14),
            badge.widthAnchor.constraint(greaterThanOrEqualToConstant: 16),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("TabItemView is not Storyboard-instantiable")
    }

    func setTitle(_ title: String) { titleLabel.stringValue = title }

    func setCount(_ count: Int) {
        badge.stringValue = "\(count)"
        badge.isHidden = count <= 0
    }

    func setActive(_ active: Bool) {
        accentBar.isHidden = !active
        titleLabel.textColor = active ? Theme.foreground : Theme.foregroundDim
        layer?.backgroundColor = (active ? Theme.playBackground : .clear).cgColor
    }

    override func mouseDown(with event: NSEvent) {
        onClick?()
    }
}
