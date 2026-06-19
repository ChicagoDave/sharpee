// BottomPanelViewController.swift
// The bottom dock: a reusable tab strip over two surfaces — Build (build output / tsc
// diagnostics) and Game Errors (translated Play runtime errors). Build output routes to the
// former; captured play errors route to the latter (selecting + badging that tab).
// Public interface: buildPanel, gameErrors, addPlayError(_:), clearPlayErrors().
// Owner context: tools/ide — Build (bottom panel).

import AppKit

final class BottomPanelViewController: NSViewController {

    let buildPanel = BuildPanelView()
    let gameErrors = GameErrorsView()

    private let tabStrip = TabStripView()
    private static let buildTab = 0
    private static let errorsTab = 1

    override func loadView() {
        let container = NSView()
        container.wantsLayer = true
        container.layer?.backgroundColor = Theme.playBackground.cgColor

        tabStrip.addTab(title: "Build")
        tabStrip.addTab(title: "Game Errors")
        tabStrip.onSelect = { [weak self] index in self?.show(tab: index) }
        tabStrip.translatesAutoresizingMaskIntoConstraints = false

        buildPanel.translatesAutoresizingMaskIntoConstraints = false
        gameErrors.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(tabStrip)
        container.addSubview(buildPanel)
        container.addSubview(gameErrors)

        NSLayoutConstraint.activate([
            tabStrip.topAnchor.constraint(equalTo: container.topAnchor),
            tabStrip.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            tabStrip.trailingAnchor.constraint(equalTo: container.trailingAnchor),

            buildPanel.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            buildPanel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            buildPanel.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            buildPanel.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            gameErrors.topAnchor.constraint(equalTo: buildPanel.topAnchor),
            gameErrors.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            gameErrors.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            gameErrors.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        view = container
        show(tab: Self.buildTab)
    }

    /// Adds a play error to the Game Errors tab, badges the count, and selects that tab.
    func addPlayError(_ error: PlayConsoleError) {
        gameErrors.addError(error)
        tabStrip.setCount(gameErrors.errorCount, forTab: Self.errorsTab)
        tabStrip.select(Self.errorsTab)
    }

    /// Clears the Game Errors tab and resets its badge.
    func clearPlayErrors() {
        gameErrors.clear()
        tabStrip.setCount(0, forTab: Self.errorsTab)
    }

    private func show(tab index: Int) {
        buildPanel.isHidden = index != Self.buildTab
        gameErrors.isHidden = index != Self.errorsTab
    }
}
