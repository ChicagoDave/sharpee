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
}
