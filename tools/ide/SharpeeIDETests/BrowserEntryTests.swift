// BrowserEntryTests.swift
// Covers BrowserEntry: path resolution (stories vs tutorials), existence detection,
// template content, and create() writing the file.

import XCTest
@testable import SharpeeIDE

final class BrowserEntryTests: XCTestCase {

    private var repoRoot: URL!

    override func setUpWithError() throws {
        super.setUp()
        repoRoot = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-BrowserEntryTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: repoRoot, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let repoRoot, FileManager.default.fileExists(atPath: repoRoot.path) {
            try FileManager.default.removeItem(at: repoRoot)
        }
        repoRoot = nil
        super.tearDown()
    }

    @discardableResult
    private func makeStoryDir(_ base: String, _ story: String) throws -> URL {
        let dir = repoRoot.appendingPathComponent(base).appendingPathComponent(story, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    // MARK: - path

    func testPathUnderStories() throws {
        try makeStoryDir("stories", "thealderman")
        let path = BrowserEntry.path(repoRoot: repoRoot, story: "thealderman")
        XCTAssertEqual(path?.path,
                       repoRoot.appendingPathComponent("stories/thealderman/src/browser-entry.ts").path)
    }

    func testPathUnderTutorials() throws {
        try makeStoryDir("tutorials", "familyzoo")
        let path = BrowserEntry.path(repoRoot: repoRoot, story: "familyzoo")
        XCTAssertEqual(path?.path,
                       repoRoot.appendingPathComponent("tutorials/familyzoo/src/browser-entry.ts").path)
    }

    func testPathNilWhenStoryDirMissing() {
        XCTAssertNil(BrowserEntry.path(repoRoot: repoRoot, story: "ghost"))
    }

    // MARK: - exists

    func testExistsFalseWhenNoEntry() throws {
        try makeStoryDir("stories", "thealderman")
        XCTAssertFalse(BrowserEntry.exists(repoRoot: repoRoot, story: "thealderman"))
    }

    func testExistsTrueAfterCreate() throws {
        try makeStoryDir("stories", "thealderman")
        try BrowserEntry.create(repoRoot: repoRoot, story: "thealderman")
        XCTAssertTrue(BrowserEntry.exists(repoRoot: repoRoot, story: "thealderman"))
    }

    // MARK: - create

    func testCreateWritesFileWithStoryNameAndKeyImports() throws {
        try makeStoryDir("stories", "thealderman")
        let url = try BrowserEntry.create(repoRoot: repoRoot, story: "thealderman")

        XCTAssertTrue(FileManager.default.fileExists(atPath: url.path))
        let content = try String(contentsOf: url, encoding: .utf8)
        XCTAssertTrue(content.contains("thealderman-theme"), "should use the story-scoped theme key")
        XCTAssertTrue(content.contains("storagePrefix: 'thealderman-'"))
        XCTAssertTrue(content.contains("import { story } from './index'"))
        XCTAssertTrue(content.contains("import { BrowserClient, ThemeManager } from '@sharpee/platform-browser'"))
        XCTAssertTrue(content.contains("story.config.title"), "metadata should come from story.config")
        XCTAssertTrue(content.contains("engine.setStory(story)"))
    }

    func testCreateThrowsWhenStoryDirMissing() {
        XCTAssertThrowsError(try BrowserEntry.create(repoRoot: repoRoot, story: "ghost")) { error in
            guard case BrowserEntryError.storyNotFound = error else {
                return XCTFail("expected storyNotFound, got \(error)")
            }
        }
    }
}
