# Session Summary: 2026-10-02 - feat/segmented-test-tree (finished on main, 2026-10-03)

## Goals
- Locate the author-narrative-testing objective, archive the DONE ADR-355 plan, merge feat/segmented-test-tree into main.
- Plan the remaining narrative rows and start executing (Phases 1 and 3).

## Phase Context
- **Plan**: docs/work/author-narrative-testing/plan-20261002-remaining-rows.md (10 phases; `.current-plan` points to it; objective Spawned work updated)
- **Phase executed**: Phase 1 (narrative table and objective refresh) and Phase 3 (story-agnostic holds suite) — both DONE
- **Tool calls used**: not read from state file for this write
- **Phase outcome**: Phases 1 and 3 completed; Phase 2 (David's G1 scope rulings) is next. Plan phase statuses were flipped by the main session, not by this writer.

## Completed

### ADR-355 close-out (earlier checkpoints)
- Plan archived by hand (84500ad7a), feat/segmented-test-tree merged to main (43e851807), main pushed (4ae74963e). Archive-path references repointed in ADR-355/340/307/353 and the objective.

### Remaining-rows plan
- session-planner wrote docs/work/author-narrative-testing/plan-20261002-remaining-rows.md. Verified table: 11 of 15 rows shipped; remaining = arranging beyond the floor (occurrence ordinals unbuilt, #525), effect-less bodies / command-none rows (unplanned), explorer lenses (dev CLIs only), testing navigation (ADR-308 cursory DRAFT, Q-1..Q-5 open).

### Phase 1
- Narrative table segmented-tree row now "merged to main 2026-10-02 (43e851807)", table header date 2026-10-02; objective gained a dated Progress line "11 of 15" beside the untouched baseline; plan Phase 2 cross-refs fixed (Phases 5,7,8,9).

### Phase 3
- New `scripts/__tests__/support/story-under-test.ts`: `resolveStory`, `storiesUnderTest` (fernhill + `NARRATIVE_STORY` env), memoized async `spawnCliAsync`/`runTestJsonAsync`/`runStoryTest` (async because secret-letter's ~90s sync spawn tripped a vitest worker RPC timeout).
- New `scripts/__tests__/narrative-holds.test.ts`: story-agnostic beat claims via `describe.each`; tool claims and story claims in separate cases. `fernhill-run.ts`: extracted `decodeTestRun`, added `lineLabel`.
- Command: `NARRATIVE_STORY=branch-stories/<story> pnpm test:scripts narrative-holds`.
- Evidence, 2026-10-02 [reported by session, unverified — event log not re-checked by this writer]: fernhill + ides-of-march 26 passing, 0 failures; secret-letter 40 passing, 3 failures, all story claims (32 rooms unplaced on the Map, 40 unreached, 53 derived rows failing, many ENTITY_NOT_FOUND on showing/giving, possibly tester-side — look before the 10-06 checkpoint); every tool claim green; no worker timeout after the async fix.

### GH #554 fix
- 9 failures in narrative-endings/pinned-prose/playing-through/rule-tests-itself on main since the ADR-355 merge (lines keyed by segment id, names moved to `label`); verified pre-existing by git stash. The pre-push gate (turbo test:ci) does not run test:scripts. On David's go: suites match by `lineLabel` and the main line by the tree's root segment id; added a `lineLabel` test. Final `pnpm test:scripts`: 93 passing, 0 failures, 15 files [reported by session, unverified]. The (uncommitted) commit is to carry "closes #554"; #554 is still open in the store at this write.

## Key Decisions

### 1. Holds suite is async and story-agnostic
Sync spawn of a ~90s story run starved the vitest worker; memoized async runner shared across cases. Tool claims are kept apart from story claims so a story's content failure does not read as a tool defect.

### 2. Process note
core-concepts README was read late (after the first edits), not before; owned in conversation.

## Next Phase
- **Phase 2**: David's four G1 scope rulings (lenses, effect-less bodies, occurrence ordinals, navigation); navigation needs the ADR-308 interview by ~10-07.
- **Then Phase 4**: checkpoint run on 2026-10-06 against whatever exists of his story.
- **Entry state**: changes below are uncommitted on main.

## Open Items

### Short Term
- 554: Four fernhill narrative suites fail on main since the ADR-355 merge (fixed in working tree; closes on commit)
- 525: Next arrange shapes to build, ranked by secret-letter's SKIPPED count

### Long Term
- 539: plan-archive.sh hardcodes plan.md, but this repo names plans plan-YYYYMMDD-{name}.md

## Files Modified

**Docs** (3 files): docs/objectives/author-narrative-testing.md, docs/work/testing-narrative/narrative-20260926-author-testing.md, docs/work/author-narrative-testing/ (new plan), docs/context/.current-plan
**Tests** (8 files): scripts/__tests__/narrative-{endings,pinned-prose,playing-through,rule-tests-itself,support}.test.ts, support/fernhill-run.ts (modified); narrative-holds.test.ts, support/story-under-test.ts (new)

## Notes

No `packages/` changes this session. Earlier-checkpoint items (archive by hand, I-553 duplicate closed as `duplicate of 539`, branch not deleted) stand. Nothing committed after 4ae74963e.

---

## Session Metadata

- **Session**: b32782
- **Status**: COMPLETE (unverified: test counts for narrative-holds runs and the final pnpm test:scripts 93-passing run)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (uncommitted working tree changes)

## Dependency/Prerequisite Check

- **Prerequisites met**: built CLI bundle for test:scripts.
- **Prerequisites discovered**: none beyond the missing story-agnostic runner, built this session.

## Architectural Decisions

None this session.

## Mutation Audit

- Files with state-changing logic modified: N/A (test-support code only)
- Tests verify actual state mutations: N/A

## Recurrence Check

- Similar to past issue? YES — #539 (plan-archive.sh plan.md hardcode), second occurrence already commented earlier.

## Test Coverage Delta

- Tests added: narrative-holds.test.ts plus a `lineLabel` test (counts not itemized)
- Passing before: 9 failing in four suites on main → after: 93 passing, 0 failures, 15 files [reported by session, unverified]
- Known untested areas: secret-letter story claims (3 failures, possibly tester-side)

---

**Progressive update**: checkpoint 2026-10-02 03:25 — first write: plan archive, ADR path repoints, merge to main in progress
**Progressive update**: checkpoint 2026-10-02 03:28 — archive commit 84500ad7a and merge 43e851807 landed; merge marked done, push to origin in progress
**Progressive update**: session completed 2026-10-03 01:32 — remaining-rows plan, Phases 1 and 3 done, #554 fixed in working tree; promoted from IN-FLIGHT
