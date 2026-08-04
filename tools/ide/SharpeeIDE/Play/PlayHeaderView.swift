// PlayHeaderView.swift
// The Play pane's header bar: a status dot (green when a story is loaded), the
// New Thread button (ADR-299 D8 — a restart is a new skein thread from the
// root), the per-turn Bless gesture (ADR-282 D1, retiring into the Transcript
// view per ADR-299) and Checkpoint mark (D4), and a "Play after build" toggle.
// There is no Record toggle: playing always grows the skein (D1). Pure view —
// the controller owns behaviour.
// Public interface: onRestart / onBless / onCheckpoint /
// onPlayAfterBuildToggle callbacks; setLoaded(_:),
// setBless(available:isBlessed:), setCheckpoint(available:isCheckpoint:),
// setPlayAfterBuild(_:).
// Owner context: tools/ide — Play.

import AppKit

final class PlayHeaderView: NSView {

    static let height: CGFloat = 30

    var onRestart: (() -> Void)?
    var onPlayAfterBuildToggle: ((Bool) -> Void)?
    /// The per-turn bless gesture (ADR-282 D1) — vouch for the response on
    /// screen, or take the vouch back.
    var onBless: (() -> Void)?
    /// The checkpoint mark (ADR-282 D4) — end a walkthrough-chain segment at
    /// the turn on screen, or take the mark back.
    var onCheckpoint: (() -> Void)?

    private let dot = NSView()
    private let restartButton = NSButton()
    private let blessButton = NSButton()
    private let checkpointButton = NSButton()
    private let playAfterBuildCheckbox = NSButton(checkboxWithTitle: "Play after build", target: nil, action: nil)

    override func layout() {
        super.layout()
        // Header controls never dictate the pane's width (divider stays free);
        // they clip before they resist.
        restartButton.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        blessButton.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        checkpointButton.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        playAfterBuildCheckbox.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    }

    init() {
        super.init(frame: .zero)
        wantsLayer = true
        layer?.backgroundColor = Theme.railBackground.cgColor

        dot.wantsLayer = true
        dot.layer?.cornerRadius = 4
        dot.translatesAutoresizingMaskIntoConstraints = false

        // D8: a restart IS a new skein thread from the root — the button says
        // what it grows, not what it discards.
        restartButton.title = "New Thread"
        restartButton.bezelStyle = .rounded
        restartButton.controlSize = .small
        restartButton.target = self
        restartButton.action = #selector(restartClicked)
        restartButton.toolTip = "Restart from the story's beginning — a new thread from the skein root"
        restartButton.translatesAutoresizingMaskIntoConstraints = false

        blessButton.title = Self.blessTitle
        blessButton.bezelStyle = .rounded
        blessButton.controlSize = .small
        blessButton.target = self
        blessButton.action = #selector(blessClicked)
        // Clicking must not pull first responder out of the story's input field:
        // D1's gesture is play-and-bless in one motion, and an author who has to
        // click back into the game to keep typing has been interrupted.
        blessButton.refusesFirstResponder = true
        blessButton.toolTip = "Vouch for this turn's response (⇧⌘B)"
        blessButton.translatesAutoresizingMaskIntoConstraints = false

        checkpointButton.title = Self.checkpointTitle
        checkpointButton.bezelStyle = .rounded
        checkpointButton.controlSize = .small
        checkpointButton.target = self
        checkpointButton.action = #selector(checkpointClicked)
        // Same reason as Bless: the gesture happens mid-play, and an author who
        // has to click back into the game to keep typing has been interrupted.
        checkpointButton.refusesFirstResponder = true
        checkpointButton.toolTip = "End a walkthrough-chain segment here (⇧⌘K)"
        checkpointButton.translatesAutoresizingMaskIntoConstraints = false

        playAfterBuildCheckbox.target = self
        playAfterBuildCheckbox.action = #selector(playAfterBuildChanged)
        playAfterBuildCheckbox.controlSize = .small
        playAfterBuildCheckbox.contentTintColor = Theme.foregroundDim
        playAfterBuildCheckbox.translatesAutoresizingMaskIntoConstraints = false

        addSubview(dot)
        addSubview(restartButton)
        addSubview(blessButton)
        addSubview(checkpointButton)
        addSubview(playAfterBuildCheckbox)

        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 8),
            dot.heightAnchor.constraint(equalToConstant: 8),
            dot.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            dot.centerYAnchor.constraint(equalTo: centerYAnchor),

