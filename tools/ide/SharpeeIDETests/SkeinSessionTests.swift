// SkeinSessionTests.swift
// Covers the live growth semantics of ADR-299 D1 (walk on match, branch on
// divergence, persist through the real filesystem) and the session's loud
// refusal of an unreadable skein (AC-7). The Play-pane wiring on top of this
// model is pinned by SkeinPlayGrowthTests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class SkeinSessionTests: XCTestCase {

    private var root: URL!
    private var storeURL: URL!

    override func setUpWithError() throws {
        super.setUp()
        root = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SkeinSessionTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        storeURL = SkeinStore.url(forStoryId: "probe", projectRoot: root)
    }

    override func tearDownWithError() throws {
        if let root, FileManager.default.fileExists(atPath: root.path) {
            try FileManager.default.removeItem(at: root)
        }
        root = nil
        super.tearDown()
    }

    // MARK: - Branching persists; the file is the record

    func testFirstTurnsBranchAndPersistToDisk() throws {
        let session = try SkeinSession(storeURL: storeURL)
        XCTAssertFalse(FileManager.default.fileExists(atPath: storeURL.path),
                       "an unplayed story must not grow a play-testing folder")

        try session.recordTurn(command: "take lamp", output: "Taken.")
        try session.recordTurn(command: "go north", output: "Cellar")

        let saved = try SkeinStore.read(from: storeURL)
        XCTAssertEqual(saved.root.children.map(\.command), ["take lamp"])
        XCTAssertEqual(saved.root.children[0].children.map(\.command), ["go north"])
        XCTAssertEqual(saved.root.children[0].children[0].output, "Cellar")
    }

    func testRestartAndDivergenceYieldsTwoThreadsInTheSavedFile() throws {
        // AC-1's shape: shared prefix, then divergence after a new thread.
        let session = try SkeinSession(storeURL: storeURL)
        try session.recordTurn(command: "take lamp", output: "Taken.")
        try session.recordTurn(command: "go north", output: "Cellar")

        session.beginThread()
        try session.recordTurn(command: "take lamp", output: "Taken.")
        try session.recordTurn(command: "go south", output: "Garden")

        let saved = try SkeinStore.read(from: storeURL)
        // The shared prefix is walked, not duplicated: ONE take-lamp node...
        XCTAssertEqual(saved.root.children.map(\.command), ["take lamp"])
        // ...carrying both continuations as branches — two threads.
        XCTAssertEqual(saved.root.children[0].children.map(\.command),
                       ["go north", "go south"])
    }

    func testWalkingKeepsTheStoredOutput() throws {
        let session = try SkeinSession(storeURL: storeURL)
        try session.recordTurn(command: "look", output: "A quiet den.")

        session.beginThread()
        // Same command, different actual output (a source change): the stored
        // output is the record — never silently overwritten (Phase 7/8 owns
        // surfacing the diff).
        let walked = try session.recordTurn(command: "look", output: "A LOUD den.")

        XCTAssertEqual(walked.output, "A quiet den.")
        XCTAssertEqual(try SkeinStore.read(from: storeURL).root.children[0].output,
                       "A quiet den.")
    }

    // MARK: - Reopening

    func testReopeningKeepsTheSeedAndGrowsTheSameTree() throws {
        let first = try SkeinSession(storeURL: storeURL)
        try first.recordTurn(command: "take lamp", output: "Taken.")
        let mintedSeed = first.seed

        // A rebuild reopens the skein from disk (a fresh boot, back at root).
        let second = try SkeinSession(storeURL: storeURL)
        XCTAssertEqual(second.seed, mintedSeed, "one pinned seed per skein (D5)")
        try second.recordTurn(command: "take lamp", output: "Taken.")
        try second.recordTurn(command: "go north", output: "Cellar")

        let saved = try SkeinStore.read(from: storeURL)
        XCTAssertEqual(saved.root.children.count, 1, "reopening must walk, not duplicate")
        XCTAssertEqual(saved.root.children[0].children.map(\.command), ["go north"])
    }

    // MARK: - Loud refusal (AC-7 at the session layer)

    func testAnUnreadableSkeinRefusesToOpenRatherThanReplacingIt() throws {
        try FileManager.default.createDirectory(at: storeURL.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try Data(#"{"schemaVersion": 99}"#.utf8).write(to: storeURL)

        XCTAssertThrowsError(try SkeinSession(storeURL: storeURL)) { error in
            XCTAssertEqual(error as? SkeinStore.DecodeError,
                           .schemaVersionMismatch(found: 99,
                                                  expected: SkeinDocument.currentSchemaVersion))
        }
        // The authored file is untouched — refusal, not replacement.
        XCTAssertEqual(try Data(contentsOf: storeURL), Data(#"{"schemaVersion": 99}"#.utf8))
    }

    // MARK: - A replay records the node it is REPLAYING, not the one that matches

    /// A forced sibling shares its shadowed node's command (D5), so walking by
    /// command alone lands every replayed turn on whichever child came first.
    /// The replay knows better and says so.
    func testReplayingAForcedSiblingRecordsAgainstTheBranchNotTheNodeItShadows() throws {
        let session = try SkeinSession(storeURL: storeURL)
        try session.recordTurn(command: "throw bottle at anvil", output: "It hits!")
        let played = session.currentNodeId
        let forced = try XCTUnwrap(try session.growForcedSibling(
            of: played, forcings: ["stdlib.throwing.breaks#1=yes"]))

        let thread = try XCTUnwrap(session.document.thread(to: forced.id))
        session.beginReplay(along: thread)
        try session.recordTurn(command: "throw bottle at anvil", output: "It smashes!")
        session.endReplay()

        XCTAssertEqual(session.currentNodeId, forced.id,
                       "the replay must land on the branch it was replaying")
        XCTAssertEqual(session.observedOutputs[forced.id], "It smashes!")
        XCTAssertNil(session.observedOutputs[played],
                     "the shadowed node was not replayed and must not be reported on")
        XCTAssertEqual(session.document.node(withId: played)?.output, "It hits!",
                       "the shadowed node keeps its own played output")
    }

    /// A forced sibling is grown with empty output precisely so a replay fills
    /// it in (D5) — a branch with no capture can never be read, blessed, or
    /// exported.
    func testAReplayEstablishesTheFirstCaptureOfABranchThatHadNone() throws {
        let session = try SkeinSession(storeURL: storeURL)
        try session.recordTurn(command: "throw bottle at anvil", output: "It hits!")
        let forced = try XCTUnwrap(try session.growForcedSibling(
            of: session.currentNodeId, forcings: ["stdlib.throwing.breaks#1=yes"]))
        XCTAssertEqual(forced.output, "", "precondition: the branch has no capture yet")

        session.beginReplay(along: try XCTUnwrap(session.document.thread(to: forced.id)))
        try session.recordTurn(command: "throw bottle at anvil", output: "It smashes!")
        session.endReplay()

        XCTAssertEqual(try SkeinStore.read(from: storeURL).node(withId: forced.id)?.output,
                       "It smashes!",
                       "establishing a first capture is making a record, not overwriting one")
    }

    func testAReplayNeverOverwritesACaptureThatAlreadyExists() throws {
        let session = try SkeinSession(storeURL: storeURL)
        try session.recordTurn(command: "take lamp", output: "Taken.")
        let node = session.currentNodeId

        session.beginReplay(along: try XCTUnwrap(session.document.thread(to: node)))
        try session.recordTurn(command: "take lamp", output: "Taken, and it is warm.")
        session.endReplay()

        XCTAssertEqual(session.document.node(withId: node)?.output, "Taken.",
                       "the stored capture is the record (D1) — the change is a finding, not a save")
        XCTAssertEqual(session.observedOutputs[node], "Taken, and it is warm.")
    }

    func testATurnThatDivergesFromTheReplayFallsBackToOrdinaryWalking() throws {
        let session = try SkeinSession(storeURL: storeURL)
        try session.recordTurn(command: "take lamp", output: "Taken.")
        let lamp = session.currentNodeId

        session.beginReplay(along: try XCTUnwrap(session.document.thread(to: lamp)))
        // Not the command the replay expected — the story no longer accepts it,
        // or the page wedged. Recording against a node the replay merely hoped
        // for would be worse than branching where the command actually leads.
        try session.recordTurn(command: "go north", output: "The cellar.")

        XCTAssertNotEqual(session.currentNodeId, lamp)
        XCTAssertEqual(session.document.root.children.map(\.command), ["take lamp", "go north"])
    }
}
