// LandingRecents.swift
// Composes the project list the landing page offers: the recent-projects store,
// with the last session's project guaranteed a place in it. Pure list logic —
// the store owns persistence, the view controller owns presentation.
// Public interface: LandingRecents.entries(recents:lastProject:limit:).
// Owner context: tools/ide — Launch.

import Foundation

enum LandingRecents {

    /// How many entries the landing page shows. `RecentProjectsStore` retains 10;
    /// what the modal displays is a presentation choice and deliberately does not
    /// have to equal the store's cap.
    static let displayCount = 5

    /// The projects the landing page lists, newest first.
    ///
    /// - Parameters:
    ///   - recents: the store's list, already LRU-ordered.
    ///   - lastProject: the project the previous session had open. It is normally
    ///     already the head of `recents`; it is passed separately so that clearing
    ///     Open Recent cannot strand an author with a landing page that has
    ///     forgotten what they were working on.
    ///   - limit: how many to return.
    /// - Returns: existing story projects only, deduplicated, capped at `limit`.
    ///   Empty when there is nothing to offer — a fresh install.
    static func entries(recents: [URL],
                        lastProject: URL?,
                        limit: Int = displayCount) -> [URL] {
        var ordered = recents
        if let lastProject,
           !recents.contains(where: { $0.standardizedFileURL == lastProject.standardizedFileURL }) {
            ordered.insert(lastProject, at: 0)
        }

        var seen = Set<URL>()
        var result: [URL] = []
        for url in ordered {
            let key = url.standardizedFileURL
            guard !seen.contains(key) else { continue }
            // A folder that has been deleted or has stopped being a story project
            // is dropped rather than offered and failing at open time — the same
            // rule RecentProjectsStore and session restore already apply.
            guard StoryTarget.isStoryProject(url) else { continue }
            seen.insert(key)
            result.append(url)
            if result.count == limit { break }
        }
        return result
    }
}
