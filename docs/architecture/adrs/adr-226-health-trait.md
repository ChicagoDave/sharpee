# ADR-226: `HealthTrait` — The Unified Creature Life-State Model (ADR-223 Child A)

## Status: ACCEPTED (2026-07-15 — all three open questions resolved via interview; adr-review 15/15 clean after F1–F4 fixes). Graduates ADR-223 child **A**. Authorizes **no code** — implementation waits on a separate platform go-ahead under CLAUDE.md's discussion gate.

> Child of **ADR-223** (Four-Layer NPC Separation), the **HEALTH** layer. Critical
> path for both ADR-223's own refactor (children B–D gate turn-eligibility on this
> layer) and the ACCEPTED **ADR-224** (Conditional/Hazard Death), whose `killPlayer`
> sets a terminal state that must have a home on this trait. Grounded in a live read
> of the two fused creature health models (plus a destructible author-mechanic this
> ADR leaves alone) and the sync bug (call sites cited below), not ADR-223's summary
> of them.

## Date: 2026-07-15

## Terminology

- **HEALTH / life-state** — the single **creature** mortality/life-state model. One
  trait is the source of truth for a living thing's health and *whether it is
  alive/dead/conscious/asleep*. Replaces the **two fused creature models** (below).
  Inanimate breakability (`DestructibleTrait`) is deliberately **not** health
  (OQ-1 resolved, 2026-07-15) — it is an author-facing scenery mechanic, left untouched.
- **Data-only trait** — a trait carries **data**, never logic-bearing methods.
  Derived facts (alive, conscious, can-act) are computed by a **behavior**, because a
  getter on the trait does not survive `loadJSON()` deserialization (proven live —
  `npc-service.ts:415` already works around exactly this on `NpcTrait.canAct`). This
  is ADR-223's data-only mandate, made concrete for this layer.
- **Terminal dead-by-cause** — a first-class `dead` flag carrying a `cause`, distinct
  from `health === 0`. Non-damage deaths (grue, falls, drowning — ADR-224) set it
  without routing through damage. `killPlayer` (ADR-224) is the writer; this trait is
  the target.

## Context

Two creature life-state models exist today with lossy hand-sync between them, plus a
third, unrelated breakable-scenery mechanic that is **not** a health model and is out
of scope for this ADR (OQ-1) — verified by direct read, 2026-07-15:

1. **`NpcTrait.{isAlive, isConscious}`** (`npcTrait.ts:81-82`, plus logic-bearing
   methods `canAct`/`kill`/`knockOut`/`wakeUp`/`revive` and `canEnterRoom`). Turn
   eligibility reads these at **six** sites: `npc-service.ts:203,257,299,335,384,416`.
2. **`CombatantTrait.{health, maxHealth, isAlive, isConscious, recoveryTurns}`**
   (`combatantTrait.ts:74-83`). Note the **dual source**: a `get alive()` returning
   `health > 0` (`:118`) **and** a separate `isAlive` boolean field (`:83`). Read by
   `combatantBehavior.ts` (43/65/91/125/142/144/157), `attacking.ts:152`, and
   `npc/behaviors.ts` (30/48/65).
3. **`DestructibleTrait.{hitPoints, maxHitPoints}`** (`destructibleTrait.ts:52-53`),
   read/written only by `destructibleBehavior.ts` — **out of scope (OQ-1 resolved).**
   A breakable door/barrier is an author-facing scenery mechanic, orthogonal to
   creature life-state ("a door is not related to combat or health" — David,
   2026-07-15). It is listed here only to mark it *deliberately untouched*; it is not
   one of the models this ADR unifies.

**The live sync bug (ADR-223 AC-2), located precisely:** turn eligibility filters on
`npcTrait.isAlive` (`npc-service.ts:416` et al.). A combat kill writes
`combatant.isAlive = false` (`combatantBehavior.ts:91`) but **never** touches
`npcTrait.isAlive`. Result: a combat-killed NPC that also carries `NpcTrait` keeps
taking turns. The two models cannot be kept in sync by hand; the fix is to have **one**
source.

