// ReopenLastStoryPreference.swift
// The "reopen last story at launch" preference (David, 2026-08-09): when on,
// launch skips the landing page and opens the persisted session's project
// directly. Off by default — the landing page stays the launch gate.
// Public interface: ReopenLastStoryPreference.isEnabled, .key.
// Owner context: tools/ide — Settings.

import Foundation

enum ReopenLastStoryPreference {

    static let key = "SharpeeReopenLastStory"

    /// Whether launch should skip the landing page and reopen the last story.
    static var isEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: key) }
        set { UserDefaults.standard.set(newValue, forKey: key) }
    }
}
