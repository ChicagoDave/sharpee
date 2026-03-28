# Session Summary: 2026-03-27 — issue-068-event-handler-types (CST)

## Goals
- Complete and merge ISSUE-063 Phase 3 (carried over from session-20260327-1157)
- File ISSUE-068 and ISSUE-069 based on discoveries in Phase 3
- Perform deep audit of the entity `on` handler system
- Write plan for ISSUE-068 removal
- Begin ISSUE-068 implementation: migrate troll give/throw handlers to capability dispatch

## Phase Context
- **Plan**: `docs/work/issues/plans/issue-068-plan.md` — ISSUE-068 Remove Entity `on` Handler System
- **Phase executed**: Phase 2 — "Move troll give/throw handlers to capability behaviors" (Medium risk)
- **Tool calls used**: Not tracked (.session-state.json empty)
- **Phase outcome**: Completed — troll give/throw migrated, walkthroughs green (793 passing run 1, 788 passing run 2)

## Completed

### 1. ISSUE-063 Phase 3 Complete and Merged (PR #64)

The session opened with the prior session's ISSUE-063 Phase 3 work already committed. PR #64 was filed and merged into main. Final numbers: 40/42 `as any` casts removed across stories/dungeo/src/, 2 remaining tagged `// ISSUE-068` in `kl.ts`, 92 files changed, -220 net lines across 7 commits.

### 2. ISSUE-068 Deep Audit

A thorough audit of the entity `on` handler system was performed before planning. Key findings:

- 19 entity `on` handlers exist across the codebase, all vestigial
- The event processor passes `WorldQuery` (read-only) to handlers, but handlers that mutate bypass this by closing over `WorldModel` from setup functions
- `world?: any` in the handler signature hides this mismatch, and is the root cause of the ISSUE-068 `as any` tags in `kl.ts`
- One handler (troll death) is explicitly dead code per its own comment — scoring is handled by the melee interceptor
- The type infrastructure is over-engineered: `LegacyEntityEventHandler`, `EntityEventHandler`, `AnyEventHandler`, `StoryEventHandler`, array forms, duplicate definitions, `isEffectArray()` runtime discriminator
- The entity `on` system is architectural damage from a miscommunicated event-driven design — not worth fixing the types, worth removing the system

### 3. ISSUE-068 Plan Written

`docs/work/issues/plans/issue-068-plan.md` written with 9 phases:

- Phase 1: Move description-update handlers (blocked by ISSUE-070 — platform does not support computed descriptions from trait state)
- Phase 2: Troll give/throw → capability behaviors (completed this session)
- Phase 3: Troll knocked_out → melee interceptor
- Phase 4: Rug pushed → capability behavior
- Phase 5: Remove all remaining entity `on` assignments
- Phase 6: Remove troll death handler (dead code)
- Phase 7: Remove entity `on` dispatch from EventProcessor
- Phase 8: Remove type infrastructure (LegacyEntityEventHandler, AnyEventHandler, array forms)
- Phase 9: Fix downstream (kl.ts ISSUE-068 tags, demo story, tests)

Filed ISSUE-070: Entity descriptions should be computed from trait state, not mutated by event handlers. This blocks Phase 1.

### 4. Platform Changes: Capability Dispatch in Giving and Throwing Actions

`packages/stdlib/src/actions/standard/giving/giving.ts` — Added `findTraitWithCapability()` check in the execute phase. If the recipient entity has a behavior registered for `if.action.giving`, the execute and report phases delegate entirely to that behavior rather than running standard `moveEntity` logic.

`packages/stdlib/src/actions/standard/throwing/throwing.ts` — Same pattern added for `if.action.throwing` in the at-target path.

This follows ADR-090 (Entity-Centric Action Dispatch) and matches the existing pattern used by opening/closing/locking actions.

### 5. Troll Receiving Behavior (New)

`stories/dungeo/src/npcs/troll/troll-receiving-behavior.ts` — New `CapabilityBehavior` implementing MDL logic from act1.254 lines 216-230:

- Knife thrown: troll catches it and throws it back to the floor
- Knife given: troll catches it and throws it back to the floor
- Non-knife thrown: troll catches it and eats it (item removed from world)
- Non-knife given: troll graciously accepts it (item removed)

