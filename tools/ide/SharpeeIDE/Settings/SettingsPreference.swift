// SettingsPreference.swift
// App-wide settings for the IDE — the ones that belong to the author rather than
// to a project (per-project build options live in BuildSettingsStore).
// Setting a value persists it AND posts `didChange`, so open windows apply it at
// once; a persisted-but-unapplied setting reads as a broken control.
// Public interface: SettingsPreference.snapPanesEvenly, .didChange.
// Owner context: tools/ide — Settings.

import Foundation

@MainActor
enum SettingsPreference {

    /// Posted after any setting changes. Surfaces that react to a setting
    /// observe this rather than polling.
    static let didChange = Notification.Name("SharpeeSettingsDidChange")

    private static let snapPanesEvenlyKey = "SharpeeSnapPanesEvenly"

    /// Whether the editor and Play panes are kept at an even split.
    ///
    /// Off by default: on, it overrides a dragged divider on the next layout
    /// event, which must be the author's explicit choice rather than something
    /// they discover by resizing the window.
    static var snapPanesEvenly: Bool {
        get { UserDefaults.standard.bool(forKey: snapPanesEvenlyKey) }
        set {
            guard newValue != snapPanesEvenly else { return }
            UserDefaults.standard.set(newValue, forKey: snapPanesEvenlyKey)
            NotificationCenter.default.post(name: didChange, object: nil)
        }
    }
}
