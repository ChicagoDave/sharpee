# ADR-240: Live derived state — point-of-use evaluation replaces recompute-and-stamp

## Status: ACCEPTED (2026-07-18 — all three open questions ruled by David, session 80ff54: one generic per-world evaluator registry in world-model; ALL blocks through the seam; D4 deletion list audit-confirmed complete. adr-review 15/15 post-interview.)

## Date: 2026-07-18

## Parent: none (platform design; surfaced by the Fernhill tutorial workstream, ADR-233 G3). Sibling in pattern to ADR-211/212 (gated text through registered predicates).

## Context

David's principle, stated 2026-07-18 (session 80ff54): **"Mutations are
instant. Anything checking state should get the most current results."**

The story-loader's derived-property mechanism violates this. Conditional
derived properties — `dark while <condition>` on a room, `<direction> is
blocked while <condition>: <phrase>` on an exit — are not evaluated when
the world is read. Instead `ChordRuntime.recomputeDerived` CACHES each
condition's result into trait state (`RoomTrait.requiresLight`;
`RoomBehavior.blockExit`/`unblockExit` message stamps), and invalidates
that cache off an enumerated list of eleven platform event types
(`if.event.taken`, `dropped`, `worn`, `removed`, `put_on`, `put_in`,
`actor_moved`, `opened`, `closed`, `switched_on`, `switched_off`).

The enumeration can never be complete. Found live during Fernhill Phase 4:
a Chord `change the housekeeper to softened` statement mutates story state
with no listed event, so `west is blocked while Mrs Kettle is guarded`
stays blocked forever. The same hole exists for every other mutation
source outside the list: `set` statements, machine `on enter`/`on exit`
bodies, sequence steps, TS hatches, capability behaviors — each is a
fresh instance of the same staleness bug. Patching the list (the fix
first proposed and withdrawn) is cache-invalidation-by-enumeration:
it treats the instance and leaves the class open.

The platform has already solved this shape once, for gated text:
`registerSnippetGate` (ADR-211/212) registers a live predicate that the
render point consults at the moment of rendering — no cache, no
invalidation, no trigger list. The Chord surface's own promise ("the
refusal applies only WHILE the condition holds") is a point-of-use claim.
Chord reading cleaner than the mechanism beneath it is the
elegance-oracle signal: the seam it exposes is that darkness and exit
blocking are stamped flags where they should be consulted predicates.

## Decision

### D1 — The principle

Derived world properties are evaluated **at the point of use**. Readers
of world state get current truth, always. No component caches the result
of evaluating story state, and no new enumerated invalidation list may
be introduced anywhere in the platform (the bar for review).

### D2 — Exit blocking consults the seam — ALL blocks (ruled by David, 2026-07-18: Option A)

The going action's blocked-exit check consults the registry (D6) at
movement time. The story-loader registers **every** blocked exit —
conditional and unconditional alike (an unconditional block's predicate
is the constant true) — and its `RoomTrait.blockedExits` stamping is
removed entirely: one path, no "which kind of block" branch anywhere.
The blocked *message* is a registered evaluator resolved at refusal
time, so phrase strategies apply per attempt. The `blockedExits` trait
map remains in the platform for hand-written TS stories that stamp it
directly: going consults the registry first and falls through to the
trait, leaving TS stories untouched.

### D3 — Darkness consults a predicate seam

The visibility/darkness computation consults a registered
**room-darkness predicate** for `dark while` rooms at evaluation time,
replacing the stamped `requiresLight` toggle. (Statically dark rooms —
bare `dark` — remain a plain trait fact; there is nothing to derive.)

### D4 — The recompute mechanism is deleted (audit: the deletion list is COMPLETE — confirmed by David, 2026-07-18)

`ChordRuntime.recomputeDerived`, `hasConditionalBlockedExits`,
`derivedDarkRooms`-driven stamping, and the eleven-event `chainEvent`
trigger list are **removed**, not extended. There is no cache left to
invalidate.

