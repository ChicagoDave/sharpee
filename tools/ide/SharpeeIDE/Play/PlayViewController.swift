// PlayViewController.swift
// The Play pane: a header (status / Restart / "Play after build") over a
// WKWebView that embeds the story's self-contained browser client
// (dist/web/<story>/, served via a custom scheme), or a placeholder when no
// bundle is built.
//
// Every turn the story takes arrives over the turn-events bridge (ADR-277 D5)
// and lands in `sessionLog`. That bridge outlives ADR-299: the skein it used to
// grow is retired (ADR-300), but "play authors the transcript" — promoting a
// played session rather than typing commands blind — is named by ADR-301 as the
// reason to build an editor at all, and this log is where that promotion will
// read from. Judging what the story printed is not this pane's job.
//
// The surface boots at a pinned seed injected as `window.__SHARPEE_PLAY_SEED__`
// before any client script runs, so a session can be replayed. See
// `pinnedPlaySeed` for where that value comes from now that the skein no longer
// carries one.
// Public interface: load(bundleDirectory:), reloadAfterBuild(projectRoot:),
// restart(), playAfterBuild, onPlayAfterBuildChanged, storyDirectory,
// sessionLog, onTurn, transcriptsSaveDirectory, announceTranscript(_:).
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

    /// One turn of the running story, as it came over the bridge.
    struct PlayedTurn: Equatable {
        let command: String
        let response: String
    }

    /// Every turn of the CURRENT playthrough, in order, cleared on restart.
    ///
    /// In memory only, deliberately: the `.skein` file this used to persist into
    /// is retired (ADR-300), and a played session is worth keeping only until
    /// the author promotes it into a `.transcript` — which is the editing
    /// surface ADR-301 defers to its next decision. Persisting it again before
    /// that decision would be inventing a second artifact to replace the one
    /// just removed.
    private(set) var sessionLog: [PlayedTurn] = []

    /// Fired after each turn lands, so a surface can show the session growing.
    var onTurn: ((PlayedTurn) -> Void)?

    /// The seed every Play boot pins, injected before any client script runs.
    ///
    /// The skein used to mint one per story and persist it; with the artifact
    /// retired there is nowhere authored to read a seed FROM — the Chord story
    /// header's schema is closed (ADR-298 D4) and carries no `seed`, and
    /// ADR-293's `seed:` is a *transcript* header field, not a story one. So
    /// this is a constant: every Play boot of every story is reproducible, on
    /// any machine and from a fresh clone, which the skein's random per-story
    /// seed never was. Making it authorable means adding `seed` to
    /// `IRStoryFields` — a Chord language change, and a separate decision.
    static let pinnedPlaySeed = 1

    /// The open story's own directory, set by the project-load path. Recorded
    /// transcripts land in the folders ADR-280's classifier looks for beneath
    /// it, so the sidebar discovers them.
    var storyDirectory: URL?

    /// Where a recorded transcript is offered by default — ADR-280's
    /// Transcript Tests group.
    var transcriptsSaveDirectory: URL? {
        storyDirectory?.appendingPathComponent("tests", isDirectory: true)
            .appendingPathComponent("transcripts", isDirectory: true)
    }

    /// Fired after a `.transcript` is written, so the Tests panel can
    /// re-discover its tree.
    var onTranscriptRecorded: ((URL) -> Void)?

    /// Announces a transcript written by someone else, so the Tests panel can
    /// re-discover its tree. One announce channel rather than two, because a
    /// second would be a second thing to keep wired.
    func announceTranscript(_ url: URL) {
        onTranscriptRecorded?(url)
    }

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
    /// Loading starts a fresh session log — the bundle may have just rebuilt,
    /// so turns from the previous build describe a story that no longer exists.
    func load(bundleDirectory: URL?) {
        guard let bundleDirectory,
              FileManager.default.fileExists(
                  atPath: bundleDirectory.appendingPathComponent("index.html").path) else {
            loaded = nil
            sessionLog = []
            showPlaceholder(Self.notBuiltPlaceholder)
            return
        }
        sessionLog = []
        installUserScripts()
        loaded = bundleDirectory
        PlayErrorSymbolicator.clearCache() // the bundle (and its source map) may have just rebuilt
        schemeHandler.rootDirectory = bundleDirectory
        placeholder.isHidden = true
        webView.isHidden = false
        header.setLoaded(true)
        let url = URL(string: "\(PlayURLSchemeHandler.scheme)://\(PlayURLSchemeHandler.host)/index.html")!
        webView.load(URLRequest(url: url))
    }

    /// (Re)installs the pane's document-start scripts: the console hook, the
    /// surface chrome, and the pinned seed as `window.__SHARPEE_PLAY_SEED__`,
    /// which the built bundle's entry passes into the engine.
    private func installUserScripts() {
        let contentController = webView.configuration.userContentController
        contentController.removeAllUserScripts()
        let sources = [
            Self.consoleHookScript,
            Self.playSurfaceScript,
            "window.__SHARPEE_PLAY_SEED__ = \(Self.pinnedPlaySeed);",
        ]
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
    /// The session log starts over with it: the turns before a restart belong to
    /// a playthrough the author has abandoned, and carrying them into the next
    /// one would promote a transcript that never happened in that order.
    func restart() {
        guard loaded != nil else { return }
        sessionLog = []
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

    /// Evaluates JavaScript against the running story's page.
    ///
    /// The one door into the play surface's script context, so the pane has a
    /// single place where it reaches into the page rather than a scattering of
    /// `evaluateJavaScript` call sites. The real-path tests drive this same door.
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
            // Every turn is logged, no toggle: the value of "play authors the
            // transcript" (ADR-301) is that the author does not have to decide
            // to record BEFORE the interesting thing happens.
            let played = PlayedTurn(command: turn.command, response: turn.response)
            sessionLog.append(played)
            onTurn?(played)
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
