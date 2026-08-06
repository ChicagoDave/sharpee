// TestingTabViewController.swift
// The Testing tab (ADR-301 D1): a WKWebView over the IDE's own bundled web
// surface, served on sharpee-test://. Swift's whole job here is transport — it
// forwards the raw NDJSON lines of `sharpee test --json` into the page and
// carries the page's requests back out (open this file at this line, start a
// run, remember the view mode). It never decodes the stream: the page imports
// @sharpee/ide-protocol directly, which is what retires the Swift mirror that
// could silently disagree with the wire (DEVARCH 8b).
// Lines are coalesced per runloop turn rather than evaluated one at a time — a
// chain run emits over nine hundred, and nine hundred round trips into the web
// view is a cost with nothing to show for it.
// Public interface: deliver(line:), beginRun(story:), setStatus(_:),
// setDiscovered(_:), restoreMode(_:), runFinished(ok:), onOpenLocation,
// onRunAll, onRunTree, onRunChain, onCancel, onPersistMode, isBundleAvailable.
// Owner context: tools/ide — Test.

import AppKit
import WebKit

final class TestingTabViewController: NSViewController, WKScriptMessageHandler, WKNavigationDelegate {

    /// The name the page posts to (`window.webkit.messageHandlers.testingTab`).
    private static let handlerName = "testingTab"

    // MARK: - Outbound (the page asking the IDE for something)

    /// A `file:line` the author clicked, to open in the editor.
    var onOpenLocation: ((SourceLocation) -> Void)?
    var onRunAll: (() -> Void)?
    var onRunTree: (() -> Void)?
    var onRunChain: (() -> Void)?
    var onCancel: (() -> Void)?
    /// The author switched view mode — the choice is remembered per project
    /// (ADR-301 D4), so the host persists it.
    var onPersistMode: ((String) -> Void)?

    // MARK: - State

    private let schemeHandler = TestingTabSchemeHandler()
    private var webView: WKWebView!
    private let placeholder = NSTextField(labelWithString: TestingTabWebRoot.missingNote)

    /// True once the page has posted `ready`; before that, lines are buffered.
    private var isReady = false
    /// Lines waiting for the next flush (page not ready, or this runloop turn).
    private var pending: [String] = []
    private var flushScheduled = false
    /// Calls made before `ready` that must survive the wait, newest wins.
    private var deferredCalls: [String: String] = [:]

    /// False when the app was built without the tab's web bundle.
    var isBundleAvailable: Bool { TestingTabWebRoot.indexURL() != nil }

