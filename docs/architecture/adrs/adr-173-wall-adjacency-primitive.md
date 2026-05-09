# ADR-173: Wall Adjacency Primitive

## Status: ACCEPTED

## Date: 2026-05-08 (Proposed), 2026-05-09 (Accepted — L0 Phases 1–5 implemented)

## Builds on

- **ADR-090** (Entity-Centric Action Dispatch / Capability Dispatch) —
  walls compose with capability dispatch for breaching, examination,
  and any future verb that targets a wall. Walls are IFEntity-derived
  precisely so they can carry traits and participate in the existing
  trait/behavior pattern without parser special-casing.
- **ADR-052** (Event Handlers for Custom Logic) — the `obstructedBy`
  state-coupling hook (a bookcase blocking breach access from one
  side) integrates with existing event-handler patterns rather than
  inventing new machinery.
- The exploratory design session preceding this ADR
  (`session-20260508-1229-main`), which established that wall
  adjacency is a cross-cutting world-model primitive — sound is the
  first consumer, but breaching, secret passages, examination, and
  decoration also ride on it.

### Related ADRs (not dependencies)

- **ADR-172** (Spatial Sound Propagation) — the first declared
  consumer of this primitive. ADR-172 introduces `AcousticTrait` as
  the first whole-wall trait per ADR-173's classification, and
  `AcousticDampenerTrait` as the first capability-specific obstructor
  trait per ADR-173's protocol. The dependency runs ADR-172 → ADR-173
  (consumer → substrate); ADR-173 stands alone architecturally.

## Context

Sharpee's room connectivity model expresses only **traversable
relationships**. Rooms reference each other through `IExitInfo`
records (one per direction), each carrying a destination and an
optional `via` for a door. There is no primitive for the case where
two rooms are *physically adjacent* — they share a boundary in the
fictional world — but **no traversal exists between them**. Sound
cannot pass between rooms that aren't connected by an exit; a
sledgehammer cannot be applied to a structure that isn't modeled;
LOOK AT WALL has nothing to resolve against.

Several cross-cutting features need this primitive:

- **Spatial sound propagation** (ADR-172) — sound penetrating walls
  at high volumes is a first-class case in the model. Without a wall
  primitive, "the wall between the parlor and the library" is not
  expressible, and acoustic cost has nothing to attach to.
- **Breaching with tools** — a sledgehammer, axe, or pry bar applied
  to a wall converts the wall into a passage. This is a future ADR,
  but it requires walls to be parser-resolvable nouns (HIT WALL WITH
  SLEDGEHAMMER) and stateful entities (the wall transitions from
  intact to breached).
- **Secret passages** — a hidden door or sliding panel is a wall that
  *becomes* an exit when discovered. The wall must exist as a
  primitive before discovery; the discovery transition mutates the
  wall and adds an exit.
- **Examination** — LOOK AT WALL is a routine player action. Walls
  need descriptions, adjectives for disambiguation, and per-side
  presentation (the bookcase-covered side looks different from the
  exposed side).
- **Decoration and structural events** — paintings hung on walls,
  fires spreading through walls, bullet holes, water damage. Each
  composes naturally with a wall entity but has no clean attachment
  point in the current model.

Three implementation paths were considered:

- **A — Treat walls as edge metadata on rooms.** Store wall properties
  as records keyed by room-pair. Lighter weight; no entity overhead.
  But every parser-touching consumer (LOOK AT WALL, HIT WALL) must
  special-case wall handling to resolve a noun against a record.
  Multiplies surface area at every consumer; doesn't compose with
  the existing trait/behavior pattern.
- **B — Walls as IFEntity-derived entities.** Walls are first-class
  entities; the parser resolves them natively; capability dispatch
  applies; traits compose. Heavier (one entity per declared wall),
  but the cost is amortized across many consumers and matches
  Sharpee's "trust the architecture" principle (CLAUDE.md).
- **C — Walls inferred from grid layout or shared coordinates.** The
  world-model auto-creates wall entities for room pairs that are
  spatially adjacent in some inferred sense. Removes authorial
  effort but conflates the author's narrative intent with platform
  inference; produces walls the author didn't ask for; misses walls
  the author *did* intend in non-grid layouts.

