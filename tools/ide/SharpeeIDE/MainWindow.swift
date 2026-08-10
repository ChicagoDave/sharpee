// MainWindow.swift
// Main window shell for Sharpee: a vertical split of (4-pane horizontal split) over a
// bottom-docked Build panel, with a status bar footer. The Build panel is toggled from
// the rail and hidden by default.
// Public interface: MainWindowController constructs and presents the window, and forwards
// project-load / build-panel calls down the view-controller chain.
// Owner context: tools/ide — App shell.

import AppKit

// MARK: - Window controller

final class MainWindowController: NSWindowController {

    convenience init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1400, height: 900),
            // .fullSizeContentView + a transparent titlebar hands the chrome band
            // to the content view, so the story title can be centered IN the
            // border instead of in a strip below it (macOS 26 draws the native
            // title leading-aligned and offers no alignment knob). The traffic
            // lights float over the band's leading edge; RootViewController keeps
            // the strip exactly as tall as the band.
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        // Launch title is the product name (ADR-279 D1). Once a compose reveals
        // a story title, the window carries THAT (D1 Amendment A1, GH #188) —
        // the folder-name-in-title ruling this replaced was about not repeating
        // the project directory, not about hiding the work's own name. Updated
        // in RootViewController.handleComposeOutcome / loadProject.
        window.title = AppIdentity.productName
        window.minSize = NSSize(width: 900, height: 600)
        window.contentViewController = RootViewController()
        // Re-apply the desired content size after contentViewController is assigned —
        // assigning the controller can shrink the window to the view's fittingSize.
        window.setContentSize(NSSize(width: 1400, height: 900))
        window.center()
        // Geometry restores from the session (David 2026-08-09: the IDE's
        // state includes window height and width), applied before the window
        // shows and before the landing page — geometry is visual state, not
        // project content. AppKit's frame autosave is deliberately not used:
        // one writer (persistSession), one reader, no timing races with the
        // pre-appearance fitting-size churn.
        if let frame = SessionStateStore.load()?.windowFrame {
            window.setFrame(frame, display: false)
        }
        window.isReleasedWhenClosed = false

        self.init(window: window)
        // Cascading would reposition the restored frame on showWindow.
        shouldCascadeWindows = false

        // The window still CARRIES the title (Window menu, Mission Control); it
        // just no longer DRAWS it — the strip at the top of the content view
        // does, centered on the window.
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
    }

    /// Replaces the project displayed in the Project pane. Optional `expandedFolderURLs`
    /// re-applies a prior expansion state (used by session restoration).
    func loadProject(_ project: Project, expandedFolderURLs: [URL] = []) {
        rootViewController?.loadProject(project, expandedFolderURLs: expandedFolderURLs)
    }

    /// Rebuilds the Project pane from disk, keeping the author's expansion.
    ///
    /// ADR-290 D7's sidebar observer: a write that changes the project's FILES
    /// announces once, and this is the pane's share of the fan-out. It left
    /// with the outline Test panel (ADR-301 A1.2); without it a transcript
    /// created or trashed in the Testing tab stayed invisible here until the
    /// project was reopened.
    func refreshProjectTree() {
        rootViewController?.refreshProjectTree()
    }

    /// Forwards a Save action from the menu down to the editor.
    func saveActiveDocument() {
        rootViewController?.saveActiveDocument()
    }

    /// Saves every dirty document — Build's precondition (the build reads disk).
    /// Returns false when a save failed and the build should not proceed.
    @discardableResult
    func saveAllDocuments() -> Bool {
        rootViewController?.saveAllDocuments() ?? true
    }

    /// Opens a document URL in the editor — used by session restoration.
    func openDocument(at url: URL) {
        rootViewController?.openDocument(at: url)
    }

    /// Activates the tab at `index` — used by session restoration.
    func switchToDocument(at index: Int) {
        rootViewController?.switchToDocument(at: index)
    }

    /// Toggles soft word wrap in the editor.
    func setWordWrap(_ enabled: Bool) {
        rootViewController?.setWordWrap(enabled)
    }

    /// Shows or hides the bottom Build panel — used by session restoration and builds.
    func setBuildPanelVisible(_ visible: Bool) {
        rootViewController?.applyBuildPanelVisible(visible)
    }

    /// Shows or hides the left Project pane — used by session restoration.
    func setProjectPaneVisible(_ visible: Bool) {
        rootViewController?.applyProjectPaneVisible(visible)
    }

    /// Whether the Project pane is currently showing (drives the View menu's checkmark).
    var isProjectPaneVisible: Bool {
        rootViewController?.isProjectPaneVisible ?? false
    }

    /// Flips the Project pane's visibility and persists it — View → Project Pane.
    func toggleProjectPane() {
        rootViewController?.toggleProjectPane()
    }

    /// Appends a chunk of build output to the right panel's Build tab.
    func appendBuildOutput(_ text: String) {
        rootViewController?.appendBuildOutput(text)
    }

    /// Clears the Build tab (called at the start of a build).
    func clearBuildOutput() {
        rootViewController?.clearBuildOutput()
    }

    /// Switches the right panel to the Build tab (a build just started).
    func showBuildOutput() {
        rootViewController?.showBuildOutput()
    }

    /// The story report to append after a successful build (nil before any
    /// clean compile).
    func storyBuildReport() -> String? {
        rootViewController?.storyBuildReport()
    }

    /// The Publish tab's view (ADR-284) — the finish line for a story.
    var publishView: PublishView? {
        rootViewController?.publishView
    }

    /// Tells the Publish tab which story it would publish (nil disables it).
    func setPublishStory(_ storyURL: URL?) {
        rootViewController?.publishView?.setStory(storyURL)
    }

    /// Brings the Publish tab forward.
    func showPublishTab() {
        rootViewController?.showPublishTab()
    }

    /// The Testing tab's play surface, once a project bound one (nil before).
    var testingSurface: TestingSurfaceViewController? {
        rootViewController?.testingSurface
    }

    /// Brings the Testing tab forward — the testing play surface (David's
    /// ruling 2026-08-09: the new UX lives IN the tab; the ADR-301 tree tab
    /// and the separate surface window are retired).
    func showTestingTab() {
        rootViewController?.showTestingTab()
    }

    /// Ensures the surface is bound and brings the Testing tab forward.
    func openTestingSurface() {
        rootViewController?.openTestingSurface()
    }

    /// Runs the suite through the surface's run column (the Test menu's Run
    /// Tests). Ensures the surface, shows the tab, and clicks its Run.
    func runTestsInSurface() {
        rootViewController?.runTestsInSurface()
    }

    /// The Play surface (right panel). Fallback serves a window-less
    /// controller (tests), like testingTab above.
    var playSurface: PlayViewController {
        rootViewController?.playSurface ?? PlayViewController()
    }

    /// The editor's focused document (Run Current Test File target), or nil.
    var activeDocumentURL: URL? {
        rootViewController?.activeDocumentURL
    }

    /// Opens a document at an exact line (test-result click-through, D2).
    func openDocument(at url: URL, line: Int, column: Int) {
        rootViewController?.openDocument(at: url, line: line, column: column)
    }

    /// Whether an open tab for `url` holds edits the author has not saved.
    /// Asked before a re-bless rewrites a transcript (ADR-282 D2), because
    /// overwriting would lose those edits and saving the tab afterwards would
    /// lose the re-bless.
    func hasUnsavedChanges(at url: URL) -> Bool {
        rootViewController?.hasUnsavedChanges(at: url) ?? false
    }

    /// The editor's live text for `url` (its unsaved buffer), or nil when the
    /// file has no open tab.
    func currentText(at url: URL) -> String? {
        rootViewController?.currentText(at: url)
    }

    /// Refreshes an open tab after something outside the editor rewrote `url`.
    func reloadFromDisk(at url: URL) {
        rootViewController?.reloadFromDisk(at: url)
    }

    /// Loads (or clears) the Play pane for the given story's web bundle.
    func refreshPlay(projectRoot: URL?) {
        rootViewController?.refreshPlay(projectRoot: projectRoot)
    }

    /// After a successful Browser build, loads the just-built story into Play (if the toggle is on).
    func reloadPlayAfterBuild(projectRoot: URL) {
        rootViewController?.reloadPlayAfterBuild(projectRoot: projectRoot)
    }

    /// Composes `storyURL` to populate the project tree + Problems (ADR-258 D6:
    /// live, source-derived — no build gate). Called on project open.
    func composeStory(at storyURL: URL) {
        rootViewController?.composeStory(at: storyURL)
    }

    /// The composed story's identity for Build/Play menu gating (D2): nil until
    /// a compose has run; `isGrammar` disables Build for grammar-header files.
    var composedStory: (url: URL, isGrammar: Bool)? {
        rootViewController?.composedStory
    }

    /// The open story's shipped-theme ids (Build → Shipped Themes), or nil
    /// when the corral does not apply (no story / grammar-header file).
    func shippedThemeIds() -> [String]? {
        rootViewController?.shippedThemeIds()
    }

    /// Toggles a built-in theme in the story header's `themes:` line (6c).
    func toggleShippedTheme(_ themeId: String) {
        rootViewController?.toggleShippedTheme(themeId)
    }

    /// The open story's `auto-assertion:` policy (Test → Auto-Assertion), or
    /// nil for "let me decide" / no story / a grammar-header file (6e).
    func autoAssertionPolicy() -> StoryHeaderAutoAssertion.Policy? {
        rootViewController?.autoAssertionPolicy()
    }

    /// Whether the Auto-Assertion menu applies at all (a story is open and
    /// is not a grammar-header file) — nil-policy alone cannot say, because
    /// nil is also the legitimate "let me decide" state (6e).
    var autoAssertionMenuApplies: Bool {
        guard let story = composedStory else { return false }
        return !story.isGrammar
    }

    /// Sets the story header's `auto-assertion:` line; nil removes it (6e).
    func selectAutoAssertion(_ policy: StoryHeaderAutoAssertion.Policy?) {
        rootViewController?.selectAutoAssertion(policy)
    }

    /// Shows the empty project state with a one-line reason (D8: a restored
    /// session pointing at a retired TypeScript project explains itself).
    func showEmptyStateExplanation(_ text: String) {
        rootViewController?.showEmptyStateExplanation(text)
    }

    /// Applies a persisted "Play after build" value (session restore).
    func setPlayAfterBuild(_ on: Bool) {
        rootViewController?.applyPlayAfterBuild(on)
    }

    /// Applies a persisted right-panel tab choice (session restore).
    func setRightPanelTab(_ index: Int) {
        rootViewController?.applyRightPanelTab(index)
    }

    /// Updates the status-bar build pill.
    func updateBuildStatus(_ status: BuildStatusDisplay) {
        rootViewController?.updateBuildStatus(status)
    }

    /// Fills in the toolchain half of the status-bar version line (ADR-279 D1),
    /// once `sharpee --version` answers.
    func showToolchainVersions(_ versions: ChordVersionCheck.ToolchainVersions) {
        rootViewController?.showToolchainVersions(versions)
    }

    /// Sets the handler invoked when the build pill is clicked mid-build (cancel).
    var onBuildPillCancel: (() -> Void)? {
        get { rootViewController?.onBuildPillCancel }
        set { rootViewController?.onBuildPillCancel = newValue }
    }

    private var rootViewController: RootViewController? {
        window?.contentViewController as? RootViewController
    }
}

