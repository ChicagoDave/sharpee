# ADR-212: Slot Contributions as Data — a Declarative Entry Registry Behind `{slot:here}`

## Status: ACCEPTED (2026-07-13 — all open questions resolved via interview: Q1 seam now, Q2 engine, Q3 zoo migrates in-package, Q4 any slot key)

> Drafted 2026-07-13 from the chord-zoo-surfaces package planning
> (session 0248bb). The Z3 `present` channel investigation found that
> ADR-195 S1's slot-contributor surface is closure-only: every consumer
> hand-writes a TS function, and no seam lets a data-shaped
> `phrase present:` block feed `{slot:here}`. David's standing
> instruction: Sharpee API gaps surfaced by Chord get raised as ADRs.
> Written from a two-agent code investigation; every load-bearing claim
> carries a file:line citation. **adr-review round 1 applied**
> (2026-07-13, multi-ADR with ADR-213): `SlotEntryGate` union pinned;
> counter keying disambiguated via `counterKey` (default slot key,
> Chord passes the channel key — resolving slot-vs-channel drift);
> default gate pinned to the player's containing room at staging time;
> AC-7 (last-wins re-registration) and the never-unregistered
> lifecycle sentence added.

## Date: 2026-07-13

## Terminology

- **Slot** — the ADR-195 open append target in a phrase template
  (`{slot:here}`, `{slot:detail}`); the slot owns all joining.
- **Contributor** — a TS closure `(ctx: RenderContext) => void` that
  stages content into slots each turn (ADR-195 S1).
- **Slot entry** — this ADR's new concept: a *declarative* record
  (owner entity, slot key, content phrase, order, gate) that a single
  platform-owned contributor evaluates — data in, prose out.
- **Owner** — the entity whose presence/state the entry describes and
  whose counter keyspace the entry's Choice content uses.

## Context

ADR-195 S1 gave the phrase algebra the `Slot` atom and a staging
surface, and it works — but everything that feeds it is hand-written
TS:

- The only registered contributor in the repo is friendly-zoo's
  occupant-presence closure (`stories/friendly-zoo/src/index.ts:312-343`):
  a hard-coded four-row table (entity id, order, messageId) plus a
  closure that resolves the player's room, filters the table by
  presence, and contributes literals. ADR-195 explicitly assumed this
  shape — "stories register via the existing `onEngineReady` hook…
  no new `Story` method" (adr-195-phrase-algebra-slot-atom.md:130-133).
- `{slot:detail}` doesn't even use the contributor path: stdlib
  examining attaches a per-message `__slots__` param from
  `getStateClauses(noun)` (examining.ts:140-149; drained by
  phrase-render.ts:68-79). Its providers are again TS functions in the
  trait-keyed state-clauses registry (world-model
  state-clauses.ts:36-66).
- The pipeline invokes contributors once per turn at the top of
  `processTurn` (pipeline.ts:120-130); the slot store is turn-scoped
  and never serialized (render-context.ts:185-208).

Chord's Z3 `present` channel (zoo-surfaces ratchet, APPROVED
2026-07-12) needs an entity's `phrase present:` block — pure data in
the story IR — to feed `{slot:here}` while the owner is in the
described room. Today the only bridge is for the loader to synthesize a
bespoke TS closure per story, which:

1. re-implements presence filtering, ordering, and message lookup that
   friendly-zoo already hand-rolled once — a second copy of the same
   logic, in a second layer;
2. leaves the gap in place for every future runtime (and for TS
   authors, who keep writing occupant tables by hand);
3. hides a platform concept — "an occupant announces itself in the
   room description" — inside one consumer.

The repo already has three registries with the same lifecycle
(in-memory keyed registration, nothing serialized, re-registered at
load or import): state-clauses (trait-keyed), slot contributors
(append-ordered array), and the ADR-211 gate seam (`(roomId, marker)`-
keyed, planned in 211-core Phase 3). All three take TS *functions*.
This ADR adds the first *data-shaped* entry to that family — because
the `present` case is fully describable as data.

## Decision (proposed)

**One sentence: the platform grows a declarative slot-entry registry —
`(slotKey, ownerEntityId) → { content, order, gate }` — evaluated by
one platform-owned contributor; Chord's `present` channel and TS
stories both register entries instead of writing closures.**

### 1. The entry and its registry

