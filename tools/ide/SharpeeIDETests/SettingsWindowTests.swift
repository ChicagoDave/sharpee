// SettingsWindowTests.swift
// Covers the Settings window's one preference (David 2026-08-09): the
// "Reopen last story at launch" checkbox reflects the stored preference when
// the window shows, and clicking it actually flips the stored value — the
// mutation behind the launch skip, driven through the real NSButton.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class SettingsWindowTests: XCTestCase {

    private var savedPreference: Any?

    override func setUp() {
        super.setUp()
        savedPreference = UserDefaults.standard.object(forKey: ReopenLastStoryPreference.key)
        UserDefaults.standard.removeObject(forKey: ReopenLastStoryPreference.key)
    }

    override func tearDown() {
        if let savedPreference {
            UserDefaults.standard.set(savedPreference, forKey: ReopenLastStoryPreference.key)
        } else {
            UserDefaults.standard.removeObject(forKey: ReopenLastStoryPreference.key)
        }
        super.tearDown()
    }

    private func findCheckbox(in view: NSView) -> NSButton? {
        if let button = view as? NSButton,
           button.accessibilityIdentifier() == SettingsWindowController.reopenLastStoryIdentifier {
            return button
        }
        for sub in view.subviews {
            if let found = findCheckbox(in: sub) { return found }
        }
        return nil
    }

    func testCheckboxReflectsThePreferenceAndClickingFlipsIt() throws {
        // Seed the preference ON, then show: the singleton window must
        // refresh from the store, not from its first construction.
        ReopenLastStoryPreference.isEnabled = true
        let controller = SettingsWindowController.shared
        controller.show()
        defer { controller.window?.orderOut(nil) }

        let checkbox = try XCTUnwrap(
            findCheckbox(in: try XCTUnwrap(controller.window?.contentView)),
            "the Settings window must hold the reopen-last-story checkbox")
        XCTAssertEqual(checkbox.state, .on, "the checkbox must show the stored preference")

        // The real click path: the stored preference is the mutation.
        checkbox.performClick(nil)
        XCTAssertFalse(ReopenLastStoryPreference.isEnabled,
                       "unchecking must persist the preference off")

        checkbox.performClick(nil)
        XCTAssertTrue(ReopenLastStoryPreference.isEnabled,
                      "re-checking must persist it back on")
    }
}
