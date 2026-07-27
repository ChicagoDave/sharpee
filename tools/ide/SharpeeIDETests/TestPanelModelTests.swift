// TestPanelModelTests.swift
// Covers TestPanelModel (ADR-277 D2/D3): discovery (tests/ recursive +
// walkthroughs/ chain in filename order; missing dirs = empty groups), record
// application (running → passed/failed/error status, per-command rows,
// run-start reset, undiscovered files appended not dropped), and the
// click-through mapping from a command record to the exact editor
// SourceLocation — driven directly, no synthesized clicks (the known AppKit
// test trap).

import XCTest
@testable import SharpeeIDE

@MainActor
final class TestPanelModelTests: XCTestCase {

    private var tempDir: URL!
    private var model: TestPanelModel!

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-TestPanelModelTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        model = TestPanelModel()
    }

    override func tearDownWithError() throws {
        model = nil
        if let tempDir, FileManager.default.fileExists(atPath: tempDir.path) {
            try FileManager.default.removeItem(at: tempDir)
        }
        tempDir = nil
        super.tearDown()
    }

    private func write(_ relative: String) throws -> URL {
        let url = tempDir.appendingPathComponent(relative)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try "title: t\n---\n\n> look\n[OK: contains \"x\"]\n".write(to: url, atomically: true, encoding: .utf8)
        return url.standardizedFileURL
    }

    // MARK: - Discovery

    func testDiscoversTestsSubtreeAndWalkthroughsChainInFilenameOrder() throws {
        let deep = try write("tests/transcripts/b-deep.transcript")
        let shallow = try write("tests/a-shallow.transcript")
        let wt2 = try write("walkthroughs/wt-02-second.transcript")
        let wt1 = try write("walkthroughs/wt-01-first.transcript")
        _ = try write("walkthroughs/README.md") // wrong extension — ignored? (written as .md)

        model.discover(storyDir: tempDir)

        let tests = model.entries.filter { $0.group == .tests }.map(\.file)
        XCTAssertEqual(tests, [shallow, deep], "tests/ is recursive, path-sorted")
        let chain = model.entries.filter { $0.group == .walkthroughs }.map(\.file)
        XCTAssertEqual(chain, [wt1, wt2], "the chain is filename order — D3, no manifest")
    }

    func testMissingDirectoriesYieldEmptyGroupsNotErrors() {
        model.discover(storyDir: tempDir.appendingPathComponent("nope"))
        XCTAssertTrue(model.entries.isEmpty)
    }

    // MARK: - Record application

    func testAppliesStreamRecordsToStatusesCommandsAndCounts() throws {
        let file = try write("tests/a.transcript")
        model.discover(storyDir: tempDir)

        model.apply(.transcriptStart(TestTranscriptStart(file: file.path, index: 0)))
        XCTAssertEqual(model.entries[0].status, .running)

        let command = TestCommandResult(file: file.path, line: 4, input: "look",
                                        passed: true, expectedFailure: false,
                                        skipped: false, error: nil)
        model.apply(.commandResult(command))
        XCTAssertEqual(model.entries[0].commands, [command])

        model.apply(.transcriptEnd(TestTranscriptEnd(
            file: file.path, status: .passed, passed: 1, failed: 0,
            expectedFailures: 0, skipped: 0, duration: 12, errorMessage: nil)))
        XCTAssertEqual(model.entries[0].status, .passed)
        XCTAssertEqual(model.entries[0].counts.passed, 1)

        model.apply(.runEnd(TestRunEnd(totalPassed: 1, totalFailed: 0,
                                       totalExpectedFailures: 0, totalSkipped: 0,
                                       totalErrors: 0, totalDuration: 12, exitCode: 0)))
        XCTAssertEqual(model.runSummary, "1 passed")
    }

    func testErrorStatusCarriesTheMessage() throws {
        let file = try write("tests/broken.transcript")
        model.discover(storyDir: tempDir)
        model.apply(.transcriptEnd(TestTranscriptEnd(
            file: file.path, status: .error, passed: 0, failed: 0,
            expectedFailures: 0, skipped: 0, duration: 0,
            errorMessage: "Transcript validation failed")))
        XCTAssertEqual(model.entries[0].status,
                       .error(message: "Transcript validation failed"))
    }

    func testRunStartResetsPriorResults() throws {
        let file = try write("tests/a.transcript")
        model.discover(storyDir: tempDir)
        model.apply(.transcriptEnd(TestTranscriptEnd(
            file: file.path, status: .failed, passed: 0, failed: 1,
            expectedFailures: 0, skipped: 0, duration: 5, errorMessage: nil)))
        model.apply(.runStart(TestRunStart(mode: .tests, transcriptCount: 1)))
        XCTAssertEqual(model.entries[0].status, .idle)
        XCTAssertTrue(model.entries[0].commands.isEmpty)
        XCTAssertNil(model.runEnd)
    }

    func testUndiscoveredFileIsAppendedNeverDropped() throws {
        model.discover(storyDir: tempDir) // empty tree
        let stray = tempDir.appendingPathComponent("elsewhere/x.transcript").standardizedFileURL
        model.apply(.transcriptEnd(TestTranscriptEnd(
            file: stray.path, status: .passed, passed: 1, failed: 0,
            expectedFailures: 0, skipped: 0, duration: 1, errorMessage: nil)))
        XCTAssertEqual(model.entries.map(\.file), [stray])
    }

    // MARK: - Click-through (driven directly, no synthesized clicks)

    func testCommandRowMapsToItsExactSourceLine() throws {
        let file = try write("tests/a.transcript")
        let command = TestCommandResult(file: file.path, line: 17, input: "north",
                                        passed: false, expectedFailure: false,
                                        skipped: false, error: nil)
        let location = model.location(for: command)
        XCTAssertEqual(location.file, file)
        XCTAssertEqual(location.line, 17)
        XCTAssertEqual(location.column, 1)
    }
}
