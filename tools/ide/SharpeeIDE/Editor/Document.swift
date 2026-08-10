// Document.swift
// Models an open file in the editor — its URL, in-memory content, and dirty state.
//
// Save is also the story-identity reconciliation moment (ADR-309 D3, David's
// on-save ruling): saving a `.story` writes its config sidecar's IFID into the
// header. This lives at the write choke point on purpose — ⌘S, save-all before
// a build, and the close-dirty prompt all pass through here, and three wired
// call sites would be three chances to drift.
// Public interface: Document (the model), Document.load(from:) (loader),
//   Document.save() -> SaveOutcome, DocumentError.
// Owner context: tools/ide — Editor model. UI-free; safe to unit-test.

import Foundation

final class Document {

    let url: URL
    var content: String
    var isDirty: Bool

    init(url: URL, content: String, isDirty: Bool = false) {
        self.url = url
        self.content = content
        self.isDirty = isDirty
    }

    /// Loads a UTF-8 text file from disk.
    /// Throws `DocumentError.notUTF8` for binary or non-UTF-8 files.
    static func load(from url: URL) throws -> Document {
        let data = try Data(contentsOf: url)
        guard let text = String(data: data, encoding: .utf8) else {
            throw DocumentError.notUTF8(url: url)
        }
        return Document(url: url, content: text)
    }

    /// What a save did beyond writing bytes.
    struct SaveOutcome: Equatable {
        /// True when reconciliation rewrote `content` — the editor's text view
        /// is now stale and must be reloaded from the document.
        let contentChanged: Bool
        /// Non-nil when the story's config sidecar is broken (ADR-309 D5). The
        /// save still happened; the Problems panel names the config.
        let brokenConfig: String?

        static let unchanged = SaveOutcome(contentChanged: false, brokenConfig: nil)
    }

    /// Persists `content` to `url` as UTF-8 with atomic replace, then clears the dirty flag.
    /// Throws the underlying error on failure; `isDirty` remains true on failure.
    ///
    /// For a `.story` document this first reconciles the header's `ifid:` line
    /// to the config sidecar (ADR-309 D3): the line is inserted when missing
    /// and overwritten when an author edited it, and an absent config is
    /// created by adopting the header's existing value or minting a fresh one.
    /// A BROKEN config never blocks the write — losing an author's text over a
    /// sidecar problem would be the worse failure — it is reported instead.
    ///
    /// - Returns: what the save did, so the caller can refresh a stale buffer.
    @discardableResult
    func save() throws -> SaveOutcome {
        var outcome = SaveOutcome.unchanged
        if url.pathExtension == "story" {
            let reconciled = StoryIdentity.reconcile(source: content, storyURL: url)
            if reconciled.sourceChanged { content = reconciled.source }
            outcome = SaveOutcome(contentChanged: reconciled.sourceChanged,
                                  brokenConfig: reconciled.brokenConfig)
        }
        try content.write(to: url, atomically: true, encoding: .utf8)
        isDirty = false
        return outcome
    }
}

enum DocumentError: LocalizedError {
    case notUTF8(url: URL)

    var errorDescription: String? {
        switch self {
        case .notUTF8(let url):
            return "\(url.lastPathComponent) is not a UTF-8 text file. Sharpee can only display text files."
        }
    }
}