// MARK: - Root view controller (vertical split: main split over build panel + status bar)

private final class RootViewController: NSViewController {

    private let mainSplitViewController = MainSplitViewController()
    private let bottomPanelViewController = BottomPanelViewController()
    private let verticalSplitViewController = NSSplitViewController()
    private let statusBar = StatusBarView()
    /// The window's chrome band, drawn by us so the story title can be centered.
    private let storyTitleBar = StoryTitleBarViewController()

    private var currentBuildStatus: BuildStatusDisplay = .idle
    /// Cancels the running build when the pill is clicked mid-build. Wired by AppDelegate.
    fileprivate var onBuildPillCancel: (() -> Void)?

    private static let buildPanelMinHeight: CGFloat = 120
    private static let buildPanelInitialHeight: CGFloat = 220
    private var didApplyInitialBuildPanelHeight = false

    override func loadView() {
        configureVerticalSplit()
        addChild(verticalSplitViewController)

        mainSplitViewController.onBuildPanelToggle = { [weak self] in self?.toggleBuildPanel() }
        mainSplitViewController.buildPanelVisibleProvider = { [weak self] in self?.isBuildPanelVisible ?? false }
        statusBar.onPillClick = { [weak self] in self?.handlePillClick() }
        let openLocation: (SourceLocation) -> Void = { [weak self] location in
            self?.mainSplitViewController.openDocument(at: location.file,
                                                       line: location.line,
                                                       column: location.column)
        }
        bottomPanelViewController.gameErrors.onDoubleClick = openLocation
        mainSplitViewController.setDiagnosisOpenLocation(openLocation)

        // Compose pipeline (ADR-258 D5): results feed Problems + editor underlines;
        // a Problems row opens the exact span (hatch records: file:line).
        mainSplitViewController.onComposeOutcome = { [weak self] outcome in
            self?.handleComposeOutcome(outcome)
        }
        bottomPanelViewController.problems.onActivate = { [weak self] item in
            if let span = item.record.span {
                self?.mainSplitViewController.openDocument(at: item.fileURL, span: span)
            } else {
                self?.mainSplitViewController.openDocument(at: item.fileURL,
                                                           line: item.record.line, column: 1)
            }
        }

        bottomPanelViewController.problems.onFix = { [weak self] item in
            self?.applyProblemFix(item)
        }

        bottomPanelViewController.gameErrors.onErrorFocused = { [weak self] error in
            self?.mainSplitViewController.revealDiagnosis(error)
        }
        mainSplitViewController.onPlayConsoleError = { [weak self] error in
            guard let self else { return }
            self.bottomPanelViewController.addPlayError(error)
            self.mainSplitViewController.showDiagnosis(error, count: self.bottomPanelViewController.gameErrors.errorCount)
            self.applyBuildPanelVisible(true)
        }

        let container = NSView()
        container.translatesAutoresizingMaskIntoConstraints = false

        addChild(storyTitleBar)
        storyTitleBar.setTitle(AppIdentity.productName)
        storyTitleBar.view.translatesAutoresizingMaskIntoConstraints = false
        verticalSplitViewController.view.translatesAutoresizingMaskIntoConstraints = false
        statusBar.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(storyTitleBar.view)
        container.addSubview(verticalSplitViewController.view)
        container.addSubview(statusBar)

        NSLayoutConstraint.activate([
            // The chrome band: the content view starts at the window's top edge
            // (.fullSizeContentView), so this strip IS the titlebar area.
            storyTitleBar.view.topAnchor.constraint(equalTo: container.topAnchor),
            storyTitleBar.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            storyTitleBar.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),

            verticalSplitViewController.view.topAnchor.constraint(equalTo: storyTitleBar.view.bottomAnchor),
            verticalSplitViewController.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            verticalSplitViewController.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            verticalSplitViewController.view.bottomAnchor.constraint(equalTo: statusBar.topAnchor),

            statusBar.heightAnchor.constraint(equalToConstant: 22),
            statusBar.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            statusBar.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            statusBar.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        view = container
    }

    private func configureVerticalSplit() {
        verticalSplitViewController.splitView.isVertical = false
        verticalSplitViewController.splitView.dividerStyle = .thin
        verticalSplitViewController.splitView.autosaveName = "SharpeeIDEBuildPanelSplit"

        let top = NSSplitViewItem(viewController: mainSplitViewController)
        top.canCollapse = false
        top.holdingPriority = .defaultLow

        let bottom = NSSplitViewItem(viewController: bottomPanelViewController)
        bottom.canCollapse = true
        bottom.minimumThickness = Self.buildPanelMinHeight
        // Same drag-vs-hold rule as the project item: hold above the main
        // split's content (defaultLow) but below divider-drag priority.
        bottom.holdingPriority = NSLayoutConstraint.Priority(300)

        verticalSplitViewController.addSplitViewItem(top)
        verticalSplitViewController.addSplitViewItem(bottom)
        bottom.isCollapsed = true   // hidden by default
    }

    // MARK: Build panel visibility

    fileprivate var isBuildPanelVisible: Bool {
        !(verticalSplitViewController.splitViewItems.last?.isCollapsed ?? true)
    }

    /// Applies a visibility without persisting — used by session restore.
    fileprivate func applyBuildPanelVisible(_ visible: Bool) {
        guard let bottom = verticalSplitViewController.splitViewItems.last else { return }
        bottom.isCollapsed = !visible
        mainSplitViewController.setBuildRailActive(visible)
        if visible { applyInitialBuildPanelHeightIfNeeded() }
    }

    private func toggleBuildPanel() {
        applyBuildPanelVisible(!isBuildPanelVisible)
        mainSplitViewController.persistSession()
    }

    // MARK: Project pane visibility

    fileprivate var isProjectPaneVisible: Bool {
        mainSplitViewController.isProjectPaneVisible
    }

    /// Applies a visibility without persisting — session restore.
    fileprivate func applyProjectPaneVisible(_ visible: Bool) {
        mainSplitViewController.applyProjectPaneVisible(visible)
    }

    fileprivate func toggleProjectPane() {
        mainSplitViewController.toggleProjectPane()
    }

    /// Reflects the current build state in the status-bar pill.
    fileprivate func updateBuildStatus(_ status: BuildStatusDisplay) {
        currentBuildStatus = status
        statusBar.setBuildStatus(status)
    }

    fileprivate func showToolchainVersions(_ versions: ChordVersionCheck.ToolchainVersions) {
        statusBar.setToolchainVersions(versions)
        // The Documentation tab bundles pages written against one Chord version
        // and says so when the installed toolchain reports another.
        mainSplitViewController.docsTab.setToolchainVersion(versions.chord ?? "")
    }

    /// Pill click: cancel while building, otherwise toggle the Build panel.
    private func handlePillClick() {
        if currentBuildStatus == .building {
            onBuildPillCancel?()
        } else {
            toggleBuildPanel()
        }
    }

    /// First-time height for the panel when no autosaved divider exists, so its first
    /// reveal isn't a sliver. Subsequent drags persist via the split's autosave.
    private func applyInitialBuildPanelHeightIfNeeded() {
        guard !didApplyInitialBuildPanelHeight else { return }
        didApplyInitialBuildPanelHeight = true
        let autosaveKey = "NSSplitView Subview Frames \(verticalSplitViewController.splitView.autosaveName ?? "")"
        guard UserDefaults.standard.object(forKey: autosaveKey) == nil else { return }
        let height = verticalSplitViewController.splitView.bounds.height
        guard height > 0 else { return }
        verticalSplitViewController.splitView.setPosition(height - Self.buildPanelInitialHeight, ofDividerAt: 0)
    }

    // MARK: Forwarding

    func loadProject(_ project: Project, expandedFolderURLs: [URL] = []) {
        mainSplitViewController.loadProject(project, expandedFolderURLs: expandedFolderURLs)
        // Back to the product name until this project's first compose reveals
        // a story title (GH #188) — never carry the previous project's title.
        // Deliberately NOT read from composedIR here: the compose tree is not
        // reset on project switch, so it still holds the old project's IR.
        applyWindowTitle(AppIdentity.productName)
    }

    func refreshProjectTree() {
        mainSplitViewController.refreshProjectTree()
    }

    /// Sets the window's title and the centered strip that displays it. The two
    /// move together: the native title is hidden, so assigning `window.title`
    /// alone would change what the Window menu says and nothing on screen.
    ///
    /// - Parameter title: the text to show.
    private func applyWindowTitle(_ title: String) {
        view.window?.title = title
        storyTitleBar.setTitle(title)
    }

    /// Keeps the title strip exactly as tall as the window's titlebar band, so
    /// it occupies the chrome instead of adding a row. In full screen the band
    /// is gone and the strip collapses to nothing with it.
    override func viewDidLayout() {
        super.viewDidLayout()
        guard let window = view.window else { return }
        let band = window.frame.height - window.contentLayoutRect.height
        storyTitleBar.setBandHeight(max(0, band))
    }

    func saveActiveDocument() {
        mainSplitViewController.saveActiveDocument()
    }

    func saveAllDocuments() -> Bool {
        mainSplitViewController.saveAllDocuments()
    }

    func openDocument(at url: URL) {
        mainSplitViewController.openDocument(at: url)
    }

    func switchToDocument(at index: Int) {
        mainSplitViewController.switchToDocument(at: index)
    }

    func setWordWrap(_ enabled: Bool) {
        mainSplitViewController.setWordWrap(enabled)
    }

    func appendBuildOutput(_ text: String) {
        mainSplitViewController.appendBuildOutput(text)
    }

    func clearBuildOutput() {
        mainSplitViewController.clearBuildOutput()
        bottomPanelViewController.clearPlayErrors() // a new build supersedes prior game errors
        mainSplitViewController.clearDiagnosis()
    }

    func showBuildOutput() {
        mainSplitViewController.showBuildTab()
    }

    var publishView: PublishView? { mainSplitViewController.publishView }

    var testingSurface: TestingSurfaceViewController? { mainSplitViewController.testingSurface }

    func showPublishTab() { mainSplitViewController.showPublishTab() }

    func showTestingTab() {
        mainSplitViewController.showTestingTab()
    }

    /// The Testing tab's play surface (ADR-306, embedded).
    func openTestingSurface() {
        mainSplitViewController.openTestingSurface()
    }

    func runTestsInSurface() {
        mainSplitViewController.runTestsInSurface()
    }

    /// The Play surface (right panel).
    var playSurface: PlayViewController { mainSplitViewController.playViewController }

    /// The editor's focused document (Run Current Test File enablement/target).
    var activeDocumentURL: URL? { mainSplitViewController.activeDocumentURL }

    func openDocument(at url: URL, line: Int, column: Int) {
        mainSplitViewController.openDocument(at: url, line: line, column: column)
    }

    /// Whether an open tab for `url` holds edits the author has not saved.
    /// Asked before a re-bless rewrites a transcript (ADR-282 D2).
    func hasUnsavedChanges(at url: URL) -> Bool {
        mainSplitViewController.hasUnsavedChanges(at: url)
    }

    fileprivate func currentText(at url: URL) -> String? {
        mainSplitViewController.currentText(at: url)
    }

    /// Refreshes an open tab after something outside the editor rewrote `url`.
    func reloadFromDisk(at url: URL) {
        mainSplitViewController.reloadFromDisk(at: url)
    }

    func storyBuildReport() -> String? {
        mainSplitViewController.storyBuildReport()
    }

    /// Diagnostics the last compose reported, so the panel can be revealed on
    /// the transition from clean to not-clean and never again for the same run
    /// of problems.
    private var lastProblemCount = 0

    /// Routes a compose outcome to the Problems tab and the editor's underlines.
    private func handleComposeOutcome(_ outcome: ComposeScheduler.Outcome) {
        switch outcome.result {
        case .success(let payload):
            bottomPanelViewController.setProblems(payload.diagnostics, for: outcome.storyURL)
            mainSplitViewController.applyComposeDiagnostics(payload.diagnostics,
                                                            forFile: outcome.storyURL)
            // The panel is collapsed by default, so a diagnostic could underline
            // the editor while the only surface that NAMES it stayed hidden —
            // the author saw a coloured squiggle and no text anywhere. Reveal on
            // the clean → not-clean edge only: revealing on every compose would
            // reopen a panel the author had just closed, on every keystroke.
            if lastProblemCount == 0 && !payload.diagnostics.isEmpty {
                applyBuildPanelVisible(true)
            }
            lastProblemCount = payload.diagnostics.count
        case .failure(let failure):
            bottomPanelViewController.setProblemsStatus(Self.statusMessage(for: failure))
        }
        // The window carries the story's title once a compose reveals it
        // (GH #188, ADR-279 D1 Amendment A1). Runs on failure too: the tree
        // keeps the last populated IR, so the title stays with it.
        applyWindowTitle(WindowTitle.title(for: mainSplitViewController.composedIR))
    }

    /// The shipped-theme ids the open story's header declares (Build → Shipped
    /// Themes checkmarks), or nil when no story is open / it is a grammar file.
    /// Reads the editor's unsaved buffer first, disk second — the corral must
    /// reflect what the author sees, not what was last saved.
    func shippedThemeIds() -> [String]? {
        guard let story = composedStory, !story.isGrammar else { return nil }
        let source = mainSplitViewController.currentText(at: story.url)
            ?? (try? String(contentsOf: story.url, encoding: .utf8))
        return source.map { StoryHeaderThemes.read(from: $0) }
    }

    /// Toggles one built-in theme in the story header's `themes:` line
    /// (go-live Phase 6c). The edit goes through the editor — undoable, and
    /// the tab is left dirty for the author to save — exactly like the IFID
    /// fix above. Order is the author's: an added theme appends, a removed
    /// one leaves the rest in place.
    ///
    /// - Parameter themeId: the built-in's id (never `classic` — the baseline
    ///   always ships and is not a `themes:` entry).
    func toggleShippedTheme(_ themeId: String) {
        guard let story = composedStory, !story.isGrammar else { return }
        let url = story.url
        let source = mainSplitViewController.currentText(at: url)
            ?? (try? String(contentsOf: url, encoding: .utf8))
        guard let source else {
            presentThemeToggleFailure(for: url)
            return
        }
        var ids = StoryHeaderThemes.read(from: source)
        if let index = ids.firstIndex(of: themeId) {
            ids.remove(at: index)
        } else {
            ids.append(themeId)
        }
        // nil here means "already says that" — nothing to do, not a failure.
        guard let edit = StoryHeaderThemes.edit(setting: ids, in: source) else { return }
        if !mainSplitViewController.replaceText(edit.text,
                                                in: NSRange(location: edit.offset, length: edit.length),
                                                in: url) {
            presentThemeToggleFailure(for: url)
        }
    }

    /// Reports a toggle that could not be applied, rather than doing nothing
    /// and leaving the author to wonder whether the menu worked.
    private func presentThemeToggleFailure(for url: URL) {
        let alert = NSAlert()
        alert.messageText = "Couldn’t update shipped themes"
        alert.informativeText = "No `story` block was found in \(url.lastPathComponent), or the file could not be edited."
        alert.alertStyle = .warning
        if let window = view.window {
            alert.beginSheetModal(for: window)
        } else {
            alert.runModal()
        }
    }

    /// The open story's `auto-assertion:` policy (Test → Auto-Assertion
    /// checkmarks), or nil for "let me decide" / no story / a grammar file.
    /// Reads the editor's unsaved buffer first, disk second — the menu must
    /// reflect what the author sees, not what was last saved (Phase 6e).
    func autoAssertionPolicy() -> StoryHeaderAutoAssertion.Policy? {
        guard let story = composedStory, !story.isGrammar else { return nil }
        let source = mainSplitViewController.currentText(at: story.url)
            ?? (try? String(contentsOf: story.url, encoding: .utf8))
        return source.flatMap { StoryHeaderAutoAssertion.read(from: $0) }
    }

    /// Sets the story header's `auto-assertion:` line (go-live Phase 6e) —
    /// nil removes it ("let me decide" says nothing). The edit goes through
    /// the editor exactly like the theme corral's: undoable, tab left dirty
    /// for the author to save, disk untouched until then.
    func selectAutoAssertion(_ policy: StoryHeaderAutoAssertion.Policy?) {
        guard let story = composedStory, !story.isGrammar else { return }
        let url = story.url
        let source = mainSplitViewController.currentText(at: url)
            ?? (try? String(contentsOf: url, encoding: .utf8))
        guard let source else {
            presentAutoAssertionFailure(for: url)
            return
        }
        // nil here means "already says that" — nothing to do, not a failure.
        guard let edit = StoryHeaderAutoAssertion.edit(setting: policy, in: source) else { return }
        if !mainSplitViewController.replaceText(edit.text,
                                                in: NSRange(location: edit.offset, length: edit.length),
                                                in: url) {
            presentAutoAssertionFailure(for: url)
        }
    }

    /// Reports a policy change that could not be applied, rather than doing
    /// nothing and leaving the author to wonder whether the menu worked.
    private func presentAutoAssertionFailure(for url: URL) {
        let alert = NSAlert()
        alert.messageText = "Couldn’t update the auto-assertion policy"
        alert.informativeText = "No `story` block was found in \(url.lastPathComponent), or the file could not be edited."
        alert.alertStyle = .warning
        if let window = view.window {
            alert.beginSheetModal(for: window)
        } else {
            alert.runModal()
        }
    }

    /// Runs a Problems row's inline fix.
    ///
    /// Today there is exactly one: a missing `ifid:`. The IFID is minted here and
    /// written into the story header — the author never leaves the IDE to run
    /// `sharpee ifid`. The edit goes through the editor, so it is undoable and
    /// the next compose clears the warning on its own.
    ///
    /// - Parameter item: the Problems row whose button was clicked.
    private func applyProblemFix(_ item: ProblemItem) {
        guard item.record.code == "analysis.missing-ifid" else { return }
        let url = item.fileURL
        let source = mainSplitViewController.currentText(at: url)
            ?? (try? String(contentsOf: url, encoding: .utf8))

        guard let source,
              let insertion = StoryHeaderIFID.insertion(of: StoryHeaderIFID.mint(), into: source),
              mainSplitViewController.insertText(insertion.text, at: insertion.offset, in: url)
        else {
            presentFixFailure(for: url)
            return
        }
    }

    /// Reports a fix that could not be applied, rather than doing nothing and
    /// leaving the author to wonder whether the button worked.
    private func presentFixFailure(for url: URL) {
        let alert = NSAlert()
        alert.messageText = "Couldn’t add an IFID"
        alert.informativeText = "No `story` block was found in \(url.lastPathComponent), or it already declares an `ifid:`. Rebuild to refresh Problems."
        alert.alertStyle = .warning
        if let window = view.window {
            alert.beginSheetModal(for: window)
        } else {
            alert.runModal()
        }
    }

    /// One-line Problems status for a compose-pipeline failure.
    private static func statusMessage(for failure: ComposeRunner.Failure) -> String {
        switch failure {
        case .sharpeeNotFound:
            return "sharpee not found — install the Sharpee CLI (or open a story inside a Sharpee checkout) to see problems"
        case .launch(let reason):
            return "compose could not start: \(reason)"
        case .nonZeroExit(let code, let stderr):
            let firstLine = stderr.split(separator: "\n").first.map(String.init) ?? ""
            return "compose failed (exit \(code))\(firstLine.isEmpty ? "" : ": \(firstLine)")"
        case .decode(let error):
            if case ComposeJsonPayload.DecodeError.schemaVersionMismatch(let found, let expected) = error {
                return "This IDE is out of date for the installed Sharpee toolchain (compose schema \(found), IDE understands \(expected))"
            }
            return "compose output could not be read — is the Sharpee CLI up to date?"
        }
    }

    func refreshPlay(projectRoot: URL?) {
        mainSplitViewController.refreshPlay(projectRoot: projectRoot)
    }

    func reloadPlayAfterBuild(projectRoot: URL) {
        mainSplitViewController.reloadPlayAfterBuild(projectRoot: projectRoot)
    }

    func composeStory(at storyURL: URL) {
        mainSplitViewController.composeStory(at: storyURL)
    }

    var composedStory: (url: URL, isGrammar: Bool)? {
        mainSplitViewController.composedStory
    }

    func showEmptyStateExplanation(_ text: String) {
        mainSplitViewController.showEmptyStateExplanation(text)
    }

    func applyPlayAfterBuild(_ on: Bool) {
        mainSplitViewController.setPlayAfterBuild(on)
    }

    func applyRightPanelTab(_ index: Int) {
        mainSplitViewController.setRightPanelTab(index)
    }
}

// MARK: - Main horizontal split (4 panes)

private final class MainSplitViewController: NSSplitViewController {

