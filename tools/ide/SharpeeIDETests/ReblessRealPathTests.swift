// ReblessRealPathTests.swift
// ADR-282 Phase 4 real-path tests (rule 13a) — the drift lifecycle, end to end,
// with nothing standing in for anything.
//
// The loop under test: bless what the story really said, reword the story so
// the assertion no longer holds, run the REAL `sharpee test --json` and watch
// it fail, read the REAL NDJSON `actualOutput` back in Swift, re-bless through
// the REAL model (which writes the REAL file), and run the REAL CLI again —
// which must now pass. No hand-constructed JSON stands in for the emitter, and
// no in-memory string stands in for the file.
//
// That second run is the point. A rewrite that produced text merely LOOKING
// right would pass a string comparison here; only re-running the toolchain
// proves the transcript the re-bless wrote is one the runner accepts.
//
// Skips when `dist/cli/sharpee.js` is absent (`./repokit build dungeo`).

import XCTest
@testable import SharpeeIDE

@MainActor
final class ReblessRealPathTests: XCTestCase {

    private var projectDir: URL!
    private var storyFile: URL!
    private var transcriptsDir: URL!
    private var model: TestPanelModel!

    /// The prose the author blesses. Entirely the author's own words — no
    /// stdlib wording — so a platform message change cannot make this flap,
    /// and it carries the shapes ADR-282 Acceptance 5 names.
    private static let original = """
    [posted by order of the proving board]

    She said "take it" and would not look at you.
    """

    /// The same notice, reworded — the drift the author is reacting to.
    private static let reworded = """
    [posted by order of the proving board]

    She said "take it" and would not meet your eye.
    """

    private static func story(notice: String) -> String {
        """
        story "Drift Probe" by "Tests"
          id: drift-probe
          version: 1.0.0

        create the Den
          a room

          A small square den.

        create the notice
          aka card
          in the Den

          \(notice.replacingOccurrences(of: "\n", with: "\n  "))

        create the player
          starts in the Den

          You.

        """
    }

