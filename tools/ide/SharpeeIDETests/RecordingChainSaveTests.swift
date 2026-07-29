// RecordingChainSaveTests.swift
// ADR-282 Phase 3 real-path tests (rule 13a) — Acceptance 4, driven end to end,
// plus D4's append and stray-file rules against a real `walkthroughs/`.
//
// Nothing here hand-writes the story's prose or hand-writes a transcript: the
// responses are CAPTURED from the real engine (TestToolchain.captureResponses),
// blessed, split at real checkpoint marks, written by the real save path, and
// replayed through the real `sharpee test --chain` CLI on real files.
//
// The claim Acceptance 4 actually makes is that state flows ACROSS the file
// boundaries. A passing chain alone does not prove that — a chain of three
// independent transcripts would also pass. So the same three files are run a
// second time WITHOUT --chain, where each is a fresh game, and the last one
// must FAIL. That failure is the proof: the only thing that makes it pass under
// --chain is the take that happened two files earlier.
//
// Skips when `dist/cli/sharpee.js` is absent (`./repokit build dungeo`).

import XCTest
@testable import SharpeeIDE

@MainActor
final class RecordingChainSaveTests: XCTestCase {

    private var projectDir: URL!
    private var storyFile: URL!
    private var walkthroughsDir: URL!

    /// One room and one takeable thing whose description is entirely author
    /// prose — so a platform message rewording cannot make these tests flap.
    private static let story = """
    story "Chain Probe" by "Tests"
      id: chain-probe
      version: 1.0.0

    create the Den
      a room

      A small square den.

    create the notice
      aka card
      in the Den

      [posted by order of the proving board]

      She said "take it" and would not look at you.

    create the player
      starts in the Den

      You.

    """

    /// Examine, take, then check inventory. The third command's response can
    /// only name the notice if the second command's take survived the file
    /// boundary between them.
    private static let commands = ["x notice", "take notice", "i"]

