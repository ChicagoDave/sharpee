// RightPanelViewController.swift
// The right panel: a tab strip over the Chord build output (Build), the running
// game (Play), the testing play surface (Testing), the error explainer
// (Diagnosis), and the bundled author documentation (Documentation, go-live
// Phase 3) —
// David's ruling: the build process lives NEXT TO Play, not in the bottom dock
// (which stays for Problems and Game Errors). A build starting switches to
// Build; a successful play-after-build switches to Play.
//
// The Testing tab IS the testing play surface (David's ruling, 2026-08-09:
// "remove the old UX and embed the new UX in the Testing tab") — the ADR-301
// tree/documents tab and the separate surface window are both retired. The
// surface controller is installed per project by the window (its D8 session
// sidecar is per-story), so this panel hosts a container and a placeholder
// until one arrives.
// The World tab (ADR-321 D8) is the story ANALYSED — map, reachability, and the
// phrases its prose names that nothing answers to — and is a sibling of Index,
// which is the story ENUMERATED. It sits last in the strip rather than beside
// Index so the persisted tab index keeps meaning what it meant before it existed.
// Public interface: buildPanel, play, testingSurface, installTestingSurface(_:),
// clearTestingSurface(), docsTab, index, diagnosis, world, showBuildTab(),
// showPlayTab(), showTestingTab(), showDocsTab(page:), showPublishTab(),
// showWorldTab(), showWorld(_:), showWorldLoading(), clearWorld(reason:),
// showDiagnosis(_:count:), revealDiagnosis(_:), clearDiagnosis(),
// onOpenLocation, onTestingTabSelected.
// Owner context: tools/ide — Play (right panel).

import AppKit

final class RightPanelViewController: NSViewController {

    let buildPanel = BuildPanelView()
    let play = PlayViewController()
    let index = IndexView()
    let diagnosis = ErrorDiagnosisView()
    /// The World tab (ADR-321): map, reach, and incomplete, derived by the
    /// analyzer subprocess after a successful build.
    let world = WorldView()
    /// The testing play surface (ADR-306), installed per project — nil until
    /// the window binds one (the D8 session sidecar is per-story).
    private(set) var testingSurface: TestingSurfaceViewController?
    /// Hosts the surface's view; shows the placeholder until one is installed.
    private let testingContainer = ThemedPane(color: Theme.playBackground)
    private let testingPlaceholder = NSTextField(labelWithString: "Build (\u{2318}B) to open the testing surface")
    /// Fired when the author selects the Testing tab — the window uses it to
    /// install and lazily load the surface.
    var onTestingTabSelected: (() -> Void)?
    /// Fired on every tab change — the window persists the choice (visual
    /// state survives relaunch).
    var onTabChanged: (() -> Void)?

    /// The selected tab index, for persistence; pair with `selectTab(_:)`.
    var selectedTab: Int { tabStrip.selectedIndex }

    /// Restores a persisted tab choice. Out-of-range values are ignored.
    func selectTab(_ index: Int) {
        guard (0...Self.worldTab).contains(index) else { return }
        tabStrip.select(index)
    }
    /// The author documentation bundled with the app (go-live Phase 3): the same
    /// scheme-handler machinery as the Testing tab, pointed at a different root.
    let docsTab = DocsTabViewController()
    /// The finish line (ADR-284, go-live item 1): builds and zips a
    /// distributable browser version of the story.
    let publish = PublishView()

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
    private static let docsTabIndex = 5
    private static let publishTab = 6
    private static let worldTab = 7

