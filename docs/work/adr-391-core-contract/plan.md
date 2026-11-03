# Session Plan: Implement ADR-391 — `@sharpee/core` names its contract

**Created**: 2026-11-03
**Plan Status**: ACTIVE
**Overall scope**: Replace `packages/core/src/index.ts`'s eight `export *` lines with a named export list of the symbols other packages import (the 71, plus `EventDataRegistry`), explain the event registry's declaration-merging liveness in its header, delete the dead subsystems after David confirms the list (D2), and trim the dead halves of live files from a per-symbol table after David confirms it (D3). Every phase lands byte-identical; event-helpers.ts is not touched (D8); no importer outside `core` changes a line.
**Bounded contexts touched**: N/A — structural refactor of one infrastructure package at the bottom of the stack (`packages/core`); no domain behavior changes, no event shape, save format, random stream, or IFID rule changes.
**Key domain language**: N/A — uses the ADR's terms: contract (the named root barrel), dead subsystem, trim table (delete / un-export / keep), declaration merging, byte-identical phase.
**Out of scope (named by the caller)**: bootstrap, event-processor, platform-browser, if-domain, and GH #643 (the event model debt, D8).
**Authorization**: ADR-391 ACCEPTED 2026-11-03 authorizes this plan, not the edits (D7). Phases 3 and 4 are HELD: each posts an exact list, STOPs, and executes only after David says "confirm". Platform (`packages/`) discussion is satisfied by ADR-391's acceptance, scoped to exactly its decisions.

## References consulted
- `docs/architecture/adrs/adr-391-core-names-its-contract.md` — D1-D8, AC-1..6: named barrel + `tests/surface.test.ts`, registry header (D4), confirmed deletions (D2), confirmed trim table (D3), facade unchanged (D5), phase order D1 -> D4 -> D2 -> D3 (D6), discuss-first (D7), event-helpers.ts untouched (D8).
- `docs/work/refactoring-survey/assessment-20261102-remaining-packages.md` — the measurement and its method (whole-word grep of exports across `packages/*/src`, `tools/*/src`, `stories/*/src`); the 71/241/143/121 counts, per-file used/total table. Counts are at `2fd7336b5`; HEAD is `911370216`, so every phase re-verifies by grep.
- `docs/work/archive/refactoring-survey/plan.md` — the shape copied here: Phase 0 baseline with `run-gates`/`compare-gates`, HELD phases that post the list and stop, Outcome lines carrying command + count + date inline.
- `/Users/david/repos/sharpee/CLAUDE.md` — never delete without confirmation; never auto-retry a failed build or test (every exit state says STOP); `./repokit build`, never `pnpm build`; transcripts only through `dist/cli/sharpee.js`; do not use `2>&1` with pnpm.
- `docs/context/project-profile.md` — strict TypeScript; test command `pnpm exec turbo run test:ci`; the three-gate testing shape (package suites, Dungeo chain, Chord trees).
- `packages/world-index/src/index.ts` — the named-barrel precedent (each symbol written out, header explains the package).
- `docs/architecture/adrs/adr-338-world-model-surface-and-dead-subsystems.md` (via ADR-391 Parent) — same finding one package lower; the test-only-case deletion reasoning of Amendment A2.
- `docs/architecture/adrs/adr-178-*.md` (via ADR-391 Parent; not individually re-read) — the umbrella's baseline is the import contract; `core` is in it, hence the facade-unchanged rule.
- Product ADRs not consulted (no Scope intersection): none identified as product-Kind among those read; ADR-391 is technical.

