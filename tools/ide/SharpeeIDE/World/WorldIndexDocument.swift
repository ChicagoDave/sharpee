// WorldIndexDocument.swift
// The Swift half of the World Index wire contract (ADR-321, the IDE↔analyzer
// boundary): the `world-index/2` JSON document `@sharpee/world-index`'s CLI
// writes to stdout, decoded into the shapes the World tab renders.
//
// This file MIRRORS `packages/world-index/src/document.ts` and its imports.
// The two cannot share a definition — the boundary is a language boundary, the
// one case DEVARCH 8b exempts from direct import — so the TypeScript side is
// the authority and this file follows it. When the schema name changes there,
// it changes here, and `WorldIndexResponse` rejects the document it no longer
// understands rather than decoding half of it.
//
// Every field is `let` and every collection a plain array: this is data that
// crossed a process boundary, not a model the IDE mutates.
// Public interface: WorldIndexResponse, WorldIndexDocument, WorldIndexFailure,
// FailureCause, and the per-view result types they carry.
// Owner context: tools/ide — World.

import Foundation

/// The wire schema this app decodes. The analyzer hand-bumps its half when the
/// document's shape changes; a mismatch is a decode failure, never a partial
/// render (a newer analyzer's document read as an older one is how a field
/// silently means something else).
let worldIndexSchema = "world-index/3"

/// A region of `.story` source. Lines and columns are 1-based.
struct WorldSourceSpan: Decodable, Equatable {
    let line: Int
    let column: Int
    let endLine: Int
    let endColumn: Int
}

/// What an entity is called, and where the author declared it.
///
/// A finding names its target by id, which is neither the author's word for the thing
/// nor anywhere they can go. This is both (Amendment 2).
struct WorldEntityDeclaration: Decodable, Equatable {
    /// The author's own name for it, e.g. `tiring-house door`.
    let name: String
    /// Where its declaration sits, when the IR carried one.
    let span: WorldSourceSpan?
    /// The room it is in at the start — itself, when it IS a room; nil when nothing
    /// places it. A thing named in an NPC's topic goes where that NPC is.
    let room: String?
}

// MARK: - Map

/// One room's cell on the compass grid. East is +x, north is +y, up is +z.
struct WorldCell: Decodable, Equatable {
    let x: Int
    let y: Int
    let z: Int
}

/// One room's placement on the grid.
struct WorldPlacedRoom: Decodable, Equatable {
    /// Room id.
    let room: String
    /// The cell it occupies.
    let cell: WorldCell
}

/// A room the solver pushed off the cell the compass asked for.
struct WorldResolvedCollision: Decodable, Equatable {
    /// The room that was pushed.
    let room: String
    /// The room already holding the cell.
    let heldBy: String
    /// The cell the compass asked for.
    let wanted: WorldCell
    /// The cell it was placed in instead.
    let placed: WorldCell
    /// The move that led here.
    let from: String
    /// The direction of that move.
    let direction: String
}

/// A cycle whose geometry disagrees with itself — the same room, two cells.
struct WorldDirectionSkew: Decodable, Equatable {
    /// The room the walk arrived at again.
    let room: String
    /// Where it already sits.
    let sits: WorldCell
    /// Where this move says it should be.
    let wanted: WorldCell
    /// The move that disagrees.
    let from: String
    /// Its direction.
    let direction: String
}

/// An undirected connection between two rooms, carrying its door when it has one.
struct WorldConnection: Decodable, Equatable {
    /// The two rooms, as the analyzer ordered them.
    let rooms: [String]
    /// The door between them, or nil for an open passage.
    let via: String?
}

/// The Map view's data: where every room sits and what joins them.
struct WorldMap: Decodable, Equatable {
    /// The room play begins in, or nil.
    let start: String?
    /// Every placed room and its cell.
    let positions: [WorldPlacedRoom]
    /// Rooms the walk could not place.
    let unplaced: [String]
    /// Collisions the solver resolved by displacement.
    let collisions: [WorldResolvedCollision]
    /// Cycles that disagree with themselves.
    let skews: [WorldDirectionSkew]
    /// Undirected connections, each carrying its door.
    let connections: [WorldConnection]
}

