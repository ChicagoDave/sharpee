# ADR-224: Conditional / Hazard Death — a First-Class Player-Death Model

## Status: ACCEPTED (2026-07-15 — all five open questions resolved via interview, accepted by David; adr-review clean)

> Child of ADR-214 (parity). A **SHARPEE-GAP** surfaced by the 2026-07-15 Dungeo
> capability audit (`docs/work/schism/sharpee-chord-capability-matrix.md`, row
> #16): the platform has **no reusable player-death capability**, so both the
> Sharpee Way and the Chord Way express death crudely or not at all. Follows the
> ADR-213 precedent (Chord-surfaced platform gaps become ADRs).

## Date: 2026-07-15

## Context

Player death is a core IF mechanic, and the platform has no primitive for it:

- **No engine concept.** Grep across `packages/**` for `killPlayer`/`die`/`jigsup`/
  `reincarnate` returns zero. `game-engine.ts` has only `isGameOver()` (story
  completion). `if.event.player.died` is a **convention no engine code consumes**;
  the stdlib death channel keys off a *different* name, `combat.player_died`, from
  an extension not present in the tree. The two names have never been reconciled.
- **Every death is hand-rolled** in Dungeo, converging only on the unenforced
  event name + a story-private `dungeo.player.dead` key: the falls (a
  `ParsedCommandTransformer` with a hand-coded verb allow-list), the gas room (an
  interceptor), the grue (a probabilistic transformer → a story action), flooding/
  balloon/cage (scheduler daemons). Five mechanisms for one concept.
- **The Chord Way can't express it at all.** The closest surface, `lose … when`,
  lowers to `triggerEnding('defeat')` — a *terminal "you lost the game"* ending,
  not death: no penalty, no reincarnation, no non-terminal death, no verb-allowlist,
  no probability. Chord has zero die/kill/deadly vocabulary.

Per ADR-214 §1a this is a SHARPEE-GAP: fix the platform so **both** Ways get an
idiomatic death surface, rather than teaching Chord to ape the crude TS hand-rolling.

MDL Dungeon exercises every death variant, which sets the requirement: (a)
location + verb-allowlist ("every verb but LOOK is fatal here" — the falls); (b)
item × state × room (a lit flame in the gas room); (c) probabilistic (grue: move
in the dark → ~25% live); (d) timed/escalating (flooding); (e) provoked-NPC
(cyclops wrath → eaten). All five must be expressible without a hatch.

## Decision

Formalize death as a first-class platform capability, then expose it to both Ways.

1. **A canonical death event the engine consumes.** One typed event,
   **`if.event.player.died`** (canonical — the platform `if.event.*` namespace),
   with a payload (`cause`, `messageId`, terminal-vs-reincarnate intent) that the
   engine itself understands and routes (to `game.lost` on terminal death). The
   `player.dead` state is **derived from `HealthTrait`** (owned by ADR-223), not a
   separate engine key — see the resolved HEALTH boundary below.
2. **A `killPlayer(world, {cause, messageId, terminal?})` helper** — the single
   Sharpee-Way primitive that emits the canonical event. Interceptors, transformers,
   and scheduler daemons call it instead of hand-emitting an unenforced event.
3. **Reusable trigger shapes** layered on top: a deadly-room verb-allowlist (folds
   the falls transformer); a probabilistic-death path over the scheduler's
   **seeded** RNG — replay-deterministic, never `Math.random()` (folds the grue);
   item×state×room and timed/escalating as interceptor/daemon
   patterns that *call `killPlayer`*. **The exact trait factoring** (a narrow
   `DeadlyRoomTrait` vs a general `HazardTrait`, helper vs inline) is an
   **implementation-plan decision, not an ADR-level one** (Q-4 — deferred as
   implementation granularity, 2026-07-15) — the ADR fixes only that they lower to
   `killPlayer`.
4. **Policy stays a story state-machine.** Death-penalty (−10), reincarnation, and
   game-over-after-N-deaths remain a story-level `plugin-state-machine` policy —
   but keyed off the **canonical** event, not a private convention.
5. **The Chord Way** (ADR-210 ratchet): `kill the player when <cond>` and/or a
   `deadly` room marker with `safe: look, examine` (verb-allowlist) + an optional
   `chance` modifier — lowering to `killPlayer` / the deadly-room surface (whose
   trait factoring is per Decision 3).

### Resolved: player-death ↔ HEALTH boundary (2026-07-15, Q-1 — hybrid)

Player mortality uses **one unified state substrate and one death event**, split
cleanly across the two ADRs:

- **State = ADR-223.** The player carries `HealthTrait` like any creature;
  `HealthTrait` is the single source of mortality state for player and NPCs (this
  is 223's whole reason to exist — no second `isAlive` source). `player.dead` is
  *derived* from it, never a separate key.
- **Trigger + event + routing = ADR-224 (this ADR).** `killPlayer` applies a
  **lethal transition** to the player's `HealthTrait`; the engine observes the
  crossing, emits the canonical death event, and owns game-over routing. Both
  damage deaths (combat) and **non-damage deaths** (falls verb-allowlist, grue
  probability, gas) go through `killPlayer`, which sets a **terminal `HealthTrait`
  state carrying the `cause`** — so a non-combat death is not faked as "hp = 0," it
  is a first-class terminal cause on the same trait.
- **Sequencing consequence:** this ADR's *implementation* sequences **after**
  ADR-223's `HealthTrait` lands (design can proceed now). Accepted trade for a
  single mortality model.
- **Pointer for ADR-223 (fold in its own interview, not here):** `HealthTrait`
  must represent a **terminal "dead by cause"** state (not only an `hp`
  threshold), so `killPlayer`'s non-damage deaths have a home. This constrains
  223's HEALTH-layer shape (its Q-5, consciousness/`HealthTrait` fields).

### Resolved: terminal death vs reincarnation (2026-07-15, Q-2 — terminal only)

The primitive models **terminal death only**; reincarnation is story policy.

- `killPlayer` emits the death event with **terminal intent**; the engine routes
  terminal → `game.lost`.
- **Reincarnation is a story `plugin-state-machine`** (MDL walking-dead, or the
  port's −10/2-deaths) that listens to the death event and gets **first crack**
  before game-over routing fires — it may reset the player (reposition, clear the
  terminal `HealthTrait` state) and thereby *not-terminal* a death.
- **Required ordering (a platform contract):** death event → story policy handler
  → engine `game.lost` **only if unhandled**. The engine must give the story
  policy the chance to veto/redirect before it ends the game. (The `terminal`
  field in the event payload is the story policy's signal, not the engine's final
  word.)

### Resolved: canonical event name (2026-07-15, Q-3 — `if.event.player.died`)

**`if.event.player.died`** is the canonical death event (the platform
`if.event.*` namespace; death is not combat-specific). The stdlib death IOChannel
is **re-pointed** from `combat.player_died` to it. **ADR-215 (combat) emits the
same canonical event** with `cause: combat` — combat becomes one cause among many
(falls, grue, gas), not the owner of its own death event. This retires the
two-name split the Context section flagged.

## Consequences

- **One primitive absorbs five hand-rolled mechanisms** (falls, gas, grue,
  flooding, provoked) and the darkness/grue death from the light-source work
  (matrix row #17). Both Ways get an idiomatic death surface.
- **The event-name split is reconciled** (OQ-3) — a prerequisite, since today two
  names disagree.
- Platform change under CLAUDE.md's engine/world-model/stdlib discussion gate; no
  code authorized by this ADR. ACs land as tests when implemented (inherits
  ADR-214 AC-1..4).
- Coordinates with **ADR-223**: state substrate (`HealthTrait`) = 223; trigger +
  death event + game-over routing = this ADR (Q-1 resolved 2026-07-15, hybrid —
  see the resolved-boundary block above). Implementation sequences after 223's
  `HealthTrait`.
- **Breaking rename (backward compat):** the death IOChannel moves from
  `combat.player_died` to `if.event.player.died` (Q-3). Any consumer of the old
  name must be updated in the same change. Real risk is low — the
  `@sharpee/ext-basic-combat` producer is absent from the current tree — but the
  rename is a hard cutover, not an alias.

## Acceptance Criteria

Inherits ADR-214 AC-1..4 (parity: the capability is reachable on both Ways).
Concrete ACs, landing as tests when implemented:

- **AC-1 (end-to-end, non-damage death).** Player enters the gas room holding a
  lit torch → an interceptor calls `killPlayer({cause:'gas', terminal:true})` →
  the engine emits `if.event.player.died` and, with no story policy handling it,
  routes to `game.lost`. Assert the event payload (`cause:'gas'`) and that the
  game ended.
- **AC-2 (deadly-room verb-allowlist).** A room marked `deadly` with `safe: look,
  examine` kills the player (emits `if.event.player.died`) on any other verb, and
  does **not** on `look`/`examine`. Both the Chord `.story` surface and the
  Sharpee-Way trait produce identical behavior (elegance-parity check).
- **AC-3 (reincarnation veto ordering).** A story `plugin-state-machine` that
  listens for `if.event.player.died` gets first crack: it clears the terminal
  `HealthTrait` state and repositions the player, and `game.lost` does **not**
  fire. Assert the player is alive and relocated after a death that policy vetoed.
- **AC-4 (seeded determinism).** Probabilistic (grue) death is reproducible under
  a fixed scheduler seed — the same seed yields the same live/die sequence; no
  `Math.random()`.

## Session

Session 5c4f8a (2026-07-15). Surfaced by the Dungeo MDL capability audit
(`docs/work/schism/sharpee-chord-capability-matrix.md` #16, PLATFORM-1). Parent:
ADR-214 (§1a two-Ways parity; SHARPEE-GAP class). Precedent: ADR-213. Coordinates
with ADR-223 (HEALTH layer). Memory: `raise-sharpee-api-gaps-for-chord`,
`sharpee-chord-parity-goal`.
