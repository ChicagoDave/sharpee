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

    // MARK: - Window title
    //
    // Two literals survived the Phase 1 rebrand here: the window opened as
    // "Sharpee", and AppDelegate.loadProject retitled it "Sharpee — <project>"
    // on every open. The retitle is gone, so the title is now set exactly once,
    // at construction — which is what this pins.
    //
    // The removed retitle is not covered here on purpose: reaching it means
    // driving MainWindowController.loadProject, which pushes to the REAL
    // UserDefaults recent-projects list (RecentProjectsStore.push defaults to
    // .standard). Polluting the author's Open Recent menu is too high a price
    // for asserting a string that no code path writes any more.

    /// `@MainActor` on the method rather than the class: this is the only case
    /// here that touches AppKit — the rest are pure string formatting.
    @MainActor
    func testWindowOpensTitledWithTheProductNameAlone() throws {
        let title = try XCTUnwrap(MainWindowController().window?.title)
        XCTAssertEqual(title, "Chord Writer")
        XCTAssertFalse(title.contains("Sharpee"),
                       "the platform name is not the product name (ADR-279 D1)")
        XCTAssertFalse(title.contains("—"),
                       "the title is the product name alone — no ' — <project>' suffix")
    }
}
