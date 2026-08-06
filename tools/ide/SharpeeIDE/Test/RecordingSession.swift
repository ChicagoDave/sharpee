// RecordingSession.swift
// The transcript emitter: one turn list in, one `.transcript` source out
// (ADR-277 D5 as superseded by ADR-294 D2, with ADR-282's retained
// serialization grammar). Each untagged turn is `> command` + `[SKIP]` (the
// turn executes and advances state, asserting nothing) + the rendered response
// as `#` comment lines for the author's reference, never asserted; a blessed
// turn is `[OK]` + an ADR-287 literal text block of the response the author
// vouched for.
//
// NO PRODUCTION CALLER, and that is stated rather than dressed up: ADR-282's
// live capture and then ADR-299's skein exporter were the two things that
// serialized transcripts in Swift, and both are retired. What keeps this file
// here is that the re-bless tests use it to build their fixtures — re-blessing
// a transcript is only a meaningful test if the transcript came from the real
// serializer rather than a hand-typed string. If the editing surface ADR-301
// defers ever needs Swift-side serialization it starts here; if it does not,
// this file leaves with the re-bless tests.
//
// Public interface: RecordedTurn, RecordingSession.serialize(_:title:
// openingTurn:headerFields:), assertionLines(for:).
// Owner context: tools/ide — Test (transcript emission). Pure string building;
// no AppKit, so tests drive it directly.

import Foundation

/// One turn to emit: the typed command, the text to write for it, and whether
/// that text is asserted.
struct RecordedTurn: Equatable {

    /// Whether this turn's response is asserted.
    enum Verdict: Equatable {
        /// The command merely advances state; it asserts nothing (ADR-294 D2).
        case untagged
        /// The response is right — asserted verbatim. Blessing approves the
        /// whole output, so there is no fragment form here: the author vouches
        /// for what they read.
        case blessed
    }

    let command: String
    let response: String
    var verdict: Verdict = .untagged

    var isBlessed: Bool { verdict == .blessed }
}

@MainActor
enum RecordingSession {

    /// The play session's own opening turn, replayed at the head of every
    /// emitted transcript.
    ///
    /// The browser client boots by running `look` itself, outside the recorded
    /// turns — so the story banner is already on screen before the author's
    /// first typed command, and the first recorded response has no banner in
    /// it. A fresh headless run has no such opening turn: the banner rides
    /// whatever command comes first. Without this line a verbatim bless on the
    /// first turn compares banner-plus-response against response and fails
    /// every time, which is not a class of bug an author could diagnose.
    ///
    /// `[SKIP]` rather than an assertion: this turn is scaffolding for state,
    /// and the author never vouched for it.
    private static let openingTurn = [
        "> look",
        "[SKIP]",
        "# The play session's own opening turn, replayed so the story banner",
        "# lands here. A fresh run prints it with the first command, and it",
        "# would otherwise be prepended to the first blessed response below.",
        "",
    ]

    /// One transcript's source.
    ///
    /// The ONE home of the serialization grammar. Everything that writes a
    /// `.transcript` from played turns emits through this exact function rather
    /// than growing a second emitter that could drift from it.
    ///
    /// - Parameters:
    ///   - turns: the turns to encode, in play order.
    ///   - title: the `title:` header's value.
    ///   - openingTurn: whether to replay the client's own `look` at the head.
    ///   - headerFields: extra header lines (e.g. `seed: 42`, `forces: …`)
    ///     emitted verbatim between `title:` and the `---` separator — the
    ///     ADR-294 header block replay and export transcripts pin their run
    ///     configuration in.
    static func serialize(_ turns: [RecordedTurn],
                          title: String,
                          openingTurn: Bool,
                          headerFields: [String] = []) -> String {
        var lines: [String] = ["title: \(title)"] + headerFields + ["---", ""]
        if openingTurn { lines.append(contentsOf: Self.openingTurn) }
        for turn in turns {
            lines.append("> \(turn.command)")
            lines.append(contentsOf: assertionLines(for: turn))
            lines.append("")
        }
        return lines.joined(separator: "\n")
    }

    /// One turn's assertion:
    ///
    /// - blessed → `[OK]` + a literal text block of the whole response;
    /// - untagged → `[SKIP]` + the response as `#` comments (ADR-294 D2's
    ///   replacement for the removed `[OK: any]`: the validator requires every
    ///   command to carry an assertion line, and `[SKIP]` executes the turn
    ///   while deliberately asserting nothing).
    static func assertionLines(for turn: RecordedTurn) -> [String] {
        switch turn.verdict {
        case .untagged:
            return ["[SKIP]"]
                + turn.response
                    .split(separator: "\n", omittingEmptySubsequences: true)
                    .map { "# \($0)" }

        case .blessed:
            return ["[OK]"] + textBlock(turn.response)
        }
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
    /// here.
    ///
    /// - Parameter content: the literal text, newline-separated.
    /// - Returns: the opener, the content lines verbatim, the close.
    private static func textBlock(_ content: String) -> [String] {
        ["text"] + content.components(separatedBy: "\n") + ["end text"]
    }
}
