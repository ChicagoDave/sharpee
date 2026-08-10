// TestingSessionStoreTests.swift
// The D7 view-state sidecar (ADR-307): persistence round-trips and
// degraded-mode loads. The tree document owns commands/structure/claims —
// the sidecar carries ONLY the page's view state, opaque. Every test
// asserts on the FILE's state, not on in-memory echoes alone.
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

    func testViewStateRoundTripsThroughTheFile() throws {
        let store = TestingSessionStore(fileURL: fileURL)
        store.updateViewState([
            "active": 2,
            "dialogs": [["0:1", ["type": "save", "slot": "before-the-gates"]]],
        ])

        // The FILE carries version + view, nothing else — no command log.
        let data = try Data(contentsOf: fileURL)
        let object = try XCTUnwrap(
            JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(object["version"] as? Int, TestingSessionStore.version)
        XCTAssertNil(object["commands"], "the sidecar carries no command log (D7)")
        let view = try XCTUnwrap(object["view"] as? [String: Any])
        XCTAssertEqual(view["active"] as? Int, 2)

        // A fresh store loads it back verbatim.
        let reloaded = TestingSessionStore(fileURL: fileURL)
        XCTAssertTrue(reloaded.load())
        XCTAssertEqual(reloaded.viewState?["active"] as? Int, 2)
    }

    func testMissingFileLoadsEmptyWithoutError() {
        let store = TestingSessionStore(fileURL: fileURL)
        XCTAssertFalse(store.load())
        XCTAssertNil(store.viewState)
    }

    func testCorruptFileDegradesAndIsReplacedOnNextWrite() throws {
        try Data("not json at all {{{".utf8).write(to: fileURL)
        let store = TestingSessionStore(fileURL: fileURL)
        XCTAssertFalse(store.load())
        XCTAssertNil(store.viewState)

        store.updateViewState(["active": 0])
        let reloaded = TestingSessionStore(fileURL: fileURL)
        XCTAssertTrue(reloaded.load())
        XCTAssertEqual(reloaded.viewState?["active"] as? Int, 0)
    }

    func testVersionMismatchedFileIsDiscardedOnLoad() throws {
        // A v2 sidecar (the retired command-log shape) must read as absent —
        // the tree document owns what it used to carry.
        let stale: [String: Any] = [
            "version": 2,
            "commands": [["command": "look", "boot": true]],
            "viewState": ["model": ["lineages": []]],
        ]
        try JSONSerialization.data(withJSONObject: stale).write(to: fileURL)
        let store = TestingSessionStore(fileURL: fileURL)
        XCTAssertFalse(store.load())
        XCTAssertNil(store.viewState)
    }

    func testUnserializableViewStateLeavesThePreviousFileIntact() throws {
        let store = TestingSessionStore(fileURL: fileURL)
        store.updateViewState(["active": 1])
        let before = try Data(contentsOf: fileURL)

        // A payload JSONSerialization cannot encode is swallowed (observation
        // never breaks play) — the previous bytes stay.
        store.updateViewState(["bad": Date()])
        let after = try Data(contentsOf: fileURL)
        XCTAssertEqual(after, before)
    }

    func testSidecarURLIsKeyedByStoryAndProjectRoot() {
        let base = tmp.appendingPathComponent("support", isDirectory: true)
        let one = TestingSessionStore.url(
            storyId: "fernhill",
            projectRoot: URL(fileURLWithPath: "/projects/alpha"), base: base)
        let two = TestingSessionStore.url(
            storyId: "fernhill",
            projectRoot: URL(fileURLWithPath: "/projects/beta"), base: base)
        XCTAssertNotEqual(one, two,
                          "same-named stories in different projects never share a session")
        XCTAssertTrue(one.lastPathComponent.hasPrefix("fernhill-"))
        XCTAssertTrue(one.path.contains("testing-sessions"))
    }
}
