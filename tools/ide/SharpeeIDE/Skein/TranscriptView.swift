// TranscriptView.swift
// The right panel's "Transcript" tab — the reading half of ADR-299 D8: the
// selected thread linearized root→node as prose, one block per node, and the
// place blessing happens ("blessing is a reading activity" — the tree shows
// shape, this shows text, and you cannot vouch for text you cannot read).
//
// Each block carries the command, what the story prints NOW (this boot's
// observation, else the stored capture), and — when they disagree — the text
// that was blessed, so actual-vs-blessed is on the page rather than in a
// tooltip. Verification findings (D4) render inside the block they belong to
// and are counted in the header: a violated claim is a first-class objection,
// not a coloured line.
//
// Bless is three explicit acts, never a toggle with a hidden mode: "Bless"
// (this thread), "Bless for All Paths" (the invariance claim, D4), "Unbless".
// Public interface: setSession(_:), show(threadTo:), reload(), selectedNodeId,
// onBless, onUnbless, onExport, setStatus(_:), setBusy(_:), findings.
// Owner context: tools/ide — Skein (transcript surface).

import AppKit

final class TranscriptView: NSView {

    /// The author vouched for a node's current output at the given scope (D4).
    var onBless: ((String, SkeinBlessing.Scope) -> Void)?
    /// The author withdrew a node's blessing (D1 — no negative verdict).
    var onUnbless: ((String) -> Void)?
    /// The author asked to mint this thread as a golden transcript (D7).
    var onExport: ((String) -> Void)?

    private let blessButton = NSButton(title: "Bless", target: nil, action: nil)
    private let blessAllButton = NSButton(title: "Bless for All Paths", target: nil, action: nil)
    private let unblessButton = NSButton(title: "Unbless", target: nil, action: nil)
    private let exportButton = NSButton(title: "Save Thread as Test…", target: nil, action: nil)
    private let statusLabel = NSTextField(labelWithString: "")
    private let scrollView = NSScrollView()
    private let tableView = NSTableView()
    private let emptyLabel = NSTextField(
        labelWithString: "Select a node in the Skein — its thread reads here")