    override func setUpWithError() throws {
        super.setUp()
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.cliBundle.path),
                          "dist/cli/sharpee.js missing — ./repokit build dungeo")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "packages/devkit/dist/cli.js missing — ./repokit build")

        projectDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-Rebless-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        transcriptsDir = projectDir.appendingPathComponent("tests/transcripts", isDirectory: true)
        try FileManager.default.createDirectory(at: transcriptsDir, withIntermediateDirectories: true)
        storyFile = projectDir.appendingPathComponent("probe.story")
        try Self.story(notice: Self.original).write(to: storyFile, atomically: true, encoding: .utf8)
        model = TestPanelModel()
    }

    override func tearDownWithError() throws {
        if let projectDir, FileManager.default.fileExists(atPath: projectDir.path) {
            try FileManager.default.removeItem(at: projectDir)
        }
        projectDir = nil
        super.tearDown()
    }

    // MARK: - Harness

    /// Bless the story's REAL response to `x notice` and save it as a test.
    @discardableResult
    private func blessAndSave() throws -> URL {
        let responses = try TestToolchain.captureResponses(storyFile: storyFile,
                                                           commands: ["x notice"])
        let play = PlayViewController()
        play.recording.start()
        play.recording.record(command: "x notice", response: responses[0])
        play.recording.bless(turnAt: 0)
        play.recording.stop()

        let saved = transcriptsDir.appendingPathComponent("drift.transcript")
        try play.writeRecording(to: saved)
        return saved
    }

    /// Reword the notice, so the blessed assertion no longer holds.
    private func rewordTheStory() throws {
        try Self.story(notice: Self.reworded).write(to: storyFile, atomically: true, encoding: .utf8)
    }

    /// Run the real `sharpee test --json` over the project, returning every
    /// decoded record.
    private func runTests() -> (result: TestRunner.Result?, records: [TestResultRecord]) {
        let runner = TestRunner()
        let observer = ReblessObserver()
        runner.delegate = observer
        let exited = expectation(description: "sharpee test exits")
        observer.onExit = { exited.fulfill() }
        runner.start(executable: URL(fileURLWithPath: "/usr/bin/env"),
                     arguments: ["node", TestToolchain.devkitCLI.path,
                                 "test", projectDir.path, "--json"],
                     workingDirectory: projectDir,
                     environment: ShellEnvironment.buildEnvironment())
        wait(for: [exited], timeout: 180)
        return (observer.result, observer.records)
    }

    private func failedCommands(in records: [TestResultRecord]) -> [TestCommandResult] {
        records.compactMap { record -> TestCommandResult? in
            guard case .commandResult(let command) = record, !command.passed else { return nil }
            return command
        }
    }

    // MARK: - The wire field, from the real emitter

    func testARealFailedRunCarriesTheStorySRealNewTextOnTheWire() throws {
        try blessAndSave()
        try rewordTheStory()

        let run = runTests()
        XCTAssertEqual(run.result?.state, .failed, "the reworded prose must break the bless")

        let failures = failedCommands(in: run.records)
        XCTAssertEqual(failures.count, 1, "exactly the blessed turn failed")
        let failure = try XCTUnwrap(failures.first)
        XCTAssertEqual(failure.input, "x notice")

        // The field's whole purpose: the text is REAL, from the real runner,
        // not a fixture — and it is the reworded prose, not the blessed prose.
        let actual = try XCTUnwrap(failure.actualOutput,
                                   "a failed command-result must carry actualOutput")
        XCTAssertTrue(actual.contains("would not meet your eye"),
                      "actualOutput must be what the story NOW says, got:\n\(actual)")
        XCTAssertFalse(actual.contains("would not look at you"))
        XCTAssertTrue(actual.contains("[posted by order of the proving board]"),
                      "bracket-shaped lines survive the wire")
        XCTAssertTrue(actual.contains("\n\n"), "so do paragraph boundaries")
    }

    func testAPassingRunCarriesNoActualOutput() throws {
        try blessAndSave()   // story unchanged, so the bless still holds

        let run = runTests()
        XCTAssertEqual(run.result?.state, .passed)
        let commands = run.records.compactMap { record -> TestCommandResult? in
            if case .commandResult(let command) = record { return command } else { return nil }
        }
        XCTAssertFalse(commands.isEmpty)
        for command in commands {
            XCTAssertNil(command.actualOutput,
                         "a passing result must not carry the field: \(command.input)")
        }
    }

    // MARK: - Re-bless, on real disk, proved by a second real run

    func testReblessingRewritesTheRealFileAndTheRealCLIThenPasses() throws {
        let saved = try blessAndSave()
        try rewordTheStory()

        let firstRun = runTests()
        XCTAssertEqual(firstRun.result?.state, .failed)
        let failure = try XCTUnwrap(failedCommands(in: firstRun.records).first)

        // What the failure view would show on the "old" side, read from the file.
        let blessed = try model.blessedText(for: failure)
        XCTAssertTrue(blessed.contains("would not look at you"),
                      "the old side is the assertion as written")
        XCTAssertNotEqual(blessed, failure.actualOutput, "there is genuinely a drift to show")

        try model.rebless(failure)

        // The file really changed, and changed only where it should have.
        let rewritten = try String(contentsOf: saved, encoding: .utf8)
        XCTAssertTrue(rewritten.contains("would not meet your eye"))
        XCTAssertFalse(rewritten.contains("would not look at you"))
        XCTAssertTrue(rewritten.contains("[OK]"), "the assertion is still a verbatim bless")

        // The proof: the REAL toolchain now passes on the REAL rewritten file.
        // Nothing before this line rules out a rewrite that merely looks right.
        let secondRun = runTests()
        XCTAssertEqual(secondRun.result?.state, .passed,
                       "the re-blessed transcript must pass under the real CLI")
        XCTAssertTrue(failedCommands(in: secondRun.records).isEmpty)
    }

    func testTheFailurePaneShowsOldVsNewAndOffersReblessForARealDrift() throws {
        try blessAndSave()
        try rewordTheStory()

        let run = runTests()
        let failure = try XCTUnwrap(failedCommands(in: run.records).first)

        model.discover(storyDir: projectDir)
        for record in run.records { model.apply(record) }

        let panel = TestPanelView(frame: NSRect(x: 0, y: 0, width: 320, height: 500))
        panel.setModel(model)
        var reblessed: TestCommandResult?
        panel.onDidRebless = { reblessed = $0 }

        panel.showFailure(for: failure)
        XCTAssertNil(model.reblessObstacle(for: failure),
                     "a drifted verbatim bless is exactly what re-bless is for")

        XCTAssertTrue(panel.performRebless(), "the offered action must succeed")
        XCTAssertEqual(reblessed?.input, "x notice", "the pane reports what it re-blessed")

        let after = runTests()
        XCTAssertEqual(after.result?.state, .passed)
    }

    func testAHostObstacleRefusesTheWriteRatherThanClobberingUnsavedEdits() throws {
        // The transcript is open in the editor with edits the author has not
        // saved. Re-blessing would discard them, and saving the tab afterwards
        // would discard the re-bless. Neither is the author's to lose silently.
        let saved = try blessAndSave()
        try rewordTheStory()
        let run = runTests()
        let failure = try XCTUnwrap(failedCommands(in: run.records).first)

        model.discover(storyDir: projectDir)
        for record in run.records { model.apply(record) }

        let panel = TestPanelView(frame: NSRect(x: 0, y: 0, width: 320, height: 500))
        panel.setModel(model)
        panel.hostReblessObstacle = { _ in "This transcript has unsaved edits." }
        panel.showFailure(for: failure)

        let before = try String(contentsOf: saved, encoding: .utf8)
        XCTAssertFalse(panel.performRebless(), "the host's refusal must stop the write")
        XCTAssertEqual(try String(contentsOf: saved, encoding: .utf8), before,
                       "nothing was written")

        // And with the obstacle cleared, the same press goes through — the
        // guard is a guard, not a permanent block.
        panel.hostReblessObstacle = nil
        XCTAssertTrue(panel.performRebless())
        XCTAssertNotEqual(try String(contentsOf: saved, encoding: .utf8), before)
    }

    func testAskingWhetherReblessIsPossibleWritesNothing() throws {
        let saved = try blessAndSave()
        try rewordTheStory()
        let run = runTests()
        let failure = try XCTUnwrap(failedCommands(in: run.records).first)

        let before = try String(contentsOf: saved, encoding: .utf8)
        _ = model.reblessObstacle(for: failure)
        _ = model.canRebless(failure)
        _ = try model.blessedText(for: failure)
        let after = try String(contentsOf: saved, encoding: .utf8)

        // The failure view asks these on every selection. If asking wrote, an
        // author could re-bless by clicking a row — the opposite of a
        // deliberate act.
        XCTAssertEqual(before, after, "inspecting a failure must not change the file")
    }

    // MARK: - Refusals, against real runs

    func testASelectionBlessThatDriftsIsNotOfferedRebless() throws {
        // The author vouched for a FRAGMENT. Re-bless would have to replace it
        // with the whole new response, widening a claim they narrowed on
        // purpose — so the pane shows the reason instead of the button.
        let responses = try TestToolchain.captureResponses(storyFile: storyFile,
                                                           commands: ["x notice"])
        let play = PlayViewController()
        play.recording.start()
        play.recording.record(command: "x notice", response: responses[0])
        play.recording.bless(turnAt: 0, selection: "She said \"take it\" and would not look at you.")
        play.recording.stop()
        let saved = transcriptsDir.appendingPathComponent("fragment.transcript")
        try play.writeRecording(to: saved)

        try rewordTheStory()
        let run = runTests()
        XCTAssertEqual(run.result?.state, .failed)
        let failure = try XCTUnwrap(failedCommands(in: run.records).first)
        XCTAssertNotNil(failure.actualOutput, "the field rides every failure, offered or not")

        let obstacle = model.reblessObstacle(for: failure)
        XCTAssertEqual(obstacle as? Rebless.Failure, .notAVerbatimBless)

        let before = try String(contentsOf: saved, encoding: .utf8)
        XCTAssertThrowsError(try model.rebless(failure))
        XCTAssertEqual(try String(contentsOf: saved, encoding: .utf8), before,
                       "a refused re-bless writes nothing")
    }

    func testAnUntaggedTurnIsNotOfferedRebless() throws {
        // A `[SKIP]` draft never carried a bless, so there is nothing to reaffirm.
        let responses = try TestToolchain.captureResponses(storyFile: storyFile,
                                                           commands: ["x notice"])
        let play = PlayViewController()
        play.recording.start()
        play.recording.record(command: "x notice", response: responses[0])
        play.recording.bless(turnAt: 0)
        play.recording.record(command: "take notice", response: "Taken.")
        play.recording.stop()
        try play.writeRecording(to: transcriptsDir.appendingPathComponent("mixed.transcript"))

        let run = runTests()
        XCTAssertEqual(run.result?.state, .passed, "the untagged turn asserts only presence")

        let untagged = try XCTUnwrap(run.records.compactMap { record -> TestCommandResult? in
            guard case .commandResult(let command) = record,
                  command.input == "take notice" else { return nil }
            return command
        }.first)
        // It passed, so it carries no captured text — and even with text there
        // is no verbatim bless under it.
        XCTAssertNil(untagged.actualOutput)
        XCTAssertEqual(model.reblessObstacle(for: untagged) as? Rebless.Failure, .noCapturedOutput)
    }
}

/// Collects every decoded record from a real `sharpee test --json` run.
private final class ReblessObserver: TestRunnerDelegate {
    private(set) var records: [TestResultRecord] = []
    var result: TestRunner.Result?
    var onExit: (() -> Void)?

    func runner(_ runner: TestRunner, didDecode record: TestResultRecord) { records.append(record) }
    func runner(_ runner: TestRunner, didFailDecode error: Error) {}
    func runner(_ runner: TestRunner, didEmitStderr text: String) {}
    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State) {}
    func runner(_ runner: TestRunner, didExit result: TestRunner.Result) {
        self.result = result
        onExit?()
    }
}
