// PlayViewController.swift
// The Play pane: a header (status / Restart / "Play after build") over a
// WKWebView that embeds the story's self-contained browser client
// (dist/web/<story>/, served via a custom scheme), or a placeholder when no
// bundle is built. Errors from the running story are symbolicated and forwarded
// to the Diagnosis tab; judging what the story PRINTED is not this pane's job.
//
// ADR-299's additions are gone with it (ADR-300): the turn-events bridge, the
// pinned play seed and the skein session all arrived to grow a `.skein` and had
// no other consumer. When the editing surface ADR-301 defers lands, "play
// authors the transcript" will need a turn feed again — and it should be built
// against that decision rather than left standing as a hook nothing reads.
// Public interface: load(bundleDirectory:), reloadAfterBuild(projectRoot:),
// restart(), invalidateForSourceChange(), showUnplayable(reason:), isLoaded,
// playAfterBuild, onPlayAfterBuildChanged, onConsoleError,
// evaluateInPlaySurface(_:).
// Owner context: tools/ide — Play.

import AppKit
import WebKit

final class PlayViewController: NSViewController, WKScriptMessageHandler {

    private static let consoleHandlerName = "playConsole"

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

    override func loadView() {
        let pane = ThemedPane(color: Theme.playBackground)

        // Serve the bundle over a custom scheme (real origin → localStorage works),
        // not file:// (null origin → storage SecurityError).
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: PlayURLSchemeHandler.scheme)
        let contentController = configuration.userContentController
        contentController.add(WeakScriptMessageHandler(self), name: Self.consoleHandlerName)
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
    func load(bundleDirectory: URL?) {
        guard let bundleDirectory,
              FileManager.default.fileExists(
                  atPath: bundleDirectory.appendingPathComponent("index.html").path) else {
            loaded = nil
            showPlaceholder(Self.notBuiltPlaceholder)
            return
        }
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

    /// (Re)installs the pane's document-start scripts: the console hook and the
    /// surface chrome.
    private func installUserScripts() {
        let contentController = webView.configuration.userContentController
        contentController.removeAllUserScripts()
        for source in [Self.consoleHookScript, Self.playSurfaceScript] {
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
    func restart() {
        guard loaded != nil else { return }
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
