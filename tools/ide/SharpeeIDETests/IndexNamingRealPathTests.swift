// IndexNamingRealPathTests.swift
// ADR-409 AC-11 in the macOS head, on the real path (rule 13a): the devkit CLI
// (`node packages/devkit/dist/cli.js compose <story> --json`) compiles the test
// stories `test-stories/scullery` and `test-stories/refectory`, the production
// decode delivers each thing's `aka` and `forms`, and the Index's Things rows
// show what each thing answers to: the jars' `jar` and `crock` marked worked
// out, and the mouse's `mice`, from `singular of mice`, marked written. No
// stubbed toolchain, no hand-built IR.
//
// Public interface: XCTest case, no production surface.
// Owner context: tools/ide — Compose.

import XCTest
@testable import SharpeeIDE

@MainActor
final class IndexNamingRealPathTests: XCTestCase {

    private var runner: ComposeRunner!

    override func setUp() {
        super.setUp()
        runner = ComposeRunner()
    }

    override func tearDown() {
        runner = nil
        super.tearDown()
    }

    /// Composes a test story through the real CLI and returns its decoded IR.
    private func composeIR(testStory id: String, timeout: TimeInterval = 60) throws -> ComposeStoryIR {
        let story = TestToolchain.repoRoot
            .appendingPathComponent("test-stories/\(id)/\(id).story")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: story.path),
                          "test story \(id) not present in this checkout")
        let done = expectation(description: "compose completes")
        var captured: Result<ComposeJsonPayload, ComposeRunner.Failure>!
        TestToolchain.composeInvoker(runner: runner)(story) { result in
            captured = result
            done.fulfill()
        }
        wait(for: [done], timeout: timeout)
        guard case .success(let payload) = captured else {
            // A compose that fails is a failure here, not a skip: the stories are in-repo.
            return try XCTUnwrap(nil as ComposeStoryIR?, "compose did not succeed: \(String(describing: captured))")
        }
        return try XCTUnwrap(payload.ir, "the payload carries an IR")
    }

    /// The Index's Things row titled `name`.
    private func thingRow(_ name: String, in ir: ComposeStoryIR) throws -> IndexRow {
        let things = try XCTUnwrap(StoryIndex.sections(of: ir).first { $0.kind == .things },
                                   "the Index has a Things section")
        return try XCTUnwrap(things.rows.first { $0.title == name }, "the Things section lists `\(name)`")
    }

    /// The jars, declared plural with the alias crocks: both singulars are the
    /// rule's work, and the row says so.
    func testJarsRowShowsAkaAndWorkedOutForms() throws {
        let ir = try composeIR(testStory: "scullery")
        let jars = try XCTUnwrap(ir.allEntities.first { $0.id == "jars" })
        XCTAssertEqual(jars.aka, ["crocks"])
        XCTAssertEqual(jars.forms?.origin, .workedOut)

        XCTAssertEqual(try thingRow("jars", in: ir).detail,
                       "thing · aka crocks · also answers to jar (worked out), crock (worked out)")
        XCTAssertEqual(try thingRow("whetstone", in: ir).detail,
                       "thing · also answers to whetstones (worked out)")
    }

    /// The mouse, declared `singular of mice`: its plural is the author's, and
    /// the row marks it written.
    func testMouseRowShowsWrittenForm() throws {
        let ir = try composeIR(testStory: "refectory")
        XCTAssertEqual(try thingRow("mouse", in: ir).detail, "thing · also answers to mice (written)")
        XCTAssertEqual(try thingRow("candles", in: ir).detail,
                       "thing · aka prickets · also answers to candle (worked out), pricket (worked out)")
    }

    /// A row with no aka and no forms keeps its plain kinds detail: rooms and
    /// undeclared people carry no forms, so the summary is nil for them.
    func testEntityWithoutFormsHasNoNamingSummary() throws {
        let ir = try composeIR(testStory: "refectory")
        let wren = try XCTUnwrap(ir.allEntities.first { $0.id == "wren" })
        XCTAssertNil(wren.forms)
        XCTAssertNil(StoryIndex.namingSummary(of: wren))
    }
}
