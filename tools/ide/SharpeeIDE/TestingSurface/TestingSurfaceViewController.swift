// TestingSurfaceViewController.swift
// The testing play surface (ADR-306 Phase 3): a WKWebView hosting the story
// bundle's TESTING page (index-testing.html — same client, no chrome) with
// the IDE's card/segment UI injected over it. Turn-feed records the client
// posts are logged to the D8 session sidecar and forwarded back into the
// page, where the surface renders cards; the page posts its view-state
// snapshots back for the sidecar. Reopening restores by replay: the sidecar's
// live-lineage commands are typed into the client's real input at the pinned
// seed (ADR-305 D1), so cards always show the current build's real output.
// The web view uses a non-persistent store — a testing session never touches
// the Play pane's origin storage, and every load is a guaranteed fresh boot.
// Public interface: load(bundleDirectory:), isLoaded,
// evaluateInSurface(_:), showPlaceholder(_:), sessionStore.
// Owner context: tools/ide — TestingSurface.

import AppKit
import WebKit

final class TestingSurfaceViewController: NSViewController, WKScriptMessageHandler {

    private static let turnEventsHandlerName = "turnEvents"
    private static let stateHandlerName = "testingSurface"
    private static let consoleHandlerName = "testingConsole"

    /// Hooks the page's errors so surface-runtime failures are visible in the
    /// IDE's log (the web view is also inspectable for deeper digging).
    private static let consoleHookScript = """
    (function () {
      function send(text) {
        try { window.webkit.messageHandlers.\(consoleHandlerName).postMessage(String(text)); } catch (e) {}
      }
      var origError = console.error;
      console.error = function () { send(Array.prototype.join.call(arguments, ' ')); origError.apply(console, arguments); };
      window.addEventListener('error', function (e) {
        send((e.message || 'Error') + ((e.error && e.error.stack) ? '\\n' + e.error.stack : ''));
      });
      window.addEventListener('unhandledrejection', function (e) {
        var r = e.reason;
        send(((r && r.message) ? r.message : String(r)) + ((r && r.stack) ? '\\n' + r.stack : ''));
      });
    })();
    """

    /// Loads the surface's own bundle into the testing page once the DOM
    /// exists. The assets resolve under the scheme handler's reserved
    /// `ide-testing-surface/` prefix — IDE resources, never story files.
    private static let assetInjectorScript = """
    (function () {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '\(PlayURLSchemeHandler.testingSurfacePrefix)surface.css';
      document.head.appendChild(link);
      var script = document.createElement('script');
      script.src = '\(PlayURLSchemeHandler.testingSurfacePrefix)surface.js';
      document.body.appendChild(script);
    })();
    """

    /// The document-start boot script: the pinned play seed (ADR-305 D1),
    /// a cleared origin (belt and braces on top of the non-persistent
    /// store), no AudioContext (below), the deliver shim that queues
    /// forwarded records until surface.js loads, and the restore payload
    /// (ADR-306 D8).
    ///
    /// AudioContext is removed BEFORE the client runs because the client
    /// awaits `AudioContext.resume()` on every command, and WebKit resolves
    /// that promise only after a REAL user gesture — the surface's replay
    /// driver types through synthetic events (D8 restore), which are not
    /// gestures, so a real context would hang every replayed command
    /// forever. Without the constructor the client's AudioManager takes its
    /// designed instant-gain fallback: commands run, audio chrome is moot
    /// in a testing session, and replay stays deterministic.
    private static func bootScript(sessionJSON: String) -> String {
        """
        (function () {
          window.__SHARPEE_PLAY_SEED__ = \(PlayViewController.idePlaySeed);
          try { window.AudioContext = undefined; window.webkitAudioContext = undefined; } catch (e) {}
          try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
          window.__sharpeeTestingSurface = {
            q: [],
            deliver: function (record) { this.q.push(record); }
          };
          window.__SHARPEE_TESTING_SESSION__ = \(sessionJSON);
        })();
        """
    }

    private let schemeHandler = PlayURLSchemeHandler()
    private var webView: WKWebView!
    private let placeholder = NSTextField(labelWithString: "Build (⌘B) to open the testing surface")

    /// The app-bundle Resources directory the surface's web bundle resolves
    /// against. Tests inject the repo's checked-in Resources; the app uses
    /// its own bundle.
    private let resourcesURL: URL?

    /// The D8 session sidecar for the loaded story.
    let sessionStore: TestingSessionStore

    /// True until the next feed record, which is a lineage's automatic boot
    /// look — logged with `boot: true` so replay plans can skip it.
    private var expectBoot = true

    /// The bundle directory currently loaded, or nil.
    private var loaded: URL?
    var isLoaded: Bool { loaded != nil }

    init(sessionStore: TestingSessionStore,
         resourcesURL: URL? = Bundle.main.resourceURL) {
        self.sessionStore = sessionStore
        self.resourcesURL = resourcesURL
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("TestingSurfaceViewController is not Storyboard-instantiable")
    }

