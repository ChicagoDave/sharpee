// ShippedThemesRealPathTests.swift
// Phase 6c's exit criterion as a rule-13a real-path test: toggling the corral
// changes the `.story` header, and a REAL `sharpee build` (the monorepo devkit
// CLI, no stub) ships exactly the toggled theme set in `dist/web/themes/`.
// The fixture is a temp copy of tools/ide/test-fixtures/fernhill-frozen, which
// deliberately carries no `themes:` line.
// Also pins the corral's menu construction: Build → Shipped Themes lists the
// vendored built-ins (and never Classic), each item carrying its theme id.
// Owner context: tools/ide — Tests.

import AppKit
import XCTest
@testable import SharpeeIDE

@MainActor
final class ShippedThemesRealPathTests: XCTestCase {

    private var scratch: URL!
    private var storyFile: URL!

    override func setUpWithError() throws {
        try super.setUpWithError()
        let frozen = TestToolchain.repoRoot
            .appendingPathComponent("tools/ide/test-fixtures/fernhill-frozen")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: frozen.path),
                          "tools/ide/test-fixtures/fernhill-frozen is not present")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "packages/devkit/dist/cli.js is not built")
        scratch = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-ShippedThemesRealPathTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.copyItem(at: frozen, to: scratch)
        storyFile = scratch.appendingPathComponent("fernhill.story")
    }

    override func tearDownWithError() throws {
        if let scratch, FileManager.default.fileExists(atPath: scratch.path) {
            try FileManager.default.removeItem(at: scratch)
        }
        scratch = nil
        try super.tearDownWithError()
    }

    /// Runs the real devkit `build` on the scratch story. Fails the test with
    /// the CLI's stderr when the build does not exit 0.
    private func build() throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node", TestToolchain.devkitCLI.path, "build", storyFile.path]
        process.currentDirectoryURL = scratch
        // `@sharpee/platform-browser` is not in devkit's own dependency
        // closure (the vendored toolchain grafts it in; in-repo builds find it
        // by walking up to the workspace's node_modules). The scratch story
        // lives in tmp, outside that walk, so point Node at the workspace the
        // same way the sealed shim's NODE_PATH does.
        var environment = ShellEnvironment.buildEnvironment()
        environment["NODE_PATH"] = TestToolchain.repoRoot
            .appendingPathComponent("node_modules").path
        process.environment = environment
        let output = Pipe()
        let errors = Pipe()
        process.standardOutput = output
        process.standardError = errors
        try process.run()
        let outputData = output.fileHandleForReading.readDataToEndOfFile()
        let errorData = errors.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            // The CLI reports its failures on stdout — include both streams.
            XCTFail("sharpee build exited \(process.terminationStatus):\n" +
                    (String(data: outputData, encoding: .utf8) ?? "") +
                    (String(data: errorData, encoding: .utf8) ?? ""))
            return
        }
    }

    // MARK: - Toggle → header → real build → dist/web/themes matches

    func testToggledThemesReachTheHeaderAndARealBuildShipsExactlyThatSet() throws {
        // The frozen fixture ships nothing; the corral turns on two built-ins.
        let source = try String(contentsOf: storyFile, encoding: .utf8)
        XCTAssertEqual(StoryHeaderThemes.read(from: source), [],
                       "the fixture must start with no themes: line for this test to mean anything")

        let edit = try XCTUnwrap(StoryHeaderThemes.edit(setting: ["paper", "system-6"], in: source))
        try StoryHeaderThemes.apply(edit, to: source).write(to: storyFile, atomically: true, encoding: .utf8)
        let toggledOn = try String(contentsOf: storyFile, encoding: .utf8)
        XCTAssertEqual(StoryHeaderThemes.read(from: toggledOn),
                       ["paper", "system-6"], "the header reads back what was toggled on")

        try build()

        let themesDir = scratch.appendingPathComponent("dist/web/fernhill/themes")
        let shipped = (try? FileManager.default.contentsOfDirectory(atPath: themesDir.path)) ?? []
        XCTAssertTrue(shipped.contains("paper.css"), "a toggled-on theme ships; got \(shipped)")
        XCTAssertTrue(shipped.contains("system-6.css"), "both toggled themes ship; got \(shipped)")
        XCTAssertTrue(shipped.contains("system-6"),
                      "a theme's asset directory (fonts) travels with it; got \(shipped)")
        XCTAssertFalse(shipped.contains("modern-dark.css"),
                       "a theme the corral left off must NOT ship")
        XCTAssertFalse(shipped.contains("retro-terminal.css"),
                       "a theme the corral left off must NOT ship")

        // Toggling one back off edits the same line in place.
        let grown = try String(contentsOf: storyFile, encoding: .utf8)
        let removal = try XCTUnwrap(StoryHeaderThemes.edit(setting: ["system-6"], in: grown))
        try StoryHeaderThemes.apply(removal, to: grown).write(to: storyFile, atomically: true, encoding: .utf8)
        let toggledOff = try String(contentsOf: storyFile, encoding: .utf8)
        XCTAssertEqual(StoryHeaderThemes.read(from: toggledOff),
                       ["system-6"], "toggling off leaves the remaining theme in place")
    }

    // MARK: - The menu toggle path edits the editor buffer, not the disk

    private func pump(_ seconds: TimeInterval = 0.1) {
        RunLoop.current.run(until: Date(timeIntervalSinceNow: seconds))
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

    /// The whole corral path below the menu item: window → RootViewController
    /// → StoryHeaderThemes → the editor's real NSTextView. The mutation
    /// asserted is the open BUFFER (undoable, tab dirty) — disk stays
    /// untouched until the author saves, which is the seam's contract.
    func testTheMenuTogglePathEditsTheOpenBufferAndLeavesTheTabDirty() throws {
        try withCleanDefaults {
            let controller = MainWindowController()
            let window = try XCTUnwrap(controller.window)
            window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
            window.orderFront(nil)
            defer { window.orderOut(nil) }
            pump()

            controller.loadProject(Project(rootURL: scratch))
            // What AppDelegate does on project open: point the compose pipeline
            // at the story. The corral's guard needs the story's identity, which
            // registers when the compose OUTCOME arrives — success or failure
            // both carry it, so the real pipeline resolving no toolchain is
            // still enough. Poll for it.
            controller.composeStory(at: storyFile)
            var waited: TimeInterval = 0
            while controller.composedStory == nil && waited < 15 {
                pump(0.1)
                waited += 0.1
            }
            XCTAssertNotNil(controller.composedStory,
                            "no compose outcome arrived — the corral's guard would refuse every toggle")

            controller.toggleShippedTheme("paper")
            pump()

            XCTAssertEqual(controller.shippedThemeIds(), ["paper"],
                           "the corral reads the toggled state back from the editor buffer")
            let buffer = try XCTUnwrap(controller.currentText(at: storyFile),
                                       "the toggle opened the story and edited its buffer")
            XCTAssertTrue(buffer.contains("themes: paper"),
                          "the themes: line landed in the buffer")
            XCTAssertTrue(controller.hasUnsavedChanges(at: storyFile),
                          "the edit is a buffer edit — the author decides when to save")
            let onDisk = try String(contentsOf: storyFile, encoding: .utf8)
            XCTAssertFalse(onDisk.contains("themes: paper"),
                           "nothing lands on disk until the author saves")

            // Add a second theme, then the first back off — in-place list edits.
            controller.toggleShippedTheme("system-6")
            controller.toggleShippedTheme("paper")
            pump()
            XCTAssertEqual(controller.shippedThemeIds(), ["system-6"],
                           "toggling off removes just that id, in place")
        }
    }

    // MARK: - The corral in the menu bar

    func testTheBuildMenuCarriesTheCorralOverTheVendoredBuiltIns() throws {
        let mainMenu = MenuBuilder.makeMainMenu(target: self)
        let buildMenu = try XCTUnwrap(
            mainMenu.items.first { $0.submenu?.title == "Build" }?.submenu)
        let corral = try XCTUnwrap(
            buildMenu.items.first { $0.submenu?.title == "Shipped Themes" }?.submenu,
            "Build carries the Shipped Themes corral")

        let ids = corral.items.compactMap { $0.representedObject as? String }
        XCTAssertEqual(ids.sorted(), ["modern-dark", "paper", "retro-terminal", "system-6"],
                       "the corral offers every vendored built-in — run tools/ide/vendor-play-themes.sh if this fails")
        XCTAssertFalse(ids.contains("classic"),
                       "Classic is the baseline, always shipped, never a toggle")
        XCTAssertTrue(corral.items.allSatisfy {
            $0.action == #selector(AppDelegate.toggleShippedTheme(_:))
        }, "every corral item routes through the toggle action")
    }
}
