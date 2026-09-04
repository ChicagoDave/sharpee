// WorldIncompleteView.swift
// The Incomplete view (ADR-321 D5/D6): phrases the author's own prose names that
// the parser cannot resolve. Three classes, kept apart because they are three
// different problems — a real thing named by a word it does not answer to, a
// phrase two things both answer to, and a phrase nothing answers to at all.
//
// IT IS A CANDIDATE LIST, NEVER AN ERROR LIST (D6). The phrases are read out of
// prose by heuristic and some of them are scenery the author meant to skip, so
// the wording here says "places a player will reach for something" and never
// "error". Nothing in this view blocks a build or claims a defect.
// IT READS MORE PROSE THAN THE ANALYZER DOES (D11). The rows here are the
// analyzer's findings UNIONED with what a part-of-speech pass over every passage
// adds, so this list is a superset of the headless one and never a different
// reading of it. The extra rows are ranked by role (D12) — without that ranking
// the ungated pass adds roughly three and a half times the candidates and the
// list stops being readable, which is why neither half ships alone.
// THE ROLES ARE THE LIST'S STRUCTURE (D12). Rows sit under a heading naming what
// their mention is worth — Progression, Tools, Atmosphere — because a ranked-but-
// unlabelled list hides the one cut that makes six hundred candidates readable: a
// missing noun in a puzzle's prose is work, the same noun in scenery may be nothing.
// EVERY CARD CARRIES ITS OWN READING (Amendment 3). There was a panel under the list
// holding the selected finding's explanation and buttons; the cards absorbed all of it,
// and two places saying the same thing is how they drift apart.
// Public interface: WorldIncompleteView.show(_:), onActivate, onEdit, candidateCount, WorldIncompleteView.rows(for:class:document:), tabTitles(for:),
// bandTitle(_:), title(_:_:).
// Owner context: tools/ide — World.

import AppKit

final class WorldIncompleteView: NSView {

    /// The three classes, in the order the strip shows them.
    enum FindingClass: Int, CaseIterable {
        /// A real thing, named by a word it does not answer to.
        case missingWord
        /// A phrase two or more things answer to.
        case ambiguous
        /// A phrase nothing answers to.
        case noObject
        /// A thing declared and never described (Amendment 3).
        case undescribed
    }

    /// Invoked when a finding is double-clicked.
    var onActivate: ((WorldFindingDestination) -> Void)? {
        get { table.onActivate }
        set { table.onActivate = newValue }
    }

    /// How many candidates the merged reading holds, all three classes together.
    ///
    /// The World tab badges this rather than the analyzer's own count: under D11
    /// the list this view shows is a superset of the headless one, so the
    /// analyzer's number would name a list nobody is looking at.
    private(set) var candidateCount = 0

    /// Invoked when the author accepts an offer that changes the story source.
    var onEdit: ((WorldCandidateAction, WorldFindingRow) -> Void)?

    /// What the list is showing of what it holds.
    enum Showing: Int, CaseIterable {
        /// Every candidate, ignored ones included.
        case all
        /// What the author has not dismissed — the working list.
        case remaining
        /// Only what the author dismissed, so a decision can be taken back.
        case ignored
    }

    private let classStrip = TabStripView()
    private let bandStrip = TabStripView()
    private let showingControl = NSSegmentedControl(labels: ["All", "Remaining", "Ignored"],
                                                    trackingMode: .selectOne,
                                                    target: nil, action: nil)
    private let table = WorldFindingTable()
    private var ignores = WorldIgnoreStore(storyURL: nil)

    /// Words the author has added this session, by phrase.
    ///
    /// The analysis is of the story as it was BUILT, so it keeps reporting a finding
    /// the author has just fixed until the next build. Tracking the taps lets a card
    /// answer for itself in between: each accepted word leaves the card, and the card
    /// leaves the list when its last one does.
    private var accepted: [String: Set<String>] = [:]

