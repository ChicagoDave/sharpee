// PlayURLSchemeHandler.swift
// Serves a story's web bundle to the Play WKWebView over a custom scheme
// (sharpee-play://app/…) instead of file://. A custom-scheme origin is a real,
// non-opaque origin, so localStorage / relative URLs / storage APIs the browser
// client relies on work — which they do not for file:// (null origin → SecurityError).
// Public interface: PlayURLSchemeHandler (set rootDirectory, register on a config).
// Owner context: tools/ide — Play.

import Foundation
import WebKit

final class PlayURLSchemeHandler: NSObject, WKURLSchemeHandler {

    static let scheme = "sharpee-play"
    static let host = "app"

    /// The bundle directory served as the web root. Set before loading.
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
        // Guard against path traversal outside the bundle root.
        guard fileURL.path.hasPrefix(root.standardizedFileURL.path),
              let data = try? Data(contentsOf: fileURL) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }

        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": Self.mimeType(forExtension: fileURL.pathExtension),
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

    /// Maps a file extension to a Content-Type for the bundle's asset kinds.
    static func mimeType(forExtension ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs":   return "text/javascript; charset=utf-8"
        case "css":         return "text/css; charset=utf-8"
        case "json":        return "application/json; charset=utf-8"
        case "map":         return "application/json; charset=utf-8"
        case "png":         return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif":         return "image/gif"
        case "svg":         return "image/svg+xml"
        case "webp":        return "image/webp"
        case "ico":         return "image/x-icon"
        case "woff":        return "font/woff"
        case "woff2":       return "font/woff2"
        case "ttf":         return "font/ttf"
        case "otf":         return "font/otf"
        case "mp3":         return "audio/mpeg"
        case "ogg":         return "audio/ogg"
        case "wav":         return "audio/wav"
        case "m4a":         return "audio/mp4"
        default:            return "application/octet-stream"
        }
    }
}
