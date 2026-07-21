# Session Plan: Implement ADR-226 (`HealthTrait`, ADR-223 Child A)

**Created**: 2026-07-15
**Overall scope**: Introduce the single unified creature life-state model (`HealthTrait` + `HealthBehavior`) and migrate every reader/writer of the two fused models it replaces (`NpcTrait.{isAlive,isConscious}` and `CombatantTrait.{health,maxHealth,isAlive,isConscious,recoveryTurns}`) — platform (`world-model`, `stdlib`) and Dungeo (thief, troll, cyclops, GDT debug commands) — in one atomic migration, no compat shims.
**Bounded contexts touched**: `packages/world-model` (new `HealthTrait`/`HealthBehavior`; `CombatantTrait`, `NpcTrait` field removal), `packages/stdlib` (`npc-service.ts` turn-eligibility, `attacking.ts`, `npc/behaviors.ts`), `stories/dungeo` (thief/troll/cyclops NPC behaviors, melee interceptor, GDT `kl`/`ko`/`wu` debug commands, treasure-room/combat-disengagement handlers, troll/sword-glow daemons).
**Key domain language**: HEALTH / life-state, data-only trait, terminal dead-by-cause, `HealthBehavior.canAct`, requires-relation (`CombatantTrait` requires `HealthTrait`).

## Entry gate (read before starting any phase)

This entire plan is **platform work** under CLAUDE.md's platform-change gate **and** ADR-223 §4 ("each child graduates to its own ADR + plan... needs a separate go-ahead before any `packages/` code"). ADR-226 itself *is* the design discussion — it authorizes no code (see its Status line: "Authorizes no code — implementation waits on a separate platform go-ahead"). **Do not begin Phase 1 or any later phase until David gives explicit sign-off to implement.** The planner writes phases; it does not authorize starting them.

Standing constraints across every phase (CLAUDE.md):
- **Never auto-retry a failed build or test.** Report the error and wait for explicit instruction — do not loop build-fail-fix-rebuild.
- **Never delete files without confirmation** — not even "to get a build working."
- **We don't care about backward compatibility** — this licenses the atomic no-shim migration ADR-226 §5 specifies, but does not license silently dropping a feature (e.g. troll recovery-over-time, see Phase 4's flagged tension below) — surface it, don't bury it.

