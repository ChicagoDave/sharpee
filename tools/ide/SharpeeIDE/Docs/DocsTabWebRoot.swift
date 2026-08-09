// DocsTabWebRoot.swift
// Locates the Documentation tab's web bundle inside the app: the `docs-tab/`
// folder reference copied into Contents/Resources by the build, holding
// index.html, docs.css, docs.js, docs-index.json and pages/. Like the Testing
// tab's bundle and unlike the Play pane's, this ships WITH the IDE and is the
// same for every project — it is sharpee.net's author documentation as of the
// commit the app was built from (go-live Phase 2's decision).
// Public interface: DocsTabWebRoot.folderName, directory(in:), indexURL(in:),
// bundledChordVersion(in:), missingNote.
// Owner context: tools/ide — Docs.

import Foundation

enum DocsTabWebRoot {

    /// Folder name inside the app's Resources, and the last path component of
    /// the bundler's output directory. Both sides of that agreement are named
    /// here so a rename has one place to fail.
    static let folderName = "docs-tab"

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

    /// The Chord language version the bundled corpus documents, read from the
    /// index the bundler wrote.
    ///
    /// The page compares this against what the installed toolchain reports and
    /// says so when they differ: documentation for a language the compiler in
    /// the box does not speak is worse than none.
    ///
    /// - Returns: the version string, or nil when the bundle is absent or its
    ///   index cannot be read.
    static func bundledChordVersion(in bundle: Bundle = .main) -> String? {
        guard let indexFile = directory(in: bundle)?.appendingPathComponent("docs-index.json"),
              let data = try? Data(contentsOf: indexFile),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let version = object["chordLanguageVersion"] as? String,
              !version.isEmpty
        else { return nil }
        return version
    }

    /// What to show instead of the tab when the bundle is absent. A blank pane
    /// would read as "no documentation"; this names the actual cause and its fix.
    static let missingNote =
        "The Documentation tab's bundle is missing from this build. "
        + "Run `node tools/ide/web/docs-tab/build.mjs` and rebuild the app."
}
