// ComposeRunnerTests.swift
// Real-path tests for ComposeRunner (rule 13a): drives the actual devkit CLI
// (`node packages/devkit/dist/cli.js compose <story> --json`) against real
// `.story` fixtures through the production run()/decode path — no stubbed
// toolchain. Fixture shell scripts are used only for the failure shapes the real
// CLI can't be asked to produce on demand (schema drift, weird exit codes).

import XCTest
@testable import SharpeeIDE

@MainActor
final class ComposeRunnerTests: XCTestCase {

    private var tempDir: URL!
    private var runner: ComposeRunner!

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-ComposeRunnerTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        runner = ComposeRunner()
    }

    override func tearDownWithError() throws {
        runner = nil
        if let tempDir, FileManager.default.fileExists(atPath: tempDir.path) {
            try FileManager.default.removeItem(at: tempDir)
        }
        tempDir = nil
        super.tearDown()
    }

    private func writeStory(_ content: String, name: String = "probe.story") throws -> URL {
        let url = tempDir.appendingPathComponent(name)
        try content.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    /// Composes `story` through the real CLI and waits for the result.
    private func composeReal(_ story: URL, timeout: TimeInterval = 60)
        -> Result<ComposeJsonPayload, ComposeRunner.Failure> {
        let done = expectation(description: "compose completes")
        var captured: Result<ComposeJsonPayload, ComposeRunner.Failure>!
        TestToolchain.composeInvoker(runner: runner)(story) { result in
            captured = result
            done.fulfill()
        }
        wait(for: [done], timeout: timeout)
        return captured
    }

    private func makeScript(_ body: String) throws -> URL {
        let url = tempDir.appendingPathComponent("script-\(UUID().uuidString).sh")
        try ("#!/bin/bash\n" + body + "\n").write(to: url, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: url.path)
        return url
    }

    private func runScript(_ script: URL, timeout: TimeInterval = 10)
        -> Result<ComposeJsonPayload, ComposeRunner.Failure> {
        let done = expectation(description: "run completes")
        var captured: Result<ComposeJsonPayload, ComposeRunner.Failure>!
        runner.run(executable: script, arguments: [], workingDirectory: tempDir) { result in
            captured = result
            done.fulfill()
        }
        wait(for: [done], timeout: timeout)
        return captured
    }

    // MARK: - Real CLI, real stories

    func testCleanStoryYieldsEmptyDiagnosticsAndIR() throws {
        let story = try writeStory(TestToolchain.cleanStory)
        let result = composeReal(story)

        guard case .success(let payload) = result else {
            return XCTFail("expected success, got \(String(describing: result))")
        }
        XCTAssertTrue(payload.diagnostics.isEmpty)
        let ir = try XCTUnwrap(payload.ir, "clean compile must carry the IR (D6)")
        XCTAssertEqual(ir.meta.fields["id"], "probe")
        XCTAssertFalse(ir.languageVersion.isEmpty, "IR carries the Chord language version (D9)")
    }

    /// Exit 1 (gate errors) still delivers a decoded payload — with the FULL span
    /// the editor underlines (D5's acceptance criterion).
    func testAnalyzerErrorArrivesWithFullSpan() throws {
        let story = try writeStory(TestToolchain.analyzerErrorStory)
        let result = composeReal(story)

        guard case .success(let payload) = result else {
            return XCTFail("expected success, got \(String(describing: result))")
        }
        XCTAssertNil(payload.ir, "failed compile never carries an IR (atomic load)")
        let record = try XCTUnwrap(payload.diagnostics.first)
        XCTAssertEqual(record.severity, .error)
        XCTAssertEqual(record.code, "analysis.unknown-entity")
        XCTAssertEqual(record.file, story.path, "compile site is the story file as passed")
        let span = try XCTUnwrap(record.span, "compile diagnostics carry the full span")
        XCTAssertEqual(span.line, 11)
        XCTAssertGreaterThan(span.endColumn, span.column, "a real underline range, not a point")
    }

    func testHatchViolationArrivesAsFileLineRecordWithoutSpan() throws {
        let story = try writeStory(TestToolchain.hatchStory, name: "hatch.story")
        try TestToolchain.hatchViolationModule.write(
            to: tempDir.appendingPathComponent("mod.ts"), atomically: true, encoding: .utf8)
        let result = composeReal(story)

        guard case .success(let payload) = result else {
            return XCTFail("expected success, got \(String(describing: result))")
        }
        let record = try XCTUnwrap(payload.diagnostics.first(where: { $0.code == "hatch.chord-namespace" }))
        XCTAssertNil(record.span, "hatch records carry no end-span (D5)")
        XCTAssertEqual(URL(fileURLWithPath: record.file).lastPathComponent, "mod.ts",
                       "hatch site is the module file, not the story")
        XCTAssertEqual(record.line, 1)
    }

    /// A story whose hatch module cannot resolve still returns gates + IR —
    /// the editor path never performs the load-proof (D5/D6 acceptance).
    func testUnresolvableHatchModuleStillReturnsGatesAndIR() throws {
        let story = try writeStory(
            TestToolchain.hatchStory.replacingOccurrences(of: "./mod.ts", with: "./missing.ts"),
            name: "unresolvable.story")
        let result = composeReal(story)

        guard case .success(let payload) = result else {
            return XCTFail("expected success, got \(String(describing: result))")
        }
        XCTAssertTrue(payload.diagnostics.isEmpty)
        XCTAssertNotNil(payload.ir, "gates + IR despite the unresolvable hatch module")
    }

    /// D6 acceptance: the tree populates for fernhill — the ADR's worked example,
    /// a real story with no package.json/node_modules — straight from source, no
    /// build required. Composes the real file, builds the real tree model, and
    /// checks a leaf's span lands inside the actual file.
    func testFernhillTreePopulatesFromSourceAlone() throws {
        let fernhill = TestToolchain.repoRoot
            .appendingPathComponent("stories/fernhill/fernhill.story")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: fernhill.path),
                          "fernhill fixture story not present in this checkout")

        let result = composeReal(fernhill)
        guard case .success(let payload) = result else {
            return XCTFail("expected success, got \(String(describing: result))")
        }
        let ir = try XCTUnwrap(payload.ir, "fernhill composes clean")
        XCTAssertFalse(ir.allEntities.isEmpty)

        let tree = ProjectStructure.build(from: ir)
        let rooms = try XCTUnwrap(tree.first { $0.category == .room },
                                  "fernhill has rooms in its tree")
        XCTAssertFalse(rooms.children.isEmpty)

        let source = try String(contentsOf: fernhill, encoding: .utf8)
        let lineCount = source.split(separator: "\n", omittingEmptySubsequences: false).count
        let leaf = try XCTUnwrap(rooms.children.first?.leaf)
        XCTAssertLessThanOrEqual(leaf.span.line, lineCount,
                                 "leaf spans point into the real authored file")
        XCTAssertNotNil(SpanText.characterRange(of: leaf.span, in: source),
                        "the span resolves to a real character range in the source")
    }

    /// D2 amendment (ADR-269 D8): a grammar-header `.story` composes like any
    /// Chord source — the payload's IR carries the grammarFile marker (Build and
    /// Play gate on it) and its tree content is `define action` blocks. Uses the
    /// real platform grammar file, the only grammar-header file in the repo.
    func testGrammarHeaderFileMarksIRAndYieldsActionTree() throws {
        let grammar = TestToolchain.repoRoot
            .appendingPathComponent("packages/parser-en-us/grammar/standard-en-us.story")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: grammar.path),
                          "standard grammar file not present in this checkout")

        let result = composeReal(grammar)
        guard case .success(let payload) = result else {
            return XCTFail("expected success, got \(String(describing: result))")
        }
        let ir = try XCTUnwrap(payload.ir)
        XCTAssertNotNil(ir.grammarFile, "a grammar header must surface on the IR (D2)")

        let tree = ProjectStructure.build(from: ir)
        let actions = try XCTUnwrap(tree.first { $0.category == .action },
                                    "a grammar file's tree is its define action blocks")
        XCTAssertFalse(actions.children.isEmpty)
    }

    // MARK: - Failure shapes (fixture scripts)

    func testBumpedSchemaVersionRejectsLoudly() throws {
        let script = try makeScript(#"echo '{"schemaVersion":2,"diagnostics":[]}'"#)
        let result = runScript(script)

        guard case .failure(.decode(let error)) = result else {
            return XCTFail("expected decode failure, got \(String(describing: result))")
        }
        XCTAssertEqual(error as? ComposeJsonPayload.DecodeError,
                       .schemaVersionMismatch(found: 2, expected: 1))
    }

    func testUsageExitReportsNonZeroExitWithStderr() throws {
        let script = try makeScript("echo 'usage: sharpee compose' 1>&2\nexit 2")
        let result = runScript(script)

        guard case .failure(.nonZeroExit(let code, let stderr)) = result else {
            return XCTFail("expected nonZeroExit, got \(String(describing: result))")
        }
        XCTAssertEqual(code, 2)
        XCTAssertTrue(stderr.contains("usage"), "stderr was: \(stderr)")
    }

    func testLaunchFailureForMissingExecutable() {
        let missing = tempDir.appendingPathComponent("does-not-exist.sh")
        let result = runScript(missing)

        guard case .failure(.launch) = result else {
            return XCTFail("expected launch failure, got \(String(describing: result))")
        }
    }

    /// A new run supersedes an in-flight one: the stale completion never fires.
    func testNewRunSupersedesInFlightRun() throws {
        let slow = try makeScript("sleep 30\necho '{\"schemaVersion\":1,\"diagnostics\":[]}'")
        let fast = try makeScript("echo '{\"schemaVersion\":1,\"diagnostics\":[]}'")

        var staleFired = false
        runner.run(executable: slow, arguments: [], workingDirectory: tempDir) { _ in
            staleFired = true
        }

        let done = expectation(description: "superseding run completes")
        var captured: Result<ComposeJsonPayload, ComposeRunner.Failure>!
        runner.run(executable: fast, arguments: [], workingDirectory: tempDir) { result in
            captured = result
            done.fulfill()
        }
        wait(for: [done], timeout: 10)

        guard case .success = captured! else {
            return XCTFail("expected the superseding run to succeed, got \(String(describing: captured))")
        }
        XCTAssertFalse(staleFired, "the superseded run's completion must be dropped")
    }
}
