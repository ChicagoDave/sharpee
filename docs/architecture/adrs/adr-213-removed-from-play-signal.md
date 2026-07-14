# ADR-213: Removed-from-Play — a Witnessed Removal Signal at the `removeEntity` Choke Point

## Status: ACCEPTED (2026-07-13 — all open questions resolved via interview: Q1 pre-deletion live entity, Q2 seam only, Q3 mint `remove` now, Q4 orphaning unsignaled)

> Drafted 2026-07-13 from the chord-zoo-surfaces package planning
> (session 0248bb). The Z3 `disappeared` channel investigation found
> that entity removal in Sharpee is a silent hard-delete with no
> observable signal, every shipped "X disappeared" narration is
> hand-rolled at its call site, and Chord has no way to take an entity
> out of play at all. David's standing instruction: Sharpee API gaps
> surfaced by Chord get raised as ADRs. Written from a dedicated code
> investigation; every load-bearing claim carries a file:line citation.
> **adr-review round 1 applied** (2026-07-13, multi-ADR with ADR-212):
> narration delivery pinned to the loader's existing phrase-event path
> (never inline from the observer); counter-key cross-reference
> corrected to ADR-212's owner + counterKey convention; AC-1 scoped to
> successful removals; player-entity removal explicitly out of the
> channel's scope.

## Date: 2026-07-13

## Terminology

- **Removed from play** — hard-deleted from the entity store via
  `WorldModel.removeEntity`: spatial index removal, then
  `entities.delete(id)` (WorldModel.ts:818-833; the intervening
  detach branch is dead code — see the §1 implementation note). Distinct from
  *orphaning* (`moveEntity(id, null)` — parked nowhere, still exists).
  **Resolved (Q4, 2026-07-13): orphaning stays unsignaled** — the
  observer seam fires only in `removeEntity`; orphaned entities still
  exist and can return, and bootstrap/setup null-moves must not
  trigger observers. A witnessed orphaning that ever needs narration
  is `exited`-family territory, not `disappeared`.
- **Removal observer** — this ADR's new seam: a function invoked at the
  removal choke point, before deletion, with the live entity and its
  last containing room.
- **Witnessed** — the player's containing room equals the entity's last
  containing room at the moment of the transition (the D11 posture:
  unwitnessed transitions narrate nothing and consume nothing).

## Context

The investigation found one choke point and no signal:

- **`WorldModel.removeEntity` is the single removal API**
  (WorldModel.ts:818-833; AuthorModel passes through) — and it is a
  silent mutation. No event, no hook; the world model's deliberate
  posture is no change events (the `updateEntity` sibling carries a
  "Future: could emit change events" comment, WorldModel.ts:851).
- **Every observable removal is hand-rolled at its call site.**
  Dungeo's villain deaths remove the entity and hand-write the
  narration into `sharedData.deathMessages`
  (melee-interceptor.ts:183-191, 251-263), with the header comment
  stating the constraint: "entity `.on` handlers don't fire
  automatically. Death side effects must happen in the execution flow"
  (:158-160). Zoo's zookeeper departure daemon does its own inline
  witnessed check — for *scoring only* — then removes and hand-writes a
  message (events.ts:187-210). The penny press removes and lets the
  replacement item carry the narration (index.ts:445-455).
  `DestructibleBehavior.transformTo` removes silently
  (destructibleBehavior.ts:134).
- **stdlib never removes.** Eating/drinking decrement servings and emit
  `if.event.eaten`/`if.event.drunk`; a fully-eaten item stays in play
  (eating.ts:150,259; edibleBehavior.ts:31-52).
- **Chord cannot remove.** The loader's full statement roster
  (runtime.ts:891-1006) has no remove/destroy; `move` (runtime.ts:937-
  944) requires a real destination — there is no null/limbo form.

Chord's Z3 `disappeared` channel (zoo-surfaces ratchet, APPROVED
2026-07-12) — "narrated when the owner leaves play entirely
(removed/destroyed) while the player is in its room" — therefore has
nothing to hang off of. The zoo-surfaces plan flags it as this
package's one design risk. And the gap is not Chord-shaped: the three
shipped TS call sites each re-invented removal narration and (in one
case) a witnessed check by hand, coupled only by developer discipline.

