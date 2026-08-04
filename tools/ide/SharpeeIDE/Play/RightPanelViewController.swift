// RightPanelViewController.swift
// The right panel: a tab strip over the Chord build output (Build), the running
// game (Play), the story's skein (Skein and Transcript — ADR-299 D8's sibling
// views), and the error explainer (Diagnosis) — David's ruling: the build
// process lives NEXT TO Play, not in the bottom dock (which stays for Problems
// and Game Errors). A build starting switches to Build; a successful
// play-after-build switches to Play. This controller also hosts the skein
// tabs' actions, since replay/tag/force/bless need both the tree and the live
// Play pane.
// Public interface: buildPanel, play, skeinView, transcriptView, showBuildTab(),
// showPlayTab(), showSkeinTab(), showTranscriptTab(), showDiagnosis(_:count:),
// revealDiagnosis(_:), clearDiagnosis(), onOpenLocation,
// isWellFormedForcing(_:).
// Owner context: tools/ide — Play (right panel).

import AppKit

final class RightPanelViewController: NSViewController {

    let buildPanel = BuildPanelView()
    let play = PlayViewController()
    let index = IndexView()
    let diagnosis = ErrorDiagnosisView()
    let testPanel = TestPanelView()
    let skeinView = SkeinView()
    let transcriptView = TranscriptView()

    /// Forwarded from the Diagnosis view: a clicked source location to open in the editor.
    var onOpenLocation: ((SourceLocation) -> Void)? {
        get { diagnosis.onOpenLocation }
        set { diagnosis.onOpenLocation = newValue }
    }

    private let tabStrip = TabStripView()
    private static let buildTab = 0
    private static let playTab = 1
    private static let skeinTab = 2
    private static let transcriptTab = 3
    private static let indexTab = 4
    private static let diagnosisTab = 5
    private static let testTab = 6

