// SpanTextTests.swift
// Span → character-range conversion: 1-based line/column mapping, end-exclusive
// columns, multi-line spans, and out-of-range spans (stale diagnostics) yielding
// nil rather than a guessed range.

import XCTest
@testable import SharpeeIDE

final class SpanTextTests: XCTestCase {

    private let text = "story \"Probe\"\n  id: probe\n\ncreate the Lab\n"

    func testSingleLineSpanSelectsExactRange() throws {
        // Line 2 is "  id: probe" — span columns 3..5 cover "id:".
        let span = DiagnosticSpan(line: 2, column: 3, endLine: 2, endColumn: 6)
        let range = try XCTUnwrap(SpanText.characterRange(of: span, in: text))
        XCTAssertEqual((text as NSString).substring(with: range), "id:")
    }

    func testSpanOnFirstLine() throws {
        let span = DiagnosticSpan(line: 1, column: 1, endLine: 1, endColumn: 6)
        let range = try XCTUnwrap(SpanText.characterRange(of: span, in: text))
        XCTAssertEqual((text as NSString).substring(with: range), "story")
    }

    func testMultiLineSpan() throws {
        let span = DiagnosticSpan(line: 1, column: 7, endLine: 2, endColumn: 3)
        let range = try XCTUnwrap(SpanText.characterRange(of: span, in: text))
        XCTAssertEqual((text as NSString).substring(with: range), "\"Probe\"\n  ")
    }

    func testEndColumnOnePastLineContentIsValid() throws {
        // "create the Lab" is 14 chars — endColumn 15 (one past) is a legal end-exclusive bound.
        let span = DiagnosticSpan(line: 4, column: 8, endLine: 4, endColumn: 15)
        let range = try XCTUnwrap(SpanText.characterRange(of: span, in: text))
        XCTAssertEqual((text as NSString).substring(with: range), "the Lab")
    }

    func testLineBeyondEOFYieldsNil() {
        let span = DiagnosticSpan(line: 99, column: 1, endLine: 99, endColumn: 2)
        XCTAssertNil(SpanText.characterRange(of: span, in: text))
    }

    func testColumnBeyondLineYieldsNil() {
        let span = DiagnosticSpan(line: 2, column: 40, endLine: 2, endColumn: 45)
        XCTAssertNil(SpanText.characterRange(of: span, in: text))
    }

    func testInvertedSpanYieldsNil() {
        let span = DiagnosticSpan(line: 2, column: 6, endLine: 2, endColumn: 3)
        XCTAssertNil(SpanText.characterRange(of: span, in: text))
    }
}
