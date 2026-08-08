# Session Summary: 2026-08-07 - feat/ide-go-live-phases-1-3 (CDT)

## Goals
- Explore targeting the Z-machine from Chord (design conversation, no implementation intent confirmed).
- Unblock go-live Phase 4 (Fernhill transcript move) from its dependency on `TestingTabRealPathTests.swift`.

## Phase Context
- **Plan**: `docs/work/ide-go-live/plan-20260806-go-live.md` — "IDE go-live" (Phases 1–3, 7 already DONE from prior sessions).
- **Phase executed**: None advanced. The state file's `phase`/`phaseName` ("Phase 1 — Fixture design + invisibility mechanism") point at `docs/work/ide-test-fixture-story/plan.md`, a session-planner plan generated and then marked SUPERSEDED without executing any of its phases — stale, do not trust for this session.
- **Tool calls used**: 149 / 80 (Small tier) — over budget; work spanned a design tangent, a superseded plan, and the actual fix.
- **Phase outcome**: N/A — no plan phase was started or completed. The session instead cleared a blocker standing in front of go-live Phase 4.

## Completed

### 1. Z-machine / VM design conversation (exploratory, no code)
David asked how hard it would be to target the Z-machine from Chord. Walked from a native-VM design to the distinction between a VM spec and a story-runtime spec; both the Z-machine target and a native VM were explicitly set aside by David ("too much for not enough return"). Captured in `docs/work/story-runtime-vm/notes-20260807-vm-rathole.md` (status EXPLORATORY, no decision, no ADR).
- Correction recorded in the note: a mid-conversation claim that "you don't have a runtime spec" was wrong — `docs/spec/` already exists (nine documents, 4,843 lines, `docs/work/spec-extraction/plan-20260416-reverse-engineer-spec.md`, last swept 2026-06-21 commit `efc6998f`). `05-engine.md` line 406 has a normative turn cycle + conformance table; `01-data-model.md` invariant 6 already makes determinism a MUST with a `SeededRandom` contract.
- IR counts corrected: `packages/chord/src/ir.ts` is 19 `IRStatement` kinds / 10 `IRValue` kinds / 12 `IRCondition` kinds (initially misstated as 24/11/12).

### 2. Blocker found: Phase 4 depended on Fernhill in a way its own plan text denied
Go-live Phase 4 (`docs/work/ide-go-live/plan-20260806-go-live.md` line 222) plans to move Fernhill's 22 transcripts out of the story, and states "no build script, config or CI job" references those paths. False: `tools/ide/SharpeeIDETests/TestingTabRealPathTests.swift` (all 7 tests, the ADR-301/302 rule-13a acceptance suite) runs against `branch-stories/fernhill` and is pinned to its exact tree shape (552 commands = 518 authored + 34 replayed, 22 nodes, 5 roots, `arrival` = 2 commands, `arrival/concealment` = 16 turns at source line 12, `arrival/key` an interior node, `key.transcript` containing `> search the doormat`).

### 3. Superseded plan (not executed)
`session-planner` produced `docs/work/ide-test-fixture-story/plan.md` (4 phases) to build a purpose-built fixture story. `/devarch:plan-review` found 1 STALE ADR + 2 TENSIONs, plus two out-of-band findings: `docs/spec/` exists (contradicting the earlier claim above), and `branch-stories/tree-npm-fixture` is a pre-existing v2 fixture the planner never found. David proposed copying Fernhill instead — simpler and sufficient. The generated plan was marked **SUPERSEDED** in place with the evidence and reason ("overbuilt for the need"); none of its phases ran.

