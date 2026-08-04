// SkeinStore.swift
// Reads and writes the committed `stories/<name>/play-testing/<name>.skein`
// artifact (ADR-299 D7). The file is JSON — pretty-printed with sorted keys so
// the committed artifact diffs cleanly — and carries a `schemaVersion` the
// reader gates BEFORE shape decode (the ComposeDiagnostics/TestResultRecord
// convention): an unknown version is rejected loudly with no partial load
// (AC-7), never quietly half-read.
// Public interface: SkeinStore.read(from:), SkeinStore.write(_:to:),
// SkeinStore.url(forStoryId:projectRoot:), SkeinStore.DecodeError,
// SkeinStore.playTestingDirectory, SkeinStore.fileExtension.
// Owner context: tools/ide — Skein persistence. UI-free; safe to unit-test.

import Foundation

enum SkeinStore {

    /// The project-relative folder the skein lives in (D7) — also the folder
    /// name `ProjectArtifacts` classifies into the Play Testing group.
    static let playTestingDirectory = "play-testing"

    static let fileExtension = "skein"

    /// A file rejected at read time.
    enum DecodeError: Error, Equatable, LocalizedError {
        /// The file's `schemaVersion` does not match
        /// `SkeinDocument.currentSchemaVersion` — the visible "this IDE does
        /// not read this skein format" state (AC-7). Nothing is loaded.
        case schemaVersionMismatch(found: Int, expected: Int)

        var errorDescription: String? {
            switch self {
            case .schemaVersionMismatch(let found, let expected):
                return "This skein file is format v\(found); this IDE reads v\(expected)."
            }
        }
    }

    /// The canonical location for `storyId`'s skein:
    /// `<projectRoot>/play-testing/<storyId>.skein` (D7).
    static func url(forStoryId storyId: String, projectRoot: URL) -> URL {
        projectRoot
            .appendingPathComponent(playTestingDirectory, isDirectory: true)
            .appendingPathComponent(storyId)
            .appendingPathExtension(fileExtension)
    }

    /// Decode the skein at `url`, enforcing the schema-version gate before
    /// shape decoding.
    ///
    /// - Throws: `DecodeError.schemaVersionMismatch` on a version mismatch
    ///   (no partial load — AC-7); a `DecodingError` when the JSON does not
    ///   match the v1 shape; the file-read error when the file is unreadable.
    static func read(from url: URL) throws -> SkeinDocument {
        let data = try Data(contentsOf: url)
        struct VersionProbe: Codable { let schemaVersion: Int }
        let decoder = JSONDecoder()
        let probe = try decoder.decode(VersionProbe.self, from: data)
        guard probe.schemaVersion == SkeinDocument.currentSchemaVersion else {
            throw DecodeError.schemaVersionMismatch(found: probe.schemaVersion,
                                                    expected: SkeinDocument.currentSchemaVersion)
        }
        return try decoder.decode(SkeinDocument.self, from: data)
    }

    /// Write `document` to `url` atomically, creating the parent directory
    /// (the `play-testing/` folder on first save) when it does not exist.
    ///
    /// - Throws: the directory-creation or file-write error; encoding a
    ///   `SkeinDocument` itself cannot fail (pure Codable value types).
    static func write(_ document: SkeinDocument, to url: URL) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let data = try encoder.encode(document)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try data.write(to: url, options: .atomic)
    }
}