`CombatantTrait` itself carries the same duplication in miniature — an `isAlive`
boolean field (`:83`) alongside a `get alive()` returning `health > 0` (`:118`). Every
consumer that asks "is it alive / can it act" today reaches into a trait's raw field
with no shared contract.

## Decision

### 1. Introduce `HealthTrait` (data-only) + `HealthBehavior` (logic)

**`HealthTrait`** — pure data, no methods (`packages/world-model/src/traits/health/`):

| Field | Type | Meaning |
|---|---|---|
| `health` | `number` | current integrity/health |
| `maxHealth` | `number` | ceiling; `heal` clamps to it |
| `dead` | `boolean` | terminal dead-by-cause flag (ADR-224); default `false` |
| `causeOfDeath?` | `string` | set with `dead` (e.g. `'combat'`, `'grue'`, `'fall'`) |
| `asleep` | `boolean` | full health but not acting — a separate small flag |
| `unconsciousThreshold` | `number` | fraction of `maxHealth` below which unconscious; default `0.2` (ADR-072 parity), overridable |

**`HealthBehavior`** — owns all derivation and mutation (behaviors own mutations,
CLAUDE.md/world-model): `isAlive(t)` = `!t.dead && t.health > 0`; `isConscious(t)` =
`isAlive(t) && !t.asleep && t.health > t.maxHealth * t.unconsciousThreshold`;
`canAct(t)` = `isConscious(t)`; plus mutators `takeDamage`, `heal`, `kill(cause)`.
Consumers call `HealthBehavior.x(entity)`, never a trait getter — this is what makes
the model survive save/load.

**Consciousness is purely derived (F1, 2026-07-15)** — there is no stored knocked-out
flag, no `knockOut`/`wakeUp` mutator, and no `recoveryTurns` timer. Low health *is*
unconsciousness (`health ≤ maxHealth * unconsciousThreshold`); healing back above the
threshold *is* waking. A stored KO state would be a second source of consciousness
truth — exactly the duplication this ADR removes. (`asleep` is the one separate flag,
and it is orthogonal: full health, voluntarily not acting — a daemon/story concern, not
combat.)

The "no second `isAlive`" invariant: `CombatantTrait.isAlive`, `CombatantTrait.get
alive()`, `CombatantTrait.isConscious`, `NpcTrait.isAlive`, and `NpcTrait.isConscious`
**cease to exist as independent state**. There is one source; the sync bug vanishes by
construction (ADR-223 AC-2).

### 2. Combat bends to `HealthTrait`; destruction stays separate

- **`CombatantTrait` requires `HealthTrait`.** It keeps **only combat stats**: `skill`,
  `baseDamage`, `armor`, `attackPower`, `defense`, `canRetaliate`, `dropsInventory`,
  `experienceValue`, `isUndead`, and the combat messages. It **loses** `health`,
  `maxHealth`, `isAlive`, `isConscious`, **and `recoveryTurns`** (dropped entirely —
  consciousness is derived from health (§1 F1), so there is no recovery timer to keep).
  `combatantBehavior` reads/writes health through `HealthBehavior`. **Requirement
  enforcement (F2):** the "requires `HealthTrait`" relation is checked at world load —
  an entity carrying `CombatantTrait` with no `HealthTrait` raises a fail-fast
  load-time validation error naming the missing trait (a story-authoring mistake, not a
  runtime-recoverable state), so combat code may assume the health trait is present.
- **Hostility is not touched here.** `CombatantTrait.hostile` and `NpcTrait.isHostile`
  stay put; they move to disposition in **child C** (ADR-223 §3-A). Child A is
  life-state only.
- **`NpcTrait` loses `isAlive`/`isConscious`** and its life-state methods; the six
  `npc-service` turn-eligibility sites re-point to
  `!e.has(HEALTH) || HealthBehavior.canAct(healthTrait)` (an entity with **no**
  `HealthTrait` is alive-and-conscious by default — see §3). `NpcTrait`'s remaining
  decomposition (daemon/movement) is **child B**, out of scope here.