Option B is consistent with Sharpee's existing patterns and the
architectural principle that authors own world structure
explicitly. Option C is rejected on the principle that the platform
should not invent world structure on the author's behalf.

## Decision

### Walls are IFEntity-derived

A wall is a first-class entity that carries traits and participates
in capability dispatch, parser resolution, and event handling like
any other IFEntity. This is the only choice consistent with making
LOOK AT WALL, HIT WALL WITH SLEDGEHAMMER, and similar verbs work
through the existing parser and action pipelines without special
casing.

### Cardinality: room-pair only

Each wall references **exactly two distinct rooms** via a `between`
relation:

```ts
interface IWallEntity extends IFEntity {
  between: [EntityId, EntityId];  // exactly two distinct room IDs
  // ... traits, sides, etc.
}
```

The world-loader validates cardinality and distinctness. A wall with
fewer than two rooms, more than two rooms, or a self-reference
(`[parlor, parlor]`) is a load error.

There is **no per-side wall entity**. The wall between the parlor
and the library is one entity; both rooms reference the same entity.
This single-entity design simplifies state mutation (breaching from
either side affects the same entity), simplifies sound propagation
(one acoustic cost for the boundary), and reduces entity count.

### 100% author-driven instantiation

Walls exist only when the author declares them. There is no
auto-creation, no inference from grid layout, no implicit wall
between rooms that share coordinates. Two consequences follow:

- **Two rooms with no exit between them and no declared wall are
  acoustically and physically unrelated.** Sound at any volume
  cannot cross. Examination resolves nothing. No breaching is
  possible.
- **The author asserts adjacency by creating walls.** The wall
  entity *is* the assertion that two rooms share a physical
  boundary in the fictional world.

This matches Sharpee's broader pattern: the platform provides the
primitives, the author declares the world structure, and there is
no implicit world inference.

### Whole-wall vs per-side trait taxonomy

The wall entity has **two distinct slots** for capability data:

| Slot | Sees | Symmetric? | Examples |
|------|------|-----------|----------|
| **Whole-wall traits** | Properties of the wall as a physical object | Yes — same value evaluated from either side | `AcousticTrait` (sound cost), structural material, fire-spread cost |
| **Per-side data** | Properties of the interface a player encounters approaching the wall from one room | No — keyed by `roomId` | adjective, description, `BreachableTrait`, `obstructedBy` |

The intuition: **intrinsic** properties of the wall (its material,
its acoustic cost, its structural integrity) are the same regardless
of which side you're on. **Interface** properties (what you see,
what blocks your tool, what name the parser resolves) depend on
which side you're standing on. Sound passes symmetrically through
the same physical wall; a bookcase covering one side blocks breach
from that side without affecting either sound or the other side.

Future trait authors classify their trait into one of these slots.
The ADR establishes the distinction explicitly so the classification
is deliberate rather than ad hoc.

### Per-side adjective is required

Every wall declaration **must** include an adjective for each side.
The world-loader rejects walls without complete per-side adjectives.

The reason: ambiguity is the common case, not the exception. A
typical room borders multiple walls; "WALL" alone almost always
refers to multiple candidates. Requiring adjectives at declaration
time forces the author to think about disambiguation while writing
the world rather than discovering ambiguity in playtesting.

**Adjective uniqueness scope is per-room, not per-wall.** Within a
single room, all walls visible from that room must have distinct
adjectives. A wall's two sides may share an adjective (a plain oak
wall presenting as "the oak wall" in both rooms it borders), but
no two walls visible from the same room may share one. The
world-loader validates per-room adjective uniqueness when wall
declarations are committed.

### Per-side description

Each side carries an independent description rendered when the
player executes LOOK AT WALL from that side. The descriptions may
differ wildly (the parlor side covered by a bookcase, the library
side exposed brick) or be identical (a plain wall both sides). The
language layer renders the per-side description; the platform does
not synthesize a description from material or other properties.

### Authoring API

Primary form — explicit per-wall declaration:

