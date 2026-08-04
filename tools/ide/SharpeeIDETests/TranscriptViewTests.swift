// TranscriptViewTests.swift
// ADR-299 Phase 7 (D8 transcript surface): what a thread READS as — the block
// each node renders, the header that counts objections, and the view following
// a selected thread through a live session. Blessing's model half is
// SkeinBlessTests; the end-to-end objection is SkeinInvarianceRealPathTests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class TranscriptViewTests: XCTestCase {

    private var tmp: URL!
    private var storeURL: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-TranscriptViewTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        storeURL = SkeinStore.url(forStoryId: "probe", projectRoot: tmp)
    }

    override func tearDownWithError() throws {
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    /// root("") → "look"(a) and root → "take egg" → "look"(b): two threads
    /// reaching the same position with different histories.
    private func session() throws -> SkeinSession {
        let a = SkeinNode(id: "a", command: "look", output: "The cellar.")
        let b = SkeinNode(id: "b", command: "look", output: "The cellar. You hold an egg.")
        let take = SkeinNode(id: "take", command: "take egg", output: "Taken.", children: [b])
        try SkeinStore.write(SkeinDocument(seed: 42,
                                           root: SkeinNode(id: "root", command: "",
                                                           output: "Forge.",
                                                           children: [a, take])),
                             to: storeURL)
        return try SkeinSession(storeURL: storeURL)
    }

    private func text(_ attributed: NSAttributedString) -> String { attributed.string }

    // MARK: - Header

    func testTheHeaderCountsNodesAndSaysSoWhenThereAreNoFindings() {
        XCTAssertEqual(TranscriptView.headline(nodeCount: 0, findings: []), "")
        XCTAssertEqual(TranscriptView.headline(nodeCount: 1, findings: []), "1 node — no findings.")
        XCTAssertEqual(TranscriptView.headline(nodeCount: 3, findings: []), "3 nodes — no findings.")
    }

    func testTheHeaderCountsFindingsSoAnObjectionIsVisibleWithoutScrolling() {
        let finding = SkeinFinding(kind: .invarianceViolated(blessedNodeId: "a"),
                                   nodeId: "b", command: "look",
                                   blessed: "The cellar.", actual: "…egg.")
        XCTAssertEqual(TranscriptView.headline(nodeCount: 3, findings: [finding]),
                       "3 nodes — ⚠ 1 finding.")
        XCTAssertEqual(TranscriptView.headline(nodeCount: 3, findings: [finding, finding]),
                       "3 nodes — ⚠ 2 findings.")
    }

    // MARK: - Blocks

    func testABlockReadsAsTheCommandAndWhatItPrinted() {
        let node = SkeinNode(id: "a", command: "look", output: "ignored")
        let block = text(TranscriptView.block(node, actual: "The cellar.", findings: []))

        XCTAssertTrue(block.contains("> look"), block)
        XCTAssertTrue(block.contains("The cellar."), block)
        XCTAssertFalse(block.contains("ignored"),
                       "the block must show what the node prints NOW, not its stored capture")
    }

    func testTheStoryStartIsLabelledRatherThanRenderedAsAnEmptyCommand() {
        let root = SkeinNode(id: "root", command: "", output: "Forge.")
        let block = text(TranscriptView.block(root, actual: "Forge.", findings: []))

        XCTAssertTrue(block.hasPrefix("(story start)"), block)
        XCTAssertFalse(block.contains("> \n"), "an empty command must not read as a typed one")
    }

    func testAnAllPathsBlessingReadsDifferentlyFromAPlainOne() {
        // A plain blessing is said by the green band alone — no caption. Only
        // the stronger claim gets words.
        var node = SkeinNode(id: "a", command: "look", output: "The cellar.")
        node.blessing = SkeinBlessing(scope: .thisThread, output: "The cellar.")
        XCTAssertFalse(text(TranscriptView.block(node, actual: "The cellar.", findings: []))
            .contains("all paths"))

        node.blessing = SkeinBlessing(scope: .allPaths, output: "The cellar.")
        XCTAssertTrue(text(TranscriptView.block(node, actual: "The cellar.", findings: []))
            .contains("all paths"),
                      "the scope the author declared has to be readable, not inferred")
    }

    func testABlockWithNoOutputSaysSoRatherThanRenderingABlank() {
        let node = SkeinNode(id: "a", command: "look", output: "")
        XCTAssertTrue(text(TranscriptView.block(node, actual: "", findings: []))
            .contains("(no output)"))
    }

    func testAForcedNodeCarriesItsForcingInTheBlock() {
        let node = SkeinNode(id: "a", command: "throw bottle at anvil", output: "It hits!",
                             forcings: ["stdlib.throwing.breaks#1=no"])
        XCTAssertTrue(text(TranscriptView.block(node, actual: "It hits!", findings: []))
            .contains("stdlib.throwing.breaks#1=no"))
    }

    func testAFindingRendersAsAnObjectionCarryingTheTextThatWasBlessed() {
        let node = SkeinNode(id: "b", command: "look", output: "The cellar. You hold an egg.")
        let finding = SkeinFinding(kind: .invarianceViolated(blessedNodeId: "a"),
                                   nodeId: "b", command: "look",
                                   blessed: "The cellar.",
                                   actual: "The cellar. You hold an egg.")

        let block = text(TranscriptView.block(node,
                                              actual: "The cellar. You hold an egg.",
                                              findings: [finding]))

        XCTAssertTrue(block.contains("⚠"), block)
        XCTAssertTrue(block.contains("blessed for all paths, but prints something else"), block)
        XCTAssertTrue(block.contains("blessed instead:"), block)
        XCTAssertTrue(block.contains("The cellar."), block)
    }

    func testAChangedOutputFindingNamesTheAuthorsOwnBlessing() {
        let finding = SkeinFinding(kind: .changedOutput, nodeId: "a", command: "look",
                                   blessed: "The cellar.", actual: "The crypt.")
        XCTAssertEqual(finding.summary, "\"look\" no longer prints what you blessed.")
    }

    // MARK: - The view over a live session

    func testTheViewReadsTheThreadItIsPointedAtRootFirst() throws {
        let view = TranscriptView()
        // The view holds its session weakly (the Play pane owns it), so the
        // test has to keep it alive — otherwise every row count is a vacuous 0.
        let skein = try session()
        view.setSession(skein)

        view.show(threadTo: "b")

        XCTAssertEqual(view.threadNodeId, "b")
        XCTAssertEqual(view.numberOfRows(in: NSTableView()), 3,
                       "root → take egg → look is three blocks")
    }

    func testShowingNothingClearsThePage() throws {
        let view = TranscriptView()
        let skein = try session()
        view.setSession(skein)
        view.show(threadTo: "b")
        XCTAssertEqual(view.numberOfRows(in: NSTableView()), 3, "precondition: the page is full")

        view.show(threadTo: nil)

        XCTAssertNil(view.threadNodeId)
        XCTAssertEqual(view.numberOfRows(in: NSTableView()), 0)
        XCTAssertEqual(view.findings, [])
    }

    func testOpeningADifferentStoryDropsTheThreadOnThePage() throws {
        let view = TranscriptView()
        let skein = try session()
        view.setSession(skein)
        view.show(threadTo: "b")
        XCTAssertEqual(view.numberOfRows(in: NSTableView()), 3, "precondition: the page is full")

        view.setSession(nil)

        XCTAssertNil(view.threadNodeId,
                     "a thread from the previous story is not a thread in this one")
        XCTAssertEqual(view.numberOfRows(in: NSTableView()), 0)
    }

    func testTheViewSurfacesTheThreadsFindingsRatherThanDiffingSilently() throws {
        let view = TranscriptView()
        let skein = try session()
        XCTAssertTrue(try skein.bless(nodeId: "a", scope: .allPaths))
        view.setSession(skein)

        view.show(threadTo: "b")

        XCTAssertEqual(view.findings.map(\.nodeId), ["b"])
        XCTAssertEqual(view.findings.first?.kind, .invarianceViolated(blessedNodeId: "a"))
    }

    func testTheBlessingThreadItselfShowsNoObjection() throws {
        let view = TranscriptView()
        let skein = try session()
        XCTAssertTrue(try skein.bless(nodeId: "a", scope: .allPaths))
        view.setSession(skein)

        view.show(threadTo: "a")

        XCTAssertEqual(view.findings, [])
    }
}
