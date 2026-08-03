// RecordingSaveAsTestTests.swift
// ADR-282 Phase 2 real-path tests (rule 13a) — Acceptance 1, 2, 3 and 5's
// encoding half, driven end to end.
//
// The loop under test is the one the ADR is for: play a story, vouch for what
// it said, save that as a test, and have the test pass headless with no IDE in
// sight. So nothing here hand-writes the story's prose. Every blessed response
// is CAPTURED from the real engine first (TestToolchain.captureResponses), then
// blessed, then serialized through the real save path, then replayed through
// the real `sharpee test` CLI. A serializer that mangles a block, drops a
// paragraph boundary, or emits an assertion that quietly matches everything
// fails here rather than on an author's first save.
//
// Capturing through the headless `--exec` rather than the Play pane is licensed
// by `packages/platform-browser/tests/capture-parity.test.ts`, which pins the
// two captures as byte-identical. Without that proof this would be a guess.
//
// Skips when `dist/cli/sharpee.js` is absent (`./repokit build dungeo`).

import XCTest
@testable import SharpeeIDE

@MainActor
final class RecordingSaveAsTestTests: XCTestCase {

    private var projectDir: URL!
    private var storyFile: URL!
    private var transcriptsDir: URL!

    /// One room, one object whose description is ENTIRELY author prose:
    /// three paragraphs, two of them bracket-shaped lines standing alone, one
    /// carrying `"` quotes. Acceptance 5's named content shape, with no stdlib
    /// wording in it — so a platform message change cannot make these tests
    /// flap, and a failure here means the serializer really broke.
    private static let story = """
    story
      title: Bless Probe
      authors: Tests
      id: bless-probe
      story-version: 1.0.0
      ifid: BE6F80BB-5071-4293-CEDF-405162738E9F

    create the Den
      a room

      A small square den.

    create the notice
      aka card
      in the Den

      [posted by order of the proving board]

      She said "take it" and would not look at you.

      [the lamp gutters]

    create the player
      starts in the Den

      You.

    """

    private static let commands = ["x notice", "take notice"]