```ts
world.createWall({
  between: [parlor, library],
  whole: {
    acoustic: new AcousticTrait('default'),
  },
  sides: {
    [parlor.id]: {
      adjective: 'oak',
      description: 'A tall mahogany bookcase covers the wall, floor to ceiling.',
      obstructedBy: bookcase.id,
    },
    [library.id]: {
      adjective: 'brick',
      description: 'Exposed brick, dusty and chipped where shelves once hung.',
      // BreachableTrait added in a future ADR
    },
  },
});
```

Convenience helper for the "all walls in this room share a
property" case:

```ts
world.createWalls({
  from: hall,
  to: [parlor, kitchen, dining],
  whole: {
    acoustic: new AcousticTrait('thin'),
  },
  sides: (roomId) => ({
    adjective: 'plaster',
    description: 'Thin plaster, stained near the ceiling.',
  }),
});
```

The helper fans out into N wall entities, each declared between
`from` and one of `to`, each with the supplied whole-wall traits and
per-side data. The author still enumerates the destination rooms;
the helper just reduces the typing for shared properties. There is
no implicit fan-out beyond what the author lists.

### World-model integration: bidirectional references

When a wall is created, the world-model **automatically maintains
reciprocal references on both rooms**. Each room gains a `walls`
collection containing every wall entity it borders. The author
declares the wall once; the world-model maintains both rooms'
collections.

```ts
parlor.walls   // [wall(parlor↔library), wall(parlor↔kitchen), ...]
library.walls  // [wall(parlor↔library), wall(library↔study), ...]
```

This makes "all walls in this room" queryable in O(1) without
traversing every wall entity in the world. The reciprocal refs are
maintained by the world-model on `createWall` and on any wall
deletion; authors do not maintain them manually.

### Parser resolution and disambiguation

Parser resolution for wall references uses adjective-first matching:

- **`OAK WALL`, `BRICK WALL`, etc.** — resolves uniquely against the
  per-side adjective for the player's current room. Standard
  resolution path.
- **`WALL`** alone — applies the standard Sharpee disambiguation
  protocol. If the room has exactly one wall, resolves uniquely. If
  multiple walls exist, the parser asks for clarification: *"Which
  wall do you mean — the oak wall, the brick wall, or the plaster
  wall?"*
- **Adjective resolution is per-side**, using the side that
  corresponds to the player's current location. The same wall
  entity resolves under different adjectives from different rooms.

Directional or relational phrasings (`NORTH WALL`, `WALL TO THE
LIBRARY`) are not part of this ADR's parser contract. Stories that
want them extend the parser per ADR-087.

### Obstruction via `obstructedBy` — the generalized obstructor protocol

A wall side may declare an `obstructedBy` reference to another
entity in the same room. Rather than the wall hardcoding rules about
what obstructions do, the obstructor's **own traits** determine its
contributions to each capability the wall participates in. This is
the **generalized obstructor protocol**: an obstructor declares
the capabilities it modifies via capability-specific traits; the
wall queries available traits and aggregates contributions per
capability.

Capability-specific obstructor traits, by capability:

| Capability | Obstructor trait | Effect when the obstructor is present in the side's room |
|---|---|---|
| Acoustic | `AcousticDampenerTrait { contribution: number }` (per ADR-172) | Adds the contribution value to the wall's effective acoustic cost. Positive dampens (tapestry, foam panel); negative makes more permeable (a hole, peephole opening). |
| Breach | `BreachBlockerTrait` (future ADR) | Breach attempts from this side fail; the obstructor is the cited reason (a bookcase, a heavy curtain). |
| Visual line-of-sight | `VisualConduitTrait` / `VisualBlockerTrait` (future ADR) | Establishes or blocks line-of-sight through the wall from this side (a peephole conducts visibility; a tapestry blocks it). |
| Olfactory / thermal / future | Sibling traits per future ADRs | Compose the same way — each capability declares its own obstructor trait. |

Each obstructor declares only the capabilities it modifies. A
tapestry that dampens sound but is acoustically opaque to vision
carries `AcousticDampenerTrait` (and possibly `VisualBlockerTrait`)
but no breach trait. A bookcase that blocks breach but is
acoustically transparent carries `BreachBlockerTrait` only — no
acoustic effect. A peephole carries
`AcousticDampenerTrait { contribution: -2 }` (more permeable) plus
`VisualConduitTrait` (enables peeping). Each combination is
expressible without the wall knowing the obstructor's full identity.

