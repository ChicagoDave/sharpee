# ADR-213: Removed-from-Play — a Witnessed Removal Signal at the `removeEntity` Choke Point

## Status: DRAFT (Open questions 1–4 are David's to answer before implementation)

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
  `WorldModel.removeEntity`: spatial index removal, detach, then
  `entities.delete(id)` (WorldModel.ts:818-833). Distinct from
  *orphaning* (`moveEntity(id, null)` — parked nowhere, still exists).
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
  notification, named accordingly).
- In-memory array, registration order, nothing serialized; callers
  re-register at load — the same lifecycle contract as the ADR-211
  gate seam and ADR-212's entry registry.
- This is a *seam*, not an event-system change: nothing lands on the
  `if.event.*` bus, so the "events are messages, not pub/sub"
  constraint the dungeo interceptor documents is unchanged. (Whether a
  semantic `if.event.removed` should ALSO be emitted is Open
  question 2.)

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

### 4. A Chord removal statement — minted separately

For Chord stories to remove entities themselves, the loader needs a
removal statement (`remove <entity>` — spelling per Open question 3).
That is new grammar: it takes its own ratchet entry and lands when a
story needs it. Nothing in the zoo-surfaces package requires it (the
zoo's only removal is TS-side, which §2 already covers), so this ADR
defines the semantics — statement → `world.removeEntity` → observers
fire, witnessed narration per §2 — but does not force it into the
zoo-surfaces scope.

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
- **chord**: no change in this ADR; the removal statement (§4) is a
  future ratchet entry.
- **engine / stdlib / lang-en-us / if-domain**: no change.

Touched packages: `world-model`, `story-loader` (+ `chord` only when
§4's statement is minted). Anything outside this list is a
stop-and-discuss checkpoint.

## Open questions (David's)

1. **Observer timing and payload.** Confirm pre-deletion invocation
   with `(liveEntity, lastRoomId)`. The alternative — post-deletion
   with a snapshot — forces the platform to guess what to snapshot;
   pre-deletion lets the consumer read what it needs.
   Recommendation: pre-deletion as drafted.
2. **Seam only, or also a semantic event?** The observer seam is what
   `disappeared` needs. Should `removeEntity` ALSO emit
   `if.event.removed` on the event bus so story `.on` handlers and
   chains can react declaratively? That reverses the world-model's
   no-change-events posture at one method and is a bigger decision.
   Recommendation: seam only now; the event can be a later ADR if a
   story needs it.
3. **The Chord statement.** Mint `remove <entity>` now (its own
   ratchet entry, cheap while Z3's channel machinery is being built in
   zoo-surfaces Phase 3) or defer until a story needs it (dungeo's
   Chord migration will)? And the spelling: `remove` (matches the API)
   vs `destroy`. Recommendation: defer; spelling decided at minting.
4. **Orphaning.** `moveEntity(id, null)` parks an entity nowhere
   without deleting it (bootstrap and some setup code use it). The
   signal deliberately does NOT fire there — `disappeared` means
   removed/destroyed per the ratchet. Confirm orphaning stays
   unsignaled (a witnessed orphaning would be `exited` territory if it
   ever needs narration).

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
- **AC-6** (lands with §4's statement, whenever minted): the Chord
  removal statement removes the entity, fires the observers, and the
  witnessed narration renders per AC-2.

## Consequences

- Removal becomes observable at its one choke point; "X disappeared"
  narration stops being a per-call-site hand-rolled pattern with a
  hand-rolled witnessed check.
- Chord's `disappeared` channel gets its firing condition without the
  loader polling or wrapping every removal path — and it covers
  TS-initiated removals of Chord entities for free.
- The world-model's no-change-events posture survives everywhere
  except this one deliberate seam (and Open question 2 keeps the event
  bus out of it unless David opts in).
- The zoo-surfaces plan's Phase 3 stop-and-discuss risk is resolved by
  decision rather than discovered mid-implementation.
- Cost: one small world-model seam + one loader observer; the Chord
  statement is deferred and separately ratcheted.

## Session

Drafted 2026-07-13 (session 0248bb, branch v2-210-chord-a) from the
chord-zoo-surfaces plan's Phase 3 risk note and a dedicated
removal-pathway investigation (choke-point audit, call-site inventory,
statement-roster confirmation). Raised per David's instruction that
Chord-surfaced Sharpee API gaps come to him as ADRs. Companion:
ADR-212 (slot entries) — drafted the same session; its AC-3 covers the
removed-owner interplay.