### 4. Implemented: frozen Fernhill snapshot as the suite's fixture
- `tools/ide/test-fixtures/fernhill-frozen/` — frozen snapshot of `branch-stories/fernhill` (`fernhill.story` + `tests/`, 23 files, 124K). `assets/`, `browser/`, `dist/` proved unnecessary — verified by running it. Placed outside `tools/ide/project.yml`'s `sources: - path: SharpeeIDETests` so XcodeGen never enumerates it; `project.yml` itself was not modified.
- `tools/ide/test-fixtures/README.md` — declares the directory a frozen snapshot, tabulates every pinned assertion, states do-not-re-sync.
- `TestingTabRealPathTests.swift` repointed: `fernhillStory` → `fixtureStory`, skip message updated, `key.transcript` path derived from the fixture, run label `fernhill-frozen`, one test renamed off "Fernhill", comments updated. All assertion values unchanged — the freeze kept every number valid.
- Side-effect fixed in passing: the broken-interior-node test used to corrupt `key.transcript` in the real author story and restore it via `defer`; it now mutates the frozen copy instead.
- `docs/architecture/adrs/adr-301-sharpee-transcript-editor.md` amended: new **Amendment A2** plus criterion 2 reworded off the literal `branch-stories/fernhill` path and the literal 518+34 count, onto the actual acceptance property (the tab's recomputed totals agreeing with the reporter).
- `tools/ide/web/docs-tab/build.mjs` and `tools/ide/web/testing-tab/build.mjs`: added `absWorkingDir: repoRoot` to the esbuild call in each. Root cause of the long-standing `docs.js` git-dirty churn: esbuild renders per-module comment banners relative to `absWorkingDir`, which defaults to `process.cwd()`; both bundles passed absolute `entryPoints`/`outfile` but left `absWorkingDir` unset, so the caller's cwd leaked into the emitted banners. `docs.js` was dirtied whenever built from Xcode (cwd `tools/ide`); `testing-tab/tab.js` had the identical bug with opposite polarity (committed from a `tools/ide`-cwd build, so a hand run from repo root dirtied it instead) — which is why only `docs.js` was ever noticed as a problem. `tab.js` carries a one-time 6-line content diff (`../../packages/...` → `packages/...`) as the fix lands.

## Key Decisions

### 1. Copy-and-freeze instead of purpose-built fixture
A `session-planner` plan for a purpose-built, hand-authored fixture story was generated, reviewed, then abandoned in favor of freezing a snapshot of the real Fernhill story. The frozen copy kept every existing test assertion valid with zero rewriting, at the cost of the copy being large/opaque rather than a minimal hand-built tree. `docs/work/ide-test-fixture-story/plan.md` is kept as the design for a purpose-built fixture if the frozen copy ever becomes a liability.

### 2. ADR-301 criteria reworded onto the acceptance property, not the fixture identity
Amendment A2 changes criterion 2 from asserting the literal Fernhill path and literal counts to asserting agreement between the tab's recomputed totals and the reporter — decoupling the ADR's acceptance language from which story backs the suite.

## Next Phase
- **Phase 4** — "Transcript discovery pass (item 7, pass 1)" — move Fernhill's 22 transcripts out of `branch-stories/fernhill/tests/transcripts/` to `docs/work/ide-go-live/fernhill-transcripts-baseline/` and rewrite them from scratch as a friction-log exercise. Now unblocked (the real-path suite no longer depends on the story that would be emptied) but not started. Requires explicit go-ahead from David per the plan's own "Before starting" gate.
- **Tier**: unspecified in plan.md for Phase 4; treat as Small/Medium pending re-estimate.
- **Entry state**: `TestingTabRealPathTests.swift` now runs against the frozen fixture, so emptying `branch-stories/fernhill/tests/transcripts/` no longer breaks the ADR-301/302 acceptance suite.

## Open Items

### Short Term
- Go-live Phase 4 is unblocked and not started; needs David's explicit go-ahead before moving Fernhill's transcripts.
- ADR-301 Amendment A1 records the suite at 521 tests; a full run this session reports 423 (see Test Coverage Delta). Nothing this session added or removed a test, so the gap predates this session — flagged, not chased.

### Long Term
- `branch-stories/tree-npm-fixture` exists as a pre-existing v2 fixture; a purpose-built fixture (design in `docs/work/ide-test-fixture-story/plan.md`) remains the nicer long-term artifact if the frozen copy ever gets in the way.
- Carried from the prior session: the manual DMG drag-and-drop install gate, and visually confirming the mounted Finder window, are still unverified. (The `docs.js` path-instability open item from prior sessions is closed by this session's `absWorkingDir` fix.)

## Files Modified

**Docs / ADRs** (3 files):
- `docs/architecture/adrs/adr-301-sharpee-transcript-editor.md` - added Amendment A2, reworded criterion 2 off the literal fixture path/counts
- `docs/work/ide-test-fixture-story/plan.md` - session-planner output, marked SUPERSEDED in place (not executed)
- `docs/work/story-runtime-vm/notes-20260807-vm-rathole.md` - new exploratory note capturing the Z-machine/VM conversation

**IDE test suite + fixture** (4 files + 1 new directory):
- `tools/ide/SharpeeIDETests/TestingTabRealPathTests.swift` - repointed from `branch-stories/fernhill` to the frozen fixture; broken-node test now mutates the copy
- `tools/ide/test-fixtures/fernhill-frozen/` (new, 23 files) - frozen snapshot of Fernhill's `.story` + `tests/`
- `tools/ide/test-fixtures/README.md` (new) - documents the snapshot and its pinned assertions

**Build scripts** (2 files):
- `tools/ide/web/docs-tab/build.mjs` - added `absWorkingDir: repoRoot` to esbuild call (fixes `docs.js` cwd-dependent churn)
- `tools/ide/web/testing-tab/build.mjs` - same fix; `tools/ide/SharpeeIDE/Resources/testing-tab/tab.js` output changed by a one-time 6-line path diff as a result

**Plan pointer**:
- `docs/context/.current-plan` - unchanged in content meaning (still points at `docs/work/ide-go-live/plan-20260806-go-live.md`); shows as modified in git diff.

## Notes

**Session duration**: ~2.5 hours (2026-08-07 20:12 CDT start).

**Approach**: Design tangent first (Z-machine, no code), then a blocker discovered ahead of go-live Phase 4, then a full plan-review cycle for a fixture-story plan that was ultimately superseded in favor of a simpler copy-and-freeze fix, applied and verified with real test runs.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A — the session's own blocker (Phase 4's false "no CI job references these paths" claim) was resolved within the session, not carried forward.
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (no plan phase in progress)
- **Rollback Safety**: safe to revert — no packages/ changes, no `branch-stories/fernhill` mutation (`git status --porcelain branch-stories/` empty this session), `project.yml` untouched.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-301/302 acceptance suite existed and was passing before this session's changes; `branch-stories/fernhill` available to snapshot from.
- **Prerequisites discovered**: Go-live Phase 4's plan text asserting no CI/build dependency on the transcript paths was false — the real-path suite was that dependency. Discovered before the move was made, not after.

## Architectural Decisions

- ADR-301: Amendment A2 added — acceptance criterion 2 reworded from asserting the literal `branch-stories/fernhill` path and literal 518+34 counts to asserting agreement between the tab's recomputed totals and the reporter; the backing story is now documented as a fixture the suite owns, not the author's real story.
- Pattern applied: rule 13a (Integration Reality) was implicitly satisfied by re-running the real xcodebuild suite against the new fixture rather than stubbing it — see Integration Reality Statement below.

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/SharpeeIDETests/TestingTabRealPathTests.swift` (test file — audited for what it asserts, not audited by rule 15, which excludes test files).
- Tests verify actual state mutations (not just events): YES (evidence: `xcodebuild test -only-testing:SharpeeIDETests/TestingTabRealPathTests` → `** TEST SUCCEEDED **`, `Executed 7 tests, with 0 failures`, 7.292s, run 2026-08-07 after all edits) — the suite asserts on recomputed tree totals against the reporter's totals, on node counts, and on file content (`key.transcript` containing `> search the doormat`), not on return values alone.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — `docs.js` cwd-dependent churn was a known open item from the prior session (`session-20260807-1724-feat-ide-go-live-phases-1-3.md`, carried forward as "docs.js path-instability"). This session found the root cause (`absWorkingDir` unset in esbuild config) and closed it, and found the same bug had a mirror-image effect on `testing-tab/tab.js` that had gone unnoticed because it dirtied only when built from the opposite cwd.
- Consider one-time audit of: any other `tools/ide/web/*/build.mjs` esbuild callers for the same missing `absWorkingDir` (only the two named here were checked and fixed this session).

## Test Coverage Delta

- Tests added: 0 (no new tests; existing suite repointed at a new fixture with assertions unchanged).
- Tests passing before: not independently verified this session (no baseline run against the old `branch-stories/fernhill`-backed config was performed before repointing) → after: 423 (evidence: full `xcodebuild test` → `** TEST SUCCEEDED **`, `Executed 423 tests, with 0 failures`, 37.457s, run 2026-08-07 after all edits). Note: ADR-301 Amendment A1 previously recorded the suite at 521 tests; this session's 423-test run is unexplained against that figure and is flagged under Open Items rather than resolved.
- Known untested areas: the `absWorkingDir` fix's effect on other `tools/ide/web/*` build scripts beyond the two touched here was not audited.

---

## Integration Reality Statement (rule 13a — this phase touches a test-infrastructure integration, not a named "integration/engine/runtime/sandbox/subprocess/database/migration/deploy" phase, included for completeness)

**Fernhill-frozen fixture + real-path test suite**
- OWNED: `tools/ide/test-fixtures/fernhill-frozen/` (repo-generated snapshot), `TestingTabRealPathTests.swift` (repo-owned test suite), `tools/ide/web/{docs-tab,testing-tab}/build.mjs` (repo-owned esbuild scripts).
- EXTERNAL: none.
- REAL-PATH TEST: `xcodebuild test -only-testing:SharpeeIDETests/TestingTabRealPathTests` run against the actual fixture directory and actual `devkit` CLI (`node packages/devkit/dist/cli.js test fernhill.story --tree`), no stub/override — both executed and passed this session (see Mutation Audit and Test Coverage Delta evidence above).
- STUB JUSTIFICATION: none — no stub, fake, mock, or echo was used; the frozen fixture is a real story tree exercised by the real devkit CLI and the real Xcode test runner.

---

**Progressive update**: Session completed 2026-08-07 22:52 CDT (approx, from last event-log timestamp 03:52:05Z)