    private static let bodyFont = NSFont.systemFont(ofSize: 11.5)
    private static let monoFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)
    private static let horizontalInset: CGFloat = 12
    private static let verticalInset: CGFloat = 8

    private weak var session: SkeinSession?

    /// The thread on the page, root→terminal. Empty when nothing is selected.
    private var nodes: [SkeinNode] = []

    /// The terminal node of the thread being shown, or nil.
    private(set) var threadNodeId: String?

    /// The findings for the thread on the page (D4), recomputed on every
    /// reload — the header's count and the per-block objections read this.
    private(set) var findings: [SkeinFinding] = []

    private var findingsByNodeId: [String: [SkeinFinding]] = [:]

    /// The width the visible rows were measured at, so a resize can invalidate
    /// heights exactly when it needs to (wrapped prose reflows; the table would
    /// otherwise keep the old row heights and clip).
    private var measuredWidth: CGFloat = 0

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        for button in [blessButton, blessAllButton, unblessButton, exportButton] {
            button.bezelStyle = .accessoryBarAction
            button.font = NSFont.systemFont(ofSize: 11)
            button.target = self
            button.isEnabled = false
            button.translatesAutoresizingMaskIntoConstraints = false
        }
        blessButton.action = #selector(blessClicked)
        blessAllButton.action = #selector(blessAllPathsClicked)
        unblessButton.action = #selector(unblessClicked)
        exportButton.action = #selector(exportClicked)

        statusLabel.font = NSFont.systemFont(ofSize: 11)
        statusLabel.textColor = Theme.foregroundDim
        statusLabel.lineBreakMode = .byTruncatingTail
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("transcript"))
        column.resizingMask = .autoresizingMask
        tableView.addTableColumn(column)
        tableView.headerView = nil
        tableView.backgroundColor = .clear
        tableView.usesAlternatingRowBackgroundColors = false
        // AppKit re-standardizes row metrics unless the style is .custom — the
        // same fix SkeinView and the directory pane carry.
        tableView.rowSizeStyle = .custom
        tableView.intercellSpacing = NSSize(width: 0, height: 4)
        tableView.dataSource = self
        tableView.delegate = self

        scrollView.documentView = tableView
        scrollView.hasVerticalScroller = true
        scrollView.drawsBackground = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false

        emptyLabel.font = NSFont.systemFont(ofSize: 11)
        emptyLabel.textColor = Theme.foregroundFaint
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false

        addSubview(blessButton)
        addSubview(blessAllButton)
        addSubview(unblessButton)
        addSubview(exportButton)
        addSubview(statusLabel)
        addSubview(scrollView)
        addSubview(emptyLabel)

        NSLayoutConstraint.activate([
            blessButton.topAnchor.constraint(equalTo: topAnchor, constant: 6),
            blessButton.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            blessAllButton.centerYAnchor.constraint(equalTo: blessButton.centerYAnchor),
            blessAllButton.leadingAnchor.constraint(equalTo: blessButton.trailingAnchor, constant: 6),
            unblessButton.centerYAnchor.constraint(equalTo: blessButton.centerYAnchor),
            unblessButton.leadingAnchor.constraint(equalTo: blessAllButton.trailingAnchor, constant: 6),

            // Minting a test is a different kind of act from judging text —
            // it leaves the skein — so it sits on its own row rather than
            // reading as a fourth verdict.
            exportButton.topAnchor.constraint(equalTo: blessButton.bottomAnchor, constant: 4),
            exportButton.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),

            statusLabel.topAnchor.constraint(equalTo: exportButton.bottomAnchor, constant: 6),
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
    /// loaded) and clears the thread on the page — a thread from the previous
    /// story is not a thread in this one.
    func setSession(_ session: SkeinSession?) {
        self.session = session
        threadNodeId = nil
        reload()
    }

    /// Reads the thread ending at `nodeId`. Passing nil clears the page.
    func show(threadTo nodeId: String?) {
        threadNodeId = nodeId
        reload()
    }

    /// Rebuilds the page from the session's document plus this boot's observed
    /// outputs, re-running verification (D4) — so growing or replaying a thread
    /// updates both the prose and the objections without a separate refresh.
    ///
    /// The selected row is preserved by node id when its node survives.
    func reload() {
        let selected = selectedNodeId

        if let threadNodeId, let thread = session?.document.thread(to: threadNodeId) {
            nodes = thread.nodes
            findings = session?.findings(forThreadTo: threadNodeId) ?? []
        } else {
            nodes = []
            findings = []
        }
        findingsByNodeId = Dictionary(grouping: findings, by: \.nodeId)

        measuredWidth = 0 // heights are recomputed against the current width
        tableView.reloadData()

        if let selected, let row = nodes.firstIndex(where: { $0.id == selected }) {
            tableView.selectRowIndexes(IndexSet(integer: row), byExtendingSelection: false)
        }
        emptyLabel.isHidden = !nodes.isEmpty
        statusLabel.stringValue = Self.headline(nodeCount: nodes.count, findings: findings)
        updateActionAvailability()
    }

    /// The header line: what is on the page, and whether the skein has an
    /// objection to it. Findings are counted here rather than only rendered
    /// inline, so a violated claim is visible without scrolling to it.
    static func headline(nodeCount: Int, findings: [SkeinFinding]) -> String {
        guard nodeCount > 0 else { return "" }
        let turns = "\(nodeCount) node\(nodeCount == 1 ? "" : "s")"
        guard !findings.isEmpty else { return "\(turns) — no findings." }
        return "\(turns) — ⚠ \(findings.count) finding\(findings.count == 1 ? "" : "s")."
    }

    /// The node whose block the author has selected, or nil.
    var selectedNodeId: String? {
        let row = tableView.selectedRow
        guard row >= 0, row < nodes.count else { return nil }
        return nodes[row].id
    }

    func setStatus(_ text: String) {
        statusLabel.stringValue = text
    }

    /// Disables blessing while the host drives the surface (a replay in
    /// flight), so a vouch cannot be recorded against text that is mid-change.
    func setBusy(_ busy: Bool) {
        isBusy = busy
        updateActionAvailability()
    }

    private var isBusy = false

    private func updateActionAvailability() {
        let selected = selectedNodeId
        let isBlessed = selected.flatMap { id in nodes.first(where: { $0.id == id })?.blessing } != nil
        blessButton.isEnabled = selected != nil && !isBusy
        blessAllButton.isEnabled = selected != nil && !isBusy
        unblessButton.isEnabled = isBlessed && !isBusy
        // Export follows the THREAD, not the selection: a test is minted from
        // the whole thread on the page, and it needs at least one blessing to
        // assert anything (D7). Disabled says so before the save panel does.
        exportButton.isEnabled = canExportThread && !isBusy
    }

    /// Whether the thread on the page carries an assertion to mint (D7).
    var canExportThread: Bool {
        guard let session, let threadNodeId else { return false }
        return SkeinExporter.canExport(document: session.document, toNodeId: threadNodeId)
    }

    // MARK: - Actions

    @objc private func blessClicked() {
        guard let id = selectedNodeId else { return }
        onBless?(id, .thisThread)
    }

    @objc private func blessAllPathsClicked() {
        guard let id = selectedNodeId else { return }
        onBless?(id, .allPaths)
    }

    @objc private func unblessClicked() {
        guard let id = selectedNodeId else { return }
        onUnbless?(id)
    }

    @objc private func exportClicked() {
        guard let threadNodeId else { return }
        onExport?(threadNodeId)
    }

    // MARK: - Layout

    override func layout() {
        super.layout()
        let width = textWidth()
        guard width > 0, width != measuredWidth, !nodes.isEmpty else { return }
        measuredWidth = width
        tableView.noteHeightOfRows(withIndexesChanged: IndexSet(integersIn: 0..<nodes.count))
    }

    /// The width prose wraps at: the table's column less the block's own inset.
    private func textWidth() -> CGFloat {
        max(80, tableView.bounds.width - Self.horizontalInset * 2)
    }

    // MARK: - Rendering

    /// One node's block: the command, what it prints now, any objection to it,
    /// and the blessed text when the two disagree.
    ///
    /// Static and pure so the composition is unit-testable without a window —
    /// what a block says is the surface's contract, not a drawing detail.
    ///
    /// - Parameters:
    ///   - node: the node to render.
    ///   - actual: what it prints now (this boot's observation, else stored).
    ///   - findings: the objections against this node.
    static func block(_ node: SkeinNode,
                      actual: String,
                      findings: [SkeinFinding]) -> NSAttributedString {
        let text = NSMutableAttributedString()

        // The story start is not a typed command; labelling it as one would
        // read as an author action that never happened.
        let heading = node.command.isEmpty ? "(story start)" : "> \(node.command)"
        text.append(NSAttributedString(
            string: heading,
            attributes: [.foregroundColor: Theme.foreground, .font: monoFont]))

        if let blessing = node.blessing {
            text.append(NSAttributedString(
                string: blessing.scope == .allPaths ? "   ✓ blessed for all paths" : "   ✓ blessed",
                attributes: [.foregroundColor: NSColor.systemGreen, .font: bodyFont]))
        }
        if !node.forcings.isEmpty {
            text.append(NSAttributedString(
                string: "   ⑂ \(node.forcings.joined(separator: ", "))",
                attributes: [.foregroundColor: NSColor.systemOrange, .font: bodyFont]))
        }

        text.append(NSAttributedString(
            string: "\n\(actual.isEmpty ? "(no output)" : actual)\n",
            attributes: [.foregroundColor: Theme.foregroundDim, .font: bodyFont]))

        for finding in findings {
            text.append(NSAttributedString(
                string: "\n⚠ \(finding.summary)\n",
                attributes: [.foregroundColor: NSColor.systemRed, .font: bodyFont]))
            text.append(NSAttributedString(
                string: "blessed instead:\n\(finding.blessed)\n",
                attributes: [.foregroundColor: Theme.foregroundFaint, .font: bodyFont]))
        }
        return text
    }
}

