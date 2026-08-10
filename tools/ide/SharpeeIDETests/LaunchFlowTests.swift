// LaunchFlowTests.swift
// Covers the launch path (go-live item 6): the app shows the landing page rather
// than silently reopening the last project, every choice on it does what it
// says, and backing out of a choice brings the page back rather than stranding
// the author on an empty window.
//
// Drives the REAL LaunchCoordinator presenting the REAL landing page as a sheet
// on a REAL MainWindowController, and clicks the real NSButtons. Only the three
// things a test must not really do — loading a project, writing a story, and
// terminating the app — are injected through LaunchCoordinator.Actions.
//
// These tests write real UserDefaults (recents, session, divider autosaves), so
// every key they touch is saved and restored. A test that overwrote the
// developer's live session has bitten this suite before.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class LaunchFlowTests: XCTestCase {

    private var tmp: URL!
    private var window: NSWindow!
    private var controller: MainWindowController!

    private static let touchedDefaultsKeys = [
        RecentProjectsStore.key,
        SessionStateStore.key,
        "NSSplitView Subview Frames SharpeeIDEMainSplit",
    ]
    private var savedDefaults: [Any?] = []

    override func setUpWithError() throws {
        super.setUp()
        let defaults = UserDefaults.standard
        savedDefaults = Self.touchedDefaultsKeys.map { defaults.object(forKey: $0) }
        Self.touchedDefaultsKeys.forEach { defaults.removeObject(forKey: $0) }

        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-LaunchFlowTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        // An alert left attached would outlive the test and block the next one.
        if let sheet = window?.attachedSheet { window.endSheet(sheet) }
        window?.orderOut(nil)
        window = nil
        controller = nil

        let defaults = UserDefaults.standard
        for (key, value) in zip(Self.touchedDefaultsKeys, savedDefaults) {
            if let value { defaults.set(value, forKey: key) }
            else { defaults.removeObject(forKey: key) }
        }

        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    // MARK: - Harness

    private func pump(_ seconds: TimeInterval = 0.15) {
        RunLoop.current.run(until: Date(timeIntervalSinceNow: seconds))
    }

    @discardableResult
    private func makeStoryProject(_ name: String) throws -> URL {
        let dir = tmp.appendingPathComponent(name, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try "story \"\(name)\"".write(to: dir.appendingPathComponent("\(name).story"),
                                      atomically: true, encoding: .utf8)
        return dir
    }

    /// What the coordinator did to the rest of the app.
    private final class Recorder {
        var opened: [URL] = []
        var created: [CreateStoryViewController.Request] = []
        var quitCount = 0
    }

    private func launch(lastProject: URL? = nil,
                        createResult: URL? = nil,
                        reopenDirectly: Bool = false) throws -> (LaunchCoordinator, Recorder) {
        let recorder = Recorder()
        controller = MainWindowController()
        window = try XCTUnwrap(controller.window)
        window.setFrame(NSRect(x: 0, y: 0, width: 1200, height: 800), display: true)
        window.makeKeyAndOrderFront(nil)
        pump(0.05)

        let actions = LaunchCoordinator.Actions(
            openProject: { recorder.opened.append($0) },
            createStory: { request in
                recorder.created.append(request)
                guard let createResult else { throw StoryHome.HomeError.projectAlreadyExists(request.directory) }
                return createResult
            },
            quit: { recorder.quitCount += 1 })

        let coordinator = LaunchCoordinator(window: window, actions: actions, storyRoot: tmp)
        coordinator.begin(lastProject: lastProject, reopenDirectly: reopenDirectly)
        pump()
        return (coordinator, recorder)
    }

    private func button(_ identifier: String, in view: NSView) -> NSButton? {
        if let button = view as? NSButton, button.accessibilityIdentifier() == identifier {
            return button
        }
        for sub in view.subviews {
            if let found = button(identifier, in: sub) { return found }
        }
        return nil
    }

    private func click(_ identifier: String, in controller: NSViewController) throws {
        try XCTUnwrap(button(identifier, in: controller.view),
                      "no button “\(identifier)” on screen").performClick(nil)
        pump()
    }

    // MARK: - Launch shows the landing page

    func testLaunchShowsTheLandingPageInsteadOfReopeningTheLastProject() throws {
        let last = try makeStoryProject("the-folly")
        RecentProjectsStore.push(last)

        let (coordinator, recorder) = try launch(lastProject: last)

        XCTAssertNotNil(coordinator.landingPage, "launch must land on the modal")
        XCTAssertEqual(recorder.opened, [],
                       "the last project is OFFERED, not reopened behind the author's back")
        XCTAssertNotNil(window.attachedSheet, "the landing page must be modal over the window")
        XCTAssertFalse(coordinator.isFinished)
    }

    func testTheLandingPageOffersTheLastProjectEvenWithNoRecents() throws {
        let last = try makeStoryProject("the-folly")

        let (coordinator, _) = try launch(lastProject: last)

        let page = try XCTUnwrap(coordinator.landingPage)
        XCTAssertNotNil(button(LandingPageViewController.recentIdentifier(0), in: page.view),
                        "an empty Open Recent must not lose the last project")
    }

    // MARK: - Reopen last story (David 2026-08-09: the Settings toggle)

    func testReopenDirectlyOpensTheLastProjectWithoutTheModal() throws {
        let last = try makeStoryProject("the-folly")

        let (coordinator, recorder) = try launch(lastProject: last, reopenDirectly: true)

        XCTAssertEqual(recorder.opened, [last],
                       "the toggle must open the last story straight away")
        XCTAssertTrue(coordinator.isFinished)
        XCTAssertNil(coordinator.landingPage, "the landing page must never appear")
        XCTAssertNil(window.attachedSheet)
    }

    func testReopenDirectlyFallsBackToTheLandingPageWhenTheLastProjectIsGone() throws {
        let gone = tmp.appendingPathComponent("vanished", isDirectory: true)

        let (coordinator, recorder) = try launch(lastProject: gone, reopenDirectly: true)

        XCTAssertEqual(recorder.opened, [], "a missing folder must not be opened")
        XCTAssertNotNil(coordinator.landingPage,
                        "the author must land on the modal, not an empty window")
        XCTAssertFalse(coordinator.isFinished)
    }

    func testReopenDirectlyFallsBackWhenTheFolderIsNotAStoryProject() throws {
        let bare = tmp.appendingPathComponent("not-a-story", isDirectory: true)
        try FileManager.default.createDirectory(at: bare, withIntermediateDirectories: true)

        let (coordinator, recorder) = try launch(lastProject: bare, reopenDirectly: true)

        XCTAssertEqual(recorder.opened, [], "a folder with no .story must not be opened")
        XCTAssertNotNil(coordinator.landingPage)
        XCTAssertFalse(coordinator.isFinished)
    }

    // MARK: - Picking a project

    func testPickingARecentOpensItAndDismissesTheModalForGood() throws {
        let project = try makeStoryProject("the-folly")
        RecentProjectsStore.push(project)

        let (coordinator, recorder) = try launch(lastProject: project)
        try click(LandingPageViewController.recentIdentifier(0),
                  in: try XCTUnwrap(coordinator.landingPage))

        XCTAssertEqual(recorder.opened, [project], "the row must open the project it names")
        XCTAssertTrue(coordinator.isFinished)
        XCTAssertNil(coordinator.landingPage, "the modal is done once a project is open")
        XCTAssertNil(window.attachedSheet)

        // No summon-back: asking again must not put it on screen.
        coordinator.begin(lastProject: project)
        pump()
        XCTAssertNil(coordinator.landingPage,
                     "dismissed once means gone until the next launch")
    }

    func testCloseChordWriterQuitsWithoutOpeningAnything() throws {
        let project = try makeStoryProject("the-folly")
        RecentProjectsStore.push(project)

        let (coordinator, recorder) = try launch(lastProject: project)
        try click(LandingPageViewController.quitIdentifier,
                  in: try XCTUnwrap(coordinator.landingPage))

        XCTAssertEqual(recorder.quitCount, 1)
        XCTAssertEqual(recorder.opened, [], "quitting must not open a project on the way out")

        // Launching, looking at the landing page and leaving must not overwrite
        // the persisted session — otherwise the app forgets the last project
        // precisely because the author was offered a choice about it.
        XCTAssertNil(SessionStateStore.load(),
                     "no project was opened, so nothing may have been written over the session")
    }

    // MARK: - REJECTS WHEN: the project went away after the page was built

    func testARecentThatVanishedIsDroppedRatherThanOpened() throws {
        let project = try makeStoryProject("the-folly")
        RecentProjectsStore.push(project)
        let (coordinator, recorder) = try launch(lastProject: project)

        // The race the landing page cannot pre-empt: the folder survives the
        // page being built and goes away before the click.
        try FileManager.default.removeItem(at: project)
        try click(LandingPageViewController.recentIdentifier(0),
                  in: try XCTUnwrap(coordinator.landingPage))

        XCTAssertEqual(recorder.opened, [], "a folder that is gone must not be opened")
        XCTAssertFalse(coordinator.isFinished, "the author still has no project")
        XCTAssertEqual(RecentProjectsStore.load(), [],
                       "the dead entry must be dropped from the store, not offered again")
    }

    // MARK: - Create Story

    func testCreateStoryOpensTheSheetAndCreatesWhatItReports() throws {
        let created = try makeStoryProject("fernhill")
        let (coordinator, recorder) = try launch(createResult: created)

        try click(LandingPageViewController.createStoryIdentifier,
                  in: try XCTUnwrap(coordinator.landingPage))

        let sheet = try XCTUnwrap(coordinator.createStorySheet,
                                  "Create Story must open the create sheet")
        XCTAssertNil(coordinator.landingPage, "the landing page steps aside for it")

        // Drive the real sheet's own callback — the same one its Create button fires.
        sheet.onFinish?(.init(title: "Fernhill", directory: tmp.appendingPathComponent("Fernhill")))
        pump()

        XCTAssertEqual(recorder.created.map(\.title), ["Fernhill"])
        XCTAssertEqual(recorder.opened, [created], "a created story opens straight away")
        XCTAssertTrue(coordinator.isFinished)
    }

    func testBackingOutOfCreateStoryBringsTheLandingPageBack() throws {
        let project = try makeStoryProject("the-folly")
        RecentProjectsStore.push(project)
        let (coordinator, recorder) = try launch(lastProject: project)

        try click(LandingPageViewController.createStoryIdentifier,
                  in: try XCTUnwrap(coordinator.landingPage))
        let sheet = try XCTUnwrap(coordinator.createStorySheet)
        try click(CreateStoryViewController.cancelIdentifier, in: sheet)
        pump()

        XCTAssertNotNil(coordinator.landingPage,
                        "cancelling must not strand the author on an empty window")
        XCTAssertEqual(recorder.created, [])
        XCTAssertEqual(recorder.opened, [])
        XCTAssertFalse(coordinator.isFinished)

        // And the page that came back is live, not a corpse.
        try click(LandingPageViewController.recentIdentifier(0),
                  in: try XCTUnwrap(coordinator.landingPage))
        XCTAssertEqual(recorder.opened, [project])
    }

    // MARK: - What a chosen project restores

    func testTheSessionIsReplayedOnlyForTheProjectItWasSavedFor() throws {
        let folly = try makeStoryProject("the-folly")
        let other = try makeStoryProject("other")
        let state = SessionState(projectURL: folly,
                                 openDocumentURLs: [folly.appendingPathComponent("the-folly.story")],
                                 activeIndex: 0,
                                 projectPaneVisible: false)

        XCTAssertNotNil(SessionState.restorable(state, opening: folly),
                        "picking the last project must restore its tabs and pane state")
        XCTAssertNil(SessionState.restorable(state, opening: other),
                     "another project's tabs must not be opened in this one")
        XCTAssertNil(SessionState.restorable(nil, opening: folly),
                     "a first launch has nothing to restore")
    }

    // MARK: - Documented gap
    //
    // The Open… branch runs a real NSOpenPanel. Driving it would mean stubbing
    // the panel — the very call under test — so it is left uncovered here, the
    // same rationale StoryHomeTests records for its own modal gap. Its cancel
    // path shares `returnToLandingPage` with the Create Story cancel above,
    // which IS covered.
}
