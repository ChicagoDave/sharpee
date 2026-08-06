// ReplayDriverTests.swift
// Unit tests for the replay pipeline's pure stages (ADR-299 D6/D5): forced
// sibling growth on the model, forcing joins with the duplicate-key refusal,
// transcript synthesis (headers, opening look, [SKIP] grammar), and the
// record→node mapping with its mismatch/missing-output refusals. The spawn
// half runs against the real toolchain in ReplayRealPathTests (rule 13a).

import XCTest
@testable import SharpeeIDE

@MainActor
final class ReplayDriverTests: XCTestCase {

    /// root → "take bottle" → "throw bottle at anvil" (with forcings).
    private func fixtureDocument(forcings: [String] = []) -> SkeinDocument {
        let throwNode = SkeinNode(id: "n-throw", command: "throw bottle at anvil",
                                  output: "It shatters.", forcings: forcings)
        let takeNode = SkeinNode(id: "n-take", command: "take bottle",
                                 output: "Taken.", children: [throwNode])
        let root = SkeinNode(id: "n-root", command: "", output: "", children: [takeNode])
        return SkeinDocument(seed: 42, root: root)
    }

    private func commandResult(input: String, output: String?,
                               passed: Bool = true, skipped: Bool = true) -> TestResultRecord {
        .commandResult(TestCommandResult(file: "/tmp/replay.transcript", line: 1,
                                         input: input, passed: passed,
                                         expectedFailure: false, skipped: skipped,
                                         error: nil, actualOutput: output))
    }

    // MARK: - forcedSibling (D5)

    func testForcedSiblingGrowsAFirstClassBranchBesideTheNode() {
        var document = fixtureDocument()
        let sibling = document.forcedSibling(of: "n-throw",
                                             forcings: ["stdlib.throwing.breaks#1=no"])

        let grown = try! XCTUnwrap(sibling)
        XCTAssertEqual(grown.command, "throw bottle at anvil",
                       "the branch is the SAME command under a different outcome")
        XCTAssertEqual(grown.forcings, ["stdlib.throwing.breaks#1=no"])
        XCTAssertEqual(grown.output, "", "output stays empty until a replay fills it")

        // It landed beside the node, under the same parent, as a new thread.
        let parent = try! XCTUnwrap(document.node(withId: "n-take"))
        XCTAssertEqual(parent.children.map(\.id), ["n-throw", grown.id])
        XCTAssertEqual(document.thread(to: grown.id)?.nodes.map(\.id),
                       ["n-root", "n-take", grown.id])
    }

    func testForcedSiblingRefusalsLeaveTheTreeUntouched() {
        var document = fixtureDocument()
        let before = document

        XCTAssertNil(document.forcedSibling(of: "no-such-node",
                                            forcings: ["p=yes"]), "unknown id")
        XCTAssertNil(document.forcedSibling(of: "n-root",
                                            forcings: ["p=yes"]),
                     "the story start has no sibling position")
        XCTAssertNil(document.forcedSibling(of: "n-throw", forcings: []),
                     "an unforced sibling would be a duplicate, not a branch")
        XCTAssertEqual(document, before)
    }

    // MARK: - forcings(along:) — the forces: join

    func testForcingsJoinInThreadOrderAcrossNodes() throws {
        var document = fixtureDocument(forcings: ["stdlib.throwing.breaks#1=yes"])
        document.root.children[0].forcings = ["tt.point=yes"]
        let thread = try XCTUnwrap(document.thread(to: "n-throw"))
        XCTAssertEqual(try ReplayDriver.forcings(along: thread),
                       ["tt.point=yes", "stdlib.throwing.breaks#1=yes"],
                       "annotations join root→terminal in node order")
    }

    func testADuplicateForceKeyIsRefusedBeforeAnythingRuns() {
        var document = fixtureDocument(forcings: ["tt.point#1=no"])
        document.root.children[0].forcings = ["tt.point#1=yes"]
        let thread = document.thread(to: "n-throw")!

        XCTAssertThrowsError(try ReplayDriver.forcings(along: thread)) { error in
            XCTAssertEqual(error as? ReplayDriver.ReplayError,
                           .duplicateForcing(key: "tt.point#1"),
                           "the runner treats duplicate keys as a load error (ADR-293 D9)")
        }
        // Same class, different occurrences: not a duplicate.
        document.root.children[0].forcings = ["tt.point#2=yes"]
        XCTAssertNoThrow(try ReplayDriver.forcings(along: document.thread(to: "n-throw")!))
    }

    // MARK: - transcriptSource — the [SKIP] replay sentence

    func testTranscriptSourceCarriesSeedForcesOpeningLookAndSkipTurns() throws {
        let document = fixtureDocument(forcings: ["stdlib.throwing.breaks#1=yes"])
        let thread = try XCTUnwrap(document.thread(to: "n-throw"))
        let source = try ReplayDriver.transcriptSource(for: thread, seed: 42,
                                                       title: "Skein replay")
        let lines = source.components(separatedBy: "\n")

        // Headers above the separator, in the ADR-294 block.
        let separator = try XCTUnwrap(lines.firstIndex(of: "---"))
        XCTAssertTrue(lines[..<separator].contains("seed: 42"), "D5's pinned seed")
        XCTAssertTrue(lines[..<separator].contains("forces: stdlib.throwing.breaks#1=yes"))

        // The opening [SKIP]'d look precedes every typed command (RNG alignment).
        let look = try XCTUnwrap(lines.firstIndex(of: "> look"))
        let take = try XCTUnwrap(lines.firstIndex(of: "> take bottle"))
        let throwLine = try XCTUnwrap(lines.firstIndex(of: "> throw bottle at anvil"))
        XCTAssertLessThan(look, take)
        XCTAssertLessThan(take, throwLine)
        XCTAssertEqual(lines[look + 1], "[SKIP]")
        XCTAssertEqual(lines[take + 1], "[SKIP]", "a replay turn asserts nothing")
        XCTAssertEqual(lines[throwLine + 1], "[SKIP]")

        // The root's empty command is the story start, never a typed turn.
        XCTAssertFalse(lines.contains("> "), "no turn is serialized for the root")
    }