- **`DestructibleTrait` is out of scope (OQ-1 resolved, 2026-07-15).** A breakable
  door/barrier is an **author-facing scenery mechanic**, not creature life-state; its
  `hitPoints`/`maxHitPoints` model and `destructibleBehavior` stay exactly as-is and
  this ADR does **not** fold them. This **revises ADR-223 §3-A**, which had listed
  `DestructibleTrait.hitPoints` as "collapsing in" — that line must be reconciled in
  ADR-223 (an `adr-review` cross-ADR seam item); it is not edited from here (interview
  writes only the ADR under interview).

### 3. Opt-in, with the death-capability exception (inherits ADR-223 AC-1)

`HealthTrait` is **opt-in** — a plain actor is alive by default and carries no health.
Every predicate treats *absence of `HealthTrait`* as alive + conscious + not destroyed.
The one exception (ADR-223 AC-1 / ADR-224): a game with a death capability provisions
the **player** a `HealthTrait` (or ADR-224's `killPlayer` lazily attaches one), so a
lethal transition always has a target. Child A ships the trait + the terminal
`dead`/`causeOfDeath` fields that ADR-224 will drive; **wiring `killPlayer` is
ADR-224's job**, sequenced after this trait exists.

### 4. Seam with ADR-224 (already pinned by 224's ACCEPTED interview)

ADR-224 owns the death *trigger*, the `if.event.player.died` channel, and game-over
routing. **This trait owns the terminal life-state**: `HealthBehavior.kill(t, cause)`
sets `dead = true`, `causeOfDeath = cause`. `player.dead` is derived from this trait.
Combat's lethal path (ADR-215) calls the same `kill(..., 'combat')` and emits
`if.event.player.died` with `cause: 'combat'`. No second death representation.

**Invariant (OQ-2 resolved, 2026-07-15):** `dead` is a first-class terminal flag on
`HealthTrait` with `isAlive = !dead && health > 0`. The **only** writer of `dead`
*without* a lethal damage transition is ADR-224's `killPlayer` (grue / fall / drown —
terminal at full `health`); combat and other damage reach `dead` **through** lethal
`takeDamage`. This is the single, terminal death representation the ACCEPTED ADR-224
contract requires.

### 5. Migration is atomic — one child-A plan, no compat shims (OQ-3 resolved, 2026-07-15)

The trait + behavior **and every call site** (platform *and* Dungeo:
thief / troll / cyclops / barriers) migrate together in a **single child-A
implementation plan**, phased internally but under one platform go-ahead. The old
fields (`NpcTrait.isAlive`/`isConscious`, `CombatantTrait.health`/`isAlive`/
`isConscious`/`recoveryTurns`) are **removed in the same landing as their readers** —
**no deprecated read-through shim** is left standing, because a shim delegating to
`HealthTrait` would *be* the "second `isAlive`" this ADR's invariant forbids (and the
project does not care about backward compatibility). No commit boundary leaves the
build in a dual-representation state. Recommended internal phase order: (1)
`HealthTrait` + `HealthBehavior` (**enumerate the new trait in `src/traits/index.ts`
*and* `src/index.ts` per world-model root-barrel discipline — a missed barrel export
surfaces as a runtime "not a constructor", the exact gap ADR-218 Phase 1 hit**); (2) `CombatantTrait` requires health + combat/
attacking re-point; (3) `NpcTrait` sheds life-state, the six `npc-service`
turn-eligibility sites move to `HealthBehavior.canAct`; (4) Dungeo migration; (5) full
Dungeo suite + save/load green (AC-2/AC-3/AC-4). **`recoveryTurns` is dropped, not
re-homed** (§1 F1 — consciousness is derived from health, so no recovery timer exists);
consequently any story mechanic built on a knockout countdown (e.g. the Dungeo troll's
turn-count recovery daemon) is **redesigned around derived consciousness** in Phase 4 —
a design point to confirm at implementation, not a mechanical rename.

