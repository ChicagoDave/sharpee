// StoryHome.swift
// Owns where new stories go: `~/Documents/Chord/<story-id>/` (ADR-280 D2). The
// app owns the default so a writer never confronts a path picker unless they
// ask for one; the folder itself stays a plain, portable story project with
// nothing app-private in it.
// Computation and the occupancy check only — creating the directory remains
// StoryScaffold.create's job, so there is exactly one writer of story folders.
// Public interface: StoryHome.defaultRoot, projectDirectory(forTitle:in:),
// resolveNewProjectDirectory(forTitle:in:), HomeError.
// Owner context: tools/ide — Workspace.

import Foundation

enum StoryHome {

    /// Refusals raised before any story folder is written.
    enum HomeError: LocalizedError {
        /// The computed target is already an occupied folder. Carries the FULL
        /// path: the writer never chose this location, so naming only the leaf
        /// would leave them unable to find what collided (ADR-280 Acceptance 6).
        case projectAlreadyExists(URL)

        var errorDescription: String? {
            switch self {
            case .projectAlreadyExists(let url):
                return "A story already exists at \(url.path)."
            }
        }

        var recoverySuggestion: String? {
            switch self {
            case .projectAlreadyExists:
                return "Choose a different title, or open the existing story."
            }
        }
    }

    /// The default project home — `~/Documents/Chord`.
    ///
    /// Not created here: the first write into `~/Documents` happens inside
    /// `StoryScaffold.create`, which creates intermediate directories. That
    /// write is what raises the one-time macOS Documents-consent prompt; the
    /// app deliberately adds no copy around it (ADR-280 Q-1 is unruled).
    static var defaultRoot: URL {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Documents", isDirectory: true)
        return documents.appendingPathComponent("Chord", isDirectory: true)
    }

    /// The folder a story with `title` would occupy under `root`.
    ///
    /// - Parameters:
    ///   - title: the author-entered story title.
    ///   - root: the project home; defaults to `defaultRoot`. Tests pass a temp
    ///     directory so no run ever writes into the developer's real Documents.
    /// - Returns: `<root>/<story-id>/`, the id derived by `StoryScaffold.storyId(from:)`.
    static func projectDirectory(forTitle title: String, in root: URL = defaultRoot) -> URL {
        root.appendingPathComponent(StoryScaffold.storyId(from: title), isDirectory: true)
    }

    /// The folder a new story with `title` may be scaffolded into.
    ///
    /// - Parameters:
    ///   - title: the author-entered story title.
    ///   - root: the project home; defaults to `defaultRoot`.
    /// - Returns: `<root>/<story-id>/` when it is free to use.
    /// - Throws: `HomeError.projectAlreadyExists` when the target already holds
    ///   a non-hidden entry. Nothing is created or modified on the throwing
    ///   path. Hidden-only contents are not a collision — the same rule
    ///   `StoryScaffold.create` already applies.
    static func resolveNewProjectDirectory(forTitle title: String,
                                           in root: URL = defaultRoot) throws -> URL {
        let target = projectDirectory(forTitle: title, in: root)
        let fileManager = FileManager.default
        if fileManager.fileExists(atPath: target.path) {
            let entries = (try? fileManager.contentsOfDirectory(atPath: target.path)) ?? []
            if entries.contains(where: { !$0.hasPrefix(".") }) {
                throw HomeError.projectAlreadyExists(target)
            }
        }
        return target
    }
}
