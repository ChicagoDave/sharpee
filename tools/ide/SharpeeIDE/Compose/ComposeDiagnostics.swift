// ComposeDiagnostics.swift
// The IDE's reading of the @sharpee/ide-protocol `compose --json` payload
// (ADR-258 D5/D6): the schema-version gate, the decode entry point, and the
// small conveniences the app reads the Story IR projection through.
// The wire SHAPES are not here — they are generated from the TypeScript
// contract into Generated/SharpeeProtocol.swift (ADR-341 D5), so a field
// renamed in @sharpee/chord or @sharpee/ide-protocol arrives by regeneration,
// and a rename that breaks the projection fails `repokit verify` rather than
// this decoder at runtime.
// Public interface: ComposeJsonPayload.decode(from:), ComposeStoryIR.allEntities
// /allActions/allHatches, ComposeStoryIR.Entity.hasKind(_:),
// ComposeStoryIR.PhraseBook.defaultLocaleNames, ComposeStoryIR.PhraseName.
// Owner context: tools/ide — Compose.

import Foundation

extension DiagnosticSpan {
    /// A span in the main story file — the overwhelmingly common case, and the
    /// shape every call site used before `file` joined the wire type.
    /// - Parameters:
    ///   - line: 1-based line of the first character.
    ///   - column: 1-based column of the first character.
    ///   - endLine: 1-based line of the last character (inclusive).
    ///   - endColumn: 1-based column just past the last character.
    init(line: Int, column: Int, endLine: Int, endColumn: Int) {
        self.init(file: nil, line: line, column: column, endLine: endLine, endColumn: endColumn)
    }
}

extension ComposeJsonPayload {
    /// The schema version this build is written against — mirrors
    /// `COMPOSE_JSON_SCHEMA_VERSION` in @sharpee/ide-protocol. Distinct from
    /// `ProjectManifest.currentSchemaVersion`: separate contracts version separately.
    /// 2 (ADR-298, 2026-08-03): `meta` reshaped to `{title, fields: IRStoryFields}`.
    static let currentSchemaVersion = 2

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

extension ComposeStoryIR {
    /// Entities as a non-optional list.
    var allEntities: [Entity] { entities ?? [] }
    /// Actions as a non-optional list.
    var allActions: [ActionDef] { actions ?? [] }
    /// Hatches as a non-optional list.
    var allHatches: [Hatch] { hatches ?? [] }
}

extension ComposeStoryIR.Entity {
    /// True when the entity declares membership in `kind` (`room`/`region`/`person`).
    func hasKind(_ kind: String) -> Bool { kinds.contains { $0.name == kind } }
}

extension ComposeStoryIR {
    /// One phrase key paired with its source location. A reading of the wire's
    /// `locale -> key -> {span}` map, not a wire shape of its own: the key is the
    /// map's key, so nothing on the wire carries this pairing.
    struct PhraseName: Equatable {
        let key: String
        let span: DiagnosticSpan?
    }
}

extension ComposeStoryIR.PhraseBook {
    /// Phrase names of the default locale, sorted for stable display (the Index's
    /// headline list). Phrase bodies stay opaque — prose belongs in the editor.
    var defaultLocaleNames: [ComposeStoryIR.PhraseName] {
        (locales[defaultLocale] ?? [:])
            .map { ComposeStoryIR.PhraseName(key: $0.key, span: $0.value.span) }
            .sorted { $0.key < $1.key }
    }
}
