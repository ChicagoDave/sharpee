// SkeinView.swift
// The right panel's "Skein" tab — the tree half of ADR-299 D8: the story's
// thread tree, click-to-replay (D6), and the tag (D2) and force (D5)
// affordances. Rows render one node each: its command, the author's tag, and
// badges for blessed / forced / where play currently sits. Double-click (or
// Return) replays root→node and leaves the story live there; the Tag and Force
// actions apply to the selection and round-trip through SkeinStore to disk.
// Blessing is deliberately absent — it belongs to the Transcript view, where
// the output being vouched for is readable (D8).
// Public interface: setSession(_:), reload(), selectedNodeId, onReplay, onTag,
// onForce, setStatus(_:), setBusy(_:).
// Owner context: tools/ide — Skein (tree surface).

import AppKit

final class SkeinView: NSView {

    /// The author asked to replay root→node (D6). The host drives the surface
    /// and reports back through `setStatus`/`setBusy`.
    var onReplay: ((String) -> Void)?
    /// The author asked to name the thread ending at this node (D2).
    var onTag: ((String) -> Void)?
    /// The author asked to grow a forced sibling beside this node (D5).
    var onForce: ((String) -> Void)?

    private let replayButton = NSButton(title: "Replay to Node", target: nil, action: nil)
    private let tagButton = NSButton(title: "Tag…", target: nil, action: nil)
    private let forceButton = NSButton(title: "Force…", target: nil, action: nil)
    private let statusLabel = NSTextField(labelWithString: "")
    private let scrollView = NSScrollView()
    private let outlineView = NSOutlineView()
    private let emptyLabel = NSTextField(
        labelWithString: "Play the story (⌘B, then type) — every turn grows the skein")

