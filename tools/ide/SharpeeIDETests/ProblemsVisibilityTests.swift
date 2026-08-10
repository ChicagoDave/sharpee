// ProblemsVisibilityTests.swift
// A warning-only compose must be VISIBLE. Two defects met here and neither was
// visible on its own: the Problems badge counted errors, so a compose whose only
// finding was a warning badged 0; and the bottom panel is collapsed by default,
// so the one surface that names the problem was hidden as well as silent. What
// the author saw was sixteen lines of yellow underline in the editor and no text
// anywhere explaining it.
//
// The case that surfaced it was a warning against `branch-stories/fernhill`'s
// whole `story` block — which is also why the underline is clamped to one line
// (SpanTextUnderlineTests). The fixture below keeps that shape; the specific
// diagnostic retired with ADR-309, but a block-spanning warning is the class
// this behavior exists for.

import XCTest
@testable import SharpeeIDE

@MainActor
final class ProblemsVisibilityTests: XCTestCase {

    private let storyURL = URL(fileURLWithPath: "/s/fernhill.story")

    /// The shape of the diagnostic that surfaced this: a warning spanning the
    /// entire `story` block, as a live compose of fernhill once produced.
    private var blockSpanningWarning: ComposeDiagnosticRecord {
        ComposeDiagnosticRecord(
            severity: .warning,
            code: "analysis.header-warning",
            message: "The story header has a problem that covers the whole block.",
            file: storyURL.path,
            line: 5,
            span: DiagnosticSpan(line: 5, column: 1, endLine: 20, endColumn: 9))
    }

    func testAWarningOnlyComposeStillCountsAsAProblem() {
        let view = ProblemsView()
        view.setProblems([blockSpanningWarning], for: storyURL)

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
        view.setProblems([blockSpanningWarning, error], for: storyURL)

        XCTAssertEqual(view.errorCount, 1)
        XCTAssertEqual(view.problemCount, 2)
    }

    func testACleanComposeBadgesNothing() {
        let view = ProblemsView()
        view.setProblems([], for: storyURL)
        XCTAssertEqual(view.problemCount, 0, "a clean compose must not badge")
    }
}
