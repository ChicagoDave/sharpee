# Session Summary: 2026-08-09 - feat/ide-go-live-phases-1-3 (CDT, session fdfe6a)

## Goals
- Execute Phase 6 of the testing-surface revamp plan ("Run column + retirements") on David's "phase 6" go.
- Run column per design doc §7 (autonomous, IDE-side); golden retirements per §8/§9 (per-file confirmation + `packages/` discussion with David first).
- David: if publishing sharpee is warranted, flag it — would bump to 4.6.0.

## Phase Context
- **Plan**: `docs/work/testing/plan-20260809-testing-surface-revamp.md`
- **Phase**: 6 (Medium, ~250 tool calls). Entry state met (Phases 4+5 DONE).

## Completed
### Golden retirement (David confirmed the file list + wire change up front)
- **Wire** (`packages/ide-protocol/run-events.ts`): golden-divergence `diff?` removed from `CommandResultEvent`; additive `failure?: string` (first failed assertion's message) added; guard + tests updated. `transcript-tester/run-event-stream.ts` passes `failure` through instead of `diff`.
- **branch-tester**: `golden.ts` deleted; golden tier excised from `runner.ts` (assertion tier is the only tier; `runTranscript` simplified; D2 boundary message no longer names `--bless`), `types.ts` (Golden* interfaces, tier/goldenPath/blessed/divergenceSavePath, bless/goldenPath/storyName/locale options), `tree-runner.ts` (blessFiles), `watch.ts` (BlessPolicy + bless cycle rewritten out), `reporter.ts` (golden diff renderer), `rename.ts` (golden/divergence carry), `cli.ts` + `index.ts`. Runner now computes `failure` (first failed assertion message) on command and opening results.
- **devkit**: `--bless`/`--bless-file` removed from `test.ts` + `test-tree.ts`.
- **Tests deleted** (machinery they test is gone): branch-tester `golden-channels/golden-dimensions/golden-format/golden-runner/rerecord-review/tree-bless.test.ts`; golden test blocks excised from `coverage/ending-field/turn-field/world-capture/runner-forces.test.ts`; `watch.test.ts` + `rename.test.ts` rewritten bless-free; message expectations updated in `ok-any/removed-forms/auto-assertion.test.ts`. branch-tester **342 passing** (was 343 incl. removed), ide-protocol + surface clean.
- **IDE**: testing-tab web (Record golden…/restore/review-bar/tier-cell/goldens state + CSS) and Swift (`TestController` bless plumbing + `GoldenBackupStore`, `TestingTabViewController` golden bridge, `TranscriptDiscovery.goldens`, `TestRunner.blessFile`) stripped; tab tests fixed (**87 passing**); `TestingTabRealPathTests` "goldens as a mode" section (2 tests) deleted.
- **Verified untouched**: transcript-tester's frozen `golden.ts`; the only `.golden` files on disk are Dungeo's + cloak-of-darkness (frozen world). No author-world recordings existed.

### Run column (design §7)
- `run.ts` (new): folds the `sharpee test --tree --json` NDJSON stream via ide-protocol's real `isRunEvent` guard — per-stem results, first failure one line (`turn N — <wire failure message>`), replays never rows, run-end tally, stream-less-death note. 8 vitest (**83 passing** total).
- `cards.ts`: Run button live; run column renders stream results in run order + unrun session segments (dash) + pending branches (dash) + tally. CSS badges.
- `main.ts`: run state + `runLine`/`runExit` bridge entry points; Run guarded against driver replay.
- Swift: `TestingSurfaceViewController` gains `storyFile`/`saveDocuments`, spawns the shared `TestRunner`, relays lines/exit into the page; `MainWindow.openTestingSurface` wires both.
- New real-path test `testRunButtonRunsTheRealTreeAndTheColumnFillsWithRowsAndTally` (mini story + passing root + failing child, real CLI, rows + tally asserted).
- ide-protocol alias added to surface build.mjs/tsconfig/vitest.

## Key Decisions
- `failure` carries ONE message (the first failed assertion), not the list — the run column is one-line-per-file by design; deeper reading stays in the Testing tab.
- Run column rows = union of stream results (whole tree on disk, prior sessions' files included) + session segments + pending branches — not session-only.
- Runner's D2 boundary error reworded (no `--bless` to point at): "add one, or declare an auto-assertion: policy".

## Mutation Audit
- mutation-verification ran: clean except **two real gaps, both fixed same session**:
  1. `CommandResult.failure` had no fast test (only the slow skip-gated Swift real-path one) → `tests/failure-field.test.ts` added (5 tests: verbatim message, first-of-several, key-absence on pass, opening, throw-rides-error). branch-tester **348 passing**.
  2. The tab folded `event.failure` onto `Turn.failure` but never RENDERED it — a plain failed assertion showed output with no "why" (the removed "recording expects" box's job). Fixed: `views.ts` detail block renders `turn.failure` (suppressed when identical to `error`); model fold test added. Tab **88 passing**, bundle rebuilt.
- Earlier finding by the new real-path run test: the spawned devkit CLI ran the STALE dist (no `failure` on the wire) — `tsf build` refreshed it; the test also needed `sharpeeExecutableOverride` (temp-dir stories resolve no shim/PATH; same injection the tab suite uses).

## Final Evidence (Phase 6 DONE)
- IDE suite **539 passing, 0 failures** (2026-08-09 17:16) — incl. the real-path run-column test (Run click → real CLI tree run → PASS/FAIL rows with the runner's verbatim failure message → tally).
- transcript-tester **277 passing** — the frozen golden world verified unaffected (the exit check).
- branch-tester **348**, ide-protocol **45**, devkit **167**, surface vitest **83**, tab vitest **88**, `tsf build --npm` clean.
- Debug trail on the real-path test: (1) temp-dir stories resolve no CLI → `sharpeeExecutableOverride` seam; (2) the spawned CLI ran the stale dist (`failure` missing from the wire) → `tsf build`; (3) a fresh `dist/cli.js` has no exec bit → spawn via `env node` (the tab suite's pattern).

## Publish (David: "bump and publish… use the CI workflow after the version bump")
- `tsf version 4.6.0` (all packages), committed with Phase 6 as `7f582734`; test gate 60/60 green.
- CI publish workflow (`publish-npm.yml`, dispatched on the branch): first dry-run failed its stamping guard — the bump missed the repokit-stamped `ENGINE_VERSION` constant (the exact stdlib@3.6.0 failure mode the guard exists for). Fixed in `283d86a3`; second dry-run green; real run **success**.
- Registry verified: `latest` → **4.6.0** for @sharpee/sharpee, branch-tester, ide-protocol, devkit, transcript-tester (et al.).

## Post-merge: David's click-through rulings (uncommitted work, this session's second arc)
1. **"Remove the old UX and embed the new UX in the Testing tab"** — the surface window was Phase 3's implementation choice that drifted from the directive. DONE: the Testing tab now hosts the play surface (binds per project on first visit, loads after ⌘B, reloads on rebuild, placeholder before a build; ⌥⌘U selects the tab). Deleted: `TestingTabViewController`, `TestController`, `TestingTabSchemeHandler`, `TestingTabWebRoot`, `ToolchainFenceNote`, `TranscriptDiscovery`, `TranscriptSourceProvider`, `TestingSurfaceWindowController`, `web/testing-tab/` + committed `Resources/testing-tab/` + `build-testing-tab.sh` + its pre-build phase, suites `TestingTabRealPathTests`/`ToolchainFenceNoteTests`/`TranscriptSourceProviderTests`/`ProjectTreeRefreshTests` + the tab-hop test in `AutoAssertionMenuTests`. Test menu: ⌘U → the surface's Run button (in-page guards authoritative), Cancel wired to the same run.
2. **"Transcripts are Chord Writer's artifacts"** — the project pane never lists `.transcript` files under `tests/` (either layout); non-transcript strays still show in Other. `Transcript Tests` group retired from `ProjectArtifacts`.
3. **Middle column removed; 50% snap removed; visual state persists** — the source column was unnecessary once seen in action (its non-updating bug died with it; claim REMOVAL currently has no surface affordance — model mutators stay vitest-covered); the "Snap panes to 50% each" setting is retired (`SettingsPreference` deleted, Settings window empty with a note) — divider positions already persist and now nothing overrides them; the right panel's selected tab joins `SessionState` (persisted on change once a project is open — guarded so the launch invariant "close the landing page → nothing persisted" holds, which `LaunchFlowTests` caught).
- **Evidence**: IDE suite **475 passing, 0 failures** (count reflects the deleted tab suites); surface vitest **83 passing**; surface bundle rebuilt.
- **Pending David's click-through before commit.** ADR-306 needs an amendment recording rulings 1–3 (D4's authoring-vs-reading split is superseded: the tab IS the surface; there is no separate reading surface).

## Click-through round 2 (David's three changes + the opening bug)
- **Opening card empty on the real page** — the engine's `game.started` prose (banner + prologue) flushes INSIDE the boot look's bracket, stamped `data-turn=1`; the fixture's unstamped head never matched reality (broken in the window era too, first seen now). Fix: the opening card claims the boot delivery's `sharpee-banner-*` elements (ADR-174's published decoration classes). Pinned against the real fernhill bundle.
- **Undo (⌘Z)** — authoring gestures (ticks, ranges, collapse, claims, pickers) push authoring mementos (segments/skips/claims/lineage table — never played turns); fork, chip-switch, branch delete, and fence CLEAR the stack (a memento must not resurrect a lineage whose turns are gone). Never fires inside text fields. The auto-save writer follows an undo like any model change (real-path: claim added → ⌘Z → gone from the file on disk).
- **Branch delete** — each sibling chip gets a hover ✕ (two acts: arm, confirm). Deletes the lineage + descendants; files leave the disk via the writer's reconcile; deleting the VIEWED branch replays the surviving parent live (view-is-live). Last sibling at a point → the fork point dissolves and the auto-split prefix folds back (mergeUp), renaming stems — the restructure-rename path's surviving home, real-path-pinned.
- **Split and Merge ↑ retired** — with transcripts as IDE artifacts, chaptering has no author value; the only load-bearing split is fork's auto-split (internal), and fold-back replaces Merge. Every split boundary is fork-made, which is what makes the fold-back merge always safe. Claim-REMOVAL still has no surface affordance (source panel gone, Split gone) — model mutators stay covered awaiting a future gesture ruling.
- Detach/re-attach real-path test reworked onto two ticked ranges (its old setup used Split); the rename-on-restructure assertions moved into the chip-delete fold-back test.
- **Environment note**: a run of "Runningboard error 5 / launchd spawn failed" test-runner failures traced to an UNSIGNED app product from a silently-failed incremental build (grep filter swallowed the error) — clean rebuild of Products/Debug fixed it; worth remembering the symptom.
- **Evidence**: IDE suite **475 passing, 0 failures**; surface vitest **90 passing** (deleteLineage semantics incl. descendants/claims/fold-back/refusals, memento round-trip + deep-copy); surface real-path 21 passing incl. `testChipDeleteRemovesTheBranchItsFileAndReplaysTheParent` and `testCommandZUndoesAClaimAndTheFileFollows`. Bundle rebuilt.

## Click-through round 3
- **Suite change resets the run column** (David: "if I delete things or uncheck things, the transcript state has to be rewritten and the right test runner pane reset") — the file rewrites already flowed through the writer; the gap was the run column reporting a tree that no longer existed. Now ANY change to the suite on disk (untick/reopen, branch delete, claim edits, closing a new range — content changes stale results equally) resets the column to "not run yet"; guarded when a run is in flight. `resetRun` in `run.ts` (+ vitest, 91 passing), wired in `update()` with writes ordered before the render.
- **Xcode signing rot, twice more**: incremental AND clean builds intermittently sign the app while the nested `SharpeeIDETests.xctest` is still unsigned ("code object is not signed at all — In subcomponent: …xctest", also the cause of the earlier "Runningboard error 5" launch failures). Clean rebuild fixed it once; the deterministic recurrence needed hand-signing the nested xctest (`codesign --force --sign <identity> …xctest`) then re-running build-for-testing. If it keeps recurring, the project's target ordering (xcodegen) deserves a look.
- **Evidence**: IDE suite **475 passing, 0 failures** on the fully-signed build; surface vitest **91 passing**.

## Merge
- PR #256 (`feat/ide-go-live-phases-1-3` → `main`, the whole 38-commit go-live arc) created and merged on David's "pr then merge" — merge commit `f41a4188`, 2026-08-09.

## Open Items
- None for Phase 6. Phase 7 (play to a goal) stays parked until David asks.

## Files Modified
- `packages/ide-protocol/src/run-events.ts`, `tests/run-events.test.ts`
- `packages/transcript-tester/src/run-event-stream.ts`, `tests/run-observer.test.ts`
- `packages/branch-tester/src/{runner,types,tree-runner,watch,reporter,rename,cli,parser,search,aggregate,index}.ts`, `src/golden.ts` (deleted), tests (6 deleted, 9 edited)
- `packages/devkit/src/commands/{test,test-tree}.ts`
- `tools/ide/web/testing-tab/src/{host,main,model,views,tab.css}.ts/css`, tests
- `tools/ide/web/testing-surface/src/{run(new),main,cards,surface.css}`, `tests/run.test.ts` (new), `build.mjs`, `tsconfig.json`, `vitest.config.ts`
- `tools/ide/SharpeeIDE/Test/{TestController,TestRunner,TestingTabViewController,TranscriptDiscovery}.swift`
- `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift`, `MainWindow.swift`
- `tools/ide/SharpeeIDETests/{TestingTabRealPathTests,TestingSurfaceRealPathTests,TestRunnerTests,TestToolchain}.swift`
- Committed bundles: `Resources/testing-surface/`, `Resources/testing-tab/`

---

## Session Metadata
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Rollback Safety**: safe to revert — all changes are uncommitted working-tree edits on `feat/ide-go-live-phases-1-3` at HEAD `cb251308`

## Architectural Decisions
- ADR-306 D1 gained the Phase 6 landing note (golden pair retired both sides, `diff` → `failure` on the wire, run column shipped). No new ADRs.

## Test Coverage Delta
- Surface vitest 75 → **83**; tab vitest 87 → **88**; branch-tester 343 → **348** (net of 6 deleted golden test files); devkit 171 → **167** (4 removed-`--bless` CLI tests deleted); IDE suite 540 → **539 passing, 0 failures** (2 golden-mode real-path tests out, 1 run-column real-path test in).
- Known untested areas: the production `resolveSharpee` path of the surface's run (covered by the tab's identical path; the surface test injects the CLI).
