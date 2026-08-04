// SkeinSession.swift
// The live half of ADR-299 D1: playing always grows the skein. One session
// tracks where play currently sits in the story's `SkeinDocument` (the current
// node) and folds every typed turn in — walking an existing child when the
// command matches, branching when it diverges — persisting through `SkeinStore`
// on every change. A fresh boot (build, restart) returns to the root: the same
// commands then walk the existing thread rather than duplicating it.
// Public interface: SkeinSession(storeURL:), document, seed, currentNodeId,
// beginThread(), beginReplay(along:), endReplay(), recordTurn(command:output:), moveTo(nodeId:),
// setTags(_:forNodeId:), growForcedSibling(of:forcings:),
// observedOutputs, actualOutput(forNodeId:), bless(nodeId:scope:),
// unbless(nodeId:), findings(forThreadTo:), findings(), setAnnotation(_:forNodeId:),
// setLocked(_:forNodeId:), trim(nodeId:).
// Owner context: tools/ide — Skein (live growth). UI-free; safe to unit-test.

import Foundation

@MainActor
final class SkeinSession {

    private(set) var document: SkeinDocument

    /// Where the document persists — `play-testing/<storyId>.skein` (D7).
    let storeURL: URL

    /// The node play currently sits at; the root after any fresh boot.
    private(set) var currentNodeId: String

