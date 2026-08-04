// PlayViewController.swift
// The Play pane: a header (status / New Thread / "Play after build") over a
// WKWebView that embeds the story's self-contained browser client
// (dist/web/<story>/, served via a custom scheme), or a placeholder when no
// bundle is built. Playing always grows the story's skein (ADR-299 D1): every
// turn arriving over the turn-events bridge walks or branches the committed
// `play-testing/<id>.skein`, and the whole surface boots at the skein's one
// pinned seed (D5), injected as `window.__SHARPEE_PLAY_SEED__` before any
// client script runs. Judging what the story printed is not this pane's job —
// blessing and export live in the Transcript view (D8).
// Public interface: load(projectRoot:), reloadAfterBuild(projectRoot:), restart(),
// replay(toNodeId:), isReplaying, playAfterBuild, onPlayAfterBuildChanged,
// storyDirectory, skein, transcriptsSaveDirectory, announceTranscript(_:).
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

    /// The story's live skein session (ADR-299 D1): opened per bundle load,
    /// grown on every turn. Nil when no bundle is loaded or the open project
    /// has no story directory to keep a skein in.
    private(set) var skein: SkeinSession?

    /// The open story's own directory, set by the project-load path. Exported
    /// threads land in the folders ADR-280's classifier looks for beneath it,
    /// so the sidebar discovers them.
    var storyDirectory: URL?

    /// Where an exported thread is offered by default (ADR-299 D7) — ADR-280's
    /// Transcript Tests group.
    var transcriptsSaveDirectory: URL? {
        storyDirectory?.appendingPathComponent("tests", isDirectory: true)
            .appendingPathComponent("transcripts", isDirectory: true)
    }

    /// Fired after a `.transcript` is written, so the Tests panel can
    /// re-discover its tree.
    var onTranscriptRecorded: ((URL) -> Void)?

    /// Announces a transcript written by someone else — the skein exporter
    /// (ADR-299 D7) lives in the right panel, but the Tests panel listens
    /// here, and two announce channels would be two things to keep wired.
    func announceTranscript(_ url: URL) {
        onTranscriptRecorded?(url)
    }

    /// Fired whenever the skein changes underfoot — a new session opened on
    /// load, or a turn walked/branched it — so the Skein view repaints without
    /// polling (ADR-299 D8).
    var onSkeinChanged: (() -> Void)?

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
            onSkeinChanged?()
            return
        }
        do {
            try openSkein(storyId: bundleDirectory.lastPathComponent)
        } catch {
            loaded = nil
            skein = nil
            showPlaceholder("Cannot read the story's skein — \(error.localizedDescription)")
            onSkeinChanged?()
            return
        }
        onSkeinChanged?()
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
        // The forcings of the branch being replayed (D5). Structured specs,
        // not header text — the built page must never carry a second copy of
        // the `forces:` grammar. Empty on an ordinary boot, so a normal play
        // session and a published page are byte-identical in behaviour.
        if !pendingForcings.isEmpty,
           let json = try? JSONSerialization.data(
               withJSONObject: pendingForcings.map(\.playSpec)),
           let literal = String(data: json, encoding: .utf8) {
            sources.append("window.__SHARPEE_PLAY_FORCES__ = \(literal);")
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
        // A new thread from the story start forces nothing — a forcing left
        // standing from a replayed branch would silently bend an ostensibly
        // fresh playthrough (D5).
        if !pendingForcings.isEmpty {
            pendingForcings = []
            installUserScripts()
        }
        skein?.beginThread()
        webView.reloadFromOrigin()
    }

    // MARK: - Replay to node (ADR-299 D6)

    /// Why a replay could not be completed.
    enum ReplayError: Error, LocalizedError, Equatable {
        /// No bundle is loaded, or the pane has no skein to replay through.
        case notPlayable
        /// The skein has no node with that id.
        case unknownNode(String)
        /// The client never finished booting after the restart.
        case clientDidNotBoot
        /// A command was typed but no turn came back over the bridge —
        /// the story no longer accepts it, or the client wedged.
        case turnDidNotLand(command: String)

        var errorDescription: String? {
            switch self {
            case .notPlayable:
                return "There is no running story to replay through — build (⌘B) first."
            case .unknownNode(let id):
                return "That node is no longer in the skein (\(id))."
            case .clientDidNotBoot:
                return "The story did not finish booting, so the replay could not start."
            case .turnDidNotLand(let command):
                return "Replay stopped at \"\(command)\" — the story did not respond to it."
            }
        }
    }

    /// True while a replay is driving the surface; the Skein view disables its
    /// affordances so a second click cannot interleave commands into the run.
    private(set) var isReplaying = false

    /// The forcings the next boot runs under (D5) — the joined annotations of
    /// the branch being replayed, or empty for ordinary play. They ride the
    /// injected user script, so they survive the restart reboots the client
    /// performs, and are cleared by "new thread from root": a fresh thread
    /// from the story start forces nothing.
    private(set) var pendingForcings: [Forcing] = []

    /// Re-runs root→node at the skein's pinned seed and leaves the story LIVE
    /// at that point (D1/D6).
    ///
    /// Replay drives the real client rather than a headless run, because "live
    /// at that point" is the requirement: the author continues typing from
    /// where the replay left off. A fresh boot at the pinned seed plus the
    /// thread's commands reproduces the state exactly — `ReplayRealPathTests`
    /// pins that reproduction as byte-identical, which is what makes this
    /// substitution sound rather than assumed. (`ReplayDriver` remains the
    /// headless instrument for reading a thread's output WITHOUT disturbing
    /// play — what cross-thread verification needs.)
    ///
    /// Walking the thread leaves the tree untouched: every command matches an
    /// existing child, so `SkeinSession` walks rather than branches, and a
    /// stored output that no longer matches is left standing as the
    /// changed-output surface's data rather than silently overwritten.
    ///
    /// - Parameter nodeId: the node to replay to (inclusive).
    /// - Throws: `ReplayError` when the surface cannot be driven there. The
    ///   surface is left wherever the replay reached — a partial replay is a
    ///   real position in the story, not a corrupt one.
    func replay(toNodeId nodeId: String) async throws {
        guard isLoaded, let skein else { throw ReplayError.notPlayable }
        guard let thread = skein.document.thread(to: nodeId) else {
            throw ReplayError.unknownNode(nodeId)
        }

        isReplaying = true
        defer { isReplaying = false }

        // Stamp the CURRENT document before reloading. `reloadFromOrigin()` is
        // asynchronous and the outgoing page keeps answering until it is
        // actually replaced — so every readiness probe passes against the page
        // being thrown away, and the replay would type its commands into the
        // OLD world (state and all). The stamp's ABSENCE is the only reliable
        // "this is the fresh document" signal, since a fresh page defines no
        // such global.
        _ = try? await evaluateInPlaySurface("window.\(Self.stalePageMarker) = true; 0")
        // The branch's forcings must be in place BEFORE the reload, since they
        // ride a document-start script (D5). Parsed from the thread's stored
        // annotations; anything unparseable is dropped rather than smuggled to
        // the engine as text it would reject at load.
        pendingForcings = (try? ReplayDriver.forcings(along: thread))?
            .compactMap(Forcing.parse) ?? []
        installUserScripts()
        // The replay tells the skein which nodes the coming turns ARE, rather
        // than letting it infer them from the commands: a forced sibling shares
        // its shadowed node's command (D5), so command-matching would record the
        // forced outcome against the unforced node and leave the branch empty.
        skein.beginReplay(along: thread)
        defer { skein.endReplay() }
        webView.reloadFromOrigin()
        try await waitForFreshClient()

        for command in thread.commands {
            try await submit(command: command)
        }
        // The bridge walked the tree command by command; assert the position
        // explicitly so a thread whose commands repeat cannot leave play on a
        // same-command node in a different branch.
        skein.moveTo(nodeId: nodeId)
    }

    /// The global stamped on a page about to be discarded, so a reload can be
    /// distinguished from "the old page is still answering".
    private static let stalePageMarker = "__sharpeeStalePage"

    /// Waits until a FRESH client has booted: the staleness stamp is gone (so
    /// this is the post-reload document), its input exists, and the boot turn's
    /// prose is on the page.
    ///
    /// Probes `textContent`, not `innerText` — an off-screen or unrendered
    /// WebView reports empty `innerText` even with content present.
    private func waitForFreshClient() async throws {
        let probe = """
        (function () {
          if (window.\(Self.stalePageMarker)) return false;
          var input = document.getElementById('command-input');
          var text = document.getElementById('text-content');
          return !!(input && text && text.textContent.trim().length > 0);
        })()
        """
        for _ in 0..<Self.replayPollCount {
            if let ready = try? await evaluateInPlaySurface(probe), ready as? Bool == true {
                return
            }
            try await Task.sleep(nanoseconds: Self.replayPollInterval)
        }
        throw ReplayError.clientDidNotBoot
    }

    /// Types `command` into the running client and waits for its turn to come
    /// back over the bridge.
    ///
    /// The wait is on the skein's position rather than on elapsed time: turn
    /// delivery is asynchronous and can even beat the submitting evaluation's
    /// own completion, so "the turn landed" is the only reliable signal.
    private func submit(command: String) async throws {
        let literal = String(data: try JSONSerialization.data(withJSONObject: [command]),
                             encoding: .utf8) ?? "[\"\"]"
        _ = try await evaluateInPlaySurface("""
        (function () {
          var input = document.getElementById('command-input');
          if (!input) return false;
          input.value = \(literal)[0];
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return true;
        })()
        """)
        for _ in 0..<Self.replayPollCount {
            if skein?.document.node(withId: skein?.currentNodeId ?? "")?.command == command {
                return
            }
            try await Task.sleep(nanoseconds: Self.replayPollInterval)
        }
        throw ReplayError.turnDidNotLand(command: command)
    }

    /// Replay polling: 50ms × 600 = a 30s ceiling per boot and per turn. A
    /// browser-compiled Chord story boots in seconds on a cold cache, so the
    /// ceiling is a wedge detector, not a normal wait.
    private static let replayPollInterval: UInt64 = 50_000_000
    private static let replayPollCount = 600

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

    /// Evaluates JavaScript against the running story's page.
    ///
    /// The one door into the play surface's script context, so the pane has a
    /// single place where it reaches into the page rather than a scattering of
    /// `evaluateJavaScript` call sites. Replay drives this same door, and so do
    /// the real-path tests.
    ///
    /// - Parameter script: the expression to evaluate.
    /// - Returns: the bridged result, or nil for a void script.
    /// - Throws: whatever WebKit reports (a syntax error, a dead page).
    @discardableResult
    func evaluateInPlaySurface(_ script: String) async throws -> Any? {
        try await webView.evaluateJavaScript(script)
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
                onSkeinChanged?()
            } catch {
                onSkeinChanged?()
                let message = "skein not saved: \(error.localizedDescription)"
                onConsoleError?(PlayConsoleError(
                    message: message,
                    frames: [],
                    translation: SharpeeErrorTranslator.translate(message: message)))
            }
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
