// TestResultRecordTests.swift
// Covers the Swift mirror of the `test --json` NDJSON contract (ADR-277 D1):
// each record variant decodes from a real wire line, the schemaVersion gate
// rejects unknown versions LOUDLY (probed before shape decode — a
// future-shape line still reports the version, never a partial decode), and
// unknown record types are a typed error.

import XCTest
@testable import SharpeeIDE

final class TestResultRecordTests: XCTestCase {

    private func line(_ json: String) -> Data { Data(json.utf8) }

    // MARK: - Variant decoding

    func testDecodesRunStart() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":1,"type":"run-start","mode":"chain","transcriptCount":3}"#))
        guard case .runStart(let start) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(start.mode, .chain)
        XCTAssertEqual(start.transcriptCount, 3)
    }

    func testDecodesTranscriptStart() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":1,"type":"transcript-start","file":"/s/tests/a.transcript","index":0}"#))
        guard case .transcriptStart(let start) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(start.file, "/s/tests/a.transcript")
        XCTAssertEqual(start.index, 0)
    }

    func testDecodesCommandResultWithAndWithoutError() throws {
        let passing = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":1,"type":"command-result","file":"/s/tests/a.transcript","line":4,"input":"look","passed":true,"expectedFailure":false,"skipped":false}"#))
        guard case .commandResult(let command) = passing else { return XCTFail("wrong variant: \(passing)") }
        XCTAssertEqual(command.line, 4) // the click-through target
        XCTAssertEqual(command.input, "look")
        XCTAssertNil(command.error)

        let failing = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":1,"type":"command-result","file":"/s/tests/a.transcript","line":9,"input":"take lamp","passed":false,"expectedFailure":false,"skipped":false,"error":"boom"}"#))
        guard case .commandResult(let failed) = failing else { return XCTFail("wrong variant: \(failing)") }
        XCTAssertEqual(failed.error, "boom")
        XCTAssertFalse(failed.passed)
    }

    func testDecodesTranscriptEndIncludingErrorStatus() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":1,"type":"transcript-end","file":"/s/tests/b.transcript","status":"error","passed":0,"failed":0,"expectedFailures":0,"skipped":0,"duration":0,"errorMessage":"Transcript validation failed"}"#))
        guard case .transcriptEnd(let end) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(end.status, .error)
        XCTAssertEqual(end.errorMessage, "Transcript validation failed")
    }

    func testDecodesRunEnd() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":1,"type":"run-end","totalPassed":4,"totalFailed":1,"totalExpectedFailures":0,"totalSkipped":0,"totalErrors":1,"totalDuration":120,"exitCode":1}"#))
        guard case .runEnd(let end) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(end.totalErrors, 1)
        XCTAssertEqual(end.exitCode, 1)
    }

    // MARK: - Loud rejection (the D1 gate)

    func testUnknownSchemaVersionThrowsMismatchNotPartialDecode() {
        // Deliberately ALSO malformed for v1 (no mode field): the version gate
        // must fire before any shape decoding is attempted.
        let futureLine = line(#"{"schemaVersion":999,"type":"run-start"}"#)
        XCTAssertThrowsError(try TestResultRecord.decode(line: futureLine)) { error in
            XCTAssertEqual(error as? TestResultRecord.DecodeError,
                           .schemaVersionMismatch(found: 999, expected: 1))
        }
    }

    func testUnknownRecordTypeThrowsTyped() {
        let unknown = line(#"{"schemaVersion":1,"type":"run-paused"}"#)
        XCTAssertThrowsError(try TestResultRecord.decode(line: unknown)) { error in
            XCTAssertEqual(error as? TestResultRecord.DecodeError, .unknownType("run-paused"))
        }
    }

    func testGarbageLineThrows() {
        XCTAssertThrowsError(try TestResultRecord.decode(line: line("Loading story from: /tmp")))
    }
}