## Decision (proposed)

**One sentence: `removeEntity` gains a pre-removal observer seam — one
notification at the one choke point, carrying the live entity and its
last room — and Chord's `disappeared` channel (plus, eventually, a
Chord removal statement) rides it.**

### 1. The observer seam (world-model)

```typescript
// world-model — registered observers, invoked synchronously inside
// removeEntity BEFORE deletion (the observer sees the live entity)
export type EntityRemovalObserver =
  (entity: IFEntity, lastRoomId: string | null) => void;

worldModel.onEntityRemoved(observer: EntityRemovalObserver): void;
```

- Invoked exactly once per successful removal, after the containing
  room is captured and before the spatial-index/store mutation —
  observers can read the entity's name, traits, and phrases; they
  cannot veto (removal is already decided; this is a fact
  notification, named accordingly). **Resolved (Q1, 2026-07-13):
  pre-deletion with the live entity is confirmed** — the post-deletion
  snapshot alternative was rejected because it forces world-model to
  guess what consumers need and re-touch the platform every time the
  guess is wrong; the no-veto + logged-exception contract contains the
  mid-removal exposure. Implementation note (corrected 2026-07-14,
  chord-212-213-seams planning): `removeEntity`'s internal
  `moveEntity(id, null)` branch (WorldModel.ts:826-830) is DEAD CODE —
  `SpatialIndex.remove` deletes the entity's parent pointer as its
  first step (SpatialIndex.ts:39-44), so the subsequent
  `getLocation(id)` is always `undefined` and the null-move never
  runs. The seam's rule is therefore: capture the containing room and
  invoke observers BEFORE `spatialIndex.remove` (the first real
  mutation); the dead branch is left as-is, flagged not silently
  removed. The seam hooks `removeEntity` only and must never hang on
  `moveEntity` — a direct orphaning call signals nothing (AC-7).
- In-memory array, registration order, nothing serialized; callers
  re-register at load — the same lifecycle contract as the ADR-211
  gate seam and ADR-212's entry registry.
- This is a *seam*, not an event-system change: nothing lands on the
  `if.event.*` bus, so the "events are messages, not pub/sub"
  constraint the dungeo interceptor documents is unchanged.
  **Resolved (Q2, 2026-07-13): seam only** — no `if.event.removed` is
  emitted; the world-model's no-change-events posture survives intact.
  If a story ever needs declarative `.on`-handler/chain reaction to
  removals, a later ADR adds the bus event at this same choke point.

### 2. The `disappeared` channel rides it (story-loader)

At load, the Chord loader registers one observer. On removal of an
entity with a `phrase disappeared:` block: if the player's containing
room equals `lastRoomId`, the observer **enqueues the phrase through
the loader's existing phrase-event path** (the same machinery the
`phrase` statement uses, runtime.ts:1177-1244) so the text lands in
the turn's report pass like any other phrase emission — the observer
never renders inline, honoring the "side effects happen in the
execution flow, narration in the report" constraint the dungeo
interceptor documents. Choice counters key owner + channel key
(`'disappeared'`) — the same owner + counterKey convention ADR-212 §4
pins for `present`. If the player's room differs, nothing is enqueued
and nothing is consumed (D11). This fires for ANY removal — a TS interceptor or
daemon that removes a Chord-authored entity triggers the entity's
authored farewell without knowing it exists. The zoo's zookeeper is
the concrete case: the TS daemon keeps its `removeEntity` call, and a
zoo.story `phrase disappeared:` on the keeper would narrate the
departure without the daemon's hand-written message (migration choice
belongs to the zoo-surfaces package, not this ADR).

### 3. Existing call sites: additive, no forced migration

Dungeo's death narration is interwoven with the combat report and
stays as-is; the zoo daemon and penny press keep their messages. No
shipped entity has a `disappeared` phrase today, so nothing
double-narrates. The hazard "hand-written removal message + authored
`disappeared` phrase on the same entity double-narrates" is real but
author-visible; documented, not guarded (the ADR-209 counter-collision
posture). Call sites may migrate opportunistically.

### 4. A Chord removal statement — `remove <entity>`, minted now

