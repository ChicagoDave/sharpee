# Session Summary: 2026-09-09 - refactor/survey-adr-334-340 (13:20 CDT)

## Goals
- Phase 7 of `docs/work/game-engine-residue/plan.md`: package shape — the root modules of `packages/engine/src/` move into named directories, moves only, `index.ts` re-exporting the identical name set, gate byte-identical.

## Phase Context
- **Plan**: `docs/work/game-engine-residue/plan.md` — continue ADR-334's decomposition of `packages/engine/src/game-engine.ts` beyond the turn (survey Phases 15-16, archived).
- **Phase executed**: Phase 7 — "Package shape — the root modules move into named directories" (Medium, budget 250).
- **Tool calls used**: 95 (session-state snapshot; the state file's `phase`/`budget` fields were not populated this session, so the 250 ceiling is read from the plan, not the snapshot).
- **Phase outcome**: Completed, gate byte-identical, after a mid-phase pause: the first gate run surfaced a genuine invariant conflict and the phase held for David's ruling (about four hours) rather than resolving it unilaterally.

## Completed
- Session start: recap presented; `pre-session-audit` relayed (type check clean, no phase CURRENT, no blockers); profile fresh (2026-09-04); core concepts read in full; gate scripts and baseline copied from session d99d6d's scratchpad into this session's (`gates/`), `gate-stage.sh` repointed (`p7-` prefix); gate cleared.
- Phase 7 marked CURRENT (13:34 CDT). Export name set of `src/index.ts` captured before any move (112 names, TypeScript checker, `exports/before.txt` in the scratchpad).
- Moves landed (13:35 CDT): 18 root modules into `command/`, `install/` (+`install/narrative/`), `session/`, `ports/`, `introspection/`, `plugins/`, `turn/`; `platform-operations.ts` became `turn/platform-dispatcher.ts` (the stage of that name already lived in `turn/`); `vocabulary-manager.ts` went to `ports/` (unplaced by the plan; it is the engine's seam onto the parser's vocabulary registry). 105 specifiers rewritten across 56 files by a resolver script (`scratchpad/rewrite-imports.cjs`); zero stale specifiers by grep; `tsc --noEmit` clean; export name set identical, 112 names before and after (`scratchpad/exports/{before,after}.txt`, TypeScript checker).
- `tools/repokit/entropy-allowlist.txt`: the two moved engine entries repointed; the `game-engine.ts` entry, stale since Phase 5(e), removed. Six pre-existing drifts (none at moved paths) filed as GH #396. `packages/stdlib/tests/unit/capabilities/interceptor-context-binding.test.ts` header comment path updated.
- Gate `package-shape` (13:36 CDT): tsc clean, build ok, Dungeo chain IDENTICAL, three Chord trees IDENTICAL; engine suite 3 failed / 747 passed / 7 skipped — the three failures are layout assertions pinning the old paths (see Open Items). Reported to David 13:36 CDT; David accepted the recommendation at 17:31 CDT (a gap of about four hours).
- Test fix (17:32 CDT): `platform-dispatcher.test.ts:91` path → `src/turn/platform-dispatcher.ts`; `story-install-order.test.ts:74` exclusion list + `story`, `story-info-projection`; `turn-stage-order.test.ts:109` exclusion list + `turn-event-processor`, `platform-dispatcher`. Gate `package-shape-2` (17:33 CDT): tsc clean, build ok, IDENTICAL ×4, engine 77 files / 750 passed / 7 skipped.
- `tsc --build packages/engine/tsconfig.json --force` then `node scripts/generate-genai-api.js` (17:33 CDT): `engine.md` 50 declarations before and after; 31/31-line diff, every line a module heading or a quoted import path (0 lines otherwise); the plan's "diff empty" is unachievable for a move because the reference names modules by source path — recorded on the plan.
- `mutation-verification` relayed (agent completed 2026-09-09T18:36:34Z / 13:36:34 CDT per the session event log): every hunk a specifier rewrite or rename; jest mock paths in `tests/utils/test-setup.ts` the only non-import lines; covering tests listed per moved module.
- Phase 7 marked DONE on the plan (17:35 CDT) with the full progress note and four findings not acted on.

## Key Decisions
- `platform-operations.ts` → `turn/platform-dispatcher.ts`: the stage already owns the name in `turn/`; the dispatcher's own header calls it that.
- `vocabulary-manager.ts` → `ports/`: unplaced by the plan's layout; it is the engine's seam onto the parser's vocabulary registry, so it sits with the other outward-facing seams.
- The three layout tests widen rather than the layout bending (David, 17:31 CDT): the invariant kept is "every step or stage has its own module, named in its list"; the exclusion lists name the support modules.
- No per-directory barrels this phase: root `index.ts` names every module directly so the name set stayed provably identical; barrels are Phase 8's boundary decision.

## Next Phase
- **Phase 8**: "`index.ts` narrows to the contract" (Small, budget 100) — PENDING, entry state "Phase 7 done" met by this session's close. Carries its own ADR, written at the phase's start, before `index.ts` changes: the consumer inventory already on the plan (78 external files, the symbol union, the `IFEntity` leak) becomes its Context, the export list its Decision.
- **Phase 6**: "Parser adapter normalization" (Medium, budget 250) — still PENDING, discuss-first, awaiting David's decision on where the adapter lives; independent of Phase 8 and may land before or after it.
- **Tier**: Small (100) for Phase 8, Medium (250) for Phase 6.
- **Entry state**: Both phases' stated entry states are met. Neither is marked CURRENT — as at the prior session's close, the choice between advancing Phase 6's discussion or starting Phase 8 (and its ADR) first is David's.

## Open Items
- I-a87c9a-1: GH #396 — entropy allowlist drift found while repointing Phase 7's moved engine entries: two modules unlisted, four stale (none at moved paths), pre-existing. David's call on skipping `stories/_archive/` and repointing the `character` pair.
- I-a87c9a-2: Phase 7 findings not acted on, riders for Phase 8 — (i) `ports/vocabulary-manager.ts`'s header still carries the Phase-4-remediation history comment; (ii) `install/narrative-settings.ts` and `install/narrative/narrative-settings.ts` share a basename one directory apart; (iii) no per-directory barrels yet — which directories get an `index.ts` is Phase 8's decision.
- I-d99d6d-2: `TurnEngine`'s optional field types and the eight dead stage guards — still not taken; Phase 7 confirmed it changes code inside moved files, which this phase forbade, so it remains a rider (now on Phase 8 or later turn-package work).

## Files Modified
- `packages/engine/src/`: 18 `git mv` renames (see plan Phase 7 progress note for the full move table), plus `index.ts`, `game-engine.ts`, and 17 other `src` files (specifiers only)
- `packages/engine/tests/`: 37 files (specifiers only), plus the three layout tests widened (`platform-dispatcher.test.ts`, `story-install-order.test.ts`, `turn-stage-order.test.ts`)
- `tools/repokit/entropy-allowlist.txt`, `packages/stdlib/tests/unit/capabilities/interceptor-context-binding.test.ts` (comment path), `packages/sharpee/docs/genai-api/engine.md` (regenerated), `stories/dungeo/src/version.ts` (build stamp, routine)
- `docs/work/game-engine-residue/plan.md` (Phase 7 DONE)

## Notes
- Session started: 2026-09-09 13:20 CDT (session a87c9a), about 30 minutes after session d99d6d closed at 12:52 CDT.
- **Evidence accounting**: the session event log (`docs/context/.devarch-events-a87c9a.jsonl`) directly captured the `mutation-verification` agent's completion at `2026-09-09T18:36:34Z` (13:36:34 CDT), cited above and in the Mutation Audit section. It did not separately capture the gate scripts' own output (`tsc`, the build, the transcript/Chord-tree comparisons, or the vitest counts) — those two `test`-kind rows are the hook detecting `sed`/`grep` display commands mid-session, not the gate runs themselves. The gate results (IDENTICAL ×4, engine suite counts) are quoted above and in Test Coverage Delta from `docs/work/game-engine-residue/plan.md`'s own Phase 7 progress note, which records command, result, and timestamp inline for each gated step — the same sourcing the prior session (d99d6d) used for its Phase 5 gate tables.
- Rule 13a's Integration Reality Statement does not apply here: "engine" appears in the Goals only via the package path (`packages/engine/src/`), and this is a refactor session — moves and specifier rewrites only, no owned dependency (subprocess, runtime spawn, migration) being integrated. The exemption for refactor sessions applies, as it did for the prior session on this same plan.
- Nothing committed yet as of this write; finalize (commit + push) runs immediately after this summary.

---

## Session Metadata

- **Session**: a87c9a
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (this session's scope — Phase 7 — fully closed; Phase 8 is Small/100 and ready pending David's start-order choice against Phase 6, Medium/250, discuss-first)
- **Rollback Safety**: safe to revert — nothing committed yet as of this write; all changes (18 `git mv` renames plus specifier rewrites) are uncommitted working-tree edits on `refactor/survey-adr-334-340` (unmerged, survey's own branch)

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 7's entry state (Phase 5 done) — confirmed present at phase start. Gate scripts and baseline captures carried across from session d99d6d's scratchpad, as in prior sessions on this plan. The plan's own pre-check that `package.json` exports only `"."` (no subpath wildcards, so no outside consumer can see a move) was verified 2026-09-09 before this phase started.
- **Prerequisites discovered**: none newly discovered.

## Architectural Decisions
- None this session — Phase 7 is a moves-only reorg under the layout already confirmed by David 2026-09-09 (`ddd-assessment-4.md`); no code inside any moved file changed. The one real boundary decision this reorg sets up — `index.ts`'s narrowed export surface — is Phase 8's, and Phase 8 is explicitly scoped to carry its own ADR, written at that phase's start rather than this one.
- Pattern applied: mechanical specifier rewrite via a resolver script mapping each old path to its new location, preserving each specifier's original form (`.js`, bare, or directory) — the same approach used for prior moves on this plan.

## Mutation Audit
- Files with state-changing logic modified: none. This phase moved 18 files and rewrote 105 import specifiers across 56 files; no function body, export name, or logic changed in any moved file.
- Tests verify actual state mutations (not just events): **N/A** — no mutating logic was touched. Verified instead by the `mutation-verification` agent (session event log, completed `2026-09-09T18:36:34Z` / 13:36:34 CDT): "every hunk a specifier rewrite or rename," with the three `tests/utils/test-setup.ts` jest mock-path strings the only non-`import`/`export` lines in the diff.
- If NO: N/A.

## Recurrence Check
- Similar to past issue? **NO** — the mid-phase invariant conflict (three layout tests pinning the pre-move paths) is a first occurrence on this plan; Phases 0-6 had no comparable pause. No other blocker was hit this session.

## Test Coverage Delta
- Tests added: 0. Three existing layout tests (`platform-dispatcher.test.ts`, `story-install-order.test.ts`, `turn-stage-order.test.ts`) had their path/exclusion-list assertions widened to reflect the new layout — a fix to existing assertions, not new coverage.
- Tests passing before: 77 files / 750 passed / 7 skipped (Phase 5 close, unchanged going into this phase) → after: 77 files / 750 passed / 7 skipped (gate `package-shape-2`, 17:33 CDT). Evidence: quoted from `docs/work/game-engine-residue/plan.md`'s Phase 7 progress note (command, result, and timestamp recorded inline at each gated step — see Notes on hook coverage); the first gate run (`package-shape`, 13:36 CDT) reported 3 failed / 747 passed / 7 skipped, the same total, before the three layout tests were fixed.
- Gate byte-identical: `package-shape` (13:36 CDT) reported IDENTICAL ×4 alongside its 3 test failures (the gate's build/transcript/Chord-tree legs, independent of the vitest legs that failed); `package-shape-2` (17:33 CDT) reported IDENTICAL ×4 with the vitest legs also clean.
- Known untested areas: Phase 6 (parser-adapter normalization) remains discuss-first and untouched; Phase 8 (`index.ts` narrowing) not started.

---

**Progressive update**: Session completed 2026-09-09 17:35 CDT
