// PlayViewController.swift
// The Play pane: a header (status / New Thread / Bless / Checkpoint / "Play
// after build") over a WKWebView that embeds the story's self-contained browser
// client (dist/web/<story>/, served via a custom scheme), or a placeholder when no
// bundle is built. Playing always grows the story's skein (ADR-299 D1): every
// turn arriving over the turn-events bridge walks or branches the committed
// `play-testing/<id>.skein`, and the whole surface boots at the skein's one
// pinned seed (D5), injected as `window.__SHARPEE_PLAY_SEED__` before any
// client script runs.
// Public interface: load(projectRoot:), reloadAfterBuild(projectRoot:), restart(),
// playAfterBuild, onPlayAfterBuildChanged, storyDirectory, skein,
// canBlessLatestTurn, blessLatestTurn(), canCheckpointLatestTurn,
// checkpointLatestTurn(), writeRecording(to:), writeChain(to:name:mode:).
// Owner context: tools/ide — Play.

import AppKit
import WebKit

final class PlayViewController: NSViewController, WKScriptMessageHandler {

    private static let consoleHandlerName = "playConsole"
    /// The turn-events bridge (ADR-277 D5): the browser client posts
    /// `{command, response}` JSON here after each turn's response renders.
    private static let turnEventsHandlerName = "turnEvents"

    /// Hooks the page's console.error / window.onerror / unhandledrejection and forwards
    /// them to Swift, so Play-runtime errors are visible in the IDE (no WebView inspector
    /// needed — game pages often suppress the right-click menu).
    private static let consoleHookScript = """
    (function () {
      function send(text) {
        try { window.webkit.messageHandlers.\(consoleHandlerName).postMessage(String(text)); } catch (e) {}
      }
      var origError = console.error;
      console.error = function () { send(Array.prototype.join.call(arguments, ' ')); origError.apply(console, arguments); };
      window.addEventListener('error', function (e) {
        var stack = (e.error && e.error.stack) ? '\\n' + e.error.stack : '';
        send((e.message || 'Error') + stack);
      });
      window.addEventListener('unhandledrejection', function (e) {
        var r = e.reason;
        var msg = (r && r.message) ? r.message : String(r);
        var stack = (r && r.stack) ? '\\n' + r.stack : '';
        send(msg + stack);
      });
    })();
    """

    /// The IDE's play-surface chrome, injected at document start on every boot:
    /// 1. Clears the play origin's storage BEFORE the client script runs, so the
    ///    client's autosave restore-on-start can never replay a stale world —
    ///    every load (build, restart, session restore) is a fresh boot of what
    ///    ⌘B just built (David's ruling). Deep-state testing is what
    ///    checkpoints/chains are for.
    /// 2. Hides the client's menu bar (`#menu-bar`) — save/restore/settings are
    ///    a published-story surface; in the IDE the Play header owns the
    ///    controls. The built bundle is untouched: authors publish it with the
    ///    menu intact.
    private static let playSurfaceScript = """
    (function () {
      try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
      var style = document.createElement('style');
      style.textContent = '#menu-bar { display: none !important; }';
      document.documentElement.appendChild(style);
    })();
    """

    private let schemeHandler = PlayURLSchemeHandler()
    private var webView: WKWebView!
    private let header = PlayHeaderView()
    private let placeholder = NSTextField(labelWithString: "Build (⌘B) to play the story")

    /// The bundle directory (`dist/web/<id>/`) currently loaded, or nil.
    private var loaded: URL?

    /// True when a bundle is currently loaded in the pane.
    var isLoaded: Bool { loaded != nil }

    /// True after a source edit invalidated the surface: the built bundle no
    /// longer matches the source, so nothing auto-loads until the next
    /// successful build (reloadAfterBuild clears this).
    private(set) var isAwaitingRebuild = false

    /// Whether a successful Browser build should auto-load into the pane. Persisted in SessionState.
    private(set) var playAfterBuild = true

    /// Fired when the user toggles "Play after build", so the session can persist it.
    var onPlayAfterBuildChanged: (() -> Void)?

