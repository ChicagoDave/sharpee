// PlayViewController.swift
// The Play pane: embeds the story's self-contained browser client in a WKWebView
// (loaded from dist/web/<story>/), or shows a placeholder when no bundle is built.
// Public interface: load(repoRoot:story:), reload().
// Owner context: tools/ide — Play.

import AppKit
import WebKit

final class PlayViewController: NSViewController {

    private let schemeHandler = PlayURLSchemeHandler()
    private var webView: WKWebView!
    private let placeholder = NSTextField(labelWithString: "Build with Browser enabled to play")

    /// The bundle currently loaded, so reload() can re-resolve it after a rebuild.
    private var loaded: (repoRoot: URL, story: String)?

    override func loadView() {
        let pane = NSView()
        pane.wantsLayer = true
        pane.layer?.backgroundColor = Theme.playBackground.cgColor

        // Serve the bundle over a custom scheme (real origin → localStorage works),
        // not file:// (null origin → storage SecurityError).
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: PlayURLSchemeHandler.scheme)
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isInspectable = true // right-click → Inspect Element to debug the running story
        webView.translatesAutoresizingMaskIntoConstraints = false

        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
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
        schemeHandler.rootDirectory = WebBundle.directory(repoRoot: repoRoot, story: story)
        placeholder.isHidden = true
        webView.isHidden = false
        let url = URL(string: "\(PlayURLSchemeHandler.scheme)://\(PlayURLSchemeHandler.host)/index.html")!
        webView.load(URLRequest(url: url))
    }

    /// Re-resolves and reloads the current bundle (used after a rebuild). No-op if nothing loaded.
    func reload() {
        guard let loaded else { return }
        load(repoRoot: loaded.repoRoot, story: loaded.story)
    }

    private func showPlaceholder() {
        webView.isHidden = true
        placeholder.isHidden = false
    }
}
