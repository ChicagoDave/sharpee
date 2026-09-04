# Phase 2 shape — story-loader consumes the head's actor (ADR-327 D1 runtime, player path)

Written 2026-08-26 (session e822b1) before any edit to `packages/story-loader`, per the
plan's Entry state. Every "today" claim cites a file and line read this session.

## What exists today

- **Interceptor path** (entity `on`/`after` on standard actions). The lifecycle engine
  consults one interceptor per descriptor *slot entity* — direct object, indirect,
  implicit (`lifecycle-engine.ts:114-137`, `descriptor.ts:119`) — and passes every hook
  `actorId = context.player.id` (`lifecycle-engine.ts:214`, `:257`). The Chord runtime's
  hooks all ignore it: `_actorId` in `buildInterceptor` (`runtime.ts:930-980`), the
  dispatching wrapper (`:899-909`), `buildTraitInterceptor` (`:2871-2895`). An arm is
  found by **target**: `armFor(target)` = the arm whose owner IS the target
  (`runtime.ts:925-926`). So today "who acts" is never consulted — the PC is the only
  actor the engine ever names.
- **Self-bound going** (ADR-325 D3h, the one bare head before ADR-327): the arm matches
  *any room target* (`isMine = target.has(ROOM)`, `runtime.ts:926`) and the interceptor
  is registered a second time under `TraitType.ROOM` so every source room reaches it
  (`:345-347`). Latent defect worth naming: `armFor` returns the **first** matching arm
  (`arms.find`, `:925`), so a room carrying its own `on the player going` and the player
  carrying `on going` share one dispatching interceptor and only one arm answers.
