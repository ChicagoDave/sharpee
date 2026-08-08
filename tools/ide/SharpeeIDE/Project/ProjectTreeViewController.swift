// ProjectTreeViewController.swift
// Renders a Project as typed artifact groups (ADR-280 D1) in an NSOutlineView
// inside the Project pane: top-level rows are ArtifactGroups, their children are
// the FileNodes belonging to each. Groups are lenses over the real folder, so a
// file's row position does not imply its on-disk parent.
// Public interface: ProjectTreeViewController.setProject(_:) replaces the displayed tree.
// Owner context: tools/ide — Project pane.

import AppKit

@MainActor
protocol ProjectTreeDelegate: AnyObject {
    /// Called when the user activates (double-clicks or presses Return on) a leaf file node.
    func projectTree(_ controller: ProjectTreeViewController, didActivate node: FileNode)

    /// Called whenever the user toggles a directory's expansion state.
    /// Suppressed during programmatic restoration to avoid notification spam.
    func projectTreeDidChangeExpansion(_ controller: ProjectTreeViewController)
}

final class ProjectTreeViewController: NSViewController {

    weak var delegate: ProjectTreeDelegate?

    private let outlineView = NSOutlineView()
    private let scrollView = NSScrollView()
    private let placeholder = NSTextField(labelWithString: "No project open")

    private var project: Project?
    /// The typed groups for the open project, rebuilt whenever it changes.
    /// Held rather than recomputed per data-source call so outline rows keep a
    /// stable identity across reloads.
    private var groups: [ArtifactGroup] = []
    /// Suppresses delegate notifications while we apply expansion programmatically
    /// (e.g. during session restoration).
    private var isApplyingProgrammaticExpansion = false

    private static let cellIdentifier = NSUserInterfaceItemIdentifier("FileCell")

    override func loadView() {
        let pane = NSView()

        configureOutlineView()
        configureScrollView()
        configurePlaceholder()
        configureContextMenu()

        scrollView.translatesAutoresizingMaskIntoConstraints = false
        placeholder.translatesAutoresizingMaskIntoConstraints = false

        pane.addSubview(scrollView)
        pane.addSubview(placeholder)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: pane.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: pane.bottomAnchor),