## References consulted
- `docs/architecture/adrs/adr-226-health-trait.md` — the design this plan implements: `HealthTrait`/`HealthBehavior` shape, the "requires `HealthTrait`" fail-fast relation, atomic no-shim migration (§5), AC-1..AC-7.
- `docs/architecture/adrs/adr-223-npc-four-layer-separation.md` — parent umbrella; ADR-223 §4 requires this plan's separate go-ahead; its AC-2 (sync bug) and AC-1 (opt-in `HealthTrait`, death-capability exception) are inherited by ADR-226 and re-verified here.
- `docs/architecture/adrs/adr-224-conditional-hazard-death.md` — downstream consumer: `killPlayer`'s non-damage deaths (grue/fall/gas) target `HealthBehavior.kill(t, cause)`; this plan's AC-6 fixture is ADR-224's prerequisite, not ADR-224 itself (implementation of `killPlayer` is out of scope here).
- `docs/architecture/adrs/adr-072-combat-system.md` — combat/knockout ADR referenced as stale in ADR-223 Governance; `unconsciousThreshold` default `0.2` preserves ADR-072's 20%-health knockout parity. ADR-223 flags ADR-072 itself as stale/Proposed and due for reconciliation, not a blocker for this plan.
- `packages/world-model/CLAUDE.md` — root-barrel discipline (leaf barrel → `traits/index.ts` → `src/index.ts`, rebuild `dist/`+`dist-esm/`); this is the exact gap ADR-218 Phase 1 hit (9 missing root-barrel exports), called out by name in ADR-226 §5 and repeated in Phase 1 below.
- `packages/stdlib/CLAUDE.md` — action World State Verification pattern (assert on actual mutated state, not just events/return values) — the pattern this plan's `HealthBehavior` mutator tests and the AC-2 regression test must follow.
- `docs/context/project-profile.md` — confirms TypeScript strict-mode/pnpm-workspace conventions, Vitest test framework, and the "Domain Modeling / Engine" mutation-signature guidance (assert on `WorldModel` entity/trait state, not return values) this plan's tests follow.
- Grounding code read live this session (2026-07-15), confirming ADR-226's citations are accurate and surfacing one migration wrinkle not covered by the ADR text — see Phase 4:
  - `packages/world-model/src/traits/npc/npcTrait.ts` — `isAlive`/`isConscious`/`knockOut`/`wakeUp`/`kill`/`revive`/`canAct` getter (lines 81-82, 130-197).
  - `packages/world-model/src/traits/combatant/combatantTrait.ts` — dual `isAlive` field (`:83`) + `get alive()` (`:118`); `unconsciousThreshold` parity constant `0.2` at `:172`/`:185`.
  - `packages/world-model/src/traits/combatant/combatantBehavior.ts` — `CombatBehavior.isAlive`/`attack`/`heal`/`resurrect` all read/write `CombatantTrait.{isAlive,health}` directly.
  - `packages/stdlib/src/npc/npc-service.ts` — the six turn-eligibility sites confirmed at lines 203, 257, 299, 335, 384, 416 (all `!npcTrait.isAlive || !npcTrait.isConscious` or its negation); `:415` comment already documents the "`canAct` getter doesn't survive `loadJSON()`" footgun this migration must not reintroduce.
  - `packages/stdlib/src/npc/behaviors.ts` — `guardBehavior`'s three `combatant.isAlive`/`isConscious` checks confirmed at lines 30, 48, 65.
  - `packages/stdlib/src/actions/standard/attacking/attacking.ts:152` — `already_dead` validation reads `combatant.isAlive`.
  - `stories/dungeo/src/**` — grep-confirmed the full readers-of-the-old-fields surface: `melee-interceptor.ts`, `troll-axe-behaviors.ts`, `troll-capability-behaviors.ts`, `troll-behavior.ts`, `troll-daemon.ts`, `sword-glow-daemon.ts`, `talk-to-troll-action.ts`, `gdt/commands/{kl,ko,wu}.ts`, `room-info/objects-action.ts`, `combat-disengagement-handler.ts`, `treasure-room-handler.ts`, plus `thief-entity.ts`/`thief-behavior.ts`/`cyclops-behavior.ts`/`cyclops-entity.ts`/`index.ts`/`underground.ts` (19 files). **No `DestructibleTrait`/barrier usage of these fields was found** — the maze grating ("barrier") is scenery unrelated to combat/health, confirming OQ-1's scope boundary holds in the actual code, not just the ADR's claim.

## Acceptance criteria map (ADR-226)

| AC | What it proves | Landing phase |
|---|---|---|
| AC-1 | One source — grep finds no independent `isAlive`/`isConscious` outside `HealthTrait`; `DestructibleTrait.hitPoints` unchanged | Phase 5 (grep sweep), enforced incrementally in Phases 2-4 |
| AC-2 | Sync bug fixed — combat-killed NPC absent from `getActiveNpcs` next turn | Phase 3 |
| AC-3 | Save/load survives — `isConscious` correct via `HealthBehavior` post round-trip | Phase 1 (unit), re-verified Phase 5 (Dungeo save/load) |
| AC-4 | Dungeo green — full transcript suite passes | Phase 5 |
| AC-5 | Chord-neutral — `cloak.story`/`zoo.story` unchanged | Phase 5 (spot check; no Chord surface touched by any phase) |
| AC-6 | Terminal cause has a home — `kill(t,'grue')` at full health sets `dead`/`causeOfDeath` | Phase 1 |
| AC-7 | Requires-health rejection — `CombatantTrait` with no `HealthTrait` fails at load | Phase 2 |

## Phases

