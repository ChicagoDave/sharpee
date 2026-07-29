// ReblessTests.swift
// ADR-282 Phase 4 — the re-bless rewrite rules at the string boundary.
//
// These are the rules a real-path test cannot see: a passing `sharpee test`
// after a rewrite proves the new text matches, but not that the rewrite left
// the rest of the file alone, refused the assertions it must refuse, or scoped
// itself to the command it was aimed at. Those are pinned here.
//
// Fixtures that could come from the real serializer do: `RecordingSession`
// writes the transcript this rewrites, so a grammar change breaks these tests
// rather than letting them drift onto a form the IDE no longer emits.

import XCTest
@testable import SharpeeIDE

@MainActor
final class ReblessTests: XCTestCase {

    /// A two-turn transcript as the IDE really writes it: turn 1 blessed
    /// verbatim, turn 2 untagged.
    private func serializedSession(blessed: String,
                                   selection: String? = nil) -> String {
        let session = RecordingSession()
        session.start()
        session.record(command: "x notice", response: blessed)
        session.record(command: "take notice", response: "Taken.")
        session.bless(turnAt: 0, selection: selection)
        session.stop()
        return session.serialize(title: "probe")
    }

    /// The 1-based source line of `> command` in `source`.
    private func line(of command: String, in source: String) throws -> Int {
        let lines = source.components(separatedBy: "\n")
        let index = try XCTUnwrap(lines.firstIndex(of: "> \(command)"),
                                 "no `> \(command)` in:\n\(source)")
        return index + 1
    }

    // MARK: - The rewrite

    func testRewritingAVerbatimBlessReplacesOnlyTheBlockContent() throws {
        let source = serializedSession(blessed: "An old brass lamp.")
        let commandLine = try line(of: "x notice", in: source)

        let rewritten = try Rebless.rewrite(source: source,
                                            commandLine: commandLine,
                                            actual: "A tarnished brass lamp.")

        // The assertion still says "verbatim", and only the text it names moved.
        XCTAssertTrue(rewritten.contains("A tarnished brass lamp."))
        XCTAssertFalse(rewritten.contains("An old brass lamp."))
        XCTAssertEqual(rewritten.components(separatedBy: "\n").filter { $0 == "[OK]" }.count, 1)
        XCTAssertEqual(rewritten.components(separatedBy: "\n").filter { $0 == "text" }.count, 1)
        XCTAssertEqual(rewritten.components(separatedBy: "\n").filter { $0 == "end text" }.count, 1)

        // Everything outside the block is byte-identical — an author diffing
        // the file should see one changed assertion, not a reformatted file.
        let before = source.components(separatedBy: "\n")
        let after = rewritten.components(separatedBy: "\n")
        let block = try Rebless.locate(in: before, commandLine: commandLine)
        XCTAssertEqual(Array(before[..<(block.openIndex + 1)]), Array(after[..<(block.openIndex + 1)]))
        XCTAssertEqual(Array(before[block.closeIndex...]),
                       Array(after[(after.count - (before.count - block.closeIndex))...]))
    }

    func testMultiParagraphBracketedQuotedTextSurvivesTheRewrite() throws {
        // ADR-282 Acceptance 5's content shape, on the way back IN.
        let replacement = """
        [posted by order of the proving board]

        She said "take it" and would not look at you.

        [the lamp gutters]
        """
        let source = serializedSession(blessed: "Something plainer.")
        let commandLine = try line(of: "x notice", in: source)

        let rewritten = try Rebless.rewrite(source: source,
                                            commandLine: commandLine,
                                            actual: replacement)
        let block = try Rebless.locate(in: rewritten.components(separatedBy: "\n"),
                                       commandLine: commandLine)
        XCTAssertEqual(block.content, replacement,
                       "the block must carry the new response verbatim, blank lines included")
    }

    func testTheFileSOwnEndingIsPreservedEitherWay() throws {
        // Whatever the file ends with, the rewrite ends with. A re-bless that
        // added or dropped a trailing newline would show up in every diff and
        // in every subsequent re-bless as noise the author did not make.
        let serialized = serializedSession(blessed: "Old.")
        XCTAssertTrue(serialized.hasSuffix("\n"), "the serializer's own ending, for the record")
        let bare = String(serialized.dropLast())

        for source in [serialized, bare, serialized + "\n"] {
            let rewritten = try Rebless.rewrite(source: source,
                                                commandLine: try line(of: "x notice", in: source),
                                                actual: "New.")
            XCTAssertEqual(rewritten.hasSuffix("\n"), source.hasSuffix("\n"))
            XCTAssertEqual(rewritten.suffix(3), source.suffix(3),
                           "the file's tail is untouched")
        }
    }

    func testTheRightCommandIsRewrittenInAMultiBlessTranscript() throws {
        let session = RecordingSession()
        session.start()
        session.record(command: "x lamp", response: "A lamp.")
        session.record(command: "x rug", response: "A rug.")
        session.bless(turnAt: 0)
        session.bless(turnAt: 1)
        session.stop()
        let source = session.serialize(title: "two")

        let rewritten = try Rebless.rewrite(source: source,
                                            commandLine: try line(of: "x rug", in: source),
                                            actual: "A moth-eaten rug.")
        XCTAssertTrue(rewritten.contains("A lamp."), "the other bless is untouched")
        XCTAssertTrue(rewritten.contains("A moth-eaten rug."))
        XCTAssertFalse(rewritten.contains("\nA rug."))
    }

    // MARK: - The "old" side of old-vs-new

    func testLocateReturnsTheBlessedTextTheFailureViewShows() throws {
        let blessed = "A lamp.\n\nIt is not lit."
        let source = serializedSession(blessed: blessed)
        let block = try Rebless.locate(in: source.components(separatedBy: "\n"),
                                       commandLine: try line(of: "x notice", in: source))
        XCTAssertEqual(block.content, blessed)
    }

