# Session Summary: 2026-11-01 - feat/adr-389-chord-loader (CST)

## Goals
- Run `/doctor` (Claude Code setup health check); not plan work.
- ADR-389 Phase 7: core adjective table (D3), on David's go (~00:30 CST 2026-11-02).

## Phase Context
- **Plan**: ADR-389 Chord loader — one identity and a build list (`docs/work/adr-389-chord-loader/plan.md`)
- **Phase executed**: Phase 7 — "Core adjective table (D3)" (Medium)
- **Tool calls used**: 124 / ~250 at the time of this write (state file)
- **Phase outcome**: Completed under budget; flipped DONE through `plan-phase.sh flip` (exit 0)
- **Out-of-scope changes**: the flip printed `out of scope: <path>` for ~370 paths (every package under packages/ and stories/, plus CLAUDE.md and several ADRs) that this phase did not touch. Treated as an anomaly in the state file's `files` set (the phase's real files are listed below; `git status` shows only those plus the two out-of-scope dirty paths); the full list is in the flip's stdout, not copied here for density. Needs a look at how `dirtyBaseline` was stamped.

## Completed

### Phase 7: CORE_TRAIT_ROUTES
- New `packages/story-loader/src/trait-routes.ts`: `CORE_TRAIT_ROUTES` (41 rows), `TraitRoute`, `TraitRouteContext`; `configValue`/`entityConfigValue` moved from loader.ts. Bodies verbatim, `this.X` became `ctx.X`.
- `applyTraitAdjectives` in loader.ts is now: conditional-composition prelude, one table lookup, define-trait fallback, refusal naming the word. loader.ts 3101 to 2797 lines.
- `floats` (expanses manifest word) was in the old switch but not chord's `TRAIT_ADJECTIVES`, so the conformance pin is a partition (catalog / NPC / combat / extension-manifest words), three tests in `tests/manifest-conformance.test.ts`.
- Four deferred `unknown` casts became typed writes: plural to `IdentityTrait.grammaticalNumber`; `STARTS_STATE_TRAIT_FIELDS` rows carry `set(entity)`; `NpcFieldRoute` is a discriminated union guarded at table build (extension-registry.ts); `writeChordTraitField` narrows by `instanceof ChordDataTrait`, which moved to new `src/chord-data-trait.ts` (loader re-exports it; facade unchanged). AC-5 grep prints nothing.
- Evidence: story-loader `tsc --noEmit` exit 0; `pnpm --filter '@sharpee/story-loader' test` 191 files, 1527 passing, 1 skipped (floor 1524); chord 1779 passing (unchanged); `./repokit build` exit 0 (00:45). Tree runs vs baseline: secret-letter and ides-of-march byte-identical; fernhill one wall-clock byte (0.1s to 0.2s), no content diff. Demonstration: `scenery` row deleted, conformance test failed `expected [ 'scenery' ] to deeply equal []`, row restored.

### /doctor (earlier this session, commit 33a8ab7fd)
- CLAUDE.md trimmed 14,398 to 12,824 chars; transcript-testing detail moved to new `.claude/skills/transcript-testing/SKILL.md`; 9 unused user-scope skills and the `xcode` MCP server turned off (outside repo). Install healthy.

## Key Decisions

### 1. Table is a sibling module, not a section of extension-registry.ts
Avoids an import cycle; D2a moves it under `build/` later. Recorded as an as-landed note in ADR-389 D3 together with the `floats` finding and the typed writes.

## Next Phase
- **Phase 8**: "World build steps, entity family (D2a)" — `WORLD_BUILD_STEPS` scaffold under `packages/story-loader/src/build/`, entity step family moved verbatim, order-pin test.
- **Tier**: Large (~400 tool-call budget)
- **Entry state**: Phase 7 committed; David's go.
- advances once this commit lands — plan-phase.sh: `[DevArch REFUSED: Phase 7 "Core adjective table (D3)" was flipped DONE but the flip is uncommitted in docs/work/adr-389-chord-loader/plan.md — commit it (the phase commit, your own "commit", or finalize) or revert it before the next phase can start]`

## Open Items

### Short Term
- None filed or closed this session (`issues.sh list-open` answered; no new items).

### Long Term
- None this session.

## Files Modified

**story-loader** (6 files):
- `packages/story-loader/src/trait-routes.ts` (new) - CORE_TRAIT_ROUTES and route types
- `packages/story-loader/src/chord-data-trait.ts` (new) - ChordDataTrait moved out of loader
- `packages/story-loader/src/loader.ts` - table lookup replaces 41-arm switch
- `packages/story-loader/src/extension-registry.ts` - NpcFieldRoute union, build-time guard
- `packages/story-loader/src/runtime/dispatch-verbs.ts` - typed write
- `packages/story-loader/tests/manifest-conformance.test.ts` - three partition tests

**Docs** (2 files): ADR-389 D3 as-landed note; `docs/work/adr-389-chord-loader/plan.md` (Phase 7 DONE).
**Earlier (/doctor)**: CLAUDE.md, `.claude/skills/transcript-testing/SKILL.md`.

## Notes

- Out-of-scope dirty paths left untouched: `docs/context/archive/session-20261029-1923-main.md`, `docs/work/save-restore-551/`.
- User-scope /doctor config changes are not committed (outside repo).

---

## Session Metadata

- **Session**: f809a5
- **Status**: IN-FLIGHT
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: 33a8ab7fd (the /doctor finalize) — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261101-2331-feat-adr-389-chord-loader.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 6 committed (4a84a9344); David's go for Phase 7.
- **Prerequisites discovered**: None.

## Architectural Decisions

- ADR-389 D3 amended with an as-landed note (partition pin, sibling-module placement, typed writes).
- Pattern applied: table-driven lowering with a conformance partition against the language's manifests.

## Mutation Audit

- Files with state-changing logic modified: trait-routes.ts, loader.ts, extension-registry.ts, dispatch-verbs.ts
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/story-loader' test`, 1527 passing, 00:4x 2026-11-02, supplied by the invoker; existing loader tests assert on built traits) [reported by session, unverified: event-log row not checked by this writer]
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: 3 (conformance partition)
- Tests passing before: 1524 floor, after: 1527 (evidence: invoker-reported run, 2026-11-02 ~00:45) [reported by session, unverified]
- Known untested areas: none identified

---

**Progressive update**: session completed 2026-11-02 00:00 — first and only write; terminal summary of the /doctor session.
**Progressive update**: checkpoint 2026-11-02 00:46 — added ADR-389 Phase 7 (core adjective table), flipped DONE; status IN-FLIGHT.
