# Session Summary: 2026-11-02 - feat/adr-389-chord-loader (session started 2026-11-02 15:08 CST)

## Goals
- ADR-389 Phase 9: World build steps, grammar and remaining stages (D2b) — the remaining `initializeWorld` stages join `WORLD_BUILD_STEPS` one module each; `extendParser`/`registerPassageGrammar` move to `src/build/grammar.ts`; `initializeWorld` becomes the loop; byte-identical exit gate.

## Phase Context
- **Plan**: ADR-389 Chord loader — one identity and a build list (`docs/work/adr-389-chord-loader/plan.md`)
- **Phase executed**: Phase 9 — "World build steps, grammar and remaining stages (D2b)" (Large)
- **Tool calls used**: 106 / ~400 (state file at last read)
- **Phase outcome**: Completed under budget; Exit state holds and the `**Demonstrated**` line is written and provenance-marked in plan.md.
- **Phase status**: the writer's first `plan-phase.sh flip ... 9` was refused (`Phase 9 ... is PENDING, not CURRENT`): Phase 8's `advance` had been held for David's go, which came at this session's start. The main session then ran `plan-phase.sh advance` (Phase 9 CURRENT since 2026-11-02) and `plan-phase.sh flip ... 9 --state docs/context/.session-state-ff7244.json` (exit 0): Phase 9 is DONE. Phase 10 stays PENDING; no second `advance` run (ADR-389 D7).
- **Out-of-scope changes**: the flip printed its advisory `out of scope` lines for paths from earlier phases; this phase's own paths are the loader, `src/build/*`, the two tests, the ADR note, `plan.md` and this summary.