    override func loadView() {
        let container = ThemedPane(color: Theme.playBackground)

        addChild(play)
        addChild(docsTab)
        tabStrip.addTab(title: "Build")
        tabStrip.addTab(title: "Play")
        tabStrip.addTab(title: "Testing")
        tabStrip.addTab(title: "Index")
        tabStrip.addTab(title: "Diagnosis")
        tabStrip.addTab(title: "Documentation")
        tabStrip.addTab(title: "Publish")
        tabStrip.addTab(title: "World")
        tabStrip.onSelect = { [weak self] tab in self?.show(tab: tab) }
        tabStrip.translatesAutoresizingMaskIntoConstraints = false

        buildPanel.translatesAutoresizingMaskIntoConstraints = false
        play.view.translatesAutoresizingMaskIntoConstraints = false
        index.translatesAutoresizingMaskIntoConstraints = false
        diagnosis.translatesAutoresizingMaskIntoConstraints = false
        testingContainer.translatesAutoresizingMaskIntoConstraints = false
        testingPlaceholder.font = NSFont.systemFont(ofSize: 11)
        testingPlaceholder.textColor = Theme.foregroundFaint
        testingPlaceholder.translatesAutoresizingMaskIntoConstraints = false
        testingContainer.addSubview(testingPlaceholder)
        docsTab.view.translatesAutoresizingMaskIntoConstraints = false
        publish.translatesAutoresizingMaskIntoConstraints = false
        world.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(tabStrip)
        container.addSubview(buildPanel)
        container.addSubview(play.view)
        container.addSubview(index)
        container.addSubview(diagnosis)
        container.addSubview(testingContainer)
        container.addSubview(docsTab.view)
        container.addSubview(publish)
        container.addSubview(world)

        NSLayoutConstraint.activate([
            play.view.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            play.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            play.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            play.view.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            tabStrip.topAnchor.constraint(equalTo: container.topAnchor),
            tabStrip.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            tabStrip.trailingAnchor.constraint(equalTo: container.trailingAnchor),

            buildPanel.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            buildPanel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            buildPanel.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            buildPanel.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            index.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            index.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            index.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            index.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            diagnosis.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            diagnosis.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            diagnosis.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            diagnosis.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            testingContainer.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            testingContainer.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            testingContainer.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            testingContainer.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            testingPlaceholder.centerXAnchor.constraint(equalTo: testingContainer.centerXAnchor),
            testingPlaceholder.centerYAnchor.constraint(equalTo: testingContainer.centerYAnchor),

            docsTab.view.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            docsTab.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            docsTab.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            docsTab.view.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            publish.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            publish.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            publish.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            publish.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            world.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            world.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            world.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            world.bottomAnchor.constraint(equalTo: container.bottomAnchor),
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


    /// Switches to the Testing tab — the testing play surface (ADR-306).
    func showTestingTab() {
        tabStrip.select(Self.testingTabIndex)
    }

    /// Installs the project's testing surface into the Testing tab, replacing
    /// any prior project's. The panel owns layout only — lifecycle stays with
    /// the window, which created the controller against the story's sidecar.
    func installTestingSurface(_ surface: TestingSurfaceViewController) {
        guard surface !== testingSurface else { return }
        clearTestingSurface()
        testingSurface = surface
        addChild(surface)
        surface.view.translatesAutoresizingMaskIntoConstraints = false
        testingContainer.addSubview(surface.view)
        NSLayoutConstraint.activate([
            surface.view.topAnchor.constraint(equalTo: testingContainer.topAnchor),
            surface.view.leadingAnchor.constraint(equalTo: testingContainer.leadingAnchor),
            surface.view.trailingAnchor.constraint(equalTo: testingContainer.trailingAnchor),
            surface.view.bottomAnchor.constraint(equalTo: testingContainer.bottomAnchor),
        ])
        testingPlaceholder.isHidden = true
    }

    /// Removes the installed surface (project switch) — the placeholder returns.
    func clearTestingSurface() {
        testingSurface?.view.removeFromSuperview()
        testingSurface?.removeFromParent()
        testingSurface = nil
        testingPlaceholder.isHidden = false
    }

    /// Switches to the Publish tab (ADR-284) — the finish line for a story.
    func showPublishTab() {
        tabStrip.select(Self.publishTab)
    }

    /// Switches to the World tab (ADR-321) — the story's map, reach, and
    /// incomplete views.
    func showWorldTab() {
        tabStrip.select(Self.worldTab)
    }

    /// Renders an analyzer response into the World tab and badges the strip with
    /// what it found, without leaving whatever tab the author is on.
    ///
    /// The World tab never steals focus: a build's payoff is the Play tab, and a
    /// candidate list that interrupts a play-test is a nag. The badge is how the
    /// author learns there is something to look at.
    ///
    /// - Parameter response: what the analyzer answered
    func showWorld(_ response: WorldIndexResponse) {
        world.show(response)
        tabStrip.setCount(world.findingCount, forTab: Self.worldTab)
    }

    /// Says an analysis is running, and clears the badge the last one left.
    ///
    /// The count goes with it: a badge from the previous build describes a story that has
    /// since changed, and leaving it up through a rebuild attributes the old findings to the
    /// new source.
    func showWorldLoading() {
        world.showLoading()
        tabStrip.setCount(0, forTab: Self.worldTab)
    }

    /// Returns the World tab to its explanatory state (no story, or a new one).
    /// - Parameter reason: the sentence to show in place of an analysis
    func clearWorld(reason: String) {
        world.showEmpty(reason: reason)
        tabStrip.setCount(0, forTab: Self.worldTab)
    }

    /// Switches to the Documentation tab, optionally at a given page.
    func showDocsTab(page href: String? = nil) {
        if let href { docsTab.showPage(href) }
        tabStrip.select(Self.docsTabIndex)
    }



    private func show(tab selected: Int) {
        buildPanel.isHidden = selected != Self.buildTab
        play.view.isHidden = selected != Self.playTab
        index.isHidden = selected != Self.indexTab
        diagnosis.isHidden = selected != Self.diagnosisTab
        testingContainer.isHidden = selected != Self.testingTabIndex
        docsTab.view.isHidden = selected != Self.docsTabIndex
        publish.isHidden = selected != Self.publishTab
        world.isHidden = selected != Self.worldTab
        if selected == Self.testingTabIndex { onTestingTabSelected?() }
        onTabChanged?()
    }

}
