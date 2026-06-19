// WebBundle.swift
// Locates a story's self-contained browser bundle produced by `./sharpee build <story>
// --browser` (dist/web/<story>/). The Play pane loads index.html from here.
// Public interface: WebBundle.directory(repoRoot:story:), indexURL(repoRoot:story:).
// Owner context: tools/ide — Play.

import Foundation

enum WebBundle {

    /// The directory holding the story's browser bundle (read-access scope for WKWebView).
    /// Not guaranteed to exist — use `indexURL` to check.
    static func directory(repoRoot: URL, story: String) -> URL {
        repoRoot
            .appendingPathComponent("dist/web", isDirectory: true)
            .appendingPathComponent(story, isDirectory: true)
    }

    /// The bundle's `index.html` if it exists on disk, else nil (story not built with --browser).
    static func indexURL(repoRoot: URL, story: String) -> URL? {
        let index = directory(repoRoot: repoRoot, story: story).appendingPathComponent("index.html")
        return FileManager.default.fileExists(atPath: index.path) ? index : nil
    }
}
