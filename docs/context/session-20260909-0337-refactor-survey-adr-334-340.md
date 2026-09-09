# Session Summary: 2026-09-09 - refactor/survey-adr-334-340 (03:37 CDT)

## Goals
- Answer "game-engine.ts is still 2120 lines — did we do the best refactoring?" with evidence from the file, then reconcile with an external senior review David pasted.
- Plan the follow-on to ADR-334: extract the residue left in `packages/engine/src/game-engine.ts` after the survey's Phase 16, in David's approved order (turn helper bodies into stages; story-info projection; introspect out; setStory as ordered install steps; small-stuff batch; parser adapter), each phase byte-identical on the survey's gate.

## Phase Context
- **Plan**: `docs/work/game-engine-residue/plan.md` — continue ADR-334's decomposition of `packages/engine/src/game-engine.ts` beyond the turn (survey Phases 15-16, now archived); each phase lands byte-identical on the survey's gate (Dungeo walkthrough chain, three Chord trees, engine suite ≥708 passing).
- **Phase executed**: Phase 0 — "ADR-334 Amendment A1 and the storyInfo precedence finding" (Small, budget 100)
- **Tool calls used**: 133 / 100 (over budget — session paused mid-phase at David's request rather than closing it)
- **Phase outcome**: Partially completed — paused before the phase's exit state was reached

## Completed

### Assessment of the 2120-line facade
- Session start: recap presented; `pre-session-audit` relayed (clean, no active plan, type check clean); profile 5 days old (fresh); gate cleared; core concepts read in full.
- Broke down the 2120 lines (03:00 CDT): ~236 header/fields; ~500 lifecycle (constructor, `setStory`, `start`, `stop`, `resume`); 139 `introspect()`; ~530 turn-only private helpers reached only through `turnEngine()` (17 methods, every one with the adapter as its sole caller — the Phase 16 summary's claim that "other paths also call" them stopped being true once the meta/input-mode paths moved into stages); ~700 facade proper.

### Reconciling four external reviewer assessments against the source
- Verified every factual claim in the first review (03:20 CDT): the storyInfo precedence contradiction (`setStory` config-wins vs `refreshStoryInfoCapability` trait-wins for description/buildDate — latent in Dungeo because `stories/dungeo/src/index.ts:217` fills the trait from config); two `Date.now()` in `stop()`; five trait-access idioms incl. `get<ActorTrait>('actor')`; the unguarded cast in `registerBlockedReferent`; unused `vocabularyRegistry` import; three `console.error`; shallow `getContext()`; module-level `channelRegistry` singleton (`packages/stdlib/src/channels/registry.ts:75`).
- Declined from the review, with reasons given to David: injecting every subsystem into the constructor; per-stage role interfaces narrower than `TurnStageContext`; removing the public `getX` accessors (D5); deepening `getContext()`.
- Three further assessments (`docs/work/engine-refactor/ddd-assessment-2.md`, `-3.md`, `-4.md`, untracked) read and reconciled against the code, each claim verified before folding in: `-2.md` and `-3.md` fed the plan's Phase 4 load-result constraint, Phase 1's getter re-judgment rule, Phase 2's three-way storyInfo precedence rule (authored config-wins, build-pipeline trait-wins, prologue resolved — gate exposure verified: story-loader creates no `StoryInfoTrait`, no post-`setStory` `buildDate` writer), Phase 5(a)'s tightening of three `T | undefined` getters, and withdrawal of a proposed single-publisher item as a false DRY (three bodies read, they differ in order and side effects). `-4.md` (package shape) verified `package.json` exports only `"."`, `index.ts` is `export *` over sixteen modules, six root modules have `game-engine.ts` as sole internal consumer, and 48 of 98 engine test files import root `src/` modules by path; the full consumer inventory of `@sharpee/engine` (78 files, 18 named symbols plus devkit's runtime `require` of `lintUnusedSnippetEntries` and the umbrella/runtime-surface re-export sets) is recorded in the plan.

### Plan creation and review
- `session-planner` ran (03:45 CDT): `docs/work/game-engine-residue/plan.md`, Phase 0 CURRENT.
- Plan grew to 9 phases (0-8) as the four assessments were folded in: Phase 3 moves the five introspection types with the function; Phase 4 moves the validators as files into `install/`; Phase 6 opened for discussion (seven guard sites, one `Parser` implementation, a proposed adapter shape); Phases 7 (directory moves, byte-identical by construction) and 8 (`index.ts` narrowing, the one real API change) added PENDING pending David's confirmation since they widen the plan beyond `game-engine.ts`; expected end state ~1200 lines; a "considered and deferred" section for `Session`, `PlayerRole`, the validators, the `setStory` rename, and the Phase 2-first reorder.
- `/devarch:plan-review` run: 2 CONTRADICTIONs (I-71ed1a-3 force-build step missing from Phases 3/7/8; A1 narrower than the plan's D5/AC-5 departures) and 5 TENSIONs. David ruled: (1) continue on `refactor/survey-adr-334-340`, the survey's branch, unmerged — the branch merges to `main` once when this plan closes; (2) A1 is the complete departure list, recorded once at Phase 0; (3) Phases 7 and 8 confirmed, Phase 8 gets its own ADR. All rulings and fixes are applied in the plan.
- GitHub issues filed: #393 (shared `channelRegistry` singleton), #394 (player identity has two serialized sources of truth, with the restore-path failure mode).

### Gate infrastructure staged, baseline build run
- Gate scripts (`gate-stage.sh`, `compare-gates.sh`, `run-gates.sh`) and the survey's baseline/phase16 captures copied from the prior session's scratchpad into this session's scratchpad under `gates/` and repointed.
- `./repokit build dungeo` run (04:20 CDT): exit 0, `dist/cli/sharpee.js` 4,419,349 bytes — the same size as the survey's Phase 16 bundle, as expected. Verified directly: the build log (`gates/build-residue-baseline.log`) ends "✓ Build complete" / "bundle: dist/cli/sharpee.js (4419349 bytes)" / "=== build complete ===", and the bundle on disk (`dist/cli/sharpee.js`, mtime 04:20 CDT) matches that size — timestamped after the last plan edit this session, so the evidence is fresh. `run-gates.sh`/`compare-gates.sh` against the survey's Phase 16 baseline were not yet run.

## Key Decisions

### 1. Continue on the survey branch; Amendment A1 recorded once, at Phase 0
David ruled the residue plan is the same work as ADR-334's decomposition and stays on `refactor/survey-adr-334-340` rather than opening a new branch; Amendment A1 (reopening D5 for `setStory` and `introspect()` only) is the complete list of this plan's departures, written once in Phase 0 rather than amended again at each later phase.

### 2. Phases 7 and 8 confirmed; Phase 8 gets its own ADR
David confirmed the package-layout and export-narrowing phases surfaced by `ddd-assessment-4.md` ("this is what I was driving towards, even though I didn't know it until now") — Phases 1-6 shrink the facade, Phases 7-8 give the package a layout and a contract. Phase 8 is a real public-API change and is scoped to its own ADR rather than folded into ADR-334.

### 3. channelRegistry singleton is a GitHub issue, not a plan phase
The module-level `channelRegistry` singleton found during review is filed as GH #393 rather than added to this plan's scope.

## Next Phase
Phase 0 did not close this session — it remains **CURRENT**, resumed rather than advanced. Remaining steps, per the plan:
1. Write ADR-334 Amendment A1 into the ADR (departures (i)-(iv), the conditional `setStory`→`installStory` rename, and a Scope-line note) — **decided by David, not yet written**.
2. Record the storyInfo precedence finding as a note alongside A1 (feeds Phase 2).
3. Run `run-gates.sh` against the fresh `residue-baseline` build, then `compare-gates.sh` against the survey's `baseline`/`phase16` captures — expected IDENTICAL; record the table inline in the plan under Phase 0.
- **Entry state for resuming**: build already run and verified (item above); gate scripts staged at the session scratchpad (`gates/`, scripts repointed, survey `baseline/` and `phase16/` captures present). A refreshed session gets a new scratchpad — copy `gates/` across first before resuming.

## Open Items

`devarch items` is installed and functional in this environment (v8.2.0, confirmed via `devarch items list --json`) — the earlier assumption that it was unavailable does not hold. Checked `devarch items list --all --json` for anything tied to this session, the residue plan, `channelRegistry`, storyInfo, or player identity: nothing found, and nothing is opened this session.

### Short Term
- None. Phase 0's remaining steps (write ADR-334 Amendment A1, record the storyInfo finding, run the gate comparison) are tracked in the plan (`docs/work/game-engine-residue/plan.md`, Phase 0), not the ledger — the phase is paused, not blocked, so the plan itself is the record.

### Long Term
- None opened in the ledger. GH #393 (channelRegistry singleton) and GH #394 (player identity two serialized sources of truth) are filed directly on GitHub per project convention, not duplicated here.

## Files Modified

**Planning & documentation** (6 files):
- `docs/work/game-engine-residue/plan.md` - new; `session-planner` output, then amended per plan-review and three external assessments (9 phases, 0-8)
- `docs/work/engine-refactor/ddd-assessment.md` - untracked; external reviewer's initial DDD assessment of `game-engine.ts`, verified against source
- `docs/work/engine-refactor/ddd-assessment-2.md` - untracked; second assessment, folded into the plan
- `docs/work/engine-refactor/ddd-assessment-3.md` - untracked; third assessment (load-result constraint, getter re-judgment, precedence rule), folded into the plan
- `docs/work/engine-refactor/ddd-assessment-4.md` - untracked; package-shape assessment, folded into the plan as Phases 7-8
- `docs/context/.current-plan` - new pointer, targets the residue plan

**Session record** (1 file):
- `docs/context/session-20260909-0337-refactor-survey-adr-334-340.md` - this file

**Build artifact** (1 file):
- `stories/dungeo/src/version.ts` - `BUILD_DATE` stamp only, from `./repokit build dungeo`; auto-generated, no manual edit

## Notes

**Session duration**: ~1h (03:14-04:30 CDT), paused at David's request ("pause so I can refresh the session") — not blocked.

**Approach**: Verify-then-plan. Every external reviewer claim was checked against the source before folding into the plan; `/devarch:plan-review` was run and its findings resolved by David before resuming; no source code was touched this session.

**Memory saved**: `feedback_refactoring_targets_boundaries.md` (new, this session).

---

## Session Metadata

- **Session**: f9374d
- **Status**: INCOMPLETE
- **Blocker** (if any): N/A — not a blocker; a deliberate pause at David's request mid-Phase-0
- **Blocker Category**: N/A
- **Estimated Remaining**: ~1 session to close Phase 0 (write A1 + the storyInfo finding into ADR-334, run the gate comparison); Phases 1-8 remain beyond that, tiers Small through Large per the plan
- **Rollback Safety**: safe to revert — no source code changed; only planning docs, an untracked plan and four untracked assessment files, and a build-timestamp diff on an auto-generated file

## Dependency/Prerequisite Check
- **Prerequisites met**: prior survey plan (`docs/work/archive/refactoring-survey/plan.md`) closed and archived; ADR-334 ACCEPTED as the baseline being amended; gate scripts and the survey's `baseline`/`phase16` captures recovered into this session's scratchpad
- **Prerequisites discovered**: none new

## Architectural Decisions
- ADR-334 Amendment A1 (decomposing `setStory` and `introspect()`, reopening D5 for those two members only) is **decided by David this session but not yet written into the ADR** — that write is Phase 0's remaining item 1. The storyInfo precedence finding is item 2, to land as a note alongside A1.
- Pattern applied: none this session (no code written).
- Finding (feeds Phase 2): `setStory` (~383-564) and `refreshStoryInfoCapability` (~828-851, called from `start()`) build overlapping `storyInfo` capability state with contradictory precedence — config-wins vs. trait-wins unconditionally for `description`/`buildDate` — latent in Dungeo only because `stories/dungeo/src/index.ts:217` fills the trait description from config.

## Mutation Audit
- N/A — no source code changed this session (planning, review, and documentation only).

## Recurrence Check
- NO — this is the residue plan's opening phase, not a recurrence of a prior blocker.

## Test Coverage Delta
- Tests added: 0
- Tests passing before: N/A → after: N/A (no test run this session)
- Build: `./repokit build dungeo` ran once, exit 0 (04:20 CDT). Verified: build log `gates/build-residue-baseline.log` ends "✓ Build complete" / "bundle: dist/cli/sharpee.js (4419349 bytes)"; `dist/cli/sharpee.js` on disk matches (4,419,349 bytes, mtime 04:20 CDT, after the last plan edit this session) — same size as the survey's Phase 16 bundle, as expected.
- Known untested areas: `run-gates.sh`/`compare-gates.sh` not yet executed against the fresh baseline — planned as Phase 0's final step.

---

**Progressive update**: Session paused 2026-09-09 04:30 CDT (not closed — Phase 0 resumes next session)
