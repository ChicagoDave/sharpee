// TestResultRecord.swift
// Swift mirror of the @sharpee/ide-protocol `test --json` NDJSON wire contract
// (ADR-277 D1): one record per stdout line — run-start, transcript-start,
// command-result, transcript-end, run-end — decoded per line with the
// schemaVersion gate probed BEFORE shape decode (the ComposeDiagnostics
// convention): a future-version line reports the mismatch loudly, never a
// partial decode. The TS↔Swift boundary precludes a direct import, so this is
// the single Swift decoder; test-results.ts in @sharpee/ide-protocol is the
// source of truth.
// Public interface: TestResultRecord.decode(line:), the five record structs,
// TestResultRecord.DecodeError.
// Owner context: tools/ide — Test.

import Foundation

/// One line of the `sharpee test --json` stream, discriminated on `type`.
enum TestResultRecord: Equatable, Sendable {
    case runStart(TestRunStart)
    case transcriptStart(TestTranscriptStart)
    case commandResult(TestCommandResult)
    case transcriptEnd(TestTranscriptEnd)
    case runEnd(TestRunEnd)

    /// The schema version this mirror is written against — mirrors
    /// `TEST_RESULTS_SCHEMA_VERSION` in @sharpee/ide-protocol. Distinct from
    /// the compose payload's version (separate contracts version separately).
    static let currentSchemaVersion = 1

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
        case "transcript-start":
            return .transcriptStart(try decoder.decode(TestTranscriptStart.self, from: line))
        case "command-result":
            return .commandResult(try decoder.decode(TestCommandResult.self, from: line))
        case "transcript-end":
            return .transcriptEnd(try decoder.decode(TestTranscriptEnd.self, from: line))
        case "run-end":
            return .runEnd(try decoder.decode(TestRunEnd.self, from: line))
        default:
            throw DecodeError.unknownType(probe.type)
        }
    }
}

/// First record of every run: what is about to execute.
struct TestRunStart: Codable, Equatable, Sendable {
    /// `chain` = one game instance, state persists across transcripts (D3).
    enum Mode: String, Codable, Equatable, Sendable {
        case tests
        case chain
    }

    let mode: Mode
    let transcriptCount: Int
}

/// A transcript is about to run.
struct TestTranscriptStart: Codable, Equatable, Sendable {
    /// Absolute path of the `.transcript` file.
    let file: String
    /// 0-based position in the run's transcript order.
    let index: Int
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
    enum Status: String, Codable, Equatable, Sendable {
        case passed
        case failed
        case error
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
}

/// Last record of every run: the aggregate and the process exit code.
struct TestRunEnd: Codable, Equatable, Sendable {
    let totalPassed: Int
    let totalFailed: Int
    let totalExpectedFailures: Int
    let totalSkipped: Int
    /// Count of transcripts that ended `status: error`.
    let totalErrors: Int
    let totalDuration: Double
    /// The exit code the CLI returns: 0 pass, 1 fail/error, 3 load error.
    let exitCode: Int
}