// MARK: - Reach

/// Why an edge does not open: a lock wants a key, a gate wants a state change.
enum WorldObstacleKind: String, Decodable {
    case lock
    case gate
}

/// An exit the player cannot get through from the start state.
struct WorldBlockedEdge: Decodable, Equatable {
    /// The room the exit leaves.
    let from: String
    /// The room it leads to.
    let to: String
    /// Its direction.
    let direction: String
    /// What blocks it.
    let obstacle: WorldObstacleKind
    /// The door, when a door is what blocks it.
    let door: String?
    /// The key that would open it, when there is one.
    let key: String?
    /// The room that key sits in, when it is placed.
    let keyRoom: String?
    /// A sentence naming why, fit to show the author.
    let reason: String
    /// Source line, when the analyzer could name one.
    let line: Int?

    private enum CodingKeys: String, CodingKey {
        case from, to, direction, obstacle, door, key, keyRoom, reason, line
    }

    /// Decodes an edge, treating an unrecognised obstacle word as a lock.
    ///
    /// A future analyzer naming a third obstacle kind must not blank the whole
    /// Reach view over one row: the reason sentence is what the author reads,
    /// and it survives an unknown discriminator intact.
    /// - Parameter decoder: the wire decoder
    /// - Throws: when a required field is absent or of the wrong type
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        from = try c.decode(String.self, forKey: .from)
        to = try c.decode(String.self, forKey: .to)
        direction = try c.decode(String.self, forKey: .direction)
        obstacle = try c.decodeIfPresent(WorldObstacleKind.self, forKey: .obstacle) ?? .lock
        door = try c.decodeIfPresent(String.self, forKey: .door)
        key = try c.decodeIfPresent(String.self, forKey: .key)
        keyRoom = try c.decodeIfPresent(String.self, forKey: .keyRoom)
        reason = try c.decode(String.self, forKey: .reason)
        line = try c.decodeIfPresent(Int.self, forKey: .line)
    }
}

/// A thing the player can never hold, because it sits somewhere unreachable.
struct WorldStrandedThing: Decodable, Equatable {
    /// Entity id.
    let id: String
    /// Its display name.
    let name: String
    /// The room it sits in, when it sits in one.
    let room: String?
    /// A sentence naming why, fit to show the author.
    let reason: String
}

/// An exit naming a room that does not exist.
struct WorldBrokenExit: Decodable, Equatable {
    /// The room the exit leaves.
    let from: String
    /// Its direction.
    let direction: String
    /// The name it points at, which resolves to nothing.
    let to: String
    /// Source line, when the analyzer could name one.
    let line: Int?
}

/// A thing the player reaches and examines to find no prose written for it.
struct WorldNothingToRead: Decodable, Equatable {
    /// Entity id.
    let id: String
    /// Its display name.
    let name: String
    /// The room it sits in, when it sits in one.
    let room: String?
}

/// An obstacle the analyzer's fixed point overcame, and what it took (Amendment 1, D14).
///
/// NOT a finding. A story with a rich lifted list is a story with puzzles in it — this
/// is the dependency graph of progress, and it is what tells a tool the player must use
/// from scenery that merely exists.
struct WorldLiftedObstacle: Decodable, Equatable {
    /// The room the exit leaves.
    let from: String
    /// The room it leads to.
    let to: String
    /// Its direction.
    let direction: String
    /// The door, when a door stood here.
    let door: String?
    /// Fixed-point pass it opened on; 1 is the first sweep.
    let pass: Int
    /// Entities that had to be reachable, or actable on, first.
    let requires: [String]
}

