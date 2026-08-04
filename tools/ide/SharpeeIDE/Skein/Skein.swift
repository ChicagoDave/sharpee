// Skein.swift
// The in-memory skein tree (ADR-299): the value types behind the committed
// `play-testing/<name>.skein` artifact. A document pins ONE seed (D5) and holds
// a single root node — the story-start position (empty command, boot output);
// every typed command is a child node (D1). Nodes carry the author's judgment
// inline so the file is self-contained I7-style (D7): thread tags (D2),
// a blessing with declared scope (D3/D4), freeform annotations and a lock flag
// (D9), forcing annotations that make a counterfactual branch first-class (D5),
// and an origin marker reserved for D10's machine-grown threads. A thread is a
// derived projection (root→node path), never stored.
// Public interface: SkeinDocument, SkeinNode, SkeinBlessing, SkeinThread.
// Owner context: tools/ide — Skein model. UI-free; safe to unit-test.

import Foundation

/// The author's approval of a node's output (D3/D4), stored inline with the
/// output as approved (D7 self-containment) so later replays diff actual
/// against blessed without cross-referencing anything.
struct SkeinBlessing: Codable, Equatable {

    /// The scope declared at bless time (D4). Not uniformly per-thread (I7)
    /// nor per-position — scope is a property of the blessing (D3).
    enum Scope: String, Codable, Equatable {
        /// Plain bless: this output is right for this thread.
        case thisThread = "this-thread"
        /// Invariance claim: this output holds at this story position no
        /// matter which thread arrives — a checkable assertion every replay
        /// of any thread through the position enforces (D4).
        case allPaths = "all-paths"
    }

    let scope: Scope

    /// The output the author vouched for, verbatim at bless time.
    let output: String
}

/// One position in the skein: a typed command and the output it produced (D1),
/// plus everything the author has said about it.
struct SkeinNode: Codable, Equatable {

    /// Who grew this node. `.explorer` is reserved for D10's machine-proposed
    /// threads (`@sharpee/skein` — planned, not shipped); nothing sets it yet,
    /// but the file format carries it so adopted threads need no format change.
    enum Origin: String, Codable, Equatable {
        case author
        case explorer
    }

    /// Stable identity for selection, replay, and thread reference. UUID
    /// string; generated at creation, preserved across save/load.
    let id: String

    /// The typed command. Empty exactly on the document's root node, which is
    /// the story-start position — its `output` is the boot banner, and it is
    /// blessable like any other node (I7 blesses the initial output too).
    var command: String

    /// What the story printed in response, verbatim.
    var output: String

    /// Author-given thread tags (D2): free text naming the path that ends at
    /// (or passes through) this node — "golden path", "troll death".
    var tags: [String]

    var blessing: SkeinBlessing?

    /// Freeform author note on this node (D9) — distinct from `tags`, which
    /// name threads.
    var annotation: String?

    /// Guards the subtree rooted here from trimming (D9). Trimming a locked
    /// subtree is refused, never silently overridden.
    var isLocked: Bool

    /// Forcing annotations for choice points fired during this node's turn
    /// (D5), each in the ADR-293 `forces:` segment grammar
    /// (`<point-id>#<occurrence>=<outcome>`, e.g.
    /// `dungeo.melee.blow.villain#1=LIGHT_WOUND`). A forced branch is just a
    /// thread with a non-empty `forcings` on one node; export joins the
    /// annotations along the path into the transcript's `forces:` header.
    var forcings: [String]

    var origin: Origin

    /// Child nodes in creation order — the branches typed from this position.
    var children: [SkeinNode]

    private enum CodingKeys: String, CodingKey {
        case id, command, output, tags, blessing, annotation
        case isLocked = "locked"
        case forcings, origin, children
    }

    init(id: String = UUID().uuidString,
         command: String,
         output: String,
         tags: [String] = [],
         blessing: SkeinBlessing? = nil,
         annotation: String? = nil,
         isLocked: Bool = false,
         forcings: [String] = [],
         origin: Origin = .author,
         children: [SkeinNode] = []) {
        self.id = id
        self.command = command
        self.output = output
        self.tags = tags
        self.blessing = blessing
        self.annotation = annotation
        self.isLocked = isLocked
        self.forcings = forcings
        self.origin = origin
        self.children = children
    }
}

/// One thread through the skein: the root→node path, linearized (D8's
/// Transcript view reads exactly this). A derived projection —
/// `SkeinDocument.thread(to:)` builds it; it is never stored in the file.
struct SkeinThread: Equatable {

    /// The path's nodes, root first, terminal last. Never empty.
    let nodes: [SkeinNode]

    /// The node this thread runs to.
    var terminal: SkeinNode { nodes[nodes.count - 1] }

