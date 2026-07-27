// ProblemsView.swift
// The "Problems" tab (ADR-258 D5): a compact list of structured Chord compose
// diagnostics — severity dot, stable code, message, file:line site. Compile
// records carry a full span and clicking one opens the exact range; hatch
// records (`hatch.*`, no span) open file:line only. Warnings render alongside
// errors. A compose-pipeline failure (sharpee missing, decode error) renders as
// a status line instead of rows — Problems never silently goes blank.
// Public interface: setProblems(_:for:), setStatus(_:), clear(), errorCount,
// onActivate.
// Owner context: tools/ide — Compose (bottom panel).

import AppKit

/// One Problems row: the wire record plus the file URL its site resolves to.
struct ProblemItem {
    let record: ComposeDiagnosticRecord
    let fileURL: URL
}

final class ProblemsView: NSView {

    /// Invoked when a row is double-clicked (or Return-activated).
    var onActivate: ((ProblemItem) -> Void)?

    private let scrollView = NSScrollView()
    private let tableView = NSTableView()
    private let emptyLabel = NSTextField(labelWithString: "No problems")
    private var items: [ProblemItem] = []

    private static let bodyFont = NSFont.systemFont(ofSize: 11.5)
    private static let monoFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)

    /// Number of error-severity rows (drives the tab badge).
    var errorCount: Int { items.filter { $0.record.severity == .error }.count }

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = Theme.playBackground.cgColor

        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("problem"))
        column.resizingMask = .autoresizingMask
        tableView.addTableColumn(column)
        tableView.headerView = nil
        tableView.backgroundColor = .clear
        tableView.usesAlternatingRowBackgroundColors = false
        tableView.dataSource = self
        tableView.delegate = self
        tableView.target = self
        tableView.doubleAction = #selector(doubleClicked)

        scrollView.documentView = tableView
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
        fatalError("ProblemsView is not Storyboard-instantiable")
    }

    /// Replaces the list with a compose run's records. `storyURL` resolves any
    /// record whose `file` is not absolute (compile sites are absolute in
    /// production; hatch sites always are).
    func setProblems(_ records: [ComposeDiagnosticRecord], for storyURL: URL) {
        items = records.map { record in
            let url: URL = record.file.hasPrefix("/")
                ? URL(fileURLWithPath: record.file)
                : storyURL.deletingLastPathComponent().appendingPathComponent(record.file)
            return ProblemItem(record: record, fileURL: url)
        }
        emptyLabel.stringValue = "No problems"
        tableView.reloadData()
        updateEmptyState()
    }

    /// Shows a pipeline status line ("sharpee not found on PATH — …") in place of
    /// rows. Cleared by the next setProblems.
    func setStatus(_ message: String) {
        items = []
        emptyLabel.stringValue = message
        tableView.reloadData()
        updateEmptyState()
    }

    /// Empties the list (project closed).
    func clear() {
        items = []
        emptyLabel.stringValue = "No problems"
        tableView.reloadData()
        updateEmptyState()
    }

    private func updateEmptyState() {
        scrollView.isHidden = items.isEmpty
        emptyLabel.isHidden = !items.isEmpty
    }

    @objc private func doubleClicked() {
        let row = tableView.clickedRow
        guard items.indices.contains(row) else { return }
        onActivate?(items[row])
    }
}

// MARK: - Data source / delegate

extension ProblemsView: NSTableViewDataSource {
    func numberOfRows(in tableView: NSTableView) -> Int { items.count }
}

extension ProblemsView: NSTableViewDelegate {
    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        guard items.indices.contains(row) else { return nil }
        let item = items[row]
        let record = item.record

        let severityColor: NSColor = record.severity == .error ? .systemRed : .systemYellow
        let s = NSMutableAttributedString(string: "● ",
                                          attributes: [.foregroundColor: severityColor,
                                                       .font: Self.bodyFont])
        s.append(NSAttributedString(string: "[\(record.code)] ",
                                    attributes: [.foregroundColor: Theme.foregroundDim,
                                                 .font: Self.monoFont]))
        s.append(NSAttributedString(string: record.message,
                                    attributes: [.foregroundColor: Theme.foreground,
                                                 .font: Self.bodyFont]))
        let site = record.span.map { "\(item.fileURL.lastPathComponent):\(record.line):\($0.column)" }
            ?? "\(item.fileURL.lastPathComponent):\(record.line)"
        s.append(NSAttributedString(string: "   \(site)",
                                    attributes: [.foregroundColor: Theme.foregroundDim,
                                                 .font: Self.bodyFont]))

        let field = NSTextField(labelWithAttributedString: s)
        field.drawsBackground = false
        field.lineBreakMode = .byTruncatingTail
        field.maximumNumberOfLines = 1
        field.translatesAutoresizingMaskIntoConstraints = false
        return field
    }
}