Examination is unaffected by the trait protocol. LOOK AT WALL from
the obstructed side renders the per-side description regardless of
which capability traits the obstructor carries. Authors typically
write the per-side description to reference the obstructor
explicitly (*"a tall mahogany bookcase covers the wall"*).

When the obstructor is moved (PUSH BOOKCASE, TAKE TAPESTRY), the
obstruction is automatically lifted: per-side obstruction is
evaluated by checking the obstructor's current location at the time
each capability is queried, not by storing a flag on the wall. No
event handler is required for the default behavior; authors who
want custom logic (the bookcase collapses when moved, revealing not
just the wall but a hidden compartment) write event handlers per
ADR-052 in the usual way.

The protocol's open-ended trait composition is the load-bearing
piece: future capabilities (visual, olfactory, thermal, fire spread)
add their own obstructor traits without requiring changes to ADR-173
or to the wall entity itself. The wall is a fixed primitive; the
capability surface is extensible.

### Composition with existing systems

- **Trait system**: Walls carry traits like any IFEntity. Future
  traits (BreachableTrait, FireSpreadTrait, DecoratableTrait) attach
  to either the whole-wall slot or per-side slot per the
  classification taxonomy above.
- **Capability dispatch (ADR-090)**: Walls can declare capabilities
  for non-standard verbs. Breaching is the canonical example — a
  future BreachableTrait declares the wall responds to applied-tool
  verbs (HIT WALL WITH SLEDGEHAMMER), and the BreachingBehavior
  implements the four-phase pattern.
- **Event handlers (ADR-052)**: Wall state changes (breach
  completion, obstructor movement, decoration changes) emit events
  that stories react to per the existing pattern.
- **Language layer**: Per-side descriptions live in the story or in
  lang-{locale} message files. The platform never synthesizes wall
  prose from properties.

### Rejection rules

The world-loader and wall-creation API reject on the following
conditions:

- **`createWall` with cardinality ≠ 2 distinct rooms**: throws at
  world-load. A wall must reference exactly two distinct rooms. A
  wall with one room, three rooms, or `[parlor, parlor]` is
  malformed.
- **`createWall` missing per-side adjective for either side**:
  throws at world-load. Adjectives are required for parser
  disambiguation; missing adjectives are not silently defaulted.
- **`createWall` whose adjectives collide with an existing wall in
  either room**: throws at world-load. Per-room adjective uniqueness
  is structural — the load-time error is preferable to discovering
  the collision in playtesting.
- **`obstructedBy` referencing an entity that doesn't exist or is
  not located in the appropriate room at world-load**: throws.
  References to nonexistent or misplaced entities are typos by the
  author, not legitimate states.
- **Adjective resolution from a player vantage outside both
  connecting rooms**: not specified. Future features that establish
  such viewpoints (a third-party observer, a corridor view, a
  scrying glass) will need to extend the resolution rule.
- **Wall mutations that violate cardinality after creation** (a
  hypothetical mutation API attempting to change `between` to
  reference different rooms): not supported. Walls are between two
  fixed rooms for their lifetime; world reconfiguration is deferred
  per the Consequences section.

### End-to-end scenario

*Setup:* The author declares the hotel's parlor and library, with a
load-bearing wall between them. The parlor side has a tall mahogany
bookcase against the wall; the library side has exposed brick.

```ts
const bookcase = world.createEntity({
  id: 'bookcase',
  location: parlor.id,
  traits: [new BreachBlockerTrait()],   // future trait, illustrative
});

world.createWall({
  between: [parlor, library],
  whole: {
    acoustic: new AcousticTrait('thick'),    // load-bearing stone
  },
  sides: {
    [parlor.id]: {
      adjective: 'oak',
      description: 'A tall mahogany bookcase covers the wall, floor to ceiling.',
      obstructedBy: bookcase.id,
    },
    [library.id]: {
      adjective: 'brick',
      description: 'Exposed brick, dusty and chipped where shelves once hung.',
    },
  },
});
```

*World-load validation runs:*