    /// Fired with each console.error / uncaught error from the running story, symbolicated
    /// against the bundle's source map into a navigable error.
    var onConsoleError: ((PlayConsoleError) -> Void)?

    /// The bless/checkpoint capture the skein supersedes (ADR-282, retiring
    /// per ADR-299). The header's Record toggle is gone — nothing starts a
    /// recording in production — but the live bless flow still reads it until
    /// Phase 7 moves blessing into the Transcript view (Phase 9 sweeps it).
    let recording = RecordingSession()

    /// The story's live skein session (ADR-299 D1): opened per bundle load,
    /// grown on every turn. Nil when no bundle is loaded or the open project
    /// has no story directory to keep a skein in.
    private(set) var skein: SkeinSession?

    /// The open story's own directory, set by the project-load path. Recorded
    /// tests land in the two folders ADR-280's classifier looks for beneath it
    /// (below), so the sidebar discovers them.
    var storyDirectory: URL?

    /// Where an unmarked session saves (D3) — ADR-280's Transcript Tests group.
    var transcriptsSaveDirectory: URL? {
        storyDirectory?.appendingPathComponent("tests", isDirectory: true)
            .appendingPathComponent("transcripts", isDirectory: true)
    }

    /// Where a checkpointed session saves (D4) — ADR-280's Walkthroughs group,
    /// which IS the chain (filename sort, no manifest).
    var walkthroughsSaveDirectory: URL? {
        storyDirectory?.appendingPathComponent(WalkthroughChain.directoryName, isDirectory: true)
    }

    /// Fired after a recorded `.transcript` is written, so the Tests panel can
    /// re-discover its tree.
    var onTranscriptRecorded: ((URL) -> Void)?

    override func loadView() {
        let pane = ThemedPane(color: Theme.playBackground)

        // Serve the bundle over a custom scheme (real origin → localStorage works),
        // not file:// (null origin → storage SecurityError).
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: PlayURLSchemeHandler.scheme)
        let contentController = configuration.userContentController
        contentController.add(WeakScriptMessageHandler(self), name: Self.consoleHandlerName)
        contentController.add(WeakScriptMessageHandler(self), name: Self.turnEventsHandlerName)
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isInspectable = true // right-click → Inspect Element to debug the running story
        webView.translatesAutoresizingMaskIntoConstraints = false
        installUserScripts()

        header.translatesAutoresizingMaskIntoConstraints = false
        header.onRestart = { [weak self] in self?.restart() }
        header.onBless = { [weak self] in Task { await self?.blessLatestTurn() } }
        header.onCheckpoint = { [weak self] in self?.checkpointLatestTurn() }
        header.onPlayAfterBuildToggle = { [weak self] on in
            self?.playAfterBuild = on
            self?.onPlayAfterBuildChanged?()
        }
        header.setPlayAfterBuild(playAfterBuild)

        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
        placeholder.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        placeholder.translatesAutoresizingMaskIntoConstraints = false