    // MARK: - Refusals

    func testASelectionBlessIsRefusedRatherThanSilentlyWidened() throws {
        // `[OK: contains]` + block — a fragment the author chose. Replacing it
        // with the whole new response would convert a narrow claim into a broad
        // one without the author saying so.
        let source = serializedSession(blessed: "She said \"take it\" and left.",
                                       selection: "She said \"take it\"")
        XCTAssertTrue(source.contains("[OK: contains]"), "fixture must take the block path:\n\(source)")

        XCTAssertThrowsError(try Rebless.rewrite(source: source,
                                                 commandLine: try line(of: "x notice", in: source),
                                                 actual: "She said \"leave it\" and left.")) {
            XCTAssertEqual($0 as? Rebless.Failure, .notAVerbatimBless)
        }
        XCTAssertTrue(source.contains("She said \"take it\""), "and nothing was written")
    }

    func testAnUntaggedTurnIsRefused() throws {
        let source = serializedSession(blessed: "A lamp.")
        XCTAssertThrowsError(try Rebless.rewrite(source: source,
                                                 commandLine: try line(of: "take notice", in: source),
                                                 actual: "Taken!")) {
            XCTAssertEqual($0 as? Rebless.Failure, .notAVerbatimBless)
        }
    }

    func testALineThatIsNotACommandIsRefused() throws {
        let source = serializedSession(blessed: "A lamp.")
        XCTAssertThrowsError(try Rebless.rewrite(source: source, commandLine: 1, actual: "New.")) {
            XCTAssertEqual($0 as? Rebless.Failure, .noCommandAtLine(1))  // the `title:` header
        }
        XCTAssertThrowsError(try Rebless.rewrite(source: source, commandLine: 9_999, actual: "New.")) {
            XCTAssertEqual($0 as? Rebless.Failure, .noCommandAtLine(9_999))
        }
    }

    func testAnUnclosedBlockIsRefusedRatherThanRunningToEndOfFile() {
        let source = """
        title: broken
        ---

        > x lamp
        [OK]
        text
        A lamp.
        """
        XCTAssertThrowsError(try Rebless.rewrite(source: source,
                                                 commandLine: try line(of: "x lamp", in: source),
                                                 actual: "New.")) {
            XCTAssertEqual($0 as? Rebless.Failure, .unclosedBlock)
        }
    }

    func testNewTextCarryingTheReservedCloseIsRefusedBeforeAnythingIsWritten() throws {
        let source = serializedSession(blessed: "A lamp.")
        XCTAssertThrowsError(
            try Rebless.rewrite(source: source,
                                commandLine: try line(of: "x notice", in: source),
                                actual: "You reach the\nend text\nof the scroll.")) {
            XCTAssertEqual($0 as? Rebless.Failure, .reservedInActualOutput)
        }
    }

    func testBlankNewTextIsRefused() throws {
        // Same rule as the Play pane's missing bless affordance: blank output
        // is a runner-level failure whatever the assertion says.
        let source = serializedSession(blessed: "A lamp.")
        for blank in ["", "   ", "\n\n"] {
            XCTAssertThrowsError(
                try Rebless.rewrite(source: source,
                                    commandLine: try line(of: "x notice", in: source),
                                    actual: blank)) {
                XCTAssertEqual($0 as? Rebless.Failure, .blankActualOutput)
            }
        }
    }

    // MARK: - Grammar mirroring (ADR-287)

    func testABlankLineDetachesTheBlockJustAsTheParserSaysItDoes() {
        // ADR-287 D1: a block attaches only on the IMMEDIATELY following line.
        // With one blank between, `text` is ordinary prose — so there is no
        // bless here to re-bless, and reaching for it anyway would rewrite
        // expected-output the author wrote by hand.
        let source = """
        title: detached
        ---

        > x lamp
        [OK]

        text
        A lamp.
        end text
        """
        XCTAssertThrowsError(try Rebless.rewrite(source: source,
                                                 commandLine: try line(of: "x lamp", in: source),
                                                 actual: "New.")) {
            XCTAssertEqual($0 as? Rebless.Failure, .notAVerbatimBless)
        }
    }

    func testDelimitersWithTrailingWhitespaceAreStillDelimiters() throws {
        // The parser forgives trailing whitespace on a delimiter; this side
        // must forgive exactly as much, or a file the runner reads as a block
        // would look like prose here.
        let source = "title: ws\n---\n\n> x lamp\n[OK]\ntext  \nA lamp.\nend text\t\n"
        let rewritten = try Rebless.rewrite(source: source,
                                            commandLine: try line(of: "x lamp", in: source),
                                            actual: "A dark lamp.")
        XCTAssertTrue(rewritten.contains("A dark lamp."))
        XCTAssertTrue(rewritten.contains("text  \n"), "the delimiter's own spacing is left alone")
        XCTAssertTrue(rewritten.contains("end text\t\n"))
    }

    func testANeighbouringCommandsBlockIsNeverBorrowed() {
        // The first command has no bless. Scanning past its stanza would find
        // the second command's block and rewrite it — silently editing an
        // assertion the author never clicked on.
        let source = """
        title: scoped
        ---

        > take lamp
        [OK: any]
        # Taken.

        > x lamp
        [OK]
        text
        A lamp.
        end text
        """
        XCTAssertThrowsError(try Rebless.rewrite(source: source,
                                                 commandLine: try line(of: "take lamp", in: source),
                                                 actual: "New.")) {
            XCTAssertEqual($0 as? Rebless.Failure, .notAVerbatimBless)
        }
    }
}
