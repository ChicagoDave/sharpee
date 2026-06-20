// EntitySourceIndex.swift
// The source-position half of ADR-184: scans a story's TypeScript with tree-sitter
// (the ADR-182 grammar) for string-literal call arguments — an entity's creation/
// display name, including names threaded through factory wrappers like
// `createRoom('West of House', …)` — and records each name's file:line. Joining the
// runtime manifest's entities to these locations by display name resolves an entity
// to its definition site (click-to-open). This is a light syntactic index, NOT the
// deep trait-classification static analysis ADR-184 rejects.
// Public interface: EntitySourceIndex.build(...), sourceRef(for:), annotating(_:).
// Owner context: tools/ide — Project.

import Foundation
import SwiftTreeSitter
import TreeSitterTypeScript

struct EntitySourceIndex {

    /// One place a literal name appears as a call argument.
    struct Location: Equatable {
        let file: String   // absolute path
        let line: Int      // 1-based
    }

    /// name → every location it appears, in scan order.
    let locationsByName: [String: [Location]]

    /// Resolve a manifest entity's display name to a source reference: a unique match
    /// is `.exact`; multiple matches are ambiguous so the first is returned marked
    /// `.scope`; no match yields nil.
    func sourceRef(for name: String) -> SourceRef? {
        guard let locations = locationsByName[name], let first = locations.first else { return nil }
        let resolution: SourceRef.Resolution = locations.count == 1 ? .exact : .scope
        return SourceRef(file: first.file, line: first.line, resolution: resolution)
    }

    /// A copy of `manifest` with each entity's `source` filled in from this index.
    /// Entities whose display name is not indexed keep `source == nil`.
    func annotating(_ manifest: ProjectManifest) -> ProjectManifest {
        let entities = manifest.entities.map { entity in
            EntityNode(id: entity.id, displayName: entity.displayName, category: entity.category,
                       traits: entity.traits, source: sourceRef(for: entity.displayName))
        }
        return ProjectManifest(schemaVersion: manifest.schemaVersion, story: manifest.story,
                               generatedFrom: manifest.generatedFrom, entities: entities)
    }

    // MARK: - Build

    /// Build from in-memory (path, source) pairs — used by tests and by the directory scan.
    static func build(from files: [(path: String, source: String)]) -> EntitySourceIndex {
        guard let scanner = NameScanner() else { return EntitySourceIndex(locationsByName: [:]) }
        var map: [String: [Location]] = [:]
        for file in files {
            for hit in scanner.scan(file.source) {
                map[hit.name, default: []].append(Location(file: file.path, line: hit.line))
            }
        }
        return EntitySourceIndex(locationsByName: map)
    }

    /// Build by reading every `.ts`/`.tsx` file under `storyDirectory` (skipping build
    /// output and dependencies). Locations carry absolute paths.
    static func build(storyDirectory: URL) -> EntitySourceIndex {
        let files = tsFiles(under: storyDirectory).compactMap { url -> (String, String)? in
            guard let source = try? String(contentsOf: url, encoding: .utf8) else { return nil }
            return (url.path, source)
        }
        return build(from: files)
    }

    private static let skipDirectories: Set<String> = ["node_modules", "dist", "dist-esm"]

    private static func tsFiles(under root: URL) -> [URL] {
        let fm = FileManager.default
        guard let enumerator = fm.enumerator(at: root, includingPropertiesForKeys: nil) else { return [] }
        var result: [URL] = []
        for case let url as URL in enumerator {
            if skipDirectories.contains(url.lastPathComponent) {
                enumerator.skipDescendants()
                continue
            }
            if ["ts", "tsx", "mts", "cts"].contains(url.pathExtension.lowercased()) {
                result.append(url)
            }
        }
        return result
    }
}

/// Parses TypeScript and extracts string-literal call arguments with their line numbers.
/// One grammar + query, reused across files. Named to avoid Foundation.Scanner.
private final class NameScanner {

    private let parser = Parser()
    private let query: Query

    /// Captures any string literal that sits directly inside a call's `arguments`
    /// (so `createEntity('x', …)` and `createRoom('x', …)` both match; a string nested
    /// in an options object — e.g. `new IdentityTrait({ name: 'x' })` — does not).
    private static let querySource = "(arguments (string) @arg)"

    init?() {
        guard let config = try? LanguageConfiguration(tree_sitter_typescript(), name: "TypeScript"),
              (try? parser.setLanguage(config.language)) != nil,
              let data = Self.querySource.data(using: .utf8),
              let query = try? Query(language: config.language, data: data) else { return nil }
        self.query = query
    }

    func scan(_ source: String) -> [(name: String, line: Int)] {
        guard let tree = parser.parse(source) else { return [] }
        let ns = source as NSString
        let lineStarts = Self.lineStartOffsets(ns)

        var results: [(String, Int)] = []
        let captures = query.execute(in: tree).resolve(with: .init(string: source)).highlights()
        for namedRange in captures {
            let range = namedRange.range
            guard range.location >= 0, NSMaxRange(range) <= ns.length else { continue }
            guard let name = Self.unquote(ns.substring(with: range)) else { continue }
            results.append((name, Self.line(for: range.location, lineStarts: lineStarts)))
        }
        return results
    }

    /// Strips matching surrounding quotes (`'`, `"`, or a backtick). Returns nil if the
    /// text is not a simple quoted literal.
    private static func unquote(_ text: String) -> String? {
        guard text.count >= 2, let first = text.first, let last = text.last,
              first == last, "'\"`".contains(first) else { return nil }
        return String(text.dropFirst().dropLast())
    }

    /// UTF-16 offsets at which each line begins (index 0 = line 1).
    private static func lineStartOffsets(_ ns: NSString) -> [Int] {
        var starts = [0]
        ns.enumerateSubstrings(in: NSRange(location: 0, length: ns.length),
                               options: [.byLines, .substringNotRequired]) { _, _, enclosing, _ in
            let next = NSMaxRange(enclosing)
            if next < ns.length { starts.append(next) }
        }
        return starts
    }

    /// 1-based line for a UTF-16 offset (largest line-start ≤ offset).
    private static func line(for offset: Int, lineStarts: [Int]) -> Int {
        var low = 0, high = lineStarts.count - 1, result = 0
        while low <= high {
            let mid = (low + high) / 2
            if lineStarts[mid] <= offset { result = mid; low = mid + 1 } else { high = mid - 1 }
        }
        return result + 1
    }
}
