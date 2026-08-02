// WindowTitleTests.swift
// The window title derives from the composed story (GH #188, ADR-279 D1
// Amendment A1): story title when a compile has revealed one, product name for
// every degenerate case — no IR, a grammar-header file, a blank title.

import XCTest
@testable import SharpeeIDE

final class WindowTitleTests: XCTestCase {

    private func ir(title: String,
                    author: String = "A. Author",
                    grammar: Bool = false) -> ComposeStoryIR {
        ComposeStoryIR(
            format: "compose/1",
            languageVersion: "2.2.0",
            meta: .init(title: title, author: author, fields: [:]),
            grammarFile: grammar ? .init(name: "standard") : nil,
            entities: nil, actions: nil, phrases: nil, hatches: nil)
    }

    func testAComposedStoryTitlesTheWindow() {
        XCTAssertEqual(WindowTitle.title(for: ir(title: "The Folly at Fernhill")),
                       "The Folly at Fernhill")
    }

    func testNoComposeMeansTheProductName() {
        XCTAssertEqual(WindowTitle.title(for: nil), AppIdentity.productName)
    }

    func testAGrammarHeaderFileIsNotAStoryAndKeepsTheProductName() {
        XCTAssertEqual(WindowTitle.title(for: ir(title: "standard", grammar: true)),
                       AppIdentity.productName,
                       "grammar files disable Build/Play (ADR-258 D2) — they must not brand the window either")
    }

    func testABlankTitleFallsBackToTheProductName() {
        XCTAssertEqual(WindowTitle.title(for: ir(title: "   ")), AppIdentity.productName)
        XCTAssertEqual(WindowTitle.title(for: ir(title: "")), AppIdentity.productName)
    }

    func testSurroundingWhitespaceIsTrimmedNotDisplayed() {
        XCTAssertEqual(WindowTitle.title(for: ir(title: "  Fernhill \n")), "Fernhill")
    }
}
