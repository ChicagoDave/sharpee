// MainWindow.swift
// Main window shell for Sharpee: a 4-pane horizontal split (Rail | Project | Editor | Play) with a status bar footer.
// Public interface: MainWindowController constructs and presents the window, and forwards
// project-load calls down the view-controller chain to the project tree.
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
        (window?.contentViewController as? RootViewController)?
            .loadProject(project, expandedFolderURLs: expandedFolderURLs)
    }

    /// Forwards a Save action from the menu down to the editor.
    func saveActiveDocument() {
        (window?.contentViewController as? RootViewController)?.saveActiveDocument()
    }

    /// Opens a document URL in the editor — used by session restoration.
    func openDocument(at url: URL) {
        (window?.contentViewController as? RootViewController)?.openDocument(at: url)
    }

    /// Activates the tab at `index` — used by session restoration.
    func switchToDocument(at index: Int) {
        (window?.contentViewController as? RootViewController)?.switchToDocument(at: index)
    }
}

// MARK: - Root view controller (split + status bar)

private final class RootViewController: NSViewController {

    private let splitViewController = MainSplitViewController()

    override func loadView() {
        let statusBar = StatusBarView()

        addChild(splitViewController)

        let container = NSView()
        container.translatesAutoresizingMaskIntoConstraints = false

        splitViewController.view.translatesAutoresizingMaskIntoConstraints = false
        statusBar.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(splitViewController.view)
        container.addSubview(statusBar)

        NSLayoutConstraint.activate([
            splitViewController.view.topAnchor.constraint(equalTo: container.topAnchor),
            splitViewController.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            splitViewController.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            splitViewController.view.bottomAnchor.constraint(equalTo: statusBar.topAnchor),

            statusBar.heightAnchor.constraint(equalToConstant: 22),
            statusBar.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            statusBar.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            statusBar.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        view = container
    }

    func loadProject(_ project: Project, expandedFolderURLs: [URL] = []) {
        splitViewController.loadProject(project, expandedFolderURLs: expandedFolderURLs)
    }

    func saveActiveDocument() {
        splitViewController.saveActiveDocument()
    }

    func openDocument(at url: URL) {
        splitViewController.openDocument(at: url)
    }

    func switchToDocument(at index: Int) {
        splitViewController.switchToDocument(at: index)
    }
}

// MARK: - Main horizontal split (4 panes)

private final class MainSplitViewController: NSSplitViewController, ProjectTreeDelegate {

    private static let railWidth: CGFloat = 40
    private static let projectWidth: CGFloat = 260
    private static let projectMinWidth: CGFloat = 200
    private static let editorMinWidth: CGFloat = 320
    private static let playMinWidth: CGFloat = 240

    private let projectTreeViewController = ProjectTreeViewController()
    private let editorViewController = EditorViewController()

    private var currentProject: Project?
    private var didApplyInitialLayout = false

    override func viewDidLoad() {
        super.viewDidLoad()
        splitView.dividerStyle = .thin
        splitView.autosaveName = "SharpeeIDEMainSplit"

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

    private func persistSession() {
        let state = SessionState(
            projectURL: currentProject?.rootURL,
            openDocumentURLs: editorViewController.openDocumentURLs,
            activeIndex: editorViewController.activeDocumentIndex,
            expandedFolderURLs: projectTreeViewController.expandedFolderURLs
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
        let vc = PlaceholderPaneViewController(label: "Rail",
                                               color: Theme.railBackground,
                                               showLabel: false)
        let item = NSSplitViewItem(viewController: vc)
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
