// SkeinInvarianceRealPathTests.swift
// ADR-299 Phase 7 real-path test (rule 13a) — AC-3, the phase's exit gate.
// Cross-thread state-leak detection is an integration behaviour, not
// decoration: the leak has to be one the REAL engine produces, observed on a
// REAL replay of a REAL browser bundle, or the check proves nothing about the
// tool authors will use.
//
// The leak used here is D3's own example — a room description that mentions
// carried state. `look` from the story start lists the bottle; `look` after
// taking it does not. Blessing the first FOR ALL PATHS is therefore a false
// invariance claim, and the second thread's replay must surface it as a
// finding rather than diff it silently.
//
// A dedicated fixture story (never a real story) built by the real devkit CLI,
// loaded into a real PlayViewController over its real scheme handler, driven
// through the client's own input.
//
// Skips when packages/devkit/dist/cli.js is absent (`./repokit build`).

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class SkeinInvarianceRealPathTests: XCTestCase {

    private var tempDir: URL!
    private var projectDir: URL!
    private var play: PlayViewController!

    /// Two takeable items in one room, so `look` has something to stop listing
    /// once the player is carrying it — the state leak this test needs is the
    /// engine's own room listing, not story prose written to fake one.
    private static let forgeStory = """
    story
      title: Forge Invariance Probe
      authors: Tests
      id: forge-invariance
      story-version: 1.0.0
      ifid: 6C1B0E22-9A44-4E13-9C7E-2B5A0F71D9C3

    create the Forge
      a room

      A soot-black forge.

    create the glass bottle
      aka bottle
      in the Forge

      A delicate glass bottle.

    create the iron tongs
      aka tongs
      in the Forge

      A pair of iron tongs.

    create the player
      starts in the Forge

      You.

    """

    override func setUpWithError() throws {
        super.setUp()
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "packages/devkit/dist/cli.js missing — ./repokit build")

        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SkeinInvariance-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        projectDir = tempDir.appendingPathComponent("forge", isDirectory: true)
        try FileManager.default.createDirectory(at: projectDir, withIntermediateDirectories: true)
        try FileManager.default.createSymbolicLink(
            at: projectDir.appendingPathComponent("node_modules"),
            withDestinationURL: TestToolchain.repoRoot.appendingPathComponent("node_modules"))
        try Self.forgeStory.write(to: projectDir.appendingPathComponent("forge.story"),
                                  atomically: true, encoding: .utf8)

        // Pin the seed rather than letting the session mint one, so a failure
        // reproduces exactly (the repo's pinned-seed discipline).
        try SkeinStore.write(SkeinDocument(seed: 12345,
                                           root: SkeinNode(command: "", output: "")),
                             to: SkeinStore.url(forStoryId: "forge-invariance",
                                                projectRoot: projectDir))

        play = PlayViewController()
        _ = play.view
        play.storyDirectory = projectDir
    }

    override func tearDownWithError() throws {
        play = nil
        if let tempDir, FileManager.default.fileExists(atPath: tempDir.path) {
            try FileManager.default.removeItem(at: tempDir)
        }
        tempDir = nil
        super.tearDown()
    }

    // MARK: - Harness

    /// Builds the fixture's browser bundle with the real devkit CLI.
    ///
    /// Called from `boot()` rather than `setUpWithError()`: the toolchain
    /// helpers it needs are main-actor isolated, and setUp is not.
    private func build(_ storyFile: URL) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node", TestToolchain.devkitCLI.path, "build", storyFile.path]
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
        try neutralizeAudioInBuiltPage()
    }

    /// Removes the AudioContext constructor from the fixture's own page, before
    /// `game.js` runs — the sandboxed test host has no audio entitlement and
    /// `audioContext.resume()` never returns there, which would freeze the
    /// client's first turn. The client then takes its own production
    /// no-AudioContext path; the prose pipeline under test is untouched.
    private func neutralizeAudioInBuiltPage() throws {
        let indexURL = projectDir
            .appendingPathComponent("dist/web/forge-invariance/index.html")
        var html = try String(contentsOf: indexURL, encoding: .utf8)
        html = html.replacingOccurrences(
            of: "<script src=\"game.js\">",
            with: "<script>window.AudioContext=undefined;window.webkitAudioContext=undefined;</script>"
                + "<script src=\"game.js\">")
        try html.write(to: indexURL, atomically: true, encoding: .utf8)
    }

    private func boot() async throws {
        try build(projectDir.appendingPathComponent("forge.story"))
        play.load(bundleDirectory: projectDir
            .appendingPathComponent("dist/web/forge-invariance", isDirectory: true))
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

    /// Types a command into the real client and waits for the turn to land.
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

    /// Restarts and waits for a genuinely FRESH page. Stamps the outgoing
    /// document first: the reload is asynchronous and the page being discarded
    /// satisfies every readiness probe until it is replaced.
    private func restart() async throws {
        _ = try? await play.evaluateInPlaySurface("window.__testStalePage = true; 0")
        play.restart()
        try await waitForBoot()
    }

    // MARK: - AC-3

    func testAnAllPathsBlessingViolatedByASecondThreadSurfacesAsAFindingOnItsReplay() async throws {
        try await boot()

        // Thread A: `look` straight from the story start.
        try await type("look")
        let clean = try XCTUnwrap(play.skein?.currentNodeId)

        // Thread B: take the bottle first, then `look` — the same position,
        // reached carrying different state.
        try await restart()
        try await type("take bottle")
        try await type("look")
        let carrying = try XCTUnwrap(play.skein?.currentNodeId)
        XCTAssertNotEqual(clean, carrying, "the two looks must be different nodes")

        let skein = try XCTUnwrap(play.skein)
        let cleanText = try XCTUnwrap(skein.document.node(withId: clean)?.output)
        let carryingText = try XCTUnwrap(skein.document.node(withId: carrying)?.output)
        XCTAssertNotEqual(cleanText, carryingText,
                          """
                          the fixture must actually leak state through `look`, or this test \
                          proves nothing. Got the same text both times:
                          \(cleanText)
                          """)

        // The author declares the claim: this room reads the same on every path.
        // It does not — which is the point.
        XCTAssertTrue(try skein.bless(nodeId: clean, scope: .allPaths))

        // Replaying thread B re-runs it at the pinned seed against the real
        // engine; verification runs over what it actually printed.
        try await play.replay(toNodeId: carrying)

        let findings = skein.findings(forThreadTo: carrying)
        XCTAssertEqual(findings.map(\.kind), [.invarianceViolated(blessedNodeId: clean)],
                       "a violated all-paths claim must be a first-class finding")
        let finding = try XCTUnwrap(findings.first)
        XCTAssertEqual(finding.nodeId, carrying)
        XCTAssertEqual(finding.command, "look")
        XCTAssertEqual(finding.blessed, cleanText)
        XCTAssertEqual(finding.actual, carryingText,
                       "the finding must carry what the REPLAY printed, not the stored capture")

        // And it reaches the surface the author reads, rather than staying a
        // diff nobody is shown (D8).
        let transcript = TranscriptView()
        transcript.setSession(skein)
        transcript.show(threadTo: carrying)
        XCTAssertEqual(transcript.findings, findings)
        XCTAssertTrue(TranscriptView.headline(nodeCount: 3, findings: transcript.findings)
            .contains("⚠ 1 finding"))
    }

    func testReplayingTheBlessingsOwnThreadIsSilent() async throws {
        try await boot()

        try await type("look")
        let clean = try XCTUnwrap(play.skein?.currentNodeId)
        try await restart()
        try await type("take bottle")
        try await type("look")
        let carrying = try XCTUnwrap(play.skein?.currentNodeId)

        let skein = try XCTUnwrap(play.skein)
        XCTAssertTrue(try skein.bless(nodeId: clean, scope: .allPaths))

        // Replaying the thread the claim was made on: at the pinned seed the
        // real engine reproduces the blessed text, so the author who made the
        // claim is not the one nagged about it.
        try await play.replay(toNodeId: clean)

        XCTAssertEqual(skein.findings(forThreadTo: clean), [],
                       "the blessing thread must be silent — noise here would train "
                       + "authors to ignore findings")
        XCTAssertEqual(skein.observedOutputs[clean],
                       skein.document.node(withId: clean)?.output,
                       "the replay must reproduce the captured output byte-for-byte")
        XCTAssertNil(skein.observedOutputs[carrying],
                     "the other thread was not replayed and must not be reported on")
    }
}
