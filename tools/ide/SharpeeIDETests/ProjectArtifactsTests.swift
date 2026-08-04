// ProjectArtifactsTests.swift
// Covers the typed-artifact grouping (ADR-280 D1). Every case builds a REAL
// fixture directory tree on disk and asserts the grouping model's real output
// against it — no mocked FileManager, no in-memory file-list stub, since the
// classifier's whole job is reading what is actually there.

import XCTest
@testable import SharpeeIDE

final class ProjectArtifactsTests: XCTestCase {

    private var root: URL!

    override func setUpWithError() throws {
        super.setUp()
        root = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-ProjectArtifactsTests-\(UUID().uuidString)", isDirectory: true)
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

    // MARK: - Fixture helpers (real files, real directories)

    @discardableResult
    private func file(_ relativePath: String, _ contents: String = "x") throws -> URL {
        let url = root.appendingPathComponent(relativePath)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try contents.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private func directory(_ relativePath: String) throws {
        try FileManager.default.createDirectory(at: root.appendingPathComponent(relativePath),
                                                withIntermediateDirectories: true)
    }

    /// The full artifact set a seeded project will have once ADR-280 D3 lands.
    private func buildFullFixture() throws {
        try file("the-lost-key.story", "story \"The Lost Key\"")
        try file("walkthroughs/wt-01-opening.transcript")
        try file("walkthroughs/wt-02-cellar.transcript")
        try file("tests/transcripts/lantern.transcript")
        try file("assets/lantern.png")
        try file("the-lost-key.templates", "template standard\nend template")
        try file("browser/the-lost-key.css")
        try file("browser/index.html")
    }

    private func groups() -> [ArtifactGroup] {
        ProjectArtifacts.groups(for: Project(rootURL: root))
    }

    private func group(_ kind: ArtifactGroup.Kind) -> ArtifactGroup? {
        groups().first { $0.kind == kind }
    }

    private func memberNames(_ kind: ArtifactGroup.Kind) -> [String] {
        (group(kind)?.members ?? []).map(\.name).sorted()
    }

    // MARK: - Group membership

    func testEachArtifactTypeGetsItsOwnGroup() throws {
        try buildFullFixture()

        XCTAssertEqual(memberNames(.story), ["the-lost-key.story"])
        XCTAssertEqual(memberNames(.walkthroughs),
                       ["wt-01-opening.transcript", "wt-02-cellar.transcript"])
        XCTAssertEqual(memberNames(.transcriptTests), ["lantern.transcript"])
        XCTAssertEqual(memberNames(.assets), ["lantern.png"])
    }

    func testGroupsAppearInTheOrderTheADRNames() throws {
        try buildFullFixture()
        try file("notes.txt")

        XCTAssertEqual(groups().map(\.kind),
                       [.story, .walkthroughs, .transcriptTests, .assets, .webTemplate, .other])
    }

    func testWebTemplateGathersFilesFromTwoDifferentOnDiskLocations() throws {
        try buildFullFixture()

        // The lens, not a folder mirror: the .templates file sits beside the
        // story, the escapes sit inside browser/ — one group either way.
        XCTAssertEqual(memberNames(.webTemplate),
                       ["index.html", "the-lost-key.css", "the-lost-key.templates"])
    }

    func testTranscriptTestsReachesThroughTestsIntoTranscripts() throws {
        try buildFullFixture()

        // The group is tests/transcripts/, not tests/ — ADR-277 fixes both names,
        // and the Test panel discovers exactly this path.
        XCTAssertEqual(memberNames(.transcriptTests), ["lantern.transcript"])
        XCTAssertFalse(memberNames(.transcriptTests).contains("transcripts"),
                       "the intermediate directory must not appear as a member")
    }

    // MARK: - Open, not strict

    func testAnUnknownFileAppearsInOtherRatherThanBeingHidden() throws {
        try buildFullFixture()
        try file("notes.txt")
        try file("research/sources.md")

        XCTAssertEqual(memberNames(.other), ["notes.txt", "research"])
    }

    func testUnknownContentInsideAKnownFolderIsSurfacedNotSwallowed() throws {
        try buildFullFixture()
        try file("tests/scratch.md")
        try file("browser/notes.md")

        // Neither file matches its folder's artifact type — they must still be
        // reachable, never silently dropped.
        XCTAssertEqual(memberNames(.other), ["notes.md", "scratch.md"])
    }

    func testNothingOnDiskIsEverDropped() throws {
        try buildFullFixture()
        try file("notes.txt")
        try file("tests/scratch.md")

        let grouped = Set(groups().flatMap { $0.members }.map(\.name))
        let onDisk: Set<String> = ["the-lost-key.story", "wt-01-opening.transcript",
                                   "wt-02-cellar.transcript", "lantern.transcript",
                                   "lantern.png", "the-lost-key.templates",
                                   "the-lost-key.css", "index.html",
                                   "notes.txt", "scratch.md"]
        XCTAssertEqual(grouped, onDisk,
                       "every real file must land in exactly one group — missing: \(onDisk.subtracting(grouped))")
    }

    // MARK: - Play Testing (ADR-299 D7)

    func testSkeinFilesGroupIntoPlayTestingBesideTheTestGroups() throws {
        try buildFullFixture()
        try file("play-testing/the-lost-key.skein", "{}")

        XCTAssertEqual(memberNames(.playTesting), ["the-lost-key.skein"])
        // D7 places the group beside Walkthroughs and Transcript Tests.
        XCTAssertEqual(groups().map(\.kind),
                       [.story, .walkthroughs, .transcriptTests, .playTesting,
                        .assets, .webTemplate])
        XCTAssertEqual(group(.playTesting)?.directoryURL?.lastPathComponent, "play-testing")
    }

    func testNonSkeinContentInPlayTestingIsSurfacedNotSwallowed() throws {
        try file("the-lost-key.story", "story \"The Lost Key\"")
        try file("play-testing/the-lost-key.skein", "{}")
        try file("play-testing/notes.md")

        XCTAssertEqual(memberNames(.playTesting), ["the-lost-key.skein"])
        XCTAssertEqual(memberNames(.other), ["notes.md"])
    }

    func testAnEmptyPlayTestingFolderYieldsNoGroup() throws {
        try file("the-lost-key.story", "story \"The Lost Key\"")
        try directory("play-testing")

        XCTAssertEqual(groups().map(\.kind), [.story])
    }

    // MARK: - Absent artifact types

    func testAnArtifactTypeWithNothingOnDiskYieldsNoGroup() throws {
        try file("the-lost-key.story", "story \"The Lost Key\"")

        // A listed-but-empty group would imply a folder that isn't there.
        XCTAssertEqual(groups().map(\.kind), [.story])
    }

    func testAnEmptyArtifactFolderYieldsNoGroup() throws {
        try file("the-lost-key.story", "story \"The Lost Key\"")
        try directory("walkthroughs")

        XCTAssertEqual(groups().map(\.kind), [.story])
    }

    // MARK: - Story-name–derived artifacts

    func testTemplatesFileNotNamedForTheStoryIsUnclassifiedRatherThanWebTemplate() throws {
        try file("the-lost-key.story", "story \"The Lost Key\"")
        try file("scratch.templates")

        // One `<storyId>.templates` per story (ADR-286 Q-2). A differently-named
        // one is some other file — surfaced in Other, not silently treated as
        // the story's layout.
        XCTAssertNil(group(.webTemplate))
        XCTAssertEqual(memberNames(.other), ["scratch.templates"])
    }

    func testBrowserCssNotNamedForTheStoryIsUnclassified() throws {
        try file("the-lost-key.story", "story \"The Lost Key\"")
        try file("browser/theme-experiment.css")

        XCTAssertNil(group(.webTemplate))
        XCTAssertEqual(memberNames(.other), ["theme-experiment.css"])
    }

    // MARK: - Reveal targets

    func testDirectoryBackedGroupsCarryTheirFolderForReveal() throws {
        try buildFullFixture()

        XCTAssertEqual(group(.walkthroughs)?.directoryURL?.lastPathComponent, "walkthroughs")
        XCTAssertEqual(group(.transcriptTests)?.directoryURL?.lastPathComponent, "transcripts")
        XCTAssertEqual(group(.assets)?.directoryURL?.lastPathComponent, "assets")
        // Assembled from scattered files — no single folder to reveal.
        XCTAssertNil(group(.story)?.directoryURL)
        XCTAssertNil(group(.webTemplate)?.directoryURL)
    }
}
