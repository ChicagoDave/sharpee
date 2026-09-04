// IndexView.swift
// The Index tab (right panel): the story's granular reference — headline stats
// over SECTION TABS (Rooms / Regions / Things / People / Actions / Phrases /
// Hatch Modules; David's ruling: tabs, not expanders), each showing a flat,
// span-navigable list. Live off the same retained IR as everything else, stale-
// marked with it. Section tabs are rebuilt per story (empty sections omitted);
// the selected section survives recomposes when it still exists.
// Public interface: IndexView.setState(_:), onActivate.
// Owner context: tools/ide — Play (right panel).

import AppKit

final class IndexView: NSView {

    /// Invoked when a row with a span is double-clicked (jump to the source).
    var onActivate: ((DiagnosticSpan) -> Void)?

    private let staleBanner = NSTextField(labelWithString: "Showing last good compile — the story has errors")
    private let sectionStrip = TabStripView()
    private let scrollView = NSScrollView()
    private let tableView = NSTableView()
    private let placeholder = NSTextField(labelWithString: "Open a story to build its index")

    private var sections: [IndexSection] = []
    private var selectedKind: IndexSectionKind?
    private var rows: [IndexRow] { currentSection?.rows ?? [] }
    private var currentSection: IndexSection? {
        sections.first { $0.kind == selectedKind } ?? sections.first
    }

    /// Retained so a font-preference change can re-render the same content.
    private var lastState: IRTreeState.Display = .empty(reason: "Open a story to build its index")

    private static let cellIdentifier = NSUserInterfaceItemIdentifier("IndexCell")

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        staleBanner.font = NSFont.systemFont(ofSize: 10)
        staleBanner.textColor = NSColor.systemYellow
        staleBanner.isHidden = true

        sectionStrip.onSelect = { [weak self] index in
            guard let self, self.sections.indices.contains(index) else { return }
            self.selectedKind = self.sections[index].kind
            self.tableView.reloadData()
        }

        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("entry"))
        column.resizingMask = .autoresizingMask
        tableView.addTableColumn(column)
        tableView.headerView = nil
        // .custom: rows carry the author's chosen panel font (see
        // FontPreference.panelRowHeight) — a standard style fits only one scale.
        tableView.rowSizeStyle = .custom
        tableView.rowHeight = FontPreference.panelRowHeight
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

        for view in [staleBanner, sectionStrip, scrollView, placeholder] {
            view.translatesAutoresizingMaskIntoConstraints = false
            addSubview(view)
        }
        // Wrapping labels must never dictate the pane's width (the divider
        // fight): compress before resisting.
        for label in [staleBanner, placeholder] {
            label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        }

        NSLayoutConstraint.activate([
            staleBanner.topAnchor.constraint(equalTo: topAnchor, constant: 4),
            staleBanner.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
            staleBanner.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10),

            sectionStrip.topAnchor.constraint(equalTo: staleBanner.bottomAnchor, constant: 2),
            sectionStrip.leadingAnchor.constraint(equalTo: leadingAnchor),
            sectionStrip.trailingAnchor.constraint(equalTo: trailingAnchor),

            scrollView.topAnchor.constraint(equalTo: sectionStrip.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

            placeholder.centerXAnchor.constraint(equalTo: centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: centerYAnchor),
            placeholder.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 10),
            placeholder.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -10),
        ])

        setState(.empty(reason: "Open a story to build its index"))

        NotificationCenter.default.addObserver(self, selector: #selector(fontPreferenceChanged),
                                               name: FontPreference.didChangeNotification,
                                               object: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("IndexView is not Storyboard-instantiable")
    }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = Theme.playBackground.cgColor
    }

    @objc private func fontPreferenceChanged() {
        tableView.rowHeight = FontPreference.panelRowHeight
        setState(lastState)
    }

    /// Renders a tree display state (shared with the rest of the IDE: populated /
    /// stale / empty-with-reason).
    func setState(_ state: IRTreeState.Display) {
        lastState = state
        switch state {
        case .empty(let reason):
            sections = []
            selectedKind = nil
            placeholder.stringValue = reason
            staleBanner.isHidden = true
            tableView.alphaValue = 1
        case .populated(let ir, let stale):
            sections = StoryIndex.sections(of: ir)
            placeholder.stringValue = "This story defines nothing to index yet"
            staleBanner.isHidden = !stale
            tableView.alphaValue = stale ? 0.55 : 1
        }
        // Rebuild the section tabs — counts ride IN the titles (David's ruling:
        // no separate stats row) — keeping the previously selected section when
        // the recomposed story still has it.
        let keepIndex = sections.firstIndex { $0.kind == selectedKind } ?? 0
        sectionStrip.setTabs(sections.map { "\($0.title) · \($0.rows.count)" }, select: keepIndex)
        selectedKind = currentSection?.kind
        tableView.reloadData()

        let isEmpty = sections.isEmpty
        scrollView.isHidden = isEmpty
        sectionStrip.isHidden = isEmpty
        placeholder.isHidden = !isEmpty
    }

    /// The headline stats parts ("18 rooms", "41 things", … — zeros omitted).
    static func statsParts(for ir: ComposeStoryIR) -> [(count: Int, label: String)] {
        let stats = StoryIndex.stats(of: ir)
        var parts: [(Int, String)] = []
        func add(_ n: Int, _ singular: String, _ plural: String? = nil) {
            guard n > 0 else { return }
            parts.append((n, n == 1 ? singular : (plural ?? singular + "s")))
        }
        add(stats.rooms, "room")
        add(stats.regions, "region")
        add(stats.things, "thing")
        add(stats.people, "person", "people")
        add(stats.actions, "action")
        add(stats.phrases, "phrase")
        add(stats.hatches, "hatch module")
        return parts
    }

    /// The stats line as plain text (tests pin this shape).
    static func statsLine(for ir: ComposeStoryIR) -> String {
        statsParts(for: ir).map { "\($0.count) \($0.label)" }.joined(separator: " · ")
    }

    /// The stats line styled: numbers accented, labels dim, dot separators faint.
    static func attributedStatsLine(for ir: ComposeStoryIR) -> NSAttributedString {
        let text = NSMutableAttributedString()
        let parts = statsParts(for: ir)
        for (i, part) in parts.enumerated() {
            if i > 0 {
                text.append(NSAttributedString(string: "  ·  ", attributes: [
                    .foregroundColor: Theme.foregroundFaint,
                    .font: NSFont.systemFont(ofSize: 11),
                ]))
            }
            let size = FontPreference.scale.panelSize
            text.append(NSAttributedString(string: "\(part.count)", attributes: [
                .foregroundColor: Theme.tokenNumber,
                .font: NSFont.monospacedDigitSystemFont(ofSize: size + 0.5, weight: .semibold),
            ]))
            text.append(NSAttributedString(string: " \(part.label)", attributes: [
                .foregroundColor: Theme.foregroundDim,
                .font: FontPreference.family.font(size: size - 1),
            ]))
        }
        return text
    }

    /// Section identity: icon + accent color (the "Fonts and Color" pass).
    static func decoration(for kind: IndexSectionKind) -> (symbol: String, color: NSColor) {
        switch kind {
        case .rooms: return ("square.split.bottomrightquarter", Theme.tokenType)
        case .regions: return ("map", Theme.tokenFunction)
        case .things: return ("cube", Theme.tokenNumber)
        case .people: return ("person", Theme.tokenKeyword)
        case .actions: return ("bolt", Theme.accent)
        case .phrases: return ("text.quote", Theme.tokenString)
        case .hatches: return ("puzzlepiece.extension", Theme.tokenComment)
        }
    }

    @objc private func doubleClicked() {
        let row = tableView.clickedRow
        guard rows.indices.contains(row), let span = rows[row].span else { return }
        onActivate?(span)
    }
}