            restartButton.leadingAnchor.constraint(equalTo: dot.trailingAnchor, constant: 10),
            restartButton.centerYAnchor.constraint(equalTo: centerYAnchor),

            blessButton.leadingAnchor.constraint(equalTo: restartButton.trailingAnchor, constant: 6),
            blessButton.centerYAnchor.constraint(equalTo: centerYAnchor),

            checkpointButton.leadingAnchor.constraint(equalTo: blessButton.trailingAnchor, constant: 6),
            checkpointButton.centerYAnchor.constraint(equalTo: centerYAnchor),

            playAfterBuildCheckbox.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
            playAfterBuildCheckbox.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])

        setLoaded(false)
        setBless(available: false, isBlessed: false)
        setCheckpoint(available: false, isCheckpoint: false)
    }

    private static let blessTitle = "Bless"
    private static let blessedTitle = "Blessed ✓"
    private static let checkpointTitle = "Checkpoint"
    private static let checkpointedTitle = "Checkpoint ✓"

    required init?(coder: NSCoder) {
        fatalError("PlayHeaderView is not Storyboard-instantiable")
    }

    /// Green dot + enabled New Thread when a story is loaded; dim + disabled otherwise.
    func setLoaded(_ loaded: Bool) {
        dot.layer?.backgroundColor = (loaded ? NSColor.systemGreen : Theme.foregroundFaint).cgColor
        restartButton.isEnabled = loaded
        // Nothing on screen to vouch for or mark. The controller re-enables
        // these as soon as a turn arrives.
        if !loaded {
            setBless(available: false, isBlessed: false)
            setCheckpoint(available: false, isCheckpoint: false)
        }
    }

    /// Reflects the bless state of the turn on screen (ADR-282 D1).
    ///
    /// - Parameters:
    ///   - available: whether the latest turn can carry a bless at all. A turn
    ///     with a blank response gets no affordance, so this disables rather
    ///     than merely dimming.
    ///   - isBlessed: whether the author has already vouched for it — the
    ///     button reads back the standing verdict, since the gesture toggles.
    func setBless(available: Bool, isBlessed: Bool) {
        blessButton.isEnabled = available
        blessButton.title = isBlessed ? Self.blessedTitle : Self.blessTitle
        blessButton.contentTintColor = isBlessed ? .systemGreen : nil
    }

    /// Reflects the checkpoint mark on the turn on screen (ADR-282 D4).
    ///
    /// - Parameters:
    ///   - available: whether there is a captured turn to mark at all. Unlike
    ///     bless, a blank response is no objection — a checkpoint says where the
    ///     author reached, not that the text was right.
    ///   - isCheckpoint: whether this turn already ends a segment — the button
    ///     reads back the standing mark, since the gesture toggles.
    func setCheckpoint(available: Bool, isCheckpoint: Bool) {
        checkpointButton.isEnabled = available
        checkpointButton.title = isCheckpoint ? Self.checkpointedTitle : Self.checkpointTitle
        checkpointButton.contentTintColor = isCheckpoint ? .systemBlue : nil
    }

    func setPlayAfterBuild(_ on: Bool) {
        playAfterBuildCheckbox.state = on ? .on : .off
    }

    @objc private func restartClicked() {
        onRestart?()
    }

    @objc private func blessClicked() {
        onBless?()
    }

    @objc private func checkpointClicked() {
        onCheckpoint?()
    }

    @objc private func playAfterBuildChanged() {
        onPlayAfterBuildToggle?(playAfterBuildCheckbox.state == .on)
    }
}