            placeholder.centerXAnchor.constraint(equalTo: pane.centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: pane.centerYAnchor),
        ])

        view = pane
        updateEmptyState()

        NotificationCenter.default.addObserver(self, selector: #selector(fontPreferenceChanged),
                                               name: FontPreference.didChangeNotification,
                                               object: nil)
    }

    @objc private func fontPreferenceChanged() {
        outlineView.reloadData()
    }

    /// Replace the tree with a new project's contents. Pass nil to clear.
    /// If `expandedFolderURLs` is non-empty, recursively re-expands directories whose URLs match
    /// (parents are expanded first so child matches resolve). Otherwise leaves the tree collapsed.
    /// `expandedGroupKinds` non-empty re-opens exactly those group rows instead
    /// of the default — the in-place refresh path, where the group the author
    /// is looking at must not snap shut under them.
    func setProject(_ project: Project?, expandedFolderURLs: [URL] = [],
                    expandedGroupKinds: Set<ArtifactGroup.Kind> = []) {
        self.project = project
        self.groups = project.map(ProjectArtifacts.groups(for:)) ?? []
        outlineView.reloadData()
        guard project != nil else {
            updateEmptyState()
            return
        }

        isApplyingProgrammaticExpansion = true
        defer { isApplyingProgrammaticExpansion = false }

        // Story opens; every other group starts collapsed (David's ruling). A
        // mature story has dozens of transcript tests — opening them all pushes
        // the later groups below the fold, and the story is what you came for.
        // A refresh carries the author's ACTUAL group expansion and applies
        // exactly that instead — the default is for arriving, not for staying.
        let openKinds: Set<ArtifactGroup.Kind> =
            expandedGroupKinds.isEmpty ? [.story] : expandedGroupKinds
        for group in groups where openKinds.contains(group.kind) {
            outlineView.expandItem(group)
        }

        if !expandedFolderURLs.isEmpty {
            let urlSet = Set(expandedFolderURLs)
            for group in groups {
                applyExpansion(below: group.members, matching: urlSet)
            }
        }

        updateEmptyState()
    }

    /// The group rows currently open, by kind — the refresh path's share of
    /// the expansion snapshot. Groups have no URL, so `expandedFolderURLs`
    /// cannot carry them; session restore deliberately does not want them
    /// (open-by-default is its ruling), but an in-place refresh must.
    var expandedGroupKinds: Set<ArtifactGroup.Kind> {
        Set(groups.filter { outlineView.isItemExpanded($0) }.map(\.kind))
    }

    /// URLs of every currently-expanded directory in the displayed tree.
    /// Group rows are not included — they have no URL, and their open-by-default
    /// state is not something session restore needs to carry.
    var expandedFolderURLs: [URL] {
        var result: [URL] = []
        for group in groups {
            collectExpanded(among: group.members, into: &result)
        }
        return result
    }

    private func collectExpanded(among nodes: [FileNode], into result: inout [URL]) {
        for node in nodes where node.isDirectory && outlineView.isItemExpanded(node) {
            result.append(node.url)
            collectExpanded(among: node.children, into: &result)
        }
    }

    private func applyExpansion(below nodes: [FileNode], matching urls: Set<URL>) {
        for node in nodes where node.isDirectory {
            if urls.contains(node.url) {
                outlineView.expandItem(node)
                applyExpansion(below: node.children, matching: urls)
            }
        }
    }

    // MARK: - Setup

    private func configureOutlineView() {
        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("name"))
        column.title = "Name"
        column.minWidth = 100
        column.resizingMask = [.autoresizingMask, .userResizingMask]
        outlineView.addTableColumn(column)
        outlineView.outlineTableColumn = column
        outlineView.headerView = nil
        outlineView.indentationPerLevel = 14
        // .custom: we own the row fonts. Any standard rowSizeStyle lets AppKit
        // re-standardize cell fonts on styled (expandable) rows — folder rows
        // silently reverted to the system font (ProjectTreeFontTests).
        outlineView.rowSizeStyle = .custom
        outlineView.rowHeight = 20
        outlineView.style = .plain
        outlineView.dataSource = self
        outlineView.delegate = self
        outlineView.target = self
        outlineView.doubleAction = #selector(outlineDoubleClicked(_:))
        outlineView.backgroundColor = .clear
        outlineView.allowsMultipleSelection = false
        outlineView.selectionHighlightStyle = .regular
        outlineView.usesAlternatingRowBackgroundColors = false
    }

    private func configureScrollView() {
        scrollView.documentView = outlineView
        scrollView.hasVerticalScroller = true
        // No horizontal scrolling in the file tree (David's ruling): the single
        // column tracks the pane width and long names truncate.
        scrollView.hasHorizontalScroller = false
        scrollView.horizontalScrollElasticity = .none
        outlineView.autoresizesOutlineColumn = true
        outlineView.columnAutoresizingStyle = .firstColumnOnlyAutoresizingStyle
        scrollView.drawsBackground = false
        scrollView.contentView.drawsBackground = false
    }

    private func configurePlaceholder() {
        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
        placeholder.isHidden = true
    }

    private func updateEmptyState() {
        let isEmpty = project == nil
        scrollView.isHidden = isEmpty
        placeholder.isHidden = !isEmpty
    }

    // MARK: - Actions

    @objc private func outlineDoubleClicked(_ sender: Any?) {
        let row = outlineView.clickedRow
        guard row >= 0, let item = outlineView.item(atRow: row) else { return }

        if let node = item as? FileNode, !node.isDirectory {
            delegate?.projectTree(self, didActivate: node)
            return
        }
        // Groups and directories toggle.
        if outlineView.isItemExpanded(item) {
            outlineView.animator().collapseItem(item)
        } else {
            outlineView.animator().expandItem(item)
        }
    }

    // MARK: - Reveal in Finder (ADR-280 Q-3)

    /// What "Reveal in Finder" selects for the clicked row: a file or directory
    /// selects itself; a group selects its backing folder when it has one; a
    /// group assembled from scattered files, or a click in empty space, falls
    /// back to the project root. Nil only when no project is open.
    func revealTarget(forRow row: Int) -> URL? {
        guard let project = project else { return nil }
        guard row >= 0, let item = outlineView.item(atRow: row) else { return project.rootURL }
        if let node = item as? FileNode { return node.url }
        if let group = item as? ArtifactGroup { return group.directoryURL ?? project.rootURL }
        return project.rootURL
    }

    @objc private func revealInFinder(_ sender: Any?) {
        guard let url = revealTarget(forRow: outlineView.clickedRow) else { return }
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    private func configureContextMenu() {
        let menu = NSMenu()
        menu.autoenablesItems = false
        let reveal = NSMenuItem(title: "Reveal in Finder",
                                action: #selector(revealInFinder(_:)),
                                keyEquivalent: "")
        reveal.target = self
        menu.addItem(reveal)
        outlineView.menu = menu
    }
}

