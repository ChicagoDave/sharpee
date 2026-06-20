// ProjectStructureTests.swift
// Covers ProjectStructure.build(from:): category grouping in display order,
// omission of empty categories, case-insensitive entity sorting, and the
// category-header → entity-leaf shape.

import XCTest
@testable import SharpeeIDE

final class ProjectStructureTests: XCTestCase {

    private func entity(_ name: String, _ category: EntityCategory) -> EntityNode {
        EntityNode(id: name.lowercased(), displayName: name, category: category,
                   traits: TraitSummary(identity: nil, room: nil, container: nil), source: nil)
    }

    private func manifest(_ entities: [EntityNode]) -> ProjectManifest {
        ProjectManifest(schemaVersion: 1, story: "test", generatedFrom: .cli, entities: entities)
    }

    func testGroupsByCategoryInDisplayOrder() {
        // Intentionally out of order: region, npc, object, room.
        let nodes = ProjectStructure.build(from: manifest([
            entity("Underground", .region),
            entity("thief", .npc),
            entity("lantern", .object),
            entity("West of House", .room),
        ]))
        XCTAssertEqual(nodes.map { $0.group?.category }, [.room, .object, .npc, .region])
        XCTAssertEqual(nodes.map { $0.group?.title }, ["Rooms", "Objects", "NPCs", "Regions"])
    }

    func testOmitsEmptyCategories() {
        let nodes = ProjectStructure.build(from: manifest([
            entity("West of House", .room),
            entity("lantern", .object),
        ]))
        // No NPCs or Regions → only two headers.
        XCTAssertEqual(nodes.map { $0.group?.category }, [.room, .object])
    }

    func testSortsEntitiesCaseInsensitivelyWithinCategory() {
        let nodes = ProjectStructure.build(from: manifest([
            entity("brass lantern", .object),
            entity("Apple", .object),
            entity("anvil", .object),
        ]))
        let objects = try? XCTUnwrap(nodes.first { $0.group?.category == .object })
        XCTAssertEqual(objects?.group?.entities.map(\.displayName), ["anvil", "Apple", "brass lantern"])
    }

    func testCategoryNodeChildrenAreEntityLeaves() {
        let nodes = ProjectStructure.build(from: manifest([
            entity("West of House", .room),
            entity("Kitchen", .room),
        ]))
        let rooms = nodes[0]
        XCTAssertTrue(rooms.isCategory)
        XCTAssertEqual(rooms.children.count, 2)
        XCTAssertTrue(rooms.children.allSatisfy { !$0.isCategory })
        XCTAssertEqual(rooms.children.compactMap { $0.entity?.displayName }, ["Kitchen", "West of House"])
    }

    func testEmptyManifestYieldsNoNodes() {
        XCTAssertTrue(ProjectStructure.build(from: manifest([])).isEmpty)
    }
}