    override func loadView() {
        let pane = ThemedPane(color: Theme.editorBackground)

        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: TestingTabSchemeHandler.scheme)
        configuration.userContentController.add(WeakTestingScriptMessageHandler(self), name: Self.handlerName)
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isInspectable = true // right-click → Inspect Element while designing the tab
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground") // the page owns its own background
        webView.translatesAutoresizingMaskIntoConstraints = false

        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
        placeholder.alignment = .center
        placeholder.maximumNumberOfLines = 4
        placeholder.lineBreakMode = .byWordWrapping
        placeholder.preferredMaxLayoutWidth = 260
        // The note is a long sentence. Without this the label's intrinsic width
        // becomes a floor on the whole right panel, and the editor|play divider
        // can no longer be dragged left — the split tests catch exactly that.
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
            placeholder.widthAnchor.constraint(lessThanOrEqualTo: pane.widthAnchor, multiplier: 0.8),
        ])

        view = pane
        load()
    }

    /// Boots the tab, or shows why it cannot.
    private func load() {
        guard let root = TestingTabWebRoot.directory(), TestingTabWebRoot.indexURL() != nil else {
            webView.isHidden = true
            placeholder.isHidden = false
            return
        }
        placeholder.isHidden = true
        webView.isHidden = false
        schemeHandler.rootDirectory = root
        webView.load(URLRequest(url: TestingTabSchemeHandler.indexURL))
    }

    // MARK: - Inbound (the IDE telling the page something)

    /// Queues one raw NDJSON line for the page. Safe to call before the page
    /// has loaded — nothing is dropped, it is flushed once `ready` arrives.
    func deliver(line: String) {
        pending.append(line)
        scheduleFlush()
    }

    /// A run is starting against `story`: the page clears its model.
    func beginRun(story: String) {
        call("reset", argument: story)
    }

    /// A pipeline failure or note, shown as the tab's status line.
    func setStatus(_ text: String) {
        call("status", argument: text)
    }

    /// The transcripts found on disk, so the tab is not blank before a run.
    func setDiscovered(_ files: [String]) {
        callJSON("discovered", json: Self.json(files) ?? "[]")
    }

    /// The view mode remembered for this project (ADR-301 D4).
    func restoreMode(_ mode: String) {
        call("restoreMode", argument: mode)
    }

    /// The run process exited; `ok` false leaves the failure on screen.
    func runFinished(ok: Bool) {
        callJSON("finished", json: ok ? "true" : "false")
    }

    // MARK: - Bridge plumbing

    /// Coalesces line delivery: however many lines arrive in one runloop turn,
    /// the web view is entered once.
    private func scheduleFlush() {
        guard isReady, !flushScheduled else { return }
        flushScheduled = true
        DispatchQueue.main.async { [weak self] in
            self?.flush()
        }
    }

    private func flush() {
        flushScheduled = false
        guard isReady, !pending.isEmpty, let json = Self.json(pending) else { return }
        pending.removeAll(keepingCapacity: true)
        // The page splits on newlines, so one call carries the whole burst.
        evaluate("window.__sharpeeTesting.line(\(json).join('\\n'));")
    }

    private func call(_ function: String, argument: String) {
        callJSON(function, json: Self.json([argument]).map { "\($0)[0]" } ?? "''")
    }

    private func callJSON(_ function: String, json: String) {
        let script = "window.__sharpeeTesting.\(function)(\(json));"
        guard isReady else {
            // Newest wins: a second `reset` before the page is ready supersedes
            // the first, and replaying both would clear a model twice.
            deferredCalls[function] = script
            return
        }
        evaluate(script)
    }

    private func evaluate(_ script: String) {
        webView.evaluateJavaScript(script) { _, error in
            if let error {
                NSLog("Testing tab bridge call failed: \(error.localizedDescription)")
            }
        }
    }

    /// Evaluates JavaScript against the tab's page and returns its value.
    ///
    /// The one door into the tab's script context — the `evaluateInPlaySurface`
    /// pattern — so the controller has a single place where it reaches into the
    /// page. The real-path tests read the rendered surface through this door,
    /// which is how they assert on what the author would see rather than on the
    /// bytes that were handed to the page.
    ///
    /// - Parameter script: the expression to evaluate.
    /// - Returns: the bridged result, or nil for a void script.
    /// - Throws: whatever WebKit reports (a syntax error, a dead page).
    @discardableResult
    func evaluateInTab(_ script: String) async throws -> Any? {
        try await webView.evaluateJavaScript(script)
    }

    /// True once the page has posted `ready` and buffered lines have flushed.
    var isPageReady: Bool { isReady }

    /// JSON for any encodable list — the only safe way to put story text, file
    /// paths and command input into a JavaScript expression.
    private static func json<T: Encodable>(_ value: T) -> String? {
        guard let data = try? JSONEncoder().encode(value) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.handlerName,
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "ready":
            isReady = true
            let queued = deferredCalls
            deferredCalls.removeAll()
            for script in queued.values { evaluate(script) }
            scheduleFlush()
        case "openLocation":
            guard let file = body["file"] as? String else { return }
            let line = (body["line"] as? Int) ?? 1
            onOpenLocation?(SourceLocation(file: URL(fileURLWithPath: file), line: line, column: 1))
        case "runAll":
            onRunAll?()
        case "runTree":
            onRunTree?()
        case "runChain":
            onRunChain?()
        case "cancel":
            onCancel?()
        case "persistMode":
            guard let mode = body["mode"] as? String else { return }
            onPersistMode?(mode)
        default:
            break
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        // The scheme handler answers from the app bundle, so a failure here is
        // a broken build rather than a network problem — say which.
        placeholder.stringValue = "\(TestingTabWebRoot.missingNote)\n(\(error.localizedDescription))"
        placeholder.isHidden = false
        webView.isHidden = true
    }
}

/// Forwards script messages weakly — `WKUserContentController.add` retains its
/// handler, and the controller owns the web view that owns the controller.
private final class WeakTestingScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var delegate: WKScriptMessageHandler?
    init(_ delegate: WKScriptMessageHandler) { self.delegate = delegate }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(controller, didReceive: message)
    }
}
