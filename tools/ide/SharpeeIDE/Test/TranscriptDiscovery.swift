// TranscriptDiscovery.swift
// Finds a story's `.transcript` files on disk, so the Testing tab can show the
// suite before it has ever been run — a blank pane reads as "no tests", which is
// a different and wrong claim.
//
// This is what survived `TestPanelModel`. That type conflated two jobs:
// discovering transcripts, and holding the outline panel's per-row run state.
// The panel is retired (the Testing tab renders runs now, ADR-301) and its run
// state went with it; discovery is still needed and had nothing to do with the
// panel.
//
// Only `tests/` is scanned. `walkthroughs/` is not: the chain run model is gone
// (ADR-302 D10 retires `--chain` for trees) and an IDE project does not have
// walkthroughs — they are a platform-repository shape, not an author's.
// Public interface: TranscriptDiscovery.transcripts(inStoryDirectory:).
// Owner context: tools/ide — Test.

import Foundation

enum TranscriptDiscovery {

    /// Every `.transcript` beneath the story's `tests/` subtree, sorted by path.
    ///
    /// Returns empty rather than throwing when the directory is absent — a story
    /// with no tests yet is an ordinary state, not an error.
    static func transcripts(inStoryDirectory storyDir: URL) -> [URL] {
        let testsDir = storyDir.appendingPathComponent("tests", isDirectory: true)
        let fileManager = FileManager.default
        guard fileManager.fileExists(atPath: testsDir.path) else { return [] }

        let enumerator = fileManager.enumerator(at: testsDir, includingPropertiesForKeys: nil)
        return (enumerator?.compactMap { $0 as? URL } ?? [])
            .filter { $0.pathExtension == "transcript" }
            .map(\.standardizedFileURL)
            .sorted { $0.path < $1.path }
    }
}
