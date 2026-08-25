# ADR-326: The adjacent-room place expression — `move … to an adjacent room, randomly`

**Status**: DRAFT (2026-08-24, session 915e68) — Open Questions below; DRAFT until they resolve
(rule 11a). Mechanism shape (place expression extending ADR-325's family, not an ADR-295
exit resolver) ruled by David 2026-08-24 in the Phase 3 design discussion of
`docs/work/backlog-tier1-2-platform/plan.md`.

**Language + platform change.** Expected surfaces: `packages/chord/src/parser.ts`
(`parsePlace`, `parser.ts:7283` — one new `PlaceExpr` kind), `packages/chord/src/analyzer.ts`
(placement gates, strategy requirement, filter validation), `packages/chord/src/ir.ts` (the
place kind), `packages/story-loader/src/evaluator.ts` (the adjacency draw, beside
`drawLanding` at `evaluator.ts:608`), `packages/story-loader/src/runtime.ts` (the `move`
sink consumes the new place). **No engine, stdlib, or world-model change**: traversability is
read through the existing going read points (`exitBlockedKey` — already imported by the
loader at `runtime.ts:62` — plus `RoomBehavior`/`LockableBehavior`), and the move itself
rides the existing `move` sink, observers included. EBNF row + `chord-grammar-changes.md` +
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

### D1. `an adjacent room` is a place

`an adjacent room` is legal where the `move` statement takes a place, and means: **a room
one traversable exit away from the mover's containing room, drawn at effect time.**

```
move the player to an adjacent room, randomly            ## the noisy-theft eject
move the monkey to an adjacent room, randomly            ## any entity can be the mover
```

- **Adjacency is the mover's**, read from the mover's containing room at the moment the
  statement runs — the same read-time posture as every ADR-325 place.
- **Traversable** means what going means: the direction's composed blocked evaluator answers
  false (or the trait fallback), and the exit's door, if any, is not locked. A closed
  unlocked door qualifies (it can be opened; the fiction is "she darts through the crowd").
  One truth, read through the existing read points — no second adjacency physics.
- **The strategy word is required** and only `randomly` is legal: `cycling`/`stopping` hold
  a cursor over a *stable* list, and the candidate set here is recomputed per draw. A
  missing or other strategy word is a compile error naming the rule ("say how to choose" —
  the landing-list precedent, ADR-325 D5).

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
on the stall (`while blocked`: phrase, then `move the player to an adjacent room,
randomly`), written entirely in existing forms plus this ADR's place. An eject that
lands her in a blocked stall triggers that rule; the "exclusion" emerges from two simple
rules composing, exactly as the source behaves. Guards live at the event that changes
the situation (lesson 2), not inside the draw.

If a future story produces evidence that a candidate filter earns its place, it is its
own ADR, checked against lesson 1 first (`chord-lessons-learned-timers.md`, "Where this
applies next").

### D5. Observers and arrival are unchanged

The move rides the existing `move` sink: `disappeared`/`entered` witness narration
(ADR-213/325) fires exactly as for any `move`, and a moved player sees the arrival exactly
as `move the player to <room>` shows it today. Nothing new is narrated by the draw itself.

## Non-goals

- **No ADR-295 change.** Computed exits, `resolveExit`, and the deferred "Chord authoring
  surface for computed exits" stay exactly where that ADR left them. A room that scrambles
  *going* is ADR-295's case; a story effect that flings the mover is this one's.
- No `is adjacent to` **condition** — this is a place, not a predicate; a condition surface
  is a separate decision if a story ever needs one.
- No NPC pathfinding change; no `holder`; no new strategy words beyond `randomly`.
- No engine/stdlib/world-model surface (consumption of existing read points only).

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

1. Compile tests: the place parses in `move`; analyzer gates tested by name — missing
   strategy word, a strategy other than `randomly`, the place outside a `move` destination.
2. REAL-PATH loader tests (rule 13a) driving a real engine: at a pinned seed the mover lands
   in one of the traversable adjacent rooms (asserted on `world` location, with the drawn
   destination pinned); a blocked direction's room is never drawn (exercising a composed
   #315 arm); a locked-door direction's room is never drawn; a blocked-stall bounce rule
   composed story-side (D4's shape) re-ejects on arrival; an emptied set produces the D3
   diagnostic and no move; an NPC mover works; the
   draw's persisted record round-trips the save shape (the `drawLanding` test pattern).
3. A minimal fixture story (or a `branch-stories/secret-letter` probe) proves the expression
   end-to-end against the market's adjacency graph — the finished chase increment itself
   resumes under the port plan, not this ADR.
4. Paper trail: EBNF row, `chord-grammar-changes.md`, ADR-257 bump.

## Open Questions

1. **The exact article and noun.** Recommendation: `an adjacent room, randomly` (the issue's
   Option 1 spelling) — the strategy word carries the randomness, so `a random adjacent
   room` would say it twice.
2. **Computed-exit directions.** A direction governed by an ADR-295 computed-exit
   declaration has no static destination to enumerate. Recommendation: exclude such
   directions from the candidate set in v1 (no current story combines the two; ADR-295's
   candidate enumeration exists if a story ever wants them included).

## Session

2026-08-24, session 915e68 (`docs/context/session-20260824-1035-feat-adr-321-world-index.md`)
— Phase 3 of `docs/work/backlog-tier1-2-platform/plan.md`, following the plan-review
correction that redirected the mechanism from ADR-295's resolver to ADR-325's place family.
