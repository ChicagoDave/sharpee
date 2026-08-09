// CreateStoryViewController.swift
// The Create Story sheet: a title and a location, where the location defaults to
// `~/<title>` under the story root and follows the title until the author edits
// it. Collects the request only — StoryScaffold does the writing, so a cancelled
// sheet has touched nothing on disk.
// Public interface: CreateStoryViewController(root:), onFinish, Request.
// Owner context: tools/ide — Launch.

import AppKit

@MainActor
final class CreateStoryViewController: NSViewController, NSTextFieldDelegate {

    /// What the author asked to create.
    struct Request: Equatable {
        /// The title as typed, unsanitised — it goes into the story source.
        let title: String
        /// The folder to create the story in.
        let directory: URL
    }

    /// Stable handles for tests and accessibility.
    static let titleFieldIdentifier = "createStory.title"
    static let locationFieldIdentifier = "createStory.location"
    static let chooseIdentifier = "createStory.choose"
    static let createIdentifier = "createStory.create"
    static let cancelIdentifier = "createStory.cancel"

    /// Invoked once: the request, or nil when the author cancelled.
    var onFinish: ((Request?) -> Void)?

    private var mirror: StoryLocationMirror

    private let titleField = NSTextField(string: "")
    private let locationField = NSTextField(string: "")
    private let createButton = NSButton(title: "Create", target: nil, action: nil)

    /// - Parameter root: where mirrored locations are rooted; tests inject a temp
    ///   directory so no run proposes a path inside the developer's Documents.
    init(root: URL = StoryHome.defaultRoot) {
        self.mirror = StoryLocationMirror(root: root)
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not used — views are built in code") }

    override func loadView() {
        let container = NSView(frame: NSRect(x: 0, y: 0, width: 520, height: 0))

        let heading = NSTextField(labelWithString: "Create Story")
        heading.font = .systemFont(ofSize: 15, weight: .semibold)

        titleField.placeholderString = "My Adventure"
        titleField.delegate = self
        titleField.setAccessibilityIdentifier(Self.titleFieldIdentifier)

        locationField.delegate = self
        locationField.setAccessibilityIdentifier(Self.locationFieldIdentifier)
        locationField.stringValue = displayPath(for: mirror.root)

        let choose = NSButton(title: "Choose…", target: self, action: #selector(chooseClicked))
        choose.setAccessibilityIdentifier(Self.chooseIdentifier)

        let note = NSTextField(wrappingLabelWithString:
            "The story folder is created at this location. Keep stories wherever you like — "
            + "the app does not require a folder of its own.")
        note.font = .systemFont(ofSize: 11)
        note.textColor = .secondaryLabelColor

        let cancel = NSButton(title: "Cancel", target: self, action: #selector(cancelClicked))
        cancel.setAccessibilityIdentifier(Self.cancelIdentifier)
        cancel.keyEquivalent = "\u{1b}"

        createButton.target = self
        createButton.action = #selector(createClicked)
        createButton.keyEquivalent = "\r"
        createButton.isEnabled = false
        createButton.setAccessibilityIdentifier(Self.createIdentifier)

        let grid = NSGridView(views: [
            [label("Title:"), titleField],
            [label("Location:"), locationRow(choose)],
        ])
        grid.rowSpacing = 10
        grid.columnSpacing = 8
        grid.column(at: 0).xPlacement = .trailing
        grid.column(at: 1).xPlacement = .fill

        let spacer = NSView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let buttons = NSStackView(views: [spacer, cancel, createButton])
        buttons.orientation = .horizontal
        buttons.spacing = 10

        let stack = NSStackView(views: [heading, grid, note, buttons])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 14
        stack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor, constant: 24),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -24),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -20),
            container.widthAnchor.constraint(equalToConstant: 520),
            grid.widthAnchor.constraint(equalTo: stack.widthAnchor),
            buttons.widthAnchor.constraint(equalTo: stack.widthAnchor),
        ])

        view = container
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        view.window?.makeFirstResponder(titleField)
    }

    // MARK: - Layout helpers

    private func label(_ text: String) -> NSTextField {
        let field = NSTextField(labelWithString: text)
        field.font = .systemFont(ofSize: 12)
        return field
    }

    private func locationRow(_ choose: NSButton) -> NSView {
        let row = NSStackView(views: [locationField, choose])
        row.orientation = .horizontal
        row.spacing = 8
        locationField.setContentHuggingPriority(.defaultLow, for: .horizontal)
        return row
    }

    // MARK: - Mirroring

    /// NSTextField only reports edits the AUTHOR made — a programmatic
    /// `stringValue` write does not come through here. That is what keeps the
    /// mirroring write below from cancelling mirroring on the first keystroke.
    func controlTextDidChange(_ notification: Notification) {
        guard let field = notification.object as? NSTextField else { return }
        if field === titleField {
            titleChanged()
        } else if field === locationField {
            mirror.authorEditedLocation()
        }
    }

    private func titleChanged() {
        let title = trimmedTitle
        createButton.isEnabled = !title.isEmpty
        guard mirror.isMirroring else { return }
        // An empty title shows the bare root: proposing `<root>/My Story` before
        // the author has named anything reads as a story they did not ask for.
        // The fallback name is for a title that sanitises away, not for no title.
        guard !title.isEmpty,
              let mirrored = mirror.mirroredLocation(forTitle: titleField.stringValue) else {
            return locationField.stringValue = displayPath(for: mirror.root)
        }
        locationField.stringValue = displayPath(for: mirrored)
    }

    /// True while the location field still follows the title. Exposed for tests —
    /// the rule is one-way and easy to break silently.
    var isMirroringLocation: Bool { mirror.isMirroring }

    // MARK: - Actions

    @objc private func chooseClicked() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = true
        panel.allowsMultipleSelection = false
        panel.title = "Choose a Location"
        panel.prompt = "Choose"
        panel.message = "Choose the folder to create the story in."

        let handle: (NSApplication.ModalResponse) -> Void = { [weak self] response in
            guard let self, response == .OK, let url = panel.url else { return }
            // Picking a folder IS the author taking the field over, even though
            // the field is written programmatically here.
            self.mirror.authorEditedLocation()
            self.locationField.stringValue = self.displayPath(for: url)
        }
        if let window = view.window {
            panel.beginSheetModal(for: window, completionHandler: handle)
        } else {
            handle(panel.runModal())
        }
    }

    @objc private func createClicked() {
        let title = trimmedTitle
        guard !title.isEmpty else { return }
        onFinish?(Request(title: title, directory: chosenDirectory))
    }

    @objc private func cancelClicked() {
        onFinish?(nil)
    }

    // MARK: - Field values

    private var trimmedTitle: String {
        titleField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// The location field's contents as a URL, tilde expanded. Falls back to the
    /// mirrored default when the author has emptied the field.
    private var chosenDirectory: URL {
        let text = locationField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else {
            return mirror.root.appendingPathComponent(
                StoryLocationMirror.folderName(for: trimmedTitle), isDirectory: true)
        }
        return URL(fileURLWithPath: (text as NSString).expandingTildeInPath, isDirectory: true)
    }

    private func displayPath(for url: URL) -> String {
        (url.path as NSString).abbreviatingWithTildeInPath
    }
}
