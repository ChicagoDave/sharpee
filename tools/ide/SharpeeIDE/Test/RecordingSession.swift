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
// split a saved session into a walkthrough chain. `serialize` now encodes the
// bless verdicts per D2 — `[OK]` + an ADR-287 `text` block for a verbatim bless,
// `[OK: contains …]` for a selection — while untagged turns keep ADR-277 D5's
// `[OK: any]` draft unchanged. Splitting a checkpointed session into a chain is
// still Phase 3's job; this file carries the checkpoint marks without acting on
// them.
//
// Public interface: isRecording, turns, blessedTurns, latestTurnIndex,
// canBlessLatestTurn, hasAuthorAssertions, start(), stop(),
// record(command:response:), bless(turnAt:selection:), unbless(turnAt:),
// toggleBlessOnLatestTurn(rawSelection:), setCheckpoint(_:turnAt:),
// serialize(title:), assertionLines(for:), inlinePayload(_:).
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
    /// regardless of assertion, and an empty block is an ADR-287 validation
    /// error — so the Play pane shows no affordance here (D2).
    var isBlessable: Bool {
        !response.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var isBlessed: Bool {
        if case .blessed = verdict { return true }
        return false
    }

    /// The fragment to store for a bless on this turn, given whatever the play
    /// surface reports as currently selected.
    ///
    /// A selection is kept only when it is genuinely a fragment OF this turn's
    /// response. The author may have left a selection standing in an earlier
    /// turn, in the status line, or across the command echo; encoding any of
    /// those as this turn's load-bearing fragment would produce an assertion
    /// the author never made (D2).
    ///
    /// Known Phase 1 limit, deliberately not papered over: a selection spanning
    /// two paragraphs arrives with the DOM's single `\n` between them while the
    /// response carries the channel's `\n\n`, so it fails this containment test
    /// and falls back to a verbatim bless. Phase 2 owns encoding and is the
    /// right place to decide whether matching should normalize whitespace.
    ///
    /// - Parameter raw: the surface's current selection, or nil.
    /// - Returns: the fragment to store, or nil to assert the whole response.
    func fragment(selected raw: String?) -> String? {
        guard let raw else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, response.contains(trimmed) else { return nil }
        return trimmed
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

    /// The most recent captured turn's position, or nil when nothing is
    /// captured. The live bless gesture always targets this turn: the author
    /// vouches for the response they are looking at (D1).
    var latestTurnIndex: Int? {
        turns.isEmpty ? nil : turns.count - 1
    }

    /// Whether the Play pane should offer the live bless gesture right now.
    ///
    /// False when nothing is being recorded, nothing has been captured, or the
    /// latest response is blank — an empty response carries no affordance (D2).
    var canBlessLatestTurn: Bool {
        guard isRecording, let index = latestTurnIndex else { return false }
        return turns[index].isBlessable
    }

    /// The Play pane's live gesture: vouch for the turn on screen, or take the
    /// vouch back.
    ///
    /// Blessing is a judgment made in the moment, so the same gesture reverses
    /// it — an author who blessed the wrong turn presses again rather than
    /// hunting for an undo.
    ///
    /// - Parameter rawSelection: whatever the play surface reports as selected.
    ///   Kept only when it is a fragment of this turn's response (see
    ///   `RecordedTurn.fragment(selected:)`); otherwise the bless is verbatim.
    /// - Returns: true when the verdict changed; false when there is nothing
    ///   blessable to change, in which case nothing is mutated.
    @discardableResult
    func toggleBlessOnLatestTurn(rawSelection: String? = nil) -> Bool {
        guard canBlessLatestTurn, let index = latestTurnIndex else { return false }
        if turns[index].isBlessed {
            return unbless(turnAt: index)
        }
        return bless(turnAt: index, selection: turns[index].fragment(selected: rawSelection))
    }

    /// Marks or clears a checkpoint at `index`, splitting the saved session into
    /// a walkthrough chain (D4).
    @discardableResult
    func setCheckpoint(_ isCheckpoint: Bool, turnAt index: Int) -> Bool {
        guard turns.indices.contains(index) else { return false }
        turns[index].isCheckpoint = isCheckpoint
        return true
    }

    /// Whether this session may be saved as a test (ADR-282 Acceptance 3).
    ///
    /// A recording nobody vouched for asserts nothing an author meant — every
    /// turn would carry `[OK: any]`, which only re-states that the story
    /// printed something. The save flow refuses rather than writing a file that
    /// looks like a test and tests nothing.
    var hasAuthorAssertions: Bool { !blessedTurns.isEmpty }

    /// The play session's own opening turn, replayed at the head of every saved
    /// transcript.
    ///
    /// The browser client boots by running `look` itself, outside the
    /// recording — so the story banner is already on screen before the author's
    /// first typed command, and the first RECORDED response has no banner in
    /// it. A fresh headless run has no such opening turn: the banner rides
    /// whatever command comes first. Without this line a verbatim bless on the
    /// session's first turn compares banner-plus-response against response and
    /// fails every time, which is not a class of bug an author could diagnose.
    ///
    /// `[OK: any]` rather than a blessed assertion: this turn is scaffolding
    /// for state, and the author never vouched for it.
    private static let openingTurn = [
        "> look",
        "[OK: any]",
        "# The play session's own opening turn, replayed so the story banner",
        "# lands here. A fresh run prints it with the first command, and it",
        "# would otherwise be prepended to the first blessed response below.",
        "",
    ]

    /// The captured session as `.transcript` source: a `title:` header (the
    /// validator requires title or story), the opening turn above, then each
    /// captured turn encoded per D2.
    func serialize(title: String) -> String {
        var lines: [String] = ["title: \(title)", "---", ""]
        lines.append(contentsOf: Self.openingTurn)
        for turn in turns {
            lines.append("> \(turn.command)")
            lines.append(contentsOf: Self.assertionLines(for: turn))
            lines.append("")
        }
        return lines.joined(separator: "\n")
    }

    /// One turn's assertion, encoded per ADR-282 D2:
    ///
    /// - blessed with no selection → `[OK]` + a literal text block of the whole
    ///   response (verbatim bless — the author vouched for all of it);
    /// - blessed with a selection that fits the parser's inline-payload rule →
    ///   `[OK: contains "<fragment>"]`;
    /// - blessed with any other selection → `[OK: contains]` + the fragment
    ///   in a block, which is why **nothing is unencodable**: the block path has no
    ///   character the inline form chokes on;
    /// - untagged → `[OK: any]` + the response as `#` comments, ADR-277 D5's
    ///   unchanged draft (the validator requires every command to assert
    ///   something, and a turn that merely advances state asserts presence).
    ///
    /// An empty response has no case here on purpose rather than as an
    /// oversight: `isBlessable` is false for one, so it can only ever be
    /// untagged, and an untagged empty response simply carries no comments.
    static func assertionLines(for turn: RecordedTurn) -> [String] {
        switch turn.verdict {
        case .untagged:
            return ["[OK: any]"]
                + turn.response
                    .split(separator: "\n", omittingEmptySubsequences: true)
                    .map { "# \($0)" }

        case .blessed(let selection):
            guard let selection else {
                return ["[OK]"] + textBlock(turn.response)
            }
            if let inline = inlinePayload(selection) {
                return ["[OK: contains \"\(inline)\"]"]
            }
            return ["[OK: contains]"] + textBlock(selection)
        }
    }

    /// The fragment as an inline `[OK: contains "…"]` payload, or nil when it
    /// must take the block path.
    ///
    /// The parser's inline form is `"([^"]+)"` on a single line, so a fragment
    /// carrying a quote or a line break cannot ride it. Brackets can: the
    /// assertion tag is delimited by the line's own first and last character,
    /// which the surrounding `"` keep in place.
    ///
    /// - Parameter fragment: the author's selected text.
    /// - Returns: the payload to inline, or nil to put it in a block instead.
    static func inlinePayload(_ fragment: String) -> String? {
        guard !fragment.isEmpty,
              !fragment.contains("\""),
              !fragment.contains("\n") else { return nil }
        return fragment
    }

    /// Wrap `content` in an ADR-287 literal text block.
    ///
    /// The one place this file emits block syntax, so a grammar change is a
    /// change here and nowhere else — which is how the 2026-07-28 move off
    /// backtick fences cost one function.
    ///
    /// Content goes in verbatim, at its own columns and with its own blank
    /// lines: storage is byte-faithful even though matching normalizes. There
    /// is deliberately no escaping pass — `end text` at column 0 is reserved
    /// syntax with no escape (David's ruling, 2026-07-28), and a response
    /// carrying one fails the parser loudly rather than being quietly mangled
    /// here. Rewriting the author's text to dodge the collision would be the
    /// silent weakening D2 forbids.
    ///
    /// - Parameter content: the literal text, newline-separated.
    /// - Returns: the opener, the content lines verbatim, the close.
    private static func textBlock(_ content: String) -> [String] {
        ["text"] + content.components(separatedBy: "\n") + ["end text"]
    }
}

/// Why a recording could not be saved as a test.
enum RecordingSaveError: LocalizedError {

    /// Nothing in the session was blessed (ADR-282 Acceptance 3).
    case noBlessedTurns

    var errorDescription: String? {
        switch self {
        case .noBlessedTurns:
            return "A test with no assertions of the author's is not a test."
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .noBlessedTurns:
            return "Bless at least one turn (⇧⌘B) to say what this test is checking, then save again."
        }
    }
}
