// SettingsWindowController.swift
// The app's Settings window (⌘,) — author-level preferences, one section per
// group. Holds the launch preference ("Reopen last story", David 2026-08-09);
// the earlier "Snap panes to 50% each" setting is retired (the IDE remembers
// every divider position instead, so a snap that fights the remembered layout
// has no place). Per-project build options are NOT here; they stay in the
// Build Settings sheet, which is scoped to a project.
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

    /// Brings the Settings window forward, refreshing every control from its
    /// preference — the window is a singleton, so a stale checkbox would
    /// otherwise show the state from its first construction.
    func show() {
        reopenCheckbox?.state = ReopenLastStoryPreference.isEnabled ? .on : .off
        showWindow(nil)
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    // MARK: - Content

    /// Accessibility identifier — the checkbox's stable handle for tests.
    static let reopenLastStoryIdentifier = "settings.reopen-last-story"

    /// Held so `show()` can refresh it from the preference.
    private var reopenCheckbox: NSButton?

    private func makeContentView() -> NSView {
        let container = NSView()

        let reopenCheckbox = NSButton(checkboxWithTitle: "Reopen last story at launch",
                                      target: self,
                                      action: #selector(toggleReopenLastStory(_:)))
        reopenCheckbox.state = ReopenLastStoryPreference.isEnabled ? .on : .off
        reopenCheckbox.setAccessibilityIdentifier(Self.reopenLastStoryIdentifier)
        reopenCheckbox.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(reopenCheckbox)
        self.reopenCheckbox = reopenCheckbox

        let note = NSTextField(wrappingLabelWithString:
            "Skips the launch page and opens the story you last had open. "
            + "Pane layout, window size, and tab choices are remembered automatically.")
        note.font = .systemFont(ofSize: 11)
        note.textColor = .secondaryLabelColor
        note.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(note)

        NSLayoutConstraint.activate([
            reopenCheckbox.topAnchor.constraint(equalTo: container.topAnchor, constant: 20),
            reopenCheckbox.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 20),
            reopenCheckbox.trailingAnchor.constraint(lessThanOrEqualTo: container.trailingAnchor,
                                                     constant: -20),

            note.topAnchor.constraint(equalTo: reopenCheckbox.bottomAnchor, constant: 8),
            note.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 38),
            note.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -20),
        ])

        return container
    }

    @objc private func toggleReopenLastStory(_ sender: NSButton) {
        ReopenLastStoryPreference.isEnabled = sender.state == .on
    }
}