    private static let railWidth: CGFloat = 40
    private static let projectWidth: CGFloat = 260
    private static let projectMinWidth: CGFloat = 200
    private static let editorMinWidth: CGFloat = 320
    private static let playMinWidth: CGFloat = 240

    /// Divider persistence (project/play pane widths) rides the session
    /// (David 2026-08-09: the IDE's state includes pane widths). AppKit's
    /// split autosave is deliberately NOT used: it restores while the window
    /// is still at its pre-appearance fitting width, which squashes the play
    /// pane to its minimum before the window grows back — the extra width
    /// then goes to the editor (lowest holding priority) and the play pane
    /// opened at 240 on every launch regardless of what was saved. Instead
    /// the widths apply once in `applyInitialDividerPositions` and persist
    /// through `persistSession`, guarded so the launch invariant holds
    /// (close the landing page → nothing persisted).

    private let railViewController = RailViewController()
    private let projectPaneViewController = ProjectPaneViewController()
    private let composeScheduler = ComposeScheduler()
    /// Last-ok-IR retention behind the project tree (ADR-258 D6).
    private var treeState = IRTreeState()
    private let editorViewController = EditorViewController()
    /// The left split item's real occupant: hosts the editor always, and the
    /// borrowed Play surface while the testing workspace is open (ADR-304).
    private let leftPaneHostViewController = LeftPaneHostViewController()
    private let rightPanelViewController = RightPanelViewController()
    /// The Play tab inside the right panel — most wiring targets it directly.
    /// (Fileprivate: RootViewController's playSurface facade reads it too.)
    fileprivate var playViewController: PlayViewController { rightPanelViewController.play }

