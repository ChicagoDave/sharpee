// ProjectStructureViewController.swift
// Renders a compose run's Story IR (ADR-258 D6) as the Sharpee-aware project
// view: category headers (Rooms / Objects / NPCs / Regions / Actions) with their
// leaves, in an NSOutlineView. Live — no build gate: the tree tracks the source
// via the compose pipeline, retaining the last ok IR marked stale while the
// source has errors, and stating why when there is nothing to show. Grouping
// logic lives in ProjectStructure; this is the thin AppKit shell.
// Public interface: ProjectStructureViewController.setState(_:), delegate.
// Owner context: tools/ide — Project.

import AppKit

@MainActor
protocol ProjectStructureDelegate: AnyObject {
    /// The user activated (double-clicked / Return) a leaf row.
    func projectStructure(_ controller: ProjectStructureViewController, didActivate leaf: StructureLeaf)
}

final class ProjectStructureViewController: NSViewController {

    weak var delegate: ProjectStructureDelegate?

    private let outlineView = NSOutlineView()
    private let scrollView = NSScrollView()
    private let placeholder = NSTextField(labelWithString: "Open a story to populate the project tree")
    private let staleBanner = NSTextField(labelWithString: "Showing last good compile — the story has errors")

    /// Top-level category nodes; empty until an IR arrives.
    private var nodes: [StructureNode] = []

    private static let cellIdentifier = NSUserInterfaceItemIdentifier("StructureCell")

    override func loadView() {
        let pane = NSView()
        pane.wantsLayer = true
        pane.layer?.backgroundColor = Theme.projectBackground.cgColor

        configureOutlineView()
        configureScrollView()
        configurePlaceholder()
        configureStaleBanner()

        scrollView.translatesAutoresizingMaskIntoConstraints = false
        placeholder.translatesAutoresizingMaskIntoConstraints = false
        staleBanner.translatesAutoresizingMaskIntoConstraints = false
        pane.addSubview(staleBanner)
        pane.addSubview(scrollView)
        pane.addSubview(placeholder)

        NSLayoutConstraint.activate([
            staleBanner.topAnchor.constraint(equalTo: pane.topAnchor, constant: 2),
            staleBanner.leadingAnchor.constraint(equalTo: pane.leadingAnchor, constant: 8),
            staleBanner.trailingAnchor.constraint(equalTo: pane.trailingAnchor, constant: -8),

            scrollView.topAnchor.constraint(equalTo: staleBanner.bottomAnchor, constant: 2),
            scrollView.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: pane.bottomAnchor),

            placeholder.centerXAnchor.constraint(equalTo: pane.centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: pane.centerYAnchor),
            placeholder.leadingAnchor.constraint(greaterThanOrEqualTo: pane.leadingAnchor, constant: 8),
            placeholder.trailingAnchor.constraint(lessThanOrEqualTo: pane.trailingAnchor, constant: -8),
        ])

        view = pane
        setState(.empty(reason: "Open a story to populate the project tree"))
    }

    /// Render a tree display state (from IRTreeState): populated (optionally
    /// stale) or empty-with-reason.
    func setState(_ state: IRTreeState.Display) {
        switch state {
        case .empty(let reason):
            nodes = []
            placeholder.stringValue = reason
            staleBanner.isHidden = true
            outlineView.alphaValue = 1
        case .populated(let ir, let stale):
            nodes = ProjectStructure.build(from: ir)
            placeholder.stringValue = "This story defines no entities yet"
            staleBanner.isHidden = !stale
            outlineView.alphaValue = stale ? 0.55 : 1
        }
        outlineView.reloadData()
        outlineView.expandItem(nil, expandChildren: true) // categories open by default
        let isEmpty = nodes.isEmpty
        scrollView.isHidden = isEmpty
        placeholder.isHidden = !isEmpty
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
        placeholder.alignment = .center
        placeholder.lineBreakMode = .byWordWrapping
        placeholder.maximumNumberOfLines = 0
        placeholder.isHidden = true
    }

    private func configureStaleBanner() {
        staleBanner.font = NSFont.systemFont(ofSize: 10)
        staleBanner.textColor = NSColor.systemYellow
        staleBanner.lineBreakMode = .byWordWrapping
        staleBanner.maximumNumberOfLines = 0
        staleBanner.isHidden = true
    }

    // MARK: - Actions

    @objc private func outlineDoubleClicked(_ sender: Any?) {
        let row = outlineView.clickedRow
        guard row >= 0, let node = outlineView.item(atRow: row) as? StructureNode else { return }

        if node.isCategory {
            if outlineView.isItemExpanded(node) {
                outlineView.animator().collapseItem(node)
            } else {
                outlineView.animator().expandItem(node)
            }
        } else if let leaf = node.leaf {
            delegate?.projectStructure(self, didActivate: leaf)
        }
    }
}

// MARK: - Data source

extension ProjectStructureViewController: NSOutlineViewDataSource {

    func outlineView(_ outlineView: NSOutlineView, numberOfChildrenOfItem item: Any?) -> Int {
        if item == nil { return nodes.count }
        return (item as? StructureNode)?.children.count ?? 0
    }

    func outlineView(_ outlineView: NSOutlineView, child index: Int, ofItem item: Any?) -> Any {
        if item == nil { return nodes[index] }
        return (item as! StructureNode).children[index]
    }

    func outlineView(_ outlineView: NSOutlineView, isItemExpandable item: Any) -> Bool {
        (item as? StructureNode)?.isCategory ?? false
    }
}

// MARK: - Delegate

extension ProjectStructureViewController: NSOutlineViewDelegate {

    func outlineView(_ outlineView: NSOutlineView, viewFor tableColumn: NSTableColumn?, item: Any) -> NSView? {
        guard let node = item as? StructureNode else { return nil }

        let cell = outlineView.makeView(withIdentifier: Self.cellIdentifier, owner: self) as? NSTableCellView
            ?? makeCell()

        if let category = node.category {
            cell.textField?.stringValue = "\(category.title)  (\(node.children.count))"
            cell.textField?.textColor = Theme.foreground
            cell.textField?.font = NSFont.systemFont(ofSize: 12, weight: .semibold)
            cell.imageView?.image = nil
        } else if let leaf = node.leaf {
            cell.textField?.stringValue = leaf.title
            cell.textField?.textColor = Theme.foregroundDim
            cell.textField?.font = NSFont.systemFont(ofSize: 12, weight: .regular)
            cell.imageView?.image = NSImage(systemSymbolName: leaf.category.symbolName,
                                            accessibilityDescription: nil)
        }
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
