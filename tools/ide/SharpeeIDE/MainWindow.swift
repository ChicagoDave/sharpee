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

    /// Shows or hides the bottom Build panel — used by session restoration.
    func setBuildPanelVisible(_ visible: Bool) {
        rootViewController?.applyBuildPanelVisible(visible)
    }

    private var rootViewController: RootViewController? {
        window?.contentViewController as? RootViewController
    }
}

// MARK: - Root view controller (vertical split: main split over build panel + status bar)

private final class RootViewController: NSViewController {

    private let mainSplitViewController = MainSplitViewController()
    private let buildPanelViewController = BuildPanelViewController()
    private let verticalSplitViewController = NSSplitViewController()

    private static let buildPanelMinHeight: CGFloat = 120
    private static let buildPanelInitialHeight: CGFloat = 220
    private var didApplyInitialBuildPanelHeight = false

    override func loadView() {
        configureVerticalSplit()
        addChild(verticalSplitViewController)

        mainSplitViewController.onBuildPanelToggle = { [weak self] in self?.toggleBuildPanel() }
        mainSplitViewController.buildPanelVisibleProvider = { [weak self] in self?.isBuildPanelVisible ?? false }

        let statusBar = StatusBarView()
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

        let bottom = NSSplitViewItem(viewController: buildPanelViewController)
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
}

// MARK: - Main horizontal split (4 panes)

private final class MainSplitViewController: NSSplitViewController, ProjectTreeDelegate {

    private static let railWidth: CGFloat = 40
    private static let projectWidth: CGFloat = 260
    private static let projectMinWidth: CGFloat = 200
    private static let editorMinWidth: CGFloat = 320
    private static let playMinWidth: CGFloat = 240

    private let railViewController = RailViewController()
    private let projectTreeViewController = ProjectTreeViewController()
    private let editorViewController = EditorViewController()

    /// Invoked when the rail's Build button is clicked. Owned by RootViewController.
    fileprivate var onBuildPanelToggle: (() -> Void)?
    /// Reports the current build-panel visibility so it can be persisted. Set by RootViewController.
    fileprivate var buildPanelVisibleProvider: (() -> Bool)?

    private var currentProject: Project?
    private var didApplyInitialLayout = false

    override func viewDidLoad() {
        super.viewDidLoad()
        splitView.dividerStyle = .thin
        splitView.autosaveName = "SharpeeIDEMainSplit"

        railViewController.onBuildToggle = { [weak self] in self?.onBuildPanelToggle?() }
        projectTreeViewController.delegate = self
        editorViewController.onStateChanged = { [weak self] in self?.persistSession() }

        addSplitViewItem(makeRailItem())
        addSplitViewItem(makeProjectItem())
        addSplitViewItem(makeEditorItem())
        addSplitViewItem(makePaneItem(label: "Play",
                                      color: Theme.playBackground,
                                      minWidth: Self.playMinWidth,
                                      holding: .defaultLow))
    }

    func loadProject(_ project: Project, expandedFolderURLs: [URL] = []) {
        currentProject = project
        projectTreeViewController.setProject(project, expandedFolderURLs: expandedFolderURLs)
        RecentProjectsStore.push(project.rootURL)
        persistSession()
    }

    func saveActiveDocument() {
        editorViewController.saveActiveDocument()
    }

    func openDocument(at url: URL) {
        editorViewController.openDocument(at: url)
    }

    func switchToDocument(at index: Int) {
        editorViewController.switchTo(index: index)
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
            expandedFolderURLs: projectTreeViewController.expandedFolderURLs,
            buildPanelVisible: buildPanelVisibleProvider?() ?? false
        )
        SessionStateStore.save(state)
    }

    // MARK: - ProjectTreeDelegate

    func projectTree(_ controller: ProjectTreeViewController, didActivate node: FileNode) {
        editorViewController.openDocument(at: node.url)
    }

    func projectTreeDidChangeExpansion(_ controller: ProjectTreeViewController) {
        persistSession()
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
        let item = NSSplitViewItem(viewController: projectTreeViewController)
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

    private func makePaneItem(label: String,
                              color: NSColor,
                              minWidth: CGFloat,
                              holding: NSLayoutConstraint.Priority) -> NSSplitViewItem {
        let vc = PlaceholderPaneViewController(label: label, color: color)
        let item = NSSplitViewItem(viewController: vc)
        item.minimumThickness = minWidth
        item.holdingPriority = holding
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

    init() {
        super.init(frame: .zero)
        wantsLayer = true
        layer?.backgroundColor = Theme.accent.cgColor

        let label = NSTextField(labelWithString: "main · Sharpee 0.1.0")
        label.font = NSFont.systemFont(ofSize: 11)
        label.textColor = Theme.statusBarText
        label.translatesAutoresizingMaskIntoConstraints = false
        addSubview(label)

        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            label.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("StatusBarView is not Storyboard-instantiable")
    }
}
