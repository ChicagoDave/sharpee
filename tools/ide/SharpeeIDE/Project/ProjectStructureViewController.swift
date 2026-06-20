// ProjectStructureViewController.swift
// Renders a ProjectManifest (ADR-184) as the Sharpee-aware project view: category
// headers (Rooms / Objects / NPCs / Regions) with their entities, in an
// NSOutlineView. Build-gated — shows a "build to populate" affordance until a
// manifest is supplied. Grouping logic lives in ProjectStructure; this is the thin
// AppKit shell.
// Public interface: ProjectStructureViewController.setManifest(_:), delegate.
// Owner context: tools/ide — Project.

import AppKit

@MainActor
protocol ProjectStructureDelegate: AnyObject {
    /// The user activated (double-clicked / Return) an entity row.
    func projectStructure(_ controller: ProjectStructureViewController, didActivate entity: EntityNode)
}

final class ProjectStructureViewController: NSViewController {

    weak var delegate: ProjectStructureDelegate?

    private let outlineView = NSOutlineView()
    private let scrollView = NSScrollView()
    private let placeholder = NSTextField(labelWithString: "Build to populate the project tree")

    /// Top-level category nodes; empty until a manifest is set.
    private var nodes: [StructureNode] = []
    private var hasManifest = false

    private static let cellIdentifier = NSUserInterfaceItemIdentifier("StructureCell")

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

    /// Replace the displayed structure from a manifest. Pass nil to return to the
    /// build-gated empty state (e.g. when no successful build has produced a manifest).
    func setManifest(_ manifest: ProjectManifest?) {
        if let manifest {
            nodes = ProjectStructure.build(from: manifest)
            hasManifest = true
        } else {
            nodes = []
            hasManifest = false
        }
        outlineView.reloadData()
        outlineView.expandItem(nil, expandChildren: true) // categories open by default
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
        placeholder.alignment = .center
        placeholder.isHidden = true
    }

    private func updateEmptyState() {
        let isEmpty = !hasManifest || nodes.isEmpty
        scrollView.isHidden = isEmpty
        placeholder.isHidden = !isEmpty
        placeholder.stringValue = hasManifest
            ? "This story defines no entities yet"
            : "Build to populate the project tree"
    }

    /// SF Symbol name for an entity category's leaf icon.
    private static func symbolName(for category: EntityCategory) -> String {
        switch category {
        case .room: return "square.split.bottomrightquarter"
        case .object: return "cube"
        case .npc: return "person"
        case .region: return "map"
        }
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
        } else if let entity = node.entity {
            delegate?.projectStructure(self, didActivate: entity)
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

        if let group = node.group {
            cell.textField?.stringValue = "\(group.title)  (\(group.entities.count))"
            cell.textField?.textColor = Theme.foreground
            cell.textField?.font = NSFont.systemFont(ofSize: 12, weight: .semibold)
            cell.imageView?.image = nil
        } else if let entity = node.entity {
            cell.textField?.stringValue = entity.displayName
            cell.textField?.textColor = Theme.foregroundDim
            cell.textField?.font = NSFont.systemFont(ofSize: 12, weight: .regular)
            cell.imageView?.image = NSImage(systemSymbolName: Self.symbolName(for: entity.category),
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
