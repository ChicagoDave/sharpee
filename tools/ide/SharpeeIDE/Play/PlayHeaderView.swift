// PlayHeaderView.swift
// The Play pane's header bar: a status dot (green when a story is loaded), a
// Restart button, a theme picker (IDE chrome over the play surface — Phase 6b),
// and a "Play after build" toggle. That is the whole header. (The 6f Create
// Transcript button is retired — ADR-306 D1, David's shred ruling 2026-08-09;
// test authoring lives in the testing play surface window.)
// Pure view — the controller owns behaviour.
// Public interface: onRestart / onPlayAfterBuildToggle / onThemeSelect
// callbacks; setLoaded(_:), setPlayAfterBuild(_:),
// setThemes(_:selectedThemeId:).
// Owner context: tools/ide — Play.

import AppKit

final class PlayHeaderView: NSView {

    static let height: CGFloat = 30

    /// The picker's first entry: no IDE interference, the story wears whatever
    /// its own build wired. Reported to `onThemeSelect` as nil.
    static let storyDefaultTitle = "Story Default"

    var onRestart: (() -> Void)?
    var onPlayAfterBuildToggle: ((Bool) -> Void)?
    /// A theme id from the catalog, or nil for Story Default.
    var onThemeSelect: ((String?) -> Void)?
    private let dot = NSView()
    private let restartButton = NSButton()
    private let themePicker = NSPopUpButton(frame: .zero, pullsDown: false)
    private let playAfterBuildCheckbox = NSButton(checkboxWithTitle: "Play after build", target: nil, action: nil)

    override func layout() {
        super.layout()
        // Header controls never dictate the pane's width (divider stays free);
        // they clip before they resist.
        restartButton.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        themePicker.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        playAfterBuildCheckbox.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    }

    init() {
        super.init(frame: .zero)
        wantsLayer = true
        layer?.backgroundColor = Theme.railBackground.cgColor

        dot.wantsLayer = true
        dot.layer?.cornerRadius = 4
        dot.translatesAutoresizingMaskIntoConstraints = false

        // "New Thread" while a restart minted a skein thread; with the skein
        // retired the button says plainly what it does.
        restartButton.title = "Restart"
        restartButton.bezelStyle = .rounded
        restartButton.controlSize = .small
        restartButton.target = self
        restartButton.action = #selector(restartClicked)
        restartButton.toolTip = "Restart from the story's beginning — a fresh boot at the pinned seed"
        restartButton.translatesAutoresizingMaskIntoConstraints = false

        themePicker.controlSize = .small
        themePicker.font = NSFont.systemFont(ofSize: 11)
        themePicker.target = self
        themePicker.action = #selector(themePicked)
        themePicker.toolTip = "Preview theme — IDE-only, never changes what the story ships"
        themePicker.translatesAutoresizingMaskIntoConstraints = false

        playAfterBuildCheckbox.target = self
        playAfterBuildCheckbox.action = #selector(playAfterBuildChanged)
        playAfterBuildCheckbox.controlSize = .small
        playAfterBuildCheckbox.contentTintColor = Theme.foregroundDim
        playAfterBuildCheckbox.translatesAutoresizingMaskIntoConstraints = false

        addSubview(dot)
        addSubview(restartButton)
        addSubview(themePicker)
        addSubview(playAfterBuildCheckbox)

        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 8),
            dot.heightAnchor.constraint(equalToConstant: 8),
            dot.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            dot.centerYAnchor.constraint(equalTo: centerYAnchor),

            restartButton.leadingAnchor.constraint(equalTo: dot.trailingAnchor, constant: 10),
            restartButton.centerYAnchor.constraint(equalTo: centerYAnchor),

            themePicker.leadingAnchor.constraint(equalTo: restartButton.trailingAnchor, constant: 10),
            themePicker.centerYAnchor.constraint(equalTo: centerYAnchor),

            playAfterBuildCheckbox.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
            playAfterBuildCheckbox.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])

        setLoaded(false)
    }

    required init?(coder: NSCoder) {
        fatalError("PlayHeaderView is not Storyboard-instantiable")
    }

    /// Green dot + enabled Restart when a story is loaded; dim + disabled otherwise.
    func setLoaded(_ loaded: Bool) {
        dot.layer?.backgroundColor = (loaded ? NSColor.systemGreen : Theme.foregroundFaint).cgColor
        restartButton.isEnabled = loaded
    }

    func setPlayAfterBuild(_ on: Bool) {
        playAfterBuildCheckbox.state = on ? .on : .off
    }

    /// Populates the picker: Story Default, then the catalog (Classic + every
    /// built-in). Selects the item whose theme id matches, or Story Default
    /// for nil / an id no longer in the catalog.
    func setThemes(_ themes: [PlayTheme], selectedThemeId: String?) {
        themePicker.removeAllItems()
        themePicker.addItem(withTitle: Self.storyDefaultTitle)
        for theme in themes {
            themePicker.addItem(withTitle: theme.name)
            themePicker.lastItem?.representedObject = theme.id
        }
        let match = themePicker.itemArray.first { ($0.representedObject as? String) == selectedThemeId }
        themePicker.select(match ?? themePicker.itemArray.first)
    }

    @objc private func restartClicked() {
        onRestart?()
    }

    @objc private func themePicked() {
        onThemeSelect?(themePicker.selectedItem?.representedObject as? String)
    }

    @objc private func playAfterBuildChanged() {
        onPlayAfterBuildToggle?(playAfterBuildCheckbox.state == .on)
    }
}
