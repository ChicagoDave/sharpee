# ADR-326: The adjacent-room place expression — `move … to a random adjacent room`

**Status**: **ACCEPTED** (David, 2026-08-25, session 8ae644 — "flip ADR-326 to
ACCEPTED"). All open questions resolved: no filter (D4) 2026-08-24; spelling `a random
adjacent room` (D1) and computed directions answer "where would going take the mover
right now" (D6) via the rule-11a interview 2026-08-25; D5 amended to depend on ADR-327 D5;
`adr-review` 19/19 after one fold. **Implemented 2026-08-25, session 8ae644** (Chord 3.4.0; chord 999 green, story-loader 624 green, world-index/Dungeo chain/secret-letter baselines unchanged) — with ADR-327 D5's move-arrival slice. Mechanism shape (place expression extending ADR-325's family, not an ADR-295
exit resolver) ruled by David 2026-08-24 in the Phase 3 design discussion of
`docs/work/backlog-tier1-2-platform/plan.md`.

**Language + platform change.** Expected surfaces: `packages/chord/src/parser.ts`
(`parsePlace`, `parser.ts:7283` — one new `PlaceExpr` kind), `packages/chord/src/analyzer.ts`
(placement gates, strategy requirement, filter validation), `packages/chord/src/ir.ts` (the
place kind), `packages/story-loader/src/evaluator.ts` (the adjacency draw, beside
`drawLanding` at `evaluator.ts:608`), `packages/story-loader/src/runtime.ts` (the `move`
sink consumes the new place). **No engine, stdlib, or world-model change**: traversability is read through the existing
going read points (`exitBlockedKey` — already imported by the loader at `runtime.ts:62` —
plus `RoomBehavior`/`LockableBehavior`, and the ADR-295 exit-resolver binding for computed
directions, D6), and the move itself rides the existing `move` sink, observers included. EBNF row + `chord-grammar-changes.md` +
ADR-257 version bump per the usual paper trail.

**Date**: 2026-08-24 (session 915e68)
**Related**: [ADR-325](adr-325-chord-presence-and-duration.md) (the place-expression family
this extends: possessive `location`, `here`, `offstage`, region landings — and the
`drawLanding` persisted-stream idiom the adjacency draw mirrors),
[ADR-293](adr-293-choice-points-per-point-streams.md) (seeded streams; the draw is
deterministic at a pinned seed), [ADR-295](adr-295-computed-exits.md) (explicitly NOT the
seam here — see Non-goals — but its invariant binds: the eject is an effect of the acting
turn, never a post-report retcon of a movement command), ADR-240/GH #315 (the composed
blocked-exit evaluators adjacency consults), [ADR-257](adr-257-chord-language-version.md)
**Issues**: GH #311 (the Secret Letter noisy-theft blocker; implementation lands under it)

## Context

The Secret Letter's theft mechanic ejects the player to a *random adjacent unblocked room*
in three places (`story.ni:1992`/`:1998` the noisy theft, `:1825-1835` re-entering a blocked
stall, `:2438-2445` the fruit-stall monkey chaos). Chord cannot say it: `move the player to
<room>` takes a fixed place, and ADR-325 D5's region `landing` is a *declared* list — it can
approximate "somewhere in the market" but not "adjacent to wherever the theft happened," and
the blocked-stall exclusion has no surface at all (GH #311).

The mechanism-shape question was settled in the Phase 3 design discussion (2026-08-24),
correcting a plan-review finding: these ejects are **story `move`-effects** — a reaction
inside the theft's own turn — not going traversals, so ADR-295's trait-data-plus-resolver
seam (scoped by its own D2/D6 to traversal through the going action) does not bind. The
nearer, landed precedent is ADR-325: places are evaluated in the story-loader at effect
time, with no engine surface, and `drawLanding` already shows the shape a strategy draw
takes (per-owner persisted seeded stream, `evaluator.ts:608-636`).

Verified extension points (read 2026-08-24): `parsePlace` (`parser.ts:7283`) returns a
`PlaceExpr` of kind `location` or `name` (with `here`/`offstage` handled at the `move`
statement, `parser.ts:6789-6806`) — a new kind slots in beside them. Traversability per
direction — composed blocked evaluators first (GH #315, one arm-selection per direction),
`RoomTrait.blockedExits` fallback, locked-door check — already exists as the going read
order and is mirrored in `hasTraversableExit` (`stdlib/src/actions/helpers/exit-legality.ts:34-65`).

## Decision

### D1. `a random adjacent room` is a place

`a random adjacent room` is legal where the `move` statement takes a place, and means:
**a room one traversable exit away from the mover's containing room, drawn at effect
time.** (Spelling — Q-1 resolved 2026-08-25, David: option b.)

```
move the player to a random adjacent room            ## the noisy-theft eject
move the monkey to a random adjacent room            ## any entity can be the mover
```

- **Adjacency is the mover's**, read from the mover's containing room at the moment the
  statement runs — the same read-time posture as every ADR-325 place.
- **Traversable** means what going means: the direction's composed blocked evaluator answers
  false (or the trait fallback), and the exit's door, if any, is not locked. A closed
  unlocked door qualifies (it can be opened; the fiction is "she darts through the crowd").
  One truth, read through the existing read points — no second adjacency physics.
- **The randomness is in the noun, not a strategy word.** `cycling`/`stopping` hold a
  cursor over a *stable* list, and the candidate set here is recomputed per draw — so
  there is exactly one way to choose, and a strategy slot would be a slot with one value.
  `random` is part of the place's spelling: `an adjacent room` alone, or `a random
  adjacent room, randomly`, is a compile error whose fix-it quotes `a random adjacent
  room`. This departs from the landing-list precedent (ADR-325 D5) deliberately: a
  landing list is a declared list with several sensible strategies; this place has one.

### D2. The draw is seeded and persisted, per mover

The draw runs on a per-mover persisted stream derived from the story seed — the
`drawLanding` record shape (`evaluator.ts:614-621`): seed persisted through
`world.setStateValue` under a loader-owned key, so saves round-trip and a pinned seed
replays byte-identically (ADR-293). Tree documents can pin the eject destination.

### D3. An empty candidate set refuses loudly

If no adjacent room is traversable, the statement performs **no move** and raises the runtime diagnostic posture of ADR-325 D1's edge rules —
a diagnostic naming the mover and the room, never a silent no-op and never a crash.

### D4. No candidate filter — the place stays one concept (Q-1 resolved 2026-08-24, David: "we've gone down this road and it's in lessons learned")

The place expression carries **no filter clause**. A `that is not <state>` (or `while
not`) narrowing is the road `chord-lessons-learned-timers.md` records against: a
condition bolted onto a noun (lesson 1's symptom), binding the place to a concept it
isn't about (lesson 5), in a newly invented grammar position (lesson 8's inversion).

The blocked-stall exclusion the source wants is **story composition, not syntax**. The
source's own site 2 (`story.ni:1825-1835`) already defines what a blocked stall does to
an arriving Jack — the keeper yells and she darts away again — and that is a story rule
on the stall (`while blocked`: phrase, then `move the player to a random adjacent
room`), written entirely in existing forms plus this ADR's place. An eject that
lands her in a blocked stall triggers that rule; the "exclusion" emerges from two simple
rules composing, exactly as the source behaves. Guards live at the event that changes
the situation (lesson 2), not inside the draw.

If a future story produces evidence that a candidate filter earns its place, it is its
own ADR, checked against lesson 1 first (`chord-lessons-learned-timers.md`, "Where this
applies next").

### D5. Observers are unchanged; a moved arrival fires the room's entering clause

The move rides the existing `move` sink: `disappeared`/`entered` witness narration
(ADR-213/325) fires exactly as for any `move`, and a moved player sees the arrival exactly
as `move the player to <room>` shows it today. Nothing new is narrated by the draw itself.

What *is* new — and what D4's composition depends on — is
[ADR-327](adr-327-explicit-references.md) D5 (ACCEPTED 2026-08-25): an arrival by `move`
fires the destination room's `after <actor> entering` clause exactly as a walked arrival
does, for any actor, bounded by a re-entry cap of 8 and the `runtime.move-arrival-reentry`
diagnostic. That is what makes the blocked-stall rule re-eject an ejected Jack: the draw
lands her, the stall's `after the player entering, while the Grocery Stall is blocked`
fires, and she is drawn again. (Amended 2026-08-25 from "arrival is unchanged," which
was true before ADR-327 D5 and is the one ruling this ADR depends on.)

### D6. Adjacency is where going would take the mover right now — computed directions included

(Q-2 resolved 2026-08-25, David: *"a computed direction could be legit at a given
moment so we can't explicitly rule it out… compute all directions and exclude ones that
are not currently available and include those that are."*) The candidate walk asks each
direction of the mover's room the question going asks: **where would this direction
take the mover at this moment?** A plain exit answers with its static destination. A direction under an ADR-295 computed-exit declaration answers through its resolver, via
the read point going uses — `RoomBehavior.resolveExit(room, direction, ctx)`
(`world-model/src/traits/room/roomBehavior.ts:271`), whose `ExitResolverContext` is
`{ world, actorId, random }` (`exit-resolver-binding.ts:29-36`). Its three answers map
as: `undefined` (resolver inactive or absent — static topology governs, ADR-295 D4)
yields the static destination; `kind: 'exit'` yields `destination`, and any narration
`events` it carries are **discarded** — this is a consult, not a traversal, and nothing
is narrated by the draw (D5); `kind: 'blocked'` contributes nothing. The `actorId` is
the mover's. The `random` is the session `RandomService` (ADR-293): the loader does not
hold one today (its own draws ride persisted chance streams, `runtime.ts:4079`), so the
evaluator receives the engine's service at `ChordStory.onEngineReady` — the seam the
loader already uses for the turn counter and client capabilities (`loader.ts:1043`;
`GameEngine.getRandomService()`, `game-engine.ts:1851`) — the one wiring addition this
ADR makes, story-loader-side, no engine or bootstrap change. (Corrected at landing
2026-08-25 from "at construction through the bootstrap seam".) Headless, a computed
direction met by the draw is a `LoadError`, never a silent skip. The traversability filter (D1) then runs over the answers. A computed direction
that currently leads nowhere contributes nothing; one that is currently live contributes
exactly where it leads — never its whole declared candidate list, and never a room the
exit would not have chosen this turn.

Two consequences, accepted:

- **This extends ADR-295's resolution scope.** D6 there confines resolution to "player
  traversal through the going action" and calls extension "deferred, not precluded";
  this ADR is that extension, for the adjacency draw only. The resolver is consulted once
  per direction per draw — a distinct question from the traversal's own once-per-going
  consult, so ADR-295's called-exactly-once invariant holds per question. Flip owner:
  the implementation change under GH #311 stamps ADR-295 D6 with the amendment.
- **An active resolver's consult consumes its point-stream draw** (ADR-293), exactly as
  a traversal would. The result stays deterministic at the pinned seed; the only stories
  it could affect are ones combining a Chord eject with a computed exit, of which there
  are none (computed exits have no Chord surface and exist only in Dungeo's TS
  `CarouselExitTrait`).

## Non-goals

- **No ADR-295 change beyond D6's scope note.** Computed exits, `resolveExit`, and the
  deferred "Chord authoring surface for computed exits" stay exactly where that ADR left
  them. A room that scrambles *going* is ADR-295's case; a story effect that flings the
  mover is this one's — it consults, it does not redefine.
- No `is adjacent to` **condition** — this is a place, not a predicate; a condition surface
  is a separate decision if a story ever needs one.
- No NPC pathfinding change; no `holder`; no strategy word on this place at all.
- No engine/stdlib/world-model surface (consumption of existing read points only — the
  exit-resolver read point included, D6).

## Consequences

- The Secret Letter's noisy theft, blocked-stall bounce, and monkey chaos become writable —
  the last platform blocker on the paused port's Phase 6 chase increment
  (`docs/work/secret-letter-port/plan.md`) falls. The `steal` action half of that increment
  was already expressible and stays story work.
- Adjacency honors blocked exits, so the GH #315 composed arms feed straight into the
  candidate set: while the north gates are locked, no eject throws Jack out the north road.
- Chord gains its first *computed* place. The reference documents it beside the ADR-325
  places; the language version bumps.
- Tree documents pin eject destinations at the pinned seed (D2), keeping the port's chase
  cards deterministic.

## Acceptance

1. Compile tests: the place parses in `move`; analyzer gates tested by name — `an
   adjacent room` without `random`, a trailing strategy word, the place outside a `move`
   destination.
2. REAL-PATH loader tests (rule 13a) driving a real engine: at a pinned seed the mover lands
   in one of the traversable adjacent rooms (asserted on `world` location, with the drawn
   destination pinned); a blocked direction's room is never drawn (exercising a composed #315 arm); a locked-door
   direction's room is never drawn; a computed direction contributes its resolved room while its resolver is active and its
   static destination while inactive, contributes nothing when it answers `blocked`, and
   its narration events never render (D6 — a test-story resolver, since no Chord story
   has one); a blocked-stall bounce rule
   composed story-side (D4's shape) re-ejects on arrival; an emptied set produces the D3
   diagnostic and no move; an NPC mover works; the
   draw's persisted record round-trips the save shape (the `drawLanding` test pattern).
3. A minimal fixture story (or a `branch-stories/secret-letter` probe) proves the expression
   end-to-end against the market's adjacency graph — the finished chase increment itself
   resumes under the port plan, not this ADR.
4. Paper trail: EBNF row, `chord-grammar-changes.md`, ADR-257 bump.

## Session

2026-08-24, session 915e68 (`docs/context/session-20260824-1035-feat-adr-321-world-index.md`)
— Phase 3 of `docs/work/backlog-tier1-2-platform/plan.md`, following the plan-review
correction that redirected the mechanism from ADR-295's resolver to ADR-325's place family.

**D5 addendum (2026-09-03, GH #331, publish-readiness plan Phase 2).** "A moved player sees the arrival exactly as `move the player to <room>` shows it today" — today that showed nothing: the player landed unnamed until they typed `look`. An authorial move of the player now describes the destination by default, as a walked arrival does: the runtime runs the real looking action as the player through the engine's execution entry (`describeArrival`), its events riding the acting-statement flush ahead of the scheduler, so the description precedes the arrival clauses' narration. Only the outermost move of a re-entry chain describes (the blocked-stall bounce shows the room the player ends in). The draw itself still narrates nothing; the sentence above stands, with "today" now meaning this.
