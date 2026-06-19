// PlayViewController.swift
// The Play pane: a header (status / Restart / "Play after build") over a WKWebView that
// embeds the story's self-contained browser client (dist/web/<story>/, served via a
// custom scheme), or a placeholder when no bundle is built.
// Public interface: load(repoRoot:story:), reloadAfterBuild(repoRoot:story:), restart(),
// playAfterBuild, onPlayAfterBuildChanged.
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
        send((e.message || 'Error') + (e.filename ? ' (' + e.filename + ':' + e.lineno + ')' : ''));
      });
      window.addEventListener('unhandledrejection', function (e) {
        var r = e.reason; send('Unhandled rejection: ' + (r && r.stack ? r.stack : (r && r.message ? r.message : r)));
      });
    })();
    """

    private let schemeHandler = PlayURLSchemeHandler()
    private var webView: WKWebView!
    private let header = PlayHeaderView()
    private let placeholder = NSTextField(labelWithString: "Build with Browser enabled to play")

    /// The bundle currently loaded, so reload after a rebuild can re-resolve it.
    private var loaded: (repoRoot: URL, story: String)?

    /// Whether a successful Browser build should auto-load into the pane. Persisted in SessionState.
    private(set) var playAfterBuild = true

    /// Fired when the user toggles "Play after build", so the session can persist it.
    var onPlayAfterBuildChanged: (() -> Void)?

    /// Fired with each console.error / uncaught error from the running story, symbolicated
    /// against the bundle's source map into a navigable error.
    var onConsoleError: ((PlayConsoleError) -> Void)?

    override func loadView() {
        let pane = NSView()
        pane.wantsLayer = true
        pane.layer?.backgroundColor = Theme.playBackground.cgColor

        // Serve the bundle over a custom scheme (real origin → localStorage works),
        // not file:// (null origin → storage SecurityError).
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: PlayURLSchemeHandler.scheme)
        let contentController = configuration.userContentController
        contentController.addUserScript(WKUserScript(source: Self.consoleHookScript,
                                                     injectionTime: .atDocumentStart,
                                                     forMainFrameOnly: true))
        contentController.add(WeakScriptMessageHandler(self), name: Self.consoleHandlerName)
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isInspectable = true // right-click → Inspect Element to debug the running story
        webView.translatesAutoresizingMaskIntoConstraints = false

        header.translatesAutoresizingMaskIntoConstraints = false
        header.onRestart = { [weak self] in self?.restart() }
        header.onPlayAfterBuildToggle = { [weak self] on in
            self?.playAfterBuild = on
            self?.onPlayAfterBuildChanged?()
        }
        header.setPlayAfterBuild(playAfterBuild)

        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
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

    /// Loads the story's web bundle if present, otherwise shows the placeholder.
    /// Passing nil repoRoot/story (e.g. no project, no story chosen) shows the placeholder.
    func load(repoRoot: URL?, story: String?) {
        guard let repoRoot, let story, !story.isEmpty,
              WebBundle.indexURL(repoRoot: repoRoot, story: story) != nil else {
            loaded = nil
            showPlaceholder()
            return
        }
        loaded = (repoRoot, story)
        PlayErrorSymbolicator.clearCache() // the bundle (and its source map) may have just rebuilt
        schemeHandler.rootDirectory = WebBundle.directory(repoRoot: repoRoot, story: story)
        placeholder.isHidden = true
        webView.isHidden = false
        header.setLoaded(true)
        let url = URL(string: "\(PlayURLSchemeHandler.scheme)://\(PlayURLSchemeHandler.host)/index.html")!
        webView.load(URLRequest(url: url))
    }

    /// Loads the just-built story after a successful Browser build, honouring the
    /// "Play after build" toggle. No-op when the toggle is off.
    func reloadAfterBuild(repoRoot: URL, story: String) {
        guard playAfterBuild else { return }
        load(repoRoot: repoRoot, story: story)
    }

    /// Restarts the running story by reloading from origin. (If the client later adds
    /// autosave-resume on load, this should call its restart hook instead.)
    func restart() {
        guard loaded != nil else { return }
        webView.reloadFromOrigin()
    }

    /// Applies a persisted "Play after build" value (session restore).
    func setPlayAfterBuild(_ on: Bool) {
        playAfterBuild = on
        header.setPlayAfterBuild(on)
    }

    private func showPlaceholder() {
        webView.isHidden = true
        placeholder.isHidden = false
        header.setLoaded(false)
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.consoleHandlerName, let text = message.body as? String else { return }
        guard let loaded else {
            onConsoleError?(PlayConsoleError(message: text, frames: [],
                                            translation: SharpeeErrorTranslator.translate(message: text)))
            return
        }
        let bundleDir = WebBundle.directory(repoRoot: loaded.repoRoot, story: loaded.story)
        onConsoleError?(PlayErrorSymbolicator.symbolicate(text, bundleDir: bundleDir))
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
