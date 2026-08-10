// SplitDividerTests.swift
// Reproduces the reported divider bounce: dragging the project|editor divider
// must move it and it must STAY moved — no constraint re-asserting the prior
// width. Drives the real MainWindowController UI via NSSplitView.setPosition
// (the same constraint machinery a drag uses) and pumps the run loop.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class SplitDividerTests: XCTestCase {

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

    private func findIndexView(in view: NSView) -> IndexView? {
        if let index = view as? IndexView { return index }
        for sub in view.subviews {
            if let found = findIndexView(in: sub) { return found }
        }
        return nil
    }

    /// A populated IR whose stats line is LONG — the exact content that made the
    /// right panel behave as fixed-width (a wrapping label's 750 compression
    /// resistance beating the divider) before the priority fix.
    private var fatIR: ComposeStoryIR {
        func entity(_ n: Int, kinds: [String]) -> ComposeStoryIR.Entity {
            ComposeStoryIR.Entity(id: "e\(n)", name: "Entity Number \(n)", isPlayer: false,
                                  kinds: kinds.map { ComposeStoryIR.Kind(name: $0) },
                                  containing: nil,
                                  span: DiagnosticSpan(line: n, column: 1, endLine: n, endColumn: 5))
        }
        return ComposeStoryIR(
            format: "story language 1", languageVersion: "2.1.0",
            meta: .init(title: "A Very Long Story Title Indeed",
                        fields: .init(id: nil, storyVersion: nil, authors: ["Someone"])),
            grammarFile: nil,
            entities: (1...30).map { entity($0, kinds: [$0 % 3 == 0 ? "room" : ($0 % 3 == 1 ? "person" : "portable")]) },
            actions: (1...9).map { ComposeStoryIR.ActionDef(name: "action-\($0)",
                                                            span: DiagnosticSpan(line: $0, column: 1, endLine: $0, endColumn: 5)) },
            phrases: .init(defaultLocale: "en-US", locales: [
                "en-US": .init(names: (1...40).map {
                    .init(key: "phrase-key-number-\($0)", span: nil)
                }),
            ]),
            hatches: [.init(name: "weather", modulePath: "./weather.ts", span: nil)])
    }

    func testProjectEditorDividerMovesAndSticks() throws {
        let controller = MainWindowController()
        let window = try XCTUnwrap(controller.window)
        window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
        window.orderFront(nil)
        defer { window.orderOut(nil) }
        pump()

        // Populate the Index with a long stats line — the reported regression
        // trigger (hidden tabs still constrain).
        let indexView = try XCTUnwrap(findIndexView(in: window.contentView!))
        indexView.setState(.populated(ir: fatIR, stale: false))
        pump()

        let split = try XCTUnwrap(findMainSplit(in: window.contentView!),
                                  "the 4-pane horizontal split must exist")
        let project = split.arrangedSubviews[1]
        let before = project.frame.width

        // Widen the project pane by 80pt (divider 1 sits at rail + project).
        split.setPosition(split.arrangedSubviews[0].frame.width + before + 80, ofDividerAt: 1)
        pump()
        XCTAssertEqual(project.frame.width, before + 80, accuracy: 2,
                       "the divider must move — and not bounce back (left pane is not fixed-width)")

        // And back down (staying above minimumThickness 200 — AppKit clamps there).
        let narrower = max(before + 40, 210)
        split.setPosition(split.arrangedSubviews[0].frame.width + narrower, ofDividerAt: 1)
        pump()
        XCTAssertEqual(project.frame.width, narrower, accuracy: 2,
                       "narrowing must stick too")
    }

    /// The right pane: divider 2 (editor|play) must move both ways and stick —
    /// the play pane is not fixed-width (reported live with the Play header +
    /// placeholder showing, so that exact content is on screen here).
    // Runs from the CLEARED layout defaults, like every other test in this file.
    // Without that this test inherited whatever pane widths the previous run
    // persisted — and it persists its own drags — so `before` crept wider on
    // each run until `before + 120` crossed the editor's minimum width and the
    // widen assertion failed against a wall that had nothing to do with the
    // property under test. Verified 2026-08-06: at the same working tree it
    // failed at 837 vs 872 and passed once the keys were cleared.
    func testEditorPlayDividerMovesBothWaysAndSticks() throws {
        try withCleanLayoutDefaults {
            let controller = MainWindowController()
            let window = try XCTUnwrap(controller.window)
            window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
            window.orderFront(nil)
            defer { window.orderOut(nil) }
            pump()

            let split = try XCTUnwrap(findMainSplit(in: window.contentView!))
            let indexView = try XCTUnwrap(findIndexView(in: window.contentView!))
            indexView.setState(.populated(ir: fatIR, stale: false))
            pump()

            let play = split.arrangedSubviews[3]
            let before = play.frame.width

            // Widen the play pane by 120 (divider 2 moves left).
            split.setPosition(play.frame.minX - 120, ofDividerAt: 2)
            pump()
            XCTAssertEqual(play.frame.width, before + 120, accuracy: 2,
                           "the right pane must widen and stay widened")

            // Narrow it back down toward (but above) its 240 minimum.
            let target = max(before, 250)
            split.setPosition(split.bounds.width - target, ofDividerAt: 2)
            pump()
            XCTAssertEqual(play.frame.width, target, accuracy: 2,
                           "the right pane must narrow and stay narrowed")

            // And the position survives further layout passes (the snap-back property).
            let settled = play.frame.width
            split.needsLayout = true
            window.contentView?.needsLayout = true
            pump(0.2)
            XCTAssertEqual(play.frame.width, settled, accuracy: 1)
        }
    }

    // MARK: - Opening layout (session-carried divider persistence)

    private static let legacyFramesKey = "NSSplitView Subview Frames SharpeeIDEMainSplit"

    /// Runs `body` with the persisted layout state — the session entry that
    /// now carries pane widths (David 2026-08-09) plus recents, which loading
    /// a project pushes — cleared, restoring whatever was there afterward so
    /// other tests (and the developer's live session) are unaffected.
    private func withCleanLayoutDefaults(_ body: () throws -> Void) rethrows {
        let defaults = UserDefaults.standard
        let keys = [Self.legacyFramesKey, SessionStateStore.key, RecentProjectsStore.key]
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

    /// A throwaway story project on disk — geometry persists only once a
    /// project is open (the launch invariant), so tests that assert on
    /// persistence must open one.
    private func makeTempProject() throws -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SplitDividerTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try "story \"divider\"".write(to: dir.appendingPathComponent("divider.story"),
                                      atomically: true, encoding: .utf8)
        return dir
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

    /// With no saved pane widths, the window opens with the EQUAL editor|play
    /// split — even when a legacy AppKit frame-autosave entry exists. (The
    /// autosave restore ran at the pre-appearance fitting width and squashed
    /// the play pane to its 240 minimum on every launch; it is ignored now.)
    func testOpensWithEqualEditorPlaySplitByDefault() throws {
        try withCleanLayoutDefaults {
            UserDefaults.standard.set("legacy-frames-ignored", forKey: Self.legacyFramesKey)

            let (_, window, split) = try launchWindow()
            defer { window.orderOut(nil) }
            let editor = split.arrangedSubviews[2].frame.width
            let play = split.arrangedSubviews[3].frame.width
            // Divider thickness comes out of the editor's share — allow a few points.
            XCTAssertEqual(editor, play, accuracy: 8,
                           "editor and play must open at equal widths")
            XCTAssertGreaterThan(play, 400,
                                 "the play pane must not open at its 240 minimum")
        }
    }

    /// The persist-on-move half is covered below; this is the restore half —
    /// a saved window frame must be what the window actually opens at
    /// (David 2026-08-09: window height and width are IDE state).
    func testWindowFrameRestoresFromTheSessionAtLaunch() throws {
        try withCleanLayoutDefaults {
            let frame = NSRect(x: 120, y: 120, width: 1000, height: 700)
            SessionStateStore.save(SessionState(projectURL: nil,
                                                openDocumentURLs: [],
                                                activeIndex: nil,
                                                windowFrame: frame))

            let controller = MainWindowController()
            let window = try XCTUnwrap(controller.window)
            defer { window.orderOut(nil) }

            XCTAssertEqual(window.frame.origin.x, frame.origin.x, accuracy: 1)
            XCTAssertEqual(window.frame.origin.y, frame.origin.y, accuracy: 1)
            XCTAssertEqual(window.frame.width, frame.width, accuracy: 1)
            XCTAssertEqual(window.frame.height, frame.height, accuracy: 1)
        }
    }

    /// A dragged layout persists across relaunch — through the session entry
    /// (David 2026-08-09: pane widths are IDE state), which only writes once
    /// a project is open.
    func testUserDragPersistsAcrossRelaunchAtCurrentVersion() throws {
        try withCleanLayoutDefaults {
            let project = try makeTempProject()
            defer { try? FileManager.default.removeItem(at: project) }
            do {
                let (controller, window, split) = try launchWindow()
                controller.loadProject(Project(rootURL: project))
                pump()
                split.setPosition(split.bounds.width - 300, ofDividerAt: 2)
                pump()
                XCTAssertEqual(split.arrangedSubviews[3].frame.width, 300, accuracy: 2)
                XCTAssertEqual(try XCTUnwrap(SessionStateStore.load()?.playPaneWidth),
                               300, accuracy: 2,
                               "the drag must land in the session entry")
                window.orderOut(nil)
            }
            let (_, window, split) = try launchWindow()
            defer { window.orderOut(nil) }
            XCTAssertEqual(split.arrangedSubviews[3].frame.width, 300, accuracy: 2,
                           "a user drag made at the current version must survive relaunch")
        }
    }
}
