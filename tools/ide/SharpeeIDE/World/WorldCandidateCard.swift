// WorldCandidateCard.swift
// One candidate, as a card the author can act on (ADR-321 Amendment 3).
//
// The list stopped being a report: a row that says *the door does not answer to
// "stout"* and leaves the author to go and type it themselves is a diagnosis with no
// treatment. Each card carries the fix — a button per word the prose used, one to
// declare a thing that does not exist, and one to say "this is fine, stop telling me".
//
// THE CARD OFFERS, IT DOES NOT DO. Every button hands an edit up to the window,
// which applies it through the editor's undoable path; nothing here touches a file,
// and nothing invents prose (adding `stout` uses the author's own word for that door;
// declaring scenery stops at the description).
// Public interface: WorldCandidateCard, WorldCandidateAction.
// Owner context: tools/ide — World.

import AppKit

/// What an author asked a card to do.
enum WorldCandidateAction: Equatable {
    /// Teach the matched thing one word the prose already uses for it.
    case addWord(String)
    /// Declare the phrase as scenery, because nothing answers to it.
    case defineScenery
    /// Go to the line where the new thing's description belongs.
    case writeDescription
    /// Stop reporting this phrase.
    case ignore
    /// Take the last dismissal back.
    case unignore
    /// Show the phrase where the author wrote it.
    case showPhrase
    /// Show the thing the phrase matched, where it is declared.
    case showTarget
}

final class WorldCandidateCard: NSTableCellView {

    static let identifier = NSUserInterfaceItemIdentifier("WorldCandidateCard")

    /// Invoked when the author presses one of this card's buttons.
    var onAction: ((WorldCandidateAction, WorldFindingRow) -> Void)?

    private let headline = NSTextField(labelWithString: "")
    private let sentence = NSTextField(labelWithString: "")
    private let actions = NSStackView()
    private var row: WorldFindingRow?
    private var buttonActions: [NSButton: WorldCandidateAction] = [:]

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.cornerRadius = 6

        headline.lineBreakMode = .byTruncatingTail
        headline.maximumNumberOfLines = 1
        sentence.lineBreakMode = .byWordWrapping
        sentence.maximumNumberOfLines = 3
        for label in [headline, sentence] {
            label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        }

        actions.orientation = .horizontal
        actions.spacing = 6
        actions.alignment = .centerY

        for subview in [headline, sentence, actions] as [NSView] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            addSubview(subview)
        }
        textField = headline

        NSLayoutConstraint.activate([
            headline.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            headline.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            headline.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),

            sentence.topAnchor.constraint(equalTo: headline.bottomAnchor, constant: 3),
            sentence.leadingAnchor.constraint(equalTo: headline.leadingAnchor),
            sentence.trailingAnchor.constraint(equalTo: headline.trailingAnchor),

            actions.topAnchor.constraint(equalTo: sentence.bottomAnchor, constant: 6),
            actions.leadingAnchor.constraint(equalTo: headline.leadingAnchor),
            actions.trailingAnchor.constraint(lessThanOrEqualTo: headline.trailingAnchor),
            actions.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -9),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("WorldCandidateCard is not Storyboard-instantiable")
    }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = (row?.isIgnored == true
            ? Theme.foregroundFaint.withAlphaComponent(0.06)
            : Theme.foregroundFaint.withAlphaComponent(0.11)).cgColor
    }

    /// Renders one candidate and the offers that go with it.
    /// - Parameter row: the candidate row
    func show(_ row: WorldFindingRow) {
        self.row = row
        let size = FontPreference.scale.panelSize

        let spent = row.isIgnored || row.isDone
        headline.attributedStringValue = NSAttributedString(string: row.title, attributes: [
            .foregroundColor: spent ? Theme.foregroundFaint : Theme.foreground,
            .font: FontPreference.family.font(size: size),
            .strikethroughStyle: row.isIgnored ? NSUnderlineStyle.single.rawValue : 0,
        ])
        sentence.attributedStringValue = NSAttributedString(
            string: row.doneNote.map { "✓ \($0)" } ?? row.explanation ?? row.detail ?? "",
            attributes: [.foregroundColor: Theme.foregroundFaint,
                         .font: FontPreference.family.font(size: size - 1)])

        for view in actions.arrangedSubviews { actions.removeArrangedSubview(view); view.removeFromSuperview() }
        buttonActions.removeAll()
        for offer in Self.offers(for: row) {
            let button = NSButton(title: Self.title(of: offer, row: row), target: self, action: #selector(pressed(_:)))
            button.bezelStyle = .inline
            button.controlSize = .small
            buttonActions[button] = offer
            actions.addArrangedSubview(button)
        }
        needsDisplay = true
    }

    /// What this card can offer, in the order an author would reach for them.
    ///
    /// The fixes come first and the dismissal last: a card is a thing to do something
    /// about before it is a thing to silence.
    ///
    /// - Parameter row: the candidate row
    /// - Returns: the offers, left to right
    static func offers(for row: WorldFindingRow) -> [WorldCandidateAction] {
        // A card that has become a question about a description asks only that.
        if row.needsDescription {
            return row.isIgnored ? [.unignore] : [.writeDescription, .ignore]
        }
        // A finished card offers nothing: it is showing what the author did, and the
        // next build will take it away.
        if row.isDone { return [] }

        var offers: [WorldCandidateAction] = []
        if !row.isIgnored {
            // One button per word the prose used that the thing does not answer to.
            offers += row.unknownWords.map { WorldCandidateAction.addWord($0) }
            if row.canDefineScenery { offers.append(.defineScenery) }
        }
        if row.passage != nil { offers.append(.showPhrase) }
        if row.declaration != nil { offers.append(.showTarget) }
        offers.append(row.isIgnored ? .unignore : .ignore)
        return offers
    }

    /// What a button says.
    /// - Parameters:
    ///   - action: the offer
    ///   - row: the candidate it belongs to
    /// - Returns: the button title
    static func title(of action: WorldCandidateAction, row: WorldFindingRow) -> String {
        switch action {
        case .addWord(let word): return "+ \(word)"
        case .defineScenery: return "Define as scenery"
        case .ignore: return "Ignore"
        case .unignore: return "Stop ignoring"
        case .showPhrase: return "In prose"
        case .showTarget: return "Show \(row.targetName ?? "the match")"
        case .writeDescription: return "Write the description"
        }
    }

    @objc private func pressed(_ sender: NSButton) {
        guard let action = buttonActions[sender], let row else { return }
        onAction?(action, row)
    }
}
