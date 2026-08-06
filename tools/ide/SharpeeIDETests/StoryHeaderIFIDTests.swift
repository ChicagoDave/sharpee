// StoryHeaderIFIDTests.swift
// The Problems panel's "Generate IFID" fix: where the `ifid:` line lands in a
// Chord story header, when the fix refuses, and the end-to-end path from a
// button click in Problems to the text sitting in the editor's buffer.
// The header shapes here are the real ones — fernhill's (nested `use`/`on`
// blocks after the fields) and the `sharpee init` template's.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class StoryHeaderIFIDTests: XCTestCase {

    // fernhill's header: simple fields, then `use`/`on` blocks that an `ifid:`
    // must never be dropped inside.
    private let fernhill = """
    ## The Folly at Fernhill — one winter night to find the deed.

    story
      title: The Folly at Fernhill
      authors: The Sharpee Project
      id: fernhill
      story-version: 0.3.0
      description: One cold winter night to find the deed.
      states: evening, midnight
      use state-machines
      use scoring
        rank "Trespasser" at 0

      on every turn while one chance in 12
        phrase distant-bell
      end on

    create the Grounds
      a region

    """

    /// Applies an insertion the way the editor does, so assertions read the
    /// result rather than an offset.
    private func applying(_ insertion: StoryHeaderIFID.Insertion, to source: String) -> String {
        let ns = source as NSString
        return ns.replacingCharacters(in: NSRange(location: insertion.offset, length: 0),
                                      with: insertion.text)
    }

    // MARK: - Where the line lands

    func testTheLineLandsDirectlyAfterTheIdField() throws {
        let insertion = try XCTUnwrap(StoryHeaderIFID.insertion(of: "TEST-IFID", into: fernhill))
        let lines = applying(insertion, to: fernhill).components(separatedBy: "\n")

        let idLine = try XCTUnwrap(lines.firstIndex { $0.hasPrefix("  id:") })
        XCTAssertEqual(lines[idLine + 1], "  ifid: TEST-IFID",
                       "ifid: belongs immediately after id: — the two identity fields sit together")
    }

    func testWithoutAnIdItFallsBackToAfterTheLastFieldAndNeverIntoANestedBlock() throws {
        let source = """
        story
          title: The Folly at Fernhill
          states: evening, midnight
          use scoring
            rank "Trespasser" at 0

        """
        let insertion = try XCTUnwrap(StoryHeaderIFID.insertion(of: "TEST-IFID", into: source))
        let lines = applying(insertion, to: source).components(separatedBy: "\n")

        let ifidLine = try XCTUnwrap(lines.firstIndex { $0.contains("ifid:") })
        let statesLine = try XCTUnwrap(lines.firstIndex { $0.contains("states:") })
        let firstUseLine = try XCTUnwrap(lines.firstIndex { $0.hasPrefix("  use ") })

        XCTAssertEqual(lines[ifidLine], "  ifid: TEST-IFID",
                       "the line carries the neighbouring fields' indent")
        XCTAssertGreaterThan(ifidLine, statesLine, "after the last simple field")
        XCTAssertLessThan(ifidLine, firstUseLine,
                          "and BEFORE `use` — a line inside a nested block is not a header field")
    }

    func testInsertionLeavesTheRestOfTheSourceByteIdentical() throws {
        let insertion = try XCTUnwrap(StoryHeaderIFID.insertion(of: "TEST-IFID", into: fernhill))
        let result = applying(insertion, to: fernhill)

        XCTAssertEqual(result.replacingOccurrences(of: "  ifid: TEST-IFID\n", with: ""), fernhill,
                       "the fix adds one line and touches nothing else")
    }

    func testAHeaderWithNoFieldsTakesTheLineDirectlyAfterTheStoryKeyword() throws {
        let source = "story\n\ncreate the Landing\n  a room\n"
        let insertion = try XCTUnwrap(StoryHeaderIFID.insertion(of: "TEST-IFID", into: source))

        XCTAssertEqual(applying(insertion, to: source),
                       "story\n  ifid: TEST-IFID\n\ncreate the Landing\n  a room\n")
    }

    func testTheTemplateHeaderShapeAlsoWorks() throws {
        let source = """
        story
          title: Untitled
          authors: An Author
          id: untitled
          story-version: 0.1.0

        create the Landing
          a room

        """
        let insertion = try XCTUnwrap(StoryHeaderIFID.insertion(of: "TEST-IFID", into: source))
        let lines = applying(insertion, to: source).components(separatedBy: "\n")

        XCTAssertEqual(lines[4], "  ifid: TEST-IFID",
                       "it follows id:, matching the order `sharpee init` writes")
    }

    // MARK: - When it refuses

    func testAHeaderThatAlreadyDeclaresAnIfidIsRefused() {
        let source = """
        story
          title: Already Identified
          ifid: A1B2C3D4-E5F6-7890-ABCD-EF1234567890

        """
        XCTAssertNil(StoryHeaderIFID.insertion(of: "TEST-IFID", into: source),
                     "a second ifid: would be a duplicate field, not a fix")
    }

    func testASourceWithNoStoryBlockIsRefused() {
        let source = "grammar standard\n\n  verb take\n"
        XCTAssertNil(StoryHeaderIFID.insertion(of: "TEST-IFID", into: source),
                     "a grammar file carries no story header to fix")
    }

    func testAnIndentedStoryWordIsNotTheHeaderKeyword() {
        let source = "create the Book\n  a thing\n  the story is long\n"
        XCTAssertNil(StoryHeaderIFID.insertion(of: "TEST-IFID", into: source))
    }

    // MARK: - The minted identifier

    func testMintedIfidsMeetTheTreatyOfBabelShape() {
        let pattern = try! NSRegularExpression(pattern: "^[A-Z0-9-]{8,63}$")
        var seen = Set<String>()
        for _ in 0..<20 {
            let ifid = StoryHeaderIFID.mint()
            let range = NSRange(ifid.startIndex..., in: ifid)
            XCTAssertNotNil(pattern.firstMatch(in: ifid, range: range),
                            "\(ifid) must be uppercase A-Z/0-9/- and 8–63 characters (ADR-074)")
            seen.insert(ifid)
        }
        XCTAssertEqual(seen.count, 20, "each mint must be a distinct identifier")
    }

    // MARK: - Problems row → button → editor buffer (real path)

    func testTheMissingIfidRowRendersAFixButton() throws {
        let view = ProblemsView()
        view.frame = NSRect(x: 0, y: 0, width: 800, height: 200)
        view.setProblems([Self.missingIfidRecord], for: Self.storyURL)

        let table = try XCTUnwrap(findTable(in: view))
        table.layoutSubtreeIfNeeded()
        let rowView = try XCTUnwrap(table.view(atColumn: 0, row: 0, makeIfNecessary: true))

        XCTAssertNotNil(findButton(identifier: "problems.fix.analysis.missing-ifid", in: rowView),
                        "a fixable problem must offer a button, not prose telling the author to run a CLI")
    }

    func testAnUnfixableRowRendersNoButton() throws {
        let record = ComposeDiagnosticRecord(
            severity: .error, code: "analysis.unknown-entity",
            message: "The player starts in the Attic, which is never created.",
            file: Self.storyURL.path, line: 9, span: nil)

        let view = ProblemsView()
        view.frame = NSRect(x: 0, y: 0, width: 800, height: 200)
        view.setProblems([record], for: Self.storyURL)

        let table = try XCTUnwrap(findTable(in: view))
        table.layoutSubtreeIfNeeded()
        let rowView = try XCTUnwrap(table.view(atColumn: 0, row: 0, makeIfNecessary: true))

        XCTAssertNil(findButton(identifier: "problems.fix.analysis.unknown-entity", in: rowView))
        XCTAssertNil(findButton(identifier: "problems.fix.analysis.missing-ifid", in: rowView))
    }

    func testClickingTheButtonReportsTheRowsItem() throws {
        let view = ProblemsView()
        view.frame = NSRect(x: 0, y: 0, width: 800, height: 200)
        view.setProblems([Self.missingIfidRecord], for: Self.storyURL)

        var fixed: ProblemItem?
        view.onFix = { fixed = $0 }

        let table = try XCTUnwrap(findTable(in: view))
        table.layoutSubtreeIfNeeded()
        let rowView = try XCTUnwrap(table.view(atColumn: 0, row: 0, makeIfNecessary: true))
        let button = try XCTUnwrap(findButton(identifier: "problems.fix.analysis.missing-ifid",
                                              in: rowView))
        button.performClick(nil)

        XCTAssertEqual(fixed?.record.code, "analysis.missing-ifid")
        XCTAssertEqual(fixed?.fileURL, Self.storyURL)
    }

    /// End to end against the real window: a real file on disk, a real Problems
    /// row, a real button click — and the IFID ends up in the editor's buffer.
    func testTheFixWritesAnIfidIntoTheOpenStoryBuffer() throws {
        // Opening a document in a real MainWindowController persists a real
        // SessionState. Without this guard the test overwrites the developer's
        // own session with a temp path that is deleted when the test ends —
        // their IDE then launches with no project open.
        let defaults = UserDefaults.standard
        let savedSession = defaults.object(forKey: SessionStateStore.key)
        defer {
            if let savedSession { defaults.set(savedSession, forKey: SessionStateStore.key) }
            else { defaults.removeObject(forKey: SessionStateStore.key) }
        }

        let directory = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("ifid-fix-\(ProcessInfo.processInfo.globallyUniqueString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }

        let storyURL = directory.appendingPathComponent("fernhill.story")
        try fernhill.write(to: storyURL, atomically: true, encoding: .utf8)

        let controller = MainWindowController()
        let window = try XCTUnwrap(controller.window)
        window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
        window.orderFront(nil)
        defer { window.orderOut(nil) }
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.1))

        controller.openDocument(at: storyURL)

        // Reveal the bottom panel first — the same call the app makes on the
        // clean → not-clean edge. It starts collapsed, and a collapsed item's
        // view is not reliably in the hierarchy to be found (or clicked).
        controller.setBuildPanelVisible(true)
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.1))

        // The window's own ProblemsView — the same instance the compose pipeline
        // feeds and whose onFix RootViewController wired. Nothing is substituted.
        let problems = try XCTUnwrap(findProblems(in: window.contentView!),
                                     "the bottom panel must own a ProblemsView")
        problems.setProblems([
            ComposeDiagnosticRecord(
                severity: .warning, code: "analysis.missing-ifid",
                message: "The story has no `ifid:`.",
                file: storyURL.path, line: 3,
                span: DiagnosticSpan(line: 3, column: 1, endLine: 3, endColumn: 6)),
        ], for: storyURL)
        problems.layoutSubtreeIfNeeded()
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.1))

        let table = try XCTUnwrap(findTable(in: problems))
        table.layoutSubtreeIfNeeded()
        let rowView = try XCTUnwrap(table.view(atColumn: 0, row: 0, makeIfNecessary: true))
        let button = try XCTUnwrap(findButton(identifier: "problems.fix.analysis.missing-ifid",
                                              in: rowView),
                                   "the Problems row must carry the fix button in the real window")
        button.performClick(nil)
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.2))

        let buffer = try XCTUnwrap(controller.currentText(at: storyURL),
                                   "the story must be open in the editor after the fix")
        let ifidLine = try XCTUnwrap(buffer.components(separatedBy: "\n")
                                        .first { $0.contains("ifid:") },
                                     "the fix must write an ifid: line into the buffer")
        let value = ifidLine.replacingOccurrences(of: "  ifid: ", with: "")
        XCTAssertNotNil(try! NSRegularExpression(pattern: "^[A-Z0-9-]{8,63}$")
                            .firstMatch(in: value, range: NSRange(value.startIndex..., in: value)),
                        "the written value must be a Treaty of Babel IFID, got “\(value)”")
        XCTAssertTrue(controller.hasUnsavedChanges(at: storyURL),
                      "the edit lands in the buffer as a normal, undoable edit — not a silent disk write")
    }

    // MARK: - Fixtures / view lookup

    private static let storyURL = URL(fileURLWithPath: "/s/fernhill.story")

    private static var missingIfidRecord: ComposeDiagnosticRecord {
        ComposeDiagnosticRecord(
            severity: .warning, code: "analysis.missing-ifid",
            message: "The story has no `ifid:`.",
            file: storyURL.path, line: 5,
            span: DiagnosticSpan(line: 5, column: 1, endLine: 20, endColumn: 9))
    }

    private func findProblems(in view: NSView) -> ProblemsView? {
        if let problems = view as? ProblemsView { return problems }
        for sub in view.subviews {
            if let found = findProblems(in: sub) { return found }
        }
        return nil
    }

    private func findTable(in view: NSView) -> NSTableView? {
        if let table = view as? NSTableView, table.numberOfRows > 0,
           table.tableColumns.first?.identifier.rawValue == "problem" {
            return table
        }
        for sub in view.subviews {
            if let found = findTable(in: sub) { return found }
        }
        return nil
    }

    private func findButton(identifier: String, in view: NSView) -> NSButton? {
        if let button = view as? NSButton, button.accessibilityIdentifier() == identifier {
            return button
        }
        for sub in view.subviews {
            if let found = findButton(identifier: identifier, in: sub) { return found }
        }
        return nil
    }
}
