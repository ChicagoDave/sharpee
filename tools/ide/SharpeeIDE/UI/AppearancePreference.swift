// AppearancePreference.swift
// The user's appearance override for the IDE chrome (GH #129 item 3): System
// follows macOS, Light and Dark pin the app. Theme tokens are already dynamic
// (dark Mocha-ish / light Latte, Theme.swift), so pinning is one assignment to
// NSApp.appearance — every layer-backed surface re-resolves via updateLayer
// and text re-resolves at draw time. Persisted in UserDefaults.
// Public interface: AppearanceChoice (menu cases), AppearancePreference
// (choice accessor, apply()).
// Owner context: tools/ide — UI.

import AppKit

enum AppearanceChoice: String, CaseIterable {
    case system, light, dark

    var displayName: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    /// The NSAppearance to pin on NSApp — nil means follow the system.
    var nsAppearance: NSAppearance? {
        switch self {
        case .system: return nil
        case .light: return NSAppearance(named: .aqua)
        case .dark: return NSAppearance(named: .darkAqua)
        }
    }
}

@MainActor
enum AppearancePreference {

    private static let choiceKey = "SharpeeAppearance"

    /// Chosen appearance — System by default (the pre-#129 behavior). Setting
    /// persists AND applies; an unapplied persisted choice would surface only
    /// on relaunch, which reads as a broken menu.
    static var choice: AppearanceChoice {
        get {
            UserDefaults.standard.string(forKey: choiceKey)
                .flatMap(AppearanceChoice.init(rawValue:)) ?? .system
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: choiceKey)
            apply()
        }
    }

    /// Pins (or releases) the app-wide appearance per the persisted choice.
    /// Called once at launch, and again by the choice setter.
    static func apply() {
        NSApp.appearance = choice.nsAppearance
    }
}
