// RightPanelViewController.swift
// The right panel: a tab strip over the Chord build output (Build), the running
// game (Play), the story's skein (Skein — ADR-299 D8), and the error explainer
// (Diagnosis) — David's ruling: the build process lives NEXT TO Play, not in the
// bottom dock (which stays for Problems and Game Errors). A build starting
// switches to Build; a successful play-after-build switches to Play. This
// controller also hosts the Skein tab's actions, since replay/tag/force need
// both the tree and the live Play pane.
// Public interface: buildPanel, play, skeinView, showBuildTab(), showPlayTab(),
// showSkeinTab(), showDiagnosis(_:count:), revealDiagnosis(_:),
// clearDiagnosis(), onOpenLocation, isWellFormedForcing(_:).
// Owner context: tools/ide — Play (right panel).

import AppKit

final class RightPanelViewController: NSViewController {

    let buildPanel = BuildPanelView()
    let play = PlayViewController()
    let index = IndexView()
    let diagnosis = ErrorDiagnosisView()
    let testPanel = TestPanelView()
    let skeinView = SkeinView()

    /// Forwarded from the Diagnosis view: a clicked source location to open in the editor.
    var onOpenLocation: ((SourceLocation) -> Void)? {
        get { diagnosis.onOpenLocation }
        set { diagnosis.onOpenLocation = newValue }
    }

    private let tabStrip = TabStripView()
    private static let buildTab = 0
    private static let playTab = 1
    private static let skeinTab = 2
    private static let indexTab = 3
    private static let diagnosisTab = 4
    private static let testTab = 5