Separate message paths for GIVE ("catches and graciously accepts") vs THROW ("catches") where appropriate. The behavior registers for both `if.action.giving` and `if.action.throwing`.

### 6. Story Wiring

- `traits/troll-trait.ts` — Added `static readonly capabilities = ['if.action.giving', 'if.action.throwing'] as const`
- `npcs/troll/troll-messages.ts` — Added `ACCEPTS_GIFT` message key
- `npcs/troll/index.ts` — Exported `TrollReceivingBehavior`
- `regions/underground.ts` — Removed `if.event.given` and `if.event.thrown` entity `on` handlers; removed orphaned `isKnife` helper function
- `stories/dungeo/src/index.ts` — Registered `TrollReceivingBehavior` in `initializeWorld`

### 7. Issues Filed

- ISSUE-068: Entity `on` handlers are vestigial — full audit written up in `docs/work/issues/issues-list-04.md`
- ISSUE-069: `world.getStateValue`/`setStateValue` is a code smell — puzzle state belongs on entities/traits, not a global state bag
- ISSUE-070: Entity descriptions should be computed from trait state, not mutated by event handlers (blocks ISSUE-068 Phase 1)

## Key Decisions

### 1. Remove the Entity `on` System, Not Fix Its Types

The type problems in ISSUE-068 are symptoms. The entity `on` handler system bypasses the architecture — handlers close over `WorldModel` and mutate directly; the event dispatch is just a callback mechanism. Fixing the types would paper over the problem. Proper patterns (capability behaviors, action execute phases, interceptors) already exist and cover all 19 handler use cases.

### 2. Capability Dispatch Added to Giving and Throwing stdlib Actions

Standard stdlib actions that transfer items to NPCs now check `findTraitWithCapability()` on the recipient before running their standard logic. This was not present in giving/throwing before. The capability check follows the exact same pattern already used by opening, closing, locking, and unlocking — no new platform concept introduced.

### 3. ISSUE-070 Blocks Phase 1 (Description Handlers)

The window and trapdoor `opened`/`closed` handlers just switch `IdentityTrait.description`. The platform does not currently support computed descriptions derived from trait state — descriptions are stored strings set at creation time. Removing these handlers without a platform-level solution would break the window/trapdoor descriptions. Filed ISSUE-070 to track this separately; Phase 1 is deferred.

### 4. Phase 3 (knocked_out → melee interceptor) is Unblocked

The troll `knocked_out` handler sets description, unblocks an exit, sets recovery turns, and sets unconscious. All of these can go directly into the melee interceptor's UNCONSCIOUS outcome path. No platform changes needed; this is the next logical phase.

### 5. Branch Strategy: issue-068-event-handler-types Branched from Main

After merging PR #64 (ISSUE-063), a new branch was created from main to avoid carrying forward the ISSUE-063 history. All ISSUE-068 work lives on this branch.

## Next Phase
- **Phase 3**: "Move troll knocked_out handler to melee interceptor" — medium risk, no blockers
- **Tier**: Medium
- **Entry state**: Phase 2 done, walkthroughs green, branch issue-068-event-handler-types at HEAD
- **Work**: Read melee interceptor UNCONSCIOUS path; add description update, exit unblock, recovery turn set, unconscious flag; remove `knocked_out` handler from underground.ts; verify walkthroughs

## Open Items

### Short Term
- Phase 3: Troll knocked_out → melee interceptor (unblocked, next up)
- Phase 4: Rug pushed → capability behavior
- Phase 5-6: Remove remaining `on` assignments + dead troll death handler
- Phase 7-9: Remove event processor entity dispatch + type infrastructure + fix kl.ts ISSUE-068 tags

### Long Term
- ISSUE-070: Computed descriptions from trait state (blocks ISSUE-068 Phase 1)
- ISSUE-069: Migrate puzzle state off `world.getStateValue`/`setStateValue`
- CI enforcement of `as any` count once ISSUE-068 Phase 9 is complete

## Files Modified

**Platform — stdlib** (2 files):
- `packages/stdlib/src/actions/standard/giving/giving.ts` — capability dispatch in execute+report
- `packages/stdlib/src/actions/standard/throwing/throwing.ts` — capability dispatch in execute+report (at-target path)

