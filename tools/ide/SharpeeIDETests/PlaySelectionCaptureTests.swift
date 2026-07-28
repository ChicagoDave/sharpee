// PlaySelectionCaptureTests.swift
// ADR-282 Phase 1 SPIKE, kept as a permanent test.
//
// D2's selection-aware bless needs the exact substring the author selected in
// the Play pane's response. ADR-282's Consequences authorize exactly ONE
// platform-side change (the `actualOutput` field), so if reading that selection
// required new `packages/platform-browser` code, the phase would have had to
// stop and go back to David.
//
// It does not. This pins that: a real WKWebView, driven the same way
// PlayViewController already drives one (`evaluateJavaScript`, the mechanism
// behind its localStorage clear at PlayViewController.swift:172), reads
// `window.getSelection()` from the Swift side with no page cooperation — no
// injected helper the client must ship, no message handler, nothing in
// platform-browser. A real mouse drag leaves the same selection state these
// tests set programmatically.
//
// Kept rather than deleted so the finding stays true: if a future change makes
// selection unreadable from Swift (a `user-select: none` in engine.css, a
// sandboxed frame), this fails and names the reason.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class PlaySelectionCaptureTests: XCTestCase {

    private var webView: WKWebView!

    /// A response shaped like the ones Acceptance 5 names: multi-line prose,
    /// bracket-shaped lines, and quotes.
    private static let responseHTML = """
    <html><body>
    <div id="text-content">
    <p id="p1">The cellar door hangs open, and the dark below is patient.</p>
    <p id="p2">[the lantern gutters]</p>
    <p id="p3">She said "take it" and would not look at you.</p>
    </div>
    </body></html>
    """

    override func setUp() async throws {
        try await super.setUp()
        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 400, height: 300))
        webView.loadHTMLString(Self.responseHTML, baseURL: nil)
        try await waitForLoad()
    }

    override func tearDown() async throws {
        webView = nil
        try await super.tearDown()
    }

    private func waitForLoad() async throws {
        // Poll rather than use a navigation delegate — the delegate would have
        // to outlive the test and this is a fixed, local HTML string.
        for _ in 0..<100 {
            let ready = try? await webView.evaluateJavaScript(
                "document.getElementById('p1') !== null") as? Bool
            if ready == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("the fixture page never finished loading")
    }

    /// Selects a whole element, the way a user dragging across a paragraph does.
    private func selectElement(_ id: String) async throws {
        _ = try await webView.evaluateJavaScript("""
        (function () {
            const el = document.getElementById('\(id)');
            const range = document.createRange();
            range.selectNodeContents(el);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            return true;
        })()
        """)
    }

    private func readSelection() async throws -> String {
        let value = try await webView.evaluateJavaScript("window.getSelection().toString()")
        return (value as? String) ?? ""
    }

    // MARK: - The spike's question

    func testSwiftCanReadATextSelectionOutOfTheWebViewWithNoPageCooperation() async throws {
        try await selectElement("p1")

        let selection = try await readSelection()
        XCTAssertEqual(selection,
                       "The cellar door hangs open, and the dark below is patient.",
                       "selection must be readable from Swift alone — if this fails, "
                       + "selection-aware bless needs a platform-browser change and "
                       + "ADR-282's 'nothing else platform-side' no longer holds")
    }

    func testAnEmptySelectionReadsAsEmptyRatherThanFailing() async throws {
        // The no-selection case is the common one: D2 says bless with no
        // selection asserts the FULL response, so this must be distinguishable
        // and must not throw.
        let selection = try await readSelection()
        XCTAssertEqual(selection, "", "no selection must read as empty, not error")
    }

    func testASelectionContainingQuotesSurvivesTheRoundTrip() async throws {
        try await selectElement("p3")

        // Phase 2 decides how this encodes (a fragment containing `"` fails the
        // inline-payload rule and takes the fence path). Phase 1 only has to
        // prove the characters arrive intact.
        let selection = try await readSelection()
        XCTAssertEqual(selection, "She said \"take it\" and would not look at you.")
        XCTAssertTrue(selection.contains("\""), "quotes must survive to reach Phase 2's encoder")
    }

    func testASelectionContainingBracketShapedTextSurvivesTheRoundTrip() async throws {
        try await selectElement("p2")

        // Bracket-shaped lines are exactly what ADR-287's fences exist for.
        let selection = try await readSelection()
        XCTAssertEqual(selection, "[the lantern gutters]")
    }

    func testAMultiParagraphSelectionKeepsItsParagraphBoundary() async throws {
        _ = try await webView.evaluateJavaScript("""
        (function () {
            const range = document.createRange();
            range.setStartBefore(document.getElementById('p1'));
            range.setEndAfter(document.getElementById('p2'));
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            return true;
        })()
        """)

        // Paragraph boundaries are the exact axis D2 warns about (DOM text and
        // channel-flattened text differ there). A multi-paragraph selection must
        // not silently collapse into one line before Phase 2 ever sees it.
        let selection = try await readSelection()
        XCTAssertTrue(selection.contains("patient."), "first paragraph must be present")
        XCTAssertTrue(selection.contains("[the lantern gutters]"), "second paragraph must be present")
        XCTAssertTrue(selection.contains("\n"),
                      "the paragraph boundary must survive as a newline, got: \(selection.debugDescription)")
    }
}