The Q-3 audit (2026-07-18) swept the loader/runtime for other
evaluate-and-store sites and found none: conditional trait composition
(daemon-shaped, `chatty while …`) evaluates live per turn; clause
`while` gates and the phrase/snippet/`detail` gates evaluate at
fire/render time through their ADR-211/212 seams; static `dark` is a
plain trait fact. `is deadly while <cond>` is unwired (legible
load error) and carries no staleness — when it is wired, it consults
this seam (D1's bar forbids it a trigger list of its own).

### D5 — The seam generalizes

The registered-predicate seam is the one pattern for every gated surface:
text (ADR-211/212, shipped), passage (D2), light (D3), and any future
derived property. A new derived surface registers a predicate at its read
point; it never stamps state plus an invalidation hook.

### D6 — ONE generic evaluator registry (ruled by David, 2026-07-18: "Why not one that can evaluate any predicate?")

There is exactly **one** registry: a per-world registry of named
world-evaluators, owned by `world-model` (forced by dependency
direction — darkness is read inside world-model). Idempotent last-wins
per registration key (the ADR-207/208 binding-map convention):

```ts
world.registerEvaluator(key: string, fn: (world) => unknown);
world.evaluate(key): unknown | undefined;   // undefined = nothing registered
```

- **Key conventions are owned by each read point's module**, which
  exports the key builder so the string is constructed in exactly two
  places (registrar + reader), pinned by tests:
  `exit.blocked.<roomId>.<direction>` → boolean;
  `exit.message.<roomId>.<direction>` → string, resolved AT REFUSAL
  TIME (phrase strategies vary per attempt, matching ADR-211's
  per-render gate semantics); `dark.<roomId>` → boolean.
- The going action's blocked check consults `exit.blocked.*` first (a
  registration owns the answer for its room+direction) and emits the
  `exit.message.*` result exactly as it emits today's stamped message —
  the event shape does not change. Visibility consults `dark.<roomId>`
  where it reads `requiresLight` today.
- A future derived surface adds a key convention at its read point —
  **zero new registry API** (D5 taken to its end: one mechanism, not
  the same pattern repeated).
- Snippet gates (ADR-211/212) stay where they shipped; converging them
  onto this registry is a noted future migration, not in-gate scope.

### D7 — Acceptance criteria for the follow-on implementation plan

> **Amendment (2026-07-18, session 1e7652)**: implementation landed session
> 80ff54 (evaluator registry, all sites migrated, recompute machinery
> deleted; AC-1–AC-6 runs recorded in
> `docs/context/session-20260718-0501-chord-foundations.md`). **ACs
> CONFIRMED by David** — the implementation gate is closed.

- **AC-1 (the staleness class, closed)**: a Chord `change` that flips a
  blocked-exit condition is visible on the very next command — the
  Fernhill Kettle beat's three currently-red transcripts (npcs,
  containers, concealment) pass unmodified, driven through the real
  bundle.
- **AC-2**: a `dark while <story/entity state>` condition flips
  live on `change`, proven REAL-PATH (look output before/after, no
  possession/switch event involved).
- **AC-3**: `recomputeDerived`, `hasConditionalBlockedExits`, and the
  eleven-event `chainEvent` trigger wiring are gone from the runtime —
  asserted by the suite (no re-introduction), not just by diff.
- **AC-4**: existing event-triggered conditions still hold: cloak's
  `dark while the player has the velvet cloak` (81/81) and the Fernhill
  frost-seal (switchable) transcripts stay green through the rework.
- **AC-5**: registration is idempotent per world and re-registered on
  every load; save/restore round-trips a mid-game gated state (the
  AC-4-class save test pattern).
- **AC-6**: full regression — story-loader/stdlib/world-model suites,
  `./repokit build`, cloak + zoo gates, all Fernhill transcripts.

## Consequences

- The staleness bug class is closed structurally: no mutation source —
  present or future — can leave a derived property stale, because
  nothing is stored.
- Evaluation moves from mutation time to read time: each movement
  attempt/visibility check evaluates its registered conditions. The
  conditions are small closed-grammar trees; cost is negligible against
  a turn's existing work (the same trade ADR-211/212 already accepted
  for text gates).
- Predicates are closures registered at load (like snippet gates): they
  are re-registered on every load and never serialized — save/restore is
  unaffected by construction.
- `packages/stdlib` (going's read point), `packages/world-model`
  (visibility's read point + the registry home, per the Open Question),
  and `packages/story-loader` (registration replaces stamping) change;
  Chord and the IR do not — the surface's promise is finally kept, not
  altered.
- Implementation is a follow-on plan (this ADR is design only, per the
  umbrella convention).

## Session

80ff54 (2026-07-18), branch `chord-foundations`. Surfaced by the
Fernhill tutorial's Kettle guard beat (ADR-233 G3, Phase 4); principle
ruled by David in-session.
