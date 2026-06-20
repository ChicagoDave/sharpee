// IntrospectionRunnerTests.swift
// Real-path tests for IntrospectionRunner: spawns actual subprocesses (fixture
// shell scripts) through the production run() path, asserting on the decoded
// manifest (exit 0), the stderr-only-status contract, and the typed failures
// (non-zero exit, undecodable stdout, launch failure).

import XCTest
@testable import SharpeeIDE

@MainActor
final class IntrospectionRunnerTests: XCTestCase {

    private var tempDir: URL!
    private var runner: IntrospectionRunner!

    private static let manifestJSON = """
    {"schemaVersion":1,"story":"dungeo","generatedFrom":"cli",
     "entities":[{"id":"r1","displayName":"West of House","category":"room",
       "traits":{"room":{"exits":["north","south"]}}}]}
    """

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-IntrospectionRunnerTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        runner = IntrospectionRunner()
    }

    override func tearDownWithError() throws {
        runner = nil
        if let tempDir, FileManager.default.fileExists(atPath: tempDir.path) {
            try FileManager.default.removeItem(at: tempDir)
        }
        tempDir = nil
        super.tearDown()
    }

    private func makeScript(_ body: String) throws -> URL {
        let url = tempDir.appendingPathComponent("script-\(UUID().uuidString).sh")
        try ("#!/bin/bash\n" + body + "\n").write(to: url, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: url.path)
        return url
    }

    /// Runs `executable` and waits for the completion, returning its Result.
    private func run(_ executable: URL, timeout: TimeInterval = 5) -> Result<ProjectManifest, IntrospectionRunner.Failure> {
        let done = expectation(description: "introspection completes")
        var captured: Result<ProjectManifest, IntrospectionRunner.Failure>!
        runner.run(executable: executable, arguments: [], workingDirectory: tempDir) { result in
            captured = result
            done.fulfill()
        }
        wait(for: [done], timeout: timeout)
        return captured
    }

    func testDecodesManifestFromStdoutOnSuccess() throws {
        // Single-quote the JSON so the shell passes it through verbatim.
        let script = try makeScript("cat <<'EOF'\n\(Self.manifestJSON)\nEOF\nexit 0")
        let result = run(script)

        guard case .success(let manifest) = result else {
            return XCTFail("expected success, got \(String(describing: result))")
        }
        XCTAssertEqual(manifest.story, "dungeo")
        XCTAssertEqual(manifest.entities.count, 1)
        XCTAssertEqual(manifest.entities.first?.displayName, "West of House")
        XCTAssertEqual(manifest.entities.first?.traits.room?.exits, ["north", "south"])
    }

    func testIgnoresStderrStatusWhenStdoutIsCleanManifest() throws {
        // The CLI writes "Introspecting story: …" to stderr; it must not corrupt the decode.
        let script = try makeScript(
            "echo 'Introspecting story: dungeo' 1>&2\ncat <<'EOF'\n\(Self.manifestJSON)\nEOF\nexit 0")
        let result = run(script)

        guard case .success(let manifest) = result else {
            return XCTFail("expected success, got \(String(describing: result))")
        }
        XCTAssertEqual(manifest.story, "dungeo")
    }

    func testNonZeroExitReportsStderr() throws {
        let script = try makeScript("echo 'Error loading story: boom' 1>&2\nexit 3")
        let result = run(script)

        guard case .failure(.nonZeroExit(let code, let stderr)) = result else {
            return XCTFail("expected nonZeroExit, got \(String(describing: result))")
        }
        XCTAssertEqual(code, 3)
        XCTAssertTrue(stderr.contains("boom"), "stderr was: \(stderr)")
    }

    func testUndecodableStdoutReportsDecodeFailure() throws {
        let script = try makeScript("echo 'not json at all'\nexit 0")
        let result = run(script)

        guard case .failure(.decode) = result else {
            return XCTFail("expected decode failure, got \(String(describing: result))")
        }
    }

    func testLaunchFailureForMissingExecutable() {
        let missing = tempDir.appendingPathComponent("does-not-exist.sh")
        let result = run(missing)

        guard case .failure(.launch) = result else {
            return XCTFail("expected launch failure, got \(String(describing: result))")
        }
    }
}