## Acceptance criteria

- **AC-1 — one source (creature life-state).** After migration, `grep` finds no
  independent `isAlive` / `isConscious` state field outside `HealthTrait`; all
  alive/conscious decisions route through `HealthBehavior`. `DestructibleTrait.hitPoints`
  is explicitly **out of scope** (OQ-1) and unchanged.
- **AC-2 — sync bug fixed (ADR-223 AC-2).** A `basic-combat` kill removes the entity
  from the turn loop. Regression test: an NPC with `HealthTrait` + `CombatantTrait` +
  a daemon, killed via combat, is asserted **absent** from `getActiveNpcs` on the next
  turn (the test that would have failed before this ADR).
- **AC-3 — save/load survives.** An entity damaged to unconscious, then round-tripped
  through `saveJSON`/`loadJSON`, still reports `isConscious === false` via
  `HealthBehavior` (no reliance on a trait getter — the `npc-service.ts:415` footgun
  cannot recur).
- **AC-4 — Dungeo green.** The full Dungeo transcript suite passes after migrating its
  combat/destructible/NPC usage (thief, troll, cyclops, barriers). Regression,
  secondary to the platform shape (ADR-223 AC-4).
- **AC-5 — Chord-neutral for now.** No Chord surface is required by child A;
  `cloak.story`/`zoo.story` compile unchanged. (The Chord health surface is child D.)
- **AC-6 — terminal cause has a home.** `HealthBehavior.kill(t, 'grue')` sets
  `dead`/`causeOfDeath` on an entity at full `health`, and `isAlive` returns `false` —
  proving ADR-224's non-damage death path has a target before ADR-224 is implemented.
- **AC-7 — requires-health rejection.** Loading an entity with `CombatantTrait` and no
  `HealthTrait` fails with a specific load-time validation error naming the missing
  trait (a rejection test, not just a passing fixture).

## Consequences

- **Fixes the live sync bug as a byproduct** of having one source (ADR-223's headline
  win for layer A).
- **Unblocks ADR-224** — death implementation was explicitly sequenced to wait on this
  trait; ACCEPTED-but-unimplemented 224 becomes buildable.
- **Unblocks ADR-223 children B–D** — turn eligibility, the daemon layer, and the Chord
  health surface all gate on `HealthBehavior`.
- **Large but atomic migration** (ADR-223's ~13 modules / 85+ files) — one child-A
  plan, no compat shims (§5). Traits become strictly data-only in this corner of the
  model, removing the `loadJSON` footgun class here.
- **Touches `packages/world-model` (new trait + behavior) and `packages/stdlib`**
  (npc-service, combat/attacking, npc behaviors) — squarely platform work under
  CLAUDE.md's gate. No code until a separate go-ahead.
- **Revises ADR-223 §3-A's scope for child A** (OQ-1 resolution): `DestructibleTrait`
  no longer "collapses in." ADR-223's §3-A bullet and the "three health models" phrasing
  in its Terminology/§1 table should be reconciled to "two creature models" — a
  cross-ADR `adr-review` seam item, not edited from this interview.

## Session

Session 87088f (2026-07-15). Child A of ADR-223; critical path for ADR-224 (ACCEPTED)
and ADR-223 children B–D. Grounded in live reads: `npcTrait.ts`, `combatantTrait.ts`,
`destructibleTrait.ts`, `combatantBehavior.ts`, `destructibleBehavior.ts`,
`npc-service.ts` (sync bug at :416 vs `combatantBehavior.ts:91`). Related: ADR-070
(NPC), ADR-072 (combat, stale — knockout threshold parity), ADR-215 (combat
reachability), ADR-224 (conditional/hazard death). Memory: `chord-as-elegance-oracle`,
`sharpee-chord-parity-goal`, `no-get-it-done-assumptions`.
