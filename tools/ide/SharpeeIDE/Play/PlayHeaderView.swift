// PlayHeaderView.swift
// The Play pane's header bar: a status dot (green when a story is loaded), a Restart
// button, and a "Play after build" toggle. Pure view — the controller owns behaviour.
// Public interface: onRestart / onPlayAfterBuildToggle callbacks; setLoaded(_:),
// setPlayAfterBuild(_:).
// Owner context: tools/ide — Play.

import AppKit

final class PlayHeaderView: NSView {

    static let height: CGFloat = 30

    var onRestart: (() -> Void)?
    var onPlayAfterBuildToggle: ((Bool) -> Void)?

    private let dot = NSView()
    private let restartButton = NSButton()
    private let playAfterBuildCheckbox = NSButton(checkboxWithTitle: "Play after build", target: nil, action: nil)

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

        playAfterBuildCheckbox.target = self
        playAfterBuildCheckbox.action = #selector(playAfterBuildChanged)
        playAfterBuildCheckbox.controlSize = .small
        playAfterBuildCheckbox.contentTintColor = Theme.foregroundDim
        playAfterBuildCheckbox.translatesAutoresizingMaskIntoConstraints = false

        addSubview(dot)
        addSubview(restartButton)
        addSubview(playAfterBuildCheckbox)

        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 8),
            dot.heightAnchor.constraint(equalToConstant: 8),
            dot.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            dot.centerYAnchor.constraint(equalTo: centerYAnchor),

            restartButton.leadingAnchor.constraint(equalTo: dot.trailingAnchor, constant: 10),
            restartButton.centerYAnchor.constraint(equalTo: centerYAnchor),

            playAfterBuildCheckbox.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
            playAfterBuildCheckbox.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])

        setLoaded(false)
    }

    required init?(coder: NSCoder) {
        fatalError("PlayHeaderView is not Storyboard-instantiable")
    }

    /// Green dot + enabled Restart when a story is loaded; dim dot + disabled Restart otherwise.
    func setLoaded(_ loaded: Bool) {
        dot.layer?.backgroundColor = (loaded ? NSColor.systemGreen : Theme.foregroundFaint).cgColor
        restartButton.isEnabled = loaded
    }

    func setPlayAfterBuild(_ on: Bool) {
        playAfterBuildCheckbox.state = on ? .on : .off
    }

    @objc private func restartClicked() {
        onRestart?()
    }

    @objc private func playAfterBuildChanged() {
        onPlayAfterBuildToggle?(playAfterBuildCheckbox.state == .on)
    }
}
