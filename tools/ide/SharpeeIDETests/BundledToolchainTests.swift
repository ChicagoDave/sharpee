// BundledToolchainTests.swift
// Pins ADR-279 D4: the app's own bundled toolchain is the THIRD resolution tier,
// and the layout it is found at (`Resources/toolchain/bin/sharpee`) matches what
// `tools/ide/vendor-toolchain.sh` writes. Covers ADR-279 Acceptance 6's
// "a test pins the shim → PATH → bundled resolution order".
//
// These drive `ComposeRunner.resolve(near:searchPATH:bundledResources:)` — the
// injected seam — with real directories on disk, so the FileManager executability
// checks are exercised rather than stubbed. The subprocess half of AC6 (the
// bundled CLI actually building a story with no Node on the machine) is the
// separate real-path harness, `tools/ide/toolchain-realpath-test.sh`.

import XCTest
@testable import SharpeeIDE

@MainActor
final class BundledToolchainTests: XCTestCase {

    private var tempDir: URL!

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-BundledToolchainTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let tempDir, FileManager.default.fileExists(atPath: tempDir.path) {
            try FileManager.default.removeItem(at: tempDir)
        }
        tempDir = nil
        super.tearDown()
    }

    // MARK: - Fixtures

    /// A stand-in `Resources` directory carrying an executable bundled shim.
    private func makeBundledResources(executable: Bool = true) throws -> URL {
        let resources = tempDir.appendingPathComponent("Resources", isDirectory: true)
        let shim = resources.appendingPathComponent(BundledToolchain.relativeShimPath)
        try FileManager.default.createDirectory(at: shim.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try "#!/bin/sh\nexit 0\n".write(to: shim, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: executable ? 0o755 : 0o644],
                                              ofItemAtPath: shim.path)
        return resources
    }

    /// A directory holding an executable `sharpee`, for use as a PATH entry.
    private func makePATHEntry(named name: String) throws -> URL {
        let dir = tempDir.appendingPathComponent(name, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let bin = dir.appendingPathComponent("sharpee")
        try "#!/bin/sh\nexit 0\n".write(to: bin, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: bin.path)
        return dir
    }

    /// A fake monorepo checkout (`pnpm-workspace.yaml` + `packages/core` + `./sharpee`)
    /// with a story inside it, so tier 1 resolves. Returns the story file.
    private func makeWorkspaceStory() throws -> (root: URL, story: URL) {
        let fm = FileManager.default
        let root = tempDir.appendingPathComponent("checkout", isDirectory: true)
        try fm.createDirectory(at: root.appendingPathComponent("packages/core", isDirectory: true),
                               withIntermediateDirectories: true)
        try "packages:\n  - packages/*\n".write(to: root.appendingPathComponent("pnpm-workspace.yaml"),
                                                atomically: true, encoding: .utf8)
        let shim = root.appendingPathComponent("sharpee")
        try "#!/bin/sh\nexit 0\n".write(to: shim, atomically: true, encoding: .utf8)
        try fm.setAttributes([.posixPermissions: 0o755], ofItemAtPath: shim.path)

        let storyDir = root.appendingPathComponent("stories/mine", isDirectory: true)
        try fm.createDirectory(at: storyDir, withIntermediateDirectories: true)
        let story = storyDir.appendingPathComponent("mine.story")
        try "story \"Mine\" by \"Tests\"\n".write(to: story, atomically: true, encoding: .utf8)
        return (root, story)
    }

    // MARK: - BundledToolchain lookup

    /// A bundle with no resource directory at all (the nil case Bundle.resourceURL
    /// can return) resolves to nothing rather than crashing on a force-unwrap.
    func testNilResourcesResolvesToNil() {
        XCTAssertNil(BundledToolchain.executable(resourcesURL: nil))
    }

    /// A Resources directory with no toolchain — a dev build assembled without
    /// the vendor step — is a legitimate nil, not an error.
    func testAbsentToolchainResolvesToNil() throws {
        let resources = tempDir.appendingPathComponent("EmptyResources", isDirectory: true)
        try FileManager.default.createDirectory(at: resources, withIntermediateDirectories: true)
        XCTAssertNil(BundledToolchain.executable(resourcesURL: resources))
    }

    /// A shim that lost its +x bit in packaging is reported as ABSENT, so the
    /// caller gets "toolchain not found" instead of an opaque launch failure.
    func testNonExecutableShimResolvesToNil() throws {
        let resources = try makeBundledResources(executable: false)
        XCTAssertNil(BundledToolchain.executable(resourcesURL: resources))
    }

    /// The happy path, and the layout contract: the shim is found at exactly
    /// `toolchain/bin/sharpee` under Resources — the path vendor-toolchain.sh
    /// writes. If either side moves, this test fails rather than the app
    /// silently losing its bundled tier.
    func testExecutableShimResolvesAtTheVendoredPath() throws {
        let resources = try makeBundledResources()
        let found = BundledToolchain.executable(resourcesURL: resources)
        XCTAssertEqual(found?.path, resources.appendingPathComponent("toolchain/bin/sharpee").path)
        XCTAssertEqual(BundledToolchain.relativeShimPath, "toolchain/bin/sharpee")
    }

    // MARK: - Resolution order (ADR-279 D4 / Acceptance 6)

    /// Tier 1 beats both others: an in-repo story tracks the LOCAL build even
    /// when a global install and a bundled toolchain are both available
    /// (ADR-258 D2/Q1, unchanged by D4).
    func testWorkspaceShimWinsOverPATHAndBundled() throws {
        let (root, story) = try makeWorkspaceStory()
        let pathDir = try makePATHEntry(named: "globalbin")
        let resources = try makeBundledResources()

        let resolved = ComposeRunner.resolve(near: story,
                                             searchPATH: pathDir.path,
                                             bundledResources: resources)
        XCTAssertEqual(resolved?.path, root.appendingPathComponent("sharpee").path)
    }

    /// Tier 2 beats tier 3: an author's deliberate global install still wins
    /// over the copy the app ships — the bundled toolchain is a fallback, not
    /// an override.
    func testPATHWinsOverBundled() throws {
        let pathDir = try makePATHEntry(named: "globalbin")
        let resources = try makeBundledResources()

        let resolved = ComposeRunner.resolve(near: nil,
                                             searchPATH: pathDir.path,
                                             bundledResources: resources)
        XCTAssertEqual(resolved?.path, pathDir.appendingPathComponent("sharpee").path)
    }

    /// The case D4 exists for: no checkout, nothing on PATH — the app's own
    /// toolchain answers, so Cmd-B works on a machine with no Node or npm.
    func testBundledResolvesWhenShimAndPATHMiss() throws {
        let resources = try makeBundledResources()
        let emptyDir = tempDir.appendingPathComponent("emptybin", isDirectory: true)
        try FileManager.default.createDirectory(at: emptyDir, withIntermediateDirectories: true)

        let resolved = ComposeRunner.resolve(near: nil,
                                             searchPATH: emptyDir.path,
                                             bundledResources: resources)
        XCTAssertEqual(resolved?.path, resources.appendingPathComponent("toolchain/bin/sharpee").path)
    }

    /// A story OUTSIDE any checkout still falls through to the bundled tier —
    /// the first-install shape D4 was ruled on (new story in ~/Documents).
    func testStoryOutsideCheckoutFallsThroughToBundled() throws {
        let resources = try makeBundledResources()
        let loose = tempDir.appendingPathComponent("Documents/loose.story")
        try FileManager.default.createDirectory(at: loose.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try "story \"Loose\" by \"Tests\"\n".write(to: loose, atomically: true, encoding: .utf8)

        let resolved = ComposeRunner.resolve(near: loose,
                                             searchPATH: nil,
                                             bundledResources: resources)
        XCTAssertEqual(resolved?.path, resources.appendingPathComponent("toolchain/bin/sharpee").path)
    }

    /// All three tiers miss — the `.sharpeeNotFound` path survives for dev
    /// builds assembled without the vendor step.
    func testAllTiersMissingResolvesToNil() throws {
        let emptyDir = tempDir.appendingPathComponent("emptybin", isDirectory: true)
        try FileManager.default.createDirectory(at: emptyDir, withIntermediateDirectories: true)
        XCTAssertNil(ComposeRunner.resolve(near: nil,
                                           searchPATH: emptyDir.path,
                                           bundledResources: nil))
    }
}