    func testAnUnforcedThreadEmitsNoForcesHeader() throws {
        let thread = try XCTUnwrap(fixtureDocument().thread(to: "n-throw"))
        let source = try ReplayDriver.transcriptSource(for: thread, seed: 7, title: "T")
        XCTAssertFalse(source.contains("forces:"),
                       "an empty forces: header is a parser error, not a no-op")
        XCTAssertTrue(source.contains("seed: 7"))
    }

    // MARK: - outputs(from:thread:) — record→node mapping

    func testOutputsMapRecordsToNodesOffsetByTheOpeningLook() throws {
        let document = fixtureDocument()
        let thread = try XCTUnwrap(document.thread(to: "n-throw"))
        let records: [TestResultRecord] = [
            commandResult(input: "look", output: "Banner.\n\nThe forge."),
            commandResult(input: "take bottle", output: "Taken."),
            commandResult(input: "throw bottle at anvil", output: "It shatters on the anvil."),
        ]

        let outputs = try ReplayDriver.outputs(from: records, thread: thread)
        XCTAssertEqual(outputs, [
            ReplayDriver.NodeOutput(nodeId: "n-take", command: "take bottle",
                                    output: "Taken."),
            ReplayDriver.NodeOutput(nodeId: "n-throw", command: "throw bottle at anvil",
                                    output: "It shatters on the anvil."),
        ], "the opening look belongs to no node; everything after maps in order")
    }

    func testAShortRunIsAMismatchCarryingTheTranscriptError() throws {
        let thread = try XCTUnwrap(fixtureDocument().thread(to: "n-throw"))
        let records: [TestResultRecord] = [
            commandResult(input: "look", output: "The forge."),
            .transcriptEnd(TestTranscriptEnd(file: "/tmp/replay.transcript",
                                             status: .error, passed: 1, failed: 0,
                                             expectedFailures: 0, skipped: 1,
                                             duration: 1,
                                             errorMessage: "story load failed",
                                             blockedBy: nil)),
        ]
        XCTAssertThrowsError(try ReplayDriver.outputs(from: records, thread: thread)) { error in
            XCTAssertEqual(error as? ReplayDriver.ReplayError,
                           .outputMismatch(expected: 3, found: 1,
                                           detail: "story load failed"))
        }
    }

    func testACommandOrderMismatchIsRefusedNotSilentlyRemapped() throws {
        let thread = try XCTUnwrap(fixtureDocument().thread(to: "n-throw"))
        let records: [TestResultRecord] = [
            commandResult(input: "look", output: "The forge."),
            commandResult(input: "throw bottle at anvil", output: "It shatters."),
            commandResult(input: "take bottle", output: "Taken."),
        ]
        XCTAssertThrowsError(try ReplayDriver.outputs(from: records, thread: thread)) { error in
            guard case .some(.outputMismatch) = error as? ReplayDriver.ReplayError else {
                return XCTFail("expected outputMismatch, got \(error)")
            }
        }
    }

    func testAResultWithoutCapturedOutputIsLoudNotEmpty() throws {
        let thread = try XCTUnwrap(fixtureDocument().thread(to: "n-throw"))
        let records: [TestResultRecord] = [
            commandResult(input: "look", output: "The forge."),
            commandResult(input: "take bottle", output: nil),
            commandResult(input: "throw bottle at anvil", output: "It shatters."),
        ]
        XCTAssertThrowsError(try ReplayDriver.outputs(from: records, thread: thread)) { error in
            XCTAssertEqual(error as? ReplayDriver.ReplayError,
                           .missingOutput(command: "take bottle"),
                           "a toolchain that ignores --capture-output must surface, not blank")
        }
    }

    // MARK: - replay entry refusals (no spawn)

    func testReplayToAnUnknownNodeFailsWithoutSpawning() {
        let driver = ReplayDriver()
        var failure: Error?
        driver.replay(document: fixtureDocument(), toNodeId: "no-such-node",
                      storyFile: URL(fileURLWithPath: "/tmp/nothing.story"),
                      executable: URL(fileURLWithPath: "/usr/bin/true"),
                      leadingArguments: []) { result in
            if case .failure(let error) = result { failure = error }
        }
        XCTAssertEqual(failure as? ReplayDriver.ReplayError, .unknownNode("no-such-node"))
        XCTAssertFalse(driver.isReplaying)
    }

    func testReplayWithADuplicateForcingFailsBeforeSpawning() {
        var document = fixtureDocument(forcings: ["tt.dup#1=yes"])
        document.root.children[0].forcings = ["tt.dup#1=no"]
        let driver = ReplayDriver()
        var failure: Error?
        driver.replay(document: document, toNodeId: "n-throw",
                      storyFile: URL(fileURLWithPath: "/tmp/nothing.story"),
                      executable: URL(fileURLWithPath: "/usr/bin/true"),
                      leadingArguments: []) { result in
            if case .failure(let error) = result { failure = error }
        }
        XCTAssertEqual(failure as? ReplayDriver.ReplayError,
                       .duplicateForcing(key: "tt.dup#1"))
        XCTAssertFalse(driver.isReplaying)
    }
}