    /// Invoked when the rail's Build button is clicked. Owned by RootViewController.
    fileprivate var onBuildPanelToggle: (() -> Void)?
    /// Reports the current build-panel visibility so it can be persisted. Set by RootViewController.
    fileprivate var buildPanelVisibleProvider: (() -> Bool)?
    /// Invoked with each symbolicated Play-runtime error. Owned by RootViewController.
    fileprivate var onPlayConsoleError: ((PlayConsoleError) -> Void)?
    /// Invoked with each finished compose attempt (ADR-258 D5). Owned by RootViewController.
    fileprivate var onComposeOutcome: ((ComposeScheduler.Outcome) -> Void)?

    private var currentProject: Project?
    private var didApplyInitialLayout = false

    override func viewDidLoad() {
        super.viewDidLoad()
        splitView.dividerStyle = .thin
        // No splitView.autosaveName — see projectWidthKey/playWidthKey.
        NotificationCenter.default.addObserver(
            self, selector: #selector(persistDividerPositions(_:)),
            name: NSSplitView.didResizeSubviewsNotification, object: splitView)

        railViewController.onProjectToggle = { [weak self] in self?.toggleProjectPane() }
        railViewController.onBuildToggle = { [weak self] in self?.onBuildPanelToggle?() }
        rightPanelViewController.onTestingTabSelected = { [weak self] in self?.testingTabSelected() }
        rightPanelViewController.onTabChanged = { [weak self] in
            // Only once a project is open: the panel's own opening layout
            // selects Play during window construction, and a session written
            // then would break the launch invariant (close the landing page →
            // nothing persisted).
            guard let self, self.currentProject != nil else { return }
            self.persistSession()
        }
        projectPaneViewController.onActivateFile = { [weak self] url in self?.activateFile(at: url) }
        projectPaneViewController.onExpansionChanged = { [weak self] in self?.persistSession() }
        editorViewController.onStateChanged = { [weak self] in self?.persistSession() }
        editorViewController.onStoryActivated = { [weak self] url, content in
            self?.composeScheduler.composeNow(storyURL: url, content: content)
        }
        editorViewController.onStoryEdited = { [weak self] url, content in
            self?.composeScheduler.noteEdit(storyURL: url, content: content)
        }
        editorViewController.onDocumentEdited = { [weak self] url in
            // A source change invalidates the whole play surface (David's
            // ruling): any edited document inside the open story's folder means
            // the running build no longer matches the source.
            guard let self, let storyURL = self.treeState.storyURL else { return }
            let storyDir = storyURL.deletingLastPathComponent().standardizedFileURL.path
            if url.standardizedFileURL.path.hasPrefix(storyDir) {
                self.playViewController.invalidateForSourceChange()
            }
        }
        composeScheduler.onOutcome = { [weak self] outcome in
            guard let self else { return }
            // The Index folds every outcome through last-ok retention (D6) —
            // it is THE IR-sourced story view (the former Structure tab is gone)…
            self.treeState.apply(outcome)
            self.rightPanelViewController.index.setState(self.treeState.display)
            self.syncPlayToComposeState()
            // …while Problems always reflects the current source (RootViewController).
            self.onComposeOutcome?(outcome)
        }
        rightPanelViewController.index.onActivate = { [weak self] span in
            guard let self, let storyURL = self.treeState.storyURL else { return }
            // Index jump: first line + neutral gutter dot (red = errors only).
            self.editorViewController.openDocument(at: storyURL, navigateTo: span)
        }
        playViewController.onPlayAfterBuildChanged = { [weak self] in self?.persistSession() }
        playViewController.onConsoleError = { [weak self] message in self?.onPlayConsoleError?(message) }
        leftPaneHostViewController.host(editor: editorViewController)

        addSplitViewItem(makeRailItem())
        addSplitViewItem(makeProjectItem())
        addSplitViewItem(makeEditorItem())
        addSplitViewItem(makePlayItem())
    }

