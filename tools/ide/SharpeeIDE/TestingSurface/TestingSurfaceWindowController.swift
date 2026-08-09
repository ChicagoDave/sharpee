// TestingSurfaceWindowController.swift
// Hosts the testing play surface in its own window (ADR-306 Phase 3): the
// surface is a dedicated page with its own three-column layout, so it gets a
// real window beside the IDE rather than borrowing the editor's panes — the
// ADR-304 workspace it supersedes keeps working untouched until the Phase 6
// retirements. One window per project session; reopening restores by replay
// (D8) because the view controller reloads on every show.
// Public interface: TestingSurfaceWindowController(storyTitle:sessionStore:
// resourcesURL:), load(bundleDirectory:), surface.
// Owner context: tools/ide — TestingSurface.

import AppKit

final class TestingSurfaceWindowController: NSWindowController {

    let surface: TestingSurfaceViewController

    init(storyTitle: String,
         sessionStore: TestingSessionStore,
         resourcesURL: URL? = Bundle.main.resourceURL) {
        surface = TestingSurfaceViewController(sessionStore: sessionStore,
                                               resourcesURL: resourcesURL)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 840),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false)
        window.title = "Testing — \(storyTitle)"
        window.minSize = NSSize(width: 900, height: 500)
        window.contentViewController = surface
        window.setFrameAutosaveName("TestingSurfaceWindow")
        window.center()
        super.init(window: window)
    }

    required init?(coder: NSCoder) {
        fatalError("TestingSurfaceWindowController is not Storyboard-instantiable")
    }

    /// Loads (or reloads) the story bundle's testing page into the surface.
    func load(bundleDirectory: URL?) {
        surface.load(bundleDirectory: bundleDirectory)
    }
}
