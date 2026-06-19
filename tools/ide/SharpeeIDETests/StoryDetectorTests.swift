// StoryDetectorTests.swift
// Covers StoryDetector.detect(in:): stories+tutorials discovery, package.json gating,
// ordering (stories before tutorials, sorted within group), and empty roots.

import XCTest
@testable import SharpeeIDE

final class StoryDetectorTests: XCTestCase {

    private var root: URL!

    override func setUpWithError() throws {
        super.setUp()
        root = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-StoryDetectorTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let root, FileManager.default.fileExists(atPath: root.path) {
            try FileManager.default.removeItem(at: root)
        }
        root = nil
        super.tearDown()
    }

    /// Creates `<relativeDir>/package.json` under root.
    private func makeStory(_ relativeDir: String) throws {
        let dir = root.appendingPathComponent(relativeDir, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try Data("{}".utf8).write(to: dir.appendingPathComponent("package.json"))
    }

    private func makeDir(_ relativeDir: String) throws {
        try FileManager.default.createDirectory(
            at: root.appendingPathComponent(relativeDir, isDirectory: true),
            withIntermediateDirectories: true)
    }

    func testReturnsEmptyWhenNoStoriesOrTutorials() {
        XCTAssertEqual(StoryDetector.detect(in: root), [])
    }

    func testDetectsStoriesAndTutorialsStoriesFirstSortedWithinGroup() throws {
        try makeStory("stories/zork")
        try makeStory("stories/dungeo")
        try makeStory("tutorials/familyzoo")
        try makeStory("tutorials/aardvark")

        XCTAssertEqual(StoryDetector.detect(in: root), [
            DetectedStory(name: "dungeo", kind: .story),
            DetectedStory(name: "zork", kind: .story),
            DetectedStory(name: "aardvark", kind: .tutorial),
            DetectedStory(name: "familyzoo", kind: .tutorial),
        ])
    }

    func testExcludesDirectoryWithoutPackageJSON() throws {
        try makeStory("stories/dungeo")
        try makeDir("stories/not-a-story")   // no package.json

        XCTAssertEqual(StoryDetector.detect(in: root), [
            DetectedStory(name: "dungeo", kind: .story),
        ])
    }

    func testExcludesLooseFileInStoriesDir() throws {
        try makeStory("stories/dungeo")
        try Data().write(to: root.appendingPathComponent("stories/README.md"))

        XCTAssertEqual(StoryDetector.detect(in: root), [
            DetectedStory(name: "dungeo", kind: .story),
        ])
    }

    func testDetectsTutorialsWhenNoStoriesDir() throws {
        try makeStory("tutorials/familyzoo")
        XCTAssertEqual(StoryDetector.detect(in: root), [
            DetectedStory(name: "familyzoo", kind: .tutorial),
        ])
    }
}
