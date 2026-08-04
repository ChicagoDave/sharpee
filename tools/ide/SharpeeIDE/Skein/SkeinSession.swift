// SkeinSession.swift
// The live half of ADR-299 D1: playing always grows the skein. One session
// tracks where play currently sits in the story's `SkeinDocument` (the current
// node) and folds every typed turn in — walking an existing child when the
// command matches, branching when it diverges — persisting through `SkeinStore`
// on every change. A fresh boot (build, restart) returns to the root: the same
// commands then walk the existing thread rather than duplicating it.
// Public interface: SkeinSession(storeURL:), document, seed, currentNodeId,
// beginThread(), recordTurn(command:output:), moveTo(nodeId:),
// setTags(_:forNodeId:), growForcedSibling(of:forcings:).
// Owner context: tools/ide — Skein (live growth). UI-free; safe to unit-test.

import Foundation

@MainActor
final class SkeinSession {

    private(set) var document: SkeinDocument

    /// Where the document persists — `play-testing/<storyId>.skein` (D7).
    let storeURL: URL

    /// The node play currently sits at; the root after any fresh boot.
    private(set) var currentNodeId: String

    /// Opens the story's skein from `storeURL`, or begins a fresh document —
    /// with a newly minted pinned seed (D5) and an empty story-start root —
    /// when none exists on disk yet. Nothing is written until the first
    /// recorded turn, so a story that is never played never grows the folder.
    ///
    /// - Throws: `SkeinStore.DecodeError.schemaVersionMismatch` (AC-7) or any
    ///   read/decode error from an existing file — never silently replaced;
    ///   authored blessings and tags outlive an IDE that cannot read them.
    init(storeURL: URL) throws {
        self.storeURL = storeURL
        if FileManager.default.fileExists(atPath: storeURL.path) {
            document = try SkeinStore.read(from: storeURL)
        } else {
            document = SkeinDocument(seed: Int.random(in: 1...Int(Int32.max)),
                                     root: SkeinNode(command: "", output: ""))
        }
        currentNodeId = document.root.id
    }

    /// The document's pinned seed (D5) — what the play surface must boot at.
    var seed: Int { document.seed }

    /// A fresh boot: play is back at the story start. The next turn walks or
    /// branches from the root (D8's "new thread from root").
    func beginThread() {
        currentNodeId = document.root.id
    }

    /// Folds one completed turn into the skein (D1).
    ///
    /// Walking: when the current node already has a child carrying `command`,
    /// play moves to it and the tree is unchanged — the stored output stays
    /// the record even if `output` differs (a source-change diff is Phase 7/8's
    /// changed-output surface, never a silent overwrite here).
    /// Branching: any other command appends a sibling-of-the-walked-paths node
    /// and persists the document.
    ///
    /// - Returns: the node play now sits at.
    /// - Throws: the store's write error when a branch could not be persisted
    ///   (the in-memory document keeps the node either way).
    @discardableResult
    func recordTurn(command: String, output: String) throws -> SkeinNode {
        if let existing = document.node(withId: currentNodeId)?
            .children.first(where: { $0.command == command }) {
            currentNodeId = existing.id
            return existing
        }
        let node = SkeinNode(command: command, output: output)
        document.appendChild(node, to: currentNodeId)
        currentNodeId = node.id
        try SkeinStore.write(document, to: storeURL)
        return node
    }

    /// Moves play's position to `nodeId` without touching the tree — the
    /// bookkeeping half of a replay (D6), applied once the surface has
    /// actually been driven there.
    ///
    /// - Returns: true when the node exists; false leaves the position alone.
    @discardableResult
    func moveTo(nodeId: String) -> Bool {
        guard document.node(withId: nodeId) != nil else { return false }
        currentNodeId = nodeId
        return true
    }

    /// Names the thread ending at `nodeId` (D2): free text the author chose,
    /// stored on the node and persisted.
    ///
    /// - Returns: true when applied; false when no such node exists (nothing
    ///   is written).
    /// - Throws: the store's write error; the in-memory document keeps the
    ///   change either way.
    @discardableResult
    func setTags(_ tags: [String], forNodeId nodeId: String) throws -> Bool {
        guard document.updateNode(withId: nodeId, { $0.tags = tags }) else { return false }
        try SkeinStore.write(document, to: storeURL)
        return true
    }

    /// Grows a forced sibling beside `nodeId` (D5) and persists it.
    ///
    /// - Returns: the new branch's node, or nil when the model refused it
    ///   (unknown id, the root, or no forcings) — nothing is written then.
    /// - Throws: the store's write error.
    @discardableResult
    func growForcedSibling(of nodeId: String, forcings: [String]) throws -> SkeinNode? {
        guard let sibling = document.forcedSibling(of: nodeId, forcings: forcings) else {
            return nil
        }
        try SkeinStore.write(document, to: storeURL)
        return sibling
    }
}
