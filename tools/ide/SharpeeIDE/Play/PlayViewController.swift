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
// Play-to-write (ADR-333 D4): ⌘-clicking a rendered paragraph posts its
// `data-message-id` (D3) and the session's command history over the
// `playEdit` bridge; after the build a save triggers, the reload replays that
// history through the client's own input and brings the paragraph back into
// view. The history lives here and nowhere else (D4b).
// Public interface: load(bundleDirectory:), reloadAfterBuild(bundleDirectory:replaying:),
// restart(), invalidateForSourceChange(), showUnplayable(reason:), isLoaded,
// playAfterBuild, onPlayAfterBuildChanged, onConsoleError, onEditRequest,
// replay(_:), evaluateInPlaySurface(_:), themeChoice, applyThemeChoice(_:)
// (Phase 6b — the play-surface theme picker, IDE chrome persisted in
// UserDefaults), idePlaySeed (ADR-305 D1).
// Owner context: tools/ide — Play.

import AppKit
import WebKit

/// What a ⌘-click on a rendered paragraph reports (ADR-333 D4).
struct PlayEditRequest: Equatable {
    /// The paragraph's `data-message-id` — the phrase or platform message that wrote it.
    let messageId: String
    /// The turn the paragraph was rendered in, when the client stamped one.
    let turn: Int?
    /// The paragraph's rendered text.
    let text: String
    /// Every command typed since boot, in order — read off the page at the click.
    let history: [String]
    /// The facts the paragraph's source carried (`data-source-facts`, ADR-333
    /// D1 as amended): who a reply was about and what it concerned, as
    /// strings. Empty when the paragraph carried none.
    let facts: [String: String]
    /// ⌥ was held: the author wants the platform line changed EVERYWHERE
    /// (D4a's override), not the character's own answer (D4d).
    let overrideEverywhere: Bool
    /// ⇧ was held: "go to this code" — open the editor at the source and
    /// show no field (David, 2026-09-06).
    let goToSource: Bool

    init(messageId: String, turn: Int?, text: String, history: [String],
         facts: [String: String] = [:], overrideEverywhere: Bool = false, goToSource: Bool = false) {
        self.messageId = messageId
        self.turn = turn
        self.text = text
        self.history = history
        self.facts = facts
        self.overrideEverywhere = overrideEverywhere
        self.goToSource = goToSource
    }
}

/// An inline edit Play is asked to open (ADR-333 D4c): the paragraph, by id
/// and turn, and the template text the field starts with — the source as the
/// author wrote it, braces and all, never the rendered text.
struct PlayInlineEdit: Equatable {
    let messageId: String
    let turn: Int?
    let template: String
}

/// What the inline field reports when the author commits (Enter): the
/// paragraph, the new template text, and the command history at that moment.
struct PlayInlineCommit: Equatable {
    let messageId: String
    let turn: Int?
    let text: String
    let history: [String]
}

/// A stub the current path printed (ADR-333 D6): the paragraph's message id,
/// its turn, and its text. The marker's spelling is an IDE convenience, never
/// a platform contract.
struct PlayStub: Equatable {
    let messageId: String
    let turn: Int?
    let text: String
}

/// Why a replay could not start.
enum PlayToWriteReplayError: Error, Equatable {
    /// The page never exposed the play-to-write chrome — nothing loaded.
    case surfaceNeverLoaded
}

final class PlayViewController: NSViewController, WKScriptMessageHandler, WKNavigationDelegate {

    private static let consoleHandlerName = "playConsole"
    private static let editHandlerName = "playEdit"
    private static let commitHandlerName = "playEditCommit"

