// CreateStorySheetTests.swift
// Covers the Create Story sheet (go-live item 6): the location field follows the
// title until the author edits it, and then never again. Text is typed through
// the real field editor rather than assigned, because assigning `stringValue`
// does not go through the delegate — and that difference IS the mirroring rule.
//
// The create half is a REAL-PATH TEST (rule 13a): it drives
// AppDelegate.createStory — the function both entry points call — against the
// real in-repo devkit template, and reads the resulting files off real disk.
// No UserDefaults are touched: the sheet has no persistence, and `loadProject`
// (which pushes through RecentProjectsStore into the developer's real Open
// Recent menu) is deliberately not called, matching StoryHomeTests' documented gap.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class CreateStorySheetTests: XCTestCase {

    private var tmp: URL!
    private var root: URL!
    private var window: NSWindow!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-CreateStoryTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        root = tmp.appendingPathComponent("Documents", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        window?.orderOut(nil)
        window = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    /// The real in-repo devkit template, so these drive the production template
    /// path rather than a hand-written stand-in.
    private var realTemplates: URL {
        TestToolchain.repoRoot.appendingPathComponent("packages/devkit/templates/story-chord")
    }

    // MARK: - Harness

    /// Puts the real sheet in a real key window, which is what gives its text
    /// fields a field editor to type into.
    private func presentSheet() throws -> CreateStoryViewController {
        let sheet = CreateStoryViewController(root: root)
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 520, height: 260),
                              styleMask: [.titled], backing: .buffered, defer: false)
        window.contentViewController = sheet
        window.makeKeyAndOrderFront(nil)
        self.window = window
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))
        return sheet
    }

    private func field(_ identifier: String, in view: NSView) -> NSTextField? {
        if let field = view as? NSTextField, field.accessibilityIdentifier() == identifier {
            return field
        }
        for sub in view.subviews {
            if let found = field(identifier, in: sub) { return found }
        }
        return nil
    }

    private func button(_ identifier: String, in view: NSView) -> NSButton? {
        if let button = view as? NSButton, button.accessibilityIdentifier() == identifier {
            return button
        }
        for sub in view.subviews {
            if let found = button(identifier, in: sub) { return found }
        }
        return nil
    }

    /// Types into a field the way the author does — through the field editor, so
    /// the delegate fires. Assigning `stringValue` would silently skip it.
    ///
    /// Focus is taken only when the field does not already have it, and the
    /// insertion point is placed explicitly: AppKit selects the whole field when
    /// it becomes first responder, so re-focusing between keystrokes would make
    /// each one REPLACE the last rather than extend it.
    private func type(_ text: String, into field: NSTextField,
                      replacingAll: Bool = false) throws {
        if field.currentEditor() == nil { window.makeFirstResponder(field) }
        let editor = try XCTUnwrap(field.currentEditor(),
                                   "the field must have a field editor — is the window key?")
        let length = (editor.string as NSString).length
        editor.selectedRange = replacingAll
            ? NSRange(location: 0, length: length)
            : NSRange(location: length, length: 0)
        editor.insertText(text)
    }

    // MARK: - Mirroring, through the real fields

    func testTypingATitleMirrorsItIntoTheLocation() throws {
        let sheet = try presentSheet()
        let titleField = try XCTUnwrap(field(CreateStoryViewController.titleFieldIdentifier, in: sheet.view))
        let locationField = try XCTUnwrap(field(CreateStoryViewController.locationFieldIdentifier, in: sheet.view))

        try type("The Folly at Fernhill", into: titleField)

        XCTAssertEqual(locationField.stringValue,
                       (root.appendingPathComponent("The Folly at Fernhill").path as NSString)
                           .abbreviatingWithTildeInPath,
                       "the location must show the author's own title, not a slug")
        XCTAssertTrue(sheet.isMirroringLocation)
    }

    func testEditingTheLocationStopsMirroringForGood() throws {
        let sheet = try presentSheet()
        let titleField = try XCTUnwrap(field(CreateStoryViewController.titleFieldIdentifier, in: sheet.view))
        let locationField = try XCTUnwrap(field(CreateStoryViewController.locationFieldIdentifier, in: sheet.view))

        try type("The Folly", into: titleField)
        try type("/Volumes/Work/Stories", into: locationField, replacingAll: true)
        let chosen = locationField.stringValue
        XCTAssertEqual(chosen, "/Volumes/Work/Stories")

        XCTAssertFalse(sheet.isMirroringLocation, "the author has taken the field over")

        try type(" at Fernhill", into: titleField)

        XCTAssertEqual(locationField.stringValue, chosen,
                       "a location the author typed must survive every later title edit")
    }

    func testTheMirroringWriteDoesNotItselfCancelMirroring() throws {
        // The trap this rule is famous for: the programmatic write into the
        // location field looking like an author edit, so mirroring dies on the
        // first keystroke.
        let sheet = try presentSheet()
        let titleField = try XCTUnwrap(field(CreateStoryViewController.titleFieldIdentifier, in: sheet.view))
        let locationField = try XCTUnwrap(field(CreateStoryViewController.locationFieldIdentifier, in: sheet.view))

        try type("A", into: titleField)
        try type("c", into: titleField)
        try type("t", into: titleField)

        XCTAssertTrue(sheet.isMirroringLocation, "three keystrokes, still mirroring")
        XCTAssertTrue(locationField.stringValue.hasSuffix("/Act"),
                      "got \(locationField.stringValue)")
    }

    // MARK: - What the sheet reports

    func testCreateIsRefusedUntilThereIsATitle() throws {
        let sheet = try presentSheet()
        let create = try XCTUnwrap(button(CreateStoryViewController.createIdentifier, in: sheet.view))
        let titleField = try XCTUnwrap(field(CreateStoryViewController.titleFieldIdentifier, in: sheet.view))
        let locationField = try XCTUnwrap(field(CreateStoryViewController.locationFieldIdentifier, in: sheet.view))

        XCTAssertFalse(create.isEnabled, "an untitled story has nothing to name its folder")
        XCTAssertEqual(locationField.stringValue,
                       (root.path as NSString).abbreviatingWithTildeInPath,
                       "an unnamed story must not be offered a folder it never asked for")

        // And typing a title, then wiping it out, goes back to the bare root
        // rather than leaving the fallback name sitting there.
        try type("A", into: titleField)
        try type(" ", into: titleField, replacingAll: true)
        XCTAssertEqual(locationField.stringValue,
                       (root.path as NSString).abbreviatingWithTildeInPath)
        XCTAssertFalse(create.isEnabled)

        var request: CreateStoryViewController.Request??
        sheet.onFinish = { request = $0 }
        create.performClick(nil)
        XCTAssertNil(request, "a disabled Create must report nothing at all")

        try type("The Folly", into: titleField)
        XCTAssertTrue(create.isEnabled)
    }

    func testCreateReportsTheTitleAsTypedAndTheLocationShown() throws {
        let sheet = try presentSheet()
        let titleField = try XCTUnwrap(field(CreateStoryViewController.titleFieldIdentifier, in: sheet.view))

        var request: CreateStoryViewController.Request?
        sheet.onFinish = { request = $0 }

        try type("The Folly at Fernhill", into: titleField)
        try XCTUnwrap(button(CreateStoryViewController.createIdentifier, in: sheet.view)).performClick(nil)

        XCTAssertEqual(request?.title, "The Folly at Fernhill",
                       "the title goes into the story source unsanitised — only the FOLDER is cleaned")
        XCTAssertEqual(request?.directory.standardizedFileURL,
                       root.appendingPathComponent("The Folly at Fernhill", isDirectory: true)
                           .standardizedFileURL)
    }

    func testCancelReportsNothingAndWritesNothing() throws {
        let sheet = try presentSheet()
        let titleField = try XCTUnwrap(field(CreateStoryViewController.titleFieldIdentifier, in: sheet.view))
        try type("The Folly", into: titleField)

        var finished = false
        var request: CreateStoryViewController.Request?
        sheet.onFinish = { finished = true; request = $0 }

        try XCTUnwrap(button(CreateStoryViewController.cancelIdentifier, in: sheet.view)).performClick(nil)

        XCTAssertTrue(finished, "the sheet must report the cancel so the launcher comes back")
        XCTAssertNil(request)
        XCTAssertEqual(try FileManager.default.contentsOfDirectory(atPath: root.path), [],
                       "a cancelled sheet must not have touched the disk")
    }

    // MARK: - REAL-PATH TEST (rule 13a): the create the sheet asks for

    func testCreatingWritesTheStoryAtTheChosenLocation() throws {
        let directory = root.appendingPathComponent("The Folly at Fernhill", isDirectory: true)
        let request = CreateStoryViewController.Request(title: "The Folly at Fernhill",
                                                        directory: directory)

        let created = try AppDelegate().createStory(request, templateDirectory: realTemplates)

        XCTAssertEqual(created.standardizedFileURL, directory.standardizedFileURL)
        let story = directory.appendingPathComponent("the-folly-at-fernhill.story")
        XCTAssertTrue(FileManager.default.fileExists(atPath: story.path),
                      "the story file keeps the kebab id inside a folder named for the title")
        let contents = try String(contentsOf: story, encoding: .utf8)
        XCTAssertTrue(contents.contains("The Folly at Fernhill"),
                      "the title must reach the source: \(contents)")
        XCTAssertTrue(contents.contains("id: the-folly-at-fernhill"), contents)
        XCTAssertTrue(FileManager.default.fileExists(
            atPath: directory.appendingPathComponent(".gitignore").path),
            "a story folder is a source-control folder")
    }

    func testAnIntermediateFolderTheAuthorNamedIsCreated() throws {
        // The author may type a location whose parent does not exist yet.
        let directory = root.appendingPathComponent("Work/2026/Fernhill", isDirectory: true)
        let request = CreateStoryViewController.Request(title: "Fernhill", directory: directory)

        try AppDelegate().createStory(request, templateDirectory: realTemplates)

        XCTAssertTrue(FileManager.default.fileExists(
            atPath: directory.appendingPathComponent("fernhill.story").path))
    }

    // MARK: - REJECTS WHEN: the folder is occupied

    func testAnOccupiedFolderIsRefusedByFullPathAndLeftUntouched() throws {
        let directory = root.appendingPathComponent("The Folly at Fernhill", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let existing = directory.appendingPathComponent("someone-elses.story")
        try "story \"Someone Else's Work\"".write(to: existing, atomically: true, encoding: .utf8)
        let before = try Data(contentsOf: existing)

        let request = CreateStoryViewController.Request(title: "The Folly at Fernhill",
                                                        directory: directory)

        XCTAssertThrowsError(try AppDelegate().createStory(request, templateDirectory: realTemplates)) { error in
            guard case StoryHome.HomeError.projectAlreadyExists(let url) = error else {
                return XCTFail("expected projectAlreadyExists, got \(error)")
            }
            XCTAssertEqual(url.standardizedFileURL, directory.standardizedFileURL)
            XCTAssertTrue(error.localizedDescription.contains(directory.path),
                          "the refusal must name the full path: \(error.localizedDescription)")
        }

        XCTAssertEqual(try Data(contentsOf: existing), before,
                       "the refused create must leave the existing story byte-for-byte unchanged")
        XCTAssertEqual(try FileManager.default.contentsOfDirectory(atPath: directory.path),
                       ["someone-elses.story"],
                       "the refused create must add nothing — no .gitignore, no second story")
    }

    func testAStrayFinderFileIsNotACollision() throws {
        let directory = root.appendingPathComponent("The Folly", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try "".write(to: directory.appendingPathComponent(".DS_Store"),
                     atomically: true, encoding: .utf8)

        let request = CreateStoryViewController.Request(title: "The Folly", directory: directory)
        try AppDelegate().createStory(request, templateDirectory: realTemplates)

        XCTAssertTrue(FileManager.default.fileExists(
            atPath: directory.appendingPathComponent("the-folly.story").path),
            "a stray .DS_Store must not block a new story")
    }
}
