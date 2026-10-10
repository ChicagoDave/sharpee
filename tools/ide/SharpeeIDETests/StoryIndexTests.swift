// StoryIndexTests.swift
// The IDE-side Story Index projections (David's ruling: IDE thing, no platform
// contract): headline stats, the build report ("a little bit of PR" — name in
// lights + numbers, zero-count segments omitted, full listings deliberately
// absent), and the granular Index sections with span-navigable rows.

import XCTest
@testable import SharpeeIDE

@MainActor
final class StoryIndexTests: XCTestCase {

    private func span(_ line: Int) -> DiagnosticSpan {
        DiagnosticSpan(line: line, column: 1, endLine: line, endColumn: 10)
    }

    private func entity(_ name: String, kinds: [String] = [], isPlayable: Bool = false,
                        line: Int = 1,
                        heading: ComposeStoryIR.TextSource? = nil,
                        description: ComposeStoryIR.TextSource? = nil) -> ComposeStoryIR.Entity {
        ComposeStoryIR.Entity(id: name.lowercased(), name: name, isPlayable: isPlayable,
                              kinds: kinds.map { ComposeStoryIR.Kind(name: $0) },
                              containing: nil,
                              descriptionSource: description,
                              roomNameSource: heading,
                              span: span(line))
    }

    private let own = ComposeStoryIR.TextSource(from: .own, regionId: nil, group: nil)
    private let none = ComposeStoryIR.TextSource(from: .none, regionId: nil, group: nil)
    private let mazeGroup = ComposeStoryIR.TextSource(from: .group, regionId: "maze",
                                                      group: ["the Maze 61", "the Maze 71"])
    private let deadEndGroup = ComposeStoryIR.TextSource(from: .group, regionId: "maze",
                                                         group: ["the Dead End 72", "the Dead End 76"])

    private func ir(entities: [ComposeStoryIR.Entity] = [],
                    actions: [ComposeStoryIR.ActionDef] = [],
                    phrases: ComposeStoryIR.PhraseBook? = nil,
                    title: String = "The Folly at Fernhill",
                    fields: ComposeStoryIR.Fields = .init(id: "fernhill",
                                                          storyVersion: "0.3.0",
                                                          authors: ["The Sharpee Project"]))
        -> ComposeStoryIR {
        ComposeStoryIR(format: "story language 2", languageVersion: "3.0.0",
                       meta: .init(title: title, fields: fields),
                       grammarFile: nil, entities: entities, actions: actions,
                       phrases: phrases)
    }

    private var sampleIR: ComposeStoryIR {
        ir(entities: [
            entity("Iron Gates", kinds: ["room"], line: 5),
            entity("Cellar", kinds: ["room", "dark"], line: 10),
            entity("Grounds", kinds: ["region"], line: 15),
            entity("brass lantern", kinds: ["portable"], line: 20),
            entity("Wren", kinds: ["person"], line: 25),
            entity("Alex", isPlayable: true, line: 30),
        ],
        actions: [ComposeStoryIR.ActionDef(name: "polishing", span: span(40))],
        phrases: .init(defaultLocale: "en-US", locales: [
            "en-US": [
                "cellar.description": .init(span: nil), // platform-synthesized
                "cold-returns": .init(span: span(50)),
                "night-wind": .init(span: span(51)),
                "player.description": .init(span: nil), // platform-synthesized
            ],
        ]))
    }

    // MARK: - Stats

    func testStatsCountByKindWithPlayerAmongPeople() {
        let stats = StoryIndex.stats(of: sampleIR)
        XCTAssertEqual(stats, StoryStats(rooms: 2, regions: 1, things: 1, people: 2,
                                         actions: 1, phrases: 2),
                       "phrases counts AUTHORED names only — dotted synthesized keys excluded")
    }

    /// Dots cannot be written in an authored phrase name (the lexer's word class
    /// has no `.`); dotted keys are analyzer-synthesized platform ids
    /// (`<entity-id>.description`) and must never surface as the author's phrases.
    func testSynthesizedDottedKeysAreExcludedEverywhere() throws {
        let phrases = try XCTUnwrap(StoryIndex.sections(of: sampleIR).first { $0.kind == .phrases })
        XCTAssertEqual(phrases.rows.map { $0.title }, ["cold-returns", "night-wind"])
        XCTAssertFalse(StoryIndex.buildReport(for: sampleIR).contains("4 phrases"))
        XCTAssertTrue(StoryIndex.buildReport(for: sampleIR).contains("2 phrases"))
    }

