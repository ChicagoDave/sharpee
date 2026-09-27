# Session Summary: 2026-09-27 - explorer-prototype

## Goals
- GH #540: the IDE Testing tab booted its engine at the hard-coded IDE play seed (42) while the tree document pins its own `seed` field, so a document pinned at another seed (secret-letter, 1209) recorded cards at one seed and replayed at another. David's ruling (2026-09-27): **the document's seed wins** — the constant is only the default for a fresh tree.

## Phase Context
- **Plan**: No active plan — plan-less repair work by explicit instruction ("agreed, document seed wins — go").
- **Phase executed**: N/A (no plan phase).
- **Tool calls used**: 81 (session state, no budget set — plan-less session).
- **Phase outcome**: N/A.

## Completed

### Surface (`tools/ide/web/testing-surface`)
- New `src/boot-document.ts` — `admitBootDocument(text, engineSeed)` decides whether the boot-time document becomes the session's tree: adopts a document pinned at the engine's own seed; refuses by name and write-locks a document pinned at a different seed (same AC-4 treatment as a newer-version document); malformed or absent text adopts neither. `main.ts` now adopts through it.
- Tests: `tests/boot-document.test.ts` (5 new tests).
- Evidence: `npx vitest run` in the surface dir, 2026-09-27 17:57 CDT — event log corroborates: `{"kind":"test","msg":"Tests passed","detail":"15 passed 160 passed"}` (was 155 before this session's additions). `npx tsc --noEmit -p tsconfig.json` clean — event log corroborates: `{"kind":"build","msg":"Build passed"}` at 22:58:33Z. Bundle rebuilt via `tools/ide/build-testing-surface.sh` → `SharpeeIDE/Resources/testing-surface/surface.js` (diffstat confirms: 36 lines changed).

### macOS host (`TestingSurfaceViewController.swift`)
- New `static documentSeed(in:)` reads the document's integer seed; `installUserScripts` puts it in the session (falling back to `PlayViewController.idePlaySeed` for a fresh tree); `bootScript` sets `window.__SHARPEE_PLAY_SEED__` from `session.seed`.
- New `TestingSurfaceDocumentSeedTests.swift` (4 tests); new real-path test `testADocumentPinnedAtItsOwnSeedBootsTheEngineAtThatSeed` added to `TestingSurfaceRealPathTests.swift` (document pinned at seed 7 boots the page global at 7, with no notice, and the written-back document keeps seed 7). `xcodegen generate` run.
- Evidence: xcodebuild reported by session at 2026-09-27 ~18:02 CDT — `TestingSurfaceRealPathTests` + `TestingSurfaceExitNoteTests` + `TestingSurfaceDocumentSeedTests`, 27 executed, 0 failures, TEST SUCCEEDED. **[reported by session, unverified]** — this session's event log has no `xcodebuild`/`test` row for the Swift suite (xcodebuild runs went through the xcode MCP tool, not Bash, so the PostToolUse hook that writes test rows never saw it).

### Avalonia host (`PaneHost`)
- New `Shell/TestingSession.cs` (`Build`, `DocumentSeed`, `FreshTreeSeed = 42`); `Shell/ShellWindow.axaml.cs` and `MainWindow.axaml.cs` now build the session through it instead of reading the constant directly.
- New `PaneHost.Tests/TestingSessionTests.cs` (4 tests).
- Evidence: `dotnet test --filter TestingSessionTests|PaneServerTests` ~17:59 CDT — reported by session as 12 passing, 0 failed. Full `dotnet test PaneHost.Tests` ~18:01 CDT — reported by session as 98 passing, 8 failed (all 8 pre-existing, in `HostCapabilityTests`/`SubprocessTests`, thrown by `CapabilityPaths.ToolchainRoot` needing the un-set `SHARPEE_IDE_TOOLCHAIN` env var; unrelated to this change, not re-run). **[reported by session, unverified]** — the event log has two `dotnet test` rows (22:57:47Z, 22:59:57Z) but both are logged as `"Tests ran (status unverified)"`: the hook recorded that a run happened, not the pass/fail counts.

### ADR-307
- D5 amendment note dated 2026-09-27 (GH #540) confirmed in file at line 180: "the document's seed is the engine's seed" — both hosts now read the loaded document's `seed` and boot the engine at it.

### Process
- GH #540 comment posted with the ruling and evidence: https://github.com/ChicagoDave/sharpee/issues/540#issuecomment-5860631565. Issue left open — closes via the landing commit.
- secret-letter's document keeps `seed: 1209` — the CLI already replays it green there; no re-record needed.
- Rule 15: no changed function name matched the mutation-verification signal list (`execute|handle|process|save|update|delete|remove|create|send|dispatch|publish|persist|submit|store`); Behavior Statements and an Integration Reality Statement were produced in conversation instead of running the agent.

## Key Decisions

### 1. Document seed wins over the host constant
GH #540 option 1, matching ADR-307 D5's "fresh boot + deterministic replay at the pinned seed." The IDE play-seed constant (42) is now only the default a *fresh* tree gets; any loaded document with its own `seed` field boots the engine at that value on both hosts.

## Next Phase
- No active plan — N/A.

## Open Items

### Short Term
- GH #541 (tracked directly on GitHub, not the devarch issue store): a second visit to a branch line in one IDE session doubles its cards. Fix proposed on the issue (rebind the line driver on visit) but not implemented this session.
- GH #540: fix is in the working tree, comment posted; not yet closed — closes on the landing commit for this checkpoint's changes.

(GH #540/#541 are the user's own platform issue tracker per standing practice — "all issues go to GitHub" — not devarch-labelled ledger items, so they are not filed through `issues.sh`; `issues.sh list-open` was checked and neither id appears there, consistent with them being outside that store.)

## Files Modified

**Surface** (3 files):
- `tools/ide/web/testing-surface/src/boot-document.ts` (new) - seed-admission decision
- `tools/ide/web/testing-surface/src/main.ts` - adopts boot document through the new function
- `tools/ide/web/testing-surface/tests/boot-document.test.ts` (new) - 5 tests
- `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js` - rebuilt bundle

**macOS host** (3 files):
- `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift` - reads document seed, sets session/page global
- `tools/ide/SharpeeIDETests/TestingSurfaceDocumentSeedTests.swift` (new) - 4 tests
- `tools/ide/SharpeeIDETests/TestingSurfaceRealPathTests.swift` - +1 real-path test

**Avalonia host** (3 files):
- `tools/ide/PaneHost/Shell/TestingSession.cs` (new) - `Build`/`DocumentSeed`/`FreshTreeSeed`
- `tools/ide/PaneHost/Shell/ShellWindow.axaml.cs`, `tools/ide/PaneHost/MainWindow.axaml.cs` - build session through it
- `tools/ide/PaneHost.Tests/TestingSessionTests.cs` (new) - 4 tests

**Docs** (1 file):
- `docs/architecture/adrs/adr-307-testing-tree-model-v2.md` - D5 amendment note (GH #540)

## Notes

**Session duration**: ~30 minutes (started 17:50 CDT, this write ~18:18 CDT).

**Approach**: Same fix applied in parallel across the three places that decide the engine's boot seed (TS surface, Swift host, C# host), each backed by its own new unit tests plus one added real-path test on the macOS side.

**Also uncommitted, carried alongside**: `docs/context/session-20260927-1427-explorer-prototype.md` — the prior session's summary, already finalized after its own commit; staged with this session's changes because it was never committed separately.

**Evidence gap**: the xcodebuild and dotnet test pass/fail counts above are the session's own account, not hook-corroborated (the xcode MCP tool bypasses the Bash-parsing hook entirely; the dotnet hook fired but could not parse counts). Treat the Swift/C# numbers as reported, not verified, until re-run through a corroborating path.

---

## Session Metadata

- **Session**: 0c9de2
- **Status**: IN-FLIGHT
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (nothing pushed; local working tree only)

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-305 D1 (fixed play-seed mechanism) and ADR-307 D5 (fresh-boot + pinned-seed replay) both already in place; this session extends them rather than introducing new machinery.
- **Prerequisites discovered**: None.

## Architectural Decisions

- ADR-307 D5 amended (2026-09-27, GH #540) — the document's `seed` field, not the IDE's fixed play seed, decides the engine's boot seed; the fixed seed is the default for a fresh tree only.
- Pattern applied: same seed-admission logic (AC-4's "refuse and write-lock a mismatched pin") implemented independently on three surfaces — TS, Swift, C# — with local tests on each rather than a shared cross-language module.

## Mutation Audit

- Files with state-changing logic modified: `boot-document.ts` (decides tree adoption), `TestingSurfaceViewController.swift` (sets session/page-global seed), `TestingSession.cs` (builds session state).
- Tests verify actual state mutations (not just events): YES (evidence: vitest event-log row, 160 passing, 2026-09-27 17:57 CDT, for the surface; Swift and C# suites reported by session, unverified per Notes above).
- If NO: N/A for the surface (verified). For Swift/C#: re-run through a hook-visible path (Bash `xcodebuild`/`dotnet test` invocation) to corroborate before relying on the counts in a later session.

## Recurrence Check

- Similar to past issue? NO — this is the first time the seed-source mismatch between a loaded document and a host's boot constant has been fixed; no prior session summary references this pattern.

## Test Coverage Delta

- Tests added: 5 (surface) + 4 (Swift) + 1 (Swift real-path) + 4 (C#) = 14.
- Tests passing before: unknown exact baseline → after: surface 160/160 (evidence: vitest event-log row above). Swift and C# after-counts are session-reported, unverified (see Notes).
- Known untested areas: none newly introduced; the pre-existing 8 `HostCapabilityTests`/`SubprocessTests` failures (missing `SHARPEE_IDE_TOOLCHAIN`) are unrelated and untouched.

---

**Progressive update**: checkpoint 2026-09-27 18:18 — revised in place: added inline evidence citations from the session event log, marked the xcodebuild/dotnet-test pass counts unverified (no corroborating hook row), confirmed GH #540/#541 are tracked outside the devarch issue store, and expanded to full structured form (ADR amendment + 14 new tests + 3+ substantive files cross this session's bar).
