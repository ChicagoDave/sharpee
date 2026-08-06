// SnapPanesSettingTests.swift
// Settings → "Snap panes to 50% each": off by default (a dragged divider stays
// where the author put it), and when on, a window resize or a Project-pane
// show/hide puts the editor and Play panes back on an even split.
// Drives the real MainWindowController and the real Settings checkbox.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class SnapPanesSettingTests: XCTestCase {

    private static let projectWidthKey = "SharpeeIDEMainSplitProjectWidth"
    private static let playWidthKey = "SharpeeIDEMainSplitPlayWidth"
    private static let legacyFramesKey = "NSSplitView Subview Frames SharpeeIDEMainSplit"
    private static let snapKey = "SharpeeSnapPanesEvenly"

    private func pump(_ seconds: TimeInterval = 0.2) {
        RunLoop.current.run(until: Date(timeIntervalSinceNow: seconds))
    }

    private func findMainSplit(in view: NSView) -> NSSplitView? {
        if let split = view as? NSSplitView, split.isVertical,
           split.arrangedSubviews.count == 4 {
            return split
        }
        for sub in view.subviews {
            if let found = findMainSplit(in: sub) { return found }
        }
        return nil
    }

    /// Clears the layout defaults, the session, AND the snap setting, restoring
    /// all of them afterward — these tests write real UserDefaults.
    private func withCleanDefaults(_ body: () throws -> Void) rethrows {
        let defaults = UserDefaults.standard
        let keys = [Self.legacyFramesKey, Self.projectWidthKey, Self.playWidthKey,
                    Self.snapKey, SessionStateStore.key]
        let saved = keys.map { defaults.object(forKey: $0) }
        defer {
            for (key, value) in zip(keys, saved) {
                if let value { defaults.set(value, forKey: key) }
                else { defaults.removeObject(forKey: key) }
            }
        }
        keys.forEach { defaults.removeObject(forKey: $0) }
        try body()
    }

    private func launchWindow() throws -> (MainWindowController, NSWindow, NSSplitView) {
        let controller = MainWindowController()
        let window = try XCTUnwrap(controller.window)
        window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
        window.orderFront(nil)
        pump()
        let split = try XCTUnwrap(findMainSplit(in: window.contentView!))
        return (controller, window, split)
    }

    /// Half of what the editor and Play panes share: everything but the rail and
    /// the project pane.
    private func expectedHalf(of split: NSSplitView) -> CGFloat {
        let rail = split.arrangedSubviews[0].frame.width
        let project = split.arrangedSubviews[1].frame.width
        return (split.bounds.width - rail - project) / 2
    }

    // MARK: - The setting itself

    func testTheSettingIsOffByDefault() {
        withCleanDefaults {
            XCTAssertFalse(SettingsPreference.snapPanesEvenly,
                           "snapping overrides a dragged divider — it must be opt-in")
        }
    }

    func testTheSettingPersistsAndAnnouncesItself() {
        withCleanDefaults {
            var announced = 0
            let token = NotificationCenter.default.addObserver(
                forName: SettingsPreference.didChange, object: nil, queue: nil) { _ in
                    announced += 1
                }
            defer { NotificationCenter.default.removeObserver(token) }

            SettingsPreference.snapPanesEvenly = true

            XCTAssertTrue(UserDefaults.standard.bool(forKey: Self.snapKey),
                          "the choice must survive a relaunch")
            XCTAssertEqual(announced, 1,
                           "open windows apply it now, not on next launch")

            SettingsPreference.snapPanesEvenly = true
            XCTAssertEqual(announced, 1, "setting the same value announces nothing")
        }
    }

    func testTheSettingsCheckboxWritesThePreference() throws {
        try withCleanDefaults {
            let controller = SettingsWindowController.shared
            controller.show()
            defer { controller.window?.orderOut(nil) }
            pump(0.1)

            let checkbox = try XCTUnwrap(
                findButton(identifier: SettingsWindowController.snapPanesCheckboxIdentifier,
                           in: XCTUnwrap(controller.window?.contentView)),
                "Settings must offer the snap checkbox")

            XCTAssertEqual(checkbox.state, .off, "it opens reflecting the current value")
            checkbox.performClick(nil)
            XCTAssertTrue(SettingsPreference.snapPanesEvenly,
                          "clicking the checkbox must write the preference")
        }
    }

    // MARK: - What snapping does

    func testWithTheSettingOffAResizeLeavesTheDraggedDividerAlone() throws {
        try withCleanDefaults {
            let (_, window, split) = try launchWindow()
            defer { window.orderOut(nil) }

            split.setPosition(split.bounds.width - 400, ofDividerAt: 2)
            pump()
            XCTAssertEqual(split.arrangedSubviews[3].frame.width, 400, accuracy: 2)

            window.setFrame(NSRect(x: 0, y: 0, width: 1200, height: 800), display: true)
            pump()

            XCTAssertEqual(split.arrangedSubviews[3].frame.width, 400, accuracy: 2,
                           "the default must not move a divider the author placed")
        }
    }

    func testTurningTheSettingOnSnapsTheOpenWindowAtOnce() throws {
        try withCleanDefaults {
            let (_, window, split) = try launchWindow()
            defer { window.orderOut(nil) }

            split.setPosition(split.bounds.width - 400, ofDividerAt: 2)
            pump()
            XCTAssertEqual(split.arrangedSubviews[3].frame.width, 400, accuracy: 2)

            SettingsPreference.snapPanesEvenly = true
            pump()

            XCTAssertEqual(split.arrangedSubviews[3].frame.width, expectedHalf(of: split),
                           accuracy: 2,
                           "flipping the setting must snap the window, not wait for a relaunch")
        }
    }

    func testAWindowResizeResnapsToHalves() throws {
        try withCleanDefaults {
            let (_, window, split) = try launchWindow()
            defer { window.orderOut(nil) }
            SettingsPreference.snapPanesEvenly = true
            pump()

            split.setPosition(split.bounds.width - 400, ofDividerAt: 2)
            pump()
            XCTAssertEqual(split.arrangedSubviews[3].frame.width, 400, accuracy: 2,
                           "a drag still moves the divider — snapping is a reset, not a lock")

            window.setFrame(NSRect(x: 0, y: 0, width: 1200, height: 800), display: true)
            pump()

            XCTAssertEqual(split.arrangedSubviews[3].frame.width, expectedHalf(of: split),
                           accuracy: 2, "resizing the window resets the split to 50/50")
        }
    }

    func testHidingAndShowingTheProjectPaneResnapsToHalves() throws {
        try withCleanDefaults {
            let (controller, window, split) = try launchWindow()
            defer { window.orderOut(nil) }
            SettingsPreference.snapPanesEvenly = true
            pump()

            split.setPosition(split.bounds.width - 400, ofDividerAt: 2)
            pump()
            XCTAssertEqual(split.arrangedSubviews[3].frame.width, 400, accuracy: 2)

            controller.toggleProjectPane()   // hide
            pump()
            XCTAssertFalse(controller.isProjectPaneVisible)
            XCTAssertEqual(split.arrangedSubviews[3].frame.width, expectedHalf(of: split),
                           accuracy: 2,
                           "hiding the pane frees width — the halves must be recomputed")

            split.setPosition(split.bounds.width - 350, ofDividerAt: 2)
            pump()
            controller.toggleProjectPane()   // show
            pump()
            XCTAssertTrue(controller.isProjectPaneVisible)
            XCTAssertEqual(split.arrangedSubviews[3].frame.width, expectedHalf(of: split),
                           accuracy: 2,
                           "showing it takes width back — likewise recomputed")
        }
    }

    // MARK: - Lookup

    private func findButton(identifier: String, in view: NSView) -> NSButton? {
        if let button = view as? NSButton, button.accessibilityIdentifier() == identifier {
            return button
        }
        for sub in view.subviews {
            if let found = findButton(identifier: identifier, in: sub) { return found }
        }
        return nil
    }
}