    /// Opens a file the author activated in the project sidebar.
    ///
    /// Every file is text and goes to the editor. `.skein` used to be the one
    /// exception — a committed artifact whose storage format was JSON — but the
    /// artifact is retired (ADR-300) and the exception went with it.
    ///
    /// - Parameter url: the activated file.
    private func activateFile(at url: URL) {
        editorViewController.openDocument(at: url)
    }

    /// The composed story's identity for Build/Play gating: its URL and whether
    /// it is a grammar-header file (Build and Play disabled, ADR-258 D2).
    var composedStory: (url: URL, isGrammar: Bool)? {
        guard let url = treeState.storyURL else { return nil }
        if case .populated(let ir, _) = treeState.display {
            return (url, ir.grammarFile != nil)
        }
        return (url, false)
    }

    /// The latest composed IR, for surfaces outside this split (window title,
    /// GH #188). Nil until a compose has populated the tree.
    var composedIR: ComposeStoryIR? {
        if case .populated(let ir, _) = treeState.display { return ir }
        return nil
    }

    /// The current story's built bundle directory (`dist/web/<id>/`, D4), or nil
    /// until a clean compile has revealed the story's header id.
    private func bundleDirectory() -> URL? {
        guard let storyURL = treeState.storyURL,
              case .populated(let ir, _) = treeState.display,
              let id = ir.meta.fields.id else { return nil }
        return WebBundle.directory(projectRoot: storyURL.deletingLastPathComponent(), storyId: id)
    }

    /// Reflects the latest compose state into the Play pane: a grammar file is
    /// explicitly unplayable (D2). Nothing else auto-loads — Play shows only
    /// what an explicit ⌘B just built (David's ruling), so a pre-existing
    /// bundle of unknown vintage never masquerades as the current source.
    private func syncPlayToComposeState() {
        guard case .populated(let ir, _) = treeState.display else { return }
        if ir.grammarFile != nil {
            playViewController.showUnplayable(
                reason: "A grammar file is not a story — Build and Play are disabled")
        }
    }

    /// Resets the Play pane to its placeholder (project open/close). Play only
    /// ever loads via reloadPlayAfterBuild — the user builds to see an update.
    fileprivate func refreshPlay(projectRoot: URL?) {
        playViewController.load(bundleDirectory: nil)
    }

    func loadProject(_ project: Project, expandedFolderURLs: [URL] = []) {
        currentProject = project
        // The testing surface's sidecar is per-story (ADR-306 D8): a project
        // switch closes the window; the next open binds the new story's.
        closeTestingSurface()
        projectPaneViewController.setProject(project, expandedFolderURLs: expandedFolderURLs)
        RecentProjectsStore.push(project.rootURL)
        persistSession()
    }

    /// Rescans the open project from disk and rebuilds the pane, re-applying
    /// the expansion the author currently has — folders by URL, group rows by
    /// kind (a group has no URL, and the one the author just created a file
    /// into must not snap shut over it). Not an open: recents and the
    /// persisted session are untouched — nothing about the author's choices
    /// changed, only the files.
    func refreshProjectTree() {
        guard let project = currentProject else { return }
        let folders = projectPaneViewController.expandedFolderURLs
        let groups = projectPaneViewController.expandedGroupKinds
        let rescanned = Project(rootURL: project.rootURL)
        currentProject = rescanned
        projectPaneViewController.setProject(rescanned, expandedFolderURLs: folders,
                                             expandedGroupKinds: groups)
    }


    func saveActiveDocument() {
        editorViewController.saveActiveDocument()
    }

    func saveAllDocuments() -> Bool {
        editorViewController.saveAllDocuments()
    }

    func openDocument(at url: URL) {
        editorViewController.openDocument(at: url)
    }

    func openDocument(at url: URL, line: Int, column: Int) {
        editorViewController.openDocument(at: url, line: line, column: column)
    }

    /// Opens `url` selecting the exact diagnostic span (Problems click-through, D5).
    func openDocument(at url: URL, span: DiagnosticSpan) {
        editorViewController.openDocument(at: url, span: span)
    }

    fileprivate func hasUnsavedChanges(at url: URL) -> Bool {
        editorViewController.hasUnsavedChanges(at: url)
    }

    fileprivate func reloadFromDisk(at url: URL) {
        editorViewController.reloadFromDisk(at: url)
    }

    /// The editor's live text for `url`, or nil when it is not open.
    fileprivate func currentText(at url: URL) -> String? {
        editorViewController.currentText(at: url)
    }

    /// Splices text into `url` through the editor (undoable, re-composes).
    @discardableResult
    fileprivate func insertText(_ text: String, at characterIndex: Int, in url: URL) -> Bool {
        editorViewController.insertText(text, at: characterIndex, in: url)
    }

    /// Replaces a range in `url` through the editor (undoable, re-composes).
    @discardableResult
    fileprivate func replaceText(_ text: String, in range: NSRange, in url: URL) -> Bool {
        editorViewController.replaceText(text, in: range, in: url)
    }

    /// Applies a compose run's records as editor underlines for `url`.
    fileprivate func applyComposeDiagnostics(_ records: [ComposeDiagnosticRecord], forFile url: URL) {
        editorViewController.setDiagnostics(records, forFile: url)
    }

    func switchToDocument(at index: Int) {
        editorViewController.switchTo(index: index)
    }

    func setWordWrap(_ enabled: Bool) {
        editorViewController.setWordWrap(enabled)
    }

    /// Highlights the rail Build button to reflect panel visibility.
    fileprivate func setBuildRailActive(_ active: Bool) {
        railViewController.setBuildActive(active)
    }

    // MARK: Project pane visibility

    /// The project pane's split item (index 1, after the rail), or nil before
    /// `viewDidLoad` has installed the items.
    private var projectItem: NSSplitViewItem? {
        splitViewItems.indices.contains(1) ? splitViewItems[1] : nil
    }

    /// Tracked explicitly rather than read back from `NSSplitViewItem.isCollapsed`.
    /// `isCollapsed` is not usable here: this split sets divider positions by hand
    /// (see `projectWidthKey`), and the width that pins comes back the moment the
    /// collapse settles — the item reports collapsed while the pane still occupies
    /// its full width. Hiding is therefore done the same way every other width in
    /// this split is: by moving divider 1.
    private var projectPaneVisible = true

