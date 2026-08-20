// WorldFindingTable.swift
// The list the Reach and Incomplete views are both made of: a flat, sectioned,
// span-navigable table of findings. Extracted rather than written twice — the
// two views differ in what they put in the rows, not in how a row looks or
// behaves, and a second copy is how the two would drift apart.
//
// Rows are a value type the owning view rebuilds wholesale; this table renders
// what it is given and reports double-clicks. It holds no analysis of its own.
// Public interface: WorldFindingRow, WorldFindingTable.setRows(_:), onActivate,
// setPlaceholder(_:).
// Owner context: tools/ide — World.

import AppKit

/// One line in a World view: a section header, or a finding under one.
struct WorldFindingRow: Equatable {

    /// A header naming the section the rows beneath it belong to.
    /// - Parameters:
    ///   - title: the section's name
    ///   - count: how many findings it holds, rendered beside the name
    static func header(_ title: String, count: Int) -> WorldFindingRow {
        WorldFindingRow(title: title, detail: count == 0 ? nil : "\(count)",
                        symbol: nil, tint: nil, isHeader: true, line: nil)
    }

    /// The finding's headline — the thing the author reads first.
    let title: String
    /// Supporting text, dimmed and trailing the title.
    let detail: String?
    /// An SF Symbol naming the finding's class.
    let symbol: String?
    /// The class's accent color, applied to the symbol.
    let tint: NSColor?
    /// Whether this row is a section header rather than a finding.
    let isHeader: Bool
    /// Source line to jump to on double-click, when the finding names one.
    let line: Int?

    /// Builds a finding row.
    /// - Parameters:
    ///   - title: the headline
    ///   - detail: supporting text, dimmed
    ///   - symbol: an SF Symbol naming the class
    ///   - tint: the class's accent color
    ///   - line: source line to jump to, when there is one
    init(title: String, detail: String? = nil, symbol: String? = nil,
         tint: NSColor? = nil, isHeader: Bool = false, line: Int? = nil) {
        self.title = title
        self.detail = detail
        self.symbol = symbol
        self.tint = tint
        self.isHeader = isHeader
        self.line = line
    }

    static func == (lhs: WorldFindingRow, rhs: WorldFindingRow) -> Bool {
        lhs.title == rhs.title && lhs.detail == rhs.detail
            && lhs.symbol == rhs.symbol && lhs.isHeader == rhs.isHeader && lhs.line == rhs.line
    }
}

final class WorldFindingTable: NSView {

    /// Invoked when a row naming a source line is double-clicked.
    var onActivate: ((DiagnosticSpan) -> Void)?

    private let scrollView = NSScrollView()
    private let tableView = NSTableView()
    private let placeholder = NSTextField(labelWithString: "")
    private var rows: [WorldFindingRow] = []

    private static let cellIdentifier = NSUserInterfaceItemIdentifier("WorldFindingCell")

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)

        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("finding"))
        column.resizingMask = .autoresizingMask
        tableView.addTableColumn(column)
        tableView.headerView = nil
        tableView.rowSizeStyle = .small
        tableView.style = .plain
        tableView.dataSource = self
        tableView.delegate = self
        tableView.target = self
        tableView.doubleAction = #selector(doubleClicked)
        tableView.backgroundColor = .clear
        tableView.usesAlternatingRowBackgroundColors = false

        scrollView.documentView = tableView
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.drawsBackground = false
        scrollView.contentView.drawsBackground = false

        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
        placeholder.alignment = .center
        placeholder.lineBreakMode = .byWordWrapping
        placeholder.maximumNumberOfLines = 0
        placeholder.isHidden = true
        // A wrapping label must never dictate the pane's width (the divider fight).
        placeholder.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        for subview in [scrollView, placeholder] as [NSView] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            addSubview(subview)
        }

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

            placeholder.centerXAnchor.constraint(equalTo: centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: centerYAnchor),
            placeholder.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 12),
            placeholder.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -12),
        ])

        NotificationCenter.default.addObserver(self, selector: #selector(fontPreferenceChanged),
                                               name: FontPreference.didChangeNotification,
                                               object: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("WorldFindingTable is not Storyboard-instantiable")
    }

    /// Replaces the table's contents.
    ///
    /// An empty list shows the placeholder instead of an empty table — a story
    /// with nothing to report should say so, not look unloaded.
    ///
    /// - Parameters:
    ///   - rows: the rows to render, headers included, in display order
    ///   - emptyMessage: what to say when `rows` is empty
    func setRows(_ rows: [WorldFindingRow], emptyMessage: String) {
        self.rows = rows
        placeholder.stringValue = emptyMessage
        placeholder.isHidden = !rows.isEmpty
        scrollView.isHidden = rows.isEmpty
        tableView.reloadData()
        tableView.scrollRowToVisible(0)
    }

    @objc private func fontPreferenceChanged() {
        tableView.reloadData()
    }

    @objc private func doubleClicked() {
        let index = tableView.clickedRow
        guard rows.indices.contains(index), let line = rows[index].line else { return }
        onActivate?(DiagnosticSpan(line: line, column: 1, endLine: line, endColumn: 1))
    }
}

