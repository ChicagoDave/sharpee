// RecordingSerializationTests.swift
// The transcript emitter's encoding rules, asserted at the string boundary:
// which assertion form each verdict produces, and how a literal block is
// emitted so ADR-287's parser reads back exactly what was captured.
//
// These are the rules; SkeinExportRealPathTests proves the result actually runs
// under the real `sharpee test` CLI. Both matter — a serializer can be
// self-consistently wrong, and a passing run can hide an assertion that never
// asserted anything.
//
// ADR-299 Phase 9 retired ADR-282's live capture around this file: the emitter
// is now a pure function over turns, and the `[OK: contains …]` selection form
// went with the gesture that produced it (a skein blessing always approves the
// whole output). The block/verbatim rules below are unchanged.

import XCTest
@testable import SharpeeIDE

@MainActor
final class RecordingSerializationTests: XCTestCase {

    private func lines(_ response: String, blessed: Bool = false) -> [String] {
        RecordingSession.assertionLines(for: RecordedTurn(command: "probe",
                                                          response: response,
                                                          verdict: blessed ? .blessed : .untagged))
    }

    // MARK: - Untagged (ADR-294 D2: the [SKIP] draft)

    func testAnUntaggedTurnSerializesAsTheDraftCapture() {
        XCTAssertEqual(lines("A den.\nA lamp glints."),
                       ["[SKIP]", "# A den.", "# A lamp glints."],
                       "the untagged draft is [SKIP] + comments — [OK: any] is removed grammar")
    }

    func testAnUntaggedEmptyResponseCarriesNoCommentLines() {
        XCTAssertEqual(lines(""), ["[SKIP]"])
    }

    // MARK: - Bless → [OK] + text block

    func testABlessPutsTheWholeResponseInATextBlock() {
        XCTAssertEqual(lines("A den.\n\nA lamp glints.", blessed: true), [
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
        XCTAssertEqual(
            lines("[posted by order of the board]\n\nShe said \"take it\".", blessed: true), [
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
        XCTAssertEqual(lines("To close it, write:\n  end text\nDone.", blessed: true), [
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
        // text to dodge it — that would be a silent weakening of the claim.
        // It emits verbatim, and the parser fails loudly on the round trip
        // (pinned in transcript-tester's fenced-payloads.test.ts).
        XCTAssertEqual(lines("before\nend text\nafter", blessed: true), [
            "[OK]",
            "text",
            "before",
            "end text",
            "after",
            "end text",
        ])
    }

    // MARK: - Whole-file shape

    func testAMixedSessionSerializesEveryTurnInOrder() {
        let source = RecordingSession.serialize([
            RecordedTurn(command: "look", response: "A den."),
            RecordedTurn(command: "take lamp", response: "Taken.", verdict: .blessed),
        ], title: "Recorded: mixed", openingTurn: true)

        XCTAssertEqual(source, """
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
        let source = RecordingSession.serialize(
            [RecordedTurn(command: "x lamp", response: "It gleams.", verdict: .blessed)],
            title: "T", openingTurn: true)

        let lines = source.components(separatedBy: "\n")
        XCTAssertEqual(lines.filter { $0.hasPrefix("> ") }, ["> look", "> x lamp"],
                       "the client's opening look is replayed ahead of the captured turns")
        XCTAssertEqual(lines.firstIndex(of: "[SKIP]").map { $0 < lines.firstIndex(of: "[OK]")! },
                       true,
                       "the opening turn carries the unasserted [SKIP] draft")
    }

    func testTheOpeningTurnCanBeOmitted() {
        let source = RecordingSession.serialize(
            [RecordedTurn(command: "x lamp", response: "It gleams.")],
            title: "T", openingTurn: false)

        XCTAssertEqual(source.components(separatedBy: "\n").filter { $0.hasPrefix("> ") },
                       ["> x lamp"])
    }

    // MARK: - The ADR-294 header block (what replay and export pin their run in)

    func testHeaderFieldsRideBetweenTheTitleAndTheSeparator() {
        let source = RecordingSession.serialize([], title: "T", openingTurn: false,
                                                headerFields: ["seed: 42",
                                                               "forces: a.b#1=yes"])

        XCTAssertTrue(source.hasPrefix("title: T\nseed: 42\nforces: a.b#1=yes\n---\n"), source)
    }

    func testNoHeaderFieldsLeavesThePlainHeader() {
        XCTAssertTrue(RecordingSession.serialize([], title: "T", openingTurn: false)
            .hasPrefix("title: T\n---\n"))
    }
}
