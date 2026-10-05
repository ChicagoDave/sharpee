# Session Summary: 2026-09-29 - feat/segmented-test-tree (CDT)

## Goals
- Close ADR-355 Phase 3: the testing surface and both IDE heads (Swift, Avalonia) read and write the segmented test tree; run rows key on line id.
- Fix the fallout found on the way (deployment target, stale tests, Avalonia persistence, busy indicator).

## Phase Context
- **Plan**: docs/work/segmented-test-tree/plan-20260929-adr-355.md (segmented test tree, ADR-355)
- **Phase executed**: Phase 3 — "Testing surface, bridge, run-event line id, and both heads" (Large)
- **Tool calls used**: 125 / 400 (state file, toolCalls at summary time)
- **Phase outcome**: Completed under budget; Phase 3 flipped DONE, Phase 4 stamped `CURRENT (since 2026-09-29)`.

## Completed

### Deployment target
- MACOSX_DEPLOYMENT_TARGET 11.0 -> 12.0 (David's decision; Xcode refused 11.0) in `tools/ide/project.yml` (options.deploymentTarget, settings.base, LSMinimumSystemVersion). `vendor-toolchain.sh` and `vendor/node/README.md` comments corrected (node is minos 11.0, below the app's 12.0). `xcodegen generate` then `xcodebuild build` succeeded.

### Swift tests
- `TestingSurfaceDocumentSeedTests.swift` called the renamed `documentSeed(in:)`; renamed file/class to `TestingSurfaceManifestSeedTests` using `manifestSeed(in:)` with a real manifest input.
- `TestingSurfaceRealPathTests.swift:853` expected active view state Int 0; active is now a string line id, so it asserts active == root segment id read back from disk.
- Evidence: `xcodebuild test` 605 passing, 0 failures (2026-09-29 03:54; first run 604 passing + that one failure, before the fix).

