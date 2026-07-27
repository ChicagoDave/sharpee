// TestPanelView.swift
// The right-panel "Test" tab (ADR-277 D2): run controls (Run All / Run Chain /
// Cancel), a status line, and one outline — transcript rows (status dot,
// name, counts) expandable to per-command rows once results stream in.
// Double-click (or Return) on a command row opens its `.transcript` at the
// command's source line; on a transcript row, the file itself. A pipeline
// failure (sharpee missing, schema mismatch) renders as a status line —
// the panel never silently goes blank (the ProblemsView rule).
// Public interface: setModel/reloadModel, setStatus(_:), setRunning(_:),
// onRunAll, onRunChain, onCancel, onOpenLocation.
// Owner context: tools/ide — Test.

import AppKit

final class TestPanelView: NSView {

    /// Fired by the run controls.
    var onRunAll: (() -> Void)?
    var onRunChain: (() -> Void)?
    var onCancel: (() -> Void)?
    /// A clicked row's source location to open in the editor.
    var onOpenLocation: ((SourceLocation) -> Void)?

    private let runAllButton = NSButton(title: "Run All", target: nil, action: nil)
    private let runChainButton = NSButton(title: "Run Chain", target: nil, action: nil)
    private let cancelButton = NSButton(title: "Cancel", target: nil, action: nil)
    private let statusLabel = NSTextField(labelWithString: "")
    private let scrollView = NSScrollView()
    private let outlineView = NSOutlineView()
    private let emptyLabel = NSTextField(labelWithString: "No transcripts — add tests/ or walkthroughs/ next to the story")

    private static let bodyFont = NSFont.systemFont(ofSize: 11.5)
    private static let monoFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)

    private weak var model: TestPanelModel?
    /// Outline item boxes: top level wraps an entry index; children wrap commands.
    private final class EntryItem {
        let index: Int
        init(index: Int) { self.index = index }
    }
    private final class CommandItem {
        let command: TestCommandResult
        init(command: TestCommandResult) { self.command = command }
    }
    private var entryItems: [EntryItem] = []
    private var commandItems: [ObjectIdentifier: [CommandItem]] = [:]

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        for button in [runAllButton, runChainButton, cancelButton] {
            button.bezelStyle = .accessoryBarAction
            button.font = NSFont.systemFont(ofSize: 11)
            button.target = self
            button.translatesAutoresizingMaskIntoConstraints = false
        }
        runAllButton.action = #selector(runAllClicked)
        runChainButton.action = #selector(runChainClicked)
        cancelButton.action = #selector(cancelClicked)
        cancelButton.isEnabled = false

        statusLabel.font = NSFont.systemFont(ofSize: 11)
        statusLabel.textColor = Theme.foregroundDim
        statusLabel.lineBreakMode = .byTruncatingTail
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("test"))
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

        addSubview(runAllButton)
        addSubview(runChainButton)
        addSubview(cancelButton)
        addSubview(statusLabel)
        addSubview(scrollView)
        addSubview(emptyLabel)

        NSLayoutConstraint.activate([
            runAllButton.topAnchor.constraint(equalTo: topAnchor, constant: 6),
            runAllButton.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            runChainButton.topAnchor.constraint(equalTo: runAllButton.topAnchor),
            runChainButton.leadingAnchor.constraint(equalTo: runAllButton.trailingAnchor, constant: 6),
            cancelButton.topAnchor.constraint(equalTo: runAllButton.topAnchor),
            cancelButton.leadingAnchor.constraint(equalTo: runChainButton.trailingAnchor, constant: 6),

            statusLabel.centerYAnchor.constraint(equalTo: runAllButton.centerYAnchor),
            statusLabel.leadingAnchor.constraint(equalTo: cancelButton.trailingAnchor, constant: 10),
            statusLabel.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -8),

            scrollView.topAnchor.constraint(equalTo: runAllButton.bottomAnchor, constant: 6),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

            emptyLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            emptyLabel.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
        updateEmptyState()
    }

    required init?(coder: NSCoder) {
        fatalError("TestPanelView is not Storyboard-instantiable")
    }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = Theme.playBackground.cgColor
    }

    // MARK: - Model

    /// Attaches the panel's model and renders its current entries.
    func setModel(_ model: TestPanelModel) {
        self.model = model
        reloadModel()
    }

    /// Re-renders after the model changed (discovery or a streamed record).
    func reloadModel() {
        let entries = model?.entries ?? []
        entryItems = entries.indices.map(EntryItem.init(index:))
        commandItems = [:]
        for item in entryItems {
            commandItems[ObjectIdentifier(item)] =
                entries[item.index].commands.map(CommandItem.init(command:))
        }
        outlineView.reloadData()
        // Failed/errored transcripts auto-expand so the first red row is visible.
        for item in entryItems {
            switch entries[item.index].status {
            case .failed, .error: outlineView.expandItem(item)
            default: break
            }
        }
        if let summary = model?.runSummary { statusLabel.stringValue = summary }
        updateEmptyState()
    }

    /// Shows a pipeline status line ("sharpee not found…", "IDE out of date…").
    func setStatus(_ message: String) {
        statusLabel.stringValue = message
    }

    /// Toggles the run/cancel controls for an in-flight run.
    func setRunning(_ running: Bool) {
        runAllButton.isEnabled = !running
        runChainButton.isEnabled = !running
        cancelButton.isEnabled = running
        if running { statusLabel.stringValue = "Running…" }
    }

    private func updateEmptyState() {
        let isEmpty = entryItems.isEmpty
        scrollView.isHidden = isEmpty
        emptyLabel.isHidden = !isEmpty
    }

    // MARK: - Actions

    @objc private func runAllClicked() { onRunAll?() }
    @objc private func runChainClicked() { onRunChain?() }
    @objc private func cancelClicked() { onCancel?() }

    @objc private func rowActivated() {
        let row = outlineView.clickedRow >= 0 ? outlineView.clickedRow : outlineView.selectedRow
        guard row >= 0, let item = outlineView.item(atRow: row) else { return }
        activate(item: item)
    }

    /// Resolves an outline item to its editor location. Split from the click
    /// handler so tests drive activation directly (no synthesized clicks).
    func activate(item: Any) {
        guard let model else { return }
        if let command = (item as? CommandItem)?.command {
            onOpenLocation?(model.location(for: command))
        } else if let entry = (item as? EntryItem).map({ model.entries[$0.index] }) {
            onOpenLocation?(SourceLocation(file: entry.file, line: 1, column: 1))
        }
    }
}

