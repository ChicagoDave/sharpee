// WorldFindingExplanation.swift
// The panel under the Incomplete list: what the selected finding means, and the two
// places it names.
//
// A candidate list row is one line, and one line cannot hold three facts an author
// needs to act — the phrase they wrote, the thing the analyzer matched it against,
// and why those two were paired. The row carries the first; this carries all three
// and makes both places reachable (ADR-321 Amendment 2).
//
// IT NEVER SAYS "ERROR" (D6). The wording is what a player would experience — *a
// player typing this reaches nothing* — because that is the fact, and whether it
// matters is the author's call, not the analyzer's.
// Public interface: WorldFindingExplanation.show(_:), onGoToPhrase, onGoToTarget,
// onIgnore.
// Owner context: tools/ide — World.

import AppKit

final class WorldFindingExplanation: NSView {

    /// Invoked when the author asks to see the phrase in their prose.
    var onGoToPhrase: ((WorldFindingDestination) -> Void)?
    /// Invoked when the author asks to see the thing the phrase matched.
    var onGoToTarget: ((WorldFindingDestination) -> Void)?
    /// Invoked when the author dismisses a phrase, or takes that back.
    var onIgnore: ((String) -> Void)?

    private let sentence = NSTextField(labelWithString: "")
    private let phraseButton = NSButton(title: "", target: nil, action: nil)
    private let targetButton = NSButton(title: "", target: nil, action: nil)
    private let ignoreButton = NSButton(title: "", target: nil, action: nil)
    private var row: WorldFindingRow?

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        sentence.lineBreakMode = .byWordWrapping
        sentence.maximumNumberOfLines = 3
        sentence.textColor = Theme.foreground
        sentence.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        for (button, action) in [(phraseButton, #selector(goToPhrase)),
                                 (targetButton, #selector(goToTarget)),
                                 (ignoreButton, #selector(toggleIgnore))] {
            button.bezelStyle = .inline
            button.controlSize = .small
            button.target = self
            button.action = action
        }

        for subview in [sentence, phraseButton, targetButton, ignoreButton] as [NSView] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            addSubview(subview)
        }

        NSLayoutConstraint.activate([
            sentence.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            sentence.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
            sentence.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10),

            phraseButton.topAnchor.constraint(equalTo: sentence.bottomAnchor, constant: 6),
            phraseButton.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
            phraseButton.bottomAnchor.constraint(lessThanOrEqualTo: bottomAnchor, constant: -8),

            targetButton.centerYAnchor.constraint(equalTo: phraseButton.centerYAnchor),
            targetButton.leadingAnchor.constraint(equalTo: phraseButton.trailingAnchor, constant: 8),

            ignoreButton.centerYAnchor.constraint(equalTo: phraseButton.centerYAnchor),
            ignoreButton.leadingAnchor.constraint(greaterThanOrEqualTo: targetButton.trailingAnchor, constant: 8),
            ignoreButton.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10),
        ])

        NotificationCenter.default.addObserver(self, selector: #selector(fontPreferenceChanged),
                                               name: FontPreference.didChangeNotification,
                                               object: nil)
        show(nil)
    }

    required init?(coder: NSCoder) {
        fatalError("WorldFindingExplanation is not Storyboard-instantiable")
    }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = Theme.playBackground.cgColor
    }

    /// Renders one finding, or the resting state when nothing is selected.
    ///
    /// The resting state says what selecting does rather than going blank: an empty
    /// panel under a full list reads as a surface that failed to load.
    ///
    /// - Parameter row: the selected row, or nil
    func show(_ row: WorldFindingRow?) {
        self.row = row
        sentence.font = FontPreference.panelFont

        guard let row, row.isHeader == false, let explanation = row.explanation else {
            sentence.stringValue = "Select a candidate to see what a player typing it would reach."
            sentence.textColor = Theme.foregroundFaint
            phraseButton.isHidden = true
            targetButton.isHidden = true
            ignoreButton.isHidden = true
            return
        }

        sentence.stringValue = explanation
        sentence.textColor = Theme.foreground
        phraseButton.isHidden = row.passage == nil && row.line == nil
        phraseButton.title = "Show it in the prose"
        targetButton.isHidden = row.declaration == nil
        targetButton.title = "Show \(row.targetName ?? "the thing it matched")"
        // The author's own verdict on the row. Phrased as what it does, both ways —
        // a candidate list the reader cannot silence is a list they learn to skip.
        ignoreButton.isHidden = row.phrase == nil
        ignoreButton.title = row.isIgnored ? "Stop ignoring it" : "Ignore this phrase"
    }

    @objc private func fontPreferenceChanged() {
        show(row)
    }

    @objc private func goToPhrase() {
        guard let row else { return }
        onGoToPhrase?(row.destination)
    }

    @objc private func toggleIgnore() {
        guard let phrase = row?.phrase else { return }
        onIgnore?(phrase)
    }

    @objc private func goToTarget() {
        guard let row else { return }
        onGoToTarget?(row.destination.atDeclaration())
    }
}
