// SyntaxHighlighterTests.swift
// P2 spike — real-path coverage for tree-sitter highlighting. The keyword-coloring test
// exercises the ACTUAL vendored grammar and its bundled highlights query (no stub): it is the
// acceptance gate proving the parse → query → color pipeline works at runtime, not just compiles.

import XCTest
import AppKit
@testable import SharpeeIDE

final class SyntaxHighlighterTests: XCTestCase {

    // MARK: - Language gating (pure)

    func testCanHighlightTypeScriptFamilyOnly() {
        let h = SyntaxHighlighter()
        XCTAssertTrue(h.canHighlight(URL(fileURLWithPath: "/x/foo.ts")))
        XCTAssertTrue(h.canHighlight(URL(fileURLWithPath: "/x/foo.tsx")))
        XCTAssertFalse(h.canHighlight(URL(fileURLWithPath: "/x/readme.md")))
        XCTAssertFalse(h.canHighlight(URL(fileURLWithPath: "/x/data.json")))
    }

    // MARK: - Capture-name mapping (pure)

    func testColorResolvesDottedCaptureByHead() {
        XCTAssertEqual(SyntaxHighlighter.color(forCapture: "keyword.control"), Theme.tokenKeyword)
        XCTAssertEqual(SyntaxHighlighter.color(forCapture: "keyword"), Theme.tokenKeyword)
        XCTAssertEqual(SyntaxHighlighter.color(forCapture: "string.special"), Theme.tokenString)
        XCTAssertNil(SyntaxHighlighter.color(forCapture: "totallyunknown"))
    }

    // MARK: - Real-path: parse + bundled highlights query + color application

    func testHighlightColorsKeywordToken() {
        // REAL-PATH TEST: drives the vendored tree-sitter-typescript grammar and its bundled
        // highlights.scm. If the query bundle fails to load at runtime, highlight() leaves all
        // text at base foreground and this assertion fails — which is exactly the signal we want.
        let source = "const x = 42;\n"
        let storage = NSTextStorage(string: source)

        SyntaxHighlighter().highlight(storage)

        // "const" occupies characters 0..<5.
        let color = storage.attribute(.foregroundColor, at: 0, effectiveRange: nil) as? NSColor
        XCTAssertEqual(color, Theme.tokenKeyword, "‘const’ should be colored as a keyword")
    }

    func testHighlightColorsNumberLiteral() {
        let source = "const x = 42;\n"
        let storage = NSTextStorage(string: source)

        SyntaxHighlighter().highlight(storage)

        let numberLocation = (source as NSString).range(of: "42").location
        let color = storage.attribute(.foregroundColor, at: numberLocation, effectiveRange: nil) as? NSColor
        XCTAssertEqual(color, Theme.tokenNumber, "‘42’ should be colored as a number")
    }

    func testHighlightResetsUnmappedTextToBaseForeground() {
        // The identifier `x` has no mapped token color; it must land on base foreground rather
        // than an undefined/default attribute — proving the full-range reset pass runs.
        let source = "const x = 42;\n"
        let storage = NSTextStorage(string: source)

        SyntaxHighlighter().highlight(storage)

        let idLocation = (source as NSString).range(of: "x").location
        let color = storage.attribute(.foregroundColor, at: idLocation, effectiveRange: nil) as? NSColor
        XCTAssertEqual(color, Theme.foreground)
    }

    // MARK: - Failure isolation / negative paths

    func testMalformedQueryGroupIsDroppedWhileGoodGroupsSurvive() {
        // A group naming a node the grammar doesn't have fails to compile and is skipped; other
        // groups still apply. Here the only "keyword" group is malformed, but the number group
        // is valid — so `42` colors and `const` does not.
        let source = "const x = 42;\n"
        let storage = NSTextStorage(string: source)

        SyntaxHighlighter(querySources: [
            "(this_node_does_not_exist) @keyword", // malformed → dropped
            "(number) @number",                    // valid → applied
        ]).highlight(storage)

        let numberLocation = (source as NSString).range(of: "42").location
        XCTAssertEqual(storage.attribute(.foregroundColor, at: numberLocation, effectiveRange: nil) as? NSColor,
                       Theme.tokenNumber, "valid group must survive a sibling group's failure")
        XCTAssertEqual(storage.attribute(.foregroundColor, at: 0, effectiveRange: nil) as? NSColor,
                       Theme.foreground, "‘const’ has no surviving keyword group → base foreground")
    }

    func testAllQueriesFailingLeavesTextAtBaseForeground() {
        // When every group fails to compile, highlight() is a no-op beyond the reset pass:
        // all text lands on base foreground rather than an undefined attribute.
        let source = "const x = 42;\n"
        let storage = NSTextStorage(string: source)

        SyntaxHighlighter(querySources: ["(this_node_does_not_exist) @keyword"]).highlight(storage)

        XCTAssertEqual(storage.attribute(.foregroundColor, at: 0, effectiveRange: nil) as? NSColor,
                       Theme.foreground, "‘const’ should fall back to base foreground")
        let numberLocation = (source as NSString).range(of: "42").location
        XCTAssertEqual(storage.attribute(.foregroundColor, at: numberLocation, effectiveRange: nil) as? NSColor,
                       Theme.foreground, "‘42’ should fall back to base foreground")
    }
}
