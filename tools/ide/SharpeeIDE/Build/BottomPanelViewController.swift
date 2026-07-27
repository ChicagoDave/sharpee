// BottomPanelViewController.swift
// The bottom dock: a reusable tab strip over three surfaces — Build (streamed build
// output), Problems (structured Chord compose diagnostics, ADR-258 D5), and Game
// Errors (translated Play runtime errors). Build output routes to the first;
// compose results to the second (badging its error count); captured play errors to
// the third (selecting + badging that tab).
// Public interface: buildPanel, problems, gameErrors, setProblems(_:for:),
// setProblemsStatus(_:), addPlayError(_:), clearPlayErrors().
// Owner context: tools/ide — Build (bottom panel).

import AppKit

final class BottomPanelViewController: NSViewController {

    let buildPanel = BuildPanelView()
    let problems = ProblemsView()
    let gameErrors = GameErrorsView()

    private let tabStrip = TabStripView()
    private static let buildTab = 0
    private static let problemsTab = 1
    private static let errorsTab = 2

    override func loadView() {
        let container = NSView()
        container.wantsLayer = true
        container.layer?.backgroundColor = Theme.playBackground.cgColor

        tabStrip.addTab(title: "Build")
        tabStrip.addTab(title: "Problems")
        tabStrip.addTab(title: "Game Errors")
        tabStrip.onSelect = { [weak self] index in self?.show(tab: index) }
        tabStrip.translatesAutoresizingMaskIntoConstraints = false

        buildPanel.translatesAutoresizingMaskIntoConstraints = false
        problems.translatesAutoresizingMaskIntoConstraints = false
        gameErrors.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(tabStrip)
        container.addSubview(buildPanel)
        container.addSubview(problems)
        container.addSubview(gameErrors)

        NSLayoutConstraint.activate([
            tabStrip.topAnchor.constraint(equalTo: container.topAnchor),
            tabStrip.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            tabStrip.trailingAnchor.constraint(equalTo: container.trailingAnchor),

            buildPanel.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            buildPanel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            buildPanel.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            buildPanel.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            problems.topAnchor.constraint(equalTo: buildPanel.topAnchor),
            problems.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            problems.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            problems.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            gameErrors.topAnchor.constraint(equalTo: buildPanel.topAnchor),
            gameErrors.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            gameErrors.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            gameErrors.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        view = container
        show(tab: Self.buildTab)
    }

    /// Replaces the Problems list with a compose run's records and updates the badge.
    func setProblems(_ records: [ComposeDiagnosticRecord], for storyURL: URL) {
        problems.setProblems(records, for: storyURL)
        tabStrip.setCount(problems.errorCount, forTab: Self.problemsTab)
    }

    /// Shows a compose-pipeline status line in Problems (badge cleared).
    func setProblemsStatus(_ message: String) {
        problems.setStatus(message)
        tabStrip.setCount(0, forTab: Self.problemsTab)
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
        problems.isHidden = index != Self.problemsTab
        gameErrors.isHidden = index != Self.errorsTab
    }
}
