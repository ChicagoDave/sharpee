# Session Summary: 2026-11-01 - feat/adr-389-chord-loader

## Status: In Progress

## Goals
- ADR-389 Phase 5 "validateIR, grammar gates (D4b)": move extend-target, removal-target (with unmatched-removal-pattern) and deadly-while-unsupported into chord's `validateIR`; delete the analyzer and loader copies; move the tests.

## Completed
- Source moves: `checkAlterationTargets` whole into `validate-ir.ts` (first block, so the ADR-276 composite order is unchanged); `deadly-while-unsupported` from `analyzer/entity/exits.ts` to the IR's `deadlyExits[*].condition`; `nearest()` to `edit-distance.ts`.
- Loader: rows 7, 8, 12 deleted; `suggestGerund`/`editDistance`/`STDLIB_ACTION_IDS`/`IFActions` import deleted as dead.
- Tests: +5 chord in `validate-ir.test.ts`; `adr-276-backstops.test.ts` rewritten as the createStory seam (2); `grammar-alterations.test.ts` two backstop tests removed, unmatched-shape re-pinned as the LIVE-grammar fact.
- Evidence (2026-11-01 ~07:00): chord 1768 passing / 111 files; story-loader 1524 passing / 1 skipped / 192 files; chord and loader tsc clean; fixture diagnostics same set, one position move in `lexer-golden/alterations-counters.story`; trees: secret-letter and ides-of-march byte-identical, fernhill one wall-clock field.

## Key Decisions
- The manifest-shape `unmatched-removal-pattern` check travels with its method into `validateIR` (IR + chord-side data); the loader's LIVE-grammar check (row 9) stays.
- The alteration block is placed first inside `validateIR` to keep the composite report order.

## Open Items
- D6's story-loader floor (1525) missed by one: 1524, from two tests moved to chord. David's ruling before the phase flip.
- `./repokit build` exit 0 (2026-11-01 ~07:10).
- Carried: row 5 ruling; rows 11, 14, 25 (AST-level); G2 for D4c.

## Files Modified
- `packages/chord/src/{validate-ir.ts, analyzer.ts, edit-distance.ts, analyzer/entity/exits.ts}`
- `packages/chord/tests/{validate-ir.test.ts, alteration-targets.test.ts}`
- `packages/story-loader/src/loader.ts`
- `packages/story-loader/tests/{adr-276-backstops.test.ts, grammar-alterations.test.ts}`
- `docs/architecture/adrs/adr-389-chord-loader-one-identity-and-a-build-list.md`, `docs/work/adr-389-chord-loader/plan.md`, this file

## Notes
- Session started: 2026-11-01 (session 7cdce0)
