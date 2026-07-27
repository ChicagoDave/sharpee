// ComposeSchedulerTests.swift
// Scheduler behavior: debounce coalescing (one compose per quiet period, newest
// content wins), disk-matching buffers composing the real file, unsaved buffers
// snapshotting to a hidden sibling that is cleaned up and whose record sites are
// remapped to the real story file — plus one end-to-end real-CLI pass over the
// snapshot path (rule 13a).

import XCTest
@testable import SharpeeIDE

@MainActor
final class ComposeSchedulerTests: XCTestCase {

    private var tempDir: URL!
    private var scheduler: ComposeScheduler!

    private var snapshotURL: URL { tempDir.appendingPathComponent(".sharpee-compose.story") }

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-ComposeSchedulerTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        scheduler = ComposeScheduler()
        scheduler.debounceInterval = 0.1
    }

    override func tearDownWithError() throws {
        scheduler = nil
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

    private static let emptyPayload = ComposeJsonPayload(schemaVersion: 1, diagnostics: [], ir: nil)

    func testRapidEditsCoalesceIntoOneComposeWithNewestContent() throws {
        let story = try writeStory("on disk")
        var composedURLs: [URL] = []
        var composedContents: [String] = []
        scheduler.composeInvoker = { url, completion in
            composedURLs.append(url)
            composedContents.append((try? String(contentsOf: url, encoding: .utf8)) ?? "")
            completion(.success(Self.emptyPayload))
        }

        let outcome = expectation(description: "one outcome")
        scheduler.onOutcome = { _ in outcome.fulfill() }

        for i in 1...5 {
            scheduler.noteEdit(storyURL: story, content: "draft \(i)")
        }
        wait(for: [outcome], timeout: 5)

        XCTAssertEqual(composedURLs.count, 1, "five rapid edits must coalesce into one run")
        XCTAssertEqual(composedContents, ["draft 5"], "the newest buffer wins")
    }

    func testBufferMatchingDiskComposesTheRealFile() throws {
        let story = try writeStory(TestToolchain.cleanStory)
        var composedURL: URL?
        scheduler.composeInvoker = { url, completion in
            composedURL = url
            completion(.success(Self.emptyPayload))
        }

        let outcome = expectation(description: "outcome")
        scheduler.onOutcome = { _ in outcome.fulfill() }
        scheduler.composeNow(storyURL: story, content: TestToolchain.cleanStory)
        wait(for: [outcome], timeout: 5)

        XCTAssertEqual(composedURL, story, "disk-matching buffer composes the real file, no snapshot")
        XCTAssertFalse(FileManager.default.fileExists(atPath: snapshotURL.path))
    }

    func testUnsavedBufferSnapshotsComposesAndCleansUp() throws {
        let story = try writeStory("saved content")
        var composedURL: URL?
        var snapshotContentAtComposeTime: String?
        scheduler.composeInvoker = { url, completion in
            composedURL = url
            snapshotContentAtComposeTime = try? String(contentsOf: url, encoding: .utf8)
            // The record's site names the snapshot — the scheduler must remap it.
            let record = ComposeDiagnosticRecord(severity: .error, code: "analysis.unknown-entity",
                                                 message: "test", file: url.path, line: 1,
                                                 span: DiagnosticSpan(line: 1, column: 1, endLine: 1, endColumn: 2))
            completion(.success(ComposeJsonPayload(schemaVersion: 1, diagnostics: [record], ir: nil)))
        }

        var captured: ComposeScheduler.Outcome?
        let outcome = expectation(description: "outcome")
        scheduler.onOutcome = { captured = $0; outcome.fulfill() }
        scheduler.composeNow(storyURL: story, content: "unsaved buffer")
        wait(for: [outcome], timeout: 5)

        XCTAssertEqual(composedURL, snapshotURL, "unsaved buffer composes the hidden sibling snapshot")
        XCTAssertEqual(snapshotContentAtComposeTime, "unsaved buffer")
        XCTAssertFalse(FileManager.default.fileExists(atPath: snapshotURL.path),
                       "snapshot is deleted after the run")

        let result = try XCTUnwrap(captured)
        XCTAssertEqual(result.storyURL, story)
        guard case .success(let payload) = result.result else {
            return XCTFail("expected success, got \(String(describing: result.result))")
        }
        XCTAssertEqual(payload.diagnostics.first?.file, story.path,
                       "snapshot sites are remapped to the real story file")
        XCTAssertEqual(payload.diagnostics.first?.span?.column, 1, "span passes through the remap")
    }

    /// End-to-end over the real CLI (rule 13a): an unsaved buffer with an analyzer
    /// error yields a remapped record whose site is the REAL story file, with the
    /// real span — and the snapshot is gone afterwards.
    func testRealComposeOverUnsavedBufferRemapsToStoryFile() throws {
        let story = try writeStory(TestToolchain.cleanStory)
        let runner = ComposeRunner()
        scheduler.composeInvoker = TestToolchain.composeInvoker(runner: runner)

        var captured: ComposeScheduler.Outcome?
        let outcome = expectation(description: "real compose outcome")
        scheduler.onOutcome = { captured = $0; outcome.fulfill() }
        scheduler.composeNow(storyURL: story, content: TestToolchain.analyzerErrorStory)
        wait(for: [outcome], timeout: 60)

        let result = try XCTUnwrap(captured)
        guard case .success(let payload) = result.result else {
            return XCTFail("expected success, got \(String(describing: result.result))")
        }
        let record = try XCTUnwrap(payload.diagnostics.first)
        XCTAssertEqual(record.code, "analysis.unknown-entity")
        XCTAssertEqual(record.file, story.path,
                       "the real CLI saw the snapshot; the outcome names the story file")
        XCTAssertNotNil(record.span)
        XCTAssertFalse(FileManager.default.fileExists(atPath: snapshotURL.path))
    }

    func testRunnerFailurePublishesFailureOutcome() throws {
        let story = try writeStory("content")
        scheduler.composeInvoker = { _, completion in
            completion(.failure(.sharpeeNotFound))
        }

        var captured: ComposeScheduler.Outcome?
        let outcome = expectation(description: "failure outcome")
        scheduler.onOutcome = { captured = $0; outcome.fulfill() }
        scheduler.composeNow(storyURL: story, content: "content")
        wait(for: [outcome], timeout: 5)

        guard case .failure(.sharpeeNotFound) = try XCTUnwrap(captured).result else {
            return XCTFail("expected sharpeeNotFound to surface as an outcome")
        }
    }
}
