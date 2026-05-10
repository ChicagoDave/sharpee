// SessionState.swift
// Persists the IDE's window-scoped session — last project, open document URLs, active tab —
// across launches via UserDefaults.
// Public interface: SessionState (the value), SessionStateStore (load/save/clear).
// Owner context: tools/ide — Persistence.

import Foundation

struct SessionState: Codable {
    var projectURL: URL?
    var openDocumentURLs: [URL]
    var activeIndex: Int?
    var expandedFolderURLs: [URL]

    init(projectURL: URL?,
         openDocumentURLs: [URL],
         activeIndex: Int?,
         expandedFolderURLs: [URL] = []) {
        self.projectURL = projectURL
        self.openDocumentURLs = openDocumentURLs
        self.activeIndex = activeIndex
        self.expandedFolderURLs = expandedFolderURLs
    }

    // Custom decode so older persisted entries (without expandedFolderURLs) still load.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        projectURL = try container.decodeIfPresent(URL.self, forKey: .projectURL)
        openDocumentURLs = try container.decodeIfPresent([URL].self, forKey: .openDocumentURLs) ?? []
        activeIndex = try container.decodeIfPresent(Int.self, forKey: .activeIndex)
        expandedFolderURLs = try container.decodeIfPresent([URL].self, forKey: .expandedFolderURLs) ?? []
    }
}

enum SessionStateStore {

    private static let key = "SharpeeSessionState"

    /// Reads the persisted session, or nil on first launch / corrupt entry.
    static func load() -> SessionState? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(SessionState.self, from: data)
    }

    /// Writes the state as JSON to UserDefaults. Silent on encoding failure.
    static func save(_ state: SessionState) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    /// Removes the persisted entry. Used when the prior project no longer exists.
    static func clear() {
        UserDefaults.standard.removeObject(forKey: key)
    }
}