**Resolved (Q3, 2026-07-13): the statement is minted now, spelled
`remove`** (matching the `removeEntity` API). It takes its own ratchet
entry and rides zoo-surfaces Phase 3 while the channel machinery is
open, rather than waiting for the first story that needs it (dungeo's
Chord migration will). Semantics: statement → `world.removeEntity` →
observers fire → witnessed narration per §2. Nothing else in the
zoo-surfaces package depends on it (the zoo's only removal is TS-side,
which §2 already covers), so it is an additive deliverable there, not
a dependency.

### Interface contracts

- **world-model**: `EntityRemovalObserver`, `onEntityRemoved`;
  `removeEntity` captures the containing room, invokes observers, then
  deletes. `AuthorModel.removeEntity` inherits (pass-through
  unchanged). Observer exceptions: broken-build log, never a mid-turn
  throw (render-graceful posture).
- **story-loader**: registers the `disappeared` observer at load;
  witnessed check via the player's containing room vs `lastRoomId`
  (the loader's existing `playerPresentAt` primitive is the wrong
  shape here — it asks "is the player where X is", and X no longer
  is anywhere; the check is against the captured room id). Narration
  delivery is the existing phrase-event path (§2) — no new render
  seam. Removal of the **player entity** never narrates (bootstrap's
  world-setup swap, index.ts:122, predates story observers; a
  mid-game player removal is author-error territory and simply skips
  the channel).
- **chord**: the `remove <entity>` statement (§4) — its own ratchet
  entry, delivered with zoo-surfaces Phase 3.
- **engine / stdlib / lang-en-us / if-domain**: no change.

Touched packages: `world-model`, `story-loader`, `chord` (§4's
statement). Anything outside this list is a stop-and-discuss
checkpoint.

## Acceptance criteria (each lands as a test when implemented)

- **AC-1**: an observer registered on the world model is invoked
  exactly once per **successful** `removeEntity` (a failed removal —
  unknown id — invokes nothing), before deletion, with the live
  entity and the correct last room id (including `null` for an
  entity with no location).
- **AC-2**: an entity with a `phrase disappeared:` block narrates it
  when removed while the player is in its room; removed elsewhere,
  nothing renders and no counter advances (witnessed-only, both sides
  pinned).
- **AC-3**: save/restore — observers are re-registered at load;
  nothing observer-shaped is serialized; a `disappeared` Choice
  mid-cycle continues after restore.
- **AC-4**: the shipped removal call sites (dungeo villain deaths, zoo
  zookeeper daemon, penny press, destructible transform) run
  byte-identical with the seam in place and no `disappeared` phrases
  authored (dungeo chain + zoo chain green, unedited).
- **AC-5**: an observer that throws is logged and does not abort the
  removal or the turn.
- **AC-6** (lands with §4's `remove` statement in zoo-surfaces
  Phase 3): the Chord removal statement removes the entity, fires the
  observers, and the witnessed narration renders per AC-2.
- **AC-7**: `moveEntity(id, null)` (orphaning) invokes no removal
  observer and narrates nothing — the seam fires only in
  `removeEntity` (Q4 resolution pinned).

## Consequences

- Removal becomes observable at its one choke point; "X disappeared"
  narration stops being a per-call-site hand-rolled pattern with a
  hand-rolled witnessed check.
- Chord's `disappeared` channel gets its firing condition without the
  loader polling or wrapping every removal path — and it covers
  TS-initiated removals of Chord entities for free.
- The world-model's no-change-events posture survives everywhere
  except this one deliberate seam (Q2 resolved: the event bus stays
  out of it; a later ADR may add `if.event.removed` if a story needs
  it).
- The zoo-surfaces plan's Phase 3 stop-and-discuss risk is resolved by
  decision rather than discovered mid-implementation.
- Cost: one small world-model seam + one loader observer + the Chord
  `remove` statement (own ratchet entry, delivered with zoo-surfaces
  Phase 3).

## Session

Drafted 2026-07-13 (session 0248bb, branch v2-210-chord-a) from the
chord-zoo-surfaces plan's Phase 3 risk note and a dedicated
removal-pathway investigation (choke-point audit, call-site inventory,
statement-roster confirmation). Raised per David's instruction that
Chord-surfaced Sharpee API gaps come to him as ADRs. Companion:
ADR-212 (slot entries) — drafted the same session; its AC-3 covers the
removed-owner interplay.
