// RightPanelViewController.swift
// The right panel: a tab strip over the running game (Play) and the error explainer
// (Diagnosis), built on the reusable TabStripView so more tabs (e.g. a map) can be added.
// Public interface: play, showDiagnosis(_:count:), revealDiagnosis(_:), clearDiagnosis(),
// onOpenLocation.
// Owner context: tools/ide — Play (right panel).

import AppKit

final class RightPanelViewController: NSViewController {

    let play = PlayViewController()
    let diagnosis = ErrorDiagnosisView()

    /// Forwarded from the Diagnosis view: a clicked source location to open in the editor.
    var onOpenLocation: ((SourceLocation) -> Void)? {
        get { diagnosis.onOpenLocation }
        set { diagnosis.onOpenLocation = newValue }
    }

    private let tabStrip = TabStripView()
    private static let playTab = 0
    private static let diagnosisTab = 1

    override func loadView() {
        let container = NSView()
        container.wantsLayer = true
        container.layer?.backgroundColor = Theme.playBackground.cgColor

        addChild(play)
        tabStrip.addTab(title: "Play")
        tabStrip.addTab(title: "Diagnosis")
        tabStrip.onSelect = { [weak self] index in self?.show(tab: index) }
        tabStrip.translatesAutoresizingMaskIntoConstraints = false

        play.view.translatesAutoresizingMaskIntoConstraints = false
        diagnosis.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(tabStrip)
        container.addSubview(play.view)
        container.addSubview(diagnosis)

        NSLayoutConstraint.activate([
            tabStrip.topAnchor.constraint(equalTo: container.topAnchor),
            tabStrip.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            tabStrip.trailingAnchor.constraint(equalTo: container.trailingAnchor),

            play.view.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            play.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            play.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            play.view.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            diagnosis.topAnchor.constraint(equalTo: play.view.topAnchor),
            diagnosis.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            diagnosis.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            diagnosis.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        view = container
        show(tab: Self.playTab)
    }

    /// Updates the Diagnosis content + badge for a newly-arrived error, without leaving Play.
    func showDiagnosis(_ error: PlayConsoleError, count: Int) {
        diagnosis.show(error)
        tabStrip.setCount(count, forTab: Self.diagnosisTab)
    }

    /// Shows an error's explanation and switches to the Diagnosis tab (on user request).
    func revealDiagnosis(_ error: PlayConsoleError) {
        diagnosis.show(error)
        tabStrip.select(Self.diagnosisTab)
    }

    func clearDiagnosis() {
        diagnosis.clear()
        tabStrip.setCount(0, forTab: Self.diagnosisTab)
    }

    private func show(tab index: Int) {
        play.view.isHidden = index != Self.playTab
        diagnosis.isHidden = index != Self.diagnosisTab
    }
}
