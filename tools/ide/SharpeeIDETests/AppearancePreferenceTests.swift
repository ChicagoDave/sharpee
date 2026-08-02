// AppearancePreferenceTests.swift
// The View → Appearance override persists and actually pins NSApp.appearance
// (GH #129 item 3). Asserts on the two real mutations — the UserDefaults key
// and NSApp.appearance — not on the enum round-trip alone.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class AppearancePreferenceTests: XCTestCase {

    private let key = "SharpeeAppearance"
    private var savedDefault: String?
    private var savedAppearance: NSAppearance?

    override func setUp() {
        super.setUp()
        savedDefault = UserDefaults.standard.string(forKey: key)
        savedAppearance = NSApp.appearance
        UserDefaults.standard.removeObject(forKey: key)
        NSApp.appearance = nil
    }

    override func tearDown() {
        if let savedDefault {
            UserDefaults.standard.set(savedDefault, forKey: key)
        } else {
            UserDefaults.standard.removeObject(forKey: key)
        }
        NSApp.appearance = savedAppearance
        super.tearDown()
    }

    func testDefaultChoiceIsSystemWithNothingPersisted() {
        XCTAssertEqual(AppearancePreference.choice, .system,
                       "with no persisted value the IDE must follow the system — the pre-#129 behavior")
    }

    func testCorruptPersistedValueFallsBackToSystem() {
        UserDefaults.standard.set("sepia", forKey: key)
        XCTAssertEqual(AppearancePreference.choice, .system,
                       "an unknown persisted string must not crash or pin anything")
    }

    func testSettingDarkPersistsAndPinsTheApp() {
        AppearancePreference.choice = .dark
        XCTAssertEqual(UserDefaults.standard.string(forKey: key), "dark",
                       "the choice must survive relaunch via UserDefaults")
        XCTAssertEqual(NSApp.appearance?.bestMatch(from: [.darkAqua, .aqua]), .darkAqua,
                       "setting the choice must pin the app immediately, not on relaunch")
    }

    func testSettingLightPersistsAndPinsTheApp() {
        AppearancePreference.choice = .light
        XCTAssertEqual(UserDefaults.standard.string(forKey: key), "light")
        XCTAssertEqual(NSApp.appearance?.bestMatch(from: [.darkAqua, .aqua]), .aqua)
    }

    func testSettingSystemReleasesThePin() {
        AppearancePreference.choice = .dark
        AppearancePreference.choice = .system
        XCTAssertNil(NSApp.appearance,
                     "System must release the pin (nil), not pin the current system look")
        XCTAssertEqual(UserDefaults.standard.string(forKey: key), "system")
    }

    func testApplyAtLaunchPinsFromThePersistedChoice() {
        // Launch path: the value is already on disk, apply() runs before the
        // window builds (AppDelegate.applicationDidFinishLaunching).
        UserDefaults.standard.set("dark", forKey: key)
        AppearancePreference.apply()
        XCTAssertEqual(NSApp.appearance?.bestMatch(from: [.darkAqua, .aqua]), .darkAqua)
    }

    func testAllCasesDriveTheMenu() {
        XCTAssertEqual(AppearanceChoice.allCases, [.system, .light, .dark],
                       "the Appearance submenu is built from allCases in this order")
        XCTAssertEqual(AppearanceChoice.allCases.map(\.displayName),
                       ["System", "Light", "Dark"])
    }
}
