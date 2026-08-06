// TestResultRecord.swift
// Swift mirror of the @sharpee/ide-protocol RUN-EVENT wire (`run-events.ts`,
// schema 2): one event per stdout line — run-start, phase, transcript-start,
// command-result, transcript-end, progress, coverage, run-end — decoded per line
// with the schemaVersion gate probed BEFORE shape decode (the ComposeDiagnostics
// convention): a future-version line reports the mismatch loudly, never a
// partial decode.
//
// WHY THIS MIRROR SURVIVES ADR-301 D1. That decision retires the mirror for the
// Testing TAB, which is a TypeScript consumer and imports the wire directly. It
// does not retire it for the Swift subsystems that also read `sharpee test
// --json` and have no such option: Skein replay verification (ReplayDriver,
// ADR-299) and re-bless (Rebless, ADR-282 D2) both drive a real run and read its
// per-command results in Swift. Deleting this file would take those with it.
// What D1 buys is that the mirror no longer has to track the whole wire for the
// panel's sake — only what those two consumers read.
// Public interface: TestResultRecord.decode(line:), the record structs,
// TestResultRecord.DecodeError.
// Owner context: tools/ide — Test.

import Foundation

/// One line of the `sharpee test --json` stream, discriminated on `type`.
enum TestResultRecord: Equatable, Sendable {
    case runStart(TestRunStart)
    case phase(TestPhase)
    case transcriptStart(TestTranscriptStart)
    case commandResult(TestCommandResult)
    case transcriptEnd(TestTranscriptEnd)
    case progress(TestProgress)
    case coverage(TestCoverage)
    case runEnd(TestRunEnd)

    /// The schema version this mirror is written against — mirrors
    /// `RUN_EVENT_SCHEMA_VERSION` in @sharpee/ide-protocol. Distinct from
    /// the compose payload's version (separate contracts version separately).
    ///
    /// **2** is the run-event stream: `transcript-start` now precedes execution
    /// and `command-result` arrives per command, so a Swift consumer sees a run
    /// unfold rather than receiving it whole at the end.
    static let currentSchemaVersion = 2

    /// A line rejected at decode time.
    enum DecodeError: Error, Equatable {
        /// The line's `schemaVersion` does not match `currentSchemaVersion` —
        /// the visible "IDE is out of date for this toolchain" state.
        case schemaVersionMismatch(found: Int, expected: Int)
        /// The line's `type` names a record this mirror does not know.
        case unknownType(String)
    }

    /// Decode one NDJSON line, enforcing the schema-version gate before shape
    /// decoding.
    /// - Throws: `DecodeError` on version/type rejection, or a `DecodingError`
    ///   if the JSON does not match the wire shape.
    static func decode(line: Data) throws -> TestResultRecord {
        struct Probe: Codable {
            let schemaVersion: Int
            let type: String
        }
        let decoder = JSONDecoder()
        let probe = try decoder.decode(Probe.self, from: line)
        guard probe.schemaVersion == currentSchemaVersion else {
            throw DecodeError.schemaVersionMismatch(found: probe.schemaVersion,
                                                    expected: currentSchemaVersion)
        }
        switch probe.type {
        case "run-start":
            return .runStart(try decoder.decode(TestRunStart.self, from: line))
        case "phase":
            return .phase(try decoder.decode(TestPhase.self, from: line))
        case "transcript-start":
            return .transcriptStart(try decoder.decode(TestTranscriptStart.self, from: line))
        case "command-result":
            return .commandResult(try decoder.decode(TestCommandResult.self, from: line))
        case "transcript-end":
            return .transcriptEnd(try decoder.decode(TestTranscriptEnd.self, from: line))
        case "progress":
            return .progress(try decoder.decode(TestProgress.self, from: line))
        case "coverage":
            return .coverage(try decoder.decode(TestCoverage.self, from: line))
        case "run-end":
            return .runEnd(try decoder.decode(TestRunEnd.self, from: line))
        default:
            throw DecodeError.unknownType(probe.type)
        }
    }
}

/// First record of every run: what is about to execute.
struct TestRunStart: Codable, Equatable, Sendable {
    /// `chain` = one game instance, state persists across transcripts (D3);
    /// `tree` = parentage via `continues:` (ADR-302); `explore` = a search that
    /// proposes paths rather than replaying authored ones (ADR-131), which is
    /// why `transcriptCount` is optional.
    enum Mode: String, Codable, Equatable, Sendable {
        case tests
        case chain
        case tree
        case explore
    }

    let mode: Mode
    let transcriptCount: Int?
}

