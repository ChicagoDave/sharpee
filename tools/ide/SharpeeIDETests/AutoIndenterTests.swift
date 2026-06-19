// AutoIndenterTests.swift
// Covers AutoIndenter: leading-whitespace carry, the extra level after an opening bracket
// (including trailing-space tolerance), tab indentation, and the no-indent baseline.

import XCTest
@testable import SharpeeIDE

final class AutoIndenterTests: XCTestCase {

    func testCarriesLeadingWhitespace() {
        XCTAssertEqual(AutoIndenter.indentOnNewline(text: "    foo", caret: 7), "    ")
    }

    func testAddsLevelAfterOpeningBrace() {
        // "if (x) {" — leading none, last non-ws is "{" → one indent unit.
        XCTAssertEqual(AutoIndenter.indentOnNewline(text: "if (x) {", caret: 8), "  ")
    }

    func testCombinesLeadingAndBraceLevel() {
        XCTAssertEqual(AutoIndenter.indentOnNewline(text: "  if {", caret: 6), "    ")
    }

    func testToleratesTrailingSpaceAfterBracket() {
        XCTAssertEqual(AutoIndenter.indentOnNewline(text: "{ ", caret: 2), "  ")
    }

    func testCarriesTabIndentation() {
        XCTAssertEqual(AutoIndenter.indentOnNewline(text: "\tfoo", caret: 4), "\t")
    }

    func testNoIndentForPlainLine() {
        XCTAssertEqual(AutoIndenter.indentOnNewline(text: "foo", caret: 3), "")
    }

    func testRespectsCustomIndentUnit() {
        XCTAssertEqual(AutoIndenter.indentOnNewline(text: "{", caret: 1, indentUnit: "    "), "    ")
    }
}
