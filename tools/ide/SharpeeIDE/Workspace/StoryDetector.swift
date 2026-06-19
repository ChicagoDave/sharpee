// StoryDetector.swift
// Discovers buildable stories under a monorepo root — every direct child of
// `stories/` and `tutorials/` that carries a package.json. The story `name` is the
// positional argument passed to `./sharpee build <name>`.
// Public interface: DetectedStory, StoryDetector.detect(in:).
// Owner context: tools/ide — Workspace.

import Foundation

/// A story discovered under the monorepo. `name` (the directory basename) is the
/// `./sharpee build <name>` positional argument; `kind` distinguishes the two roots.
struct DetectedStory: Equatable {
    enum Kind: String { case story, tutorial }
    let name: String
    let kind: Kind
}

enum StoryDetector {

    /// Detects buildable stories under `repoRoot`: every direct child of `stories/`
    /// and `tutorials/` that contains a package.json. Stories first, then tutorials
    /// (matching devkit's name-resolution priority); each group sorted by name.
    /// Returns [] when neither directory exists.
    static func detect(in repoRoot: URL) -> [DetectedStory] {
        scan(repoRoot.appendingPathComponent("stories"), kind: .story)
            + scan(repoRoot.appendingPathComponent("tutorials"), kind: .tutorial)
    }

    private static func scan(_ dir: URL, kind: DetectedStory.Kind) -> [DetectedStory] {
        let fm = FileManager.default
        guard let entries = try? fm.contentsOfDirectory(
            at: dir, includingPropertiesForKeys: [.isDirectoryKey]) else { return [] }
        return entries
            .filter { containsPackageJSON($0, fm: fm) }
            .map { DetectedStory(name: $0.lastPathComponent, kind: kind) }
            .sorted { $0.name < $1.name }
    }

    /// True iff `dir` is a directory containing a `package.json`.
    private static func containsPackageJSON(_ dir: URL, fm: FileManager) -> Bool {
        var isDir: ObjCBool = false
        guard fm.fileExists(atPath: dir.path, isDirectory: &isDir), isDir.boolValue else { return false }
        return fm.fileExists(atPath: dir.appendingPathComponent("package.json").path)
    }
}