/// Work that is not a transcript but costs real time — the compile and load a
/// run does before its first command. Emitted in `started`/`finished` pairs.
struct TestPhase: Codable, Equatable, Sendable {
    enum Name: String, Codable, Equatable, Sendable {
        case compile
        case load
        case assemble
        case execute
    }

    enum Status: String, Codable, Equatable, Sendable {
        case started
        case finished
    }

    let name: Name
    let status: Status
    let detail: String?
    /// Milliseconds since `run-start` — the only place this mirror keeps a piece
    /// of the envelope, because a phase's cost IS the difference between its pair.
    let elapsedMs: Double
}

/// A transcript is about to run — emitted BEFORE its first command.
///
/// In a tree run this fires once per *execution*, so a node re-executed to build
/// a sibling's state appears more than once (`replayed: true`). Consumers pair
/// start and end positionally, never by `file`.
struct TestTranscriptStart: Codable, Equatable, Sendable {
    /// Absolute path of the `.transcript` file.
    let file: String
    /// 0-based position in the run's execution order.
    let index: Int
    /// Commands this transcript will run, known from the parse before execution.
    let commandCount: Int?
    /// Absolute path of the transcript this one `continues:` (ADR-302).
    let parent: String?
    /// True when this execution exists only to rebuild a descendant's state.
    let replayed: Bool?
}

/// One command's outcome, carrying its click-through source location.
struct TestCommandResult: Codable, Equatable, Sendable {
    let file: String
    /// 1-based `.transcript` source line of the `> command`.
    let line: Int
    let input: String
    let passed: Bool
    /// The command was marked `[FAIL: …]` — failure is the expectation.
    let expectedFailure: Bool
    let skipped: Bool
    /// Runtime error text when the command threw rather than merely failing.
    let error: String?
    /// What the story actually printed, present exactly on FAILED results
    /// (ADR-282 D2) — the "new" half of the failure view's old-vs-new, and the
    /// text a re-bless writes back into the transcript's literal block.
    ///
    /// Optional on the wire AND here: the field is additive, so
    /// `currentSchemaVersion` stays 1 and a line from a toolchain that predates
    /// it still decodes. `Codable` gives that for free for an optional let —
    /// pinned by a test rather than assumed, since a missing key throwing here
    /// would blank the whole Tests panel on an older toolchain.
    let actualOutput: String?
}

/// A transcript finished. `status: error` covers validation failures and
/// story-load/runtime errors — such a transcript gets this record instead of
/// vanishing from the run (ADR-277 D1).
struct TestTranscriptEnd: Codable, Equatable, Sendable {
    /// `unreached` is a tree node whose ancestor failed (ADR-302 D13) — reported
    /// rather than silently absent, and NOT a failure: one broken node yields one
    /// failure plus a count of what it blocked.
    enum Status: String, Codable, Equatable, Sendable {
        case passed
        case failed
        case error
        case unreached
    }

    let file: String
    let status: Status
    let passed: Int
    let failed: Int
    let expectedFailures: Int
    let skipped: Int
    /// Milliseconds.
    let duration: Double
    /// Present exactly when `status` is `error`: why the transcript never ran.
    let errorMessage: String?
    /// Present exactly when `status` is `unreached`: absolute path of the node
    /// whose failure blocked this one. Same identity domain as `file`.
    let blockedBy: String?
}

/// How far along the current work is. Advisory — a consumer that ignores every
/// `progress` event still receives a complete, correct run.
struct TestProgress: Codable, Equatable, Sendable {
    let scope: String
    let done: Int
    /// Absent when the total is not knowable in advance (the explorer's case).
    let total: Int?
}

/// The run's coverage report (ADR-293 D15), emitted once when `--coverage` is on.
/// Decoded as counts only: no Swift consumer reads the per-point rows, and
/// mirroring a shape nothing reads is how a mirror drifts.
struct TestCoverage: Codable, Equatable, Sendable {
    let pointsFired: Int
    let pointsNeverFired: Int
    let classesUnobserved: Int
}

/// Last record of every run: the aggregate and the process exit code.
struct TestRunEnd: Codable, Equatable, Sendable {
    let totalPassed: Int
    let totalFailed: Int
    let totalExpectedFailures: Int
    let totalSkipped: Int
    /// Count of transcripts that ended `status: error`.
    let totalErrors: Int
    /// Count of transcripts that never ran because an ancestor failed.
    let totalUnreached: Int
    let totalDuration: Double
    /// The exit code the CLI returns: 0 pass, 1 fail/error, 2 defect, 3 load error.
    let exitCode: Int
}
