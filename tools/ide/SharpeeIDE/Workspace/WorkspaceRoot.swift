// WorkspaceRoot.swift
// Locates the Sharpee monorepo root for a loaded project — the closest ancestor
// directory carrying the monorepo signature (`pnpm-workspace.yaml` + `packages/core`).
// Used by Build actions to set the working directory for the `./sharpee` CLI
// (ADR-180; the old `build.sh` marker was retired with that script).
// Public interface: WorkspaceRoot.find(from:).
// Owner context: tools/ide — Workspace.

import Foundation

enum WorkspaceRoot {

    /// The Sharpee monorepo signature, mirroring devkit's `findMonorepoRoot`
    /// (packages/devkit/src/repo.ts): a directory containing BOTH a
    /// `pnpm-workspace.yaml` file AND a `packages/core` directory. Requiring both
    /// avoids mistaking an author's coincidental pnpm workspace for the monorepo.
    private static let workspaceFile = "pnpm-workspace.yaml"
    private static let packagesCoreDir = "packages/core"

    /// Returns the closest ancestor of `url` (inclusive of `url` itself) that is the
    /// Sharpee monorepo root. URL is symlink-resolved before walking. Returns nil
    /// when no ancestor up to the filesystem root carries the signature.
    static func find(from url: URL) -> URL? {
        let fm = FileManager.default
        var current = url.resolvingSymlinksInPath()

        while true {
            if isMonorepoRoot(current, fm: fm) { return current }

            // Stop at the filesystem root. We must check `current.path == "/"`
            // explicitly rather than the `deletingLastPathComponent()` fixpoint:
            // for a directory-style file URL (trailing slash), that call yields a
            // growing `/../` path at root instead of converging, which would spin
            // forever and balloon memory. The walk reaches a URL whose path is
            // exactly "/" before that can happen.
            if current.path == "/" { return nil }
            current = current.deletingLastPathComponent()
        }
    }

    /// True iff `dir` holds a regular `pnpm-workspace.yaml` file AND a `packages/core`
    /// directory. A directory merely *named* `pnpm-workspace.yaml` does not qualify.
    private static func isMonorepoRoot(_ dir: URL, fm: FileManager) -> Bool {
        let workspace = dir.appendingPathComponent(workspaceFile)
        var workspaceIsDir: ObjCBool = false
        guard fm.fileExists(atPath: workspace.path, isDirectory: &workspaceIsDir),
              !workspaceIsDir.boolValue else { return false }

        let core = dir.appendingPathComponent(packagesCoreDir)
        var coreIsDir: ObjCBool = false
        return fm.fileExists(atPath: core.path, isDirectory: &coreIsDir) && coreIsDir.boolValue
    }
}
