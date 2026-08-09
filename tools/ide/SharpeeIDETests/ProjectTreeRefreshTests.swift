// ProjectTreeRefreshTests.swift
// ADR-290 D7's sidebar observer, proven end to end: a transcript created
// through the Testing tab's own seam lands on disk AND appears in the Project
// pane without the project being reopened — with the author's expansion
// surviving the rebuild. Drives the real MainWindowController and the real
// TestController against a real fixture directory; nothing this repo owns is
// stubbed.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class ProjectTreeRefreshTests: XCTestCase {

    private var root: URL!

    override func setUpWithError() throws {
        try super.setUpWithError()
        let fixture = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-ProjectTreeRefreshTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try Self.write("the-lost-key.story", "story \"The Lost Key\"", under: fixture)
        try Self.write("tests/transcripts/first.transcript",
                       "title: First\nstory: the-lost-key\n\n---\n\n> look\n[SKIP]\n",
                       under: fixture)
        root = fixture
    }

    override func tearDownWithError() throws {
        if let root, FileManager.default.fileExists(atPath: root.path) {
            try FileManager.default.removeItem(at: root)
        }
        root = nil
        try super.tearDownWithError()
    }

    private nonisolated static func write(_ relativePath: String, _ contents: String,
                                          under root: URL) throws {
        let url = root.appendingPathComponent(relativePath)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try contents.write(to: url, atomically: true, encoding: .utf8)
    }

    private func pump(_ seconds: TimeInterval = 0.1) {
        RunLoop.current.run(until: Date(timeIntervalSinceNow: seconds))
    }

    /// Every outline view under `view` — the window holds more than one tree,
    /// so the caller picks the one whose rows it recognises.
    private func findOutlines(in view: NSView) -> [NSOutlineView] {
        var found: [NSOutlineView] = []
        if let outline = view as? NSOutlineView { found.append(outline) }
        for sub in view.subviews { found.append(contentsOf: findOutlines(in: sub)) }
        return found
    }

    private func labels(of outline: NSOutlineView) -> [String] {
        (0..<outline.numberOfRows).compactMap { row in
            (outline.view(atColumn: 0, row: row, makeIfNecessary: true) as? NSTableCellView)?
                .textField?.stringValue
        }
    }

    /// The Project pane's outline: the one that renders the artifact groups.
    private func projectOutline(in window: NSWindow) throws -> NSOutlineView {
        try XCTUnwrap(
            findOutlines(in: window.contentView!).first { labels(of: $0).contains("Transcript Tests") },
            "no outline in the window renders the Project pane's groups")
    }

    /// Runs `body` with recents and the persisted session cleared, restoring
    /// both afterward — loadProject writes real entries into each.
    private func withCleanDefaults(_ body: () throws -> Void) rethrows {
        let defaults = UserDefaults.standard
        let keys = [RecentProjectsStore.key, SessionStateStore.key]
        let saved = keys.map { defaults.object(forKey: $0) }
        defer {
            for (key, value) in zip(keys, saved) {
                if let value { defaults.set(value, forKey: key) }
                else { defaults.removeObject(forKey: key) }
            }
        }
        keys.forEach { defaults.removeObject(forKey: $0) }
        try body()
    }

    /// The whole chain, through the seam the page really uses: the tab's
    /// create closure → TranscriptSourceProvider writes the file →
    /// TestController rediscovers → the window rebuilds the pane. The sidebar
    /// shows the new transcript without the project being reopened, and the
    /// group the author had expanded is still expanded.
    func testATranscriptCreatedThroughTheTabAppearsInTheSidebarWithExpansionKept() throws {
        try withCleanDefaults {
            let controller = MainWindowController()
            let window = try XCTUnwrap(controller.window)
            window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
            window.orderFront(nil)
            defer { window.orderOut(nil) }
            pump()

            controller.loadProject(Project(rootURL: root))
            pump()
            let tests = TestController(window: controller)
            tests.attach(storyFile: root.appendingPathComponent("the-lost-key.story"))
            pump()

            // The author expands Transcript Tests — the state a refresh must keep.
            let outline = try projectOutline(in: window)
            let groupRow = try XCTUnwrap(labels(of: outline).firstIndex(of: "Transcript Tests"))
            outline.expandItem(try XCTUnwrap(outline.item(atRow: groupRow)))
            pump()
            XCTAssertTrue(labels(of: outline).contains("first.transcript"))
            XCTAssertFalse(labels(of: outline).contains("the-probe.transcript"))

            // Create through the tab's own seam — what the page's Branch does.
            controller.testingTab.onCreateTranscript?(
                "The probe", "title: The probe\nstory: the-lost-key\n\n---\n")
            pump()

            let created = root.appendingPathComponent("tests/transcripts/the-probe.transcript")
            XCTAssertTrue(FileManager.default.fileExists(atPath: created.path),
                          "the create must land on disk before anything shows it")

            // The pane was rebuilt (possibly a fresh outline view) — find it
            // again rather than trusting the old reference.
            let refreshed = try projectOutline(in: window)
            let shown = labels(of: refreshed)
            XCTAssertTrue(shown.contains("the-probe.transcript"),
                          "the sidebar shows the new transcript without the project being reopened")
            XCTAssertTrue(shown.contains("first.transcript"),
                          "members are visible only inside an expanded group — the expansion survived")
        }
    }
}
