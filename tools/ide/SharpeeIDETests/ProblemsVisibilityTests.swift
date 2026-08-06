// ProblemsVisibilityTests.swift
// A warning-only compose must be VISIBLE. Two defects met here and neither was
// visible on its own: the Problems badge counted errors, so a compose whose only
// finding was a warning badged 0; and the bottom panel is collapsed by default,
// so the one surface that names the problem was hidden as well as silent. What
// the author saw was sixteen lines of yellow underline in the editor and no text
// anywhere explaining it.
//
// The real case is `analysis.missing-ifid` on `branch-stories/fernhill`, whose
// span covers the whole `story` block — which is also why the underline is
// clamped to one line (SpanTextUnderlineTests).

import XCTest
@testable import SharpeeIDE

@MainActor
final class ProblemsVisibilityTests: XCTestCase {

    private let storyURL = URL(fileURLWithPath: "/s/fernhill.story")

    /// The real shape of the diagnostic that surfaced this: a warning spanning
    /// the entire `story` block, taken from a live compose of fernhill.
    private var missingIfid: ComposeDiagnosticRecord {
        ComposeDiagnosticRecord(
            severity: .warning,
            code: "analysis.missing-ifid",
            message: "The story has no `ifid:` — mint one with `sharpee ifid` (Treaty of Babel).",
            file: storyURL.path,
            line: 5,
            span: DiagnosticSpan(line: 5, column: 1, endLine: 20, endColumn: 9))
    }

    func testAWarningOnlyComposeStillCountsAsAProblem() {
        let view = ProblemsView()
        view.setProblems([missingIfid], for: storyURL)

        XCTAssertEqual(view.errorCount, 0, "a warning is not an error")
        XCTAssertEqual(view.problemCount, 1,
                       "but it IS a problem — the badge must not read 0 while the editor underlines it")
    }

    func testErrorsAndWarningsBothCountTowardTheBadge() {
        let error = ComposeDiagnosticRecord(
            severity: .error, code: "analysis.unknown-entity",
            message: "The player starts in the Attic, which is never created.",
            file: storyURL.path, line: 30,
            span: DiagnosticSpan(line: 30, column: 3, endLine: 30, endColumn: 24))
        let view = ProblemsView()
        view.setProblems([missingIfid, error], for: storyURL)

        XCTAssertEqual(view.errorCount, 1)
        XCTAssertEqual(view.problemCount, 2)
    }

    func testACleanComposeBadgesNothing() {
        let view = ProblemsView()
        view.setProblems([], for: storyURL)
        XCTAssertEqual(view.problemCount, 0, "a clean compose must not badge")
    }
}
