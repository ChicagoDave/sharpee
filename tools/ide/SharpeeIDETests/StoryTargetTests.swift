// StoryTargetTests.swift
// D2/D8: what the IDE opens — a .story file or a folder holding one. The
// session-restore and recents gates both stand on this predicate, so its edges
// (TypeScript project, empty folder, vanished path, folder-named preference)
// are pinned here.

import XCTest
@testable import SharpeeIDE

final class StoryTargetTests: XCTestCase {

    private var tmp: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-StoryTargetTests-\(UUID().uuidString)", isDirectory: true)
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

    private func dir(_ name: String, files: [String]) throws -> URL {
        let d = tmp.appendingPathComponent(name, isDirectory: true)
        try FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        for f in files {
            try "x".write(to: d.appendingPathComponent(f), atomically: true, encoding: .utf8)
        }
        return d
    }

    func testFolderWithStoryIsAStoryProject() throws {
        let d = try dir("keeper", files: ["keeper.story"])
        XCTAssertTrue(StoryTarget.isStoryProject(d))
        XCTAssertEqual(StoryTarget.storyFile(in: d)?.lastPathComponent, "keeper.story")
    }

    func testStoryFileItselfIsAStoryProject() throws {
        let d = try dir("keeper", files: ["keeper.story"])
        XCTAssertTrue(StoryTarget.isStoryProject(d.appendingPathComponent("keeper.story")))
    }

    func testPrefersStoryNamedAfterFolder() throws {
        let d = try dir("keeper", files: ["aaa.story", "keeper.story"])
        XCTAssertEqual(StoryTarget.storyFile(in: d)?.lastPathComponent, "keeper.story",
                       "the folder-named story wins over alphabetical order")
    }

    func testFallsBackToAlphabeticallyFirstStory() throws {
        let d = try dir("mixed", files: ["zeta.story", "alpha.story"])
        XCTAssertEqual(StoryTarget.storyFile(in: d)?.lastPathComponent, "alpha.story")
    }

    func testTypeScriptProjectIsNotAStoryProject() throws {
        let d = try dir("old-ts", files: ["package.json", "tsconfig.json"])
        try FileManager.default.createDirectory(at: d.appendingPathComponent("src"),
                                                withIntermediateDirectories: true)
        XCTAssertFalse(StoryTarget.isStoryProject(d),
                       "an ADR-185-era TypeScript project is dropped, never offered (D8)")
    }

    func testEmptyFolderAndVanishedPathAreNot() throws {
        let d = try dir("empty", files: [])
        XCTAssertFalse(StoryTarget.isStoryProject(d))
        XCTAssertFalse(StoryTarget.isStoryProject(tmp.appendingPathComponent("nope")))
        XCTAssertFalse(StoryTarget.isStoryProject(tmp.appendingPathComponent("nope.story")),
                       "a .story PATH that does not exist is not a target")
    }
}
