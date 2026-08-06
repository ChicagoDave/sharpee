// TestPanelView.swift
// The right-panel "Test" tab (ADR-277 D2): run controls (Run Tests / Cancel),
// a status line, and one outline — transcript rows (status dot,
// name, counts) expandable to per-command rows once results stream in.
// Double-click (or Return) on a command row opens its `.transcript` at the
// command's source line; on a transcript row, the file itself. A pipeline
// failure (sharpee missing, schema mismatch) renders as a status line —
// the panel never silently goes blank (the ProblemsView rule).
// Selecting a FAILED command row opens the ADR-282 D2 failure pane beneath the
// outline: the text the author blessed above what the story now prints, with a
// Re-bless action that rewrites that one assertion in the transcript. The pane
// stays closed for anything with no old-vs-new to show, and the action is
// offered only when it would succeed — the reason stands in its place when it
// would not.
// Public interface: setModel/reloadModel, setStatus(_:), setRunning(_:),
// showFailure(for:), performRebless(), onRun, onCancel,
// onOpenLocation, onDidRebless.
// Owner context: tools/ide — Test.

import AppKit

final class TestPanelView: NSView {

    /// Fired by the run controls.
    var onRun: (() -> Void)?
    var onCancel: (() -> Void)?
    /// A clicked row's source location to open in the editor.
    var onOpenLocation: ((SourceLocation) -> Void)?
    /// The author accepted the story's new text for a drifted verbatim bless
    /// (ADR-282 D2). The transcript has already been rewritten on disk.
    var onDidRebless: ((TestCommandResult) -> Void)?
    /// An obstacle only the host knows about — chiefly that the transcript is
    /// open in the editor with unsaved edits, where writing it would discard
    /// the author's work and saving the tab afterwards would discard the
    /// re-bless. Returns a reason to refuse, or nil to proceed.
    var hostReblessObstacle: ((TestCommandResult) -> String?)?

    private let runButton = NSButton(title: "Run Tests", target: nil, action: nil)
    private let cancelButton = NSButton(title: "Cancel", target: nil, action: nil)
    private let statusLabel = NSTextField(labelWithString: "")
    private let scrollView = NSScrollView()
    private let outlineView = NSOutlineView()
    private let emptyLabel = NSTextField(labelWithString: "No transcripts — add tests/ or walkthroughs/ next to the story")

    // The old-vs-new failure pane (ADR-282 D2), below the outline.
    private let failurePane = NSView()
    private let blessedHeading = NSTextField(labelWithString: "Blessed")
    private let actualHeading = NSTextField(labelWithString: "Now")
    private let reblessButton = NSButton(title: "Re-bless", target: nil, action: nil)
    private let reblessReason = NSTextField(labelWithString: "")
    private let blessedText = NSTextView()
    private let actualText = NSTextView()
    private var failurePaneHeight: NSLayoutConstraint!
    /// The row the pane is currently describing, and what re-bless would write.
    private var failureCommand: TestCommandResult?

    private static let failurePaneHeight: CGFloat = 190

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

        for button in [runButton, cancelButton] {
            button.bezelStyle = .accessoryBarAction
            button.font = NSFont.systemFont(ofSize: 11)
            button.target = self
            button.translatesAutoresizingMaskIntoConstraints = false
        }
        runButton.action = #selector(runClicked)
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

        buildFailurePane()

        addSubview(runButton)
        addSubview(cancelButton)
        addSubview(statusLabel)
        addSubview(scrollView)
        addSubview(emptyLabel)
        addSubview(failurePane)

        failurePaneHeight = failurePane.heightAnchor.constraint(equalToConstant: 0)

