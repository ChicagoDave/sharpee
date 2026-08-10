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
// Public interface: load(bundleDirectory:), isLoaded, testsDirectory,
// storyFile, saveDocuments, policy, evaluateInSurface(_:),
// showPlaceholder(_:), sessionStore.
// Owner context: tools/ide — TestingSurface.

import AppKit
import WebKit

final class TestingSurfaceViewController: NSViewController, WKScriptMessageHandler, TestRunnerDelegate {

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
    ///
    /// confirm() is stubbed true for the same class of reason (Phase 5): a
    /// WKWebView with no UI delegate answers every confirm() false, so a
    /// typed `restart` — the branch driver's fresh-boot door, and a
    /// legitimate author command (ADR-305 D3) — would silently do nothing.
    /// A testing session has no unsaved progress worth a modal guard.
    private static func bootScript(sessionJSON: String) -> String {
        """
        (function () {
          window.__SHARPEE_PLAY_SEED__ = \(PlayViewController.idePlaySeed);
          try { window.AudioContext = undefined; window.webkitAudioContext = undefined; } catch (e) {}
          try { window.confirm = function () { return true; }; } catch (e) {}
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

    /// The project's `tests/` directory — where the auto-save writer lands
    /// (design §4). Set by the opener before load; nil disables writes.
    var testsDirectory: URL?

    /// The story file the run column's runs execute against (design §7).
    /// Set by the opener before load; nil disables the Run button's work.
    var storyFile: URL?

    /// Saves the IDE's open documents before a run — the run reads DISK.
    /// Returns false to abort the run. Set by the opener; nil = nothing to save.
    var saveDocuments: (() -> Bool)?

    /// The run column's child `sharpee test --tree --json` process (§7).
    private let testRunner = TestRunner()

    /// Overrides run-executable resolution — the real-path suite injects the
    /// repo's devkit CLI, because a temp-dir story resolves neither a
    /// workspace shim nor a PATH install. Production leaves it nil and
    /// resolves via the workspace shim / PATH / bundled toolchain tiers.
    var sharpeeExecutableOverride: URL?

    /// True while a run column run is in flight — drives the Test menu.
    var isRunningTests: Bool { testRunner.isRunning }

    /// Test → Cancel Test Run: SIGTERM then SIGKILL; rows already filled stay.
    func cancelTestRun() {
        testRunner.cancel()
    }

    /// The surface's default synthesis policy when the story declares no
    /// `auto-assertion:` line (David's ruling 2026-08-09, "not working" on a
    /// policy-less story): the authoring surface shows useful assertions by
    /// default — an explicit header line still wins. Runner semantics are
    /// untouched: the files carry explicit tags either way.
    static let defaultPolicy = "room-name-and-description"

    /// The story's `auto-assertion:` policy raw value, read from the story
    /// header at open; injected for in-page synthesis (6e).
    var policy: String?

    /// True until the next feed record, which is a lineage's automatic boot
    /// look — logged with `boot: true` so replay plans can skip it.
    private var expectBoot = true

    /// Set when the page pre-announces a driver fork/switch boot (Phase 5):
    /// the next restart fence logs as `fork: true` — a fresh lineage the
    /// linear replay plan must never cross, not a dead one.
    private var nextFenceIsFork = false

    /// The bundle directory currently loaded, or nil.
    private var loaded: URL?
    var isLoaded: Bool { loaded != nil }

    init(sessionStore: TestingSessionStore,
         resourcesURL: URL? = Bundle.main.resourceURL) {
        self.sessionStore = sessionStore
        self.resourcesURL = resourcesURL
        super.init(nibName: nil, bundle: nil)
        testRunner.delegate = self
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
        if let policy { session["policy"] = policy }
        // Every `tests/*.transcript` rides along by stem (Phase 5): closed
        // segments re-hydrate their claims from these — the files are the
        // truth, the sidecar carries only pointers (ADR-306 D8).
        let files = transcriptFiles()
        if !files.isEmpty { session["files"] = files }
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

    /// Every transcript in the project's `tests/` by stem — the restore
    /// payload's re-hydration source.
    private func transcriptFiles() -> [String: String] {
        guard let testsDirectory,
              let files = try? FileManager.default.contentsOfDirectory(
                  at: testsDirectory, includingPropertiesForKeys: nil) else { return [:] }
        var byStem: [String: String] = [:]
        for file in files where file.pathExtension == "transcript" {
            if let content = try? String(contentsOf: file, encoding: .utf8) {
                byStem[file.deletingPathExtension().lastPathComponent] = content
            }
        }
        return byStem
    }

    // MARK: - The auto-save writer (design §4)

    /// A transcript stem the page derived — path-safe by construction
    /// (slugified), but verified anyway: a name with a separator writes
    /// nowhere.
    private func transcriptURL(stem: String) -> URL? {
        guard let testsDirectory,
              !stem.isEmpty,
              !stem.contains("/"), !stem.contains("\\"), !stem.contains("..") else { return nil }
        return testsDirectory.appendingPathComponent(stem + ".transcript")
    }

    /// Writes one composed transcript; a rename deletes the old file and
    /// cascades `continues:` in every child (the stem is the reference —
    /// ADR-302 D14's mechanical rename, IDE-side over `tests/`).
    private func performWrite(name: String, text: String, previousName: String?) {
        guard let url = transcriptURL(stem: name) else { return }
        try? FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? text.data(using: .utf8)?.write(to: url, options: .atomic)
        if let previousName, previousName != name,
           let previousURL = transcriptURL(stem: previousName) {
            try? FileManager.default.removeItem(at: previousURL)
            cascadeContinues(from: previousName, to: name)
        }
    }

    /// The auto-save mirror of a segment the author removed (untick, merge,
    /// reopened range): its file goes; children keep their `continues:` and
    /// surface the dangling parent in the tab's run, visibly.
    private func performRemove(name: String) {
        guard let url = transcriptURL(stem: name) else { return }
        try? FileManager.default.removeItem(at: url)
    }

    /// Rewrites `continues: old` header lines to the new stem in every
    /// transcript under `tests/` — header lines only (before `---`).
    private func cascadeContinues(from oldStem: String, to newStem: String) {
        guard let testsDirectory,
              let files = try? FileManager.default.contentsOfDirectory(
                  at: testsDirectory, includingPropertiesForKeys: nil) else { return }
        for file in files where file.pathExtension == "transcript" {
            guard let content = try? String(contentsOf: file, encoding: .utf8) else { continue }
            var lines = content.components(separatedBy: "\n")
            var changed = false
            for index in lines.indices {
                if lines[index].trimmingCharacters(in: .whitespaces) == "---" { break }
                if lines[index].trimmingCharacters(in: .whitespaces) == "continues: \(oldStem)" {
                    lines[index] = "continues: \(newStem)"
                    changed = true
                }
            }
            if changed {
                try? lines.joined(separator: "\n").data(using: .utf8)?
                    .write(to: file, options: .atomic)
            }
        }
    }

    // MARK: - The run column (design §7)

    /// Runs the project's whole tree — the same `sharpee test --tree --json`
    /// the Testing tab runs — and relays the stream into the page, which owns
    /// decoding (DEVARCH 8b). One run at a time; the page's button already
    /// guards, and this guard makes the property true rather than assumed.
    private func startTestRun() {
        guard !testRunner.isRunning else { return }
        guard let storyFile else {
            relayRunExit(ok: false, note: "No story file is wired to the surface — reopen the window.")
            return
        }
        // The run reads disk; unsaved story edits would silently test stale
        // source (the Testing tab's rule, same reason).
        guard saveDocuments?() != false else {
            relayRunExit(ok: false, note: "A document could not be saved, so the run did not start.")
            return
        }
        if let executable = sharpeeExecutableOverride {
            // Through `env node`, not exec'd directly: a freshly compiled
            // dist/cli.js carries no execute bit (the tab's real-path suite
            // spawns it the same way).
            testRunner.start(executable: URL(fileURLWithPath: "/usr/bin/env"),
                             arguments: ["node", executable.path]
                                + TestRunner.treeRunArguments(storyPath: storyFile.path),
                             workingDirectory: storyFile.deletingLastPathComponent(),
                             environment: ShellEnvironment.buildEnvironment())
        } else {
            testRunner.runTests(storyFile: storyFile)
        }
    }

    /// Forwards one raw NDJSON line into the page's run column.
    private func relayRunLine(_ line: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: line, options: .fragmentsAllowed),
              let literal = String(data: data, encoding: .utf8) else { return }
        let script = "window.__sharpeeTestingSurface && window.__sharpeeTestingSurface.runLine && window.__sharpeeTestingSurface.runLine(\(literal));"
        Task { _ = try? await evaluateInSurface(script) }
    }

    private func relayRunExit(ok: Bool, note: String? = nil) {
        var arguments = ok ? "true" : "false"
        if let note,
           let data = try? JSONSerialization.data(withJSONObject: note, options: .fragmentsAllowed),
           let literal = String(data: data, encoding: .utf8) {
            arguments += ", \(literal)"
        }
        let script = "window.__sharpeeTestingSurface && window.__sharpeeTestingSurface.runExit && window.__sharpeeTestingSurface.runExit(\(arguments));"
        Task { _ = try? await evaluateInSurface(script) }
    }

    // MARK: - TestRunnerDelegate (the run column's stream)

    func runner(_ runner: TestRunner, didReceiveLine line: String) {
        relayRunLine(line)
    }

    func runner(_ runner: TestRunner, didEmitStderr text: String) {
        // Diagnostics stay out of the column; a stream-less death is caught
        // by didExit below, with the exit code.
    }

    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State) {
        // The page drives its own button state off the stream and runExit.
    }

    func runner(_ runner: TestRunner, didExit result: TestRunner.Result) {
        relayRunExit(ok: result.state == .passed,
                     note: result.state == .passed
                        ? nil
                        : "The run exited \(result.exitCode) — see the Testing tab for the full report.")
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
                sessionStore.append(nextFenceIsFork
                    ? ["fence": true, "fork": true]
                    : ["fence": true])
                nextFenceIsFork = false
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
                  let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return }
            if object["forkBoot"] as? Bool == true {
                nextFenceIsFork = true
            }
            if let state = object["state"] as? [String: Any] {
                sessionStore.updateViewState(state)
            }
            if let write = object["write"] as? [String: Any],
               let name = write["name"] as? String,
               let text = write["text"] as? String {
                performWrite(name: name, text: text,
                             previousName: write["previousName"] as? String)
            }
            if let remove = object["remove"] as? [String: Any],
               let name = remove["name"] as? String {
                performRemove(name: name)
            }
            if object["run"] as? Bool == true {
                startTestRun()
            }
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
