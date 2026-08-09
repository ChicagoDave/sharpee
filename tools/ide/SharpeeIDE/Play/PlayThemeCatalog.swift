// PlayThemeCatalog.swift
// The built-in theme set the Play pane offers as IDE chrome (go-live Phase 6b):
// Classic (the client's `:root` baseline, no CSS file) plus every theme in the
// vendored platform-browser mirror (Resources/play-themes/manifest.json).
// The catalog is what the story COULD wear, not what it ships — the picker
// deliberately ignores the story's own `themes:` list.
// Public interface: PlayTheme; PlayThemeCatalog.themes(inResources:),
// PlayThemeCatalog.classic.
// Owner context: tools/ide — Play.

import Foundation

/// One pickable play-surface theme.
struct PlayTheme: Equatable {
    /// The `data-theme` attribute value the client's CSS scopes by.
    let id: String
    /// The human-readable menu label.
    let name: String
}

enum PlayThemeCatalog {

    /// The client's `:root` baseline — always offered, never in the manifest.
    static let classic = PlayTheme(id: "classic", name: "Classic")

    /// Classic plus the vendored built-ins, manifest order normalized to
    /// name-alphabetical (JSON object order is not a contract). An unreadable
    /// or absent manifest degrades to Classic alone rather than throwing:
    /// a build without the mirror still has a working Play pane.
    ///
    /// - Parameter resourcesURL: the app bundle's Resources directory
    ///   (tests inject a fixture directory).
    static func themes(inResources resourcesURL: URL?) -> [PlayTheme] {
        [classic] + builtIns(inResources: resourcesURL)
    }

    /// The CSS link hrefs (relative to the play page, `themes/<file>`) the
    /// surface script injects so every catalog theme has its stylesheet
    /// whether or not the story shipped it.
    static func stylesheetPaths(inResources resourcesURL: URL?) -> [String] {
        manifestEntries(inResources: resourcesURL)
            .filter { $0.key != classic.id }
            .compactMap { $0.value.css }
            .sorted()
            .map { "themes/\($0)" }
    }

    private struct ManifestEntry: Decodable {
        let name: String
        let css: String?
    }

    private struct Manifest: Decodable {
        let themes: [String: ManifestEntry]
    }

    private static func manifestEntries(inResources resourcesURL: URL?) -> [String: ManifestEntry] {
        guard let resourcesURL else { return [:] }
        let manifestURL = resourcesURL
            .appendingPathComponent("play-themes/manifest.json")
        guard let data = try? Data(contentsOf: manifestURL),
              let manifest = try? JSONDecoder().decode(Manifest.self, from: data) else {
            return [:]
        }
        return manifest.themes
    }

    private static func builtIns(inResources resourcesURL: URL?) -> [PlayTheme] {
        manifestEntries(inResources: resourcesURL)
            .map { PlayTheme(id: $0.key, name: $0.value.name) }
            .filter { $0.id != classic.id }
            .sorted { $0.name < $1.name }
    }
}
