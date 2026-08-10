// AutoAssertionMenuTests.swift
// Phase 6e's editor-level coverage: the Test → Auto-Assertion menu writes the
// `auto-assertion:` header line through the editor's real NSTextView buffer —
// undoable, tab dirty, disk untouched until the author saves — and the menu
// construction pins the closed choice set. The runner-level half (the policy
// writing assertions on a real `sharpee test` run) lives in
// packages/devkit/src/commands/auto-assertion.test.ts.
// Owner context: tools/ide — Tests.

import AppKit
import XCTest
@testable import SharpeeIDE

@MainActor
final class AutoAssertionMenuTests: XCTestCase {

    private var scratch: URL!
    private var storyFile: URL!

    override func setUpWithError() throws {
        try super.setUpWithError()
        let frozen = TestToolchain.repoRoot
            .appendingPathComponent("tools/ide/test-fixtures/fernhill-frozen")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: frozen.path),
                          "tools/ide/test-fixtures/fernhill-frozen is not present")
        scratch = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-AutoAssertionMenuTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.copyItem(at: frozen, to: scratch)
        storyFile = scratch.appendingPathComponent("fernhill.story")
    }

    override func tearDownWithError() throws {
        if let scratch, FileManager.default.fileExists(atPath: scratch.path) {
            try FileManager.default.removeItem(at: scratch)
        }
        scratch = nil
        try super.tearDownWithError()
    }

    private func pump(_ seconds: TimeInterval = 0.1) {
        RunLoop.current.run(until: Date(timeIntervalSinceNow: seconds))
    }

    /// Runs `body` with recents and the persisted session cleared, restoring
    /// both afterward — loadProject writes real entries into each.
    private func withCleanDefaults(_ body: () throws -> Void) rethrows {
        let defaults = UserDefaults.standard
        let keys = [RecentProjectsStore.key, SessionStateStore.key]
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

    // MARK: - The menu path edits the editor buffer, not the disk

    /// The whole policy path below the menu item: window → RootViewController
    /// → StoryHeaderAutoAssertion → the editor's real NSTextView. The mutation
    /// asserted is the open BUFFER (undoable, tab dirty) — disk stays
    /// untouched until the author saves, which is the seam's contract.
    func testTheMenuPathEditsTheOpenBufferAndLeavesTheTabDirty() throws {
        try withCleanDefaults {
            let controller = MainWindowController()
            let window = try XCTUnwrap(controller.window)
            window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
            window.orderFront(nil)
            defer { window.orderOut(nil) }
            pump()

            controller.loadProject(Project(rootURL: scratch))
            controller.composeStory(at: storyFile)
            var waited: TimeInterval = 0
            while controller.composedStory == nil && waited < 15 {
                pump(0.1)
                waited += 0.1
            }
            XCTAssertNotNil(controller.composedStory,
                            "no compose outcome arrived — the menu's guard would refuse every choice")

            XCTAssertNil(controller.autoAssertionPolicy(),
                         "the fixture must start on let-me-decide for this test to mean anything")

            controller.selectAutoAssertion(.allEmittedText)
            pump()

            XCTAssertEqual(controller.autoAssertionPolicy(), .allEmittedText,
                           "the menu reads the chosen policy back from the editor buffer")
            let buffer = try XCTUnwrap(controller.currentText(at: storyFile),
                                       "the choice opened the story and edited its buffer")
            XCTAssertTrue(buffer.contains("auto-assertion: all-emitted-text"),
                          "the auto-assertion: line landed in the buffer")
            XCTAssertTrue(controller.hasUnsavedChanges(at: storyFile),
                          "the edit is a buffer edit — the author decides when to save")
            let onDisk = try String(contentsOf: storyFile, encoding: .utf8)
            XCTAssertFalse(onDisk.contains("auto-assertion:"),
                           "nothing lands on disk until the author saves")

            // Switching policies edits the same line in place; Let Me Decide
            // removes it entirely.
            controller.selectAutoAssertion(.roomDescription)
            pump()
            XCTAssertEqual(controller.autoAssertionPolicy(), .roomDescription,
                           "switching replaces the line in place")

            controller.selectAutoAssertion(nil)
            pump()
            XCTAssertNil(controller.autoAssertionPolicy(),
                         "Let Me Decide removes the line")
            let cleared = try XCTUnwrap(controller.currentText(at: storyFile))
            XCTAssertFalse(cleared.contains("auto-assertion:"),
                           "a header on let-me-decide says nothing")
        }
    }

    // MARK: - The menu bar carries the closed choice set

    func testTheTestMenuCarriesTheFourChoices() throws {
        let mainMenu = MenuBuilder.makeMainMenu(target: self)
        let testMenu = try XCTUnwrap(
            mainMenu.items.first { $0.submenu?.title == "Test" }?.submenu)
        let policyMenu = try XCTUnwrap(
            testMenu.items.first { $0.submenu?.title == "Auto-Assertion" }?.submenu,
            "Test carries the Auto-Assertion submenu")

        let titles = policyMenu.items.filter { !$0.isSeparatorItem }.map(\.title)
        XCTAssertEqual(titles, ["Let Me Decide",
                                "All Emitted Text",
                                "Room Description",
                                "Room Name and Description"],
                       "the closed set, default first — F8's menu, verbatim")

        let raws = policyMenu.items.compactMap { $0.representedObject as? String }
        XCTAssertEqual(raws, ["all-emitted-text", "room-description", "room-name-and-description"],
                       "each policy item carries the header spelling; Let Me Decide carries none (it removes the line)")
        XCTAssertTrue(policyMenu.items.filter { !$0.isSeparatorItem }.allSatisfy {
            $0.action == #selector(AppDelegate.selectAutoAssertion(_:))
        }, "every choice routes through the one selection action")
    }
}
