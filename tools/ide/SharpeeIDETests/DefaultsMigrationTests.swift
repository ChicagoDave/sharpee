// DefaultsMigrationTests.swift
// Covers the one-time carry-forward of persisted IDE state across ADR-279 D1's
// bundle-identifier change (net.sharpee.ide → net.sharpee.chord-writer), which
// ADR-279 Acceptance 4 requires: recents, session, dividers, and fonts survive
// the rename. Both domains are isolated test suites, never the real ones.

import XCTest
@testable import SharpeeIDE

final class DefaultsMigrationTests: XCTestCase {

    private var defaults: UserDefaults!
    private let suiteName = "net.sharpee.chord-writer.tests.DefaultsMigrationTests"
    private let legacySuiteName = "net.sharpee.ide.tests.DefaultsMigrationTests.legacy"

    override func setUp() {
        super.setUp()
        UserDefaults().removePersistentDomain(forName: suiteName)
        UserDefaults().removePersistentDomain(forName: legacySuiteName)
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        defaults.removePersistentDomain(forName: legacySuiteName)
        defaults = nil
        super.tearDown()
    }

    /// Seeds the legacy domain with one value per persisting surface the ADR
    /// names, so the assertions below track real state rather than a toy key.
    private func seedLegacyDomain() {
        let legacy = UserDefaults(suiteName: legacySuiteName)!
        legacy.set(["/repo/one", "/repo/two"], forKey: "RecentProjects")
        legacy.set(Data("{\"projectURL\":\"/repo/one\"}".utf8), forKey: "SessionState")
        legacy.set("Menlo", forKey: "EditorFontFamily")
        legacy.set(true, forKey: "PlayAfterBuild")
        legacy.set("{{0,0},{800,600}}", forKey: "NSSplitView Subview Frames MainSplit")
    }

    // MARK: - DOES: carries the domain forward

    func testCopiesEveryLegacyKeyIntoTheNewDomain() {
        seedLegacyDomain()

        let copied = DefaultsMigration.migrateLegacyDomainIfNeeded(into: defaults,
                                                                   from: legacySuiteName)

        XCTAssertTrue(copied, "a populated legacy domain should report a copy")
        XCTAssertEqual(defaults.stringArray(forKey: "RecentProjects"), ["/repo/one", "/repo/two"])
        XCTAssertEqual(defaults.data(forKey: "SessionState"),
                       Data("{\"projectURL\":\"/repo/one\"}".utf8))
        XCTAssertEqual(defaults.string(forKey: "EditorFontFamily"), "Menlo")
        XCTAssertTrue(defaults.bool(forKey: "PlayAfterBuild"))
        XCTAssertEqual(defaults.string(forKey: "NSSplitView Subview Frames MainSplit"),
                       "{{0,0},{800,600}}",
                       "AppKit autosave keys ride along — that's why the copy is domain-wide")
    }

    func testSetsTheMigratedFlagInTheNewDomain() {
        seedLegacyDomain()

        DefaultsMigration.migrateLegacyDomainIfNeeded(into: defaults, from: legacySuiteName)

        XCTAssertTrue(defaults.bool(forKey: DefaultsMigration.didMigrateKey))
    }

    func testLeavesTheLegacyDomainIntact() {
        seedLegacyDomain()

        DefaultsMigration.migrateLegacyDomainIfNeeded(into: defaults, from: legacySuiteName)

        let legacy = UserDefaults(suiteName: legacySuiteName)!
        XCTAssertEqual(legacy.stringArray(forKey: "RecentProjects"), ["/repo/one", "/repo/two"],
                       "the author's old domain is never deleted or emptied")
    }

    // MARK: - REJECTS WHEN

    func testDoesNotRunTwice() {
        seedLegacyDomain()
        DefaultsMigration.migrateLegacyDomainIfNeeded(into: defaults, from: legacySuiteName)

        // The author changes their mind under the new identifier...
        defaults.set(["/repo/three"], forKey: "RecentProjects")

        let copiedAgain = DefaultsMigration.migrateLegacyDomainIfNeeded(into: defaults,
                                                                        from: legacySuiteName)

        XCTAssertFalse(copiedAgain)
        XCTAssertEqual(defaults.stringArray(forKey: "RecentProjects"), ["/repo/three"],
                       "a second run must not resurrect the legacy value")
    }

    func testNeverOverwritesAValueAlreadySetInTheNewDomain() {
        seedLegacyDomain()
        defaults.set("Baskerville", forKey: "EditorFontFamily")

        DefaultsMigration.migrateLegacyDomainIfNeeded(into: defaults, from: legacySuiteName)

        XCTAssertEqual(defaults.string(forKey: "EditorFontFamily"), "Baskerville")
        XCTAssertEqual(defaults.stringArray(forKey: "RecentProjects"), ["/repo/one", "/repo/two"],
                       "untouched keys still migrate")
    }

    func testEmptyLegacyDomainCopiesNothingButStillClaimsTheMigration() {
        let copied = DefaultsMigration.migrateLegacyDomainIfNeeded(into: defaults,
                                                                   from: legacySuiteName)

        XCTAssertFalse(copied)
        XCTAssertTrue(defaults.bool(forKey: DefaultsMigration.didMigrateKey),
                      "claiming it prevents a later stale legacy write from importing")
    }

    func testAFreshInstallWithNoLegacyStateIsUnaffected() {
        defaults.set(["/repo/new"], forKey: "RecentProjects")

        DefaultsMigration.migrateLegacyDomainIfNeeded(into: defaults, from: legacySuiteName)

        XCTAssertEqual(defaults.stringArray(forKey: "RecentProjects"), ["/repo/new"])
    }
}
