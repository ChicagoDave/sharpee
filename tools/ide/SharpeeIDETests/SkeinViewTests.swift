// SkeinViewTests.swift
// ADR-299 Phase 6 (D8 tree surface): the model mutations the Skein view's
// affordances drive — tag (D2) and forced-sibling growth (D5) round-tripping
// through SkeinStore to disk — plus the tree the view builds from a document
// and the badges a row renders. The click-to-replay half is a real-path test
// (SkeinReplayRealPathTests); this file is the fast, UI-free layer.

import XCTest
@testable import SharpeeIDE

@MainActor
final class SkeinViewTests: XCTestCase {

    private var tmp: URL!
    private var storeURL: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SkeinViewTests-\(UUID().uuidString)",
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

    /// root → "take lamp" → { "go north", "go south" } — a two-thread skein.
    private func twoThreadDocument() -> SkeinDocument {
        let north = SkeinNode(id: "n-north", command: "go north", output: "Cellar")
        let south = SkeinNode(id: "n-south", command: "go south", output: "Garden")
        let take = SkeinNode(id: "n-take", command: "take lamp", output: "Taken.",
                             children: [north, south])
        return SkeinDocument(seed: 42,
                             root: SkeinNode(id: "n-root", command: "", output: "",
                                             children: [take]))
    }

    private func session(_ document: SkeinDocument) throws -> SkeinSession {
        try SkeinStore.write(document, to: storeURL)
        return try SkeinSession(storeURL: storeURL)
    }

    // MARK: - updateNode (the one mutation door)

    func testUpdateNodeTransformsTheNamedNodeOnly() {
        var document = twoThreadDocument()
        XCTAssertTrue(document.updateNode(withId: "n-south") { $0.annotation = "the wrong way" })

        XCTAssertEqual(document.node(withId: "n-south")?.annotation, "the wrong way")
        XCTAssertNil(document.node(withId: "n-north")?.annotation,
                     "a sibling must not be touched")
        XCTAssertNil(document.node(withId: "n-take")?.annotation)
    }

    func testUpdateNodeWithAStaleIdChangesNothing() {
        var document = twoThreadDocument()
        let before = document
        XCTAssertFalse(document.updateNode(withId: "gone") { $0.annotation = "x" })
        XCTAssertEqual(document, before, "a stale id must not edit the wrong node")
    }

    // MARK: - Tagging (D2) round-trips to disk

    func testTaggingANodePersistsToTheSkeinFile() throws {
        let session = try session(twoThreadDocument())

        XCTAssertTrue(try session.setTags(["golden path", "lamp route"], forNodeId: "n-north"))

        // Read back with the real store — the file, not the in-memory document.
        let saved = try SkeinStore.read(from: storeURL)
        XCTAssertEqual(saved.node(withId: "n-north")?.tags, ["golden path", "lamp route"])
        XCTAssertEqual(saved.node(withId: "n-south")?.tags, [],
                       "tagging one thread must not tag its sibling")
    }

    func testTaggingCanBeClearedAndRetagged() throws {
        let session = try session(twoThreadDocument())
        _ = try session.setTags(["first"], forNodeId: "n-north")
        _ = try session.setTags([], forNodeId: "n-north")

        XCTAssertEqual(try SkeinStore.read(from: storeURL).node(withId: "n-north")?.tags, [],
                       "a tag the author removed must not survive on disk")
    }

    func testTaggingAnUnknownNodeWritesNothing() throws {
        let session = try session(twoThreadDocument())
        let before = try Data(contentsOf: storeURL)

        XCTAssertFalse(try session.setTags(["ghost"], forNodeId: "no-such-node"))
        XCTAssertEqual(try Data(contentsOf: storeURL), before,
                       "a refused tag must not rewrite the file")
    }

    // MARK: - Forced sibling (D5) round-trips to disk