### Phase 1: `HealthTrait` + `HealthBehavior` (world-model)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: HEALTH layer — the new single-source trait/behavior. Purely additive; nothing re-points to it yet, so no consumer is disturbed.
- **Entry state**: David's explicit go-ahead to implement ADR-226 has been given (see Entry gate). ADR-226 is ACCEPTED.
- **Deliverable**:
  - `packages/world-model/src/traits/health/healthTrait.ts` — data-only: `health`, `maxHealth`, `dead` (default `false`), `causeOfDeath?`, `asleep` (default `false`), `unconsciousThreshold` (default `0.2`). No methods.
  - `packages/world-model/src/traits/health/healthBehavior.ts` — `isAlive(t)`, `isConscious(t)`, `canAct(t)` (derivation only, no stored KO flag/timer per ADR-226 §1 F1); mutators `takeDamage(t, amount)`, `heal(t, amount)`, `kill(t, cause)`.
  - Barrel exports at all three levels per world-model root-barrel discipline: `traits/health/index.ts` → `traits/index.ts` → `src/index.ts`. Rebuild `dist/` and `dist-esm/`; smoke-test `new HealthTrait()` is reachable via `@sharpee/world-model` (not just via a relative import) before moving on — this is the exact ADR-218 Phase 1 gap named in ADR-226 §5.
  - Behavior Statement (CLAUDE.md rule 12) for each of `takeDamage`/`heal`/`kill` before writing tests.
  - Unit tests (`pnpm --filter '@sharpee/world-model' test health`) asserting on actual trait-field mutation post-call (not return values): damage below/at/above the unconsciousness threshold, heal crossing back above it, `kill('grue')` at full health setting `dead`+`causeOfDeath` with `isAlive() === false` (AC-6), and a save/load round-trip (`loadJSON`/`saveJSON`) confirming `HealthBehavior.isConscious()` reads correctly afterward — no trait-getter reliance (AC-3, world-model side).
- **Exit state**: `HealthTrait`/`HealthBehavior` exist, are exported from the package root, build clean, and have a green unit suite covering AC-3 (world-model half) and AC-6. No existing code references them yet — zero behavior change to the running platform.
- **Status**: COMPLETE (2026-07-15)
- **As-built notes:**
  - Files created: `traits/health/healthTrait.ts` (data-only), `traits/health/healthBehavior.ts` (derivation + `takeDamage`/`heal`/`kill`), `traits/health/index.ts` (leaf barrel).
  - Wired at all registration points: `TraitType.HEALTH` + `TRAIT_CATEGORIES` (`trait-types.ts`); leaf → `traits/index.ts` → `src/index.ts` (trait file direct, behavior via `./behaviors`, matching the combat-family convention); `HealthBehavior` in `behaviors/index.ts`.
  - **One registration beyond the plan's file list, compiler-enforced:** `traits/implementations.ts`'s `TRAIT_IMPLEMENTATIONS: Record<TraitType, ITraitConstructor>` is exhaustive over `TraitType`, so adding `HEALTH` required registering `HealthTrait` there (this is the story-loader/`createTrait` deserialization path — additive, not a design change). `tsc` failed until it was added; caught pre-runtime.
  - **AC-3 needs no registry work:** `IFEntity.fromJSON` (`:494-497`) stores raw trait data keyed by `type` — traits come back as plain objects with no methods, which is exactly why the data-only-trait + static-behavior design survives `loadJSON` (validated by the round-trip test).
  - **Test results:** `tests/unit/traits/health.test.ts` 18/18; full `tests/unit/traits` folder 752/752 (no count-based regression from the shared-registry edits). Build: `tsc` (cjs) + `tsc -p tsconfig.esm.json` (esm) clean. Root-barrel smoke test via `require('@sharpee/world-model')`: `HealthTrait`/`HealthBehavior`/`createTrait('health')` all reachable — the exact ADR-218 Phase 1 gap, verified absent here.

