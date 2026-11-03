# Session Summary: 2026-11-01 - feat/adr-389-chord-loader (06:46 CST)

## Goals
- ADR-389 Phase 5 "validateIR, grammar gates (D4b)": move extend-target, removal-target (with unmatched-removal-pattern) and deadly-while-unsupported into chord's `validateIR`; delete the analyzer and loader copies; move the tests.

## Phase Context
- **Plan**: ADR-389 chord loader (`docs/work/adr-389-chord-loader/plan.md`)
- **Phase executed**: Phase 5 — "validateIR, grammar gates (D4b)" (Medium); stays CURRENT, not flipped DONE
- **Tool calls used**: 104 / 250 (state file)
- **Phase outcome**: Work complete, flip withheld: D6's story-loader floor (1525 passing) is missed by one (1524) because two backstop tests moved to chord; David's ruling pending (I-640). The `**Demonstrated**` line is written in the plan (dated 2026-11-01) and was not flipped through `plan-phase.sh`.

## Completed

### chord
- `checkAlterationTargets` moved whole into `packages/chord/src/validate-ir.ts` (extend-target, removal-target, unmatched-removal-pattern); its ANALYSIS_PASSES entry deleted. Alteration block is first in validateIR so the ADR-276 composite order is unchanged.
- `deadly-while-unsupported` moved from `analyzer/entity/exits.ts` to validateIR, reading `ir.entities[*].deadlyExits[*].condition`.
- `nearest()` moved from analyzer private scope to `edit-distance.ts` (exported).

### story-loader
- `loader.ts`: rows 7, 8, 12 pure throws deleted and re-commented "refused upstream by validateIR"; `suggestGerund`, `editDistance`, `STDLIB_ACTION_IDS`, and the `IFActions` import deleted as dead.

### Tests
- chord `validate-ir.test.ts` +5 (extend-target with did-you-mean, story-action target needs no standard id, removal-target with did-you-mean, unmatched-removal-pattern, deadly-while with compile-seam equality); `alteration-targets.test.ts` header comment updated.
- loader `adr-276-backstops.test.ts` rewritten as the createStory seam (2 tests, message + span); `grammar-alterations.test.ts` two backstop tests removed, the unmatched-shape test re-pinned as the LIVE-grammar fact (manifest shape the seeded parser lacks; row 9 stays in the loader).

### Docs
- ADR-389 D4 as-landed note for the second gate group; plan Demonstrated line.

## Key Decisions

### 1. Manifest-shape check travels with its method
`unmatched-removal-pattern` (IR + chord-side data) moves into validateIR; the loader's LIVE-grammar check stays.

### 2. Alteration block first in validateIR
Keeps the ADR-276 composite report order.

## Next Phase
- Phase 5 remains CURRENT pending the D6 floor ruling; Phase 6 follows it in the plan.
- **Entry state**: David rules on the 1525 floor (I-640).

## Open Items

### Short Term
- I-640: ADR-389 Phase 5 story-loader floor missed by one (1524 vs 1525); ruling needed before the DONE flip (filed this write).
- I-638: ADR-389 tracking; carries row 5 ruling, rows 11, 14, 25 (AST-level gates), and G2 for D4c (commented this write).
- I-639: ADR-390 tracking (carried).
- Duplicate progressive file `docs/context/session-20261101-0702-feat-adr-389-chord-loader.md` (hand-created by the main session, content folded here); deletion needs David's confirmation.

## Files Modified

**chord** (4 src, 2 tests):
- `packages/chord/src/validate-ir.ts`, `analyzer.ts`, `edit-distance.ts`, `analyzer/entity/exits.ts`
- `packages/chord/tests/validate-ir.test.ts`, `alteration-targets.test.ts`

**story-loader** (1 src, 2 tests):
- `packages/story-loader/src/loader.ts`
- `packages/story-loader/tests/adr-276-backstops.test.ts`, `grammar-alterations.test.ts`

**docs**:
- `docs/architecture/adrs/adr-389-chord-loader-one-identity-and-a-build-list.md`, `docs/work/adr-389-chord-loader/plan.md`

## Notes

Out of this session's scope: `docs/context/session-20261029-1923-main.md` (modified) and `docs/work/save-restore-551/` (untracked).

Rule 15 mutation-verification not fired (edited functions match no name signal).

Evidence (2026-11-01 ~06:58-07:10, reported by session, unverified by event log): chord 1768 passing in 111 files (was 1763); story-loader 1524 passing / 1 skipped in 192 files (was 1526); chord `tsc -p` and loader `tsc --noEmit` clean; `./repokit build` exit 0; fixture diagnostics (58 fixtures) identical in set with one position move in `lexer-golden/alterations-counters.story` (unmatched-removal-pattern now after unbound-marker, since validateIR runs last); trees vs `docs/work/adr-389-chord-loader/baseline/`: secret-letter byte-identical (exit 1, same 11 failing cards), ides-of-march byte-identical, fernhill differs in one wall-clock field. AC-4: `grep -ci backstop loader.ts` = 12 (was 15); each moved code has one emit site in chord src.

---

## Session Metadata

- **Session**: 7cdce0
- **Status**: COMPLETE (unverified: test/build/tree counts reported by session, no event-log corroboration; Phase 5 flip withheld pending D6 floor ruling)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: none before this write — this write is staged by the next commit (rule 18); its hash is in `git log -- <this file>`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phases 3-4 (one identity, validateIR first gate group) landed.
- **Prerequisites discovered**: David's ruling on the D6 floor before Phase 5 can flip.

## Architectural Decisions

- ADR-389 D4: second gate group as-landed note added; validateIR is the single refusal point for these codes.
- ADR-276 composite order preserved.

## Mutation Audit

- Files with state-changing logic modified: none (validators and deletions).
- Tests verify actual state mutations: N/A

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: chord +5; loader net -2 (two backstop tests moved to chord, seam test rewritten)
- Tests passing before: chord 1763, loader 1526 -> after: chord 1768, loader 1524 [reported by session, unverified]
- Known untested areas: none identified

---

**Progressive update**: session completed 2026-11-01 13:23 — terminal write; folded the 0702 progressive file, filed I-640, Phase 5 left CURRENT
