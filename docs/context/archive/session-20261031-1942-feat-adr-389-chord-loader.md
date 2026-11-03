# Session Summary: 2026-10-31 - feat/adr-389-chord-loader

## Goals
- ADR-389 Phase 3 "One identity (D1)": delete the id-translation layer in `packages/story-loader`; the IR id is the world id. (DONE, committed 323a53737)
- ADR-389 Phase 4 "validateIR, entity and composition gates (D4a)": move the first gate group into `@sharpee/chord`. (DONE 2026-11-01, this write)

## Phase Context
- **Plan**: ADR-389 Chord loader — one identity, validateIR in chord, named build steps (`docs/work/adr-389-chord-loader/plan.md`)
- **Phase executed**: Phase 4 — "validateIR, entity and composition gates (D4a)" (Large); flipped DONE via `plan-phase.sh flip` (exit 0). The `**Demonstrated**` line is marked `[reported by session, unverified]`: the event log holds one test row and its counts do not match this phase's.
- **Tool calls used**: ~414 / 400 (event-log budget field at the last row; the counter ran across Phases 3 and 4 of one session)
- **Phase outcome**: Ran over budget (session-wide counter)
- **Out-of-scope changes**: the flip printed 257 `out of scope: <path>` lines (first: `docs/architecture/adrs/adr-327-explicit-references.md`, `adr-342-engine-package-contract.md`, `adr-344-player-role-holder-at-the-install-seam.md`; the rest packages/engine, stdlib, world-model and others). These are paths in the session state `files[]` carried from Phase 2/3 work already committed (19a7c6a61, 323a53737), not Phase 4 edits. [reported by session]
- **Next-phase stamp**: `advances once this commit lands — plan-phase.sh: [DevArch REFUSED: Phase 4 "validateIR, entity and composition gates (D4a)" was flipped DONE but the flip is uncommitted in docs/work/adr-389-chord-loader/plan.md — commit it (the phase commit, your own "commit", or finalize) or revert it before the next phase can start]`

## Completed

### Phase 3 — One identity (D1), committed 323a53737
- New `packages/story-loader/src/identity.ts`: `worldIdOf(world, irId)` and `requireEntity(world, irId, at?)`. Deleted the `worldIds`/`irIds` maps, `ChordStory.entityId`/`irIdOf`/`worldIdOf`, `EntityIdResolver`, `RuntimeHost.entityId`/`irIdOf`, `ExtensionInstallContext.worldId`/`requireWorldId`. `buildEntity` asserts `entity.id === irEntity.id`. Regions now built as `createRegion(irEntity.id, ...)` (ADR-388 `rg-` parenthetical retired). Evidence at the time: story-loader 1532 passing, chord 1747. [reported by session, unverified]