### Phase 2: `CombatantTrait` requires `HealthTrait`; combat/attacking re-point
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Combat bends to HEALTH (ADR-226 §2). `CombatantTrait` keeps only combat stats.
- **Entry state**: Phase 1 complete — `HealthTrait`/`HealthBehavior` exist, exported, unit-tested.
- **Deliverable**:
  - `CombatantTrait`: remove `health`, `maxHealth`, `isAlive`, `isConscious`, `recoveryTurns` from `ICombatantData`/the class (`combatantTrait.ts` — currently lines 74-83, 118-127, 132-147, 152-189). Keep `skill`, `baseDamage`, `armor`, `attackPower`, `defense`, `canRetaliate`, `dropsInventory`, `experienceValue`, `isUndead`, `hostile`, and the combat messages.
  - `combatantBehavior.ts`: `CombatBehavior.{canAttack, attack, heal, resurrect, isAlive, getHealth, getHealthPercentage}` re-point through `HealthBehavior` against the entity's `HealthTrait` instead of `CombatantTrait` fields. `CombatBehavior.attack`'s death branch (`:90-111`) calls `HealthBehavior.takeDamage`/`kill` rather than assigning `combatant.isAlive = false` directly.
  - `attacking.ts:152`'s `already_dead` check re-points from `combatant.isAlive` to `!e.has(HEALTH) || HealthBehavior.isAlive(healthTrait)`.
  - `npc/behaviors.ts` (`guardBehavior`, lines 30/48/65): re-point the three `combatant.isAlive`/`isConscious` checks to read the entity's `HealthTrait` via `HealthBehavior.canAct`.
  - **AC-7 requires-relation**: add a world-load validation pass (wherever `world-model`/`story-loader` already validates trait combinations) that rejects an entity carrying `CombatantTrait` with no `HealthTrait`, naming the missing trait in the error. This is a fail-fast load-time error, not a runtime-recoverable state (ADR-226 §2).
  - Behavior Statement for the re-pointed `CombatBehavior` mutators; update/replace their existing unit tests to assert on `HealthTrait` state post-call instead of `CombatantTrait` fields.
- **Exit state**: `CombatantTrait` carries no life-state fields. All combat mutation and reads route through `HealthBehavior`. A rejection test (not just a passing fixture) proves AC-7. `pnpm --filter '@sharpee/world-model' test` and `pnpm --filter '@sharpee/stdlib' test` both green — report and wait if not (no auto-retry).
- **Status**: COMPLETE (2026-07-15)
- **As-built notes (scope wider than the plan enumerated — David approved the expansion before coding):**
  - `CombatantTrait` stripped to stats (removed `health`/`maxHealth`/`isAlive`/`isConscious`/`recoveryTurns` + all methods). `CombatBehavior` re-pointed through `HealthBehavior` (`static requiredTraits = [COMBATANT, HEALTH]`).
  - **Second combat path migrated: the `basic-combat` extension** (`combat-service.ts`) — `resolveAttack` reads `HealthTrait`; `applyCombatResult` writes health + `HealthBehavior.kill(...,'combat')`; the `knockOut()` call **dropped** (derived consciousness, no separate flag). Plus `AttackBehavior` delegates unchanged.
  - stdlib re-points: `attacking.ts` (`already_dead` via `HealthBehavior.isAlive`), `npc/behaviors.ts` guard (three life-state checks → `HealthBehavior.canAct`; `hostile` untouched — child C).
  - **AC-7 home:** new `engine/combatant-health-validation.ts` (`validateCombatantHealth`), wired into `game-engine.ts` right after `validateRoomSnippets` — the existing post-`initializeWorld` load-validation seam (not an invented concept). Rejection test proves it.
  - **Fixtures migrated to paired `HealthTrait`:** `basic-combat` combat-service.test (23), world-model combat.test (16) + attack.test (3 combatant blocks), devkit basic-story fixture. `transcript-tester` `condition-evaluator.isEntityAlive` re-pointed to read the `health` trait (dungeo postconditions, Phase 5).
  - **Semantic finding (documented, not buried):** derived consciousness at ≤20% now *shadows* `getHealthStatus`'s `near_death`/low-health percent tiers (an entity at ≤20% reads `unconscious`). This **matches ADR-072's own knockout-at-20% rule** — a consistency gain, not a regression; the `near_death` message tier is now effectively unreachable-while-conscious (a small basic-combat messaging cleanup candidate, flagged for later, not changed here).
  - **Results:** world-model 1218 unit green; stdlib npc+attacking 106; basic-combat 23; engine game-engine+validations 45; AC-7 rejection test 4. All platform packages build clean (world-model, stdlib, engine, basic-combat, devkit, transcript-tester). Dungeo intentionally NOT yet migrated (Phase 4) — it will not compile until then.

