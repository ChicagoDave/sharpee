// LandingPageTests.swift
// Covers the landing page (go-live item 6): which projects it offers, and what
// the real view controller reports when its real buttons are clicked. The list
// half drives LandingRecents against real folders on real disk; the UI half
// builds the actual LandingPageViewController and clicks its actual NSButtons —
// no stand-in view, no simulated choice.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class LandingPageTests: XCTestCase {

    private var tmp: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-LandingPageTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    /// A real story project: a folder with a `.story` file in it, which is what
    /// `StoryTarget.isStoryProject` gates on.
    @discardableResult
    private func makeStoryProject(_ name: String) throws -> URL {
        let dir = tmp.appendingPathComponent(name, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try "story \"\(name)\"".write(to: dir.appendingPathComponent("\(name).story"),
                                      atomically: true, encoding: .utf8)
        return dir
    }

    // MARK: - Which projects the page offers

    func testTheFiveMostRecentAreOfferedNewestFirst() throws {
        let projects = try (1...7).map { try makeStoryProject("story-\($0)") }

        let entries = LandingRecents.entries(recents: projects, lastProject: nil)

        XCTAssertEqual(entries.count, 5,
                       "the store keeps 10; the page shows 5 — the caps are independent")
        XCTAssertEqual(entries.map(\.lastPathComponent),
                       ["story-1", "story-2", "story-3", "story-4", "story-5"],
                       "the store's LRU order is the page's order")
    }

    func testTheLastSessionsProjectIsOfferedEvenWhenOpenRecentWasCleared() throws {
        let last = try makeStoryProject("the-folly")

        let entries = LandingRecents.entries(recents: [], lastProject: last)

        XCTAssertEqual(entries.map(\.lastPathComponent), ["the-folly"],
                       "clearing Open Recent must not lose what the author was working on")
    }

    func testTheLastProjectIsNotListedTwice() throws {
        let a = try makeStoryProject("a")
        let b = try makeStoryProject("b")

        let entries = LandingRecents.entries(recents: [a, b], lastProject: a)

        XCTAssertEqual(entries.map(\.lastPathComponent), ["a", "b"])
    }

    func testDeletedAndNonStoryFoldersAreDroppedRatherThanOffered() throws {
        let real = try makeStoryProject("real")
        let deleted = tmp.appendingPathComponent("gone", isDirectory: true)
        let notAStory = tmp.appendingPathComponent("plain", isDirectory: true)
        try FileManager.default.createDirectory(at: notAStory, withIntermediateDirectories: true)
        try "hello".write(to: notAStory.appendingPathComponent("readme.txt"),
                          atomically: true, encoding: .utf8)

        let entries = LandingRecents.entries(recents: [deleted, notAStory, real], lastProject: nil)

        XCTAssertEqual(entries.map(\.lastPathComponent), ["real"],
                       "an entry that would fail at open time must not be offered")
    }

    func testAFreshInstallOffersNothingRatherThanFailing() {
        XCTAssertTrue(LandingRecents.entries(recents: [], lastProject: nil).isEmpty)
    }

    // MARK: - The real view controller

    private func button(_ identifier: String, in view: NSView) -> NSButton? {
        if let button = view as? NSButton, button.accessibilityIdentifier() == identifier {
            return button
        }
        for sub in view.subviews {
            if let found = button(identifier, in: sub) { return found }
        }
        return nil
    }

    private func loaded(_ recents: [URL]) -> (LandingPageViewController, NSView) {
        let page = LandingPageViewController(recents: recents)
        return (page, page.view)   // forces loadView()
    }

    func testClickingARecentRowReportsThatProject() throws {
        let a = try makeStoryProject("a")
        let b = try makeStoryProject("b")
        let (page, view) = loaded([a, b])

        var choice: LandingPageViewController.Choice?
        page.onChoice = { choice = $0 }

        let row = try XCTUnwrap(button(LandingPageViewController.recentIdentifier(1), in: view),
                                "the page must offer a row per recent project")
        row.performClick(nil)

        XCTAssertEqual(choice, .openRecent(b),
                       "the second row must report the second project, not the first")
    }

    func testEachRowNamesItsProjectAndShowsWhereItIs() throws {
        let a = try makeStoryProject("the-folly")
        let (_, view) = loaded([a])

        let row = try XCTUnwrap(button(LandingPageViewController.recentIdentifier(0), in: view))

        XCTAssertTrue(row.attributedTitle.string.contains("the-folly"),
                      "a row must name the project: \(row.attributedTitle.string)")
        XCTAssertTrue(row.attributedTitle.string.contains(tmp.lastPathComponent),
                      "two projects can share a name — the row must show where it is")
        XCTAssertEqual(row.toolTip, a.path)
    }

    func testTheThreeButtonsReportTheirChoices() throws {
        let (page, view) = loaded([])

        var choices: [LandingPageViewController.Choice] = []
        page.onChoice = { choices.append($0) }

        try XCTUnwrap(button(LandingPageViewController.openIdentifier, in: view)).performClick(nil)
        try XCTUnwrap(button(LandingPageViewController.createStoryIdentifier, in: view)).performClick(nil)
        try XCTUnwrap(button(LandingPageViewController.quitIdentifier, in: view)).performClick(nil)

        XCTAssertEqual(choices, [.open, .createStory, .quit])
    }

    func testAFreshInstallStillOffersOpenAndCreate() throws {
        let (_, view) = loaded([])

        XCTAssertNil(button(LandingPageViewController.recentIdentifier(0), in: view),
                     "no recents means no rows")
        XCTAssertNotNil(button(LandingPageViewController.createStoryIdentifier, in: view),
                        "a first-time author must still have a way forward")
        XCTAssertNotNil(button(LandingPageViewController.openIdentifier, in: view))
        XCTAssertNotNil(button(LandingPageViewController.quitIdentifier, in: view))
    }

    func testThereIsNoDismissAffordanceBesidesTheThreeButtons() throws {
        let a = try makeStoryProject("a")
        let (_, view) = loaded([a])

        // The landing page cannot be waved away: an app with no project open and
        // no summon-back shortcut is exactly the state this modal prevents.
        let buttons = allButtons(in: view)
        let identifiers = Set(buttons.compactMap { $0.accessibilityIdentifier() })
        XCTAssertEqual(identifiers, [
            LandingPageViewController.recentIdentifier(0),
            LandingPageViewController.openIdentifier,
            LandingPageViewController.createStoryIdentifier,
            LandingPageViewController.quitIdentifier,
        ], "an unlabelled extra button would be an untested way out of the modal")
        XCTAssertTrue(buttons.allSatisfy { $0.keyEquivalent != "\u{1b}" },
                      "Escape must not dismiss the landing page — there is nothing behind it")
    }

    private func allButtons(in view: NSView) -> [NSButton] {
        var found: [NSButton] = []
        if let button = view as? NSButton { found.append(button) }
        for sub in view.subviews { found.append(contentsOf: allButtons(in: sub)) }
        return found
    }
}
