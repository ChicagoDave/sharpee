// IndexView.swift
// The Index tab (right panel): the story's granular reference — headline stats
// over collapsible sections (Rooms / Regions / Things / People / Actions /
// Phrases / Hatch Modules), live off the same retained IR as the project tree
// (no build required), stale-marked with it, every row span-navigable. The
// granularity the build output deliberately does not carry lives here.
// Public interface: IndexView.setState(_:), onActivate.
// Owner context: tools/ide — Play (right panel).

import AppKit

final class IndexView: NSView {

    /// Invoked when a row with a span is double-clicked (jump to the source).
    var onActivate: ((DiagnosticSpan) -> Void)?

    private let statsLabel = NSTextField(labelWithString: "")
    private let staleBanner = NSTextField(labelWithString: "Showing last good compile — the story has errors")
    private let scrollView = NSScrollView()
    private let outlineView = NSOutlineView()
    private let placeholder = NSTextField(labelWithString: "Open a story to build its index")

    private var nodes: [IndexNode] = []

    private static let cellIdentifier = NSUserInterfaceItemIdentifier("IndexCell")

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = Theme.playBackground.cgColor

        statsLabel.font = NSFont.systemFont(ofSize: 11, weight: .medium)
        statsLabel.textColor = Theme.foreground
        statsLabel.lineBreakMode = .byWordWrapping
        statsLabel.maximumNumberOfLines = 0

        staleBanner.font = NSFont.systemFont(ofSize: 10)
        staleBanner.textColor = NSColor.systemYellow
        staleBanner.isHidden = true

        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("entry"))
        column.resizingMask = .autoresizingMask
        outlineView.addTableColumn(column)
        outlineView.outlineTableColumn = column
        outlineView.headerView = nil
        outlineView.indentationPerLevel = 14
        outlineView.rowSizeStyle = .small
        outlineView.style = .plain
        outlineView.dataSource = self
        outlineView.delegate = self
        outlineView.target = self
        outlineView.doubleAction = #selector(doubleClicked)
        outlineView.backgroundColor = .clear
        outlineView.usesAlternatingRowBackgroundColors = false

        scrollView.documentView = outlineView
        scrollView.hasVerticalScroller = true
        scrollView.drawsBackground = false
        scrollView.contentView.drawsBackground = false

        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
        placeholder.alignment = .center
        placeholder.lineBreakMode = .byWordWrapping
        placeholder.maximumNumberOfLines = 0

        for view in [statsLabel, staleBanner, scrollView, placeholder] {
            view.translatesAutoresizingMaskIntoConstraints = false
            addSubview(view)
        }

        NSLayoutConstraint.activate([
            statsLabel.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            statsLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
            statsLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10),

            staleBanner.topAnchor.constraint(equalTo: statsLabel.bottomAnchor, constant: 2),
            staleBanner.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
            staleBanner.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10),

            scrollView.topAnchor.constraint(equalTo: staleBanner.bottomAnchor, constant: 6),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

            placeholder.centerXAnchor.constraint(equalTo: centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: centerYAnchor),
            placeholder.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 10),
            placeholder.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -10),
        ])

        setState(.empty(reason: "Open a story to build its index"))
    }

    required init?(coder: NSCoder) {
        fatalError("IndexView is not Storyboard-instantiable")
    }

    /// Renders a tree display state (shared with the project tree: populated /
    /// stale / empty-with-reason).
    func setState(_ state: IRTreeState.Display) {
        switch state {
        case .empty(let reason):
            nodes = []
            statsLabel.stringValue = ""
            placeholder.stringValue = reason
            staleBanner.isHidden = true
            outlineView.alphaValue = 1
        case .populated(let ir, let stale):
            nodes = StoryIndex.sections(of: ir).map(IndexNode.init)
            statsLabel.stringValue = Self.statsLine(for: ir)
            placeholder.stringValue = "This story defines nothing to index yet"
            staleBanner.isHidden = !stale
            outlineView.alphaValue = stale ? 0.55 : 1
        }
        outlineView.reloadData()
        outlineView.expandItem(nil, expandChildren: true)
        let isEmpty = nodes.isEmpty
        scrollView.isHidden = isEmpty
        statsLabel.isHidden = isEmpty
        placeholder.isHidden = !isEmpty
    }

    /// The headline stats line ("18 rooms · 41 things · …" — omitting zeros).
    static func statsLine(for ir: ComposeStoryIR) -> String {
        let stats = StoryIndex.stats(of: ir)
        var parts: [String] = []
        func add(_ n: Int, _ singular: String, _ plural: String? = nil) {
            guard n > 0 else { return }
            parts.append("\(n) \(n == 1 ? singular : (plural ?? singular + "s"))")
        }
        add(stats.rooms, "room")
        add(stats.regions, "region")
        add(stats.things, "thing")
        add(stats.people, "person", "people")
        add(stats.actions, "action")
        add(stats.phrases, "phrase")
        add(stats.hatches, "hatch module")
        return parts.joined(separator: " · ")
    }

    @objc private func doubleClicked() {
        let row = outlineView.clickedRow
        guard row >= 0, let node = outlineView.item(atRow: row) as? IndexNode,
              let span = node.row?.span else { return }
        onActivate?(span)
    }
}