// MARK: - Data source

extension ProjectTreeViewController: NSOutlineViewDataSource {

    func outlineView(_ outlineView: NSOutlineView, numberOfChildrenOfItem item: Any?) -> Int {
        switch item {
        case nil: return groups.count
        case let group as ArtifactGroup: return group.members.count
        case let node as FileNode: return node.children.count
        default: return 0
        }
    }

    func outlineView(_ outlineView: NSOutlineView, child index: Int, ofItem item: Any?) -> Any {
        switch item {
        case nil: return groups[index]
        case let group as ArtifactGroup: return group.members[index]
        default: return (item as! FileNode).children[index]
        }
    }

    func outlineView(_ outlineView: NSOutlineView, isItemExpandable item: Any) -> Bool {
        switch item {
        case let group as ArtifactGroup: return !group.members.isEmpty
        case let node as FileNode: return node.isDirectory
        default: return false
        }
    }
}

// MARK: - Delegate

extension ProjectTreeViewController: NSOutlineViewDelegate {

    func outlineViewItemDidExpand(_ notification: Notification) {
        guard !isApplyingProgrammaticExpansion else { return }
        delegate?.projectTreeDidChangeExpansion(self)
    }

    func outlineViewItemDidCollapse(_ notification: Notification) {
        guard !isApplyingProgrammaticExpansion else { return }
        delegate?.projectTreeDidChangeExpansion(self)
    }

    func outlineView(_ outlineView: NSOutlineView, viewFor tableColumn: NSTableColumn?, item: Any) -> NSView? {
        if let group = item as? ArtifactGroup {
            return groupCell(for: group)
        }
        guard let node = item as? FileNode else { return nil }

        let cell = outlineView.makeView(withIdentifier: Self.cellIdentifier, owner: self) as? NSTableCellView
            ?? makeCell()

        cell.textField?.stringValue = node.name
        cell.textField?.textColor = node.isDirectory ? Theme.foreground : Theme.foregroundDim
        // Directory pane follows the reader font (David's ruling); folders keep
        // a heavier weight of the same family via a DESCRIPTOR bold —
        // NSFontManager.convert(toHaveTrait:) silently fails for these faces
        // and returns the system font (folders looked like the preference was
        // being ignored; ProjectTreeFontTests pins this).
        cell.textField?.font = node.isDirectory
            ? FontPreference.panelBoldFont
            : FontPreference.panelFont
        cell.imageView?.image = NSWorkspace.shared.icon(forFile: node.url.path)
        return cell
    }

    /// A group header row. Uses the same cell shape as a file row so the reader
    /// font applies uniformly (ProjectTreeFontTests pins the family across every
    /// row), with the artifact's symbol standing in for a file icon.
    private func groupCell(for group: ArtifactGroup) -> NSTableCellView {
        let cell = outlineView.makeView(withIdentifier: Self.cellIdentifier, owner: self) as? NSTableCellView
            ?? makeCell()

        cell.textField?.stringValue = group.displayName
        cell.textField?.textColor = Theme.foreground
        cell.textField?.font = FontPreference.panelBoldFont
        cell.imageView?.image = NSImage(systemSymbolName: group.kind.symbolName,
                                        accessibilityDescription: group.displayName)
        return cell
    }

    private func makeCell() -> NSTableCellView {
        let cell = NSTableCellView()
        cell.identifier = Self.cellIdentifier

        let icon = NSImageView()
        icon.imageScaling = .scaleProportionallyDown
        icon.translatesAutoresizingMaskIntoConstraints = false
        cell.imageView = icon
        cell.addSubview(icon)

        let label = NSTextField(labelWithString: "")
        label.font = NSFont.systemFont(ofSize: 12)
        label.lineBreakMode = .byTruncatingTail
        label.translatesAutoresizingMaskIntoConstraints = false
        cell.textField = label
        cell.addSubview(label)

        NSLayoutConstraint.activate([
            icon.leadingAnchor.constraint(equalTo: cell.leadingAnchor, constant: 2),
            icon.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 16),
            icon.heightAnchor.constraint(equalToConstant: 16),

            label.leadingAnchor.constraint(equalTo: icon.trailingAnchor, constant: 6),
            label.trailingAnchor.constraint(equalTo: cell.trailingAnchor, constant: -4),
            label.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
        ])

        return cell
    }
}
