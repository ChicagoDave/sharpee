# Session Summary: 2026-09-29 - feat/segmented-test-tree (CDT)

## Goals
- Pre-Phase-3 prep for ADR-355 (segmented test tree): rebuild stale bundle, classify baseline failures, fix what blocks a clean Phase 3 baseline.

## Phase Context
- **Plan**: docs/work/segmented-test-tree/plan-20260929-adr-355.md
- **Phase executed**: none — Phase 3 "Testing surface, bridge, run-event line id, and both heads" (Large, 400 budget) is CURRENT and not started; this session was prep.
- **Tool calls used**: 54 / 400 (state file, at read time)
- **Phase outcome**: Partially completed (prep only; Phase 3 untouched)

## Completed

### Bundle rebuild
- `./repokit build dungeo` rebuilt stale dist/cli/sharpee.js (exit 0), per Desktop Claude's note.

### Baseline classification (docs/work/segmented-test-tree/baseline/)
- Secret Letter 56 failures, all derived rule tests (ADR-356): 30 ENTITY_NOT_FOUND, 10 blocked before the rule, 8 state unchanged, 5 location mismatch, 3 offstage-as-undefined.
- The Alderman 5: 1 authored card (9yr07e55 pins engine id "npcId":"a05"; Viola is now a04), 4 derived (wrong response variant).
- Classification is from reading failure messages, not confirmed in code.
- Filed GH #548 (offstage location pins always fail) and GH #549 (derived rule tests don't set up rule preconditions; O-1 noise risk), cross-linked.

### #548 fix (uncommitted)
- packages/transcript-tester/src/assertion-core.ts: `resolveValue` treats `offstage` like `nowhere` (undefined); location verdicts print an absent location as "offstage".
- packages/transcript-tester/tests/pin-forms.test.ts: three new tests against a real WorldModel.

## Key Decisions

### 1. Fix in the assertion core
The offstage fix lives in assertion-core.ts, shared by both runtimes, not in the derived runner.

## Next Phase
- **Phase 3**: "Testing surface, bridge, run-event line id, and both heads" — Large, 400 budget.
- **Entry state**: commit closing #548 lands first.

## Open Items

### Short Term
- 548: Offstage location pins always fail — fixed in working tree, not committed; close with the commit.
- 549: Derived rule tests don't set up rule preconditions — open; blocks trusting the 53 remaining Secret Letter derived failures.

### Long Term
- None new.

## Files Modified

**Source/tests** (2 files):
- `packages/transcript-tester/src/assertion-core.ts` - offstage handling in resolveValue and location verdict text
- `packages/transcript-tester/tests/pin-forms.test.ts` - 3 offstage pin tests

**Other dirty (not attributed to this session's work)**: genai-api/index.md, genai-api/tooling.md, stories/dungeo/src/version.ts (likely build-regenerated), deleted docs/context/session-20260907-0222-feat-secret-letter-port.md (pre-existing dirty).

## Notes
- The session's own file is 0301; session-20260929-0052-feat-segmented-test-tree.md is session e31b07's.
- Pre-session audit: 168 open issues, tsc clean.

---

## Session Metadata

- **Session**: 7f0033
- **Status**: IN-FLIGHT
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: fresh bundle from `./repokit build dungeo`.
- **Prerequisites discovered**: #549 must be understood before Secret Letter derived failures can serve as a clean regression baseline.

## Architectural Decisions

None this session.

## Mutation Audit

- Files with state-changing logic modified: none (assertion evaluation is read-only over the world).
- Tests verify actual state mutations: N/A

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: 3 (pin-forms.test.ts)
- transcript-tester: 361 passing, 0 failures (`pnpm --filter test`, 2026-09-29 03:05, after last edit to assertion-core.ts).
- branch-tester: 270 passing, 0 failures (2026-09-29 03:08); this verifies the 270 that the prior session reported unverified.
- After rebuild, `./sharpee test branch-stories/secret-letter` derived failures 56 → 53; diff vs baseline is exactly the three offstage rows flipping to pass.
- Known untested areas: #549 precondition setup (unfixed).

---

**Progressive update**: checkpoint 2026-09-29 03:13 — first write: prep work, #548 fix (uncommitted), #549 filed, evidence recorded.
