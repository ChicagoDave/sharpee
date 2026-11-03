# Session Summary: 2026-11-02 - feat/adr-389-chord-loader (session started 2026-11-02 15:08 CST)

## Goals
- ADR-389 Phase 10: Engine-ready steps, restore, and the final acceptance sweep (D2c) — the `onEngineReady` stages become `ENGINE_READY_STEPS` modules, restore reconciliation moves beside `reconcile.ts`, AC-1..AC-7 close out with evidence.
- ADR-389 Phase 9: World build steps, grammar and remaining stages (D2b) — the remaining `initializeWorld` stages join `WORLD_BUILD_STEPS` one module each; `extendParser`/`registerPassageGrammar` move to `src/build/grammar.ts`; `initializeWorld` becomes the loop; byte-identical exit gate.

## Phase Context
- **Plan**: ADR-389 Chord loader — one identity and a build list (`docs/work/adr-389-chord-loader/plan.md`)
- **Phases executed**: Phase 9 — "World build steps, grammar and remaining stages (D2b)" (Large); Phase 10 — "Engine-ready steps, restore, and final acceptance sweep (D2c)" (Medium, last phase)
- **Tool calls used**: ~196 at the event log's last row (Phase 9 ~106 of ~400; Phase 10 the remainder of ~250)
- **Phase outcome**: Phase 10 completed under budget; Phase 9 completed under budget; Exit state holds and the `**Demonstrated**` line is written and provenance-marked in plan.md.
- **Phase status**: the writer's first `plan-phase.sh flip ... 9` was refused (`Phase 9 ... is PENDING, not CURRENT`): Phase 8's `advance` had been held for David's go, which came at this session's start. The main session then ran `plan-phase.sh advance` (Phase 9 CURRENT since 2026-11-02) and `plan-phase.sh flip ... 9 --state docs/context/.session-state-ff7244.json` (exit 0): Phase 9 is DONE. Phase 10 started on David's go ("go on Phase 10"): `plan-phase.sh advance` stamped it CURRENT (since 2026-11-02) and `plan-phase.sh flip ... 10 --state docs/context/.session-state-ff7244.json` exited 0: Phase 10 is DONE (the last phase). The follow-on `advance` was refused by the floor because the flip is uncommitted (expected); `**Plan Status**` header set to DONE by hand per the invoker's instruction. The plan was then archived by `plan-archive.sh` (`docs/work/adr-389-chord-loader` → `docs/work/archive/adr-389-chord-loader`) and `.current-plan` was released, so no plan pointer exists now — expected after a DONE plan, not a defect.
- **Out-of-scope changes (Phase 10 flip)**: the flip's advisory listed ~300 `out of scope: <path>` lines, the whole branch's earlier-phase footprint (packages/engine, stdlib, world-model, chord, story-loader runtime, stories/dungeo, ADRs and so on) because the diff is taken against the branch base; this phase's own paths are the ones in Files Modified. Not copied line by line.
- **Out-of-scope changes (Phase 9 flip)**: the flip printed its advisory `out of scope` lines for paths from earlier phases; this phase's own paths are the loader, `src/build/*`, the two tests, the ADR note, `plan.md` and this summary.

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

