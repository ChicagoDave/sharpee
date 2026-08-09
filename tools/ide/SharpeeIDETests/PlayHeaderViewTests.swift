// PlayHeaderViewTests.swift
// Covers the Play header's theme picker (go-live Phase 6b): the popup's items
// mirror the catalog with Story Default leading, selection lands on the picked
// theme (falling back to Story Default for nil or an id the catalog no longer
// carries), and a pick reports the theme id — nil for Story Default — through
// onThemeSelect. Assertions read the NSPopUpButton's own item state.
// Owner context: tools/ide — Tests.

import AppKit
import XCTest
@testable import SharpeeIDE

@MainActor
final class PlayHeaderViewTests: XCTestCase {

    private var header: PlayHeaderView!

    private let catalog = [
        PlayTheme(id: "classic", name: "Classic"),
        PlayTheme(id: "paper", name: "Paper"),
        PlayTheme(id: "system-6", name: "System 6"),
    ]

    /// The picker embedded in the header — found by class, so the test reads
    /// the real control rather than a parallel accessor added for testing.
    private var picker: NSPopUpButton {
        func find(in view: NSView) -> NSPopUpButton? {
            for subview in view.subviews {
                if let popup = subview as? NSPopUpButton { return popup }
                if let nested = find(in: subview) { return nested }
            }
            return nil
        }
        guard let popup = find(in: header) else {
            XCTFail("the header has no theme popup")
            return NSPopUpButton()
        }
        return popup
    }

    override func setUp() {
        super.setUp()
        header = PlayHeaderView()
    }

    override func tearDown() {
        header = nil
        super.tearDown()
    }

    // MARK: - DOES: setThemes populates Story Default + the catalog, in order

    func testSetThemesListsStoryDefaultThenTheCatalogInOrder() {
        header.setThemes(catalog, selectedThemeId: nil)
        XCTAssertEqual(picker.itemArray.map(\.title),
                       [PlayHeaderView.storyDefaultTitle, "Classic", "Paper", "System 6"])
        XCTAssertEqual(picker.itemArray.map { $0.representedObject as? String },
                       [nil, "classic", "paper", "system-6"],
                       "each item carries its theme id; Story Default carries none")
    }

    func testSelectionLandsOnThePersistedTheme() {
        header.setThemes(catalog, selectedThemeId: "paper")
        XCTAssertEqual(picker.selectedItem?.title, "Paper")
    }

    func testNilAndUnknownIdsFallBackToStoryDefault() {
        header.setThemes(catalog, selectedThemeId: nil)
        XCTAssertEqual(picker.selectedItem?.title, PlayHeaderView.storyDefaultTitle)

        header.setThemes(catalog, selectedThemeId: "retired-theme")
        XCTAssertEqual(picker.selectedItem?.title, PlayHeaderView.storyDefaultTitle,
                       "an id the catalog no longer carries must not leave a stale selection")
    }

    // MARK: - DOES: a pick reports its theme id through onThemeSelect

    func testPickingAThemeReportsItsId() {
        header.setThemes(catalog, selectedThemeId: nil)
        var reported: String? = "never-called"
        header.onThemeSelect = { reported = $0 }

        picker.selectItem(withTitle: "System 6")
        _ = picker.target?.perform(picker.action, with: picker)
        XCTAssertEqual(reported, "system-6")
    }

    func testPickingStoryDefaultReportsNil() {
        header.setThemes(catalog, selectedThemeId: "paper")
        var reported: String? = "never-called"
        header.onThemeSelect = { reported = $0 }

        picker.selectItem(withTitle: PlayHeaderView.storyDefaultTitle)
        _ = picker.target?.perform(picker.action, with: picker)
        XCTAssertNil(reported, "Story Default is the nil pick")
    }

    // MARK: - Create Transcript (ADR-305 D6)

    /// The 6f Create Transcript button is retired (ADR-306 D1, David's shred
    /// ruling 2026-08-09) — the header must NOT grow it back.
    func testHeaderCarriesNoCreateTranscriptButton() {
        func find(in view: NSView) -> NSButton? {
            for subview in view.subviews {
                if let button = subview as? NSButton, button.title == "Create Transcript" {
                    return button
                }
                if let nested = find(in: subview) { return nested }
            }
            return nil
        }
        XCTAssertNil(find(in: header),
                     "the Create Transcript flow is retired — authoring lives in the testing play surface")
    }
}
