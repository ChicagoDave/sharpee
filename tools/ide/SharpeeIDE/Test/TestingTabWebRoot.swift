// TestingTabWebRoot.swift
// Locates the Testing tab's web bundle inside the app (ADR-301 D1): the
// `testing-tab/` folder reference copied into Contents/Resources by the build,
// holding index.html, tab.css and tab.js. Unlike the Play pane's bundle — which
// belongs to the author's story and lives in their project's dist/web/<id>/ —
// this one ships with the IDE and is the same for every project.
// Public interface: TestingTabWebRoot.directory(in:), indexURL(in:), missingNote.
// Owner context: tools/ide — Test.

import Foundation

enum TestingTabWebRoot {

    /// Folder name inside the app's Resources, and the last path component of
    /// the esbuild output directory. Both sides of that agreement are named
    /// here so a rename has one place to fail.
    static let folderName = "testing-tab"

    /// The bundled web root. Not guaranteed to exist — use `indexURL` to check.
    static func directory(in bundle: Bundle = .main) -> URL? {
        bundle.resourceURL?.appendingPathComponent(folderName, isDirectory: true)
    }

    /// The tab's `index.html` if it was bundled, else nil (the web build did not
    /// run — see `missingNote`).
    static func indexURL(in bundle: Bundle = .main) -> URL? {
        guard let index = directory(in: bundle)?.appendingPathComponent("index.html") else { return nil }
        return FileManager.default.fileExists(atPath: index.path) ? index : nil
    }

    /// What to show instead of the tab when the bundle is absent. A blank pane
    /// would read as "no tests"; this names the actual cause and its fix.
    static let missingNote =
        "The Testing tab's web bundle is missing from this build. "
        + "Run `node tools/ide/web/testing-tab/build.mjs` and rebuild the app."
}
