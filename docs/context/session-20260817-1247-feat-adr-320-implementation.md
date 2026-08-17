# Session Summary: 2026-08-17 - feat/adr-320-implementation

## Status: COMPLETE (Phase 8 landed and green — plan DONE with evidence; mutation-verification's two warnings closed same session; work uncommitted pending David's word)

## Goals
- ADR-320 Phase 8: `packages/engine` — NPC↔NPC scene scheduling and
  save/restore (David: "start phase 8" — the platform-change confirmation for
  `packages/engine`).

## Completed
- Phase 8 designed (earshot folded in at David's direction), CONFIRMED,
  and IMPLEMENTED — all suites and transcripts green; plan.md Phase 8 →
  DONE with evidence inline; design doc carries the implementation
  outcomes (speech sound kind, prose-pipeline AC11 gate, leverage-gate
  retirement, abandonedTopic field, no new wire kinds needed).
- David's mid-phase ruling (option 1): ADR-144 told-source leverage gate
  deleted per ADR-320 D11 — hearsay spreads onward; playerCanLeverage
  RETIRED as dead config; rumor-degradation idea filed as GH #272.
- New bundle fixtures: stories/character-acceptance/chord/phase8-scenes.story
  + six p8-* transcripts (earshot grading, effects-land, intrusion,
  $save/$restore mid-exchange chain).

## Key Decisions
- Scene scheduling lives as a scenes sub-step of the character-model tick
  phase (confirmed); NPC↔NPC scenes wrap the existing propagation
  transfers (D10 "propagation made visible") — no dialogue-content engine.
- Earshot rides ADR-172 spatial sound whole (David: "we def need within
  hearshot to be factor"): scene moves emit `speech` sounds; same-room =
  full, graded by the real acoustic graph beyond; volume from a
  runtime-owned coloring→tier curve; lang-en-us untouched.
- Leverage gate retired (David, option 1): told-sourced facts spread
  onward per ADR-320 D11 symmetry; selectivity is the authored surfaces.
- AC11 enforced at the prose pipeline: `character.scene./exchange.` wire
  events never render as prose (closed a latent Phase 6/7 double render).
- Interruption closes ride the `exit` boundary + the existing
  `interruption` wire kind (outcome word carries the protest); no new
  boundary or wire vocabulary.

## Open Items
- Phase 8 work uncommitted (awaiting David's commit instruction).
- Mutation-verification: two warnings (prose-gate untested; TELL not
  exercised against a foreign scene) — closed same session (engine 632,
  character 540). Everything else traced GREEN.

## Files Modified
- `docs/work/adr-320-conversation/phase8-engine-design.md` - new (CONFIRMED + implementation outcomes)
- `docs/work/adr-320-conversation/plan.md` - Phase 8 → DONE (evidence inline)
- `packages/world-model/src/capabilities/scene-runtime-binding.ts` - resolveIntrusion, seizeInitiative, InterruptionOutcome, InitiativeSeizure
- `packages/world-model/src/capabilities/index.ts` - barrel
- `packages/world-model/src/traits/character-model/conversation-scene.ts` - abandonedTopic
- `packages/plugins/src/turn-plugin-context.ts` (+pkg/tsconfig) - emitSound
- `packages/engine/src/game-engine.ts` - plugin-context emitSound feeds sound buffer
- `packages/engine/src/prose-pipeline/pipeline.ts` - character.scene./exchange. prose gate (AC11)
- `packages/engine/src/prose-pipeline/handlers/audibility.ts` - player-listener filter
- `packages/engine/src/prose-pipeline/handlers/domain-message.ts` - comment-only after gate moved
- `packages/stdlib/src/npc/npc-service.ts` - NpcTickContext.emitSound
- `packages/stdlib/src/actions/helpers/dialogue-selector.ts` - resolveSceneIntrusion, foreign-scene fixes
- `packages/stdlib/src/actions/standard/{asking,telling,talking}/*.ts` - intrusion wiring
- `packages/plugin-npc/src/npc-plugin.ts` - emitSound pass-through
- `packages/character/src/tick-phases.ts` - scenes sub-step + surfacing refactors
- `packages/character/src/conversation/scene-binding.ts` - resolveIntrusion impl, seizeInitiative option
- `packages/character/src/conversation/scene-runtime.ts` - abandonedTopic write
- `packages/character/src/conversation/scene-scoring.ts` - InterruptionOutcome re-home
- `packages/character/src/propagation/propagation-evaluator.ts` - leverage gate deleted (D11 ruling)
- `packages/character/src/propagation/propagation-types.ts` - playerCanLeverage RETIRED stamp
- `packages/character/package.json`/`tsconfig.json` - if-domain dep
- `packages/story-loader/src/runtime.ts` - buildInitiativeSeizure; buildAuthoredInitiative witnessedAction
- `packages/story-loader/src/loader.ts` - seizeInitiative registration
- `packages/character/tests/tick-phases/scene-sub-step.test.ts` - new (16 tests)
- `packages/character/tests/conversation/scene-dispatch.test.ts` - +5 intrusion tests
- `packages/character/tests/propagation/propagation.test.ts` - hearsay rewrite
- `packages/story-loader/tests/adr-320-phase8.test.ts` - new (4 real-path tests incl. AC12)
- `packages/engine/tests/prose-pipeline/pipeline.test.ts` - +3 wire-isolation tests
- `stories/character-acceptance/chord/phase8-scenes.story` - new fixture
- `stories/character-acceptance/tests/transcripts/p8-*.transcript` - new (6)

## Notes
- Session started: 2026-08-17 12:47 (session 48ac57)
- Audit correction: Phase 7 is already committed (484be733) — the audit's
  uncommitted-work flag was stale.