    // MARK: - Build report (the PR)

    func testBuildReportLeadsWithTheStoryNotTheToolchain() {
        let report = StoryIndex.buildReport(for: sampleIR)
        XCTAssertTrue(report.contains("The Folly at Fernhill"))
        XCTAssertTrue(report.contains("by The Sharpee Project · fernhill 0.3.0"))
        XCTAssertTrue(report.contains("2 rooms"))
        XCTAssertTrue(report.contains("2 people"))
        XCTAssertTrue(report.contains("1 thing"))
        XCTAssertTrue(report.contains("2 phrases"))
    }

    func testBuildReportOmitsZeroCountsAndListings() {
        let report = StoryIndex.buildReport(for: ir(entities: [entity("Lab", kinds: ["room"])]))
        XCTAssertTrue(report.contains("1 room"))
        XCTAssertFalse(report.contains("0 "), "zero-count segments are omitted")
        XCTAssertFalse(report.contains("region"))
        XCTAssertFalse(report.contains("Lab"),
                       "the report is the summary — listings live in the Index")
    }

    func testBuildReportSingularPlural() {
        let report = StoryIndex.buildReport(for: sampleIR)
        XCTAssertTrue(report.contains("1 region"))
        XCTAssertFalse(report.contains("1 regions"))
    }

    // MARK: - Index sections

    func testSectionsCarryRowsWithSpansAndDetails() throws {
        let sections = StoryIndex.sections(of: sampleIR)
        XCTAssertEqual(sections.map { $0.kind },
                       [.rooms, .regions, .things, .people, .actions, .phrases])

        let rooms = sections[0]
        XCTAssertEqual(rooms.rows.map { $0.title }, ["Cellar", "Iron Gates"])
        XCTAssertEqual(rooms.rows[0].detail, "dark", "extra kinds surface as detail")
        XCTAssertEqual(rooms.rows[0].span, span(10), "every row is span-navigable")
        XCTAssertFalse(rooms.rows[0].isCode)

        let people = sections[3]
        XCTAssertEqual(people.rows.map { $0.title }, ["Alex", "Wren"])
        XCTAssertEqual(people.rows.first { $0.title == "Alex" }?.detail, "playable")

        let phrases = sections[5]
        XCTAssertEqual(phrases.rows.map { $0.title }, ["cold-returns", "night-wind"])
        XCTAssertEqual(phrases.rows[0].span, span(50))
        XCTAssertTrue(phrases.rows[0].isCode, "phrase keys render monospace")
    }

    func testEmptySectionsAreOmitted() {
        let sections = StoryIndex.sections(of: ir(entities: [entity("Lab", kinds: ["room"])]))
        XCTAssertEqual(sections.map { $0.kind }, [.rooms])
    }

    // MARK: - The room lens (ADR-360 D8)

    /// The lens is the IR's two fields, read as written: own text, a group's
    /// shared text named by its first and last room, or nothing.
    func testRoomLensReadsBothTextSourcesOffTheIR() {
        XCTAssertEqual(StoryIndex.roomLens(of: entity("Sphere Room", kinds: ["room"],
                                                      heading: own, description: own)),
                       RoomLens(heading: .own, description: .own))
        XCTAssertEqual(StoryIndex.roomLens(of: entity("Maze 61", kinds: ["room"],
                                                      heading: mazeGroup, description: mazeGroup)),
                       RoomLens(heading: .group(first: "the Maze 61", last: "the Maze 71"),
                                description: .group(first: "the Maze 61", last: "the Maze 71")))
        XCTAssertEqual(StoryIndex.roomLens(of: entity("Lab", kinds: ["room"],
                                                      heading: none, description: none)),
                       RoomLens(heading: .missing, description: .missing))
    }