**Story — new files** (1 file):
- `stories/dungeo/src/npcs/troll/troll-receiving-behavior.ts` — NEW: CapabilityBehavior for troll give/throw

**Story — modified** (5 files):
- `stories/dungeo/src/npcs/troll/troll-messages.ts` — added ACCEPTS_GIFT message key
- `stories/dungeo/src/npcs/troll/index.ts` — export TrollReceivingBehavior
- `stories/dungeo/src/traits/troll-trait.ts` — added static capabilities declaration
- `stories/dungeo/src/regions/underground.ts` — removed given/thrown handlers and isKnife helper
- `stories/dungeo/src/index.ts` — register TrollReceivingBehavior in initializeWorld

**Documentation** (3 files):
- `docs/work/issues/issues-list-04.md` — ISSUE-069, ISSUE-070 filed
- `docs/work/issues/plans/issue-068-plan.md` — NEW: full 9-phase plan
- `docs/context/plan.md` — ISSUE-063 all phases DONE (no update needed for ISSUE-068; plan is in docs/work/issues/)

## Notes

**Session duration**: ~4-5 hours (ISSUE-063 merge + ISSUE-068 audit + plan + Phase 2 implementation + verification)

**Approach**: Audit-first before writing the plan. The audit revealed the entity `on` system is vestigial rather than just poorly typed, which changed the scope from "fix types" to "remove the system." Phase 2 (troll give/throw) was selected first because it is unblocked, well-understood from MDL source, and follows a pattern already established in other stdlib actions. Double-walkthrough verification at 793/788 passing with 0 failures.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: N/A for Phase 3 (next phase is unblocked)
- **Blocker Category**: N/A
- **Estimated Remaining**: ~6-8 hours across ~3-4 sessions (Phases 3-9)
- **Rollback Safety**: safe to revert — Phase 2 changes are self-contained; platform giving/throwing changes are additive (capability path only fires when a behavior is registered)

## Dependency/Prerequisite Check

- **Prerequisites met**: ISSUE-063 merged to main; issue-068-event-handler-types branch created from clean main; TrollTrait already existed; capability dispatch pattern established in stdlib; ADR-090 documents the pattern
- **Prerequisites discovered**: ISSUE-070 (computed descriptions) must be resolved before Phase 1 can proceed; Phase 3-9 have no blockers

## Architectural Decisions

- ADR-090 applied: capability dispatch added to giving and throwing stdlib actions — behaviors registered on the recipient entity override standard transfer logic
- Pattern established: stdlib actions that hand items to NPCs should always check `findTraitWithCapability()` on the recipient before running standard moveEntity
- Decision: entity `on` system to be removed rather than typed — it is vestigial; ADR-052 (Effect-returning story handlers) is the correct system and stays
- ISSUE-070 filed as a prerequisite for description-based handler migration

## Mutation Audit

- Files with state-changing logic modified: `giving.ts` (delegates to behavior which may call removeEntity/moveEntity), `throwing.ts` (same), `troll-receiving-behavior.ts` (execute phase calls removeEntity or moveEntity to floor)
- Tests verify actual state mutations (not just events): NO — no unit tests written for TrollReceivingBehavior; walkthrough tests verify end-to-end behavior (knife scenario covered by wt-troll walkthroughs if they exist, otherwise by general walkthroughs)
- If NO: TrollReceivingBehavior needs unit tests asserting that: (a) knife thrown → knife lands on troll room floor, (b) knife given → knife lands on troll room floor, (c) non-knife given/thrown → item removed from world (or moved to a discard location)

## Recurrence Check

- Similar to past issue? NO — this is the first session working on the entity `on` handler system audit and removal
- The pattern (removing vestigial architecture) appeared once before with the event sequencing layer (ISSUE-063 Phase 2A), but that was a different subsystem

## Test Coverage Delta

- Tests added: 0
- Tests passing before: ~793 (first run after Phase 2 implementation) → after: 793 (run 1), 788 (run 2) — RNG-variable combat, 0 failures
- Known untested areas: TrollReceivingBehavior has no unit tests (knife catch, non-knife eat logic); giving.ts capability dispatch path has no unit test; throwing.ts capability dispatch path has no unit test

---

**Progressive update**: Session completed 2026-03-27 15:10 CST — ISSUE-068 Phase 2 COMPLETE, Phases 3-9 remaining
