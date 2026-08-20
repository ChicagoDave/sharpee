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

/// Where activating a World row takes the reader.
///
/// A finding has two places, not one: the phrase in the author's prose, and the
/// thing the phrase was matched against. Carrying both lets the surface offer
/// "show me where I wrote it" and "show me the thing you mean" from one row
/// (Amendment 2) — the row itself resolves neither, because locating a phrase
/// needs the source text and a view does not hold it.
struct WorldFindingDestination: Equatable {

    /// Which of a finding's two places the reader asked for.
    enum Place: Equatable {
        /// The phrase, in the author's own prose.
        case phrase
        /// The declaration of the thing the phrase matched.
        case declaration
    }

    /// The phrase to find inside the passage, when the row names one.
    let phrase: String?
    /// The passage the phrase sits in.
    let passage: WorldSourceSpan?
    /// Where the matched thing was declared, when the row names one.
    let declaration: WorldSourceSpan?
    /// A bare line, for rows that name one and nothing finer (Reach).
    let line: Int?
    /// Which place this particular request meant.
    let place: Place

    /// Builds a destination, defaulting to the phrase.
    /// - Parameters:
    ///   - phrase: the phrase to find inside `passage`
    ///   - passage: where the passage sits
    ///   - declaration: where the matched thing was declared
    ///   - line: a bare line, when that is all the row names
    ///   - place: which place a request means — the phrase unless asked otherwise
    init(phrase: String?, passage: WorldSourceSpan?, declaration: WorldSourceSpan?,
         line: Int?, place: Place = .phrase) {
        self.phrase = phrase
        self.passage = passage
        self.declaration = declaration
        self.line = line
        self.place = place
    }