## Completed
- Ten new modules under `packages/story-loader/src/build/`: `extensions.ts`, `story-state.ts`, `removal-observer.ts`, `detail-channels.ts` (with `ChordDetailTrait`), `location-names.ts`, `runtime-bind.ts`, `cuttable.ts`, `start.ts` (start block + `finalizeRoleHolder`), `characters.ts` (`applyCharacterBlocks`, `storyOracle`, `arrivalNarratedTopicsOf`), `grammar.ts` (`extendGrammar`, the action/passage grammar, `applyScopePredicate`).
- `BuildContext` gains `runtime`, `worldBuilt`, `playerFinalized`, `appliedCharacters`, `characterRegistry`; constructed after the runtime (the runtime's constructor stores its host and calls nothing on it).
- `WORLD_BUILD_STEPS` is 13 entries: extensions → entities → wiring → exit-admittance → pushing-ways → story-state → removal-observer → detail-channels → location-names → pending-refs → runtime-bind → cuttable-check → start-block, in today's order, with honest `requires`.
- `initializeWorld` is `this.world = world;` plus the loop. `loader.ts` 1632 → 904 lines. Facade public surface unchanged (`extendParser` delegates to `extendGrammar`; `ChordDetailTrait` re-exported from the step module).
- `tests/world-build-steps.test.ts` 7 → 8 tests: module list and moved-body list extended, a pin that `initializeWorld` is exactly the loop, two more swap cases, a fact per new step on the real load (counter value, detail marker trait, room-name arm, resolved key id, role holder). `tests/adr-359-d1-thing.test.ts` calls `storyOracle(story['build'])`.
- ADR-389 D2 gained a "As landed, grammar and remaining stages (2026-11-02, Phase 9)" note.
- Evidence (2026-11-02, ~15:33-15:45 CST):
  - story-loader `npx tsc -p tsconfig.json --noEmit`: exit 0 (event log build row "Build passed" 21:33:12Z).
  - Swap demonstration (`extensions`/`entities` swapped in steps.ts): `vitest run tests/world-build-steps.test.ts` 2 failed, 6 passed, order test `expected [ { name: 'entities', requires: 'extensions' } ] to deeply equal []`; file restored, `cmp` identical (event log test row "2 failed 6 passed" 21:35:33Z).
  - `pnpm --filter '@sharpee/story-loader' test`: 192 files, 1535 passing, 1 skipped (floor 1524) [reported by session, unverified: no hook row].
  - `pnpm --filter '@sharpee/chord' test`: 111 files, 1779 passing, unchanged [reported by session, unverified].
  - `./repokit build` exit 0 [reported by session, unverified].
  - Tree runs vs `baseline/` [reported by session, unverified]: secret-letter byte-identical (3180 lines, 1458 passing, 11 failing, exit 1 as baseline); ides-of-march byte-identical (174 lines, 39 passing); fernhill 86 passing, one differing line, the wall-clock field (`4 walks, 1.1s in all` → `1.0s`).

## Key Decisions
- Lifecycle flags (`worldBuilt`, `playerFinalized`) and the character results live on `BuildContext`, not the facade: the steps that set them must hold no state of their own, and the facade reads them back through `this.build`.
- `pending-refs` points at `resolvePendingEntityRefs` in `adjectives.ts` (the queue and its drain are one module); `runtime-bind` is its own three-line module so every entry has a module.
- The four `backstop` comments in loader.ts moved with their bodies (extensions, characters, grammar, cuttable); loader.ts now has zero — AC-4's count is a property of where the facts live, recorded in the ADR note.

## Next Phase
- **Phase 10**: remains PENDING; per ADR-389 D7 every phase waits for David's go. Not advanced.
- **Entry state**: Phase 9 committed and DONE; David's go.

## Open Items

### Short Term
- None filed; Phase 10 waits for David's go.

### Long Term
- N/A

## Files Modified

**Source** (13 files): `packages/story-loader/src/loader.ts`, `src/build/context.ts`, `src/build/steps.ts`, and ten new `src/build/{extensions,story-state,removal-observer,detail-channels,location-names,runtime-bind,cuttable,start,characters,grammar}.ts`.

**Tests** (2 files): `packages/story-loader/tests/world-build-steps.test.ts`, `tests/adr-359-d1-thing.test.ts`.

**Docs** (3 files): `docs/architecture/adrs/adr-389-chord-loader-one-identity-and-a-build-list.md`, `docs/work/adr-389-chord-loader/plan.md` (Demonstrated line provenance-marked), this summary.

## Notes

- David's go for Phase 9 given at session start.
- Pre-existing dirty paths not this session's, left untouched and out of the commit: `docs/context/archive/session-20261029-1923-main.md`, `docs/work/save-restore-551/`.
- Pre-existing unused imports in loader.ts (`SemanticProperties`, `RandomService`, `INpcService`, `ActSlots`, `ActResult`, `worldIdOf`, `ChordBehaviorTrait`) left as found; only imports orphaned by this move were pruned.
- Rule 15 mutation-verification not run: every moved body is verbatim with `this.X` retargeted; the two new functions (`startBlock`, `bindRuntime`) compose existing calls.
- No GitHub issues filed or closed. Open items: store not consulted this write.

---

## Session Metadata

- **Session**: ff7244
- **Status**: IN-FLIGHT
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: none before this write — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261102-1530-feat-adr-389-chord-loader.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 8 landed (2de8f6f59); David's go for Phase 9.
- **Prerequisites discovered**: Phase 9 needed `plan-phase.sh advance` before `plan-phase.sh flip` could land, since the previous session held `advance` for David's go.

## Architectural Decisions

- ADR-389 D2: as-landed note for Phase 9 written (13-step list, `initializeWorld` is the loop, backstop-count property).
- Pattern applied: build list with explicit `requires`; stages hold no state, `BuildContext` does.

## Mutation Audit

- Files with state-changing logic modified: `packages/story-loader/src/build/*.ts`, `loader.ts` (moves, verbatim)
- Tests verify actual state mutations (not just events): YES [reported by session, unverified] — a fact per new step on the real load (counter value, detail marker trait, room-name arm, resolved key id, role holder)
- Mutation-verification agent not run (reason in Notes).

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: 1 (world-build-steps 7 → 8)
- Tests passing before: 1524 floor → after: 1535 (192 files, 1 skipped) [reported by session, unverified]
- Known untested areas: none new

---

**Progressive update**: checkpoint 2026-11-02 15:41 — Phase 9 exit gate evidence recorded, Demonstrated line provenance-marked in plan.md; the writer's flip was refused (Phase 9 PENDING, not CURRENT).
**Progressive update**: 15:48 — `plan-phase.sh advance` then `flip 9` by the main session: Phase 9 DONE, Phase 10 PENDING. Local commit next.
