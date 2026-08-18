# Session Summary: 2026-08-17 - feat/adr-320-implementation

## Status: COMPLETE (Phase 6 landed and green — 22 new tests, all suites
passing, bundle + wt-01 byte-identical, mutation-verification clean; work
uncommitted pending David's word)

## Goals
- ADR-320 Phase 6: `packages/stdlib` dispatch integration and witnessed player
  claims (David: "start phase 6" — the platform-change confirmation for stdlib).

## Completed
- Phase 6 design doc written and CONFIRMED by David ("confirmed as proposed -
  go"): `docs/work/adr-320-conversation/phase6-dispatch-design.md` — three
  Phase 1 contract amendments (§1.3 scene-store read-side re-home to
  world-model; `close-scene` gains `leaverId`; D15 registration becomes
  `{select, exchangeClaims}` + floor shapes re-home).
- Implementation landed (world-model, stdlib, character):
  - world-model: `conversation-scene-store.ts` (shape + pure reads;
    write stays in character — single writer), `scene-runtime-binding.ts`
    (`SceneRuntimeBinding`, `SceneOccasion`/`FloorBid`/`FloorDecision`),
    `ForceReading` declared beside `Force` (arbiter re-exports),
    `DialogueSelectorRegistration` + `leaverId`, `registerSceneRuntime`/
    `getSceneRuntime` on `WorldModel`.
  - stdlib: dialogue-selector helper rewritten (probe `exchangeGrips`,
    `runConversationScene` — open-on-address, move stamps, directive
    application with D8 exit-legality filtering via new `exit-legality.ts`
    on going's read points); asking/telling/talking wire the D16 grip
    (gripped firing skips interceptor phases — no table bookkeeping).
  - character: `scene-binding.ts` (binding impl over Phase 5 runtime;
    `floorWinnerFor` speak-propensity curve — impulsive/curious/vain,
    fear/paranoia damp, breaking compels, `authoredFor` most-specific-wins);
    `witnessStatement` statement site (D11) + `if.event.told` observe wiring
    in tick-phases; selector registration updated to the object shape.
- Behavior Statements (rule 12) and Integration Reality Statement (rule 13a)
  produced in-conversation; tests derived: 22 new tests across 4 files, the
  character `scene-dispatch.test.ts` suite driving the REAL stdlib actions
  over the REAL binding and `character.scenes` store.
- Evidence (all run 2026-08-17 this session): character 513 passing (43
  files), stdlib 1624 passing (115 files), world-model 1486 passing,
  bootstrap 43 passing; `./repokit build dungeo` clean; `wt-01` walkthrough
  byte-identical to golden.
- Plan Phase 6 → DONE with evidence inline.

## Key Decisions
- D16 precedence decided at validate time via a PURE probe (report-time is too
  late — the topic arm's postValidate has already consumed occurrence state).
- Open-address floor ships as mechanism only (`floorWinnerFor`); no player
  input surface — parser-en-us untouched per ADR-320's ruling.
- `ForceReading` declaration moved to world-model as a consequence of
  amendment 3 (FloorBid names it); character re-exports unchanged.

## Open Items
- Phase 6 work uncommitted (awaiting David's commit instruction).
- Mutation-verification: clean — 12 mutation-bearing/dispatch functions
  scanned, every mutation traced to a state-asserting test (agent re-ran the
  four suites itself, 28/28).
- Audit advisory cluster recurs (23 stranded event logs, 2 stale plans, 4-way
  ADR location split) — parked, not blocking.

## Files Modified
- `packages/world-model/src/traits/character-model/conversation-scene-store.ts` - new
- `packages/world-model/src/traits/character-model/character-vocabulary.ts` - ForceReading
- `packages/world-model/src/capabilities/scene-runtime-binding.ts` - new
- `packages/world-model/src/capabilities/dialogue-selector-binding.ts` - registration + leaverId
- `packages/world-model/src/world/WorldModel.ts` - scene runtime binding
- `packages/world-model/src/traits/character-model/index.ts`, `src/capabilities/index.ts` - barrels
- `packages/stdlib/src/actions/helpers/dialogue-selector.ts` - rewritten
- `packages/stdlib/src/actions/helpers/exit-legality.ts` - new
- `packages/stdlib/src/actions/standard/{asking,telling,talking}/*.ts` - grip + scene wiring
- `packages/character/src/conversation/scene-binding.ts` - new
- `packages/character/src/conversation/{scene-store,scene-scoring,selector,index}.ts` - seam moves
- `packages/character/src/arbiter/arbiter-types.ts` - ForceReading re-export
- `packages/character/src/act-detection/act-detection.ts` - witnessStatement
- `packages/character/src/tick-phases.ts` - statement site wiring
- `packages/character/src/index.ts` - barrel
- `packages/character/tests/conversation/{scene-dispatch,scene-binding}.test.ts` - new
- `packages/character/tests/act-detection/witness-statement.test.ts` - new
- `packages/stdlib/tests/unit/actions/exit-legality.test.ts` - new
- `packages/stdlib/tests/unit/actions/dialogue-selector-socket.test.ts` - object registration
- `packages/character/tests/conversation/selector.test.ts`, `packages/bootstrap/src/assemble-channels.test.ts` - registration updates
- `docs/work/adr-320-conversation/phase6-dispatch-design.md` - new (CONFIRMED)
- `docs/work/adr-320-conversation/plan.md` - Phase 6 → DONE

## Notes
- Session started: 2026-08-17 (session 755a11)
