// RecordingSerializationTests.swift
// ADR-282 D2's encoding rules, asserted at the string boundary: which assertion
// form each verdict produces, and how a fenced literal is emitted so ADR-287's
// parser reads back exactly what was captured.
//
// These are the rules; RecordingSaveAsTestTests proves the result actually runs
// under the real `sharpee test` CLI. Both matter — a serializer can be
// self-consistently wrong, and a passing run can hide an assertion that never
// asserted anything.

import XCTest
@testable import SharpeeIDE

@MainActor
final class RecordingSerializationTests: XCTestCase {

    private func session(command: String, response: String) -> RecordingSession {
        let session = RecordingSession()
        session.start()
        session.record(command: command, response: response)
        return session
    }

    private func lines(_ session: RecordingSession) -> [String] {
        RecordingSession.assertionLines(for: session.turns[0])
    }

    // MARK: - Untagged (ADR-277 D5 as superseded by ADR-294 D2: [SKIP] draft)

    func testAnUntaggedTurnStillSerializesAsTheDraftCapture() {
        let session = session(command: "look", response: "A den.\nA lamp glints.")

        XCTAssertEqual(lines(session), ["[SKIP]", "# A den.", "# A lamp glints."],
                       "the untagged draft is [SKIP] + comments — [OK: any] is removed grammar")
    }

    func testAnUntaggedEmptyResponseCarriesNoCommentLines() {
        let session = session(command: "wait", response: "")

        // No dead branch for the empty case: an empty response cannot be
        // blessed, so it can only arrive here, and it simply has nothing to
        // comment.
        XCTAssertEqual(lines(session), ["[SKIP]"])
    }

    // MARK: - Verbatim bless → [OK] + text block

    func testAVerbatimBlessPutsTheWholeResponseInATextBlock() {
        let session = session(command: "look", response: "A den.\n\nA lamp glints.")
        session.toggleBlessOnLatestTurn()

        XCTAssertEqual(lines(session), [
            "[OK]",
            "text",
            "A den.",
            "",
            "A lamp glints.",
            "end text",
        ])
    }

    func testTheBlockKeepsBlankLinesAndBracketsVerbatim() {
        // The blank line is the paragraph boundary the whole capture-parity
        // fight was about; the bracket line is what blocks exist for (bare, it
        // would parse as an assertion).
        let session = session(command: "read notice",
                              response: "[posted by order of the board]\n\nShe said \"take it\".")
        session.toggleBlessOnLatestTurn()

        XCTAssertEqual(lines(session), [
            "[OK]",
            "text",
            "[posted by order of the board]",
            "",
            "She said \"take it\".",
            "end text",
        ])
    }

    func testAnIndentedTerminatorInTheResponseIsJustContent() {
        // Column 0 is the rule, so a story CAN print the syntax as long as it
        // is indented — which is how Sharpee's own tutorial material stays
        // blessable (ADR-287 D1).
        let session = session(command: "read manual", response: "To close it, write:\n  end text\nDone.")
        session.toggleBlessOnLatestTurn()

        XCTAssertEqual(lines(session), [
            "[OK]",
            "text",
            "To close it, write:",
            "  end text",
            "Done.",
            "end text",
        ])
    }

    func testAColumnZeroTerminatorIsEmittedUnescapedSoTheParserCanRejectIt() {
        // `end text` at column 0 is reserved with NO escape (David's ruling,
        // 2026-07-28). The serializer must not quietly rewrite the author's
        // text to dodge it — that would be the silent weakening D2 forbids.
        // It emits verbatim, and the parser fails loudly on the round trip
        // (pinned in transcript-tester's fenced-payloads.test.ts).
        let session = session(command: "read manual", response: "before\nend text\nafter")
        session.toggleBlessOnLatestTurn()

        XCTAssertEqual(lines(session), [
            "[OK]",
            "text",
            "before",
            "end text",
            "after",
            "end text",
        ])
    }

    // MARK: - Selection bless → [OK: contains …]

    func testASimpleSelectionRidesTheInlineForm() {
        let session = session(command: "look", response: "A small square den.")
        session.toggleBlessOnLatestTurn(rawSelection: "small square den")

        XCTAssertEqual(lines(session), ["[OK: contains \"small square den\"]"])
    }

