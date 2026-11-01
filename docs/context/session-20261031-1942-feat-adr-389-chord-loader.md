# Session Summary: 2026-10-31 - feat/adr-389-chord-loader

## Goals
- ADR-389 Phase 3 "One identity (D1)": delete the id-translation layer in `packages/story-loader`; the IR id is the world id.

## Phase Context
- **Plan**: ADR-389 Chord loader — one identity, validateIR in chord, named build steps (`docs/work/adr-389-chord-loader/plan.md`)
- **Phase executed**: Phase 3 — "One identity (D1)" (Large); flipped DONE via `plan-phase.sh flip` (exit 0)
- **Tool calls used**: ~281 / 400 (event-log budget field at the last edit row)
- **Phase outcome**: Completed under budget
- **Out-of-scope changes**: the flip printed ~270 `out of scope: <path>` lines (packages/engine, stdlib, world-model, branch-tester, parser-en-us, dungeo and others). `git status` shows none of them dirty and the session state `files[]` holds 108 entries, none of them engine/stdlib paths; they are Phase 2's files already committed in 19a7c6a61, not this session's edits. Full list is in the flip's stdout; not repeated here. [reported by session]
- **Next-phase stamp**: `advances once this commit lands — plan-phase.sh: [DevArch REFUSED: Phase 3 "One identity (D1)" was flipped DONE but the flip is uncommitted in docs/work/adr-389-chord-loader/plan.md — commit it (the phase commit, your own "commit", or finalize) or revert it before the next phase can start]`