        pane.addSubview(header)
        pane.addSubview(webView)
        pane.addSubview(placeholder)

        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo: pane.topAnchor),
            header.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            header.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            header.heightAnchor.constraint(equalToConstant: PlayHeaderView.height),

            webView.topAnchor.constraint(equalTo: header.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: pane.bottomAnchor),

            placeholder.centerXAnchor.constraint(equalTo: webView.centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: webView.centerYAnchor),
        ])

        view = pane
        showPlaceholder()
    }

    /// Loads a story's web bundle directory (`dist/web/<id>/`, resolved by the
    /// caller from the IR header per ADR-258 D4) if its index.html exists,
    /// otherwise shows the placeholder. Passing nil shows the placeholder.
    ///
    /// Loading opens the story's skein (ADR-299): an existing
    /// `play-testing/<id>.skein` that cannot be read blocks the surface with
    /// its reason (AC-7's loud rejection) — playing without growing the skein
    /// would silently drop turns the author expects recorded.
    func load(bundleDirectory: URL?) {
        guard let bundleDirectory,
              FileManager.default.fileExists(
                  atPath: bundleDirectory.appendingPathComponent("index.html").path) else {
            loaded = nil
            skein = nil
            showPlaceholder(Self.notBuiltPlaceholder)
            return
        }
        do {
            try openSkein(storyId: bundleDirectory.lastPathComponent)
        } catch {
            loaded = nil
            skein = nil
            showPlaceholder("Cannot read the story's skein — \(error.localizedDescription)")
            return
        }
        installUserScripts() // seed the new boot (the skein may have changed)
        loaded = bundleDirectory
        PlayErrorSymbolicator.clearCache() // the bundle (and its source map) may have just rebuilt
        schemeHandler.rootDirectory = bundleDirectory
        placeholder.isHidden = true
        webView.isHidden = false
        header.setLoaded(true)
        let url = URL(string: "\(PlayURLSchemeHandler.scheme)://\(PlayURLSchemeHandler.host)/index.html")!
        webView.load(URLRequest(url: url))
    }

    /// Opens (or begins) the skein for `storyId` beneath the open story's
    /// directory. Without a story directory there is nowhere to keep one —
    /// the pane still plays, it just has no skein to grow (the fixture-page
    /// case in tests; a real project load always configures the directory).
    private func openSkein(storyId: String) throws {
        guard let storyDirectory else {
            skein = nil
            return
        }
        skein = try SkeinSession(
            storeURL: SkeinStore.url(forStoryId: storyId, projectRoot: storyDirectory))
    }

    /// (Re)installs the pane's document-start scripts: the console hook, the
    /// surface chrome, and — when a skein is open — its pinned seed (D5) as
    /// `window.__SHARPEE_PLAY_SEED__`, which the built bundle's entry passes
    /// into the engine. Rebuilt per load because the seed rides the script.
    private func installUserScripts() {
        let contentController = webView.configuration.userContentController
        contentController.removeAllUserScripts()
        var sources = [Self.consoleHookScript, Self.playSurfaceScript]
        if let skein {
            sources.append("window.__SHARPEE_PLAY_SEED__ = \(skein.seed);")
        }
        for source in sources {
            contentController.addUserScript(WKUserScript(source: source,
                                                         injectionTime: .atDocumentStart,
                                                         forMainFrameOnly: true))
        }
    }

    /// Shows an explicit "cannot play" state (e.g. a grammar-header file — not a
    /// story, no `dist/web/<id>` exists for it; ADR-258 D2).
    func showUnplayable(reason: String) {
        loaded = nil
        showPlaceholder(reason)
    }

    /// A source edit invalidated the running surface (David's ruling: the play
    /// surface renders a PARTICULAR build; diverged source clears it whole).
    /// Unloads to an explicit "build to play" state — a merely hidden page
    /// would keep running its turn timers. Stale autosave state is harmless
    /// here: every boot clears the origin's storage first (playSurfaceScript).
    /// No-op when nothing is loaded.
    func invalidateForSourceChange() {
        guard isLoaded else { return }
        webView.load(URLRequest(url: URL(string: "about:blank")!))
        loaded = nil
        isAwaitingRebuild = true
        showPlaceholder("Source changed — build to play")
    }

    /// Loads the just-built bundle after a successful build, honouring the
    /// "Play after build" toggle. Always clears the awaiting-rebuild latch —
    /// the new bundle matches the source again.
    func reloadAfterBuild(bundleDirectory: URL) {
        isAwaitingRebuild = false
        guard playAfterBuild else { return }
        load(bundleDirectory: bundleDirectory)
    }

    /// Restarts the running story by reloading from origin — a fresh boot, since
    /// playSurfaceScript clears the origin's storage before the client runs.
    /// In skein terms this is D8's "new thread from root": play returns to the
    /// story start, and the next diverging command branches there.
    func restart() {
        guard loaded != nil else { return }
        skein?.beginThread()
        webView.reloadFromOrigin()
    }

    /// Applies a persisted "Play after build" value (session restore).
    func setPlayAfterBuild(_ on: Bool) {
        playAfterBuild = on
        header.setPlayAfterBuild(on)
    }

    private static let notBuiltPlaceholder = "Build (⌘B) to play the story"

    private func showPlaceholder(_ text: String = PlayViewController.notBuiltPlaceholder) {
        placeholder.stringValue = text
        webView.isHidden = true
        placeholder.isHidden = false
        header.setLoaded(false)
    }

    // MARK: - Bless (ADR-282 D1)

    /// Whether the live bless gesture is available right now — drives the Test
    /// menu's enablement as well as the header button's.
    var canBlessLatestTurn: Bool { recording.canBlessLatestTurn }

    /// Vouches for the turn the author is looking at, or takes the vouch back.
    ///
    /// The selection is sampled from the live page at the moment of the gesture
    /// rather than cached: it is the author's pointer at the load-bearing
    /// fragment, and it is only theirs while it is on screen. Reading it needs
    /// no page cooperation and nothing in `packages/platform-browser` —
    /// `PlaySelectionCaptureTests` pins that.
    ///
    /// A no-op when nothing blessable has been captured.
    func blessLatestTurn() async {
        guard recording.canBlessLatestTurn else { return }
        let selection = (try? await evaluateInPlaySurface("window.getSelection().toString()")) ?? nil
        recording.toggleBlessOnLatestTurn(rawSelection: selection as? String)
        updateTurnAffordances()
    }

    /// Evaluates JavaScript against the running story's page.
    ///
    /// The one door into the play surface's script context, so the pane has a
    /// single place where it reaches into the page rather than a scattering of
    /// `evaluateJavaScript` call sites. Tests drive the same door the bless
    /// gesture does.
    ///
    /// - Parameter script: the expression to evaluate.
    /// - Returns: the bridged result, or nil for a void script.
    /// - Throws: whatever WebKit reports (a syntax error, a dead page).
    @discardableResult
    func evaluateInPlaySurface(_ script: String) async throws -> Any? {
        try await webView.evaluateJavaScript(script)
    }

    // MARK: - Checkpoint (ADR-282 D4)

    /// Whether the live checkpoint gesture is available right now — drives the
    /// Test menu's enablement as well as the header button's.
    var canCheckpointLatestTurn: Bool { recording.canCheckpointLatestTurn }

    /// Ends a chain segment at the turn the author is looking at, or takes the
    /// mark back. A no-op when nothing is captured.
    func checkpointLatestTurn() {
        recording.toggleCheckpointOnLatestTurn()
        updateTurnAffordances()
    }

    /// Repaints the header's per-turn controls from the session's standing
    /// marks. Called on every captured turn so the affordances appear with the
    /// response they belong to (D1's live-flow requirement).
    private func updateTurnAffordances() {
        let latest = recording.isRecording ? recording.turns.last : nil
        header.setBless(available: recording.canBlessLatestTurn,
                        isBlessed: latest?.isBlessed ?? false)
        header.setCheckpoint(available: recording.canCheckpointLatestTurn,
                             isCheckpoint: latest?.isCheckpoint ?? false)
    }

    /// Saves the blessed session, as a single transcript or as a walkthrough
    /// chain depending on whether the author dropped checkpoints (D3/D4).
    /// Refuses a session nobody blessed (Acceptance 3) before asking anything
    /// else — the objection is to the session, not to the filename.
    private func saveRecording() {
        guard let window = view.window else { return }
        guard recording.hasAuthorAssertions else {
            presentSaveFailure(RecordingSaveError.noBlessedTurns, in: window)
            return
        }
        if recording.hasCheckpoints {
            saveChain(in: window)
        } else {
            saveSingleTranscript(in: window)
        }
    }

    /// The unmarked-session save (D3): one `.transcript` where the author
    /// chooses, defaulting into the story's `tests/transcripts/` (ADR-280's
    /// classified path, so the sidebar discovers it), then announced so the
    /// Tests panel re-discovers.
    private func saveSingleTranscript(in window: NSWindow) {
        let panel = NSSavePanel()
        panel.title = "Save Recorded Transcript"
        panel.nameFieldStringValue = "recorded.transcript"
        if let dir = transcriptsSaveDirectory {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            panel.directoryURL = dir
        }
        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self, response == .OK, let url = panel.url else { return }
            do {
                try self.writeRecording(to: url)
            } catch {
                self.presentSaveFailure(error, in: window)
            }
        }
    }

    /// The checkpointed-session save (D4): a chain of sequential transcripts in
    /// the story's `walkthroughs/`.
    ///
    /// No save panel, because the author is not naming a file — the flow names
    /// `segments.count` of them, and where they land is fixed by the fact that
    /// the directory IS the chain. The author names the chain; the numbering is
    /// the flow's job. When the directory holds transcripts outside the
    /// `wt-NN-*` scheme, the sheet says so and offers replace, because a stray
    /// runs in the chain wherever its filename sorts (D4).
    private func saveChain(in window: NSWindow) {
        guard let directory = walkthroughsSaveDirectory else {
            presentSaveFailure(RecordingSaveError.noStoryDirectory, in: window)
            return
        }
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

        let count = recording.segments.count
        let warning = WalkthroughChain.warning(strays: WalkthroughChain.strays(in: directory))
        let alert = NSAlert()
        alert.messageText = "Save walkthrough chain"
        alert.informativeText = [
            "\(count) transcripts will be written to \(WalkthroughChain.directoryName)/, "
                + "numbered after the chain already there.",
            warning,
        ].compactMap { $0 }.joined(separator: "\n\n")
        alert.alertStyle = warning == nil ? .informational : .warning

        let nameField = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
        nameField.stringValue = defaultChainName
        alert.accessoryView = nameField

        alert.addButton(withTitle: "Save")
        if warning != nil { alert.addButton(withTitle: "Replace Chain") }
        alert.addButton(withTitle: "Cancel")

        alert.beginSheetModal(for: window) { [weak self] response in
            guard let self else { return }
            let mode: ChainSaveMode
            switch response {
            case .alertFirstButtonReturn:
                mode = .append
            case .alertSecondButtonReturn where warning != nil:
                mode = .replace
            default:
                return  // Cancel — nothing is written and nothing is removed.
            }
            do {
                try self.writeChain(to: directory, name: nameField.stringValue, mode: mode)
            } catch {
                self.presentSaveFailure(error, in: window)
            }
        }
    }

    /// The chain name offered in the save sheet — the story's own folder name,
    /// which is what the author calls the thing they just played through.
    private var defaultChainName: String {
        storyDirectory?.lastPathComponent ?? "recorded"
    }

    /// Reports why a recording was not saved. The recovery suggestion carries
    /// the actionable half (what to do about it), so the refusal reads as a
    /// missing step rather than a rejection.
    private func presentSaveFailure(_ error: Error, in window: NSWindow) {
        let alert = NSAlert()
        alert.messageText = "Could not save the transcript"
        alert.informativeText = [error.localizedDescription,
                                 (error as? LocalizedError)?.recoverySuggestion]
            .compactMap { $0 }
            .joined(separator: "\n\n")
        alert.alertStyle = .warning
        alert.beginSheetModal(for: window, completionHandler: nil)
    }

    /// Serializes the captured session to `url` and announces it (the panel
    /// flow's write half, split out so tests drive the real write + announce
    /// without an NSSavePanel).
    ///
    /// - Parameter url: where to write the `.transcript`.
    /// - Throws: `RecordingSaveError.noBlessedTurns` when nothing in the session
    ///   was blessed — checked HERE, not only in the panel flow, so no caller
    ///   can route around Acceptance 3. Also rethrows any write error.
    func writeRecording(to url: URL) throws {
        guard recording.hasAuthorAssertions else {
            throw RecordingSaveError.noBlessedTurns
        }
        let title = url.deletingPathExtension().lastPathComponent
        try recording.serialize(title: "Recorded: \(title)")
            .write(to: url, atomically: true, encoding: .utf8)
        onTranscriptRecorded?(url)
    }

    /// Writes the checkpointed session as a walkthrough chain and announces it
    /// (the sheet flow's write half, split out so tests drive the real write
    /// without an NSAlert).
    ///
    /// New segments are written BEFORE the superseded ones are removed: a
    /// failure part-way through a replace leaves the author with both chains
    /// rather than neither.
    ///
    /// - Parameters:
    ///   - directory: the story's `walkthroughs/` (created if absent).
    ///   - name: the chain's name, slugged into each filename.
    ///   - mode: number after what is present, or replace it.
    /// - Returns: the files written, in play order.
    /// - Throws: `RecordingSaveError.noBlessedTurns` when nothing in the session
    ///   was blessed — checked HERE as well as in the sheet flow, so no caller
    ///   can route around Acceptance 3. Also rethrows any write or remove error.
    @discardableResult
    func writeChain(to directory: URL, name: String, mode: ChainSaveMode) throws -> [URL] {
        guard recording.hasAuthorAssertions else {
            throw RecordingSaveError.noBlessedTurns
        }
        let sources = recording.serializeChain(title: "Recorded: \(name)")
        let plan = WalkthroughChain.plan(segmentCount: sources.count,
                                         slug: WalkthroughChain.slug(from: name),
                                         in: directory,
                                         mode: mode)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        for (source, url) in zip(sources, plan.files) {
            try source.write(to: url, atomically: true, encoding: .utf8)
        }
        // A replace clears what it superseded; a file the new chain just wrote
        // OVER is already superseded and must not be deleted after the fact —
        // which happens whenever the new chain reuses an old segment's name.
        // Identity is the filename, not the URL: `removing` comes back from a
        // directory listing and `files` from path building, so the same file
        // can arrive as `/var/…` one way and `/private/var/…` the other.
        let written = Set(plan.files.map(\.lastPathComponent))
        for url in plan.removing where !written.contains(url.lastPathComponent) {
            try FileManager.default.removeItem(at: url)
        }
        if let first = plan.files.first { onTranscriptRecorded?(first) }
        return plan.files
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case Self.turnEventsHandlerName:
            guard let body = message.body as? String,
                  let data = body.data(using: .utf8),
                  let turn = try? JSONDecoder().decode(TurnEventBody.self, from: data) else { return }
            // Playing always grows the skein (ADR-299 D1) — every turn, no
            // toggle. A persist failure is surfaced on the pane's error path;
            // the in-memory session keeps the turn either way.
            do {
                try skein?.recordTurn(command: turn.command, output: turn.response)
            } catch {
                let message = "skein not saved: \(error.localizedDescription)"
                onConsoleError?(PlayConsoleError(
                    message: message,
                    frames: [],
                    translation: SharpeeErrorTranslator.translate(message: message)))
            }
            recording.record(command: turn.command, response: turn.response)
            // The affordance belongs to the response as it appears (D1) — a new
            // turn resets it to untagged, and a blank one offers nothing.
            updateTurnAffordances()
        case Self.consoleHandlerName:
            guard let text = message.body as? String else { return }
            guard let loaded else {
                onConsoleError?(PlayConsoleError(message: text, frames: [],
                                                translation: SharpeeErrorTranslator.translate(message: text)))
                return
            }
            onConsoleError?(PlayErrorSymbolicator.symbolicate(text, bundleDir: loaded))
        default:
            break
        }
    }

    /// The `turnEvents` message body — mirrors platform-browser's
    /// `TurnEventPayload` (the D5 wire shape).
    private struct TurnEventBody: Codable {
        let command: String
        let response: String
    }
}

/// Forwards script messages to a delegate weakly — `WKUserContentController.add` retains its
/// handler strongly, which would otherwise cycle (config → controller → handler → webView → config).
private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var delegate: WKScriptMessageHandler?
    init(_ delegate: WKScriptMessageHandler) { self.delegate = delegate }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(controller, didReceive: message)
    }
}
