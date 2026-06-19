// BuildSettingsViewController.swift
// The Build Settings sheet — the single surface for a project's `./sharpee build`
// options (story, clients, skip-from). Reads stories via StoryDetector and packages
// via PackageDetector; persists per-project via BuildSettingsStore on Save.
// Public interface: init(repoRoot:defaults:) — present via presentAsSheet(_:).
// Owner context: tools/ide — Build.

import AppKit

final class BuildSettingsViewController: NSViewController {

    private let repoRoot: URL
    private let defaults: UserDefaults

    private var stories: [DetectedStory] = []
    private var packages: [String] = []

    private let storyPopUp = NSPopUpButton(frame: .zero, pullsDown: false)
    private let browserCheckbox = NSButton(checkboxWithTitle: "Browser", target: nil, action: nil)
    private let zifmiaCheckbox = NSButton(checkboxWithTitle: "Zifmia", target: nil, action: nil)
    private let skipPopUp = NSPopUpButton(frame: .zero, pullsDown: false)

    /// First "Skip from" entry — represents "no `--skip`" (settings.skipFrom == nil).
    private static let noSkipTitle = "None"
    /// First "Story" entry when no story is chosen.
    private static let noStoryTitle = "— Select a story —"

    init(repoRoot: URL, defaults: UserDefaults = .standard) {
        self.repoRoot = repoRoot
        self.defaults = defaults
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("BuildSettingsViewController is not Storyboard-instantiable")
    }

    // MARK: - View

    override func loadView() {
        let container = NSView()
        container.wantsLayer = true
        container.layer?.backgroundColor = Theme.projectBackground.cgColor
        container.translatesAutoresizingMaskIntoConstraints = false

        let heading = NSTextField(labelWithString: "Build Settings")
        heading.font = NSFont.systemFont(ofSize: 15, weight: .semibold)
        heading.textColor = Theme.foreground

        let clients = NSStackView(views: [browserCheckbox, zifmiaCheckbox])
        clients.orientation = .horizontal
        clients.spacing = 16
        [browserCheckbox, zifmiaCheckbox].forEach { $0.contentTintColor = Theme.foreground }

        let grid = NSGridView(views: [
            [formLabel("Story"), storyPopUp],
            [formLabel("Clients"), clients],
            [formLabel("Skip from"), skipPopUp],
        ])
        grid.rowAlignment = .firstBaseline
        grid.column(at: 0).xPlacement = .trailing
        grid.columnSpacing = 12
        grid.rowSpacing = 14
        grid.translatesAutoresizingMaskIntoConstraints = false

        let cancelButton = NSButton(title: "Cancel", target: self, action: #selector(cancel(_:)))
        cancelButton.keyEquivalent = "\u{1b}"            // Esc
        cancelButton.bezelStyle = .rounded
        let saveButton = NSButton(title: "Save", target: self, action: #selector(save(_:)))
        saveButton.keyEquivalent = "\r"                  // Return = default button
        saveButton.bezelStyle = .rounded

        let buttons = NSStackView(views: [NSView(), cancelButton, saveButton])
        buttons.orientation = .horizontal
        buttons.spacing = 10

        let column = NSStackView(views: [heading, grid, buttons])
        column.orientation = .vertical
        column.alignment = .leading
        column.spacing = 18
        column.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(column)

        NSLayoutConstraint.activate([
            column.topAnchor.constraint(equalTo: container.topAnchor, constant: 22),
            column.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 22),
            column.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -22),
            column.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -22),
            buttons.trailingAnchor.constraint(equalTo: column.trailingAnchor),
        ])

        view = container
        preferredContentSize = NSSize(width: 440, height: 240)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        stories = StoryDetector.detect(in: repoRoot)
        packages = PackageDetector.detect(in: repoRoot)
        populateControls()
        apply(BuildSettingsStore.load(for: repoRoot, from: defaults))
    }

    // MARK: - Populate / apply / read

    private func populateControls() {
        storyPopUp.removeAllItems()
        storyPopUp.addItem(withTitle: Self.noStoryTitle)
        for story in stories {
            let suffix = story.kind == .tutorial ? "  (tutorial)" : ""
            storyPopUp.addItem(withTitle: story.name + suffix)
        }

        skipPopUp.removeAllItems()
        skipPopUp.addItem(withTitle: Self.noSkipTitle)
        skipPopUp.addItems(withTitles: packages)
    }

    /// Reflects stored settings into the controls.
    private func apply(_ settings: BuildSettings) {
        if let story = settings.story, let index = stories.firstIndex(where: { $0.name == story }) {
            storyPopUp.selectItem(at: index + 1)         // +1 for the leading placeholder
        } else {
            storyPopUp.selectItem(at: 0)
        }

        browserCheckbox.state = settings.clients.contains(BuildSettings.browserClient) ? .on : .off
        zifmiaCheckbox.state = settings.clients.contains(BuildSettings.zifmiaClient) ? .on : .off

        if let skip = settings.skipFrom, packages.contains(skip) {
            skipPopUp.selectItem(withTitle: skip)
        } else {
            skipPopUp.selectItem(at: 0)
        }
    }

    /// Builds a BuildSettings from the current control state.
    private func currentSettings() -> BuildSettings {
        let storyIndex = storyPopUp.indexOfSelectedItem - 1   // -1 for the placeholder
        let story = stories.indices.contains(storyIndex) ? stories[storyIndex].name : nil

        var clients: Set<String> = []
        if browserCheckbox.state == .on { clients.insert(BuildSettings.browserClient) }
        if zifmiaCheckbox.state == .on { clients.insert(BuildSettings.zifmiaClient) }

        let skip = skipPopUp.indexOfSelectedItem > 0 ? skipPopUp.titleOfSelectedItem : nil

        return BuildSettings(story: story, clients: clients, skipFrom: skip)
    }

    // MARK: - Actions

    @objc private func save(_ sender: Any?) {
        BuildSettingsStore.save(currentSettings(), for: repoRoot, to: defaults)
        dismiss(self)
    }

    @objc private func cancel(_ sender: Any?) {
        dismiss(self)
    }

    // MARK: - Helpers

    private func formLabel(_ text: String) -> NSTextField {
        let label = NSTextField(labelWithString: text)
        label.font = NSFont.systemFont(ofSize: 12)
        label.textColor = Theme.foregroundDim
        return label
    }
}
