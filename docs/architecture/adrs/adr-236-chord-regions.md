# ADR-236: Chord Regions — named room groups with attached daemons

## Status: ACCEPTED (2026-07-17 — all 4 open questions ruled by David, session d2863f; adr-review 14/14, 3 small fixes applied pre-flip)

## Date: 2026-07-17

## Parent: ADR-233 (go-live gate G1); ruled in-gate — design AND implementation — by ADR-235 D4 (David, 2026-07-17, session 615882)

## Context

David's direction (2026-07-17, session 615882, recorded in ADR-235
D4): a **named list of rooms that can carry an attached daemon**, so
regional simulation (weather over the outdoor rooms, a background
clock in the mansion) belongs to the group, not to a hardcoded
room-ID set. Story-level daemons are NOT ruled out — that
possibility stays open inside this same design conversation. Ruled
IN the go-live gate, design and implementation, sequenced before
ADR-233 G4.

Naming (clarified by David, 2026-07-17, session d2863f): the surface
**reuses the platform's region system, including the name** — the
Chord word is `region`, not a new author word. ADR-235 D4 and
ADR-233 G1 recorded the working name "areas"; this ADR's title and
surface supersede that working name.

The platform ships the structural half (ADR-149 regions), verified
against code this session:

- `RegionTrait { name, parentRegionId?, ambientSound?, ambientSmell?,
  defaultDark }` (`packages/world-model/src/traits/region/`),
  `EntityType.REGION` (id prefix `rg`).
- `world.createRegion(id, opts)`, `world.assignRoom(roomId,
  regionId)` (validated: room must have RoomTrait, region must
  exist), `world.isInRegion(entityId, regionId)` (walks
  `parentRegionId` ancestry — nesting is transitive),
  `world.getRegionCrossings(from, to)` (cycle-guarded).
- going.ts already computes crossings on every move and emits
  `if.event.region_exited` / `if.event.region_entered` per crossing.
- Scheduler daemons (`plugin-scheduler`, turn priority 50) with
  `condition(ctx)` gating — the substrate Chord's owner-attached
  `on every turn` clauses already lower onto
  (`story-loader/src/runtime.ts` `buildSchedulerDaemons()`: one
  daemon per clause, owner-presence narration per ratchet D11).

Two honest gaps in that half (verified both directions):

- The ambient properties (`ambientSound`, `ambientSmell`,
  `defaultDark`) are **stored but never consumed** — no platform code
  reads them to affect descriptions, listening, or darkness. Data
  model only.
- The one shipped region consumer that should benefit — dungeo's
  forest ambience daemon — still uses a hardcoded
  `Set<string>` of room IDs plus a name heuristic instead of
  `isInRegion`, even though `reg-forest` exists. That is precisely
  the pattern Chord regions exist to retire.

Chord has **zero surface** for any of this: no keyword, no IR, no
loader case. Rooms are wired purely by pairwise exit lines; the only
grouping today is the TS-side `assignRooms` helper dungeo hand-rolled
(`stories/dungeo/src/index.ts`) — an elegance-parity signal that the
missing seam is a first-class named room list.

Scope note: ADR-149's other half, **scenes**, is not this ADR.
Chord's story-owned timeline is `define sequence`; a scene surface is
a separate future conversation (D8).

## Decision

### D1 — `region` is a new kind noun; a region is a normal entity

```
create the Forest
  a region
  containing the Clearing, the Forest Path, and the Canyon View

create the Clearing
  a room
  ...
```

`region` joins `KIND_NOUNS` (catalog growth — one ratchet row, R1).
The loader builds it through the normal entity path onto the platform
seam that already exists: `world.createRegion` + `world.assignRoom`.
The loader never sets `RoomTrait.regionId` directly — one wiring
path, same invariant as ADR-234 D5, except here the seam needs no
extraction: `createRegion`/`assignRoom` already ARE the shared
mechanics.

