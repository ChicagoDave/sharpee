// PlayViewController.swift
// The Play pane: a header (status / Restart / "Play after build") over a
// WKWebView that embeds the story's self-contained browser client
// (dist/web/<story>/, served via a custom scheme), or a placeholder when no
// bundle is built. Errors from the running story are symbolicated and forwarded
// to the Diagnosis tab; judging what the story PRINTED is not this pane's job.
//
// The 6f margin chrome, Create Transcript flow, and the pane's turn-feed
// consumer are RETIRED (ADR-306 D1, David's shred ruling 2026-08-09): test
// authoring lives in the testing play surface window, which registers its
// own `turnEvents` bridge. This pane registers none, so the client's
// `turnEventsBridgeActive()` is false here and published-player behavior
// (no per-turn world digest) is exactly what regular Play exercises.
// Public interface: load(bundleDirectory:), reloadAfterBuild(projectRoot:),
// restart(), invalidateForSourceChange(), showUnplayable(reason:), isLoaded,
// playAfterBuild, onPlayAfterBuildChanged, onConsoleError,
// evaluateInPlaySurface(_:), themeChoice, applyThemeChoice(_:) (Phase 6b —
// the play-surface theme picker, IDE chrome persisted in UserDefaults),
// idePlaySeed (ADR-305 D1).
// Owner context: tools/ide — Play.

import AppKit
import WebKit

final class PlayViewController: NSViewController, WKScriptMessageHandler {

    private static let consoleHandlerName = "playConsole"

    /// The fixed IDE play seed (ADR-305 D1): every play boot is deterministic
    /// and every session is promotable. 42 is the corpus's canonical example
    /// seed (ADR-294 D7). Injected as `__SHARPEE_PLAY_SEED__` at document
    /// start — the client template's surviving ADR-299 D5 hook reads it.
    static let idePlaySeed = 42

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
    /// 3. Theme chrome (Phase 6b): links every built-in theme's CSS the page
    ///    does not already carry (the scheme handler backfills the files from
    ///    the vendored mirror), and — when the author picked a theme in the
    ///    Play header — sets `data-theme` and keeps it set. The observer is
    ///    the load-bearing part: the client's own boot applies ITS saved/default
    ///    theme after this script ran, and would silently undo the picker.
    ///    With no pick (Story Default) the chrome never touches `data-theme`.
    private static func playSurfaceScript(themeChoice: String?, themeStylesheets: [String]) -> String {
        """
        (function () {
          window.__SHARPEE_PLAY_SEED__ = \(idePlaySeed);
          try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
          var style = document.createElement('style');
          style.textContent = '#menu-bar { display: none !important; }';
          document.documentElement.appendChild(style);

          var chrome = { choice: \(Self.javascriptString(themeChoice)) };
          window.__sharpeePlayThemeChrome = chrome;
          \(Self.javascriptStringArray(themeStylesheets)).forEach(function (href) {
            var file = href.split('/').pop();
            if (!document.querySelector('link[href$="' + file + '"]')) {
              var link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = href;
              document.documentElement.appendChild(link);
            }
          });
          function enforce() {
            if (chrome.choice &&
                document.documentElement.getAttribute('data-theme') !== chrome.choice) {
              document.documentElement.setAttribute('data-theme', chrome.choice);
            }
          }
          enforce();
          new MutationObserver(enforce)
            .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        })();
        """
    }

    /// A Swift string (or nil) as a JavaScript literal, JSON-escaped.
    private static func javascriptString(_ value: String?) -> String {
        guard let value,
              let data = try? JSONEncoder().encode(value),
              let literal = String(data: data, encoding: .utf8) else { return "null" }
        return literal
    }

    /// A Swift string array as a JavaScript array literal, JSON-escaped.
    private static func javascriptStringArray(_ values: [String]) -> String {
        guard let data = try? JSONEncoder().encode(values),
              let literal = String(data: data, encoding: .utf8) else { return "[]" }
        return literal
    }

