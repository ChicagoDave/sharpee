// Invariance.swift
// Verification of the author's blessings (ADR-299 D3/D4): a blessing is not a
// note, it is a claim the skein checks. Two claims are checked here.
//
//   - A plain blessing (`.thisThread`) claims "this node prints this" — a later
//     replay that prints something else is a changed-output finding (D1's
//     "replays through a blessed node diff actual against blessed"; D9 badges
//     this data in Phase 8).
//   - An all-paths blessing claims "this is invariant at this story position,
//     no matter which thread arrives" — every other node at that position must
//     agree, and one that does not has surfaced a state leak (D4).
//
// **What a "position" is.** ADR-299 deliberately does not model convergence
// ("the figure eight was a metaphor to understand the tool, not a modeling
// requirement"), so the tree carries no notion of "the same place" beyond the
// commands typed and the output they produced. The position of a node is
// therefore its COMMAND, normalized the way a parser reads it. An all-paths
// blessing asserts: every node in this skein carrying this command prints this
// output. That is the whole assertion — stated in those words at bless time, so
// an author who blesses `look` for all paths learns it from a finding they can
// downgrade, rather than from a check that silently never fires.
// Public interface: SkeinFinding, SkeinVerifier.
// Owner context: tools/ide — Skein (verification). UI-free; safe to unit-test.

import Foundation

/// One first-class objection: a blessing the skein checked and found violated.
///
/// A finding is deliberately not a diff — it names which claim was broken,
/// where the claim was made, and what the two texts are, so the surface can say
/// "the cellar description mentions the egg this thread doesn't have" rather
/// than colouring a line red (D4).
struct SkeinFinding: Equatable {

    enum Kind: Equatable {
        /// The node no longer prints what its own blessing vouched for.
        case changedOutput
        /// The node disagrees with an all-paths blessing declared elsewhere in
        /// the skein for the same position — the invariance claim is false, on
        /// this thread. Carries the node where the claim was made.
        case invarianceViolated(blessedNodeId: String)
    }

    let kind: Kind

    /// The node whose output broke the claim.
    let nodeId: String

    /// That node's command — the position, and what the author recognizes.
    let command: String

    /// The blessed text: what the claim says this position prints.
    let blessed: String

    /// What it printed instead.
    let actual: String

    /// One line naming the broken claim, for a status line or a row badge.
    var summary: String {
        switch kind {
        case .changedOutput:
            return "\"\(command)\" no longer prints what you blessed."
        case .invarianceViolated:
            return "\"\(command)\" was blessed for all paths, but prints something else on this thread."
        }
    }
}

/// Checks a skein's blessings against what the story actually printed (D4).
///
/// Pure and synchronous: it reads a document plus the outputs observed on the
/// current run, and returns findings. It never mutates the skein — a violated
/// claim is the author's to resolve (re-bless, downgrade the scope, or fix the
/// story), never the tool's to paper over.
enum SkeinVerifier {

    /// A node's position (see the file header): its command as a parser would
    /// read it — surrounding whitespace and case are not part of the command.
    ///
    /// - Parameter command: the typed command.
    /// - Returns: the position key two nodes must share to be the same position.
    static func position(of command: String) -> String {
        command.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    /// Every all-paths blessing in the document, grouped by the position it
    /// claims — the reference set an arriving thread is checked against.
    ///
    /// - Returns: position key → the blessed nodes at it, in document order.
    ///   A position with two disagreeing all-paths blessings is a contradiction
    ///   the check surfaces from both sides rather than picking a winner.
    static func allPathsBlessings(in document: SkeinDocument) -> [String: [SkeinNode]] {
        var byPosition: [String: [SkeinNode]] = [:]
        for node in document.allNodes where node.blessing?.scope == .allPaths {
            byPosition[position(of: node.command), default: []].append(node)
        }
        return byPosition
    }

    /// Verifies one thread — what a replay checks when it finishes (D6/D4).
    ///
    /// - Parameters:
    ///   - document: the whole skein; all-paths blessings anywhere in it are in
    ///     scope, which is what makes the check cross-thread.
    ///   - thread: the nodes to check, root→terminal.
    ///   - observed: outputs seen on this run, keyed by node id. A node absent
    ///     here falls back to its stored output, so verifying without a replay
    ///     (reading the transcript of a thread nobody just played) still works.
    /// - Returns: findings in thread order; empty when every claim held.
    static func findings(in document: SkeinDocument,
                         thread: SkeinThread,
                         observed: [String: String] = [:]) -> [SkeinFinding] {
        findings(in: document, nodes: thread.nodes, observed: observed)
    }

    /// Verifies every node in the skein — the whole-document sweep, for a
    /// surface that reports the skein's health rather than one thread's.
    static func findings(in document: SkeinDocument,
                         observed: [String: String] = [:]) -> [SkeinFinding] {
        findings(in: document, nodes: document.allNodes, observed: observed)
    }

    private static func findings(in document: SkeinDocument,
                                 nodes: [SkeinNode],
                                 observed: [String: String]) -> [SkeinFinding] {
        let reference = allPathsBlessings(in: document)
        var findings: [SkeinFinding] = []

        for node in nodes {
            let actual = observed[node.id] ?? node.output

            if let blessing = node.blessing, blessing.output != actual {
                findings.append(SkeinFinding(kind: .changedOutput,
                                             nodeId: node.id,
                                             command: node.command,
                                             blessed: blessing.output,
                                             actual: actual))
            }

            // The claim made HERE is not a claim about this node — a node is
            // never a finding against its own blessing's scope, only against
            // its own text (above).
            for claim in reference[position(of: node.command), default: []]
            where claim.id != node.id {
                guard let blessed = claim.blessing?.output, blessed != actual else { continue }
                findings.append(SkeinFinding(kind: .invarianceViolated(blessedNodeId: claim.id),
                                             nodeId: node.id,
                                             command: node.command,
                                             blessed: blessed,
                                             actual: actual))
            }
        }
        return findings
    }
}
