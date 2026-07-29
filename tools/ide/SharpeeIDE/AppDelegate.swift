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
    private var testController: TestController?

    /// Root folder of the currently loaded project (the folder around the story,
    /// ADR-258 D2). Nil when no project is loaded.
    private var currentRepoRoot: URL?

    /// The `.story` file the open project is organized around (ADR-258 D2) —
    /// the Build target. Nil for a non-Chord folder; Build is disabled then.
    private var currentStoryURL: URL?

    /// Versions reported by the resolved toolchain, displayed (not encoded) in
    /// the status bar and About panel per ADR-279 D1. Empty until the launch
    /// `sharpee --version` answers, and left empty when no toolchain resolves.
    private var toolchainVersions = ChordVersionCheck.ToolchainVersions(sharpee: nil, chord: nil)

    func applicationDidFinishLaunching(_ notification: Notification) {
        // FIRST, before anything reads persisted state: carry the pre-ADR-279
        // defaults domain forward across the bundle-identifier change. The
        // window controller reads recents, session, and divider autosaves as it
        // builds, so a later migration would arrive after the empty read.
        DefaultsMigration.migrateLegacyDomainIfNeeded()

        NSApp.setActivationPolicy(.regular)
        // The IDE follows the system appearance: Theme tokens are dynamic
        // (dark Mocha-ish / light Latte) and layer-backed surfaces re-resolve
        // through updateLayer (ThemedPane).
        NSApp.mainMenu = MenuBuilder.makeMainMenu(target: self)

        let controller = MainWindowController()
        mainWindowController = controller
        buildController = BuildController(window: controller)
        testController = TestController(window: controller)
        controller.onBuildPillCancel = { [weak self] in self?.buildController?.cancel() }
        controller.showWindow(nil)
        controller.window?.makeKeyAndOrderFront(nil)

        NSApp.activate(ignoringOtherApps: true)

        restoreSession(into: controller)

        // One `sharpee --version` serves two consumers: ADR-279 D1's status-bar
        // version line, and D9's non-blocking warning when the installed
        // toolchain speaks a newer Chord than this IDE was written against.
        ChordVersionCheck.fetchVersions(near: currentStoryURL) { [weak self] versions in
            self?.toolchainVersions = versions
            self?.mainWindowController?.showToolchainVersions(versions)
            guard let installed = versions.chord,
                  ChordVersionCheck.isNewer(installed,
                                            thanSupported: ChordVersionCheck.supportedLanguageVersion)
            else { return }
            self?.presentChordVersionWarning(installed: installed)
        }
    }

    /// The About panel, carrying the app's own version plus the toolchain's
    /// (ADR-279 D1). Uses the standard panel with an overridden version string
    /// rather than a bespoke window — nothing here warrants custom chrome.
    @objc func showAboutPanel(_ sender: Any?) {
        NSApp.orderFrontStandardAboutPanel(options: [
            .applicationVersion: AppIdentity.version,
            .version: "",  // suppresses the parenthesized CFBundleVersion build number
            .credits: NSAttributedString(
                string: AppIdentity.aboutToolchainLine(
                    sharpeeVersion: toolchainVersions.sharpee,
                    chordVersion: toolchainVersions.chord),
                attributes: [.font: NSFont.systemFont(ofSize: 11)]),
        ])
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

    /// What the writer asked for in the New Story prompt.
    private enum NewStoryRequest {
        /// Create under the default project home — the path the writer never has to think about.
        case createAtDefaultHome(title: String)
        /// The writer explicitly asked to place the story themselves.
        case chooseLocation(title: String)
        case cancel
    }

    /// File → New Story… (⌘N). Prompts for a title and scaffolds into
    /// `~/Documents/Chord/<story-id>/` — no location picker (ADR-280 D2). The
    /// picker remains reachable from the prompt for writers who want it.
    @objc func newStory(_ sender: Any?) {
        switch promptNewStory() {
        case .cancel:
            return
        case .createAtDefaultHome(let title):
            createStoryAtDefaultHome(title: title)
        case .chooseLocation(let title):
            chooseLocationAndScaffold(title: title)
        }
    }

    /// Scaffolds into the default project home and opens the result, presenting
    /// the refusal when a story of that name is already there.
    private func createStoryAtDefaultHome(title: String) {
        do {
            loadProject(at: try scaffoldStoryAtDefaultHome(title: title))
        } catch {
            presentScaffoldFailure(error)
        }
    }

    /// The explicit "choose location" path — the pre-ADR-280 flow, now opt-in
    /// rather than mandatory.
    private func chooseLocationAndScaffold(title: String) {
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

    /// Prompts for the new story's title with a modal alert + text field, and for
    /// whether the writer wants the default home or to place the story themselves.
    /// An empty title is treated as a cancel.
    private func promptNewStory() -> NewStoryRequest {
        let alert = NSAlert()
        alert.messageText = "New Story"
        alert.informativeText = "Enter a title for your story."
        alert.addButton(withTitle: "Create")
        alert.addButton(withTitle: "Choose Location…")
        alert.addButton(withTitle: "Cancel")
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
        field.placeholderString = "My Adventure"
        alert.accessoryView = field
        alert.window.initialFirstResponder = field

        let response = alert.runModal()
        guard response != .alertThirdButtonReturn else { return .cancel }
        let title = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return .cancel }
        return response == .alertFirstButtonReturn
            ? .createAtDefaultHome(title: title)
            : .chooseLocation(title: title)
    }

    private func scaffoldAndOpen(at url: URL, title: String) {
        do {
            loadProject(at: try scaffoldStory(at: url, title: title))
        } catch {
            presentScaffoldFailure(error)
        }
    }

    /// Creates a new story on disk at `directory`. The mutation half of New
    /// Story, deliberately free of presentation and of `loadProject` so it can
    /// be driven directly by tests.
    ///
    /// - Parameters:
    ///   - directory: the folder the story is written into; created if absent.
    ///   - title: the author-entered story title.
    ///   - templateDirectory: overrides the bundled devkit template; tests pass
    ///     the in-repo `packages/devkit/templates/story-chord`.
    /// - Returns: `directory`, now holding the story — the value `loadProject` opens.
    /// - Throws: `StoryScaffold.ScaffoldError` when the template is missing or
    ///   the target is occupied. Nothing is opened on the throwing path.
    @discardableResult
    func scaffoldStory(at directory: URL, title: String,
                       templateDirectory: URL? = nil) throws -> URL {
        let author = NSFullUserName().isEmpty ? "Anonymous" : NSFullUserName()
        let info = StoryScaffold.Info(title: title, author: author,
                                      description: "An interactive fiction adventure")
        // The scaffold is a bare `<id>.story` (ADR-258 D2 — no package.json,
        // no npm step); opening it composes immediately, so the tree and
        // Problems are live before any build.
        try StoryScaffold.create(in: directory, info: info, templateDirectory: templateDirectory)
        return directory
    }

    /// Resolves the default project home for `title` (ADR-280 D2), then scaffolds
    /// into it — the exact path New Story takes when the writer does not ask to
    /// choose a location.
    ///
    /// - Parameters:
    ///   - title: the author-entered story title.
    ///   - root: the project home; defaults to `~/Documents/Chord`. Tests inject
    ///     a temp root so no run writes into the developer's real Documents.
    ///   - templateDirectory: as `scaffoldStory(at:title:templateDirectory:)`.
    /// - Returns: the created project directory.
    /// - Throws: `StoryHome.HomeError.projectAlreadyExists` when the target is
    ///   occupied — and in that case nothing is created and nothing is opened.
    @discardableResult
    func scaffoldStoryAtDefaultHome(title: String,
                                    in root: URL = StoryHome.defaultRoot,
                                    templateDirectory: URL? = nil) throws -> URL {
        let target = try StoryHome.resolveNewProjectDirectory(forTitle: title, in: root)
        return try scaffoldStory(at: target, title: title, templateDirectory: templateDirectory)
    }

    /// The one place a failed scaffold is surfaced to the writer.
    private func presentScaffoldFailure(_ error: Error) {
        let alert = NSAlert(error: error)
        alert.alertStyle = .warning
        alert.runModal()
    }

    /// File → Save (⌘S). Forwards to the active editor; no-op when no document is open.
    @objc func saveDocument(_ sender: Any?) {
        mainWindowController?.saveActiveDocument()
    }

    // MARK: - Recent Projects

    /// Opens the project rooted at `url`. Centralized so that the Open Project panel,
    /// restore-session, and Open Recent all share the same path.
    /// `expandedFolderURLs` is honoured by restore-session; the menu paths leave it empty.
    ///
    /// Deliberately does NOT retitle the window: the title stays the product name
    /// (ADR-279 D1), and the open project is identified by the tree and status bar.
    private func loadProject(at url: URL, expandedFolderURLs: [URL] = []) {
        let project = Project(rootURL: url)
        mainWindowController?.loadProject(project, expandedFolderURLs: expandedFolderURLs)
        currentRepoRoot = url

        // The open target is the folder's `.story` file (ADR-258 D2). Composing
        // it populates the tree and Problems straight from source — the IDE
        // never prompts for or runs npm/node_modules/init-browser.
        currentStoryURL = StoryTarget.storyFile(in: url)

        // The Tests panel tracks the same target (ADR-277 D2): discover its
        // tests/ + walkthroughs/ tree now; runs are user-initiated. Play
        // recording saves beneath the story's own directory and re-discovers on
        // save — into `tests/transcripts/` for an unmarked session (ADR-282 D3)
        // or `walkthroughs/` for a checkpointed chain (D4). The pane derives
        // both, since ADR-280's classifier looks for exactly those paths and
        // anything saved beside them would be invisible in the sidebar.
        if let storyURL = currentStoryURL {
            testController?.attach(storyFile: storyURL)
            mainWindowController?.configureRecording(
                storyDirectory: storyURL.deletingLastPathComponent(),
                onRecorded: { [weak self] _ in
                    guard let self, let story = self.currentStoryURL else { return }
                    self.testController?.attach(storyFile: story)
                    // The Tests panel re-discovers, but the file tree was built
                    // from an earlier scan and would keep the new transcript
                    // invisible until reopen — the author saves a test and sees
                    // nothing appear.
                    self.mainWindowController?.refreshProjectTree()
                })
        } else {
            testController?.detach()
        }

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

    // MARK: - Test menu actions (ADR-277 D2/D3)

    /// Test → Run All Tests (⌘U). Runs the story's `tests/` subtree via
    /// `sharpee test <file>.story --json`, streaming into the Test tab.
    @objc func runAllTests(_ sender: Any?) {
        testController?.runAll()
    }

    /// Test → Run Walkthrough Chain (⌥⌘U). Runs `walkthroughs/` with `--chain`
    /// (one game, state persists — D3).
    @objc func runTestChain(_ sender: Any?) {
        testController?.runChain()
    }

    /// Test → Run Current Test File (^⌘U). Runs the editor's focused
    /// `.transcript` against the story.
    @objc func runCurrentTestFile(_ sender: Any?) {
        guard let transcript = mainWindowController?.activeDocumentURL,
              transcript.pathExtension == "transcript" else { return }
        testController?.runFile(transcript)
    }

    /// Test → Bless Last Turn (⇧⌘B). Vouches for the response now on screen in
    /// the Play pane, or takes the vouch back (ADR-282 D1). Reachable by
    /// keyboard while the author is typing into the running story, which the
    /// header button alone is not.
    @objc func blessLastTurn(_ sender: Any?) {
        mainWindowController?.blessLatestPlayTurn()
    }

    /// Test → Checkpoint Here (⇧⌘K). Ends a walkthrough-chain segment at the
    /// turn now on screen, or takes the mark back (ADR-282 D4). Keyboard-
    /// reachable for the same reason Bless is: the gesture happens mid-play.
    @objc func checkpointHere(_ sender: Any?) {
        mainWindowController?.checkpointLatestPlayTurn()
    }

    /// Test → Cancel Test Run. SIGTERM, then SIGKILL; decoded results stay.
    @objc func cancelTestRun(_ sender: Any?) {
        testController?.cancel()
    }

    /// View → Word Wrap. Toggles soft wrap in the editor (persisted).
    @objc func toggleWordWrap(_ sender: Any?) {
        mainWindowController?.setWordWrap(!WordWrapPreference.isEnabled)
    }

    /// View → Font → Courier/Arial/Georgia. Persists and rebroadcasts.
    @objc func selectFontFamily(_ sender: NSMenuItem) {
        guard let raw = sender.representedObject as? String,
              let family = FontFamily(rawValue: raw) else { return }
        FontPreference.family = family
    }

    /// View → Font → Small/Medium/Large/Extra Large.
    @objc func selectFontScale(_ sender: NSMenuItem) {
        guard let raw = sender.representedObject as? String,
              let scale = FontScale(rawValue: raw) else { return }
        FontPreference.scale = scale
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
        case #selector(runAllTests(_:)), #selector(runTestChain(_:)):
            return currentStoryURL != nil
                && mainWindowController?.composedStory?.isGrammar != true
                && !(testController?.isTesting ?? false)
        case #selector(runCurrentTestFile(_:)):
            return currentStoryURL != nil
                && mainWindowController?.activeDocumentURL?.pathExtension == "transcript"
                && !(testController?.isTesting ?? false)
        case #selector(cancelTestRun(_:)):
            return testController?.isTesting ?? false
        case #selector(blessLastTurn(_:)):
            // Only while a recording holds a blessable turn — an empty response
            // carries no affordance (ADR-282 D2).
            return mainWindowController?.canBlessLatestPlayTurn ?? false
        case #selector(checkpointHere(_:)):
            // Only while a recording holds a turn to mark (ADR-282 D4). A blank
            // response is no objection here — see canCheckpointLatestTurn.
            return mainWindowController?.canCheckpointLatestPlayTurn ?? false
        case #selector(toggleWordWrap(_:)):
            menuItem.state = WordWrapPreference.isEnabled ? .on : .off
            return true
        case #selector(selectFontFamily(_:)):
            let raw = menuItem.representedObject as? String
            menuItem.state = (raw == FontPreference.family.rawValue) ? .on : .off
            return true
        case #selector(selectFontScale(_:)):
            let raw = menuItem.representedObject as? String
            menuItem.state = (raw == FontPreference.scale.rawValue) ? .on : .off
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
