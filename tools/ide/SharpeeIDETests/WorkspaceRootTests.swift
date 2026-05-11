// WorkspaceRootTests.swift
// Covers WorkspaceRoot.find(from:) — direct match, nested descent, missing marker,
// filesystem-root termination.

import XCTest
@testable import SharpeeIDE

final class WorkspaceRootTests: XCTestCase {

    private var tempDir: URL!

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-WorkspaceRootTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir,
                                                withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let dir = tempDir, FileManager.default.fileExists(atPath: dir.path) {
            try FileManager.default.removeItem(at: dir)
        }
        tempDir = nil
        super.tearDown()
    }

    /// Writes an empty `build.sh` in the given directory.
    private func placeBuildScript(in directory: URL) throws {
        let script = directory.appendingPathComponent("build.sh")
        try Data().write(to: script)
    }

    /// Creates a directory at `path` relative to `tempDir`.
    @discardableResult
    private func mkdir(_ relativePath: String) throws -> URL {
        let url = tempDir.appendingPathComponent(relativePath, isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    // MARK: - Direct match

    func testReturnsDirectoryThatContainsBuildScript() throws {
        try placeBuildScript(in: tempDir)
        XCTAssertEqual(WorkspaceRoot.find(from: tempDir)?.path, tempDir.path)
    }

    // MARK: - Walk up

    func testWalksUpFromNestedDirectoryUntilMarkerFound() throws {
        try placeBuildScript(in: tempDir)
        let deep = try mkdir("packages/stdlib/src")

        XCTAssertEqual(WorkspaceRoot.find(from: deep)?.path, tempDir.path)
    }

    func testReturnsDeepestAncestorWhenMultipleMarkersExist() throws {
        // Outer build.sh at tempDir; inner build.sh at tempDir/inner. From a path
        // under inner, the inner build.sh wins because it's the closest ancestor.
        try placeBuildScript(in: tempDir)
        let inner = try mkdir("inner")
        try placeBuildScript(in: inner)
        let deeper = try mkdir("inner/sub")

        XCTAssertEqual(WorkspaceRoot.find(from: deeper)?.path, inner.path)
    }

    // MARK: - Missing marker

    func testReturnsNilWhenNoAncestorContainsBuildScript() throws {
        // tempDir has no build.sh; nothing above it (inside a temp folder under
        // /var/folders) will contain one either.
        let nested = try mkdir("a/b/c")
        XCTAssertNil(WorkspaceRoot.find(from: nested))
    }

    func testTerminatesAtFilesystemRoot() {
        // Calling find on / must not loop forever; / has no build.sh.
        XCTAssertNil(WorkspaceRoot.find(from: URL(fileURLWithPath: "/")))
    }

    // MARK: - Edge cases

    func testIgnoresDirectoryNamedBuildSh() throws {
        // A *directory* called build.sh is not a valid marker.
        let fakeMarker = tempDir.appendingPathComponent("build.sh", isDirectory: true)
        try FileManager.default.createDirectory(at: fakeMarker,
                                                withIntermediateDirectories: true)
        XCTAssertNil(WorkspaceRoot.find(from: tempDir))
    }
}