- Cardinality: `between.length === 2` ✓; rooms distinct ✓
- Per-side adjectives present: `parlor.adjective = 'oak'` ✓, `library.adjective = 'brick'` ✓
- Per-room uniqueness: `'oak'` is the only adjective on Parlor's walls so far ✓; `'brick'` is the only adjective on Library's walls ✓
- `obstructedBy` resolution: `bookcase` entity exists ✓ and is located in Parlor (the appropriate room for the parlor-side reference) ✓

The wall is created. `parlor.walls` and `library.walls` each gain a
reference to the wall entity.

*Player in Parlor types* `LOOK AT OAK WALL`:
1. Parser searches `parlor.walls` per-side adjectives matching the
   parlor's side. Finds the wall (parlor-side adjective is 'oak').
2. Action renders the parlor-side description: *"A tall mahogany
   bookcase covers the wall, floor to ceiling."*

*Player in Library types* `LOOK AT WALL`:
1. Parser checks `library.walls`. Only one wall exists in this
   list. Resolves uniquely without disambiguation.
2. Action renders the library-side description: *"Exposed brick,
   dusty and chipped where shelves once hung."*

*Player in Library types* `LOOK AT OAK WALL`:
1. Parser searches `library.walls` per-side adjectives matching the
   library's side. Library-side adjective is 'brick'; no wall in
   Library has the adjective 'oak'.
2. Standard "not visible" / unresolved-reference response.

