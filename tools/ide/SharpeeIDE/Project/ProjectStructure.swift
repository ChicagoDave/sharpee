// ProjectStructure.swift
// Turns a compose run's Story IR (ADR-258 D6) into the category-grouped node tree
// the Sharpee-aware project view renders: Rooms / Objects / NPCs / Regions headers
// (plus Actions for `define action` blocks — the whole tree for a grammar file,
// ADR-269 D8) each containing leaves that carry their exact authored span.
// Pure, view-free, and unit-testable — ProjectStructureViewController renders
// these nodes; navigation is span-exact, with no name-matching fallback.
// Public interface: ProjectStructure.build(from:), StructureNode, StructureLeaf,
// StructureCategory.
// Owner context: tools/ide — Project.

import Foundation

/// Top-level project-tree categories, in display order.
enum StructureCategory: CaseIterable, Equatable {
    case room, object, npc, region, action

    var title: String {
        switch self {
        case .room: return "Rooms"
        case .object: return "Objects"
        case .npc: return "NPCs"
        case .region: return "Regions"
        case .action: return "Actions"
        }
    }

    /// SF Symbol name for the category's leaf icon.
    var symbolName: String {
        switch self {
        case .room: return "square.split.bottomrightquarter"
        case .object: return "cube"
        case .npc: return "person"
        case .region: return "map"
        case .action: return "bolt"
        }
    }
}

/// One navigable leaf: display name plus the exact authored span (D6 — click
/// opens the real site, never a name-matched guess).
struct StructureLeaf: Equatable {
    let title: String
    let category: StructureCategory
    let span: DiagnosticSpan
}

/// One row in the Sharpee-aware outline: either a category header or a leaf.
/// A reference type so NSOutlineView can track expansion by item identity.
final class StructureNode {
    /// Non-nil for a category header row.
    let category: StructureCategory?
    /// Non-nil for a leaf row.
    let leaf: StructureLeaf?
    let children: [StructureNode]

    var isCategory: Bool { category != nil }

    init(category: StructureCategory, leaves: [StructureLeaf]) {
        self.category = category
        self.leaf = nil
        self.children = leaves.map { StructureNode(leaf: $0) }
    }

    init(leaf: StructureLeaf) {
        self.category = nil
        self.leaf = leaf
        self.children = []
    }
}

enum ProjectStructure {

    /// Build the category node tree from a compose run's IR. Rooms are entities of
    /// kind `room`; NPCs are `person` entities and the player; Regions are
    /// `region` entities; everything else files under Objects. `define action`
    /// blocks form the Actions group — for a grammar file, the only group.
    /// Empty categories are omitted; leaves sort case-insensitively by title.
    static func build(from ir: ComposeStoryIR) -> [StructureNode] {
        var buckets: [StructureCategory: [StructureLeaf]] = [:]

        for entity in ir.allEntities {
            let category: StructureCategory
            if entity.hasKind("room") {
                category = .room
            } else if entity.hasKind("region") {
                category = .region
            } else if entity.hasKind("person") || entity.isPlayer {
                category = .npc
            } else {
                category = .object
            }
            buckets[category, default: []].append(
                StructureLeaf(title: entity.name, category: category, span: entity.span))
        }

        for action in ir.allActions {
            buckets[.action, default: []].append(
                StructureLeaf(title: action.name, category: .action, span: action.span))
        }

        return StructureCategory.allCases.compactMap { category in
            guard var leaves = buckets[category], !leaves.isEmpty else { return nil }
            leaves.sort { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
            return StructureNode(category: category, leaves: leaves)
        }
    }
}
