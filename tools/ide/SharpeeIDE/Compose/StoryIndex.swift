// StoryIndex.swift
// IDE-side projections of the Story IR (David's ruling: this is an IDE thing —
// no platform contract): the story statistics, the build report appended to a
// successful build's output (the "little bit of PR" — the story's name in
// lights plus its numbers), and the Index sections (the granular listings the
// build output deliberately does NOT carry — full object list, phrase names,
// actions — every row span-navigable).
// The Rooms section also carries the room lens: where each room's heading and
// description come from, read off the IR's text-source fields and never
// re-derived here (ADR-360 D8, ADR-322 D8).
// The Things section carries what each thing answers to: its aka words and
// the forms the compiler gave it, written or worked out, read off the IR's
// `aka` and `forms` and never worked out here (ADR-409 D7.3).
// Pure and view-free; IndexView renders the sections, BuildController prints
// the report.
// Public interface: StoryStats, StoryIndex.stats(of:), buildReport(for:),
// sections(of:), roomLens(of:), namingSummary(of:), IndexSection, IndexRow, RoomLens.
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
}

/// The Index's section identities — each carries its display title; the view
/// maps a kind to its icon and accent color.
enum IndexSectionKind: CaseIterable, Equatable {
    case rooms, regions, things, people, actions, phrases

    var title: String {
        switch self {
        case .rooms: return "Rooms"
        case .regions: return "Regions"
        case .things: return "Things"
        case .people: return "People"
        case .actions: return "Actions"
        case .phrases: return "Phrases"
        }
    }
}

/// One Index section (Rooms, Things, People, Actions, Phrases…).
struct IndexSection: Equatable {
    let kind: IndexSectionKind
    let rows: [IndexRow]

    var title: String { kind.title }
}

/// One Index row: display title, an optional dim detail (kinds, "playable",
/// the room lens), whether the title is a code-like identifier (rendered
/// monospace), whether the detail marks something the author still owes (a
/// room with no description), and the authored span when the IR carries one
/// (D6 navigation).
struct IndexRow: Equatable {
    let title: String
    let detail: String?
    var isCode: Bool = false
    var isWarning: Bool = false
    var span: DiagnosticSpan?
}

/// Where one room's heading and description come from (ADR-360 D8). Built
/// from the IR's `roomNameSource` and `descriptionSource` fields alone: the
/// analyzer decided these once, and the IDE shows them without looking at
/// the phrasebook or the region (ADR-360 AC-9).
struct RoomLens: Equatable {

    /// One text's origin.
    enum Source: Equatable {
        /// Written in the room's own block.
        case own
        /// Shared by a region's `rooms` group, named by its first and last room.
        case group(first: String, last: String)
        /// Nothing written: a heading falls back to the room's name, and a
        /// description leaves LOOK showing only that name (the D7 warning).
        case missing
    }

    let heading: Source
    let description: Source

    /// The D7 warning's case, which the Index marks.
    var hasNoDescription: Bool { description == .missing }

    /// The one-line reading of both sources, for the row's detail.
    var summary: String {
        switch (heading, description) {
        case (.own, .own):
            return "own heading and description"
        case (.group(let first, let last), .group(let descFirst, let descLast))
            where first == descFirst && last == descLast:
            return "heading and description from \(first) … \(last)"
        default:
            return "\(headingPhrase) · \(descriptionPhrase)"
        }
    }

    private var headingPhrase: String {
        switch heading {
        case .own: return "own heading"
        case .group(let first, let last): return "heading from \(first) … \(last)"
        case .missing: return "heading from its name"
        }
    }

    private var descriptionPhrase: String {
        switch description {
        case .own: return "own description"
        case .group(let first, let last): return "description from \(first) … \(last)"
        case .missing: return "no description"
        }
    }
}

enum StoryIndex {

