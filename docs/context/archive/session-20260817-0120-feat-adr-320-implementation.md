# Session Summary: 2026-08-17 - feat/adr-320-implementation

## Status: COMPLETE (Phase 4 committed/pushed as `f4f06a4f`; Phase 5 of the
ADR-320 plan closed — scene runtime landed, 491 character tests passing,
mutation-verification clean; Phase 6 next, pending stdlib confirmation)

## Goals
- Commit and push Phase 4 (done: `f4f06a4f`, including the story-loader
  not-yet-wired evaluator guard fix for the four conversation predicate kinds).
- ADR-320 Phase 5: `@sharpee/character` scene runtime — §7 renames, scene
  store/runtime, floor/interruption scoring, manner beat rotation,
  conversation-memory tracking, modeled-PC tick coverage.

## Completed
- Commit `f4f06a4f` pushed (Phase 4 + story-loader `evalCondition` loud
  not-yet-wired guards for `recency`/`discussed`/`asked`/`subject-changes`,
  with 4 rejection tests; fixed the TS2366 build failure the first commit
  attempt surfaced).

### Phase 5 implementation (scene runtime, `@sharpee/character`)
- §7 renames landed (contracts.md, approved 2026-08-16): lifecycle's
  `ConversationIntent` → `ContinuationIntent`; `ConversationStrength` →
  alias of world-model `SceneStrength`; `RedirectResult` → alias of
  `InterruptionOutcome`. World-model's socket `ConversationIntent` keeps
  the name; no external consumer of the old lifecycle name existed.
- New modules in `src/conversation/`: `scene-store.ts` (world-state key
  `character.scenes` per contracts §1.3 — Boundary Statement produced;
  scenes + manner rotation cursors + id sequence, single-writer),
  `scene-runtime.ts` (openScene/closeScene/recordSceneMove/
  applySceneDirectives/ageScenes — ADR-142 decay wired live as the
  `silence` boundary via `DEFAULT_DECAY_THRESHOLDS`),
  `conversation-memory.ts` (per-pair records via `ConversationMemoryAccess`
  seam — Phase 7 plugs the trait in; word curves: recency fresh≤1/recent≤8,
  absence soon≤3/while≤30, asked 1/2/3+), `manner.ts` (declaration-order
  row match, beat rotation no-back-to-back, cursor in store for
  save-identical replay; `renderSilence` — silence never a bare absence),
  `initiative.ts` (authored occasion matcher, lone hold-tongue =
  suppresses, goal-step never matches), scoring functions in
  `scene-scoring.ts` (`scoreFloor` — forces wins/suppresses withdraws/
  highest live motivation/lexicographic tie-break; `resolveInterruption` —
  worldAct breaks blocking; `sceneGrip` — exchange innermost;
  `strengthFromIntent` — eager/confessing→assertive, blocking never derived).
- Modeled-PC tick coverage (contracts §2.1): the player joins the decay
  sub-step only; observe/influence/propagation/goals stay NPC-only.
- Behavior Statements produced before tests; tests derived line-for-line:
  46 new tests across 6 files, all asserting on store/memory/trait state.
  Full character suite 491 passing, 40 files (run 2026-08-17 01:31, this
  session). Repo-wide `npx tsc --noEmit` clean (run 2026-08-17 01:32,
  exit 0). `tsf build --package character --all` clean (local/esm/npm —
  dist-esm staleness trap avoided).

## Key Decisions
- Word-curve thresholds are runtime-internal defaults (documented in
  `conversation-memory.ts`), revisable freely — numbers never reach Chord.
- `strengthFromIntent`: eager/confessing → assertive, all else passive;
  `blocking` only ever authored.

## Open Items
- Commit script recreated `docs/context/archive/` (auto-archived the prior
  session file) — David consolidated that archive to the Workspace corpus;
  the script's cleanup step may need updating.

## Files Modified
- `packages/story-loader/src/evaluator.ts` - not-yet-wired conversation predicate guards (committed `f4f06a4f`)
- `packages/story-loader/tests/conversation-predicates-not-wired.test.ts` - new (committed `f4f06a4f`)
- `packages/character/src/conversation/lifecycle.ts` - §7 renames/alias collapses
- `packages/character/src/conversation/builder.ts` - rename follow-through
- `packages/character/src/conversation/scene-store.ts` - new; `character.scenes` store
- `packages/character/src/conversation/scene-runtime.ts` - new; open/close/directives/decay
- `packages/character/src/conversation/conversation-memory.ts` - new; per-pair records + word curves
- `packages/character/src/conversation/manner.ts` - new; beat rotation + rendered silence
- `packages/character/src/conversation/initiative.ts` - new; authored occasion matcher
- `packages/character/src/conversation/scene-scoring.ts` - scoring runtime added
- `packages/character/src/tick-phases.ts` - modeled-PC decay coverage
- `packages/character/src/conversation/index.ts`, `src/index.ts` - barrels
- `packages/character/tests/conversation/{scene-runtime,scene-scoring,conversation-memory,manner,initiative}.test.ts` - new, 43 tests
- `packages/character/tests/tick-phases/modeled-pc-decay.test.ts` - new, 3 tests
- `docs/work/adr-320-conversation/plan.md` - Phase 5 → DONE with evidence

## Notes
- Session started: 2026-08-17 01:15 CDT (session 1b5886)
