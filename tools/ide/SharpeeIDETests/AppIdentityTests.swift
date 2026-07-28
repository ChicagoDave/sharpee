// AppIdentityTests.swift
// Covers ADR-279 D1's status-bar version line: Chord Writer's own version, with
// the toolchain's Sharpee/Chord versions displayed alongside rather than encoded
// into it. The `sharpee --version` parse that feeds the platform half is pinned
// in ChordVersionCheckTests, beside its Chord-component sibling.

import XCTest
@testable import SharpeeIDE

final class AppIdentityTests: XCTestCase {

    // MARK: - Status-bar label

    func testShowsAppAndBothToolchainVersions() {
        XCTAssertEqual(
            AppIdentity.statusBarLabel(appVersion: "1.0.0",
                                       sharpeeVersion: "4.2.0",
                                       chordVersion: "2.1.0"),
            "Chord Writer 1.0.0 · Sharpee 4.2.0 / Chord 2.1.0")
    }

    func testShowsAppVersionAloneWhenNoToolchainResolved() {
        XCTAssertEqual(
            AppIdentity.statusBarLabel(appVersion: "1.0.0",
                                       sharpeeVersion: nil,
                                       chordVersion: nil),
            "Chord Writer 1.0.0",
            "a missing toolchain is diagnosed by compose/build, not by the status bar")
    }

    func testOmitsOnlyTheUnknownToolchainComponent() {
        XCTAssertEqual(
            AppIdentity.statusBarLabel(appVersion: "1.0.0",
                                       sharpeeVersion: "4.2.0",
                                       chordVersion: nil),
            "Chord Writer 1.0.0 · Sharpee 4.2.0")
        XCTAssertEqual(
            AppIdentity.statusBarLabel(appVersion: "1.0.0",
                                       sharpeeVersion: nil,
                                       chordVersion: "2.1.0"),
            "Chord Writer 1.0.0 · Chord 2.1.0")
    }

    func testProductNameIsTheShippedName() {
        XCTAssertEqual(AppIdentity.productName, "Chord Writer",
                       "the Swift module stays SharpeeIDE; the product does not")
    }

    // MARK: - About panel toolchain line

    func testAboutLineShowsBothToolchainVersions() {
        XCTAssertEqual(
            AppIdentity.aboutToolchainLine(sharpeeVersion: "4.2.0", chordVersion: "2.1.0"),
            "Sharpee 4.2.0 · Chord 2.1.0")
    }

    func testAboutLineStatesAbsenceRatherThanGoingQuiet() {
        XCTAssertEqual(
            AppIdentity.aboutToolchainLine(sharpeeVersion: nil, chordVersion: nil),
            "No Sharpee toolchain resolved.",
            "a deliberately-opened panel should answer the question it was opened for")
    }

    func testAboutLineOmitsOnlyTheUnknownComponent() {
        XCTAssertEqual(
            AppIdentity.aboutToolchainLine(sharpeeVersion: "4.2.0", chordVersion: nil),
            "Sharpee 4.2.0")
    }
}
