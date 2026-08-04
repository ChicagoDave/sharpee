// SkeinRefinementTests.swift
// ADR-299 Phase 8 (D9, AC-6): the refinements that keep a skein from becoming
// a junk drawer without letting it lose work — explicit trim, the lock that
// refuses one, freeform node annotations, and the changed-output badge the
// tree reads from Phase 7's findings. Nothing here trims automatically; every
// test that removes something does so through the author's own gesture.

import XCTest
@testable import SharpeeIDE

@MainActor
final class SkeinRefinementTests: XCTestCase {

    private var tmp: URL!
    private var storeURL: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SkeinRefinementTests-\(UUID().uuidString)",
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

    /// root → "take lamp"(take) → { "go north"(north) → "open door"(door),
    ///                             "go south"(south) }
    private func document() -> SkeinDocument {
        let door = SkeinNode(id: "door", command: "open door", output: "It creaks.")
        let north = SkeinNode(id: "north", command: "go north", output: "Cellar.",
                              children: [door])
        let south = SkeinNode(id: "south", command: "go south", output: "Garden.")
        let take = SkeinNode(id: "take", command: "take lamp", output: "Taken.",
                             children: [north, south])
        return SkeinDocument(seed: 42,
                             root: SkeinNode(id: "root", command: "", output: "Hall.",
                                             children: [take]))
    }

    private func session() throws -> SkeinSession {
        try SkeinStore.write(document(), to: storeURL)
        return try SkeinSession(storeURL: storeURL)
    }

    private func saved() throws -> SkeinDocument {
        try SkeinStore.read(from: storeURL)
    }

    // MARK: - Trim (the model)

    func testTrimmingRemovesTheWholeSubtreeAndNamesEveryNodeItTook() {
        var document = self.document()

        let outcome = document.trim(nodeId: "north")

        XCTAssertEqual(outcome, .trimmed(removedIds: ["north", "door"]),
                       "a caller holding positions must be told everything that vanished")
        XCTAssertNil(document.node(withId: "north"))
        XCTAssertNil(document.node(withId: "door"))
    }

    func testTrimmingOneBranchLeavesItsSiblingAlone() {
        var document = self.document()

        document.trim(nodeId: "north")

        XCTAssertEqual(document.node(withId: "take")?.children.map(\.id), ["south"])
    }

    func testTheStoryStartIsNotABranchAndCannotBeTrimmed() {
        var document = self.document()

        XCTAssertEqual(document.trim(nodeId: "root"), .cannotTrimRoot)
        XCTAssertEqual(document.allNodes.count, 5, "the tree must be untouched")
    }

    func testTrimmingAnUnknownNodeChangesNothing() {
        var document = self.document()

        XCTAssertEqual(document.trim(nodeId: "no-such-node"), .unknownNode)
        XCTAssertEqual(document.allNodes.count, 5)
    }

    // MARK: - Lock (D9's guard)

    func testALockedNodeRefusesItsOwnTrim() {
        var document = self.document()
        document.updateNode(withId: "north") { $0.isLocked = true }

        XCTAssertEqual(document.trim(nodeId: "north"), .locked(nodeId: "north"))
        XCTAssertNotNil(document.node(withId: "north"))
    }

    func testALockDEEPInASubtreeRefusesTrimmingTheBranchAboveIt() {
        var document = self.document()
        document.updateNode(withId: "door") { $0.isLocked = true }

        XCTAssertEqual(document.trim(nodeId: "north"), .locked(nodeId: "door"),
                       "a guard that an ancestor's trim can destroy is worthless")
        XCTAssertNotNil(document.node(withId: "door"))
    }

    func testTheRefusalIsKnowableBeforeTheAuthorIsAskedToConfirm() {
        var document = self.document()
        document.updateNode(withId: "door") { $0.isLocked = true }

        XCTAssertEqual(document.trimRefusal(for: "north"), .locked(nodeId: "door"))
        XCTAssertNil(document.trimRefusal(for: "south"),
                     "an unguarded branch reports no reason to refuse")
        XCTAssertEqual(document.allNodes.count, 5, "asking must not be a mutation")
    }