    /// What the story printed at each node ON THIS BOOT, keyed by node id.
    ///
    /// Walking an existing thread never overwrites a node's stored output — the
    /// record of what was captured stands (D1) — so the fresh text has to live
    /// somewhere for the transcript to read and verification to check (D4).
    /// Here, and only until the next boot: a run's observations are not the
    /// author's judgment and are never persisted.
    private(set) var observedOutputs: [String: String] = [:]

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
        // A new boot is a new set of observations; carrying the last run's
        // outputs forward would let a stale reading answer for a node this run
        // never reached.
        observedOutputs = [:]
        replayPath = []
    }

    /// The nodes the next turns are known to land on, in order — set for the
    /// span of a replay and consumed one per turn.
    ///
    /// Ordinary play identifies the node it walked onto by matching the typed
    /// command against the current node's children, which is exact right up
    /// until two children share a command — which is precisely what a forced
    /// sibling IS (D5: same command, different forced outcome). Without this,
    /// replaying a forced branch records its output against the node it
    /// shadows, and the branch itself never captures anything to bless.
    private var replayPath: [String] = []

    /// Begins a replay of `thread` (D6): a fresh boot, plus the exact nodes the
    /// coming turns belong to, so a forced branch is recorded as itself.
    func beginReplay(along thread: SkeinThread) {
        beginThread()
        replayPath = thread.nodes.filter { !$0.command.isEmpty }.map(\.id)
    }

    /// Ends a replay: later turns are ordinary play again and walk by command.
    func endReplay() {
        replayPath = []
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
        // A replay knows which node this turn is, so it does not have to guess
        // from the command (see `replayPath`). A turn that does not match the
        // expectation abandons the path and falls back to the ordinary walk —
        // recording against a node the replay merely hoped for would be worse
        // than recording against the one the command actually names.
        if !replayPath.isEmpty {
            let expected = replayPath.removeFirst()
            if let node = document.node(withId: expected), node.command == command {
                return try observe(output, at: node)
            }
            replayPath = []
        }
        if let existing = document.node(withId: currentNodeId)?
            .children.first(where: { $0.command == command }) {
            return try observe(output, at: existing)
        }
        let node = SkeinNode(command: command, output: output)
        document.appendChild(node, to: currentNodeId)
        currentNodeId = node.id
        observedOutputs[node.id] = output
        try SkeinStore.write(document, to: storeURL)
        return node
    }

    /// Records what `node` printed on this run and moves play onto it.
    ///
    /// The stored capture stands (D1) — with one exception: a node that has
    /// never had one. A forced sibling is grown with empty output precisely so
    /// a replay fills it in (D5), and a branch carrying no capture can never be
    /// read in the Transcript view, blessed, or exported. Establishing a first
    /// capture is not overwriting a record; it is making one.
    ///
    /// - Throws: the store's write error, when a first capture was persisted.
    private func observe(_ output: String, at node: SkeinNode) throws -> SkeinNode {
        currentNodeId = node.id
        observedOutputs[node.id] = output
        guard node.output.isEmpty, !output.isEmpty else { return node }
        document.updateNode(withId: node.id) { $0.output = output }
        try SkeinStore.write(document, to: storeURL)
        return document.node(withId: node.id) ?? node
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

    // MARK: - Blessing (D3/D4)

    /// What a node prints as of right now: this boot's observation when the
    /// node was reached, otherwise the output stored when it was captured.
    ///
    /// The one answer to "what am I looking at" — the Transcript view reads it,
    /// blessing vouches for it, and verification checks it, so those three can
    /// never disagree about which text is under discussion.
    ///
    /// - Returns: the text, or nil when no such node exists.
    func actualOutput(forNodeId nodeId: String) -> String? {
        guard let node = document.node(withId: nodeId) else { return nil }
        return observedOutputs[nodeId] ?? node.output
    }

    /// Vouches for what the node currently prints, at the declared scope (D4).
    ///
    /// The blessed text is captured verbatim from `actualOutput` — the author
    /// approves what they are reading, so re-blessing after a change is what
    /// accepts the new output as expected. An existing blessing is replaced,
    /// which is how a scope is changed (plain → all-paths and back).
    ///
    /// - Returns: true when applied; false when no such node exists (nothing is
    ///   written).
    /// - Throws: the store's write error; the in-memory document keeps the
    ///   blessing either way.
    @discardableResult
    func bless(nodeId: String, scope: SkeinBlessing.Scope) throws -> Bool {
        guard let output = actualOutput(forNodeId: nodeId) else { return false }
        guard document.updateNode(withId: nodeId, {
            $0.blessing = SkeinBlessing(scope: scope, output: output)
        }) else { return false }
        try SkeinStore.write(document, to: storeURL)
        return true
    }

    /// Withdraws approval (D1: there is no negative verdict — absence of bless,
    /// not presence of curse).
    ///
    /// - Returns: true when the node existed and carried a blessing; false
    ///   leaves the document alone and writes nothing, so unblessing an
    ///   unblessed node is not a save.
    /// - Throws: the store's write error.
    @discardableResult
    func unbless(nodeId: String) throws -> Bool {
        guard document.node(withId: nodeId)?.blessing != nil else { return false }
        guard document.updateNode(withId: nodeId, { $0.blessing = nil }) else { return false }
        try SkeinStore.write(document, to: storeURL)
        return true
    }

    /// Verifies the thread ending at `nodeId` against every blessing the skein
    /// carries (D4), reading this boot's observed outputs where it has them.
    ///
    /// - Returns: the findings, in thread order; empty when every claim held or
    ///   the node is unknown.
    func findings(forThreadTo nodeId: String) -> [SkeinFinding] {
        guard let thread = document.thread(to: nodeId) else { return [] }
        return SkeinVerifier.findings(in: document, thread: thread, observed: observedOutputs)
    }

    /// Verifies the whole skein — what the tree's changed-output badges read
    /// (D9), since a badge has to appear on every affected node, not only on
    /// the thread currently being read.
    func findings() -> [SkeinFinding] {
        SkeinVerifier.findings(in: document, observed: observedOutputs)
    }

    // MARK: - Refinements (D9)

    /// Sets the author's freeform note on a node — distinct from D2's tags,
    /// which name threads. An empty string clears it, so the sheet that edits
    /// the note also deletes it and no separate gesture is needed.
    ///
    /// - Returns: true when applied; false when no such node exists (nothing
    ///   is written).
    /// - Throws: the store's write error.
    @discardableResult
    func setAnnotation(_ annotation: String, forNodeId nodeId: String) throws -> Bool {
        let trimmed = annotation.trimmingCharacters(in: .whitespacesAndNewlines)
        guard document.updateNode(withId: nodeId, {
            $0.annotation = trimmed.isEmpty ? nil : trimmed
        }) else { return false }
        try SkeinStore.write(document, to: storeURL)
        return true
    }

    /// Guards (or releases) the subtree rooted at a node against trimming (D9).
    ///
    /// - Returns: true when applied; false when no such node exists.
    /// - Throws: the store's write error.
    @discardableResult
    func setLocked(_ locked: Bool, forNodeId nodeId: String) throws -> Bool {
        guard document.updateNode(withId: nodeId, { $0.isLocked = locked }) else { return false }
        try SkeinStore.write(document, to: storeURL)
        return true
    }

    /// Removes a subtree and persists the result (D9).
    ///
    /// Nothing is written on a refusal — a locked or unknown node must not
    /// cost the author a file rewrite. On success the removed nodes'
    /// observations are dropped, and play's position falls back to the story
    /// start when the node it sat on was one of them: leaving `currentNodeId`
    /// pointing into deleted tree would silently grow the next turn nowhere.
    ///
    /// - Returns: the model's outcome, so the caller can state the refusal.
    /// - Throws: the store's write error (the in-memory document keeps the
    ///   trim either way).
    @discardableResult
    func trim(nodeId: String) throws -> SkeinDocument.TrimOutcome {
        let outcome = document.trim(nodeId: nodeId)
        guard case .trimmed(let removedIds) = outcome else { return outcome }
        for id in removedIds { observedOutputs.removeValue(forKey: id) }
        if removedIds.contains(currentNodeId) { currentNodeId = document.root.id }
        try SkeinStore.write(document, to: storeURL)
        return outcome
    }
}
