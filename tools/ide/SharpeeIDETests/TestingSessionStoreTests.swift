// TestingSessionStoreTests.swift
// The D8 session sidecar (ADR-306): persistence round-trips, the replay
// plan's fence/boot rules, and degraded-mode loads. Every test asserts on
// the FILE's state or the derived plan, not on in-memory echoes alone.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

final class TestingSessionStoreTests: XCTestCase {

    private var tmp: URL!
    private var fileURL: URL!

    override func setUpWithError() throws {
        try super.setUpWithError()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SidecarTests-\(UUID().uuidString)",
                                    isDirectory: true)
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        fileURL = tmp.appendingPathComponent("story-abcd1234.json")
    }

    override func tearDownWithError() throws {
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        try super.tearDownWithError()
    }

    private func fileJSON() throws -> [String: Any] {
        let data = try Data(contentsOf: fileURL)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    func testAppendPersistsTheCommandLogToDisk() throws {
        let store = TestingSessionStore(fileURL: fileURL)
        store.append(["command": "look", "boot": true])
        store.append(["command": "north", "boot": false])

        let object = try fileJSON()
        XCTAssertEqual(object["version"] as? Int, TestingSessionStore.version)
        let commands = try XCTUnwrap(object["commands"] as? [[String: Any]])
        XCTAssertEqual(commands.map { $0["command"] as? String }, ["look", "north"])
    }

    func testViewStatePersistsOpaquely() throws {
        let store = TestingSessionStore(fileURL: fileURL)
        store.append(["command": "look", "boot": true])
        store.updateViewState(["segments": [["start": 2, "end": 3, "collapsed": false]],
                               "skipped": [Int]()])

        let object = try fileJSON()
        let state = try XCTUnwrap(object["viewState"] as? [String: Any])
        let segments = try XCTUnwrap(state["segments"] as? [[String: Any]])
        XCTAssertEqual(segments.first?["start"] as? Int, 2)
    }

    func testReplayPlanExcludesBootLooksAndDeadLineage() throws {
        let store = TestingSessionStore(fileURL: fileURL)
        store.append(["command": "look", "boot": true])
        store.append(["command": "north", "boot": false])
        store.append(["fence": true])
        store.append(["command": "look", "boot": true])
        store.append(["command": "east", "boot": false])
        store.append(["command": "take lamp", "boot": false])

        // A reloaded store derives the same plan — the file is the truth.
        let reloaded = TestingSessionStore(fileURL: fileURL)
        XCTAssertTrue(reloaded.load())
        let plan = reloaded.replayPlan()
        XCTAssertEqual(plan.replay, ["east", "take lamp"],
                       "dead lineage never replays; boot looks play themselves")
    }

    func testLoadRoundTripsViewState() throws {
        let store = TestingSessionStore(fileURL: fileURL)
        store.append(["command": "look", "boot": true])
        store.updateViewState(["segments": [["start": 1, "collapsed": true]]])

        let reloaded = TestingSessionStore(fileURL: fileURL)
        XCTAssertTrue(reloaded.load())
        let state = try XCTUnwrap(reloaded.replayPlan().viewState)
        XCTAssertEqual((state["segments"] as? [[String: Any]])?.first?["collapsed"] as? Bool,
                       true)
    }

    func testMissingCorruptAndMismatchedFilesDegradeToEmpty() throws {
        // Missing.
        XCTAssertFalse(TestingSessionStore(fileURL: fileURL).load())

        // Corrupt.
        try Data("not json{{{".utf8).write(to: fileURL)
        let corrupt = TestingSessionStore(fileURL: fileURL)
        XCTAssertFalse(corrupt.load())
        XCTAssertTrue(corrupt.replayPlan().isEmpty)

        // Version mismatch.
        let future = ["version": TestingSessionStore.version + 1,
                      "commands": [["command": "look"]]] as [String: Any]
        try JSONSerialization.data(withJSONObject: future).write(to: fileURL)
        XCTAssertFalse(TestingSessionStore(fileURL: fileURL).load())

        // The degraded store's next write replaces the bad file (AC-2's
        // "replaced on the next session write").
        corrupt.append(["command": "look", "boot": true])
        let object = try fileJSON()
        XCTAssertEqual(object["version"] as? Int, TestingSessionStore.version)
    }

    func testSidecarPathIsPerStoryAndPerProject() {
        let projectA = URL(fileURLWithPath: "/Users/a/stories/manor")
        let projectB = URL(fileURLWithPath: "/Users/b/other/manor")
        let base = URL(fileURLWithPath: "/tmp/support")
        let a = TestingSessionStore.url(storyId: "manor", projectRoot: projectA, base: base)
        let b = TestingSessionStore.url(storyId: "manor", projectRoot: projectB, base: base)
        XCTAssertNotEqual(a, b, "same story id in two projects must not share a session")
        XCTAssertTrue(a.lastPathComponent.hasPrefix("manor-"))
        XCTAssertTrue(a.path.contains("testing-sessions"))
    }
}