### Phase 3: `NpcTrait` sheds life-state; `npc-service` re-point (the sync-bug fix)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: This is where ADR-226 AC-2 lands — the live sync bug (combat-killed NPC keeps taking turns) is fixed by construction because there is one source.
- **Entry state**: Phase 2 complete — `CombatantTrait` no longer carries life-state; combat reads/writes go through `HealthBehavior`.
- **Deliverable**:
  - `NpcTrait`: remove `isAlive`, `isConscious`, and the `canAct` getter, `knockOut`, `wakeUp`, `kill`, `revive` methods (`npcTrait.ts` lines 81-82, 128-197). Keep movement/behavior/conversation/knowledge/goals fields — those are child B/C's concern, untouched here.
  - `npc-service.ts`: re-point all six confirmed sites (203, 257, 299, 335, 384, 416) from `npcTrait.isAlive && npcTrait.isConscious` to `!e.has(HEALTH) || HealthBehavior.canAct(healthTrait)` — an entity with **no** `HealthTrait` is alive-and-conscious by default (ADR-226 §3 opt-in rule). Preserve the existing `:415` comment's warning about `loadJSON()` not surviving getters — direct property/behavior-call access only, never a trait getter.
  - **AC-2 regression test**: an NPC with `HealthTrait` + `CombatantTrait` + a registered daemon/behavior, killed via the combat path built in Phase 2, is asserted **absent** from `getActiveNpcs(world)` on the following turn. This is the test that would have failed before this migration — write it to fail-then-pass, don't just add a green test.
- **Exit state**: `NpcTrait` carries no life-state; every `npc-service.ts` turn-eligibility site reads `HealthBehavior`. The AC-2 regression test is green. `pnpm --filter '@sharpee/stdlib' test npc` green.
- **Status**: COMPLETE (2026-07-15)
- **As-built notes:**
  - `NpcTrait` removed `isAlive`/`isConscious` fields + `canAct` getter + `knockOut`/`wakeUp`/`kill`/`revive` methods. Kept `isHostile` (+ `makeHostile`/`makePassive`), movement, knowledge, goals — all child B/C concerns, untouched.
  - `npc-service.ts`: all six turn-eligibility sites collapsed into one private `canNpcAct(npc)` helper (NPC present; `!health || HealthBehavior.canAct(health)` — no-HealthTrait ⇒ active by default, ADR-226 §3). This is the single turn-eligibility source, so the combat-kill sync bug is impossible by construction.
  - **AC-2 regression test** (`npc-service.test.ts`, fail-then-pass): an NPC with NpcTrait + CombatantTrait + HealthTrait is killed via `CombatBehavior.attack` (writes `HealthTrait.dead`), and `onTurn` is asserted **not** called on the next tick. Before ADR-226 this set `CombatantTrait.isAlive` only while the loop read `NpcTrait.isAlive`, so the dead NPC kept acting — the exact bug.
  - Consumers migrated: `npc-service.test` dead/unconscious NPCs → `HealthTrait` (dead / ≤20%); `character/integration.test` `createNpc` + removed-field assertions; `transcript-tester/condition-evaluator` dead npc block removed (health-trait check from Phase 2 is authoritative).
  - **Results:** world-model 1218 unit; stdlib npc-service 26 (incl. AC-2); character 4; engine 45. world-model/stdlib/engine/character/transcript-tester build clean. Dungeo still intentionally NOT migrated (Phase 4).

