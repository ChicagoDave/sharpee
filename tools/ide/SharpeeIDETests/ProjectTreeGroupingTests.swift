// ProjectTreeGroupingTests.swift
// The sidebar actually RENDERS the typed artifact groups (ADR-280 D1 exit
// state), and "Reveal in Finder" (Q-3) resolves the right URL per row kind.
// Reads the real row labels off a laid-out outline view backed by a real fixture
// directory — no inference from the grouping model alone, which
// ProjectArtifactsTests already covers separately.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class ProjectTreeGroupingTests: XCTestCase {

    private var root: URL!

    override func setUpWithError() throws {
        super.setUp()
        let fixture = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-ProjectTreeGroupingTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try Self.write("the-lost-key.story", "story \"The Lost Key\"", under: fixture)
        try Self.write("walkthroughs/wt-01-opening.transcript", "x", under: fixture)
        try Self.write("tests/transcripts/lantern.transcript", "x", under: fixture)
        try Self.write("assets/lantern.png", "x", under: fixture)
        try Self.write("the-lost-key.templates", "template standard\nend template", under: fixture)
        try Self.write("notes.txt", "x", under: fixture)
        root = fixture
    }

    override func tearDownWithError() throws {
        if let root, FileManager.default.fileExists(atPath: root.path) {
            try FileManager.default.removeItem(at: root)
        }
        root = nil
        super.tearDown()
    }

    /// nonisolated: setUpWithError runs off the main actor while this class is
    /// @MainActor (the same shape ProjectTreeFontTests uses).
    private nonisolated static func write(_ relativePath: String, _ contents: String,
                                          under root: URL) throws {
        let url = root.appendingPathComponent(relativePath)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try contents.write(to: url, atomically: true, encoding: .utf8)
    }

    private func laidOutController() -> ProjectTreeViewController {
        let controller = ProjectTreeViewController()
        controller.view.frame = NSRect(x: 0, y: 0, width: 260, height: 500)
        controller.setProject(Project(rootURL: root))
        controller.view.layoutSubtreeIfNeeded()
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))
        return controller
    }

    private func findOutline(in view: NSView) -> NSOutlineView? {
        if let outline = view as? NSOutlineView { return outline }
        for sub in view.subviews {
            if let found = findOutline(in: sub) { return found }
        }
        return nil
    }

    private func rowLabels(in controller: ProjectTreeViewController) throws -> [String] {
        let outline = try XCTUnwrap(findOutline(in: controller.view))
        return (0..<outline.numberOfRows).compactMap { row in
            (outline.view(atColumn: 0, row: row, makeIfNecessary: true) as? NSTableCellView)?
                .textField?.stringValue
        }
    }

    func testTheSidebarOpensWithEveryGroupCollapsedExceptStory() throws {
        let controller = laidOutController()
        let labels = try rowLabels(in: controller)

        // David's ruling: only Story opens by default. Transcripts never
        // appear at all (2026-08-09) — they are Chord Writer's artifacts,
        // shown only serialized in the Testing tab.
        XCTAssertEqual(labels, [
            "Story", "the-lost-key.story",
            "Walkthroughs",
            "Assets",
            "Web Template",
            "Other",
        ], "only Story opens; the rest are present but collapsed")
    }

    func testACollapsedGroupStillHoldsItsMembers() throws {
        let controller = laidOutController()
        let outline = try XCTUnwrap(findOutline(in: controller.view))
        let row = try XCTUnwrap(try rowLabels(in: controller).firstIndex(of: "Walkthroughs"))
        let group = try XCTUnwrap(outline.item(atRow: row))

        // Collapsed is a starting state, not a filter — expanding must reveal
        // the real members, so nothing is hidden by the default.
        outline.expandItem(group)
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))
        XCTAssertTrue(try rowLabels(in: controller).contains("wt-01-opening.transcript"),
                      "expanding a collapsed group must reveal its members")
    }

    func testTheRawFolderNamesAreNotShownAsRows() throws {
        let controller = laidOutController()
        let labels = try rowLabels(in: controller)

        // Groups are lenses, not folder mirrors: the folders whose contents were
        // lifted into a group must not also appear as their own rows.
        for folder in ["walkthroughs", "tests", "transcripts", "assets"] {
            XCTAssertFalse(labels.contains(folder),
                           "\(folder) was mirrored as a row instead of being lensed into a group")
        }
    }

    func testRevealTargetIsTheFileForAFileRow() throws {
        let controller = laidOutController()
        let outline = try XCTUnwrap(findOutline(in: controller.view))
        let row = try XCTUnwrap(try rowLabels(in: controller).firstIndex(of: "the-lost-key.story"))

        XCTAssertEqual(controller.revealTarget(forRow: row)?.standardizedFileURL,
                       root.appendingPathComponent("the-lost-key.story").standardizedFileURL)
        XCTAssertEqual(outline.numberOfRows, 6, "fixture sanity: 5 groups + Story's one open member")
    }

    func testRevealTargetIsTheBackingFolderForADirectoryBackedGroup() throws {
        let controller = laidOutController()
        let row = try XCTUnwrap(try rowLabels(in: controller).firstIndex(of: "Walkthroughs"))

        XCTAssertEqual(controller.revealTarget(forRow: row)?.standardizedFileURL,
                       root.appendingPathComponent("walkthroughs").standardizedFileURL)
    }

    func testRevealTargetFallsBackToTheProjectRootForAScatteredGroup() throws {
        let controller = laidOutController()
        let row = try XCTUnwrap(try rowLabels(in: controller).firstIndex(of: "Web Template"))

        // Web Template is assembled from two on-disk locations — there is no one
        // folder to select, so the project root is the honest answer.
        XCTAssertEqual(controller.revealTarget(forRow: row)?.standardizedFileURL,
                       root.standardizedFileURL)
    }

    func testRevealTargetFallsBackToTheProjectRootForAClickInEmptySpace() throws {
        let controller = laidOutController()

        XCTAssertEqual(controller.revealTarget(forRow: -1)?.standardizedFileURL,
                       root.standardizedFileURL)
    }

    func testRevealTargetIsNilWithNoProjectOpen() {
        let controller = ProjectTreeViewController()
        controller.view.frame = NSRect(x: 0, y: 0, width: 260, height: 500)
        controller.setProject(nil)

        XCTAssertNil(controller.revealTarget(forRow: 0))
    }
}
