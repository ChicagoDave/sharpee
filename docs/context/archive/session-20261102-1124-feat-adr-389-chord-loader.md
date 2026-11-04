# Session Summary: 2026-11-02 - feat/adr-389-chord-loader

## Goals
- ADR-389 Phase 8: World build steps, entity family (D2a) — `packages/story-loader/src/build/` with `WORLD_BUILD_STEPS`, `BuildContext`, the entity step family moved verbatim, an order-pin test, `ChordStory` facade unchanged, byte-identical exit gate.

## Phase Context
- **Plan**: docs/work/adr-389-chord-loader/plan.md (ADR-389 chord loader: one identity and a build list)
- **Phase executed**: Phase 8 — "World build steps, entity family (D2a)"; flipped DONE by `plan-phase.sh flip` (exit 0) this write
- **Tool calls used**: 85 at read time (state file) / no budget stamped
- **Phase outcome**: Completed
- **Out-of-scope changes**: the flip printed 288 `out of scope: <path>` lines, not this phase's work: they span engine, stdlib, world-model, chord, dungeo and docs files from Phases 1–7 and the `/doctor` cleanup (e.g. `CLAUDE.md`, `packages/engine/src/game-engine.ts`, `stories/dungeo/src/index.ts`, `tools/explorer-probe/explore.js`). The report is advisory; the whole list was returned to the invoking session rather than reproduced here. This phase's own paths are `packages/story-loader/src/build/*`, `loader.ts`, `tests/world-build-steps.test.ts`, `tests/manifest-conformance.test.ts`, `.gitignore`, the ADR-389 note and `plan.md`.

## Completed

### Build list, entity family (ADR-389 D2a)
- New `packages/story-loader/src/build/`: `context.ts` (`BuildContext`: ir, evaluator, pendingEntityRefs, deadlyExits, vehiclePositions, npcBehaviors), `steps.ts` (`WORLD_BUILD_STEPS`: entities → wiring → exit-admittance → pushing-ways, each with `requires`), `entity.ts`, `adjectives.ts`, `wiring.ts`, `vehicles.ts`, `admittance.ts`, `snippets.ts`; `trait-routes.ts` moved in by `git mv`, its import in `tests/manifest-conformance.test.ts` repointed.
- Bodies extracted from `loader.ts` by line range, dedented, `this.X` retargeted to `story.X`; `loader.ts` 2797 → 1669 lines. `ChordStory` public surface unchanged (`private readonly build: BuildContext` added). The remaining `initializeWorld` stages stay inline for Phase 9.
- `.gitignore` carve-out `!packages/story-loader/src/build/`: the blanket `build/` rule swallowed the new directory (found when the files did not appear in `git status`).
- ADR-389 D2 gained an "As landed, entity family (2026-11-02, Phase 8)" note.
- New `tests/world-build-steps.test.ts` (7 tests): modules exist, none imports the facade, facade defines none of the moved bodies, unique names, `requires` order, a reordered copy reported by name, a real load runs steps once in order with a world fact per step.

## Key Decisions

### 1. BuildContext is a private object, not the facade
Passing `ChordStory` as context (as `RUNTIME_BIND_STEPS` does with `ChordRuntime`) would have made four build-internal collections public on the facade the plan says stays unchanged.

### 2. The list carries the entity family only
`WORLD_BUILD_STEPS` lists `entities`, `wiring`, `exit-admittance`, `pushing-ways`; other stages stay inline in today's order and join in Phase 9, rather than entries whose bodies are still facade methods.

### 3. The one body change beyond retargeting
The `wiring` step finds each entity by its IR id (D1, asserted in `buildEntity`) in place of pass 1's local `built` list.

## Commit gate fix (after the checkpoint write)
- The first commit attempt was refused: `turbo run test:ci` had `@sharpee/world-model#test:ci` failing 2 of 1689 because `tests/unit/world/traversal-readers.test.ts` allowlists named `story-loader/src/loader.ts` while the raw-exit and `admits` reads had moved to `build/wiring.ts` and `build/admittance.ts`. Reported and waited; David's "go on Phase 9" was read as the go for the fix. Both files added to `ALLOWED_READERS`, and replaced loader.ts in `ADMITTANCE` (loader.ts stays in `ALLOWED_READERS` for the reconciler's `room.exits` read). `vitest run tests/unit/world/traversal-readers.test.ts`: 5 of 5 passing [reported by session, unverified: no passing row in the event log]. Plan Phase 8's Files and Demonstrated lines record this.
- Phase 8 committed locally as 2de8f6f59 (18 files, +1874/-1210); gate `pnpm exec turbo run test:ci` exit 0 [reported by session, unverified]. `git-commit.sh` also archived `docs/context/session-20261101-0702-feat-adr-389-chord-loader.md` into `docs/context/archive/` in that commit.

