// ProjectTreeViewController.swift
// Renders a Project's filesystem tree in an NSOutlineView inside the Project pane.
// Public interface: ProjectTreeViewController.setProject(_:) replaces the displayed tree.
// Owner context: tools/ide — Project pane.

import AppKit

@MainActor
protocol ProjectTreeDelegate: AnyObject {
    /// Called when the user activates (double-clicks or presses Return on) a leaf file node.
    func projectTree(_ controller: ProjectTreeViewController, didActivate node: FileNode)
}

final class ProjectTreeViewController: NSViewController {

    weak var delegate: ProjectTreeDelegate?

    private let outlineView = NSOutlineView()
    private let scrollView = NSScrollView()
    private let placeholder = NSTextField(labelWithString: "No project open")

    private var project: Project?

    private static let cellIdentifier = NSUserInterfaceItemIdentifier("FileCell")

    override func loadView() {
        let pane = NSView()
        pane.wantsLayer = true
        pane.layer?.backgroundColor = Theme.projectBackground.cgColor

        configureOutlineView()
        configureScrollView()
        configurePlaceholder()

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
    }

    /// Replace the tree with a new project's contents. Pass nil to clear.
    func setProject(_ project: Project?) {
        self.project = project
        outlineView.reloadData()
        if let project = project {
            // Auto-expand root.
            outlineView.expandItem(nil, expandChildren: false)
            for child in project.rootNode.children where child.isDirectory {
                outlineView.collapseItem(child)
            }
        }
        updateEmptyState()
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
        outlineView.rowSizeStyle = .small
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
        guard row >= 0, let node = outlineView.item(atRow: row) as? FileNode else { return }

        if node.isDirectory {
            if outlineView.isItemExpanded(node) {
                outlineView.animator().collapseItem(node)
            } else {
                outlineView.animator().expandItem(node)
            }
        } else {
            delegate?.projectTree(self, didActivate: node)
        }
    }
}

// MARK: - Data source

extension ProjectTreeViewController: NSOutlineViewDataSource {

    func outlineView(_ outlineView: NSOutlineView, numberOfChildrenOfItem item: Any?) -> Int {
        if item == nil {
            return project?.rootNode.children.count ?? 0
        }
        return (item as? FileNode)?.children.count ?? 0
    }

    func outlineView(_ outlineView: NSOutlineView, child index: Int, ofItem item: Any?) -> Any {
        if item == nil {
            return project!.rootNode.children[index]
        }
        return (item as! FileNode).children[index]
    }

    func outlineView(_ outlineView: NSOutlineView, isItemExpandable item: Any) -> Bool {
        (item as? FileNode)?.isDirectory ?? false
    }
}

// MARK: - Delegate

extension ProjectTreeViewController: NSOutlineViewDelegate {

    func outlineView(_ outlineView: NSOutlineView, viewFor tableColumn: NSTableColumn?, item: Any) -> NSView? {
        guard let node = item as? FileNode else { return nil }

        let cell = outlineView.makeView(withIdentifier: Self.cellIdentifier, owner: self) as? NSTableCellView
            ?? makeCell()

        cell.textField?.stringValue = node.name
        cell.textField?.textColor = node.isDirectory ? Theme.foreground : Theme.foregroundDim
        cell.textField?.font = node.isDirectory
            ? NSFont.systemFont(ofSize: 12, weight: .medium)
            : NSFont.systemFont(ofSize: 12, weight: .regular)
        cell.imageView?.image = NSWorkspace.shared.icon(forFile: node.url.path)
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
