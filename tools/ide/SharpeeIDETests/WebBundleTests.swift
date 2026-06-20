// WebBundleTests.swift
// Covers WebBundle: directory path construction and index.html presence detection
// against a fixture project tree (author mode — <projectRoot>/dist/web/).

import XCTest
@testable import SharpeeIDE

final class WebBundleTests: XCTestCase {

    private var projectRoot: URL!

    override func setUpWithError() throws {
        super.setUp()
        projectRoot = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-WebBundleTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: projectRoot, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let projectRoot, FileManager.default.fileExists(atPath: projectRoot.path) {
            try FileManager.default.removeItem(at: projectRoot)
        }
        projectRoot = nil
        super.tearDown()
    }

    private func makeBundle(withIndex: Bool) throws {
        let dir = projectRoot.appendingPathComponent("dist/web", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        if withIndex {
            try Data("<html></html>".utf8).write(to: dir.appendingPathComponent("index.html"))
        }
    }

    func testDirectoryIsDistWeb() {
        let dir = WebBundle.directory(projectRoot: projectRoot)
        XCTAssertEqual(dir.path, projectRoot.appendingPathComponent("dist/web").path)
    }

    func testIndexURLReturnsURLWhenBundleBuilt() throws {
        try makeBundle(withIndex: true)
        let index = WebBundle.indexURL(projectRoot: projectRoot)
        XCTAssertEqual(index?.lastPathComponent, "index.html")
        XCTAssertEqual(index?.path, projectRoot.appendingPathComponent("dist/web/index.html").path)
    }

    func testIndexURLNilWhenNoBundle() {
        XCTAssertNil(WebBundle.indexURL(projectRoot: projectRoot))
    }

    func testIndexURLNilWhenDirExistsButNoIndexHTML() throws {
        try makeBundle(withIndex: false)
        XCTAssertNil(WebBundle.indexURL(projectRoot: projectRoot))
    }
}