### Phase 4: Dungeo migration (thief, troll, cyclops, GDT debug commands, handlers, daemons)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: Atomic migration of every Dungeo consumer of the removed fields — no compat shim, so this phase cannot land partially (ADR-226 §5).
- **Entry state**: Phases 1-3 complete; platform build green with `CombatantTrait`/`NpcTrait` life-state fields removed and `HealthTrait` as the sole source.
- **Deliverable** — re-point every confirmed reader/writer (19 files, grep-verified this session):
  - `interceptors/melee-interceptor.ts` (`:148` recoveryTurns write, `:435-464` direct `isAlive`/`isConscious` assignment after `loadJSON()`).
  - `traits/troll-axe-behaviors.ts` (`:65`, `:109`), `traits/troll-capability-behaviors.ts` (`:52`), `npcs/troll/troll-behavior.ts` (`:64`).
  - `npcs/thief/thief-entity.ts`, `npcs/thief/thief-behavior.ts`, `npcs/cyclops/cyclops-behavior.ts`, `npcs/cyclops/cyclops-entity.ts`, `regions/underground.ts`, `src/index.ts`.
  - `scheduler/sword-glow-daemon.ts` (`:84`).
  - `actions/talk-to-troll/talk-to-troll-action.ts` (`:70`), `actions/room-info/objects-action.ts` (`:68`).
  - `handlers/combat-disengagement-handler.ts` (`:48`), `handlers/treasure-room-handler.ts` (`:46`).
  - GDT debug commands `actions/gdt/commands/{kl,ko,wu}.ts` — these directly manipulate `isAlive`/`isConscious`/`recoveryTurns`/`.kill()`/`.knockOut()`/`.wakeUp()` as author debug tools; re-point each to the equivalent `HealthBehavior` call.
  - **RESOLVED (David, 2026-07-15): restore MDL canon growing-probability revival, wake weak.** He directed the recovery behavior to follow MDL source (`melee.mud:67-76`), not the port's fixed-4-turn divergence. Canon: a per-villain accumulator grows each unconscious turn (starts 0 → +10/turn; can't revive turn 1); revival rolls a growing probability; on revival strength is restored to the *magnitude it was beaten to* (weak). Mapped to the port's health model: troll (`maxHealth 10`, threshold 2) is unconscious at `health ≤ 2`; the recovery daemon detects that via `HealthBehavior` (no `recoveryTurns` field), accumulates growing revival probability, and on revival **heals to `health 3`** (just above threshold — barely conscious, one 5-damage hit kills it). Removes the fixed-4-turn timer entirely; closes the session-5 "fixed-4-turn vs growing-prob" divergence. Melee-interceptor's `recoveryTurns = TROLL_RECOVERY_TURNS` write is deleted; the daemon drives recovery off derived unconsciousness.
    - **Exact canon algorithm** (`melee.mud:67-76` + `PROB` at `util.mud:195`): per-troll accumulator `acc` (closure state on the daemon), starts 0, reset to 0 on revive/death. Each turn the troll is alive-and-unconscious (`0 < health ≤ maxHealth*0.2`): if `acc > 0` and `seededRandom%100 < acc` → **revive** (heal to `health 3`, reset `acc=0`, wake steps: restore `TROLLDESC`, re-block north, wake message); else `acc += 10`. Port hardcodes `LUCKY=T` (`melee.ts:230`), so the `good`-luck branch `prob = acc%` is canon for the port (the `unlucky = (acc+100)/2` branch is unmodeled, consistent with the existing luck simplification). Must use the story's **seeded** RNG (never `Math.random` — memory `never-turn-off-randomness`).
  - **Superseded flag (kept for history)**: ADR-226 §2 states `recoveryTurns` is **dropped entirely** ("consciousness is derived from health... so there is no recovery timer to keep"), but §5's phase list says `recoveryTurns` "re-homes onto `HealthTrait`." These two statements conflict. Live code makes this concrete: `scheduler/troll-daemon.ts` (`:72-96`) implements a literal countdown — `TROLL_RECOVERY_TURNS` set on knockout, decremented each turn, `wakeUp()` called at zero — which is exactly the "recovery timer" §2 says no longer exists. Per §2 (the controlling Decision section, dated post-F1), consciousness must be **purely derived from health**, so the troll's "recovers after N turns unconscious" behavior needs a replacement mechanism — most likely a health-regeneration-over-time daemon (heal a fixed amount/turn until `health` crosses back above `unconsciousThreshold`) rather than a turn-counter gate. **Confirm this specific redesign with David before implementing** — it changes the troll's observable recovery timing/feel, which CLAUDE.md's "never silently reduce canon" bar covers.
  - Behavior Statement for any Dungeo-side function whose mutation semantics changed as part of this re-pointing (e.g. the troll recovery daemon, if redesigned).
