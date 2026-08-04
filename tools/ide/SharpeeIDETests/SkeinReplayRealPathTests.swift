// SkeinReplayRealPathTests.swift
// ADR-299 Phase 6 real-path tests (rule 13a) — click-to-replay against the real
// client, which is the phase's exit gate. Replay's contract is not "the right
// text came back" but "the story is LIVE at that node" (D1/D6), and the only
// way to prove live is to keep playing: after replaying to a node, the next
// typed command must branch THERE, not wherever play happened to be.
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
final class SkeinReplayRealPathTests: XCTestCase {

    private var tempDir: URL!
    private var projectDir: URL!
    private var play: PlayViewController!

    /// A fixture with a fragile bottle and a scenery anvil, so
    /// `throw bottle at anvil` draws real stdlib choice points
    /// (`stdlib.throwing.hit-stationary`, `stdlib.throwing.breaks`) that a
    /// forced branch can pin. Two takeable items give the tree something to
    /// branch on.
    private static let forgeStory = """
    story
      title: Forge Probe
      authors: Tests
      id: forge-probe
      story-version: 1.0.0
      ifid: 3D5E7FAA-4F60-4182-BDCE-3F4051627D8E

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
            .appendingPathComponent("SharpeeIDE-SkeinReplay-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        projectDir = tempDir.appendingPathComponent("forge", isDirectory: true)
        try FileManager.default.createDirectory(at: projectDir, withIntermediateDirectories: true)
        try FileManager.default.createSymbolicLink(
            at: projectDir.appendingPathComponent("node_modules"),
            withDestinationURL: TestToolchain.repoRoot.appendingPathComponent("node_modules"))
        let storyFile = projectDir.appendingPathComponent("forge.story")
        try Self.forgeStory.write(to: storyFile, atomically: true, encoding: .utf8)

        // Pin the seed rather than letting the session mint one, so a failure
        // reproduces exactly (the repo's pinned-seed discipline).
        try SkeinStore.write(SkeinDocument(seed: 12345,
                                           root: SkeinNode(command: "", output: "")),
                             to: SkeinStore.url(forStoryId: "forge-probe",
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

    /// Removes the AudioContext constructor from the fixture's own page,
    /// before `game.js` runs.
    ///
    /// The sandboxed test host has no audio entitlement and
    /// `audioContext.resume()` never returns there, which would freeze the
    /// client's `executeCommand` at its unlock await before any turn runs.
    /// Patching the PAGE rather than evaluating after boot is what makes this
    /// survive the reloads a replay performs. The client then takes its own
    /// production no-AudioContext path (instant-gain mode); the prose pipeline
    /// under test is untouched.
    private func neutralizeAudioInBuiltPage() throws {
        let indexURL = projectDir
            .appendingPathComponent("dist/web/forge-probe/index.html")
        var html = try String(contentsOf: indexURL, encoding: .utf8)
        html = html.replacingOccurrences(
            of: "<script src=\"game.js\">",
            with: "<script>window.AudioContext=undefined;window.webkitAudioContext=undefined;</script>"
                + "<script src=\"game.js\">")
        try html.write(to: indexURL, atomically: true, encoding: .utf8)
    }

    /// Builds the fixture, loads the bundle, and waits for the client to boot.
    private func boot() async throws {
        try build(projectDir.appendingPathComponent("forge.story"))
        play.load(bundleDirectory: projectDir.appendingPathComponent("dist/web/forge-probe",
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

    /// The prose currently on the page.
    private func pageText() async throws -> String {
        (try await play.evaluateInPlaySurface(
            "document.getElementById('text-content').textContent")) as? String ?? ""
    }

    /// Restarts and waits for a genuinely FRESH page.
    ///
    /// Stamps the outgoing document first: the reload is asynchronous, and the
    /// page being discarded satisfies every readiness probe until it is
    /// replaced — so without this the next typed command lands in the old
    /// world. (The production replay path does the same, for the same reason.)
    private func restart() async throws {
        _ = try? await play.evaluateInPlaySurface("window.__testStalePage = true; 0")
        play.restart()
        try await waitForBoot()
    }

    // MARK: - AC-1 (UI half): replay leaves the story live at the node

    func testReplayingToANodeLeavesTheStoryLiveThereAndPlayContinuesFromIt() async throws {
        try await boot()

        // Thread A: take the bottle, then the tongs.
        try await type("take bottle")
        try await type("take tongs")
        let threadA = try XCTUnwrap(play.skein?.currentNodeId)

        // Thread B: same first command (walks), then diverges.
        try await restart()
        try await type("take bottle")
        try await type("drop bottle")
        let threadB = try XCTUnwrap(play.skein?.currentNodeId)
        XCTAssertNotEqual(threadA, threadB)

        // The tree really did branch rather than duplicate the shared prefix.
        let saved = try SkeinStore.read(
            from: SkeinStore.url(forStoryId: "forge-probe", projectRoot: projectDir))
        XCTAssertEqual(saved.root.children.map(\.command), ["take bottle"])
        XCTAssertEqual(saved.root.children[0].children.map(\.command),
                       ["take tongs", "drop bottle"])

        // Replay back to thread A's terminal — the phase's headline gesture.
        try await play.replay(toNodeId: threadA)

        XCTAssertEqual(play.skein?.currentNodeId, threadA,
                       "play must sit on the replayed node")
        let text = try await pageText()
        XCTAssertTrue(text.contains("take tongs"),
                      "the replayed thread's commands must be on the page, got:\n\(text)")
        XCTAssertFalse(text.contains("drop bottle"),
                       "the OTHER thread's turns must not be on the replayed page")

        // The real proof of "live": keep playing. The next command must branch
        // from the replayed node, not from wherever play was before.
        try await type("drop tongs")
        let after = try SkeinStore.read(
            from: SkeinStore.url(forStoryId: "forge-probe", projectRoot: projectDir))
        XCTAssertEqual(after.node(withId: threadA)?.children.map(\.command), ["drop tongs"],
                       "typing after a replay must extend the replayed thread (D1)")
        XCTAssertEqual(after.node(withId: threadB)?.children.map(\.command), [],
                       "the thread play was on before the replay must be untouched")
    }

    func testReplayingToAnUnknownNodeRefusesAndLeavesPlayAlone() async throws {
        try await boot()
        try await type("take bottle")
        let node = try XCTUnwrap(play.skein?.currentNodeId)

        do {
            try await play.replay(toNodeId: "no-such-node")
            XCTFail("replaying to a node that is not in the skein must refuse")
        } catch let error as PlayViewController.ReplayError {
            XCTAssertEqual(error, .unknownNode("no-such-node"))
        }
        XCTAssertEqual(play.skein?.currentNodeId, node,
                       "a refused replay must not move play")
    }

    // MARK: - AC-4 (UI half): a forced branch replays its forced outcome live

    func testAForcedSiblingGrownFromTheTreeReplaysItsForcedOutcomeInTheLiveStory() async throws {
        try await boot()

        try await type("take bottle")
        try await type("throw bottle at anvil")
        let played = try XCTUnwrap(play.skein?.currentNodeId)
        let playedOutput = try XCTUnwrap(play.skein?.document.node(withId: played)?.output)

        // Grow the counterfactual through the same door the Skein view's Force
        // affordance uses, forcing the opposite of whatever the seed drew.
        let broke = playedOutput.contains("smashes against")
        let forced = try XCTUnwrap(try play.skein?.growForcedSibling(
            of: played,
            forcings: ["stdlib.throwing.hit-stationary#1=yes",
                       "stdlib.throwing.breaks#1=\(broke ? "no" : "yes")"]))

        // Replaying the branch drives the LIVE client with the forcing applied.
        try await play.replay(toNodeId: forced.id)

        XCTAssertEqual(play.skein?.currentNodeId, forced.id)
        let text = try await pageText()
        if broke {
            XCTAssertTrue(text.contains("It hits!"),
                          "forcing breaks=no must show the non-breaking prose, got:\n\(text)")
            XCTAssertFalse(text.contains("smashes against"))
        } else {
            XCTAssertTrue(text.contains("smashes against"),
                          "forcing breaks=yes must show the breaking prose, got:\n\(text)")
        }

        // A new thread from the story start must not inherit the branch's
        // forcing — an ostensibly fresh playthrough silently bent by a
        // leftover force is the worst kind of wrong (D5).
        XCTAssertFalse(play.pendingForcings.isEmpty, "the replay is running forced")
        try await restart()
        XCTAssertTrue(play.pendingForcings.isEmpty,
                      "\"new thread from root\" must clear the replayed branch's forcings")
        try await type("take bottle")
        try await type("throw bottle at anvil")
        let unforced = try XCTUnwrap(
            play.skein?.document.node(withId: play.skein!.currentNodeId)?.output)
        XCTAssertEqual(unforced.contains("smashes against"), broke,
                       "a fresh thread must draw what the pinned seed draws, unforced")

        // The forced branch captured its own output — a first-class thread,
        // not a view over the node it shadows (D5).
        let saved = try SkeinStore.read(
            from: SkeinStore.url(forStoryId: "forge-probe", projectRoot: projectDir))
        let branch = try XCTUnwrap(saved.node(withId: forced.id))
        XCTAssertEqual(branch.command, "throw bottle at anvil")
        XCTAssertFalse(branch.forcings.isEmpty)
        XCTAssertNotEqual(saved.node(withId: played)?.output, "",
                          "the shadowed node keeps its own played output")
    }
}
