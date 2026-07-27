// ProjectTreeFontTests.swift
// The directory pane follows the reader font (David's ruling): rows render in
// FontPreference.panelFont (folders in the family's bold trait) and a live
// preference change re-renders. Reads the ACTUAL cell fonts from a laid-out
// outline view — no inference.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class ProjectTreeFontTests: XCTestCase {

    private var tmp: URL!
    private var savedFamily: String?
    private var savedScale: String?

    override func setUpWithError() throws {
        super.setUp()
        savedFamily = UserDefaults.standard.string(forKey: "SharpeeFontFamily")
        savedScale = UserDefaults.standard.string(forKey: "SharpeeFontScale")
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-ProjectTreeFontTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: tmp.appendingPathComponent("folder"),
                                                withIntermediateDirectories: true)
        try "x".write(to: tmp.appendingPathComponent("story.story"), atomically: true, encoding: .utf8)
    }

    override func tearDownWithError() throws {
        // Restore the user's real preference — these tests share UserDefaults.
        if let savedFamily { UserDefaults.standard.set(savedFamily, forKey: "SharpeeFontFamily") }
        else { UserDefaults.standard.removeObject(forKey: "SharpeeFontFamily") }
        if let savedScale { UserDefaults.standard.set(savedScale, forKey: "SharpeeFontScale") }
        else { UserDefaults.standard.removeObject(forKey: "SharpeeFontScale") }
        if let tmp { try? FileManager.default.removeItem(at: tmp) }
        super.tearDown()
    }

    private func rowFonts(in controller: ProjectTreeViewController) throws -> [String] {
        let outline = try XCTUnwrap(findOutline(in: controller.view))
        var fonts: [String] = []
        for row in 0..<outline.numberOfRows {
            let cell = outline.view(atColumn: 0, row: row, makeIfNecessary: true) as? NSTableCellView
            if let font = cell?.textField?.font {
                fonts.append(font.fontName)
            }
        }
        return fonts
    }

    private func findOutline(in view: NSView) -> NSOutlineView? {
        if let o = view as? NSOutlineView { return o }
        for sub in view.subviews {
            if let f = findOutline(in: sub) { return f }
        }
        return nil
    }

    func testDirectoryRowsFollowTheFontFamilyLive() throws {
        let controller = ProjectTreeViewController()
        controller.view.frame = NSRect(x: 0, y: 0, width: 260, height: 400)
        controller.setProject(Project(rootURL: tmp))
        controller.view.layoutSubtreeIfNeeded()
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))

        FontPreference.family = .georgia
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))
        let georgia = try rowFonts(in: controller)
        XCTAssertFalse(georgia.isEmpty, "the tree must have rows")
        XCTAssertTrue(georgia.allSatisfy { $0.hasPrefix("Georgia") },
                      "directory rows must render in the chosen family, got: \(georgia)")

        FontPreference.family = .courier
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))
        let courier = try rowFonts(in: controller)
        XCTAssertTrue(courier.allSatisfy { $0.hasPrefix("CourierNew") },
                      "a live family change must re-render the rows, got: \(courier)")
    }
}
