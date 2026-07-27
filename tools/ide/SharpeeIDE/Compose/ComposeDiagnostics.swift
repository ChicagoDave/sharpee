// ComposeDiagnostics.swift
// Swift mirror of the @sharpee/ide-protocol `compose --json` wire contract
// (ADR-258 D5): the versioned payload `sharpee compose --json` writes to stdout —
// one diagnostics stream (compile records with full spans, hatch records with
// file+line only) plus, when the compile succeeded, the Story IR the project
// tree is sourced from (D6). The TS↔Swift boundary precludes a direct import,
// so this Codable mirror is the single Swift decoder; compose-diagnostics.ts in
// @sharpee/ide-protocol is the source of truth.
// Public interface: ComposeJsonPayload.decode(from:), ComposeDiagnosticRecord,
// ComposeSeverity, DiagnosticSpan, ComposeStoryIR.
// Owner context: tools/ide — Compose.

import Foundation

/// Diagnostic severity on the wire. Chord reports both; both reach Problems (D5).
enum ComposeSeverity: String, Codable, Equatable, Sendable {
    case error
    case warning
}

/// A full source span (1-based line/column, inclusive start, exclusive end column) —
/// the underline range the editor marks, present on compile diagnostics only.
struct DiagnosticSpan: Codable, Equatable, Sendable {
    let line: Int
    let column: Int
    let endLine: Int
    let endColumn: Int
}

/// One record in the payload's unified diagnostics stream (ADR-276 D4).
/// `span` is present exactly for compile diagnostics — hatch findings
/// (`hatch.*` codes) carry a file+line site only.
struct ComposeDiagnosticRecord: Codable, Equatable, Sendable {
    let severity: ComposeSeverity
    /// Stable machine code — `parse.*`/`analysis.*`, or `hatch.*` for lint findings.
    let code: String
    let message: String
    /// Site file: the `.story` file for compile diagnostics, the hatch module for hatch findings.
    let file: String
    /// 1-based line of the site.
    let line: Int
    /// Full source span — compile diagnostics only (the underline range, ADR-258 D5).
    let span: DiagnosticSpan?
}

/// The subset of the Story IR the IDE reads. Decoded with Codable's default
/// ignore-unknown-fields behavior, so the wire IR may carry more; fields the
/// tree needs land here as later phases consume them (ADR-258 D6).
struct ComposeStoryIR: Codable, Equatable, Sendable {
    let format: String
    /// Chord LANGUAGE version that compiled this story (ADR-257, informational).
    let languageVersion: String
    let meta: Meta
    /// Present exactly when the source carried a `grammar` header (ADR-269 D8):
    /// the file is a grammar file — Build and Play are disabled for it (D2).
    let grammarFile: GrammarFile?
    /// Authored entities, each with its exact source span (D6 navigation).
    /// Optional on the wire for robustness; read via `allEntities`.
    let entities: [Entity]?
    /// `define action` blocks — the tree content for grammar files (D2 amendment).
    let actions: [ActionDef]?

    /// Entities as a non-optional list.
    var allEntities: [Entity] { entities ?? [] }
    /// Actions as a non-optional list.
    var allActions: [ActionDef] { actions ?? [] }

    struct Meta: Codable, Equatable, Sendable {
        let title: String
        let author: String
        /// Raw header fields (`id`, `version`, `blurb`, ...). `fields["id"]` names
        /// the `dist/web/<id>/` bundle directory (D4).
        let fields: [String: String]
    }

    struct GrammarFile: Codable, Equatable, Sendable {
        let name: String
    }

    /// One authored entity: name, kind memberships, player marker, and the exact
    /// span of its `create` block.
    struct Entity: Codable, Equatable, Sendable {
        let id: String
        let name: String
        let isPlayer: Bool
        let kinds: [Kind]
        let span: DiagnosticSpan

        /// True when the entity declares membership in `kind` (`room`/`region`/`person`).
        func hasKind(_ kind: String) -> Bool { kinds.contains { $0.name == kind } }
    }

    /// A kind membership (`a room`, `a person`, ...). Extra wire fields ignored.
    struct Kind: Codable, Equatable, Sendable {
        let name: String
    }

    /// A `define action` block with its exact span.
    struct ActionDef: Codable, Equatable, Sendable {
        let name: String
        let span: DiagnosticSpan
    }
}

/// The `compose --json` stdout payload (ADR-258 D5).
struct ComposeJsonPayload: Codable, Equatable, Sendable {
    /// The schema version this Swift mirror is written against — mirrors
    /// `COMPOSE_JSON_SCHEMA_VERSION` in @sharpee/ide-protocol. Distinct from
    /// `ProjectManifest.currentSchemaVersion` (separate contracts version separately).
    static let currentSchemaVersion = 1

    let schemaVersion: Int
    /// The one diagnostics stream: compile diagnostics first, then hatch records.
    let diagnostics: [ComposeDiagnosticRecord]
    /// Present iff the compile succeeded and the mode emits IR (`--json` without
    /// `--check`); never carries a non-`ok` IR (atomic load, ADR-210).
    let ir: ComposeStoryIR?

    /// A payload rejected at decode time.
    enum DecodeError: Error, Equatable {
        /// The payload's `schemaVersion` does not match `currentSchemaVersion` —
        /// the visible "IDE is out of date for this toolchain" state (D5).
        case schemaVersionMismatch(found: Int, expected: Int)
    }

    /// Decode a payload from `compose --json` stdout, enforcing the schema-version
    /// gate BEFORE shape decoding — a future-version payload whose shape has
    /// changed still reports the version mismatch, never a partial decode.
    /// - Throws: `DecodeError.schemaVersionMismatch` on a version mismatch, or a
    ///   `DecodingError` if the JSON does not match the wire shape.
    static func decode(from data: Data) throws -> ComposeJsonPayload {
        struct VersionProbe: Codable { let schemaVersion: Int }
        let probe = try JSONDecoder().decode(VersionProbe.self, from: data)
        guard probe.schemaVersion == currentSchemaVersion else {
            throw DecodeError.schemaVersionMismatch(found: probe.schemaVersion,
                                                    expected: currentSchemaVersion)
        }
        return try JSONDecoder().decode(ComposeJsonPayload.self, from: data)
    }
}
