// RecentProjectsStore.swift
// Persists the File → Open Recent list — an LRU-ordered, deduplicated, capped
// list of project folder URLs — via UserDefaults.
// Public interface: RecentProjectsStore (load/push/remove/clear).
// Owner context: tools/ide — Persistence.

import Foundation

enum RecentProjectsStore {

    static let key = "SharpeeRecentProjects"

    /// Maximum number of entries retained. Newer entries push older ones out.
    static let maxCount = 10

    /// Reads the persisted recent-project list. Returns [] when nothing is
    /// stored or when stored bytes fail to decode.
    static func load(from defaults: UserDefaults = .standard) -> [URL] {
        guard let data = defaults.data(forKey: key),
              let urls = try? JSONDecoder().decode([URL].self, from: data) else {
            return []
        }
        return urls
    }

    /// Moves `url` to the front of the list. If `url` was already present,
    /// the prior occurrence is removed (no duplicates). The list is trimmed
    /// from the tail to `maxCount`.
    static func push(_ url: URL, to defaults: UserDefaults = .standard) {
        var list = load(from: defaults)
        list.removeAll { $0 == url }
        list.insert(url, at: 0)
        if list.count > maxCount {
            list = Array(list.prefix(maxCount))
        }
        write(list, to: defaults)
    }

    /// Drops `url` from the list. No-op when `url` is absent.
    static func remove(_ url: URL, from defaults: UserDefaults = .standard) {
        var list = load(from: defaults)
        let initialCount = list.count
        list.removeAll { $0 == url }
        guard list.count != initialCount else { return }
        write(list, to: defaults)
    }

    /// Removes the persisted entry entirely.
    static func clear(from defaults: UserDefaults = .standard) {
        defaults.removeObject(forKey: key)
    }

    private static func write(_ list: [URL], to defaults: UserDefaults) {
        guard let data = try? JSONEncoder().encode(list) else { return }
        defaults.set(data, forKey: key)
    }
}
