# Session Summary: 2026-08-16 (morning) - feat/adr-310-318-implementation

## Status: COMPLETE

## Goals
- Write the accumulated ADR amendment batch (David: "write the ADR amendment
  batch") — the five rulings landed across the D11 seam work.

## Completed
- **ADR-145 amended (edge-triggered activation)**: Activation rules rewritten
  inline — rising-edge activation via `GoalRuntimeState.conditionHeld`,
  empty-condition goals run exactly once, completion under a continuously-held
  condition is not a new edge; `## Amendment` section records the D12 defect
  evidence (Chelsea/Steward loops), the rejected alternatives (level-trigger,
  one-shot latch), and the composition with ADR-318 D8 discharge.
- **ADR-318 amended (session 55a70a note appended)**:
  - **D8 discharge contract** (seams 2+5): discharge = delivery through a
    breaking-gated outlet on self; the gate IS the marker (no authored
    keyword); `conditionRequiresSelfBreaking` walker semantics; row leg +
    goal leg (`discharges` stamp, `.discharges()`); curve-only drain, never
    the ledger; `character.author.pressure_drain`.
  - **D9 pin split** (seams 3+4): band-aware gating (suspension at own
    `breaking` ≠ release); maintenance accounting (truth at breaking neither
    mint nor maintenance; different-valued lie costs but mints nothing);
    per-(audience, fact) release — truth-told live (+ `pin_released`),
    caught-lying dormant, authored break = trait `unpinLedger`; discharge
    never unpins.
  - **AC3 forcing clause corrected**: deterministic deposit ladder replaces
    ADR-293 `forces:` (which pins random point outcomes — nothing to pin).

## Key Decisions
- Amendment style: rulings folded inline into D8/D9/AC3 (matching ADR-318's
  own interview-fold convention) + Session-section amendment note; ADR-145
  uses the ADR-070 `## Amendment — title (date)` style plus inline fold.

## Open Items
- Carried: IDE author-channel polish; seam 6
  story authoring (thealderman `change it to confessed`); stale plans
  (adr-280-chord-writer-project-model, live-derived-state); 23 stranded event
  logs; ADR-location split (4 directories).

## Files Modified
- `docs/architecture/adrs/adr-145-npc-goal-pursuit.md` (activation rules +
  amendment section)
- `docs/architecture/adrs/adr-318-normative-character-layer.md` (D8, D9, AC3,
  Session amendment note)
- this session file (NEW)

- **`tsf build --npm` leg RETIRED as a local step (David, 2026-08-16)**: tsf
  is not used outside version bumps — npm-publish builds run in the GitHub
  CI workflow. Memory updated (feedback_npm_build_regression.md rewritten).
- **D9 FIXED (David: "go" on the optional-`actor` option)**: chord-path
  author rows were attributed to the PLAYER — `createAuthorEvent` mints
  `entities.actor = npcId`, the story-loader flatten dropped `entities`,
  and all three re-mint sites stamped the action context's player-actor.
  Fix: `CapabilityEffect.actor?` honored at the re-mint sites (world-model
  `mintEffect`, engine `effectsToEvents`); story-loader `toEffect` carries
  attribution through every flatten site; local `act_witnessed`/
  `pressure_drain` effects stamp `actor: speaker.worldId`. No-actor effects
  unchanged.
- **Verification (D9, 2026-08-16)**: world-model 1486 passing (+3), engine
  629 passing (+1), story-loader 499 passing (+2: real-ask-path attribution
  + custom-action dispatch), tsc clean; bundle rebuilt — thealderman 60,
  b1 15, b3 63, Dungeo chain 952, all passing (counts matched to baseline).
- **Mutation-verification caught a fourth re-mint site**: story-loader's
  `buildDispatchAction.report()` (custom `define action` consuming trait
  capability behaviors) — fixed with the same override + test. Its
  `blocked()` never calls `behavior.blocked()` (pre-existing) — documented
  in a code comment, not wired.

## Notes
- Session 55a70a; pre-session audit clean (tsc clean, no stale artifacts,
  carried backlog only).