A slot entry is a plain record:

```typescript
// engine (prose pipeline) — the declarative entry
export interface SlotEntry {
  slotKey: string;                  // 'here' for the present channel
  owner: string;                    // entity id; default gate subject
  content: Phrase;                  // Literal | Choice (bare content — the slot owns joining)
  order?: number;                   // ADR-195 SlotContributionOptions.order
  gate?: SlotEntryGate;             // default: { kind: 'owner-present' } (see §2)
  counterKey?: string;              // Choice counter key; default slotKey (see §4)
}

// the gate union (§2): the platform evaluates 'owner-present';
// 'predicate' is the registered-seam escape hatch
export type SlotEntryGate =
  | { kind: 'owner-present' }
  | { kind: 'predicate'; holds: (world: WorldModel) => boolean };
```

Registration: `engine.registerSlotEntry(entry)` (alongside
`registerSlotContributor`, game-engine.ts:1817). **Resolved (Q2,
2026-07-13): the registry lives in the engine's prose pipeline** — it
sits beside the staging pass and contributor lifecycle it feeds, and
`GameEngine.registerSlotEntry` delegates exactly as
`registerSlotContributor` does; stdlib was rejected as a dependency
inversion (the engine staging pass would consume stdlib-held data).
Keyed
`(slotKey, owner)`, idempotent-last-wins — the state-clauses shape
(state-clauses.ts:49-51), not the contributor array's append-only
shape, so a loader re-registering on restore is a no-op and a
re-registered entry never double-contributes (AC-7). **Resolved (Q4,
2026-07-13): `registerSlotEntry` accepts any slot key from day one** —
the gate carries the semantics, not the key, so no registration-time
key validation exists to lift later; `'here'` is simply the key the
`present` channel and friendly-zoo use. Entries are
never unregistered mid-session: an entry whose gate can no longer
hold (owner moved, removed from play) is inert, not leaked, and the
whole registry drops on reload. Nothing is serialized; callers
re-register every story load — the same lifecycle contract as the
ADR-211 gate seam.

### 2. Gating: presence by default, seam for the rest

- **Default gate (`owner-present`)**: the entry contributes iff the
  owner shares the **player's containing room at staging time** — the
  same transitive-containment check the `mentions` gate uses
  (`getContainingRoom(owner)?.id === getContainingRoom(player)?.id`).
  The staging pass runs once per turn with no described-room parameter
  (pipeline.ts:120-130), and this is exactly what the shipped zoo
  closure evaluates; for `{slot:here}` — which renders only in the
  player's-room description — "player's room" and "described room"
  coincide, so this is the whole `present` channel and the whole
  friendly-zoo table. (If a future slot renders another room's
  description, the gate contract is already pinned: it is the player's
  room that is checked.)
- **Predicate gate**: an entry may instead carry a registered predicate
  (the Q4/gate-seam pattern — a TS function supplied by whatever
  runtime owns the condition). This is the escape hatch that keeps the
  data shape serializable-by-design while never artificially
  restricting `while` (the ADR-211 Q4 precedent). The Chord loader uses
  it if a `phrase present:` block ever carries a non-presence gate.
  **Resolved (Q1, 2026-07-13): the predicate seam ships now** — the
  two-member `SlotEntryGate` union above is the day-one shape, matching
  the ADR-211 Q4 full-generality resolution; `owner-present` remains
  the default so the data path costs nothing.

### 3. One platform contributor evaluates all entries

A single built-in contributor (registered by the engine itself, not by
stories) runs in the existing per-turn staging pass
(pipeline.ts:120-130): for each entry whose gate holds, contribute
`content` to `slotKey` with `order`. Contribution ordering remains
ADR-195's `(order asc, insertion asc)`; joining remains the slot's
(english-assembler.ts:381-392). An entry whose owner no longer exists
(removed from play — see ADR-213) contributes nothing; it is not an
error.

### 4. Choice content and counters

`content` may be a `Choice` (the CP3 resolution: channel phrases carry
strategy adverbs). Its counter keys on the **owner entity +
`counterKey`**, where `counterKey` defaults to the slot key but is set
explicitly by callers that own a richer name: the Chord loader passes
the **channel key** (`'present'`), satisfying the zoo-surfaces
ratchet's "counter keying is the owner entity + channel key" rule
verbatim — one convention, no drift between the slot's name and the
channel's. Save-persistent through the existing textState capability,
exactly like every other Choice.