    /// The same finding, asking for the declaration instead of the phrase.
    /// - Returns: a copy whose `place` is `.declaration`
    func atDeclaration() -> WorldFindingDestination {
        WorldFindingDestination(phrase: phrase, passage: passage, declaration: declaration,
                                line: line, place: .declaration)
    }
}

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
    /// The phrase this row is about — what to look for inside `passage`.
    let phrase: String?
    /// A sentence saying what this finding means, for the explanation panel.
    let explanation: String?
    /// The author's name for the thing the phrase matched, when it matched one.
    let targetName: String?
    /// Which role band this row belongs to, when it is a finding.
    let band: WorldMentionRole?
    /// The words the prose used that the matched thing does not answer to.
    ///
    /// One button each on the card: adding a word the AUTHOR already wrote about
    /// that thing is the whole fix for a missing-word finding.
    let unknownWords: [String]
    /// Whether this candidate can be declared into existence as scenery.
    let canDefineScenery: Bool
    /// The room to put new scenery in and next to — the passage's owner, when it is a room.
    let room: WorldRoomPlacement?
    /// Set when this card is now asking for a description rather than reporting a phrase.
    let needsDescription: Bool
    /// What the author did, when they have finished with this card.
    let doneNote: String?
    /// Whether the author has dismissed this phrase.
    let isIgnored: Bool
    /// Where the passage holding the phrase sits.
    let passage: WorldSourceSpan?
    /// Where the thing the phrase matched was declared.
    let declaration: WorldSourceSpan?

    /// Everywhere this row can take the reader.
    var destination: WorldFindingDestination {
        WorldFindingDestination(phrase: phrase, passage: passage, declaration: declaration, line: line)
    }

    /// Builds a finding row.
    /// - Parameters:
    ///   - title: the headline
    ///   - detail: supporting text, dimmed
    ///   - symbol: an SF Symbol naming the class
    ///   - tint: the class's accent color
    ///   - line: source line to jump to, when there is one
    init(title: String, detail: String? = nil, symbol: String? = nil,
         tint: NSColor? = nil, isHeader: Bool = false, line: Int? = nil,
         phrase: String? = nil, passage: WorldSourceSpan? = nil,
         declaration: WorldSourceSpan? = nil, explanation: String? = nil,
         targetName: String? = nil, band: WorldMentionRole? = nil,
         isIgnored: Bool = false, unknownWords: [String] = [],
         canDefineScenery: Bool = false, room: WorldRoomPlacement? = nil,
         needsDescription: Bool = false, doneNote: String? = nil) {
        self.title = title
        self.detail = detail
        self.symbol = symbol
        self.tint = tint
        self.isHeader = isHeader
        self.line = line
        self.phrase = phrase
        self.passage = passage
        self.declaration = declaration
        self.explanation = explanation
        self.targetName = targetName
        self.band = band
        self.isIgnored = isIgnored
        self.unknownWords = unknownWords
        self.canDefineScenery = canDefineScenery
        self.room = room
        self.needsDescription = needsDescription
        self.doneNote = doneNote
    }

    /// One row with some fields replaced — the copier the transitions above share.
    private func copy(unknownWords: [String]? = nil,
                      isIgnored: Bool? = nil,
                      band: WorldMentionRole? = nil,
                      doneNote: String?? = nil) -> WorldFindingRow {
        WorldFindingRow(title: title, detail: detail, symbol: symbol, tint: tint,
                        isHeader: isHeader, line: line, phrase: phrase, passage: passage,
                        declaration: declaration, explanation: explanation,
                        targetName: targetName, band: band ?? self.band,
                        isIgnored: isIgnored ?? self.isIgnored,
                        unknownWords: unknownWords ?? self.unknownWords,
                        canDefineScenery: canDefineScenery, room: room,
                        needsDescription: needsDescription,
                        doneNote: doneNote ?? self.doneNote)
    }

    /// The same row, in a role band.
    /// - Parameter role: the band it belongs to
    /// - Returns: the row, banded
    func banded(_ role: WorldMentionRole) -> WorldFindingRow {
        copy(band: role)
    }

    /// Whether the author has finished with this card — fixed, not dismissed.
    var isDone: Bool { doneNote != nil }

    /// The same row with fewer words left to add, and whether that finished it.
    /// - Parameters:
    ///   - words: the words still unaccepted
    ///   - done: whether the card is finished
    /// - Returns: the row, advanced
    func withUnknownWords(_ words: [String], done: Bool) -> WorldFindingRow {
        copy(unknownWords: words,
             doneNote: done ? "added — rebuild to confirm" : nil)
    }

    /// The same row, now a declared thing that still says nothing.
    ///
    /// The card does not vanish when its offer is accepted: declaring the thing
    /// answers one question and raises the next, and the author is already here with
    /// the file open (David's ruling).
    ///
    /// - Parameter line: where the description goes
    /// - Returns: the row, asking for a description
    func declaredAwaitingDescription(line: Int) -> WorldFindingRow {
        WorldFindingRow(title: "“\(phrase ?? title)” is declared, and says nothing",
                        detail: "scenery with no description reads as “You see nothing special.”",
                        symbol: "text.alignleft", tint: tint, isHeader: false, line: line,
                        phrase: phrase, passage: nil, declaration: nil,
                        explanation: "You declared “\(phrase ?? "it")” as scenery. A player who "
                            + "examines it is told there is nothing special about it until you "
                            + "write its description — which is the line this button goes to.",
                        targetName: targetName, band: band, isIgnored: isIgnored,
                        unknownWords: [], canDefineScenery: false, room: room,
                        needsDescription: true)
    }

    /// The same row, marked as dismissed or not.
    ///
    /// A copy rather than a mutation: rows are values the owning view rebuilds, and
    /// the ignore state is the view's to apply, not the row's to remember.
    ///
    /// - Parameter ignored: whether the author has dismissed this phrase
    /// - Returns: the row, marked
    func markingIgnored(_ ignored: Bool) -> WorldFindingRow {
        copy(isIgnored: ignored)
    }

    static func == (lhs: WorldFindingRow, rhs: WorldFindingRow) -> Bool {
        lhs.title == rhs.title && lhs.detail == rhs.detail
            && lhs.symbol == rhs.symbol && lhs.isHeader == rhs.isHeader && lhs.line == rhs.line
            && lhs.destination == rhs.destination && lhs.isIgnored == rhs.isIgnored
    }
}

