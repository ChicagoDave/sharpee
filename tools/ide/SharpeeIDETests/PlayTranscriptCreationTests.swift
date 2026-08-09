// PlayTranscriptCreationTests.swift
// Create Transcript from play, toolchain half (ADR-305 D5/D6): the suggested
// filename shape, and REAL-PATH runs of `sharpee transcript-from-play` — the
// production resolver finds the checkout's CLI, a real child process receives
// the payload on stdin, and the returned text is the serialized transcript.
// The refusal path is equally real: exit 2 surfaces the CLI's own stderr as a
// Refusal and returns no text.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class PlayTranscriptCreationTests: XCTestCase {

    /// A story file inside the checkout, so executable resolution walks up to
    /// the workspace's real CLI — the production tier, no injection.
    private var fixtureStory: URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()          // SharpeeIDETests/
            .deletingLastPathComponent()          // tools/ide/
            .appendingPathComponent("test-fixtures/fernhill-frozen/fernhill.story")
    }

    func testSuggestedFilenameCarriesSlugAndSpan() {
        let story = URL(fileURLWithPath: "/p/fernhill.story")
        XCTAssertEqual(
            PlayTranscriptCreation.suggestedFilename(storyFile: story, span: (first: 3, last: 14)),
            "fernhill-turns-3-14.transcript")
        XCTAssertEqual(
            PlayTranscriptCreation.suggestedFilename(storyFile: story, span: (first: 5, last: 5)),
            "fernhill-turn-5.transcript")
        XCTAssertEqual(
            PlayTranscriptCreation.suggestedFilename(storyFile: story, span: nil),
            "fernhill-from-play.transcript")
    }

    func testRealCLIReturnsTheSerializedTranscript() async throws {
        let payload = try JSONSerialization.data(withJSONObject: [
            "policy": "all-emitted-text",
            "seed": 42,
            "title": "from-play-probe",
            "turns": [
                ["turn": 1, "command": "look", "output": "The den is quiet.", "selected": false],
                ["turn": 2, "command": "north", "output": "North Hall.", "selected": true],
            ],
        ])
        let text = try await PlayTranscriptCreation.createText(payload: payload,
                                                               storyFile: fixtureStory)
        XCTAssertTrue(text.contains("title: from-play-probe"), text)
        XCTAssertTrue(text.contains("seed: 42"), text)
        XCTAssertTrue(text.contains("> look"), text)
        XCTAssertTrue(text.contains("[SKIP]"), text)
        XCTAssertTrue(text.contains("> north"), text)
        // all-emitted-text writes [OK] + the literal block from the REAL output.
        XCTAssertTrue(text.contains("[OK]"), text)
        XCTAssertTrue(text.contains("North Hall."), text)
    }

    func testRealCLIRefusalSurfacesStderrAndReturnsNothing() async throws {
        let payload = try JSONSerialization.data(withJSONObject: [
            "seed": 42,
            "turns": [["turn": 1, "command": "look", "output": "Den", "selected": false]],
        ])
        do {
            _ = try await PlayTranscriptCreation.createText(payload: payload,
                                                            storyFile: fixtureStory)
            XCTFail("an empty selection must refuse")
        } catch let refusal as PlayTranscriptCreation.Refusal {
            XCTAssertTrue(refusal.message.contains("no turns selected"), refusal.message)
        }
    }
}
