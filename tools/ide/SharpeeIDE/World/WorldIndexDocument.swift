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
let worldIndexSchema = "world-index/2"

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
    /// Source line of the passage.
    let line: Int?
    /// The whole passage — the part-of-speech pass's input (D11).
    let text: String

    private enum CodingKeys: String, CodingKey {
        case key, kind, owner, ownerName, firedBy, line, text
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
        line = try c.decodeIfPresent(Int.self, forKey: .line)
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
}

/// Prose naming something two or more things answer to.
struct WorldAmbiguousFinding: Decodable, Equatable {
    /// Where the phrase sits, and what fired it.
    let site: WorldProseSite
    /// The phrase as written.
    let phrase: String
    /// Everything the phrase reaches.
    let candidates: [String]
}

/// Prose naming something that does not exist.
struct WorldNoObjectFinding: Decodable, Equatable {
    /// Where the phrase sits, and what fired it.
    let site: WorldProseSite
    /// The phrase as written.
    let phrase: String
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
