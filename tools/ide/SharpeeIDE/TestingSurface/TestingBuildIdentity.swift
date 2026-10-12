// TestingBuildIdentity.swift
// The build id the Testing tab's staleness contract compares (ADR-357 D11):
// what a run EXECUTES, not the web bundle. A run spawns `sharpee test` on the
// story's source, so the id hashes two things — every story source file under
// the project (the `.story` file and every `.chord` file, imports not
// followed; hashing an unused file errs the safe way, marking a result stale
// that could have stayed current) and the CLI executable the host spawns,
// resolved to its file: path, size and modification time, because a version
// string does not move while the platform is rebuilt locally.
//
// Computed BEFORE the spawn, never after: if the author saves between the hash
// and the spawn, the baseline holds the old id while the run compiled the new
// source, and the result shows stale — the safe direction.
//
// Public interface: TestingBuildIdentity.compute(projectRoot:executable:),
//   TestingBuildIdentity.sourceFiles(under:).
// Owner context: tools/ide — TestingSurface.

import CryptoKit
import Foundation

enum TestingBuildIdentity {

    /// Directories a project may hold that are never story source.
    private static let skippedDirectories: Set<String> = ["node_modules", "dist", ".git", "DerivedData"]

    /// The story source files under a project root, sorted by their path
    /// relative to the root so the hash is stable across enumeration order.
    static func sourceFiles(under projectRoot: URL) -> [URL] {
        let fm = FileManager.default
        let root = projectRoot.standardizedFileURL
        guard let enumerator = fm.enumerator(at: root,
                                             includingPropertiesForKeys: [.isDirectoryKey, .nameKey],
                                             options: [.skipsHiddenFiles]) else { return [] }
        var files: [URL] = []
        for case let url as URL in enumerator {
            let values = try? url.resourceValues(forKeys: [.isDirectoryKey, .nameKey])
            if values?.isDirectory == true {
                let name = values?.name ?? url.lastPathComponent
                if skippedDirectories.contains(name) || name.hasSuffix(".tests") {
                    enumerator.skipDescendants()
                }
                continue
            }
            let ext = url.pathExtension
            if ext == "story" || ext == "chord" { files.append(url.standardizedFileURL) }
        }
        return files.sorted { relativePath($0, to: root) < relativePath($1, to: root) }
    }

    /// The build id: a SHA-256 hex digest over the source files' relative
    /// paths and bytes, then the executable's path, size and modification
    /// time. `nil` only when the root has no source file at all, which is a
    /// project the run could not compile either.
    ///
    /// - Parameters:
    ///   - projectRoot: the directory holding the `.story` file.
    ///   - executable: the CLI the host will spawn, resolved; nil hashes the
    ///     sources alone (a host that cannot find the CLI will not run anyway).
    static func compute(projectRoot: URL, executable: URL?) -> String? {
        let root = projectRoot.standardizedFileURL
        let files = sourceFiles(under: root)
        guard !files.isEmpty else { return nil }
        var hasher = SHA256()
        for file in files {
            hasher.update(data: Data(relativePath(file, to: root).utf8))
            hasher.update(data: Data([0]))
            hasher.update(data: (try? Data(contentsOf: file)) ?? Data())
            hasher.update(data: Data([0]))
        }
        if let executable {
            let path = executable.standardizedFileURL.path
            let attributes = try? FileManager.default.attributesOfItem(atPath: path)
            let size = (attributes?[.size] as? NSNumber)?.int64Value ?? -1
            let modified = (attributes?[.modificationDate] as? Date)?.timeIntervalSince1970 ?? -1
            hasher.update(data: Data("\(path)\u{0}\(size)\u{0}\(modified)".utf8))
        }
        return hasher.finalize().map { String(format: "%02x", $0) }.joined()
    }

    private static func relativePath(_ url: URL, to root: URL) -> String {
        let rootPath = root.path.hasSuffix("/") ? root.path : root.path + "/"
        let path = url.standardizedFileURL.path
        return path.hasPrefix(rootPath) ? String(path.dropFirst(rootPath.count)) : path
    }
}