### 5. Consumers

- **Chord loader (zoo-surfaces Phase 3)**: `phrase present:` on an
  entity compiles to one `registerSlotEntry` call at load — variants →
  `Choice` per the Z5 adverb table, declaration order → `order`. No
  synthesized closures.
- **friendly-zoo TS**: the hand-rolled table + closure
  (index.ts:312-343) migrates to four `registerSlotEntry` calls **in
  this ADR's implementation package** (resolved Q3, 2026-07-13) —
  byte-identical against the shipped story (AC-1), proving the API on
  a real TS consumer before the Chord loader depends on it.
  Zoo-surfaces Phase 4 then deletes four data rows when zoo.story's
  `present` blocks take over, not a closure.
- **`registerSlotContributor` stands** for genuinely computed
  contributions (ADR-195 unchanged); the entry registry is sugar over
  the same staging pass, not a replacement.

### Interface contracts

- **engine**: `SlotEntry`, `SlotEntryGate`, `registerSlotEntry` in the
  prose pipeline; the built-in contributor runs before story-registered
  contributors (deterministic: platform entries first, then closures in
  registration order). `GameEngine.registerSlotEntry` delegates like
  `registerSlotContributor` does.
- **if-domain**: no change — `Slot`, `SlotContributionOptions`, and the
  `contribute`/`slotContributions` seams stand as-is (phrase.ts:218-226,
  417-421, 456, 468).
- **world-model / stdlib / lang-en-us**: no change. `{slot:detail}`'s
  `__slots__` path is out of scope (Z3b already rides state-clauses).
- **story-loader**: compiles `phrase present:` blocks to entries
  (zoo-surfaces Phase 3 consumes this ADR).

Touched packages: `engine`, `story-loader`, `stories/friendly-zoo`
(migration). Anything outside this list is a stop-and-discuss
checkpoint.

## Acceptance criteria (each lands as a test when implemented)

- **AC-1**: friendly-zoo's occupant presence expressed as four slot
  entries renders byte-identically to the shipped closure output across
  0/1/N occupants, including ordering (zoo walkthrough chain green,
  unedited).
- **AC-2**: an entry whose owner is absent from the described room
  contributes nothing; the slot renders clean (ADR-195 AC-3 posture).
- **AC-3**: an entry whose owner has been removed from play contributes
  nothing and does not throw (ADR-213 interplay).
- **AC-4**: `Choice` content advances its counter keyed
  (owner, counterKey), save-persistent; save/restore mid-cycle
  continues the cycle after entries are re-registered at load; a
  Chord-compiled entry's counter uses the channel key (`'present'`).
- **AC-5**: a predicate-gated entry contributes iff the predicate
  holds; nothing gate-shaped is serialized.
- **AC-6**: a Chord `phrase present:` block compiles to an entry with
  no story-specific TS (fixture story; zoo-surfaces AC coverage rides
  this).
- **AC-7**: re-registering an entry with the same `(slotKey, owner)`
  replaces it — one contribution, never two (the restore-time
  re-registration path pinned).

## Consequences

- "An occupant announces itself in the room description" becomes a
  platform concept with one implementation, instead of a per-story
  closure pattern — TS and Chord authors use the same surface (the
  ADR-211 Q1 unification posture, applied to slots).
- The registry family gains its first data-shaped member; future
  runtimes (and the IDE) can inspect entries — closures are opaque,
  entries are data.
- ADR-195's closure surface is unchanged; the ergonomic-layer follow-on
  it named (adr-195:137-140) is partially delivered by this ADR for the
  `here` slot.
- Cost: one new engine registry + built-in contributor, a four-row
  friendly-zoo migration, and the zoo-surfaces Phase 3 loader work this
  ADR was minted to unblock.

## Session

Drafted 2026-07-13 (session 0248bb, branch v2-210-chord-a) from the
chord-zoo-surfaces plan's Phase 3 drift findings and a dedicated
slot-contributor investigation (consumer inventory, staging lifecycle,
registry precedents). Raised per David's instruction that Chord-surfaced
Sharpee API gaps come to him as ADRs. Companion: ADR-213 (removal
signal) — drafted the same session, cross-referenced at AC-3.
