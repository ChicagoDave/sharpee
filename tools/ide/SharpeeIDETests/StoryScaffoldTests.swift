// StoryScaffoldTests.swift
// Covers StoryScaffold: kebab id derivation, template substitution + file creation
// from an injected fixture template directory, and the non-empty / missing-template
// error paths.

import XCTest
@testable import SharpeeIDE

final class StoryScaffoldTests: XCTestCase {

    private var tmp: URL!
    private var templateDir: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-StoryScaffoldTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        templateDir = tmp.appendingPathComponent("template", isDirectory: true)
        try FileManager.default.createDirectory(at: templateDir, withIntermediateDirectories: true)
        try write("index.ts.template", "// {{STORY_TITLE}} by {{AUTHOR}}\nexport const id = '{{STORY_ID}}';")
        try write("package.json.template",
                  "{\"name\":\"{{STORY_ID}}\",\"dependencies\":{\"@sharpee/sharpee\":\"{{SHARPEE_VERSION}}\"},"
                  + "\"devDependencies\":{\"@sharpee/devkit\":\"{{DEVKIT_VERSION}}\"}}")
        try write("tsconfig.json.template", "{ \"compilerOptions\": {} }")
    }

    override func tearDownWithError() throws {
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    private func write(_ name: String, _ contents: String) throws {
        try contents.write(to: templateDir.appendingPathComponent(name), atomically: true, encoding: .utf8)
    }

    private func info(_ title: String) -> StoryScaffold.Info {
        StoryScaffold.Info(title: title, author: "Ada", description: "An adventure")
    }

    func testStoryIdIsKebabCase() {
        XCTAssertEqual(StoryScaffold.storyId(from: "The Lost Key"), "the-lost-key")
        XCTAssertEqual(StoryScaffold.storyId(from: "  Spaces & Symbols!! "), "spaces-symbols")
        XCTAssertEqual(StoryScaffold.storyId(from: "***"), "my-story")
    }

    func testCreateWritesSubstitutedFiles() throws {
        let dir = tmp.appendingPathComponent("the-lost-key")
        try StoryScaffold.create(in: dir, info: info("The Lost Key"), templateDirectory: templateDir)

        let index = try String(contentsOf: dir.appendingPathComponent("src/index.ts"), encoding: .utf8)
        XCTAssertTrue(index.contains("// The Lost Key by Ada"))
        XCTAssertTrue(index.contains("id = 'the-lost-key'"))

        let pkg = try String(contentsOf: dir.appendingPathComponent("package.json"), encoding: .utf8)
        XCTAssertTrue(pkg.contains("\"name\":\"the-lost-key\""))
        XCTAssertTrue(pkg.contains("@sharpee/sharpee\":\"^1.0.0"))
        XCTAssertTrue(pkg.contains("@sharpee/devkit\":\"^1.0.0"))
        XCTAssertFalse(pkg.contains("{{"))  // no unsubstituted placeholders

        XCTAssertTrue(FileManager.default.fileExists(atPath: dir.appendingPathComponent("tsconfig.json").path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: dir.appendingPathComponent(".gitignore").path))
    }

    func testRejectsNonEmptyDirectory() throws {
        let dir = tmp.appendingPathComponent("occupied")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try Data("x".utf8).write(to: dir.appendingPathComponent("existing.txt"))
        XCTAssertThrowsError(try StoryScaffold.create(in: dir, info: info("X"), templateDirectory: templateDir)) {
            guard case StoryScaffold.ScaffoldError.directoryNotEmpty = $0 else {
                return XCTFail("expected directoryNotEmpty, got \($0)")
            }
        }
    }

    func testThrowsWhenTemplateMissing() {
        let dir = tmp.appendingPathComponent("new")
        let emptyTemplates = tmp.appendingPathComponent("empty-templates")
        try? FileManager.default.createDirectory(at: emptyTemplates, withIntermediateDirectories: true)
        XCTAssertThrowsError(try StoryScaffold.create(in: dir, info: info("X"), templateDirectory: emptyTemplates)) {
            guard case StoryScaffold.ScaffoldError.templateMissing = $0 else {
                return XCTFail("expected templateMissing, got \($0)")
            }
        }
    }
}
