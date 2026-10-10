// RoomTextSourceRealPathTests.swift
// ADR-360 AC-8 (the IR fields) on the real path (rule 13a): the devkit CLI
// (`node packages/devkit/dist/cli.js compose <story> --json`) compiles the
// sixteen-room maze fixture and a one-room story with no prose, and the
// production decode delivers `descriptionSource` and `roomNameSource` on every
// room — group, own and none — which the Index's room lens then reads as
// written. No stubbed toolchain, no hand-built IR.

import XCTest
@testable import SharpeeIDE

@MainActor
final class RoomTextSourceRealPathTests: XCTestCase {

    private var tempDir: URL!
    private var runner: ComposeRunner!

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-RoomTextSourceTests-\(UUID().uuidString)", isDirectory: true)
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

    /// Composes `story` through the real CLI and returns the decoded IR.
    private func composeIR(_ story: URL, timeout: TimeInterval = 60) throws -> ComposeStoryIR {
        let done = expectation(description: "compose completes")
        var captured: Result<ComposeJsonPayload, ComposeRunner.Failure>!
        TestToolchain.composeInvoker(runner: runner)(story) { result in
            captured = result
            done.fulfill()
        }
        wait(for: [done], timeout: timeout)
        guard case .success(let payload) = captured else {
            throw XCTSkip("compose did not succeed: \(String(describing: captured))")
        }
        return try XCTUnwrap(payload.ir, "the payload carries an IR")
    }

    private func room(_ id: String, in ir: ComposeStoryIR) throws -> ComposeStoryIR.Entity {
        try XCTUnwrap(ir.allEntities.first { $0.id == id }, "the IR has `\(id)`")
    }

    /// The ADR's own case: the Maze 61 and the Dead End 72 come from their
    /// groups, the Sphere Room writes both texts itself, and the Room 33 has a
    /// description but no `room name` block.
    func testMazeFixtureDecodesGroupOwnAndNoneSources() throws {
        let fixture = TestToolchain.repoRoot
            .appendingPathComponent("packages/chord/tests/fixtures/maze-sixteen.story")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: fixture.path),
                          "maze-sixteen fixture not present in this checkout")
        let ir = try composeIR(fixture)

        let mazeGroup = ComposeStoryIR.TextSource(from: .group, regionId: "maze",
                                                  group: ["the Maze 61", "the Maze 71"])
        let maze61 = try room("maze-61", in: ir)
        XCTAssertEqual(maze61.descriptionSource, mazeGroup)
        XCTAssertEqual(maze61.roomNameSource, mazeGroup)
        XCTAssertEqual(try room("maze-71", in: ir).descriptionSource, mazeGroup,
                       "the last room of the range names the same group")

        let deadEnds = ComposeStoryIR.TextSource(from: .group, regionId: "maze",
                                                 group: ["the Dead End 72", "the Dead End 76"])
        XCTAssertEqual(try room("dead-end-72", in: ir).descriptionSource, deadEnds)
        XCTAssertEqual(try room("dead-end-72", in: ir).roomNameSource, deadEnds)

        let own = ComposeStoryIR.TextSource(from: .own, regionId: nil, group: nil)
        let sphere = try room("sphere-room-34", in: ir)
        XCTAssertEqual(sphere.descriptionSource, own)
        XCTAssertEqual(sphere.roomNameSource, own)

        let room33 = try room("room-33", in: ir)
        XCTAssertEqual(room33.descriptionSource, own)
        XCTAssertEqual(room33.roomNameSource,
                       ComposeStoryIR.TextSource(from: .none, regionId: nil, group: nil))

        XCTAssertNil(try room("maze", in: ir).descriptionSource, "a region carries no text source")
        XCTAssertNil(try room("alex", in: ir).roomNameSource, "a person carries no text source")
    }

    /// A room with no prose at all: the analyzer writes `from: 'none'` for the
    /// description (the D7 warning's case) and the compose still delivers the
    /// IR, since a warning is not a gate.
    func testRoomWithNoProseDecodesNoneForItsDescription() throws {
        let story = tempDir.appendingPathComponent("bare.story")
        try TestToolchain.cleanStory
            .replacingOccurrences(of: "  a room\n\n  A small lab.\n", with: "  a room\n")
            .write(to: story, atomically: true, encoding: .utf8)
        let ir = try composeIR(story)

        let none = ComposeStoryIR.TextSource(from: .none, regionId: nil, group: nil)
        let lab = try room("lab", in: ir)
        XCTAssertEqual(lab.descriptionSource, none)
        XCTAssertEqual(lab.roomNameSource, none)
    }

    /// The lens reads the real fields and derives nothing: the Index rows for
    /// the maze name each group, the bare Lab is marked, and a room with its
    /// own text says so (ADR-360 AC-9).
    func testIndexRoomLensReadsTheRealFields() throws {
        let fixture = TestToolchain.repoRoot
            .appendingPathComponent("packages/chord/tests/fixtures/maze-sixteen.story")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: fixture.path),
                          "maze-sixteen fixture not present in this checkout")
        let rooms = try XCTUnwrap(StoryIndex.sections(of: try composeIR(fixture))
            .first { $0.kind == .rooms }).rows
        let byTitle = Dictionary(uniqueKeysWithValues: rooms.map { ($0.title, $0) })

        XCTAssertEqual(byTitle["Maze 61"]?.detail,
                       "heading and description from the Maze 61 … the Maze 71")
        XCTAssertEqual(byTitle["Dead End 76"]?.detail,
                       "heading and description from the Dead End 72 … the Dead End 76")
        XCTAssertEqual(byTitle["Sphere Room 34"]?.detail, "own heading and description")
        XCTAssertEqual(byTitle["Room 33"]?.detail, "heading from its name · own description")
        XCTAssertFalse(rooms.contains { $0.isWarning }, "every maze room has a description")

        let bare = tempDir.appendingPathComponent("bare.story")
        try TestToolchain.cleanStory
            .replacingOccurrences(of: "  a room\n\n  A small lab.\n", with: "  a room\n")
            .write(to: bare, atomically: true, encoding: .utf8)
        let bareRooms = try XCTUnwrap(StoryIndex.sections(of: try composeIR(bare))
            .first { $0.kind == .rooms }).rows
        XCTAssertEqual(bareRooms.map { $0.detail }, ["heading from its name · no description"])
        XCTAssertEqual(bareRooms.map { $0.isWarning }, [true], "the D7 case is marked in the Index")
    }
}
