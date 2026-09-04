// PanelRowHeightTests.swift
// List rows must hold the author's chosen font. Row height in AppKit is fixed per
// table while the panel font is a preference, so a height written as a constant is
// correct at one scale and wrong at the rest: Georgia at XL draws a 20pt line, and
// the World list was giving it a 17pt row (rowSizeStyle .small), which rendered as
// overlapping text. Reads the ACTUAL row heights from laid-out views — no inference.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class PanelRowHeightTests: XCTestCase {

    private var savedFamily: String?
    private var savedScale: String?

    override func setUp() {
        super.setUp()
        savedFamily = UserDefaults.standard.string(forKey: "SharpeeFontFamily")
        savedScale = UserDefaults.standard.string(forKey: "SharpeeFontScale")
    }

    override func tearDown() {
        // Restore the user's real preference — these tests share UserDefaults.
        if let savedFamily { UserDefaults.standard.set(savedFamily, forKey: "SharpeeFontFamily") }
        else { UserDefaults.standard.removeObject(forKey: "SharpeeFontFamily") }
        if let savedScale { UserDefaults.standard.set(savedScale, forKey: "SharpeeFontScale") }
        else { UserDefaults.standard.removeObject(forKey: "SharpeeFontScale") }
        super.tearDown()
    }

    private func findTable(in view: NSView) -> NSTableView? {
        if let table = view as? NSTableView { return table }
        for sub in view.subviews {
            if let found = findTable(in: sub) { return found }
        }
        return nil
    }

    /// The invariant: a row is never shorter than the line it must hold.
    func testRowHeightFitsEveryFamilyAndScale() {
        for family in FontFamily.allCases {
            for scale in FontScale.allCases {
                FontPreference.family = family
                FontPreference.scale = scale
                let lineHeight = NSLayoutManager().defaultLineHeight(for: FontPreference.panelFont)
                XCTAssertGreaterThanOrEqual(
                    FontPreference.panelRowHeight, lineHeight,
                    "\(family.displayName) \(scale.displayName): a \(lineHeight)pt line does not fit a \(FontPreference.panelRowHeight)pt row")
            }
        }
    }

    /// The World finding list sizes its rows from the preference, not from a style.
    func testWorldFindingTableRowFitsTheChosenFont() throws {
        FontPreference.family = .georgia
        FontPreference.scale = .xl

        let table = WorldFindingTable()
        table.frame = NSRect(x: 0, y: 0, width: 500, height: 300)
        table.setRows([WorldFindingRow(title: "“leather pot” in pot of ale",
                                       detail: "pot-of-ale does not answer to “leather”",
                                       symbol: "character.magnify", tint: .systemBlue, line: 12)],
                      emptyMessage: "")
        table.layoutSubtreeIfNeeded()

        let tableView = try XCTUnwrap(findTable(in: table))
        XCTAssertGreaterThanOrEqual(
            tableView.rowHeight,
            NSLayoutManager().defaultLineHeight(for: FontPreference.panelFont),
            "Georgia at XL overlapped its neighbours in a .small (17pt) row")
    }

    /// A live preference change re-sizes the rows, not just the text in them.
    func testWorldFindingTableRowsGrowWithTheScale() throws {
        FontPreference.family = .georgia
        FontPreference.scale = .sm

        let table = WorldFindingTable()
        table.frame = NSRect(x: 0, y: 0, width: 500, height: 300)
        table.setRows([WorldFindingRow(title: "row", detail: nil, symbol: nil, tint: nil, line: nil)],
                      emptyMessage: "")
        table.layoutSubtreeIfNeeded()
        let tableView = try XCTUnwrap(findTable(in: table))
        let small = tableView.rowHeight

        FontPreference.scale = .xl
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))

        XCTAssertGreaterThan(tableView.rowHeight, small,
                             "the row height must follow the preference change, not stay at the old scale")
        XCTAssertGreaterThanOrEqual(tableView.rowHeight,
                                    NSLayoutManager().defaultLineHeight(for: FontPreference.panelFont))
    }

    /// A row draws one line, however long the finding is.
    ///
    /// The field's `lineBreakMode` governs its `stringValue`; the attributed value
    /// the cell actually sets carries its own paragraph style, and the default one
    /// wraps — a long finding drew a second line over the row beneath it, which is
    /// the smeared World list the author photographed.
    func testLongFindingDrawsOneLineNotTwo() throws {
        FontPreference.family = .georgia
        FontPreference.scale = .xl

        let table = WorldFindingTable()
        table.frame = NSRect(x: 0, y: 0, width: 420, height: 300)
        table.setRows([WorldFindingRow(
            title: "“audience beloved clown” in Your Lodging · after entering",
            detail: "will-kemp does not answer to “audience”, “beloved” — it answers to clown, kemp, will",
            symbol: "character.magnify", tint: .systemBlue, line: 88)],
                      emptyMessage: "")
        table.layoutSubtreeIfNeeded()

        let tableView = try XCTUnwrap(findTable(in: table))
        let cell = try XCTUnwrap(tableView.view(atColumn: 0, row: 0, makeIfNecessary: true) as? NSTableCellView)
        cell.layoutSubtreeIfNeeded()
        let field = try XCTUnwrap(cell.textField)
        XCTAssertGreaterThan(field.frame.width, 0, "the label must be laid out for this measurement to mean anything")

        let drawn = field.attributedStringValue.boundingRect(
            with: NSSize(width: field.frame.width, height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin])
        XCTAssertLessThanOrEqual(drawn.height, tableView.rowHeight,
                                 "the row's text wrapped out of its own row and over the next one")
    }

    /// The Index list carries the same font and needs the same room.
    func testIndexRowFitsTheChosenFont() throws {
        FontPreference.family = .georgia
        FontPreference.scale = .xl

        let view = IndexView()
        view.frame = NSRect(x: 0, y: 0, width: 500, height: 300)
        view.layoutSubtreeIfNeeded()

        let tableView = try XCTUnwrap(findTable(in: view))
        XCTAssertGreaterThanOrEqual(
            tableView.rowHeight,
            NSLayoutManager().defaultLineHeight(for: FontPreference.panelFont))
    }

    /// The directory pane, third holder of the same font.
    func testProjectTreeRowFitsTheChosenFont() throws {
        FontPreference.family = .georgia
        FontPreference.scale = .xl

        let controller = ProjectTreeViewController()
        controller.view.frame = NSRect(x: 0, y: 0, width: 260, height: 400)
        controller.view.layoutSubtreeIfNeeded()

        let outline = try XCTUnwrap(findTable(in: controller.view))
        XCTAssertGreaterThanOrEqual(
            outline.rowHeight,
            NSLayoutManager().defaultLineHeight(for: FontPreference.panelFont),
            "the tree's 20pt constant was two points short of Georgia at XL")
    }
}