- **Event path** (`entering` on rooms/regions, `leaving` on regions). `fireEventClause`
  filters on the destination/boundary only (`runtime.ts:705-720`); the mover is available
  as `movedActorId(event)` (`event-contract.ts`, envelope `entities.actor` — "the player,
  or the NPC the plugin minted the event for") and D5's `fireMoveArrival` stamps it for
  `move` effects (`runtime.ts:3999-4004`). `fireMoveClause` already matches a mover this
  way — `clause.mover.kind === 'player' ? world.getPlayer()?.id : host.entityId(id)`
  (`runtime.ts:763-766`). **That is the precedent Phase 2 extends.**
- **Dispatch path** (`define action`). Capability behaviors receive `actorId` and bind it
  as the `actor` slot (`runtime.ts:2799-2805`); `slotBindings` seeds `actor: player.id`
  (`:3144-3145`); entity `after` clauses fire through `fireAfterClauses`, which takes
  **no actor at all** (`:3508`, caller `:3120`).
- **Stale text**: three `LoadError` messages still spell `on <gerund> it`
  (`runtime.ts:288`, `:314`, `:316`).
- **story-loader's own tests**: 31 files / 200 tests failing under Chord 4.0.0 — 581 ×
  `parse.removed-head-it`, 259 × `analysis.it-removed`, nothing else. All old spellings.

## Mechanism

### One predicate, three paths

```ts
/** ADR-327 D1: does this actor satisfy the head? `the player` is the ROLE — read at fire time. */
private actorMatches(actor: IRValue | null, actorId: string | undefined, world: WorldModel): boolean {
  if (actor === null) return true;                 // self / every-turn — gated elsewhere
  if (actor.kind === 'player') return actorId !== undefined && actorId === world.getPlayer()?.id;
  if (actor.kind === 'entity') return actorId !== undefined && actorId === this.host.entityId(actor.id);
  return false;
}
```

`world.getPlayer()` is read on every call, never cached — after a D9 switch the same
clause follows the role (pinned by a test below).

1. **Interceptor path** — `buildInterceptor` and `buildTraitInterceptor`: every hook's
   `isMine(target)` gate becomes `isMine(target) && actorMatches(clause.actor, actorId, world)`;
   the `_actorId` parameters go live. Today `actorId` is always the PC, so
   `on the player taking` fires exactly where `on taking it` fired, and
   `on the mercenaries taking` is **bound and silent** — compiles, registers, never
   matches (D7's known gap; the plan says not a load error). The match itself is real:
   driving the hook with the mercenaries' world id fires it, which the REAL-PATH test does.
2. **Event path** — `fireEventClause` adds `actorMatches(clause.actor, movedActorId(event), world)`
   after the destination/boundary filter. This half is *not* player-only today: D5's
   move-arrival and the NPC plugin both stamp the real mover, so `after the guards
   entering` fires when the guards are `move`d into the room and `after the player
   entering` does not. (To verify while editing: the region crossing events stamp
   `entities.actor` too — `going.ts` emits them as action events, which the envelope
   stamps; if not, the region path reads the player until it does.)
3. **Dispatch path** — capability behaviors gate on `actorMatches(clause.actor, actorId, world)`;
   `fireAfterClauses` gains an `actorId` parameter (its caller has the action's actor
   slot) and gates the same way.

### Self-bound heads (Q1's runtime half) — the one platform seam

Q1 generalized the bare head: `on taking` in Jack's block means *Jack taking anything*.
The interceptor registry is keyed `(traitType, actionId)` and consulted per **slot
entity** — so an arm for "Jack, whatever he takes" has no entity to hang on: the target
is an arbitrary item, and nothing about the item says Jack is acting. Going only worked
because the source room is a slot entity with a known trait.

The seam that fits the architecture (ADR-228's own shape, not a workaround): **the actor
is a consultation slot.** One engine-side addition in `resolveLifecycle`
(`lifecycle-engine.ts:114-137`): after the descriptor's slots, append an implicit
consultation for the acting entity — `resolve: (ctx) => ctx.player` today, which is the
one line ADR-328 D2 later flips to the command actor. No per-action descriptor edits
(38 descriptors untouched). Then the Chord runtime registers self-bound arms on the
**owner** (`prepareOnClauseTarget(owner)` gives the player/Jack a `ChordBehaviorTrait`),
`isMine = target.id === ownerWorldId && actorId === target.id`, and `on going` rides the
same slot — the `TraitType.ROOM` double-registration (`:345-347`) and its
first-arm-wins defect go away, and a room's `on the player going` and the player's own
`on going` both consult.

Consultation order changes for `going` only: the player's own clause is consulted after
the source room's instead of inside the same arm. First veto still wins; the refusal
messages are the same.

This is a `packages/stdlib` change — discussion-first per CLAUDE.md — and the reason this
document exists. Two ways to run it:

- **(a) Add the actor consultation in Phase 2** (recommended). ~20 lines in
  `lifecycle-engine.ts`, one stdlib test (the actor's interceptor is consulted, last,
  with `actorId === entity.id`), and the Chord runtime's self arms move onto it. Q1's
  ruling lands whole; the going defect is fixed as a side effect; ADR-328 D2 inherits
  the slot instead of inventing one.
- **(b) Defer.** Phase 2 does the explicit-head match only; `on going` keeps its ROOM
  registration; non-going self clauses compile (Phase 1) and are **bound-and-silent**
  like named actors, with the actor slot landing in ADR-328's plan. Cheaper now, but it
  leaves Q1 half-shipped and the going defect in place.

### Plan amendment — story-loader's fixtures migrate here, not in Phase 4

Phase 2's Exit state says `story-loader test:ci` green; Phase 4 lists
`packages/story-loader/tests` among the files it migrates. Both cannot hold. The gate
needs the fixtures, so the 31 files move into Phase 2 (the same two-pass method as
Phase 1: mechanical head rewrite, then the compiler's own `analysis.it-removed` fix-its
for bodies). Phase 4 keeps `world-index`, devkit's `story language 2` pins, the IDE
references, and the corpus.

## Tests (rule 13a REAL-PATH, in `packages/story-loader/tests/`)

Fixture: a sword with `on the player taking` and `on the mercenaries taking` (each
refusing a different phrase, each `, once`); the Gate with `after the player entering`
and `after the guards entering`; Jack with `on taking` (self). Real `WorldModel`, the
runtime's own binding (`boot()` as in `movement-clauses-runtime.test.ts:31-40`).

- Interceptor, player actor: `getInterceptorForAction(sword, 'if.action.taking')`
  `.preValidate(sword, world, playerId, {})` → the player clause's refusal; the
  mercenaries clause's occurrence key is still unset (state, not just the return).
- Interceptor, named actor: the same hook with the mercenaries' world id → their
  refusal, and the player clause's key unset. (Real match; the engine can't route here
  yet — that is D7/Phase 6.)
- Role follows the switch: `world.setPlayer(jackWorldId)`, drive the hook with Jack's
  id → the `on the player taking` clause fires for Jack; with the old PC's id it does not.
- Event path: `move the guards to the Gate` (a runtime `move` through a clause) fires
  `after the guards entering` and not `after the player entering`; a player walk
  (`fireEventClauses` with the player as mover) does the reverse.
- Self (under (a)): the stdlib test that the actor is consulted; the loader test that
  Jack's `on taking` refuses when `actorId` is Jack for any item and not when it is the
  player; the existing `on going` tests keep passing through the actor slot.
- Existing suites: all 86 story-loader files green after the fixture migration.

## Rulings (David, 2026-08-26, session e822b1)

- **Q1 → (a).** The actor consultation slot lands in Phase 2 (`lifecycle-engine.ts`); self-bound arms ride it; the `TraitType.ROOM` double-registration retires.
- **Q2 → agreed.** story-loader's 31 fixture files migrate in Phase 2; Phase 4's list shrinks to world-index, devkit, IDE references, and the corpus.

## Decisions for David (each with the recommendation) — as posed

**Q1 — the actor consultation slot (stdlib), now or deferred?** Recommend **(a), now** —
it is ADR-228's own mechanism extended by one implicit slot, it is what Q1's ruling
needs to be real, and ADR-328 D2 is one `resolve` line away from it.

**Q2 — story-loader's 31 fixture files migrate in Phase 2.** Recommend **yes** — the
phase's gate cannot be green otherwise; Phase 4's list shrinks accordingly.

Not a question, stated for the record: named-actor heads on the interceptor and dispatch
paths are bound-and-silent until Phase 6 (the engine names no actor but the PC); the
event path is live for any mover today because D5 already stamps it.

## Landing notes (session e822b1, 2026-08-26) — what the implementation found

1. **The actor consultation is opt-in by registration key.** Consulting the actor under
   the action's own id broke 8 stdlib tests on the first run: a binding keyed on a trait
   the player also carries (`ACTOR` on give/show/talk recipients, the container traits in
   putting) fired a second time for the actor. The consultation therefore looks up
   `actorConsultationId(actionId)` = `actor:<actionId>` (`lifecycle-engine.ts`, exported
   from the lifecycle barrel), and Chord's bare-head arms register under that key on
   `ChordBehaviorTrait`. Nothing keyed on a target trait changes behavior; the dedupe
   the shape sketched ("skip when the actor already consulted as a target") is unnecessary
   and gone. Pinned by four stdlib tests; stdlib 116 files / 1637 passing.
2. **The player has no world instance at bind time** in the direct/test order
   (`initializeWorld` then `createPlayer`). `prepareOnClauseTarget` skips a not-yet-created
   player; `createPlayer` adds `ChordBehaviorTrait` when `runtime.playerCarriesClauses()`
   (either order works — the engine creates the player first). Retires with D10 (Phase 3),
   when the player is an ordinary character present at bind.
3. **Region crossing events carry the mover as `data.actorId`**, not on the envelope (test
   events) — `movedActorId` now reads `entities.actor` → `data.actorId` → `data.actor.id`.
   D5's move-arrival stamps both.
4. **The duplicate-clause gate keyed on kind + action only** (`analyzer.ts
   checkDuplicateClauses`) and rejected `on the player taking` + `on the guards taking` on
   one owner — the exact pair Acceptance item 2 needs. It now keys on the head's actor
   text too; the same actor twice is still `analysis.duplicate-clause` (chord 69 files /
   1041 passing).
5. **`tests/zoo-pure-ir.test.ts` reads the corpus** (`stories/friendly-zoo/zoo.story`), so
   its 2 cases stay red until Phase 4 — the only story-loader failures at Phase 2 exit
   (86 of 87 files, 635 of 637 tests).
