// RecordingSession.swift
// Accumulates play turns while the Play pane's Record toggle is active and
// serializes them into a draft `.transcript` (ADR-277 D5, capture format as
// amended): each turn is `> command` + `[OK: any]` (presence-only — replays
// green despite RNG-varied story text) + the rendered response as `#` comment
// lines for the author's reference, never asserted. Pure state + string
// building; no AppKit, so tests drive it directly.
// Public interface: isRecording, turns, start(), stop(), record(command:
// response:), serialize(title:).
// Owner context: tools/ide — Test (recording).

import Foundation

/// One captured turn: the typed command and its rendered response.
struct RecordedTurn: Equatable {
    let command: String
    let response: String
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