    override func loadView() {
        let container = ThemedPane(color: Theme.playBackground)

        addChild(play)
        tabStrip.addTab(title: "Build")
        tabStrip.addTab(title: "Play")
        tabStrip.addTab(title: "Skein")
        tabStrip.addTab(title: "Index")
        tabStrip.addTab(title: "Diagnosis")
        tabStrip.addTab(title: "Test")
        tabStrip.onSelect = { [weak self] tab in self?.show(tab: tab) }
        tabStrip.translatesAutoresizingMaskIntoConstraints = false

        wireSkein()

        buildPanel.translatesAutoresizingMaskIntoConstraints = false
        play.view.translatesAutoresizingMaskIntoConstraints = false
        index.translatesAutoresizingMaskIntoConstraints = false
        diagnosis.translatesAutoresizingMaskIntoConstraints = false
        testPanel.translatesAutoresizingMaskIntoConstraints = false
        skeinView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(tabStrip)
        container.addSubview(buildPanel)
        container.addSubview(play.view)
        container.addSubview(index)
        container.addSubview(diagnosis)
        container.addSubview(testPanel)
        container.addSubview(skeinView)

        NSLayoutConstraint.activate([
            tabStrip.topAnchor.constraint(equalTo: container.topAnchor),
            tabStrip.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            tabStrip.trailingAnchor.constraint(equalTo: container.trailingAnchor),

            play.view.topAnchor.constraint(equalTo: tabStrip.bottomAnchor),
            play.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            play.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            play.view.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            buildPanel.topAnchor.constraint(equalTo: play.view.topAnchor),
            buildPanel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            buildPanel.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            buildPanel.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            index.topAnchor.constraint(equalTo: play.view.topAnchor),
            index.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            index.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            index.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            diagnosis.topAnchor.constraint(equalTo: play.view.topAnchor),
            diagnosis.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            diagnosis.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            diagnosis.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            testPanel.topAnchor.constraint(equalTo: play.view.topAnchor),
            testPanel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            testPanel.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            testPanel.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            skeinView.topAnchor.constraint(equalTo: play.view.topAnchor),
            skeinView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            skeinView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            skeinView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        view = container
        tabStrip.select(Self.playTab) // strip + content agree from first paint
    }

    /// Switches to the Build tab (a build just started — its output streams here).
    func showBuildTab() {
        tabStrip.select(Self.buildTab)
    }

    /// Switches to the Play tab (a successful build just loaded the game).
    func showPlayTab() {
        tabStrip.select(Self.playTab)
    }

    /// Updates the Diagnosis content + badge for a newly-arrived error, without leaving Play.
    func showDiagnosis(_ error: PlayConsoleError, count: Int) {
        diagnosis.show(error)
        tabStrip.setCount(count, forTab: Self.diagnosisTab)
    }

    /// Shows an error's explanation and switches to the Diagnosis tab (on user request).
    func revealDiagnosis(_ error: PlayConsoleError) {
        diagnosis.show(error)
        tabStrip.select(Self.diagnosisTab)
    }

    func clearDiagnosis() {
        diagnosis.clear()
        tabStrip.setCount(0, forTab: Self.diagnosisTab)
    }

    /// Switches to the Test tab (a test run just started — results stream here).
    func showTestTab() {
        tabStrip.select(Self.testTab)
    }

    /// Switches to the Skein tab (ADR-299 D8).
    func showSkeinTab() {
        tabStrip.select(Self.skeinTab)
    }

    private func show(tab selected: Int) {
        buildPanel.isHidden = selected != Self.buildTab
        play.view.isHidden = selected != Self.playTab
        index.isHidden = selected != Self.indexTab
        diagnosis.isHidden = selected != Self.diagnosisTab
        testPanel.isHidden = selected != Self.testTab
        skeinView.isHidden = selected != Self.skeinTab
    }

    // MARK: - Skein (ADR-299 D8)

    /// Connects the Skein view to the Play pane's live session: the tree
    /// repaints whenever playing grows it, and the tree's actions drive the
    /// play surface back.
    private func wireSkein() {
        play.onSkeinChanged = { [weak self] in
            guard let self else { return }
            self.skeinView.setSession(self.play.skein)
        }

        // Click-to-replay (D6). Replay leaves the story LIVE at the node, so
        // the panel follows the author to Play — the result of the action is
        // a running story, and leaving them on the tree hides it.
        skeinView.onReplay = { [weak self] nodeId in
            guard let self else { return }
            self.skeinView.setBusy(true)
            self.skeinView.setStatus("Replaying…")
            Task { @MainActor in
                do {
                    try await self.play.replay(toNodeId: nodeId)
                    self.skeinView.setStatus("Replayed — the story is live at this node.")
                    self.showPlayTab()
                } catch {
                    self.skeinView.setStatus(error.localizedDescription)
                }
                self.skeinView.setBusy(false)
                self.skeinView.reload()
            }
        }

        skeinView.onTag = { [weak self] nodeId in self?.promptForTags(nodeId: nodeId) }
        skeinView.onForce = { [weak self] nodeId in self?.promptForForcing(nodeId: nodeId) }
    }

    /// Names the thread ending at a node (D2) — free text, comma-separated,
    /// seeded with whatever the node already carries so the sheet edits rather
    /// than replaces.
    private func promptForTags(nodeId: String) {
        guard let window = view.window, let skein = play.skein,
              let node = skein.document.node(withId: nodeId) else { return }

        let alert = NSAlert()
        alert.messageText = "Tag this thread"
        alert.informativeText = "Name the path this node ends — \"golden path\", \"troll death\". "
            + "Separate several with commas."
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
        field.stringValue = node.tags.joined(separator: ", ")
        alert.accessoryView = field
        alert.addButton(withTitle: "Save")
        alert.addButton(withTitle: "Cancel")

        alert.beginSheetModal(for: window) { [weak self] response in
            guard let self, response == .alertFirstButtonReturn else { return }
            let tags = field.stringValue
                .split(separator: ",")
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }
            do {
                try skein.setTags(tags, forNodeId: nodeId)
                self.skeinView.reload()
            } catch {
                self.skeinView.setStatus("Tag not saved: \(error.localizedDescription)")
            }
        }
    }

    /// Grows a forced sibling branch beside a node (D5).
    ///
    /// The annotation is typed in ADR-293's `forces:` grammar rather than
    /// picked from a list: the IDE has no enumeration of a story's choice
    /// points (that is the explorer's job, D10 — not shipped). The shape is
    /// validated here so a malformed entry is refused now, rather than
    /// surfacing as a runner load error on the next replay.
    private func promptForForcing(nodeId: String) {
        guard let window = view.window, let skein = play.skein else { return }

        let alert = NSAlert()
        alert.messageText = "Force a different outcome"
        alert.informativeText = """
        Grows a sibling branch running the same command with a choice point forced.

        Use point[#occurrence]=CLASS — for example
        stdlib.throwing.breaks#1=no. Separate several with commas.
        """
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 320, height: 24))
        alert.accessoryView = field
        alert.addButton(withTitle: "Grow Branch")
        alert.addButton(withTitle: "Cancel")

        alert.beginSheetModal(for: window) { [weak self] response in
            guard let self, response == .alertFirstButtonReturn else { return }
            let forcings = field.stringValue
                .split(separator: ",")
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }
            guard !forcings.isEmpty, forcings.allSatisfy(Self.isWellFormedForcing) else {
                self.skeinView.setStatus(
                    "Not a forcing: expected point[#occurrence]=CLASS, e.g. stdlib.throwing.breaks#1=no")
                return
            }
            do {
                guard try skein.growForcedSibling(of: nodeId, forcings: forcings) != nil else {
                    self.skeinView.setStatus(
                        "That node cannot carry a forced sibling — pick a typed command, not the story start.")
                    return
                }
                self.skeinView.reload()
                self.skeinView.setStatus("Branch grown — replay it to see the forced outcome.")
            } catch {
                self.skeinView.setStatus("Branch not saved: \(error.localizedDescription)")
            }
        }
    }

    /// Whether `entry` is a syntactically valid ADR-293 `forces:` segment.
    /// Delegates to `Forcing`, the one Swift home for that grammar — the sheet
    /// must not answer this question differently from the code that later
    /// hands the same annotation to the engine.
    static func isWellFormedForcing(_ entry: String) -> Bool {
        Forcing.parse(entry) != nil
    }
}
