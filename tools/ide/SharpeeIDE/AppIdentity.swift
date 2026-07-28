// AppIdentity.swift
// The app's own identity and version line (ADR-279 D1): the product is "Chord
// Writer", versioned independently of the platform, with the toolchain's
// Sharpee/Chord versions DISPLAYED alongside rather than encoded into the app
// version. This replaces the hardcoded "main · Sharpee 0.1.0" status-bar label
// carried as an open item since ADR-258.
// Public interface: AppIdentity.productName, version, statusBarLabel(...),
// aboutToolchainLine(...).
// Owner context: tools/ide — app shell.

import Foundation

enum AppIdentity {

    /// The user-facing product name. The Xcode target and Swift module remain
    /// `SharpeeIDE` — an internal identifier that never reaches the UI.
    static let productName = "Chord Writer"

    /// Chord Writer's own version line, read from the bundle
    /// (`CFBundleShortVersionString`, set in `project.yml`). The fallback only
    /// applies to a bundle-less host such as a unit-test runner.
    static var version: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
            ?? "0.0.0"
    }

    /// The status-bar version line: the app's version, then whatever the
    /// resolved toolchain reported. Unknown toolchain components are omitted
    /// rather than rendered as a placeholder — a missing toolchain is diagnosed
    /// by the compose/build paths, and the status bar should not double as an
    /// error surface.
    ///
    /// - Both known: `Chord Writer 1.0.0 · Sharpee 4.2.0 / Chord 2.1.0`
    /// - Neither known: `Chord Writer 1.0.0`
    static func statusBarLabel(appVersion: String,
                               sharpeeVersion: String?,
                               chordVersion: String?) -> String {
        var line = "\(productName) \(appVersion)"
        var toolchain: [String] = []
        if let sharpeeVersion { toolchain.append("Sharpee \(sharpeeVersion)") }
        if let chordVersion { toolchain.append("Chord \(chordVersion)") }
        if !toolchain.isEmpty {
            line += " · " + toolchain.joined(separator: " / ")
        }
        return line
    }

    /// The toolchain line shown in the About panel beneath the app version.
    /// Unlike the status bar, About states the absence outright — a panel the
    /// author deliberately opened should answer "which toolchain?", not go quiet.
    static func aboutToolchainLine(sharpeeVersion: String?, chordVersion: String?) -> String {
        var parts: [String] = []
        if let sharpeeVersion { parts.append("Sharpee \(sharpeeVersion)") }
        if let chordVersion { parts.append("Chord \(chordVersion)") }
        return parts.isEmpty ? "No Sharpee toolchain resolved."
                             : parts.joined(separator: " · ")
    }
}
