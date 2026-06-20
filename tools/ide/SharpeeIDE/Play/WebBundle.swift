// WebBundle.swift
// Locates an author story project's browser bundle produced by `sharpee build` /
// `sharpee build-browser` at `<projectRoot>/dist/web/` (ADR-185). The Play pane
// loads index.html from here.
// Public interface: WebBundle.directory(projectRoot:), indexURL(projectRoot:).
// Owner context: tools/ide — Play.

import Foundation

enum WebBundle {

    /// The directory holding the project's browser bundle (read-access scope for WKWebView).
    /// Not guaranteed to exist — use `indexURL` to check.
    static func directory(projectRoot: URL) -> URL {
        projectRoot.appendingPathComponent("dist/web", isDirectory: true)
    }

    /// The bundle's `index.html` if it exists on disk, else nil (no browser client built —
    /// the project has no `src/browser-entry.ts`, or `sharpee build` hasn't run).
    static func indexURL(projectRoot: URL) -> URL? {
        let index = directory(projectRoot: projectRoot).appendingPathComponent("index.html")
        return FileManager.default.fileExists(atPath: index.path) ? index : nil
    }
}
