# Session Summary: 2026-09-29 - feat/segmented-test-tree (CDT)

## Goals
- Pre-Phase-3 prep for ADR-355 (segmented test tree): rebuild stale bundle, classify baseline failures, fix what blocks a clean baseline.
- Start Phase 3: testing surface, bridge, run-event line id, both heads (Swift + C#).

## Phase Context
- **Plan**: docs/work/segmented-test-tree/plan-20260929-adr-355.md
- **Phase executed**: Phase 3 "Testing surface, bridge, run-event line id, and both heads" (Large, 400 budget) — started, NOT complete; remains CURRENT (not flipped).
- **Tool calls used**: see state file (54 at checkpoint; more since)
- **Phase outcome**: Partially completed

## Completed

### Prep
- `./repokit build dungeo` rebuilt stale dist/cli/sharpee.js (exit 0).
- Baseline classified (docs/work/segmented-test-tree/baseline/): Secret Letter 56 derived-rule failures (30 ENTITY_NOT_FOUND, 10 blocked before rule, 8 state unchanged, 5 location mismatch, 3 offstage); Alderman 5 (1 authored card pinning stale engine id a05, 4 derived). Classification is from failure messages, not confirmed in code.
- Filed GH #548 and #549 (cross-linked).

### #548 fix (committed locally as 98f869a26, "closes #548" — closes on merge, issue still open in store)
- assertion-core.ts `resolveValue` treats `offstage` like `nowhere`; location verdicts print an absent place as "offstage". 3 tests in pin-forms.test.ts.
- Full suite (turbo test:ci) passed at commit (reported by session, unverified by event log).

### Phase 3 (uncommitted, to be committed by finalize)
- Testing surface (tools/ide/web/testing-surface): line ids are segment ids (strings); model.ts `files()` via ensureSegmentIds+segmentTree, `mainLine` getter, freshId(); load() no longer reassigns ids; branch label fallback uses sibling position. outline/visit/outline-view/cards/boot-document/main.ts re-keyed. Bridge post is `{tree:{written,removed}}` diffed via diffTreeFiles; boot injects `tree` file map; view-state `active` is a string. run.ts keys results by line id, stores wire labels, names blocker by label; new pure `runRowsOf` (ADR-353 AC-3, #491). Bundle rebuilt to SharpeeIDE/Resources/testing-surface/surface.js.
- Wire: ide-protocol run-events.ts TranscriptStartEvent gained optional `label` (guard updated); transcript-tester run-event-stream accepts label; devkit test-tree-document.ts emits line id as `file` + label. `repokit protocol` regenerated Swift/C# with no diff.
- C# PaneHost: TestingSession (Build(storyId, tree), ReadTree, ManifestSeed), TestingSurfacePosts (ReadTreeWrite, IsTreeFileName, ApplyTreeWrite), StoryProject.TestsTree, ShellWindow reads tree, RepoPaths.FernhillTests, ProjectPaneView, MainWindow dev harness applies writes to a DevOut copy. Tests converted/added.
- Swift: TestingSurfaceViewController (testTreeURL, readTreeFiles, isTreeFileName, performTreeWrite, manifestSeed), MainWindow, header comments; TestingSurfaceRealPathTests + TestRunnerTests converted (test-side tree assembler; canonical fixtures verified against segmentTree bytes).

## Key Decisions

### 1. Fix #548 in the assertion core
Shared by both runtimes, not the derived runner.

### 2. Run events carry line id as `file` plus a separate `label`
Keeps wire shape; label is optional so older emitters remain valid.

## Next Phase
- Phase 3 continues: Swift verification, David's Chord Writer click-through, then Phase 3 close. Phase 4 follows per plan.
- **Entry state**: deployment-target decision made so xcodebuild compiles; decisions below answered.

## Open Items

### Short Term
- 548: Offstage pins fix committed (98f869a26); issue closes on merge, not closed by this write.
- 549: Derived rule tests don't set up rule preconditions — open; blocks trusting the 53 remaining Secret Letter derived failures.
- 547: emitted claims ignore rendered-block provenance (ADR-333) — open, untouched.
- 494: Label-collision / stable line id for branch-tester — open; closes with Phase 3/4.
- 491: AC-3 run column fold extraction — `runRowsOf` landed in Phase 3 work; close when Phase 3 is verified.

### Decisions awaiting David (no issue filed)
- Raise MACOSX_DEPLOYMENT_TARGET 11.0 to 12.0 in project.yml (Xcode now requires 12.0)?
- Avalonia ShellWindow never persisted tree writes (pre-existing): wire ApplyTreeWrite in, or leave?
- 4 stale outline.test.ts real secret-letter counts (main's tree has 106 lines vs expected 61): compute from tree or update numbers?
- Chord Writer click-through still pending.

### Long Term
- None new.

## Files Modified

**Phase 3, testing surface** (~14 files): tools/ide/web/testing-surface/src/{model,outline,visit,outline-view,cards,boot-document,main,run}.ts and tests; SharpeeIDE/Resources/testing-surface/surface.js (rebuilt).
**Wire** (3): packages/ide-protocol/src/run-events.ts, packages/transcript-tester/src/run-event-stream.ts, packages/devkit/src/commands/test-tree-document.ts.
**C# PaneHost** (~8 + tests): TestingSession, TestingSurfacePosts, StoryProject, ShellWindow.axaml.cs, RepoPaths, ProjectPaneView, MainWindow.axaml.cs.
**Swift** (~5 + tests): TestingSurfaceViewController, TestingSessionStore, MainWindow, ProjectArtifacts, StoryConfig.
**Other dirty, not attributed**: genai-api/index.md, tooling.md, stories/dungeo/src/version.ts (likely build-regenerated).

## Notes
- The session's own file is 0301; session-20260929-0052-feat-segmented-test-tree.md is session e31b07's.
- Process slip: one import edit was done with sed (violates no-regex-edits memory); result verified correct.
- Swift compile never ran; all Swift changes are unverified.

---

## Session Metadata

- **Session**: 7f0033
- **Status**: INCOMPLETE
- **Blocker**: Build / Toolchain — xcodebuild fails before compile: Xcode update raised minimum MACOSX_DEPLOYMENT_TARGET to 12.0, project.yml has 11.0; awaiting David's decision. Phase 3 also awaits Chord Writer click-through.
- **Blocker Category**: Build / Toolchain
- **Estimated Remaining**: ~1-2 sessions
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: fresh bundle; #548 commit landed first as planned.
- **Prerequisites discovered**: deployment-target decision for Swift builds; #549 understanding for a clean Secret Letter baseline.

## Architectural Decisions

None this session (ADR-355 applied; ADR-353 AC-3 discharged via `runRowsOf`).

## Mutation Audit

- Files with state-changing logic modified: model.ts, run.ts, TestingSession/TestingSurfacePosts (tree write apply), TestingSurfaceViewController.performTreeWrite.
- Tests verify actual state mutations: YES for surface/CLI/C# paths — tree-session-real-path 3 passing, ac-signoff-cli (real CLI) 7 passing (2026-09-29); Swift performTreeWrite [reported by session, unverified].

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Prep: transcript-tester 361 passing, branch-tester 270 passing (2026-09-29 03:05-03:08).
- Testing surface `npx vitest run`: 163 passing, 4 failures (outline.test.ts real secret-letter counts — pre-existing, stale on main). run.test.ts 22 passing; `npx tsc --noEmit` clean (2026-09-29).
- PaneHost `dotnet build` 0 warnings 0 errors; `dotnet test` 113 passing, 8 failures — all env-dependent real-path tests needing SHARPEE_IDE_TOOLCHAIN / SHARPEE_IDE_CAPABILITY_FIXTURE (unrelated).
- Swift: NOT RUN.
- Known untested areas: Swift Phase 3 changes; Avalonia tree persistence; #549.

---

**Progressive update**: checkpoint 2026-09-29 03:13 — first write: prep work, #548 fix (uncommitted), #549 filed, evidence recorded.
**Progressive update**: session completed 2026-09-29 03:44 — #548 committed (98f869a26); Phase 3 started and left INCOMPLETE, Swift unverified pending deployment-target decision.
