// PlayURLSchemeHandlerTests.swift
// Covers PlayURLSchemeHandler.mimeType — the bundle asset kinds map to sensible
// Content-Types (the file-serving itself is verified manually via the Play pane).

import XCTest
@testable import SharpeeIDE

final class PlayURLSchemeHandlerTests: XCTestCase {

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
