// ToolchainFenceNote.swift
// The fence-grammar coupling mitigation ADR-279 D4 calls for (2026-07-28 note,
// cross-referencing ADR-287): Chord Writer now WRITES transcripts carrying
// fenced literal payloads, and a `sharpee` older than ADR-287 cannot parse
// them. The failure is loud but its cause is not obvious, so when a run dies
// before producing results AND the transcripts involved carry fences AND the
// toolchain that ran them was NOT the app's own bundled copy, the test panel
// adds one line naming the bundled fallback as the fix.
//
// Deliberately behavioural, not version-gated: fence support landed after the
// 4.2.0 stamp, so a version string cannot distinguish a toolchain that has it
// from one that does not. "Did a fenced transcript fail on a toolchain we did
// not ship?" is answerable today and stays correct after the next bump.
//
// Public interface: ToolchainFenceNote.note(transcripts:resolved:bundled:),
// containsFence(_:).
// Owner context: tools/ide — Test.

import Foundation

@MainActor
enum ToolchainFenceNote {

    /// The one-line note appended to the panel's failure status.
    static let text = "This transcript uses fenced literal payloads (ADR-287) — "
        + "a `sharpee` on your PATH older than that cannot parse them. "
        + "Chord Writer's bundled toolchain always can."

    /// True when `text` carries a fence delimiter: a line whose trimmed content
    /// is three or more backticks and nothing else. Mirrors the tester's own
    /// `FENCE_DELIMITER` (packages/transcript-tester/src/parser.ts) — if that
    /// grammar moves, this moves with it.
    static func containsFence(_ text: String) -> Bool {
        text.split(separator: "\n", omittingEmptySubsequences: false).contains { line in
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            return trimmed.count >= 3 && trimmed.allSatisfy { $0 == "`" }
        }
    }

    /// The note to append to a failed run's status line, or nil when it does
    /// not apply.
    ///
    /// - Parameters:
    ///   - transcripts: the transcript files the failed run covered. Read from
    ///     disk; unreadable files simply do not contribute a fence.
    ///   - resolved: the `sharpee` the run actually used.
    ///   - bundled: the app's own bundled shim, when this build carries one.
    /// - Returns: `text` when the run used a toolchain other than the bundled
    ///   one and at least one transcript carries a fence; otherwise nil.
    ///   Returning nil for a bundled-toolchain failure is the point: the
    ///   bundled copy always understands fences, so blaming the grammar there
    ///   would send the author down the wrong path.
    static func note(transcripts: [URL], resolved: URL?, bundled: URL?) -> String? {
        guard let resolved else { return nil }
        if let bundled, resolved.standardizedFileURL == bundled.standardizedFileURL { return nil }
        let fenced = transcripts.contains { url in
            (try? String(contentsOf: url, encoding: .utf8)).map(containsFence) ?? false
        }
        return fenced ? text : nil
    }
}
