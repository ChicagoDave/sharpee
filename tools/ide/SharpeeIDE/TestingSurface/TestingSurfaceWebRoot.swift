// TestingSurfaceWebRoot.swift
// Locates the testing play surface's web bundle inside the app (ADR-306
// Phase 3): the `testing-surface/` folder reference copied into
// Contents/Resources by the build, holding surface.js and surface.css. Like
// the Testing tab's bundle — and unlike the story's own web bundle — this one
// ships with the IDE and is the same for every project; the Play scheme
// handler serves it into the testing page under `ide-testing-surface/…`.
// Public interface: TestingSurfaceWebRoot.directory(in:), scriptURL(in:),
// missingNote.
// Owner context: tools/ide — TestingSurface.

import Foundation

enum TestingSurfaceWebRoot {

    /// Folder name inside the app's Resources, and the last path component of
    /// the esbuild output directory. Both sides of that agreement are named
    /// here so a rename has one place to fail.
    static let folderName = "testing-surface"

    /// The bundled web root. Not guaranteed to exist — use `scriptURL` to check.
    static func directory(in bundle: Bundle = .main) -> URL? {
        bundle.resourceURL?.appendingPathComponent(folderName, isDirectory: true)
    }

    /// The surface's `surface.js` if it was bundled, else nil (the web build
    /// did not run — see `missingNote`).
    static func scriptURL(in bundle: Bundle = .main) -> URL? {
        guard let script = directory(in: bundle)?.appendingPathComponent("surface.js") else { return nil }
        return FileManager.default.fileExists(atPath: script.path) ? script : nil
    }

    /// What to show instead of the surface when the bundle is absent. A bare
    /// play page would read as "the cards are broken"; this names the actual
    /// cause and its fix.
    static let missingNote =
        "The testing surface's web bundle is missing from this build. "
        + "Run `node tools/ide/web/testing-surface/build.mjs` and rebuild the app."
}