// MARK: - Nodes (reference identity for NSOutlineView)

private final class IndexNode {
    let section: IndexSection?
    let row: IndexRow?
    let children: [IndexNode]

    init(section: IndexSection) {
        self.section = section
        self.row = nil
        self.children = section.rows.map { IndexNode(row: $0) }
    }

    init(row: IndexRow) {
        self.section = nil
        self.row = row
        self.children = []
    }
}

// MARK: - Data source / delegate

extension IndexView: NSOutlineViewDataSource {
    func outlineView(_ outlineView: NSOutlineView, numberOfChildrenOfItem item: Any?) -> Int {
        if item == nil { return nodes.count }
        return (item as? IndexNode)?.children.count ?? 0
    }

    func outlineView(_ outlineView: NSOutlineView, child index: Int, ofItem item: Any?) -> Any {
        if item == nil { return nodes[index] }
        return (item as! IndexNode).children[index]
    }

    func outlineView(_ outlineView: NSOutlineView, isItemExpandable item: Any) -> Bool {
        (item as? IndexNode)?.section != nil
    }
}

extension IndexView: NSOutlineViewDelegate {
    func outlineView(_ outlineView: NSOutlineView, viewFor tableColumn: NSTableColumn?, item: Any) -> NSView? {
        guard let node = item as? IndexNode else { return nil }

        let text = NSMutableAttributedString()
        if let section = node.section {
            text.append(NSAttributedString(
                string: "\(section.title)  (\(section.rows.count))",
                attributes: [.foregroundColor: Theme.foreground,
                             .font: NSFont.systemFont(ofSize: 12, weight: .semibold)]))
        } else if let row = node.row {
            text.append(NSAttributedString(
                string: row.title,
                attributes: [.foregroundColor: Theme.foregroundDim,
                             .font: NSFont.systemFont(ofSize: 12)]))
            if let detail = row.detail {
                text.append(NSAttributedString(
                    string: "   \(detail)",
                    attributes: [.foregroundColor: Theme.foregroundFaint,
                                 .font: NSFont.systemFont(ofSize: 11)]))
            }
        }

        let cell = outlineView.makeView(withIdentifier: Self.cellIdentifier, owner: self)
            as? NSTableCellView ?? makeCell()
        cell.textField?.attributedStringValue = text
        return cell
    }

    private func makeCell() -> NSTableCellView {
        let cell = NSTableCellView()
        cell.identifier = Self.cellIdentifier
        let label = NSTextField(labelWithString: "")
        label.lineBreakMode = .byTruncatingTail
        label.translatesAutoresizingMaskIntoConstraints = false
        cell.textField = label
        cell.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: cell.leadingAnchor, constant: 2),
            label.trailingAnchor.constraint(equalTo: cell.trailingAnchor, constant: -4),
            label.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
        ])
        return cell
    }
}