/// How many rooms the story has, and which of them play can arrive at.
struct WorldRoomReach: Decodable, Equatable {
    /// Every room the story declares.
    let total: Int
    /// The ones play can arrive at.
    let reachable: [String]
    /// The ones it cannot.
    let unreached: [String]
}

/// The Reach view: can the player get to what was authored?
struct WorldReach: Decodable, Equatable {
    /// The room play begins in, when the story declares one.
    let start: String?
    /// Room counts and the two lists.
    let rooms: WorldRoomReach
    /// Exits that do not open from the start state.
    let blocked: [WorldBlockedEdge]
    /// Things play can never hold.
    let stranded: [WorldStrandedThing]
    /// Exits naming a room that does not exist.
    let brokenExits: [WorldBrokenExit]
    /// Things reachable with no prose behind them.
    let nothingToRead: [WorldNothingToRead]
    /// Everything above, counted — the tab's badge.
    let findingCount: Int
    /// Obstacles the walk overcame, in the order it overcame them (D14).
    let lifted: [WorldLiftedObstacle]
    /// Every entity on the progression chain — the story's spine.
    let progression: [String]
}

extension WorldReach {

    private enum CodingKeys: String, CodingKey {
        case start, rooms, blocked, stranded, brokenExits, nothingToRead, findingCount
        case lifted, progression
    }

    /// Decodes a Reach result, tolerating an analyzer that reports no chain.
    ///
    /// `lifted` and `progression` default to empty rather than throwing: the schema
    /// guard already refuses a document from another version, so an absent field here
    /// can only mean a same-version analyzer that found nothing to report.
    ///
    /// It lives in an extension so the memberwise initialiser survives — tests build a
    /// `WorldReach` directly to pin the view's wording, and a decoder in the type body
    /// would silently take that away.
    ///
    /// - Parameter decoder: the wire decoder
    /// - Throws: when a required field is absent or of the wrong type
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        start = try c.decodeIfPresent(String.self, forKey: .start)
        rooms = try c.decode(WorldRoomReach.self, forKey: .rooms)
        blocked = try c.decode([WorldBlockedEdge].self, forKey: .blocked)
        stranded = try c.decode([WorldStrandedThing].self, forKey: .stranded)
        brokenExits = try c.decode([WorldBrokenExit].self, forKey: .brokenExits)
        nothingToRead = try c.decode([WorldNothingToRead].self, forKey: .nothingToRead)
        findingCount = try c.decode(Int.self, forKey: .findingCount)
        lifted = try c.decodeIfPresent([WorldLiftedObstacle].self, forKey: .lifted) ?? []
        progression = try c.decodeIfPresent([String].self, forKey: .progression) ?? []
    }
}


// MARK: - Incomplete

/// What kind of passage a phrase was read from.
///
/// `response` is deliberately broad — on-clause text, conversation topics, action
/// responses, and any other authored passage that is not a description. The specificity
/// lives in `firedBy`.
enum WorldProseKind: String, Decodable {
    case description
    case firstVisit = "first-visit"
    case response
}

/// Where a passage sits, and what fired it (ADR-321 Amendment 1, D10).
///
/// Both attribution fields are independently optional, and the corpus is why: a response
/// usually does have an owner, while a fifth of Fernhill's passages are story-level and
/// hang off nothing. `key` is the only identity every passage is guaranteed to have.
struct WorldProseSite: Decodable, Equatable {
    /// The locale-table key — always present, and the attribution of record.
    let key: String
    /// What kind of passage it is.
    let kind: WorldProseKind
    /// The entity it hangs off, when one does.
    let owner: String?
    /// That entity's display name, when there is one.
    let ownerName: String?
    /// The clause or action that fires it, e.g. `on opening`.
    let firedBy: String?
    /// Where the WHOLE passage sits — a description runs several lines and the
    /// phrase a finding names sits in one of them (Amendment 2).
    let span: WorldSourceSpan?
    /// The whole passage — the part-of-speech pass's input (D11).
    let text: String

    /// The passage's first line, for the surfaces that only label a finding.
    var line: Int? { span?.line }

