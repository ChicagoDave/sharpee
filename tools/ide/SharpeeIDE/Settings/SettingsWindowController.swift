// SettingsWindowController.swift
// The app's Settings window (⌘,) — author-level preferences, one section per
// group. Currently empty: the one setting it held ("Snap panes to 50% each")
// was retired (David, 2026-08-09 — the IDE remembers every divider position
// instead, so a snap that fights the remembered layout has no place).
// Per-project build options are NOT here; they stay in the Build Settings
// sheet, which is scoped to a project.
// Public interface: SettingsWindowController.shared.show().
// Owner context: tools/ide — Settings.

import AppKit

final class SettingsWindowController: NSWindowController {

    /// One window for the whole app — reopening brings the existing one forward
    /// rather than stacking duplicates.
    @MainActor static let shared = SettingsWindowController()

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

    /// Brings the Settings window forward.
    func show() {
        showWindow(nil)
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    // MARK: - Content

    private func makeContentView() -> NSView {
        let container = NSView()

        // The window stays (⌘, is a standard door) even while it has nothing
        // to configure — future preferences land here, and a beep would read
        // as breakage.
        let note = NSTextField(wrappingLabelWithString:
            "Nothing to configure yet. Pane layout, window size, and tab choices "
            + "are remembered automatically.")
        note.font = .systemFont(ofSize: 11)
        note.textColor = .secondaryLabelColor
        note.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(note)

        NSLayoutConstraint.activate([
            note.topAnchor.constraint(equalTo: container.topAnchor, constant: 20),
            note.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 20),
            note.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -20),
        ])

        return container
    }
}
