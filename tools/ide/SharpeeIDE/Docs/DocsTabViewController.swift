// DocsTabViewController.swift
// The Documentation tab: a WKWebView over the author documentation bundled with
// the IDE, served on sharpee-docs://. Swift's whole job here is transport — it
// tells the page which Chord version the installed toolchain reports, and it
// hands external links to the real browser. It never touches the corpus: the
// page fetches its own index and fragments out of the app bundle, so the tab
// works with no network at all.
// Public interface: setToolchainVersion(_:), showPage(_:), isBundleAvailable,
// bundledChordVersion, onOpenExternal, evaluateInTab(_:).
// Owner context: tools/ide — Docs.

import AppKit
import WebKit

final class DocsTabViewController: NSViewController, WKScriptMessageHandler, WKNavigationDelegate {

    /// The name the page posts to (`window.webkit.messageHandlers.docsTab`).
    private static let handlerName = "docsTab"

    /// A link out of the documentation. Injected rather than called directly so
    /// a test can assert the tab routes it OUT instead of navigating the pane to
    /// a page with no back button.
    var onOpenExternal: ((URL) -> Void) = { NSWorkspace.shared.open($0) }

    private let schemeHandler = DocsTabSchemeHandler()
    private var webView: WKWebView!
    private let placeholder = NSTextField(labelWithString: DocsTabWebRoot.missingNote)

    /// True once the page has posted `ready`.
    private(set) var isReady = false
    /// Calls made before `ready` that must survive the wait, newest wins.
    private var deferredCalls: [String: String] = [:]

    /// False when the app was built without the tab's web bundle.
    var isBundleAvailable: Bool { DocsTabWebRoot.indexURL() != nil }

    /// The Chord version the bundled corpus documents, if it was bundled.
    var bundledChordVersion: String? { DocsTabWebRoot.bundledChordVersion() }

    override func loadView() {
        let pane = ThemedPane(color: Theme.editorBackground)

        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: DocsTabSchemeHandler.scheme)
        configuration.userContentController.add(WeakDocsScriptMessageHandler(self), name: Self.handlerName)
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
        // Without this the label's intrinsic width becomes a floor on the whole
        // right panel and the editor|play divider can no longer be dragged left
        // — the split tests catch exactly that (same note as the Testing tab).
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
        guard let root = DocsTabWebRoot.directory(), DocsTabWebRoot.indexURL() != nil else {
            webView.isHidden = true
            placeholder.isHidden = false
            return
        }
        placeholder.isHidden = true
        webView.isHidden = false
        schemeHandler.rootDirectory = root
        webView.load(URLRequest(url: DocsTabSchemeHandler.indexURL))
    }

    // MARK: - Inbound (the IDE telling the page something)

    /// What `sharpee --version` reported (ADR-279 D1). The page raises a banner
    /// when it disagrees with the version the bundle documents.
    func setToolchainVersion(_ version: String) {
        call("setToolchainVersion", argument: version)
    }

    /// Opens a documentation page by its site path, e.g. `/chord/guide/reading`.
    func showPage(_ href: String) {
        call("showPage", argument: href)
    }

    // MARK: - Bridge plumbing

    private func call(_ function: String, argument: String) {
        let encoded = Self.json([argument]).map { "\($0)[0]" } ?? "''"
        let script = "window.__sharpeeDocs.\(function)(\(encoded));"
        guard isReady else {
            // Newest wins: a second version report before the page is ready
            // supersedes the first.
            deferredCalls[function] = script
            return
        }
        evaluate(script)
    }

    private func evaluate(_ script: String) {
        webView.evaluateJavaScript(script) { _, error in
            if let error {
                NSLog("Docs tab bridge call failed: \(error.localizedDescription)")
            }
        }
    }

    /// Evaluates JavaScript against the tab's page and returns its value. The
    /// one door into the page's script context, mirroring the Testing tab — the
    /// real-path tests read the rendered surface through it, so they assert on
    /// what the author would see rather than on the bytes handed to the page.
    @discardableResult
    func evaluateInTab(_ script: String) async throws -> Any? {
        try await webView.evaluateJavaScript(script)
    }

    private static func json<T: Encodable>(_ value: T) -> String? {
        guard let data = try? JSONEncoder().encode(value) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    // MARK: - Outbound (the page asking the IDE for something)

    func userContentController(_ controller: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let type = body["type"] as? String else { return }
        switch type {
        case "ready":
            isReady = true
            let queued = deferredCalls
            deferredCalls.removeAll()
            queued.values.forEach(evaluate)
        case "openExternal":
            // The tab has no chrome and no back button — a link to GitHub
            // belongs in the browser, not in the right panel.
            if let raw = body["url"] as? String, let url = URL(string: raw),
               url.scheme == "http" || url.scheme == "https" {
                onOpenExternal(url)
            }
        default:
            break
        }
    }
}

/// Breaks the retain cycle WKUserContentController would otherwise hold on the
/// controller (the same shim the Testing tab uses, for the same reason).
private final class WeakDocsScriptMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(_ controller: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}
