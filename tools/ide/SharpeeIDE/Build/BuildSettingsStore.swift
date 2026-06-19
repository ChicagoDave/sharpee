// BuildSettingsStore.swift
// Persists BuildSettings per project (keyed by project folder path) via UserDefaults.
// Per-project because SessionState is single-active-project and would lose build
// options on a project switch (mirrors the RecentProjectsStore injection pattern).
// Public interface: BuildSettingsStore (load/save/clear, each `for:` a project URL).
// Owner context: tools/ide — Build.

import Foundation

enum BuildSettingsStore {

    static let key = "SharpeeBuildSettings"

    /// Returns the stored settings for `project`, or `BuildSettings.default` when the
    /// project has no entry (or stored bytes fail to decode).
    static func load(for project: URL, from defaults: UserDefaults = .standard) -> BuildSettings {
        loadAll(from: defaults)[project.path] ?? .default
    }

    /// Persists `settings` for `project`, overwriting any prior entry for it and
    /// leaving every other project's entry untouched.
    static func save(_ settings: BuildSettings, for project: URL, to defaults: UserDefaults = .standard) {
        var all = loadAll(from: defaults)
        all[project.path] = settings
        write(all, to: defaults)
    }

    /// Removes `project`'s entry. No-op (no write) when the project has no entry.
    static func clear(for project: URL, from defaults: UserDefaults = .standard) {
        var all = loadAll(from: defaults)
        guard all.removeValue(forKey: project.path) != nil else { return }
        write(all, to: defaults)
    }

    /// The whole project→settings map. Returns [:] when nothing is stored or the
    /// bytes fail to decode.
    private static func loadAll(from defaults: UserDefaults) -> [String: BuildSettings] {
        guard let data = defaults.data(forKey: key),
              let map = try? JSONDecoder().decode([String: BuildSettings].self, from: data) else {
            return [:]
        }
        return map
    }

    private static func write(_ map: [String: BuildSettings], to defaults: UserDefaults) {
        guard let data = try? JSONEncoder().encode(map) else { return }
        defaults.set(data, forKey: key)
    }
}