    override func loadView() {
        let container = ThemedPane(color: Theme.playBackground)

        addChild(play)
        tabStrip.addTab(title: "Build")
        tabStrip.addTab(title: "Play")
        tabStrip.addTab(title: "Skein")
        tabStrip.addTab(title: "Transcript")
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
        transcriptView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(tabStrip)
        container.addSubview(buildPanel)
        container.addSubview(play.view)
        container.addSubview(index)
        container.addSubview(diagnosis)
        container.addSubview(testPanel)
        container.addSubview(skeinView)
        container.addSubview(transcriptView)

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

            transcriptView.topAnchor.constraint(equalTo: play.view.topAnchor),
            transcriptView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            transcriptView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            transcriptView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
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

    /// Switches to the Transcript tab (ADR-299 D8) — where the selected thread
    /// reads as prose and blessing happens.
    func showTranscriptTab() {
        tabStrip.select(Self.transcriptTab)
    }

    private func show(tab selected: Int) {
        buildPanel.isHidden = selected != Self.buildTab
        play.view.isHidden = selected != Self.playTab
        index.isHidden = selected != Self.indexTab
        diagnosis.isHidden = selected != Self.diagnosisTab
        testPanel.isHidden = selected != Self.testTab
        skeinView.isHidden = selected != Self.skeinTab
        transcriptView.isHidden = selected != Self.transcriptTab
    }

    // MARK: - Skein (ADR-299 D8)

    /// Connects the Skein view to the Play pane's live session: the tree
    /// repaints whenever playing grows it, and the tree's actions drive the
    /// play surface back.
    private func wireSkein() {
        play.onSkeinChanged = { [weak self] in
            guard let self else { return }
            self.skeinView.setSession(self.play.skein)
            // Re-pointing the transcript CLEARS the thread it is reading, so it
            // happens only when the session itself changed (a story loaded).
            // Doing it per turn would throw the author out of the thread they
            // are blessing every time play grows the skein.
            if self.play.skein !== self.wiredSkein {
                self.wiredSkein = self.play.skein
                self.transcriptView.setSession(self.play.skein)
            }
            self.updateTranscript()
        }

        // Click-to-replay (D6). Replay leaves the story LIVE at the node, so
        // the panel follows the author to Play — the result of the action is
        // a running story, and leaving them on the tree hides it. UNLESS
        // verification objected: a finding is first-class (D4), so the panel
        // goes where the objection is readable instead of hiding it behind a
        // running game.
        skeinView.onReplay = { [weak self] nodeId in
            guard let self else { return }
            self.setSkeinBusy(true)
            self.skeinView.setStatus("Replaying…")
            Task { @MainActor in
                do {
                    try await self.play.replay(toNodeId: nodeId)
                    let findings = self.play.skein?.findings(forThreadTo: nodeId) ?? []
                    if findings.isEmpty {
                        self.skeinView.setStatus("Replayed — the story is live at this node.")
                        self.showPlayTab()
                    } else {
                        self.skeinView.setStatus(
                            "Replayed — \(findings.count) finding\(findings.count == 1 ? "" : "s") on this thread.")
                        self.showTranscriptTab()
                    }
                } catch {
                    self.skeinView.setStatus(error.localizedDescription)
                }
                self.setSkeinBusy(false)
                self.skeinView.reload()
                self.updateTranscript()
            }
        }

        skeinView.onTag = { [weak self] nodeId in self?.promptForTags(nodeId: nodeId) }
        skeinView.onForce = { [weak self] nodeId in self?.promptForForcing(nodeId: nodeId) }
        skeinView.onSelectNode = { [weak self] _ in self?.updateTranscript() }
        skeinView.onAnnotate = { [weak self] nodeId in self?.promptForAnnotation(nodeId: nodeId) }
        skeinView.onLock = { [weak self] nodeId, locked in
            self?.setLock(locked, nodeId: nodeId)
        }
        skeinView.onTrim = { [weak self] nodeId in self?.confirmTrim(nodeId: nodeId) }

        transcriptView.onBless = { [weak self] nodeId, scope in
            self?.bless(nodeId: nodeId, scope: scope)
        }
        transcriptView.onUnbless = { [weak self] nodeId in self?.unbless(nodeId: nodeId) }
        transcriptView.onExport = { [weak self] nodeId in self?.exportThread(nodeId: nodeId) }
    }

    /// The session the Transcript view is currently pointed at, so a repaint
    /// can tell "the skein grew" from "a different story opened".
    private weak var wiredSkein: SkeinSession?

    /// Points the Transcript view at the thread the author is looking at: the
    /// tree's selection when there is one, otherwise wherever play currently
    /// sits — so a session that has only been played reads without a click.
    private func updateTranscript() {
        transcriptView.show(threadTo: skeinView.selectedNodeId ?? play.skein?.currentNodeId)
    }

    private func setSkeinBusy(_ busy: Bool) {
        skeinView.setBusy(busy)
        transcriptView.setBusy(busy)
    }

    // MARK: - Bless (D3/D4)

    /// Vouches for a node's current output at the chosen scope.
    ///
    /// The scope is the author's own declaration made by which button they
    /// pressed (D4) — there is no default and no inference, because an
    /// all-paths blessing is an assertion the skein will enforce against every
    /// other thread.
    private func bless(nodeId: String, scope: SkeinBlessing.Scope) {
        guard let skein = play.skein else { return }
        do {
            guard try skein.bless(nodeId: nodeId, scope: scope) else {
                transcriptView.setStatus("That node is no longer in the skein.")
                return
            }
            transcriptView.reload()
            skeinView.reload()
            transcriptView.setStatus(scope == .allPaths
                ? "Blessed for all paths — every \"\(commandLabel(nodeId))\" in this skein must print this."
                : "Blessed on this thread.")
        } catch {
            transcriptView.setStatus("Blessing not saved: \(error.localizedDescription)")
        }
    }

    private func unbless(nodeId: String) {
        guard let skein = play.skein else { return }
        do {
            guard try skein.unbless(nodeId: nodeId) else {
                transcriptView.setStatus("That node carries no blessing.")
                return
            }
            transcriptView.reload()
            skeinView.reload()
            transcriptView.setStatus("Blessing withdrawn.")
        } catch {
            transcriptView.setStatus("Blessing not withdrawn: \(error.localizedDescription)")
        }
    }

    /// The command an all-paths blessing's assertion is about, for the message
    /// that states the claim back to the author.
    private func commandLabel(_ nodeId: String) -> String {
        play.skein?.document.node(withId: nodeId)?.command ?? ""
    }

    // MARK: - Export (D7)

    /// Mints the thread on the Transcript page as an ADR-294 golden transcript.
    ///
    /// A save panel rather than a fixed path: D7 puts exports in the project's
    /// EXISTING test groups, and which one — `tests/transcripts/` or
    /// `walkthroughs/` — is the author's call about what kind of test this is.
    /// The panel opens in `tests/transcripts/` because that is the ordinary
    /// answer, not because it is the only one.
    ///
    /// Nothing is written without this act, and a refusal is stated before the
    /// panel appears rather than after a filename has been typed.
    private func exportThread(nodeId: String) {
        guard let window = view.window, let skein = play.skein else { return }

        do {
            _ = try SkeinExporter.transcriptSource(document: skein.document,
                                                   toNodeId: nodeId,
                                                   title: "probe")
        } catch {
            transcriptView.setStatus([error.localizedDescription,
                                      (error as? LocalizedError)?.recoverySuggestion]
                .compactMap { $0 }
                .joined(separator: " "))
            return
        }

        let panel = NSSavePanel()
        panel.title = "Save Thread as Test"
        panel.nameFieldStringValue = SkeinExporter.defaultFilename(document: skein.document,
                                                                   toNodeId: nodeId)
        if let directory = play.transcriptsSaveDirectory {
            try? FileManager.default.createDirectory(at: directory,
                                                     withIntermediateDirectories: true)
            panel.directoryURL = directory
        }
        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self, response == .OK, let url = panel.url else { return }
            do {
                try SkeinExporter.write(document: skein.document,
                                        toNodeId: nodeId,
                                        title: url.deletingPathExtension().lastPathComponent,
                                        to: url)
                self.play.announceTranscript(url)
                self.transcriptView.setStatus("Saved \(url.lastPathComponent).")
            } catch {
                self.transcriptView.setStatus("Not saved: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Refinements (D9)

    /// Notes something on a node — freeform, seeded with the existing note so
    /// the sheet edits rather than replaces, and emptying the field clears it.
    private func promptForAnnotation(nodeId: String) {
        guard let window = view.window, let skein = play.skein,
              let node = skein.document.node(withId: nodeId) else { return }

        let alert = NSAlert()
        alert.messageText = "Note on this node"
        alert.informativeText = "A note to yourself about this turn — why it matters, "
            + "what you were checking. Not a thread tag; clear the field to remove it."
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 320, height: 24))
        field.stringValue = node.annotation ?? ""
        alert.accessoryView = field
        alert.addButton(withTitle: "Save")
        alert.addButton(withTitle: "Cancel")

        alert.beginSheetModal(for: window) { [weak self] response in
            guard let self, response == .alertFirstButtonReturn else { return }
            do {
                try skein.setAnnotation(field.stringValue, forNodeId: nodeId)
                self.skeinView.reload()
            } catch {
                self.skeinView.setStatus("Note not saved: \(error.localizedDescription)")
            }
        }
    }

    /// Guards or releases a subtree against trimming (D9).
    private func setLock(_ locked: Bool, nodeId: String) {
        guard let skein = play.skein else { return }
        do {
            guard try skein.setLocked(locked, forNodeId: nodeId) else {
                skeinView.setStatus("That node is no longer in the skein.")
                return
            }
            skeinView.reload()
            skeinView.setStatus(locked
                ? "Locked — trimming this branch is refused until you unlock it."
                : "Unlocked.")
        } catch {
            skeinView.setStatus("Lock not saved: \(error.localizedDescription)")
        }
    }

    /// Prunes a subtree (D9) — confirmed first, because a skein is committed
    /// work and a trim is not undoable from inside the IDE.
    ///
    /// A refusal is reported BEFORE the confirmation sheet: asking someone to
    /// confirm destroying something, then telling them it was never going to
    /// happen, teaches them to click through the sheet.
    private func confirmTrim(nodeId: String) {
        guard let window = view.window, let skein = play.skein,
              let node = skein.document.node(withId: nodeId) else { return }

        if let refusal = skein.document.trimRefusal(for: nodeId) {
            skeinView.setStatus(trimRefusalMessage(refusal, in: skein.document))
            return
        }

        let count = node.subtree.count
        let alert = NSAlert()
        alert.messageText = "Trim this branch?"
        alert.informativeText = "\(count) node\(count == 1 ? "" : "s") — \"\(node.command)\" and "
            + "everything below it — will be removed from the skein file, along with any "
            + "blessings and tags on them. Lock a branch to protect it from this."
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Trim")
        alert.addButton(withTitle: "Cancel")

        alert.beginSheetModal(for: window) { [weak self] response in
            guard let self, response == .alertFirstButtonReturn else { return }
            do {
                let outcome = try skein.trim(nodeId: nodeId)
                self.skeinView.reload()
                self.updateTranscript()
                switch outcome {
                case .trimmed(let removed):
                    self.skeinView.setStatus(
                        "Trimmed \(removed.count) node\(removed.count == 1 ? "" : "s").")
                default:
                    self.skeinView.setStatus(
                        self.trimRefusalMessage(outcome, in: skein.document))
                }
            } catch {
                self.skeinView.setStatus("Trim not saved: \(error.localizedDescription)")
            }
        }
    }

    /// States a refusal in the author's terms — a locked branch names the lock
    /// that stopped it, since "something in there is locked" is not actionable.
    private func trimRefusalMessage(_ outcome: SkeinDocument.TrimOutcome,
                                    in document: SkeinDocument) -> String {
        switch outcome {
        case .locked(let lockedId):
            let command = document.node(withId: lockedId)?.command ?? ""
            return "Locked — \"\(command)\" is protected. Unlock it to trim this branch."
        case .cannotTrimRoot:
            return "The story start is not a branch — trim one of its threads instead."
        case .unknownNode:
            return "That node is no longer in the skein."
        case .trimmed:
            return ""
        }
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
