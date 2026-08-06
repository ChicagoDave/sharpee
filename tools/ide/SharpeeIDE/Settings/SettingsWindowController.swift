// SettingsWindowController.swift
// The app's Settings window (⌘,) — author-level preferences, one section per
// group. Today: Panes. Per-project build options are NOT here; they stay in the
// Build Settings sheet, which is scoped to a project.
// Public interface: SettingsWindowController.shared.show().
// Owner context: tools/ide — Settings.

import AppKit

final class SettingsWindowController: NSWindowController {

    /// One window for the whole app — reopening brings the existing one forward
    /// rather than stacking duplicates.
    @MainActor static let shared = SettingsWindowController()

    /// Accessibility identifier — the checkbox's stable handle for tests.
    static let snapPanesCheckboxIdentifier = "settings.snapPanesEvenly"

    private let snapPanesCheckbox = NSButton(checkboxWithTitle: "Snap panes to 50% each",
                                             target: nil, action: nil)

    private convenience init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 460, height: 170),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "Settings"
        window.isReleasedWhenClosed = false
        window.center()
        self.init(window: window)
        window.contentView = makeContentView()
    }

    /// Brings the Settings window forward, reflecting the current values.
    func show() {
        snapPanesCheckbox.state = SettingsPreference.snapPanesEvenly ? .on : .off
        showWindow(nil)
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    // MARK: - Content

    private func makeContentView() -> NSView {
        let container = NSView()

        let heading = NSTextField(labelWithString: "Panes")
        heading.font = .systemFont(ofSize: 13, weight: .semibold)

        snapPanesCheckbox.target = self
        snapPanesCheckbox.action = #selector(snapPanesToggled)
        snapPanesCheckbox.state = SettingsPreference.snapPanesEvenly ? .on : .off
        snapPanesCheckbox.setAccessibilityIdentifier(Self.snapPanesCheckboxIdentifier)

        let note = NSTextField(wrappingLabelWithString:
            "Keeps the editor and Play panes at an even split. Resizing the window, "
            + "or showing and hiding the Project pane, snaps them back to 50% each.")
        note.font = .systemFont(ofSize: 11)
        note.textColor = .secondaryLabelColor

        for view in [heading, snapPanesCheckbox, note] {
            view.translatesAutoresizingMaskIntoConstraints = false
            container.addSubview(view)
        }

        NSLayoutConstraint.activate([
            heading.topAnchor.constraint(equalTo: container.topAnchor, constant: 20),
            heading.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 20),

            snapPanesCheckbox.topAnchor.constraint(equalTo: heading.bottomAnchor, constant: 12),
            snapPanesCheckbox.leadingAnchor.constraint(equalTo: heading.leadingAnchor),

            note.topAnchor.constraint(equalTo: snapPanesCheckbox.bottomAnchor, constant: 6),
            note.leadingAnchor.constraint(equalTo: snapPanesCheckbox.leadingAnchor, constant: 20),
            note.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -20),
        ])

        return container
    }

    @objc private func snapPanesToggled() {
        SettingsPreference.snapPanesEvenly = (snapPanesCheckbox.state == .on)
    }
}
