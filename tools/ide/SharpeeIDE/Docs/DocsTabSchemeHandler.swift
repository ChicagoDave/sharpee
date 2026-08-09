// DocsTabSchemeHandler.swift
// Serves the Documentation tab's app-bundled web root to its WKWebView over
// sharpee-docs://app/… instead of file://, for the same reason the Testing tab
// and the Play pane do it: a custom scheme is a real, non-opaque origin, so
// relative URLs and `fetch` behave, where file:// gives a null origin and the
// page could not read its own docs-index.json.
// A separate handler from the Testing tab's because the two serve different
// roots, and one handler with a swapped root would let a stale load answer the
// other tab's request.
// Public interface: DocsTabSchemeHandler (register on a WKWebViewConfiguration),
// scheme, host, indexURL.
// Owner context: tools/ide — Docs.

import Foundation
import WebKit

final class DocsTabSchemeHandler: NSObject, WKURLSchemeHandler {

    static let scheme = "sharpee-docs"
    static let host = "app"

    /// The URL the web view loads to boot the tab.
    static let indexURL = URL(string: "\(scheme)://\(host)/index.html")!

    /// The bundled web root. Nil until the bundle is located (see DocsTabWebRoot).
    var rootDirectory: URL?

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let root = rootDirectory, let url = task.request.url else {
            task.didFailWithError(URLError(.badURL))
            return
        }

        var relativePath = url.path
        if relativePath.hasPrefix("/") { relativePath.removeFirst() }
        if relativePath.isEmpty { relativePath = "index.html" }

        let fileURL = root.appendingPathComponent(relativePath).standardizedFileURL
        // A missing file is a 404 RESPONSE, not a network failure — the same
        // reasoning as the other two handlers: `didFailWithError` turns an
        // absent asset into a rejected fetch and kills the page's boot. The
        // prefix check keeps a `../` path from reading outside the bundle.
        guard fileURL.path.hasPrefix(root.standardizedFileURL.path),
              let data = try? Data(contentsOf: fileURL) else {
            respond(task, url: url, statusCode: 404, data: Data(),
                    contentType: "text/plain; charset=utf-8")
            return
        }

        respond(task, url: url, statusCode: 200, data: data,
                contentType: PlayURLSchemeHandler.mimeType(forExtension: fileURL.pathExtension))
    }

    private func respond(_ task: WKURLSchemeTask, url: URL, statusCode: Int,
                         data: Data, contentType: String) {
        let response = HTTPURLResponse(
            url: url,
            statusCode: statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": contentType,
                "Content-Length": "\(data.count)",
                "Cache-Control": "no-cache",
            ])!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        // Reads are synchronous; nothing to cancel.
    }
}
