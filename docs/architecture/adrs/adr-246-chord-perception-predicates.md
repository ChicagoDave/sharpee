# ADR-246: Chord perception predicates — `can see` / `can reach` on the real services

## Status: ACCEPTED (2026-07-19 — all three open questions ruled by David via interview, session 7692ef: both surfaces ship (`cannot see` + `hidden` state adjective); full perception (darkness counts, no carve-outs) with the per-observer override hook required both directions — night-vision goggles named as an acceptance scenario; `can reach` upgrades in the same pass. adr-review 11/13 same-session: ready as a decision record; both FAILs are companion-scope — implementation gated on the design-level companion (grammar productions, delegation shapes, goggles surface, parse-negative fates incl. two-word `can not`) plus David's explicit go-ahead.)

## Date: 2026-07-19

## Parent: ADR-148 (concealed-actor visibility — the engine service this connects to) and the Chord language family (ADR-210). Siblings: ADR-245 (phrasebooks — the other phrase-surface workstream this session), ADR-244 §8.4 doc surface (the eavesdropping example that lands once this ships).

## Context

David, during the Phase 13 follow-up (2026-07-19, session 7692ef): hiding
should come with **eavesdropping** — "the PC can listen while an NPC talks
when they normally wouldn't OR watching when an NPC would normally not do
things in sight." The defining property: the NPC's behavior is gated on
being unobserved, not merely co-present.

Session findings, all runtime-grounded:

- **The engine half works, proven on the real path.** Through the
  production pipeline (compile → `createStory` → `assembleGame`),
  `world.canSee(marrow, player)` flips `true → false` on `hide behind
  the curtain` and back on `come out`, while the hidden player still
  sees Marrow. ADR-148's `ConcealedVisibilityBehavior` is registered by
  the engine (`game-engine.ts:392`) and functions end-to-end. (The only
  prior evidence was `hiding-golden.test.ts`, which hand-registers the
  behavior on a test-built world — scaffolding, not the assembled path.)
- **Chord's predicate never reaches it.** `can see` / `can reach`
  evaluate as co-location — subject and object share a containing room
  (`packages/story-loader/src/evaluator.ts:219`, an explicit "Phase B
  semantics… later refinement" placeholder). Consequence, observed live:
  a sight-gated daemon fires *while the player is hidden* and — with the
  positive gate — Marrow blurts the secret the moment the player comes
  OUT of hiding. The exact inversion of eavesdropping.
- **The authoring surface is otherwise already right.** With the seam
  closed, eavesdropping is one line of pure Chord on a presence-gated
  daemon: `phrase marrow-mutters when <Marrow cannot see the player>`.
  The watching variant is the same predicate gating a `change`/act. A
  proven fixture is parked awaiting this ADR (session scratchpad,
  `eavesdropping.story`).
- **The only legal negation today reads badly.** `can not see` is a
  parse error (`parse.predicate-can`); the sole spelling is the
  front-loaded `when not Old Marrow can see the player` — ruled by David
  a "double negative blight on humanity." The gate's natural home is a
  surface that reads like English.

## Decision

Chord's perception predicates stop being co-location placeholders and
consult the engine's real services:

1. **`can see` delegates to the world's visibility service**
   (`world.canSee`, capability-dispatched per ADR-207/148) — so
   concealment defeats it, per-observer, including story-side overrides
   (an alert guard that sees through poor concealment keeps working
   through the same dispatch hook). **Full perception** (ruled Q-2,
   David 2026-07-19): plain delegation, no carve-outs — light counts
   too, so `can see` is false in an unlit room, matching what
   player-side scope already does. A compatibility note lands in
   chord-language.md §3.4. The per-observer override hook must work in
   BOTH directions and stay reachable: concealment-piercing (the alert
   guard who sees through poor hiding) and darkness-piercing — **David's
   named scenario (2026-07-19): the PC wearing night-vision goggles can
   see in the dark** while everyone else cannot. TS reaches this today
   via capability dispatch (ADR-207/148); whether the goggles case gets
   a first-class Chord surface (e.g., a stdlib adjective) is settled in
   the design companion, but the scenario is an acceptance requirement
   either way.
2. **`can reach` upgrades in the same pass** (ruled Q-3, David
   2026-07-19): it delegates to the engine's reach resolution — a thing
   shut in a closed opaque box is not reachable — so the predicate pair
   keeps one coherent semantics and one doc story. Its Chord delegation
   is currently unexercised; the real-path test below covers both
   predicates.
3. **Both natural surfaces ship** (ruled Q-1, David 2026-07-19):
   `cannot see` — negation after the modal, per-observer (`when Old
   Marrow cannot see the player`), surviving story-side observer
   overrides — AND `hidden` joins the closed platform state-adjective
   catalog (`when the player is hidden`) for the everyday
   hidden-from-everyone gate. The front-`not` spelling remains legal
   but is no longer the only one.
4. **A committed real-path test** guards the chain — the session's probe
   promoted into the platform suite: assembled-engine load, real `hide`,
   assert `canSee` flips both directions, assert a sight-gated clause
   fires only while hidden; plus a darkness case, the night-vision
   goggles override case, and a `can reach` closed-container case. The
   scaffolding-only golden test stops being the sole coverage.
5. **The eavesdropping example lands in the docs** (stdlib reference
   §8.4 + its site page, harness-verified captured transcript) once 1–3
   ship — the doc example must show the true gate, not the co-location
   approximation.

All three open questions were ruled same-day (interview, session
7692ef). This ADR still authorizes no implementation by itself:
story-loader/evaluator changes are platform work requiring a
design-level companion (evaluator delegation shape, parser work for
`cannot`/`hidden`, the goggles surface, test matrix) plus David's
explicit go-ahead.

**Companion-scope addition (2026-07-20 triage, platform-issue-sweep item
#4 — recorded here so the companion doesn't rediscover it):** concealment
auto-reveal (which actions break an item's/actor's concealment as a side
effect) is NOT a flat `SILENT_ACTIONS` allowlist — David ruled that shape
wrong. The real design is a per-sense question: actions carry sensory
signatures (visual motion, noise) and observers carry per-sense
capabilities, so an invisibility cloak beats vision but not hearing,
night-vision goggles see through darkness (already this ADR's Q-2
acceptance scenario), and a noisy pickup breaks concealment aurally even
when unseen. The naive listener (reveal-on-any-action) must NOT be wired
in the meantime — the platform-issue-sweep plan's Phase 9 parked it here
deliberately.

## Consequences

- The documented meaning of a shipped predicate changes: chord-language.md's
  "`can see` / `can reach` test scope" becomes true perception rather
  than co-location. Existing stories using `can see` in lit, no-hiding
  scenes are unaffected; stories with hiding or (per Q-2) darkness will
  observe the new, correct behavior.
- Chord conditions gain their first capability-dispatched evaluation
  path — the evaluator reaches a per-world registry, not just trait
  state. That is the precedent-setting piece; later perception-shaped
  predicates (hearing distance, ADR-163's audibility substrate) follow
  the same seam rather than inventing new ones.
- The parity principle holds: nothing here adds engine capability — it
  connects Chord to capability that already works (elegance-oracle
  direction: the language catches up to the platform, not the reverse).
- Docs: chord-language.md §3.4's predicate list and the stdlib
  reference's §8.4 both update when this ships; the cookbook may gain an
  eavesdropping pair (same fixture family).

## Session

session 7692ef, 2026-07-19
(`docs/context/session-20260719-2147-chord-foundations.md`) — raised by
David during the ADR-244 follow-up work; engine half proven and the
evaluator seam localized the same session; ADR written at his direction
with the interview started immediately.
