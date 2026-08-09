// LaunchCoordinator.swift
// Drives the launch path: show the landing page, act on what the author picked,
// and show it again if that action did not end with a project open. The app
// therefore never sits on an empty window with no way forward, which is why the
// landing page needs no summon-back shortcut.
// Public interface: LaunchCoordinator(window:actions:storyRoot:), begin(lastProject:),
// Actions.
// Owner context: tools/ide — Launch.

import AppKit

@MainActor
final class LaunchCoordinator {

    /// What the coordinator is allowed to do to the rest of the app. Injected
    /// rather than reached for, so the launch flow can be driven in a test
    /// without opening the developer's own projects.
    /// Nested types do not inherit the enclosing class's isolation, and the
    /// default `quit` reaches for `NSApp` — so the struct carries its own.
    @MainActor
    struct Actions {
        /// Loads a project into the main window.
        let openProject: (URL) -> Void
        /// Writes a new story and returns the folder it landed in.
        let createStory: (CreateStoryViewController.Request) throws -> URL
        /// Ends the app. Injectable because `NSApp.terminate` cannot run in a test.
        let quit: () -> Void

        init(openProject: @escaping (URL) -> Void,
             createStory: @escaping (CreateStoryViewController.Request) throws -> URL,
             quit: @escaping () -> Void = { NSApp.terminate(nil) }) {
            self.openProject = openProject
            self.createStory = createStory
            self.quit = quit
        }
    }

    private let window: NSWindow
    private let actions: Actions
    private let storyRoot: URL

    /// The landing page currently on screen, if any. Tests reach for its buttons
    /// through this — the real modal, not a stand-in.
    private(set) var landingPage: LandingPageViewController?

    /// The Create Story sheet currently on screen, if any.
    private(set) var createStorySheet: CreateStoryViewController?

    /// True once a project has been opened. The landing page is a launch-time
    /// gate, not a window the author can summon back.
    private(set) var isFinished = false

    private var lastProject: URL?

    init(window: NSWindow, actions: Actions, storyRoot: URL = StoryHome.defaultRoot) {
        self.window = window
        self.actions = actions
        self.storyRoot = storyRoot
    }

    /// Shows the landing page.
    ///
    /// - Parameter lastProject: the project the previous session had open, so it
    ///   is offered even if Open Recent was cleared.
    func begin(lastProject: URL?) {
        self.lastProject = lastProject
        presentLandingPage()
    }

    // MARK: - The landing page

    private var presenter: NSViewController? { window.contentViewController }

    private func presentLandingPage() {
        guard !isFinished, landingPage == nil, let presenter else { return }
        let entries = LandingRecents.entries(recents: RecentProjectsStore.load(),
                                             lastProject: lastProject)
        let page = LandingPageViewController(recents: entries)
        page.onChoice = { [weak self] choice in self?.handle(choice) }
        landingPage = page
        presenter.presentAsSheet(page)
    }

    /// Dismisses the landing page and performs the choice. Every branch either
    /// finishes the launch or comes back to `presentLandingPage`.
    private func handle(_ choice: LandingPageViewController.Choice) {
        dismissLandingPage()
        switch choice {
        case .quit:
            actions.quit()
        case .openRecent(let url):
            openRecent(url)
        case .open:
            runOpenPanel()
        case .createStory:
            presentCreateStorySheet()
        }
    }

    private func dismissLandingPage() {
        guard let page = landingPage else { return }
        landingPage = nil
        presenter?.dismiss(page)
    }

    /// Re-shows the landing page after an action the author backed out of.
    /// Deferred a turn: AppKit will not present a sheet while the previous one is
    /// still dismissing.
    private func returnToLandingPage() {
        DispatchQueue.main.async { [weak self] in self?.presentLandingPage() }
    }

    private func finish(with projectURL: URL) {
        isFinished = true
        actions.openProject(projectURL)
    }

    // MARK: - Open

    private func openRecent(_ url: URL) {
        var isDirectory: ObjCBool = false
        let exists = FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory)
        guard exists, isDirectory.boolValue else {
            // The list is built from what was on disk when the page was built; a
            // folder can still go away between then and the click.
            RecentProjectsStore.remove(url)
            presentAlert(message: "Project Not Found",
                         detail: "The folder “\(url.lastPathComponent)” no longer exists at:\n\(url.path)")
            return
        }
        finish(with: url)
    }

    private func runOpenPanel() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.title = "Open Sharpee Project"
        panel.prompt = "Open"
        panel.message = "Choose a folder containing a Sharpee story."

        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self else { return }
            guard response == .OK, let url = panel.url else {
                // Backing out of Open returns the author to the launcher rather
                // than stranding them in an empty window.
                return self.returnToLandingPage()
            }
            self.finish(with: url)
        }
    }

    // MARK: - Create Story

    private func presentCreateStorySheet() {
        guard let presenter else { return }
        let sheet = CreateStoryViewController(root: storyRoot)
        sheet.onFinish = { [weak self] request in self?.handleCreate(request, sheet: sheet) }
        createStorySheet = sheet
        presenter.presentAsSheet(sheet)
    }

    private func handleCreate(_ request: CreateStoryViewController.Request?,
                              sheet: CreateStoryViewController) {
        createStorySheet = nil
        presenter?.dismiss(sheet)

        guard let request else { return returnToLandingPage() }

        do {
            finish(with: try actions.createStory(request))
        } catch {
            // Nothing was written on the throwing path, so the author can simply
            // try again with a different title or location.
            presentAlert(error: error)
        }
    }

    // MARK: - Alerts

    private func presentAlert(message: String, detail: String) {
        let alert = NSAlert()
        alert.messageText = message
        alert.informativeText = detail
        alert.alertStyle = .warning
        alert.addButton(withTitle: "OK")
        beginAlert(alert)
    }

    private func presentAlert(error: Error) {
        let alert = NSAlert(error: error)
        alert.alertStyle = .warning
        beginAlert(alert)
    }

    /// Every alert on the launch path ends by returning to the landing page —
    /// the author still has no project open.
    private func beginAlert(_ alert: NSAlert) {
        alert.beginSheetModal(for: window) { [weak self] _ in
            self?.returnToLandingPage()
        }
    }
}
