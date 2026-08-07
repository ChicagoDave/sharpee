// StoryHomeTests.swift
// Covers StoryHome: the default root is ~/Documents itself — go-live item 6
// supersedes ADR-280 D2's app-owned ~/Documents/Chord folder — a title resolves
// to <root>/<Story Title>/, and an occupied target is REFUSED with the full path
// rather than overwritten (ADR-280 Acceptance 6, which stands). The real-path
// test drives the actual resolve → StoryScaffold.create pair against a real temp
// root — every assertion reads real files off real disk, and no test ever
// touches the developer's own ~/Documents (the root is injected).
//
// The AppDelegate half is covered through `scaffoldStoryAtDefaultHome`, the
// exact function New Story calls — so the resolve-then-mutate-or-refuse routing
// is tested, not just StoryHome in isolation.
//
// Deliberate, documented gap, narrowly: `presentScaffoldFailure` (the error
// alert) is not covered — a modal AppKit call that cannot run headlessly without
// stubbing the very call under test. The title prompt it used to sit beside is
// gone: File → New Story now presents the same Create Story sheet the landing
// page does, covered by CreateStorySheetTests. `loadProject` is likewise not driven from
// here: it pushes through RecentProjectsStore into `UserDefaults.standard`, so a
// test would inject temp folders into the developer's real Open Recent menu
// (the same rationale AppIdentityTests records for its own gap).

import XCTest
@testable import SharpeeIDE

@MainActor
final class StoryHomeTests: XCTestCase {

