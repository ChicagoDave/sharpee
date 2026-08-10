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

    private func entity(_ name: String, kinds: [String] = [], isPlayer: Bool = false,
                        line: Int = 1) -> ComposeStoryIR.Entity {
        ComposeStoryIR.Entity(id: name.lowercased(), name: name, isPlayer: isPlayer,
                              kinds: kinds.map { ComposeStoryIR.Kind(name: $0) },
                              containing: nil,
                              span: span(line))
    }

    private func ir(entities: [ComposeStoryIR.Entity] = [],
                    actions: [ComposeStoryIR.ActionDef] = [],
                    phrases: ComposeStoryIR.PhraseBook? = nil,
                    hatches: [ComposeStoryIR.Hatch]? = nil,
                    title: String = "The Folly at Fernhill",
                    fields: ComposeStoryIR.Fields = .init(id: "fernhill",
                                                          storyVersion: "0.3.0",
                                                          authors: ["The Sharpee Project"]))
        -> ComposeStoryIR {
        ComposeStoryIR(format: "story language 2", languageVersion: "3.0.0",
                       meta: .init(title: title, fields: fields),
                       grammarFile: nil, entities: entities, actions: actions,
                       phrases: phrases, hatches: hatches)
    }

    private var sampleIR: ComposeStoryIR {
        ir(entities: [
            entity("Iron Gates", kinds: ["room"], line: 5),
            entity("Cellar", kinds: ["room", "dark"], line: 10),
            entity("Grounds", kinds: ["region"], line: 15),
            entity("brass lantern", kinds: ["portable"], line: 20),
            entity("Wren", kinds: ["person"], line: 25),
            entity("player", isPlayer: true, line: 30),
        ],
        actions: [ComposeStoryIR.ActionDef(name: "polishing", span: span(40))],
        phrases: .init(defaultLocale: "en-US", locales: [
            "en-US": .init(names: [
                .init(key: "cellar.description", span: nil), // platform-synthesized
                .init(key: "cold-returns", span: span(50)),
                .init(key: "night-wind", span: span(51)),
                .init(key: "player.description", span: nil), // platform-synthesized
            ]),
        ]),
        hatches: [.init(name: "weather", modulePath: "./weather.ts", span: span(60))])
    }

    // MARK: - Stats

    func testStatsCountByKindWithPlayerAmongPeople() {
        let stats = StoryIndex.stats(of: sampleIR)
        XCTAssertEqual(stats, StoryStats(rooms: 2, regions: 1, things: 1, people: 2,
                                         actions: 1, phrases: 2, hatches: 1),
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
        XCTAssertTrue(report.contains("1 hatch module"))
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
                       [.rooms, .regions, .things, .people, .actions, .phrases, .hatches])

        let rooms = sections[0]
        XCTAssertEqual(rooms.rows.map { $0.title }, ["Cellar", "Iron Gates"])
        XCTAssertEqual(rooms.rows[0].detail, "dark", "extra kinds surface as detail")
        XCTAssertEqual(rooms.rows[0].span, span(10), "every row is span-navigable")
        XCTAssertFalse(rooms.rows[0].isCode)

        let people = sections[3]
        XCTAssertEqual(people.rows.map { $0.title }, ["player", "Wren"])
        XCTAssertEqual(people.rows.first { $0.title == "player" }?.detail, "player")

        let phrases = sections[5]
        XCTAssertEqual(phrases.rows.map { $0.title }, ["cold-returns", "night-wind"])
        XCTAssertEqual(phrases.rows[0].span, span(50))
        XCTAssertTrue(phrases.rows[0].isCode, "phrase keys render monospace")

        let hatches = sections[6]
        XCTAssertEqual(hatches.rows[0].detail, "./weather.ts")
        XCTAssertTrue(hatches.rows[0].isCode)
    }

    func testEmptySectionsAreOmitted() {
        let sections = StoryIndex.sections(of: ir(entities: [entity("Lab", kinds: ["room"])]))
        XCTAssertEqual(sections.map { $0.kind }, [.rooms])
    }

    // MARK: - Stats line (Index header)

    func testStatsLineOmitsZeros() {
        let line = IndexView.statsLine(for: ir(entities: [entity("Lab", kinds: ["room"]),
                                                          entity("lamp")]))
        XCTAssertEqual(line, "1 room · 1 thing")
    }
}
