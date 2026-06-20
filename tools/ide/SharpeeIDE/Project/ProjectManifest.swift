// ProjectManifest.swift
// Swift mirror of the @sharpee/ide-protocol wire types (ADR-184): the project
// manifest emitted by `sharpee --introspect` (and, later, the Play bridge) and
// rendered as the Sharpee-aware project tree. The TS↔Swift language boundary
// precludes a direct import, so this Codable mirror is the single Swift decoder;
// the shared TS file in @sharpee/ide-protocol is the source of truth.
// Public interface: ProjectManifest.decode(from:), EntityNode, EntityCategory.
// Owner context: tools/ide — Project.

import Foundation

/// The Sharpee-aware project tree: a flat entity list plus a build-status header.
/// The IDE buckets into categories client-side from `EntityNode.category`.
struct ProjectManifest: Codable, Equatable {
    /// The schema version this Swift mirror is written against. Decoding rejects
    /// any manifest whose `schemaVersion` differs (the wire-contract gate).
    static let currentSchemaVersion = 1

    let schemaVersion: Int
    let story: String
    let generatedFrom: GeneratedFrom
    let entities: [EntityNode]

    enum GeneratedFrom: String, Codable, Equatable {
        case cli
        case bridge
    }

    /// A manifest rejected at decode time.
    enum DecodeError: Error, Equatable {
        /// The manifest's `schemaVersion` does not match `currentSchemaVersion`.
        case schemaVersionMismatch(found: Int, expected: Int)
    }

    /// Decode a manifest from `--introspect` / bridge JSON, enforcing the schema-version gate.
    /// - Throws: `DecodeError.schemaVersionMismatch` on a version mismatch, or a
    ///   `DecodingError` if the JSON does not match the wire shape.
    static func decode(from data: Data) throws -> ProjectManifest {
        let manifest = try JSONDecoder().decode(ProjectManifest.self, from: data)
        guard manifest.schemaVersion == currentSchemaVersion else {
            throw DecodeError.schemaVersionMismatch(found: manifest.schemaVersion,
                                                    expected: currentSchemaVersion)
        }
        return manifest
    }
}

/// Top-level project-tree categories. Doors/exits are not categories — they
/// surface under a room's `exits`.
enum EntityCategory: String, Codable, Equatable {
    case room
    case object
    case npc
    case region
}

/// One introspected world entity.
struct EntityNode: Codable, Equatable {
    let id: String
    let displayName: String
    let category: EntityCategory
    let traits: TraitSummary
    /// file:line from the tree-sitter name index; nil when unresolved or CLI-emitted.
    let source: SourceRef?
}

/// A resolved source location for an entity's creation site.
struct SourceRef: Codable, Equatable {
    let file: String
    let line: Int
    let resolution: Resolution

    /// `.scope` = fell back to the enclosing function (non-unique name).
    enum Resolution: String, Codable, Equatable {
        case exact
        case scope
    }
}

/// The IDE-relevant fields projected from an entity's traits, keyed by trait type.
/// Sparse: a field is nil when the entity does not carry that trait. Unknown traits
/// on the wire (the protocol's forward-compatible index signature) are ignored by
/// the synthesized decoder rather than failing the decode.
struct TraitSummary: Codable, Equatable {
    let identity: Identity?
    let room: Room?
    let container: Container?

    struct Identity: Codable, Equatable {
        let description: String?
    }

    /// Exit directions present — drives the "room with no exits" lint.
    struct Room: Codable, Equatable {
        let exits: [String]
    }

    /// Co-trait lint inputs (e.g. "lockable without openable").
    struct Container: Codable, Equatable {
        let openable: Bool
        let lockable: Bool
    }
}
