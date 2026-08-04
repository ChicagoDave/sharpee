// SkeinBranchCanvas.swift
// Draws SkeinBranchLayout's grid: branches as side-by-side columns of capsule
// command badges, connected top to bottom, with the blessing state carried as
// the badge's fill (plain unblessed, green blessed, red when the blessing no
// longer holds — David's ruling).
//
// This replaces the outline view the tab used to show. A disclosure-triangle
// tree said "> > north" and made every branch look like a fold of the one
// above it; branches are the unit the author reasons about, so they get
// columns.
//
// Clicking a badge selects it; double-clicking activates it (replay). Right
// clicking targets the badge under the cursor.
// Public interface: SkeinBranchCanvas (setContent(_:), selectedNodeId,
// select(nodeId:), deselect(), onSelect, onActivate, badgeFrame(forNodeId:)).
// Owner context: tools/ide — Skein (branch canvas).

import AppKit

final class SkeinBranchCanvas: NSView, NSViewToolTipOwner {

    /// The badge the author clicked (nil when they clicked empty canvas).
    var onSelect: ((String?) -> Void)?
    /// The badge the author double-clicked — replay to it.
    var onActivate: ((String) -> Void)?

    private static let badgeHeight: CGFloat = 22
    private static let rowPitch: CGFloat = 34
    private static let columnGap: CGFloat = 18
    private static let badgePadding: CGFloat = 11
    private static let margin: CGFloat = 12
    private static let font = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)

    private var branches: [SkeinBranchLayout.Branch] = []
    private var document: SkeinDocument?
    private var currentNodeId: String?
    private var findingsByNodeId: [String: [SkeinFinding]] = [:]

    /// Badge frames in view coordinates, by node id per column — the drawing
    /// and the hit testing read the same table, so a badge can never be drawn
    /// somewhere it cannot be clicked.
    private var frames: [(badge: SkeinBranchLayout.Badge, rect: NSRect)] = []

    private(set) var selectedNodeId: String?

    override var isFlipped: Bool { true }

    /// What a badge's fill says about its node. The fill is the ONLY thing that
    /// says it — there is no glyph or caption restating the state.
    enum BadgeState: Equatable {
        /// Nobody has vouched for this node. Plain: ordinary, not a verdict.
        case plain
        /// Blessed, and what it prints still matches.
        case blessed
        /// Blessed, but the node no longer prints what was vouched for (D9).
        case changed
        /// An all-paths claim declared elsewhere is false here (D4). A broken
        /// cross-thread claim is not the same objection as a changed output,
        /// and the row used to name the difference in words.
        case claimBroken

        var fill: NSColor {
            switch self {
            case .plain: return Theme.projectBackground
            case .blessed: return NSColor.systemGreen.withAlphaComponent(0.22)
            case .changed: return NSColor.systemOrange.withAlphaComponent(0.22)
            case .claimBroken: return NSColor.systemRed.withAlphaComponent(0.20)
            }
        }
    }

    /// A badge's state. Pure, so what the panel says is testable without a
    /// window.
    ///
    /// - Parameters:
    ///   - node: the node the badge stands for.
    ///   - findings: verification's objections against it.
    static func state(for node: SkeinNode, findings: [SkeinFinding]) -> BadgeState {
        if findings.contains(where: {
            if case .invarianceViolated = $0.kind { return true }
            return false
        }) {
            return .claimBroken
        }
        if !findings.isEmpty { return .changed }
        return node.blessing == nil ? .plain : .blessed
    }

    // MARK: - Content

    /// Points the canvas at a document and repaints.
    ///
    /// - Parameters:
    ///   - document: the skein, or nil for none.
    ///   - currentNodeId: where play sits, marked distinctly.
    ///   - findings: verification's objections, keyed by node.
    func setContent(document: SkeinDocument?,
                    currentNodeId: String?,
                    findings: [String: [SkeinFinding]]) {
        self.document = document
        self.currentNodeId = currentNodeId
        self.findingsByNodeId = findings
        branches = document.map(SkeinBranchLayout.branches(in:)) ?? []
        if let selectedNodeId, document?.node(withId: selectedNodeId) == nil {
            self.selectedNodeId = nil
        }
        rebuildFrames()
        needsDisplay = true
    }

    /// True when there is nothing to draw — the caller shows its empty state.
    var isEmpty: Bool { branches.isEmpty }

    @discardableResult
    func select(nodeId: String) -> Bool {
        guard SkeinBranchLayout.badge(forNodeId: nodeId, in: branches) != nil else { return false }
        selectedNodeId = nodeId
        needsDisplay = true
        return true
    }

    func deselect() {
        selectedNodeId = nil
        needsDisplay = true
    }

    /// The badge's frame, for scrolling it into view. Nil when not laid out.
    func badgeFrame(forNodeId nodeId: String) -> NSRect? {
        frames.first { $0.badge.nodeId == nodeId }?.rect
    }

    // MARK: - Layout

    private func rebuildFrames() {
        frames = []
        var x = Self.margin
        for branch in branches {
            let width = columnWidth(branch)
            for badge in branch.badges {
                let size = badgeSize(for: badge)
                let rect = NSRect(x: x,
                                  y: Self.margin + CGFloat(badge.depth) * Self.rowPitch,
                                  width: size,
                                  height: Self.badgeHeight)
                frames.append((badge, rect))
            }
            x += width + Self.columnGap
        }
        invalidateIntrinsicContentSize()
        // The canvas sizes to its content; the scroll view does the rest.
        setFrameSize(intrinsicContentSize)

        // A badge shows only the command, and commands repeat all over a skein.
        // Hovering answers "which `north` is this one" without a click.
        removeAllToolTips()
        for (_, rect) in frames {
            addToolTip(rect, owner: self, userData: nil)
        }
    }

    func view(_ view: NSView,
              stringForToolTip tag: NSView.ToolTipTag,
              point: NSPoint,
              userData data: UnsafeMutableRawPointer?) -> String {
        guard let badge = badge(at: point),
              let node = document?.node(withId: badge.nodeId) else { return "" }
        return SkeinView.preview(of: node.output, limit: 160)
    }

    private func badgeSize(for badge: SkeinBranchLayout.Badge) -> CGFloat {
        let text = badge.command as NSString
        let width = text.size(withAttributes: [.font: Self.font]).width
        return ceil(width) + Self.badgePadding * 2
    }

    private func columnWidth(_ branch: SkeinBranchLayout.Branch) -> CGFloat {
        branch.badges.map(badgeSize(for:)).max() ?? 0
    }

    override var intrinsicContentSize: NSSize {
        guard !frames.isEmpty else { return NSSize(width: 1, height: 1) }
        let maxX = frames.map { $0.rect.maxX }.max() ?? 0
        let maxY = frames.map { $0.rect.maxY }.max() ?? 0
        return NSSize(width: maxX + Self.margin, height: maxY + Self.margin)
    }

    // MARK: - Drawing

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)

        // Connectors first, so badges sit on top of their own lines.
        Theme.border.setStroke()
        for branch in branches {
            let column = frames.filter { $0.badge.column == branch.column }
                .sorted { $0.badge.depth < $1.badge.depth }
            for (above, below) in zip(column, column.dropFirst()) {
                let path = NSBezierPath()
                path.move(to: NSPoint(x: above.rect.minX + 10, y: above.rect.maxY))
                path.line(to: NSPoint(x: below.rect.minX + 10, y: below.rect.minY))
                path.lineWidth = 1
                path.stroke()
            }
        }

        for (badge, rect) in frames {
            draw(badge, in: rect)
        }
    }

    private func draw(_ badge: SkeinBranchLayout.Badge, in rect: NSRect) {
        guard let node = document?.node(withId: badge.nodeId) else { return }
        let findings = findingsByNodeId[badge.nodeId] ?? []

        let capsule = NSBezierPath(roundedRect: rect,
                                   xRadius: rect.height / 2,
                                   yRadius: rect.height / 2)
        Self.state(for: node, findings: findings).fill.setFill()
        capsule.fill()

        // D10's reserved slot: a machine-proposed thread draws dashed until the
        // author adopts it. Nothing sets `.explorer` until `@sharpee/skein`
        // ships, so this never draws today — the slot exists so an adopted
        // branch needs no badge change, NOT as adoption UI.
        if node.origin == .explorer {
            capsule.setLineDash([3, 2], count: 2, phase: 0)
        }

        if badge.nodeId == selectedNodeId {
            Theme.accent.setStroke()
            capsule.lineWidth = 2
            capsule.stroke()
        } else if badge.nodeId == currentNodeId {
            // Where play sits: a ring, not a fill — the fill is spoken for.
            NSColor.systemBlue.setStroke()
            capsule.lineWidth = 1.5
            capsule.stroke()
        } else {
            Theme.border.setStroke()
            capsule.lineWidth = 1
            capsule.stroke()
        }

        let text = badge.command as NSString
        let attributes: [NSAttributedString.Key: Any] = [
            .font: Self.font,
            .foregroundColor: Theme.foreground,
        ]
        let size = text.size(withAttributes: attributes)
        text.draw(at: NSPoint(x: rect.minX + Self.badgePadding,
                              y: rect.midY - size.height / 2),
                  withAttributes: attributes)
    }

    // MARK: - Hit testing

    private func badge(at point: NSPoint) -> SkeinBranchLayout.Badge? {
        frames.first { $0.rect.contains(point) }?.badge
    }

    override func mouseDown(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        let hit = badge(at: point)
        selectedNodeId = hit?.nodeId
        needsDisplay = true
        onSelect?(selectedNodeId)
        if event.clickCount >= 2, let hit {
            onActivate?(hit.nodeId)
        }
    }

    /// Right-clicking targets the badge under the cursor and selects it, so the
    /// menu and the highlight can never name different nodes.
    override func menu(for event: NSEvent) -> NSMenu? {
        let point = convert(event.locationInWindow, from: nil)
        if let hit = badge(at: point) {
            selectedNodeId = hit.nodeId
            needsDisplay = true
            onSelect?(selectedNodeId)
        }
        return super.menu(for: event)
    }
}