## Evidence
- `npx tsc -p tsconfig.json --noEmit` (story-loader): exit 0; event-log build row "Build passed" 2026-11-02T20:22:36Z. That row precedes the 20:25:52Z touch of the build files, so it is not fresh by the ADR-0019 bar: [reported by session, unverified] for the final tree.
- `pnpm --filter '@sharpee/story-loader' test`: 192 files, 1534 passing, 1 skipped (floor 1524) [reported by session, unverified: no passing-suite row in the event log].
- `pnpm --filter '@sharpee/chord' test`: 111 files, 1779 passing, unchanged [reported by session, unverified].
- `./repokit build` exit 0 [reported by session, unverified].
- Tree runs, one each, vs `docs/work/adr-389-chord-loader/baseline/`: secret-letter byte-identical (3180 lines, 1458 passing, 11 failing, exit 1 as baseline); ides-of-march byte-identical (174 lines); fernhill two wall-clock bytes only (`1.1s`→`1.0s`, `0.1s`→`0.2s`) [reported by session, unverified].
- Swap demonstration: `entities`/`wiring` swapped → event-log test row "3 failed 4 passed" 2026-11-02T20:23:45Z, first failure `{ name: 'wiring', requires: 'entities' }`; file restored, `cmp` identical [verified: that row].

## Next Phase
- **Phase 9**: "World build steps, grammar and remaining stages (D2b)": the remaining `initializeWorld` stages and grammar join the list. Change set presented to David (BuildContext grows runtime, worldBuilt, playerFinalized, appliedCharacters, characterRegistry; eight new build modules including grammar.ts; 13-step list with real `requires`; no door-backstop stage, gone since Phase 4). He ran finalize instead of answering, so it stays PENDING.
- **Entry state**: Phase 8 committed (2de8f6f59) — now holds; David's go outstanding. `plan-phase.sh advance` was not run (plan standing rule, ADR-389 D7).

## Open Items

### Short Term
- None filed; Phase 9 waits for David's go.

### Long Term
- None this session.

## Files Modified

**story-loader** (13 files): `packages/story-loader/src/loader.ts`; `src/build/{context,steps,entity,adjectives,wiring,vehicles,admittance,snippets,trait-routes}.ts`; `tests/world-build-steps.test.ts` (new); `tests/manifest-conformance.test.ts` (import path)

**world-model** (1 file): `packages/world-model/tests/unit/world/traversal-readers.test.ts` (allowlists)

**Docs/config** (3 files): `docs/work/adr-389-chord-loader/plan.md` (Phase 8 Demonstrated marked, Status DONE), `docs/architecture/adrs/adr-389-chord-loader-one-identity-and-a-build-list.md` (D2 as-landed note), `.gitignore`

## Notes
- Session started 2026-11-02 11:24 CST. Pre-existing dirty paths left untouched: `docs/context/archive/session-20261029-1923-main.md`, `docs/work/save-restore-551/`.
- Open items: no GitHub issues filed or closed this write (store not consulted; nothing to file). Phase 9 awaits David's go and is carried by the plan, not an issue.
- Rule 15 `mutation-verification` was not run this write; the moved functions were not changed beyond retargeting.

---

## Session Metadata

- **Session**: 72ecaa
- **Status**: COMPLETE (unverified: test/build runs for the final tree, including the turbo test:ci gate, the story-loader and chord suites, ./repokit build and the three tree runs; no fresh passing-suite rows in the event log)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: 2de8f6f59 (Phase 8) — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261102-1124-feat-adr-389-chord-loader.md`

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 7's `CORE_TRAIT_ROUTES`; David's go for Phase 8 (~14:10).
- **Prerequisites discovered**: `.gitignore` needed a carve-out for `src/build/`.

## Architectural Decisions
- ADR-389 D2a (entity family on the build list), as-landed note written; D1 (IR id as the one identity) applied in the `wiring` step.

## Mutation Audit
- Files with state-changing logic modified: `packages/story-loader/src/build/*` (extracted, retargeted only).
- Tests verify actual state mutations (not just events): YES [reported by session, unverified] — the real-load test asserts a world fact per step.

## Recurrence Check
- Similar to past issue? NO

## Test Coverage Delta
- Tests added: 7 (`tests/world-build-steps.test.ts`)
- Tests passing before: 1527 → after: 1534 [reported by session, unverified]; world-model test:ci was 2 failing of 1689, fixed by the allowlist edit [reported by session, unverified]
- Known untested areas: none named

---

**Progressive update**: checkpoint 2026-11-02 14:35 — Phase 8 flipped DONE through plan-phase.sh; Demonstrated line marked; full evidence recorded.
**Progressive update**: session completed 2026-11-02 14:50 — Phase 8 committed (2de8f6f59) after the traversal-readers allowlist fix; Phase 9 change set presented, PENDING; Status promoted from IN-FLIGHT.