    private enum CodingKeys: String, CodingKey {
        case key, kind, owner, ownerName, firedBy, span, text
    }

    /// Decodes a site, treating an unrecognised passage kind as a response.
    ///
    /// A future analyzer naming a fourth kind must not blank the view over one row: the
    /// split that matters to the surface is description against everything else, and an
    /// unknown kind belongs on the everything-else side.
    /// - Parameter decoder: the wire decoder
    /// - Throws: when `key` or `text` is absent
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        key = try c.decode(String.self, forKey: .key)
        kind = try c.decodeIfPresent(WorldProseKind.self, forKey: .kind) ?? .response
        owner = try c.decodeIfPresent(String.self, forKey: .owner)
        ownerName = try c.decodeIfPresent(String.self, forKey: .ownerName)
        firedBy = try c.decodeIfPresent(String.self, forKey: .firedBy)
        span = try c.decodeIfPresent(WorldSourceSpan.self, forKey: .span)
        text = try c.decode(String.self, forKey: .text)
    }

    /// What to call this passage in the surface: the owning entity's name when it has
    /// one, else the clause that fires it, else the phrase key. Never empty — a finding
    /// the author cannot locate is a finding they cannot act on.
    var label: String {
        if let ownerName, !ownerName.isEmpty { return ownerName }
        if let firedBy, !firedBy.isEmpty { return firedBy }
        return key
    }
}

/// How many of each Incomplete class the story raised.
struct WorldIncompleteCounts: Decodable, Equatable {
    let missingWord: Int
    let ambiguous: Int
    let noObject: Int
    /// Things declared and never described (Amendment 3).
    let undescribed: Int

    private enum CodingKeys: String, CodingKey {
        case missingWord, ambiguous, noObject, undescribed
    }

    /// Decodes the counts.
    /// - Parameter decoder: the wire decoder
    /// - Throws: when a count is absent
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        missingWord = try c.decode(Int.self, forKey: .missingWord)
        ambiguous = try c.decode(Int.self, forKey: .ambiguous)
        noObject = try c.decode(Int.self, forKey: .noObject)
        undescribed = try c.decode(Int.self, forKey: .undescribed)
    }

    /// Builds counts directly, for the IDE's own merged reading.
    /// - Parameters:
    ///   - missingWord: phrases naming a thing by a word it does not answer to
    ///   - ambiguous: phrases two or more things answer to
    ///   - noObject: phrases nothing answers to
    ///   - undescribed: things declared and never described
    init(missingWord: Int, ambiguous: Int, noObject: Int, undescribed: Int) {
        self.missingWord = missingWord
        self.ambiguous = ambiguous
        self.noObject = noObject
        self.undescribed = undescribed
    }
}

/// Prose naming a real thing by a word that thing does not answer to.
struct WorldMissingWordFinding: Decodable, Equatable {
    /// Where the phrase sits, and what fired it.
    let site: WorldProseSite
    /// The phrase as written.
    let phrase: String
    /// The one thing the phrase resolves to.
    let entity: String
    /// The words that thing does not answer to.
    let missing: [String]
    /// The words it does answer to.
    let knownAs: [String]
    /// The word that reached this target — why THIS thing and not another.
    let matched: String
}

/// Prose naming something two or more things answer to.
struct WorldAmbiguousFinding: Decodable, Equatable {
    /// Where the phrase sits, and what fired it.
    let site: WorldProseSite
    /// The phrase as written.
    let phrase: String
    /// Everything the phrase reaches.
    let candidates: [String]
    /// The word or phrase that reached them all.
    let matched: String
}

/// Prose naming something that does not exist.
struct WorldNoObjectFinding: Decodable, Equatable {
    /// Where the phrase sits, and what fired it.
    let site: WorldProseSite
    /// The phrase as written.
    let phrase: String
}


// MARK: - Amendment 1 surfaces (D11, D12)

