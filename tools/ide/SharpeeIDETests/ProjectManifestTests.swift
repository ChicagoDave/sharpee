// ProjectManifestTests.swift
// Covers ProjectManifest.decode(from:): the wire shape from `sharpee --introspect`
// (ADR-184), the schema-version gate, sparse trait projection, the source ref,
// and forward-compatible passthrough of unknown traits.

import XCTest
@testable import SharpeeIDE

final class ProjectManifestTests: XCTestCase {

    /// A representative manifest in the exact @sharpee/ide-protocol wire shape:
    /// a wrapper-created room (with a source ref), an openable container, an NPC,
    /// a region, and an entity carrying an UNKNOWN trait (forward-compat).
    private let json = """
    {
      "schemaVersion": 1,
      "story": "thealderman",
      "generatedFrom": "cli",
      "entities": [
        { "id": "r01", "displayName": "Great Room", "category": "room",
          "traits": { "identity": { "description": "The grand foyer." }, "room": { "exits": ["south", "east"] } },
          "source": { "file": "stories/thealderman/src/rooms/index.ts", "line": 54, "resolution": "exact" } },
        { "id": "i07", "displayName": "nightstand", "category": "object",
          "traits": { "identity": {}, "container": { "openable": true, "lockable": false } } },
        { "id": "a01", "displayName": "the bellhop", "category": "npc", "traits": { "identity": {} } },
        { "id": "rg1", "displayName": "Third Floor", "category": "region", "traits": {} },
        { "id": "x99", "displayName": "future thing", "category": "object",
          "traits": { "identity": {}, "somethingNew": { "foo": 1 } } }
      ]
    }
    """.data(using: .utf8)!

    private func decoded() throws -> ProjectManifest {
        try ProjectManifest.decode(from: json)
    }

    func testDecodesHeader() throws {
        let m = try decoded()
        XCTAssertEqual(m.schemaVersion, 1)
        XCTAssertEqual(m.story, "thealderman")
        XCTAssertEqual(m.generatedFrom, .cli)
        XCTAssertEqual(m.entities.count, 5)
    }

    func testDecodesCategories() throws {
        let m = try decoded()
        XCTAssertEqual(m.entities.map(\.category),
                       [.room, .object, .npc, .region, .object])
    }

    func testProjectsRoomExitsAndDescription() throws {
        let room = try XCTUnwrap(try decoded().entities.first { $0.id == "r01" })
        XCTAssertEqual(room.traits.room?.exits, ["south", "east"])
        XCTAssertEqual(room.traits.identity?.description, "The grand foyer.")
    }

    func testProjectsContainerBooleans() throws {
        let box = try XCTUnwrap(try decoded().entities.first { $0.id == "i07" })
        XCTAssertEqual(box.traits.container?.openable, true)
        XCTAssertEqual(box.traits.container?.lockable, false)
    }

    func testDecodesSourceRef() throws {
        let room = try XCTUnwrap(try decoded().entities.first { $0.id == "r01" })
        XCTAssertEqual(room.source?.file, "stories/thealderman/src/rooms/index.ts")
        XCTAssertEqual(room.source?.line, 54)
        XCTAssertEqual(room.source?.resolution, .exact)
    }

    func testSourceAbsentWhenCLIEmitted() throws {
        let box = try XCTUnwrap(try decoded().entities.first { $0.id == "i07" })
        XCTAssertNil(box.source)
    }

    func testOmittedTraitKeysAreNil() throws {
        let region = try XCTUnwrap(try decoded().entities.first { $0.id == "rg1" })
        XCTAssertNil(region.traits.identity)
        XCTAssertNil(region.traits.room)
        XCTAssertNil(region.traits.container)
    }

    /// The wire's forward-compatible index signature: an unknown trait must not
    /// fail the decode or drop the entity.
    func testUnknownTraitDoesNotFailDecode() throws {
        let future = try XCTUnwrap(try decoded().entities.first { $0.id == "x99" })
        XCTAssertEqual(future.category, .object)
        XCTAssertNil(future.traits.room)
    }

    func testRejectsSchemaVersionMismatch() {
        let bumped = String(data: json, encoding: .utf8)!
            .replacingOccurrences(of: "\"schemaVersion\": 1", with: "\"schemaVersion\": 2")
            .data(using: .utf8)!
        XCTAssertThrowsError(try ProjectManifest.decode(from: bumped)) { error in
            XCTAssertEqual(error as? ProjectManifest.DecodeError,
                           .schemaVersionMismatch(found: 2, expected: 1))
        }
    }

    func testRejectsMalformedEntity() {
        let bad = """
        { "schemaVersion": 1, "story": "x", "generatedFrom": "cli",
          "entities": [ { "id": "z", "category": "room", "traits": {} } ] }
        """.data(using: .utf8)!
        // Missing required `displayName` → a DecodingError, not a manifest.
        XCTAssertThrowsError(try ProjectManifest.decode(from: bad))
    }
}
