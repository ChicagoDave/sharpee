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
    /// - Throws: when the analysis does not complete inside `timeout`
    private func analyzeReal(_ irPath: URL, near story: URL, timeout: TimeInterval = 60)
        throws -> WorldIndexResponse {
        let done = expectation(description: "analysis completes")
        var captured: WorldIndexResponse?
        runner.analyze(irPath: irPath, near: story) { response in
            captured = response
            done.fulfill()
        }
        wait(for: [done], timeout: timeout)
        // Unwrapped rather than force-unwrapped: a timeout here used to trap and
        // take the whole test PROCESS down, so one hung analysis was reported as a
        // crash log instead of as one failing test.
        return try XCTUnwrap(captured,
                             "the analyzer did not answer within \(timeout)s — it is hung, not slow")
    }

    /// A real analysis of Fernhill, or a skipped test.
    private func fernhillAnalysis() throws -> WorldIndexDocument {
        let story = try fernhillStory()
        let ir = try composeIR(for: story)
        let response = try analyzeReal(ir, near: story)
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
        let response = try analyzeReal(absent, near: story)

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
        let response = try analyzeReal(junk, near: story)

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
        let future = Data(#"{"schema":"world-index/4","analyzerVersion":"9.0.0","ok":true}"#.utf8)
        let response = try WorldIndexResponse.decode(future)

        let failure = try XCTUnwrap(response.failure, "a newer schema must not decode as an analysis")
        XCTAssertEqual(failure.cause, .unavailable)
        XCTAssertTrue(failure.message.contains("world-index/4") && failure.message.contains(worldIndexSchema),
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

    /// Each Incomplete class lists exactly what the merged reading holds for it.
    ///
    /// Counted WITHOUT the band headings (D12): a heading is structure, not a finding,
    /// and counting it would make the list claim more candidates than it holds.
    func testIncompleteViewListsEachClassAtItsCount() throws {
        let document = try fernhillAnalysis()
        let reading = WorldProseChunker.read(document: document)
        let counts = reading.counts

        func findings(_ findingClass: WorldIncompleteView.FindingClass) -> [WorldFindingRow] {
            WorldIncompleteView.rows(for: reading, class: findingClass, document: document)
                .filter { !$0.isHeader }
        }

        XCTAssertEqual(findings(.missingWord).count, counts.missingWord)
        XCTAssertEqual(findings(.ambiguous).count, counts.ambiguous)
        XCTAssertEqual(findings(.noObject).count, counts.noObject)

        let titles = WorldIncompleteView.tabTitles(for: reading)
        XCTAssertEqual(titles.count, 4, "three prose classes and Undescribed (Amendment 3)")
        XCTAssertTrue(titles[3].hasPrefix("Undescribed · "), titles[3])
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
        let reading = WorldProseChunker.read(document: document)
        let rows = WorldIncompleteView.rows(for: reading, class: .noObject, document: document)
        let first = try XCTUnwrap(rows.first { !$0.isHeader }, "Fernhill raises no-object candidates")
        XCTAssertNotNil(first.line, "a candidate names the line its phrase sits on")
    }

    // MARK: - D11: the part-of-speech pass

    /// AC-16: the headless list is a subset, not a different reading.
    ///
    /// Held by construction rather than by argument — the analyzer's findings go
    /// into the reading first and unchanged — and asserted anyway, because "by
    /// construction" is a property of today's implementation and this is the test
    /// that notices when someone changes it.
    func testHeadlessListSurvivesWholeInsideTheIDEsReading() throws {
        let document = try fernhillAnalysis()
        let reading = WorldProseChunker.read(document: document)

        func key(_ site: WorldProseSite, _ phrase: String) -> String { "\(site.key)|\(phrase)" }

        let missing = Set(reading.missingWord.map { key($0.site, $0.phrase) })
        for finding in document.incomplete.missingWord {
            XCTAssertTrue(missing.contains(key(finding.site, finding.phrase)),
                          "the CLI's “\(finding.phrase)” must survive with its own site")
        }
        let ambiguous = Set(reading.ambiguous.map { key($0.site, $0.phrase) })
        for finding in document.incomplete.ambiguous {
            XCTAssertTrue(ambiguous.contains(key(finding.site, finding.phrase)))
        }
        let noObject = Set(reading.noObject.map { key($0.site, $0.phrase) })
        for finding in document.incomplete.noObject {
            XCTAssertTrue(noObject.contains(key(finding.site, finding.phrase)))
        }

        // AC-11: never drops. The divergence is bounded to the recall direction.
        XCTAssertGreaterThanOrEqual(reading.counts.missingWord, document.incomplete.counts.missingWord)
        XCTAssertGreaterThanOrEqual(reading.counts.ambiguous, document.incomplete.counts.ambiguous)
        XCTAssertGreaterThanOrEqual(reading.counts.noObject, document.incomplete.counts.noObject)
    }

    /// AC-11: the tagger re-heads what the verb list swallows.
    ///
    /// The analyzer reads *the hurricane lamp burns* as one three-word phrase and
    /// loses the lamp, because `burns` is a verb `BOUNDARY_WORDS` does not name.
    /// A run of nouns and adjectives stops at `lamp`, which is the finding.
    func testTaggerRecoversAPhraseTheVerbListSwallows() throws {
        let document = try fernhillAnalysis()
        let filters = document.filters

        let chunks = WorldProseChunker.candidates(
            in: "A brass plate insists on the bell pull. The hurricane lamp burns low.",
            filters: filters)
        let phrases = chunks.map(\.phrase)

        XCTAssertTrue(phrases.contains("brass plate"), "\(phrases)")
        XCTAssertTrue(phrases.contains("hurricane lamp"), "\(phrases)")
        XCTAssertFalse(phrases.contains(where: { $0.hasSuffix("burns") }),
                       "a verb never heads a phrase here")
    }

    /// AC-11: it must never be used to DROP.
    ///
    /// The tagger mis-tags real nouns — `shroud` and `well` both come back as
    /// adverbs — so a reading that trusted it alone would delete findings the
    /// author needs. Those phrases survive because the analyzer's list is unioned
    /// in rather than replaced.
    func testMisTaggedNounsSurviveBecauseTheListIsUnioned() throws {
        let document = try fernhillAnalysis()
        let filters = document.filters

        let mistagged = WorldProseChunker.candidates(in: "A shroud of dust lies over it.", filters: filters)
        XCTAssertFalse(mistagged.map(\.phrase).contains("shroud"),
                       "precondition: the tagger really does miss this one")

        let reading = WorldProseChunker.read(document: document)
        XCTAssertGreaterThanOrEqual(reading.counts.noObject, document.incomplete.counts.noObject,
                                    "nothing the analyzer found is lost to a tagger error")
    }

    /// AC-11a: ungated chunking resolves what the article gate hides.
    func testUngatedChunkingResolvesThePhrasesTheGateHid() throws {
        let document = try fernhillAnalysis()

        for word in ["plunger", "staging", "fuse", "smoke"] {
            let chunk = WorldChunk(phrase: word, words: [word])
            let verdict = WorldProseChunker.classify(chunk,
                                                     against: document.vocabulary,
                                                     filters: document.filters)
            XCTAssertEqual(verdict, .resolved, "“\(word)” names a real thing")
        }
    }

    /// AC-11a: the pass over a whole story's prose stays well inside its budget.
    func testPartOfSpeechPassOverAWholeStoryStaysUnderBudget() throws {
        let document = try fernhillAnalysis()

        let started = Date()
        var chunks = 0
        for site in document.prose {
            chunks += WorldProseChunker.candidates(in: site.text, filters: document.filters).count
        }
        let elapsed = Date().timeIntervalSince(started)

        XCTAssertGreaterThan(chunks, 0)
        XCTAssertLessThan(elapsed, 0.25, "tagged \(document.prose.count) passages in \(elapsed)s")
    }

    /// D11: the four surfaces the IDE applies and never derives all crossed.
    func testTheFourSurfacesCrossTheWire() throws {
        let document = try fernhillAnalysis()

        XCTAssertFalse(document.prose.isEmpty, "every authored passage, once")
        XCTAssertGreaterThan(document.roles.count, 0)
        XCTAssertGreaterThan(document.vocabulary.wordsOf.count, 0)
        XCTAssertFalse(document.vocabulary.exactForms.isEmpty, "both resolution tiers")
        XCTAssertFalse(document.filters.headStopwords.isEmpty)
        XCTAssertEqual(document.filters.maxPhraseWords, 3)

        // The passages the analyzer's own findings never mention are exactly what
        // this surface exists for: without it the IDE would chunk only the prose
        // that already said something.
        var mentioned = Set<String>()
        for finding in document.incomplete.noObject { mentioned.insert(finding.site.key) }
        for finding in document.incomplete.ambiguous { mentioned.insert(finding.site.key) }
        for finding in document.incomplete.missingWord { mentioned.insert(finding.site.key) }
        for edge in document.incomplete.edges { mentioned.insert(edge.site.key) }
        let unmentioned = document.prose.filter { !mentioned.contains($0.key) }
        XCTAssertFalse(unmentioned.isEmpty, "Fernhill has passages reachable no other way")
    }

    /// The analyzer's document is larger than a pipe holds, and the runner survives it.
    ///
    /// This is the regression for a deadlock that shipped in Phase 6 and was
    /// invisible for exactly as long as Fernhill's document stayed under 64KB: the
    /// runner read stdout inside `terminationHandler`, so once the child filled the
    /// pipe it blocked on the write, never exited, and the handler never ran. The
    /// size assertion is half the test — if the document ever shrinks below the
    /// buffer this guard stops guarding anything, and should say so rather than
    /// keep passing.
    func testAnalyzerOutputExceedsAPipeBufferAndTheRunnerStillCompletes() throws {
        let story = try fernhillStory()
        let ir = try composeIR(for: story)

        let sharpee = try XCTUnwrap(ComposeRunner.resolveSharpee(near: story))
        let proc = Process()
        proc.executableURL = sharpee
        proc.arguments = ["world-index", ir.path]
        proc.currentDirectoryURL = story.deletingLastPathComponent()
        proc.environment = ShellEnvironment.buildEnvironment()
        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = Pipe()
        try proc.run()
        // Read BEFORE waiting, which is the whole point.
        let bytes = (try pipe.fileHandleForReading.readToEnd() ?? Data()).count
        proc.waitUntilExit()

        XCTAssertGreaterThan(bytes, 65_536,
                             "the document no longer exceeds a pipe buffer — this guard is now vacuous")

        let response = try analyzeReal(ir, near: story)
        XCTAssertNotNil(response.document, "the runner drains the child rather than deadlocking on it")
    }

    /// D12: every row carries its role band, and the bands come out in rank order.
    ///
    /// The bands are TABS now (David's ruling), so there are no heading rows: the strip
    /// above the list does the dividing and the band rides on the row.
    func testRowsAreBandedByRole() throws {
        let document = try fernhillAnalysis()
        let reading = WorldProseChunker.read(document: document)

        let ranks = reading.noObject.map { document.role(at: $0.site).rank }
        let rows = WorldIncompleteView.rows(for: reading, class: .noObject, document: document)
        XCTAssertEqual(rows.count, reading.noObject.count, "banding never drops a row")
        XCTAssertTrue(rows.allSatisfy { !$0.isHeader }, "bands are tabs, not headings")
        XCTAssertTrue(rows.allSatisfy { $0.band != nil }, "every row knows its band")

        // The unbanded list is not already sorted, so the assertion below is not
        // vacuous — and the banded one is.
        XCTAssertFalse(ranks == ranks.sorted(), "precondition: findings do not arrive in role order")
        let orderedRanks = rows.compactMap { $0.band?.rank }
        XCTAssertEqual(orderedRanks, orderedRanks.sorted(), "rows come out story, tools, atmosphere")
    }

    /// The largest class has no target to rank by, so it ranks by recurrence.
    ///
    /// A list of six hundred candidates is worth nothing unless its first rows are its
    /// best ones, and a phrase the prose keeps using is the better bet.
    func testNoObjectRowsRankByHowOftenTheProseSaysThem() throws {
        let document = try fernhillAnalysis()
        let reading = WorldProseChunker.read(document: document)
        let rows = WorldIncompleteView.rows(for: reading, class: .noObject, document: document)

        var occurrences: [String: Int] = [:]
        for finding in reading.noObject { occurrences[finding.phrase, default: 0] += 1 }
        let repeated = occurrences.filter { $0.value > 1 }
        try XCTSkipIf(repeated.isEmpty, "Fernhill names no phrase twice — nothing to rank")

        for band in WorldMentionRole.bands {
            let counts = rows.filter { $0.band == band }.compactMap { occurrences[$0.phrase ?? ""] }
            XCTAssertEqual(counts, counts.sorted(by: >),
                           "\(WorldIncompleteView.bandTitle(band)): the most-named phrases come first")
        }
    }

    /// An ignored phrase leaves the working list and can be found again.
    func testIgnoringAPhraseFiltersItAndIsReversible() throws {
        let document = try fernhillAnalysis()
        let reading = WorldProseChunker.read(document: document)
        let rows = WorldIncompleteView.rows(for: reading, class: .noObject, document: document)
        let row = try XCTUnwrap(rows.first { $0.phrase != nil })
        let phrase = try XCTUnwrap(row.phrase)

        let story = tempDir.appendingPathComponent("ignores.story")
        try "x".write(to: story, atomically: true, encoding: .utf8)
        var ignores = WorldIgnoreStore(storyURL: story)

        XCTAssertTrue(WorldIncompleteView.shows(row, showing: .remaining, ignores: ignores))
        XCTAssertFalse(WorldIncompleteView.shows(row, showing: .ignored, ignores: ignores))

        ignores.toggle(phrase)
        XCTAssertTrue(ignores.contains(phrase), "the dismissal is remembered")
        XCTAssertFalse(WorldIncompleteView.shows(row, showing: .remaining, ignores: ignores),
                       "a dismissed phrase leaves the working list")
        XCTAssertTrue(WorldIncompleteView.shows(row, showing: .ignored, ignores: ignores))
        XCTAssertTrue(WorldIncompleteView.shows(row, showing: .all, ignores: ignores),
                      "All means all — the author can always see what they dismissed")

        // It survives the window: the list lives beside the story, not in defaults.
        let reopened = WorldIgnoreStore(storyURL: story)
        XCTAssertTrue(reopened.contains(phrase), "the dismissal outlives the session")
        XCTAssertTrue(FileManager.default.fileExists(atPath: WorldIgnoreStore.listURL(for: story).path))

        ignores.toggle(phrase)
        XCTAssertFalse(WorldIgnoreStore(storyURL: story).contains(phrase), "and can be taken back")
        XCTAssertFalse(FileManager.default.fileExists(atPath: WorldIgnoreStore.listURL(for: story).path),
                       "an empty list leaves no file in the author's project")
    }

    /// The title a no-object finding renders under, for matching rows back to findings.
    private static func rowTitle(_ finding: WorldNoObjectFinding, _ document: WorldIndexDocument) -> String {
        WorldIncompleteView.title(finding.phrase, finding.site)
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

        view.show(.ok(try fernhillAnalysis()))
        XCTAssertFalse(view.isLoading, "the answer clears the loading state")
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
        let reading = WorldProseChunker.read(document: document)
        let candidates = reading.counts.missingWord + reading.counts.ambiguous + reading.counts.noObject
        let titles = WorldView.sectionTitles(for: document, candidates: candidates)

        XCTAssertEqual(titles[0], "Map · 13")
        XCTAssertEqual(titles[1], "Reach · 0")
        XCTAssertEqual(titles[2], "Incomplete · \(candidates)")
    }

    /// The IDE reads the analyzer's definition of a thing rather than its own.
    ///
    /// Two readings of one story must agree on what they are looking for. If the
    /// chunker skipped this, its ungated pass would re-add every manner and act the
    /// analyzer understood and set aside, and the suppression would be worth nothing.
    func testTheChunkerAppliesThePublishedThingRule() throws {
        let document = try fernhillAnalysis()
        XCTAssertFalse(document.filters.eventiveHeads.isEmpty, "the rule crosses the wire")

        XCTAssertFalse(document.filters.readsAsThing(head: "flourish"))
        XCTAssertFalse(document.filters.readsAsThing(head: "hesitation"))
        XCTAssertTrue(document.filters.readsAsThing(head: "bolt"))
        XCTAssertTrue(document.filters.readsAsThing(head: "monument"))

        let reading = WorldProseChunker.read(document: document)
        let heads = (reading.noObject.map(\.phrase) + reading.missingWord.map(\.phrase))
            .compactMap { $0.split(separator: " ").last.map(String.init) }
        XCTAssertFalse(heads.contains { document.filters.eventiveHeads.contains($0) },
                       "the IDE's own pass must not re-add what the analyzer set aside")
    }

    /// A row says which thing it matched, in the author's words, and why.
    ///
    /// The id is not an answer: `oil-lamp` is the analyzer's handle for a thing the
    /// author called *the oil lamp* and declared on a line they can be taken to.
    /// Amendment 2 exists because a row that names neither can only be argued with.
    func testMissingWordRowNamesTheTargetAndSaysWhyItMatched() throws {
        let document = try fernhillAnalysis()
        let reading = WorldProseChunker.read(document: document)
        let rows = WorldIncompleteView.rows(for: reading, class: .missingWord, document: document)

        let lamp = try XCTUnwrap(rows.first { $0.phrase == "hurricane lamp" },
                                 "the ADR's own example finding must be in the list")
        XCTAssertEqual(lamp.targetName, "oil lamp", "the author's name for it, not `oil-lamp`")
        let explanation = try XCTUnwrap(lamp.explanation)
        XCTAssertTrue(explanation.contains("oil lamp"), explanation)
        XCTAssertTrue(explanation.contains("lamp"), "the matched word is named: \(explanation)")
        XCTAssertTrue(explanation.contains("hurricane"), "the word it does NOT answer to: \(explanation)")

        XCTAssertNotNil(lamp.passage, "the row can find its phrase in the prose")
        XCTAssertNotNil(lamp.declaration, "the row can reach the thing it matched")
    }

    /// Asking for the target is a different request from asking for the phrase.
    func testTheTargetJumpAsksForTheDeclaration() throws {
        let document = try fernhillAnalysis()
        let reading = WorldProseChunker.read(document: document)
        let rows = WorldIncompleteView.rows(for: reading, class: .missingWord, document: document)
        let row = try XCTUnwrap(rows.first { $0.declaration != nil })

        XCTAssertEqual(row.destination.place, .phrase, "a row's own destination is its phrase")
        XCTAssertEqual(row.destination.atDeclaration().place, .declaration)
        XCTAssertEqual(row.destination.atDeclaration().declaration, row.declaration)
    }

    /// The Incomplete section's number names the list the author actually sees.
    ///
    /// The strip under it counts the merged reading (D11), so a section title read
    /// from the analyzer's own findings would name a smaller list than the one on
    /// screen — the defect a screenshot of Ides of March showed as `Incomplete · 232`
    /// over a class strip summing to 647.
    func testIncompleteSectionCountMatchesTheClassStrip() throws {
        let document = try fernhillAnalysis()
        let reading = WorldProseChunker.read(document: document)
        let stripTotal = reading.counts.missingWord + reading.counts.ambiguous + reading.counts.noObject

        let titles = WorldView.sectionTitles(for: document, candidates: stripTotal)
        XCTAssertEqual(titles[2], "Incomplete · \(stripTotal)")
        XCTAssertGreaterThan(stripTotal,
                             document.incomplete.counts.missingWord
                                 + document.incomplete.counts.ambiguous
                                 + document.incomplete.counts.noObject,
                             "the IDE reading is a superset — otherwise this test proves nothing")
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