/// Where a mention sits on the story's spine (D12).
///
/// Decoded with an unknown-value fallback rather than a strict `RawRepresentable`
/// failure: a role this app does not know is a ranking question, and ranking a row
/// low is a better answer than refusing the whole document over it.
enum WorldMentionRole: String, Decodable {
    /// A thing the player acts on.
    case tool
    /// A thing on the progression chain.
    case progressionInfo = "progression-info"
    /// Everything else the prose resolves to.
    case atmosphereInfo = "atmosphere-info"

    /// The bands in display order, most urgent first.
    static var bands: [WorldMentionRole] { [.progressionInfo, .tool, .atmosphereInfo] }

    /// How high this role sorts in the candidate list — lower is more urgent.
    var rank: Int {
        switch self {
        case .progressionInfo: return 0
        case .tool: return 1
        case .atmosphereInfo: return 2
        }
    }
}

/// The role table, decoded leniently.
///
/// A role word this app does not know ranks as atmosphere rather than failing the
/// document: ranking one row low is a better answer than a blank World tab, and
/// this table only ever decides sort order.
struct WorldRoleTable: Decodable, Equatable {
    private let byEntity: [String: WorldMentionRole]

    /// Decodes the table, mapping unknown role words to atmosphere.
    /// - Parameter decoder: the wire decoder
    /// - Throws: when the value is not an object of strings
    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode([String: String].self)
        byEntity = raw.mapValues { WorldMentionRole(rawValue: $0) ?? .atmosphereInfo }
    }

    /// The role of one entity, or nil when the table does not name it.
    /// - Parameter entity: the entity id
    /// - Returns: its role
    subscript(entity: String) -> WorldMentionRole? { byEntity[entity] }

    /// How many entities the table roles.
    var count: Int { byEntity.count }
}

/// A phrase that resolved to exactly one thing, and what that thing is worth.
struct WorldMentionEdge: Decodable, Equatable {
    /// The phrase as written.
    let phrase: String
    /// The one thing it names.
    let entity: String
    /// What this mention is worth to a player reading it.
    let role: WorldMentionRole
    /// Where the phrase sits.
    let site: WorldProseSite

    private enum CodingKeys: String, CodingKey {
        case phrase, entity, role, site
    }

    /// Decodes an edge, ranking an unknown role as atmosphere.
    /// - Parameter decoder: the wire decoder
    /// - Throws: when phrase, entity, or site is absent
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        phrase = try c.decode(String.self, forKey: .phrase)
        entity = try c.decode(String.self, forKey: .entity)
        role = WorldMentionRole(rawValue: try c.decode(String.self, forKey: .role)) ?? .atmosphereInfo
        site = try c.decode(WorldProseSite.self, forKey: .site)
    }
}

/// The story's naming surface, as the analyzer published it (D11).
///
/// The IDE resolves against this and never derives it. `byWord` is rebuilt here
/// rather than carried on the wire — it is an inversion of `wordsOf`, and two
/// copies of one fact is how they come to disagree.
struct WorldVocabulary: Decodable, Equatable {
    /// Entity id to the content words it answers to.
    let wordsOf: [String: Set<String>]
    /// A whole lowercased name or alias to the entities carrying it.
    let exactForms: [String: [String]]
    /// A single content word to every entity whose vocabulary holds it.
    private let byWord: [String: [String]]

    private enum CodingKeys: String, CodingKey {
        case wordsOf, exactForms
    }

    /// Decodes the surface and builds the word index the resolver walks.
    /// - Parameter decoder: the wire decoder
    /// - Throws: when either half is absent
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let words = try c.decode([String: [String]].self, forKey: .wordsOf)
        wordsOf = words.mapValues { Set($0) }
        exactForms = try c.decode([String: [String]].self, forKey: .exactForms)