## Completed
- New `packages/story-loader/src/identity.ts`: `worldIdOf(world, irId)` (sentinel-aware) and `requireEntity(world, irId, at?)`.
- Deleted: `worldIds`/`irIds` maps, `ChordStory.entityId`/`irIdOf`/`worldIdOf`, loader and evaluator `requireWorldId`, `EntityIdResolver` (interface and export), `RuntimeHost.entityId`/`irIdOf`, `ExtensionInstallContext.worldId`/`requireWorldId`. `Evaluator(ir, seed?)`.
- `buildEntity` asserts `entity.id === irEntity.id` (LoadError naming both ids). Finding: regions were built as `rg-<id>` (ADR-388 amendment's parenthetical); now `createRegion(irEntity.id, ...)`. Recorded in ADR-389 D1 as-landed and a one-line retirement in ADR-388.
- `ExtensionInstallContext.world` added; state-machines resolve roles and trigger targets through it. Topic and thread matchers (`matchTopicFilters`, `matchExchangeRow`, `askedTopicKey`, `exchangeResponses`, `matchesThreadFilter`, `rowIndexFor`) take the world so a row `about the player` resolves against the role holder.
- Tests: 313 `story.entityId(x)` sites across 77 files became the id; 7 `irIdOf` sites, 3 helpers and 7 `new Evaluator` calls by hand; new `tests/adr-389-one-identity.test.ts` (4 tests).
- Rule 15 mutation-verification: 0 hard failures, 6 gaps. Closed: patrol route entries refused via `requireEntity`; reconcile landing rooms filtered by `world.hasEntity`; `holdsPlayerRole` guarded by `hasPlayerCharacter`. Accepted: two non-IR entity table misses (gone-state, witnessMove). Open: no test drives a topic row `about the player` through the matcher's world argument (needs a story-level fixture).

## Evidence (2026-10-31)
- story-loader 1532 passing / 1 skipped, 191 files (baseline 1525); chord 1747 passing, 110 files; AC-1 grep on `packages/story-loader/src` empty; story-loader `tsc --noEmit -p tsconfig.json` clean; `./repokit build` exit 0 twice (second after the rule-15 fixes, not a retry). [reported by session, unverified: the event log has no test row with these counts in the phase window (its only test row is 613 passing at 00:41Z, the audit), and its last "Build passed" row (01:09:27Z, a tsc) precedes the final test-file edits at 01:10:36Z]
- Trees vs `docs/work/adr-389-chord-loader/baseline/`: secret-letter and ides-of-march byte-identical; fernhill differs only in the wall-clock line. [reported by session, unverified]
- `tsconfig.test.json`: 72 pre-existing errors in files this phase did not touch. [reported by session]

## Key Decisions
- Region world id = IR id (ADR-389 D1 applied; ADR-388's `rg-` parenthetical retired). Flagged to David.
- Evaluator value positions resolve through one private `worldId(ctx, irId)` without an existence check, preserving "Expected an entity".
- `entityId`/`irIdOf` removed from public `ChordStory` (David, 2026-10-31, "Go" on option a; ADR-389 AC-7 amended).

## Next Phase
- **Phase 4**: "validateIR, entity and composition gates (D4a)" — `packages/chord/src/validate-ir.ts`, first gate group per the Phase 0 inventory; opens AC-4.
- **Tier**: Large (~400 tool-call budget)
- **Entry state**: Phase 3 committed (pending the commit-local that follows); Phase 0 row-5 ruling needed (loader.ts conversation-owner check, no analyzer twin); David's go.
- Plan currently has no CURRENT phase until the Phase 3 flip is committed; `advance` stamps Phase 4 afterward.

## Open Items

### Short Term
- 638: ADR-389: Chord loader — one identity, validateIR in chord, named build steps, adjective table, typed Story/Parser seam (tracking; carried forward)
- 639: ADR-390: the player is a role the session holds (tracking; carried forward)
- Topic-row `about the player` matcher test gap (rule 15) and the Phase 0 row-5 ruling are carried in this summary and the plan; no separate issue filed.

### Long Term
- None this write.

## Files Modified

**story-loader src** (~19 files): `packages/story-loader/src/{identity.ts (new), loader.ts, evaluator.ts, index.ts, extension-registry.ts, state-machines.ts, extensions/chapters.ts, runtime/{core,timers,settable,derived,dialogue,statements,event-clauses,on-clauses,phrases,purchasable,move-clauses,scheduler-constructs,dispatch-verbs,conversation-threads}.ts}`

**Tests**: `packages/story-loader/tests/` (80 modified, plus new `adr-389-one-identity.test.ts`); `packages/character/tests/tick-phases/goal-world-mutations.test.ts` (comment)

**Docs**: `docs/architecture/adrs/adr-389-chord-loader-one-identity-and-a-build-list.md`, `adr-388-persisted-identity-for-chord-saves.md`, `docs/work/adr-389-chord-loader/plan.md`, this file

Not this session's (excluded): `docs/context/session-20261029-1923-main.md`, `docs/work/save-restore-551/`.

## Notes
- Session started 2026-10-31 19:42 (session ec2515).
- Open items: store reachable; 638 and 639 confirmed open.

---

## Session Metadata

- **Session**: ec2515
- **Status**: IN-FLIGHT
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: none before this write — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261031-1942-feat-adr-389-chord-loader.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2 (ADR-390) committed as 19a7c6a61; David's go ("go on Phase 3").
- **Prerequisites discovered**: Phase 0 row-5 ruling needed before Phase 4.

## Architectural Decisions

- ADR-389 D1 (one identity) implemented; as-landed note added. ADR-388 `rg-` region spelling retired.
- Pattern applied: IR id is the world id; a single `requireEntity` refusal point with the referrer's span.

## Mutation Audit

- Files with state-changing logic modified: `loader.ts`, `state-machines.ts`, `runtime/*` (reconcile, patrol routes, role holder).
- Tests verify actual state mutations (not just events): YES [reported by session, unverified] — `tests/adr-389-one-identity.test.ts` asserts entity ids in the world after build; no fresh test row in the event log.
- Gap left open: topic row `about the player` through the matcher's world argument.

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: 4 (`tests/adr-389-one-identity.test.ts`)
- Tests passing before: 1525 → after: 1532 in story-loader [reported by session, unverified]; chord 1747 unchanged [reported by session, unverified]
- Known untested areas: topic row `about the player` via the matcher's world argument.

---

**Progressive update**: checkpoint 2026-10-31 20:15 — Phase 3 DONE via plan-phase.sh flip; Demonstrated line marked reported/unverified; advance refused pending the phase commit.