    func testGrowingAForcedSiblingPersistsToTheSkeinFile() throws {
        let session = try session(twoThreadDocument())

        let grown = try XCTUnwrap(try session.growForcedSibling(
            of: "n-north", forcings: ["stdlib.throwing.breaks#1=no"]))

        let saved = try SkeinStore.read(from: storeURL)
        let siblings = try XCTUnwrap(saved.node(withId: "n-take")).children
        XCTAssertEqual(siblings.map(\.command), ["go north", "go south", "go north"],
                       "the forced branch is a new sibling running the same command")
        XCTAssertEqual(saved.node(withId: grown.id)?.forcings, ["stdlib.throwing.breaks#1=no"])
        XCTAssertEqual(saved.node(withId: grown.id)?.output, "",
                       "output stays empty until the branch is replayed")
    }

    func testARefusedForcedSiblingWritesNothing() throws {
        let session = try session(twoThreadDocument())
        let before = try Data(contentsOf: storeURL)

        XCTAssertNil(try session.growForcedSibling(of: "n-root", forcings: ["p=yes"]),
                     "the story start has no sibling position")
        XCTAssertNil(try session.growForcedSibling(of: "n-north", forcings: []),
                     "an unforced sibling would duplicate, not branch")
        XCTAssertEqual(try Data(contentsOf: storeURL), before,
                       "a refused branch must not rewrite the file")
    }

    // MARK: - Replay position bookkeeping

    func testMoveToSetsPlaysPositionAndRefusesAnUnknownNode() throws {
        let session = try session(twoThreadDocument())
        XCTAssertEqual(session.currentNodeId, "n-root")

        XCTAssertTrue(session.moveTo(nodeId: "n-south"))
        XCTAssertEqual(session.currentNodeId, "n-south")

        XCTAssertFalse(session.moveTo(nodeId: "gone"))
        XCTAssertEqual(session.currentNodeId, "n-south",
                       "a stale id must not move play somewhere it never went")
    }

    // MARK: - The tree the view builds

    func testTheTreeRendersThreadsWithTheStoryStartAsTheTrunkNotARow() throws {
        let view = SkeinView(frame: NSRect(x: 0, y: 0, width: 320, height: 400))
        view.setSession(try session(twoThreadDocument()))

        // The root (empty command) is the story-start position, not a row —
        // its children are what an author recognizes as a thread's start.
        XCTAssertEqual(view.outlineView(NSOutlineView(), numberOfChildrenOfItem: nil), 1)
        let take = view.outlineView(NSOutlineView(), child: 0, ofItem: nil)
        XCTAssertTrue(view.outlineView(NSOutlineView(), isItemExpandable: take))

        // Both threads hang off the shared prefix — a branch, not two trunks.
        XCTAssertEqual(view.outlineView(NSOutlineView(), numberOfChildrenOfItem: take), 2)
    }

    func testAnEmptySkeinRendersNoRows() throws {
        let view = SkeinView(frame: NSRect(x: 0, y: 0, width: 320, height: 400))
        view.setSession(try session(SkeinDocument(seed: 1,
                                                  root: SkeinNode(command: "", output: ""))))
        XCTAssertEqual(view.outlineView(NSOutlineView(), numberOfChildrenOfItem: nil), 0)
    }

    func testTheTreeFollowsTheDocumentWhenPlayGrowsIt() throws {
        let view = SkeinView(frame: NSRect(x: 0, y: 0, width: 320, height: 400))
        let session = try session(twoThreadDocument())
        view.setSession(session)

        _ = try session.growForcedSibling(of: "n-north",
                                          forcings: ["stdlib.throwing.breaks#1=no"])
        view.reload()

        let take = view.outlineView(NSOutlineView(), child: 0, ofItem: nil)
        XCTAssertEqual(view.outlineView(NSOutlineView(), numberOfChildrenOfItem: take), 3,
                       "a branch grown underneath must appear without a re-open")
    }

    // MARK: - Row rendering (badges survive a screenshot)

    func testARowShowsCommandBlessingForcingTagsAndWherePlaySits() {
        let node = SkeinNode(command: "throw bottle at anvil", output: "It shatters.",
                             tags: ["troll death"],
                             blessing: SkeinBlessing(scope: .thisThread, output: "It shatters."),
                             annotation: "the fragile case",
                             isLocked: true,
                             forcings: ["stdlib.throwing.breaks#1=yes"])
        let line = SkeinView.nodeLine(node, isCurrent: true).string

        XCTAssertTrue(line.contains("> throw bottle at anvil"))
        XCTAssertTrue(line.contains("▶"), "the row shows where play currently sits")
        XCTAssertTrue(line.contains("✓ blessed"))
        XCTAssertTrue(line.contains("⑂ stdlib.throwing.breaks#1=yes"))
        XCTAssertTrue(line.contains("[troll death]"))
        XCTAssertTrue(line.contains("🔒"))
        XCTAssertTrue(line.contains("the fragile case"))
    }