    func testUnlockingReleasesTheBranch() throws {
        let skein = try session()
        XCTAssertTrue(try skein.setLocked(true, forNodeId: "north"))
        XCTAssertEqual(try skein.trim(nodeId: "north"), .locked(nodeId: "north"))

        XCTAssertTrue(try skein.setLocked(false, forNodeId: "north"))

        XCTAssertEqual(try skein.trim(nodeId: "north"), .trimmed(removedIds: ["north", "door"]))
    }

    // MARK: - Trim (the file, AC-6)

    func testTrimmingRemovesTheBranchFromTheSkeinFile() throws {
        let skein = try session()

        XCTAssertEqual(try skein.trim(nodeId: "north"),
                       .trimmed(removedIds: ["north", "door"]))

        XCTAssertNil(try saved().node(withId: "north"))
        XCTAssertNil(try saved().node(withId: "door"))
        XCTAssertNotNil(try saved().node(withId: "south"), "the sibling survives on disk too")
    }

    func testARefusedTrimWritesNothing() throws {
        let skein = try session()
        XCTAssertTrue(try skein.setLocked(true, forNodeId: "door"))
        try FileManager.default.removeItem(at: storeURL)

        XCTAssertEqual(try skein.trim(nodeId: "north"), .locked(nodeId: "door"))

        XCTAssertFalse(FileManager.default.fileExists(atPath: storeURL.path),
                       "a refusal must not cost the author a file rewrite")
    }

    func testTrimmingWherePlaySitsReturnsPlayToTheStoryStart() throws {
        let skein = try session()
        // Walk onto "door" the way play does — from its parent — so the turn
        // is an observation of the existing node, not a new branch.
        XCTAssertTrue(skein.moveTo(nodeId: "north"))
        try skein.recordTurn(command: "open door", output: "It creaks, loudly.")
        XCTAssertEqual(skein.currentNodeId, "door", "precondition: play sits inside the branch")

        XCTAssertEqual(try skein.trim(nodeId: "north"),
                       .trimmed(removedIds: ["north", "door"]))

        XCTAssertEqual(skein.currentNodeId, "root",
                       "a position pointing into deleted tree would grow the next turn nowhere")
        XCTAssertNil(skein.observedOutputs["door"],
                     "observations of nodes that no longer exist must go with them")
    }

    func testTrimmingElsewhereLeavesPlayWhereItIs() throws {
        let skein = try session()
        XCTAssertTrue(skein.moveTo(nodeId: "south"))

        XCTAssertEqual(try skein.trim(nodeId: "north"),
                       .trimmed(removedIds: ["north", "door"]))

        XCTAssertEqual(skein.currentNodeId, "south")
    }

    // MARK: - Annotations (D9) and tags (D2) round-trip — AC-6

    func testAnnotationsAndTagsRoundTripThroughSaveAndLoad() throws {
        let skein = try session()
        XCTAssertTrue(try skein.setAnnotation("  the fragile case  ", forNodeId: "north"))
        XCTAssertTrue(try skein.setTags(["golden path"], forNodeId: "north"))
        XCTAssertTrue(try skein.setLocked(true, forNodeId: "door"))

        // A fresh session over the same file is what a relaunched IDE sees.
        let reopened = try SkeinSession(storeURL: storeURL)

        XCTAssertEqual(reopened.document.node(withId: "north")?.annotation, "the fragile case",
                       "surrounding whitespace is not part of the note")
        XCTAssertEqual(reopened.document.node(withId: "north")?.tags, ["golden path"])
        XCTAssertEqual(reopened.document.node(withId: "door")?.isLocked, true)
    }

    func testEmptyingTheNoteClearsItRatherThanStoringABlank() throws {
        let skein = try session()
        XCTAssertTrue(try skein.setAnnotation("temporary", forNodeId: "north"))

        XCTAssertTrue(try skein.setAnnotation("   ", forNodeId: "north"))

        XCTAssertNil(try saved().node(withId: "north")?.annotation)
    }

