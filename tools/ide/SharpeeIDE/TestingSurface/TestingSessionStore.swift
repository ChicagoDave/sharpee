// TestingSessionStore.swift
// The testing play surface's per-story session sidecar (ADR-307 D7): VIEW
// STATE ONLY — the page's `{active, dialogs}` ephemera, held opaque. The
// tree document (`<story-id>.tests.json`, in the author's project) carries
// everything reproducible — commands, structure, claims, seed — so the
// sidecar keeps nothing the tree can re-derive. An unreadable or
// version-mismatched sidecar is discarded silently (degraded mode, never an
// error). Lives IDE-side (Application Support), never in the author's
// project.
// Public interface: TestingSessionStore (load(), updateViewState(_:),
// viewState, fileURL; static url(storyId:projectRoot:), version).
// Owner context: tools/ide — TestingSurface.

import CryptoKit
import Foundation

/// Reads and writes one story's session sidecar. Mutation rewrites the file
/// atomically; a write failure leaves the previous file intact and is
/// swallowed — observation must never break play.
final class TestingSessionStore {

    /// Bumped on breaking shape changes; a mismatched file is discarded on
    /// load (a version-mismatched sidecar is degraded mode, not an error).
    /// v3 (ADR-307): the command log is GONE — the tree document owns the
    /// session's commands and structure; only the page's view state remains.
    static let version = 3

    let fileURL: URL

    /// The page's view snapshot (`{active, dialogs}`), held opaque — the
    /// page defines its shape, Swift never re-models it.
    private(set) var viewState: [String: Any]?

    init(fileURL: URL) {
        self.fileURL = fileURL
    }

    /// The sidecar path for a story: keyed by story id plus a short hash of
    /// the project root, so same-named stories in different projects never
    /// share a session. Under Application Support — IDE-side by ruling,
    /// never a file in the author's project.
    static func url(storyId: String, projectRoot: URL,
                    base: URL? = nil) -> URL {
        let support = base ?? FileManager.default.urls(
            for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent(Bundle.main.bundleIdentifier ?? "net.sharpee.chord-writer",
                                    isDirectory: true)
        let digest = SHA256.hash(data: Data(projectRoot.standardizedFileURL.path.utf8))
        let hash = digest.map { String(format: "%02x", $0) }.joined().prefix(8)
        return support
            .appendingPathComponent("testing-sessions", isDirectory: true)
            .appendingPathComponent("\(storyId)-\(hash).json")
    }

    /// Loads the sidecar into memory. Returns false — leaving the store
    /// empty, ready to be rewritten — for a missing, unreadable, corrupt, or
    /// version-mismatched file (a sidecar never blocks reopen).
    @discardableResult
    func load() -> Bool {
        guard let data = try? Data(contentsOf: fileURL),
              let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              object["version"] as? Int == Self.version else {
            viewState = nil
            return false
        }
        viewState = object["view"] as? [String: Any]
        return true
    }

    /// Replaces the page's view snapshot and persists.
    func updateViewState(_ state: [String: Any]) {
        viewState = state
        persist()
    }

    private func persist() {
        var object: [String: Any] = ["version": Self.version]
        if let viewState { object["view"] = viewState }
        guard JSONSerialization.isValidJSONObject(object),
              let data = try? JSONSerialization.data(withJSONObject: object,
                                                     options: [.sortedKeys]) else { return }
        let directory = fileURL.deletingLastPathComponent()
        try? FileManager.default.createDirectory(at: directory,
                                                 withIntermediateDirectories: true)
        try? data.write(to: fileURL, options: .atomic)
    }
}