    override func setUpWithError() throws {
        super.setUp()
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.cliBundle.path),
                          "dist/cli/sharpee.js missing — ./repokit build dungeo")

        projectDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SaveAsTest-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        // ADR-280's classifier reaches `tests/transcripts/` through `tests/`;
        // saving anywhere else leaves the file invisible in the sidebar.
        transcriptsDir = projectDir.appendingPathComponent("tests/transcripts", isDirectory: true)
        try FileManager.default.createDirectory(at: transcriptsDir, withIntermediateDirectories: true)
        storyFile = projectDir.appendingPathComponent("probe.story")
        try Self.story.write(to: storyFile, atomically: true, encoding: .utf8)
    }

    override func tearDownWithError() throws {
        if let projectDir, FileManager.default.fileExists(atPath: projectDir.path) {
            try FileManager.default.removeItem(at: projectDir)
        }
        projectDir = nil
        super.tearDown()
    }

    // MARK: - Harness

    /// A recording holding what the story really said for `Self.commands`.
    private func recordedSession() throws -> (PlayViewController, [String]) {
        let responses = try TestToolchain.captureResponses(storyFile: storyFile,
                                                           commands: Self.commands)
        XCTAssertEqual(responses.count, Self.commands.count)
        let play = PlayViewController()
        play.recording.start()
        for (command, response) in zip(Self.commands, responses) {
            play.recording.record(command: command, response: response)
        }
        return (play, responses)
    }

    /// Runs the project's tests through the real `sharpee test --json` and
    /// returns what the runner reported.
    private func runSavedTests() -> (result: TestRunner.Result?, ends: [TestTranscriptEnd]) {
        let runner = TestRunner()
        let observer = SaveAsTestObserver()
        runner.delegate = observer
        let exited = expectation(description: "sharpee test exits")
        observer.onExit = { exited.fulfill() }
        runner.start(executable: URL(fileURLWithPath: "/usr/bin/env"),
                     arguments: ["node", TestToolchain.devkitCLI.path,
                                 "test", projectDir.path, "--json"],
                     workingDirectory: projectDir,
                     environment: ShellEnvironment.buildEnvironment())
        wait(for: [exited], timeout: 180)
        let ends = observer.records.compactMap { record -> TestTranscriptEnd? in
            if case .transcriptEnd(let end) = record { return end } else { return nil }
        }
        return (observer.result, ends)
    }

    // MARK: - Acceptance 1 — bless one, leave one untagged, pass headless

    func testABlessedTurnAndAnUntaggedTurnSaveAndPassHeadless() throws {
        let (play, _) = try recordedSession()
        play.recording.bless(turnAt: 0)   // vouch for the notice's text
        play.recording.stop()             // turn 1 stays untagged

        let saved = transcriptsDir.appendingPathComponent("recorded.transcript")
        try play.writeRecording(to: saved)

        let source = try String(contentsOf: saved, encoding: .utf8)
        XCTAssertTrue(source.contains("[OK]"), "the blessed turn asserts its response")
        XCTAssertTrue(source.contains("[SKIP]"), "the untagged turn keeps the draft [SKIP] line")

        let run = runSavedTests()
        XCTAssertEqual(run.result?.state, .passed,
                       "a saved recording must pass under the real CLI with no IDE")
        XCTAssertEqual(run.ends.map(\.status), [.passed])
        // Empirical CLI numbers (macOS gate run, 2026-08-02): the one blessed
        // turn passes; the opening turn and the untagged turn are [SKIP] —
        // they execute but report as skipped, not passed (ADR-294 D2).
        XCTAssertEqual(run.ends.first?.passed, 1, "only the blessed turn counts as passed")
        XCTAssertEqual(run.ends.first?.skipped, 2, "the opening turn and the untagged turn report as skipped")
    }

    // MARK: - Acceptance 5 — lossless round-trip of the hard content

    func testAVerbatimBlessRoundTripsBracketsQuotesAndParagraphsLosslessly() throws {
        let (play, responses) = try recordedSession()
        play.recording.bless(turnAt: 0)
        play.recording.stop()

        let saved = transcriptsDir.appendingPathComponent("verbatim.transcript")
        try play.writeRecording(to: saved)
        let source = try String(contentsOf: saved, encoding: .utf8)

        // The ADR's words: "the saved block content is identical to the
        // captured response". Pull the block back out and compare, rather than
        // trusting that a passing run implies it — a `[SKIP]` draft would also
        // let the run pass.
        let block = try XCTUnwrap(Self.blockContent(in: source),
                                  "no text block found in:\n\(source)")
        XCTAssertEqual(block, responses[0], "the block must carry the response verbatim")
        XCTAssertTrue(block.contains("[posted by order of the proving board]"))
        XCTAssertTrue(block.contains("She said \"take it\" and would not look at you."))
        XCTAssertTrue(block.contains("\n\n"), "the paragraph boundaries must survive")

        let run = runSavedTests()
        XCTAssertEqual(run.result?.state, .passed,
                       "a bracket/quote/multi-paragraph bless must pass headless")
        XCTAssertEqual(run.ends.first?.passed, 1)
        XCTAssertEqual(run.ends.first?.skipped, 2)
    }

    func testASelectionCarryingAQuoteTakesTheFenceAndStillPasses() throws {
        let (play, _) = try recordedSession()
        // A fragment the inline form cannot hold — D2 promises nothing is
        // unencodable, and this is the path that keeps that promise.
        play.recording.bless(turnAt: 0, selection: "She said \"take it\"")
        play.recording.stop()

        let saved = transcriptsDir.appendingPathComponent("selection.transcript")
        try play.writeRecording(to: saved)
        let source = try String(contentsOf: saved, encoding: .utf8)
        XCTAssertTrue(source.contains("[OK: contains]"),
                      "a quoted fragment must take the block form:\n\(source)")

        let run = runSavedTests()
        XCTAssertEqual(run.result?.state, .passed)
        XCTAssertEqual(run.ends.first?.passed, 1)
        XCTAssertEqual(run.ends.first?.skipped, 2)
    }

    func testAPlainSelectionRidesTheInlineFormAndStillPasses() throws {
        let (play, _) = try recordedSession()
        play.recording.bless(turnAt: 0, selection: "[the lamp gutters]")
        play.recording.stop()

        let saved = transcriptsDir.appendingPathComponent("inline.transcript")
        try play.writeRecording(to: saved)
        let source = try String(contentsOf: saved, encoding: .utf8)
        XCTAssertTrue(source.contains("[OK: contains \"[the lamp gutters]\"]"),
                      "expected the inline form in:\n\(source)")

        let run = runSavedTests()
        XCTAssertEqual(run.result?.state, .passed)
    }

    // MARK: - Acceptance 3 — zero-bless is refused

    func testAnAllUntaggedRecordingIsRefusedAndWritesNothing() throws {
        let (play, _) = try recordedSession()
        play.recording.stop()   // nothing blessed

        let saved = transcriptsDir.appendingPathComponent("unvouched.transcript")
        XCTAssertThrowsError(try play.writeRecording(to: saved)) { error in
            XCTAssertEqual(error as? RecordingSaveError, .noBlessedTurns)
        }

        XCTAssertFalse(FileManager.default.fileExists(atPath: saved.path),
                       "a refused save must leave no file behind")
    }

    func testBlessingOneTurnLiftsTheRefusal() throws {
        let (play, _) = try recordedSession()
        let saved = transcriptsDir.appendingPathComponent("lifted.transcript")
        XCTAssertThrowsError(try play.writeRecording(to: saved))

        play.recording.bless(turnAt: 0)

        XCTAssertNoThrow(try play.writeRecording(to: saved))
        XCTAssertTrue(FileManager.default.fileExists(atPath: saved.path))
    }

    // MARK: - Acceptance 2 — a hand-written transcript is unaffected

    func testAHandWrittenTranscriptStillRunsGreenThroughTheIDEsRunner() throws {
        // D3's round-trip invariant cuts both ways: this ADR added a way to
        // WRITE transcripts, and must not have changed how hand-written ones
        // READ. All three post-ADR-294 forms an author reaches for, in one
        // file: [OK: contains], [SKIP] (executes, asserts nothing), and bare
        // [OK] + an ADR-287 text block. (The original fixture's [OK: any] and
        // [ENSURES:] are removed grammar the parser rejects by name — this
        // fixture was re-verified against the real CLI: 2 passed, 1 skipped.)
        let handWritten = """
        title: Hand-written
        ---

        > x notice
        [OK: contains "the lamp gutters"]

        > take notice
        [SKIP]

        > x notice
        [OK]
        text
        [posted by order of the proving board]

        She said "take it" and would not look at you.

        [the lamp gutters]
        end text

        """
        try handWritten.write(to: transcriptsDir.appendingPathComponent("hand.transcript"),
                              atomically: true, encoding: .utf8)

        let run = runSavedTests()
        XCTAssertEqual(run.result?.state, .passed,
                       "hand-written [OK: contains] / [SKIP] / [OK]+text must run green")
        XCTAssertEqual(run.ends.map(\.status), [.passed])
        XCTAssertEqual(run.ends.first?.passed, 2)
        XCTAssertEqual(run.ends.first?.skipped, 1,
                       "the [SKIP] turn executes but reports as skipped, not passed")
    }

    // MARK: - Helpers

    /// The content of the first text block in `source`, or nil when there is
    /// none. Mirrors ADR-287's rule: `text` opens, `end text` closes, both at
    /// column 0.
    private static func blockContent(in source: String) -> String? {
        let lines = source.components(separatedBy: "\n")
        guard let open = lines.firstIndex(where: { $0 == "text" }),
              let close = lines[(open + 1)...].firstIndex(of: "end text") else { return nil }
        return lines[(open + 1)..<close].joined(separator: "\n")
    }
}

@MainActor
private final class SaveAsTestObserver: TestRunnerDelegate {
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
