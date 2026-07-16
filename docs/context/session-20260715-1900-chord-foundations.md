# Session Summary: 2026-07-15 19:00 — chord-foundations (session 87088f)

## Goals
- Begin the ADR-223 critical path (child A, `HealthTrait`) from the prior session's ADR reset.
- Ended up: authored + accepted the child ADR, reconciled the parent, wrote the plan, and implemented Phases 1–3 (the entire platform half), pausing before Phase 4 (Dungeo).

## What was accomplished (all verified green)

### Design (docs only, no platform gate)
- **ADR-226 (`HealthTrait` — Unified Creature Life-State Model)** authored → 3-question OQ interview → adr-review (fixed F1–F4) → **ACCEPTED** (15/15 clean). Key decisions: `DestructibleTrait` is out of scope (life-state is creatures only — David: "a door is not related to combat or health"); terminal `dead`+`causeOfDeath` (killPlayer sole non-damage writer); atomic no-shim migration; **consciousness purely derived** (no stored KO / `recoveryTurns`).
- **ADR-223 reconciled** to match (three edits, dated): HEALTH layer unifies *two creature models*, not three; `DestructibleTrait` marked out of scope.
- **Plan** written: `docs/work/health-trait/plan.md` (5 phases; plan-review clean bar the ADR-072 stale-note bookkeeping).

### Implementation — Phases 1–3 (platform), all green
- **Phase 1** — `HealthTrait` (data-only) + `HealthBehavior` (derivation + `takeDamage`/`heal`/`kill`) in `packages/world-model/src/traits/health/`; wired through `TraitType`, all 3 barrels, and `TRAIT_IMPLEMENTATIONS` (deserialization registry — compiler-forced). 18 unit tests (AC-3 wm-half + AC-6); root-barrel smoke test via `@sharpee/world-model` root.
- **Phase 2** — `CombatantTrait` stripped to combat *stats*; `CombatBehavior` + the **`basic-combat` extension** (`combat-service.ts`) + `attacking.ts` + `npc/behaviors.ts` re-pointed through `HealthBehavior`. **AC-7** load-time validation added: `engine/combatant-health-validation.ts`, wired after `validateRoomSnippets` in `game-engine.ts` (the existing post-`initializeWorld` seam). Fixtures migrated (basic-combat 23, world-model combat 16 + attack 3, devkit, transcript-tester). Semantic finding documented: derived-consciousness at ≤20% shadows `getHealthStatus`'s `near_death` tier (matches ADR-072's 20% knockout — consistency, not regression).
- **Phase 3** — `NpcTrait` sheds `isAlive`/`isConscious` + methods; `npc-service` six turn-eligibility sites → one `canNpcAct` helper. **AC-2 sync bug fixed by construction**, with a fail-then-pass regression test (combat-kill → NPC absent from turn loop next tick).
- **Totals green:** world-model 1218 unit · basic-combat 23 · engine 45 (incl. AC-7) · stdlib npc-service 26 (incl. AC-2) · character 4. All touched platform packages build clean (world-model, stdlib, engine, basic-combat, character, transcript-tester, devkit).

## Key Decisions (David, 2026-07-15)
- ADR-226 OQ-1: `DestructibleTrait` NOT folded — life-state is creatures only.
- ADR-226 OQ-2: separate terminal `dead`+`causeOfDeath`. OQ-3: atomic, no compat shims.
- Phase 2 scope expansion (basic-combat + fixtures) approved before coding.
- Sequencing: continue through 2–3, pause at 4.
- **Phase 4 troll recovery: RESTORE MDL canon** growing-probability revival (not the port's fixed-4-turn), waking **weak** (heal to health 3). "This should be in MDL source" → read from `melee.mud:67-76` + `PROB` `util.mud:195`. Exact algorithm recorded in the plan (Phase 4).

## Phase 4 + 5 (completed after the checkpoint, same session)
- **Phase 4 (Dungeo migration) — COMPLETE.** ~19 files migrated: troll/thief/cyclops + player split to paired `HealthTrait`; 8 read sites → `HealthBehavior`; melee-interceptor kill→`HealthBehavior.kill`, knockout→drop-health-into-unconscious-band, `recoveryTurns` deleted; GDT `kl`/`ko`/`wu` re-pointed. **Troll recovery rebuilt to MDL canon growing-probability revival** (`melee.mud:67-76` + `PROB` `util.mud:195`): accumulator +10/turn, seeded `ctx.random.int(1,100) ≤ acc`, wake weak to health 3. `troll-recovery.transcript` re-baselined with a WHILE-loop poll (the re-baselining David accepted for the now-probabilistic timing).
- **Phase 5 (verification) — COMPLETE.** All 7 ACs pass: AC-1 grep-clean (+ fixed `--emit-traits` `trait-formatter.ts`); AC-2/AC-7 platform tests green; AC-3 save/load; AC-4 one clean walkthrough run **893/893** + combat/troll unit transcripts **132/0**; AC-5 `zoo.story`/`cloak.story` load unchanged; AC-6 unit; AC-7 rejection test. `./repokit build dungeo` clean.
- **Walkthrough RNG note:** failure counts swung 1015 → 682 → **0** across runs — the known thief-steals-lantern → grue cascade (one-good-run rule), not regressions; deterministic unit transcripts stayed green throughout.

## Open Items / Next Session
- **ADR-072 bookkeeping** (small, optional): mark its `recoveryTurns`/timer-knockout model superseded by ADR-226 (already known-stale per ADR-223 Governance).
- **Now unblocked** (each its own ADR + plan + platform go-ahead): ADR-224 (`killPlayer` — the player already carries a `HealthTrait` with terminal `dead`/`cause`), and ADR-223 children B (agent/daemon split), C (personhood), D (Chord surface).

## Metadata
- **Status**: COMPLETE — ADR-226 / ADR-223 child A (`HealthTrait`) fully implemented across all 5 phases, all 7 ACs verified green. Tree is fully buildable and committable. `.current-plan` → `docs/work/health-trait/plan.md`.
