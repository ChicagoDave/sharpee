// PlaySurfaceInvalidationTests.swift
// David's ruling: when the source changes, the ENTIRE play surface clears — the
// pane renders a particular build, and diverged source invalidates it. Pins the
// PlayViewController state machine: load → invalidate (unloaded + awaiting
// rebuild, no auto-reload of the stale bundle) → reloadAfterBuild revalidates.
// The storage clear is what prevents the autosave restore-on-start from
// replaying the stale world (the playground-autosave failure mode).

import XCTest
@testable import SharpeeIDE

@MainActor
final class PlaySurfaceInvalidationTests: XCTestCase {

    private var tmp: URL!
    private var bundleDir: URL!
    private var play: PlayViewController!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlaySurfaceInvalidationTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        bundleDir = tmp.appendingPathComponent("dist/web/probe", isDirectory: true)
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        try Data("<html></html>".utf8).write(to: bundleDir.appendingPathComponent("index.html"))
        play = PlayViewController()
        _ = play.view // force loadView
    }

    override func tearDownWithError() throws {
        play = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    func testLoadThenInvalidateClearsAndLatchesAwaitingRebuild() {
        play.load(bundleDirectory: bundleDir)
        XCTAssertTrue(play.isLoaded)
        XCTAssertFalse(play.isAwaitingRebuild)

        play.invalidateForSourceChange()

        XCTAssertFalse(play.isLoaded, "a source change clears the whole surface")
        XCTAssertTrue(play.isAwaitingRebuild,
                      "the stale bundle must not auto-reload until a build revalidates it")
    }

    func testInvalidateWithoutLoadIsANoOp() {
        play.invalidateForSourceChange()
        XCTAssertFalse(play.isLoaded)
        XCTAssertFalse(play.isAwaitingRebuild,
                       "nothing was showing — nothing to invalidate or latch")
    }

    func testReloadAfterBuildRevalidates() {
        play.load(bundleDirectory: bundleDir)
        play.invalidateForSourceChange()

        play.reloadAfterBuild(bundleDirectory: bundleDir)

        XCTAssertTrue(play.isLoaded, "a successful build revalidates the surface")
        XCTAssertFalse(play.isAwaitingRebuild)
    }

    func testReloadAfterBuildClearsLatchEvenWithPlayAfterBuildOff() {
        play.load(bundleDirectory: bundleDir)
        play.invalidateForSourceChange()
        play.setPlayAfterBuild(false)

        play.reloadAfterBuild(bundleDirectory: bundleDir)

        XCTAssertFalse(play.isLoaded, "toggle off: no auto-load")
        XCTAssertFalse(play.isAwaitingRebuild,
                       "the build still matches the source — a manual load may proceed")
    }
}
