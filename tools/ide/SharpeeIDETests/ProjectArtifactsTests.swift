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
        try file("feelies/the-letter.pdf")
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
        XCTAssertEqual(memberNames(.assets), ["lantern.png"])
        XCTAssertEqual(memberNames(.feelies), ["the-letter.pdf"])
    }

    func testGroupsAppearInTheOrderTheADRNames() throws {
        try buildFullFixture()
        try file("notes.txt")

        XCTAssertEqual(groups().map(\.kind),
                       [.story, .walkthroughs, .assets, .feelies, .webTemplate, .other])
    }

    func testWebTemplateGathersFilesFromTwoDifferentOnDiskLocations() throws {
        try buildFullFixture()

        // The lens, not a folder mirror: the .templates file sits beside the
        // story, the escapes sit inside browser/ — one group either way.
        XCTAssertEqual(memberNames(.webTemplate),
                       ["index.html", "the-lost-key.css", "the-lost-key.templates"])
    }

    func testTranscriptsAreChordWritersArtifactsAndNeverAppearInThePane() throws {
        try buildFullFixture()

        // David's ruling (2026-08-09): transcripts are auto-named, auto-saved
        // IDE artifacts — the pane never lists them; the Testing tab is their
        // only IDE presentation. A stray NON-transcript file an author parked
        // under tests/ still shows (open, not strict).
        try file("tests/notes-on-testing.txt")
        let everyMember = groups().flatMap { $0.members.map(\.name) }
        XCTAssertFalse(everyMember.contains("lantern.transcript"),
                       "a transcript under tests/transcripts/ must not appear in any group")
        XCTAssertTrue(memberNames(.other).contains("notes-on-testing.txt"))
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
        // Transcripts under tests/ are the ONE deliberate exception (David's
        // ruling 2026-08-09): Chord Writer's artifacts, shown only serialized
        // in the Testing tab — everything else must land in exactly one group.
        let onDisk: Set<String> = ["the-lost-key.story", "wt-01-opening.transcript",
                                   "wt-02-cellar.transcript",
                                   "lantern.png", "the-letter.pdf", "the-lost-key.templates",
                                   "the-lost-key.css", "index.html",
                                   "notes.txt", "scratch.md"]
        XCTAssertEqual(grouped, onDisk,
                       "every real file must land in exactly one group — missing: \(onDisk.subtracting(grouped))")
    }

    // MARK: - The retired Play Testing group (ADR-300)

    /// ADR-299 D7's "Play Testing" group was removed with the `.skein` artifact
    /// it existed to hold. What matters is that its removal did not create a
    /// hiding place: a `play-testing/` folder an author still has on disk must
    /// SURFACE, in Other, rather than vanish from the sidebar. The open-view
    /// rule ("anything matching no type lands in Other, never hidden and never
    /// dropped") is what makes deleting the group safe, so it is pinned here.
    func testARetiredPlayTestingFolderSurfacesInOtherRatherThanVanishing() throws {
        try file("the-lost-key.story", "story \"The Lost Key\"")
        try file("play-testing/the-lost-key.skein", "{}")
        try file("play-testing/notes.md")

        XCTAssertFalse(groups().map(\.kind).contains(where: { "\($0)" == "playTesting" }),
                       "the Play Testing group is retired")
        XCTAssertEqual(memberNames(.other), ["play-testing"],
                       "the folder itself surfaces in Other — nothing is hidden")
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

    func testFeeliesAreTheirOwnGroupNotAssets() throws {
        // The two are different in kind: an asset is media the STORY consumes,
        // a feelie is something the PLAYER opens. Folding feelies into Assets
        // would ship them to the same flat place and lose that distinction.
        try buildFullFixture()

        XCTAssertFalse(memberNames(.assets).contains("the-letter.pdf"))
        XCTAssertEqual(memberNames(.feelies), ["the-letter.pdf"])
        XCTAssertFalse(memberNames(.other).contains("feelies"))
    }

    // MARK: - Reveal targets

    func testDirectoryBackedGroupsCarryTheirFolderForReveal() throws {
        try buildFullFixture()

        XCTAssertEqual(group(.walkthroughs)?.directoryURL?.lastPathComponent, "walkthroughs")
        XCTAssertEqual(group(.assets)?.directoryURL?.lastPathComponent, "assets")
        XCTAssertEqual(group(.feelies)?.directoryURL?.lastPathComponent, "feelies")
        // Assembled from scattered files — no single folder to reveal.
        XCTAssertNil(group(.story)?.directoryURL)
        XCTAssertNil(group(.webTemplate)?.directoryURL)
    }
}