*Player in Parlor (later) attempts* `HIT OAK WALL WITH SLEDGEHAMMER`
*— assuming a future BreachableTrait + BreachBlockerTrait pair:*
1. Parser resolves `oak wall` to the wall entity.
2. The wall's per-side data on the parlor side has `obstructedBy =
   bookcase`.
3. The bookcase carries `BreachBlockerTrait`. Per the obstructor
   protocol, the breach attempt fails with the bookcase as the
   cited reason: *"The bookcase blocks your access to the wall."*

*Player MOVEs the bookcase aside, then retries* `HIT OAK WALL WITH
SLEDGEHAMMER`:
1. Bookcase is now in a different location. The wall's parlor-side
   `obstructedBy` lookup checks bookcase's current location → not
   in Parlor → obstruction lifted.
2. Breach attempt proceeds against the wall's intrinsic
   `BreachableTrait` (whole-wall, future ADR), independent of the
   no-longer-present obstructor.

This walkthrough exercises wall creation, validation, reciprocal
references, parser per-side resolution from both sides, the
obstructor protocol's location-based evaluation, and the protocol's
graceful handling when the obstructor is moved.

## Implementation Modules

The following packages and files own each piece of the decision:

| Piece | Package | File (proposed) |
|-------|---------|-----------------|
| `IWallEntity` interface, wall types | `@sharpee/world-model` | `src/entities/wall-entity.ts` (new) |
| `world.createWall` / `world.createWalls` | `@sharpee/world-model` | `src/world/wall-creation.ts` (new) |
| World-load validation (cardinality, adjective uniqueness, `obstructedBy` resolution) | `@sharpee/world-model` | `src/world/wall-validation.ts` (new) |
| Reciprocal `walls` collection on rooms | `@sharpee/world-model` | extend room entity; world-model maintains on `createWall` |
| Generalized obstructor-protocol query helper (`getObstructorContributions(wall, side, capabilityTraitType)`) | `@sharpee/world-model` | `src/traits/obstructor-protocol.ts` (new) |
| Per-side adjective parser resolution | `@sharpee/parser-en-us` | extend disambiguation logic for per-side names |
| LOOK AT WALL action support (per-side description rendering) | `@sharpee/stdlib` | extend the existing examining action to recognize wall entities |
| Wall description prose | story-level (per-wall) or `@sharpee/lang-en-us` (defaults) | per-side `description` field is authored data, not platform prose |

Module ownership respects Sharpee's existing dependency direction:
world-state primitives in `world-model`; parser concerns in
`parser-en-us`; behavior in `stdlib`; story-authored content in
the story.

## Acceptance Criteria

L0 is complete when the following are demonstrable:

- **AC-1**: World-loader rejects walls with cardinality ≠ 2
  distinct rooms (zero, one, three+ rooms; or self-referential
  `[parlor, parlor]`).
- **AC-2**: World-loader rejects walls without per-side adjectives
  on either side.
- **AC-3**: World-loader rejects walls with adjective collisions
  within a room (two walls in the same room sharing an adjective).
- **AC-4**: After `createWall(parlor, library, ...)`, both
  `parlor.walls` and `library.walls` reference the new wall
  entity. The reciprocal references are maintained automatically.
- **AC-5**: LOOK AT WALL from a room with exactly one wall renders
  the per-side description for that side without disambiguation.
- **AC-6**: LOOK AT WALL from a room with multiple walls triggers
  parser disambiguation enumerating each visible wall by its
  per-side adjective.
- **AC-7**: `OAK WALL` (or any adjective + WALL form) from a room
  resolves to the wall whose current-side adjective matches; the
  same wall entity resolves under different adjectives from
  different rooms (e.g., 'oak' from parlor, 'brick' from library).
- **AC-8**: An `obstructedBy` reference resolves at world-load and
  is checked at runtime against the obstructor's current location
  rather than against a stored flag.
- **AC-9** (pairs with ADR-172 AC-7): The obstructor-protocol
  query function returns the sum of contributions from all matching
  capability-specific traits across both sides for any given
  capability — this is the substrate ADR-172's `AcousticDampenerTrait`
  consults to compute effective acoustic cost.
- **AC-10** (pairs with ADR-172 AC-8): An obstructor lacking a
  particular capability-specific trait contributes zero to that
  capability — the wall's effective behavior in that capability is
  unaffected by the obstructor's presence.

Each AC has a real-path test per the integration-reality discipline
in CLAUDE.md.

## Consequences

### What this enables

- **ADR-172 (Spatial Sound Propagation)** can declare `AcousticTrait`
  as a whole-wall trait on this primitive without inventing its
  own adjacency model. The structural gap flagged in ADR-172's
  per-ADR review closes by reference to this ADR.
- **Future breaching ADR** can ship a `BreachableTrait` per-side
  trait + breaching behavior, composing with capability dispatch.
  No further world-model changes required.
- **Future secret-passage ADR** can model a hidden door as a wall
  whose discovery transition adds an exit between the two rooms it
  borders. The wall entity persists; an exit is added alongside.
- **LOOK AT WALL** works through the standard parser pipeline. The
  author writes per-side descriptions; the platform handles
  resolution.
- **Decoration** (paintings, tapestries, bullet holes) attaches as
  per-side data or as separate entities the wall references.

### What this constrains

- **All future wall-related features go through this primitive.**
  Per-feature ad-hoc wall handling is not a path. New traits classify
  into whole-wall or per-side slots and follow the trait/behavior
  pattern.
- **Adjacency is explicit.** Stories that want sound or breaching
  between two rooms must declare a wall, even if the layout
  "obviously" implies adjacency. The platform does not infer.
- **The world-loader runs structural validation** on every wall:
  cardinality (exactly 2 distinct rooms), per-side adjective
  presence, per-room adjective uniqueness, `obstructedBy` resolution
  (the referenced entity must exist and be located in the
  appropriate room at world-load time).

### What this does not specify (deferred)

- **BreachableTrait and breaching mechanics** — separate ADR. This
  ADR establishes the wall primitive, the per-side data slot, and
  the obstructor protocol where `BreachBlockerTrait` will attach;
  the breach trait itself, the breach state machine, tool
  requirements, and the conversion of a breached wall into an exit
  are deferred.
- **Hidden state & discovery (incl. secret passages)** — separate
  ADR. A future ADR introduces a hidden-state pattern for entities
  (walls, peepholes, etc.) that are imperceptible until discovered,
  plus the discovery transition (often: a wall gains an exit when
  revealed, becoming a passable secret passage). The wall primitive
  supports the use case; the discovery mechanic, hidden-trait
  composition, and exit-creation transition are deferred. The
  Alderman's secret-passage mechanics consume this ADR.
- **Visual cross-room observation** — a future ADR establishes
  cross-room visibility riding on this wall primitive (and on the
  future Acoustic Conduits primitive). Will introduce
  `VisualConduitTrait` / `VisualBlockerTrait` as obstructor traits
  per the generalized obstructor protocol, plus a propagation /
  line-of-sight model parallel to ADR-172's acoustic propagation.
  Peepholes, two-way mirrors, scrying glasses, and security camera
  feeds compose via this ADR + ADR-173.
- **Acoustic Conduits** — a future sibling primitive to walls,
  expressing acoustic connections between non-adjacent rooms (vents,
  ducts, dumbwaiter shafts, speaking tubes, pipes). IFEntity-derived
  edges with terminal entities visible/examinable in each connected
  room. Multi-endpoint conduits supported (a building-spanning pipe).
  Conduit terminals participate in the same obstructor protocol —
  cover plates and other obstructions on a terminal carry
  capability-specific traits the same way wall-side obstructors do.
- **Active acoustic devices** (intercoms, wired phones, recorders,
  microphones, security camera feeds, public-address systems) —
  *not* a new platform primitive. These compose existing primitives:
  the device is an entity with a `Listener` trait (perceives sounds
  in its room), a device-state trait (`SwitchableTrait` for ON/OFF;
  richer state for phones), and an event handler responding to
  incoming `AudibilityEvent`s by emitting derived sounds at paired
  device locations. Documented as a composition pattern, not an ADR.
- **Directional or relational parser phrasings** (`NORTH WALL`,
  `WALL TO THE LIBRARY`) — out of scope. A future "directional
  language extensions" ADR (coordinated with ADR-172's directional
  prose deferral) addresses both the parser and rendering sides.
  Stories that want directional phrasings now extend the parser per
  ADR-087.
- **Whole-wall asymmetric variants** (one-way acoustic insulation,
  one-way fire spread on the *intrinsic* wall material — distinct
  from per-side obstructor effects, which already support asymmetry)
  — the trait taxonomy classifies these as whole-wall by default.
  Authors who need asymmetric whole-wall behavior either model it
  via per-side obstructor traits (which support asymmetry natively)
  or wait for a future ADR that introduces a hybrid trait shape.
- **Wall deletion / world reconfiguration** — once declared, walls
  persist. A future ADR may address dynamic world reconfiguration
  (collapsing a wall completely, merging two rooms). Mid-game wall
  state mutation (breaching, decorating, mutating an `AcousticTrait`
  to model damage) is supported; entity deletion is not specified.

### Risks and trade-offs

- **Authorial verbosity**: declaring walls is more typing than the
  status quo (which is to say, nothing). The convenience helper
  reduces typing for the common shared-property case, but every
  acoustically meaningful adjacency must be declared. For a
  20-room hotel with most rooms acoustically connected to neighbors
  via walls, this could be 30+ wall declarations. Mitigated by:
  (a) authors who don't care about cross-wall sound or breaching
  pay zero cost — they declare no walls; (b) the helper amortizes
  shared-property cases.
- **Adjective discipline**: requiring adjectives forces authors to
  invent distinguishing words for every wall. For rooms with many
  walls of similar appearance, this can feel forced. The world-load
  validation catches duplicates at load time, which is preferable to
  discovering them in playtesting, but the authoring burden is real.
- **Per-side state sprawl**: walls carry per-side data that mirrors
  some of what a separate per-side wall entity would carry. The
  single-entity model is cleaner for state mutation (one breach
  state, not two to keep in sync) but produces a larger entity
  shape than a typical IFEntity. Acceptable trade-off given the
  small wall count in typical stories.
- **Parser resolution complexity**: the parser must consult the
  player's current location when resolving wall adjectives, since
  the same wall entity has different adjectives from different
  sides. This is a new pattern (most entities have a single name);
  parser-en-us gains a per-side resolution path. Cost is one-time
  and contained.

### Backwards compatibility

None required. Sharpee has no existing wall primitive; this is
greenfield. Per project policy (no backwards-compatibility shims),
nothing is migrated. Stories that don't declare walls behave
identically to today (no adjacency, no cross-room sound through
walls, no breaching).

## Session

This ADR was produced in `session-20260508-1229-main` from the
ADR-172 single-mode review, which surfaced room-to-room wall
adjacency as a structural gap in ADR-172. The gap promoted to its
own primitive when broader consumers (breaching with tools, secret
passages, examination, decoration) made wall adjacency obviously
cross-cutting. Sound is the case study driving immediate need; the
primitive is platform-level.

Specific decisions captured during the session:

- IFEntity-derived (over edge metadata) — chosen so parser resolution
  and capability dispatch work natively without special-casing.
- Room-pair cardinality (over per-side wall entities) — chosen to
  simplify state mutation and reduce entity count; the asymmetric
  cases are handled via the per-side data slot on a single entity.
- 100% author-driven instantiation (over auto-inference from layout)
  — chosen on the principle that the platform does not invent world
  structure.
- Whole-wall vs per-side trait taxonomy — established in response to
  the bookcase example: a bookcase blocks breach asymmetrically but
  does not affect sound, motivating the explicit split between
  intrinsic (whole-wall) and interface (per-side) properties.
- Per-side adjective requirement with per-room uniqueness — chosen
  to force disambiguation thinking at world-authoring time rather
  than playtesting time.

### Implementation history

L0 was implemented in two sessions in 2026-05:

- `session-20260508-1229-main` — Phases 1+2 (wall entity primitive,
  validation, `createWall` API, reciprocal `walls` collections on
  rooms). Landed in commit `867b6948`. 29 tests in
  `packages/world-model/tests/unit/world/wall.test.ts` covering
  AC-1..AC-4 and AC-8.
- `session-20260508-1902-main` — Phases 3+4+5 (per-side adjective
  parser resolution; examining action renders per-side description;
  generalized obstructor-protocol query helpers). Landed in commit
  `68ab177b`. 29 additional tests across
  `packages/stdlib/tests/unit/validation/wall-resolution.test.ts`
  (AC-5..AC-7 + cross-room scope, 8 tests),
  `packages/stdlib/tests/unit/actions/examining-walls.test.ts`
  (per-side description rendering, 6 tests), and
  `packages/world-model/tests/unit/traits/obstructor-protocol.test.ts`
  (AC-9..AC-10 + runtime location lift, 15 tests). Two
  mutation-verification tests for the `setMinimumScope` call were
  added to `wall.test.ts`, bringing it to 31 tests.

Notable decisions during implementation:

- **Phase 3 actually landed in `@sharpee/stdlib`**, not
  `@sharpee/parser-en-us` as the Implementation Modules table
  initially suggested. Entity-resolution lives in stdlib's
  `command-validator.ts`; the parser produces noun phrases but does
  not own scoring or scope filtering.
- **`scoreEntities` enforces strict modifier matching for walls**:
  when modifiers were specified but none match the per-side
  adjective, the wall is dropped from candidacy. Without this,
  `OAK WALL` from the library would silently resolve to the
  parlor↔library wall (whose library-side adjective is `brick`)
  via the bare `wall` type-match path. ADR-173 §End-to-end
  scenario explicitly requires "no match" in that case.
- **Walls reach scope via `setMinimumScope(2, [roomA, roomB])`**
  inside `createWall`, since walls have no spatial containment.
  The standard scope rules (room contents + the room itself)
  would otherwise miss them entirely.

## Implementation phasing

L0 ships in phases that each deliver standalone value:

1. **Wall entity type and IFEntity integration** — add the
   `IWallEntity` interface, the wall-creation API
   (`world.createWall`), and the `between` relation type. Validate
   cardinality and adjective uniqueness at creation time. Tests
   exercise the entity shape and validation rules on synthesized
   inputs.
2. **Reciprocal room references** — extend rooms with a `walls`
   collection; world-model maintains it on `createWall`. Tests
   verify both rooms gain references; tests verify the helper
   `createWalls` fans out correctly.
3. **Parser resolution** — extend parser-en-us with per-side
   adjective resolution. The player's current location selects
   which side's adjective to match. Tests cover unique resolution,
   ambiguous resolution (multiple walls in a room), and the
   single-wall fallback.
4. **Examination support** — LOOK AT WALL renders the per-side
   description for the side facing the player's current room.
   Tests verify per-side description rendering and the obstructed
   case.
5. **Obstruction default behavior** — `obstructedBy` is consulted
   by per-side capability evaluation (initially: only by future
   traits). The platform ships the lookup logic; consumers (a
   future BreachableTrait) opt in.

Each phase has a real-path test per the integration-reality
discipline in CLAUDE.md: world-model tests use real worlds with
real rooms; parser tests use the real parser; LOOK AT WALL tests
exercise the real action pipeline. No phase passes on stubs of the
subsystem under test.