// MARK: - Data source / delegate

extension WorldFindingTable: NSTableViewDataSource {
    func numberOfRows(in tableView: NSTableView) -> Int { rows.count }
}

extension WorldFindingTable: NSTableViewDelegate {

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row index: Int) -> NSView? {
        guard rows.indices.contains(index) else { return nil }
        let row = rows[index]
        let cell = tableView.makeView(withIdentifier: Self.cellIdentifier, owner: self)
            as? NSTableCellView ?? makeCell()

        cell.imageView?.image = row.symbol.flatMap {
            NSImage(systemSymbolName: $0, accessibilityDescription: nil)
        }
        cell.imageView?.contentTintColor = (row.tint ?? Theme.foregroundFaint).withAlphaComponent(0.7)

        let size = FontPreference.scale.panelSize
        let text = NSMutableAttributedString()
        if row.isHeader {
            text.append(NSAttributedString(string: row.title.uppercased(), attributes: [
                .foregroundColor: Theme.foregroundDim,
                .font: NSFont.systemFont(ofSize: size - 2, weight: .semibold),
                .kern: 0.6,
            ]))
            if let detail = row.detail {
                text.append(NSAttributedString(string: "   \(detail)", attributes: [
                    .foregroundColor: Theme.foregroundFaint,
                    .font: NSFont.monospacedDigitSystemFont(ofSize: size - 2, weight: .semibold),
                ]))
            }
        } else {
            text.append(NSAttributedString(string: row.title, attributes: [
                .foregroundColor: Theme.foreground,
                .font: FontPreference.family.font(size: size),
            ]))
            if let detail = row.detail {
                text.append(NSAttributedString(string: "   \(detail)", attributes: [
                    .foregroundColor: Theme.foregroundFaint,
                    .font: FontPreference.family.font(size: size - 1),
                ]))
            }
        }
        cell.textField?.attributedStringValue = text
        return cell
    }

    /// Builds the reusable cell: an optional leading symbol and one attributed label.
    private func makeCell() -> NSTableCellView {
        let cell = NSTableCellView()
        cell.identifier = Self.cellIdentifier

        let icon = NSImageView()
        icon.imageScaling = .scaleProportionallyDown
        icon.symbolConfiguration = NSImage.SymbolConfiguration(pointSize: 11, weight: .medium)
        icon.translatesAutoresizingMaskIntoConstraints = false
        cell.imageView = icon
        cell.addSubview(icon)

        let label = NSTextField(labelWithString: "")
        label.lineBreakMode = .byTruncatingTail
        label.translatesAutoresizingMaskIntoConstraints = false
        cell.textField = label
        cell.addSubview(label)

        NSLayoutConstraint.activate([
            icon.leadingAnchor.constraint(equalTo: cell.leadingAnchor, constant: 8),
            icon.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 14),
            icon.heightAnchor.constraint(equalToConstant: 14),

            label.leadingAnchor.constraint(equalTo: icon.trailingAnchor, constant: 6),
            label.trailingAnchor.constraint(equalTo: cell.trailingAnchor, constant: -6),
            label.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
        ])
        return cell
    }
}