A region block composes like any entity block where composition makes
sense: `aka` aliases and description paragraphs are legal (a region
is examinable in principle; whether any action surfaces it is the
platform's business). Placement lines (`in <place>`, `starts in`) are
a load error — a region's "location" IS its member list (mirror of
ADR-234 D3's door-placement gate).

### D2 — Membership: the region names its rooms (one form)

The `containing <list>` body line is the only membership form:
`containing the Clearing, the Forest Path, and the Canyon View`.
Multiple `containing` lines in one region block are legal and
additive (long lists stay readable). Rooms never name their region —
there is no room-side `in the Forest` form (one form per concept,
Given 7; and David's ruling language is literally "a named list of
rooms").

Load-time gates (never guess):

- A `containing` member that resolves to no entity is the standard
  unresolved-entity load error.
- A member that is neither a room nor a region (D3) is a load error
  naming the entity and its kind.
- A room listed in two regions is a load error naming both spans —
  `RoomTrait.regionId` is single-valued; direct membership is
  exclusive. (Nesting makes a room *implicitly* in every ancestor
  region; listing it in an ancestor AND a descendant is the same
  error — direct membership is stated exactly once.)
- A region with no `containing` line anywhere is a load error (an
  empty region is unanswerable — same never-guess class as ADR-234's
  unconnected door). Ruled: hard error, no warning tier (David,
  2026-07-17, session d2863f) — declared-but-unanswerable stays
  uniformly hard, and a memberless region's daemon could otherwise
  silently never fire.

### D3 — Nesting: regions contain regions, zero new grammar

A `containing` member may itself be a region:

```
create the Underground
  a region
  containing the Mines, the Round Room

create the Mines
  a region
  containing the Shaft Top, the Coal Seam
```

That sets `RegionTrait.parentRegionId` on the child — the shipped
ancestry walk makes membership transitive (`isInRegion` on a Coal
Seam player is true for the Mines AND the Underground). Gates: a
region contained by two parents is a load error (parent is
single-valued); a containment cycle is a load error naming the cycle.

### D4 — Daemon attachment: the existing `on every turn` clause, region-owned

No new clause grammar. The region block becomes a legal home for the
same owner-attached clause entities and traits already carry:

```
create the Forest
  a region
  containing the Clearing, the Forest Path

  on every turn while it is daytime
    phrase forest-birdsong
  end on
```

Semantics: one scheduler daemon per clause
(`buildSchedulerDaemons()`, same lowering as entity clauses), with
presence = **the player is in the region** —
`isInRegion(playerLocation, region)`, transitive through nesting.
This is the region-shaped instance of the D11 owner-presence rule: an
entity clause fires where the entity is; a region clause fires where
the region is, and a region "is" at every member room. `it` binds the
region. `while <condition>` and `, once` compose exactly as
elsewhere.

This closes the audit Part 2 finding's regional half with real
behavior on day one — "weather over the outdoor rooms" is a
region-owned every-turn clause, not an ambient property waiting for
a consumer.

### D5 — Ambient properties: not surfaced while nothing consumes them

`RegionTrait.ambientSound`/`ambientSmell`/`defaultDark` have no
platform consumer (verified this session). Chord surface for them
would be declaration without behavior — the exact class the ADR-235
D2 behavior-hatch removal killed (a form that structurally cannot
fire). No ambient body line ships or is reserved in this gate;
when the platform grows a consumer, the surface conversation starts
then, with its own ratchet entry. The daemon leg (D4) covers the
ambience *use cases* today via phrases. Ruled: deferral confirmed
(David, 2026-07-17, session d2863f) — no ambient surface ships or is
reserved in this gate; the consumption work (sensory actions,
darkness propagation) is its own future conversation.

### D6 — Crossing reactions: both sides, in-gate (ruled)

going.ts already emits `if.event.region_entered`/`region_exited` per
crossing — the events exist with zero Chord consumers. Ruled (David,
2026-07-17, session d2863f): **both sides land in this gate**,
symmetric. The surface is the existing reaction clause form on the
region block:

```
  after entering it
    phrase forest-gloom
  end after

  after leaving it
    phrase open-sky-relief
  end after
```

`entering` is already in EVENT_VERBS (bound today to
rooms/enterables) — the region block is a new legal home. `leaving`
is NEW catalog growth (one event verb), carried on ratchet R3. Both
clauses bind to the shipped crossing events for that region;
nesting-transitive per `getRegionCrossings` (entering a child region
from outside fires the parent's entering reaction only when the
parent boundary is actually crossed — the crossings list is the
source of truth). `while <condition>` composes as on any reaction
clause.

### D7 — Story-level daemon: story-owned clause, in-gate (ruled)

Ruled (David, 2026-07-17, session d2863f): the story-level daemon
ships in this gate as the existing `on every turn [while <cond>]
[, once]` clause hosted in the **story header block's indented
body** — alongside the story-owned lines it already carries
(`states`, `score … worth N`; ratchet D2/D12). Owner = the story
itself; story-as-owner is established precedent, no floating rule
returns, Given 9 holds.

Semantics: one scheduler daemon per clause, **no presence gate** —
it fires every turn wherever the player is (that is the point:
"a background clock for the whole game"). The D11 owner-presence
narration rule is satisfied trivially (the story is everywhere).
`it` is NOT bound in a story-owned clause — there is no entity
referent; conditions reference the player, the world, and defined
conditions as usual, and `it` in a story clause is a compile error
(a new diagnostic in the analyzer's unbound-referent class — the
case cannot arise today because every existing clause home has an
owner). Rides ratchet R4.

### D8 — Non-goals (recorded, not closed)

- **Scenes surface** — SceneTrait/`createScene`/scene-evaluation are
  shipped platform (ADR-149 + ADR-186 reactions) with no Chord
  surface; `define sequence` is Chord's story timeline. A scene
  surface is a future conversation, not this gate.
- **Dungeo migration** — retiring forest-daemon's hardcoded room set
  is story work on the TS canon, post-launch; this ADR only requires
  the Chord fixture proving regions do it cleanly (elegance parity,
  both directions).
- **Ambient consumption** (unless Q-2 rules it in) — platform work
  on look/listen/darkness, its own conversation.
- **Multi-region direct membership** — `regionId` is single-valued
  by platform design; not reopened here.
- The Chord-Zork completeness matrix stays post-launch (ADR-233
  boundary).

### D9 — Ratchet entries carried (drafted here; land with the implementation, David's approval logged per entry)

- **R1**: `region` kind noun (catalog growth: `KIND_NOUNS` + the
  loader kind mapping).
- **R2**: `containing <name list>` region body line — membership,
  additive across lines, rooms and regions as members.
- **R3**: crossing reactions on region blocks — `after entering it`
  legal in region blocks; `leaving` joins EVENT_VERBS (catalog
  growth) with `after leaving it` legal in region blocks (ruled
  in-gate, both sides, David 2026-07-17).
- **R4**: `on every turn [while <cond>][, once]` legal in the story
  header block's indented body — story-owned daemon, no presence
  gate, `it` unbound (ruled in-gate, David 2026-07-17).

Each lands as a dated row in
`docs/architecture/chord-grammar-changes.md`;
`docs/reference/chord-grammar.md` + `chord.ebnf` updated with the
implementation (ADR-210 governance).

### D10 — Acceptance criteria for the follow-on implementation plan

- AC-1: a Chord story with a nested region tree loads: region
  entities exist, every member room's `regionId` set, child regions'
  `parentRegionId` set — asserted on the loaded world (REAL-PATH).
- AC-2: a region daemon fires only while the player is in a member
  room — including a room of a nested child region — driven by real
  `go` commands from a Chord-loaded world; `while` and `, once`
  compose. Asserted on emitted events/output, not on registration.
- AC-3: every load error in D1–D3 has a test asserting its
  diagnostic (unresolved member, non-room member, double direct
  membership, ancestor+descendant listing, two parents, cycle,
  memberless region, placement line on a region).
- AC-4: region membership and daemon behavior survive save/restore
  (regions are entities; daemons re-lower from IR on load).
- AC-5: entering AND leaving reactions fire from a real `go`
  crossing, asserted on output; a move between two rooms of the same
  region fires neither; a move into a nested child region fires the
  parent's reaction only when the parent boundary is crossed.
- AC-6: a story-block daemon fires every turn regardless of player
  location (driven across rooms in different regions from a
  Chord-loaded world, REAL-PATH); `it` in a story clause asserts its
  compile diagnostic.
- AC-7: grammar reference + EBNF updated; each ratchet row logged
  with David's dated approval.

## Consequences

- ADR-233 G1's regions line becomes closeable: this ADR ACCEPTED +
  its follow-on implementation plan shipping satisfies the ruling.
- Chord gains its first non-room spatial owner; the audit's "no
  story-global daemon surface" finding closes FULLY — the regional
  half via region-owned clauses (D4), the global half via the
  story-owned clause (D7) — with behavior, not stored-but-dead data.
- The `containing` membership direction (region lists rooms) pins
  the authoring shape; a room-side form is foreclosed unless a
  future ADR supersedes (Given 7).
- The platform's `createRegion`/`assignRoom` seam becomes
  load-bearing for Chord — the ADR-149 status stale-ness (still
  marked DRAFT while fully shipped) should be corrected when the
  implementation plan lands.
- The story header block grows from declaration-owner (`states`,
  scores) to behavior owner — every-turn clauses now have four legal
  homes: entity, trait, region, and the story itself; all four share
  one lowering path (`buildSchedulerDaemons`).

## Session

Drafted 2026-07-17, session d2863f, from ADR-235 D4's ruling
(session 615882); naming clarified by David same day (reuse the
platform name `region`; "areas" was the working name). Code
grounding verified this session: RegionTrait + WorldModel region API
+ ancestry walk, going.ts crossing events, scheduler daemon
substrate + `buildSchedulerDaemons` lowering + D11 presence rule,
catalog closed sets (`EVENT_VERBS` = `{entering}`),
ambient-property consumer absence, dungeo `assignRooms` +
forest-daemon hardcoded room set.

