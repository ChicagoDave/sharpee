// ChordLexerGoldenTests.swift
// The D7 conformance pin: ChordLexer (the Swift port) run over the committed
// corpus must deep-equal the committed golden token stream — the SAME artifact
// the TS-side vitest pins lexer.ts against. No Node subprocess, no live
// cross-language call: the golden file is the thing both implementations agree
// on. If this reddens, the TS lexer moved — regenerate the golden TS-side
// (pnpm --filter @sharpee/chord golden:lexer) and update this port to match.

import XCTest
@testable import SharpeeIDE

@MainActor
final class ChordLexerGoldenTests: XCTestCase {

    private static var goldenDir: URL {
        TestToolchain.repoRoot
            .appendingPathComponent("packages/chord/tests/fixtures/lexer-golden")
    }

    /// The corpus files the golden records, keyed by file name.
    private func loadGolden() throws -> [String: [ChordLine]] {
        let data = try Data(contentsOf: Self.goldenDir.appendingPathComponent("lexer-golden.json"))
        return try JSONDecoder().decode([String: [ChordLine]].self, from: data)
    }

    /// Every corpus file's Swift lex must match the golden exactly — full Line[]
    /// fidelity: lineNo, indent, raw, afterBlank, comment, and every token's
    /// kind/text/span.
    func testSwiftLexerMatchesCommittedGoldenExactly() throws {
        let golden = try loadGolden()
        XCTAssertFalse(golden.isEmpty, "golden file must record at least one corpus file")

        for (file, expectedLines) in golden.sorted(by: { $0.key < $1.key }) {
            let sourceURL = Self.goldenDir.appendingPathComponent(file)
            let source = try String(contentsOf: sourceURL, encoding: .utf8)
            let actual = ChordLexer.lex(source)

            XCTAssertEqual(actual.count, expectedLines.count,
                           "\(file): line count diverged — regenerate the golden and update ChordLexer")
            for (a, e) in zip(actual, expectedLines) where a != e {
                XCTFail("""
                \(file):\(e.lineNo): Swift lex diverges from the golden.
                  expected: \(e)
                  actual:   \(a)
                If lexer.ts changed, regenerate the golden (UPDATE_GOLDEN=1, TS side) \
                and update the ChordLexer.swift port to match.
                """)
                return
            }
        }
    }

    /// The golden decode itself is part of the pin: an unknown token kind on the
    /// wire (a NEW TokenKind added TS-side) must fail loudly here, not silently
    /// mis-render.
    func testGoldenDecodesWithFullTokenKindCoverage() throws {
        let golden = try loadGolden()
        let kinds = Set(golden.values.flatMap { $0 }.flatMap { $0.tokens }.map { $0.kind })
        // The corpus exercises the full 2.0.0 surface — spot-pin the kinds whose
        // loss would mean the corpus (or decode) regressed.
        for expected in [ChordTokenKind.word, .number, .string, .compare,
                         .lbracket, .rbracket, .colon, .punct] {
            XCTAssertTrue(kinds.contains(expected), "corpus no longer exercises \(expected)")
        }
    }

    // MARK: - Port-local edge pins (independent of the golden's content)

    func testUnterminatedQuoteIsPrOsePunct() {
        let lines = ChordLexer.lex("say \"unclosed\n")
        let tokens = lines[0].tokens
        XCTAssertEqual(tokens.map { $0.kind }, [.word, .punct, .word])
        XCTAssertEqual(tokens[1].text, "\"")
    }

    func testDottedVersionIsOneNumberToken() {
        let tokens = ChordLexer.lex("  version: 1.0.0\n")[0].tokens
        XCTAssertEqual(tokens.map { $0.kind }, [.word, .colon, .number])
        XCTAssertEqual(tokens[2].text, "1.0.0")
        XCTAssertEqual(tokens[2].span,
                       DiagnosticSpan(line: 1, column: 12, endLine: 1, endColumn: 17))
    }

    func testCompareOperatorsGreedyMatchEquals() {
        let tokens = ChordLexer.lex("when it >= 3 or < 2\n")[0].tokens
        XCTAssertEqual(tokens.map { $0.kind }, [.word, .word, .compare, .number, .word, .compare, .number])
        XCTAssertEqual(tokens[2].text, ">=")
        XCTAssertEqual(tokens[5].text, "<")
    }

    func testAfterBlankAndCommentFlags() {
        let lines = ChordLexer.lex("## header comment\n\nstory \"X\" by \"Y\"\n  id: x\n")
        XCTAssertEqual(lines.count, 3)
        XCTAssertTrue(lines[0].comment)
        XCTAssertTrue(lines[0].afterBlank, "start of file counts as a paragraph boundary")
        XCTAssertTrue(lines[1].afterBlank)
        XCTAssertFalse(lines[2].afterBlank)
        XCTAssertFalse(lines[1].comment)
    }
}