    fileprivate var isProjectPaneVisible: Bool { projectPaneVisible }

    /// Shows or hides the project pane without persisting — also used by session
    /// restore. The pane's dragged width survives a hide: `persistDividerPositions`
    /// declines to write the 0.
    ///
    /// - Parameter visible: true to show the pane, false to hide it.
    fileprivate func applyProjectPaneVisible(_ visible: Bool) {
        guard let projectItem, splitView.arrangedSubviews.count == 4 else { return }
        projectPaneVisible = visible
        // The minimum has to drop out of the way first, or AppKit clamps the
        // divider at 200 instead of letting it reach the rail.
        projectItem.minimumThickness = visible ? Self.projectMinWidth : 0
        projectItem.viewController.view.isHidden = !visible
        splitView.setPosition(Self.railWidth + (visible ? savedProjectWidth() : 0), ofDividerAt: 1)
        railViewController.setProjectActive(visible)
        // Showing or hiding the pane changes what "half" means (Settings).
    }

    /// Flips the project pane's visibility and persists the new state.
    fileprivate func toggleProjectPane() {
        applyProjectPaneVisible(!isProjectPaneVisible)
        persistSession()
    }

    /// The width to reopen the project pane at: the author's last dragged width
    /// when one is saved, the default otherwise — never below the minimum.
    private func savedProjectWidth() -> CGFloat {
        let saved = SessionStateStore.load()?.projectPaneWidth
        return max(Self.projectMinWidth, saved.map { CGFloat($0) } ?? Self.projectWidth)
    }

    fileprivate func persistSession() {
        // Geometry falls back to what was last saved when it cannot be read
        // live (window not on screen yet, pane hidden measuring 0) — a
        // persist must never reset the author's dragged sizes to defaults.
        let previous = SessionStateStore.load()
        let livePanes = didApplyInitialLayout && splitView.arrangedSubviews.count == 4
        let projectWidth: Double? = livePanes && isProjectPaneVisible
            ? Double(splitView.arrangedSubviews[1].frame.width)
            : previous?.projectPaneWidth
        let playWidth: Double? = livePanes
            ? Double(splitView.arrangedSubviews[3].frame.width)
            : previous?.playPaneWidth
        let state = SessionState(
            projectURL: currentProject?.rootURL,
            openDocumentURLs: editorViewController.openDocumentURLs,
            activeIndex: editorViewController.activeDocumentIndex,
            expandedFolderURLs: projectPaneViewController.expandedFolderURLs,
            projectPaneVisible: isProjectPaneVisible,
            buildPanelVisible: buildPanelVisibleProvider?() ?? false,
            playAfterBuild: playViewController.playAfterBuild,
            rightPanelTab: rightPanelViewController.selectedTab,
            windowFrame: view.window?.frame ?? previous?.windowFrame,
            projectPaneWidth: projectWidth,
            playPaneWidth: playWidth
        )
        SessionStateStore.save(state)
    }

    /// After a successful build, load the freshly-built `dist/web/<id>/` bundle
    /// (honours the toggle) and bring the Play tab forward. The id comes from
    /// the retained IR header (D4). An open testing surface reloads too
    /// (Phase 5): a fresh page against the new build, restored by replay —
    /// its cards then show the CURRENT story's real output (ADR-306 D8).
    fileprivate func reloadPlayAfterBuild(projectRoot: URL) {
        guard let bundleDir = bundleDirectory() else { return }
        playViewController.reloadAfterBuild(bundleDirectory: bundleDir)
        if playViewController.isLoaded {
            rightPanelViewController.showPlayTab()
        }
        if let surface = rightPanelViewController.testingSurface,
           surface.isLoaded {
            // The story's on-disk `auto-assertion:` policy may have changed
            // since the surface bound (the Test menu edits the header, and
            // this build just saved it) — the reloaded page must carry the
            // CURRENT policy or the cards' default assertion lines go stale.
            if let storyURL = treeState.storyURL,
               let source = try? String(contentsOf: storyURL, encoding: .utf8) {
                // Declared policy only; absent → the page applies the
                // platform default (David 2026-08-10).
                surface.policy = StoryHeaderAutoAssertion.read(from: source)?.rawValue
            }
            // Regions may have changed with the build too — re-derive the
            // grouping map from the fresh IR (David 2026-08-10).
            if case .populated(let ir, _) = treeState.display {
                surface.regionByRoom = Self.regionMap(from: ir)
            }
            surface.load(bundleDirectory: bundleDir)
        }
    }

    // MARK: Testing play surface (ADR-306; embedded in the Testing tab —
    // David's ruling 2026-08-09: "remove the old UX and embed the new UX in
    // the Testing tab")

    /// Ensures the Testing tab hosts the current story's surface, creating it
    /// against the story's D8 sidecar on first need. Returns nil before the
    /// first successful compose (no story id → no sidecar identity); the tab
    /// shows its placeholder until then.
    @discardableResult
    fileprivate func ensureTestingSurface() -> TestingSurfaceViewController? {
        if let existing = rightPanelViewController.testingSurface { return existing }
        guard let storyURL = treeState.storyURL,
              case .populated(let ir, _) = treeState.display,
              let id = ir.meta.fields.id else { return nil }
        let projectRoot = storyURL.deletingLastPathComponent()
        let store = TestingSessionStore(
            fileURL: TestingSessionStore.url(storyId: id, projectRoot: projectRoot))
        let surface = TestingSurfaceViewController(sessionStore: store)
        // The tree document lives beside the `.story` file, named by its
        // STEM — exactly the id `sharpee test --tree`'s discovery keys on
        // (ADR-307 D2/Q-2) — and the story's on-disk `auto-assertion:`
        // policy governs synthesis exactly as it governs the runs.
        surface.testDocumentURL = projectRoot.appendingPathComponent(
            storyURL.deletingPathExtension().lastPathComponent + ".tests.json")
        surface.storyFile = storyURL
        surface.saveDocuments = { [weak self] in self?.saveAllDocuments() ?? true }
        let storySource = (try? String(contentsOf: storyURL, encoding: .utf8)) ?? ""
        // Declared policy only. No header line → the page applies the
        // platform default (branch-tester's constant; David 2026-08-10,
        // extending the 2026-08-09 authoring-surface ruling platform-wide).
        surface.policy = StoryHeaderAutoAssertion.read(from: storySource)?.rawValue
        // Region grouping (David 2026-08-10): the page groups cards by the
        // region each turn's room belongs to — derived from the Story IR,
        // never persisted in the document.
        surface.regionByRoom = Self.regionMap(from: ir)
        rightPanelViewController.installTestingSurface(surface)
        return surface
    }

    /// Room name → region name from the Story IR: each region's `containing`
    /// members that are rooms map to that region's name. Nested regions fall
    /// out naturally — only DIRECT members are listed, so the innermost
    /// container wins. Empty when the story declares no regions.
    static func regionMap(from ir: ComposeStoryIR) -> [String: String] {
        let byId = Dictionary(ir.allEntities.map { ($0.id, $0) },
                              uniquingKeysWith: { first, _ in first })
        var map: [String: String] = [:]
        for entity in ir.allEntities where entity.hasKind("region") {
            for member in entity.containing ?? [] {
                if let room = byId[member.id], room.hasKind("room") {
                    map[room.name] = entity.name
                }
            }
        }
        return map
    }

    /// The Testing tab was selected (click or ⌥⌘U): bind the surface and load
    /// the story's testing page on first show. Re-selecting a live session
    /// never reboots it.
    fileprivate func testingTabSelected() {
        guard let surface = ensureTestingSurface() else { return }
        if !surface.isLoaded {
            surface.load(bundleDirectory: bundleDirectory())
        }
    }

    /// Brings the Testing tab forward with the surface bound (the ⌥⌘U menu).
    fileprivate func openTestingSurface() {
        showTestingTab()   // tab selection runs testingTabSelected()
    }

    /// The Test menu's Run Tests: the surface's run column, through the same
    /// button the author clicks — its in-page guards (one run at a time,
    /// never mid-replay) stay authoritative.
    fileprivate func runTestsInSurface() {
        showTestingTab()
        guard let surface = rightPanelViewController.testingSurface,
              surface.isLoaded else {
            NSSound.beep()   // no build yet — the tab's placeholder says so
            return
        }
        Task {
            _ = try? await surface.evaluateInSurface(
                "document.getElementById('ts-run-btn') && document.getElementById('ts-run-btn').click();")
        }
    }

    /// Unbinds the surface for a project switch — the next Testing-tab visit
    /// builds a new controller against the new story's sidecar.
    fileprivate func closeTestingSurface() {
        rightPanelViewController.clearTestingSurface()
    }

