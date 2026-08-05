// ReplayRealPathTests.swift
// ADR-299 Phase 5 real-path tests (rule 13a) — replay against the real engine,
// with nothing standing in for anything.
//
// AC-2: a REAL WKWebView plays a REAL fernhill browser bundle (built in-test
// by the real devkit CLI), the Play pane's real bridge grows a real skein on
// disk, and the ReplayDriver re-executes that thread through the real
// `sharpee test --json --capture-output` — byte-identical against what the
// live session stored. This is the cross-surface comparison the Phase 3
// design note names: live browser capture vs headless replay, where any
// rendering-parity or RNG-alignment residue would surface.
//
// AC-4 (execution half): a forced sibling branch (D5) replayed through the
// real CLI reproduces the FORCED outcome of a real stdlib choice point, not
// the outcome the pinned seed would have drawn.
//
// Skips when packages/devkit/dist/cli.js is absent (`./repokit build`).

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class ReplayRealPathTests: XCTestCase {

    private var tempDir: URL!

    override func setUpWithError() throws {
        super.setUp()
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "packages/devkit/dist/cli.js missing — ./repokit build")
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-ReplayRealPath-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let tempDir, FileManager.default.fileExists(atPath: tempDir.path) {
            try FileManager.default.removeItem(at: tempDir)
        }
        tempDir = nil
        super.tearDown()
    }

    // MARK: - Harness

    /// Runs the real devkit CLI to completion. Blocking is fine here: these
    /// tests own their process, and `TestToolchain.captureResponses` set the
    /// precedent.
    private func runDevkit(_ arguments: [String], in directory: URL) throws -> Int32 {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node", TestToolchain.devkitCLI.path] + arguments
        process.currentDirectoryURL = directory
        process.environment = ShellEnvironment.buildEnvironment()
        let errors = Pipe()
        process.standardOutput = Pipe()
        process.standardError = errors
        try process.run()
        let errorData = errors.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        if process.terminationStatus != 0 {
            let stderr = String(data: errorData, encoding: .utf8) ?? ""
            XCTFail("devkit \(arguments.first ?? "") exited \(process.terminationStatus):\n\(stderr)")
        }
        return process.terminationStatus
    }

    /// The driver's own scratch directories currently on disk. A replay
    /// writes its synthesized transcript into one of these and is expected to
    /// remove it when it finishes.
    private func replayScratchDirectories() throws -> Set<String> {
        let contents = try FileManager.default.contentsOfDirectory(
            atPath: FileManager.default.temporaryDirectory.path)
        return Set(contents.filter { $0.hasPrefix("SharpeeIDE-Replay-") })
    }

    /// Replays through the driver with the in-repo toolchain, bridging the
    /// completion to async. The driver is kept alive by its own completion
    /// (released when it finishes) — nothing else retains it mid-run.
    private func replay(document: SkeinDocument, toNodeId nodeId: String,
                        storyFile: URL) async throws -> [ReplayDriver.NodeOutput] {
        let driver = ReplayDriver()
        return try await withCheckedThrowingContinuation { continuation in
            driver.replay(document: document, toNodeId: nodeId, storyFile: storyFile,
                          executable: URL(fileURLWithPath: "/usr/bin/env"),
                          leadingArguments: ["node", TestToolchain.devkitCLI.path]) { result in
                _ = driver
                continuation.resume(with: result)
            }
        }
    }

    // MARK: - AC-2: replay reproduces a live play session byte-for-byte

    func testReplayReproducesALiveWKWebViewPlaySessionByteForByte() async throws {
        let fernhill = TestToolchain.repoRoot.appendingPathComponent("branch-stories/fernhill")
        try XCTSkipUnless(FileManager.default.fileExists(
            atPath: fernhill.appendingPathComponent("fernhill.story").path),
            "fernhill fixture story not present in this checkout")

        // A disposable copy of REAL fernhill, built by the real devkit CLI
        // (the BuildRunnerTests pattern: linked node_modules stands in for a
        // global install's platform packages).
        let fm = FileManager.default
        let projectDir = tempDir.appendingPathComponent("fernhill", isDirectory: true)
        try fm.copyItem(at: fernhill, to: projectDir)
        try? fm.removeItem(at: projectDir.appendingPathComponent("dist"))
        try? fm.removeItem(at: projectDir.appendingPathComponent("play-testing"))
        try? fm.removeItem(at: projectDir.appendingPathComponent("node_modules"))
        try fm.createSymbolicLink(
            at: projectDir.appendingPathComponent("node_modules"),
            withDestinationURL: TestToolchain.repoRoot.appendingPathComponent("node_modules"))
        let storyFile = projectDir.appendingPathComponent("fernhill.story")
        _ = try runDevkit(["build", storyFile.path], in: projectDir)

        // Pin the skein's seed (rather than letting SkeinSession mint one) so
        // a failure here reproduces exactly — the repo's pinned-seed testing
        // discipline. This also exercises the session's read-existing-skein
        // path; minting is covered by SkeinSessionTests.
        try SkeinStore.write(SkeinDocument(seed: 12345,
                                           root: SkeinNode(command: "", output: "")),
                             to: SkeinStore.url(forStoryId: "fernhill", projectRoot: projectDir))

        // The real Play pane loads the real bundle; playing grows the skein.
        let play = PlayViewController()
        _ = play.view
        play.storyDirectory = projectDir
        var consoleErrors: [String] = []
        play.onConsoleError = { consoleErrors.append($0.message) }
        play.load(bundleDirectory: projectDir.appendingPathComponent("dist/web/fernhill",
                                                                     isDirectory: true))
        XCTAssertTrue(play.isLoaded, "the built bundle must load into the pane")
        try await waitForClientBoot(play, consoleErrors: { consoleErrors })

        // The sandboxed test host has no audio entitlement, and
        // `audioContext.resume()` hangs there forever — which would freeze
        // `executeCommand` at its unlock await before any turn runs. Removing
        // the constructor routes unlock() onto the client's own production
        // fallback for no-AudioContext environments (instant-gain mode); the
        // prose path under test is untouched.
        _ = try await play.evaluateInPlaySurface(
            "window.AudioContext = undefined; window.webkitAudioContext = undefined; 0")

        // Four real turns, typed the way an author types them (Enter on the
        // client's own input). `drop letter` then `inventory` puts a genuine
        // RNG draw (stdlib.inventory.empty-variant) on the thread, so the
        // byte-identity below also pins RNG-stream alignment, not just
        // rendering parity.
        for command in ["look", "read letter", "drop letter", "inventory"] {
            try await type(command, in: play)
        }
        let terminalId = try XCTUnwrap(play.skein?.currentNodeId)

        // The committed artifact, read back with the real store.
        let skeinURL = SkeinStore.url(forStoryId: "fernhill", projectRoot: projectDir)
        let saved = try SkeinStore.read(from: skeinURL)
        let thread = try XCTUnwrap(saved.thread(to: terminalId))
        let played = thread.nodes.filter { !$0.command.isEmpty }
        XCTAssertEqual(played.map(\.command),
                       ["look", "read letter", "drop letter", "inventory"])
        XCTAssertFalse(played.contains { $0.output.isEmpty },
                       "the live session stored real prose for every turn")

        // Replay root→terminal at the skein's pinned seed (AC-2).
        let outputs = try await replay(document: saved, toNodeId: terminalId,
                                       storyFile: storyFile)
        XCTAssertEqual(outputs.count, played.count)
        for (node, replayed) in zip(played, outputs) {
            XCTAssertEqual(replayed.nodeId, node.id)
            XCTAssertEqual(replayed.output, node.output,
                           "replay of '\(node.command)' must be byte-identical to the live capture (seed \(saved.seed))")
        }
    }

    /// Waits for the bundle's client to finish its in-browser compile + boot:
    /// the input exists and the boot `look`'s prose is on the page. On
    /// timeout, fails with the page's own account of itself (console errors,
    /// visible text) rather than a bare "did not boot".
    private func waitForClientBoot(_ play: PlayViewController,
                                   consoleErrors: () -> [String]) async throws {
        // textContent, not innerText: the test's WebView is never rendered
        // (no window), and innerText is empty for unrendered content.
        let probe = """
        (function () {
          var input = document.getElementById('command-input');
          var text = document.getElementById('text-content');
          return !!(input && text && text.textContent.trim().length > 0);
        })()
        """
        for _ in 0..<300 {
            if let ready = try? await play.evaluateInPlaySurface(probe),
               ready as? Bool == true { return }
            try await Task.sleep(nanoseconds: 200_000_000)
        }
        let state = (try? await play.evaluateInPlaySurface("""
        (function () {
          var text = document.getElementById('text-content');
          return JSON.stringify({
            readyState: document.readyState,
            hasInput: !!document.getElementById('command-input'),
            text: text ? text.textContent.slice(0, 500) : null
          });
        })()
        """)) as? String ?? "page unreachable"
        XCTFail("""
        the fernhill client did not boot within 60s
        console: \(consoleErrors())
        page: \(state)
        """)
    }

    /// Types `command` into the client's real input and submits with Enter,
    /// then waits until the turn lands in the skein (the bridge is
    /// asynchronous — the wait is on skein state, the SkeinPlayGrowthTests
    /// pattern).
    private func type(_ command: String, in play: PlayViewController) async throws {
        let js = """
        (function () {
          var input = document.getElementById('command-input');
          input.value = '\(command)';
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        })()
        """
        _ = try await play.evaluateInPlaySurface(js)
        for _ in 0..<300 {
            if let skein = play.skein,
               skein.document.node(withId: skein.currentNodeId)?.command == command { return }
            try await Task.sleep(nanoseconds: 200_000_000)
        }
        XCTFail("turn '\(command)' did not reach the skein within 60s")
    }

    // MARK: - AC-4 (execution half): a forced branch replays the forced outcome

    /// A dedicated fixture story (never a real story): a fragile bottle and a
    /// scenery anvil, so `throw bottle at anvil` draws two real stdlib choice
    /// points (`stdlib.throwing.hit-stationary`, `stdlib.throwing.breaks`).
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

    create the player
      starts in the Forge

      You.

    """

    func testAForcedSiblingBranchReplaysTheForcedOutcome() async throws {
        let storyFile = tempDir.appendingPathComponent("forge.story")
        try Self.forgeStory.write(to: storyFile, atomically: true, encoding: .utf8)

        // A thread whose terminal turn pins both draws: hit and break.
        let throwNode = SkeinNode(command: "throw bottle at anvil", output: "",
                                  forcings: ["stdlib.throwing.hit-stationary#1=yes",
                                             "stdlib.throwing.breaks#1=yes"])
        let takeNode = SkeinNode(command: "take bottle", output: "",
                                 children: [throwNode])
        var document = SkeinDocument(seed: 42,
                                     root: SkeinNode(command: "", output: "",
                                                     children: [takeNode]))

        let broken = try await replay(document: document, toNodeId: throwNode.id,
                                      storyFile: storyFile)
        let breakOutput = try XCTUnwrap(broken.last).output
        XCTAssertTrue(breakOutput.contains("smashes against"),
                      "forcing breaks=yes must reproduce the breaking prose, got:\n\(breakOutput)")

        // The counterfactual, grown as a first-class sibling (D5): same
        // command, same seed, one forcing flipped.
        let sibling = try XCTUnwrap(document.forcedSibling(
            of: throwNode.id,
            forcings: ["stdlib.throwing.hit-stationary#1=yes",
                       "stdlib.throwing.breaks#1=no"]))
        let unbroken = try await replay(document: document, toNodeId: sibling.id,
                                        storyFile: storyFile)
        let intactOutput = try XCTUnwrap(unbroken.last).output
        XCTAssertTrue(intactOutput.contains("It hits!"),
                      "forcing breaks=no must reproduce the non-breaking prose, got:\n\(intactOutput)")
        XCTAssertFalse(intactOutput.contains("smashes against"))
        XCTAssertNotEqual(intactOutput, breakOutput,
                          "the two branches genuinely diverge at the forced point")

        // Shared-prefix turns replay identically on both branches — the
        // forcing changed exactly the forced turn.
        XCTAssertEqual(try XCTUnwrap(broken.first).output,
                       try XCTUnwrap(unbroken.first).output)
    }

    func testAForcingTheRunNeverFiresFailsLoudlyWithoutOutputs() async throws {
        let storyFile = tempDir.appendingPathComponent("forge.story")
        try Self.forgeStory.write(to: storyFile, atomically: true, encoding: .utf8)

        // `take bottle` fires no throwing points, so this forcing never fires
        // — the ADR-293 D8/D9 hard failure. Outputs from that run would
        // present unforced reality as a forced branch; the driver must refuse.
        let takeNode = SkeinNode(command: "take bottle", output: "",
                                 forcings: ["stdlib.throwing.breaks#1=yes"])
        let document = SkeinDocument(seed: 42,
                                     root: SkeinNode(command: "", output: "",
                                                     children: [takeNode]))

        do {
            _ = try await replay(document: document, toNodeId: takeNode.id,
                                 storyFile: storyFile)
            XCTFail("an unfired forcing must fail the replay, not hand outputs over")
        } catch let error as ReplayDriver.ReplayError {
            guard case .cliFailed(let exitCode, _) = error else {
                return XCTFail("expected cliFailed, got \(error)")
            }
            XCTAssertNotEqual(exitCode, 0)
        }
    }

    // MARK: - The replay's scratch transcript is not left behind

    func testAReplayLeavesNoScratchDirectoryBehindOnEitherPath() async throws {
        let storyFile = tempDir.appendingPathComponent("forge.story")
        try Self.forgeStory.write(to: storyFile, atomically: true, encoding: .utf8)
        let before = try replayScratchDirectories()

        // A replay writes its synthesized transcript to a temp directory. The
        // author's machine accumulates one per click otherwise, and the removal
        // is deliberately best-effort (`try?`) — so nothing but this assertion
        // would notice it disappearing.
        let takeNode = SkeinNode(command: "take bottle", output: "")
        let document = SkeinDocument(seed: 42,
                                     root: SkeinNode(command: "", output: "",
                                                     children: [takeNode]))
        _ = try await replay(document: document, toNodeId: takeNode.id,
                             storyFile: storyFile)
        XCTAssertEqual(try replayScratchDirectories(), before,
                       "a completed replay must remove its scratch directory")

        // The failure path routes through the same cleanup, and is the one a
        // "return early on error" refactor would skip.
        let unfired = SkeinNode(command: "take bottle", output: "",
                                forcings: ["stdlib.throwing.breaks#1=yes"])
        let failing = SkeinDocument(seed: 42,
                                    root: SkeinNode(command: "", output: "",
                                                    children: [unfired]))
        _ = try? await replay(document: failing, toNodeId: unfired.id,
                              storyFile: storyFile)
        XCTAssertEqual(try replayScratchDirectories(), before,
                       "a FAILED replay must remove its scratch directory too")
    }
}
