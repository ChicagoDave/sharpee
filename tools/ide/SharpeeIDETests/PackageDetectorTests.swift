// PackageDetectorTests.swift
// Covers PackageDetector.detect(in:): packages/ discovery, package.json gating,
// alphabetical order, and missing packages/ dir.

import XCTest
@testable import SharpeeIDE

final class PackageDetectorTests: XCTestCase {

    private var root: URL!

    override func setUpWithError() throws {
        super.setUp()
        root = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PackageDetectorTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let root, FileManager.default.fileExists(atPath: root.path) {
            try FileManager.default.removeItem(at: root)
        }
        root = nil
        super.tearDown()
    }

    private func makePackage(_ name: String) throws {
        let dir = root.appendingPathComponent("packages/\(name)", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try Data("{}".utf8).write(to: dir.appendingPathComponent("package.json"))
    }

    func testReturnsEmptyWhenNoPackagesDir() {
        XCTAssertEqual(PackageDetector.detect(in: root), [])
    }

    func testDetectsPackagesSortedAlphabetically() throws {
        try makePackage("stdlib")
        try makePackage("core")
        try makePackage("engine")

        XCTAssertEqual(PackageDetector.detect(in: root), ["core", "engine", "stdlib"])
    }

    func testExcludesDirectoryWithoutPackageJSON() throws {
        try makePackage("core")
        try FileManager.default.createDirectory(
            at: root.appendingPathComponent("packages/scratch", isDirectory: true),
            withIntermediateDirectories: true)   // no package.json

        XCTAssertEqual(PackageDetector.detect(in: root), ["core"])
    }
}
