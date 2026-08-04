// SkeinStoreTests.swift
// Covers the ADR-299 Phase 1 skein model + store: byte-faithful round-trip of
// a multi-thread, multi-tag, multi-blessing-scope document through the real
// filesystem (no in-memory encoder shortcut — the store's job is the file),
// the loud unknown-schemaVersion rejection (AC-7), and the thread projection
// the later phases replay from.

import XCTest
@testable import SharpeeIDE

final class SkeinStoreTests: XCTestCase {

    private var root: URL!

    override func setUpWithError() throws {
        super.setUp()
        root = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SkeinStoreTests-\(UUID().uuidString)", isDirectory: true)
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

    /// A document exercising every field the format carries: two threads off
    /// the root (D1 branching), a deeper branch, both blessing scopes (D3/D4),
    /// tags (D2), an annotation and a lock (D9), and a forcing (D5).
    private func buildDocument() -> SkeinDocument {
        let forcedBranch = SkeinNode(
            command: "attack troll",
            output: "Your blow lands lightly.",
            tags: ["troll survives"],
            forcings: ["dungeo.melee.blow.villain#1=LIGHT_WOUND"])
        let goldenPath = SkeinNode(
            command: "take lamp",
            output: "Taken.",
            tags: ["golden path"],
            blessing: SkeinBlessing(scope: .thisThread, output: "Taken."),
            annotation: "the lamp matters for the cellar",
            children: [
                SkeinNode(command: "go north",
                          output: "Cellar\nA damp stone room.",
                          blessing: SkeinBlessing(scope: .allPaths,
                                                  output: "Cellar\nA damp stone room."),
                          children: [forcedBranch]),
            ])
        let detour = SkeinNode(
            command: "look",
            output: "You are in a forest.",
            tags: ["garden exploration"],
            isLocked: true)
        let start = SkeinNode(
            command: "",
            output: "THE LOST KEY\nAn interactive fiction.",
            children: [goldenPath, detour])
        return SkeinDocument(seed: 42, root: start)
    }

    private var skeinURL: URL {
        SkeinStore.url(forStoryId: "the-lost-key", projectRoot: root)
    }

    // MARK: - Round-trip through the real filesystem

    func testDocumentRoundTripsThroughDisk() throws {
        let document = buildDocument()

        try SkeinStore.write(document, to: skeinURL)
        let reloaded = try SkeinStore.read(from: skeinURL)

        // Equatable covers the whole tree: commands, outputs, tags, both
        // blessing scopes, annotation, lock, forcing, origin, child order.
        XCTAssertEqual(reloaded, document)
    }

    func testWriteCreatesThePlayTestingDirectoryAndCanonicalPath() throws {
        try SkeinStore.write(buildDocument(), to: skeinURL)

        // The canonical location, not just "some file": D7 fixes the path.
        let expected = root.appendingPathComponent("play-testing")
            .appendingPathComponent("the-lost-key.skein")
        XCTAssertTrue(FileManager.default.fileExists(atPath: expected.path),
                      "write must create play-testing/ on first save")
    }

    func testWrittenFileCarriesTheCurrentSchemaVersion() throws {
        try SkeinStore.write(buildDocument(), to: skeinURL)

        let json = try JSONSerialization.jsonObject(with: Data(contentsOf: skeinURL)) as? [String: Any]
        XCTAssertEqual(json?["schemaVersion"] as? Int, SkeinDocument.currentSchemaVersion)
        XCTAssertEqual(json?["seed"] as? Int, 42, "the pinned seed is stored inline (D5/D7)")
    }

    // MARK: - Schema-version gate (AC-7)

    func testUnknownSchemaVersionIsRejectedLoudlyWithNoPartialLoad() throws {
        // A structurally valid v1 body wearing a future version: the gate must
        // fire on the version alone, before any shape decoding.
        try SkeinStore.write(buildDocument(), to: skeinURL)
        var json = try JSONSerialization.jsonObject(with: Data(contentsOf: skeinURL)) as! [String: Any]
        json["schemaVersion"] = 99
        try JSONSerialization.data(withJSONObject: json).write(to: skeinURL)

        XCTAssertThrowsError(try SkeinStore.read(from: skeinURL)) { error in
            XCTAssertEqual(error as? SkeinStore.DecodeError,
                           .schemaVersionMismatch(found: 99,
                                                  expected: SkeinDocument.currentSchemaVersion))
        }
    }

    // MARK: - Thread projection (the replay driver's input, D6)

    func testThreadToADeepNodeLinearizesTheRootPath() {
        let document = buildDocument()
        let forcedNodeId = document.root.children[0].children[0].children[0].id

        let thread = document.thread(to: forcedNodeId)

        XCTAssertEqual(thread?.nodes.map(\.command),
                       ["", "take lamp", "go north", "attack troll"])
        // The root's empty command is not typed, so replay excludes it (D6).
        XCTAssertEqual(thread?.commands, ["take lamp", "go north", "attack troll"])
        XCTAssertEqual(thread?.terminal.forcings,
                       ["dungeo.melee.blow.villain#1=LIGHT_WOUND"])
    }

    func testThreadToAnUnknownIdIsNil() {
        XCTAssertNil(buildDocument().thread(to: "no-such-node"))
        XCTAssertNil(buildDocument().node(withId: "no-such-node"))
    }
}