// MARK: - Data source / delegate

extension TestPanelView: NSOutlineViewDataSource {
    func outlineView(_ outlineView: NSOutlineView, numberOfChildrenOfItem item: Any?) -> Int {
        guard let item else { return entryItems.count }
        guard let entry = item as? EntryItem else { return 0 }
        return commandItems[ObjectIdentifier(entry)]?.count ?? 0
    }

    func outlineView(_ outlineView: NSOutlineView, child index: Int, ofItem item: Any?) -> Any {
        guard let item else { return entryItems[index] }
        return commandItems[ObjectIdentifier(item as! EntryItem)]![index]
    }

    func outlineView(_ outlineView: NSOutlineView, isItemExpandable item: Any) -> Bool {
        guard let entry = item as? EntryItem else { return false }
        return !(commandItems[ObjectIdentifier(entry)]?.isEmpty ?? true)
    }
}

extension TestPanelView: NSOutlineViewDelegate {
    func outlineView(_ outlineView: NSOutlineView, viewFor tableColumn: NSTableColumn?, item: Any) -> NSView? {
        let field: NSTextField
        if let entryItem = item as? EntryItem, let model {
            field = NSTextField(labelWithAttributedString: Self.entryLine(model.entries[entryItem.index]))
        } else if let commandItem = item as? CommandItem {
            field = NSTextField(labelWithAttributedString: Self.commandLine(commandItem.command))
        } else {
            return nil
        }
        field.drawsBackground = false
        field.lineBreakMode = .byTruncatingTail
        field.maximumNumberOfLines = 1
        field.translatesAutoresizingMaskIntoConstraints = false
        return field
    }

    func outlineView(_ outlineView: NSOutlineView, heightOfRowByItem item: Any) -> CGFloat { 20 }

    private static func entryLine(_ entry: TestPanelModel.Entry) -> NSAttributedString {
        let (dot, color): (String, NSColor) = {
            switch entry.status {
            case .idle: return ("○ ", Theme.foregroundFaint)
            case .running: return ("● ", .systemBlue)
            case .passed: return ("● ", .systemGreen)
            case .failed: return ("● ", .systemRed)
            case .error: return ("● ", .systemRed)
            }
        }()
        let s = NSMutableAttributedString(string: dot,
                                          attributes: [.foregroundColor: color, .font: bodyFont])
        s.append(NSAttributedString(string: entry.file.lastPathComponent,
                                    attributes: [.foregroundColor: Theme.foreground, .font: bodyFont]))
        if entry.group == .walkthroughs {
            s.append(NSAttributedString(string: "  (chain)",
                                        attributes: [.foregroundColor: Theme.foregroundFaint, .font: bodyFont]))
        }
        switch entry.status {
        case .error(let message):
            s.append(NSAttributedString(string: "   ERROR\(message.map { ": \($0)" } ?? "")",
                                        attributes: [.foregroundColor: NSColor.systemRed, .font: bodyFont]))
        case .passed, .failed:
            let counts = "   \(entry.counts.passed) passed" +
                (entry.counts.failed > 0 ? ", \(entry.counts.failed) failed" : "")
            s.append(NSAttributedString(string: counts,
                                        attributes: [.foregroundColor: Theme.foregroundDim, .font: bodyFont]))
        default:
            break
        }
        return s
    }

    private static func commandLine(_ command: TestCommandResult) -> NSAttributedString {
        let (mark, color): (String, NSColor) = command.skipped
            ? ("– ", Theme.foregroundFaint)
            : command.passed || command.expectedFailure
                ? ("✓ ", .systemGreen)
                : ("✗ ", .systemRed)
        let s = NSMutableAttributedString(string: mark,
                                          attributes: [.foregroundColor: color, .font: bodyFont])
        s.append(NSAttributedString(string: "> \(command.input)",
                                    attributes: [.foregroundColor: Theme.foreground, .font: monoFont]))
        s.append(NSAttributedString(string: "   :\(command.line)",
                                    attributes: [.foregroundColor: Theme.foregroundDim, .font: bodyFont]))
        if let error = command.error {
            s.append(NSAttributedString(string: "   \(error)",
                                        attributes: [.foregroundColor: NSColor.systemRed, .font: bodyFont]))
        }
        return s
    }
}