    private var tmp: URL!
    private var root: URL!
    private var templateDir: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-StoryHomeTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        root = tmp.appendingPathComponent("Documents", isDirectory: true)
        templateDir = tmp.appendingPathComponent("template", isDirectory: true)
        try FileManager.default.createDirectory(at: templateDir, withIntermediateDirectories: true)
        try """
        story "{{STORY_TITLE}}" by "{{AUTHOR}}"
          id: {{STORY_ID}}
          version: 0.1.0
          blurb: {{DESCRIPTION}}
        """.write(to: templateDir.appendingPathComponent("story.story.template"),
                  atomically: true, encoding: .utf8)
    }

    override func tearDownWithError() throws {
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    private func info(_ title: String) -> StoryScaffold.Info {
        StoryScaffold.Info(title: title, author: "Ada", description: "An adventure")
    }

    // MARK: - The default home

    func testDefaultRootIsDocumentsWithNoAppOwnedFolder() {
        let documents = FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask).first!
        // No `Chord/`. An author keeps stories wherever source control wants
        // them; the default is a starting point, not a home the app requires.
        XCTAssertEqual(StoryHome.defaultRoot.standardizedFileURL,
                       documents.standardizedFileURL)
    }

    func testProjectDirectoryIsTheTitleUnderTheRoot() {
        let target = StoryHome.projectDirectory(forTitle: "The Lost Key", in: root)
        XCTAssertEqual(target.standardizedFileURL,
                       root.appendingPathComponent("The Lost Key", isDirectory: true).standardizedFileURL)
    }

    func testProjectDirectoryUsesTheOneFolderNamingRuleNotASecondOne() {
        // One folder-naming rule across the app — pinned so a future edit can't
        // fork it. Expectations are spelled out rather than compared against
        // StoryLocationMirror.folderName: comparing to the function the
        // implementation already calls would pass even if the rule itself broke.
        let expected = [
            "The Lost Key": "The Lost Key",
            "  Spaces & Symbols!! ": "Spaces & Symbols!!",
            "Act 1: Arrival": "Act 1- Arrival",
            "***": "***",
            "   ": StoryLocationMirror.fallbackFolderName,
        ]
        for (title, folder) in expected {
            XCTAssertEqual(StoryHome.projectDirectory(forTitle: title, in: root).lastPathComponent, folder,
                           "folder derivation diverged for “\(title)”")
            XCTAssertEqual(StoryLocationMirror.folderName(for: title), folder,
                           "the mirror's own rule diverged for “\(title)”")
        }
    }

    func testTheStoryFileKeepsItsKebabIdInsideTheTitledFolder() {
        // The folder is the author's title; the `.story` file inside it stays a
        // kebab id, because that id is what the story source and the build use.
        XCTAssertEqual(StoryScaffold.storyId(from: "The Lost Key"), "the-lost-key")
    }

    // MARK: - REAL-PATH TEST (rule 13a): resolve → create, real files on real disk

    func testResolveThenScaffoldWritesTheStoryUnderTheDefaultHome() throws {
        let target = try StoryHome.resolveNewProjectDirectory(forTitle: "The Lost Key", in: root)
        try StoryScaffold.create(in: target, info: info("The Lost Key"), templateDirectory: templateDir)

        let story = root.appendingPathComponent("The Lost Key/the-lost-key.story")
        XCTAssertTrue(FileManager.default.fileExists(atPath: story.path),
                      "the story must land at <root>/<Story Title>/<story-id>.story")
        let contents = try String(contentsOf: story, encoding: .utf8)
        XCTAssertTrue(contents.contains("The Lost Key"), "the title must be substituted in: \(contents)")
        XCTAssertTrue(contents.contains("id: the-lost-key"), "the id must be substituted in: \(contents)")
    }

    func testTheRootIsCreatedOnDemandSoAFirstStoryNeedsNoSetup() throws {
        XCTAssertFalse(FileManager.default.fileExists(atPath: root.path),
                       "precondition: the project home must not exist yet")

        let target = try StoryHome.resolveNewProjectDirectory(forTitle: "First Light", in: root)
        try StoryScaffold.create(in: target, info: info("First Light"), templateDirectory: templateDir)

        var isDirectory: ObjCBool = false
        XCTAssertTrue(FileManager.default.fileExists(atPath: root.path, isDirectory: &isDirectory),
                      "the project home must be created by the first story")
        XCTAssertTrue(isDirectory.boolValue, "the project home must be a directory")
    }

    // MARK: - REJECTS WHEN: the target is occupied

    func testAnOccupiedTargetIsRefusedWithTheFullPathAndLeftUntouched() throws {
        let target = root.appendingPathComponent("The Lost Key", isDirectory: true)
        try FileManager.default.createDirectory(at: target, withIntermediateDirectories: true)
        let existing = target.appendingPathComponent("the-lost-key.story")
        try "story \"Someone Else's Work\"".write(to: existing, atomically: true, encoding: .utf8)
        let before = try Data(contentsOf: existing)

        XCTAssertThrowsError(try StoryHome.resolveNewProjectDirectory(forTitle: "The Lost Key", in: root)) { error in
            guard case StoryHome.HomeError.projectAlreadyExists(let url) = error else {
                return XCTFail("expected projectAlreadyExists, got \(error)")
            }
            XCTAssertEqual(url.standardizedFileURL, target.standardizedFileURL)
            // The writer never chose this location — the message must name the
            // full path, not just the folder name (ADR-280 Acceptance 6).
            let message = error.localizedDescription
            XCTAssertTrue(message.contains(target.path),
                          "the refusal must show the full path, got: \(message)")
        }

        let after = try Data(contentsOf: existing)
        XCTAssertEqual(before, after, "the refused path must leave the existing story byte-for-byte unchanged")
        XCTAssertEqual(try FileManager.default.contentsOfDirectory(atPath: target.path), ["the-lost-key.story"],
                       "the refused path must add nothing to the existing folder")
    }

    // MARK: - The AppDelegate routing New Story actually takes

    /// The real in-repo devkit template, so this drives the production template
    /// path rather than a hand-written stand-in.
    private var realTemplates: URL {
        TestToolchain.repoRoot.appendingPathComponent("packages/devkit/templates/story-chord")
    }

    func testNewStoryRoutingScaffoldsIntoTheDefaultHome() throws {
        let created = try AppDelegate().scaffoldStoryAtDefaultHome(
            title: "The Lost Key", in: root, templateDirectory: realTemplates)

        XCTAssertEqual(created.standardizedFileURL,
                       root.appendingPathComponent("The Lost Key", isDirectory: true).standardizedFileURL)
        let story = created.appendingPathComponent("the-lost-key.story")
        XCTAssertTrue(FileManager.default.fileExists(atPath: story.path),
                      "New Story must write the story under the default home")
        XCTAssertTrue(try String(contentsOf: story, encoding: .utf8).contains("The Lost Key"))
    }

    func testNewStoryRoutingRefusesAnOccupiedHomeAndCreatesNothing() throws {
        let target = root.appendingPathComponent("The Lost Key", isDirectory: true)
        try FileManager.default.createDirectory(at: target, withIntermediateDirectories: true)
        let existing = target.appendingPathComponent("the-lost-key.story")
        try "story \"Someone Else's Work\"".write(to: existing, atomically: true, encoding: .utf8)
        let before = try Data(contentsOf: existing)

        XCTAssertThrowsError(try AppDelegate().scaffoldStoryAtDefaultHome(
            title: "The Lost Key", in: root, templateDirectory: realTemplates)) { error in
            guard case StoryHome.HomeError.projectAlreadyExists = error else {
                return XCTFail("expected projectAlreadyExists, got \(error)")
            }
        }

        XCTAssertEqual(try Data(contentsOf: existing), before,
                       "the refusal must not touch the existing story")
        XCTAssertEqual(try FileManager.default.contentsOfDirectory(atPath: target.path),
                       ["the-lost-key.story"],
                       "the refusal must create nothing — no .gitignore, no second story file")
    }

    func testAHiddenOnlyDirectoryIsNotACollision() throws {
        let target = root.appendingPathComponent("The Lost Key", isDirectory: true)
        try FileManager.default.createDirectory(at: target, withIntermediateDirectories: true)
        try "".write(to: target.appendingPathComponent(".DS_Store"), atomically: true, encoding: .utf8)

        // Same rule StoryScaffold.create already applies — a stray Finder file
        // must not block a writer from creating their story.
        let resolved = try StoryHome.resolveNewProjectDirectory(forTitle: "The Lost Key", in: root)
        XCTAssertEqual(resolved.standardizedFileURL, target.standardizedFileURL)
    }
}
