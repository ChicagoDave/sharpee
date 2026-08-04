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
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
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
        window.setFrameAutosaveName("SharpeeIDEMainWindow")
        window.isReleasedWhenClosed = false

        self.init(window: window)
    }

    /// Replaces the project displayed in the Project pane. Optional `expandedFolderURLs`
    /// re-applies a prior expansion state (used by session restoration).
    func loadProject(_ project: Project, expandedFolderURLs: [URL] = []) {
        rootViewController?.loadProject(project, expandedFolderURLs: expandedFolderURLs)
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

    /// The right panel's Tests surface (ADR-277 D2) — wired by TestController.
    /// Force-unwrap-free: the panel exists for the window's lifetime; the
    /// fallback instance only serves a window-less controller (tests).
    var testPanel: TestPanelView {
        rootViewController?.testPanel ?? TestPanelView()
    }

    /// Switches the right panel to the Test tab (a test run just started).
    func showTestTab() {
        rootViewController?.showTestTab()
    }

    /// Points Play recording at the open story (ADR-277 D5).
    func configureRecording(storyDirectory: URL?, onRecorded: @escaping (URL) -> Void) {
        rootViewController?.configureRecording(storyDirectory: storyDirectory, onRecorded: onRecorded)
    }

    /// Re-reads the open project from disk so files written from outside the
    /// tree (a recorded transcript) become visible without reopening.
    func refreshProjectTree() {
        rootViewController?.refreshProjectTree()
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

    /// Shows the empty project state with a one-line reason (D8: a restored
    /// session pointing at a retired TypeScript project explains itself).
    func showEmptyStateExplanation(_ text: String) {
        rootViewController?.showEmptyStateExplanation(text)
    }

    /// Applies a persisted "Play after build" value (session restore).
    func setPlayAfterBuild(_ on: Bool) {
        rootViewController?.applyPlayAfterBuild(on)
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

        verticalSplitViewController.view.translatesAutoresizingMaskIntoConstraints = false
        statusBar.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(verticalSplitViewController.view)
        container.addSubview(statusBar)

        NSLayoutConstraint.activate([
            verticalSplitViewController.view.topAnchor.constraint(equalTo: container.topAnchor),
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

    /// Reflects the current build state in the status-bar pill.
    fileprivate func updateBuildStatus(_ status: BuildStatusDisplay) {
        currentBuildStatus = status
        statusBar.setBuildStatus(status)
    }

    fileprivate func showToolchainVersions(_ versions: ChordVersionCheck.ToolchainVersions) {
        statusBar.setToolchainVersions(versions)
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
        view.window?.title = AppIdentity.productName
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

    /// The right panel's Tests surface (ADR-277 D2) — wired by TestController.
    var testPanel: TestPanelView { mainSplitViewController.testPanel }

    func showTestTab() {
        mainSplitViewController.showTestTab()
    }

    /// Points Play recording at the open story (ADR-277 D5).
    func configureRecording(storyDirectory: URL?, onRecorded: @escaping (URL) -> Void) {
        mainSplitViewController.configureRecording(storyDirectory: storyDirectory,
                                                   onRecorded: onRecorded)
    }

    /// Re-reads the open project from disk, preserving expansion state.
    func refreshProjectTree() {
        mainSplitViewController.refreshProjectTree()
    }

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

    /// Refreshes an open tab after something outside the editor rewrote `url`.
    func reloadFromDisk(at url: URL) {
        mainSplitViewController.reloadFromDisk(at: url)
    }

    func storyBuildReport() -> String? {
        mainSplitViewController.storyBuildReport()
    }

    /// Routes a compose outcome to the Problems tab and the editor's underlines.
    private func handleComposeOutcome(_ outcome: ComposeScheduler.Outcome) {
        switch outcome.result {
        case .success(let payload):
            bottomPanelViewController.setProblems(payload.diagnostics, for: outcome.storyURL)
            mainSplitViewController.applyComposeDiagnostics(payload.diagnostics,
                                                            forFile: outcome.storyURL)
        case .failure(let failure):
            bottomPanelViewController.setProblemsStatus(Self.statusMessage(for: failure))
        }
        // The window carries the story's title once a compose reveals it
        // (GH #188, ADR-279 D1 Amendment A1). Runs on failure too: the tree
        // keeps the last populated IR, so the title stays with it.
        view.window?.title = WindowTitle.title(for: mainSplitViewController.composedIR)
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
}

// MARK: - Main horizontal split (4 panes)

private final class MainSplitViewController: NSSplitViewController {

    private static let railWidth: CGFloat = 40
    private static let projectWidth: CGFloat = 260
    private static let projectMinWidth: CGFloat = 200
    private static let editorMinWidth: CGFloat = 320
    private static let playMinWidth: CGFloat = 240

    /// Manual divider persistence (project/play pane widths). AppKit's frame
    /// autosave is deliberately NOT used: it restores while the window is
    /// still at its pre-appearance fitting width, which squashes the play
    /// pane to its minimum before the window grows back — the extra width
    /// then goes to the editor (lowest holding priority) and the play pane
    /// opened at 240 on every launch regardless of what was saved.
    private static let projectWidthKey = "SharpeeIDEMainSplitProjectWidth"
    private static let playWidthKey = "SharpeeIDEMainSplitPlayWidth"

    private let railViewController = RailViewController()
    private let projectPaneViewController = ProjectPaneViewController()
    private let composeScheduler = ComposeScheduler()
    /// Last-ok-IR retention behind the project tree (ADR-258 D6).
    private var treeState = IRTreeState()
    private let editorViewController = EditorViewController()
    private let rightPanelViewController = RightPanelViewController()
    /// The Play tab inside the right panel — most wiring targets it directly.
    private var playViewController: PlayViewController { rightPanelViewController.play }

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

        railViewController.onBuildToggle = { [weak self] in self?.onBuildPanelToggle?() }
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

        addSplitViewItem(makeRailItem())
        addSplitViewItem(makeProjectItem())
        addSplitViewItem(makeEditorItem())
        addSplitViewItem(makePlayItem())
    }

    /// Opens a file the author activated in the project sidebar, in whatever
    /// surface reads it.
    ///
    /// A `.skein` is a committed artifact whose content is threads and prose
    /// (ADR-299 D7) — the editor would show its JSON serialization, which is
    /// the storage format, not the thing the author made. Every other file is
    /// text and goes to the editor.
    ///
    /// - Parameter url: the activated file.
    private func activateFile(at url: URL) {
        guard url.pathExtension == SkeinStore.fileExtension else {
            editorViewController.openDocument(at: url)
            return
        }
        do {
            try rightPanelViewController.openSkein(at: url)
        } catch {
            // A skein that cannot be read is exactly when the raw bytes are
            // worth seeing, so the refusal is stated AND the text is opened —
            // rather than leaving the author with a message and no file.
            rightPanelViewController.showSkeinTab()
            rightPanelViewController.skeinView.setStatus(
                "\(url.lastPathComponent): \(error.localizedDescription)")
            editorViewController.openDocument(at: url)
        }
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
        projectPaneViewController.setProject(project, expandedFolderURLs: expandedFolderURLs)
        RecentProjectsStore.push(project.rootURL)
        persistSession()
    }

    /// Re-reads the open project from disk and re-applies it, preserving which
    /// folders are expanded.
    ///
    /// The tree is a snapshot of one scan, so anything that writes into the
    /// project from OUTSIDE the tree leaves it stale — a recorded transcript
    /// (ADR-282 D3/D4) lands in `tests/transcripts/` or `walkthroughs/` and is
    /// simply invisible until the project is reopened. Re-applying rather than
    /// reloading keeps `RecentProjectsStore` and the persisted session out of
    /// it: nothing about the project changed, only what is inside it.
    ///
    /// A no-op when no project is open.
    fileprivate func refreshProjectTree() {
        guard let root = currentProject?.rootURL else { return }
        let expanded = projectPaneViewController.expandedFolderURLs
        let rescanned = Project(rootURL: root)
        currentProject = rescanned
        projectPaneViewController.setProject(rescanned, expandedFolderURLs: expanded)
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

    fileprivate func persistSession() {
        let state = SessionState(
            projectURL: currentProject?.rootURL,
            openDocumentURLs: editorViewController.openDocumentURLs,
            activeIndex: editorViewController.activeDocumentIndex,
            expandedFolderURLs: projectPaneViewController.expandedFolderURLs,
            buildPanelVisible: buildPanelVisibleProvider?() ?? false,
            playAfterBuild: playViewController.playAfterBuild
        )
        SessionStateStore.save(state)
    }

    /// After a successful build, load the freshly-built `dist/web/<id>/` bundle
    /// (honours the toggle) and bring the Play tab forward. The id comes from
    /// the retained IR header (D4).
    fileprivate func reloadPlayAfterBuild(projectRoot: URL) {
        guard let bundleDir = bundleDirectory() else { return }
        playViewController.reloadAfterBuild(bundleDirectory: bundleDir)
        if playViewController.isLoaded {
            rightPanelViewController.showPlayTab()
        }
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

    /// Tests-panel plumbing — the Test tab lives in the right panel (ADR-277 D2).
    fileprivate var testPanel: TestPanelView { rightPanelViewController.testPanel }

    /// Points the skein exporter at the open story (save-panel default dir +
    /// re-discovery hook for the Tests panel) — ADR-299 D7.
    fileprivate func configureRecording(storyDirectory: URL?, onRecorded: @escaping (URL) -> Void) {
        playViewController.storyDirectory = storyDirectory
        playViewController.onTranscriptRecorded = onRecorded
    }

    fileprivate func showTestTab() {
        rightPanelViewController.showTestTab()
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
        guard !didApplyInitialLayout else { return }
        didApplyInitialLayout = true
        applyInitialDividerPositions()
    }

    /// Opening divider positions, applied once the window is at its real size:
    /// saved pane widths when present (drags persist across launches), the
    /// defaults otherwise — editor and play split the remaining width equally.
    private func applyInitialDividerPositions() {
        let defaults = UserDefaults.standard
        let totalWidth = splitView.bounds.width

        let savedProject = defaults.object(forKey: Self.projectWidthKey) as? Double
        let projectWidth = max(Self.projectMinWidth, savedProject.map { CGFloat($0) } ?? Self.projectWidth)
        let editorPlusPlay = max(0, totalWidth - Self.railWidth - projectWidth)
        let savedPlay = defaults.object(forKey: Self.playWidthKey) as? Double
        let playWidth = max(Self.playMinWidth, savedPlay.map { CGFloat($0) } ?? editorPlusPlay / 2)

        splitView.setPosition(Self.railWidth, ofDividerAt: 0)
        splitView.setPosition(Self.railWidth + projectWidth, ofDividerAt: 1)
        splitView.setPosition(totalWidth - playWidth, ofDividerAt: 2)
    }

    /// Persists the project/play pane widths on every divider or window
    /// resize — but only after the opening layout has been applied, so the
    /// pre-appearance constraint churn can never overwrite the saved widths.
    @objc private func persistDividerPositions(_ note: Notification) {
        guard didApplyInitialLayout else { return }
        let defaults = UserDefaults.standard
        defaults.set(Double(splitView.arrangedSubviews[1].frame.width), forKey: Self.projectWidthKey)
        defaults.set(Double(splitView.arrangedSubviews[3].frame.width), forKey: Self.playWidthKey)
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
        // Above editor/play (250) so window resizes stretch those panes, but
        // BELOW the divider-drag priorities (~490-510): .defaultHigh (750)
        // out-prioritized user drags entirely — the divider bounced back and
        // the pane behaved as fixed-width (SplitDividerTests reproduces).
        item.holdingPriority = NSLayoutConstraint.Priority(300)
        return item
    }

    private func makeEditorItem() -> NSSplitViewItem {
        let item = NSSplitViewItem(viewController: editorViewController)
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

    /// Invoked when the Build button is clicked.
    var onBuildToggle: (() -> Void)?

    private let buildButton = NSButton()

    override func loadView() {
        let pane = ThemedPane(color: Theme.railBackground)

        buildButton.title = ""
        buildButton.image = NSImage(systemSymbolName: "hammer", accessibilityDescription: "Build")
            ?? NSImage()
        buildButton.imagePosition = .imageOnly
        buildButton.isBordered = false
        buildButton.bezelStyle = .regularSquare
        buildButton.contentTintColor = Theme.foregroundDim
        buildButton.toolTip = "Toggle Problems Panel"
        buildButton.target = self
        buildButton.action = #selector(toggleBuild)
        buildButton.translatesAutoresizingMaskIntoConstraints = false
        pane.addSubview(buildButton)

        NSLayoutConstraint.activate([
            buildButton.centerXAnchor.constraint(equalTo: pane.centerXAnchor),
            buildButton.topAnchor.constraint(equalTo: pane.topAnchor, constant: 12),
            buildButton.widthAnchor.constraint(equalToConstant: 24),
            buildButton.heightAnchor.constraint(equalToConstant: 24),
        ])

        view = pane
    }

    /// Tints the Build button to reflect whether the Build panel is showing.
    func setBuildActive(_ active: Bool) {
        buildButton.contentTintColor = active ? Theme.accent : Theme.foregroundDim
    }

    @objc private func toggleBuild() {
        onBuildToggle?()
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
