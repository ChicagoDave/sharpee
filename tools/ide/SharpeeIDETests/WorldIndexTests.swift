// WorldIndexTests.swift
// Real-path tests for the World tab (ADR-321 D8, rule 13a): the production
// runner spawns the REAL `sharpee world-index` — resolved the way the app
// resolves it — against a story IR composed by the REAL compiler in this
// checkout, and the production decoder reads what it actually wrote.
//
// Nothing here stubs the analyzer. A fake that answers with a hand-written
// document would pin this suite to what the Swift side believes the wire says,
// which is exactly the drift the schema exists to catch. The one fixture is a
// deliberately malformed IR — a shape the real compiler cannot be asked to emit.
//
// AC-9's three failure states are all here: a missing IR, a malformed IR, and a
// process that dies without speaking (the absent-`node` case, which is only
// renderable from this side of the boundary).

import XCTest
@testable import SharpeeIDE

@MainActor
final class WorldIndexTests: XCTestCase {

    private var tempDir: URL!
    private var runner: WorldIndexRunner!

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-WorldIndexTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        runner = WorldIndexRunner()
    }

    override func tearDownWithError() throws {
        runner = nil
        if let tempDir, FileManager.default.fileExists(atPath: tempDir.path) {
            try FileManager.default.removeItem(at: tempDir)
        }
        tempDir = nil
        super.tearDown()
    }

    // MARK: - Helpers

    /// Fernhill's `.story` source in this checkout, or a skipped test.
    private func fernhillStory() throws -> URL {
        let story = TestToolchain.repoRoot
            .appendingPathComponent("branch-stories/fernhill/fernhill.story")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: story.path),
                          "fernhill fixture story not present in this checkout")
        return story
    }

    /// Composes a story to IR with the real CLI, into this test's scratch dir.
    ///
    /// Composed here rather than read from `branch-stories/fernhill/dist/`: a
    /// committed build artifact pins whenever someone last built the story, and
    /// the analysis under test is of THIS checkout's compiler output.
    ///
    /// - Parameter story: the `.story` to compose
    /// - Returns: the written `.ir.json`
    private func composeIR(for story: URL) throws -> URL {
        let sharpee = try XCTUnwrap(ComposeRunner.resolveSharpee(near: story),
                                    "no sharpee resolved for an in-workspace story")
        let irPath = tempDir.appendingPathComponent("fernhill.ir.json")
        let proc = Process()
        proc.executableURL = sharpee
        proc.arguments = ["compose", story.path, "-o", irPath.path]
        proc.currentDirectoryURL = story.deletingLastPathComponent()
        proc.environment = ShellEnvironment.buildEnvironment()
        proc.standardOutput = Pipe()
        proc.standardError = Pipe()
        try proc.run()
        proc.waitUntilExit()
        XCTAssertTrue(FileManager.default.fileExists(atPath: irPath.path),
                      "compose exited \(proc.terminationStatus) without writing an IR")
        return irPath
    }

    /// Runs the production analyze path against an IR and returns what it rendered.
    /// - Parameters:
    ///   - irPath: the IR to analyze
    ///   - story: the story whose workspace resolves the CLI
    ///   - timeout: seconds to wait for the child
    /// - Returns: the decoded response
    private func analyzeReal(_ irPath: URL, near story: URL, timeout: TimeInterval = 60)
        -> WorldIndexResponse {
        let done = expectation(description: "analysis completes")
        var captured: WorldIndexResponse!
        runner.analyze(irPath: irPath, near: story) { response in
            captured = response
            done.fulfill()
        }
        wait(for: [done], timeout: timeout)
        return captured
    }

    /// A real analysis of Fernhill, or a skipped test.
    private func fernhillAnalysis() throws -> WorldIndexDocument {
        let story = try fernhillStory()
        let ir = try composeIR(for: story)
        let response = analyzeReal(ir, near: story)
        // A failed analysis FAILS here rather than skipping. A helper that skips
        // when the toolchain is broken takes every test that depends on it green
        // with it, which is the one outcome this suite must not be able to
        // produce — the fixture's absence is an environment fact, the analyzer's
        // silence is a defect.
        return try XCTUnwrap(response.document,
                             "the analyzer answered no document: \(response.failure?.message ?? "no reason given")")
    }

    // MARK: - The real analyzer, the real story

    /// The whole path: real CLI resolution, real subprocess, real decode, and the
    /// numbers ADR-321's AC-1 pins for Fernhill.
    func testRealCLIAnalyzesFreshlyComposedFernhill() throws {
        let document = try fernhillAnalysis()

        XCTAssertEqual(document.story.id, "fernhill")
        XCTAssertEqual(document.reach.rooms.total, 13, "AC-1: Fernhill is 13 rooms")
        XCTAssertEqual(document.reach.rooms.unreached, [], "AC-1: unmodified Fernhill strands nothing")
        XCTAssertEqual(document.reach.findingCount, 0, "AC-1: zero Reach findings unmodified")
        XCTAssertEqual(document.reach.start, "iron-gates")
        XCTAssertEqual(document.map.start, "iron-gates")
        XCTAssertEqual(document.map.positions.count, 13, "every room is placed")
        XCTAssertTrue(document.map.unplaced.isEmpty)
        XCTAssertFalse(document.map.connections.isEmpty)
        XCTAssertGreaterThan(document.incomplete.counts.noObject, 0,
                             "the candidate list is not empty for a real story")
        XCTAssertFalse(document.analyzerVersion.isEmpty, "the document names the analyzer it came from")
    }

    /// Fernhill's cellar sits a level below everything else, and a door rides
    /// three of its connections — the two map features the view draws
    /// differently, asserted on real data rather than assumed.
    func testFernhillMapCarriesALowerLevelAndDoors() throws {
        let document = try fernhillAnalysis()

        let levels = Set(document.map.positions.map(\.cell.z))
        XCTAssertTrue(levels.contains(0) && levels.contains(-1),
                      "Fernhill's cellar is below ground: \(levels.sorted())")
        XCTAssertTrue(document.map.connections.contains { $0.via != nil },
                      "at least one connection is through a door")
    }

    /// The arguments the app really passes. Pinned so renaming the subcommand in
    /// production cannot leave a green suite behind.
    func testArgumentsNameTheSubcommandAndThePath() {
        let ir = URL(fileURLWithPath: "/tmp/story.ir.json")
        XCTAssertEqual(WorldIndexRunner.arguments(irPath: ir), ["world-index", "/tmp/story.ir.json"])
    }

    /// Where the runner looks for what `sharpee build` wrote.
    func testIRPathFollowsTheBuildsDistLayout() {
        let story = URL(fileURLWithPath: "/authors/tale/tale.story")
        XCTAssertEqual(WorldIndexRunner.irPath(forStory: story).path,
                       "/authors/tale/dist/tale.ir.json")
    }

    // MARK: - AC-9: the three failure states

    /// A story that was never built: the runner answers before spawning anything.
    func testMissingIRRendersTheUnreadableState() throws {
        let story = try fernhillStory()
        let absent = tempDir.appendingPathComponent("never-built.ir.json")
        let response = analyzeReal(absent, near: story)

        let failure = try XCTUnwrap(response.failure, "a missing IR must not decode as an analysis")
        XCTAssertEqual(failure.cause, .unreadableIR)
        XCTAssertEqual(failure.path, absent.path)
        XCTAssertTrue(WorldView.explanation(for: failure).contains("no built story"),
                      "the tab says the story was never built: \(WorldView.explanation(for: failure))")
    }

    /// JSON that is not a Story IR — through the REAL analyzer, which is what
    /// decides the difference between unreadable and malformed.
    func testMalformedIRRendersTheMalformedState() throws {
        let story = try fernhillStory()
        let junk = tempDir.appendingPathComponent("junk.ir.json")
        try #"{"not":"a story"}"#.write(to: junk, atomically: true, encoding: .utf8)
        let response = analyzeReal(junk, near: story)

        let failure = try XCTUnwrap(response.failure, "junk must not decode as an analysis")
        XCTAssertEqual(failure.cause, .malformedIR)
        XCTAssertEqual(failure.path, junk.path)
        XCTAssertTrue(WorldView.explanation(for: failure).contains("could not be read"))
    }

    /// AC-9's third case: the analyzer never speaks. Unreachable from inside a
    /// Node process — an absent `node` kills the child before it can write a
    /// document — so it is asserted at the seam that has to render it.
    func testProcessThatDiesWithoutSpeakingRendersTheUnavailableState() throws {
        let response = WorldIndexRunner.interpret(
            stdout: Data(),
            stderr: Data("env: node: No such file or directory\n".utf8),
            exitCode: 127,
            irPath: URL(fileURLWithPath: "/tmp/story.ir.json"))

        let failure = try XCTUnwrap(response.failure)
        XCTAssertEqual(failure.cause, .unavailable)
        XCTAssertTrue(failure.message.contains("node: No such file"),
                      "the author is told what the process said: \(failure.message)")
    }

    /// Exit code alone, when the child said nothing at all.
    func testSilentNonZeroExitStillNamesTheExitCode() throws {
        let response = WorldIndexRunner.interpret(
            stdout: Data(), stderr: Data(), exitCode: 9,
            irPath: URL(fileURLWithPath: "/tmp/story.ir.json"))

        let failure = try XCTUnwrap(response.failure)
        XCTAssertEqual(failure.cause, .unavailable)
        XCTAssertTrue(failure.message.contains("9"), failure.message)
    }

    // MARK: - The wire contract

    /// A document from a schema this app does not read is REPORTED, never decoded
    /// into the shape it happens to resemble.
    func testUnknownSchemaIsReportedRatherThanDecoded() throws {
        let future = Data(#"{"schema":"world-index/3","analyzerVersion":"9.0.0","ok":true}"#.utf8)
        let response = try WorldIndexResponse.decode(future)

        let failure = try XCTUnwrap(response.failure, "a newer schema must not decode as an analysis")
        XCTAssertEqual(failure.cause, .unavailable)
        XCTAssertTrue(failure.message.contains("world-index/3") && failure.message.contains(worldIndexSchema),
                      "both versions are named: \(failure.message)")
    }

    /// Bytes that are not a document at all are a throw — there is nothing there
    /// to render an explanation from, and the runner turns it into one.
    func testNonDocumentBytesDoNotDecode() {
        XCTAssertThrowsError(try WorldIndexResponse.decode(Data("<html>oops</html>".utf8)))
    }

    // MARK: - What the views make of it

    /// The Reach view's wording on a clean story, from a real analysis.
    func testReachViewSaysNothingIsUnreachableForFernhill() throws {
        let document = try fernhillAnalysis()

        XCTAssertEqual(WorldReachView.rows(for: document.reach), [],
                       "a clean story lists no findings")
        let headline = WorldReachView.headline(for: document.reach)
        XCTAssertTrue(headline.contains("13 rooms"), headline)
        XCTAssertTrue(headline.contains("nothing unreachable"), headline)
    }

    /// An unreached room becomes a listed finding under its own heading — the
    /// shape AC-2's fault injection produces, asserted on the surface that
    /// renders it.
    func testReachViewListsUnreachedRoomsUnderTheirOwnHeader() {
        let reach = WorldReach(
            start: "hall",
            rooms: WorldRoomReach(total: 2, reachable: ["hall"], unreached: ["cellar"]),
            blocked: [], stranded: [], brokenExits: [], nothingToRead: [],
            findingCount: 1, lifted: [], progression: [])

        let rows = WorldReachView.rows(for: reach)
        XCTAssertEqual(rows.count, 2, "one header, one finding")
        XCTAssertTrue(rows[0].isHeader)
        XCTAssertEqual(rows[1].title, "cellar")
        XCTAssertTrue(WorldReachView.headline(for: reach).contains("1 finding"))
    }

    /// Each Incomplete class lists exactly what the analyzer counted for it.
    func testIncompleteViewListsEachClassAtItsCount() throws {
        let document = try fernhillAnalysis()
        let counts = document.incomplete.counts

        XCTAssertEqual(WorldIncompleteView.rows(for: document.incomplete, class: .missingWord).count,
                       counts.missingWord)
        XCTAssertEqual(WorldIncompleteView.rows(for: document.incomplete, class: .ambiguous).count,
                       counts.ambiguous)
        XCTAssertEqual(WorldIncompleteView.rows(for: document.incomplete, class: .noObject).count,
                       counts.noObject)

        let titles = WorldIncompleteView.tabTitles(for: document.incomplete)
        XCTAssertEqual(titles.count, 3)
        XCTAssertTrue(titles[0].hasSuffix("\(counts.missingWord)"), titles[0])
    }

    /// D10: response prose is read, and its attribution survives the wire.
    func testResponseProseCrossesTheWireWithItsAttribution() throws {
        let document = try fernhillAnalysis()
        let all = document.incomplete.noObject.map(\.site) + document.incomplete.ambiguous.map(\.site)

        let responses = all.filter { $0.kind == .response }
        XCTAssertFalse(responses.isEmpty, "Fernhill's NPC and action prose raises candidates")
        XCTAssertTrue(responses.contains { $0.firedBy != nil },
                      "at least one names the clause that fires it")
        XCTAssertTrue(responses.contains { $0.owner == nil },
                      "story-level prose hangs off no entity — both fields are optional")
        XCTAssertTrue(all.allSatisfy { !$0.key.isEmpty && !$0.text.isEmpty },
                      "every site carries its key and its passage (the tagger's input)")
        XCTAssertTrue(all.allSatisfy { !$0.label.isEmpty },
                      "every finding is locatable — label falls back through owner, clause, key")
    }

    /// The headline distinguishes two passages on the same entity.
    func testResponseTitleNamesTheClauseThatFiresIt() {
        let onEntity = WorldProseSite.stub(kind: .description, ownerName: "Mrs Kettle")
        let onClause = WorldProseSite.stub(kind: .response, ownerName: "Mrs Kettle", firedBy: "on talking")

        XCTAssertEqual(WorldIncompleteView.title("kettle", onEntity), "“kettle” in Mrs Kettle")
        XCTAssertEqual(WorldIncompleteView.title("kettle", onClause), "“kettle” in Mrs Kettle · on talking")
    }

    /// Findings carry the source line, so a double-click has somewhere to go.
    func testIncompleteFindingsCarryASourceLine() throws {
        let document = try fernhillAnalysis()
        let rows = WorldIncompleteView.rows(for: document.incomplete, class: .noObject)
        let first = try XCTUnwrap(rows.first, "Fernhill raises no-object candidates")
        XCTAssertNotNil(first.line, "a candidate names the line its phrase sits on")
    }

    /// Fernhill's one collision is reported rather than silently drawn wrong.
    func testMapNoteNamesTheRoomTheSolverMoved() throws {
        let document = try fernhillAnalysis()
        let note = WorldMapView.solverNote(for: document.map)

        XCTAssertFalse(note.isEmpty, "Fernhill's Study/Folly Hill collision is resolved by displacement")
        XCTAssertTrue(note.contains("folly-hill"), note)
        XCTAssertFalse(note.contains("disagrees with itself"),
                       "a displaced room is never also a skew: \(note)")
    }

    /// A map the solver drew exactly says nothing at all.
    func testMapNoteIsSilentWhenNothingWasMoved() {
        let clean = WorldMap(start: "hall",
                             positions: [WorldPlacedRoom(room: "hall", cell: WorldCell(x: 0, y: 0, z: 0))],
                             unplaced: [], collisions: [], skews: [], connections: [])
        XCTAssertEqual(WorldMapView.solverNote(for: clean), "")
    }

    // MARK: - D14, the progression chain

    /// AC-14: the chain crosses the wire, and it names the machine trigger that only
    /// the fixed point can see. The stopcock lifts Fernhill's greenhouse gate through
    /// `define machine the boiler works`; it appears in no condition and no `change`
    /// statement, so a static scan of the IR misses it entirely.
    func testProgressionChainNamesTheMachineTrigger() throws {
        let document = try fernhillAnalysis()

        XCTAssertTrue(document.reach.progression.contains("stopcock"),
                      "chain: \(document.reach.progression)")
        XCTAssertTrue(document.reach.progression.contains("primer-plunger"))
        XCTAssertFalse(document.reach.progression.contains("folly-door"),
                       "a door that gates nothing is not on the chain")
        XCTAssertTrue(document.reach.progression.allSatisfy { !$0.hasPrefix("$") },
                      "machine roles resolve to entities before they cross")
    }

    /// Each lifted obstacle carries what it took — a clean story still has a spine.
    func testLiftedObstaclesCarryWhatTheyRequired() throws {
        let document = try fernhillAnalysis()

        XCTAssertEqual(document.reach.findingCount, 0, "Fernhill is clean")
        XCTAssertEqual(document.reach.lifted.count, 3, "and still has three obstacles in it")
        let cellar = try XCTUnwrap(document.reach.lifted.first { $0.door == "cellar-door" })
        XCTAssertEqual(cellar.requires, ["cellar-door", "tarnished-key"])
        XCTAssertGreaterThanOrEqual(cellar.pass, 1)
    }

    // MARK: - The loading state

    /// The tab says it is working while the derivation runs, and stops saying so when the
    /// answer lands. The analysis is off the main actor precisely so this state can last.
    func testTabShowsLoadingUntilTheAnalysisLands() throws {
        let view = WorldView()
        XCTAssertFalse(view.isLoading, "a fresh tab is not loading, it is empty")

        view.showLoading()
        XCTAssertTrue(view.isLoading)
        XCTAssertEqual(view.findingCount, 0, "the previous build's badge does not survive a rebuild")

        view.show(.ok(try fernhillAnalysis()))
        XCTAssertFalse(view.isLoading, "the answer clears the loading state")
        XCTAssertGreaterThan(view.findingCount, 0)
    }

    /// A failure clears it too — otherwise the tab spins forever on an absent toolchain.
    func testFailureClearsTheLoadingState() {
        let view = WorldView()
        view.showLoading()
        view.show(.failed(WorldIndexFailure(cause: .unavailable, message: "no toolchain")))
        XCTAssertFalse(view.isLoading)
    }

    /// The decode runs off the main actor, so it must be callable from there.
    /// A `@MainActor`-isolated `interpret` would have to hop back, which is the hop this
    /// design exists to avoid.
    func testInterpretIsCallableOffTheMainActor() async {
        let ir = URL(fileURLWithPath: "/tmp/story.ir.json")
        let response = await Task.detached {
            WorldIndexRunner.interpret(stdout: Data(), stderr: Data(), exitCode: 3, irPath: ir)
        }.value
        XCTAssertEqual(response.failure?.cause, .unavailable)
    }

    /// The tab's section titles carry the numbers the author is looking for.
    func testSectionTitlesCarryTheirCounts() throws {
        let document = try fernhillAnalysis()
        let titles = WorldView.sectionTitles(for: document)

        XCTAssertEqual(titles[0], "Map · 13")
        XCTAssertEqual(titles[1], "Reach · 0")
        let candidates = document.incomplete.counts.missingWord
            + document.incomplete.counts.ambiguous
            + document.incomplete.counts.noObject
        XCTAssertEqual(titles[2], "Incomplete · \(candidates)")
    }

}

// MARK: - Test helpers

extension WorldProseSite {
    /// A site with only the fields a title test cares about.
    ///
    /// Built through the decoder rather than a memberwise init so the stub cannot drift
    /// from the wire shape the app actually reads.
    static func stub(kind: WorldProseKind, ownerName: String, firedBy: String? = nil) -> WorldProseSite {
        var json = #"{"key":"k","kind":"\#(kind.rawValue)","owner":"o","ownerName":"\#(ownerName)","line":1,"text":"t""#
        json += firedBy.map { #","firedBy":"\#($0)""# } ?? ""
        json += "}"
        // A malformed stub is a test defect, not a runtime state: fail loudly here.
        return try! JSONDecoder().decode(WorldProseSite.self, from: Data(json.utf8))
    }
}