    /// Play-to-write chrome (ADR-333 D4), injected at document start:
    /// - a capture-phase ⌘-click on any `[data-message-id]` element posts the
    ///   id, its turn, its text, the command history (the `.command-echo`
    ///   lines, `> ` stripped), the paragraph's facts, and which modifiers
    ///   rode along (⌥ = override everywhere, ⇧ = go to this code) over the
    ///   `playEdit` bridge; a plain click stays the client's (reading,
    ///   selecting, refocusing the input);
    /// - `window.__sharpeePlayToWrite.replay(commands)` types each command
    ///   into the client's `#command-input` the way the testing surface does
    ///   and resolves when every turn has rendered (the echo gains its
    ///   `data-turn` stamp when the client closes the turn — ADR-305 D4);
    /// - `focus(messageId)` scrolls the last paragraph carrying the id into
    ///   view and marks it briefly;
    /// - `beginInlineEdit(messageId, turn, template)` (ADR-333 D4c) swaps the
    ///   paragraph's content for a text field holding the TEMPLATE (the
    ///   source, braces and all); Enter posts the new text and the history
    ///   over the `playEditCommit` bridge and restores the paragraph, Shift-
    ///   Enter inserts a line break, Escape restores without posting.
    private static let playToWriteScript = """
    (function () {
      var style = document.createElement('style');
      style.textContent = '.sharpee-play-to-write-focus { outline: 2px solid rgba(255, 170, 0, 0.9); outline-offset: 3px; }'
        + ' .sharpee-play-inline-edit { display: block; box-sizing: border-box; width: 100%; margin: 0; padding: 2px 4px;'
        + ' font: inherit; color: inherit; line-height: inherit; background: rgba(255, 170, 0, 0.08);'
        + ' border: 1px solid rgba(255, 170, 0, 0.9); border-radius: 3px; outline: none; resize: none; overflow: hidden; }'
        + ' .sharpee-play-notice { position: fixed; top: 8px; left: 50%; transform: translateX(-50%); max-width: 80%; z-index: 1000;'
        + ' padding: 6px 12px; font: inherit; font-size: 12px; color: #fff; background: rgba(170, 40, 40, 0.95);'
        + ' border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }';
      document.documentElement.appendChild(style);
      function history() {
        return Array.prototype.map.call(document.querySelectorAll('.command-echo'), function (el) {
          return (el.textContent || '').replace(/^>\\s?/, '');
        });
      }
      document.addEventListener('click', function (e) {
        if (!e.metaKey) return;
        var target = e.target && e.target.closest ? e.target.closest('[data-message-id]') : null;
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        var turn = target.getAttribute('data-turn');
        var facts = {};
        try { facts = JSON.parse(target.getAttribute('data-source-facts') || '{}') || {}; } catch (e2) { facts = {}; }
        try {
          window.webkit.messageHandlers.\(editHandlerName).postMessage(JSON.stringify({
            messageId: target.getAttribute('data-message-id'),
            turn: turn === null ? null : Number(turn),
            text: target.textContent || '',
            history: history(),
            facts: facts,
            overrideEverywhere: !!e.altKey,
            goToSource: !!e.shiftKey
          }));
        } catch (err) {}
      }, true);
      function wait(predicate, timeoutMs) {
        return new Promise(function (resolve, reject) {
          var start = Date.now();
          (function tick() {
            if (predicate()) return resolve();
            if (Date.now() - start > timeoutMs) return reject(new Error('play-to-write: timed out waiting for the story'));
            setTimeout(tick, 25);
          })();
        });
      }
      function input() { return document.getElementById('command-input'); }
      function closedTurns() { return document.querySelectorAll('.command-echo[data-turn]').length; }
      function settled() {
        var slot = document.getElementById('text-content');
        var count = slot ? slot.children.length : 0;
        return new Promise(function (resolve) {
          setTimeout(function () {
            var now = slot ? slot.children.length : 0;
            resolve(now === count && now > 0);
          }, 150);
        });
      }
      function bootReady() {
        return wait(function () { return !!input() && !!document.querySelector('.main-entry'); }, 20000)
          .then(function settle() { return settled().then(function (ok) { return ok ? undefined : settle(); }); });
      }
      window.__sharpeePlayToWrite = {
        replay: function (commands) {
          // The replay's own account of itself, for a test's failure message.
          window.__sharpeePlayToWriteLast = { commands: Array.prototype.slice.call(commands || []), state: 'waiting' };
          return bootReady().then(function () {
            window.__sharpeePlayToWriteLast.state = 'ready';
            var chain = Promise.resolve();
            commands.forEach(function (command) {
              chain = chain.then(function () {
                var before = closedTurns();
                var el = input();
                el.value = command;
                el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                return wait(function () { return closedTurns() > before; }, 30000);
              });
            });
            return chain;
          });
        },
        focus: function (messageId) {
          var all = document.querySelectorAll('[data-message-id="' + messageId + '"]');
          var last = all[all.length - 1];
          if (!last) return false;
          last.scrollIntoView({ block: 'center' });
          last.classList.add('sharpee-play-to-write-focus');
          setTimeout(function () { last.classList.remove('sharpee-play-to-write-focus'); }, 2500);
          return true;
        },
        notice: function (text) {
          var old = document.querySelector('.sharpee-play-notice');
          if (old) old.remove();
          var el = document.createElement('div');
          el.className = 'sharpee-play-notice';
          el.setAttribute('role', 'alert');
          el.textContent = text;
          document.body.appendChild(el);
          setTimeout(function () { el.remove(); }, 8000);
          return true;
        },
        beginInlineEdit: function (messageId, turn, template) {
          var selector = '[data-message-id="' + messageId + '"]';
          if (turn !== null && turn !== undefined) selector += '[data-turn="' + turn + '"]';
          var all = document.querySelectorAll(selector);
          var p = all[all.length - 1];
          if (!p) return false;
          if (p.__sharpeeInlineField) { p.__sharpeeInlineField.focus(); return true; }
          var original = Array.prototype.slice.call(p.childNodes);
          var field = document.createElement('textarea');
          field.className = 'sharpee-play-inline-edit';
          field.setAttribute('aria-label', 'Edit this text');
          field.value = template;
          function grow() {
            field.style.height = 'auto';
            field.style.height = Math.max(field.scrollHeight, 20) + 'px';
          }
          function restore() {
            if (!p.__sharpeeInlineField) return;
            delete p.__sharpeeInlineField;
            field.remove();
            original.forEach(function (node) { p.appendChild(node); });
            var input = document.getElementById('command-input');
            if (input) input.focus();
          }
          field.addEventListener('input', grow);
          field.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); restore(); return; }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault(); e.stopPropagation();
              var text = field.value;
              restore();
              try {
                window.webkit.messageHandlers.\(commitHandlerName).postMessage(JSON.stringify({
                  messageId: messageId,
                  turn: turn === null || turn === undefined ? null : Number(turn),
                  text: text,
                  history: history()
                }));
              } catch (err) {}
            }
          });
          // Keystrokes and clicks belong to the field, not the client: its
          // document-level click handler refocuses the command input, which
          // would make the field impossible to click back into.
          field.addEventListener('keyup', function (e) { e.stopPropagation(); });
          field.addEventListener('keypress', function (e) { e.stopPropagation(); });
          ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup'].forEach(function (type) {
            field.addEventListener(type, function (e) { e.stopPropagation(); });
          });
          while (p.firstChild) p.removeChild(p.firstChild);
          p.appendChild(field);
          p.__sharpeeInlineField = field;
          p.scrollIntoView({ block: 'center' });
          grow();
          field.focus();
          field.setSelectionRange(field.value.length, field.value.length);
          return true;
        }
      };
    })();
    """

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

