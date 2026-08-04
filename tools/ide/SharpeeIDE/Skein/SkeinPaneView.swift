// SkeinPaneView.swift
// The right panel's "Skein" tab: ADR-299 D8's two halves as one surface — the
// thread tree above, the selected thread's transcript below, split by a
// draggable divider.
//
// They shipped as sibling TABS, which made reading a thread a loop of
// select → switch tab → read → switch back, and left the tree showing shape
// with no content while the transcript's empty state said "Select a node in the
// Skein". D8 calls them sibling views; siblings belong beside each other, not
// behind one another. Selecting a node now shows its text immediately, which is
// also what makes blessing "a reading activity" true on screen.
//
// The divider's position is the author's, and persists across launches.
// Public interface: SkeinPaneView (tree, transcript, focusTranscript()).
// Owner context: tools/ide — Skein (tab container).

import AppKit

final class SkeinPaneView: NSView {

    /// The tree half (top) — shape, replay, and D9's refinements.
    let tree = SkeinView()
    /// The reading half (bottom) — the selected thread as prose, and blessing.
    let transcript = TranscriptView()

    private let splitView = NSSplitView()

    /// The tree's share of the pane's height. The tree is the smaller half by
    /// default: a skein is a handful of short rows, while the text it points at
    /// is what the author actually reads.
    private static let defaultTreeFraction: CGFloat = 0.42
    private static let treeFractionKey = "SharpeeIDESkeinPaneTreeFraction"
    private static let minimumHalfHeight: CGFloat = 80

    /// False until a layout with real height has placed the divider — the
    /// fraction cannot be applied to a zero-height view.
    private var didPlaceDivider = false

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        splitView.isVertical = false
        splitView.dividerStyle = .thin
        splitView.delegate = self
        splitView.translatesAutoresizingMaskIntoConstraints = false
        splitView.addArrangedSubview(tree)
        splitView.addArrangedSubview(transcript)
        addSubview(splitView)

        NSLayoutConstraint.activate([
            splitView.topAnchor.constraint(equalTo: topAnchor),
            splitView.leadingAnchor.constraint(equalTo: leadingAnchor),
            splitView.trailingAnchor.constraint(equalTo: trailingAnchor),
            splitView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layout() {
        super.layout()
        guard !didPlaceDivider, bounds.height > Self.minimumHalfHeight * 2 else { return }
        didPlaceDivider = true
        splitView.setPosition(bounds.height * storedTreeFraction, ofDividerAt: 0)
    }

    /// Puts the keyboard on the transcript half — where a replay's findings are
    /// readable, so "go look at the objection" lands on the objection.
    func focusTranscript() {
        window?.makeFirstResponder(transcript)
    }

    // MARK: - Divider persistence

    private var storedTreeFraction: CGFloat {
        let stored = UserDefaults.standard.double(forKey: Self.treeFractionKey)
        // A stored 0 means "never set" and an out-of-range one means a resize
        // race wrote nonsense; both fall back rather than collapsing a half.
        guard stored > 0.1, stored < 0.9 else { return Self.defaultTreeFraction }
        return CGFloat(stored)
    }

    private func persistTreeFraction() {
        guard bounds.height > 0 else { return }
        UserDefaults.standard.set(Double(tree.frame.height / bounds.height),
                                  forKey: Self.treeFractionKey)
    }
}

extension SkeinPaneView: NSSplitViewDelegate {

    /// Neither half may be dragged away entirely: a collapsed tree loses the
    /// selection that drives the transcript, and a collapsed transcript is the
    /// tab-switching loop this view exists to end.
    func splitView(_ splitView: NSSplitView,
                   constrainMinCoordinate proposedMinimumPosition: CGFloat,
                   ofSubviewAt dividerIndex: Int) -> CGFloat {
        max(proposedMinimumPosition, Self.minimumHalfHeight)
    }

    func splitView(_ splitView: NSSplitView,
                   constrainMaxCoordinate proposedMaximumPosition: CGFloat,
                   ofSubviewAt dividerIndex: Int) -> CGFloat {
        min(proposedMaximumPosition, bounds.height - Self.minimumHalfHeight)
    }

    func splitViewDidResizeSubviews(_ notification: Notification) {
        guard didPlaceDivider else { return }
        persistTreeFraction()
    }
}