## Completed: Phase 10
- New `packages/story-loader/src/build/engine-ready/`: `steps.ts` (`ENGINE_READY_STEPS`, 8 entries: engine-seams → npc-behaviors → character-phase → state-machines (requires engine-seams) → extensions (requires state-machines) → scheduler (requires extensions) → deadly-exits → present-entries; the plugin chain's `requires` is the equal-priority registration tie-break), `engine-seams.ts`, `npc-behaviors.ts` (with `buildNpcBehavior`), `character-phase.ts`, `install-context.ts` (`installContextFor`), `machines.ts`, `extension-plugins.ts`, `scheduler.ts`, `deadly-exits.ts`, `present-entries.ts`.
- New `src/restore.ts`: `reconcileRestoredWorld(story, world, identity)` beside `reconcile.ts`; the facade's `onWorldRestored` calls it.
- `build/vehicles.ts` gains `vehiclePositionAnswer(story, id, world)`; the facade method delegates.
- `onEngineReady` is the precondition plus the loop; `loader.ts` 904 → 535 lines. Body changes beyond retargeting: `registerPresentEntries` lost its `if (!this.world) return;` (the world is now a parameter); the install context is built once per step (two stateless closure sets) instead of once shared.
- Pre-existing unused imports pruned with the lines they sat on: `SemanticProperties`, `killPlayer`, `INpcService`, `ActSlots`, `ActResult`, `RandomService`, `NPC_BEHAVIOR_ADJECTIVES`, `worldIdOf`, `ChordBehaviorTrait`.
- `tests/engine-ready-steps.test.ts` (new, 8 tests): modules, no facade import, moved bodies gone, `onEngineReady` pinned line for line, unique/ordered/swap-reported, real boot runs every step once in order with facts (moth's `chord.npc.moth` behavior, the state-machine plugin, scoring's rank watcher).
- ADR-389 D2 gained a Phase 10 as-landed note. Issue #638 commented (https://github.com/ChicagoDave/sharpee/issues/638#issuecomment-6589772005); not closed, David decides.
- Evidence (2026-11-02, ~16:05-16:15 CST):
  - story-loader `npx tsc -p tsconfig.json --noEmit`: exit 0 (event log build row "Build passed" 22:04:24Z, which precedes the 22:06:25Z write of the new test file).
  - Swap demonstration (`state-machines`/`extensions` swapped in `engine-ready/steps.ts`): `vitest run tests/engine-ready-steps.test.ts` 2 failed, 6 passed, `expected [ { name: 'extensions', requires: 'state-machines' } ] to deeply equal []`; restored, `cmp` identical (event log test row "2 failed 6 passed" 22:06:44Z).
  - `pnpm --filter '@sharpee/story-loader' test`: 193 files, 1543 passing, 1 skipped (floor 1524) [reported by session, unverified: no hook row].
  - `pnpm --filter '@sharpee/chord' test`: 111 files, 1779 passing, unchanged [reported by session, unverified].
  - `./repokit build` exit 0; `git status packages/sharpee/docs/genai-api/` empty after it [reported by session, unverified].
  - Trees vs `baseline/` [reported by session, unverified]: secret-letter byte-identical (3180 lines, exit 1 as baseline); ides-of-march byte-identical (174 lines); fernhill 135 lines, two differing fields, both wall-clock (`1.1s`→`1.0s`, `0.1s`→`0.2s`).
  - AC-1..AC-7 sweep: greps and results are in plan.md's Phase 10 `**Demonstrated**` line (AC-1 grep empty; AC-2 21 step modules, two order-pinning tests; AC-3 conformance both directions; AC-4 `validateIR` exported and called once at `loader.ts:172`, `gatedConstruct` and `backstop` greps 0, `adr-276-backstops.test.ts` absent, ADR-276 D1 amendment present; AC-5 cast grep empty, `Parser.getStoryGrammar()` present; AC-6 as above; AC-7 `./repokit build` exit 0). Provenance: the line is marked verified in part (swap row, tsc row) and reported elsewhere.

## Key Decisions
- Lifecycle flags (`worldBuilt`, `playerFinalized`) and the character results live on `BuildContext`, not the facade: the steps that set them must hold no state of their own, and the facade reads them back through `this.build`.
- `pending-refs` points at `resolvePendingEntityRefs` in `adjectives.ts` (the queue and its drain are one module); `runtime-bind` is its own three-line module so every entry has a module.
- The four `backstop` comments in loader.ts moved with their bodies (extensions, characters, grammar, cuttable); loader.ts now has zero — AC-4's count is a property of where the facts live, recorded in the ADR note.

## Next Phase
Plan complete — all phases done (`**Plan Status**: DONE`), archived at `docs/work/archive/adr-389-chord-loader/`; Phase 10 committed as d18f5b2b5. ADR-389 is fully implemented (Phases 0–8 earlier sessions, 9–10 this one). Next session: David's push and PR of `feat/adr-389-chord-loader` to main; nothing else is queued from this plan. #638 carries the close-out comment and stays open for David to close.

## Open Items

### Short Term
- None filed this session; #638 awaits David's disposition.

### Long Term
- N/A

## Files Modified

**Phase 10 source** (14 files): `packages/story-loader/src/loader.ts`, `src/restore.ts` (new), `src/build/vehicles.ts`, and ten new `src/build/engine-ready/{steps,engine-seams,npc-behaviors,character-phase,install-context,machines,extension-plugins,scheduler,deadly-exits,present-entries}.ts`. **Phase 10 tests** (1 file): `tests/engine-ready-steps.test.ts` (new). **Phase 10 docs**: the ADR-389 note, plan.md (Phase 10 DONE, Plan Status DONE), this summary.

**Phase 9 source** (13 files): `packages/story-loader/src/loader.ts`, `src/build/context.ts`, `src/build/steps.ts`, and ten new `src/build/{extensions,story-state,removal-observer,detail-channels,location-names,runtime-bind,cuttable,start,characters,grammar}.ts`.

**Tests** (2 files): `packages/story-loader/tests/world-build-steps.test.ts`, `tests/adr-359-d1-thing.test.ts`.

**Docs** (3 files): `docs/architecture/adrs/adr-389-chord-loader-one-identity-and-a-build-list.md`, `docs/work/adr-389-chord-loader/plan.md` (Demonstrated line provenance-marked), this summary.

## Notes

- David's go for Phase 9 given at session start; for Phase 10 as "go on Phase 10" (~15:55).
- Pre-existing dirty paths not this session's, left untouched and out of the commit: `docs/context/archive/session-20261029-1923-main.md`, `docs/work/save-restore-551/`.
- Pre-existing unused imports in loader.ts (`SemanticProperties`, `RandomService`, `INpcService`, `ActSlots`, `ActResult`, `worldIdOf`, `ChordBehaviorTrait`) left as found; only imports orphaned by this move were pruned.
- Rule 15 mutation-verification not run in either phase: moved bodies are verbatim with `this.X` retargeted; the new functions (`startBlock`, `bindRuntime`, the engine-ready step wrappers) compose existing calls.
- Phase 10 commit first stopped at the gate (world-model `traversal-readers.test.ts` allowlist still named `story-loader/src/loader.ts`); after David's go the entry was repointed to `src/restore.ts` (line 49), 5 of 5 passing, and `turbo run test:ci` then passed 75 of 75 [reported by session, unverified: no hook row]; Fable trailer verified with `git log -1`.
- Integration Reality: the Phase 10 name contains "engine", but the work is a verbatim-move refactor; `tests/engine-ready-steps.test.ts` boots the real story and asserts each step's effect, so no stub stands in for an owned dependency.
- No GitHub issues filed or closed. Open items: store not consulted this write.

---

## Session Metadata

- **Session**: ff7244
- **Status**: COMPLETE (unverified: story-loader/chord suite counts, `./repokit build`, tree-run comparisons vs baseline, `turbo run test:ci` 75 of 75 — no hook rows, reported by session)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: f23e2d0bc (Phase 9) and d18f5b2b5 (Phase 10 + plan archive, 23 files) landed this session; this terminal write and the file rename are staged by the next commit (rule 18, the finalize push) — its hash is in `git log -- docs/context/session-20261102-1508-feat-adr-389-chord-loader.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 8 landed (2de8f6f59); David's go for Phases 9 and 10; Phase 9 landed (f23e2d0bc).
- **Prerequisites discovered**: Phase 9 needed `plan-phase.sh advance` before `plan-phase.sh flip` could land, since the previous session held `advance` for David's go.

## Architectural Decisions

- ADR-389 D2: as-landed note for Phase 10 written (engine-ready step list, restore module, context-per-step); as-landed note for Phase 9 written (13-step list, `initializeWorld` is the loop, backstop-count property).
- Pattern applied: build list with explicit `requires`; stages hold no state, `BuildContext` does.

## Mutation Audit

- Files with state-changing logic modified: `packages/story-loader/src/build/**/*.ts` (incl. `engine-ready/`), `restore.ts`, `loader.ts` (moves, verbatim)
- Tests verify actual state mutations (not just events): YES [reported by session, unverified] — a fact per new step on the real load (counter value, detail marker trait, room-name arm, resolved key id, role holder); Phase 10 real boot asserts moth's `chord.npc.moth` behavior, the state-machine plugin and scoring's rank watcher [reported by session, unverified]
- Mutation-verification agent not run (reason in Notes).

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: 9 (world-build-steps 7 → 8 in Phase 9; engine-ready-steps new, 8, in Phase 10)
- Tests passing before: 1524 floor → after Phase 9: 1535 (192 files); after Phase 10: 1543 (193 files, 1 skipped) [reported by session, unverified]
- Known untested areas: none new

---

**Progressive update**: checkpoint 2026-11-02 15:41 — Phase 9 exit gate evidence recorded, Demonstrated line provenance-marked in plan.md; the writer's flip was refused (Phase 9 PENDING, not CURRENT).
**Progressive update**: 15:48 — `plan-phase.sh advance` then `flip 9` by the main session: Phase 9 DONE, Phase 10 PENDING. Local commit next.
**Progressive update**: 15:58 — Phase 9 committed locally as f23e2d0bc (19 files; `turbo run test:ci` 75 of 75 tasks green; Fable trailer kept). commit-local's post-commit `plan-phase.sh advance` had stamped Phase 10 CURRENT; reverted with `git checkout -- plan.md` — Phase 10 stays PENDING for David's go (ADR-389 D7). Phase 10 change set to present next.

**Progressive update**: 16:15 — Phase 10 exit gate complete: story-loader 193 files, 1543 passing, 1 skipped; chord 1779; `./repokit build` exit 0; genai-api unchanged; trees vs baseline: secret-letter and ides-of-march byte-identical, fernhill two wall-clock fields. ADR-389 D2 Phase 10 as-landed note and the plan's Phase 10 Demonstrated line (with the AC-1..AC-7 sweep) written. Next: #638 comment, Phase 10 complete banner, checkpoint flow, plan archive, local commit.
**Progressive update**: checkpoint 2026-11-02 16:12 — Phase 10 folded into the template; `plan-phase.sh flip ... 10` exit 0 (Phase 10 DONE); Plan Status set DONE; Demonstrated line provenance-marked (verified in part); archive and commit left to the main session.
**Progressive update**: 16:28 — Phase 10 commit STOPPED at the gate: `turbo run test:ci` failed `@sharpee/world-model#test:ci`, 2 of 5 in `tests/unit/world/traversal-readers.test.ts`: `ALLOWED_READERS` names `story-loader/src/loader.ts` for the reconciler's raw `RoomTrait.exits` read, which Phase 10 moved to `src/restore.ts` (the same allowlist Phase 8 repointed). Proposed fix: rename that entry to `story-loader/src/restore.ts` with the same reason. Reported; waiting for David's go. Plan already archived (renames staged); nothing committed.
**Progressive update**: 16:32 — David's go on the allowlist fix: `packages/world-model/tests/unit/world/traversal-readers.test.ts` line 49 repointed from `story-loader/src/loader.ts` to `story-loader/src/restore.ts` (same role, read and reason, with the ADR-389 D2c move noted); `vitest run tests/unit/world/traversal-readers.test.ts` 5 of 5 passing. Commit rerun next with that file added.
**Progressive update**: session completed 2026-11-02 16:36 — terminal write: Phase 10 committed as d18f5b2b5 (23 files, `turbo run test:ci` 75 of 75), plan archived and pointer released, summary file renamed to the state-file prefix; Status promoted from IN-FLIGHT to COMPLETE (unverified); push and PR left to David.
