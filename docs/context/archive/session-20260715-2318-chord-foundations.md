# Session Summary: 2026-07-15 23:18 — chord-foundations (session 043a45)

## Goals
- Implement ADR-224 (Conditional/Hazard Death — a First-Class Player-Death Model), the platform half (Phases 1–3), following the health-trait session's "now unblocked" note.
- Produce the grounded plan first (session-planner + plan-review), then get explicit per-phase go-aheads before coding, per CLAUDE.md's platform-change discussion gate.

## Phase Context
- **Plan**: `docs/work/player-death/plan.md` (`.current-plan` → this file). Goal: single `killPlayer` primitive → canonical `if.event.player.died` → engine game-over routing with story-policy veto, plus two reusable trigger shapes (deadly-room verb-allowlist, seeded-probabilistic), re-pointing combat and (later) all of Dungeo's hand-rolled death sites onto it.
- **Phases executed**: Phase 1 ("The canonical death primitive"), Phase 2 ("Reusable trigger shapes"), Phase 3 ("Combat integration") — all Medium/Medium/Small tier.
- **Phase outcome**: All three completed on/under budget; each phase's exit-state tests green before proceeding to the next.

## What was accomplished

### Plan production (this session)
- `session-planner` wrote `docs/work/player-death/plan.md`, grounding against real code rather than trusting the ADR's prose. Corrections made during grounding:
  - No flooding/drowning daemon exists in `stories/dungeo/src/**` (ADR claimed one) — dropped, not invented.
  - The event-name split is four-way, not two: `combat.player_died` (dead channel def), `if.event.player.died` (Dungeo's dominant spelling), `if.event.death` (what `attacking.ts` actually emits today), and a fourth no-dot-prefix `player.died` spelling in three Dungeo files.
  - At least ten `dungeo.player.dead` hand-rolled write sites found, not the five the ADR named.
  - `plan-review` caught a missing mechanism: the "provoked" path (troll/cyclops melee → player death, `melee-npc-attack.ts`'s `emitHeroDeath`) was absent from the ADR's own Consequences list; added to Phase 4's deliverable.
- `.current-plan` already points to this plan.

### Phase 1 — canonical death primitive (stdlib + engine; world-model untouched)
- New `packages/stdlib/src/death/` module: `kill-player.ts` (`killPlayer(world, player, {cause, messageId?, terminal})` — lazily attaches `HealthTrait`, calls `HealthBehavior.kill`, idempotent no-op if already dead), `player-death-events.ts` (`PLAYER_DIED_EVENT`/`IPlayerDiedPayload`, defined once and imported by both the death channel and the engine — co-located wire-type sharing per DEVARCH rule 8b), `index.ts`.
- `packages/stdlib/src/channels/standard.ts`: `STANDARD_CHANNEL_EVENTS.PLAYER_DIED` re-pointed from the literal `'combat.player_died'` to the imported `PLAYER_DIED_EVENT` constant — hard cutover, no alias. `combat.player_died` retired as a live event type.
- `packages/engine/src/game-engine.ts`: captures the turn's death cause before turn-events clear, then after the plugin tick loop / victory check re-checks derived `isPlayerDead()` (`HealthBehavior.isAlive`) and only calls `stop('defeat', ...)` if still dead — giving story handlers and state-machine plugins "first crack" (AC-3 veto ordering, e.g. reincarnation).
- Tests: `packages/stdlib/tests/death/kill-player.test.ts` (4), `packages/engine/tests/unit/player-death-routing.test.ts` (2 — AC-1 death routes to `game.lost`, AC-3 reincarnation veto).
- Deferred to Phase 3: a dangling `combat.player_died` lang-layer message mapping (turned out to be reusable, not dead — see Phase 3).

### Phase 2 — reusable hazard/trigger shapes (world-model + stdlib + engine)
- **Seam correction (David-approved mid-session)**: the plan's original ADR-208-interceptor idea was wrong — interceptors key on a direct-object entity and can't fire on objectless verbs like WAIT. Corrected to a `ParsedCommandTransformer` → new generic `if.action.deadly_room_death` action calling `killPlayer`, matching the pattern the existing falls handler already uses (Design A, chosen over a before-action-hook alternative).
- `world-model`: new `DeadlyRoomTrait {cause, messageId?, safeVerbs[], chance?}` + `DeadlyRoomBehavior.checkVerb` (verb-allowlist gate + optional seeded chance roll), wired through `TraitType`, all barrels, and `TRAIT_IMPLEMENTATIONS`. Resolves ADR-224's deferred Q-4 as a narrow purpose-built trait, not a general `HazardTrait`.
- `stdlib`: `death/probabilistic-death.ts` (`rollLethal`, seeded RNG only), `death/deadly-room-transformer.ts` (`createDeadlyRoomTransformer`, follows a containing vehicle to its room), `actions/standard/deadly-room-death/` (generic action, ADR-051-clean: mutation in `execute`, emission in `report`), registered into `standardActions`.
- `engine`: auto-registers the transformer with its seeded RNG once in the constructor — every story (hand-written TS or Chord-authored) gets the hazard mechanism for free with no per-story wiring.
- Tests: `packages/world-model/tests/unit/traits/deadly-room.test.ts` (6, including seeded-determinism groundwork for AC-4), `packages/engine/tests/unit/deadly-room.test.ts` (2 — AC-2: WAIT in a deadly room kills, LOOK is harmless).

### Phase 3 — combat re-point (stdlib only)
- `packages/stdlib/src/actions/standard/attacking/attacking.ts` lethal branch: when the target is the player, now calls `killPlayer({cause:'combat', messageId:'combat.player_died', terminal:true})` instead of hand-emitting `if.event.death`; NPC-target branch unchanged.
- Resolved the Phase 1 lang-layer question: the "dangling" `combat.player_died` mapping is a messageId string (distinct from the retired event type of the same spelling) — Phase 3 reuses it as-is by emitting that messageId, zero lang-layer edits needed.
- Verified `packages/interpreter/src/context/GameContext.tsx:325` (keys off `if.event.player.died` by type only) is unaffected.
- Tests: `packages/stdlib/tests/unit/actions/attacking-player-death.test.ts` (2).

## Verification (all green, this session)
- Clean builds: world-model, stdlib, engine.
- Full suites green: world-model 1354, stdlib 1340, engine 509.
- Grep-gate: zero executable `Math.random()` in the new death/deadly-room code — RNG is always seeded/injected (determinism-by-construction, not disabling randomness).
- Confirmed `combat.player_died` is gone as a live `if.event` type (survives only as an unrelated messageId string).

## Key Decisions
1. **Sequenced platform go-ahead** — David authorized Phase 1, then gave separate explicit "continue" go-aheads for Phase 2 and Phase 3, per CLAUDE.md's platform-changes-require-discussion-first rule.
2. **Phase 2 seam: Design A** (`ParsedCommandTransformer` → generic death action) chosen over a before-action-hook alternative, correcting the plan's original wrong ADR-208-interceptor assumption — interceptors can't fire on objectless verbs (WAIT).

## Next Phase
- **Phase 4**: "Dungeo migration — fold every hand-rolled mechanism into `killPlayer`" (Large tier, 400 tool-call budget). Migrates ~10+ hand-rolled death sites (falls, gas, grue, balloon, cage, the "provoked" melee path in `melee-npc-attack.ts`, plus sphere/commanding/cake sites and the two stray `player.died` spellings) and re-points `death-penalty-machine.ts` reincarnation policy onto the canonical event. Entry state: Phases 1–3 complete (met). **Requires its own explicit platform go-ahead before starting** — not yet given.
- **Phase 5**: "Chord surface — `kill the player when`, `deadly` room marker" (Medium tier, 250 tool-call budget). Closes ADR-214 parity gap row #16. Entry state: Phase 2 complete (met) + Phase 4 complete (not yet met). Also requires its own go-ahead.

## Open Items

### Short Term
- Get David's go-ahead for Phase 4 before starting Dungeo migration.
- Phase 5 has two ungrounded items flagged in the plan: the ADR-208 interceptor registry's exact API (moot now, Phase 2 used the transformer seam instead) and the Chord room-marker grammar table / condition-evaluation trigger point — must ground these at Phase 5 start, not guess.

### Long Term
- ADR-223 children B (agent/daemon split), C (personhood) remain unblocked but unscheduled.

## Files Modified

**stdlib** (7 files):
- `packages/stdlib/src/death/kill-player.ts` - canonical `killPlayer` primitive
- `packages/stdlib/src/death/player-death-events.ts` - shared wire-type event constant/payload
- `packages/stdlib/src/death/deadly-room-transformer.ts` - `ParsedCommandTransformer` for hazard rooms
- `packages/stdlib/src/death/probabilistic-death.ts` - seeded `rollLethal` helper
- `packages/stdlib/src/actions/standard/deadly-room-death/deadly-room-death.ts` - generic death action
- `packages/stdlib/src/actions/standard/attacking/attacking.ts` - lethal branch re-point (Phase 3)
- `packages/stdlib/src/channels/standard.ts` - death channel re-pointed to canonical event

**world-model** (3 files):
- `packages/world-model/src/traits/deadly-room/deadlyRoomTrait.ts` - new trait
- `packages/world-model/src/traits/deadly-room/deadlyRoomBehavior.ts` - verb-allowlist + chance check
- `packages/world-model/src/traits/implementations.ts` - `TRAIT_IMPLEMENTATIONS` registry wiring

**engine** (2 files):
- `packages/engine/src/game-engine.ts` - post-dispatch death-routing re-check + transformer auto-registration
- `packages/engine/tests/unit/player-death-routing.test.ts` / `deadly-room.test.ts` - AC-1/AC-3/AC-2 tests

**plan** (1 file):
- `docs/work/player-death/plan.md` - authored this session; Phases 1–3 marked COMPLETE with as-built notes; Phases 4–5 PENDING

## Notes

**Session duration**: ~4 hours (plan production + Phases 1–3 implementation + verification).

**Approach**: session-planner produced a code-grounded plan (not a paraphrase of the ADR), plan-review caught a missing mechanism before coding started, then each phase proceeded only after an explicit David go-ahead — matching the sequencing pattern from the prior health-trait session.

---

## Session Metadata

- **Status**: COMPLETE — Phases 1–3 (the entire platform half of ADR-224) fully implemented and verified: clean builds, full suites green (world-model 1354, stdlib 1340, engine 509), grep-gate clean. Phases 4–5 are PENDING by design, each requiring its own separate go-ahead — this is not a blocker, it is the plan's intended stopping point for this session.
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Status is COMPLETE for the scoped work; Phase 4 ~1 session at Large/400-budget tier, Phase 5 ~1 session at Medium/250-budget tier, whenever go-ahead is given)
- **Rollback Safety**: safe to revert — all changes committed to `chord-foundations` branch, no merge to main this session.

## Dependency/Prerequisite Check

- **Prerequisites met**: `HealthTrait`/`HealthBehavior` (ADR-226, landed prior session) — `killPlayer` calls this exact API. `ctx.random` seeded-RNG pattern (precedent from `troll-daemon.ts`) — reused for the deadly-room chance roll.
- **Prerequisites discovered**: None beyond what grounding in the plan already surfaced (event-name split, extra hand-rolled sites, missing "provoked" mechanism — all plan-level corrections, not session-time discoveries).

## Architectural Decisions

- ADR-224 (Conditional/Hazard Death) is the design authority for this session; no code changes to the ADR itself.
- Pattern applied: co-located wire-type sharing (DEVARCH rule 8b) — `PLAYER_DIED_EVENT`/`IPlayerDiedPayload` defined once in stdlib, imported by both the death channel and the engine.
- Pattern applied: ADR-051 four-phase action discipline for the new `deadly-room-death` action (mutation in `execute`, emission in `report`).
- Seam correction recorded in the plan: ADR-208 interceptors do not cover objectless-verb hazards; `ParsedCommandTransformer` is the correct seam for this class of trigger going forward.

## Mutation Audit

- Files with state-changing logic modified: `kill-player.ts` (`HealthTrait.dead`/`causeOfDeath` write via `HealthBehavior.kill`), `deadlyRoomBehavior.ts` (verb/chance check, no direct mutation — delegates to `killPlayer` via the action), `deadly-room-death.ts` action (`execute` calls `killPlayer`), `attacking.ts` lethal branch (calls `killPlayer` on player-target lethal hits), `game-engine.ts` (post-dispatch `isPlayerDead` re-check driving `stop('defeat', ...)`).
- Tests verify actual state mutations (not just events): YES — `kill-player.test.ts` asserts `HealthTrait.dead`/`causeOfDeath` directly; `player-death-routing.test.ts` AC-3 asserts the player is alive and relocated after a veto, not just that no event fired; `deadly-room.test.ts` (both packages) asserts on `game.lost`/death outcome, not return values alone; `attacking-player-death.test.ts` asserts `HealthTrait.dead`/`causeOfDeath` plus the emitted event type.
- If NO: N/A

## Recurrence Check

- Similar to past issue? YES — `session-20260715-1900-chord-foundations.md` (health-trait session) used the identical pattern: grounded plan correcting ADR prose, phased platform implementation with per-phase go-ahead, full-suite verification at each phase boundary. This session repeated that pattern successfully; no new systemic issue, just a proven workflow reused.
- If YES: No audit needed — this is the established, working session shape for platform ADR implementation, not a recurring defect.

## Test Coverage Delta

- Tests added: 16 (4 kill-player + 2 engine player-death-routing + 6 world-model deadly-room + 2 engine deadly-room + 2 attacking-player-death).
- Tests passing before: N/A (not measured pre-session) → after: world-model 1354, stdlib 1340, engine 509 — all green.
- Known untested areas: Phase 4 real-path Dungeo migration (falls/gas/grue/balloon/cage/melee "provoked" death, reincarnation policy re-point) — by design, deferred to Phase 4, not yet started. Phase 5 Chord-surface parity likewise deferred.

---

**Progressive update**: Session completed 2026-07-15 23:18
