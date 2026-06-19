// PackageDetector.swift
// Discovers workspace package short-names under a monorepo root — the basename of
// every direct child of `packages/` that carries a package.json. These populate the
// Build Settings "Skip from" dropdown (passed as `./sharpee build --skip <pkg>`).
// Public interface: PackageDetector.detect(in:).
// Owner context: tools/ide — Workspace.

import Foundation

enum PackageDetector {

    /// Detects workspace package short-names under `repoRoot/packages` (direct children
    /// containing a package.json), sorted alphabetically. Returns [] when `packages/`
    /// is absent. Only top-level packages are listed (nested ones like
    /// `extensions/basic-combat` are out of scope for the skip dropdown).
    static func detect(in repoRoot: URL) -> [String] {
        let fm = FileManager.default
        let dir = repoRoot.appendingPathComponent("packages")
        guard let entries = try? fm.contentsOfDirectory(
            at: dir, includingPropertiesForKeys: [.isDirectoryKey]) else { return [] }
        return entries
            .filter { containsPackageJSON($0, fm: fm) }
            .map { $0.lastPathComponent }
            .sorted()
    }

    /// True iff `dir` is a directory containing a `package.json`.
    private static func containsPackageJSON(_ dir: URL, fm: FileManager) -> Bool {
        var isDir: ObjCBool = false
        guard fm.fileExists(atPath: dir.path, isDirectory: &isDir), isDir.boolValue else { return false }
        return fm.fileExists(atPath: dir.appendingPathComponent("package.json").path)
    }
}