    /// Phrases the author has finished with this session — fixed, not dismissed.
    ///
    /// Kept apart from the ignore list on purpose: ignoring is a decision about the
    /// story that outlives the session and belongs beside the `.story` file, while
    /// this is a fact about a build that is already out of date. Cleared by the next
    /// analysis, which will report the truth.
    private var completed: Set<String> = []

    /// Phrases declared into existence this session, and the line their description
    /// goes on — the card becomes the next question rather than vanishing.
    private var declared: [String: Int] = [:]
    private var band: WorldMentionRole = .tool
    private var showing: Showing = .remaining
    /// Guards the strip-rebuild cycle: `setTabs` selects, selecting re-renders, and
    /// re-rendering rebuilds the strip. Without this the view recurses until the
    /// stack goes (it crashed the whole test process, not one test).
    private var isRendering = false
    private var document: WorldIndexDocument?
    private var reading: WorldReading?
    private var selected: FindingClass = .missingWord

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)

        classStrip.onSelect = { [weak self] index in
            guard let self, let selection = FindingClass(rawValue: index) else { return }
            self.selected = selection
            self.renderSelectedClass()
        }

        bandStrip.onSelect = { [weak self] index in
            guard let self, WorldMentionRole.bands.indices.contains(index) else { return }
            self.band = WorldMentionRole.bands[index]
            self.renderSelectedClass()
        }

        showingControl.segmentStyle = .texturedRounded
        showingControl.controlSize = .small
        showingControl.selectedSegment = Showing.remaining.rawValue
        showingControl.target = self
        showingControl.action = #selector(showingChanged)

        table.rendersCards = true
        table.onCardAction = { [weak self] action, row in self?.perform(action, on: row) }

        for subview in [classStrip, bandStrip, showingControl, table] as [NSView] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            addSubview(subview)
        }

        NSLayoutConstraint.activate([
            classStrip.topAnchor.constraint(equalTo: topAnchor),
            classStrip.leadingAnchor.constraint(equalTo: leadingAnchor),
            classStrip.trailingAnchor.constraint(equalTo: trailingAnchor),

            // The role bands are a strip of their own (David's ruling): headings inside
            // one long list still make the reader scroll past two bands to reach the
            // third, and the whole point of the split is being able to not read them.
            bandStrip.topAnchor.constraint(equalTo: classStrip.bottomAnchor),
            bandStrip.leadingAnchor.constraint(equalTo: leadingAnchor),
            bandStrip.trailingAnchor.constraint(equalTo: showingControl.leadingAnchor, constant: -6),

            showingControl.centerYAnchor.constraint(equalTo: bandStrip.centerYAnchor),
            showingControl.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -8),

            table.topAnchor.constraint(equalTo: bandStrip.bottomAnchor),
            table.leadingAnchor.constraint(equalTo: leadingAnchor),
            table.trailingAnchor.constraint(equalTo: trailingAnchor),
            table.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("WorldIncompleteView is not Storyboard-instantiable")
    }

    /// Renders one story's candidate list, keeping the selected class.
    ///
    /// Takes the whole document rather than its Incomplete half, because the list
    /// this view shows is read from the document's prose, vocabulary, filters and
    /// roles together — not from the analyzer's findings alone.
    ///
    /// - Parameters:
    ///   - document: the analyzer's document
    ///   - storyURL: the story the analysis is of, for the ignore list kept beside it
    func show(_ document: WorldIndexDocument, storyURL: URL? = nil) {
        self.document = document
        ignores = WorldIgnoreStore(storyURL: storyURL)
        // A new analysis knows what the author did; the session's own bookkeeping is
        // guesswork that has served its purpose.
        accepted = [:]
        completed = []
        declared = [:]
        let reading = WorldProseChunker.read(document: document)
        self.reading = reading
        candidateCount = reading.counts.missingWord + reading.counts.ambiguous + reading.counts.noObject
        classStrip.setTabs(Self.tabTitles(for: reading), select: selected.rawValue)
        renderSelectedClass()
    }

    /// Carries out what a card's button asked for.
    ///
    /// Dismissals are this view's own business; everything else is an edit to the
    /// author's story or a jump into it, and neither belongs to a list view — those
    /// go up to the window, which owns the editor.
    ///
    /// - Parameters:
    ///   - action: what the author pressed
    ///   - row: the candidate it belongs to
    private func perform(_ action: WorldCandidateAction, on row: WorldFindingRow) {
        switch action {
        case .ignore, .unignore:
            guard let phrase = row.phrase else { return }
            toggleIgnore(phrase)
        case .showPhrase:
            table.onActivate?(row.destination)
        case .showTarget:
            table.onActivate?(row.destination.atDeclaration())
        case .addWord(let word):
            guard let phrase = row.phrase else { return }
            onEdit?(action, row)
            accepted[phrase, default: []].insert(word)
            // THE RECURRING CHECK (David's ruling): after every tap, is this card done?
            // The last adjective completes it — the finding is fixed, and a fixed card
            // must not need dismissing as though the author had merely tolerated it.
            if row.unknownWords.allSatisfy({ accepted[phrase]?.contains($0) == true }) {
                completed.insert(phrase)
            }
            renderSelectedClass()
        case .defineScenery:
            guard let phrase = row.phrase else { return }
            // Cleared first: a refused edit must not leave the card pointing at the
            // line some earlier offer happened to write.
            editedLine = nil
            onEdit?(action, row)
            guard let line = editedLine else { return }
            // Declaring it answers the card's question and asks the next one: the thing
            // exists now and says nothing. The card becomes that question rather than
            // disappearing, because the author is already here with the file open.
            declared[phrase] = line
            renderSelectedClass()
        case .writeDescription:
            // An edit, not a jump: the line does not exist yet, and dropping the author
            // at the end of a `create` block to work out the indentation themselves is
            // the half-measure this whole surface exists to avoid.
            onEdit?(action, row)
        }
    }

    /// The line the last accepted offer wrote, set by whoever applied it.
    ///
    /// The view asks for an edit and the window performs it, so the line comes back
    /// this way rather than being guessed here.
    var editedLine: Int?

    /// Ignores a phrase, or takes the decision back, and re-reads the list.
    /// - Parameter phrase: the phrase the author acted on
    private func toggleIgnore(_ phrase: String) {
        ignores.toggle(phrase)
        renderSelectedClass()
    }

    @objc private func showingChanged() {
        showing = Showing(rawValue: showingControl.selectedSegment) ?? .remaining
        renderSelectedClass()
    }

    /// The class tabs, each carrying its own count.
    ///
    /// Counts ride IN the titles, the ruling the Index tab's section strip
    /// already follows — a separate stats row would say the same numbers twice.
    ///
    /// - Parameter reading: the merged candidate list
    /// - Returns: one title per class, in `FindingClass` order
    static func tabTitles(for reading: WorldReading) -> [String] {
        ["Missing word · \(reading.counts.missingWord)",
         "Ambiguous · \(reading.counts.ambiguous)",
         "No object · \(reading.counts.noObject)",
         "Undescribed · \(reading.counts.undescribed)"]
    }

    /// The rows for one class, derived from the analyzer's answer.
    ///
    /// Each row leads with the phrase as the author wrote it, because that is the
    /// string they will search their own prose for.
    ///
    /// Rows are ordered by role, most urgent first: a phrase in the prose of a
    /// progression-critical thing before one in a tool's, and a room's scenery
    /// last. The order within a role is the order the findings arrived, so the
    /// analyzer's own list keeps its shape inside each band.
    ///
    /// - Parameters:
    ///   - reading: the merged candidate list
    ///   - findingClass: which class to list
    ///   - document: the document the roles are read from
    /// - Returns: the finding rows, ranked
    static func rows(for reading: WorldReading,
                     class findingClass: FindingClass,
                     document: WorldIndexDocument) -> [WorldFindingRow] {
        switch findingClass {
        case .missingWord:
            return banded(reading.missingWord,
                          by: { document.roles[$0.entity] ?? document.role(at: $0.site) }) { finding in
                let missing = finding.missing.map { "“\($0)”" }.joined(separator: ", ")
                let known = finding.knownAs.joined(separator: ", ")
                let target = document.declarations[finding.entity]
                return WorldFindingRow(
                    title: Self.title(finding.phrase, finding.site),
                    detail: "a player typing it reaches nothing — "
                        + "\(target?.name ?? finding.entity) answers to \(known), not \(missing) "
                        + "(matched on “\(finding.matched)”)",
                    symbol: "character.magnify",
                    tint: Theme.worldCandidate,
                    line: finding.site.line,
                    phrase: finding.phrase,
                    passage: finding.site.span,
                    declaration: target?.span,
                    explanation: "Your prose calls it “\(finding.phrase)”. That matched "
                        + "\(target?.name ?? finding.entity) on the word “\(finding.matched)”, but the thing "
                        + "does not answer to \(missing) — so a player typing “\(finding.phrase)” reaches "
                        + "nothing. It answers to \(known).",
                    targetName: target?.name ?? finding.entity,
                    unknownWords: target?.span == nil ? [] : finding.missing)
            }
        case .ambiguous:
            return banded(reading.ambiguous, by: { document.role(at: $0.site) }) { finding in
                WorldFindingRow(
                    title: Self.title(finding.phrase, finding.site),
                    detail: "a player typing it is asked which one — "
                        + "\(finding.candidates.map { document.declarations[$0]?.name ?? $0 }.joined(separator: ", ")) "
                        + "all answer to “\(finding.matched)”",
                    symbol: "questionmark.diamond",
                    tint: Theme.worldAmbiguous,
                    line: finding.site.line,
                    phrase: finding.phrase,
                    passage: finding.site.span,
                    declaration: finding.candidates.first.flatMap { document.declarations[$0]?.span },
                    explanation: "“\(finding.phrase)” reaches \(finding.candidates.count) things — "
                        + "\(finding.candidates.map { document.declarations[$0]?.name ?? $0 }.joined(separator: ", ")) — "
                        + "which all answer to “\(finding.matched)”. A player typing it is asked which one "
                        + "they mean.",
                    targetName: finding.candidates.first.flatMap { document.declarations[$0]?.name })
            }
        case .undescribed:
            // Not read from prose at all: these are things the story DECLARES and never
            // describes, so they are ranked by role like everything else and carry one
            // offer — the line their description goes on.
            return banded(reading.undescribed,
                          by: { document.roles[$0] ?? .atmosphereInfo }) { id in
                let thing = document.declarations[id]
                let name = thing?.name ?? id
                return WorldFindingRow(
                    title: "\(name) says nothing",
                    detail: "declared, and never described",
                    symbol: "text.alignleft",
                    tint: Theme.worldCandidate,
                    line: thing?.span?.line,
                    phrase: name,
                    passage: thing?.span,
                    explanation: "A player who examines \(name) is told there is nothing "
                        + "special about it. That is a fine answer for a thing that exists to be "
                        + "mentioned — ignore this if you meant it — and a hole for anything else.",
                    targetName: name,
                    needsDescription: true)
            }
        case .noObject:
            // The only class with no target to rank by, and the largest by far — so it
            // ranks by how often the prose says the phrase (D6 says candidates, and a
            // candidate named five times is a better candidate).
            var occurrences: [String: Int] = [:]
            for finding in reading.noObject { occurrences[finding.phrase, default: 0] += 1 }
            return banded(reading.noObject,
                          by: { document.role(at: $0.site) },
                          occurrences: { occurrences[$0.phrase] ?? 1 }) { finding in
                WorldFindingRow(
                    title: Self.title(finding.phrase, finding.site),
                    detail: (occurrences[finding.phrase] ?? 1) > 1
                        ? "named \(occurrences[finding.phrase] ?? 1) times — no thing in the story answers to it"
                        : "no thing in the story answers to it — a player typing it is told so",
                    symbol: "circle.dashed",
                    tint: Theme.worldUnreached,
                    line: finding.site.line,
                    phrase: finding.phrase,
                    passage: finding.site.span,
                    explanation: "Nothing in the story answers to “\(finding.phrase)”. A player typing it "
                        + "is told so. If it is scenery you meant to leave as words, ignore it; if it is a "
                        + "thing, declaring it here writes the create block and leaves you the description.",
                    canDefineScenery: true,
                    // Scenery goes where the prose that named it lives — but only when
                    // that passage belongs to a ROOM. A phrase read out of an NPC's
                    // reply has no place to put a thing, and guessing one would file
                    // the author's new object somewhere they did not choose.
                    room: Self.placement(for: finding.site, in: document))
            }
        }
    }

    /// Attach each finding's role band and put the list in reading order.
    ///
    /// THE BANDS ARE TABS, NOT HEADINGS (David's ruling). A heading inside one long
    /// list still makes the reader scroll past two bands to reach the third, and
    /// being able to not read a band is the whole point of the split. The band rides
    /// on the row; the strip above the list does the dividing.
    ///
    /// Within a band, rows are ranked: see `rank(_:)`.
    ///
    /// - Parameters:
    ///   - findings: the findings to band
    ///   - role: how to read one finding's role
    ///   - occurrences: how many times each phrase was named anywhere in the story
    ///   - make: how to render one finding as a row
    /// - Returns: the rows, ranked, each carrying its band
    private static func banded<Finding>(_ findings: [Finding],
                                        by role: (Finding) -> WorldMentionRole,
                                        occurrences: (Finding) -> Int = { _ in 1 },
                                        _ make: (Finding) -> WorldFindingRow) -> [WorldFindingRow] {
        findings.enumerated()
            .sorted { left, right in
                let a = role(left.element).rank, b = role(right.element).rank
                if a != b { return a < b }
                // A PHRASE THE PROSE KEEPS USING IS THE BETTER BET. *the plot-board*
                // named in four passages is likelier to be a thing the author means
                // than a noun that appears once, and a list of six hundred is worth
                // nothing unless its first rows are its best ones.
                let countA = occurrences(left.element), countB = occurrences(right.element)
                if countA != countB { return countA > countB }
                return left.offset < right.offset
            }
            .map { make($0.element).banded(role($0.element)) }
    }

    /// Where a new thing read out of this passage should live.
    ///
    /// ANY declared thing can host one, not only a room. A phrase read from a poet's
    /// topic list belongs beside the poet in the file and in the room the poet is in —
    /// those are two different questions and the placement answers both. A passage
    /// owned by nothing (a story-level phrase) has no host and no room, and a
    /// declaration with neither goes at the end rather than somewhere invented.
    ///
    /// - Parameters:
    ///   - site: the passage the phrase came from
    ///   - document: the analysis, for the room's name and where it is declared
    /// - Returns: the placement, or nil when the passage belongs to no room
    static func placement(for site: WorldProseSite, in document: WorldIndexDocument) -> WorldRoomPlacement? {
        guard let owner = site.owner, let host = document.declarations[owner] else { return nil }
        let room = host.room.flatMap { document.declarations[$0]?.name }
        return WorldRoomPlacement(room: room, host: host.name)
    }

    /// What to call one role band in the list.
    ///
    /// The author's words, not the wire's: `progression-info` is a hyphenated key,
    /// and the thing it means is prose about what the story turns on.
    ///
    /// - Parameter role: the band's role
    /// - Returns: its heading
    static func bandTitle(_ role: WorldMentionRole) -> String {
        switch role {
        // "Story", not "Progression": the author's word for what the game turns on.
        case .progressionInfo: return "Story"
        case .tool: return "Tools"
        case .atmosphereInfo: return "Atmosphere"
        }
    }

    /// A finding's headline: the phrase, then where the author will find it.
    ///
    /// Response prose says what fires it as well as where it hangs, because "in Mrs
    /// Kettle" and "in Mrs Kettle · on talking" send the author to different lines of the
    /// same entity (ADR-321 Amendment 1, D10).
    ///
    /// - Parameters:
    ///   - phrase: the phrase as the author wrote it
    ///   - site: where the passage sits
    /// - Returns: the row's title
    static func title(_ phrase: String, _ site: WorldProseSite) -> String {
        var where_ = site.label
        if site.kind == .response, let firedBy = site.firedBy, firedBy != site.label {
            where_ += " · \(firedBy)"
        }
        return "“\(phrase)” in \(where_)"
    }

    /// Draws the selected class, or says why there is nothing to draw.
    private func renderSelectedClass() {
        guard !isRendering else { return }
        isRendering = true
        defer { isRendering = false }

        guard let document, let reading else {
            bandStrip.isHidden = true
            showingControl.isHidden = true
            table.setRows([], emptyMessage: "Build the story to derive its candidate list.")
            return
        }
        bandStrip.isHidden = false
        showingControl.isHidden = false

        let all = Self.rows(for: reading, class: selected, document: document)
            .filter { !$0.isHeader }
            .map { advanced($0) }
        let shown = all.filter { Self.shows($0, showing: showing, ignores: ignores) }

        bandStrip.setTabs(WorldMentionRole.bands.map { role in
            let count = shown.filter { $0.band == role }.count
            return "\(Self.bandTitle(role)) · \(count)"
        }, select: WorldMentionRole.bands.firstIndex(of: band) ?? 0)

        let rows = shown.filter { $0.band == band }
            .map { $0.markingIgnored(ignores.contains($0.phrase ?? "")) }
        table.setRows(rows, emptyMessage: Self.emptyMessage(for: selected, showing: showing))
    }

    /// Whether one row belongs in the list the author asked for.
    /// - Parameters:
    ///   - row: the candidate row
    ///   - showing: which list the author asked for
    ///   - ignores: the phrases they have dismissed
    /// - Returns: true when the row belongs
    static func shows(_ row: WorldFindingRow, showing: Showing, ignores: WorldIgnoreStore) -> Bool {
        let dismissed = ignores.contains(row.phrase ?? "")
        switch showing {
        case .all: return true
        // A completed card leaves the working list the same way a dismissed one does,
        // and for the opposite reason: there is nothing left to do about it.
        case .remaining: return !dismissed && !row.isDone
        case .ignored: return dismissed
        }
    }

    /// One row, brought up to date with what the author has done since the build.
    ///
    /// The analysis cannot know: it describes the story as it was built, and the
    /// author has been fixing it since. This applies the session's own record —
    /// words accepted, things declared — so a card reflects the taps it has had.
    ///
    /// - Parameter row: the row as the analysis reported it
    /// - Returns: the row the author should see now
    private func advanced(_ row: WorldFindingRow) -> WorldFindingRow {
        guard let phrase = row.phrase else { return row }

        if let line = declared[phrase] {
            return row.declaredAwaitingDescription(line: line)
        }
        let taken = accepted[phrase] ?? []
        guard !taken.isEmpty else { return row }
        let left = row.unknownWords.filter { !taken.contains($0) }
        return row.withUnknownWords(left, done: left.isEmpty || completed.contains(phrase))
    }

    /// What to say when a class holds nothing.
    /// - Parameter findingClass: the class being shown
    /// - Returns: a sentence naming what its absence means
    static func emptyMessage(for findingClass: FindingClass, showing: Showing = .remaining) -> String {
        if showing == .ignored { return "Nothing in this band has been ignored." }
        switch findingClass {
        case .missingWord:
            return "Every phrase the prose uses for a real thing is a phrase that thing answers to."
        case .ambiguous:
            return "No phrase in the prose reaches two things at once."
        case .noObject:
            return "Every noun phrase the prose names has something behind it."
        case .undescribed:
            return "Every thing the story declares has something to say when it is examined."
        }
    }
}
