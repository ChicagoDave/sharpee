// TestRunnerTests.swift
// Real-path tests for TestRunner (rule 13a): drives the actual devkit CLI
// (`node packages/devkit/dist/cli.js test <story> --tree --json`) against real
// `.story` + `<story-id>.tests.json` fixtures through the production
// spawn/line-buffer path — no stubbed toolchain (ADR-307: the tree document
// is the only run model). Fixture shell scripts appear only for the shapes
// the real CLI cannot produce on demand (split-chunk delivery, a future
// schema version, cancellation).
//
// The runner is TRANSPORT: it delivers complete NDJSON lines and decodes
// nothing, so these assert on LINES. Parsing them here is the test reading the
// wire to check what was carried — not a decoder the app relies on. The tab
// owns decoding (ADR-301 D1), and its own real-path suite covers it.

import XCTest
@testable import SharpeeIDE

@MainActor
final class TestRunnerTests: XCTestCase {

    private var tempDir: URL!
    private var runner: TestRunner!
    private var delegate: RecordingTestDelegate!

    /// A minimal story whose boot look prints text the document's claims read.
    private static let story = """
    story
      title: Mini
      authors: T
      id: mini
      story-version: 0.0.1
      ifid: CF7091CC-6182-43A4-8FE0-516273849FA0

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
                     arguments: ["node", TestToolchain.devkitCLI.path, "test"] + arguments + ["--tree", "--json"],
                     workingDirectory: tempDir,
                     environment: ShellEnvironment.buildEnvironment())
        wait(for: [exited], timeout: timeout)
    }

    /// Every delivered line parsed as JSON, in stream order.
    private func events() -> [[String: Any]] {
        delegate.lines.compactMap {
            (try? JSONSerialization.jsonObject(with: Data($0.utf8))) as? [String: Any]
        }
    }

    /// The `type` of every delivered event, in order.
    private func eventTypes() -> [String] {
        events().compactMap { $0["type"] as? String }
    }

    /// `transcript-end` statuses, in order.
    private func transcriptEndStatuses() -> [String] {
        events().filter { $0["type"] as? String == "transcript-end" }
            .compactMap { $0["status"] as? String }
    }

    // MARK: - Real CLI, real stories (Acceptance 6)

    /// The tree document the Testing tab would have written: opening + an
    /// asserted boot look, claiming text the story really prints.
    private func writeDocument(claim: String) throws {
        try writeFixture("mini.tests.json", """
        {
          "version": 1,
          "story": "mini",
          "seed": 42,
          "cards": [
            { "type": "opening" },
            { "type": "boot", "assertions": { "contains": ["\(claim)"] } }
          ]
        }
        """)
    }

    func testRealRunStreamsGuardShapedRecordsWithSourceLines() throws {
        try writeFixture("mini.story", Self.story)
        try writeDocument(claim: "A small square den")
        runReal(arguments: [tempDir.path])

        XCTAssertEqual(delegate.result?.state, .passed)
        XCTAssertEqual(delegate.result?.exitCode, 0)

        let all = events()
        XCTAssertEqual(all.first?["type"] as? String, "run-start",
                       "the stream opens with run-start")
        XCTAssertEqual(all.first?["mode"] as? String, "tree")
        XCTAssertEqual(all.last?["type"] as? String, "run-end",
                       "and closes with run-end")
        XCTAssertEqual(all.last?["exitCode"] as? Int, 0)

        let commands = all.filter { $0["type"] as? String == "command-result" }
        XCTAssertEqual(commands.compactMap { $0["input"] as? String }, ["look"],
                       "the boot card executes as the boot look")
        XCTAssertEqual(transcriptEndStatuses(), ["passed"])
    }

    /// A document the deserializer refuses (malformed JSON) exits 2 with
    /// nothing run — refusal happens BEFORE the stream exists (AC-4), so the
    /// IDE sees a failed run with no events, never a silent pass over a
    /// corrupted document.
    func testMalformedDocumentIsRefusedBeforeAnythingRuns() throws {
        try writeFixture("mini.story", Self.story)
        try writeFixture("mini.tests.json", "{ this is not json")
        runReal(arguments: [tempDir.path])

        XCTAssertEqual(delegate.result?.state, .failed)
        XCTAssertEqual(delegate.result?.exitCode, 2, "a refused document, not a failed test")
        XCTAssertTrue(events().isEmpty, "refusal precedes the stream — no NDJSON was emitted")
    }

    /// Edit-then-run (Phase 3's re-run guarantee): the CLI re-reads the tree
    /// document from disk each run — an edited claim changes the very next
    /// result, no cached/stale parse.
    func testEditedDocumentReRunsFresh() throws {
        try writeFixture("mini.story", Self.story)
        try writeDocument(claim: "A small square den")
        runReal(arguments: [tempDir.path])
        XCTAssertEqual(delegate.result?.state, .passed)

        // Author edits the claim to something the story never prints.
        try writeDocument(claim: "text the story never prints")
        delegate = RecordingTestDelegate()
        runner.delegate = delegate
        runReal(arguments: [tempDir.path])
        XCTAssertEqual(delegate.result?.state, .failed,
                       "the edited content, not a stale parse, decided this run")
        XCTAssertEqual(transcriptEndStatuses(), ["failed"])
    }

    // MARK: - Line buffering through the real pipe

    /// An event split across pipe chunks (the writer flushes mid-line) is
    /// delivered exactly once, whole — the runner's buffer reassembles it.
    func testSplitChunkDeliveryYieldsEachLineExactlyOnce() throws {
        let script = try makeScript("""
        printf '{"schemaVersion":2,"seq":0,"elapsedMs":0,"type":"run-start","mo'
        sleep 0.3
        printf 'de":"tests","transcriptCount":0}\\n'
        printf '{"schemaVersion":2,"seq":1,"elapsedMs":1,"type":"run-end","totalPassed":0,"totalFailed":0,"totalExpectedFailures":0,"totalSkipped":0,"totalErrors":0,"totalUnreached":0,"totalDuration":0,"exitCode":0}\\n'
        """)
        let exited = expectation(description: "script exits")
        delegate.onExit = { exited.fulfill() }
        runner.start(executable: script, arguments: [], workingDirectory: tempDir)
        wait(for: [exited], timeout: 10)

        XCTAssertEqual(delegate.lines.count, 2, "one line per event — none dropped or doubled")
        XCTAssertEqual(eventTypes(), ["run-start", "run-end"])
        XCTAssertFalse(delegate.lines[0].contains("\n"), "a delivered line is one whole line")
    }

    // MARK: - Transport does not judge

    /// A future-schema stream is delivered VERBATIM. The runner used to reject
    /// it, which meant two opinions about the wire — one here and one in the
    /// tab, which imports the contract directly. Rejecting is the tab's job now
    /// (it renders the mismatch as a status), so the runner must not swallow the
    /// line on the way.
    func testAFutureSchemaLineIsDeliveredVerbatimRatherThanSwallowed() throws {
        let script = try makeScript("""
        printf '{"schemaVersion":999,"type":"run-start","mode":"tests","transcriptCount":1}\\n'
        printf '{"schemaVersion":999,"type":"run-end","exitCode":0}\\n'
        """)
        let exited = expectation(description: "script exits")
        delegate.onExit = { exited.fulfill() }
        runner.start(executable: script, arguments: [], workingDirectory: tempDir)
        wait(for: [exited], timeout: 10)

        XCTAssertEqual(delegate.lines.count, 2, "both lines reach the consumer")
        XCTAssertTrue(delegate.lines[0].contains("\"schemaVersion\":999"),
                      "unaltered — the tab decides it is unreadable, not the runner")
    }

    // MARK: - Cancel

    func testCancelTerminatesAndKeepsDeliveredLines() throws {
        let script = try makeScript("""
        printf '{"schemaVersion":2,"seq":0,"elapsedMs":0,"type":"run-start","mode":"tests","transcriptCount":9}\\n'
        sleep 30
        """)
        let sawLine = expectation(description: "first line delivered")
        delegate.onLine = { _ in sawLine.fulfill() }
        let exited = expectation(description: "cancelled run exits")
        delegate.onExit = { exited.fulfill() }

        runner.start(executable: script, arguments: [], workingDirectory: tempDir)
        XCTAssertTrue(runner.isRunning)
        wait(for: [sawLine], timeout: 10)
        runner.cancel()

        // SIGTERM kills the script promptly; the 2s SIGKILL escalation is a
        // backstop — and that escalation is a main-runloop Timer, so a suite
        // busy on the main actor can delay it well past its nominal 2s. At the
        // original 5s this failed intermittently in full-suite runs while
        // passing targeted in 0.109s (VM 2026-08-03; host 2026-08-03, twice in
        // one session after ADR-299 Phase 5 added four subprocess-spawning
        // tests). David's standing ruling: targeted rerun once, then bump on
        // recurrence — this is the recurrence. 30s never delays a passing run;
        // it only bounds a genuinely stuck one.
        wait(for: [exited], timeout: 30)
        XCTAssertEqual(delegate.result?.state, .cancelled)
        XCTAssertEqual(runner.state, .cancelled)
        XCTAssertEqual(delegate.lines.count, 1, "lines up to the cancel point are kept")
    }
}

@MainActor
private final class RecordingTestDelegate: TestRunnerDelegate {
    private(set) var lines: [String] = []
    private(set) var stderrText = ""
    private(set) var states: [TestRunner.State] = []
    var result: TestRunner.Result?
    var onExit: (() -> Void)?
    var onLine: ((String) -> Void)?

    func runner(_ runner: TestRunner, didReceiveLine line: String) {
        lines.append(line)
        onLine?(line)
        onLine = nil
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