## Gate protocol (used by every phase)
- `docs/work/adr-391-core-contract/run-gates.sh` (new) with a directory argument runs, capturing raw output to `<dir>`: the Dungeo chain (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`), the Dungeo unit transcripts (`node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript`), the three trees (`./sharpee test branch-stories/secret-letter`, `.../fernhill`, `.../ides-of-march`), and the package suites for core and every dependent suite (engine, stdlib, world-model, story-loader, chord, character, parser-en-us, lang-en-us, transcript-tester, branch-tester, plus any other package with a test script that depends on core).
- `docs/work/adr-391-core-contract/compare-gates.sh` (new) with a baseline directory and a phase directory strips wall-clock lines (`(NNNms)` suffixes, `Duration`, unpinned `Seed: ... (clock)`) before a byte diff, and compares vitest output on its summary counts.
- Dungeo unit transcripts carry a known-failure baseline (12 failing on 2026-09-08); Phase 0 re-measures it, and later phases compare against that, never against 12.
- Every phase exit state: workspace `tsc --noEmit` clean for every package, core suite at the expected count, downstream suites at baseline, chain and three trees byte-identical via compare-gates.sh. Any mismatch: STOP and report. No fix-and-rebuild, no retry.

## Item-to-phase trace

| ADR-391 | Phase | HELD? |
|---|---|---|
| baseline (D6) | 0 | no |
| D1, AC-1 | 1 | no |
| D4, AC-5 (+ stale ADR-097 citations) | 2 | no |
| D2, AC-2 (deletions) | 3 | **HELD** |
| D3, AC-2 (trim) | 4 | **HELD** |
| AC-2 (generated reference), AC-3, AC-6 | 5 | no |

## Phases

### Phase 0: Baseline capture
- **Tier**: Small
- **Budget**: 80
- **Domain focus**: N/A — establishes the net every later phase compares against.
- **Entry state**: `main` at `911370216` (untracked `docs/work/save-restore-551/` is not this plan's; leave it). No build running.
- **Deliverable**: Write `docs/work/adr-391-core-contract/run-gates.sh` (new) and `docs/work/adr-391-core-contract/compare-gates.sh` (new). Run `./repokit build dungeo`, then run-gates.sh into `docs/work/adr-391-core-contract/baseline/` (new). Record in this plan, inline, a table of command, count, date for: Dungeo chain, Dungeo unit transcripts (with the failing-count baseline), the three trees, `pnpm --filter @sharpee/core test` (13 files, 176 passing on 2026-11-02 — re-measure), and every dependent suite. Record the `git rev-parse HEAD` as `<before>` for AC-3. Also snapshot sha256 of `packages/core/src/events/event-helpers.ts` for AC-6.
- **Files**: `docs/work/adr-391-core-contract/` (new)
- **Exit state**: Baseline table recorded inline; baseline output captured. If any baseline command fails outright (not a known skip or known unit-transcript failure), STOP and report.
- **Demonstration**: running compare-gates.sh with the baseline directory against itself must report every gate identical (self-compare proves the filter is deterministic).
- **Outcome (2026-11-03, session 99293e, `main` at `911370216`)**: `run-gates.sh` and `compare-gates.sh` written in this directory (compare strips ANSI codes, `(NNNms)` suffixes, `Duration`/`Start at` lines, unpinned `Seed: … (clock)` lines, and the trees' per-claim wall-clock fields before diffing; vitest captures compare on `Test Files`/`Tests` summary lines). `./repokit build dungeo` exit 0, bundle 5,323,609 bytes. Baseline captured to `baseline/` (25 gates); **`<before>` for AC-3 is `911370216`; `sha256(packages/core/src/events/event-helpers.ts)` = `e8adac2516817b9f0fb737876b61f77ed544a6a414945b61c3a29503b267a4cb` for AC-6.**

  | gate | result |
  |---|---|
  | Dungeo chain (`--test --chain wt-*`) | exit 0, 952 passed, "All tests passed" |
  | Dungeo unit transcripts | exit 1, 1721 passed, **12 failed** (the known baseline, same count as 2026-09-08), 10 expected failures, 2 skipped |
  | secret-letter tree | exit 1, 1458 cards passing, 2639 assertions passing, **11 cards failing, 13 assertions failing**, 21136 commands; the derived tier's "standard action refused first" rows are GH #522. Red at HEAD before any edit — no source changed in this phase — so it is recorded as the baseline, not a stop; later phases compare against this capture byte for byte |
  | fernhill tree | exit 0, 86 cards passing, 107 assertions passing |
  | ides-of-march tree | exit 0, 39 cards passing, 51 assertions passing, 75 commands |
  | core | 13 files, 176 passing |
  | engine | 99 files, 884 passing, 7 skipped |
  | stdlib | 150 files, 1905 passing |
  | world-model | 105 files, 1689 passing |
  | story-loader | 193 files, 1543 passing, 1 skipped |
  | chord | 111 files, 1779 passing |
  | character | 54 files, 641 passing |
  | parser-en-us | 50 files, 553 passing |
  | lang-en-us | 34 files, 484 passing |
  | transcript-tester | 28 files, 371 passing |
  | branch-tester | 28 files, 378 passing (plus a second project: 1 file, 5 passing) |
  | event-processor | 7 files, 28 passing |
  | channel-service | 9 files, 121 passing |
  | if-domain | 7 files, 110 passing |
  | media | 3 files, 50 passing |
  | helpers | 5 files, 17 passing |
  | queries | 2 files, 102 passing |
  | plugins | 2 files, 17 passing |
  | bootstrap | 6 files, 57 passing |
  | world-index | 19 files, 237 passing, 1 skipped |

  Read-only prep for Phase 1 done alongside: a multi-line-aware scan of `import`/`export { … } from '@sharpee/core'` across `packages/*/src`, `packages/extensions/*/src`, `tools/*/src`, `stories/*/src` finds **95 distinct names**, not the 71 the assessment's single-line scan reported (that scan missed multi-line imports and `packages/extensions`); the 241-published / 143-unconsumed finding stands (241 − 95 = 146 published names nobody imports). Phase 1 reconciles the ADR's "71" with an Amendment. One name the ADR's D3 table lists as factory-side, `GameLifecycleStartedData`, has an importer and therefore stays public.
- **Demonstrated**: `bash docs/work/adr-391-core-contract/compare-gates.sh baseline baseline` → 25 gates IDENTICAL, exit 0 (2026-11-03). [reported by session, unverified: compare-gates.sh output is not a hook-logged row; the nearest event is a test row "150 passed 1905 passed" at 2026-11-03T07:56:07Z, after the script's last edit at 07:56:06Z]
- **Status**: DONE (2026-11-03, session 99293e)

### Phase 1: D1 — the root barrel names the contract
- **Tier**: Medium
- **Budget**: 220
- **Domain focus**: `core` public surface — the named list is written against the CURRENT tree, so workspace `tsc` proves the 71-symbol contract before anything is deleted.
- **Entry state**: Phase 0 DONE.
- **Deliverable**: (a) Derive the list by grep, not from memory: every name imported from @sharpee/core across `packages/*/src`, `tools/*/src`, `stories/*/src` outside `packages/core`, including multi-line imports, `import type`, and re-exports; record the derived list inline (expect 71) and reconcile any difference from the assessment. Add `EventDataRegistry` (D4) and `getUntypedEventData` (D8, consumers exist). (b) Rewrite `packages/core/src/index.ts` as a named export list in the `world-index` shape, with a header; no `export *` remains. Names are exported from their defining module (./events/types.js and its siblings), grouped by area. (c) `packages/core/tests/surface.test.ts` (new) with two assertions: the root barrel contains no `export *` line; every name the barrel exports resolves to a definition (so a deleted module cannot leave a dangling line). No count assertion, no line budget (ADR-334 D2). (d) Decide whether the sub-barrels (events, types, query, and the others) stay as intra-package convenience or go; record the decision and reason. Stage nothing that changes behavior: no definition moves or changes.
- **Files**: `packages/core/src/index.ts`, `packages/core/tests/surface.test.ts` (new), `packages/core/src/events/index.ts`, `packages/core/src/types/index.ts`
- **Exit state**: `grep -c 'export \*' packages/core/src/index.ts` is 0; workspace `tsc --noEmit` clean in every package (a missed name fails here); the surface test passes; core suite = baseline + 2 cases; downstream suites at baseline; compare-gates.sh identical. AC-1 scratch check: add a scratch `export *` line, then separately remove a listed name's definition; each fails the surface test by name; revert both (`git checkout`) and confirm the reverts with grep. Any mismatch: STOP and report.
- **Demonstration**: the core package test run (pnpm filter on @sharpee/core) shows the new surface cases passing at baseline plus 2; `grep -c 'export \*' packages/core/src/index.ts` prints 0; the scratch violations fail the surface test by name.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 2: D4 — registry header and stale ADR citations
- **Tier**: Small
- **Budget**: 50
- **Domain focus**: `core` event registry — documentation only.
- **Entry state**: Phase 1 DONE.
- **Deliverable**: One header paragraph in `packages/core/src/events/event-registry.ts` stating that its `*Data` entries are live by declaration merging (media's registry-merge module and stdlib's event-registry module), reached by event-type key, and will show as unreferenced to any name-based scan. Correct the stale "ADR-097" citation at `packages/core/src/events/game-events.ts:9` to ADR-064 (ADR-097 is the React client ADR), and the same stale number at `docs/core-concepts/README.md:499`. Follow the header convention (logic first, `References:` block after). Comment and docs only.
- **Files**: `packages/core/src/events/event-registry.ts`, `packages/core/src/events/game-events.ts`, `docs/core-concepts/README.md`
- **Exit state**: Header paragraph present; `grep -n 'ADR-097' packages/core/src/events/game-events.ts docs/core-concepts/README.md` shows no stale event-pattern citations; workspace `tsc --noEmit` clean (`media` and `stdlib` still compile their merges, AC-5); core suite unchanged; compare-gates.sh identical (comment-only, so the bundle rebuild plus gate is the check). STOP on any mismatch.
- **Demonstration**: `grep -n 'declaration merging' packages/core/src/events/event-registry.ts` finds the paragraph; the core package test run (pnpm filter on @sharpee/core) unchanged count.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 3: D2 — dead subsystems deleted (HELD)
- **Tier**: Medium
- **Budget**: 150
- **Domain focus**: `core` — whole-file deletion of code nothing outside its directory reads.
- **Entry state**: Phase 2 DONE. **HELD: David's confirmation of the exact list below is required before any file is deleted. Do not infer confirmation.**
- **Deliverable**: Step 1, re-verify each candidate against HEAD by grep (importers across the three source trees, plus `core` internals and tests; the ADR's counts were at `2fd7336b5`) and POST the list, then STOP: `packages/core/src/constants/` (5 files: attributes, core-events, entity-types, relationships, index); `packages/core/src/extensions/` (types, registry, index) with `packages/core/tests/extensions/registry.test.ts` (17 cases); `packages/core/src/debug/` (2 files); `packages/core/src/execution/` (2 files); `packages/core/src/events/typed-event.ts`; `packages/core/src/events/standard-events.ts` (and the 2 StandardEventTypes cases in `packages/core/tests/events/event-system.test.ts`, lines about 181-200); `packages/core/src/types/attribute.ts`; `packages/core/src/types/relationship.ts`; their barrel lines and any Phase 1 named-barrel entries. Include the arithmetic: core suite 176 minus the deleted cases (exact count measured at execution; expected about 157 = 176 - 17 - 2) plus 2 surface cases. Step 2, after "confirm": delete, remove barrel lines, record David's confirmation (date, wording) inline; then `./repokit clean` before `./repokit build dungeo`, because tsc never deletes outputs for removed sources (GH #413) and the CJS path and the API-reference generator both read `dist/` (plan-review 2026-11-03).
- **Files**: `packages/core/src/constants/`, `packages/core/src/extensions/`, `packages/core/src/debug/`, `packages/core/src/execution/`, `packages/core/src/events/typed-event.ts`, `packages/core/src/events/standard-events.ts`, `packages/core/src/types/attribute.ts`, `packages/core/src/types/relationship.ts`, `packages/core/tests/extensions/`, `packages/core/tests/events/event-system.test.ts`, `packages/core/src/events/index.ts`, `packages/core/src/types/index.ts`, `packages/core/src/index.ts`
- **Exit state**: AC-2 directories and files absent; the tests/extensions directory absent; workspace `tsc --noEmit` clean; core suite at the recorded arithmetic; downstream suites at baseline; compare-gates.sh identical; surface test green. STOP on any mismatch, no fix-and-rebuild.
- **Demonstration**: running compare-gates.sh with the baseline directory against the phase3 directory reports all identical; the core package test run (pnpm filter on @sharpee/core) shows the recorded count.
- **Demonstrated**: 
- **Status**: PENDING (HELD)

### Phase 4: D3 — dead halves trimmed from a confirmed table (HELD)
- **Tier**: Medium
- **Budget**: 200
- **Domain focus**: `core` events, types, query, metadata — symbol-level trim of live files.
- **Entry state**: Phase 3 DONE. **HELD: David's confirmation of the table is required before any symbol is deleted or un-exported.**
- **Deliverable**: Step 1, build and POST one row per symbol, re-verified against HEAD by grep, each with a verb, then STOP. **delete**: the eight `isGame*` guards, `GameState`, the seven orphan `GameLifecycle*Data` (`FatalError`, `InitFailed`, `SessionSaving`, `SessionSaved`, `SessionRestoring`, `SessionRestored`, `StoryLoadFailed`), `isSystemEvent`, `SubsystemType`, `isQueryEvent`, `IQueryContext`, `ISerializedDaemonState`, `ISerializedFuseState`, `ISerializedSchedulerState`, `IStoryConfig`, `IEntityOperationOptions`, `ICommandResult`, `StoryConfigValidationResult`, `EventDataFor`; and the test-only rows per Q-2: `isPlatformEvent`, `isPlatformCompletionEvent`, `IUndoContext`, `createEmptyEvent`, `createMessageEvent`, `resetEventCounter`, with the platform-events and typed-events test cases (and any event-system or SimpleEventSource cases that remain after Phase 3) that read them. **un-export** (kept in-file): `createGameEvent`, the factory-side `GameLifecycle*Data` and `GameEvent*Data` interfaces, `PlatformEventTypeValue`, `CreateEventOptions`, `MessageVariant`. **keep**: every function in `packages/core/src/events/event-helpers.ts` (D8, file untouched), `isPlatformRequestEvent`, `createTypedEvent`, and everything in the Phase 1 list. The table lists each deleted test case by name and the suite arithmetic (core count after Phase 3 minus the exact cases removed). Step 2, after "confirm": execute, record David's confirmation inline.
- **Files**: `packages/core/src/events/game-events.ts`, `packages/core/src/events/system-event.ts`, `packages/core/src/events/platform-events.ts`, `packages/core/src/events/event-factory.ts`, `packages/core/src/events/event-registry.ts`, `packages/core/src/query/`, `packages/core/src/types/save-data.ts`, `packages/core/src/types/entity.ts`, `packages/core/src/types/result.ts`, `packages/core/src/metadata/`, `packages/core/tests/events/platform-events.test.ts`, `packages/core/tests/events/typed-events.test.ts`, `packages/core/tests/events/event-system.test.ts`, `packages/core/src/index.ts`
- **Exit state**: every table row executed as confirmed; the event-helpers.ts hash equals Phase 0's snapshot; workspace `tsc --noEmit` clean; core suite at the recorded arithmetic; downstream suites at baseline; compare-gates.sh identical. STOP on any mismatch.
- **Demonstration**: running compare-gates.sh with the baseline directory against the phase4 directory all identical; `git diff --stat 911370216 -- packages/core/src/events/event-helpers.ts` prints nothing.
- **Demonstrated**: 
- **Status**: PENDING (HELD)

### Phase 5: Regenerated reference and acceptance sweep
- **Tier**: Small
- **Budget**: 80
- **Domain focus**: N/A — acceptance evidence.
- **Entry state**: Phase 4 DONE.
- **Deliverable**: `./repokit clean` then `./repokit build dungeo` regenerates `packages/sharpee/docs/genai-api/core.md` from a dist/ with no orphaned `.d.ts` (GH #413; plan-review 2026-11-03). Record inline: AC-1 (`grep -c 'export \*' packages/core/src/index.ts` is 0; surface test green); AC-2 (directories/files absent; grep over `packages/sharpee/docs/genai-api/core.md` for `Extension`, `ICommandHandler`, `IExecutionContext`, `IDebug`, `CoreConstants` finds none); AC-3 (`git diff --stat <before>..HEAD -- packages ':!packages/core' ':!packages/sharpee/docs/genai-api'` is empty); AC-4 (final compare-gates.sh identical, evidence per phase already inline); AC-5 (header paragraph; `media`/`stdlib` compile); AC-6 (event-helpers.ts byte-identical to Phase 0's hash; GitHub issue #643 exists and is linked from the ADR's Status line). Update the ADR-391 Status line to record implementation complete if David agrees. Final workspace `tsc --noEmit` and `pnpm exec turbo run test:ci` counts recorded.
- **Files**: `packages/sharpee/docs/genai-api/core.md`, `docs/architecture/adrs/adr-391-core-names-its-contract.md`
- **Exit state**: All six ACs recorded with command, result, date. STOP on any mismatch.
- **Demonstration**: `grep -c 'Extension' packages/sharpee/docs/genai-api/core.md` prints 0; `git diff --stat 911370216 -- packages` outside packages/core and the genai-api directory prints nothing.
- **Demonstrated**: 
- **Status**: PENDING
