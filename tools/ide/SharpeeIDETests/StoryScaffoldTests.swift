// StoryScaffoldTests.swift
// Covers StoryScaffold (Chord, ADR-258 D2): kebab id derivation, rendering
// story.story.template to `<id>.story` with substitutions, the hard guarantee
// that NO package.json / src/ / tsconfig lands in a new story, the real bundled
// devkit template, and the non-empty / missing-template error paths.

import XCTest
@testable import SharpeeIDE

@MainActor
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
        try Self.write("story.story.template", """
        story "{{STORY_TITLE}}" by "{{AUTHOR}}"
          id: {{STORY_ID}}
          version: 0.1.0
          blurb: {{DESCRIPTION}}
        """, into: templateDir)
        // A sibling package.json.template exists in the real devkit template dir —
        // the IDE scaffold must IGNORE it (D2: never create a package.json).
        try Self.write("package.json.template", "{\"name\":\"{{STORY_ID}}\"}", into: templateDir)
    }

    override func tearDownWithError() throws {
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    private nonisolated static func write(_ name: String, _ contents: String, into dir: URL) throws {
        try contents.write(to: dir.appendingPathComponent(name), atomically: true, encoding: .utf8)
    }

    private func info(_ title: String) -> StoryScaffold.Info {
        StoryScaffold.Info(title: title, author: "Ada", description: "An adventure")
    }

    func testStoryIdIsKebabCase() {
        XCTAssertEqual(StoryScaffold.storyId(from: "The Lost Key"), "the-lost-key")
        XCTAssertEqual(StoryScaffold.storyId(from: "  Spaces & Symbols!! "), "spaces-symbols")
        XCTAssertEqual(StoryScaffold.storyId(from: "***"), "my-story")
    }

    func testCreateWritesSubstitutedStoryFileOnly() throws {
        let dir = tmp.appendingPathComponent("the-lost-key")
        try StoryScaffold.create(in: dir, info: info("The Lost Key"), templateDirectory: templateDir)

        let story = try String(contentsOf: dir.appendingPathComponent("the-lost-key.story"),
                               encoding: .utf8)
        XCTAssertTrue(story.contains("story \"The Lost Key\" by \"Ada\""))
        XCTAssertTrue(story.contains("id: the-lost-key"))
        XCTAssertTrue(story.contains("blurb: An adventure"))
        XCTAssertFalse(story.contains("{{"), "no unsubstituted placeholders")

        let fm = FileManager.default
        XCTAssertFalse(fm.fileExists(atPath: dir.appendingPathComponent("package.json").path),
                       "the IDE never creates a package.json (D2)")
        XCTAssertFalse(fm.fileExists(atPath: dir.appendingPathComponent("src").path))
        XCTAssertFalse(fm.fileExists(atPath: dir.appendingPathComponent("tsconfig.json").path))
        XCTAssertTrue(fm.fileExists(atPath: dir.appendingPathComponent(".gitignore").path))
    }

    /// The REAL bundled template: a scaffolded story composes clean through the
    /// real CLI (rule 13a) — proving template, scaffold, and compiler agree.
    func testRealTemplateScaffoldComposesClean() throws {
        let realTemplates = TestToolchain.repoRoot
            .appendingPathComponent("packages/devkit/templates/story-chord")
        let dir = tmp.appendingPathComponent("fresh-adventure")
        try StoryScaffold.create(in: dir, info: info("Fresh Adventure"),
                                 templateDirectory: realTemplates)
        let story = dir.appendingPathComponent("fresh-adventure.story")
        XCTAssertTrue(FileManager.default.fileExists(atPath: story.path))

        let runner = ComposeRunner()
        let done = expectation(description: "compose completes")
        var captured: Result<ComposeJsonPayload, ComposeRunner.Failure>!
        TestToolchain.composeInvoker(runner: runner)(story) { result in
            captured = result
            done.fulfill()
        }
        wait(for: [done], timeout: 60)

        guard case .success(let payload) = captured! else {
            return XCTFail("expected success, got \(String(describing: captured))")
        }
        XCTAssertTrue(payload.diagnostics.isEmpty,
                      "the scaffold template must compose clean: \(payload.diagnostics)")
        XCTAssertEqual(payload.ir?.meta.fields["id"], "fresh-adventure")
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
