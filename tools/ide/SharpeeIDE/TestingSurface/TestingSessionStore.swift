// TestingSessionStore.swift
// The testing play surface's per-story session sidecar (ADR-306 D8): the
// command log (with restart fences) and the page's view-state snapshot,
// persisted continuously so a reopened surface restores completely —
// commands by replay at the pinned seed, structure from the snapshot. The
// sidecar is VIEW truth only: it carries no assertions and no transcript
// content, `tests/` remains the only durable test artifact, and an
// unreadable sidecar is discarded silently (degraded mode, never an error).
// Lives IDE-side (Application Support), never in the author's project.
// Public interface: TestingSessionStore (load(), append(_:),
// updateViewState(_:), replayPlan(), fileURL; static url(storyId:projectRoot:),
// version), TestingReplayPlan.
// Owner context: tools/ide — TestingSurface.

import CryptoKit
import Foundation

/// What a reopened surface needs to restore: the live lineage's typed
/// commands (boot looks excluded — they play automatically) and the page's
/// persisted view snapshot, passed back verbatim.
struct TestingReplayPlan {
    let replay: [String]
    let viewState: [String: Any]?

    var isEmpty: Bool { replay.isEmpty && viewState == nil }
}

/// Reads and writes one story's session sidecar. All mutation methods
/// rewrite the file atomically; a write failure leaves the previous file
/// intact and is swallowed — observation must never break play.
final class TestingSessionStore {

    /// Bumped on breaking shape changes; a mismatched file is discarded on
    /// load (D8: a version-mismatched sidecar is degraded mode, not an error).
    /// v2 (Phase 5): fork-flagged fences, and the view state became the
    /// page's composite (position-keyed fork tree + stems + dialogs).
    static let version = 2

    let fileURL: URL

    /// The in-memory sidecar: `commands` entries are `{command, boot}` or
    /// `{fence: true}` dictionaries, `viewState` is the page's snapshot,
    /// held opaque — the page defines its shape, Swift never re-models it.
    private var commands: [[String: Any]] = []
    private var viewState: [String: Any]?

    init(fileURL: URL) {
        self.fileURL = fileURL
    }

    /// The sidecar path for a story: keyed by story id plus a short hash of
    /// the project root, so same-named stories in different projects never
    /// share a session. Under Application Support — IDE-side by ruling (D8),
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
    /// version-mismatched file (D8: a sidecar never blocks reopen).
    @discardableResult
    func load() -> Bool {
        guard let data = try? Data(contentsOf: fileURL),
              let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              object["version"] as? Int == Self.version,
              let loaded = object["commands"] as? [[String: Any]] else {
            commands = []
            viewState = nil
            return false
        }
        commands = loaded
        viewState = object["viewState"] as? [String: Any]
        return true
    }

    /// Appends one command-log entry and persists.
    func append(_ entry: [String: Any]) {
        commands.append(entry)
        persist()
    }

    /// Replaces the page's view snapshot and persists.
    func updateViewState(_ state: [String: Any]) {
        viewState = state
        persist()
    }

    /// The restore payload: commands after the last fence (dead lineage never
    /// replays), boot looks excluded (a fresh boot plays its own), plus the
    /// stored view snapshot.
    ///
    /// Fork-flagged fences (Phase 5) mark driver fresh boots — the log after
    /// one interleaves replayed-prefix commands with branch turns, so a
    /// LINEAR replay across it would be garbage. When the live tail contains
    /// one, the linear plan is withheld entirely: the page's composite view
    /// state carries the full fork tree and drives its own restore; without
    /// a valid composite, files-only is the honest degraded mode (D8).
    func replayPlan() -> TestingReplayPlan {
        var tail: [[String: Any]] = []
        for entry in commands {
            if entry["fence"] as? Bool == true, entry["fork"] as? Bool != true {
                tail = []
            } else {
                tail.append(entry)
            }
        }
        let hasFork = tail.contains { $0["fork"] as? Bool == true }
        let replay = hasFork ? [] : tail.compactMap { entry -> String? in
            guard entry["boot"] as? Bool != true else { return nil }
            return entry["command"] as? String
        }
        return TestingReplayPlan(replay: replay, viewState: viewState)
    }

    private func persist() {
        var object: [String: Any] = [
            "version": Self.version,
            "commands": commands,
        ]
        if let viewState { object["viewState"] = viewState }
        guard JSONSerialization.isValidJSONObject(object),
              let data = try? JSONSerialization.data(withJSONObject: object,
                                                     options: [.sortedKeys]) else { return }
        let directory = fileURL.deletingLastPathComponent()
        try? FileManager.default.createDirectory(at: directory,
                                                 withIntermediateDirectories: true)
        try? data.write(to: fileURL, options: .atomic)
    }
}