        var inverted: [String: [String]] = [:]
        for (id, vocabulary) in words {
            for word in vocabulary { inverted[word, default: []].append(id) }
        }
        byWord = inverted
    }

    /// The content words one entity answers to.
    /// - Parameter entity: the entity id
    /// - Returns: its words, or an empty set when it has none
    func words(of entity: String) -> Set<String> {
        wordsOf[entity] ?? []
    }

    /// The entities a phrase resolves to.
    ///
    /// Two tiers, exactly as the analyzer has them: a phrase equalling a whole name
    /// or alias resolves there and nowhere else; otherwise every word of the phrase
    /// must appear in one entity's vocabulary, and a word matching nothing
    /// disqualifies that entity outright.
    ///
    /// - Parameters:
    ///   - phrase: the phrase as written, lowercased
    ///   - words: the phrase's words
    /// - Returns: the matching entity ids, sorted; empty when it names nothing
    func resolve(phrase: String, words: [String]) -> [String] {
        if let exact = exactForms[phrase] { return exact.sorted() }
        guard let first = words.first, let holders = byWord[first] else { return [] }
        return holders
            .filter { id in words.allSatisfy { self.words(of: id).contains($0) } }
            .sorted()
    }
}

/// The extractor filters both readings share (D11).
struct WorldExtractorFilters: Decodable, Equatable {
    /// Head nouns that are never a thing the author forgot to implement.
    let headStopwords: Set<String>
    /// The shortest a head noun may be.
    let minHeadLength: Int
    /// The most words a noun phrase may carry.
    let maxPhraseWords: Int
    /// Suffixes that mark a noun as an action or a quality, not a thing.
    let abstractSuffixes: [String]
    /// Things whose names end in one of those suffixes anyway.
    let physicalExceptions: Set<String>
    /// Nouns that name an act or a manner and are spelled like anything else.
    let eventiveHeads: Set<String>
    /// The analyzer's verdicts for this story's own prose: words naming no thing.
    ///
    /// The lexicon behind them (12,444 lemmas with no physical sense in Open English
    /// WordNet) stays in the analyzer — only the answers for words this story
    /// actually contains cross the wire, which is under a kilobyte.
    let notThingHeads: Set<String>

    private enum CodingKeys: String, CodingKey {
        case headStopwords, minHeadLength, maxPhraseWords
        case abstractSuffixes, physicalExceptions, eventiveHeads, notThingHeads
    }

    /// Decodes the filters, taking the word lists as sets.
    /// - Parameter decoder: the wire decoder
    /// - Throws: when any field is absent
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        headStopwords = Set(try c.decode([String].self, forKey: .headStopwords))
        minHeadLength = try c.decode(Int.self, forKey: .minHeadLength)
        maxPhraseWords = try c.decode(Int.self, forKey: .maxPhraseWords)
        abstractSuffixes = try c.decode([String].self, forKey: .abstractSuffixes)
        physicalExceptions = Set(try c.decode([String].self, forKey: .physicalExceptions))
        eventiveHeads = Set(try c.decode([String].self, forKey: .eventiveHeads))
        notThingHeads = Set(try c.decode([String].self, forKey: .notThingHeads))
    }

    /// Whether a phrase names a thing at all, or names how something was done.
    ///
    /// The analyzer's rule, APPLIED — never re-derived. Two readings of one story
    /// must share a definition of "thing", or the IDE's own pass quietly re-adds
    /// every phrase the headless one understood and set aside (Amendment 2).
    ///
    /// - Parameter head: the phrase's head noun
    /// - Returns: true when the phrase reads as a thing the author could implement
    func readsAsThing(head: String) -> Bool {
        if eventiveHeads.contains(head) { return false }
        if notThingHeads.contains(head) { return false }
        return physicalExceptions.contains(head)
            || head.count <= 5
            || !abstractSuffixes.contains { head.hasSuffix($0) }
    }
}

