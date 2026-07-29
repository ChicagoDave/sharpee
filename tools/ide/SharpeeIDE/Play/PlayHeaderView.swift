// PlayHeaderView.swift
// The Play pane's header bar: a status dot (green when a story is loaded), Restart
// and Record buttons, the per-turn Bless gesture (ADR-282 D1), and a "Play after
// build" toggle. Pure view — the controller owns behaviour.
// Public interface: onRestart / onRecordToggle / onBless / onPlayAfterBuildToggle
// callbacks; setLoaded(_:), setRecording(_:), setBless(available:isBlessed:),
// setPlayAfterBuild(_:).
// Owner context: tools/ide — Play.

import AppKit

final class PlayHeaderView: NSView {

    static let height: CGFloat = 30

    var onRestart: (() -> Void)?
    var onPlayAfterBuildToggle: ((Bool) -> Void)?
    var onRecordToggle: (() -> Void)?
    /// The per-turn bless gesture (ADR-282 D1) — vouch for the response on
    /// screen, or take the vouch back.
    var onBless: (() -> Void)?

    private let dot = NSView()
    private let restartButton = NSButton()
    private let recordButton = NSButton()
    private let blessButton = NSButton()
    private let playAfterBuildCheckbox = NSButton(checkboxWithTitle: "Play after build", target: nil, action: nil)

    override func layout() {
        super.layout()
        // Header controls never dictate the pane's width (divider stays free);
        // they clip before they resist.
        restartButton.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        recordButton.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        blessButton.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        playAfterBuildCheckbox.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    }

    init() {
        super.init(frame: .zero)
        wantsLayer = true
        layer?.backgroundColor = Theme.railBackground.cgColor

        dot.wantsLayer = true
        dot.layer?.cornerRadius = 4
        dot.translatesAutoresizingMaskIntoConstraints = false

        restartButton.title = "Restart"
        restartButton.bezelStyle = .rounded
        restartButton.controlSize = .small
        restartButton.target = self
        restartButton.action = #selector(restartClicked)
        restartButton.translatesAutoresizingMaskIntoConstraints = false

        recordButton.title = "Record"
        recordButton.bezelStyle = .rounded
        recordButton.controlSize = .small
        recordButton.target = self
        recordButton.action = #selector(recordClicked)
        recordButton.translatesAutoresizingMaskIntoConstraints = false

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

        playAfterBuildCheckbox.target = self
        playAfterBuildCheckbox.action = #selector(playAfterBuildChanged)
        playAfterBuildCheckbox.controlSize = .small
        playAfterBuildCheckbox.contentTintColor = Theme.foregroundDim
        playAfterBuildCheckbox.translatesAutoresizingMaskIntoConstraints = false

        addSubview(dot)
        addSubview(restartButton)
        addSubview(recordButton)
        addSubview(blessButton)
        addSubview(playAfterBuildCheckbox)

        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 8),
            dot.heightAnchor.constraint(equalToConstant: 8),
            dot.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            dot.centerYAnchor.constraint(equalTo: centerYAnchor),

            restartButton.leadingAnchor.constraint(equalTo: dot.trailingAnchor, constant: 10),
            restartButton.centerYAnchor.constraint(equalTo: centerYAnchor),

            recordButton.leadingAnchor.constraint(equalTo: restartButton.trailingAnchor, constant: 6),
            recordButton.centerYAnchor.constraint(equalTo: centerYAnchor),

            blessButton.leadingAnchor.constraint(equalTo: recordButton.trailingAnchor, constant: 6),
            blessButton.centerYAnchor.constraint(equalTo: centerYAnchor),

            playAfterBuildCheckbox.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
            playAfterBuildCheckbox.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])

        setLoaded(false)
        setBless(available: false, isBlessed: false)
    }

    private static let blessTitle = "Bless"
    private static let blessedTitle = "Blessed ✓"

    required init?(coder: NSCoder) {
        fatalError("PlayHeaderView is not Storyboard-instantiable")
    }

    /// Green dot + enabled Restart/Record when a story is loaded; dim + disabled otherwise.
    func setLoaded(_ loaded: Bool) {
        dot.layer?.backgroundColor = (loaded ? NSColor.systemGreen : Theme.foregroundFaint).cgColor
        restartButton.isEnabled = loaded
        recordButton.isEnabled = loaded
        // Nothing on screen to vouch for. The controller re-enables this as
        // soon as a turn arrives.
        if !loaded { setBless(available: false, isBlessed: false) }
    }

    /// Reflects recording state: red "Stop Recording" while capturing.
    func setRecording(_ recording: Bool) {
        recordButton.title = recording ? "Stop Recording" : "Record"
        recordButton.contentTintColor = recording ? .systemRed : nil
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

    func setPlayAfterBuild(_ on: Bool) {
        playAfterBuildCheckbox.state = on ? .on : .off
    }

    @objc private func restartClicked() {
        onRestart?()
    }

    @objc private func recordClicked() {
        onRecordToggle?()
    }

    @objc private func blessClicked() {
        onBless?()
    }

    @objc private func playAfterBuildChanged() {
        onPlayAfterBuildToggle?(playAfterBuildCheckbox.state == .on)
    }
}