    func testAnnotatingAnUnknownNodeWritesNothing() throws {
        let skein = try session()
        try FileManager.default.removeItem(at: storeURL)

        XCTAssertFalse(try skein.setAnnotation("note", forNodeId: "no-such-node"))
        XCTAssertFalse(try skein.setLocked(true, forNodeId: "no-such-node"))

        XCTAssertFalse(FileManager.default.fileExists(atPath: storeURL.path))
    }

    // MARK: - The view (AC-6's "and from the view")

    func testATrimmedBranchLeavesTheTree() throws {
        let view = SkeinView(frame: NSRect(x: 0, y: 0, width: 320, height: 400))
        let skein = try session()
        view.setSession(skein)
        XCTAssertEqual(SkeinBranchLayout.branches(in: skein.document).count, 2,
                       "precondition: both branches are on the panel")

        XCTAssertEqual(try skein.trim(nodeId: "north"),
                       .trimmed(removedIds: ["north", "door"]))
        view.reload()

        XCTAssertEqual(SkeinBranchLayout.branches(in: skein.document).count, 1,
                       "the trimmed branch must leave the panel, not just the file")
    }

    // MARK: - Changed-output badges (D9, fed by D4's findings)

    func testARowBadgesANodeThatNoLongerPrintsWhatWasBlessed() {
        let node = SkeinNode(command: "look", output: "A den.",
                             blessing: SkeinBlessing(scope: .thisThread, output: "A den."))
        let finding = SkeinFinding(kind: .changedOutput, nodeId: node.id, command: "look",
                                   blessed: "A den.", actual: "A den, and a rat.")

        XCTAssertEqual(SkeinBranchCanvas.state(for: node, findings: [finding]), .changed)
    }

    func testARowBadgesAViolatedAllPathsClaimDistinctlyFromAChangedOutput() {
        let node = SkeinNode(command: "look", output: "A den, and a rat.")
        let finding = SkeinFinding(kind: .invarianceViolated(blessedNodeId: "elsewhere"),
                                   nodeId: node.id, command: "look",
                                   blessed: "A den.", actual: "A den, and a rat.")

        XCTAssertEqual(SkeinBranchCanvas.state(for: node, findings: [finding]), .claimBroken)
        XCTAssertNotEqual(SkeinBranchCanvas.state(for: node, findings: [finding]), .changed,
                          "a broken cross-thread claim is not the same objection as a changed output")
    }

    func testARowWithNoFindingCarriesNoWarning() {
        let node = SkeinNode(command: "look", output: "A den.",
                             blessing: SkeinBlessing(scope: .allPaths, output: "A den."))
        XCTAssertEqual(SkeinBranchCanvas.state(for: node, findings: []), .blessed)
    }

    func testTheTreeReadsFindingsFromTheWholeSkeinNotOneThread() throws {
        let view = SkeinView(frame: NSRect(x: 0, y: 0, width: 320, height: 400))
        let skein = try session()
        // "go south" is blessed for all paths; nothing else in the skein shares
        // that command, so the claim holds until an observation contradicts it.
        XCTAssertTrue(try skein.bless(nodeId: "south", scope: .allPaths))
        XCTAssertEqual(skein.findings().count, 0)

        XCTAssertTrue(skein.moveTo(nodeId: "take"))
        try skein.recordTurn(command: "go south", output: "Garden, in the rain.")
        view.setSession(skein)

        XCTAssertEqual(skein.findings().map(\.nodeId), ["south"],
                       "the badge data must come from a whole-skein sweep")
    }

    // MARK: - The origin slot D10 reserves

    func testAnAuthorGrownNodeCarriesNoOriginBadge() {
        XCTAssertEqual(SkeinNode(command: "wait", output: "Time passes.").origin, .author,
                       "every node today is author-grown; marking all of them says nothing")
    }

    func testTheOriginSlotExistsForAnAdoptedThreadWithoutARowChange() {
        var node = SkeinNode(command: "wait", output: "Time passes.")
        node.origin = .explorer
        XCTAssertEqual(node.origin, .explorer,
                       "the slot is reserved so D10's adoption needs no badge change — "
                       + "nothing sets .explorer until @sharpee/skein ships; "
                       + "the canvas draws it dashed")
    }
}
