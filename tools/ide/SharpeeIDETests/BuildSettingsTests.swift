// BuildSettingsTests.swift
// Covers BuildSettings: defaults, toArguments() across client/skip combinations,
// and Codable roundtrip.

import XCTest
@testable import SharpeeIDE

final class BuildSettingsTests: XCTestCase {

    // MARK: - Defaults

    func testDefaultsHaveNoStoryBrowserClientNoSkip() {
        let d = BuildSettings.default
        XCTAssertNil(d.story)
        XCTAssertEqual(d.clients, [BuildSettings.browserClient])
        XCTAssertNil(d.skipFrom)
    }

    // MARK: - toArguments

    func testBrowserOnlyProducesStoryThenBrowserFlag() {
        let s = BuildSettings(story: "dungeo", clients: [BuildSettings.browserClient], skipFrom: nil)
        XCTAssertEqual(s.toArguments(), ["dungeo", "--browser"])
    }

    func testBrowserAndZifmiaEmitBothFlagsInStableOrder() {
        let s = BuildSettings(story: "dungeo",
                              clients: [BuildSettings.zifmiaClient, BuildSettings.browserClient],
                              skipFrom: nil)
        // Order is fixed regardless of Set iteration order: --browser before --zifmia.
        XCTAssertEqual(s.toArguments(), ["dungeo", "--browser", "--zifmia"])
    }

    func testNoClientsProducesStoryOnly() {
        let s = BuildSettings(story: "dungeo", clients: [], skipFrom: nil)
        XCTAssertEqual(s.toArguments(), ["dungeo"])
    }

    func testSkipFromAppendsSkipFlagAndPackage() {
        let s = BuildSettings(story: "dungeo", clients: [BuildSettings.browserClient], skipFrom: "stdlib")
        XCTAssertEqual(s.toArguments(), ["dungeo", "--browser", "--skip", "stdlib"])
    }

    func testNilStoryOmitsPositionalArgument() {
        let s = BuildSettings(story: nil, clients: [BuildSettings.browserClient], skipFrom: nil)
        XCTAssertEqual(s.toArguments(), ["--browser"])
    }

    func testEmptyStoryAndSkipAreOmitted() {
        let s = BuildSettings(story: "", clients: [], skipFrom: "")
        XCTAssertEqual(s.toArguments(), [])
    }

    // MARK: - Codable

    func testCodableRoundtripPreservesAllFields() throws {
        let original = BuildSettings(story: "zork",
                                     clients: [BuildSettings.browserClient, BuildSettings.zifmiaClient],
                                     skipFrom: "engine")
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(BuildSettings.self, from: data)
        XCTAssertEqual(decoded, original)
    }
}