    /// Headline numbers for `ir`.
    static func stats(of ir: ComposeStoryIR) -> StoryStats {
        var rooms = 0, regions = 0, things = 0, people = 0
        for entity in ir.allEntities {
            if entity.hasKind("room") { rooms += 1 }
            else if entity.hasKind("region") { regions += 1 }
            else if entity.hasKind("person") || entity.isPlayable { people += 1 }
            else { things += 1 }
        }
        return StoryStats(rooms: rooms,
                          regions: regions,
                          things: things,
                          people: people,
                          actions: ir.allActions.count,
                          phrases: authoredPhraseNames(of: ir).count)
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
                let lens = roomLens(of: entity)
                let parts = [extra.isEmpty ? nil : extra, lens?.summary].compactMap { $0 }
                rooms.append(IndexRow(title: entity.name,
                                      detail: parts.isEmpty ? nil : parts.joined(separator: " · "),
                                      isWarning: lens?.hasNoDescription ?? false,
                                      span: entity.span))
            } else if entity.hasKind("region") {
                regions.append(IndexRow(title: entity.name, detail: nil, span: entity.span))
            } else if entity.hasKind("person") || entity.isPlayable {
                people.append(IndexRow(title: entity.name,
                                       detail: entity.isPlayable ? "playable" : nil,
                                       span: entity.span))
            } else {
                let parts = [kinds.isEmpty ? nil : kinds, namingSummary(of: entity)].compactMap { $0 }
                things.append(IndexRow(title: entity.name,
                                       detail: parts.isEmpty ? nil : parts.joined(separator: " · "),
                                       span: entity.span))
            }
        }

        let actions = ir.allActions
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            .map { IndexRow(title: $0.name, detail: nil, span: $0.span) }

        let phrases = authoredPhraseNames(of: ir)
            .map { IndexRow(title: $0.key, detail: nil, isCode: true, span: $0.span) }

        let all: [(IndexSectionKind, [IndexRow])] = [
            (.rooms, rooms), (.regions, regions), (.things, things),
            (.people, people), (.actions, actions), (.phrases, phrases),
        ]
        return all.compactMap { kind, rows in
            rows.isEmpty ? nil : IndexSection(kind: kind, rows: rows)
        }
    }

    /// What a thing answers to besides its name: its aka words, and the forms
    /// the compiler gave it, each marked written or worked out (ADR-409 D7.3).
    ///
    /// Read off the IR's `aka` and `forms` alone; nothing is worked out here.
    /// The name's other form is whichever of `forms.singular` and
    /// `forms.plural` the name is not, and it carries `forms.origin`; an aka
    /// word's form is always worked out (a written one stays in `aka`).
    ///
    /// - Parameter entity: an IR entity.
    /// - Returns: e.g. `aka crocks · also answers to jar (worked out), crock
    ///   (worked out)`, or nil when the entity has no aka and no forms. Forms
    ///   whose name is neither their singular nor their plural (an IR the
    ///   loader refuses) are left out rather than guessed at.
    static func namingSummary(of entity: ComposeStoryIR.Entity) -> String? {
        let name: String = entity.name
        var parts: [String] = []
        if !entity.aka.isEmpty {
            parts.append("aka " + entity.aka.joined(separator: ", "))
        }
        if let forms = entity.forms {
            let isPlural: Bool = name == forms.plural
            let isSingular: Bool = name == forms.singular
            if isPlural || isSingular {
                let other: String = isPlural ? forms.singular : forms.plural
                let marker: String = forms.origin == .written ? "written" : "worked out"
                var answers: [String] = []
                if other != name { answers.append("\(other) (\(marker))") }
                for akaForm in forms.aka { answers.append("\(akaForm.form) (worked out)") }
                if !answers.isEmpty {
                    parts.append("also answers to " + answers.joined(separator: ", "))
                }
            }
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    /// The room lens for `entity`, read off its two text-source fields.
    ///
    /// - Parameter entity: an IR entity; rooms carry both fields.
    /// - Returns: the lens, or nil when the IR carries neither field (a
    ///   non-room, or a payload compiled before ADR-360).
    static func roomLens(of entity: ComposeStoryIR.Entity) -> RoomLens? {
        guard let heading = entity.roomNameSource, let description = entity.descriptionSource else {
            return nil
        }
        return RoomLens(heading: source(heading), description: source(description))
    }

    private static func source(_ wire: ComposeStoryIR.TextSource) -> RoomLens.Source {
        switch wire.from {
        case .own:
            return .own
        case .group:
            // The analyzer writes the pair whenever `from` is 'group'; a short
            // list is a wire defect, shown as a group with no names rather
            // than hidden.
            let names = wire.group ?? []
            return .group(first: names.first ?? "", last: names.last ?? "")
        case .none:
            return .missing
        }
    }
}
