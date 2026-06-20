// ProjectStructure.swift
// Turns a ProjectManifest (ADR-184) into the category-grouped node tree the
// Sharpee-aware project view renders: top-level category headers (Rooms / Objects
// / NPCs / Regions) each containing their entities. Pure, view-free, and unit-
// testable — the AppKit ProjectStructureViewController renders these nodes.
// Public interface: ProjectStructure.build(from:), StructureNode, CategoryGroup.
// Owner context: tools/ide — Project.

import Foundation

/// A category header plus the entities filed under it (sorted for display).
struct CategoryGroup: Equatable {
    let category: EntityCategory
    let title: String
    let entities: [EntityNode]
}

/// One row in the Sharpee-aware outline: either a category header or an entity leaf.
/// A reference type so NSOutlineView can track expansion by item identity.
final class StructureNode {
    /// Non-nil for a category header row.
    let group: CategoryGroup?
    /// Non-nil for an entity leaf row.
    let entity: EntityNode?
    let children: [StructureNode]

    var isCategory: Bool { group != nil }

    init(group: CategoryGroup) {
        self.group = group
        self.entity = nil
        self.children = group.entities.map { StructureNode(entity: $0) }
    }

    init(entity: EntityNode) {
        self.group = nil
        self.entity = entity
        self.children = []
    }
}

enum ProjectStructure {

    /// Fixed display order; categories not in this list are not rendered.
    static let displayOrder: [EntityCategory] = [.room, .object, .npc, .region]

    /// The plural header label for a category.
    static func title(for category: EntityCategory) -> String {
        switch category {
        case .room: return "Rooms"
        case .object: return "Objects"
        case .npc: return "NPCs"
        case .region: return "Regions"
        }
    }

    /// Build the category node tree from a manifest. Categories appear in
    /// `displayOrder`; an empty category is omitted; entities within a category are
    /// sorted case-insensitively by display name.
    static func build(from manifest: ProjectManifest) -> [StructureNode] {
        displayOrder.compactMap { category in
            let entities = manifest.entities
                .filter { $0.category == category }
                .sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
            guard !entities.isEmpty else { return nil }
            return StructureNode(group: CategoryGroup(category: category,
                                                      title: title(for: category),
                                                      entities: entities))
        }
    }
}
