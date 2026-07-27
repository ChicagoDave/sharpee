// WebBundleTests.swift
// Covers WebBundle: ID-qualified path construction (`dist/web/<id>/`, ADR-258
// D4 — the id comes from the story's IR header) and index.html presence
// detection against a fixture project tree.

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

    private func makeBundle(id: String, withIndex: Bool) throws {
        let dir = projectRoot.appendingPathComponent("dist/web/\(id)", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        if withIndex {
            try Data("<html></html>".utf8).write(to: dir.appendingPathComponent("index.html"))
        }
    }

    func testDirectoryIsIdQualified() {
        let dir = WebBundle.directory(projectRoot: projectRoot, storyId: "fernhill")
        XCTAssertEqual(dir.path, projectRoot.appendingPathComponent("dist/web/fernhill").path,
                       "the bundle path carries the IR header id — never bare dist/web (D4)")
    }

    func testIndexURLReturnsURLWhenBundleBuilt() throws {
        try makeBundle(id: "probe", withIndex: true)
        let index = WebBundle.indexURL(projectRoot: projectRoot, storyId: "probe")
        XCTAssertEqual(index?.path,
                       projectRoot.appendingPathComponent("dist/web/probe/index.html").path)
    }

    func testIndexURLNilWhenNoBundle() {
        XCTAssertNil(WebBundle.indexURL(projectRoot: projectRoot, storyId: "probe"))
    }

    func testIndexURLNilWhenDirExistsButNoIndexHTML() throws {
        try makeBundle(id: "probe", withIndex: false)
        XCTAssertNil(WebBundle.indexURL(projectRoot: projectRoot, storyId: "probe"))
    }

    func testIndexURLNilForWrongId() throws {
        try makeBundle(id: "probe", withIndex: true)
        XCTAssertNil(WebBundle.indexURL(projectRoot: projectRoot, storyId: "other"),
                     "another story's bundle must not resolve")
    }
}