// MARK: - Data source / delegate

extension IndexView: NSTableViewDataSource {
    func numberOfRows(in tableView: NSTableView) -> Int { rows.count }
}

extension IndexView: NSTableViewDelegate {
    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row rowIndex: Int) -> NSView? {
        guard rows.indices.contains(rowIndex), let kind = currentSection?.kind else { return nil }
        let row = rows[rowIndex]
        let deco = Self.decoration(for: kind)

        let cell = tableView.makeView(withIdentifier: Self.cellIdentifier, owner: self)
            as? NSTableCellView ?? makeCell()
        cell.imageView?.image = NSImage(systemSymbolName: deco.symbol, accessibilityDescription: nil)
        cell.imageView?.contentTintColor = deco.color.withAlphaComponent(0.55)

        let text = NSMutableAttributedString()
        let titleFont: NSFont = row.isCode ? FontPreference.panelMonoFont : FontPreference.panelFont
        text.append(NSAttributedString(
            string: row.title,
            attributes: [.foregroundColor: Theme.foreground, .font: titleFont]))
        if let detail = row.detail {
            let smaller = FontPreference.scale.panelSize - 1
            let detailFont: NSFont = row.isCode
                ? .monospacedSystemFont(ofSize: smaller, weight: .regular)
                : FontPreference.family.font(size: smaller)
            text.append(NSAttributedString(
                string: "   \(detail)",
                attributes: [.foregroundColor: Theme.foregroundFaint, .font: detailFont]))
        }
        cell.textField?.attributedStringValue = Self.singleLine(text)
        return cell
    }

    /// Clamps an attributed row string to one truncated line.
    ///
    /// The field's `lineBreakMode` governs its `stringValue` only — an attributed
    /// value brings its own paragraph style, and the default one wraps a long row
    /// into a second line that draws over its neighbour.
    ///
    /// - Parameter text: the composed row string
    /// - Returns: the same string, set to truncate rather than wrap
    private static func singleLine(_ text: NSMutableAttributedString) -> NSAttributedString {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineBreakMode = .byTruncatingTail
        text.addAttribute(.paragraphStyle, value: paragraph,
                          range: NSRange(location: 0, length: text.length))
        return text
    }

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
        // Belt to the paragraph style's braces: a row is one line, always.
        label.maximumNumberOfLines = 1
        label.translatesAutoresizingMaskIntoConstraints = false
        cell.textField = label
        cell.addSubview(label)

        NSLayoutConstraint.activate([
            icon.leadingAnchor.constraint(equalTo: cell.leadingAnchor, constant: 6),
            icon.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 16),
            icon.heightAnchor.constraint(equalToConstant: 16),

            label.leadingAnchor.constraint(equalTo: icon.trailingAnchor, constant: 6),
            label.trailingAnchor.constraint(equalTo: cell.trailingAnchor, constant: -4),
            label.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
        ])
        return cell
    }
}
