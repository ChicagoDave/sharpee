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
}