    func testAnAllPathsBlessingReadsDifferentlyFromAPlainOne() {
        let allPaths = SkeinNode(command: "look", output: "A den.",
                                 blessing: SkeinBlessing(scope: .allPaths, output: "A den."))
        let plain = SkeinNode(command: "look", output: "A den.",
                              blessing: SkeinBlessing(scope: .thisThread, output: "A den."))

        XCTAssertTrue(SkeinView.nodeLine(allPaths, isCurrent: false).string.contains("✓ all paths"),
                      "an invariance claim must be visible as one (D4)")
        XCTAssertTrue(SkeinView.nodeLine(plain, isCurrent: false).string.contains("✓ blessed"))
        XCTAssertFalse(SkeinView.nodeLine(plain, isCurrent: false).string.contains("all paths"))
    }

    func testAnUnmarkedRowCarriesNoBadges() {
        let line = SkeinView.nodeLine(SkeinNode(command: "wait", output: "Time passes."),
                                      isCurrent: false).string
        XCTAssertTrue(line.contains("> wait"))
        for badge in ["✓", "⑂", "[", "🔒", "▶"] {
            XCTAssertFalse(line.contains(badge), "unmarked row must not show \(badge)")
        }
    }

    // MARK: - Forcing parse → the spec the live client loads

    func testAForcingParsesIntoThePartsTheEngineNeeds() throws {
        let plain = try XCTUnwrap(Forcing.parse("stdlib.throwing.breaks=no"))
        XCTAssertEqual(plain, Forcing(point: "stdlib.throwing.breaks", occurrence: nil, cls: "no"))

        let indexed = try XCTUnwrap(Forcing.parse("dungeo.melee.blow.villain#2=SERIOUS_WOUND"))
        XCTAssertEqual(indexed, Forcing(point: "dungeo.melee.blow.villain",
                                        occurrence: 2, cls: "SERIOUS_WOUND"))
    }

    func testAPlaySpecCarriesStickyModeAndOmitsAnAbsentOccurrence() throws {
        let plain = try XCTUnwrap(Forcing.parse("stdlib.throwing.breaks=no")).playSpec
        XCTAssertEqual(plain["point"] as? String, "stdlib.throwing.breaks")
        XCTAssertEqual(plain["cls"] as? String, "no")
        XCTAssertEqual(plain["mode"] as? String, "sticky",
                       "live play re-reaches points; `once` would hard-fail on zero firings")
        XCTAssertNil(plain["occurrence"],
                     "an unindexed force must not claim occurrence 0 — it applies per mode")

        let indexed = try XCTUnwrap(Forcing.parse("p#3=yes")).playSpec
        XCTAssertEqual(indexed["occurrence"] as? Int, 3)
    }

    // MARK: - Forcing grammar validation (refuse before the runner does)

    func testWellFormedForcingsAreAccepted() {
        for entry in ["stdlib.throwing.breaks=no",
                      "stdlib.throwing.breaks#1=yes",
                      "dungeo.melee.blow.villain#12=SERIOUS_WOUND"] {
            XCTAssertTrue(RightPanelViewController.isWellFormedForcing(entry), entry)
        }
    }

    func testMalformedForcingsAreRefused() {
        for entry in ["",                       // nothing
                      "stdlib.throwing.breaks", // no outcome
                      "stdlib.throwing.breaks=",// empty outcome
                      "=yes",                   // no point
                      "stdlib.throwing#0=yes",  // occurrence is 1-based (ADR-293 D9)
                      "stdlib.throwing#x=yes",  // occurrence not an integer
                      "some point=yes"] {       // spaces are not a point name
            XCTAssertFalse(RightPanelViewController.isWellFormedForcing(entry), entry)
        }
    }
}
