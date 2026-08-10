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
    /// Whether the left project pane is expanded. Defaults to true — the pane
    /// shows unless the author collapsed it from the rail or the View menu.
    var projectPaneVisible: Bool
    var buildPanelVisible: Bool
    var playAfterBuild: Bool
    /// The right panel's selected tab index. Part of "the IDE stores all of
    /// its visual state" (David, 2026-08-09); nil in older persisted entries.
    var rightPanelTab: Int?

    init(projectURL: URL?,
         openDocumentURLs: [URL],
         activeIndex: Int?,
         expandedFolderURLs: [URL] = [],
         projectPaneVisible: Bool = true,
         buildPanelVisible: Bool = false,
         playAfterBuild: Bool = true,
         rightPanelTab: Int? = nil) {
        self.projectURL = projectURL
        self.openDocumentURLs = openDocumentURLs
        self.activeIndex = activeIndex
        self.expandedFolderURLs = expandedFolderURLs
        self.projectPaneVisible = projectPaneVisible
        self.buildPanelVisible = buildPanelVisible
        self.playAfterBuild = playAfterBuild
        self.rightPanelTab = rightPanelTab
    }

    // Custom decode so older persisted entries (without the newer additive fields) still load.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        projectURL = try container.decodeIfPresent(URL.self, forKey: .projectURL)
        openDocumentURLs = try container.decodeIfPresent([URL].self, forKey: .openDocumentURLs) ?? []
        activeIndex = try container.decodeIfPresent(Int.self, forKey: .activeIndex)
        expandedFolderURLs = try container.decodeIfPresent([URL].self, forKey: .expandedFolderURLs) ?? []
        projectPaneVisible = try container.decodeIfPresent(Bool.self, forKey: .projectPaneVisible) ?? true
        buildPanelVisible = try container.decodeIfPresent(Bool.self, forKey: .buildPanelVisible) ?? false
        playAfterBuild = try container.decodeIfPresent(Bool.self, forKey: .playAfterBuild) ?? true
        rightPanelTab = try container.decodeIfPresent(Int.self, forKey: .rightPanelTab)
    }
}

extension SessionState {

    /// The persisted session, but only when it describes the project actually
    /// being opened.
    ///
    /// Launch no longer reopens the last project silently — the landing page
    /// offers it alongside the other recents (go-live item 6). So the open tabs,
    /// expansion and pane visibility in the persisted session may belong to a
    /// different project than the one the author just picked, and replaying them
    /// there would open another story's files.
    ///
    /// - Parameters:
    ///   - state: the persisted session, or nil on first launch.
    ///   - url: the project being opened.
    /// - Returns: `state` when it was saved for `url`; nil otherwise, meaning the
    ///   project opens with its own defaults.
    static func restorable(_ state: SessionState?, opening url: URL) -> SessionState? {
        guard let state, let saved = state.projectURL,
              saved.standardizedFileURL == url.standardizedFileURL else { return nil }
        return state
    }
}

enum SessionStateStore {

    static let key = "SharpeeSessionState"

    /// Reads the persisted session, or nil on first launch / corrupt entry.
    static func load(from defaults: UserDefaults = .standard) -> SessionState? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(SessionState.self, from: data)
    }

    /// Writes the state as JSON to UserDefaults. Silent on encoding failure.
    static func save(_ state: SessionState, to defaults: UserDefaults = .standard) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        defaults.set(data, forKey: key)
    }

    /// Removes the persisted entry. Used when the prior project no longer exists.
    static func clear(from defaults: UserDefaults = .standard) {
        defaults.removeObject(forKey: key)
    }
}