    private static let bodyFont = NSFont.systemFont(ofSize: 11.5)
    private static let monoFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)

    private weak var session: SkeinSession?

    /// Outline item boxes. `NSOutlineView` holds items by identity, and
    /// `SkeinNode` is a value type, so rows wrap a stable node id instead —
    /// re-wrapped on every reload so a rebuilt tree never hands AppKit a box
    /// pointing at a node that no longer exists.
    private final class NodeItem {
        let id: String
        init(id: String) { self.id = id }
    }
    private var itemsByNodeId: [String: NodeItem] = [:]
    private var childIds: [String: [String]] = [:]
    private var rootIds: [String] = []

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        for button in [replayButton, tagButton, forceButton] {
            button.bezelStyle = .accessoryBarAction
            button.font = NSFont.systemFont(ofSize: 11)
            button.target = self
            button.isEnabled = false
            button.translatesAutoresizingMaskIntoConstraints = false
        }
        replayButton.action = #selector(replayClicked)
        tagButton.action = #selector(tagClicked)
        forceButton.action = #selector(forceClicked)

        statusLabel.font = NSFont.systemFont(ofSize: 11)
        statusLabel.textColor = Theme.foregroundDim
        statusLabel.lineBreakMode = .byTruncatingTail
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("skein"))
        column.resizingMask = .autoresizingMask
        outlineView.addTableColumn(column)
        outlineView.outlineTableColumn = column
        outlineView.headerView = nil
        outlineView.backgroundColor = .clear
        outlineView.usesAlternatingRowBackgroundColors = false
        // AppKit re-standardizes row fonts unless the style is .custom — the
        // directory-pane font bug (c8a3b237). Do not remove.
        outlineView.rowSizeStyle = .custom
        outlineView.dataSource = self
        outlineView.delegate = self
        outlineView.target = self
        outlineView.doubleAction = #selector(rowActivated)

        scrollView.documentView = outlineView
        scrollView.hasVerticalScroller = true
        scrollView.drawsBackground = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false

        emptyLabel.font = NSFont.systemFont(ofSize: 11)
        emptyLabel.textColor = Theme.foregroundFaint
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false

        addSubview(replayButton)
        addSubview(tagButton)
        addSubview(forceButton)
        addSubview(statusLabel)
        addSubview(scrollView)
        addSubview(emptyLabel)

        NSLayoutConstraint.activate([
            replayButton.topAnchor.constraint(equalTo: topAnchor, constant: 6),
            replayButton.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            tagButton.centerYAnchor.constraint(equalTo: replayButton.centerYAnchor),
            tagButton.leadingAnchor.constraint(equalTo: replayButton.trailingAnchor, constant: 6),
            forceButton.centerYAnchor.constraint(equalTo: replayButton.centerYAnchor),
            forceButton.leadingAnchor.constraint(equalTo: tagButton.trailingAnchor, constant: 6),

            statusLabel.topAnchor.constraint(equalTo: replayButton.bottomAnchor, constant: 6),
            statusLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            statusLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -8),

            scrollView.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 6),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

            emptyLabel.centerXAnchor.constraint(equalTo: scrollView.centerXAnchor),
            emptyLabel.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 20),
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    // MARK: - Content

    /// Points the view at the story's live skein session (nil when no story is
    /// loaded), then repaints.
    func setSession(_ session: SkeinSession?) {
        self.session = session
        reload()
    }

    /// Rebuilds the tree from the session's current document.
    ///
    /// Expansion state is restored by node id, and the selection is preserved
    /// when its node survives — growing the skein under the author must not
    /// collapse the tree they were reading.
    func reload() {
        let expanded = expandedNodeIds()
        let selected = selectedNodeId

        rebuildItems()
        outlineView.reloadData()

        for id in expanded {
            if let item = itemsByNodeId[id] { outlineView.expandItem(item) }
        }
        // A freshly-grown skein has nothing expanded yet; showing the root's
        // children is the useful default (an all-collapsed tree reads as empty).
        if expanded.isEmpty {
            for id in rootIds {
                if let item = itemsByNodeId[id] { outlineView.expandItem(item) }
            }
        }
        if let selected, let item = itemsByNodeId[selected] {
            let row = outlineView.row(forItem: item)
            if row >= 0 {
                outlineView.selectRowIndexes(IndexSet(integer: row), byExtendingSelection: false)
            }
        }
        emptyLabel.isHidden = !rootIds.isEmpty
        updateActionAvailability()
    }

    /// Flattens the document into id-keyed rows. The document's root is the
    /// story-start position and is not itself a row — its children are the
    /// first typed commands, which is what the author recognizes as a thread's
    /// beginning (the root's empty command would render as a blank line).
    private func rebuildItems() {
        itemsByNodeId = [:]
        childIds = [:]
        rootIds = []
        guard let document = session?.document else { return }

        func visit(_ node: SkeinNode) {
            itemsByNodeId[node.id] = NodeItem(id: node.id)
            childIds[node.id] = node.children.map(\.id)
            for child in node.children { visit(child) }
        }
        for child in document.root.children { visit(child) }
        rootIds = document.root.children.map(\.id)
    }

    private func expandedNodeIds() -> Set<String> {
        var ids = Set<String>()
        for row in 0..<outlineView.numberOfRows {
            if let item = outlineView.item(atRow: row) as? NodeItem,
               outlineView.isItemExpanded(item) {
                ids.insert(item.id)
            }
        }
        return ids
    }

    /// The node the author has selected, or nil.
    var selectedNodeId: String? {
        let row = outlineView.selectedRow
        guard row >= 0 else { return nil }
        return (outlineView.item(atRow: row) as? NodeItem)?.id
    }

    func setStatus(_ text: String) {
        statusLabel.stringValue = text
    }

    /// Disables the actions while the host drives a replay, so a second
    /// request cannot interleave commands into the run.
    func setBusy(_ busy: Bool) {
        isBusy = busy
        updateActionAvailability()
    }

    private var isBusy = false

    private func updateActionAvailability() {
        let hasSelection = selectedNodeId != nil
        replayButton.isEnabled = hasSelection && !isBusy
        tagButton.isEnabled = hasSelection && !isBusy
        forceButton.isEnabled = hasSelection && !isBusy
    }

    // MARK: - Actions

    @objc private func rowActivated() {
        guard !isBusy, let id = selectedNodeId else { return }
        onReplay?(id)
    }

    @objc private func replayClicked() {
        guard let id = selectedNodeId else { return }
        onReplay?(id)
    }

    @objc private func tagClicked() {
        guard let id = selectedNodeId else { return }
        onTag?(id)
    }

    @objc private func forceClicked() {
        guard let id = selectedNodeId else { return }
        onForce?(id)
    }

    override func keyDown(with event: NSEvent) {
        // Return replays the selected node — the keyboard equivalent of the
        // double-click, matching the Test panel's row-activation convention.
        if event.keyCode == 36, !isBusy, let id = selectedNodeId {
            onReplay?(id)
            return
        }
        super.keyDown(with: event)
    }
}

