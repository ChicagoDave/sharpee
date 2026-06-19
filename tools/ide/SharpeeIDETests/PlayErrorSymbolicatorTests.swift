// PlayErrorSymbolicatorTests.swift
// Covers PlayErrorSymbolicator: message extraction, frame parsing, and symbolication of
// game.js frames against a fixture source map (non-bundle frames stay unresolved).

import XCTest
@testable import SharpeeIDE

final class PlayErrorSymbolicatorTests: XCTestCase {

    private var bundleDir: URL!

    override func setUpWithError() throws {
        super.setUp()
        PlayErrorSymbolicator.clearCache()
        bundleDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-Symbolicate-\(UUID().uuidString)/dist/web/foo", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: bundleDir, withIntermediateDirectories: true)
        // sources[0] resolves (relative to bundleDir) to .../stories/foo/src/bar.ts.
        // mappings "AAAA" -> gen(1,0) maps to source0 line1 col0.
        let map = #"{"version":3,"sources":["../../../stories/foo/src/bar.ts"],"names":[],"mappings":"AAAA"}"#
        try Data(map.utf8).write(to: bundleDir.appendingPathComponent("game.js.map"))
    }

    override func tearDownWithError() throws {
        let root = bundleDir.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        try? FileManager.default.removeItem(at: root)
        bundleDir = nil
        super.tearDown()
    }

    func testExtractsMessageAndSymbolicatesBundleFrame() throws {
        let stack = """
        Unhandled rejection: boom
        createObjects@sharpee-play://app/game.js:1:0
        """
        let error = PlayErrorSymbolicator.symbolicate(stack, bundleDir: bundleDir)

        XCTAssertEqual(error.message, "Unhandled rejection: boom")
        XCTAssertEqual(error.frames.count, 1)
        let frame = try XCTUnwrap(error.frames.first)
        XCTAssertEqual(frame.function, "createObjects")
        XCTAssertEqual(frame.location?.file.lastPathComponent, "bar.ts")
        XCTAssertEqual(frame.location?.file.path,
                       bundleDir.deletingLastPathComponent().deletingLastPathComponent()
                        .deletingLastPathComponent().appendingPathComponent("stories/foo/src/bar.ts").path)
        XCTAssertEqual(frame.location?.line, 1)
    }

    func testNonBundleFrameStaysUnresolved() {
        let stack = "doThing@sharpee-play://app/other.js:5:5"
        let error = PlayErrorSymbolicator.symbolicate(stack, bundleDir: bundleDir)
        XCTAssertEqual(error.frames.count, 1)
        XCTAssertNil(error.frames.first?.location)
    }

    func testMissingMapLeavesFramesUnresolvedButStillListed() {
        let empty = bundleDir.appendingPathComponent("nomap", isDirectory: true)
        try? FileManager.default.createDirectory(at: empty, withIntermediateDirectories: true)
        let stack = "createObjects@sharpee-play://app/game.js:1:0"
        let error = PlayErrorSymbolicator.symbolicate(stack, bundleDir: empty)
        XCTAssertEqual(error.frames.count, 1)
        XCTAssertNil(error.frames.first?.location)
    }

    func testDefaultMessageWhenOnlyFrames() {
        let error = PlayErrorSymbolicator.symbolicate("gj@sharpee-play://app/game.js:1:0", bundleDir: bundleDir)
        XCTAssertEqual(error.message, "Play runtime error")
    }
}