    /// Fired when the author ⌘-clicks a rendered paragraph (ADR-333 D4) — the
    /// window resolves the id and opens the editor, or asks for the inline field.
    var onEditRequest: ((PlayEditRequest) -> Void)?

    /// Fired when the inline field commits (ADR-333 D4c) — the window writes
    /// the text into the source and finishes the round.
    var onInlineCommit: ((PlayInlineCommit) -> Void)?

    /// Opens the inline field on the paragraph the edit names, prefilled with
    /// its template. Nothing happens when the paragraph is not on the page.
    func beginInlineEdit(_ edit: PlayInlineEdit) {
        Task { [weak self] in
            guard let self else { return }
            _ = try? await self.beginInlineEditInPlaySurface(edit)
        }
    }

    /// Shows a short notice at the top of the play log — the reason an edit
    /// did not happen, where the author is looking. Fades on its own.
    func showNotice(_ text: String) {
        NSLog("play: %@", text)
        Task { [weak self] in
            guard let self else { return }
            _ = try? await self.evaluateInPlaySurface(
                "window.__sharpeePlayToWrite && window.__sharpeePlayToWrite.notice(\(Self.javascriptString(text)))")
        }
    }

    /// The awaitable form: true when the field opened. Tests drive it directly.
    @discardableResult
    func beginInlineEditInPlaySurface(_ edit: PlayInlineEdit) async throws -> Bool {
        try await waitForPlaySurfaceChrome()
        let turn = edit.turn.map(String.init) ?? "null"
        let result = try await evaluateInPlaySurface(
            "window.__sharpeePlayToWrite.beginInlineEdit(\(Self.javascriptString(edit.messageId)), \(turn), \(Self.javascriptString(edit.template)))")
        return result as? Bool ?? false
    }

