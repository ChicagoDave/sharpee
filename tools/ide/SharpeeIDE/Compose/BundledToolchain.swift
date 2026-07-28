// BundledToolchain.swift
// Locates the Sharpee toolchain Chord Writer ships inside its own app bundle
// (ADR-279 D4): a vendored Node runtime plus the `@sharpee/devkit` CLI under
// `Contents/Resources/toolchain`, assembled at build time by
// `tools/ide/vendor-toolchain.sh`. This is the THIRD and last tier of
// `ComposeRunner.resolveSharpee` — the fallback that makes Cmd-B work on a
// machine with no Node, no npm, and no Sharpee checkout.
// Public interface: BundledToolchain.executable(in:), relativeShimPath.
// Owner context: tools/ide — Compose.

import Foundation

/// The toolchain shipped inside the app bundle. Pure path resolution — spawning
/// is ComposeRunner's job, and a missing bundle is a `nil`, never a throw:
/// a dev build assembled without the vendor step is a legitimate state (the
/// shim and PATH tiers still resolve), so absence must stay non-fatal.
@MainActor
enum BundledToolchain {

    /// Where the shim sits relative to the bundle's `Resources` directory.
    /// The shim — not the Node binary — is the entry point: it exports the
    /// `NODE_PATH` that lets the sealed CLI resolve `@sharpee/*` and esbuild
    /// out of its own `node_modules` rather than the author's project.
    static let relativeShimPath = "toolchain/bin/sharpee"

    /// The bundled `sharpee` shim, or nil when this build carries no toolchain.
    ///
    /// - Parameter bundle: the bundle to search; defaults to the running app.
    ///   Tests inject a `Bundle`-free root via `executable(resourcesURL:)`.
    /// - Returns: the shim URL when it exists AND is executable, else nil.
    ///   A present-but-non-executable shim is treated as absent: a resource
    ///   that lost its `+x` bit in packaging cannot be spawned, and reporting
    ///   it as found would trade a clear "toolchain not found" for an opaque
    ///   launch failure deeper in ComposeRunner.
    static func executable(in bundle: Bundle = .main) -> URL? {
        executable(resourcesURL: bundle.resourceURL)
    }

    /// Resolution against an explicit `Resources` directory — the seam tests
    /// drive, so the bundled tier is exercised without a packaged .app.
    static func executable(resourcesURL: URL?) -> URL? {
        guard let resourcesURL else { return nil }
        let shim = resourcesURL.appendingPathComponent(relativeShimPath)
        return FileManager.default.isExecutableFile(atPath: shim.path) ? shim : nil
    }
}