/// The Incomplete view: what did the author name that isn't there yet?
/// A candidate list, never an error list (ADR-321 D6).
struct WorldIncomplete: Decodable, Equatable {
    /// How many of each class.
    let counts: WorldIncompleteCounts
    /// Phrases naming a real thing by a word it does not answer to.
    let missingWord: [WorldMissingWordFinding]
    /// Phrases two or more things answer to.
    let ambiguous: [WorldAmbiguousFinding]
    /// Phrases nothing answers to.
    let noObject: [WorldNoObjectFinding]
    /// Every phrase that DID resolve, roled (D12). Not findings — the opposite.
    let edges: [WorldMentionEdge]
    /// Things the story declares and never describes, by id (Amendment 3).
    let undescribed: [String]

    private enum CodingKeys: String, CodingKey {
        case counts, missingWord, ambiguous, noObject, edges, undescribed
    }

    /// Decodes the Incomplete result, defaulting `edges` to empty.
    ///
    /// Defaulted rather than required for the same reason `lifted` is: a document
    /// this app can otherwise render should not be refused over a list that only
    /// ranks rows.
    /// - Parameter decoder: the wire decoder
    /// - Throws: when the three finding lists or the counts are absent
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        counts = try c.decode(WorldIncompleteCounts.self, forKey: .counts)
        missingWord = try c.decode([WorldMissingWordFinding].self, forKey: .missingWord)
        ambiguous = try c.decode([WorldAmbiguousFinding].self, forKey: .ambiguous)
        noObject = try c.decode([WorldNoObjectFinding].self, forKey: .noObject)
        edges = try c.decodeIfPresent([WorldMentionEdge].self, forKey: .edges) ?? []
        undescribed = try c.decodeIfPresent([String].self, forKey: .undescribed) ?? []
    }
}

// MARK: - The document

/// What the story declared about itself, for the tab's header line.
struct WorldStoryHeader: Decodable, Equatable {
    /// The story's declared id.
    let id: String?
    /// Its declared version.
    let version: String?
    /// The room play begins in.
    let start: String?
}

/// A successful analysis — all three views of one story.
struct WorldIndexDocument: Decodable, Equatable {
    /// The analyzer package's version, for diagnostics only.
    let analyzerVersion: String
    /// What was analyzed.
    let story: WorldStoryHeader
    /// What shape is the place?
    let map: WorldMap
    /// Can the player get to what was authored?
    let reach: WorldReach
    /// What was named that isn't there yet?
    let incomplete: WorldIncomplete
    /// The role every entity's mentions carry (D12), applied here and never derived.
    let roles: WorldRoleTable
    /// The story's naming surface (D11), applied here and never derived.
    let vocabulary: WorldVocabulary
    /// Every authored passage, once — the part-of-speech pass's input (D11).
    let prose: [WorldProseSite]
    /// The extractor filters both readings share (D11).
    let filters: WorldExtractorFilters
    /// Every declared entity: its authored name, and where it was declared (Amendment 2).
    let declarations: [String: WorldEntityDeclaration]

    /// What a phrase found in this passage is worth, for ranking.
    ///
    /// An unresolved phrase names no entity and therefore carries no role of its
    /// own — which is most of what ungated chunking adds. Its passage still has an
    /// owner, so a missing noun in a progression-critical thing's prose outranks
    /// one in a room's scenery. Where a passage has no owner either, the row sorts
    /// last rather than being hidden.
    ///
    /// - Parameter site: the passage the phrase sits in
    /// - Returns: the role to rank by
    func role(at site: WorldProseSite) -> WorldMentionRole {
        guard let owner = site.owner, let role = roles[owner] else { return .atmosphereInfo }
        return role
    }
}

/// Why there is no analysis, as a word the tab switches on.
///
/// The first four are the analyzer's own vocabulary; `unavailable` is the IDE's,
/// for the failures that happen before the analyzer can speak — no `node`, no
/// analyzer on disk, a process that died without writing a document (AC-9's
/// third case is one of these, and is unrenderable from inside a Node process).
enum WorldFailureCause: String, Decodable {
    /// No path was given on the command line.
    case usage
    /// The path names no file, or the file cannot be read.
    case unreadableIR = "unreadable-ir"
    /// The file is not JSON, or is not a Story IR.
    case malformedIR = "malformed-ir"
    /// The analysis itself threw — a defect in the analyzer.
    case `internal`
    /// The analyzer could not be run at all, or did not answer with a document.
    case unavailable
}

