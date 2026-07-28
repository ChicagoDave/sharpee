// RecordingSession.swift
// Accumulates play turns while the Play pane's Record toggle is active and
// serializes them into a draft `.transcript` (ADR-277 D5, capture format as
// amended): each turn is `> command` + `[OK: any]` (presence-only — replays
// green despite RNG-varied story text) + the rendered response as `#` comment
// lines for the author's reference, never asserted. Pure state + string
// building; no AppKit, so tests drive it directly.
//
// ADR-282 adds the author's marks on top of that capture: a per-turn bless
// verdict (carrying the optional selected fragment) and checkpoint marks that
// split a saved session into a walkthrough chain. This file only CARRIES those
// marks — `serialize` still emits ADR-277's all-`[OK: any]` draft. Turning a
// blessed verdict into an `[OK]` assertion is ADR-282 Phase 2's job.
//
// Public interface: isRecording, turns, blessedTurns, start(), stop(),
// record(command:response:), bless(turnAt:selection:), unbless(turnAt:),
// setCheckpoint(_:turnAt:), serialize(title:).
// Owner context: tools/ide — Test (recording).

import Foundation

/// One captured turn: the typed command, its rendered response, and the
/// author's marks on it (ADR-282 D1/D4).
struct RecordedTurn: Equatable {

    /// Whether the author vouched for this turn's response.
    ///
    /// A selection only means anything on a blessed turn, so it rides the
    /// blessed case rather than sitting beside the verdict — "untagged, but
    /// with a selection" is not a state this type can express.
    enum Verdict: Equatable {
        /// The command merely advances state; it asserts nothing (D1).
        case untagged
        /// The response is right. `selection` is the load-bearing fragment the
        /// author pointed at, or nil to assert the whole response (D2).
        case blessed(selection: String?)
    }

    let command: String
    let response: String
    var verdict: Verdict = .untagged
    /// A checkpoint splits the session here, so a saved session becomes a
    /// walkthrough chain rather than a single transcript (D4).
    var isCheckpoint = false

    /// Whether this turn can carry a bless.
    ///
    /// An empty response cannot: blank output is a runner-level failure
    /// regardless of assertion, and an empty fence is an ADR-287 validation
    /// error — so the Play pane shows no affordance here (D2).
    var isBlessable: Bool {
        !response.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var isBlessed: Bool {
        if case .blessed = verdict { return true }
        return false
    }
}

@MainActor
final class RecordingSession {

    private(set) var isRecording = false
    private(set) var turns: [RecordedTurn] = []

    /// Begins a fresh capture (drops any prior turns).
    func start() {
        turns = []
        isRecording = true
    }

    /// Ends the capture; `turns` stays available for serialization.
    func stop() {
        isRecording = false
    }

    /// Appends a completed turn. Ignored (never an error) when not recording —
    /// the turn-events bridge streams every turn; the session picks.
    func record(command: String, response: String) {
        guard isRecording else { return }
        turns.append(RecordedTurn(command: command, response: response))
    }

    /// The turns the author vouched for. Phase 2's save flow refuses a session
    /// with none (ADR-282 Acceptance 3).
    var blessedTurns: [RecordedTurn] {
        turns.filter(\.isBlessed)
    }

    /// Vouches for the turn at `index`.
    ///
    /// - Parameters:
    ///   - index: the turn's position in `turns`.
    ///   - selection: the exact substring the author selected, or nil to assert
    ///     the whole response (D2).
    /// - Returns: true when the bless was applied; false when the turn is out of
    ///   range or its response is empty, in which case nothing changes.
    @discardableResult
    func bless(turnAt index: Int, selection: String? = nil) -> Bool {
        guard turns.indices.contains(index), turns[index].isBlessable else { return false }
        turns[index].verdict = .blessed(selection: selection)
        return true
    }

    /// Withdraws a bless, returning the turn to untagged. A vouch the author
    /// cannot take back would be a trap — blessing is a judgment, and judgments
    /// get revised.
    @discardableResult
    func unbless(turnAt index: Int) -> Bool {
        guard turns.indices.contains(index) else { return false }
        turns[index].verdict = .untagged
        return true
    }

    /// Marks or clears a checkpoint at `index`, splitting the saved session into
    /// a walkthrough chain (D4).
    @discardableResult
    func setCheckpoint(_ isCheckpoint: Bool, turnAt index: Int) -> Bool {
        guard turns.indices.contains(index) else { return false }
        turns[index].isCheckpoint = isCheckpoint
        return true
    }

    /// The captured session as `.transcript` source: a `title:` header (the
    /// validator requires title or story), then per turn `> command` +
    /// `[OK: any]` + the response as `#` comments. Empty response → no
    /// comment lines.
    func serialize(title: String) -> String {
        var lines: [String] = ["title: \(title)", "---", ""]
        for turn in turns {
            lines.append("> \(turn.command)")
            lines.append("[OK: any]")
            for responseLine in turn.response.split(separator: "\n", omittingEmptySubsequences: true) {
                lines.append("# \(responseLine)")
            }
            lines.append("")
        }
        return lines.joined(separator: "\n")
    }
}
