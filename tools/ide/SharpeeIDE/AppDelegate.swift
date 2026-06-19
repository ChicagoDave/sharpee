// AppDelegate.swift
// Application delegate for Sharpee.
// Public interface: AppDelegate owns the main window controller for the app's lifetime
// and dispatches application-scoped menu actions (e.g. Open Project).
// Entry point is main.swift, which instantiates this class and assigns it as NSApp.delegate.
// Owner context: tools/ide — App shell.

import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate, NSMenuItemValidation {

    private var mainWindowController: MainWindowController?
    private var buildController: BuildController?

    /// Monorepo root for the currently loaded project — the closest ancestor carrying the
    /// Sharpee signature (`pnpm-workspace.yaml` + `packages/core/`), home of the `./sharpee` CLI.
    /// Nil when no project is loaded, or when no ancestor carries the signature.
    /// Drives Build menu enablement via `validateUserInterfaceItem(_:)`.
    private var currentRepoRoot: URL?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        // The IDE paints a dark palette; tell AppKit so system-drawn controls (outline
        // disclosure triangles, default text, scrollers) render dark-appropriately.
        // (Light-mode support is a separate theming refactor — see below.)
        NSApp.appearance = NSAppearance(named: .darkAqua)
        NSApp.mainMenu = MenuBuilder.makeMainMenu(target: self)

        let controller = MainWindowController()
        mainWindowController = controller
        buildController = BuildController(window: controller)
        controller.onBuildPillCancel = { [weak self] in self?.buildController?.cancel() }
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

        loadProject(at: projectURL, expandedFolderURLs: state.expandedFolderURLs)
        controller.setBuildPanelVisible(state.buildPanelVisible)
        controller.setPlayAfterBuild(state.playAfterBuild)

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
        loadProject(at: url)
    }

    /// File → Save (⌘S). Forwards to the active editor; no-op when no document is open.
    @objc func saveDocument(_ sender: Any?) {
        mainWindowController?.saveActiveDocument()
    }

    // MARK: - Recent Projects

    /// Opens the project rooted at `url` and sets the window title. Centralized so that
    /// the Open Project panel, restore-session, and Open Recent all share the same path.
    /// `expandedFolderURLs` is honoured by restore-session; the menu paths leave it empty.
    private func loadProject(at url: URL, expandedFolderURLs: [URL] = []) {
        let project = Project(rootURL: url)
        mainWindowController?.loadProject(project, expandedFolderURLs: expandedFolderURLs)
        mainWindowController?.window?.title = "Sharpee — \(project.name)"
        currentRepoRoot = WorkspaceRoot.find(from: url)

        // Show the built story in the Play pane (placeholder if none built).
        let story = currentRepoRoot.map { BuildSettingsStore.load(for: $0).story } ?? nil
        mainWindowController?.refreshPlay(repoRoot: currentRepoRoot, story: story)
    }

    /// File → Open Recent → <project>. Loads the chosen folder. If the folder is no longer
    /// on disk (race between menu rebuild and click), shows an alert and removes the entry.
    @objc func openRecentProject(_ sender: NSMenuItem) {
        guard let url = sender.representedObject as? URL else { return }

        var isDir: ObjCBool = false
        let exists = FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir)
        if !exists || !isDir.boolValue {
            RecentProjectsStore.remove(url)
            presentMissingProjectAlert(url: url)
            return
        }

        loadProject(at: url)
    }

    /// File → Open Recent → Clear Menu.
    @objc func clearRecentProjects(_ sender: Any?) {
        RecentProjectsStore.clear()
    }

    private func presentMissingProjectAlert(url: URL) {
        let alert = NSAlert()
        alert.messageText = "Project Not Found"
        alert.informativeText = "The folder “\(url.lastPathComponent)” no longer exists at:\n\(url.path)"
        alert.alertStyle = .warning
        alert.addButton(withTitle: "OK")
        if let window = mainWindowController?.window {
            alert.beginSheetModal(for: window, completionHandler: nil)
        } else {
            alert.runModal()
        }
    }

    // MARK: - Build menu actions

    /// Build → Build (⌘B). Runs `./sharpee build` with the project's saved settings,
    /// streaming output into the Build panel. If no story is selected yet, opens Build
    /// Settings instead of building.
    @objc func buildProject(_ sender: Any?) {
        guard let repoRoot = currentRepoRoot else { return }
        let settings = BuildSettingsStore.load(for: repoRoot)
        guard let story = settings.story, !story.isEmpty else {
            presentNoStoryAlert(sender)
            return
        }
        // A Browser build needs a browser entry — offer to scaffold one if it's missing.
        if settings.clients.contains(BuildSettings.browserClient),
           !BrowserEntry.exists(repoRoot: repoRoot, story: story) {
            promptCreateBrowserEntry(repoRoot: repoRoot, story: story, then: settings)
            return
        }
        buildController?.build(settings: settings, repoRoot: repoRoot)
    }

    /// Offers to generate the missing browser entry; on consent, creates it, opens it, and
    /// continues the build.
    private func promptCreateBrowserEntry(repoRoot: URL, story: String, then settings: BuildSettings) {
        let alert = NSAlert()
        alert.messageText = "'\(story)' has no browser entry"
        alert.informativeText = "A browser entry (src/browser-entry.ts) is required to build or play "
            + "'\(story)' in the browser. Create a starter one now?"
        alert.addButton(withTitle: "Create Entry")
        alert.addButton(withTitle: "Cancel")

        let handle: (NSApplication.ModalResponse) -> Void = { [weak self] response in
            guard response == .alertFirstButtonReturn else { return }
            self?.createBrowserEntryThenBuild(repoRoot: repoRoot, story: story, settings: settings)
        }
        if let window = mainWindowController?.window {
            alert.beginSheetModal(for: window, completionHandler: handle)
        } else {
            handle(alert.runModal())
        }
    }

    private func createBrowserEntryThenBuild(repoRoot: URL, story: String, settings: BuildSettings) {
        do {
            let url = try BrowserEntry.create(repoRoot: repoRoot, story: story)
            mainWindowController?.openDocument(at: url) // let the author see/customize it
            buildController?.build(settings: settings, repoRoot: repoRoot)
        } catch {
            let alert = NSAlert(error: error)
            alert.alertStyle = .warning
            alert.runModal()
        }
    }

    /// Alerts that a story must be picked, then opens Build Settings.
    private func presentNoStoryAlert(_ sender: Any?) {
        let alert = NSAlert()
        alert.messageText = "No story selected"
        alert.informativeText = "Choose a story in Build Settings before building."
        alert.addButton(withTitle: "Open Build Settings…")
        alert.addButton(withTitle: "Cancel")
        let runModal: (NSApplication.ModalResponse) -> Void = { [weak self] response in
            if response == .alertFirstButtonReturn { self?.openBuildSettings(sender) }
        }
        if let window = mainWindowController?.window {
            alert.beginSheetModal(for: window, completionHandler: runModal)
        } else {
            runModal(alert.runModal())
        }
    }

    /// Build → Build Settings…. Presents the per-project build options as a sheet.
    /// Enabled only when a workspace root is known (see validateMenuItem).
    @objc func openBuildSettings(_ sender: Any?) {
        guard let repoRoot = currentRepoRoot,
              let presenter = mainWindowController?.window?.contentViewController else { return }
        presenter.presentAsSheet(BuildSettingsViewController(repoRoot: repoRoot))
    }

    /// Build → Cancel Build. Cancels the running build (SIGTERM, then SIGKILL).
    @objc func cancelBuild(_ sender: Any?) {
        buildController?.cancel()
    }

    /// View → Word Wrap. Toggles soft wrap in the editor (persisted).
    @objc func toggleWordWrap(_ sender: Any?) {
        mainWindowController?.setWordWrap(!WordWrapPreference.isEnabled)
    }

    // MARK: - NSUserInterfaceValidations (menu enable/disable)

    /// AppKit calls this when a menu containing one of our actions is about to display.
    /// Build / Build Settings… require a workspace root. Cancel Build is permanently disabled
    /// until step 4.6 wires it to runner state.
    func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
        switch menuItem.action {
        case #selector(buildProject(_:)):
            return currentRepoRoot != nil && !(buildController?.isBuilding ?? false)
        case #selector(openBuildSettings(_:)):
            return currentRepoRoot != nil
        case #selector(cancelBuild(_:)):
            return buildController?.isBuilding ?? false
        case #selector(toggleWordWrap(_:)):
            menuItem.state = WordWrapPreference.isEnabled ? .on : .off
            return true
        default:
            return true
        }
    }

    // MARK: - NSMenuDelegate (Open Recent)

    /// Rebuilds the Open Recent submenu when the user reveals it. Filters out folders
    /// that no longer exist; inserts a disabled placeholder when the list is empty.
    func menuNeedsUpdate(_ menu: NSMenu) {
        guard menu.identifier == MenuBuilder.openRecentMenuIdentifier else { return }

        menu.removeAllItems()

        let stored = RecentProjectsStore.load()
        let fm = FileManager.default
        let surviving = stored.filter { url in
            var isDir: ObjCBool = false
            return fm.fileExists(atPath: url.path, isDirectory: &isDir) && isDir.boolValue
        }

        if surviving.isEmpty {
            let placeholder = NSMenuItem(title: "No Recent Projects",
                                         action: nil,
                                         keyEquivalent: "")
            placeholder.isEnabled = false
            menu.addItem(placeholder)
            menu.addItem(NSMenuItem.separator())

            let clear = NSMenuItem(title: "Clear Menu",
                                   action: #selector(clearRecentProjects(_:)),
                                   keyEquivalent: "")
            clear.target = self
            clear.isEnabled = false
            menu.addItem(clear)
            return
        }

        for url in surviving {
            let item = NSMenuItem(title: url.lastPathComponent,
                                  action: #selector(openRecentProject(_:)),
                                  keyEquivalent: "")
            item.target = self
            item.representedObject = url
            item.toolTip = url.path
            menu.addItem(item)
        }

        menu.addItem(NSMenuItem.separator())

        let clear = NSMenuItem(title: "Clear Menu",
                               action: #selector(clearRecentProjects(_:)),
                               keyEquivalent: "")
        clear.target = self
        menu.addItem(clear)
    }
}
