// WebBundle.swift
// Locates a story's browser bundle produced by `sharpee build <file>.story`:
// `<projectRoot>/dist/web/<id>/` (ADR-252 D2), where `<id>` is the story's IR
// header id (ADR-258 D4) — never a bare `dist/web/`. The Play pane loads
// index.html from here; a story providing its own `browser/index.html` was
// already copied into the bundle by the build, so the IDE serves it as-is.
// Public interface: WebBundle.directory(projectRoot:storyId:),
// indexURL(projectRoot:storyId:).
// Owner context: tools/ide — Play.

import Foundation

enum WebBundle {

    /// The directory holding the story's browser bundle (read-access scope for
    /// WKWebView). Not guaranteed to exist — use `indexURL` to check.
    static func directory(projectRoot: URL, storyId: String) -> URL {
        projectRoot.appendingPathComponent("dist/web", isDirectory: true)
            .appendingPathComponent(storyId, isDirectory: true)
    }

    /// The bundle's `index.html` if it exists on disk, else nil (the story
    /// hasn't been built yet).
    static func indexURL(projectRoot: URL, storyId: String) -> URL? {
        let index = directory(projectRoot: projectRoot, storyId: storyId)
            .appendingPathComponent("index.html")
        return FileManager.default.fileExists(atPath: index.path) ? index : nil
    }
}
