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
        window.title = "Sharpee"
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

    /// Appends a chunk of build output to the Build panel.
    func appendBuildOutput(_ text: String) {
        rootViewController?.appendBuildOutput(text)
    }

    /// Clears the Build panel (called at the start of a build).
    func clearBuildOutput() {
        rootViewController?.clearBuildOutput()
    }

    /// Sets the repo root the Build panel uses to resolve diagnostic paths.
    func setBuildPanelRepoRoot(_ url: URL) {
        rootViewController?.setBuildPanelRepoRoot(url)
    }

    /// Loads (or clears) the Play pane for the given story's web bundle.
    func refreshPlay(repoRoot: URL?, story: String?) {
        rootViewController?.refreshPlay(repoRoot: repoRoot, story: story)
    }

    /// After a successful Browser build, loads the just-built story into Play (if the toggle is on).
    func browserBuildSucceeded(repoRoot: URL, story: String) {
        rootViewController?.browserBuildSucceeded(repoRoot: repoRoot, story: story)
    }

    /// After any successful build, refresh the Structure view's manifest (ADR-184).
    func buildSucceeded(repoRoot: URL, story: String) {
        rootViewController?.buildSucceeded(repoRoot: repoRoot, story: story)
    }

    /// Applies a persisted "Play after build" value (session restore).
    func setPlayAfterBuild(_ on: Bool) {
        rootViewController?.applyPlayAfterBuild(on)
    }

    /// Updates the status-bar build pill.
    func updateBuildStatus(_ status: BuildStatusDisplay) {
        rootViewController?.updateBuildStatus(status)
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
        bottomPanelViewController.buildPanel.onSourceClick = openLocation
        bottomPanelViewController.gameErrors.onDoubleClick = openLocation
        mainSplitViewController.setDiagnosisOpenLocation(openLocation)

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
        bottom.holdingPriority = .defaultHigh

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
    }

    func saveActiveDocument() {
        mainSplitViewController.saveActiveDocument()
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
        bottomPanelViewController.buildPanel.append(text)
    }

    func clearBuildOutput() {
        bottomPanelViewController.buildPanel.clear()
        bottomPanelViewController.clearPlayErrors() // a new build supersedes prior game errors
        mainSplitViewController.clearDiagnosis()
    }

    func setBuildPanelRepoRoot(_ url: URL) {
        bottomPanelViewController.buildPanel.repoRoot = url
    }

    func refreshPlay(repoRoot: URL?, story: String?) {
        mainSplitViewController.refreshPlay(repoRoot: repoRoot, story: story)
    }

    func browserBuildSucceeded(repoRoot: URL, story: String) {
        mainSplitViewController.browserBuildSucceeded(repoRoot: repoRoot, story: story)
    }

    func buildSucceeded(repoRoot: URL, story: String) {
        mainSplitViewController.buildSucceeded(repoRoot: repoRoot, story: story)
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

    private let railViewController = RailViewController()
    private let projectPaneViewController = ProjectPaneViewController()
    private let introspectionRunner = IntrospectionRunner()
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

    private var currentProject: Project?
    private var didApplyInitialLayout = false

    override func viewDidLoad() {
        super.viewDidLoad()
        splitView.dividerStyle = .thin
        splitView.autosaveName = "SharpeeIDEMainSplit"

        railViewController.onBuildToggle = { [weak self] in self?.onBuildPanelToggle?() }
        projectPaneViewController.onActivateFile = { [weak self] url in self?.editorViewController.openDocument(at: url) }
        projectPaneViewController.onActivateEntity = { [weak self] entity in self?.openEntitySource(entity) }
        projectPaneViewController.onExpansionChanged = { [weak self] in self?.persistSession() }
        editorViewController.onStateChanged = { [weak self] in self?.persistSession() }
        playViewController.onPlayAfterBuildChanged = { [weak self] in self?.persistSession() }
        playViewController.onConsoleError = { [weak self] message in self?.onPlayConsoleError?(message) }

        addSplitViewItem(makeRailItem())
        addSplitViewItem(makeProjectItem())
        addSplitViewItem(makeEditorItem())
        addSplitViewItem(makePlayItem())
    }

    /// Loads (or clears) the Play pane for the given story's web bundle.
    fileprivate func refreshPlay(repoRoot: URL?, story: String?) {
        playViewController.load(repoRoot: repoRoot, story: story)
    }

    func loadProject(_ project: Project, expandedFolderURLs: [URL] = []) {
        currentProject = project
        projectPaneViewController.setProject(project, expandedFolderURLs: expandedFolderURLs)
        RecentProjectsStore.push(project.rootURL)
        persistSession()
    }

    func saveActiveDocument() {
        editorViewController.saveActiveDocument()
    }

    func openDocument(at url: URL) {
        editorViewController.openDocument(at: url)
    }

    func openDocument(at url: URL, line: Int, column: Int) {
        editorViewController.openDocument(at: url, line: line, column: column)
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

    /// After a successful Browser build, load the freshly-built story (honours the toggle).
    fileprivate func browserBuildSucceeded(repoRoot: URL, story: String) {
        playViewController.reloadAfterBuild(repoRoot: repoRoot, story: story)
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

    /// After any successful build, run `--introspect` and feed the Structure view (ADR-184).
    /// Best-effort: introspection failure leaves the prior structure untouched.
    fileprivate func buildSucceeded(repoRoot: URL, story: String) {
        guard let storyDir = Self.storyDirectory(repoRoot: repoRoot, name: story) else { return }
        introspectionRunner.introspect(storyPath: storyDir.path, repoRoot: repoRoot) { [weak self] result in
            guard let self else { return }
            if case .success(let manifest) = result {
                // Join runtime entities to their source sites (ADR-184 source-position half).
                let index = EntitySourceIndex.build(storyDirectory: storyDir)
                self.projectPaneViewController.setManifest(index.annotating(manifest))
            }
        }
    }

    /// Resolves a story *name* to its directory under stories/ or tutorials/.
    private static func storyDirectory(repoRoot: URL, name: String) -> URL? {
        let fm = FileManager.default
        for sub in ["stories", "tutorials"] {
            let url = repoRoot.appendingPathComponent(sub).appendingPathComponent(name)
            if fm.fileExists(atPath: url.path) { return url }
        }
        return nil
    }

    /// Opens an activated entity's source location, when the manifest carries one.
    /// CLI manifests have no source yet (added by the tree-sitter index, a later step).
    private func openEntitySource(_ entity: EntityNode) {
        guard let source = entity.source else { return }
        // The index records absolute paths; a future wire/bridge source may be workspace-relative.
        let url: URL?
        if source.file.hasPrefix("/") {
            url = URL(fileURLWithPath: source.file)
        } else {
            url = currentProject.map { $0.rootURL.appendingPathComponent(source.file) }
        }
        guard let url else { return }
        editorViewController.openDocument(at: url, line: source.line, column: 0)
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        guard !didApplyInitialLayout else { return }
        didApplyInitialLayout = true
        applyInitialDividerPositionsIfNeeded()
    }

    /// First-run divider positions. Skipped on subsequent launches so the user's drags persist.
    private func applyInitialDividerPositionsIfNeeded() {
        let autosaveKey = "NSSplitView Subview Frames \(splitView.autosaveName ?? "")"
        guard UserDefaults.standard.object(forKey: autosaveKey) == nil else { return }

        let totalWidth = splitView.bounds.width
        let editorPlusPlay = max(0, totalWidth - Self.railWidth - Self.projectWidth)
        let playWidth = max(Self.playMinWidth, editorPlusPlay / 2)

        splitView.setPosition(Self.railWidth, ofDividerAt: 0)
        splitView.setPosition(Self.railWidth + Self.projectWidth, ofDividerAt: 1)
        splitView.setPosition(totalWidth - playWidth, ofDividerAt: 2)
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
        item.holdingPriority = .defaultHigh
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
        item.holdingPriority = .defaultLow
        return item
    }
}

// MARK: - Rail (collapsed-panel entry points)

private final class RailViewController: NSViewController {

    /// Invoked when the Build button is clicked.
    var onBuildToggle: (() -> Void)?

    private let buildButton = NSButton()

    override func loadView() {
        let pane = NSView()
        pane.wantsLayer = true
        pane.layer?.backgroundColor = Theme.railBackground.cgColor

        buildButton.title = ""
        buildButton.image = NSImage(systemSymbolName: "hammer", accessibilityDescription: "Build")
            ?? NSImage()
        buildButton.imagePosition = .imageOnly
        buildButton.isBordered = false
        buildButton.bezelStyle = .regularSquare
        buildButton.contentTintColor = Theme.foregroundDim
        buildButton.toolTip = "Toggle Build Panel"
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
        let pane = NSView()
        pane.wantsLayer = true
        pane.layer?.backgroundColor = paneColor.cgColor

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

    init() {
        super.init(frame: .zero)
        wantsLayer = true
        layer?.backgroundColor = Theme.accent.cgColor

        let label = NSTextField(labelWithString: "main · Sharpee 0.1.0")
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
            dot.layer?.backgroundColor = Self.dotColor(for: status).cgColor
        }
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
