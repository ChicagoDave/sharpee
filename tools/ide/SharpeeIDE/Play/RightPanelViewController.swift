// RightPanelViewController.swift
// The right panel: a tab strip over the Chord build output (Build), the running
// game (Play), the Testing surface (ADR-301 D1), and the error explainer
// (Diagnosis) — David's ruling: the build process lives NEXT TO Play, not in the
// bottom dock (which stays for Problems and Game Errors). A build starting
// switches to Build; a successful play-after-build switches to Play.
//
// The Skein tab and its actions (replay / tag / force / bless) were removed with
// ADR-299's retirement: ADR-300 retires the `.skein` artifact and the second
// verification engine, and the transcript tree the Testing tab renders is what
// replaces the skein's tree.
// Public interface: buildPanel, play, testingTab, testPanel, index, diagnosis,
// showBuildTab(), showPlayTab(), showTestTab(), showTestingTab(),
// showDiagnosis(_:count:), revealDiagnosis(_:), clearDiagnosis(), onOpenLocation.
// Owner context: tools/ide — Play (right panel).

import AppKit

final class RightPanelViewController: NSViewController {

    let buildPanel = BuildPanelView()
    let play = PlayViewController()
    let index = IndexView()
    let diagnosis = ErrorDiagnosisView()
    /// The ADR-301 D1 Testing surface: a web bundle in a WKWebView, and the only
    /// place a run is watched. The outline panel that used to sit beside it is
    /// retired — one run, one surface.
    let testingTab = TestingTabViewController()

    /// Forwarded from the Diagnosis view: a clicked source location to open in the editor.
    var onOpenLocation: ((SourceLocation) -> Void)? {
        get { diagnosis.onOpenLocation }
        set { diagnosis.onOpenLocation = newValue }
    }

    private let tabStrip = TabStripView()
    private static let buildTab = 0
    private static let playTab = 1
    private static let testingTabIndex = 2
    private static let indexTab = 3
    private static let diagnosisTab = 4

    override func loadView() {
        let container = ThemedPane(color: Theme.playBackground)

        addChild(play)
        addChild(testingTab)
        tabStrip.addTab(title: "Build")
        tabStrip.addTab(title: "Play")
        tabStrip.addTab(title: "Testing")
        tabStrip.addTab(title: "Index")
        tabStrip.addTab(title: "Diagnosis")
        tabStrip.onSelect = { [weak self] tab in self?.show(tab: tab) }
        tabStrip.translatesAutoresizingMaskIntoConstraints = false

        buildPanel.translatesAutoresizingMaskIntoConstraints = false
        play.view.translatesAutoresizingMaskIntoConstraints = false
        index.translatesAutoresizingMaskIntoConstraints = false
        diagnosis.translatesAutoresizingMaskIntoConstraints = false
        testingTab.view.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(tabStrip)
        container.addSubview(buildPanel)
        container.addSubview(play.view)
        container.addSubview(index)
        container.addSubview(diagnosis)
        container.addSubview(testingTab.view)

        NSLayoutConstraint.activate([
            tabStrip.topAnchor.constraint(equalTo: container.topAnchor),
            tabStrip.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            tabStrip.trailingAnchor.constraint(equalTo: container.trailingAnchor),

            play.view.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            play.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            play.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            play.view.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            buildPanel.topAnchor.constraint(equalTo: play.view.topAnchor),
            buildPanel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            buildPanel.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            buildPanel.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            index.topAnchor.constraint(equalTo: play.view.topAnchor),
            index.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            index.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            index.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            diagnosis.topAnchor.constraint(equalTo: play.view.topAnchor),
            diagnosis.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            diagnosis.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            diagnosis.bottomAnchor.constraint(equalTo: container.bottomAnchor),


            testingTab.view.topAnchor.constraint(equalTo: play.view.topAnchor),
            testingTab.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            testingTab.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            testingTab.view.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        view = container
        tabStrip.select(Self.playTab) // strip + content agree from first paint
    }

    /// Switches to the Build tab (a build just started — its output streams here).
    func showBuildTab() {
        tabStrip.select(Self.buildTab)
    }

    /// Switches to the Play tab (a successful build just loaded the game).
    func showPlayTab() {
        tabStrip.select(Self.playTab)
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


    /// Switches to the Testing tab (ADR-301) — where a run is watched live.
    func showTestingTab() {
        tabStrip.select(Self.testingTabIndex)
    }



    private func show(tab selected: Int) {
        buildPanel.isHidden = selected != Self.buildTab
        play.view.isHidden = selected != Self.playTab
        index.isHidden = selected != Self.indexTab
        diagnosis.isHidden = selected != Self.diagnosisTab
        testingTab.view.isHidden = selected != Self.testingTabIndex
    }

}