final class WorldFindingTable: NSView {

    /// Invoked when a row naming somewhere in the source is double-clicked.
    var onActivate: ((WorldFindingDestination) -> Void)?

    /// Invoked when the selected row changes — nil when the selection is cleared.
    var onSelect: ((WorldFindingRow?) -> Void)?

    /// Invoked when the author presses a button on a card.
    var onCardAction: ((WorldCandidateAction, WorldFindingRow) -> Void)?

    /// Whether findings render as cards. Off for Reach, which has nothing to offer.
    var rendersCards = false {
        didSet {
            tableView.usesAutomaticRowHeights = rendersCards
            tableView.reloadData()
        }
    }

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
        // .custom: the row holds the author's chosen panel font, which is taller
        // than any standard style at the larger scales — .small (17pt) let
        // Georgia at XL draw over the row beneath it.
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
        onSelect?(nil)
        placeholder.stringValue = emptyMessage
        placeholder.isHidden = !rows.isEmpty
        scrollView.isHidden = rows.isEmpty
        tableView.reloadData()
        tableView.scrollRowToVisible(0)
    }

    @objc private func fontPreferenceChanged() {
        tableView.rowHeight = FontPreference.panelRowHeight
        tableView.reloadData()
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        let index = tableView.selectedRow
        onSelect?(rows.indices.contains(index) ? rows[index] : nil)
    }

    @objc private func doubleClicked() {
        let index = tableView.clickedRow
        guard rows.indices.contains(index) else { return }
        let row = rows[index]
        guard row.line != nil || row.passage != nil else { return }
        onActivate?(row.destination)
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

        // A candidate is a CARD (David's ruling): the finding and what to do about it
        // in one place. Reach findings stay one-line rows — they name a room the
        // player cannot get to, which is a fact about the map with no button on it.
        if rendersCards, !row.isHeader {
            let card = tableView.makeView(withIdentifier: WorldCandidateCard.identifier, owner: self)
                as? WorldCandidateCard ?? makeCard()
            card.show(row)
            return card
        }

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
                // A dismissed row still reads as a row — struck through rather than
                // restyled — so "Ignored" looks like the same list, filtered.
                .foregroundColor: row.isIgnored ? Theme.foregroundFaint : Theme.foreground,
                .font: FontPreference.family.font(size: size),
                .strikethroughStyle: row.isIgnored ? NSUnderlineStyle.single.rawValue : 0,
            ]))
            if let detail = row.detail {
                text.append(NSAttributedString(string: "   \(detail)", attributes: [
                    .foregroundColor: Theme.foregroundFaint,
                    .font: FontPreference.family.font(size: size - 1),
                ]))
            }
        }
        cell.textField?.attributedStringValue = Self.singleLine(text)
        return cell
    }

    /// Clamps an attributed row string to one truncated line.
    ///
    /// A field's `lineBreakMode` governs its `stringValue`; an attributed value
    /// carries its own paragraph style, and the default one WRAPS. A long finding
    /// therefore drew a second line outside its row and over the row beneath it,
    /// which is what the author sees as smeared text.
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

    /// Builds a reusable card, wired to report what the author pressed.
    /// - Returns: the card view
    private func makeCard() -> WorldCandidateCard {
        let card = WorldCandidateCard()
        card.identifier = WorldCandidateCard.identifier
        card.onAction = { [weak self] action, row in self?.onCardAction?(action, row) }
        return card
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
        // Belt to the paragraph style's braces: a row is one line, always.
        label.maximumNumberOfLines = 1
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
