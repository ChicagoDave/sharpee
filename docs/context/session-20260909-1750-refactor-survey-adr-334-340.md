# Session Summary: 2026-09-09 - refactor/survey-adr-334-340 (17:45 CDT)

## Goals
- Phase 8 of `docs/work/game-engine-residue/plan.md`: `index.ts` narrows to the contract — ADR first (consumer inventory as Context, export list as Decision), then `index.ts` loses every `export *`, every consumer compiles, the generated API reference diff is the record of what left, gate byte-identical.

## Phase Context
- **Plan**: `docs/work/game-engine-residue/plan.md` — "Extract game-engine.ts residue (ADR-334 follow-on)"
- **Phase executed**: Phase 8 — "index.ts narrows to the contract" (Small tier)
- **Tool calls used**: 96 / 100
- **Phase outcome**: Completed under budget

## Completed

### ADR-342: engine package contract
- Consumer inventory re-derived: grep of every `@sharpee/engine` import/require across `packages/`, `stories/`, `tools/`, `branch-stories/`, `scripts/`, `docs/book`, `tutorials/` (minus `_archive` and dist) — 26 names in the union; the plan's flagged `IFEntity` leak is already absent from the checker's 112-name export set (its one importer is an uncompiled stdlib example).
- ADR-342 written (`docs/architecture/adrs/adr-342-engine-package-contract.md`): D1 the 31-name contract (26 inventory + 4 stage names + `EngineConfig` by judgment), D2 the 81 names that leave by group with reasons, D3 reachable-is-not-named, D4 root barrel names declaring modules never sub-barrels, D5 the set pinned by a test, D6 no behavior change.
- `adr-review` run at David's request ("review the ADR again"): 16/16 after three folds — a citation line range (22-35), a durable citation for the 112 count (checker method + commit, not a scratchpad file), and the repointed `platform-dispatcher.test.ts` assertion named in Scope.
- David: "accept" — ADR-342 **ACCEPTED**, with an as-built note recording the same-session implementation.

### index.ts rewrite and gate
- `index.ts` rewritten: no `export *`, 31 names exported from their declaring modules, rule-9 header. Export map (checker) 112 → 31.
- `tests/unit/public-surface.test.ts` added (D5): asserts no wildcard export and that the checker's export set equals the contract; 2 passing.
- `tests/unit/platform-dispatcher.test.ts:253` repointed: it previously asserted the barrel exported `processEvent`, `enrichTurnEvents`, `dispatchPlatformOperations` (now internal per D2); it now asserts those on the declaring modules and that the barrel names none of them.
- Gate `contract` (17:59 CDT, as reported by session — not independently re-run at finalization): tsc clean, build ok (engine + every downstream consumer compiled, none edited), IDENTICAL ×4 (Dungeo walkthrough chain, three Chord trees).
- AC-2 negative-control check: scratch `export { wasRefused }` correctly produced `unexpected: ['wasRefused']` from the checker; reverted via `git checkout`, `index.ts` re-written with the identical 31-name content, both tests re-run.
- `tsc --build --force` on engine (I-71ed1a-3 workaround) then `generate-genai-api.js`: `engine.md` 50 → 14 declarations, 4,424 → 2,303 lines; `index.md` count line updated.
- `mutation-verification` relayed: diff under `src/` is `index.ts` only, no function body changed; both new/repointed tests GREEN (checker-resolved export set, module-namespace inspection); every name real consumers import is in the contract; the two `examples/` files were already broken before this phase.
- Full engine suite re-run at finalization (verification for this summary, not part of the session's own work): `pnpm --filter '@sharpee/engine' test`, 2026-09-09 18:55:41 CDT — **78 test files passed, 752 tests passed, 7 skipped** (759 total). Confirms the session's reported gate count.

### DevArch issue filed (David's request, mid-session)
- ChicagoDave/devarch#3: the id-collision scan treats dated blog/book filenames as ADR ids (`adr-locate.sh:45-60` discovers any directory with two `NNNN-*.md`; `id-collision-scan.sh` takes the year as the number); the stranded event-log line noted as a second noise source.

## Key Decisions

### 1. ADR-342 — engine package contract
The engine's public surface is the consumer union plus the authoring surface, named one by one; `EngineConfig` is the one name added by judgment; reachable-but-unnamed types stay internal (the `IProsePipeline` precedent already set this); the root barrel never re-exports a sub-barrel. Link: `docs/architecture/adrs/adr-342-engine-package-contract.md`.

### 2. Implemented ahead of formal acceptance
The rewrite, tests, and reference regeneration landed before David's "accept" so he could review the ADR, the gate, and the `engine.md` diff together; everything reverts with `index.ts` alone if a name is rejected. No behavior change accompanied the surface narrowing (D6).

## Next Phase
- **Phase 6**: "Parser adapter normalization" — Medium tier (budget 250). Normalizes the parser once at `GameEngine` construction into a single adapter shape, replacing the four capability-guard functions and the fifth unguarded cast.
- **Status**: remains **PENDING**, not advanced to CURRENT — the plan's own entry state gates it on discussion first (CLAUDE.md "Platform changes require discussion first"): whether the adapter lives in `packages/engine` (recommended, no change to `if-domain`'s `Parser` contract) or `if-domain`'s `Parser` contract instead requires the five methods outright. This is David's call before the phase starts.
- **Entry state**: Phase 5 (and now Phase 8) done; the seven call sites and the one `Parser` implementation (`EnglishParser`) are already inventoried in the plan.

