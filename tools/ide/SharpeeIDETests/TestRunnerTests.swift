// TestRunnerTests.swift
// Real-path tests for TestRunner (rule 13a): drives the actual devkit CLI
// (`node packages/devkit/dist/cli.js test <story> --json`) against real
// `.story` + `.transcript` fixtures through the production spawn/line-decode
// path — no stubbed toolchain. Fixture shell scripts appear only for the
// failure shapes the real CLI can't produce on demand (schema drift,
// split-chunk delivery, cancellation), where the NDJSON payload itself stays
// contract-shaped.

import XCTest
@testable import SharpeeIDE

@MainActor
final class TestRunnerTests: XCTestCase {

    private var tempDir: URL!
    private var runner: TestRunner!
    private var delegate: RecordingTestDelegate!

    /// A story with a takeable object so the chain fixture can persist state
    /// across files (take in wt-01, inventory in wt-02).
    private static let story = """
    story "Mini" by "T"
      id: mini
      version: 0.0.1

    create the Den
      a room

      A small square den.

    create the brass lamp
      in the Den

      It gleams dully.

    create the player
      starts in the Den

      You.

    """

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-TestRunnerTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        runner = TestRunner()
        delegate = RecordingTestDelegate()
        runner.delegate = delegate
    }

    override func tearDownWithError() throws {
        runner = nil
        delegate = nil
        if let tempDir, FileManager.default.fileExists(atPath: tempDir.path) {
            try FileManager.default.removeItem(at: tempDir)
        }
        tempDir = nil
        super.tearDown()
    }

    // MARK: - Fixture helpers

    private func writeFixture(_ relative: String, _ content: String) throws {
        let url = tempDir.appendingPathComponent(relative)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try content.write(to: url, atomically: true, encoding: .utf8)
    }

    private func makeScript(_ body: String) throws -> URL {
        let url = tempDir.appendingPathComponent("script-\(UUID().uuidString).sh")
        try ("#!/bin/bash\n" + body + "\n").write(to: url, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: url.path)
        return url
    }

    /// Runs the REAL devkit CLI's `test … --json` in `tempDir` and waits.
    private func runReal(arguments: [String], timeout: TimeInterval = 120) {
        let exited = expectation(description: "test run exits")
        delegate.onExit = { exited.fulfill() }
        runner.start(executable: URL(fileURLWithPath: "/usr/bin/env"),
                     arguments: ["node", TestToolchain.devkitCLI.path, "test"] + arguments + ["--json"],
                     workingDirectory: tempDir,
                     environment: ShellEnvironment.buildEnvironment())
        wait(for: [exited], timeout: timeout)
    }

    private func transcriptEnds() -> [TestTranscriptEnd] {
        delegate.records.compactMap { if case .transcriptEnd(let end) = $0 { return end } else { return nil } }
    }

    // MARK: - Real CLI, real stories (Acceptance 6)

    func testRealRunStreamsGuardShapedRecordsWithSourceLines() throws {
        try writeFixture("mini.story", Self.story)
        try writeFixture("tests/smoke.transcript", """
        title: Smoke
        ---

        > look
        [OK: contains "A small square den"]
        """)
        runReal(arguments: [tempDir.path])

        XCTAssertEqual(delegate.result?.state, .passed)
        XCTAssertEqual(delegate.result?.exitCode, 0)
        guard case .runStart(let start)? = delegate.records.first else {
            return XCTFail("stream must open with run-start, got \(String(describing: delegate.records.first))")
        }
        XCTAssertEqual(start.mode, .tests)
        XCTAssertEqual(start.transcriptCount, 1)
        guard case .runEnd(let end)? = delegate.records.last else {
            return XCTFail("stream must close with run-end, got \(String(describing: delegate.records.last))")
        }
        XCTAssertEqual(end.exitCode, 0)

        let commands = delegate.records.compactMap { record -> TestCommandResult? in
            if case .commandResult(let command) = record { return command } else { return nil }
        }
        XCTAssertEqual(commands.map(\.input), ["look"])
        XCTAssertEqual(commands.first?.line, 4, "the `> look` source line — the click-through target")
        XCTAssertEqual(transcriptEnds().map(\.status), [.passed])
    }

    /// A broken transcript is an error ROW, not a vanished file (Acceptance 2's
    /// Swift-visible proof), and fails the run. "Broken" means a real parse
    /// error — a removed form (ADR-294 D2). An assertion-less command is NOT
    /// broken post-rebuild: it is a golden-tier candidate that fails at runtime
    /// with "no recording exists" (transcript status `failed`, not `error`).
    func testValidationBrokenTranscriptArrivesAsErrorRecord() throws {
        try writeFixture("mini.story", Self.story)
        try writeFixture("tests/broken.transcript", """
        title: Broken
        ---

        > look
        [OK: any]
        """)
        runReal(arguments: [tempDir.path])

        XCTAssertEqual(delegate.result?.state, .failed)
        XCTAssertEqual(delegate.result?.exitCode, 1)
        let ends = transcriptEnds()
        XCTAssertEqual(ends.count, 1)
        XCTAssertEqual(ends.first?.status, .error)
        XCTAssertNotNil(ends.first?.errorMessage)
    }

    /// The walkthroughs chain preserves state across files (Acceptance 4): the
    /// second file's inventory assertion only passes if the first file's take
    /// persisted into the same game instance.
    func testChainRunPreservesStateAcrossFiles() throws {
        try writeFixture("mini.story", Self.story)
        try writeFixture("walkthroughs/wt-01-take.transcript", """
        title: Step 1
        ---

        > take the brass lamp
        [OK: contains "Taken"]
        """)
        try writeFixture("walkthroughs/wt-02-carry.transcript", """
        title: Step 2
        ---

        > inventory
        [OK: contains "brass lamp"]
        """)
        runReal(arguments: [tempDir.path, "--chain"])

        XCTAssertEqual(delegate.result?.state, .passed)
        guard case .runStart(let start)? = delegate.records.first else { return XCTFail("no run-start") }
        XCTAssertEqual(start.mode, .chain)
        let ends = transcriptEnds()
        XCTAssertEqual(ends.map { URL(fileURLWithPath: $0.file).lastPathComponent },
                       ["wt-01-take.transcript", "wt-02-carry.transcript"],
                       "filename order — D3")
        XCTAssertEqual(ends.map(\.status), [.passed, .passed])
    }

    /// Edit-then-run (Phase 3's re-run guarantee): the CLI re-reads the
    /// `.transcript` from disk each run — an edited assertion changes the very
    /// next result, no cached/stale parse.
    func testEditedTranscriptReRunsFresh() throws {
        try writeFixture("mini.story", Self.story)
        try writeFixture("tests/edit.transcript", """
        title: Editable
        ---

        > look
        [OK: contains "A small square den"]
        """)
        runReal(arguments: [tempDir.path])
        XCTAssertEqual(delegate.result?.state, .passed)

        // Author edits the assertion to something the story never prints.
        try writeFixture("tests/edit.transcript", """
        title: Editable
        ---

        > look
        [OK: contains "text the story never prints"]
        """)
        delegate = RecordingTestDelegate()
        runner.delegate = delegate
        runReal(arguments: [tempDir.path])
        XCTAssertEqual(delegate.result?.state, .failed,
                       "the edited content, not a stale parse, decided this run")
        XCTAssertEqual(transcriptEnds().map(\.status), [.failed])
    }

    // MARK: - Line buffering through the real pipe

    /// A record split across pipe chunks (the writer flushes mid-line) still
    /// decodes exactly once — the runner's buffer reassembles it.
    func testSplitChunkDeliveryDecodesEachRecordExactlyOnce() throws {
        let script = try makeScript("""
        printf '{"schemaVersion":1,"type":"run-start","mo'
        sleep 0.3
        printf 'de":"tests","transcriptCount":0}\\n'
        printf '{"schemaVersion":1,"type":"run-end","totalPassed":0,"totalFailed":0,"totalExpectedFailures":0,"totalSkipped":0,"totalErrors":0,"totalDuration":0,"exitCode":0}\\n'
        """)
        let exited = expectation(description: "script exits")
        delegate.onExit = { exited.fulfill() }
        runner.start(executable: script, arguments: [], workingDirectory: tempDir)
        wait(for: [exited], timeout: 10)

        XCTAssertEqual(delegate.records.count, 2, "one decode per record — none dropped or doubled")
        guard case .runStart(let start)? = delegate.records.first else { return XCTFail("no run-start") }
        XCTAssertEqual(start.transcriptCount, 0)
        XCTAssertTrue(delegate.decodeFailures.isEmpty)
    }

    // MARK: - Schema gate (Acceptance 1, Swift half)

    /// A future-toolchain stream is rejected loudly ONCE; later lines are
    /// dropped, and the already-typed mismatch carries both versions.
    func testSchemaVersionMismatchStopsDecodingLoudly() throws {
        let script = try makeScript("""
        printf '{"schemaVersion":999,"type":"run-start","mode":"tests","transcriptCount":1}\\n'
        printf '{"schemaVersion":999,"type":"run-end","exitCode":0}\\n'
        """)
        let exited = expectation(description: "script exits")
        delegate.onExit = { exited.fulfill() }
        runner.start(executable: script, arguments: [], workingDirectory: tempDir)
        wait(for: [exited], timeout: 10)

        XCTAssertTrue(delegate.records.isEmpty, "no partial decode of a future stream")
        XCTAssertEqual(delegate.decodeFailures.count, 1, "surfaced once, then dropped")
        XCTAssertEqual(delegate.decodeFailures.first as? TestResultRecord.DecodeError,
                       .schemaVersionMismatch(found: 999, expected: 1))
    }

    // MARK: - Cancel

    func testCancelTerminatesAndKeepsDecodedRecords() throws {
        let script = try makeScript("""
        printf '{"schemaVersion":1,"type":"run-start","mode":"tests","transcriptCount":9}\\n'
        sleep 30
        """)
        let sawRecord = expectation(description: "first record decoded")
        delegate.onRecord = { _ in sawRecord.fulfill() }
        let exited = expectation(description: "cancelled run exits")
        delegate.onExit = { exited.fulfill() }

        runner.start(executable: script, arguments: [], workingDirectory: tempDir)
        XCTAssertTrue(runner.isRunning)
        wait(for: [sawRecord], timeout: 10)
        runner.cancel()

        // SIGTERM kills the script promptly; the 2s SIGKILL escalation is a backstop.
        wait(for: [exited], timeout: 5)
        XCTAssertEqual(delegate.result?.state, .cancelled)
        XCTAssertEqual(runner.state, .cancelled)
        XCTAssertEqual(delegate.records.count, 1, "records up to the cancel point are kept")
    }
}

@MainActor
private final class RecordingTestDelegate: TestRunnerDelegate {
    private(set) var records: [TestResultRecord] = []
    private(set) var decodeFailures: [Error] = []
    private(set) var stderrText = ""
    private(set) var states: [TestRunner.State] = []
    var result: TestRunner.Result?
    var onExit: (() -> Void)?
    var onRecord: ((TestResultRecord) -> Void)?

    func runner(_ runner: TestRunner, didDecode record: TestResultRecord) {
        records.append(record)
        onRecord?(record)
        onRecord = nil
    }

    func runner(_ runner: TestRunner, didFailDecode error: Error) {
        decodeFailures.append(error)
    }

    func runner(_ runner: TestRunner, didEmitStderr text: String) {
        stderrText += text
    }

    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State) {
        states.append(state)
    }

    func runner(_ runner: TestRunner, didExit result: TestRunner.Result) {
        self.result = result
        onExit?()
    }
}