    /// The commands to replay root→terminal, in order — the root's empty
    /// command excluded, since the story start is not typed (D6).
    var commands: [String] {
        nodes.map(\.command).filter { !$0.isEmpty }
    }
}

/// The whole committed skein for one story (D7).
struct SkeinDocument: Codable, Equatable {

    /// The `.skein` format version this model reads and writes. Bump on any
    /// shape change; `SkeinStore.read` rejects a mismatch loudly (AC-7, the
    /// house wire-contract pattern, ADR-258 D5).
    ///
    /// v1 (2026-08-03, ADR-299 Phase 1): initial format — seed, root tree,
    /// tags/blessing-with-scope/annotation/locked/forcings/origin per node.
    static let currentSchemaVersion = 1

    let schemaVersion: Int

    /// The one pinned seed every thread in this skein runs at (D5). Exploring
    /// different randomness is a forced branch, never a different seed.
    var seed: Int

    /// The story-start node (empty command, boot output). Restarting starts a
    /// new thread from here; first commands that differ branch here.
    var root: SkeinNode

    init(seed: Int, root: SkeinNode) {
        self.schemaVersion = Self.currentSchemaVersion
        self.seed = seed
        self.root = root
    }

    /// The node with `id`, or nil. Depth-first over the whole tree.
    func node(withId id: String) -> SkeinNode? {
        thread(to: id)?.terminal
    }

    /// The root→node path for `id`, or nil when no node carries it.
    func thread(to id: String) -> SkeinThread? {
        func path(to id: String, from node: SkeinNode) -> [SkeinNode]? {
            if node.id == id { return [node] }
            for child in node.children {
                if let tail = path(to: id, from: child) { return [node] + tail }
            }
            return nil
        }
        guard let nodes = path(to: id, from: root) else { return nil }
        return SkeinThread(nodes: nodes)
    }

    /// Applies `transform` to the node carrying `id`, in place.
    ///
    /// The one mutation door for per-node authored judgment — tags (D2),
    /// blessings (D3/D4), annotations and the lock flag (D9) — so a caller
    /// never rebuilds the tree by hand to change one field.
    ///
    /// - Returns: true when the node was found and transformed; false leaves
    ///   the tree untouched (a stale id must not silently edit the wrong node).
    @discardableResult
    mutating func updateNode(withId id: String,
                             _ transform: (inout SkeinNode) -> Void) -> Bool {
        func apply(to node: inout SkeinNode) -> Bool {
            if node.id == id {
                transform(&node)
                return true
            }
            for index in node.children.indices where apply(to: &node.children[index]) {
                return true
            }
            return false
        }
        return apply(to: &root)
    }

    /// Grows a forced sibling branch beside the node carrying `nodeId` (D5):
    /// a new child of the same parent with the SAME command but the given
    /// forcing annotations, so the counterfactual outcome of that turn's
    /// choice points is a first-class thread — replayed, tagged, and blessed
    /// like any other. The new node's output is empty until a replay fills it
    /// in; its forcings ride every subsequent replay's `forces:` header.
    ///
    /// - Parameters:
    ///   - nodeId: the choice-point node to branch beside.
    ///   - forcings: ADR-293 `forces:` segment annotations
    ///     (`point[#occurrence]=CLASS`) for the new branch. Must be non-empty —
    ///     an unforced sibling with the same command would replay identically
    ///     to the node it shadows, which is a duplicate, not a branch.
    /// - Returns: the new sibling node, or nil when `nodeId` is unknown, is
    ///   the root (the story start has no sibling position), or `forcings` is
    ///   empty — the tree is untouched in every nil case.
    mutating func forcedSibling(of nodeId: String, forcings: [String]) -> SkeinNode? {
        guard !forcings.isEmpty,
              let thread = thread(to: nodeId),
              thread.nodes.count >= 2 else { return nil }
        let target = thread.nodes[thread.nodes.count - 1]
        let parent = thread.nodes[thread.nodes.count - 2]
        let sibling = SkeinNode(command: target.command,
                                output: "",
                                forcings: forcings)
        guard appendChild(sibling, to: parent.id) else { return nil }
        return sibling
    }

    /// Appends `child` under the node carrying `parentId` (D1 branching).
    ///
    /// - Returns: true when the parent was found and the child attached; false
    ///   leaves the tree untouched — a caller holding a stale id must not
    ///   silently grow the wrong place.
    @discardableResult
    mutating func appendChild(_ child: SkeinNode, to parentId: String) -> Bool {
        func append(into node: inout SkeinNode) -> Bool {
            if node.id == parentId {
                node.children.append(child)
                return true
            }
            for index in node.children.indices where append(into: &node.children[index]) {
                return true
            }
            return false
        }
        return append(into: &root)
    }
}
