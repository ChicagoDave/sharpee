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
    /// Runs `sharpee publish` for the Publish tab (ADR-284). Created eagerly:
    /// it owns the streamed output wiring, not a per-run object.
    private let publishController = PublishController()

    /// Sparkle's updater (ADR-279 D7). Created eagerly, like publishController
    /// above: constructing it starts the scheduled background check, and an
    /// updater that only wakes when the author opens the App menu is the
    /// check-for-updates stopgap D7 rules out.
    private let updateController = UpdateController()

    /// Drives the landing page at launch (go-live item 6). Held for the app's
    /// lifetime rather than the launch's: it owns the sheets it presented, and
    /// releasing it mid-flow would drop their callbacks.
    private var launchCoordinator: LaunchCoordinator?

    /// The toolchain version check runs once per launch, at the first project
    /// open. It used to run at launch, but with the landing page in front there
    /// is no story to resolve a toolchain near until the author has picked one.
    private var hasFetchedToolchainVersions = false

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
        // Theme tokens are dynamic (dark Mocha-ish / light Latte) and
        // layer-backed surfaces re-resolve through updateLayer (ThemedPane).
        // The IDE follows the system appearance unless the author pinned
        // Light or Dark via View → Appearance (GH #129 item 3) — applied
        // here, before the window builds, so launch renders in the chosen
        // appearance rather than flashing the system one.
        AppearancePreference.apply()
        NSApp.mainMenu = MenuBuilder.makeMainMenu(target: self)

        let controller = MainWindowController()
        mainWindowController = controller
        buildController = BuildController(window: controller)
        controller.onBuildPillCancel = { [weak self] in self?.buildController?.cancel() }
        wirePublish(to: controller)
        controller.showWindow(nil)
        controller.window?.makeKeyAndOrderFront(nil)

        NSApp.activate(ignoringOtherApps: true)

        beginLaunchFlow(in: controller)
    }

    /// Connects the Publish tab to the controller that runs the toolchain: the
    /// button asks, the stream lands in the tab, the result offers the artifact.
    private func wirePublish(to controller: MainWindowController) {
        guard let view = controller.publishView else { return }
        view.onPublish = { [weak self] in self?.publishStory(nil) }
        view.onCancel = { [weak self] in self?.publishController.cancel() }
        view.onReveal = { url in
            NSWorkspace.shared.activateFileViewerSelecting([url])
        }
        publishController.onOutput = { [weak view] text in view?.append(text) }
        publishController.onFinished = { [weak view] succeeded, zipURL in
            view?.finish(succeeded: succeeded, zipURL: zipURL)
        }
    }

    /// Shows the landing page and wires what it is allowed to do (go-live item 6).
    /// Launch does NOT reopen the last project by default — it is offered in
    /// the modal instead, alongside the other recents. The Settings toggle
    /// (David, 2026-08-09) flips that: with "Reopen last story at launch" on,
    /// the coordinator skips the modal and opens the last project directly.
    private func beginLaunchFlow(in controller: MainWindowController) {
        guard let window = controller.window else { return }
        let actions = LaunchCoordinator.Actions(
            openProject: { [weak self] url in self?.openProjectFromLaunch(url) },
            createStory: { [weak self] request in
                guard let self else { throw StoryScaffold.ScaffoldError.templateMissing("story.story.template") }
                return try self.createStory(request)
            })
        let coordinator = LaunchCoordinator(window: window, actions: actions)
        launchCoordinator = coordinator
        coordinator.begin(lastProject: SessionStateStore.load()?.projectURL,
                          reopenDirectly: ReopenLastStoryPreference.isEnabled)
    }

    /// One `sharpee --version` serves two consumers: ADR-279 D1's status-bar
    /// version line, and D9's non-blocking warning when the installed toolchain
    /// speaks a newer Chord than this IDE was written against. Runs once — a
    /// second project open must not re-warn.
    private func fetchToolchainVersionsOnce() {
        guard !hasFetchedToolchainVersions else { return }
        hasFetchedToolchainVersions = true
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

    /// Starts a user-initiated update check (ADR-279 D7). Sparkle owns every
    /// piece of UI from here on — progress, release notes, errors — so there is
    /// nothing to present locally.
    @objc func checkForUpdates(_ sender: Any?) {
        updateController.checkForUpdates()
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

    /// Opens the project the author chose on the landing page, replaying the
    /// persisted session on top of it when that session belongs to THIS project
    /// (`SessionState.restorable`) — tabs, expansion, pane visibility.
    ///
    /// A folder that is not a story target — an ADR-185-era TypeScript project —
    /// opens the empty state with a one-line explanation instead (ADR-258 D8).
    /// Recents and the landing page already filter those out; the Open panel
    /// cannot.
    func openProjectFromLaunch(_ url: URL) {
        guard let controller = mainWindowController else { return }

        guard StoryTarget.isStoryProject(url) else {
            controller.showEmptyStateExplanation(
                "“\(url.lastPathComponent)” is not a Chord story — the IDE opens .story files (the TypeScript author path was retired)")
            return
        }

        let restored = SessionState.restorable(SessionStateStore.load(), opening: url)
        loadProject(at: url, expandedFolderURLs: restored?.expandedFolderURLs ?? [])
        if let restored {
            replaySession(restored, into: controller)
        }
        fetchToolchainVersionsOnce()
    }

    /// Replays a session that belongs to the project now open: pane state first,
    /// then the tabs. Individual files that no longer exist are skipped; if the
    /// saved active index is out of range after skips, falls back to the last
    /// surviving tab.
    private func replaySession(_ state: SessionState, into controller: MainWindowController) {
        controller.setProjectPaneVisible(state.projectPaneVisible)
        controller.setBuildPanelVisible(state.buildPanelVisible)
        controller.setPlayAfterBuild(state.playAfterBuild)
        if let tab = state.rightPanelTab { controller.setRightPanelTab(tab) }

        let fm = FileManager.default
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

    /// File → New Story… (⌘N). Presents the same Create Story sheet the landing
    /// page uses — one create path, so the title/location rules cannot fork.
    @objc func newStory(_ sender: Any?) {
        guard let presenter = mainWindowController?.window?.contentViewController else { return }
        let sheet = CreateStoryViewController()
        sheet.onFinish = { [weak self] request in
            presenter.dismiss(sheet)
            guard let self, let request else { return }
            do {
                self.loadProject(at: try self.createStory(request))
            } catch {
                self.presentScaffoldFailure(error)
            }
        }
        presenter.presentAsSheet(sheet)
    }

    /// Creates the story the Create Story sheet asked for. The single mutation
    /// behind both entry points — File → New Story and the landing page.
    ///
    /// - Parameters:
    ///   - request: the author's title and chosen folder.
    ///   - templateDirectory: overrides the bundled devkit template; tests pass
    ///     the in-repo `packages/devkit/templates/story-chord`.
    /// - Returns: the folder now holding the story — the value `loadProject` opens.
    /// - Throws: `StoryHome.HomeError.projectAlreadyExists` when the folder is
    ///   occupied, or `StoryScaffold.ScaffoldError` when the template is missing.
    ///   Nothing is created on either throwing path.
    @discardableResult
    func createStory(_ request: CreateStoryViewController.Request,
                     templateDirectory: URL? = nil) throws -> URL {
        // Checked before scaffolding so the refusal can name the FULL path
        // (ADR-280 Acceptance 6) rather than just the folder's leaf.
        try StoryHome.resolveNewProjectDirectory(at: request.directory)
        return try scaffoldStory(at: request.directory, title: request.title,
                                 templateDirectory: templateDirectory)
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

        // The Testing tab binds the surface lazily on first visit (the D8
        // sidecar needs the composed story id); loadProject already cleared
        // the previous project's surface.

        // The Publish tab acts on the same target Build does.
        mainWindowController?.setPublishStory(currentStoryURL)

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

    /// Build → Publish… (ADR-284). Asks where the zip goes, then runs
    /// `sharpee publish` through the resolved toolchain and streams it into the
    /// Publish tab. The destination is chosen here rather than parsed back out
    /// of the command's output.
    @objc func publishStory(_ sender: Any?) {
        guard let storyURL = currentStoryURL,
              let window = mainWindowController?.window,
              let view = mainWindowController?.publishView else { return }
        mainWindowController?.showPublishTab()

        let panel = NSSavePanel()
        panel.title = "Publish Story"
        panel.prompt = "Publish"
        panel.message = "Choose where to write the distributable zip."
        panel.allowedContentTypes = [.zip]
        panel.nameFieldStringValue = storyURL.deletingPathExtension().lastPathComponent + ".zip"

        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self, response == .OK, let destination = panel.url else { return }
            view.begin()
            self.publishController.publish(storyFile: storyURL, to: destination)
        }
    }

    /// Build → Shipped Themes → <theme>. Toggles the built-in in the story
    /// header's `themes:` line via the editor — undoable, tab left dirty
    /// (go-live Phase 6c).
    @objc func toggleShippedTheme(_ sender: NSMenuItem) {
        guard let themeId = sender.representedObject as? String else { return }
        mainWindowController?.toggleShippedTheme(themeId)
    }

    // MARK: - Test menu actions (ADR-277 D2/D3)

    /// Test → Run Tests (⌘U). Runs the story's suite as a tree through the
    /// Testing tab's run column — the surface's own Run button, so its
    /// in-page guards stay authoritative. The only run the IDE offers.
    @objc func runTests(_ sender: Any?) {
        mainWindowController?.runTestsInSurface()
    }

    /// Test → Cancel Test Run. SIGTERM, then SIGKILL; rows already filled stay.
    @objc func cancelTestRun(_ sender: Any?) {
        mainWindowController?.testingSurface?.cancelTestRun()
    }

    /// Test → Testing Play Surface (⌥⌘U). Brings the Testing tab forward —
    /// the tab IS the surface (David's ruling 2026-08-09).
    @objc func openTestingSurface(_ sender: Any?) {
        mainWindowController?.openTestingSurface()
    }

    /// Test → Auto-Assertion → <choice>. Sets the story header's
    /// `auto-assertion:` line via the editor — undoable, tab left dirty
    /// (go-live Phase 6e). The Default item carries no representedObject and
    /// REMOVES the line — an absent header is the platform default,
    /// room-name-and-description (David 2026-08-10).
    @objc func selectAutoAssertion(_ sender: NSMenuItem) {
        let policy = (sender.representedObject as? String)
            .flatMap(StoryHeaderAutoAssertion.Policy.init(rawValue:))
        mainWindowController?.selectAutoAssertion(policy)
    }

    /// Chord Writer → Settings… (⌘,). App-wide author preferences; per-project
    /// build options stay in the Build Settings sheet.
    @objc func showSettings(_ sender: Any?) {
        SettingsWindowController.shared.show()
    }

    /// View → Project Pane (⌘0). Collapses or expands the left folder tree; the
    /// rail's folder button is the same toggle. Persisted with the session.
    @objc func toggleProjectPane(_ sender: Any?) {
        mainWindowController?.toggleProjectPane()
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

    /// View → Appearance → System/Light/Dark. Persists and applies (GH #129).
    @objc func selectAppearance(_ sender: NSMenuItem) {
        guard let raw = sender.representedObject as? String,
              let choice = AppearanceChoice(rawValue: raw) else { return }
        AppearancePreference.choice = choice
    }

    // MARK: - NSUserInterfaceValidations (menu enable/disable)

    /// AppKit calls this when a menu containing one of our actions is about to display.
    /// Build requires an open `.story` that is not a grammar-header file (D2).
    func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
        switch menuItem.action {
        case #selector(checkForUpdates(_:)):
            // Greys out while a check is in flight so repeated selections cannot
            // stack sessions, and stays disabled entirely in a build whose
            // Info.plist lacks the feed URL or public key — a menu item that
            // silently does nothing is worse than one visibly unavailable.
            return updateController.isConfigured && updateController.canCheckForUpdates
        case #selector(buildProject(_:)):
            return currentStoryURL != nil
                && mainWindowController?.composedStory?.isGrammar != true
                && !(buildController?.isBuilding ?? false)
        case #selector(cancelBuild(_:)):
            return buildController?.isBuilding ?? false
        case #selector(publishStory(_:)):
            return currentStoryURL != nil
                && mainWindowController?.composedStory?.isGrammar != true
                && !publishController.isPublishing
        case #selector(runTests(_:)):
            return currentStoryURL != nil
                && mainWindowController?.composedStory?.isGrammar != true
                && !(mainWindowController?.testingSurface?.isRunningTests ?? false)
        case #selector(cancelTestRun(_:)):
            return mainWindowController?.testingSurface?.isRunningTests ?? false
        case #selector(toggleShippedTheme(_:)):
            guard let shipped = mainWindowController?.shippedThemeIds() else { return false }
            let themeId = menuItem.representedObject as? String
            menuItem.state = themeId.map { shipped.contains($0) } == true ? .on : .off
            return true
        case #selector(selectAutoAssertion(_:)):
            guard mainWindowController?.autoAssertionMenuApplies == true else { return false }
            let current = mainWindowController?.autoAssertionPolicy()
            let raw = menuItem.representedObject as? String
            menuItem.state = (raw == current?.rawValue) ? .on : .off
            return true
        case #selector(toggleProjectPane(_:)):
            menuItem.state = (mainWindowController?.isProjectPaneVisible ?? false) ? .on : .off
            return true
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
        case #selector(selectAppearance(_:)):
            let raw = menuItem.representedObject as? String
            menuItem.state = (raw == AppearancePreference.choice.rawValue) ? .on : .off
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
