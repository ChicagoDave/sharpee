// BuildSettingsStoreTests.swift
// Covers BuildSettingsStore: default on unknown project, save/load roundtrip,
// per-project isolation, overwrite, and clear (present + absent).

import XCTest
@testable import SharpeeIDE

final class BuildSettingsStoreTests: XCTestCase {

    private var defaults: UserDefaults!
    private let suiteName = "net.sharpee.ide.tests.BuildSettingsStoreTests"

    private let projectA = URL(fileURLWithPath: "/Users/me/projects/alpha")
    private let projectB = URL(fileURLWithPath: "/Users/me/projects/beta")

    override func setUp() {
        super.setUp()
        UserDefaults().removePersistentDomain(forName: suiteName)
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        defaults = nil
        super.tearDown()
    }

    // MARK: - load default

    func testLoadReturnsDefaultForUnknownProject() {
        XCTAssertEqual(BuildSettingsStore.load(for: projectA, from: defaults), .default)
    }

    func testLoadReturnsDefaultOnCorruptData() {
        defaults.set(Data("not json".utf8), forKey: BuildSettingsStore.key)
        XCTAssertEqual(BuildSettingsStore.load(for: projectA, from: defaults), .default)
    }

    // MARK: - save / load

    func testSaveThenLoadReturnsEquivalentSettings() {
        let s = BuildSettings(story: "dungeo",
                              clients: [BuildSettings.browserClient, BuildSettings.zifmiaClient],
                              skipFrom: "stdlib")
        BuildSettingsStore.save(s, for: projectA, to: defaults)
        XCTAssertEqual(BuildSettingsStore.load(for: projectA, from: defaults), s)
    }

    func testSaveOverwritesPriorSettingsForSameProject() {
        BuildSettingsStore.save(BuildSettings(story: "old", clients: [], skipFrom: nil),
                                for: projectA, to: defaults)
        let updated = BuildSettings(story: "new", clients: [BuildSettings.browserClient], skipFrom: "engine")
        BuildSettingsStore.save(updated, for: projectA, to: defaults)
        XCTAssertEqual(BuildSettingsStore.load(for: projectA, from: defaults), updated)
    }

    func testSaveIsolatesSettingsBetweenProjects() {
        let a = BuildSettings(story: "alpha-story", clients: [BuildSettings.browserClient], skipFrom: nil)
        let b = BuildSettings(story: "beta-story", clients: [BuildSettings.zifmiaClient], skipFrom: "core")
        BuildSettingsStore.save(a, for: projectA, to: defaults)
        BuildSettingsStore.save(b, for: projectB, to: defaults)

        XCTAssertEqual(BuildSettingsStore.load(for: projectA, from: defaults), a)
        XCTAssertEqual(BuildSettingsStore.load(for: projectB, from: defaults), b)
    }

    // MARK: - clear

    func testClearRemovesOnlyThatProjectsSettings() {
        let a = BuildSettings(story: "alpha-story", clients: [BuildSettings.browserClient], skipFrom: nil)
        let b = BuildSettings(story: "beta-story", clients: [BuildSettings.zifmiaClient], skipFrom: nil)
        BuildSettingsStore.save(a, for: projectA, to: defaults)
        BuildSettingsStore.save(b, for: projectB, to: defaults)

        BuildSettingsStore.clear(for: projectA, from: defaults)

        // A reverts to default; B is untouched.
        XCTAssertEqual(BuildSettingsStore.load(for: projectA, from: defaults), .default)
        XCTAssertEqual(BuildSettingsStore.load(for: projectB, from: defaults), b)
    }

    func testClearAbsentProjectIsNoOpAndPreservesOthers() {
        let b = BuildSettings(story: "beta-story", clients: [BuildSettings.browserClient], skipFrom: nil)
        BuildSettingsStore.save(b, for: projectB, to: defaults)

        BuildSettingsStore.clear(for: projectA, from: defaults) // A was never saved

        XCTAssertEqual(BuildSettingsStore.load(for: projectB, from: defaults), b)
    }
}
