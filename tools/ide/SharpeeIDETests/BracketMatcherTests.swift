// BracketMatcherTests.swift
// Covers BracketMatcher: caret-before vs caret-at adjacency, forward/backward scans, nesting,
// and the no-match / unbalanced cases.

import XCTest
@testable import SharpeeIDE

final class BracketMatcherTests: XCTestCase {

    func testMatchesForwardFromOpenBeforeCaret() {
        // caret sits just after "(" → partner is the closing ")".
        let r = BracketMatcher.match(in: "(a)", caret: 1)
        XCTAssertEqual(r?.bracket, 0)
        XCTAssertEqual(r?.partner, 2)
    }

    func testMatchesBackwardFromCloseBeforeCaret() {
        // caret sits just after ")" → partner is the opening "(".
        let r = BracketMatcher.match(in: "(a)", caret: 3)
        XCTAssertEqual(r?.bracket, 2)
        XCTAssertEqual(r?.partner, 0)
    }

    func testMatchesBracketAtCaretWhenNoneBefore() {
        // Nothing before caret 0; the "(" at the caret matches the ")".
        let r = BracketMatcher.match(in: "()", caret: 0)
        XCTAssertEqual(r?.bracket, 0)
        XCTAssertEqual(r?.partner, 1)
    }

    func testRespectsNesting() {
        // caret after the outer "(" must skip the inner pair to index 4.
        let r = BracketMatcher.match(in: "((x))", caret: 1)
        XCTAssertEqual(r?.bracket, 0)
        XCTAssertEqual(r?.partner, 4)
    }

    func testMatchesMixedBraceTypes() {
        let r = BracketMatcher.match(in: "{ [a] }", caret: 1) // after "{"
        XCTAssertEqual(r?.bracket, 0)
        XCTAssertEqual(r?.partner, 6)
    }

    func testReturnsNilWhenCaretNotAdjacentToBracket() {
        XCTAssertNil(BracketMatcher.match(in: "abc", caret: 1))
    }

    func testReturnsNilForUnbalancedBracket() {
        XCTAssertNil(BracketMatcher.match(in: "(a", caret: 1))
        XCTAssertNil(BracketMatcher.match(in: "a)", caret: 0))
    }
}
