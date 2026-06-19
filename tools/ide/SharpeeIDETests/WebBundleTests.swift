// WebBundleTests.swift
// Covers WebBundle: directory path construction and index.html presence detection
// against a fixture tree.

import XCTest
@testable import SharpeeIDE

final class WebBundleTests: XCTestCase {

    private var repoRoot: URL!

    override func setUpWithError() throws {
        super.setUp()
        repoRoot = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-WebBundleTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: repoRoot, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let repoRoot, FileManager.default.fileExists(atPath: repoRoot.path) {
            try FileManager.default.removeItem(at: repoRoot)
        }
        repoRoot = nil
        super.tearDown()
    }

    private func makeBundle(_ story: String, withIndex: Bool) throws {
        let dir = repoRoot
            .appendingPathComponent("dist/web", isDirectory: true)
            .appendingPathComponent(story, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        if withIndex {
            try Data("<html></html>".utf8).write(to: dir.appendingPathComponent("index.html"))
        }
    }

    func testDirectoryIsDistWebStory() {
        let dir = WebBundle.directory(repoRoot: repoRoot, story: "dungeo")
        XCTAssertEqual(dir.path, repoRoot.appendingPathComponent("dist/web/dungeo").path)
    }

    func testIndexURLReturnsURLWhenBundleBuilt() throws {
        try makeBundle("dungeo", withIndex: true)
        let index = WebBundle.indexURL(repoRoot: repoRoot, story: "dungeo")
        XCTAssertEqual(index?.lastPathComponent, "index.html")
        XCTAssertEqual(index?.path, repoRoot.appendingPathComponent("dist/web/dungeo/index.html").path)
    }

    func testIndexURLNilWhenNoBundle() {
        XCTAssertNil(WebBundle.indexURL(repoRoot: repoRoot, story: "dungeo"))
    }

    func testIndexURLNilWhenDirExistsbutNoIndexHTML() throws {
        try makeBundle("dungeo", withIndex: false)
        XCTAssertNil(WebBundle.indexURL(repoRoot: repoRoot, story: "dungeo"))
    }
}
