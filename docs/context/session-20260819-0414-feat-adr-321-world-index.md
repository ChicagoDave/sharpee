# Session Summary: 2026-08-19 04:14 CDT - feat/adr-321-world-index

## Goals
- Execute Phase 5 of `docs/work/world-index/plan.md`: AC-8, synthetic corpus and scale timing for ADR-321's D4 fixed-point analysis.

## Phase Context
- **Plan**: ADR-321 world index — five-view IR analyzer (Map/Reach/Incomplete/CLI/IDE World tab) feeding SharpeeIDE.
- **Phase executed**: Phase 5 — "AC-8: synthetic corpus and scale timing" (Medium tier).
- **Tool calls used**: 125 / 250 budget.
- **Phase outcome**: Completed under budget, after a full rebuild mid-session (see Key Decisions).

## Completed

### Corpus-shape profiler and synthetic generator (rebuilt)
- `packages/world-index/tests/corpus-shape.ts` measures structural ratios off the three real Chord stories (Fernhill, The Alderman, Ides of March): 1.65 exit lines/room, 2.65 things/room, 0.15 obstacles/room at 0.25 lock share, 23.1 words/description, 6.5 rooms/region, 0.5 dead-end share, 0 cycles/room — pinned by inline snapshot.
- `tests/synthetic-corpus.ts` generates structurally valid Chord stories at 20/40/60/80/100 rooms, plus a `dense-chain` adversarial-bound shape, with every generator parameter read from the measured ratios rather than hand-tuned.
- `tests/scale-timing.ts` is the timing harness; `pnpm --filter '@sharpee/world-index' scale` (new package script) runs the always-on acceptance tests plus the gated report table.

### Five figures recorded (plan.md lines 350-366)
- Startup floor 63.53ms; derived shapes at 20/40/60/80/100 rooms run 0.23-1.07ms analysis time (68.03-71.14ms over floor including IR parse); `dense-chain` bound at 100 rooms: 1.19ms analysis, 72.16ms total.
- Growth: rooms^0.95 (derived), rooms^1.08 (adversarial bound). A 100-room story costs an author ~71ms — 63.5ms is Node startup, ~1ms is the derivation itself.

### Decision — full analysis kept, fallback not implemented
- David's sign-off, 2026-08-19: the documented cheap fallback (does-any-writer-exist without reachability) would save under a millisecond at 100 rooms while trading away D4's correctness. Recorded in plan.md lines 341-344.

## Key Decisions

### 1. Discarded first attempt — hand-tuned generator, patched dist scaffolding
First pass built the generator as two `.mjs` scripts under `packages/world-index/scripts/`, hand-tuned (obstacle every 5 rooms, reserved side room per obstacle) specifically so the D4 fixed point would iterate, and patched a scratchpad copy of compiled `dist-esm/reach.js` to count fixed-point passes for a figure. David: "no hacking dude," then "determine the standard for all of it: elegant and aligned." The standard already existed in Phases 1-4 of this same package (`corpus.ts` compiles story source rather than committing `.ir.json`; `cli.test.ts` spawns the real `dist/cli.js`; D3 models loader semantics rather than guessing) — all three moves violated a precedent already set in this package. David: "delete them and measure the real stories."

### 2. Rebuild — every parameter derived, round-trip as the honest check
Deleted `packages/world-index/scripts/synthetic-corpus.mjs`, `scale-timing.mjs`, and the scaffolding test `tests/synthetic.test.ts` (none ever committed). Rebuilt entirely in TypeScript under `tests/`, every generator parameter read from measured ratios, with a round-trip test (generate from measured ratios, compile, profile with the same profiler, require it back within 15%) as the acceptance check. The round trip caught three real defects: obstacle density scaled by spine length instead of total rooms (3x too sparse), prose overshooting the measured 23.1 words to ~28, and `dense-chain` inheriting the derived branch count so its trunk was too short to be dense.

