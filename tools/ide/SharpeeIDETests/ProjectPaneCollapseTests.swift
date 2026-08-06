// ProjectPaneCollapseTests.swift
// Covers the collapsible project pane: the rail's folder button collapses and
// expands it, the author's dragged width survives the collapse, and the state
// persists into SessionState. Drives the real MainWindowController UI — the
// buttons are clicked through NSButton.performClick, not by calling the
// controller's toggle directly.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class ProjectPaneCollapseTests: XCTestCase {

    private static let projectWidthKey = "SharpeeIDEMainSplitProjectWidth"
    private static let playWidthKey = "SharpeeIDEMainSplitPlayWidth"
    private static let legacyFramesKey = "NSSplitView Subview Frames SharpeeIDEMainSplit"

    private func pump(_ seconds: TimeInterval = 0.1) {
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

    private func findButton(identifier: String, in view: NSView) -> NSButton? {
        if let button = view as? NSButton, button.accessibilityIdentifier() == identifier {
            return button
        }
        for sub in view.subviews {
            if let found = findButton(identifier: identifier, in: sub) { return found }
        }
        return nil
    }

    /// Runs `body` with the split's persisted widths AND the persisted session
    /// cleared, restoring both afterward — these tests toggle the pane, which
    /// writes a real SessionState entry.
    private func withCleanDefaults(_ body: () throws -> Void) rethrows {
        let defaults = UserDefaults.standard
        // Snap is cleared too — toggling the pane re-splits the editor and Play
        // panes when it is on, and these tests must not depend on that setting.
        let keys = [Self.legacyFramesKey, Self.projectWidthKey, Self.playWidthKey,
                    "SharpeeSnapPanesEvenly", SessionStateStore.key]
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

    // MARK: - Rail folder button

    func testRailFolderButtonCollapsesAndExpandsProjectPane() throws {
        try withCleanDefaults {
            let (controller, window, split) = try launchWindow()
            defer { window.orderOut(nil) }

            let folder = try XCTUnwrap(
                findButton(identifier: "rail.project", in: window.contentView!),
                "the rail must carry a folder button above the hammer")
            let project = split.arrangedSubviews[1]

            XCTAssertTrue(controller.isProjectPaneVisible, "the pane opens visible")
            let expandedWidth = project.frame.width
            XCTAssertGreaterThan(expandedWidth, 0)

            folder.performClick(nil)
            pump()
            XCTAssertFalse(controller.isProjectPaneVisible,
                           "clicking the folder button must collapse the pane")
            XCTAssertEqual(project.frame.width, 0, accuracy: 0.5,
                           "a collapsed pane occupies no width — the editor reclaims it")

            folder.performClick(nil)
            pump()
            XCTAssertTrue(controller.isProjectPaneVisible,
                          "clicking again must bring the pane back")
            XCTAssertEqual(project.frame.width, expandedWidth, accuracy: 2,
                           "the pane returns at the width it had")
        }
    }

    /// The rail button sits ABOVE the hammer — the two are distinct controls and
    /// the folder is the higher of the pair.
    func testFolderButtonSitsAboveTheHammer() throws {
        try withCleanDefaults {
            let (_, window, _) = try launchWindow()
            defer { window.orderOut(nil) }

            let folder = try XCTUnwrap(findButton(identifier: "rail.project", in: window.contentView!))
            let hammer = try XCTUnwrap(findButton(identifier: "rail.build", in: window.contentView!))
            XCTAssertNotEqual(folder, hammer)

            // AppKit's y axis is bottom-up, so "above" means a larger minY.
            let folderFrame = folder.convert(folder.bounds, to: window.contentView)
            let hammerFrame = hammer.convert(hammer.bounds, to: window.contentView)
            XCTAssertGreaterThan(folderFrame.minY, hammerFrame.maxY,
                                 "the folder button must sit above the hammer in the rail")
        }
    }

    // MARK: - Width survives the collapse

    func testCollapseDoesNotOverwriteTheSavedPaneWidth() throws {
        try withCleanDefaults {
            let (controller, window, split) = try launchWindow()
            defer { window.orderOut(nil) }

            // Drag the pane wider, which persists the new width.
            let railWidth = split.arrangedSubviews[0].frame.width
            split.setPosition(railWidth + 320, ofDividerAt: 1)
            pump()
            let saved = UserDefaults.standard.object(forKey: Self.projectWidthKey) as? Double
            XCTAssertEqual(try XCTUnwrap(saved), 320, accuracy: 2,
                           "a drag must persist the pane width")

            controller.toggleProjectPane()
            pump(0.2)   // let the hide's resize notifications fire

            let afterCollapse = UserDefaults.standard.object(forKey: Self.projectWidthKey) as? Double
            XCTAssertEqual(try XCTUnwrap(afterCollapse), 320, accuracy: 2,
                           "collapsing must NOT write the collapsed 0 width over the saved one")

            controller.toggleProjectPane()
            pump()
            XCTAssertEqual(split.arrangedSubviews[1].frame.width, 320, accuracy: 2,
                           "expanding must restore the dragged width, not the minimum")
        }
    }

    // MARK: - Session persistence

    func testTogglingPersistsVisibilityIntoTheSession() throws {
        try withCleanDefaults {
            let (controller, window, _) = try launchWindow()
            defer { window.orderOut(nil) }

            controller.toggleProjectPane()
            pump()
            let collapsed = try XCTUnwrap(SessionStateStore.load(),
                                          "toggling must write a session entry")
            XCTAssertFalse(collapsed.projectPaneVisible,
                           "a collapsed pane must persist as not visible")

            controller.toggleProjectPane()
            pump()
            let expanded = try XCTUnwrap(SessionStateStore.load())
            XCTAssertTrue(expanded.projectPaneVisible,
                          "re-expanding must persist as visible")
        }
    }

    func testRestoringACollapsedSessionOpensWithThePaneHidden() throws {
        try withCleanDefaults {
            let (controller, window, split) = try launchWindow()
            defer { window.orderOut(nil) }

            controller.setProjectPaneVisible(false)
            pump()

            XCTAssertFalse(controller.isProjectPaneVisible)
            XCTAssertEqual(split.arrangedSubviews[1].frame.width, 0, accuracy: 0.5,
                           "a restored collapse must survive the opening layout pass")
        }
    }
}