// MARK: - Data source / delegate

extension SkeinView: NSOutlineViewDataSource {
    func outlineView(_ outlineView: NSOutlineView, numberOfChildrenOfItem item: Any?) -> Int {
        guard let item else { return rootIds.count }
        guard let node = item as? NodeItem else { return 0 }
        return childIds[node.id]?.count ?? 0
    }

    func outlineView(_ outlineView: NSOutlineView, child index: Int, ofItem item: Any?) -> Any {
        let id: String
        if let node = item as? NodeItem {
            id = childIds[node.id]![index]
        } else {
            id = rootIds[index]
        }
        return itemsByNodeId[id]!
    }

    func outlineView(_ outlineView: NSOutlineView, isItemExpandable item: Any) -> Bool {
        guard let node = item as? NodeItem else { return false }
        return !(childIds[node.id]?.isEmpty ?? true)
    }
}

extension SkeinView: NSOutlineViewDelegate {
    func outlineView(_ outlineView: NSOutlineView, viewFor tableColumn: NSTableColumn?, item: Any) -> NSView? {
        guard let item = item as? NodeItem,
              let node = session?.document.node(withId: item.id) else { return nil }
        let field = NSTextField(labelWithAttributedString:
            Self.nodeLine(node, isCurrent: item.id == session?.currentNodeId))
        field.drawsBackground = false
        field.lineBreakMode = .byTruncatingTail
        field.maximumNumberOfLines = 1
        field.translatesAutoresizingMaskIntoConstraints = false
        return field
    }

    func outlineView(_ outlineView: NSOutlineView, heightOfRowByItem item: Any) -> CGFloat { 20 }

    func outlineViewSelectionDidChange(_ notification: Notification) {
        updateActionAvailability()
    }

    /// One node's row: where play sits, the command, then the author's marks.
    ///
    /// Badges are text rather than colour alone — the row has to survive a
    /// screenshot in a bug report, and colour-only state does not.
    static func nodeLine(_ node: SkeinNode, isCurrent: Bool) -> NSAttributedString {
        let line = NSMutableAttributedString(
            string: isCurrent ? "▶ " : "  ",
            attributes: [.foregroundColor: isCurrent ? NSColor.systemBlue : Theme.foregroundFaint,
                         .font: bodyFont])
        line.append(NSAttributedString(
            string: "> \(node.command)",
            attributes: [.foregroundColor: Theme.foreground, .font: monoFont]))

        if let blessing = node.blessing {
            let mark = blessing.scope == .allPaths ? "  ✓ all paths" : "  ✓ blessed"
            line.append(NSAttributedString(
                string: mark,
                attributes: [.foregroundColor: NSColor.systemGreen, .font: bodyFont]))
        }
        if !node.forcings.isEmpty {
            line.append(NSAttributedString(
                string: "  ⑂ \(node.forcings.joined(separator: ", "))",
                attributes: [.foregroundColor: NSColor.systemOrange, .font: bodyFont]))
        }
        if !node.tags.isEmpty {
            line.append(NSAttributedString(
                string: "  [\(node.tags.joined(separator: ", "))]",
                attributes: [.foregroundColor: Theme.foregroundDim, .font: bodyFont]))
        }
        if node.isLocked {
            line.append(NSAttributedString(
                string: "  🔒",
                attributes: [.font: bodyFont]))
        }
        if let annotation = node.annotation, !annotation.isEmpty {
            line.append(NSAttributedString(
                string: "  — \(annotation)",
                attributes: [.foregroundColor: Theme.foregroundFaint, .font: bodyFont]))
        }
        return line
    }
}