### 3. Two ratio corrections before deriving anything from them
`roomsPerRegion` pooled wrongly (read 13 by counting all rooms against Fernhill's 2 regions; corrected to 6.5, taken only over stories that declare regions), and raw connections-per-room read 0.88 — below a tree — purely from pooling three stories losing one connection each; replaced by `cyclesPerRoom` taken per story then pooled (reads 0, generalizes).

## Next Phase
- **Phase 6**: "IDE World tab (D8) — Map / Reach / Incomplete views in SharpeeIDE" — Medium tier (250 tool calls).
- **Entry state**: Phase 4's JSON contract is stable and Phase 5's timing decision is made (full analysis kept), so the tab is built against the full analysis path. Still blocked: David's explicit approval of this phase's `tools/ide` changes, which the plan's entry state requires and which has not been given.
- **Carried in**: the Map view's collision resolution and direction-skew detection (D7) have no corpus behind them — every real Chord map is a pure tree with zero cycles — so those code paths will be built and reviewed without a real story exercising them.

## Open Items

### Short Term
- Phase 6 cannot start implementation until David explicitly approves its `tools/ide` (Swift) changes.

### Long Term
- Carried from a prior session: scope is not modelled in the Incomplete view.
- ADR-321's quoted "17 missing-word cases" for Fernhill is stale against the re-measured 20/9/58 breakdown and wants an amendment.

## Files Modified

**Plan and package config** (2 files):
- `docs/work/world-index/plan.md` - Phase 5 marked DONE with Outcome block and five figures; Phase 6 advanced to CURRENT (since 2026-08-19)
- `packages/world-index/package.json` - added the `scale` script

**New — profiler, generator, harness, and tests** (6 files):
- `packages/world-index/tests/corpus-shape.ts` / `corpus-shape.test.ts` - structural ratio profiler over the real corpus
- `packages/world-index/tests/synthetic-corpus.ts` / `synthetic-corpus.test.ts` - ratio-derived synthetic story generator
- `packages/world-index/tests/scale-timing.ts` / `scale-timing.test.ts` - timing harness against `dist/cli.js`

**Deleted this session, never committed**:
- `packages/world-index/scripts/synthetic-corpus.mjs`, `scripts/scale-timing.mjs`, `tests/synthetic.test.ts` - discarded first-attempt scaffolding (hand-tuned generator, patched dist-esm scratchpad)

No files under `packages/world-index/src/` were touched — the analyzer itself is unchanged, so no rebuild was needed.

## Notes

**Session duration**: ~25 minutes (04:14-04:40 CDT per figure timestamps).

**Approach**: Measure the real corpus first, derive every generator parameter from it, then use a round-trip profile-and-compare as the correctness check — after an initial hand-tuned approach was rejected and discarded per direct instruction.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2 (Reach fixed point) and Phase 4 (CLI entry point) both complete prior to this session, as required by Phase 5's entry state.
- **Prerequisites discovered**: None.

## Architectural Decisions

- None this session — ADR-321 itself unchanged; the fallback-vs-full-analysis call is a plan-level decision recorded in plan.md, not a new ADR.
- Pattern applied: measure-then-derive, consistent with Phases 1-4's precedent (compile from source, spawn the real binary, model real semantics) — the standard David named after rejecting the hand-tuned first attempt.

## Mutation Audit

- Files with state-changing logic modified: N/A — this phase is a test-and-measurement harness (generator, profiler, timing harness), not application state mutation.
- Tests verify actual state mutations (not just events): N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — no prior session in this plan hit the "fixture shaped to produce its own finding" pattern; this is the first occurrence of that specific defect in this project's corpus.

## Test Coverage Delta

- Tests added: 36 net this session (evidence: `pnpm --filter '@sharpee/world-index' test:ci` -> "Test Files 8 passed (8)", "Tests 119 passed | 1 skipped (120)", 2026-08-19 04:39 local)
- Tests passing before: 83 (end of prior session, per plan.md Phase 4 Outcome) -> after: 119 passed, 1 skipped (evidence: same test:ci run, 2026-08-19 04:39 local, timestamped after the final edits). An earlier discarded scaffolding file briefly took the count to 100 before being deleted with the `.mjs` scripts it imported.
- Known untested areas: The Map view's collision resolution and direction-skew detection (D7) has no real corpus exercising it — carried into Phase 6, not a Phase 5 gap.

---

**Progressive update**: Session completed 2026-08-19 04:40 CDT