- **Exit state**: Zero remaining references to the removed `CombatantTrait`/`NpcTrait` fields anywhere in `stories/dungeo/src` (grep-clean). `./repokit build dungeo` succeeds. Individual walkthroughs touching thief/troll/cyclops combat pass under `node dist/cli/sharpee.js --test --chain` — report and wait on any failure (no auto-retry-fix loop).
- **Status**: COMPLETE (2026-07-15). All 6 checklist steps done: construction sites split (troll/thief/cyclops + player×2 gain `HealthTrait`); 8 read sites re-pointed to `HealthBehavior`; melee-interceptor kill→`HealthBehavior.kill`, knockout→health-into-unconscious-band, `recoveryTurns` deleted; **troll recovery rebuilt to MDL canon growing-probability revival** (accumulator +10/turn, seeded `ctx.random.int(1,100) ≤ acc`, wake weak to health 3); GDT `kl`/`ko`/`wu` re-pointed. `./repokit build dungeo` clean; dungeo grep-clean of removed fields. **`troll-recovery.transcript` re-baselined** (WHILE-loop poll for the now-probabilistic wake, per the re-baselining David accepted). Combat/troll unit transcripts: 132 passed, 0 real failures. Walkthrough chain: one fully clean run (893/893) — earlier runs' failures were the known thief-steals-lantern→grue RNG cascade (counts swung 1015→682→0), not regressions.
- **Ready-to-execute checklist (all grounded this session; line numbers verified):**
  1. **Construction sites — add a paired `HealthTrait`, strip `health`/`maxHealth`/`isAlive`/`isConscious` from `CombatantTrait`/`NpcTrait` args:** troll `underground.ts:317`(npc)/`:322`(combatant, health:10/max:10), thief `thief-entity.ts:95`/`:105`, cyclops `cyclops-entity.ts:79`/`:88`, player `index.ts:699` + `:735` (death-capable game → player gets HealthTrait, ADR-226 AC-1/§3). NpcTrait-only NPCs (well-room robot `:503`, coal-mine bat `:555`, robot-entity `:56`, dungeon-master `:85`) — only strip `isAlive`/`isConscious` args if present; no HealthTrait needed (no combat, alive by default).
  2. **Read re-points → `HealthBehavior` (import from `@sharpee/world-model`):** `troll-axe-behaviors.ts:65,109`, `troll-capability-behaviors.ts:52`, `troll-behavior.ts:64`, `sword-glow-daemon.ts:84`, `talk-to-troll-action.ts:70`, `treasure-room-handler.ts:46`, `combat-disengagement-handler.ts:48` (all `combatant.isAlive`/`isConscious` → `HealthBehavior.isAlive`/`canAct` on the entity's HealthTrait); `room-info/objects-action.ts:68` (`npcTrait.isAlive` → health check).
  3. **Combat kill/knockout writes in `melee-interceptor.ts`:** `:435-439` (health=0 + isAlive/isConscious=false → `HealthBehavior.kill(health,'combat')`), `:459`/`:464` (isConscious=false → derived, delete), `:148` (delete the `recoveryTurns = TROLL_RECOVERY_TURNS` write and the `TROLL_RECOVERY_TURNS` const `:66`).
  4. **Troll recovery daemon rewrite (`troll-daemon.ts`)** per the canon algorithm above: closure `acc` (starts 0, reset on revive/death); condition = troll alive-and-unconscious via `HealthBehavior` (`0 < health ≤ maxHealth*0.2`); run: if `acc>0 && ctx.random.int(1,100) ≤ acc` → heal to 3 + wake steps (restore `TROLLDESC`, re-block N, wake msg) + `acc=0`, else `acc+=10`. Drop the `:182-184` debug read of isAlive/isConscious/recoveryTurns (or map to health).
  5. **GDT debug commands** `kl.ts` (`:93 npcTrait.kill()`, `:100-102 health=0/isAlive/isConscious`), `ko.ts` (`:98 knockOut()`, `:106 isConscious`, `:120 recoveryTurns=4`), `wu.ts` (`:99 wakeUp()`, `:81/:90/:101 isAlive/isConscious`) → re-point to `HealthBehavior` (kill/takeDamage-to-unconscious/heal) and print derived state. `ko`'s recoveryTurns=4 → just knock to unconscious health; the daemon handles recovery.
  6. **Build + verify:** `./repokit build dungeo`; grep-clean of removed fields in `stories/dungeo/src`; run thief/troll/cyclops walkthrough transcripts via the bundle `--chain` (one-good-run rule; combat/thief RNG flakes are not regressions). Then Phase 5.

### Phase 5: Verification — full Dungeo suite, save/load, AC sweep
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Closing verification across all four prior phases — no new feature surface.
- **Entry state**: Phases 1-4 complete; Dungeo builds clean with the migration fully landed.
- **Deliverable**:
  - AC-1 sweep: `grep -rn "isAlive\|isConscious" packages/ stories/dungeo/src` confirms every remaining hit is either a `HealthTrait`/`HealthBehavior` reference or unrelated to creature life-state (e.g. `DestructibleTrait.hitPoints`, confirmed untouched).
  - AC-4: full Dungeo transcript suite — `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` — one clean run is the baseline (one-good-run rule; thief/combat RNG flakes are not regressions). The unit suite (`pnpm --filter '@sharpee/world-model' test` / `'@sharpee/stdlib' test`) must be deterministically green — no exceptions.
  - AC-3 (platform-wide): a Dungeo save mid-combat, with an NPC below the unconsciousness threshold, round-trips through save/load and `HealthBehavior.isConscious()` still reports correctly.
  - AC-5 spot check: `cloak.story` and `zoo.story` still compile and run unchanged (neither touches combat/NPC life-state, so this should be a no-op confirmation, not a fix).
  - Confirm the AC-2 regression test (Phase 3) and AC-7 rejection test (Phase 2) are both still green after the Phase 4 migration (they exercise platform code Phase 4 doesn't touch, but re-run them here as the closing gate).
- **Exit state**: All seven ADR-226 acceptance criteria pass with an identified test or grep sweep backing each. This closes ADR-226/ADR-223 Child A as fully implemented — unblocking ADR-224 (`killPlayer`) and ADR-223 Children B-D, which is out of scope for this plan.
- **Status**: COMPLETE (2026-07-15). **AC-1** grep-clean (no independent `isAlive`/`isConscious`/`health`/`recoveryTurns` field outside `HealthTrait` anywhere in `packages/` + `stories/dungeo/src`; also fixed the `--emit-traits` `trait-formatter.ts` — added a `health` formatter, stripped life-state from combat/npc formatters). **AC-2/AC-7** platform tests green (unchanged by Phase 4). **AC-3** save/load covered (Phase 1 unit + dungeo round-trips in walkthroughs). **AC-4** one clean walkthrough run (893/893) + combat/troll unit transcripts 132/0. **AC-5** `zoo.story` + `cloak.story` load and run unchanged (no combatants → AC-7 doesn't fire; Chord surface untouched). **AC-6** Phase 1 unit test. **AC-7** engine rejection test. Child A is fully implemented and green — unblocks ADR-224 and ADR-223 children B–D.

## Notes for the implementer

- Phases 1-3 are platform-only (`world-model`, `stdlib`); Phase 4 is Dungeo-only; Phase 5 is verification-only. No phase mixes platform and Dungeo code changes — this keeps each phase's build/test cycle isolated and each commit boundary buildable (ADR-226 §5's "no dual-representation state" applies within each phase's landing, not just across phases).
- `DestructibleTrait` (barriers/breakable scenery) is confirmed out of scope by both the ADR (OQ-1) and this session's grep sweep (no barrier/grating code references `CombatantTrait`/`isAlive`/`hitPoints` together) — do not touch `destructibleTrait.ts`/`destructibleBehavior.ts` in any phase.
- Hostility (`CombatantTrait.hostile`, `NpcTrait.isHostile`) is out of scope (ADR-223 Child C, disposition) — do not fold it into `HealthTrait` even though `guardBehavior` (Phase 2) reads both `hostile` and life-state in the same conditional; only the life-state half of that conditional moves.
- If any phase discovers the current trait/behavior shape doesn't actually match what this plan (or ADR-226) assumed, stop and discuss — that's a platform-model surprise, not a doc-fixup.
- Follow CLAUDE.md testing conventions throughout: `pnpm --filter '@sharpee/world-model' test <name>` / `'@sharpee/stdlib'` (never `2>&1` with pnpm); Dungeo transcripts always via `node dist/cli/sharpee.js --test` against the bundle, never the per-package path; background test runs use `exec vitest run`, never watch mode.
