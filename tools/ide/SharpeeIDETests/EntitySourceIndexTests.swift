// EntitySourceIndexTests.swift
// Real-path tests for EntitySourceIndex: parses TypeScript through the vendored
// tree-sitter grammar and asserts the name→location index — direct createEntity
// literals, names threaded through factory wrappers, exclusion of strings nested in
// options objects, resolution modes, line accuracy, and the manifest join.

import XCTest
@testable import SharpeeIDE

final class EntitySourceIndexTests: XCTestCase {

    private func index(_ pairs: [(String, String)]) -> EntitySourceIndex {
        EntitySourceIndex.build(from: pairs.map { (path: $0.0, source: $0.1) })
    }

    func testIndexesDirectCreateEntityLiteral() {
        let source = """
        import { WorldModel } from '@sharpee/world-model';

        export function createObjects(world: WorldModel): void {
          const mailbox = world.createEntity('small mailbox', EntityType.CONTAINER);
          mailbox.add(new IdentityTrait({ name: 'small mailbox' }));
        }
        """
        let ref = index([("objects.ts", source)]).sourceRef(for: "small mailbox")
        XCTAssertEqual(ref?.file, "objects.ts")
        XCTAssertEqual(ref?.line, 4)        // the createEntity call site
        XCTAssertEqual(ref?.resolution, .exact)  // the nested IdentityTrait string is NOT indexed
    }

    func testExcludesStringsNestedInOptionsObjects() {
        // 'a sturdy thing' lives in an options object, not directly in arguments → not indexed.
        let source = """
        const x = world.createEntity('thing', EntityType.ITEM);
        x.add(new IdentityTrait({ name: 'a sturdy thing' }));
        """
        let idx = index([("f.ts", source)])
        XCTAssertNotNil(idx.sourceRef(for: "thing"))
        XCTAssertNil(idx.sourceRef(for: "a sturdy thing"))
    }

    func testIndexesNameThreadedThroughFactoryWrapper() {
        // The room name reaches createEntity as a variable; the literal is at the wrapper call.
        let source = """
        function createRoom(world, name, desc) {
          return world.createEntity(name, EntityType.ROOM);
        }
        const foyer = createRoom(world, 'West of House', 'A white house stands here.');
        """
        let ref = index([("rooms.ts", source)]).sourceRef(for: "West of House")
        XCTAssertEqual(ref?.line, 4)
        XCTAssertEqual(ref?.resolution, .exact)
    }

    func testDuplicateNameResolvesToScope() {
        let source = """
        const a = world.createEntity('coin', EntityType.ITEM);
        const b = world.createEntity('coin', EntityType.ITEM);
        """
        let ref = index([("f.ts", source)]).sourceRef(for: "coin")
        XCTAssertEqual(ref?.resolution, .scope)   // ambiguous
        XCTAssertEqual(ref?.line, 1)              // first site
    }

    func testUnindexedNameYieldsNil() {
        let idx = index([("f.ts", "const a = world.createEntity('lantern', EntityType.ITEM);")])
        XCTAssertNil(idx.sourceRef(for: "nonexistent"))
    }

    func testRecordsPerFilePaths() {
        let idx = index([
            ("regions/white-house.ts", "world.createEntity('mailbox', X);"),
            ("regions/forest.ts", "world.createEntity('tree', X);"),
        ])
        XCTAssertEqual(idx.sourceRef(for: "mailbox")?.file, "regions/white-house.ts")
        XCTAssertEqual(idx.sourceRef(for: "tree")?.file, "regions/forest.ts")
    }

    func testAnnotatingPopulatesSourceOnMatchingEntitiesOnly() {
        let source = """
        const foyer = createRoom(world, 'West of House', 'desc');
        const m = world.createEntity('small mailbox', EntityType.CONTAINER);
        """
        let idx = index([("dungeo.ts", source)])

        let manifest = ProjectManifest(
            schemaVersion: 1, story: "dungeo", generatedFrom: .cli,
            entities: [
                EntityNode(id: "r1", displayName: "West of House", category: .room,
                           traits: TraitSummary(identity: nil, room: nil, container: nil), source: nil),
                EntityNode(id: "i1", displayName: "small mailbox", category: .object,
                           traits: TraitSummary(identity: nil, room: nil, container: nil), source: nil),
                EntityNode(id: "g1", displayName: "ghost", category: .npc,
                           traits: TraitSummary(identity: nil, room: nil, container: nil), source: nil),
            ])

        let annotated = idx.annotating(manifest)
        XCTAssertEqual(annotated.entities[0].source?.line, 1)        // West of House @ line 1
        XCTAssertEqual(annotated.entities[0].source?.resolution, .exact)
        XCTAssertNotNil(annotated.entities[1].source)               // small mailbox → matched
        XCTAssertNil(annotated.entities[2].source)                  // ghost → not in source
        // The join preserves identity/order and only adds source.
        XCTAssertEqual(annotated.entities.map(\.id), ["r1", "i1", "g1"])
    }
}