## Open Items

### Short Term
- I-42e176-1: three story-loader tests import `PluginRegistry` from `@sharpee/engine`; repoint to `@sharpee/plugins` and retire the re-export (ADR-342 Consequences).
- I-42e176-2: two dead examples do not compile and import names that no longer exist — `packages/stdlib/examples/pushable-trait-with-handler.ts` (`IFEntity` from engine) and `packages/engine/examples/language-management.ts` (`createStandardEngine`); David's call whether to delete or fix.

### Long Term
- I-71ed1a-3: `tsc --build --force` before trusting the generated API reference (GH #391 workaround) — applied again this session; the underlying incremental-tsc staleness bug remains open.

## Files Modified

**ADR & plan** (2 files):
- `docs/architecture/adrs/adr-342-engine-package-contract.md` (new, ACCEPTED)
- `docs/work/game-engine-residue/plan.md` (Phase 8 CURRENT → DONE, progress note with gate evidence)

**Engine package** (3 files):
- `packages/engine/src/index.ts` — rewritten: 112 → 31 named exports, no `export *`
- `packages/engine/tests/unit/public-surface.test.ts` (new) — pins the 31-name contract
- `packages/engine/tests/unit/platform-dispatcher.test.ts` — one assertion repointed to declaring modules

**Generated reference** (2 files):
- `packages/sharpee/docs/genai-api/engine.md` — regenerated, 50 → 14 declarations
- `packages/sharpee/docs/genai-api/index.md` — count line updated

**Routine** (1 file):
- `stories/dungeo/src/version.ts` — build-date stamp

**Ledger** (1 file):
- `docs/context/.open-items.jsonl` — I-42e176-1, I-42e176-2 opened this session

## Notes

**Session duration**: ~65 minutes (17:45–18:53 CDT), plus finalization.

**Approach**: ADR written and reviewed before code, so the ADR, the gate, and the `engine.md` diff could be reviewed together; the rewrite is revertible via `index.ts` alone if a name is rejected.

**Evidence gap disclosed**: the gate's Dungeo-chain and three-Chord-tree IDENTICAL ×4 result is carried as the session's own report — no event-log row or finalization re-run corroborates it (a full gate re-run was out of scope for finalization). The engine test-suite count (78 files / 752 passed / 7 skipped) was independently re-run and confirmed at finalization.

---

## Session Metadata

- **Session**: 42e176
- **Status**: COMPLETE (unverified: gate byte-identical claim — Dungeo walkthrough chain and three Chord trees IDENTICAL ×4, reported by session only, not independently re-run at finalization)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — nothing merged to main; `index.ts` alone reverts the API surface, ADR-342 and the two test files are new/isolated changes with no other consumer edits.

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 7 (package layout, moves only) done; engine `tsc` clean at session start; consumer inventory groundwork already present from Phase 7's findings (I-a87c9a-2, point iii).
- **Prerequisites discovered**: none.

## Architectural Decisions
- ADR-342: Engine package contract — ACCEPTED 2026-09-09 (session 42e176). Names the 31-export public surface; everything else becomes internal; root barrel never re-exports a sub-barrel. `docs/architecture/adrs/adr-342-engine-package-contract.md`.
- Pattern applied: rule 8 (Clear Boundaries) — the first phase to give `packages/engine` a boundary it never had.

## Mutation Audit
- Files with state-changing logic modified: none — this phase changed only the export surface (`index.ts`) and one test's assertion target; no function body changed (confirmed by `mutation-verification`).
- Tests verify actual state mutations (not just events): N/A — this is a public-API-surface change, not a state-mutation change.
- If NO: N/A

## Recurrence Check
- Similar to past issue? NO — first contract-narrowing phase in this plan; Phase 7 (package layout) was moves-only and a different concern.

## Test Coverage Delta
- Tests added: 2 (`public-surface.test.ts`)
- Tests passing before: 750 (Phase 7 baseline, 77 files) → after: 752 (evidence: `pnpm --filter '@sharpee/engine' test`, run 2026-09-09 18:55:41 CDT, fresh relative to the last edit — "Test Files 78 passed (78)", "Tests 752 passed | 7 skipped (759)")
- Known untested areas: the two dead `examples/` files remain uncompiled (outside both tsconfigs, I-42e176-2); the `PluginRegistry` re-export path has no direct test of its own (I-42e176-1).

---

**Progressive update**: Session completed 2026-09-09 18:55 CDT