        NSLayoutConstraint.activate([
            failurePane.leadingAnchor.constraint(equalTo: leadingAnchor),
            failurePane.trailingAnchor.constraint(equalTo: trailingAnchor),
            failurePane.bottomAnchor.constraint(equalTo: bottomAnchor),
            failurePaneHeight,

            runButton.topAnchor.constraint(equalTo: topAnchor, constant: 6),
            runButton.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            cancelButton.topAnchor.constraint(equalTo: runButton.topAnchor),
            cancelButton.leadingAnchor.constraint(equalTo: runButton.trailingAnchor, constant: 6),

            statusLabel.centerYAnchor.constraint(equalTo: runButton.centerYAnchor),
            statusLabel.leadingAnchor.constraint(equalTo: cancelButton.trailingAnchor, constant: 10),
            statusLabel.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -8),

            scrollView.topAnchor.constraint(equalTo: runButton.bottomAnchor, constant: 6),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: failurePane.topAnchor),

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
        // Results changed, so any comparison on screen describes a run that is
        // no longer the current one — an author must not re-bless against a
        // stale reading of the file.
        hideFailure()
        updateEmptyState()
    }

    /// Shows a pipeline status line ("sharpee not found…", "IDE out of date…").
    func setStatus(_ message: String) {
        statusLabel.stringValue = message
    }

    /// Toggles the run/cancel controls for an in-flight run.
    func setRunning(_ running: Bool) {
        runButton.isEnabled = !running
        cancelButton.isEnabled = running
        if running { statusLabel.stringValue = "Running…" }
    }

    private func updateEmptyState() {
        let isEmpty = entryItems.isEmpty
        scrollView.isHidden = isEmpty
        emptyLabel.isHidden = !isEmpty
    }

    // MARK: - Failure pane (ADR-282 D2)

    /// Builds the old-vs-new pane: the blessed text above what the story now
    /// prints, with the re-bless action between them.
    private func buildFailurePane() {
        failurePane.translatesAutoresizingMaskIntoConstraints = false
        failurePane.wantsLayer = true
        failurePane.isHidden = true

        for heading in [blessedHeading, actualHeading] {
            heading.font = NSFont.systemFont(ofSize: 10, weight: .semibold)
            heading.textColor = Theme.foregroundDim
            heading.translatesAutoresizingMaskIntoConstraints = false
        }
        reblessButton.bezelStyle = .accessoryBarAction
        reblessButton.font = NSFont.systemFont(ofSize: 11)
        reblessButton.target = self
        reblessButton.action = #selector(reblessClicked)
        reblessButton.translatesAutoresizingMaskIntoConstraints = false

        reblessReason.font = NSFont.systemFont(ofSize: 10)
        reblessReason.textColor = Theme.foregroundFaint
        reblessReason.lineBreakMode = .byTruncatingTail
        reblessReason.translatesAutoresizingMaskIntoConstraints = false

        var scrollers: [NSScrollView] = []
        for text in [blessedText, actualText] {
            text.isEditable = false
            text.drawsBackground = false
            text.font = Self.monoFont
            text.textColor = Theme.foreground
            text.textContainerInset = NSSize(width: 4, height: 3)
            let scroller = NSScrollView()
            scroller.documentView = text
            scroller.hasVerticalScroller = true
            scroller.drawsBackground = false
            scroller.translatesAutoresizingMaskIntoConstraints = false
            scrollers.append(scroller)
        }
        let (blessedScroller, actualScroller) = (scrollers[0], scrollers[1])

        for subview in [blessedHeading, reblessButton, reblessReason,
                        blessedScroller, actualHeading, actualScroller] {
            failurePane.addSubview(subview)
        }

        NSLayoutConstraint.activate([
            blessedHeading.topAnchor.constraint(equalTo: failurePane.topAnchor, constant: 6),
            blessedHeading.leadingAnchor.constraint(equalTo: failurePane.leadingAnchor, constant: 8),
            reblessButton.centerYAnchor.constraint(equalTo: blessedHeading.centerYAnchor),
            reblessButton.trailingAnchor.constraint(equalTo: failurePane.trailingAnchor, constant: -8),
            reblessReason.centerYAnchor.constraint(equalTo: blessedHeading.centerYAnchor),
            reblessReason.leadingAnchor.constraint(equalTo: blessedHeading.trailingAnchor, constant: 8),
            reblessReason.trailingAnchor.constraint(equalTo: reblessButton.leadingAnchor, constant: -6),

            blessedScroller.topAnchor.constraint(equalTo: blessedHeading.bottomAnchor, constant: 3),
            blessedScroller.leadingAnchor.constraint(equalTo: failurePane.leadingAnchor),
            blessedScroller.trailingAnchor.constraint(equalTo: failurePane.trailingAnchor),

            actualHeading.topAnchor.constraint(equalTo: blessedScroller.bottomAnchor, constant: 6),
            actualHeading.leadingAnchor.constraint(equalTo: blessedHeading.leadingAnchor),

            actualScroller.topAnchor.constraint(equalTo: actualHeading.bottomAnchor, constant: 3),
            actualScroller.leadingAnchor.constraint(equalTo: failurePane.leadingAnchor),
            actualScroller.trailingAnchor.constraint(equalTo: failurePane.trailingAnchor),
            actualScroller.bottomAnchor.constraint(equalTo: failurePane.bottomAnchor, constant: -8),
            // Equal halves: neither side is the "real" one — the author is
            // judging whether the new text is as good as the old.
            actualScroller.heightAnchor.constraint(equalTo: blessedScroller.heightAnchor),
        ])
    }

    /// Shows the pane for a drifted verbatim bless, or hides it.
    ///
    /// Only a FAILED command that carries captured text and owns a verbatim
    /// bless has an old-vs-new to show. Anything else — a passing row, a
    /// transcript row, a `[SKIP]`-draft failure — leaves the pane closed rather
    /// than showing an empty comparison the author cannot act on.
    ///
    /// - Parameter command: the selected command row, or nil for no selection.
    func showFailure(for command: TestCommandResult?) {
        guard let model, let command, !command.passed,
              let actual = command.actualOutput,
              let blessed = try? model.blessedText(for: command) else {
            return hideFailure()
        }
        failureCommand = command
        blessedText.string = blessed
        actualText.string = actual
        blessedHeading.stringValue = "Blessed  \(command.file.split(separator: "/").last.map(String.init) ?? ""):\(command.line)"

        // The button is offered exactly when pressing it would work; when it
        // would not, the reason is shown in its place rather than a dead
        // control the author has to press to learn about. Asking writes
        // nothing — `reblessObstacle` computes the rewrite and discards it.
        let reason = model.reblessObstacle(for: command).map(Self.reason(for:))
            ?? hostReblessObstacle?(command)
        reblessButton.isHidden = reason != nil
        reblessReason.stringValue = reason ?? ""
        failurePane.isHidden = false
        failurePaneHeight.constant = Self.failurePaneHeight
    }

    private func hideFailure() {
        failureCommand = nil
        blessedText.string = ""
        actualText.string = ""
        failurePane.isHidden = true
        failurePaneHeight.constant = 0
    }

    /// An obstacle in the author's terms.
    private static func reason(for error: Error) -> String {
        (error as? Rebless.Failure)?.errorDescription ?? error.localizedDescription
    }

    // MARK: - Actions

    @objc private func runClicked() { onRun?() }
    @objc private func cancelClicked() { onCancel?() }

    /// Accepts the story's new text for the drifted bless on show.
    ///
    /// Split from the click handler so tests drive it directly. On success the
    /// pane reopens against the rewritten file — so the "Blessed" side now
    /// reads what the story says, which is the author's confirmation that the
    /// edit landed.
    @discardableResult
    func performRebless() -> Bool {
        guard let model, let command = failureCommand else { return false }
        // Re-checked at the press, not only at selection: a tab can go dirty
        // while the comparison sits on screen.
        if let blocked = hostReblessObstacle?(command) {
            reblessButton.isHidden = true
            reblessReason.stringValue = blocked
            return false
        }
        do {
            try model.rebless(command)
        } catch {
            reblessButton.isHidden = true
            reblessReason.stringValue = Self.reason(for: error)
            return false
        }
        showFailure(for: command)
        onDidRebless?(command)
        return true
    }

    @objc private func reblessClicked() { performRebless() }

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

    /// Selecting a failed command row opens its old-vs-new (ADR-282 D2).
    func outlineViewSelectionDidChange(_ notification: Notification) {
        let row = outlineView.selectedRow
        let item = row >= 0 ? outlineView.item(atRow: row) : nil
        showFailure(for: (item as? CommandItem)?.command)
    }

    private static func entryLine(_ entry: TestPanelModel.Entry) -> NSAttributedString {
        let (dot, color): (String, NSColor) = {
            switch entry.status {
            case .idle: return ("○ ", Theme.foregroundFaint)
            case .running: return ("● ", .systemBlue)
            case .passed: return ("● ", .systemGreen)
            case .failed: return ("● ", .systemRed)
            case .error: return ("● ", .systemRed)
            // Unreached is not failed (ADR-302 D13): a hollow dot in the dim
            // colour, never red — the failure belongs to the ancestor.
            case .unreached: return ("◌ ", Theme.foregroundFaint)
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
        case .unreached(let blockedBy):
            let stem = blockedBy.map { URL(fileURLWithPath: $0).deletingPathExtension().lastPathComponent }
            s.append(NSAttributedString(string: "   never ran\(stem.map { " — blocked by \($0)" } ?? "")",
                                        attributes: [.foregroundColor: Theme.foregroundFaint, .font: bodyFont]))
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
