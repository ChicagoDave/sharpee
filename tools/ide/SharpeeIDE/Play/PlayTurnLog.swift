// PlayTurnLog.swift
// The play session's promotion log (ADR-305): every turn the client's
// `turnEvents` bridge posts, held for the current lineage only — a restart
// fence clears it (D3), and the author's margin selection lives beside it.
// The records stay RAW: what the bridge posted is what the toolchain's
// `transcript-from-play` receives, so no Swift re-shaping can drift from the
// wire (D5's one-code-path rule applies to data as much as to synthesis).
// Public interface: PlayTurnLog (ingest(messageBody:), setSelection(_:),
// reset(), payloadJSON(policy:seed:title:), turns, selection,
// selectionSpan), PlayedTurn.
// Owner context: tools/ide — Play.

import Foundation

/// One recorded play turn, as posted by the client (ADR-305 D4). The raw
/// record is the source of truth; the typed accessors are conveniences.
struct PlayedTurn {
    /// The full record as the bridge posted it, round-tripped to the CLI.
    let raw: [String: Any]

    /// The feed's monotonic ordinal — matches the turn's `data-turn` anchors.
    var turn: Int { raw["turn"] as? Int ?? -1 }
    /// The typed command (the boot look posts as `look`).
    var command: String { raw["command"] as? String ?? "" }
}

/// The current lineage's turns and the author's margin selection.
@MainActor
final class PlayTurnLog {

    /// What one bridge message did to the log.
    enum Ingested: Equatable {
        /// A turn record was appended.
        case turn(ordinal: Int)
        /// A restart fence: the log was cleared; `firstOrdinal` is the first
        /// ordinal of the NEW lineage (ADR-305 D3).
        case restart(firstOrdinal: Int)
        /// The body was not a feed record; nothing changed.
        case malformed
    }

    /// This lineage's turns, in play order.
    private(set) var turns: [PlayedTurn] = []

    /// The selected ordinals — always a subset of `turns` ordinals.
    private(set) var selection: Set<Int> = []

    /// Folds one `turnEvents` message into the log.
    @discardableResult
    func ingest(messageBody: String) -> Ingested {
        guard let data = messageBody.data(using: .utf8),
              let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            return .malformed
        }
        if object["restart"] as? Bool == true {
            let first = object["turn"] as? Int ?? -1
            turns = []
            selection = []
            return .restart(firstOrdinal: first)
        }
        guard let ordinal = object["turn"] as? Int,
              object["command"] is String,
              object["output"] is String else {
            return .malformed
        }
        turns.append(PlayedTurn(raw: object))
        return .turn(ordinal: ordinal)
    }

    /// Replaces the selection with the margin's report, dropping ordinals the
    /// log does not hold (a stale post can race a fence).
    func setSelection(_ ordinals: [Int]) {
        selection = Set(ordinals).intersection(Set(turns.map(\.turn)))
    }

    /// Clears everything — a fresh page (load, header Restart) starts empty.
    func reset() {
        turns = []
        selection = []
    }

    /// First and last selected ordinals, for the suggested filename.
    var selectionSpan: (first: Int, last: Int)? {
        guard let min = selection.min(), let max = selection.max() else { return nil }
        return (min, max)
    }

    /// The `sharpee transcript-from-play` stdin payload (ADR-305 D5/D6): the
    /// lineage's raw records with `selected` stamped from the margin. Nil when
    /// nothing is selected — the caller never spawns for a refusal it can see.
    func payloadJSON(policy: String?, seed: Int, title: String) -> Data? {
        guard !selection.isEmpty else { return nil }
        let records = turns.map { turn -> [String: Any] in
            var record = turn.raw
            record["selected"] = selection.contains(turn.turn)
            return record
        }
        var payload: [String: Any] = ["seed": seed, "turns": records, "title": title]
        if let policy { payload["policy"] = policy }
        return try? JSONSerialization.data(withJSONObject: payload)
    }
}
