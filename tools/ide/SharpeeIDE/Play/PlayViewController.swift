// PlayViewController.swift
// The Play pane: a header (status / Restart / "Play after build") over a WKWebView that
// embeds the story's self-contained browser client (dist/web/<story>/, served via a
// custom scheme), or a placeholder when no bundle is built.
// Public interface: load(projectRoot:), reloadAfterBuild(projectRoot:), restart(),
// playAfterBuild, onPlayAfterBuildChanged.
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

    /// Captures turns while the header's Record toggle is active (ADR-277 D5).
    let recording = RecordingSession()

    /// Where the save panel opens for a recorded transcript — the open story's
    /// `tests/` directory; set by the project-load path.
    var recordingSaveDirectory: URL?

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
        contentController.addUserScript(WKUserScript(source: Self.consoleHookScript,
                                                     injectionTime: .atDocumentStart,
                                                     forMainFrameOnly: true))
        contentController.add(WeakScriptMessageHandler(self), name: Self.consoleHandlerName)
        contentController.add(WeakScriptMessageHandler(self), name: Self.turnEventsHandlerName)
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isInspectable = true // right-click → Inspect Element to debug the running story
        webView.translatesAutoresizingMaskIntoConstraints = false

        header.translatesAutoresizingMaskIntoConstraints = false
        header.onRestart = { [weak self] in self?.restart() }
        header.onRecordToggle = { [weak self] in self?.toggleRecording() }
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
    func load(bundleDirectory: URL?) {
        guard let bundleDirectory,
              FileManager.default.fileExists(
                  atPath: bundleDirectory.appendingPathComponent("index.html").path) else {
            loaded = nil
            showPlaceholder(Self.notBuiltPlaceholder)
            return
        }
        loaded = bundleDirectory
        PlayErrorSymbolicator.clearCache() // the bundle (and its source map) may have just rebuilt
        schemeHandler.rootDirectory = bundleDirectory
        placeholder.isHidden = true
        webView.isHidden = false
        header.setLoaded(true)
        let url = URL(string: "\(PlayURLSchemeHandler.scheme)://\(PlayURLSchemeHandler.host)/index.html")!
        webView.load(URLRequest(url: url))
    }

    /// Shows an explicit "cannot play" state (e.g. a grammar-header file — not a
    /// story, no `dist/web/<id>` exists for it; ADR-258 D2).
    func showUnplayable(reason: String) {
        loaded = nil
        showPlaceholder(reason)
    }

    /// A source edit invalidated the running surface (David's ruling: the play
    /// surface renders a PARTICULAR build; diverged source clears it whole).
    /// Clears the play origin's localStorage first — the client's autosave
    /// restore-on-start would otherwise replay the stale world over the next
    /// boot (the playground-autosave failure mode) — then unloads to an
    /// explicit "build to play" state. No-op when nothing is loaded.
    func invalidateForSourceChange() {
        guard isLoaded else { return }
        // Clear storage FIRST (on the still-loaded origin), then tear the page
        // down — navigating immediately could cancel the script, and a merely
        // hidden page would keep running its turn timers.
        webView.evaluateJavaScript("try { localStorage.clear() } catch (e) {}") { [weak self] _, _ in
            self?.webView.load(URLRequest(url: URL(string: "about:blank")!))
        }
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

    private static let notBuiltPlaceholder = "Build (⌘B) to play the story"

    private func showPlaceholder(_ text: String = PlayViewController.notBuiltPlaceholder) {
        placeholder.stringValue = text
        webView.isHidden = true
        placeholder.isHidden = false
        header.setLoaded(false)
    }

    // MARK: - Recording (ADR-277 D5)

    /// Record ⇄ Stop. Stopping with captured turns offers the save panel;
    /// stopping an empty capture just resets the toggle.
    private func toggleRecording() {
        if recording.isRecording {
            recording.stop()
            header.setRecording(false)
            if !recording.turns.isEmpty { saveRecording() }
        } else {
            recording.start()
            header.setRecording(true)
        }
    }

    /// Writes the captured session as a draft `.transcript` where the author
    /// chooses (defaulting into the story's `tests/`), then announces it so
    /// the Tests panel re-discovers.
    private func saveRecording() {
        guard let window = view.window else { return }
        let panel = NSSavePanel()
        panel.title = "Save Recorded Transcript"
        panel.nameFieldStringValue = "recorded.transcript"
        if let dir = recordingSaveDirectory {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            panel.directoryURL = dir
        }
        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self, response == .OK, let url = panel.url else { return }
            do {
                try self.writeRecording(to: url)
            } catch {
                let alert = NSAlert()
                alert.messageText = "Could not save the transcript"
                alert.informativeText = error.localizedDescription
                alert.alertStyle = .warning
                alert.beginSheetModal(for: window, completionHandler: nil)
            }
        }
    }

    /// Serializes the captured session to `url` and announces it (the panel
    /// flow's write half, split out so tests drive the real write + announce
    /// without an NSSavePanel).
    func writeRecording(to url: URL) throws {
        let title = url.deletingPathExtension().lastPathComponent
        try recording.serialize(title: "Recorded: \(title)")
            .write(to: url, atomically: true, encoding: .utf8)
        onTranscriptRecorded?(url)
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case Self.turnEventsHandlerName:
            guard let body = message.body as? String,
                  let data = body.data(using: .utf8),
                  let turn = try? JSONDecoder().decode(TurnEventBody.self, from: data) else { return }
            recording.record(command: turn.command, response: turn.response)
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