    override func loadView() {
        let pane = ThemedPane(color: Theme.playBackground)

        let configuration = WKWebViewConfiguration()
        // Isolated and ephemeral: a testing session must never wipe or read
        // the Play pane's origin storage, and D8 restores by replay — never
        // from cached page state.
        configuration.websiteDataStore = .nonPersistent()
        schemeHandler.testingSurfaceDirectory =
            resourcesURL?.appendingPathComponent(TestingSurfaceWebRoot.folderName,
                                                 isDirectory: true)
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: PlayURLSchemeHandler.scheme)
        let contentController = configuration.userContentController
        contentController.add(WeakSurfaceMessageHandler(self), name: Self.turnEventsHandlerName)
        contentController.add(WeakSurfaceMessageHandler(self), name: Self.stateHandlerName)
        contentController.add(WeakSurfaceMessageHandler(self), name: Self.consoleHandlerName)
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isInspectable = true
        webView.translatesAutoresizingMaskIntoConstraints = false

        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
        placeholder.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        placeholder.translatesAutoresizingMaskIntoConstraints = false

        pane.addSubview(webView)
        pane.addSubview(placeholder)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: pane.topAnchor),
            webView.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: pane.bottomAnchor),
            placeholder.centerXAnchor.constraint(equalTo: pane.centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: pane.centerYAnchor),
        ])
        view = pane
        showPlaceholder()
    }

    /// Loads a story bundle's testing page. The page must exist (a bundle
    /// built before ADR-306 Phase 2 has none) and the surface's own web
    /// bundle must have shipped; each absence names its fix. Reads the
    /// sidecar and injects the restore payload (D8) before the page boots.
    func load(bundleDirectory: URL?) {
        guard let bundleDirectory else {
            loaded = nil
            showPlaceholder()
            return
        }
        let page = bundleDirectory.appendingPathComponent("index-testing.html")
        guard FileManager.default.fileExists(atPath: page.path) else {
            loaded = nil
            showPlaceholder("This build has no testing page — rebuild (⌘B) with the current platform")
            return
        }
        guard schemeHandler.testingSurfaceDirectory.map({
            FileManager.default.fileExists(atPath: $0.appendingPathComponent("surface.js").path)
        }) == true else {
            loaded = nil
            showPlaceholder(TestingSurfaceWebRoot.missingNote)
            return
        }

        sessionStore.load()
        expectBoot = true
        installUserScripts(plan: sessionStore.replayPlan())

        loaded = bundleDirectory
        schemeHandler.rootDirectory = bundleDirectory
        placeholder.isHidden = true
        webView.isHidden = false
        let url = URL(string:
            "\(PlayURLSchemeHandler.scheme)://\(PlayURLSchemeHandler.host)/index-testing.html")!
        webView.load(URLRequest(url: url))
    }

    /// (Re)installs the document scripts, baking in the restore payload.
    private func installUserScripts(plan: TestingReplayPlan) {
        let contentController = webView.configuration.userContentController
        contentController.removeAllUserScripts()

        var session: [String: Any] = [:]
        if !plan.replay.isEmpty { session["replay"] = plan.replay }
        if let viewState = plan.viewState { session["snapshot"] = viewState }
        let sessionJSON = (try? JSONSerialization.data(withJSONObject: session))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "{}"

        let starts = [Self.consoleHookScript, Self.bootScript(sessionJSON: sessionJSON)]
        for source in starts {
            contentController.addUserScript(WKUserScript(source: source,
                                                         injectionTime: .atDocumentStart,
                                                         forMainFrameOnly: true))
        }
        contentController.addUserScript(WKUserScript(source: Self.assetInjectorScript,
                                                     injectionTime: .atDocumentEnd,
                                                     forMainFrameOnly: true))
    }

    func showPlaceholder(_ text: String = "Build (⌘B) to open the testing surface") {
        placeholder.stringValue = text
        webView?.isHidden = true
        placeholder.isHidden = false
    }

    /// Evaluates JavaScript in the surface's page — the one door in, used by
    /// record forwarding and the real-path tests alike.
    @discardableResult
    func evaluateInSurface(_ script: String) async throws -> Any? {
        try await webView.evaluateJavaScript(script)
    }

    /// Forwards one feed record (as posted — raw JSON) into the page. JSON is
    /// a valid JS literal except U+2028/U+2029, which are escaped first.
    private func forwardToSurface(recordJSON: String) {
        let literal = recordJSON
            .replacingOccurrences(of: "\u{2028}", with: "\\u2028")
            .replacingOccurrences(of: "\u{2029}", with: "\\u2029")
        let script = "window.__sharpeeTestingSurface && window.__sharpeeTestingSurface.deliver(\(literal));"
        Task { _ = try? await evaluateInSurface(script) }
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case Self.turnEventsHandlerName:
            guard let body = message.body as? String,
                  let data = body.data(using: .utf8),
                  let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
                return
            }
            if object["restart"] as? Bool == true {
                sessionStore.append(["fence": true])
                expectBoot = true
            } else if let command = object["command"] as? String {
                sessionStore.append(["command": command, "boot": expectBoot])
                expectBoot = false
            } else {
                return
            }
            forwardToSurface(recordJSON: body)
        case Self.stateHandlerName:
            guard let body = message.body as? String,
                  let data = body.data(using: .utf8),
                  let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                  let state = object["state"] as? [String: Any] else { return }
            sessionStore.updateViewState(state)
        case Self.consoleHandlerName:
            if let text = message.body as? String {
                NSLog("[testing-surface] %@", text)
            }
        default:
            break
        }
    }
}

/// Forwards script messages weakly — `WKUserContentController.add` retains its
/// handler strongly, which would otherwise cycle through the configuration.
private final class WeakSurfaceMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var delegate: WKScriptMessageHandler?
    init(_ delegate: WKScriptMessageHandler) { self.delegate = delegate }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(controller, didReceive: message)
    }
}