    override func setUpWithError() throws {
        super.setUp()
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.cliBundle.path),
                          "dist/cli/sharpee.js missing — ./repokit build dungeo")

        projectDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-Chain-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        // ADR-280's classifier looks for a top-level `walkthroughs/`; a chain
        // saved anywhere else is invisible in the sidebar AND invisible to
        // `--chain` with no explicit files.
        walkthroughsDir = projectDir.appendingPathComponent(WalkthroughChain.directoryName,
                                                            isDirectory: true)
        try FileManager.default.createDirectory(at: walkthroughsDir, withIntermediateDirectories: true)
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

    /// A recording of what the story really said, checkpointed after the first
    /// and second turns (Acceptance 4's two checkpoints) and blessed twice: the
    /// notice's description verbatim in segment one, and the inventory's
    /// mention of it in segment three.
    private func checkpointedSession() throws -> PlayViewController {
        let responses = try TestToolchain.captureResponses(storyFile: storyFile,
                                                           commands: Self.commands)
        XCTAssertEqual(responses.count, Self.commands.count)
        let play = PlayViewController()
        play.recording.start()
        for (command, response) in zip(Self.commands, responses) {
            play.recording.record(command: command, response: response)
        }
        play.recording.setCheckpoint(true, turnAt: 0)
        play.recording.setCheckpoint(true, turnAt: 1)
        play.recording.bless(turnAt: 0)
        // A selection rather than a verbatim bless: the inventory listing is
        // stdlib wording apart from the item's own name, and the name is the
        // load-bearing part — it is there only because the take carried.
        play.recording.bless(turnAt: 2, selection: "notice")
        play.recording.stop()
        return play
    }

    /// Runs the saved chain through the real `sharpee test` CLI.
    ///
    /// - Parameter chained: true for `--chain` (one game across the files),
    ///   false to run the same files as independent fresh games.
    private func runChain(chained: Bool, files: [URL]) -> (result: TestRunner.Result?,
                                                           ends: [TestTranscriptEnd]) {
        var arguments = ["node", TestToolchain.devkitCLI.path, "test", projectDir.path]
        if chained {
            arguments.append("--chain")   // with no files: scans walkthroughs/ in filename order
        } else {
            arguments.append(contentsOf: files.map(\.path))
        }
        arguments.append("--json")

        let runner = TestRunner()
        let observer = ChainRunObserver()
        runner.delegate = observer
        let exited = expectation(description: "sharpee test exits")
        observer.onExit = { exited.fulfill() }
        runner.start(executable: URL(fileURLWithPath: "/usr/bin/env"),
                     arguments: arguments,
                     workingDirectory: projectDir,
                     environment: ShellEnvironment.buildEnvironment())
        wait(for: [exited], timeout: 240)
        let ends = observer.records.compactMap { record -> TestTranscriptEnd? in
            if case .transcriptEnd(let end) = record { return end } else { return nil }
        }
        return (observer.result, ends)
    }

    /// Minimal but valid transcript source, for seeding a pre-existing chain.
    private func seedTranscript(_ name: String) throws {
        try """
        title: Seeded \(name)
        ---

        > look
        [OK: any]

        """.write(to: walkthroughsDir.appendingPathComponent(name),
                  atomically: true, encoding: .utf8)
    }

    // MARK: - Acceptance 4 — two checkpoints, three transcripts, state carried

    func testTwoCheckpointsSaveThreeTranscriptsThatPassUnderChain() throws {
        let play = try checkpointedSession()

        let written = try play.writeChain(to: walkthroughsDir, name: "Cellar Run", mode: .append)

        XCTAssertEqual(written.map(\.lastPathComponent),
                       ["wt-01-cellar-run.transcript",
                        "wt-02-cellar-run.transcript",
                        "wt-03-cellar-run.transcript"])
        for url in written {
            XCTAssertTrue(FileManager.default.fileExists(atPath: url.path),
                          "\(url.lastPathComponent) must be on disk")
        }

        let run = runChain(chained: true, files: written)
        XCTAssertEqual(run.result?.state, .passed,
                       "the recorded chain must pass under the real CLI with no IDE")
        XCTAssertEqual(run.ends.map(\.status), [.passed, .passed, .passed],
                       "all three segments run, in filename order")
    }

    func testTheChainGenuinelyCarriesStateAcrossTheFileBoundaries() throws {
        let play = try checkpointedSession()
        let written = try play.writeChain(to: walkthroughsDir, name: "Carry", mode: .append)

        XCTAssertEqual(runChain(chained: true, files: written).result?.state, .passed)

        // The same three files, each a fresh game. The third asserts the
        // inventory names the notice — which is only true if the take in the
        // SECOND file happened first. Without --chain it must fail.
        let unchained = runChain(chained: false, files: written)
        XCTAssertEqual(unchained.result?.state, .failed,
                       "run un-chained, the last segment has nothing in hand")
        XCTAssertEqual(unchained.ends.last?.status, .failed,
                       "and it is the LAST segment that fails, not an earlier one")
    }

    func testOnlyTheFirstSavedSegmentReplaysTheOpeningLook() throws {
        // ADR-282's chain amendment, on disk: segments 2..N are not fresh runs,
        // so an opening `look` in each would insert turns that never happened.
        let play = try checkpointedSession()
        let written = try play.writeChain(to: walkthroughsDir, name: "Opening", mode: .append)

        let sources = try written.map { try String(contentsOf: $0, encoding: .utf8) }
        XCTAssertTrue(sources[0].contains("> look"))
        XCTAssertFalse(sources[1].contains("> look"))
        XCTAssertFalse(sources[2].contains("> look"))
    }

    // MARK: - D4 — a recorded chain appends

    func testANewChainIsNumberedAfterTheHighestAlreadyPresent() throws {
        try seedTranscript("wt-01-existing.transcript")
        try seedTranscript("wt-02-existing.transcript")

        let play = try checkpointedSession()
        let written = try play.writeChain(to: walkthroughsDir, name: "Later", mode: .append)

        XCTAssertEqual(written.map(\.lastPathComponent),
                       ["wt-03-later.transcript",
                        "wt-04-later.transcript",
                        "wt-05-later.transcript"])
        XCTAssertTrue(FileManager.default.fileExists(
            atPath: walkthroughsDir.appendingPathComponent("wt-01-existing.transcript").path),
                      "an append must not disturb the chain it appends to")
    }

    // MARK: - D4 — strays warn, and replace is the deliberate way out

    func testAStrayTranscriptWarnsAndAnAppendLeavesItAlone() throws {
        try seedTranscript("smoke.transcript")

        let strays = WalkthroughChain.strays(in: walkthroughsDir)
        XCTAssertEqual(strays.map(\.lastPathComponent), ["smoke.transcript"])
        let warning = try XCTUnwrap(WalkthroughChain.warning(strays: strays),
                                    "a stray must surface a warning before the save")
        XCTAssertTrue(warning.contains("smoke.transcript"))

        let play = try checkpointedSession()
        let written = try play.writeChain(to: walkthroughsDir, name: "Beside", mode: .append)

        // Appending does not silently remove the stray — the author was told,
        // and chose to append anyway.
        XCTAssertTrue(FileManager.default.fileExists(
            atPath: walkthroughsDir.appendingPathComponent("smoke.transcript").path))
        XCTAssertEqual(written.first?.lastPathComponent, "wt-01-beside.transcript")
    }

    func testReplaceClearsTheOldChainAndStraysAndRenumbersFromOne() throws {
        try seedTranscript("wt-01-old.transcript")
        try seedTranscript("wt-02-old.transcript")
        try seedTranscript("smoke.transcript")

        let play = try checkpointedSession()
        let written = try play.writeChain(to: walkthroughsDir, name: "Fresh", mode: .replace)

        XCTAssertEqual(written.map(\.lastPathComponent),
                       ["wt-01-fresh.transcript",
                        "wt-02-fresh.transcript",
                        "wt-03-fresh.transcript"])
        XCTAssertEqual(WalkthroughChain.transcripts(in: walkthroughsDir).map(\.lastPathComponent),
                       written.map(\.lastPathComponent),
                       "a replace leaves the recorded chain and nothing else")

        // And the replaced chain still runs — a replace that renumbered but
        // orphaned a file would pass the naming assertion above and fail here.
        XCTAssertEqual(runChain(chained: true, files: written).result?.state, .passed)
    }

    func testReplacingAChainWithTheSameNameKeepsWhatItJustWrote() throws {
        // The dangerous case: every new segment name collides with an old one,
        // so "write, then clear the superseded" must not clear the new files.
        // Found in implementation — a listing spells a file `/private/var/…`
        // and a built path spells it `/var/…`, so URL identity said "different
        // file" and the save deleted its own output.
        try seedTranscript("wt-01-same.transcript")
        try seedTranscript("wt-02-same.transcript")
        try seedTranscript("wt-03-same.transcript")
        try seedTranscript("wt-04-same.transcript")

        let play = try checkpointedSession()
        let written = try play.writeChain(to: walkthroughsDir, name: "Same", mode: .replace)

        XCTAssertEqual(written.map(\.lastPathComponent),
                       ["wt-01-same.transcript",
                        "wt-02-same.transcript",
                        "wt-03-same.transcript"])
        for url in written {
            XCTAssertTrue(FileManager.default.fileExists(atPath: url.path),
                          "\(url.lastPathComponent) was written and must survive the clear")
        }
        XCTAssertFalse(FileManager.default.fileExists(
            atPath: walkthroughsDir.appendingPathComponent("wt-04-same.transcript").path),
                       "the old chain's extra segment must still be cleared")
        XCTAssertEqual(runChain(chained: true, files: written).result?.state, .passed)
    }

    // MARK: - Acceptance 3 holds on the chain path too

    func testAChainWithNothingBlessedIsRefusedAndWritesNothing() throws {
        let play = try checkpointedSession()
        for index in play.recording.turns.indices { play.recording.unbless(turnAt: index) }

        XCTAssertThrowsError(try play.writeChain(to: walkthroughsDir, name: "Empty", mode: .append)) {
            XCTAssertEqual($0 as? RecordingSaveError, .noBlessedTurns)
        }
        XCTAssertEqual(WalkthroughChain.transcripts(in: walkthroughsDir), [],
                       "a refused chain save must leave no file behind")
    }

    func testARefusedReplaceRemovesNothingEither() throws {
        try seedTranscript("wt-01-old.transcript")

        let play = try checkpointedSession()
        for index in play.recording.turns.indices { play.recording.unbless(turnAt: index) }

        XCTAssertThrowsError(try play.writeChain(to: walkthroughsDir, name: "Empty", mode: .replace))
        XCTAssertTrue(FileManager.default.fileExists(
            atPath: walkthroughsDir.appendingPathComponent("wt-01-old.transcript").path),
                      "the refusal comes before anything is cleared")
    }
}

@MainActor
private final class ChainRunObserver: TestRunnerDelegate {
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
