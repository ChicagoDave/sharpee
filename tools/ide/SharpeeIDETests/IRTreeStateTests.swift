// IRTreeStateTests.swift
// Last-ok-IR retention (ADR-258 D6): an ok compile populates the tree; a failed
// compile RETAINS the last ok IR marked stale (never blanks, never renders a
// non-ok IR); a subsequent ok compile un-stales; a story that has never compiled
// cleanly is empty with a stated reason; switching stories never shows the old
// story's structure — plus one real-CLI pass over the whole retention loop.

import XCTest
@testable import SharpeeIDE

@MainActor
final class IRTreeStateTests: XCTestCase {

    private let storyA = URL(fileURLWithPath: "/tmp/a.story")
    private let storyB = URL(fileURLWithPath: "/tmp/b.story")

    private func okIR(title: String) -> ComposeStoryIR {
        ComposeStoryIR(format: "story language 1", languageVersion: "2.1.0",
                       meta: .init(title: title, author: "T", fields: [:]),
                       grammarFile: nil, entities: [], actions: [])
    }

    private func okOutcome(_ url: URL, title: String = "OK") -> ComposeScheduler.Outcome {
        .init(storyURL: url,
              result: .success(ComposeJsonPayload(schemaVersion: 1, diagnostics: [],
                                                  ir: okIR(title: title))))
    }

    /// A gate-failing compile: valid payload, diagnostics, NO ir (atomic load).
    private func failedCompileOutcome(_ url: URL) -> ComposeScheduler.Outcome {
        .init(storyURL: url,
              result: .success(ComposeJsonPayload(schemaVersion: 1, diagnostics: [
                  ComposeDiagnosticRecord(severity: .error, code: "analysis.unknown-entity",
                                          message: "boom", file: url.path, line: 1,
                                          span: DiagnosticSpan(line: 1, column: 1, endLine: 1, endColumn: 2)),
              ], ir: nil)))
    }

    func testNeverCompiledShowsEmptyWithReason() {
        var state = IRTreeState()
        state.apply(failedCompileOutcome(storyA))
        XCTAssertEqual(state.display, .empty(reason: IRTreeState.neverCompiledReason))
    }

    func testOkCompilePopulates() {
        var state = IRTreeState()
        state.apply(okOutcome(storyA))
        XCTAssertEqual(state.display, .populated(ir: okIR(title: "OK"), stale: false))
        XCTAssertEqual(state.storyURL, storyA)
    }

    func testFailedCompileRetainsLastOkIRMarkedStale() {
        var state = IRTreeState()
        state.apply(okOutcome(storyA))
        state.apply(failedCompileOutcome(storyA))
        XCTAssertEqual(state.display, .populated(ir: okIR(title: "OK"), stale: true),
                       "the tree keeps rendering the last ok IR, marked stale")
    }

    func testPipelineFailureAlsoMarksStale() {
        var state = IRTreeState()
        state.apply(okOutcome(storyA))
        state.apply(.init(storyURL: storyA, result: .failure(.sharpeeNotFound)))
        XCTAssertEqual(state.display, .populated(ir: okIR(title: "OK"), stale: true))
    }

    func testFixingTheErrorUnstales() {
        var state = IRTreeState()
        state.apply(okOutcome(storyA, title: "v1"))
        state.apply(failedCompileOutcome(storyA))
        state.apply(okOutcome(storyA, title: "v2"))
        XCTAssertEqual(state.display, .populated(ir: okIR(title: "v2"), stale: false),
                       "a fresh ok compile replaces the retained IR and clears the marker")
    }

    func testSwitchingToANeverCompiledStoryNeverShowsTheOldTree() {
        var state = IRTreeState()
        state.apply(okOutcome(storyA))
        state.apply(failedCompileOutcome(storyB))
        XCTAssertEqual(state.display, .empty(reason: IRTreeState.neverCompiledReason),
                       "story A's retained IR must not masquerade as story B's structure")
        XCTAssertEqual(state.storyURL, storyB)
    }

    /// Real-CLI retention loop (rule 13a): ok compile → broken edit retains the
    /// tree stale while Problems gets the current error → fix un-stales.
    func testRetentionLoopOverRealCompose() throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-IRTreeStateTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }
        let story = tempDir.appendingPathComponent("probe.story")
        try TestToolchain.cleanStory.write(to: story, atomically: true, encoding: .utf8)

        let scheduler = ComposeScheduler()
        let runner = ComposeRunner()
        scheduler.composeInvoker = TestToolchain.composeInvoker(runner: runner)
        var state = IRTreeState()

        func compose(_ content: String) -> ComposeScheduler.Outcome {
            let done = expectation(description: "compose")
            var captured: ComposeScheduler.Outcome!
            scheduler.onOutcome = { captured = $0; done.fulfill() }
            scheduler.composeNow(storyURL: story, content: content)
            wait(for: [done], timeout: 60)
            return captured
        }

        state.apply(compose(TestToolchain.cleanStory))
        guard case .populated(let ir, false) = state.display else {
            return XCTFail("expected populated tree, got \(state.display)")
        }
        XCTAssertEqual(ir.allEntities.map { $0.name }.sorted(), ["Lab", "player"])

        let broken = compose(TestToolchain.analyzerErrorStory)
        state.apply(broken)
        guard case .populated(_, true) = state.display else {
            return XCTFail("expected stale retained tree, got \(state.display)")
        }
        if case .success(let payload) = broken.result {
            XCTAssertEqual(payload.diagnostics.first?.code, "analysis.unknown-entity",
                           "Problems tracks the CURRENT source while the tree stays retained")
        } else {
            XCTFail("expected a decoded payload for the broken source")
        }

        state.apply(compose(TestToolchain.cleanStory))
        guard case .populated(_, false) = state.display else {
            return XCTFail("expected un-staled tree, got \(state.display)")
        }
    }
}