    /// Build-output plumbing — the Build tab lives in the right panel next to Play.
    fileprivate func appendBuildOutput(_ text: String) {
        rightPanelViewController.buildPanel.append(text)
    }

    /// The story report appended after a successful build (the "PR"): the
    /// story's name and numbers from the retained IR, or nil before any clean
    /// compile.
    fileprivate func storyBuildReport() -> String? {
        guard case .populated(let ir, _) = treeState.display else { return nil }
        return StoryIndex.buildReport(for: ir)
    }

    fileprivate func clearBuildOutput() {
        rightPanelViewController.buildPanel.clear()
    }

    fileprivate func showBuildTab() {
        rightPanelViewController.showBuildTab()
    }

    fileprivate var testingSurface: TestingSurfaceViewController? {
        rightPanelViewController.testingSurface
    }

    fileprivate var docsTab: DocsTabViewController { rightPanelViewController.docsTab }

    fileprivate var publishView: PublishView { rightPanelViewController.publish }

    fileprivate func showPublishTab() { rightPanelViewController.showPublishTab() }

    fileprivate func showTestingTab() {
        rightPanelViewController.showTestingTab()
    }

    /// The editor's focused document, or nil when nothing is open (drives the
    /// Test menu's Run Current File).
    fileprivate var activeDocumentURL: URL? {
        guard let index = editorViewController.activeDocumentIndex else { return nil }
        let urls = editorViewController.openDocumentURLs
        return urls.indices.contains(index) ? urls[index] : nil
    }

    /// Applies a persisted "Play after build" value (session restore).
    fileprivate func setPlayAfterBuild(_ on: Bool) {
        playViewController.setPlayAfterBuild(on)
    }

    /// Applies a persisted right-panel tab choice (session restore).
    fileprivate func setRightPanelTab(_ index: Int) {
        rightPanelViewController.selectTab(index)
    }

    /// Updates the right-panel Diagnosis tab for a newly-arrived error (badge, no switch).
    fileprivate func showDiagnosis(_ error: PlayConsoleError, count: Int) {
        rightPanelViewController.showDiagnosis(error, count: count)
    }

    /// Shows an error's explanation and switches the right panel to the Diagnosis tab.
    fileprivate func revealDiagnosis(_ error: PlayConsoleError) {
        rightPanelViewController.revealDiagnosis(error)
    }

    /// Routes Diagnosis "open location" clicks to the editor.
    fileprivate func setDiagnosisOpenLocation(_ handler: @escaping (SourceLocation) -> Void) {
        rightPanelViewController.onOpenLocation = handler
    }

    fileprivate func clearDiagnosis() {
        rightPanelViewController.clearDiagnosis()
    }

    /// Shows the empty story state with a one-line reason (D8) — rendered in
    /// the Index, the IR-sourced story view.
    fileprivate func showEmptyStateExplanation(_ text: String) {
        rightPanelViewController.index.setState(.empty(reason: text))
    }

    /// Composes `storyURL` from its on-disk content (project open — no editor
    /// buffer yet). The outcome populates the tree and Problems through the
    /// standard pipeline.
    fileprivate func composeStory(at storyURL: URL) {
        let content = (try? String(contentsOf: storyURL, encoding: .utf8)) ?? ""
        composeScheduler.composeNow(storyURL: storyURL, content: content)
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        observeWindowGeometryIfNeeded()
        guard !didApplyInitialLayout else { return }
        didApplyInitialLayout = true
        applyInitialDividerPositions()
    }

    /// Window moves and resize ends persist the session's geometry (the
    /// split's own notification covers divider drags but never a pure move).
    private var observingWindowGeometry = false

    private func observeWindowGeometryIfNeeded() {
        guard !observingWindowGeometry, let window = view.window else { return }
        observingWindowGeometry = true
        NotificationCenter.default.addObserver(
            self, selector: #selector(windowGeometryChanged(_:)),
            name: NSWindow.didMoveNotification, object: window)
        NotificationCenter.default.addObserver(
            self, selector: #selector(windowGeometryChanged(_:)),
            name: NSWindow.didEndLiveResizeNotification, object: window)
    }

    @objc private func windowGeometryChanged(_ note: Notification) {
        // Only once a project is open — the launch invariant (close the
        // landing page → nothing persisted) covers geometry too.
        guard currentProject != nil else { return }
        persistSession()
    }

    /// Opening divider positions, applied once the window is at its real size:
    /// saved pane widths when present (drags persist across launches), the
    /// defaults otherwise — editor and play split the remaining width equally.
    private func applyInitialDividerPositions() {
        let totalWidth = splitView.bounds.width

        let projectWidth = isProjectPaneVisible ? savedProjectWidth() : 0
        let editorPlusPlay = max(0, totalWidth - Self.railWidth - projectWidth)
        let savedPlay = SessionStateStore.load()?.playPaneWidth
        let playWidth = max(Self.playMinWidth, savedPlay.map { CGFloat($0) } ?? editorPlusPlay / 2)

        splitView.setPosition(Self.railWidth, ofDividerAt: 0)
        // projectWidth is 0 when a restored session left the pane hidden.
        splitView.setPosition(Self.railWidth + projectWidth, ofDividerAt: 1)
        splitView.setPosition(totalWidth - playWidth, ofDividerAt: 2)
    }

    /// Persists the pane widths on every divider or window resize — but only
    /// after the opening layout has been applied (the pre-appearance
    /// constraint churn must never overwrite the saved widths) and only once
    /// a project is open (the launch invariant: close the landing page →
    /// nothing persisted).
    @objc private func persistDividerPositions(_ note: Notification) {
        guard didApplyInitialLayout, currentProject != nil else { return }
        persistSession()
    }

    private func makeRailItem() -> NSSplitViewItem {
        let item = NSSplitViewItem(viewController: railViewController)
        item.minimumThickness = Self.railWidth
        item.maximumThickness = Self.railWidth
        item.canCollapse = false
        item.holdingPriority = .required
        return item
    }

    private func makeProjectItem() -> NSSplitViewItem {
        let item = NSSplitViewItem(viewController: projectPaneViewController)
        item.minimumThickness = Self.projectMinWidth
        // Hiding is driven by divider 1, not NSSplitViewItem.isCollapsed (see
        // applyProjectPaneVisible) — leaving canCollapse on would let a drag
        // collapse the item behind the tracked state's back.
        item.canCollapse = false
        // Above editor/play (250) so window resizes stretch those panes, but
        // BELOW the divider-drag priorities (~490-510): .defaultHigh (750)
        // out-prioritized user drags entirely — the divider bounced back and
        // the pane behaved as fixed-width (SplitDividerTests reproduces).
        item.holdingPriority = NSLayoutConstraint.Priority(300)
        return item
    }

    private func makeEditorItem() -> NSSplitViewItem {
        let item = NSSplitViewItem(viewController: leftPaneHostViewController)
        item.minimumThickness = Self.editorMinWidth
        item.holdingPriority = .defaultLow
        return item
    }

    private func makePlayItem() -> NSSplitViewItem {
        let item = NSSplitViewItem(viewController: rightPanelViewController)
        item.minimumThickness = Self.playMinWidth
        // MUST differ from the editor's (250): with EQUAL holding priorities on
        // both sides of a divider, the solver is indifferent to its position
        // (errors trade 1:1) and the fallback-at-current-width constraint pins
        // it — the divider is immovable for drags AND setPosition (the
        // "right pane has a fixed width" bug; see SplitDividerTests).
        item.holdingPriority = NSLayoutConstraint.Priority(260)
        return item
    }
}

// MARK: - Rail (collapsed-panel entry points)

private final class RailViewController: NSViewController {

    /// Accessibility identifiers — the rail's stable handles for tests.
    static let projectButtonIdentifier = "rail.project"
    static let buildButtonIdentifier = "rail.build"

    private static let buttonSize: CGFloat = 24

    /// Invoked when the Project (folder) button is clicked.
    var onProjectToggle: (() -> Void)?
    /// Invoked when the Build button is clicked.
    var onBuildToggle: (() -> Void)?

    private let projectButton = NSButton()
    private let buildButton = NSButton()