### outline.test.ts
- Replaced 4 stale ADR-353 count tests (61 lines; tree is now 106 lines / 54 forks) with assertions against an independent walk of the real secret-letter tree (line count = branches+1, forks = branching cards, line ids match, distinctive names are one of the line's own commands, destination = last asserted `player.location`).
- Found two sibling lines both named "sw" at the Grocery Stall fork: GH #551. The uniqueness assertion is deliberately omitted until fixed.

### Avalonia persistence
- `ShellWindow` web-message handler now applies `TestingSurfacePosts.ApplyTreeWrite` to new `StoryProject.TestsTreeTarget` (existing `*.tests`, else `<folder>/<id>.tests`); IO/permission errors go through `Report()`.
- Tests: 2 `StoryProjectTests` facts, 1 `TestingSurfacePostsTests` fact (non-.json written name and `../` removal ignored).
- Evidence: `dotnet build` 0 warnings 0 errors; `dotnet test` 116 passing, 8 failures (env-dependent Subprocess/Toolchain/DocumentsFolder tests, same count as the prior session).
- mutation-verification: tests GREEN. Remaining gaps: `ShellWindow` glue untested (no harness); multiple `*.tests` dirs with no id match creating `<id>.tests` is untested.

### Busy indicator (David's request)
- New `src/busy.ts` (`busyLabel`); busy bar with spinner and step count at top of the cards column ("Replaying line — 12 of 40…", "Restoring session — 5 of 60…"); spinner on the active pill via `body.ts-busy`; reduced-motion pulse. `tests/busy.test.ts` 4 tests.
- Evidence: surface `npx vitest run` 176 passing; `tsc --noEmit` clean. Bundle rebuilt (`node build.mjs`) into `SharpeeIDE/Resources/testing-surface`; David ran it and saw the count.

### David's click-throughs
- #1: Testing tab works; main-line replay slow, run column starts after and is also slow; same as before, not a regression. Filed GH #550. David measured ~10 turns/sec; commented on #550: no fixed delay, likely cost is `update()` doing `cards.render()` + `renderOutline()` per live turn during driverBusy (O(n^2)); cheap experiment is deferring render during replay.
- #2: edited one card on secret-letter; exactly one segment file changed (`branch-stories/secret-letter/secret-letter.tests/e9ovmule.json`, +1 line `"ending": "queen-leaves-stub"` on wait card `31yr3m56`); no fork recorded on disk (fork path covered by real-path suites on scratch copies). Phase 3 exit accepted; that tree edit is David's and is committed with this session.

## Key Decisions

### 1. Deployment target 12.0
Xcode refused 11.0; David chose 12.0. Node vendored binary stays minos 11.0.

### 2. Omit sibling-name uniqueness assertion
The tree currently violates it (#551); asserting would pin a bug or fail. Restore when #551 is fixed.

## Next Phase
- **Phase 4**: "Decision record hygiene (ADR-355 D6)" — supersession notes beside ADR-307 D2, ADR-307 Q-8, ADR-353 D7, ADR-340 D5 (no Status flips); narrative row "Segmented test tree on disk" updated; ADR-355 landed note; issue closure.
- **Tier**: budget ~100 tool calls
- **Entry state**: Phases 1-3 landed. Optionally run the #550 render-deferral experiment first.

## Open Items

### Short Term
- 550: Testing tab: slow boot on secret-letter — main-line replay and run column run back to back (render-deferral experiment pending)
- 551: Testing tab outline: two sibling lines at one fork get the same name ("sw" twice at Grocery Stall)
- 494: Label-collision: packages/branch-tester needs a stable line id (closes in Phase 4 with David's OK)
- 491: AC-3 unmet — run column's fold needs the same extraction AC-4 got (`runRowsOf` landed; close when verified)

### Long Term
- 549: Derived rule tests don't set up rule preconditions — scope, keys, selecting state — so guards fire first
- 547: emitted claims ignore rendered-block provenance (ADR-333) — 195 secret-letter claims invisible to emitted

## Files Modified

**IDE Avalonia** (4 files):
- `tools/ide/PaneHost/Shell/ShellWindow.axaml.cs`, `tools/ide/PaneHost/Shell/StoryProject.cs` - tree-write persistence, `TestsTreeTarget`
- `tools/ide/PaneHost.Tests/StoryProjectTests.cs`, `TestingSurfacePostsTests.cs` - new facts

**IDE Swift / build** (5 files):
- `tools/ide/SharpeeIDETests/TestingSurfaceManifestSeedTests.swift` (renamed from DocumentSeed), `TestingSurfaceRealPathTests.swift`, `tools/ide/project.yml`, `vendor-toolchain.sh`, `vendor/node/README.md`

**Testing surface** (web + bundle, ~9 files):
- `tools/ide/web/testing-surface/src/{cards,main,busy}.ts`, `src/surface.css`, `tests/{outline,busy}.test.ts`; rebuilt `tools/ide/SharpeeIDE/Resources/testing-surface/{surface.js,surface.css}`

**Other**:
- `branch-stories/secret-letter/secret-letter.tests/e9ovmule.json` (David's edit), `docs/work/segmented-test-tree/plan-20260929-adr-355.md`

## Notes

**Approach**: Fix compile/test fallout first, then persistence, then UX; David click-throughs gated exit.

- Process: the session gate blocked the first edits because the core-concepts read had not happened; read it and continued. The session file was not created at session start (template step skipped); this write is the first.
- Open items ids above were already in the store (list-open); none filed or closed by this write.

---

## Session Metadata

- **Session**: e6c851
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: Phases 1-2b landed; built branch-tester and testing surface bundle.
- **Prerequisites discovered**: macOS deployment target 12.0 (Xcode rejects 11.0).

## Architectural Decisions

None this session (ADR-355 governs; Phase 4 writes the supersession notes).

## Mutation Audit

- Files with state-changing logic modified: `ShellWindow.axaml.cs`, `StoryProject.cs`
- Tests verify actual state mutations (not just events): YES (evidence: `dotnet test` PaneHost.Tests 116 passing, 8 env-dependent failures unrelated; StoryProject/TestingSurfacePosts facts assert on files written; 2026-09-29). Gap: `ShellWindow` glue itself untested.

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: 2 StoryProjectTests + 1 TestingSurfacePostsTests + 4 busy.test.ts; 4 stale outline tests replaced; Swift seed test renamed/updated.
- Tests passing after: Swift 605 (0 failures), surface vitest 176 (0 failures), PaneHost 116 (8 env-dependent failures, same as before) (evidence: runs above, 2026-09-29).
- Known untested areas: `ShellWindow` web-message glue; multiple `*.tests` dirs with no id match.

---

**Progressive update**: session completed 2026-09-29 04:10 — first write; Phase 3 closed, Phase 4 CURRENT
