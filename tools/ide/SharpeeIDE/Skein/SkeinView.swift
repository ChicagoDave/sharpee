// SkeinView.swift
// The tree half of ADR-299 D8, mounted as the top pane of `SkeinPaneView`: the
// story's thread tree, click-to-replay (D6), the tag (D2) and force (D5)
// affordances, and D9's refinements (annotate, lock, trim).
//
// Rows are TWO lines: the command and the author's marks above, a dimmed
// preview of what that node printed below. A skein's commands repeat — four
// sibling threads all reading `> north` are indistinguishable by command alone
// — so the preview is what makes a row identifiable, not decoration.
//
// Replay is the one button; everything else lives on the row's context menu.
// Six buttons across a side pane were six disabled controls whenever nothing
// was selected, and the actions belong where the node is.
//
// Double-click (or Return) replays root→node and leaves the story live there;
// every action applies to the clicked (else selected) row and round-trips
// through SkeinStore to disk. Blessing is deliberately absent — it belongs to
// the transcript beneath, where the output being vouched for is readable (D8).
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
    private let statusLabel = NSTextField(labelWithString: "")
    private let scrollView = NSScrollView()
    private let canvas = SkeinBranchCanvas()
    private let emptyLabel = NSTextField(
        labelWithString: "Play the story (⌘B, then type) — every turn grows the skein")

    /// The row actions, on the rows themselves. `lockItem` is retained because
    /// its title states what it will DO, which depends on the row clicked.
    private let contextMenu = NSMenu()
    private var lockItem = NSMenuItem()

    private static let bodyFont = NSFont.systemFont(ofSize: 11.5)
    private static let monoFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)
    private static let previewFont = NSFont.systemFont(ofSize: 10.5)

    /// A row's height: two lines plus breathing room. One line could not carry
    /// the output preview, and the preview is what tells two `> north` rows
    /// apart.
    static let rowHeight: CGFloat = 34

    /// The document under the tree. Weak: the Play pane owns the live session,
    /// and a file-opened one is owned by the right panel (`openedSkein`).
    private(set) weak var session: SkeinSession?

    /// The whole skein's findings (D4), grouped by node — what the rows'
    /// changed-output badges read (D9). Recomputed on every reload, because a
    /// bless, a replay, or a grown turn all change them.
    private var findingsByNodeId: [String: [SkeinFinding]] = [:]

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        replayButton.bezelStyle = .accessoryBarAction
        replayButton.font = NSFont.systemFont(ofSize: 11)
        replayButton.target = self
        replayButton.isEnabled = false
        replayButton.translatesAutoresizingMaskIntoConstraints = false
        replayButton.action = #selector(replayClicked)

        buildContextMenu()

        statusLabel.font = NSFont.systemFont(ofSize: 11)
        statusLabel.textColor = Theme.foregroundDim
        statusLabel.lineBreakMode = .byTruncatingTail
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        canvas.onSelect = { [weak self] id in
            self?.updateActionAvailability()
            self?.onSelectNode?(id)
        }
        canvas.onActivate = { [weak self] id in
            guard let self, !self.isBusy else { return }
            self.onReplay?(id)
        }
        canvas.menu = contextMenu

        scrollView.documentView = canvas
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = true
        scrollView.drawsBackground = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false

        emptyLabel.font = NSFont.systemFont(ofSize: 11)
        emptyLabel.textColor = Theme.foregroundFaint
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false

        addSubview(replayButton)
        addSubview(statusLabel)
        addSubview(scrollView)
        addSubview(emptyLabel)

        NSLayoutConstraint.activate([
            // One button, one row. The other five actions are on the rows'
            // context menu, where the node they act on is.
            replayButton.topAnchor.constraint(equalTo: topAnchor, constant: 6),
            replayButton.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),

            statusLabel.centerYAnchor.constraint(equalTo: replayButton.centerYAnchor),
            statusLabel.leadingAnchor.constraint(equalTo: replayButton.trailingAnchor, constant: 10),
            statusLabel.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -8),

            scrollView.topAnchor.constraint(equalTo: replayButton.bottomAnchor, constant: 6),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

            // Centred, not pinned near the top: an empty skein is the whole
            // pane's state, and a line hugging the top edge read as a stray
            // label rather than an explanation.
            emptyLabel.centerXAnchor.constraint(equalTo: scrollView.centerXAnchor),
            emptyLabel.centerYAnchor.constraint(equalTo: scrollView.centerYAnchor),
            emptyLabel.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 12),
            emptyLabel.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -12),
        ])
    }

    /// Builds the row context menu once. Items carry no state of their own —
    /// `menuNeedsUpdate` re-points them at whichever row was clicked.
    private func buildContextMenu() {
        contextMenu.delegate = self
        contextMenu.autoenablesItems = false
        func item(_ title: String, _ action: Selector) -> NSMenuItem {
            let menuItem = NSMenuItem(title: title, action: action, keyEquivalent: "")
            menuItem.target = self
            contextMenu.addItem(menuItem)
            return menuItem
        }
        _ = item("Replay to Node", #selector(replayClicked))
        contextMenu.addItem(.separator())
        _ = item("Tag Thread…", #selector(tagClicked))
        _ = item("Force…", #selector(forceClicked))
        _ = item("Note…", #selector(annotateClicked))
        contextMenu.addItem(.separator())
        lockItem = item("Lock", #selector(lockClicked))
        _ = item("Trim…", #selector(trimClicked))
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
        findingsByNodeId = Dictionary(grouping: session?.findings() ?? [], by: \.nodeId)
        canvas.setContent(document: session?.document,
                          currentNodeId: session?.currentNodeId,
                          findings: findingsByNodeId)
        emptyLabel.isHidden = !canvas.isEmpty
        scrollView.isHidden = canvas.isEmpty
        updateActionAvailability()
    }

    /// The node the author has selected, or nil.
    var selectedNodeId: String? { canvas.selectedNodeId }

    /// Selects the badge for `nodeId` and scrolls it into view.
    ///
    /// - Returns: true when the node is in the skein; false selects nothing.
    @discardableResult
    func select(nodeId: String) -> Bool {
        guard canvas.select(nodeId: nodeId) else { return false }
        if let frame = canvas.badgeFrame(forNodeId: nodeId) {
            canvas.scrollToVisible(frame.insetBy(dx: -20, dy: -20))
        }
        updateActionAvailability()
        return true
    }

    /// Clears the selection. The surface then re-derives which branch to read
    /// from where the session sits, so this means "let the position decide",
    /// not "show nothing".
    func deselect() {
        canvas.deselect()
        updateActionAvailability()
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
        replayButton.isEnabled = selectedNodeId != nil && !isBusy
    }

    // MARK: - Actions

    /// The node an action applies to. Right-clicking a badge selects it first
    /// (see `SkeinBranchCanvas.menu(for:)`), so the menu and the highlight can
    /// never name different nodes.
    private var targetNodeId: String? { selectedNodeId }

    @objc private func replayClicked() {
        guard !isBusy, let id = targetNodeId else { return }
        onReplay?(id)
    }

    @objc private func tagClicked() {
        guard let id = targetNodeId else { return }
        onTag?(id)
    }

    @objc private func forceClicked() {
        guard let id = targetNodeId else { return }
        onForce?(id)
    }

    @objc private func annotateClicked() {
        guard let id = targetNodeId else { return }
        onAnnotate?(id)
    }

    @objc private func lockClicked() {
        guard let id = targetNodeId, let node = session?.document.node(withId: id) else { return }
        onLock?(id, !node.isLocked)
    }

    @objc private func trimClicked() {
        guard let id = targetNodeId else { return }
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

// MARK: - Row context menu

extension SkeinView: NSMenuDelegate {

    /// Re-points the menu at the row it is about to open over: everything is
    /// disabled when there is no such row (or a replay is in flight), and the
    /// lock item states what it will do to THAT node.
    func menuNeedsUpdate(_ menu: NSMenu) {
        let node = targetNodeId.flatMap { session?.document.node(withId: $0) }
        for item in menu.items where !item.isSeparatorItem {
            item.isEnabled = node != nil && !isBusy
        }
        lockItem.title = (node?.isLocked ?? false) ? "Unlock" : "Lock"
    }
}

extension SkeinView {

    /// The first line of `output`, collapsed to one line and clipped, as a row's
    /// preview reads it. Empty output yields an explicit placeholder rather than
    /// a blank second line, so "this node has never captured anything" (a
    /// freshly-forced sibling, D5) is legible as a state instead of a gap.
    ///
    /// - Parameters:
    ///   - output: the node's text.
    ///   - limit: how many characters survive before an ellipsis.
    static func preview(of output: String, limit: Int = 90) -> String {
        let firstLine = output
            .split(whereSeparator: \.isNewline)
            .first { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
            .map { $0.trimmingCharacters(in: .whitespaces) } ?? ""
        guard !firstLine.isEmpty else { return "(not yet captured)" }
        guard firstLine.count > limit else { return firstLine }
        return String(firstLine.prefix(limit)) + "…"
    }

}
