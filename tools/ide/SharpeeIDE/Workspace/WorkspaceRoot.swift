// WorkspaceRoot.swift
// Locates the Sharpee workspace root for a loaded project — the closest ancestor
// directory containing `build.sh`. Used by Build actions to set the spawned
// Process's working directory.
// Public interface: WorkspaceRoot.find(from:).
// Owner context: tools/ide — Workspace.

import Foundation

enum WorkspaceRoot {

    private static let marker = "build.sh"

    /// Returns the closest ancestor of `url` (inclusive of `url` itself) that contains
    /// a regular file named `build.sh`. URL is symlink-resolved before walking.
    /// Returns nil when no such ancestor exists.
    static func find(from url: URL) -> URL? {
        let fm = FileManager.default
        var current = url.resolvingSymlinksInPath()

        while true {
            let candidate = current.appendingPathComponent(marker)
            var isDir: ObjCBool = false
            if fm.fileExists(atPath: candidate.path, isDirectory: &isDir), !isDir.boolValue {
                return current
            }

            let parent = current.deletingLastPathComponent()
            // `URL.deletingLastPathComponent()` on "/" returns "/", so detect the fixpoint
            // and stop walking to avoid an infinite loop.
            if parent.path == current.path { return nil }
            current = parent
        }
    }
}
