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
        story
          title: {{STORY_TITLE}}
          authors: {{AUTHOR}}
          id: {{STORY_ID}}
          story-version: 0.1.0
          ifid: {{IFID}}
          description: {{DESCRIPTION}}
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
        XCTAssertTrue(story.contains("title: The Lost Key"))
        XCTAssertTrue(story.contains("authors: Ada"))
        XCTAssertTrue(story.contains("id: the-lost-key"))
        XCTAssertTrue(story.contains("description: An adventure"))
        XCTAssertNotNil(story.range(of: #"ifid: [0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}"#,
                                    options: .regularExpression),
                        "the IFID is minted at scaffold time (ADR-298 D5), uppercase UUID")
        XCTAssertFalse(story.contains("{{"), "no unsubstituted placeholders")

        let fm = FileManager.default
        XCTAssertFalse(fm.fileExists(atPath: dir.appendingPathComponent("package.json").path),
                       "the IDE never creates a package.json (D2)")
        XCTAssertFalse(fm.fileExists(atPath: dir.appendingPathComponent("src").path))
        XCTAssertFalse(fm.fileExists(atPath: dir.appendingPathComponent("tsconfig.json").path))
        XCTAssertTrue(fm.fileExists(atPath: dir.appendingPathComponent(".gitignore").path))
    }

    /// ADR-309 AC-1: Create Story is a birth-with-identity moment — the config
    /// sidecar exists before the author types, and the header renders it.
    func testCreateWritesTheConfigSidecarAndRendersItInTheHeader() throws {
        let dir = tmp.appendingPathComponent("the-lost-key")
        try StoryScaffold.create(in: dir, info: info("The Lost Key"), templateDirectory: templateDir)

        let configURL = dir.appendingPathComponent("the-lost-key.config.json")
        XCTAssertTrue(FileManager.default.fileExists(atPath: configURL.path), "config sidecar missing")
        let object = try XCTUnwrap(
            JSONSerialization.jsonObject(with: try Data(contentsOf: configURL)) as? [String: Any]
        )
        XCTAssertEqual(object["version"] as? Int, 1)
        let ifid = try XCTUnwrap(object["ifid"] as? String)

        // The header line is the config's rendering — the identical value, not
        // a second mint (two mints would be two identities for one story).
        let story = try String(contentsOf: dir.appendingPathComponent("the-lost-key.story"), encoding: .utf8)
        XCTAssertEqual(StoryHeaderIFID.read(from: story), ifid)
    }

    /// The DEFAULT path — no `templateDirectory:` — which is the only one the
    /// shipping app ever takes, and the one that had no coverage until it
    /// failed in front of an author with "Story template is missing:
    /// story.story.template". Every other test here injects a directory, so all
    /// of them passed while New Story was broken in every build configuration:
    /// the template reached Contents/Resources only inside the OPT-IN vendored
    /// toolchain (ADR-279 D4), three directories below where the code looked.
    /// This test is the real path (rule 13a) — Bundle.main is the host app, so
    /// it resolves the folder resource vendor-story-templates.sh mirrors.
    func testScaffoldsFromTheAppBundleWithNoInjectedDirectory() throws {
        let dir = tmp.appendingPathComponent("bundle-default")
        try StoryScaffold.create(in: dir, info: info("Bundle Default"))

        let story = dir.appendingPathComponent("bundle-default.story")
        let rendered = try String(contentsOf: story, encoding: String.Encoding.utf8)
        XCTAssertFalse(rendered.contains("{{"), "the bundled template rendered, placeholders and all")
        XCTAssertTrue(rendered.contains("title: Bundle Default"))
        XCTAssertFalse(FileManager.default.fileExists(atPath: dir.appendingPathComponent("package.json").path),
                       "ADR-258 D2 — a `.story` needs no package.json")

        // create() makes four filesystem mutations; the `.story` render above is
        // one. Assert the other two writes on THIS path too — the injected-directory
        // tests cover them, but only on the synthetic path, and this is the one
        // that shipped broken.
        let fm = FileManager.default
        XCTAssertTrue(fm.fileExists(atPath: dir.appendingPathComponent("bundle-default.config.json").path),
                      "the config sidecar is written on the real bundle path too")
        XCTAssertTrue(fm.fileExists(atPath: dir.appendingPathComponent(".gitignore").path),
                      "the .gitignore is written on the real bundle path too")
    }

    /// The mirror itself, named so a failure says which script to run rather
    /// than only that a file is absent.
    func testTheAppBundleCarriesTheStoryTemplate() throws {
        let resources = try XCTUnwrap(Bundle.main.resourceURL)
        let template = resources
            .appendingPathComponent("story-templates")
            .appendingPathComponent("story.story.template")
        XCTAssertTrue(FileManager.default.fileExists(atPath: template.path),
                      "the app's vendored mirror carries the Chord story template — run tools/ide/vendor-story-templates.sh if this fails")
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

        // The rendered file carries a real minted IFID — compose cannot catch a
        // leaked literal `{{IFID}}` (any non-empty ifid passes the analyzer).
        let rendered = try String(contentsOf: story, encoding: .utf8)
        XCTAssertNotNil(rendered.range(of: #"ifid: [0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}"#,
                                       options: .regularExpression),
                        "the IFID is minted at scaffold time (ADR-298 D5), uppercase UUID")
        XCTAssertFalse(rendered.contains("{{"), "no unsubstituted placeholders")

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
        XCTAssertEqual(payload.ir?.meta.fields.id, "fresh-adventure")
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
