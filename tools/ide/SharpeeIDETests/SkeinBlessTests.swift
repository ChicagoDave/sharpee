// SkeinBlessTests.swift
// ADR-299 Phase 7 (D3/D4): the session's blessing door — what a bless vouches
// for, that it reaches disk, and that a refusal writes nothing. Also the
// observed-output channel blessing and verification both read: walking a
// thread never overwrites a node's stored capture (D1), so this run's text has
// to live somewhere the transcript can show and the verifier can check.

import XCTest
@testable import SharpeeIDE

@MainActor
final class SkeinBlessTests: XCTestCase {

    private var tmp: URL!
    private var storeURL: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SkeinBlessTests-\(UUID().uuidString)",
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

    /// root → "look"(n-look) → "take egg"(n-take)
    private func session() throws -> SkeinSession {
        let take = SkeinNode(id: "n-take", command: "take egg", output: "Taken.")
        let look = SkeinNode(id: "n-look", command: "look", output: "The cellar.",
                             children: [take])
        try SkeinStore.write(SkeinDocument(seed: 42,
                                           root: SkeinNode(id: "n-root", command: "",
                                                           output: "Forge.",
                                                           children: [look])),
                             to: storeURL)
        return try SkeinSession(storeURL: storeURL)
    }

    private func saved() throws -> SkeinDocument {
        try SkeinStore.read(from: storeURL)
    }

    // MARK: - Bless

    func testBlessingPersistsTheScopeAndTheBlessedTextToTheSkeinFile() throws {
        let skein = try session()

        XCTAssertTrue(try skein.bless(nodeId: "n-look", scope: .allPaths))

        let blessing = try XCTUnwrap(saved().node(withId: "n-look")?.blessing)
        XCTAssertEqual(blessing.scope, .allPaths)
        XCTAssertEqual(blessing.output, "The cellar.")
    }

    func testBlessingVouchesForWhatTheStoryPRINTEDNotWhatWasStored() throws {
        let skein = try session()
        // A run reached the node and it printed something new — that is what
        // the author is reading, so that is what a bless approves.
        try skein.recordTurn(command: "look", output: "The cellar, and a rat.")

        XCTAssertTrue(try skein.bless(nodeId: "n-look", scope: .thisThread))

        XCTAssertEqual(try saved().node(withId: "n-look")?.blessing?.output,
                       "The cellar, and a rat.")
    }

    func testReblessingReplacesTheScopeRatherThanAddingASecondClaim() throws {
        let skein = try session()
        XCTAssertTrue(try skein.bless(nodeId: "n-look", scope: .thisThread))

        XCTAssertTrue(try skein.bless(nodeId: "n-look", scope: .allPaths))

        XCTAssertEqual(try saved().node(withId: "n-look")?.blessing?.scope, .allPaths,
                       "changing a scope is re-blessing, not stacking blessings")
    }

    func testBlessingAnUnknownNodeIsRefusedAndWritesNothing() throws {
        let skein = try session()
        try FileManager.default.removeItem(at: storeURL)

        XCTAssertFalse(try skein.bless(nodeId: "no-such-node", scope: .allPaths))

        XCTAssertFalse(FileManager.default.fileExists(atPath: storeURL.path),
                       "a refused bless must not touch the file")
    }

    // MARK: - Unbless

    func testUnblessingRemovesTheClaimFromTheFile() throws {
        let skein = try session()
        XCTAssertTrue(try skein.bless(nodeId: "n-look", scope: .allPaths))

        XCTAssertTrue(try skein.unbless(nodeId: "n-look"))

        XCTAssertNil(try saved().node(withId: "n-look")?.blessing)
    }

    func testUnblessingAnUnblessedNodeIsRefusedAndWritesNothing() throws {
        let skein = try session()
        try FileManager.default.removeItem(at: storeURL)

        XCTAssertFalse(try skein.unbless(nodeId: "n-look"))

        XCTAssertFalse(FileManager.default.fileExists(atPath: storeURL.path),
                       "withdrawing an approval nobody gave must not be a save")
    }

    // MARK: - Observed outputs

    func testWalkingRecordsWhatWasPrintedWithoutOverwritingTheStoredCapture() throws {
        let skein = try session()

        try skein.recordTurn(command: "look", output: "The cellar, and a rat.")

        XCTAssertEqual(skein.document.node(withId: "n-look")?.output, "The cellar.",
                       "the stored capture is the record and must stand (D1)")
        XCTAssertEqual(skein.observedOutputs["n-look"], "The cellar, and a rat.")
        XCTAssertEqual(skein.actualOutput(forNodeId: "n-look"), "The cellar, and a rat.",
                       "what the node prints NOW is this run's reading")
    }

    func testANewBootDropsTheLastRunsObservations() throws {
        let skein = try session()
        try skein.recordTurn(command: "look", output: "The cellar, and a rat.")

        skein.beginThread()

        XCTAssertEqual(skein.observedOutputs, [:])
        XCTAssertEqual(skein.actualOutput(forNodeId: "n-look"), "The cellar.",
                       "a node this run never reached must read as its stored capture")
    }

    func testVerificationReadsThisRunsOutputs() throws {
        let skein = try session()
        XCTAssertTrue(try skein.bless(nodeId: "n-look", scope: .thisThread))
        XCTAssertEqual(skein.findings(forThreadTo: "n-take"), [],
                       "nothing has changed yet")

        try skein.recordTurn(command: "look", output: "The cellar, and a rat.")

        let findings = skein.findings(forThreadTo: "n-take")
        XCTAssertEqual(findings.map(\.kind), [.changedOutput])
        XCTAssertEqual(findings.first?.nodeId, "n-look")
    }

    func testFindingsForAnUnknownNodeAreEmptyRatherThanTheWholeSkeins() throws {
        let skein = try session()
        XCTAssertEqual(skein.findings(forThreadTo: "no-such-node"), [])
    }
}
