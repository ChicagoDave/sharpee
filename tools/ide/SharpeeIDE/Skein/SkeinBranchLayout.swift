// SkeinBranchLayout.swift
// Turns a SkeinDocument into the badge grid the Testing tab's top panel draws:
// one COLUMN per branch, laid out side by side, each column a vertical run of
// command badges from the story start down to that branch's last turn.
//
// A branch is a root→leaf path, detected from the tree rather than declared by
// the author (David: "I7 doesn't do threads anymore — it auto-detects
// branches"). Where two branches share a prefix, the shared badges appear in
// BOTH columns: the point of the layout is that a whole branch reads top to
// bottom without the eye jumping sideways, which a shared spine would break.
//
// Pure geometry-free model — columns and depths, no points — so what the panel
// shows is testable without a window.
// Public interface: SkeinBranchLayout.branches(in:), Branch, Badge.
// Owner context: tools/ide — Skein (branch layout). UI-free; safe to unit-test.

import Foundation

enum SkeinBranchLayout {

    /// One badge: a node, and where it sits in the grid.
    struct Badge: Equatable {
        let nodeId: String
        /// The typed command. Empty exactly for the story-start root, which is
        /// not drawn — the layout omits it (see `branches(in:)`).
        let command: String
        /// Which branch column this badge belongs to, left to right from 0.
        let column: Int
        /// How far down the column, from 0.
        let depth: Int
    }

    /// One branch: a root→leaf path through the skein.
    struct Branch: Equatable {
        let column: Int
        let badges: [Badge]

        /// The branch's last turn — what selecting the branch reads, and what a
        /// replay of it would drive to.
        var terminalNodeId: String? { badges.last?.nodeId }
    }

    /// Every branch in `document`, left to right in child order.
    ///
    /// The story-start root is omitted: its command is empty, so it would draw
    /// as a blank badge at the head of every column, saying nothing and costing
    /// a row. The transcript still shows it — that is where its output lives.
    ///
    /// - Parameter document: the skein to lay out.
    /// - Returns: one branch per leaf, in depth-first child order. Empty for a
    ///   skein with no turns yet.
    static func branches(in document: SkeinDocument) -> [Branch] {
        var branches: [Branch] = []
        var path: [SkeinNode] = []

        func walk(_ node: SkeinNode) {
            path.append(node)
            defer { path.removeLast() }

            if node.children.isEmpty {
                let column = branches.count
                let badges = path.enumerated().map { depth, node in
                    Badge(nodeId: node.id, command: node.command,
                          column: column, depth: depth)
                }
                branches.append(Branch(column: column, badges: badges))
                return
            }
            for child in node.children { walk(child) }
        }

        for child in document.root.children { walk(child) }
        return branches
    }

    /// The column that contains `nodeId`, preferring the leftmost — what a
    /// selection made elsewhere (the transcript, a replay) highlights.
    ///
    /// - Returns: the badge, or nil when the node is not in the skein.
    static func badge(forNodeId nodeId: String, in branches: [Branch]) -> Badge? {
        for branch in branches {
            if let badge = branch.badges.first(where: { $0.nodeId == nodeId }) {
                return badge
            }
        }
        return nil
    }
}