    override func loadView() {
        let pane = ThemedPane(color: Theme.railBackground)

        configure(projectButton, symbol: "folder", label: "Project",
                  tooltip: "Toggle Project Pane", action: #selector(toggleProject),
                  identifier: Self.projectButtonIdentifier)
        configure(buildButton, symbol: "hammer", label: "Build",
                  tooltip: "Toggle Problems Panel", action: #selector(toggleBuild),
                  identifier: Self.buildButtonIdentifier)
        // The project pane opens visible; session restore corrects this when the
        // author left it collapsed.
        projectButton.contentTintColor = Theme.accent

        pane.addSubview(projectButton)
        pane.addSubview(buildButton)

        NSLayoutConstraint.activate([
            projectButton.centerXAnchor.constraint(equalTo: pane.centerXAnchor),
            projectButton.topAnchor.constraint(equalTo: pane.topAnchor, constant: 12),
            projectButton.widthAnchor.constraint(equalToConstant: Self.buttonSize),
            projectButton.heightAnchor.constraint(equalToConstant: Self.buttonSize),

            buildButton.centerXAnchor.constraint(equalTo: pane.centerXAnchor),
            buildButton.topAnchor.constraint(equalTo: projectButton.bottomAnchor, constant: 8),
            buildButton.widthAnchor.constraint(equalToConstant: Self.buttonSize),
            buildButton.heightAnchor.constraint(equalToConstant: Self.buttonSize),
        ])

        view = pane
    }

    /// Shared setup for a rail button: borderless SF Symbol, dim until active.
    ///
    /// - Parameters:
    ///   - button: the button to configure.
    ///   - symbol: SF Symbol name for its image.
    ///   - label: accessibility description for the image.
    ///   - tooltip: hover text.
    ///   - action: selector invoked on click, targeted at this controller.
    ///   - identifier: accessibility identifier tests locate the button by.
    private func configure(_ button: NSButton, symbol: String, label: String,
                           tooltip: String, action: Selector, identifier: String) {
        button.title = ""
        button.image = NSImage(systemSymbolName: symbol, accessibilityDescription: label) ?? NSImage()
        button.imagePosition = .imageOnly
        button.isBordered = false
        button.bezelStyle = .regularSquare
        button.contentTintColor = Theme.foregroundDim
        button.toolTip = tooltip
        button.target = self
        button.action = action
        button.setAccessibilityIdentifier(identifier)
        button.translatesAutoresizingMaskIntoConstraints = false
    }

    /// Tints the Project button to reflect whether the project pane is showing.
    func setProjectActive(_ active: Bool) {
        projectButton.contentTintColor = active ? Theme.accent : Theme.foregroundDim
    }

    /// Tints the Build button to reflect whether the Build panel is showing.
    func setBuildActive(_ active: Bool) {
        buildButton.contentTintColor = active ? Theme.accent : Theme.foregroundDim
    }

    @objc private func toggleProject() {
        onProjectToggle?()
    }

    @objc private func toggleBuild() {
        onBuildToggle?()
    }
}

// MARK: - Left pane host (the editor)

/// The left split item's content: the editor, its permanent occupant. (The
/// ADR-304 testing workspace that used to borrow this pane for Play is
/// retired — ADR-306 D1, David's shred ruling 2026-08-09; test authoring
/// lives in the testing play surface window.)
/// Public interface (fileprivate): host(editor:).
private final class LeftPaneHostViewController: NSViewController {

    override func loadView() {
        view = ThemedPane(color: Theme.editorBackground)
    }

    /// Installs the editor as the pane's permanent occupant. Called once,
    /// before the split items are assembled.
    ///
    /// - Parameter editor: the editor view controller this pane hosts.
    func host(editor: NSViewController) {
        addChild(editor)
        editor.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(editor.view)
        NSLayoutConstraint.activate([
            editor.view.topAnchor.constraint(equalTo: view.topAnchor),
            editor.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            editor.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            editor.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }
}

// MARK: - Placeholder pane

private final class PlaceholderPaneViewController: NSViewController {

    private let paneLabel: String
    private let paneColor: NSColor
    private let showLabel: Bool

    init(label: String, color: NSColor, showLabel: Bool = true) {
        self.paneLabel = label
        self.paneColor = color
        self.showLabel = showLabel
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("PlaceholderPaneViewController is not Storyboard-instantiable")
    }

    override func loadView() {
        let pane = ThemedPane(color: paneColor)

        if showLabel {
            let label = NSTextField(labelWithString: paneLabel.uppercased())
            label.font = NSFont.systemFont(ofSize: 10, weight: .semibold)
            label.textColor = Theme.foregroundDim
            label.translatesAutoresizingMaskIntoConstraints = false
            pane.addSubview(label)

            NSLayoutConstraint.activate([
                label.leadingAnchor.constraint(equalTo: pane.leadingAnchor, constant: 14),
                label.topAnchor.constraint(equalTo: pane.topAnchor, constant: 12),
            ])
        }

        view = pane
    }
}

// MARK: - Status bar

private final class StatusBarView: NSView {

    /// Invoked when the build pill is clicked (cancel while building, else toggle panel).
    var onPillClick: (() -> Void)?

    private let dot = NSView()
    private let spinner = NSProgressIndicator()
    private let pillLabel = NSTextField(labelWithString: "")
    private let pill = NSView()
    private var lastStatus: BuildStatusDisplay = .idle
    private let versionLabel = NSTextField(
        labelWithString: AppIdentity.statusBarLabel(appVersion: AppIdentity.version,
                                                    sharpeeVersion: nil,
                                                    chordVersion: nil))

    /// Fills in the toolchain half of the version line once `sharpee --version`
    /// answers (ADR-279 D1). Until then the label shows the app version alone.
    func setToolchainVersions(_ versions: ChordVersionCheck.ToolchainVersions) {
        versionLabel.stringValue = AppIdentity.statusBarLabel(
            appVersion: AppIdentity.version,
            sharpeeVersion: versions.sharpee,
            chordVersion: versions.chord)
    }

    init() {
        super.init(frame: .zero)
        wantsLayer = true

        let label = versionLabel
        label.font = NSFont.systemFont(ofSize: 11)
        label.textColor = Theme.statusBarText
        label.translatesAutoresizingMaskIntoConstraints = false
        addSubview(label)

        configurePill()

        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            label.centerYAnchor.constraint(equalTo: centerYAnchor),

            pill.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
            pill.centerYAnchor.constraint(equalTo: centerYAnchor),
            pill.heightAnchor.constraint(equalTo: heightAnchor),
        ])

        setBuildStatus(.idle)
    }

    required init?(coder: NSCoder) {
        fatalError("StatusBarView is not Storyboard-instantiable")
    }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = Theme.accent.cgColor
        dot.layer?.backgroundColor = Self.dotColor(for: lastStatus).cgColor
    }

    private func configurePill() {
        pill.translatesAutoresizingMaskIntoConstraints = false
        addSubview(pill)

        dot.wantsLayer = true
        dot.layer?.cornerRadius = 4
        dot.translatesAutoresizingMaskIntoConstraints = false

        spinner.style = .spinning
        spinner.controlSize = .small
        spinner.isDisplayedWhenStopped = false
        spinner.translatesAutoresizingMaskIntoConstraints = false

        pillLabel.font = NSFont.systemFont(ofSize: 11, weight: .medium)
        pillLabel.textColor = Theme.statusBarText
        pillLabel.translatesAutoresizingMaskIntoConstraints = false

        pill.addSubview(dot)
        pill.addSubview(spinner)
        pill.addSubview(pillLabel)

        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 8),
            dot.heightAnchor.constraint(equalToConstant: 8),
            dot.leadingAnchor.constraint(equalTo: pill.leadingAnchor),
            dot.centerYAnchor.constraint(equalTo: pill.centerYAnchor),

            spinner.widthAnchor.constraint(equalToConstant: 12),
            spinner.heightAnchor.constraint(equalToConstant: 12),
            spinner.leadingAnchor.constraint(equalTo: pill.leadingAnchor),
            spinner.centerYAnchor.constraint(equalTo: pill.centerYAnchor),

            pillLabel.leadingAnchor.constraint(equalTo: dot.trailingAnchor, constant: 6),
            pillLabel.trailingAnchor.constraint(equalTo: pill.trailingAnchor),
            pillLabel.centerYAnchor.constraint(equalTo: pill.centerYAnchor),
        ])

        pill.addGestureRecognizer(NSClickGestureRecognizer(target: self, action: #selector(pillClicked)))
    }

    /// Updates the pill to reflect the current build state. Idle hides the pill.
    func setBuildStatus(_ status: BuildStatusDisplay) {
        pillLabel.stringValue = BuildStateFormatter.label(for: status)

        switch status {
        case .idle:
            pill.isHidden = true
            spinner.stopAnimation(nil)
        case .building:
            pill.isHidden = false
            dot.isHidden = true
            spinner.isHidden = false
            spinner.startAnimation(nil)
        case .succeeded, .failed, .cancelled:
            pill.isHidden = false
            spinner.stopAnimation(nil)
            spinner.isHidden = true
            dot.isHidden = false
        }
        lastStatus = status
        needsDisplay = true
    }

    private static func dotColor(for status: BuildStatusDisplay) -> NSColor {
        switch status {
        case .succeeded: return .systemGreen
        case .failed:    return .systemRed
        default:         return Theme.statusBarText
        }
    }

    @objc private func pillClicked() {
        onPillClick?()
    }
}
