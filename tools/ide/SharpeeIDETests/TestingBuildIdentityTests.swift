// TestingBuildIdentityTests.swift
// Covers TestingBuildIdentity (ADR-357 D11): the id is stable over the same
// sources and executable, moves when a `.story` or `.chord` file changes or
// the executable's file does, and ignores files that are not story source —
// the test tree, build output, a stray text file.

import XCTest
@testable import SharpeeIDE

final class TestingBuildIdentityTests: XCTestCase {

    private var root: URL!
    private var executable: URL!

    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory
            .appendingPathComponent("build-identity-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: root.appendingPathComponent("parts"), withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: root.appendingPathComponent("upps.tests"), withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: root.appendingPathComponent("dist/web"), withIntermediateDirectories: true)
        try "story \"UPPS\"\n".write(to: root.appendingPathComponent("upps.story"), atomically: true, encoding: .utf8)
        try "create the satchel\n".write(to: root.appendingPathComponent("parts/satchel.chord"), atomically: true, encoding: .utf8)
        try "{}".write(to: root.appendingPathComponent("upps.tests/manifest.json"), atomically: true, encoding: .utf8)
        try "built".write(to: root.appendingPathComponent("dist/web/game.js"), atomically: true, encoding: .utf8)
        executable = root.appendingPathComponent("sharpee-cli.js")
        try "#!/usr/bin/env node\n".write(to: executable, atomically: true, encoding: .utf8)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: root)
    }

    func testSourceFilesAreTheStoryAndChordFilesSortedByRelativePath() {
        let files = TestingBuildIdentity.sourceFiles(under: root).map { $0.lastPathComponent }
        XCTAssertEqual(files, ["satchel.chord", "upps.story"])
    }

    func testTheIdIsStableAcrossComputations() {
        let first = TestingBuildIdentity.compute(projectRoot: root, executable: executable)
        let second = TestingBuildIdentity.compute(projectRoot: root, executable: executable)
        XCTAssertNotNil(first)
        XCTAssertEqual(first, second)
        XCTAssertEqual(first?.count, 64, "a SHA-256 hex digest")
    }

    func testEditingAChordFileMovesTheId() throws {
        let before = TestingBuildIdentity.compute(projectRoot: root, executable: executable)
        try "create the satchel\n  wearable\n".write(to: root.appendingPathComponent("parts/satchel.chord"), atomically: true, encoding: .utf8)
        let after = TestingBuildIdentity.compute(projectRoot: root, executable: executable)
        XCTAssertNotEqual(before, after)
    }

    func testEditingTheStoryFileMovesTheId() throws {
        let before = TestingBuildIdentity.compute(projectRoot: root, executable: executable)
        try "story \"UPPS\"\n\nmore\n".write(to: root.appendingPathComponent("upps.story"), atomically: true, encoding: .utf8)
        XCTAssertNotEqual(before, TestingBuildIdentity.compute(projectRoot: root, executable: executable))
    }

    func testTheTestTreeBuildOutputAndOtherFilesDoNotCount() throws {
        let before = TestingBuildIdentity.compute(projectRoot: root, executable: executable)
        try "{\"seed\": 7}".write(to: root.appendingPathComponent("upps.tests/manifest.json"), atomically: true, encoding: .utf8)
        try "rebuilt".write(to: root.appendingPathComponent("dist/web/game.js"), atomically: true, encoding: .utf8)
        try "notes".write(to: root.appendingPathComponent("README.md"), atomically: true, encoding: .utf8)
        XCTAssertEqual(before, TestingBuildIdentity.compute(projectRoot: root, executable: executable))
    }

    func testARebuiltExecutableMovesTheId() throws {
        let before = TestingBuildIdentity.compute(projectRoot: root, executable: executable)
        // A rebuilt CLI is the same path with different bytes and a later mtime;
        // the size alone is enough for the hash to move here.
        try "#!/usr/bin/env node\nconsole.log(1)\n".write(to: executable, atomically: true, encoding: .utf8)
        XCTAssertNotEqual(before, TestingBuildIdentity.compute(projectRoot: root, executable: executable))
    }

    func testNoSourceFilesGivesNoId() throws {
        let empty = FileManager.default.temporaryDirectory
            .appendingPathComponent("build-identity-empty-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: empty, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: empty) }
        XCTAssertNil(TestingBuildIdentity.compute(projectRoot: empty, executable: executable))
    }
}
