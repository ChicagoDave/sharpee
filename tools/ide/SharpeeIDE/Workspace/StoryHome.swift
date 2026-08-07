// StoryHome.swift
// Owns where new stories go by default: `~/Documents/<Story Title>/`. There is
// deliberately NO app-owned parent folder — the `~/Documents/Chord/` rule of
// ADR-280 D2 is superseded, because an author keeps stories wherever source
// control wants them, and the location is an editable field rather than a
// convention (go-live item 6). The folder name comes from
// StoryLocationMirror.folderName so the app has exactly one naming rule.
// Computation and the occupancy check only — creating the directory remains
// StoryScaffold.create's job, so there is exactly one writer of story folders.
// Public interface: StoryHome.defaultRoot, projectDirectory(forTitle:in:),
// resolveNewProjectDirectory(forTitle:in:), resolveNewProjectDirectory(at:), HomeError.
// Owner context: tools/ide — Workspace.

import Foundation

enum StoryHome {

    /// Refusals raised before any story folder is written.
    enum HomeError: LocalizedError {
        /// The target is already an occupied folder. Carries the FULL path: the
        /// author may not have chosen this location themselves, so naming only
        /// the leaf would leave them unable to find what collided (ADR-280
        /// Acceptance 6).
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

    /// Where a new story lands unless the author says otherwise — `~/Documents`.
    ///
    /// Not created here: the first write into `~/Documents` happens inside
    /// `StoryScaffold.create`, which creates intermediate directories. That
    /// write is what raises the one-time macOS Documents-consent prompt; the
    /// app deliberately adds no copy around it.
    static var defaultRoot: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Documents", isDirectory: true)
    }

    /// The folder a story with `title` would occupy under `root`.
    ///
    /// - Parameters:
    ///   - title: the author-entered story title.
    ///   - root: the default root; defaults to `defaultRoot`. Tests pass a temp
    ///     directory so no run ever writes into the developer's real Documents.
    /// - Returns: `<root>/<folder name>/`, named by `StoryLocationMirror.folderName`.
    static func projectDirectory(forTitle title: String, in root: URL = defaultRoot) -> URL {
        root.appendingPathComponent(StoryLocationMirror.folderName(for: title), isDirectory: true)
    }

    /// The folder a new story with `title` may be scaffolded into.
    ///
    /// - Parameters:
    ///   - title: the author-entered story title.
    ///   - root: the default root; defaults to `defaultRoot`.
    /// - Returns: `<root>/<folder name>/` when it is free to use.
    /// - Throws: `HomeError.projectAlreadyExists` when the target already holds
    ///   a non-hidden entry. Nothing is created or modified on the throwing
    ///   path.
    static func resolveNewProjectDirectory(forTitle title: String,
                                           in root: URL = defaultRoot) throws -> URL {
        try resolveNewProjectDirectory(at: projectDirectory(forTitle: title, in: root))
    }

    /// The occupancy check for a directory the author named themselves — the
    /// Create Story sheet's location field.
    ///
    /// - Parameter directory: the folder the story would be written into.
    /// - Returns: `directory`, when it is free to use.
    /// - Throws: `HomeError.projectAlreadyExists` when it already holds a
    ///   non-hidden entry. Hidden-only contents are not a collision — the same
    ///   rule `StoryScaffold.create` already applies, so a stray `.DS_Store`
    ///   never blocks a new story.
    @discardableResult
    static func resolveNewProjectDirectory(at directory: URL) throws -> URL {
        let fileManager = FileManager.default
        if fileManager.fileExists(atPath: directory.path) {
            let entries = (try? fileManager.contentsOfDirectory(atPath: directory.path)) ?? []
            if entries.contains(where: { !$0.hasPrefix(".") }) {
                throw HomeError.projectAlreadyExists(directory)
            }
        }
        return directory
    }
}
