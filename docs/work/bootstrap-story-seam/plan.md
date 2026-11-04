# Session Plan: Type the bootstrap story seam, delete reviveEngine (#645)

**Created**: 2026-11-04
**Plan Status**: ACTIVE
**Authorization**: No ADR. Nothing here is a decision: the no-`any`/`unknown` rule (David, 2026-10-25) and ADR-180's single-loader invariant already decide it, and the survey's convention for issue-only cleanups (lang-en-us #382, parser-en-us #385) applies. David's "bootstrap it is - plan it" (2026-11-04) is the discuss-first authorization for a `packages/` plan scoped to exactly #645; it does not authorize the edits. Each phase runs on David's go, and the reviveEngine deletion (Phase 2) is HELD for his confirmation of the exact list.
**Overall scope**: `packages/bootstrap/src/index.ts` types its one story-loading seam as the engine's `Story`, loses three stale `as any` casts and the dead `LoadedGame.reviveEngine()`, and its test fakes are typed. Type-only except the deletion.
**Bounded contexts touched**: N/A — infrastructure/tooling (the story loader under the Dungeo chain and the Chord trees)
**Key domain language**: N/A
**Out of scope**: event-processor (runner-up 2, carries a David ruling on `handleTaken` writing `worn`), platform-browser, if-domain, the zero-test packages (#435), and any change to `GameEngine.resume()`. ADR-345 D8a's tolerance is not revisited; Phase 2 does write the dated note under D8a and D12 recording that the walker dependency they cite is gone (plan-review 2026-11-04, STALE ADR).

## References consulted
- Issue #645 — the scope: seam, three casts, reviveEngine, test fakes; every file:line below is repeated there.
- `docs/work/refactoring-survey/assessment-20261102-remaining-packages.md` — Runners-up item 1: bootstrap is small and concrete; two importers (devkit `author-game.ts`, transcript-tester `story-loader.ts`).
- `docs/work/adr-391-core-contract/plan.md` — gate shape; its `run-gates.sh`/`compare-gates.sh` are copied here with the directory path swapped.
- `docs/architecture/adrs/adr-180-build-test-devkit.md` — bootstrap is the single loader; the seam must stay one function every host calls.
- `docs/architecture/adrs/adr-345-the-engine-lifecycle-phase-is-an-explicit-concept.md` — D8a: `resume()` tolerates `playing`; read only. Deleting `reviveEngine` leaves `resume()` untouched.
- `docs/architecture/adrs/adr-248-restart-via-platform-events.md` — `freshStory` restart contract; `() => Story` must still return a story with no state shared with the first.
- `/Users/david/repos/sharpee/CLAUDE.md` — platform changes discussed first; never auto-retry failed builds/tests; never delete without confirmation; no `2>&1` with pnpm.
- `docs/context/project-profile.md` — stack and conventions.
- `docs/core-concepts/README.md` — bootstrap paragraph (single story-loading implementation; transcript-tester, CLI bundle, devkit call it).
- `.devarch/descriptor.json` — `documentationStandard: always`: headers on every file touched; the index.ts header's public-interface line drops `reviveEngine`.
- Product ADRs not consulted (no Scope intersection): none exist (ADR-365 is Kind technical; it is the only ADR with a Kind line mentioning product and its Scope does not touch `packages/bootstrap` or `packages/transcript-tester`).

## Gate protocol (every phase)
- `docs/work/bootstrap-story-seam/run-gates.sh <dir>` and `compare-gates.sh <baseline> <dir>` (new; copied from the ADR-391 plan, paths swapped). They cover the Dungeo chain, Dungeo unit transcripts, the three trees (secret-letter, fernhill, ides-of-march), and every package suite including bootstrap, transcript-tester, and devkit (Phase 0 adds `devkit` to the suite list; the copy omits it).
- Prerequisite: `./repokit build dungeo` first; `./sharpee` reads `dist/`, so tsf-build any touched package before the tree gates.
- Every exit state: bootstrap suite at 57 passing (6 files) or higher; workspace root `npx tsc --noEmit` clean; `pnpm --filter '@sharpee/bootstrap' typecheck:tests` exit 0 (the test-file typecheck leg — root `tsc` and vitest do not type-check test files; captured by run-gates.sh as `typecheck-tests-bootstrap`; plan-review 2026-11-04); transcript-tester and devkit at their Phase 0 counts; chain and three trees byte-identical to baseline. Dungeo unit transcripts and the secret-letter tree carry known failures: compare to Phase 0's capture, never to a remembered number.
- Any mismatch: STOP and report. No fix-and-rebuild, no retry.

## Item-to-phase trace

| #645 item | Phase | HELD? |
|---|---|---|
| baseline | 0 | no |
| seam (`Story`), three casts | 1 | no |
| reviveEngine; closes #527, #399 | 2 | **HELD** |
| test fakes typed, header | 3 | no |

## Phases

### Phase 0: Baseline capture
- **Tier**: Small
- **Budget**: 60
- **Domain focus**: N/A — the net every later phase compares against.
- **Entry state**: `main` at `7f3366f96` or later; no build running.
- **Deliverable**: Add `devkit` to the suite list in `docs/work/bootstrap-story-seam/run-gates.sh`. Run `./repokit build dungeo`, then run-gates.sh into `docs/work/bootstrap-story-seam/baseline/` (new). Self-compare. Record inline a table of command, count, date for: chain, Dungeo unit (failing count), three trees, bootstrap (57), transcript-tester, devkit, and every other suite; record `git rev-parse HEAD`.
- **Files**: `docs/work/bootstrap-story-seam/` (new)
- **Exit state**: Baseline table recorded in this plan; capture on disk. A baseline command failing outright (not a known failure) means STOP and report.
- **Demonstration**: `bash docs/work/bootstrap-story-seam/compare-gates.sh docs/work/bootstrap-story-seam/baseline docs/work/bootstrap-story-seam/baseline` reports every gate IDENTICAL.
- **Demonstrated**: 2026-11-04, session 3d8a8b — `bash docs/work/bootstrap-story-seam/compare-gates.sh docs/work/bootstrap-story-seam/baseline docs/work/bootstrap-story-seam/baseline` printed IDENTICAL for all 27 gates, exit 0. [reported by session, unverified]
- **Outcome** (2026-11-04, session 3d8a8b, `git rev-parse HEAD` = `7f3366f9601b79a97d1ef574a501c7db11de927d`; `./repokit build dungeo` exit 0, bundle 5319973 bytes; `bash docs/work/bootstrap-story-seam/run-gates.sh docs/work/bootstrap-story-seam/baseline`, capture committed as `baseline/`, 724K). `devkit` was already in the copied suite list; the `typecheck-tests-bootstrap` gate was added per plan-review. Known failures are the Dungeo unit transcripts and the secret-letter tree; every later phase compares to these captures, never to the numbers:

  | gate | result | exit |
  |---|---|---|
  | dungeo-chain | 952 passed, all tests passed | 0 |
  | dungeo-unit | 1720 passed, 13 failed, 10 expected failures, 2 skipped (known) | 1 |
  | tree-secret-letter | 10 ✗ cards (known; climbing/taking/entering/grate refusals), 1 skipped, rooms entered 85 of 92 | 1 |
  | tree-fernhill | rooms 13 of 13; claims 9 of 10 held, 1 violated (seed 42) | 0 |
  | tree-ides-of-march | rooms 5 of 5 | 0 |
  | suite-bootstrap | 6 files, 57 passed | 0 |
  | suite-transcript-tester | 28 files, 371 passed | 0 |
  | suite-devkit | 30 files passed, 1 skipped; 204 passed, 1 skipped | 0 |
  | suite-engine | 99 files; 884 passed, 7 skipped | 0 |
  | suite-branch-tester | 28 files, 378 passed; plus 1 file, 5 passed | 0 |
  | suite-story-loader | 193 files; 1543 passed, 1 skipped | 0 |
  | suite-core | 153 passed | 0 |
  | suite-stdlib | 1905 passed | 0 |
  | suite-world-model | 1689 passed | 0 |
  | suite-chord | 1779 passed | 0 |
  | suite-character | 641 passed | 0 |
  | suite-parser-en-us | 553 passed | 0 |
  | suite-lang-en-us | 484 passed | 0 |
  | suite-world-index | 237 passed, 1 skipped | 0 |
  | suite-channel-service | 121 passed | 0 |
  | suite-if-domain | 110 passed | 0 |
  | suite-queries | 102 passed | 0 |
  | suite-media | 50 passed | 0 |
  | suite-event-processor | 28 passed | 0 |
  | suite-helpers | 17 passed | 0 |
  | suite-plugins | 17 passed | 0 |
  | typecheck-tests-bootstrap | `tsc -p tsconfig.test.json` clean | 0 |
- **Status**: DONE

### Phase 1: The story seam is `Story`; three casts go
- **Tier**: Medium
- **Budget**: 120
- **Domain focus**: N/A — same file, type-only.
- **Entry state**: Phase 0 done. David's go.
- **Deliverable**: In `packages/bootstrap/src/index.ts`: `assembleGame(story: Story, opts?: { freshStory?: () => Story; ... })` (`:229-232`), `boot(s: Story)` (`:324`); delete the `story?.config as {...}` cast at `:280` (`packages/engine/src/install/story.ts:178`). `engine.start({ capabilities } as any)` (`:360`) takes `ClientCapabilities` (`packages/engine/src/game-engine.ts:665`). The typed write at `:319` (`capabilities[channel.gatedBy] = true`): the phase first reads `ClientCapabilities` (`packages/if-domain/src/channels/types.ts:252`, `text: true` plus boolean flags) and the channel registry's `gatedBy` type, then chooses; the expected shape is a plain typed write with no guard and no throw, because `IOChannel.gatedBy` is already `CapabilityFlag` (`packages/if-domain/src/channels/types.ts:302-310, :391` — exactly the boolean keys of `ClientCapabilities` minus `text`): build `capabilities` as a mutable `ClientCapabilities` (a mapped type dropping `readonly`, spread from `CLI_CAPABILITIES`) and write `capabilities[channel.gatedBy] = true` unchanged (plan-review 2026-11-04). No `any`, no `unknown`. If the typing turns out to need a runtime check that would change behavior for any story, STOP and ask. `(engine as any).getPluginRegistry()` (`:423`): delete the cast and the hand-written return type (`packages/engine/src/game-engine.ts:1173`). `engine.on('channel:packet', ...)` (`:391`): type the callback `(packet: TurnPacket, turn: number)` per `packages/engine/src/types.ts:383`; follow the `packet?.payload?.[id]` reads. Type the facade mirror `createTestableGame(story: Story)` in `packages/transcript-tester/src/story-loader.ts:47`. Importers `packages/devkit/src/standalone/author-game.ts` (passes a compiled ChordStory, `packages/story-loader/src/loader.ts:111`) and the transcript-tester loader must typecheck with no change beyond that one facade line. Behavior Statement per rule 12 for any changed side-effect function.
- **Files**: `packages/bootstrap/src/index.ts`, `packages/transcript-tester/src/story-loader.ts`
- **Exit state**: `grep -n "any" packages/bootstrap/src/index.ts` finds no type-position `any`; gates pass per protocol, chain and trees byte-identical. Mismatch: STOP.
- **Demonstration**: run-gates.sh into `docs/work/bootstrap-story-seam/phase-1/`, then `bash docs/work/bootstrap-story-seam/compare-gates.sh docs/work/bootstrap-story-seam/baseline docs/work/bootstrap-story-seam/phase-1` reports every gate IDENTICAL, plus `npx tsc --noEmit` clean.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 2: reviveEngine is deleted (HELD)
- **Tier**: Small
- **Budget**: 80
- **Domain focus**: N/A — dead interface member.
- **Entry state**: Phase 1 done. **HELD**: the phase posts the exact deletion list below, re-grepped fresh, and STOPS for David's confirm before any edit.
- **Deliverable**: Deletion list (to be re-grepped and posted): `LoadedGame.reviveEngine()` interface member and its doc (`packages/bootstrap/src/index.ts:150`); the body (`:431-433`); the `reviveEngine` test references in `packages/engine/tests/unit/engine-resume.test.ts` (only if they name `reviveEngine` rather than `resume()`; the `resume()` tests themselves stay, ADR-345 D8a pins them); the stale comment near `derivePhaseFromEnding` in `packages/engine/src/game-engine.ts` (#527 cites `:1550`; re-grep) is rewritten, recording the fact that after the deletion `engine.resume()` has no caller outside the engine (`packages/engine/src/game-engine.ts:1571` is internal). That is a fact, not a change to `resume()`. Evidence: `grep -rn reviveEngine packages/branch-tester tools` returns nothing. Close #527 and #399 via `issues.sh close` with the reason (#399 moot: the path is gone). Write a dated amendment note under ADR-345 D8a and under D12 (`docs/architecture/adrs/adr-345-the-engine-lifecycle-phase-is-an-explicit-concept.md`): the branch-tester walker dependency both cite is gone (ADR-356 D4, #527), D12's "transcript-tester RETRY path" names grammar ADR-294 D4 removed, the tolerance stands on AC-9 and the engine-internal callers in `loadSaveData`/`undo` (`game-engine.ts:1571`), and nothing outside the engine calls `resume()` — in Phase 2's commit, as ADR-389 Phase 4 amended ADR-276 D1. ADR-180's "public API (contract)" block already differs from the live `LoadedGame` and never listed `reviveEngine`; note that in this phase's Outcome as pre-existing drift, no amendment here.
- **Files**: `packages/bootstrap/src/index.ts`, `packages/engine/src/game-engine.ts`, `packages/engine/tests/unit/engine-resume.test.ts`
- **Exit state**: `grep -rn reviveEngine packages tools` returns nothing; engine suite at Phase 0 count; gates pass per protocol (tsf-build engine and bootstrap before tree gates). Mismatch: STOP.
- **Demonstration**: the grep above prints nothing; compare-gates.sh against baseline reports every gate IDENTICAL; issues 527 and 399 show CLOSED in gh.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 3: Test fakes typed; header
- **Tier**: Small
- **Budget**: 80
- **Domain focus**: N/A — test typing.
- **Entry state**: Phase 2 done.
- **Deliverable**: `packages/bootstrap/src/assemble-restart.test.ts` (lines 24, 44, 52) and `packages/bootstrap/src/assemble-channels.test.ts` (lines 33, 41, 52, 174, 190, 234): type story fakes and params as `Story` / `WorldModel` / `IChannelRegistry` / `TurnPacket`; no `any`, no `unknown`. Headers per `documentationStandard: always` on both test files and `packages/bootstrap/src/index.ts` (public-interface line without `reviveEngine`). Test grading per rule 13: no assertion weakened.
- **Files**: `packages/bootstrap/src/assemble-restart.test.ts`, `packages/bootstrap/src/assemble-channels.test.ts`, `packages/bootstrap/src/index.ts`
- **Exit state**: bootstrap 57 passing or higher, 6 files; root `npx tsc --noEmit` clean; gates per protocol. Mismatch: STOP.
- **Demonstration**: the bootstrap package test run shows at least 57 passing; compare-gates.sh against baseline reports every gate IDENTICAL (suite-bootstrap count may rise only if a test was added).
- **Demonstrated**: 
- **Status**: PENDING