/// A failure the World tab renders rather than a crash it survives (AC-9).
struct WorldIndexFailure: Decodable, Equatable {
    /// The cause, as a word to switch on.
    let cause: WorldFailureCause
    /// A sentence naming the cause, fit to show the author.
    let message: String
    /// The path involved, when a path was involved.
    let path: String?

    private enum DocumentKeys: String, CodingKey {
        case failure
    }

    private enum FailureKeys: String, CodingKey {
        case cause, message, path
    }

    /// Builds a failure the IDE itself diagnosed — the analyzer never ran, or
    /// never answered.
    /// - Parameters:
    ///   - cause: the cause, as a word the tab switches on
    ///   - message: a sentence naming it, fit to show the author
    ///   - path: the path involved, when a path was involved
    init(cause: WorldFailureCause, message: String, path: String? = nil) {
        self.cause = cause
        self.message = message
        self.path = path
    }

    /// Decodes the analyzer's failure document, whose cause sits one level down
    /// under `failure`.
    /// - Parameter decoder: the wire decoder
    /// - Throws: when the `failure` object or its `cause`/`message` is absent
    init(from decoder: Decoder) throws {
        let outer = try decoder.container(keyedBy: DocumentKeys.self)
        let inner = try outer.nestedContainer(keyedBy: FailureKeys.self, forKey: .failure)
        cause = try inner.decode(WorldFailureCause.self, forKey: .cause)
        message = try inner.decode(String.self, forKey: .message)
        path = try inner.decodeIfPresent(String.self, forKey: .path)
    }
}

/// Either outcome — the only two things the analyzer ever writes to stdout.
enum WorldIndexResponse: Equatable {

    /// The analysis, when there is one.
    case ok(WorldIndexDocument)
    /// Why there isn't, when there isn't.
    case failed(WorldIndexFailure)

    /// The failure to render, or nil when this response carries an analysis.
    var failure: WorldIndexFailure? {
        if case .failed(let failure) = self { return failure }
        return nil
    }

    /// The analysis to render, or nil when this response carries a failure.
    var document: WorldIndexDocument? {
        if case .ok(let document) = self { return document }
        return nil
    }

    private enum DiscriminatorKeys: String, CodingKey {
        case schema, ok
    }

    /// Decodes one analyzer document, choosing the branch by its `ok`
    /// discriminator and refusing a schema this app does not know.
    ///
    /// A schema mismatch is reported as a `.failed` response naming both
    /// versions rather than thrown: the author's problem is a stale analyzer or
    /// a stale app, and the tab can say so. Malformed JSON is a throw, because
    /// there is nothing there to say it with.
    ///
    /// - Parameter data: the analyzer's stdout
    /// - Returns: the analysis, or the failure to render
    /// - Throws: `DecodingError` when the bytes are not a document of this schema's shape
    static func decode(_ data: Data) throws -> WorldIndexResponse {
        let decoder = JSONDecoder()
        let head = try decoder.decode(Head.self, from: data)
        guard head.schema == worldIndexSchema else {
            return .failed(WorldIndexFailure(
                cause: .unavailable,
                message: "The analyzer speaks \(head.schema); this version of Chord Writer reads \(worldIndexSchema). Update one to match the other."))
        }
        if head.ok {
            return .ok(try decoder.decode(WorldIndexDocument.self, from: data))
        }
        return .failed(try decoder.decode(WorldIndexFailure.self, from: data))
    }

    /// Just enough of the document to choose a branch — read before either
    /// full shape is attempted, so a schema this app cannot read is named
    /// rather than decoded into the wrong struct.
    private struct Head: Decodable {
        let schema: String
        let ok: Bool
    }
}