### Phase 4 — validateIR, entity and composition gates (D4a), 2026-11-01
- New `packages/chord/src/validate-ir.ts`: the analyzer's `checkCompositionLegality` moved verbatim plus the door-unconnected gate; last `ANALYSIS_PASSES` entry (after `emitIdentity`) through new `DiagnosticBag.add`; exported from chord's index.
- `createStory` calls `validateIR` after `assertIdentity` and throws `LoadError(message, span)` on the first error. Six pure loader backstop throws deleted; seven kept as value-yielding branches, re-commented.
- `worn-not-wearable` widened to every wearer and names the wearer. Not moved: rows 5 (David's ruling pending), 11, 14, 25 (AST-level gates).
- Tests: `packages/chord/tests/validate-ir.test.ts` (16, new); `packages/story-loader/tests/adr-389-validate-ir-seam.test.ts` (3, new); `adr-276-backstops.test.ts` trimmed to census 1–2; pins updated in `identity.test.ts`, `adr-276-acceptance.test.ts`, `door-loading.test.ts`, `composition-legality.test.ts`.
- Docs: ADR-276 D1 amendment note; ADR-389 D4 as-landed note.
- Rule 15 mutation-verification: guard removals safe, no partial story by construction, 6 gaps. G1/G3/G5/G6 closed with tests; G2 (a `combatant` boolean with no `use combat` passes the admitted check) deferred to D4c; G4 unprovable (createStory never receives a world).

## Evidence (2026-11-01, Phase 4 final)
- chord 1763 passing, 111 files (baseline 1747); story-loader 1526 passing / 1 skipped, 192 files (baseline 1525); chord and loader `tsc` clean; `./repokit build` exit 0. [reported by session, unverified: the event log has one test row only (613 passing, 00:41Z) and no row with these counts; its Build rows are tsc runs at 11:58Z–12:01Z]
- Trees vs Phase 0 captures in `docs/work/adr-389-chord-loader/baseline/`: secret-letter and ides-of-march byte-identical; fernhill differs only in a wall-clock field. [reported by session, unverified]
- Fixture diagnostics identical except one lexer-golden fixture where `trait-not-declared` moved one position later (validateIR runs last); code set identical. [reported by session]
- AC-4 greps: loader `backstop` word count 15; moved codes once each in chord src except two codes with two emit sites in `validate-ir.ts`. [reported by session]

### Code review follow-ups (David's /code-review, 2026-11-01)
- Eight findings. Fixed four: `placeOf` returns `null` again for a removed owner (not `undefined`); the engine-ready world guard moved to the top of `onEngineReady`, before any engine registration; the story oracle binds `it` only for a story entity; the evaluator's landing seed filters rooms by `world.hasEntity`, the rule reconcile's reseed already applied. story-loader `tsc` clean; suite 1526 passing / 1 skipped after.
- Declined with reasons: value positions not throwing for a removed entity (the old map never dropped an entry either; rogue ids are the analyzer's unknown-entity gate); `validateIR` running twice on compile-then-load (D4's design; linear in the IR).
- Recorded, not fixed: a door referenced only by `to outside through` now loads where the loader used to refuse it — the compile always accepted it and the hatch's DoorTrait stamping is ADR-366 D7's unfinished work; the five linear `ir.entities` scans on hot paths want one shared `irEntityById` on the runtime core (build-steps phases).

## Key Decisions
- Region world id = IR id (ADR-389 D1 applied; ADR-388 `rg-` parenthetical retired). Flagged to David.
- `entityId`/`irIdOf` removed from public `ChordStory` (David, 2026-10-31; ADR-389 AC-7 amended).
- Moved the composition-legality block verbatim rather than rewriting it, so there is one rule, not a `validateIR` copy beside an analyzer copy.
- An empty-route tweak to the patrol gate was tried and reverted: it double-reported beside `unknown-entity`.

## Next Phase
- **Phase 5**: "validateIR, grammar gates (D4b)" — extend-target, removal-target, deadly-while-unsupported and kin moved into `validateIR`; grammar removal matched-no-live-rule stays a load-time fact.
- **Tier**: Medium (~250 tool-call budget)
- **Entry state**: Phase 4 committed (pending the commit-local that follows; `advance` stamps Phase 5 CURRENT after it); David's go.

## Open Items

### Short Term
- 638: ADR-389: Chord loader — one identity, validateIR in chord, named build steps, adjective table, typed Story/Parser seam (tracking; carried forward)
- 639: ADR-390: the player is a role the session holds (tracking; carried forward)
- Row 5 ruling (loader.ts conversation-owner check, no analyzer twin) and the disposition of rows 11, 14, 25 (AST-level gates) are for David; carried in the plan and this summary, no separate issue filed.
- Topic row `about the player` matcher test gap (Phase 3 rule 15) and G2 (`combatant` without `use combat`, for D4c) carried in this summary.

### Long Term
- None this write.

## Files Modified

**chord src**: `packages/chord/src/{validate-ir.ts (new), analyzer.ts, diagnostics.ts, index.ts}`

**chord tests**: `packages/chord/tests/{validate-ir.test.ts (new), identity.test.ts, adr-276-acceptance.test.ts, composition-legality.test.ts}`

**story-loader**: `packages/story-loader/src/loader.ts`; `packages/story-loader/tests/{adr-389-validate-ir-seam.test.ts (new), adr-276-backstops.test.ts, door-loading.test.ts}`

**Docs**: `docs/architecture/adrs/adr-276-chord-source-authoritative-errors.md`, `adr-389-chord-loader-one-identity-and-a-build-list.md`, `docs/work/adr-389-chord-loader/plan.md`, this file

Phase 3 files are in 323a53737. Not this session's (excluded): `docs/context/session-20261029-1923-main.md`, `docs/work/save-restore-551/`.

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
- **Commits**: 323a53737 (Phase 3) — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261031-1942-feat-adr-389-chord-loader.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 3 committed as 323a53737; David's go on Phases 3 and 4.
- **Prerequisites discovered**: row 5 ruling and rows 11/14/25 disposition needed from David (not blocking Phase 5 start).

## Architectural Decisions

- ADR-389 D1 (one identity) and D4a (validateIR, first group) implemented; as-landed notes added. ADR-276 D1 amended.
- Pattern applied: gates that depend only on the IR live in `@sharpee/chord` as the last analysis pass; the loader calls `validateIR` once and keeps only value-yielding branches.

## Mutation Audit

- Files with state-changing logic modified: `loader.ts` (createStory), `validate-ir.ts`, `diagnostics.ts` (`DiagnosticBag.add`).
- Tests verify actual state mutations (not just events): YES [reported by session, unverified] — `validate-ir.test.ts` asserts diagnostics produced and `createStory` throwing a LoadError with span; no fresh test row in the event log.
- Gaps: G2 deferred to D4c, G4 unprovable.

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: 16 chord (`validate-ir.test.ts`) + 3 loader (`adr-389-validate-ir-seam.test.ts`); backstop file trimmed.
- Tests passing before: chord 1747 → after 1763; story-loader 1525 → 1526 (+1 skipped) [reported by session, unverified]
- Known untested areas: topic row `about the player` via the matcher's world argument; G2.

---

**Progressive update**: checkpoint 2026-10-31 20:15 — Phase 3 DONE via plan-phase.sh flip; Demonstrated line marked reported/unverified; advance refused pending the phase commit.
**Progressive update**: checkpoint 2026-11-01 06:10 — Phase 4 DONE via plan-phase.sh flip (exit 0); Demonstrated line marked reported/unverified; 257 out-of-scope lines recorded; advance refused pending the phase commit.
