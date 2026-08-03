// StoryIndex.swift
// IDE-side projections of the Story IR (David's ruling: this is an IDE thing —
// no platform contract): the story statistics, the build report appended to a
// successful build's output (the "little bit of PR" — the story's name in
// lights plus its numbers), and the Index sections (the granular listings the
// build output deliberately does NOT carry — full object list, phrase names,
// actions, hatches — every row span-navigable).
// Pure and view-free; IndexView renders the sections, BuildController prints
// the report.
// Public interface: StoryStats, StoryIndex.stats(of:), buildReport(for:),
// sections(of:), IndexSection, IndexRow.
// Owner context: tools/ide — Compose.

import Foundation

/// The story's headline numbers, computed from the IR.
struct StoryStats: Equatable {
    let rooms: Int
    let regions: Int
    let things: Int
    let people: Int      // person-kind entities, the player included
    let actions: Int
    let phrases: Int     // default-locale phrase keys
    let hatches: Int
}

/// The Index's section identities — each carries its display title; the view
/// maps a kind to its icon and accent color.
enum IndexSectionKind: CaseIterable, Equatable {
    case rooms, regions, things, people, actions, phrases, hatches

    var title: String {
        switch self {
        case .rooms: return "Rooms"
        case .regions: return "Regions"
        case .things: return "Things"
        case .people: return "People"
        case .actions: return "Actions"
        case .phrases: return "Phrases"
        case .hatches: return "Hatch Modules"
        }
    }
}

/// One Index section (Rooms, Things, People, Actions, Phrases, Hatches…).
struct IndexSection: Equatable {
    let kind: IndexSectionKind
    let rows: [IndexRow]

    var title: String { kind.title }
}

/// One Index row: display title, an optional dim detail (kinds, module path),
/// whether the title is a code-like identifier (rendered monospace), and the
/// authored span when the IR carries one (D6 navigation).
struct IndexRow: Equatable {
    let title: String
    let detail: String?
    var isCode: Bool = false
    var span: DiagnosticSpan?
}

enum StoryIndex {

    /// Headline numbers for `ir`.
    static func stats(of ir: ComposeStoryIR) -> StoryStats {
        var rooms = 0, regions = 0, things = 0, people = 0
        for entity in ir.allEntities {
            if entity.hasKind("room") { rooms += 1 }
            else if entity.hasKind("region") { regions += 1 }
            else if entity.hasKind("person") || entity.isPlayer { people += 1 }
            else { things += 1 }
        }
        return StoryStats(rooms: rooms,
                          regions: regions,
                          things: things,
                          people: people,
                          actions: ir.allActions.count,
                          phrases: authoredPhraseNames(of: ir).count,
                          hatches: ir.allHatches.count)
    }

    /// The AUTHORED phrase names: dotted keys (`lab.description`) are
    /// platform-synthesized ids the analyzer generates when lowering prose —
    /// the author cannot even write a dot in a phrase name (David's dotted-names
    /// framework: dots = platform ids, kebab = author labels). They are not
    /// phrases the author wrote, so neither the counts nor the listing show them.
    static func authoredPhraseNames(of ir: ComposeStoryIR) -> [ComposeStoryIR.PhraseName] {
        (ir.phrases?.defaultLocaleNames ?? []).filter { !$0.key.contains(".") }
    }

    /// The build-output report (the PR): the story's name, byline, and numbers.
    /// Zero-count segments are omitted — the report celebrates what IS there.
    static func buildReport(for ir: ComposeStoryIR) -> String {
        let stats = stats(of: ir)
        let title = ir.meta.title
        let version = ir.meta.fields.storyVersion.map { " \($0)" } ?? ""
        let id = ir.meta.fields.id ?? "story"

        var counts: [String] = []
        func add(_ n: Int, _ singular: String, _ plural: String? = nil) {
            guard n > 0 else { return }
            counts.append("\(n) \(n == 1 ? singular : (plural ?? singular + "s"))")
        }
        add(stats.rooms, "room")
        add(stats.regions, "region")
        add(stats.things, "thing")
        add(stats.people, "person", "people")
        add(stats.actions, "action")
        add(stats.phrases, "phrase")
        add(stats.hatches, "hatch module")

        let rule = String(repeating: "─", count: 46)
        // ADR-298: the wire is data-only (`authors: [String]`); the client
        // formats the byline. No authors → no "by" segment.
        let authors = ir.meta.fields.authors
        let byline = authors.isEmpty
            ? "  \(id)\(version)"
            : "  by \(authors.joined(separator: ", ")) · \(id)\(version)"
        var lines = [rule,
                     "  \(title)",
                     byline]
        if !counts.isEmpty {
            lines.append("")
            // Two rows of numbers read better than one long one.
            let mid = (counts.count + 1) / 2
            lines.append("  " + counts.prefix(mid).joined(separator: " · "))
            if counts.count > mid {
                lines.append("  " + counts.suffix(from: mid).joined(separator: " · "))
            }
        }
        lines.append(rule)
        return lines.joined(separator: "\n") + "\n"
    }

    /// The Index's granular sections. Empty sections are omitted.
    static func sections(of ir: ComposeStoryIR) -> [IndexSection] {
        var rooms: [IndexRow] = [], regions: [IndexRow] = []
        var things: [IndexRow] = [], people: [IndexRow] = []

        for entity in ir.allEntities.sorted(by: {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }) {
            let kinds = entity.kinds.map { $0.name }.joined(separator: ", ")
            if entity.hasKind("room") {
                let extra = entity.kinds.filter { $0.name != "room" }.map { $0.name }
                    .joined(separator: ", ")
                rooms.append(IndexRow(title: entity.name,
                                      detail: extra.isEmpty ? nil : extra,
                                      span: entity.span))
            } else if entity.hasKind("region") {
                regions.append(IndexRow(title: entity.name, detail: nil, span: entity.span))
            } else if entity.hasKind("person") || entity.isPlayer {
                people.append(IndexRow(title: entity.name,
                                       detail: entity.isPlayer ? "player" : nil,
                                       span: entity.span))
            } else {
                things.append(IndexRow(title: entity.name,
                                       detail: kinds.isEmpty ? nil : kinds,
                                       span: entity.span))
            }
        }

        let actions = ir.allActions
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            .map { IndexRow(title: $0.name, detail: nil, span: $0.span) }

        let phrases = authoredPhraseNames(of: ir)
            .map { IndexRow(title: $0.key, detail: nil, isCode: true, span: $0.span) }

        let hatches = ir.allHatches
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            .map { IndexRow(title: $0.name, detail: $0.modulePath, isCode: true, span: $0.span) }

        let all: [(IndexSectionKind, [IndexRow])] = [
            (.rooms, rooms), (.regions, regions), (.things, things),
            (.people, people), (.actions, actions), (.phrases, phrases),
            (.hatches, hatches),
        ]
        return all.compactMap { kind, rows in
            rows.isEmpty ? nil : IndexSection(kind: kind, rows: rows)
        }
    }
}