    private let schemeHandler = PlayURLSchemeHandler()
    private var webView: WKWebView!
    private let header = PlayHeaderView()
    private let placeholder = NSTextField(labelWithString: "Build (⌘B) to play the story")

    /// UserDefaults key for the picked play-surface theme id. Absent = Story
    /// Default. Deliberately NOT the page's localStorage: every boot wipes the
    /// play origin's storage, so the only durable home is the IDE's own.
    static let themeChoiceDefaultsKey = "SharpeeIDEPlayThemeChoice"

    /// The app-bundle Resources directory the theme catalog and the scheme
    /// handler's vendored-theme backfill resolve against. Tests inject a
    /// fixture directory; the app uses its own bundle.
    private let resourcesURL: URL?

    /// The picked theme id, or nil for Story Default. Mirrors UserDefaults.
    private(set) var themeChoice: String?

    init(resourcesURL: URL? = Bundle.main.resourceURL) {
        self.resourcesURL = resourcesURL
        self.themeChoice = UserDefaults.standard.string(forKey: Self.themeChoiceDefaultsKey)
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("PlayViewController is not Storyboard-instantiable")
    }

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
        schemeHandler.themesFallbackDirectory =
            resourcesURL?.appendingPathComponent("play-themes", isDirectory: true)
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
        header.setThemes(PlayThemeCatalog.themes(inResources: resourcesURL),
                         selectedThemeId: themeChoice)
        header.onThemeSelect = { [weak self] themeId in self?.applyThemeChoice(themeId) }

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
    /// surface chrome (which bakes in the current theme choice — load() calls
    /// this on every boot, so a changed pick is always in place for the next).
    private func installUserScripts() {
        let contentController = webView.configuration.userContentController
        contentController.removeAllUserScripts()
        let surfaceScript = Self.playSurfaceScript(
            themeChoice: themeChoice,
            themeStylesheets: PlayThemeCatalog.stylesheetPaths(inResources: resourcesURL))
        for source in [Self.consoleHookScript, surfaceScript] {
            contentController.addUserScript(WKUserScript(source: source,
                                                         injectionTime: .atDocumentStart,
                                                         forMainFrameOnly: true))
        }
    }

    /// Applies a Play-header theme pick: persists it (UserDefaults — the play
    /// origin's storage is wiped every boot), re-bakes the boot script, and
    /// restyles the running page in place. A played session is never restarted
    /// for a theme change.
    ///
    /// Picking Story Default (nil) stops enforcement and hands `data-theme`
    /// back to the client's own persisted pick — which the client's boot wrote
    /// to the page's storage moments before the chrome overrode it, so the
    /// running page can honor it without a reboot. A fixture page without
    /// client storage simply keeps its current look until the next boot.
    ///
    /// - Parameter themeId: a catalog theme id, or nil for Story Default.
    func applyThemeChoice(_ themeId: String?) {
        themeChoice = themeId
        if let themeId {
            UserDefaults.standard.set(themeId, forKey: Self.themeChoiceDefaultsKey)
        } else {
            UserDefaults.standard.removeObject(forKey: Self.themeChoiceDefaultsKey)
        }
        installUserScripts()
        guard loaded != nil else { return }
        let liveApply = """
        (function () {
          var chrome = window.__sharpeePlayThemeChrome || (window.__sharpeePlayThemeChrome = {});
          chrome.choice = \(Self.javascriptString(themeId));
          if (chrome.choice) {
            document.documentElement.setAttribute('data-theme', chrome.choice);
          } else {
            try {
              var key = Object.keys(localStorage).filter(function (k) { return /theme$/.test(k); })[0];
              var stored = key && localStorage.getItem(key);
              if (stored) document.documentElement.setAttribute('data-theme', stored);
            } catch (e) {}
          }
        })();
        """
        Task { _ = try? await evaluateInPlaySurface(liveApply) }
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