    /// The replay the next finished load performs (ADR-333 D4): set by
    /// `reloadAfterBuild(bundleDirectory:replaying:)`, consumed once.
    private var pendingReplay: PlayToWriteSession?

    /// Fired after every replay with the stubs the path printed (ADR-333 D6),
    /// in play order — the header lists them too.
    var onStubsListed: (([PlayStub]) -> Void)?

    /// The commands the last replay typed — a stub picked from the header
    /// reports them as its history, so the round replays the same path.
    private(set) var lastReplayHistory: [String] = []

    /// The text a stub paragraph starts with. IDE convenience (D6).
    static let stubMarker = "(TODO during play-testing"

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
        contentController.add(WeakScriptMessageHandler(self), name: Self.editHandlerName)
        contentController.add(WeakScriptMessageHandler(self), name: Self.commitHandlerName)
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        // right-click → Inspect Element to debug the running story. Guarded
        // rather than gating the app: it runs on every Apple silicon Mac.
        if #available(macOS 13.3, *) { webView.isInspectable = true }
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
        header.onStubSelected = { [weak self] stub in
            guard let self else { return }
            self.onEditRequest?(PlayEditRequest(messageId: stub.messageId, turn: stub.turn,
                                                text: stub.text, history: self.lastReplayHistory))
        }

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
        header.setStubs([])
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
        for source in [Self.consoleHookScript, surfaceScript, Self.playToWriteScript] {
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
    ///
    /// - Parameter session: a play-to-write round to finish (ADR-333 D4): once
    ///   the fresh page has booted at the fixed seed, its history is typed back
    ///   in and the edited paragraph brought into view. Dropped when the toggle
    ///   keeps the pane from loading.
    func reloadAfterBuild(bundleDirectory: URL, replaying session: PlayToWriteSession? = nil) {
        isAwaitingRebuild = false
        pendingReplay = nil
        guard playAfterBuild else { return }
        load(bundleDirectory: bundleDirectory)
        pendingReplay = isLoaded ? session : nil
    }

    /// Types `session.history` into the running story through the client's own
    /// input, one turn at a time, then scrolls the session's paragraph into
    /// view and lists the stubs the path printed (D6). The same door a
    /// finished reload uses; tests drive it directly.
    ///
    /// - Throws: whatever the page reports — a dead page, or the story never
    ///   rendering a turn within the script's timeout.
    func replay(_ session: PlayToWriteSession) async throws {
        try await waitForPlaySurfaceChrome()
        try await callAsyncInPlaySurface(
            "return window.__sharpeePlayToWrite.replay(commands).then(function () { return true; });",
            arguments: ["commands": session.history])
        lastReplayHistory = session.history
        if !session.messageId.isEmpty {
            _ = try await evaluateInPlaySurface(
                "window.__sharpeePlayToWrite.focus(\(Self.javascriptString(session.messageId)))")
        }
        let stubs = try await listStubs()
        header.setStubs(stubs)
        onStubsListed?(stubs)
    }

    /// Steps the story through a root-to-leaf path from a fresh boot (ADR-333
    /// D5): a loaded story restarts at the pinned seed and types the commands;
    /// an unloaded pane loads the bundle first. Nothing happens without one.
    func play(path commands: [String], bundleDirectory: URL?) {
        let session = PlayToWriteSession(messageId: "", history: commands)
        if isLoaded {
            pendingReplay = session
            webView.reloadFromOrigin()
        } else if let bundleDirectory {
            load(bundleDirectory: bundleDirectory)
            pendingReplay = isLoaded ? session : nil
        }
    }

    /// The stubs the page has printed so far, in document order: every
    /// `[data-message-id]` paragraph whose text starts with the marker.
    func listStubs() async throws -> [PlayStub] {
        let raw = try await evaluateInPlaySurface("""
        Array.prototype.map.call(document.querySelectorAll('[data-message-id]'), function (p) {
          return [p.getAttribute('data-message-id'), p.getAttribute('data-turn'), (p.textContent || '').trim()];
        }).filter(function (row) { return row[2].indexOf(\(Self.javascriptString(Self.stubMarker))) === 0; })
        """)
        return ((raw as? [[Any?]]) ?? []).compactMap { row in
            guard let id = row[0] as? String else { return nil }
            let turn = (row[1] as? String).flatMap(Int.init)
            return PlayStub(messageId: id, turn: turn, text: row[2] as? String ?? "")
        }
    }

    /// Runs a function body in the page and settles on the promise it RETURNS.
    /// A promise never crosses `evaluateJavaScript`, and WebKit's Swift async
    /// overlay of `callAsyncJavaScript` was observed (2026-09-05) to return
    /// before the promise settled — so this is the completion-handler form
    /// under a continuation, which does wait.
    private func callAsyncInPlaySurface(_ body: String, arguments: [String: Any]) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            webView.callAsyncJavaScript(body, arguments: arguments, in: nil, in: .page) { result in
                switch result {
                case .success: continuation.resume(returning: ())
                case .failure(let error): continuation.resume(throwing: error)
                }
            }
        }
    }

    /// Waits for the document-start chrome to be present on the CURRENT page —
    /// a replay asked for right after `load` would otherwise run against the
    /// page being left.
    private func waitForPlaySurfaceChrome() async throws {
        for _ in 0..<400 {
            if let present = try? await evaluateInPlaySurface("typeof window.__sharpeePlayToWrite === 'object'"),
               present as? Bool == true { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        throw PlayToWriteReplayError.surfaceNeverLoaded
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard let session = pendingReplay else { return }
        pendingReplay = nil
        Task { [weak self] in
            do {
                try await self?.replay(session)
            } catch {
                let text = "play-to-write replay failed: \(error.localizedDescription)"
                self?.onConsoleError?(PlayConsoleError(message: text, frames: [],
                                                       translation: SharpeeErrorTranslator.translate(message: text)))
            }
        }
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
        case Self.editHandlerName:
            guard let json = message.body as? String,
                  let data = json.data(using: .utf8),
                  let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let messageId = object["messageId"] as? String, !messageId.isEmpty else { return }
            var facts: [String: String] = [:]
            for (key, value) in (object["facts"] as? [String: Any]) ?? [:] {
                if let s = value as? String { facts[key] = s } else if let n = value as? NSNumber { facts[key] = n.stringValue }
            }
            let request = PlayEditRequest(
                messageId: messageId,
                turn: object["turn"] as? Int,
                text: object["text"] as? String ?? "",
                history: (object["history"] as? [Any])?.compactMap { $0 as? String } ?? [],
                facts: facts,
                overrideEverywhere: object["overrideEverywhere"] as? Bool ?? false,
                goToSource: object["goToSource"] as? Bool ?? false)
            onEditRequest?(request)
        case Self.commitHandlerName:
            guard let json = message.body as? String,
                  let data = json.data(using: .utf8),
                  let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let messageId = object["messageId"] as? String, !messageId.isEmpty else { return }
            onInlineCommit?(PlayInlineCommit(
                messageId: messageId,
                turn: object["turn"] as? Int,
                text: object["text"] as? String ?? "",
                history: (object["history"] as? [Any])?.compactMap { $0 as? String } ?? []))
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