    func testABracketedSelectionStillRidesTheInlineForm() {
        // Brackets are safe inline: the tag is delimited by the line's own
        // first and last character, which the surrounding quotes keep in place.
        let session = session(command: "read notice", response: "[the lamp gutters] again")
        session.toggleBlessOnLatestTurn(rawSelection: "[the lamp gutters]")

        XCTAssertEqual(lines(session), ["[OK: contains \"[the lamp gutters]\"]"])
    }

    func testASelectionContainingAQuoteTakesTheBlockForm() {
        // The parser's inline payload is `"([^"]+)"` — a quote inside it would
        // end the payload early. D2's promise is that nothing is unencodable,
        // so this falls to the block rather than being refused or mangled.
        let response = "She said \"take it\" and would not look at you."
        let session = session(command: "read notice", response: response)
        session.toggleBlessOnLatestTurn(rawSelection: "said \"take it\" and")

        XCTAssertEqual(lines(session), [
            "[OK: contains]",
            "text",
            "said \"take it\" and",
            "end text",
        ])
    }

    func testAMultiLineSelectionTakesTheBlockForm() {
        let response = "first line\nsecond line"
        let session = session(command: "look", response: response)
        session.toggleBlessOnLatestTurn(rawSelection: response)

        XCTAssertEqual(lines(session), [
            "[OK: contains]",
            "text",
            "first line",
            "second line",
            "end text",
        ])
    }

    func testInlinePayloadRuleIsStatedOnceAndAppliesBothWays() {
        XCTAssertEqual(RecordingSession.inlinePayload("plain text"), "plain text")
        XCTAssertEqual(RecordingSession.inlinePayload("[bracketed]"), "[bracketed]")
        XCTAssertNil(RecordingSession.inlinePayload("has \" quote"))
        XCTAssertNil(RecordingSession.inlinePayload("has\nnewline"))
        XCTAssertNil(RecordingSession.inlinePayload(""))
    }

    // MARK: - Whole-file shape

    func testAMixedSessionSerializesEveryTurnInOrder() {
        let session = RecordingSession()
        session.start()
        session.record(command: "look", response: "A den.")
        session.record(command: "take lamp", response: "Taken.")
        session.bless(turnAt: 1)

        XCTAssertEqual(session.serialize(title: "Recorded: mixed"), """
        title: Recorded: mixed
        ---

        > look
        [SKIP]
        # The play session's own opening turn, replayed so the story banner
        # lands here. A fresh run prints it with the first command, and it
        # would otherwise be prepended to the first blessed response below.

        > look
        [SKIP]
        # A den.

        > take lamp
        [OK]
        text
        Taken.
        end text

        """)
    }

    /// The opening turn is scaffolding for state, not an assertion — it must
    /// never be mistaken for one of the author's.
    func testTheOpeningTurnIsPresentAndUnblessed() {
        let session = session(command: "x lamp", response: "It gleams.")
        session.toggleBlessOnLatestTurn()

        let lines = session.serialize(title: "T").components(separatedBy: "\n")
        let commands = lines.filter { $0.hasPrefix("> ") }
        XCTAssertEqual(commands, ["> look", "> x lamp"],
                       "the client's opening look is replayed ahead of the captured turns")
        XCTAssertEqual(lines.firstIndex(of: "[SKIP]").map { $0 < lines.firstIndex(of: "[OK]")! },
                       true,
                       "the opening turn carries the unasserted [SKIP] draft")
        XCTAssertEqual(session.blessedTurns.count, 1,
                       "the opening turn is not a captured turn and cannot be blessed")
    }

    // MARK: - Acceptance 3's precondition

    func testASessionWithNoBlessedTurnsReportsNoAuthorAssertions() {
        let session = session(command: "look", response: "A den.")

        XCTAssertFalse(session.hasAuthorAssertions)
        session.toggleBlessOnLatestTurn()
        XCTAssertTrue(session.hasAuthorAssertions)
        session.toggleBlessOnLatestTurn()
        XCTAssertFalse(session.hasAuthorAssertions, "a withdrawn bless must not still count")
    }
}
