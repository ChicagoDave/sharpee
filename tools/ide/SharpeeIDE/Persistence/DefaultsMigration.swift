// DefaultsMigration.swift
// One-time carry-forward of persisted IDE state across the ADR-279 D1 bundle
// identifier change (`net.sharpee.ide` → `net.sharpee.chord-writer`). Every
// persisting surface in the app reads `UserDefaults.standard`, which is the
// bundle-id domain — renaming the bundle relocates all of it at once, so the
// migration copies the domain wholesale rather than enumerating keys (AppKit's
// own autosave keys, e.g. "NSSplitView Subview Frames …", are carried too).
//
// ADR-258 D8, clarified 2026-07-28: a stale ENTRY is discarded; a change of
// IDENTITY migrates forward. This is the identity case.
//
// Public interface: DefaultsMigration.migrateLegacyDomainIfNeeded(into:from:).
// Owner context: tools/ide — Persistence.

import Foundation

enum DefaultsMigration {

    /// The pre-ADR-279 bundle identifier, which is also its defaults domain name.
    static let legacyDomainName = "net.sharpee.ide"

    /// Set in the CURRENT domain once the migration has run, so it runs at most
    /// once regardless of whether it found anything to copy.
    static let didMigrateKey = "DidMigrateLegacyDefaultsDomain"

    /// Copies the legacy defaults domain into `defaults`, once.
    ///
    /// Keys already present in `defaults` win — the copy never overwrites state
    /// the author has already set under the new identifier. The legacy domain is
    /// left in place (never deleted): it is the author's data, and leaving it
    /// costs nothing while making a bad migration recoverable.
    ///
    /// - Parameters:
    ///   - defaults: the destination domain; the app's own (`.standard`) in production.
    ///   - legacyDomainName: source domain name; overridable for tests.
    /// - Returns: `true` when this call copied at least one key, `false` when it
    ///   was a no-op (already migrated, or nothing to migrate).
    @discardableResult
    static func migrateLegacyDomainIfNeeded(
        into defaults: UserDefaults = .standard,
        from legacyDomainName: String = legacyDomainName
    ) -> Bool {
        guard !defaults.bool(forKey: didMigrateKey) else { return false }

        // Claim the migration before copying: a partially-copied domain is far
        // better than a repeated import fighting the author's later edits.
        defaults.set(true, forKey: didMigrateKey)

        guard let legacy = defaults.persistentDomain(forName: legacyDomainName),
              !legacy.isEmpty else { return false }

        var copied = false
        for (key, value) in legacy where defaults.object(forKey: key) == nil {
            defaults.set(value, forKey: key)
            copied = true
        }
        return copied
    }
}
