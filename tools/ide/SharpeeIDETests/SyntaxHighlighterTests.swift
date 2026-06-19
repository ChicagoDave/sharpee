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
}
