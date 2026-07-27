// StoryTarget.swift
// The one definition of what the IDE can open (ADR-258 D2/D8): a `.story` file,
// or a folder holding one at its top level. Recents filtering, session
// restoration, and project loading all gate on this — a stale TypeScript
// project is dropped rather than offered and failing at open time.
// Public interface: StoryTarget.storyFile(in:), isStoryProject(_:).
// Owner context: tools/ide — Workspace.

import Foundation

enum StoryTarget {

    /// The `.story` file the folder is organized around: prefers one named after
    /// the folder, else the alphabetically first at the top level. Nil for a
    /// non-Chord folder.
    static func storyFile(in url: URL) -> URL? {
        let fm = FileManager.default
        guard let entries = try? fm.contentsOfDirectory(at: url, includingPropertiesForKeys: nil,
                                                        options: [.skipsHiddenFiles]) else { return nil }
        let stories = entries.filter { $0.pathExtension == "story" }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
        let folderNamed = stories.first { $0.deletingPathExtension().lastPathComponent == url.lastPathComponent }
        return folderNamed ?? stories.first
    }

    /// True when `url` is something the IDE opens (D2): a `.story` file, or a
    /// folder containing one. False for anything else — including an ADR-185-era
    /// TypeScript story project (D8: dropped, never offered-then-failing).
    static func isStoryProject(_ url: URL) -> Bool {
        var isDir: ObjCBool = false
        guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir) else { return false }
        if !isDir.boolValue { return url.pathExtension == "story" }
        return storyFile(in: url) != nil
    }
}
