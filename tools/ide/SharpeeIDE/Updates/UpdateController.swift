// UpdateController.swift
// Owns Chord Writer's Sparkle updater: the scheduled background check and the
// "Check for Updates…" menu action both run through the single controller held
// here. Wraps Sparkle so no other file imports it — the app talks to one Swift
// type, not to a framework's object graph.
// Public interface: UpdateController.checkForUpdates(), .canCheckForUpdates,
//   and .feedURL / .isConfigured for the About panel and diagnostics.
// Owner context: tools/ide — App shell.

import Foundation
import Sparkle

/// The app's single updater.
///
/// Sparkle wants exactly one `SPUStandardUpdaterController` per process; holding
/// it here rather than in `AppDelegate` keeps the framework import in one file
/// and gives the menu item something with a stable lifetime to target.
///
/// ADR-279 D7: full auto-update, not a check-for-updates stopgap — so the
/// controller starts its scheduled-check timer at construction rather than
/// waiting for the user to ask.
final class UpdateController: NSObject {

    /// Info.plist key carrying the appcast URL. Sparkle reads this itself; the
    /// name is repeated here only so `isConfigured` can report on it.
    private static let feedURLKey = "SUFeedURL"

    /// Info.plist key carrying the EdDSA public key Sparkle verifies downloads
    /// against. Not a secret — it ships in every binary by design. Its private
    /// counterpart lives in the release machine's keychain and never in the repo.
    private static let publicKeyKey = "SUPublicEDKey"

    private let updaterController: SPUStandardUpdaterController

    /// Builds the updater and starts it.
    ///
    /// `startingUpdater: true` begins the scheduled background check immediately.
    /// Sparkle reads `SUFeedURL` and `SUPublicEDKey` from the bundle's Info.plist
    /// during this call; if either is missing it declines to start and logs the
    /// reason, which is why `isConfigured` exists to say so in a diagnostic
    /// rather than leaving a silently inert menu item.
    override init() {
        updaterController = SPUStandardUpdaterController(startingUpdater: true,
                                                         updaterDelegate: nil,
                                                         userDriverDelegate: nil)
        super.init()
    }

    /// Begins a user-initiated update check, showing Sparkle's own progress and
    /// error UI. Safe to call when a check is already running — Sparkle
    /// coalesces rather than starting a second session.
    func checkForUpdates() {
        updaterController.checkForUpdates(nil)
    }

    /// Whether a check can start right now. Mirrors the state Sparkle uses to
    /// enable its own menu item, so the App menu greys out during an in-flight
    /// check instead of stacking sessions.
    var canCheckForUpdates: Bool {
        updaterController.updater.canCheckForUpdates
    }

    /// The appcast URL the updater will poll, or nil when unconfigured.
    var feedURL: URL? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: Self.feedURLKey) as? String else {
            return nil
        }
        return URL(string: value)
    }

    /// Whether the bundle carries both values Sparkle needs to run.
    ///
    /// Checked as a pair deliberately: a feed URL without a public key describes
    /// an updater that would download an archive it cannot verify, which is a
    /// worse state than having no updater at all.
    var isConfigured: Bool {
        let key = Bundle.main.object(forInfoDictionaryKey: Self.publicKeyKey) as? String
        return feedURL != nil && !(key ?? "").isEmpty
    }
}