// MARK: - Data source / delegate

extension TranscriptView: NSTableViewDataSource {
    func numberOfRows(in tableView: NSTableView) -> Int { nodes.count }
}

extension TranscriptView: NSTableViewDelegate {

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        guard row < nodes.count else { return nil }
        let container = NSView()
        let field = NSTextField(labelWithAttributedString: attributedBlock(forRow: row))
        field.drawsBackground = false
        field.lineBreakMode = .byWordWrapping
        field.maximumNumberOfLines = 0
        field.preferredMaxLayoutWidth = textWidth()
        field.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(field)
        NSLayoutConstraint.activate([
            field.topAnchor.constraint(equalTo: container.topAnchor, constant: Self.verticalInset / 2),
            field.leadingAnchor.constraint(equalTo: container.leadingAnchor,
                                           constant: Self.horizontalInset),
            field.trailingAnchor.constraint(equalTo: container.trailingAnchor,
                                            constant: -Self.horizontalInset),
        ])
        return container
    }

    func tableView(_ tableView: NSTableView, heightOfRow row: Int) -> CGFloat {
        guard row < nodes.count else { return 20 }
        let bounds = attributedBlock(forRow: row).boundingRect(
            with: NSSize(width: textWidth(), height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading])
        return ceil(bounds.height) + Self.verticalInset
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        updateActionAvailability()
    }

    private func attributedBlock(forRow row: Int) -> NSAttributedString {
        let node = nodes[row]
        return Self.block(node,
                          actual: session?.actualOutput(forNodeId: node.id) ?? node.output,
                          findings: findingsByNodeId[node.id] ?? [])
    }
}
