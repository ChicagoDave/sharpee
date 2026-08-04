// SkeinExportRealPathTests.swift
// ADR-299 Phase 9 real-path test (rule 13a) — AC-5, AC-4's export half, and
// AC-7's end-to-end round trip. A transcript the exporter merely PRODUCES
// proves nothing; the claim is that a blessed thread becomes a test that
// PASSES under the real runner, with no IDE in the loop. So the blessed text
// comes from a real WKWebView session of a real devkit-built bundle, and the
// exported files are run by the real `sharpee test` the IDE itself spawns.
//
// A dedicated fixture story (never a real story). Skips when
// packages/devkit/dist/cli.js is absent (`./repokit build`).

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class SkeinExportRealPathTests: XCTestCase {

    private var projectDir: URL!
    private var play: PlayViewController!

    /// A fragile bottle and a scenery anvil, so `throw bottle at anvil` draws
    /// real stdlib choice points a forced branch can pin (the Phase 5/6
    /// fixture, on its own story id).
    private static let forgeStory = """
    story
      title: Forge Export Probe
      authors: Tests
      id: forge-export
      story-version: 1.0.0
      ifid: 51D8C0B7-2E2A-4A44-9F0D-7C5E1B3A6D22

    create the Forge
      a room

      A soot-black forge.

    create the anvil
      scenery
      in the Forge

      A massive anvil.

    create the glass bottle
      aka bottle
      in the Forge

      A delicate glass bottle.

    create the player
      starts in the Forge

      You.

    """

    override func setUpWithError() throws {
        super.setUp()
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "packages/devkit/dist/cli.js missing — ./repokit build")

        projectDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SkeinExport-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
            .appendingPathComponent("forge", isDirectory: true)
        try FileManager.default.createDirectory(at: projectDir, withIntermediateDirectories: true)
        try FileManager.default.createSymbolicLink(
            at: projectDir.appendingPathComponent("node_modules"),
            withDestinationURL: TestToolchain.repoRoot.appendingPathComponent("node_modules"))
        try Self.forgeStory.write(to: projectDir.appendingPathComponent("forge.story"),
                                  atomically: true, encoding: .utf8)

        // Pin the seed so a failure reproduces exactly, and so the exported
        // transcript's `seed:` header is a known value.
        try SkeinStore.write(SkeinDocument(seed: 12345,
                                           root: SkeinNode(command: "", output: "")),
                             to: SkeinStore.url(forStoryId: "forge-export",
                                                projectRoot: projectDir))

        play = PlayViewController()
        _ = play.view
        play.storyDirectory = projectDir
    }

    override func tearDownWithError() throws {
        play = nil
        let root = projectDir?.deletingLastPathComponent()
        if let root, FileManager.default.fileExists(atPath: root.path) {
            try FileManager.default.removeItem(at: root)
        }
        projectDir = nil
        super.tearDown()
    }

    // MARK: - Harness

    private func build() throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node", TestToolchain.devkitCLI.path, "build",
                             projectDir.appendingPathComponent("forge.story").path]
        process.currentDirectoryURL = projectDir
        process.environment = ShellEnvironment.buildEnvironment()
        let errors = Pipe()
        process.standardOutput = Pipe()
        process.standardError = errors
        try process.run()
        let errorData = errors.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            throw XCTSkip("devkit build failed:\n\(String(data: errorData, encoding: .utf8) ?? "")")
        }
        // The sandboxed test host has no audio entitlement and
        // `audioContext.resume()` never returns there; patch the PAGE so the
        // client takes its own production no-AudioContext path across reloads.
        let indexURL = projectDir.appendingPathComponent("dist/web/forge-export/index.html")
        var html = try String(contentsOf: indexURL, encoding: .utf8)
        html = html.replacingOccurrences(
            of: "<script src=\"game.js\">",
            with: "<script>window.AudioContext=undefined;window.webkitAudioContext=undefined;</script>"
                + "<script src=\"game.js\">")
        try html.write(to: indexURL, atomically: true, encoding: .utf8)
    }

    private func boot() async throws {
        try build()
        play.load(bundleDirectory: projectDir.appendingPathComponent("dist/web/forge-export",
                                                                     isDirectory: true))
        XCTAssertTrue(play.isLoaded, "the built bundle must load into the pane")
        try await waitForBoot()
    }

    private func waitForBoot() async throws {
        for _ in 0..<300 {
            if let ready = try? await play.evaluateInPlaySurface("""
            (function () {
              if (window.__testStalePage) return false;
              var i = document.getElementById('command-input');
              var t = document.getElementById('text-content');
              return !!(i && t && t.textContent.trim().length > 0);
            })()
            """), ready as? Bool == true { return }
            try await Task.sleep(nanoseconds: 200_000_000)
        }
        XCTFail("the fixture client did not boot within 60s")
    }

    private func type(_ command: String) async throws {
        let literal = String(data: try JSONSerialization.data(withJSONObject: [command]),
                             encoding: .utf8)!
        _ = try await play.evaluateInPlaySurface("""
        (function () {
          var input = document.getElementById('command-input');
          input.value = \(literal)[0];
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        })()
        """)
        for _ in 0..<300 {
            if let skein = play.skein,
               skein.document.node(withId: skein.currentNodeId)?.command == command { return }
            try await Task.sleep(nanoseconds: 200_000_000)
        }
        XCTFail("turn '\(command)' did not reach the skein within 60s")
    }

    /// Runs the named transcripts through the real `sharpee test` — the same
    /// spawn `ReplayDriver` performs, story and files named explicitly.
    ///
    /// Explicitly rather than by handing over the project directory: the
    /// fixture carries a `node_modules` symlink into the monorepo (the build
    /// needs it), and a directory scan walks into it and never comes back.
    ///
    /// `async` + `fulfillment(of:)` rather than the synchronous `wait(for:)`:
    /// this is a main-actor async test, and blocking the actor would starve the
    /// runner's own main-actor callbacks — the expectation could never be
    /// fulfilled, so the run reads as a hang rather than a failure.
    private func runExportedTests(_ files: [URL]) async
        -> (result: TestRunner.Result?, ends: [TestTranscriptEnd]) {
        let runner = TestRunner()
        let observer = ExportRunObserver()
        runner.delegate = observer
        let exited = expectation(description: "sharpee test exits")
        observer.onExit = { exited.fulfill() }
        runner.start(executable: URL(fileURLWithPath: "/usr/bin/env"),
                     arguments: ["node", TestToolchain.devkitCLI.path, "test",
                                 projectDir.appendingPathComponent("forge.story").path]
                         + files.map(\.path) + ["--json"],
                     workingDirectory: projectDir,
                     environment: ShellEnvironment.buildEnvironment())
        await fulfillment(of: [exited], timeout: 180)
        let ends = observer.records.compactMap { record -> TestTranscriptEnd? in
            if case .transcriptEnd(let end) = record { return end } else { return nil }
        }
        return (observer.result, ends)
    }

    private var transcriptsDir: URL {
        projectDir.appendingPathComponent("tests/transcripts", isDirectory: true)
    }

    // MARK: - AC-5 + AC-4 (export half)

    func testABlessedThreadAndAForcedBranchExportAsTranscriptsThatPassHeadless() async throws {
        try await boot()

        try await type("take bottle")
        try await type("throw bottle at anvil")
        let skein = try XCTUnwrap(play.skein)
        let played = try XCTUnwrap(skein.currentNodeId)
        let playedOutput = try XCTUnwrap(skein.document.node(withId: played)?.output)

        // Bless what the real story printed, on the thread the author played.
        let take = try XCTUnwrap(skein.document.thread(to: played)?.nodes.first {
            $0.command == "take bottle"
        })
        XCTAssertTrue(try skein.bless(nodeId: take.id, scope: .thisThread))
        XCTAssertTrue(try skein.bless(nodeId: played, scope: .thisThread))

        // The counterfactual: force the opposite of whatever the pinned seed
        // drew, replay it live so the branch captures its own output, bless it.
        let broke = playedOutput.contains("smashes against")
        let forced = try XCTUnwrap(try skein.growForcedSibling(
            of: played,
            forcings: ["stdlib.throwing.hit-stationary#1=yes",
                       "stdlib.throwing.breaks#1=\(broke ? "no" : "yes")"]))
        try await play.replay(toNodeId: forced.id)

        let forcedOutput = try XCTUnwrap(skein.actualOutput(forNodeId: forced.id))
        XCTAssertFalse(forcedOutput.isEmpty,
                       "a forced branch must capture its OWN output — it cannot be blessed "
                       + "or exported otherwise (D5)")
        XCTAssertNotEqual(forcedOutput, playedOutput,
                          "the forced branch must differ from the node it shadows")
        XCTAssertEqual(skein.document.node(withId: played)?.output, playedOutput,
                       "the shadowed node must keep its own played output")
        XCTAssertTrue(try skein.bless(nodeId: forced.id, scope: .thisThread))

        // Mint both threads as tests, into ADR-280's classified folder.
        let playedFile = transcriptsDir.appendingPathComponent("played.transcript")
        let forcedFile = transcriptsDir.appendingPathComponent("forced.transcript")
        try SkeinExporter.write(document: skein.document, toNodeId: played,
                                title: "played", to: playedFile)
        try SkeinExporter.write(document: skein.document, toNodeId: forced.id,
                                title: "forced", to: forcedFile)

        let playedSource = try String(contentsOf: playedFile, encoding: .utf8)
        let forcedSource = try String(contentsOf: forcedFile, encoding: .utf8)
        XCTAssertTrue(playedSource.contains("seed: 12345"), playedSource)
        XCTAssertFalse(playedSource.contains("forces:"),
                       "the unforced thread forces nothing")
        XCTAssertTrue(forcedSource.contains("forces: stdlib.throwing.hit-stationary#1=yes, "
                                            + "stdlib.throwing.breaks#1=\(broke ? "no" : "yes")"),
                      forcedSource)
        XCTAssertTrue(forcedSource.contains("[OK]"), "the forced branch asserts its forced outcome")

        // The claim: they PASS under the real runner, no IDE involved.
        let run = await runExportedTests([playedFile, forcedFile])
        XCTAssertEqual(run.result?.state, .passed,
                       "exported threads must pass headless\n\(run.ends)")
        XCTAssertEqual(Set(run.ends.map(\.status)), [.passed])
        XCTAssertEqual(run.ends.count, 2)
        XCTAssertTrue(run.ends.allSatisfy { $0.passed >= 1 },
                      "each exported test must assert something\n\(run.ends)")
    }

    // MARK: - AC-5's refusal, and AC-7 end to end

    func testAThreadNobodyBlessedIsNeverWrittenAndTheSkeinSurvivesAFreshLaunch() async throws {
        try await boot()

        try await type("take bottle")
        let skein = try XCTUnwrap(play.skein)
        let node = try XCTUnwrap(skein.currentNodeId)

        let url = transcriptsDir.appendingPathComponent("unblessed.transcript")
        XCTAssertThrowsError(try SkeinExporter.write(document: skein.document, toNodeId: node,
                                                     title: "unblessed", to: url)) { error in
            XCTAssertEqual(error as? SkeinExporter.ExportError, .noBlessings)
        }
        XCTAssertFalse(FileManager.default.fileExists(atPath: url.path),
                       "no transcript is ever written without the author's assertion (AC-5)")

        XCTAssertTrue(try skein.bless(nodeId: node, scope: .allPaths))
        try skein.setAnnotation("the opening grab", forNodeId: node)
        try skein.setTags(["golden path"], forNodeId: node)

        // AC-7 end to end: what a relaunched IDE reads back is the same skein,
        // and it exports byte-identically — an artifact that survives the file
        // only in the running process is not committed work.
        let relaunched = try SkeinSession(
            storeURL: SkeinStore.url(forStoryId: "forge-export", projectRoot: projectDir))
        XCTAssertEqual(relaunched.seed, 12345)
        XCTAssertEqual(relaunched.document.node(withId: node)?.blessing?.scope, .allPaths)
        XCTAssertEqual(relaunched.document.node(withId: node)?.annotation, "the opening grab")
        XCTAssertEqual(relaunched.document.node(withId: node)?.tags, ["golden path"])

        XCTAssertEqual(
            try SkeinExporter.transcriptSource(document: relaunched.document,
                                               toNodeId: node, title: "t"),
            try SkeinExporter.transcriptSource(document: skein.document,
                                               toNodeId: node, title: "t"))
        XCTAssertEqual(SkeinExporter.defaultFilename(document: relaunched.document,
                                                     toNodeId: node),
                       "golden-path.transcript")
    }
}

/// Collects the run's NDJSON so the test can read what the runner reported.
@MainActor
private final class ExportRunObserver: TestRunnerDelegate {
    var records: [TestResultRecord] = []
    var result: TestRunner.Result?
    var onExit: (() -> Void)?

    func runner(_ runner: TestRunner, didDecode record: TestResultRecord) {
        records.append(record)
    }
    func runner(_ runner: TestRunner, didFailDecode error: Error) {}
    func runner(_ runner: TestRunner, didEmitStderr text: String) {}
    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State) {}
    func runner(_ runner: TestRunner, didExit result: TestRunner.Result) {
        self.result = result
        onExit?()
    }
}
