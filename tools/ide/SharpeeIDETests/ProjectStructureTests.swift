// ProjectStructureTests.swift
// IR → tree grouping (ADR-258 D6): kind-based categorization (room / region /
// person / player / everything-else), define-action grouping (the whole tree for
// a grammar file), fixed category order, alphabetical leaves, empty categories
// omitted, and span propagation onto every leaf (exact navigation, no name match).

import XCTest
@testable import SharpeeIDE

final class ProjectStructureTests: XCTestCase {

    private func span(_ line: Int) -> DiagnosticSpan {
        DiagnosticSpan(line: line, column: 1, endLine: line + 2, endColumn: 10)
    }

    private func entity(_ name: String, kinds: [String] = [], isPlayer: Bool = false,
                        line: Int = 1) -> ComposeStoryIR.Entity {
        ComposeStoryIR.Entity(id: name.lowercased(), name: name, isPlayer: isPlayer,
                              kinds: kinds.map { ComposeStoryIR.Kind(name: $0) },
                              span: span(line))
    }

    private func ir(entities: [ComposeStoryIR.Entity] = [],
                    actions: [ComposeStoryIR.ActionDef] = [],
                    grammarFile: Bool = false) -> ComposeStoryIR {
        ComposeStoryIR(format: "story language 1", languageVersion: "2.1.0",
                       meta: .init(title: "T", author: "A", fields: [:]),
                       grammarFile: grammarFile ? .init(name: "std") : nil,
                       entities: entities, actions: actions, phrases: nil, hatches: nil)
    }

    func testCategorizesByKindWithPlayerUnderNPCs() throws {
        let tree = ProjectStructure.build(from: ir(entities: [
            entity("Lab", kinds: ["room"], line: 5),
            entity("Cellar", kinds: ["room", "dark"], line: 10),
            entity("Lantern", kinds: ["portable"], line: 15),
            entity("Guard", kinds: ["person"], line: 20),
            entity("player", isPlayer: true, line: 25),
            entity("Grounds", kinds: ["region"], line: 30),
        ]))

        XCTAssertEqual(tree.map { $0.category }, [.room, .object, .npc, .region])
        XCTAssertEqual(tree[0].children.map { $0.leaf?.title }, ["Cellar", "Lab"],
                       "rooms sort case-insensitively by name")
        XCTAssertEqual(tree[1].children.map { $0.leaf?.title }, ["Lantern"])
        XCTAssertEqual(tree[2].children.map { $0.leaf?.title }, ["Guard", "player"],
                       "person entities and the player file under NPCs")
        XCTAssertEqual(tree[3].children.map { $0.leaf?.title }, ["Grounds"])
    }

    func testLeavesCarryTheirExactSpan() throws {
        let tree = ProjectStructure.build(from: ir(entities: [entity("Lab", kinds: ["room"], line: 7)]))
        let leaf = try XCTUnwrap(tree.first?.children.first?.leaf)
        XCTAssertEqual(leaf.span, span(7), "navigation is span-exact — no name-matching fallback")
    }

    func testEmptyCategoriesAreOmitted() {
        let tree = ProjectStructure.build(from: ir(entities: [entity("Lab", kinds: ["room"])]))
        XCTAssertEqual(tree.map { $0.category }, [.room])
    }

    func testActionsFormTheirOwnGroup() throws {
        let tree = ProjectStructure.build(from: ir(
            entities: [entity("Lab", kinds: ["room"])],
            actions: [ComposeStoryIR.ActionDef(name: "xyzzy", span: span(40))]))
        XCTAssertEqual(tree.map { $0.category }, [.room, .action])
        XCTAssertEqual(tree[1].children.first?.leaf?.title, "xyzzy")
        XCTAssertEqual(tree[1].children.first?.leaf?.span, span(40))
    }

    /// A grammar file (ADR-269 D8) has no entities — its tree is its
    /// `define action` blocks (D2 amendment acceptance).
    func testGrammarFileTreeIsItsActionBlocks() {
        let tree = ProjectStructure.build(from: ir(
            actions: [ComposeStoryIR.ActionDef(name: "waving", span: span(3)),
                      ComposeStoryIR.ActionDef(name: "digging", span: span(9))],
            grammarFile: true))
        XCTAssertEqual(tree.map { $0.category }, [.action])
        XCTAssertEqual(tree[0].children.map { $0.leaf?.title }, ["digging", "waving"])
    }

    func testEmptyIRYieldsEmptyTree() {
        XCTAssertTrue(ProjectStructure.build(from: ir()).isEmpty)
    }
}
