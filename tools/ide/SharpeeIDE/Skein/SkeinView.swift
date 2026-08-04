// SkeinView.swift
// The right panel's "Skein" tab — the tree half of ADR-299 D8: the story's
// thread tree, click-to-replay (D6), the tag (D2) and force (D5) affordances,
// and D9's refinements (annotate, lock, trim). Rows render one node each: its
// command, the author's marks, and badges for blessed / forced / changed
// output / where play currently sits. Double-click (or Return) replays
// root→node and leaves the story live there; every action applies to the
// selection and round-trips through SkeinStore to disk.
// Blessing is deliberately absent — it belongs to the Transcript view, where
// the output being vouched for is readable (D8).
// Public interface: setSession(_:), reload(), selectedNodeId, onReplay, onTag,
// onForce, onAnnotate, onLock, onTrim, onSelectNode, setStatus(_:),
// setBusy(_:).
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
    /// The selection moved (nil when cleared). The Transcript view follows it —
    /// the tree picks the thread, the transcript reads it (D8).
    var onSelectNode: ((String?) -> Void)?
    /// The author asked to note something on this node (D9) — freeform, and
    /// not a thread tag.
    var onAnnotate: ((String) -> Void)?
    /// The author asked to guard (or release) this subtree from trimming (D9).
    var onLock: ((String, Bool) -> Void)?
    /// The author asked to prune this subtree (D9) — always their act, never
    /// the tool's.
    var onTrim: ((String) -> Void)?

    private let replayButton = NSButton(title: "Replay to Node", target: nil, action: nil)
    private let tagButton = NSButton(title: "Tag…", target: nil, action: nil)
    private let forceButton = NSButton(title: "Force…", target: nil, action: nil)
    private let annotateButton = NSButton(title: "Note…", target: nil, action: nil)
    private let lockButton = NSButton(title: "Lock", target: nil, action: nil)
    private let trimButton = NSButton(title: "Trim", target: nil, action: nil)
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

    /// The whole skein's findings (D4), grouped by node — what the rows'
    /// changed-output badges read (D9). Recomputed on every reload, because a
    /// bless, a replay, or a grown turn all change them.
    private var findingsByNodeId: [String: [SkeinFinding]] = [:]

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        for button in [replayButton, tagButton, forceButton,
                       annotateButton, lockButton, trimButton] {
            button.bezelStyle = .accessoryBarAction
            button.font = NSFont.systemFont(ofSize: 11)
            button.target = self
            button.isEnabled = false
            button.translatesAutoresizingMaskIntoConstraints = false
        }
        replayButton.action = #selector(replayClicked)
        tagButton.action = #selector(tagClicked)
        forceButton.action = #selector(forceClicked)
        annotateButton.action = #selector(annotateClicked)
        lockButton.action = #selector(lockClicked)
        trimButton.action = #selector(trimClicked)

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
        addSubview(annotateButton)
        addSubview(lockButton)
        addSubview(trimButton)
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

            // D9's refinements sit on their own row: the panel is narrow, and
            // six buttons across would truncate the titles the author reads.
            annotateButton.topAnchor.constraint(equalTo: replayButton.bottomAnchor, constant: 4),
            annotateButton.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            lockButton.centerYAnchor.constraint(equalTo: annotateButton.centerYAnchor),
            lockButton.leadingAnchor.constraint(equalTo: annotateButton.trailingAnchor, constant: 6),
            trimButton.centerYAnchor.constraint(equalTo: annotateButton.centerYAnchor),
            trimButton.leadingAnchor.constraint(equalTo: lockButton.trailingAnchor, constant: 6),

            statusLabel.topAnchor.constraint(equalTo: annotateButton.bottomAnchor, constant: 6),
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

        findingsByNodeId = Dictionary(grouping: session?.findings() ?? [], by: \.nodeId)
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
        let selectedNode = selectedNodeId.flatMap { session?.document.node(withId: $0) }
        let hasSelection = selectedNode != nil
        for button in [replayButton, tagButton, forceButton, annotateButton, lockButton, trimButton] {
            button.isEnabled = hasSelection && !isBusy
        }
        // The lock action says what it will DO, so the author never has to
        // infer the current state from a pressed-looking button.
        lockButton.title = (selectedNode?.isLocked ?? false) ? "Unlock" : "Lock"
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

    @objc private func annotateClicked() {
        guard let id = selectedNodeId else { return }
        onAnnotate?(id)
    }

    @objc private func lockClicked() {
        guard let id = selectedNodeId, let node = session?.document.node(withId: id) else { return }
        onLock?(id, !node.isLocked)
    }

    @objc private func trimClicked() {
        guard let id = selectedNodeId else { return }
        onTrim?(id)
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
            Self.nodeLine(node,
                          isCurrent: item.id == session?.currentNodeId,
                          findings: findingsByNodeId[item.id] ?? []))
        field.drawsBackground = false
        field.lineBreakMode = .byTruncatingTail
        field.maximumNumberOfLines = 1
        field.translatesAutoresizingMaskIntoConstraints = false
        return field
    }

    func outlineView(_ outlineView: NSOutlineView, heightOfRowByItem item: Any) -> CGFloat { 20 }

    func outlineViewSelectionDidChange(_ notification: Notification) {
        updateActionAvailability()
        onSelectNode?(selectedNodeId)
    }

    /// One node's row: where play sits, the command, then the author's marks
    /// and the skein's objections.
    ///
    /// Badges are text rather than colour alone — the row has to survive a
    /// screenshot in a bug report, and colour-only state does not.
    ///
    /// - Parameters:
    ///   - node: the node to render.
    ///   - isCurrent: whether play sits here.
    ///   - findings: verification's objections to this node (D4), badged here
    ///     as D9's changed-output marker. The detail lives in the Transcript
    ///     view, where the two texts are readable — a tree row says only that
    ///     there is something to read.
    static func nodeLine(_ node: SkeinNode,
                         isCurrent: Bool,
                         findings: [SkeinFinding] = []) -> NSAttributedString {
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
        // An objection outranks the approval it contradicts, so it is drawn
        // right after it rather than at the end of the marks.
        if !findings.isEmpty {
            let violatesClaim = findings.contains {
                if case .invarianceViolated = $0.kind { return true }
                return false
            }
            line.append(NSAttributedString(
                string: violatesClaim ? "  ⚠ all-paths" : "  ⚠ changed",
                attributes: [.foregroundColor: NSColor.systemRed, .font: bodyFont]))
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
        // The origin slot D10 reserves. Nothing sets `.explorer` until
        // `@sharpee/skein` ships, so this never draws today — the slot exists
        // so an adopted thread needs no row change, NOT as adoption UI.
        if node.origin == .explorer {
            line.append(NSAttributedString(
                string: "  ⟐ explorer",
                attributes: [.foregroundColor: Theme.foregroundDim, .font: bodyFont]))
        }
        if let annotation = node.annotation, !annotation.isEmpty {
            line.append(NSAttributedString(
                string: "  — \(annotation)",
                attributes: [.foregroundColor: Theme.foregroundFaint, .font: bodyFont]))
        }
        return line
    }
}
