// AppDelegate.swift
// Application delegate for Sharpee.
// Public interface: AppDelegate owns the main window controller for the app's lifetime
// and dispatches application-scoped menu actions (e.g. Open Project).
// Entry point is main.swift, which instantiates this class and assigns it as NSApp.delegate.
// Owner context: tools/ide — App shell.

import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {

    private var mainWindowController: MainWindowController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.mainMenu = MenuBuilder.makeMainMenu(target: self)

        let controller = MainWindowController()
        mainWindowController = controller
        controller.showWindow(nil)
        controller.window?.makeKeyAndOrderFront(nil)

        NSApp.activate(ignoringOtherApps: true)

        restoreSession(into: controller)
    }

    /// Reads the persisted session and replays it: project, open tabs, active tab.
    /// Silently skips a project whose folder no longer exists, and individual files that
    /// no longer exist. If the saved active index is out of range after skips, falls back
    /// to the last surviving tab.
    private func restoreSession(into controller: MainWindowController) {
        guard let state = SessionStateStore.load() else { return }

        let fm = FileManager.default

        guard let projectURL = state.projectURL,
              fm.fileExists(atPath: projectURL.path) else {
            return
        }

        let project = Project(rootURL: projectURL)
        controller.loadProject(project, expandedFolderURLs: state.expandedFolderURLs)
        controller.window?.title = "Sharpee — \(project.name)"

        var survivingURLs: [URL] = []
        for url in state.openDocumentURLs where fm.fileExists(atPath: url.path) {
            controller.openDocument(at: url)
            survivingURLs.append(url)
        }

        if let saved = state.activeIndex, !survivingURLs.isEmpty {
            let target = min(saved, survivingURLs.count - 1)
            controller.switchToDocument(at: target)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    // MARK: - File menu actions

    /// File → Open Project… (⌘O). Step 1.1: pick a folder and reflect the selection in the window title.
    /// Project loading lands in step 1.2.
    @objc func openProject(_ sender: Any?) {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.title = "Open Sharpee Project"
        panel.prompt = "Open"
        panel.message = "Choose a folder containing a Sharpee story."

        if let window = mainWindowController?.window {
            panel.beginSheetModal(for: window) { [weak self] response in
                self?.handleProjectSelection(response: response, url: panel.url)
            }
        } else {
            panel.begin { [weak self] response in
                self?.handleProjectSelection(response: response, url: panel.url)
            }
        }
    }

    private func handleProjectSelection(response: NSApplication.ModalResponse, url: URL?) {
        guard response == .OK, let url = url else { return }
        let project = Project(rootURL: url)
        mainWindowController?.loadProject(project)
        mainWindowController?.window?.title = "Sharpee — \(project.name)"
    }

    /// File → Save (⌘S). Forwards to the active editor; no-op when no document is open.
    @objc func saveDocument(_ sender: Any?) {
        mainWindowController?.saveActiveDocument()
    }
}
