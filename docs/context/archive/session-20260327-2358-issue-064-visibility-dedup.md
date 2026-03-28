# Session Summary: 2026-03-27 - issue-064-visibility-dedup (CST)

## Goals
- Delegate `StandardScopeResolver.canSee()` to `world.canSee()` to eliminate a stale reimplementation of visibility logic in stdlib (ISSUE-064 Phase 4)

## Phase Context
- **Plan**: `docs/context/plan.md` — ISSUE-064 and ISSUE-065 Visibility Deduplication and Scope System Audit
- **Phase executed**: Phase 4 — "Delegate StandardScopeResolver.canSee() to world.canSee() (ISSUE-064 follow-on)" (Small)
- **Tool calls used**: 44 / 100
- **Phase outcome**: Completed under budget

## Completed

### Delegation of StandardScopeResolver.canSee()
- Replaced a 30-line reimplementation in `packages/stdlib/src/scope/scope-resolver.ts` with a one-liner: `return this.world.canSee(actor.id, target.id)`
- Removed 4 dead private helpers that were exclusively reachable through the old `canSee`: `isInDarkness`, `hasLightSource`, `isLightSource`, `isVisibleInContainer`
- Removed 2 unused imports: `SwitchableTrait`, `IdentityBehavior`
- Retained `getContainingRoom` (used by 6 other callers in the same file)

### Test Updates to Match Correct Behavior
- `packages/stdlib/tests/unit/scope/scope-resolver.test.ts` — `getVisible` and `getReachable` counts updated (3→4 and 2→3) because `VisibilityBehavior` correctly makes the room itself visible to its occupant
- `packages/stdlib/tests/unit/actions/taking-golden.test.ts` — "take a room" now correctly produces `if.action.taking.cant_take_room` instead of `scope.not_known`; room is visible, just not takeable
- `packages/stdlib/tests/unit/scope/sensory-extensions.test.ts` — Darkness tests rewritten to use `RoomTrait.isDark` and `LightSourceTrait` instead of stale `customProperties` hacks; added proper trait imports

### Behavioral Improvements Gained
The delegation surfaces previously unavailable behaviors from `VisibilityBehavior.canSee()`:
- Self-visibility: actor always sees self
- Transparent containers: properly handled via `isContainmentPathClear`
- SceneryTrait: invisible entities blocked
- Visibility capabilities: pluggable via capability dispatch
- Room visibility: observer always sees their room (even in darkness)
- Darkness special cases: lit light sources and carried items visible in dark rooms

## Key Decisions

### 1. Delegation over consolidation
Rather than merging classes or creating an adapter, a one-liner delegation was used. `StandardScopeResolver` still owns the `ScopeResolver` interface contract and just calls through to the canonical implementation in `VisibilityBehavior`. Minimal surface area changed; maximum correctness gained.

### 2. Test updates reflect correct behavior, not regressions
The room being visible to its occupant and darkness relying on `RoomTrait.isDark` are improvements uncovered by the delegation. Tests were updated to match the now-correct behavior rather than locking in the stale behavior.

## Next Phase
Plan complete — all phases done. Both ISSUE-064 and ISSUE-065 are resolved.

## Open Items

### Short Term
- Commit and push the branch
- Open PR to merge `issue-064-visibility-dedup` into main

### Long Term
- None from this session

## Files Modified

**Stdlib scope resolver** (1 file):
- `packages/stdlib/src/scope/scope-resolver.ts` — delegation + dead code removal

**Test files** (3 files):
- `packages/stdlib/tests/unit/scope/scope-resolver.test.ts` — room visibility counts
- `packages/stdlib/tests/unit/actions/taking-golden.test.ts` — room taking error code
- `packages/stdlib/tests/unit/scope/sensory-extensions.test.ts` — proper darkness setup via traits

## Notes

**Session duration**: ~1 hour

**Approach**: Read the existing implementation to identify each dead helper, delegated in a single edit, then fixed the three test files whose expectations reflected the old stale behavior rather than the intended correct behavior.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: `WorldModel.canSee()` existed and delegated to `VisibilityBehavior.canSee()`; stdlib tests were already structured for easy count adjustments
- **Prerequisites discovered**: None

## Architectural Decisions

- Pattern applied: delegation to canonical implementation — `StandardScopeResolver.canSee()` now calls `world.canSee()` rather than maintaining a parallel implementation
- No new ADRs created this session

## Mutation Audit

- Files with state-changing logic modified: None (scope-resolver.ts is read-only query logic)
- Tests verify actual state mutations (not just events): N/A — this session touched query/visibility logic, not mutations

## Recurrence Check

- Similar to past issue? NO — prior sessions in this branch addressed `VisibilityBehavior` internal deduplication (Phase 1) and scope system naming (Phases 2–3); Phase 4 is the final follow-on to ensure stdlib delegates instead of reimplementing

## Test Coverage Delta

- Tests added: 0 (3 test files modified with updated expectations)
- Tests passing before: stdlib 1111, world-model 1110 → after: stdlib 1111, world-model 1110
- Walkthrough chain: 815 passing across 17 transcripts (RNG-flakey thief confirmed clean on third run)
- Known untested areas: None introduced this session

---

**Progressive update**: Session completed 2026-03-27 23:58 CST
