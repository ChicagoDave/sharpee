# Session Summary: 2026-09-29 - feat/segmented-test-tree (CDT)

## Goals
- Implement ADR-355 (segmented test tree) per docs/work/segmented-test-tree/plan-20260929-adr-355.md, as far as Phases 1, 1b, 2, 2b.
- Set the author-narrative-testing objective (docs/objectives/author-narrative-testing.md, O-1) and plan against it.

## Phase Context
- **Plan**: ADR-355 segmented test tree (docs/work/segmented-test-tree/plan-20260929-adr-355.md), Plan Status ACTIVE
- **Phases executed**: 1 (segment format), 1b (canonical gate + card ids), 2 (devkit reads `<story>.tests/`, conversion), 2b (secret-letter `emitted` conversion) — all DONE
- **Tool calls used**: 344 / 250 (state file; Phase 1 tier Medium) — ran over budget
- **Phase outcome**: Ran over budget; all four phases completed
- Phase 3 (testing surface, bridge, run-event line id, both IDE heads) is CURRENT and not started; Phase 4 PENDING.

## Completed

### Planning and objective
- Recap of session 21019e (its finalize stopped at the >15-line summary gate; packages/devkit/src/repo.ts #546 comment fix and session-20260929-0041-main.md ride along uncommitted).
- pre-session-audit (167 open issues, tsc clean); session-planner + plan-review: one STALE ADR (ADR-355 claims #494 closes by construction, but the run-event wire keys on labels) and three tensions (#435, #491, #497), all folded into the plan. David's six decisions: wire carries the line id; fork ordinal = sibling position; 8-char random base-36 ids in manifest.json; delete converter after verification; feature branch; macOS IDE click-through only.
- /devarch:objective wrote O-1 "the afternoon holds at story scale" (baseline 10 of 15 closing-table beats shipped; due 2026-10-15; GREEN, ACTIVE).

### Phase 1 and 1b (packages/branch-tester)
- tree-document.ts: segmentTree/assembleTree/ensureSegmentIds/diffTreeFiles/createSegmentId, TREE_DOCUMENT_VERSION 3; walker line id = head segment id.
- checkCanonicalTree, card ids (one namespace with segment ids), scripts/check-test-trees.mjs, scripts/hooks/pre-commit (local only; install step in the plan). Defect found and fixed: git usage text leaked outside a repository.
- Desktop Claude's churn measurement (docs/work/desktop-claude/secret-letter-tree-churn-20260929.md, decisions-20260929-tree-churn.md): ~95% of the worst rewrites was formatting from non-canonical writers; David's rulings drove the canonical gate and ADR-355 D7 + AC-10 amendment.

### Phase 2 (devkit) and 2b
- devkit reads `<story>.tests/` (findTreeDirectory, readTreeFiles; gate exits 2). Nine trees converted by a one-shot script, AC-9 verified per tree; nine .tests.json files and the script deleted on David's confirmation. `sharpee test` on fernhill, ides-of-march, secret-letter, thealderman identical to pre-cutover baselines except the header (docs/work/segmented-test-tree/baseline/).
- 2b: converting all 453 exact-match claims to `emitted` failed 195 (91 entity descriptions, 75 exit refusals, 29 composed). Per David/Desktop, partial revert: 245 kept, 208 restored from main's HEAD; report identical to baseline. Filed GH #547 (emitted ignores ADR-333 block provenance).
- David: "you know I hate regex" — saved as memory feedback_no_regex_edits.

## Key Decisions

### 1. Canonical gate over tolerant readers
Non-canonical writers caused ~95% of churn, so the pre-commit gate rejects non-canonical trees rather than normalizing silently (ADR-355 D7 / AC-10 amended).

### 2. Partial revert of the emitted conversion
`emitted` cannot see block-provenance text (GH #547); only claims that pass and are single-variant were converted. Kept 245 of 453.

## Next Phase
- **Phase 3**: testing surface, bridge post per segment, run-event line id, regenerated Swift/C# protocol types, both IDE heads; ends with David's Chord Writer click-through.
- **Entry state**: branch feat/segmented-test-tree; the IDE testing surface still reads the retired .tests.json until Phase 3. Platform bundle dist/cli/sharpee.js not rebuilt (still has the old bundle-entry.js message until the next `./repokit build`).

## Open Items

### Short Term
- 547: emitted claims ignore rendered-block provenance (ADR-333) — 195 secret-letter claims invisible to emitted (filed this session)
- 494: Label-collision: branch-tester needs a stable line id — closes in Phase 3/4 (needs David's OK to close)
- 491: AC-3 unmet — run column's fold needs the same extraction AC-4 got — closes in Phase 3/4

### Long Term
- 497: Probe defect: --app-exit-state against a real story mutates its test tree (plan tension, carried)
- 435: Recurrence: Test Infrastructure (plan tension on empty-suite pattern, carried)

## Files Modified

**branch-tester** : src/index.ts, tree-document.ts, tree-walker.ts and their tests (tree-document, tree-end-state, tree-walker)
**devkit**: commands/test.ts, test-tree-document.ts, repo.ts, standalone/story-config.ts and tests
**scripts**: bundle-entry.js, check-test-trees.mjs, hooks/pre-commit, __tests__/narrative-*.test.ts, support/fernhill-run.ts, support/scratch-story.ts
**Trees**: nine `<story>.tests/` directories added (fernhill, ides-of-march, secret-letter, w10-dance, thealderman, john-chord-samples, and fixtures); nine `.tests.json` deleted
**Docs**: ADR-355 (D7 + AC-10 amendment), plan, docs/objectives/author-narrative-testing.md, docs/work/desktop-claude/*, docs/work/segmented-test-tree/baseline/

## Notes

- Evidence (event log docs/context/.devarch-events-e31b07.jsonl): 2026-09-29T07:58:01Z "Tests passed" 198 passing / 28 passing / 71 passing (devkit / the three tree files / scripts), after the last source edit (07:53:32Z was a plan-file edit only).
- Branch-tester 270 passing and check-test-trees 12 passing (real path) are the session's account of earlier runs: [reported by session, unverified] against fresh-after-last-edit rows.
- The ignored-by-design state: devkit, testing surface red until Phase 3 on the IDE side.

---

## Session Metadata

- **Session**: e31b07
- **Status**: COMPLETE (unverified: branch-tester 270 and check-test-trees 12 counts) — this session's scope (Phases 1-2b) is done; the plan continues at Phase 3.
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (feature branch; not merged)

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-355, David's six planning decisions, Desktop churn rulings.
- **Prerequisites discovered**: `emitted` provenance visibility (GH #547) before the remaining 208 claims can convert.

## Architectural Decisions

- ADR-355 D7 + AC-10 amended: card ids share the segment-id namespace; canonical gate on commit.
- Pattern applied: extend existing branch-tester pure-function layer; devkit consumes it.

## Mutation Audit

- Files with state-changing logic modified: branch-tester tree-document.ts, devkit test-tree-document.ts, scripts/check-test-trees.mjs
- Tests verify actual state mutations (not just events): YES (evidence: mutation-verification runs 07:33:12Z, tests passed 3 and 23; its gaps in Phases 1, 1b, 2 closed)
- If NO: N/A

## Recurrence Check

- Similar to past issue? Uncertain — test-tree churn relates to recurrence #435 (Test Infrastructure), not confirmed same root cause.

## Test Coverage Delta

- Tests added: branch-tester ~16 net (254 to 270 across 1b), devkit +5 after mutation-verification, check-test-trees 12 new [reported by session, unverified]
- Tests passing: devkit 198, tree files 28, scripts 71 (evidence: event 2026-09-29T07:58:01Z)
- Known untested areas: IDE testing surface and bridge (Phase 3); emitted claims for block-provenance text (GH #547).

---

**Progressive update**: session completed 2026-09-29 02:58 — terminal write: Phases 1, 1b, 2, 2b DONE; Phase 3 CURRENT.