    /// A payload without the fields (a non-room, or one compiled before
    /// ADR-360) has no lens — the IDE never fills one in from the phrasebook.
    func testRoomLensIsAbsentWhenTheIRCarriesNoTextSources() {
        XCTAssertNil(StoryIndex.roomLens(of: entity("Cellar", kinds: ["room"])))
        XCTAssertNil(StoryIndex.roomLens(of: entity("Cellar", kinds: ["room"], heading: own)),
                     "one field alone is not a lens")
        XCTAssertNil(StoryIndex.roomLens(of: entity("lamp")))
    }

    func testRoomLensSummaryReadsAsOneLine() {
        XCTAssertEqual(RoomLens(heading: .own, description: .own).summary,
                       "own heading and description")
        XCTAssertEqual(RoomLens(heading: .group(first: "the Maze 61", last: "the Maze 71"),
                                description: .group(first: "the Maze 61", last: "the Maze 71")).summary,
                       "heading and description from the Maze 61 … the Maze 71",
                       "the same group for both collapses to one phrase naming the group")
        XCTAssertEqual(RoomLens(heading: .missing, description: .own).summary,
                       "heading from its name · own description")
        XCTAssertEqual(RoomLens(heading: .own, description: .missing).summary,
                       "own heading · no description")
        XCTAssertEqual(RoomLens(heading: .missing, description: .missing).summary,
                       "heading from its name · no description")
    }

    /// The Rooms rows carry the lens after the extra kinds, and the D7 case
    /// (no description) marks the row.
    func testRoomRowsCarryTheLensAndMarkTheMissingDescription() throws {
        let sections = StoryIndex.sections(of: ir(entities: [
            entity("Cellar", kinds: ["room", "dark"], line: 10, heading: own, description: own),
            entity("Maze 61", kinds: ["room"], line: 20, heading: mazeGroup, description: mazeGroup),
            entity("Dead End 72", kinds: ["room"], line: 21, heading: deadEndGroup, description: deadEndGroup),
            entity("Lab", kinds: ["room"], line: 30, heading: none, description: none),
            entity("Room 33", kinds: ["room"], line: 40, heading: none, description: own),
        ]))
        let rooms = try XCTUnwrap(sections.first { $0.kind == .rooms }).rows
        let byTitle = Dictionary(uniqueKeysWithValues: rooms.map { ($0.title, $0) })

        XCTAssertEqual(byTitle["Cellar"]?.detail, "dark · own heading and description",
                       "the kinds stay first; the lens follows")
        XCTAssertEqual(byTitle["Maze 61"]?.detail,
                       "heading and description from the Maze 61 … the Maze 71")
        XCTAssertEqual(byTitle["Dead End 72"]?.detail,
                       "heading and description from the Dead End 72 … the Dead End 76",
                       "two groups in one region are two kinds of room, each named by its own range")
        XCTAssertEqual(byTitle["Lab"]?.detail, "heading from its name · no description")
        XCTAssertEqual(byTitle["Room 33"]?.detail, "heading from its name · own description")

        XCTAssertEqual(byTitle["Lab"]?.isWarning, true, "the D7 case is marked")
        XCTAssertEqual(byTitle["Cellar"]?.isWarning, false)
        XCTAssertEqual(byTitle["Maze 61"]?.isWarning, false)
        XCTAssertEqual(byTitle["Room 33"]?.isWarning, false,
                       "a heading from the room's name is ordinary, not a warning")
    }

    /// Rooms without the fields render exactly as before ADR-360: kinds only.
    func testRoomRowsWithoutTextSourcesKeepTheirPlainDetail() throws {
        let rooms = try XCTUnwrap(StoryIndex.sections(of: sampleIR).first { $0.kind == .rooms }).rows
        XCTAssertEqual(rooms.map { $0.detail }, ["dark", nil])
        XCTAssertFalse(rooms.contains { $0.isWarning })
    }

    // MARK: - Stats line (Index header)

    func testStatsLineOmitsZeros() {
        let line = IndexView.statsLine(for: ir(entities: [entity("Lab", kinds: ["room"]),
                                                          entity("lamp")]))
        XCTAssertEqual(line, "1 room · 1 thing")
    }
}
