// ProjectManifest.swift
// The IDE's reading of the @sharpee/ide-protocol project manifest (ADR-184):
// the schema-version gate and the decode entry point. The wire SHAPE is not
// here — it is generated from the TypeScript contract into
// Generated/SharpeeProtocol.swift (ADR-341 D5), so a field added or renamed in
// the protocol arrives by regeneration rather than by hand.
// What stays here is what the app decides, not what the wire says: which schema
// version this build understands, and that an unknown one is refused loudly.
// Public interface: ProjectManifest.decode(from:), ProjectManifest.DecodeError.
// Owner context: tools/ide — Project.

import Foundation

extension ProjectManifest {
    /// The schema version this build is written against. Decoding rejects any
    /// manifest whose `schemaVersion` differs (the wire-contract gate).
    static let currentSchemaVersion = 1

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
