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

    /// Root folder of the currently loaded project (the folder around the story,
    /// ADR-258 D2). Nil when no project is loaded.
    private var currentRepoRoot: URL?

    /// The `.story` file the open project is organized around (ADR-258 D2) —
    /// the Build target. Nil for a non-Chord folder; Build is disabled then.
    private var currentStoryURL: URL?

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

        // D9: warn (non-blocking) when the installed toolchain speaks a newer
        // Chord than this IDE was written against — clear signal, no mis-highlight.
        ChordVersionCheck.fetch(near: currentStoryURL) { [weak self] installed in
            guard let installed,
                  ChordVersionCheck.isNewer(installed,
                                            thanSupported: ChordVersionCheck.supportedLanguageVersion)
            else { return }
            self?.presentChordVersionWarning(installed: installed)
        }
    }

    /// One-line, dismissible D9 warning: the toolchain's Chord is ahead of the IDE.
    private func presentChordVersionWarning(installed: String) {
        let alert = NSAlert()
        alert.messageText = "This IDE is behind the installed Chord"
        alert.informativeText =
            "The Sharpee toolchain speaks Chord \(installed); this IDE was written for Chord " +
            "\(ChordVersionCheck.supportedLanguageVersion). Editing works, but highlighting and " +
            "the project tree may lag newer syntax — update the IDE when you can."
        alert.alertStyle = .warning
        alert.addButton(withTitle: "OK")
        if let window = mainWindowController?.window {
            alert.beginSheetModal(for: window, completionHandler: nil)
        } else {
            alert.runModal()
        }
    }

    /// Reads the persisted session and replays it: project, open tabs, active tab.
    /// Silently skips a project whose folder no longer exists, and individual files that
    /// no longer exist. If the saved active index is out of range after skips, falls back
    /// to the last surviving tab. A restored project that is no longer a story
    /// target — an ADR-185-era TypeScript project — opens the empty state with a
    /// one-line explanation instead (ADR-258 D8).
    private func restoreSession(into controller: MainWindowController) {
        guard let state = SessionStateStore.load() else { return }

        let fm = FileManager.default

        guard let projectURL = state.projectURL,
              fm.fileExists(atPath: projectURL.path) else {
            return
        }

        guard StoryTarget.isStoryProject(projectURL) else {
            controller.showEmptyStateExplanation(
                "“\(projectURL.lastPathComponent)” is not a Chord story — the IDE opens .story files (the TypeScript author path was retired)")
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

    /// File → New Story… (⌘N). Prompts for a title, picks/creates a folder, scaffolds the
    /// devkit story template into it, and opens it (ADR-185).
    @objc func newStory(_ sender: Any?) {
        guard let title = promptStoryTitle(), !title.isEmpty else { return }

        let panel = NSSavePanel()
        panel.title = "New Sharpee Story"
        panel.prompt = "Create"
        panel.message = "Choose where to create the story project folder."
        panel.canCreateDirectories = true
        panel.nameFieldStringValue = StoryScaffold.storyId(from: title)

        let handle: (NSApplication.ModalResponse) -> Void = { [weak self] response in
            guard response == .OK, let url = panel.url else { return }
            self?.scaffoldAndOpen(at: url, title: title)
        }
        if let window = mainWindowController?.window {
            panel.beginSheetModal(for: window, completionHandler: handle)
        } else {
            handle(panel.runModal())
        }
    }

    /// Prompts for the new story's title with a modal alert + text field. Returns nil on cancel.
    private func promptStoryTitle() -> String? {
        let alert = NSAlert()
        alert.messageText = "New Story"
        alert.informativeText = "Enter a title for your story."
        alert.addButton(withTitle: "Continue")
        alert.addButton(withTitle: "Cancel")
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
        field.placeholderString = "My Adventure"
        alert.accessoryView = field
        alert.window.initialFirstResponder = field
        guard alert.runModal() == .alertFirstButtonReturn else { return nil }
        return field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func scaffoldAndOpen(at url: URL, title: String) {
        let author = NSFullUserName().isEmpty ? "Anonymous" : NSFullUserName()
        let info = StoryScaffold.Info(title: title, author: author,
                                      description: "An interactive fiction adventure")
        do {
            try StoryScaffold.create(in: url, info: info)
            // The scaffold is a bare `<id>.story` (ADR-258 D2 — no package.json,
            // no npm step); opening it composes immediately, so the tree and
            // Problems are live before any build.
            loadProject(at: url)
        } catch {
            let alert = NSAlert(error: error)
            alert.alertStyle = .warning
            alert.runModal()
        }
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
        currentRepoRoot = url

        // The open target is the folder's `.story` file (ADR-258 D2). Composing
        // it populates the tree and Problems straight from source — the IDE
        // never prompts for or runs npm/node_modules/init-browser.
        currentStoryURL = StoryTarget.storyFile(in: url)

        // Show the built browser client in the Play pane (placeholder if none built).
        mainWindowController?.refreshPlay(projectRoot: currentRepoRoot)

        if let storyURL = currentStoryURL {
            mainWindowController?.composeStory(at: storyURL)
        }
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

    /// Build → Build (⌘B). Runs `sharpee build <file>.story` (ADR-258 D4),
    /// streaming output into the Build panel; on success Play reloads the
    /// freshly-built `dist/web/<id>/`. Grammar-header files never build (D2).
    @objc func buildProject(_ sender: Any?) {
        guard let storyURL = currentStoryURL,
              mainWindowController?.composedStory?.isGrammar != true else { return }
        // The build reads DISK while compose reads the buffer — save everything
        // first or an unsaved edit silently builds the old source.
        guard mainWindowController?.saveAllDocuments() != false else { return }
        buildController?.build(storyFile: storyURL)
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
    /// Build requires an open `.story` that is not a grammar-header file (D2).
    func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
        switch menuItem.action {
        case #selector(buildProject(_:)):
            return currentStoryURL != nil
                && mainWindowController?.composedStory?.isGrammar != true
                && !(buildController?.isBuilding ?? false)
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
