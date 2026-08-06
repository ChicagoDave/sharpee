// TestResultRecordTests.swift
// Covers the Swift mirror of the RUN-EVENT wire (`run-events.ts`, schema 2):
// each event variant decodes from a real wire line, the schemaVersion gate
// rejects unknown versions LOUDLY (probed before shape decode — a future-shape
// line still reports the version, never a partial decode), and unknown event
// types are a typed error.
//
// The v2 shapes this pins are the ones the Swift consumers actually read
// (Skein replay, re-bless): a tree run's `replayed` execution marking, its
// `unreached` transcript end, and the phase/progress/coverage events that now
// arrive between them and must not stop the stream.

import XCTest
@testable import SharpeeIDE

final class TestResultRecordTests: XCTestCase {

    private func line(_ json: String) -> Data { Data(json.utf8) }

    // MARK: - Variant decoding

    func testDecodesRunStart() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":0,"elapsedMs":0,"type":"run-start","mode":"chain","transcriptCount":3}"#))
        guard case .runStart(let start) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(start.mode, .chain)
        XCTAssertEqual(start.transcriptCount, 3)
    }

    /// A tree run declares its model here, and an explorer run has no count to
    /// declare — both must decode, or the mirror rejects the run at its first line.
    func testDecodesTreeAndCountlessExploreRunStarts() throws {
        let tree = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":0,"elapsedMs":0,"type":"run-start","mode":"tree","transcriptCount":22}"#))
        guard case .runStart(let treeStart) = tree else { return XCTFail("wrong variant: \(tree)") }
        XCTAssertEqual(treeStart.mode, .tree)

        let explore = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":0,"elapsedMs":0,"type":"run-start","mode":"explore"}"#))
        guard case .runStart(let exploreStart) = explore else { return XCTFail("wrong variant: \(explore)") }
        XCTAssertEqual(exploreStart.mode, .explore)
        XCTAssertNil(exploreStart.transcriptCount, "a search discovers candidates as it goes")
    }

    /// The seconds before the first command. A mirror that threw `unknownType`
    /// here would stop decoding on the very first event of a Chord run.
    func testDecodesPhasePairCarryingItsElapsedTime() throws {
        let started = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":1,"elapsedMs":2,"type":"phase","name":"compile","status":"started"}"#))
        guard case .phase(let open) = started else { return XCTFail("wrong variant: \(started)") }
        XCTAssertEqual(open.name, .compile)
        XCTAssertEqual(open.status, .started)
        XCTAssertEqual(open.elapsedMs, 2)

        let finished = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":2,"elapsedMs":12,"type":"phase","name":"compile","status":"finished","detail":"fernhill.story"}"#))
        guard case .phase(let closed) = finished else { return XCTFail("wrong variant: \(finished)") }
        XCTAssertEqual(closed.status, .finished)
        XCTAssertEqual(closed.detail, "fernhill.story")
        XCTAssertEqual(closed.elapsedMs - open.elapsedMs, 10, "the pair's difference IS the phase's cost")
    }

    func testDecodesTranscriptStart() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":3,"elapsedMs":20,"type":"transcript-start","file":"/s/tests/a.transcript","index":0,"commandCount":7}"#))
        guard case .transcriptStart(let start) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(start.file, "/s/tests/a.transcript")
        XCTAssertEqual(start.index, 0)
        XCTAssertEqual(start.commandCount, 7, "a known count is what makes a progress bar possible")
        XCTAssertNil(start.parent, "absent parent means a root")
        XCTAssertNil(start.replayed)
    }

    /// ADR-302 D17: a node re-executed to rebuild a sibling's state announces
    /// itself as a replay. A consumer that misses this reads the same turns twice.
    func testDecodesAReplayedExecutionWithItsParent() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":9,"elapsedMs":90,"type":"transcript-start","file":"/s/tests/key.transcript","index":4,"commandCount":2,"parent":"/s/tests/arrival.transcript","replayed":true}"#))
        guard case .transcriptStart(let start) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(start.parent, "/s/tests/arrival.transcript",
                       "parent is an absolute path — the same identity domain as file")
        XCTAssertEqual(start.replayed, true)
    }

    func testDecodesCommandResultWithAndWithoutError() throws {
        let passing = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":4,"elapsedMs":21,"type":"command-result","file":"/s/tests/a.transcript","line":4,"input":"look","passed":true,"expectedFailure":false,"skipped":false}"#))
        guard case .commandResult(let command) = passing else { return XCTFail("wrong variant: \(passing)") }
        XCTAssertEqual(command.line, 4) // the click-through target
        XCTAssertEqual(command.input, "look")
        XCTAssertNil(command.error)

        let failing = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":5,"elapsedMs":22,"type":"command-result","file":"/s/tests/a.transcript","line":9,"input":"take lamp","passed":false,"expectedFailure":false,"skipped":false,"error":"boom"}"#))
        guard case .commandResult(let failed) = failing else { return XCTFail("wrong variant: \(failing)") }
        XCTAssertEqual(failed.error, "boom")
        XCTAssertFalse(failed.passed)
    }

    // ADR-282 D2's `actualOutput` is the "new" half of the failure view's
    // old-vs-new and the text a re-bless writes back. It is present on failures
    // and absent on passes, and both halves must decode — an absent key that
    // threw would blank the panel on every green run.
    func testDecodesACommandResultWithActualOutputPresentOrAbsent() throws {
        let withOutput = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":6,"elapsedMs":23,"type":"command-result","file":"/s/tests/a.transcript","line":9,"input":"x lamp","passed":false,"expectedFailure":false,"skipped":false,"actualOutput":"A tarnished lamp.\n\nIt is not lit."}"#))
        guard case .commandResult(let failed) = withOutput else {
            return XCTFail("wrong variant: \(withOutput)")
        }
        XCTAssertEqual(failed.actualOutput, "A tarnished lamp.\n\nIt is not lit.",
                       "paragraph boundaries survive the wire")

        let without = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":7,"elapsedMs":24,"type":"command-result","file":"/s/tests/a.transcript","line":9,"input":"x lamp","passed":true,"expectedFailure":false,"skipped":false}"#))
        guard case .commandResult(let passing) = without else {
            return XCTFail("wrong variant: \(without)")
        }
        XCTAssertNil(passing.actualOutput)
    }

    func testDecodesTranscriptEndIncludingErrorStatus() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":8,"elapsedMs":30,"type":"transcript-end","file":"/s/tests/b.transcript","status":"error","passed":0,"failed":0,"expectedFailures":0,"skipped":0,"duration":0,"errorMessage":"Transcript validation failed"}"#))
        guard case .transcriptEnd(let end) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(end.status, .error)
        XCTAssertEqual(end.errorMessage, "Transcript validation failed")
        XCTAssertNil(end.blockedBy, "an error ran and failed; nothing blocked it")
    }

    /// ADR-302 D13: a node an ancestor's failure blocked is REPORTED, with the
    /// node that blocked it named. It is a distinct status from `failed` because
    /// counting it as a failure is exactly the wall of red D13 forbids.
    func testDecodesAnUnreachedTranscriptEndNamingWhatBlockedIt() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":40,"elapsedMs":300,"type":"transcript-end","file":"/s/tests/deep.transcript","status":"unreached","passed":0,"failed":0,"expectedFailures":0,"skipped":0,"duration":0,"blockedBy":"/s/tests/key.transcript"}"#))
        guard case .transcriptEnd(let end) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(end.status, .unreached)
        XCTAssertEqual(end.blockedBy, "/s/tests/key.transcript")
        XCTAssertEqual(end.failed, 0, "unreached is not failed")
    }

    func testDecodesProgressWithAndWithoutAKnownTotal() throws {
        let counted = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":10,"elapsedMs":40,"type":"progress","scope":"commands","done":40,"total":120}"#))
        guard case .progress(let bar) = counted else { return XCTFail("wrong variant: \(counted)") }
        XCTAssertEqual(bar.done, 40)
        XCTAssertEqual(bar.total, 120)

        let openEnded = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":11,"elapsedMs":41,"type":"progress","scope":"states","done":12400,"budgets":[{"unit":"states","spent":12400,"limit":50000}]}"#))
        guard case .progress(let search) = openEnded else { return XCTFail("wrong variant: \(openEnded)") }
        XCTAssertNil(search.total, "a bounded search has a budget, not a denominator")
    }

    func testDecodesCoverageAsCountsWithoutMirroringItsRows() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":12,"elapsedMs":50,"type":"coverage","points":[{"name":"combat.hit","fired":3,"classes":["hit","miss"],"observed":["hit"],"unobserved":["miss"]}],"pointsFired":1,"pointsNeverFired":2,"classesUnobserved":1}"#))
        guard case .coverage(let coverage) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(coverage.pointsFired, 1)
        XCTAssertEqual(coverage.pointsNeverFired, 2)
        XCTAssertEqual(coverage.classesUnobserved, 1)
    }

    func testDecodesRunEnd() throws {
        let record = try TestResultRecord.decode(line: line(
            #"{"schemaVersion":2,"seq":99,"elapsedMs":120,"type":"run-end","totalPassed":4,"totalFailed":1,"totalExpectedFailures":0,"totalSkipped":0,"totalErrors":1,"totalUnreached":3,"totalDuration":120,"exitCode":1}"#))
        guard case .runEnd(let end) = record else { return XCTFail("wrong variant: \(record)") }
        XCTAssertEqual(end.totalErrors, 1)
        XCTAssertEqual(end.totalUnreached, 3)
        XCTAssertEqual(end.exitCode, 1)
    }

    // MARK: - Loud rejection (the version gate)

    func testUnknownSchemaVersionThrowsMismatchNotPartialDecode() {
        // Deliberately ALSO malformed for v2 (no mode field): the version gate
        // must fire before any shape decoding is attempted.
        let futureLine = line(#"{"schemaVersion":999,"type":"run-start"}"#)
        XCTAssertThrowsError(try TestResultRecord.decode(line: futureLine)) { error in
            XCTAssertEqual(error as? TestResultRecord.DecodeError,
                           .schemaVersionMismatch(found: 999, expected: 2))
        }
    }

    /// The v1 stream this mirror used to read. It is not "close enough" to
    /// best-guess: v1's `transcript-start` came AFTER the transcript ran, so a
    /// partial decode would show a finished run as one about to start.
    func testTheSupersededVersionOneStreamIsRejectedByVersionNotShape() {
        let old = line(#"{"schemaVersion":1,"type":"run-start","mode":"chain","transcriptCount":3}"#)
        XCTAssertThrowsError(try TestResultRecord.decode(line: old)) { error in
            XCTAssertEqual(error as? TestResultRecord.DecodeError,
                           .schemaVersionMismatch(found: 1, expected: 2))
        }
    }

    func testUnknownRecordTypeThrowsTyped() {
        let unknown = line(#"{"schemaVersion":2,"seq":0,"elapsedMs":0,"type":"finding"}"#)
        XCTAssertThrowsError(try TestResultRecord.decode(line: unknown)) { error in
            XCTAssertEqual(error as? TestResultRecord.DecodeError, .unknownType("finding"))
        }
    }

    func testGarbageLineThrows() {
        XCTAssertThrowsError(try TestResultRecord.decode(line: line("Loading story from: /tmp")))
    }
}
