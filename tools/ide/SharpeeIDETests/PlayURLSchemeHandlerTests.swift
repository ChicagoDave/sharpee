// PlayURLSchemeHandlerTests.swift
// Covers PlayURLSchemeHandler: file serving over the custom scheme with correct
// Content-Types, and the HTTP contract for absent files — a missing file is a
// 404 RESPONSE (fetch resolves, `ok == false`, the client's optional-file probes
// like ./imports.json take their fallback path), never a network-level failure
// (which makes fetch REJECT and killed Play boot with "Load failed").

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class PlayURLSchemeHandlerTests: XCTestCase {

    private var tmp: URL!
    private var handler: PlayURLSchemeHandler!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlayURLSchemeHandlerTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        try Data("<html>hi</html>".utf8).write(to: tmp.appendingPathComponent("index.html"))
        try Data("story \"X\"".utf8).write(to: tmp.appendingPathComponent("story.story"))
        handler = PlayURLSchemeHandler()
        handler.rootDirectory = tmp
    }

    override func tearDownWithError() throws {
        handler = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    private func serve(_ path: String) -> RecordingSchemeTask {
        let task = RecordingSchemeTask(
            request: URLRequest(url: URL(string: "sharpee-play://app\(path)")!))
        handler.webView(WKWebView(), start: task)
        return task
    }

    // MARK: - Serving

    func testServesExistingFileWith200AndMimeType() {
        let task = serve("/index.html")
        XCTAssertEqual((task.response as? HTTPURLResponse)?.statusCode, 200)
        XCTAssertEqual((task.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Type"),
                       "text/html; charset=utf-8")
        XCTAssertEqual(String(data: task.data, encoding: .utf8), "<html>hi</html>")
        XCTAssertTrue(task.finished)
        XCTAssertNil(task.error)
    }

    func testEmptyPathServesIndexHTML() {
        let task = serve("/")
        XCTAssertEqual((task.response as? HTTPURLResponse)?.statusCode, 200)
        XCTAssertEqual(String(data: task.data, encoding: .utf8), "<html>hi</html>")
    }

    func testServesStoryFileAsOctetStream() {
        let task = serve("/story.story")
        XCTAssertEqual((task.response as? HTTPURLResponse)?.statusCode, 200)
        XCTAssertEqual((task.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Type"),
                       "application/octet-stream")
    }

    // MARK: - The 404 contract (the "Load failed" regression)

    func testMissingFileIsA404ResponseNotANetworkFailure() {
        let task = serve("/imports.json")
        XCTAssertEqual((task.response as? HTTPURLResponse)?.statusCode, 404,
                       "an absent optional file must resolve as HTTP 404 (fetch ok=false)")
        XCTAssertTrue(task.finished)
        XCTAssertNil(task.error,
                     "didFailWithError makes fetch REJECT — the 'Load failed' boot kill")
    }

    func testPathTraversalIsA404() {
        let task = serve("/../../etc/hosts")
        XCTAssertEqual((task.response as? HTTPURLResponse)?.statusCode, 404)
        XCTAssertTrue(task.data.isEmpty, "traversal must leak no bytes")
        XCTAssertNil(task.error)
    }

    // MARK: - Vendored-theme backfill (Phase 6b)

    /// A theme the story did not ship is served from the IDE's vendored mirror.
    func testAnUnshippedThemeIsServedFromTheVendoredMirror() throws {
        let mirror = tmp.appendingPathComponent("mirror", isDirectory: true)
        try FileManager.default.createDirectory(at: mirror, withIntermediateDirectories: true)
        try Data("[data-theme=\"paper\"] { color: red; }".utf8)
            .write(to: mirror.appendingPathComponent("paper.css"))
        handler.themesFallbackDirectory = mirror

        let task = serve("/themes/paper.css")
        XCTAssertEqual((task.response as? HTTPURLResponse)?.statusCode, 200)
        XCTAssertEqual((task.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Type"),
                       "text/css; charset=utf-8")
        XCTAssertEqual(String(data: task.data, encoding: .utf8),
                       "[data-theme=\"paper\"] { color: red; }")
    }

    /// A theme the story DID ship wins — the page sees exactly the version its
    /// build wired, never the IDE's copy.
    func testAShippedThemeFileWinsOverTheMirror() throws {
        let shipped = tmp.appendingPathComponent("themes", isDirectory: true)
        try FileManager.default.createDirectory(at: shipped, withIntermediateDirectories: true)
        try Data("/* shipped */".utf8).write(to: shipped.appendingPathComponent("paper.css"))
        let mirror = tmp.appendingPathComponent("mirror", isDirectory: true)
        try FileManager.default.createDirectory(at: mirror, withIntermediateDirectories: true)
        try Data("/* vendored */".utf8).write(to: mirror.appendingPathComponent("paper.css"))
        handler.themesFallbackDirectory = mirror

        let task = serve("/themes/paper.css")
        XCTAssertEqual(String(data: task.data, encoding: .utf8), "/* shipped */")
    }

    /// The mirror backfills ONLY `themes/…` — any other miss stays a 404 even
    /// when a mirror is configured.
    func testANonThemesMissStaysA404WithAMirrorConfigured() throws {
        let mirror = tmp.appendingPathComponent("mirror", isDirectory: true)
        try FileManager.default.createDirectory(at: mirror, withIntermediateDirectories: true)
        try Data("{}".utf8).write(to: mirror.appendingPathComponent("imports.json"))
        handler.themesFallbackDirectory = mirror

        let task = serve("/imports.json")
        XCTAssertEqual((task.response as? HTTPURLResponse)?.statusCode, 404)
    }

    /// A `themes/../…` path cannot climb out of the mirror.
    func testTraversalOutOfTheMirrorIsA404() throws {
        let bundle = tmp.appendingPathComponent("bundle", isDirectory: true)
        try FileManager.default.createDirectory(at: bundle, withIntermediateDirectories: true)
        let mirror = tmp.appendingPathComponent("mirror", isDirectory: true)
        try FileManager.default.createDirectory(at: mirror, withIntermediateDirectories: true)
        try Data("outside both roots".utf8).write(to: tmp.appendingPathComponent("secret.txt"))
        handler.rootDirectory = bundle
        handler.themesFallbackDirectory = mirror

        let task = serve("/themes/../secret.txt")
        XCTAssertEqual((task.response as? HTTPURLResponse)?.statusCode, 404)
        XCTAssertTrue(task.data.isEmpty, "traversal must leak no bytes")
    }

    // MARK: - MIME mapping

    func testCoreWebAssetTypes() {
        XCTAssertEqual(PlayURLSchemeHandler.mimeType(forExtension: "html"), "text/html; charset=utf-8")
        XCTAssertEqual(PlayURLSchemeHandler.mimeType(forExtension: "js"), "text/javascript; charset=utf-8")
        XCTAssertEqual(PlayURLSchemeHandler.mimeType(forExtension: "css"), "text/css; charset=utf-8")
    }

    func testCaseInsensitiveAndAssetTypes() {
        XCTAssertEqual(PlayURLSchemeHandler.mimeType(forExtension: "PNG"), "image/png")
        XCTAssertEqual(PlayURLSchemeHandler.mimeType(forExtension: "mp3"), "audio/mpeg")
        XCTAssertEqual(PlayURLSchemeHandler.mimeType(forExtension: "woff2"), "font/woff2")
    }

    func testUnknownExtensionFallsBackToOctetStream() {
        XCTAssertEqual(PlayURLSchemeHandler.mimeType(forExtension: "xyz"), "application/octet-stream")
    }
}

/// Records what the handler sends without a live WKWebView load.
private final class RecordingSchemeTask: NSObject, WKURLSchemeTask {
    let request: URLRequest
    private(set) var response: URLResponse?
    private(set) var data = Data()
    private(set) var finished = false
    private(set) var error: Error?

    init(request: URLRequest) {
        self.request = request
    }

    func didReceive(_ response: URLResponse) { self.response = response }
    func didReceive(_ data: Data) { self.data.append(data) }
    func didFinish() { finished = true }
    func didFailWithError(_ error: Error) { self.error = error }
}
