// BuildStateFormatterTests.swift
// Covers BuildStateFormatter: duration formatting (sub-minute vs minutes) and the
// per-state pill labels.

import XCTest
@testable import SharpeeIDE

final class BuildStateFormatterTests: XCTestCase {

    // MARK: - durationText

    func testSubMinuteShowsTenthsOfSeconds() {
        XCTAssertEqual(BuildStateFormatter.durationText(0), "0.0s")
        XCTAssertEqual(BuildStateFormatter.durationText(2.0), "2.0s")
        XCTAssertEqual(BuildStateFormatter.durationText(45.4), "45.4s")
    }

    func testMinuteAndOverShowsMinutesAndSeconds() {
        XCTAssertEqual(BuildStateFormatter.durationText(60), "1m 00s")
        XCTAssertEqual(BuildStateFormatter.durationText(90), "1m 30s")
        XCTAssertEqual(BuildStateFormatter.durationText(125), "2m 05s")
    }

    func testNegativeDurationClampsToZero() {
        XCTAssertEqual(BuildStateFormatter.durationText(-5), "0.0s")
    }

    // MARK: - label

    func testIdleLabelIsEmpty() {
        XCTAssertEqual(BuildStateFormatter.label(for: .idle), "")
    }

    func testBuildingLabel() {
        XCTAssertEqual(BuildStateFormatter.label(for: .building), "Building…")
    }

    func testSucceededLabelIncludesDuration() {
        XCTAssertEqual(BuildStateFormatter.label(for: .succeeded(duration: 2.0)), "Built in 2.0s")
        XCTAssertEqual(BuildStateFormatter.label(for: .succeeded(duration: 90)), "Built in 1m 30s")
    }

    func testFailedAndCancelledLabels() {
        XCTAssertEqual(BuildStateFormatter.label(for: .failed(duration: 12)), "Build failed")
        XCTAssertEqual(BuildStateFormatter.label(for: .cancelled(duration: 3)), "Cancelled")
    }
}
