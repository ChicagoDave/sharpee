// GameErrorsView.swift
// The "Game Errors" tab: a compact, left-aligned list of symbolicated + translated Play
// runtime errors. Each error is one row (Sharpee-speak title + file:line); expanding shows
// the fix hint, the stack frames, and the original error. Double-clicking opens the source.
// Public interface: addError(_:), clear(), errorCount, onDoubleClick.
// Owner context: tools/ide — Build (bottom panel).

import AppKit

final class GameErrorsView: NSView {

    /// Invoked when a row is double-clicked, with the resolved source location to open.
    var onDoubleClick: ((SourceLocation) -> Void)?

    private let scrollView = NSScrollView()
    private let outlineView = NSOutlineView()
    private let emptyLabel = NSTextField(labelWithString: "No game errors")
    private var nodes: [ErrorNode] = []

    private static let bodyFont = NSFont.systemFont(ofSize: 11.5)
    private static let monoFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)

    var errorCount: Int { nodes.count }

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = Theme.playBackground.cgColor

        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("error"))
        column.resizingMask = .autoresizingMask
        outlineView.addTableColumn(column)
        outlineView.outlineTableColumn = column
        outlineView.headerView = nil
        outlineView.backgroundColor = .clear
        outlineView.usesAlternatingRowBackgroundColors = false
        outlineView.indentationPerLevel = 12
        outlineView.autoresizesOutlineColumn = true
        outlineView.dataSource = self
        outlineView.delegate = self
        outlineView.target = self
        outlineView.doubleAction = #selector(doubleClicked)

        scrollView.documentView = outlineView
        scrollView.hasVerticalScroller = true
        scrollView.drawsBackground = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(scrollView)

        emptyLabel.font = NSFont.systemFont(ofSize: 11)
        emptyLabel.textColor = Theme.foregroundFaint
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(emptyLabel)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),
            emptyLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            emptyLabel.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
        updateEmptyState()
    }

    required init?(coder: NSCoder) {
        fatalError("GameErrorsView is not Storyboard-instantiable")
    }

    /// Appends an error, expanded so its fix/stack are immediately visible.
    func addError(_ error: PlayConsoleError) {
        let node = ErrorNode(error)
        nodes.append(node)
        outlineView.reloadData()
        outlineView.expandItem(node)
        updateEmptyState()
    }

    func clear() {
        nodes.removeAll()
        outlineView.reloadData()
        updateEmptyState()
    }

    private func updateEmptyState() {
        scrollView.isHidden = nodes.isEmpty
        emptyLabel.isHidden = !nodes.isEmpty
    }

    @objc private func doubleClicked() {
        let row = outlineView.clickedRow
        guard row >= 0, let item = outlineView.item(atRow: row) else { return }
        let location = (item as? ErrorNode)?.primaryLocation
            ?? (item as? FrameNode)?.frame.location
            ?? (item as? DetailNode)?.parentLocation
        if let location { onDoubleClick?(location) }
    }

    private func makeLabel(_ string: NSAttributedString, wraps: Bool) -> NSTextField {
        let field = NSTextField(labelWithAttributedString: string)
        field.drawsBackground = false
        field.lineBreakMode = wraps ? .byWordWrapping : .byTruncatingTail
        field.maximumNumberOfLines = wraps ? 0 : 1
        field.translatesAutoresizingMaskIntoConstraints = false
        return field
    }
}

// MARK: - Data source / delegate

extension GameErrorsView: NSOutlineViewDataSource {
    func outlineView(_ outlineView: NSOutlineView, numberOfChildrenOfItem item: Any?) -> Int {
        if item == nil { return nodes.count }
        return (item as? ErrorNode)?.children.count ?? 0
    }

    func outlineView(_ outlineView: NSOutlineView, child index: Int, ofItem item: Any?) -> Any {
        if let node = item as? ErrorNode { return node.children[index] }
        return nodes[index]
    }

    func outlineView(_ outlineView: NSOutlineView, isItemExpandable item: Any) -> Bool {
        (item as? ErrorNode).map { !$0.children.isEmpty } ?? false
    }
}

extension GameErrorsView: NSOutlineViewDelegate {
    func outlineView(_ outlineView: NSOutlineView, heightOfRowByItem item: Any) -> CGFloat {
        guard let fix = item as? DetailNode, fix.kind == .fix else { return 20 }
        let width = max(120, outlineView.bounds.width - 44)
        let rect = (fix.text as NSString).boundingRect(
            with: NSSize(width: width, height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: [.font: Self.bodyFont])
        return ceil(rect.height) + 8
    }

    func outlineView(_ outlineView: NSOutlineView, viewFor tableColumn: NSTableColumn?, item: Any) -> NSView? {
        let attributed: NSAttributedString
        var wraps = false

        if let node = item as? ErrorNode {
            let s = NSMutableAttributedString(string: node.error.translation.title,
                                              attributes: [.foregroundColor: NSColor.systemRed, .font: Self.bodyFont])
            if let loc = node.primaryLocation {
                s.append(NSAttributedString(string: "   \(loc.file.lastPathComponent):\(loc.line)",
                                            attributes: [.foregroundColor: Theme.foregroundDim, .font: Self.bodyFont]))
            }
            attributed = s
        } else if let frame = item as? FrameNode {
            let resolved = frame.frame.location != nil
            attributed = NSAttributedString(string: "at \(frame.frame.display)", attributes: [
                .foregroundColor: resolved ? Theme.accent : Theme.foregroundFaint,
                .font: Self.monoFont,
            ])
        } else if let detail = item as? DetailNode {
            switch detail.kind {
            case .fix:
                wraps = true
                attributed = NSAttributedString(string: detail.text,
                                                attributes: [.foregroundColor: Theme.foregroundDim, .font: Self.bodyFont])
            case .raw:
                attributed = NSAttributedString(string: detail.text,
                                                attributes: [.foregroundColor: Theme.foregroundFaint, .font: Self.monoFont])
            }
        } else {
            attributed = NSAttributedString(string: "")
        }

        return makeLabel(attributed, wraps: wraps)
    }
}

// MARK: - Outline nodes (reference types for stable NSOutlineView identity)

private final class ErrorNode {
    let error: PlayConsoleError
    let children: [Any]

    init(_ error: PlayConsoleError) {
        self.error = error
        let primary = error.frames.compactMap(\.location).first
        var rows: [Any] = []
        if let fix = error.translation.fix {
            rows.append(DetailNode(kind: .fix, text: fix, parentLocation: primary))
        }
        rows.append(contentsOf: error.frames.map(FrameNode.init))
        rows.append(DetailNode(kind: .raw, text: "Original error: \(error.translation.raw)", parentLocation: primary))
        self.children = rows
    }

    var primaryLocation: SourceLocation? { error.frames.compactMap(\.location).first }
}

private final class FrameNode {
    let frame: PlayConsoleError.Frame
    init(_ frame: PlayConsoleError.Frame) { self.frame = frame }
}

private final class DetailNode {
    enum Kind { case fix, raw }
    let kind: Kind
    let text: String
    let parentLocation: SourceLocation?
    init(kind: Kind, text: String, parentLocation: SourceLocation?) {
        self.kind = kind; self.text = text; self.parentLocation = parentLocation
    }
}
