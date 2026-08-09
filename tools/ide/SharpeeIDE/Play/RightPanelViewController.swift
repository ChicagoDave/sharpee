// RightPanelViewController.swift
// The right panel: a tab strip over the Chord build output (Build), the running
// game (Play), the Testing surface (ADR-301 D1), the error explainer
// (Diagnosis), and the bundled author documentation (Documentation, go-live
// Phase 3) —
// David's ruling: the build process lives NEXT TO Play, not in the bottom dock
// (which stays for Problems and Game Errors). A build starting switches to
// Build; a successful play-after-build switches to Play.
//
// The Skein tab and its actions (replay / tag / force / bless) were removed with
// ADR-299's retirement: ADR-300 retires the `.skein` artifact and the second
// verification engine, and the transcript tree the Testing tab renders is what
// replaces the skein's tree.
// The testing workspace (ADR-304): selecting the Testing tab does not show it
// inline — it asks the main split to enter the workspace, which borrows the
// Play surface for the left pane (lendPlaySurfaceForTestingWorkspace) and
// locks this panel into a modal shape: strip hidden, Testing full-bleed. The
// workspace's one exit hands the surface back (reclaimPlaySurface…), restoring
// the tab that was showing before.
// Public interface: buildPanel, play, testingTab, docsTab, index, diagnosis,
// showBuildTab(), showPlayTab(), showTestingTab(), showDocsTab(page:),
// showPublishTab(), showDiagnosis(_:count:), revealDiagnosis(_:),
// clearDiagnosis(), onOpenLocation, onTestingWorkspaceRequested,
// isTestingWorkspaceActive, lendPlaySurfaceForTestingWorkspace(),
// reclaimPlaySurfaceFromTestingWorkspace().
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

    /// The testing workspace's one entrance (ADR-304 D2): invoked when the
    /// Testing tab is selected, instead of showing the tab inline. Set by
    /// MainSplitViewController; nil (standalone use in tests) falls back to
    /// the inline Testing view.
    var onTestingWorkspaceRequested: (() -> Void)?

    /// Whether the panel is locked into its testing-workspace shape (strip
    /// hidden, Testing full-bleed, Play surface lent to the left pane).
    private(set) var isTestingWorkspaceActive = false

    /// The last tab actually shown inline — what the workspace's exit restores.
    private var lastShownTab = RightPanelViewController.playTab

    /// The Play surface's constraints, kept so the surface can leave for the
    /// testing workspace and come back without re-deriving its layout.
    private var playSurfaceConstraints: [NSLayoutConstraint] = []
    /// Testing's two top edges: below the strip normally, at the container top
    /// while the workspace hides the strip. Exactly one is active.
    private var testingTopToStrip: NSLayoutConstraint!
    private var testingTopToContainer: NSLayoutConstraint!

    private let tabStrip = TabStripView()
    private static let buildTab = 0
    private static let playTab = 1
    private static let testingTabIndex = 2
    private static let indexTab = 3
    private static let diagnosisTab = 4
    private static let docsTabIndex = 5
    private static let publishTab = 6

    override func loadView() {
        let container = ThemedPane(color: Theme.playBackground)

        addChild(play)
        addChild(testingTab)
        addChild(docsTab)
        tabStrip.addTab(title: "Build")
        tabStrip.addTab(title: "Play")
        tabStrip.addTab(title: "Testing")
        tabStrip.addTab(title: "Index")
        tabStrip.addTab(title: "Diagnosis")
        tabStrip.addTab(title: "Documentation")
        tabStrip.addTab(title: "Publish")
        tabStrip.onSelect = { [weak self] tab in self?.show(tab: tab) }
        tabStrip.translatesAutoresizingMaskIntoConstraints = false

        buildPanel.translatesAutoresizingMaskIntoConstraints = false
        play.view.translatesAutoresizingMaskIntoConstraints = false
        index.translatesAutoresizingMaskIntoConstraints = false
        diagnosis.translatesAutoresizingMaskIntoConstraints = false
        testingTab.view.translatesAutoresizingMaskIntoConstraints = false
        docsTab.view.translatesAutoresizingMaskIntoConstraints = false
        publish.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(tabStrip)
        container.addSubview(buildPanel)
        container.addSubview(play.view)
        container.addSubview(index)
        container.addSubview(diagnosis)
        container.addSubview(testingTab.view)
        container.addSubview(docsTab.view)
        container.addSubview(publish)

        // Every content view hangs off the STRIP, not off play.view: the Play
        // surface leaves this panel during the testing workspace, and any
        // constraint anchored to it would die with the removal.
        playSurfaceConstraints = [
            play.view.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            play.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            play.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            play.view.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ]
        testingTopToStrip = testingTab.view.topAnchor.constraint(equalTo: tabStrip.bottomAnchor)
        testingTopToContainer = testingTab.view.topAnchor.constraint(equalTo: container.topAnchor)

        NSLayoutConstraint.activate(playSurfaceConstraints + [
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

            testingTopToStrip,
            testingTab.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            testingTab.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            testingTab.view.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            docsTab.view.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            docsTab.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            docsTab.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            docsTab.view.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            publish.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            publish.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            publish.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            publish.bottomAnchor.constraint(equalTo: container.bottomAnchor),
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

    /// Switches to the Publish tab (ADR-284) — the finish line for a story.
    func showPublishTab() {
        tabStrip.select(Self.publishTab)
    }

    /// Switches to the Documentation tab, optionally at a given page.
    func showDocsTab(page href: String? = nil) {
        if let href { docsTab.showPage(href) }
        tabStrip.select(Self.docsTabIndex)
    }



    private func show(tab selected: Int) {
        // Modal (ADR-304 D2): while the workspace is open there is exactly one
        // exit, and it is not a tab — programmatic switches wait until then.
        if isTestingWorkspaceActive { return }
        // Selecting Testing ENTERS the workspace (D1) — the tab never shows
        // inline when a workspace host is wired.
        if selected == Self.testingTabIndex, let requestWorkspace = onTestingWorkspaceRequested {
            requestWorkspace()
            return
        }
        buildPanel.isHidden = selected != Self.buildTab
        play.view.isHidden = selected != Self.playTab
        index.isHidden = selected != Self.indexTab
        diagnosis.isHidden = selected != Self.diagnosisTab
        testingTab.view.isHidden = selected != Self.testingTabIndex
        docsTab.view.isHidden = selected != Self.docsTabIndex
        publish.isHidden = selected != Self.publishTab
        lastShownTab = selected
    }

    // MARK: Testing workspace (ADR-304)

    /// Lends the Play surface to the left pane and locks this panel into its
    /// workspace shape: strip hidden, Testing full-bleed, everything else
    /// hidden (D1/D2). The surface's view controller and view are detached
    /// here — never torn down — so the caller reparents a LIVE web view (D3).
    ///
    /// - Returns: the Play surface for the left pane to host.
    func lendPlaySurfaceForTestingWorkspace() -> PlayViewController {
        guard !isTestingWorkspaceActive else { return play }
        isTestingWorkspaceActive = true
        play.view.removeFromSuperview()
        play.removeFromParent()
        tabStrip.isHidden = true
        testingTopToStrip.isActive = false
        testingTopToContainer.isActive = true
        buildPanel.isHidden = true
        index.isHidden = true
        diagnosis.isHidden = true
        docsTab.view.isHidden = true
        publish.isHidden = true
        testingTab.view.isHidden = false
        return play
    }

    /// Takes the Play surface back from the left pane and restores the tabbed
    /// shape, re-showing the tab that was inline before the workspace opened.
    /// The workspace's one exit (D2) lands here.
    func reclaimPlaySurfaceFromTestingWorkspace() {
        guard isTestingWorkspaceActive else { return }
        isTestingWorkspaceActive = false
        addChild(play)
        view.addSubview(play.view)
        NSLayoutConstraint.activate(playSurfaceConstraints)
        testingTopToContainer.isActive = false
        testingTopToStrip.isActive = true
        tabStrip.isHidden = false
        tabStrip.select(lastShownTab)
    }

}
