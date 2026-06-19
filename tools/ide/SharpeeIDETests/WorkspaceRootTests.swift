// WorkspaceRootTests.swift
// Covers WorkspaceRoot.find(from:) — direct match, nested descent, the two-marker
// AND condition, filesystem-root termination (the case that previously hung).

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

    /// Writes the Sharpee monorepo signature (pnpm-workspace.yaml + packages/core/)
    /// into the given directory.
    private func placeMonorepoSignature(in directory: URL) throws {
        try Data().write(to: directory.appendingPathComponent("pnpm-workspace.yaml"))
        try FileManager.default.createDirectory(
            at: directory.appendingPathComponent("packages/core", isDirectory: true),
            withIntermediateDirectories: true)
    }

    /// Creates a directory at `path` relative to `tempDir`.
    @discardableResult
    private func mkdir(_ relativePath: String) throws -> URL {
        let url = tempDir.appendingPathComponent(relativePath, isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    // MARK: - Direct match

    func testReturnsDirectoryThatHasSignature() throws {
        try placeMonorepoSignature(in: tempDir)
        XCTAssertEqual(WorkspaceRoot.find(from: tempDir)?.path, tempDir.path)
    }

    // MARK: - Walk up

    func testWalksUpFromNestedDirectoryUntilSignatureFound() throws {
        try placeMonorepoSignature(in: tempDir)
        let deep = try mkdir("packages/stdlib/src")

        XCTAssertEqual(WorkspaceRoot.find(from: deep)?.path, tempDir.path)
    }

    func testReturnsDeepestAncestorWhenMultipleSignaturesExist() throws {
        // Outer signature at tempDir; inner signature at tempDir/inner. From a path
        // under inner, the inner root wins because it's the closest ancestor.
        try placeMonorepoSignature(in: tempDir)
        let inner = try mkdir("inner")
        try placeMonorepoSignature(in: inner)
        let deeper = try mkdir("inner/sub")

        XCTAssertEqual(WorkspaceRoot.find(from: deeper)?.path, inner.path)
    }

    // MARK: - Missing / partial signature (must terminate, not hang)

    func testReturnsNilWhenNoAncestorHasSignature() throws {
        // tempDir (and everything above it under /var/folders) lacks the signature.
        // This walks all the way to "/" — the regression case that previously looped.
        let nested = try mkdir("a/b/c")
        XCTAssertNil(WorkspaceRoot.find(from: nested))
    }

    func testRequiresWorkspaceFileNotJustPackagesCore() throws {
        // packages/core present but no pnpm-workspace.yaml — not a monorepo root.
        try FileManager.default.createDirectory(
            at: tempDir.appendingPathComponent("packages/core", isDirectory: true),
            withIntermediateDirectories: true)
        XCTAssertNil(WorkspaceRoot.find(from: tempDir))
    }

    func testRequiresPackagesCoreNotJustWorkspaceFile() throws {
        // pnpm-workspace.yaml present but no packages/core — not a monorepo root
        // (guards against a coincidental author pnpm workspace).
        try Data().write(to: tempDir.appendingPathComponent("pnpm-workspace.yaml"))
        XCTAssertNil(WorkspaceRoot.find(from: tempDir))
    }

    func testIgnoresDirectoryNamedLikeWorkspaceFile() throws {
        // A *directory* called pnpm-workspace.yaml is not a valid marker.
        try FileManager.default.createDirectory(
            at: tempDir.appendingPathComponent("pnpm-workspace.yaml", isDirectory: true),
            withIntermediateDirectories: true)
        try FileManager.default.createDirectory(
            at: tempDir.appendingPathComponent("packages/core", isDirectory: true),
            withIntermediateDirectories: true)
        XCTAssertNil(WorkspaceRoot.find(from: tempDir))
    }

    func testTerminatesAtFilesystemRoot() {
        // Calling find on / must not loop forever; / has no signature.
        XCTAssertNil(WorkspaceRoot.find(from: URL(fileURLWithPath: "/")))
    }
}
