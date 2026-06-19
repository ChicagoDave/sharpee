// BuildRunnerTests.swift
// Real-path tests for BuildRunner: spawns actual subprocesses (fixture shell scripts
// written to a temp dir) through the production start() path, asserting on captured
// output, exit-driven state, launch failure, and signal-based cancel.

import XCTest
@testable import SharpeeIDE

@MainActor
final class BuildRunnerTests: XCTestCase {

    private var tempDir: URL!
    private var runner: BuildRunner!
    private var delegate: RecordingDelegate!

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-BuildRunnerTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        runner = BuildRunner()
    }

    override func tearDownWithError() throws {
        runner = nil
        delegate = nil
        if let tempDir, FileManager.default.fileExists(atPath: tempDir.path) {
            try FileManager.default.removeItem(at: tempDir)
        }
        tempDir = nil
        super.tearDown()
    }

    /// Writes an executable bash script (with shebang) to the temp dir and returns its URL.
    private func makeScript(_ body: String) throws -> URL {
        let url = tempDir.appendingPathComponent("script-\(UUID().uuidString).sh")
        try ("#!/bin/bash\n" + body + "\n").write(to: url, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: url.path)
        return url
    }

    /// Runs `executable` and waits (up to `timeout`) for the build to exit.
    private func run(_ executable: URL, timeout: TimeInterval = 5) {
        let exited = expectation(description: "build exits")
        delegate = RecordingDelegate(onExit: { exited.fulfill() })
        runner.delegate = delegate
        runner.start(executable: executable, arguments: [], workingDirectory: tempDir)
        wait(for: [exited], timeout: timeout)
    }

    // MARK: - Success / output

    func testRunsScriptCapturesStdoutAndSucceeds() throws {
        let script = try makeScript("echo 'hello build'; exit 0")
        run(script)

        XCTAssertEqual(delegate.result?.state, .success)
        XCTAssertEqual(delegate.result?.exitCode, 0)
        XCTAssertTrue(delegate.output.contains("hello build"), "output was: \(delegate.output)")
        XCTAssertEqual(runner.state, .success)
    }

    func testStateTransitionsThroughBuildingToSuccess() throws {
        let script = try makeScript("echo done; exit 0")
        run(script)

        XCTAssertEqual(delegate.states.first, .building)
        XCTAssertEqual(delegate.states.last, .success)
    }

    func testStderrIsCaptured() throws {
        let script = try makeScript("echo 'boom' 1>&2; exit 1")
        run(script)

        XCTAssertTrue(delegate.output.contains("boom"), "output was: \(delegate.output)")
        XCTAssertEqual(delegate.result?.state, .failure)
    }

    // MARK: - Failure

    func testNonZeroExitYieldsFailureWithCode() throws {
        let script = try makeScript("exit 3")
        run(script)

        XCTAssertEqual(delegate.result?.state, .failure)
        XCTAssertEqual(delegate.result?.exitCode, 3)
        XCTAssertEqual(runner.state, .failure)
    }

    func testMissingExecutableYieldsFailure() {
        run(tempDir.appendingPathComponent("does-not-exist"))

        XCTAssertEqual(delegate.result?.state, .failure)
        XCTAssertEqual(runner.state, .failure)
    }

    // MARK: - Cancel

    func testCancelTerminatesAndYieldsCancelled() throws {
        let script = try makeScript("sleep 30")
        let exited = expectation(description: "cancelled build exits")
        delegate = RecordingDelegate(onExit: { exited.fulfill() })
        runner.delegate = delegate

        runner.start(executable: script, arguments: [], workingDirectory: tempDir)
        XCTAssertTrue(runner.isRunning)
        runner.cancel()

        // SIGTERM kills `sleep` promptly; the 2s SIGKILL escalation is only a backstop.
        wait(for: [exited], timeout: 5)
        XCTAssertEqual(delegate.result?.state, .cancelled)
        XCTAssertEqual(runner.state, .cancelled)
    }
}

@MainActor
private final class RecordingDelegate: BuildRunnerDelegate {
    var output = ""
    private(set) var states: [BuildRunner.State] = []
    var result: BuildRunner.Result?
    private let onExit: () -> Void

    init(onExit: @escaping () -> Void) { self.onExit = onExit }

    func runner(_ runner: BuildRunner, didEmit text: String) { output += text }
    func runner(_ runner: BuildRunner, didChangeState state: BuildRunner.State) { states.append(state) }
    func runner(_ runner: BuildRunner, didExit result: BuildRunner.Result) {
        self.result = result
        onExit()
    }
}
