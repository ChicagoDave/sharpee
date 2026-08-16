# Session Summary: 2026-08-16 (morning) - feat/adr-310-318-implementation

## Status: IN PROGRESS

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
- Carried: D9 attribution (interceptor `npcId: undefined`); `tsf build --npm`
  leg (blocked on docs/work U+0001 ruling); IDE author-channel polish; seam 6
  story authoring (thealderman `change it to confessed`); stale plans
  (adr-280-chord-writer-project-model, live-derived-state); 23 stranded event
  logs; ADR-location split (4 directories).

## Files Modified
- `docs/architecture/adrs/adr-145-npc-goal-pursuit.md` (activation rules +
  amendment section)
- `docs/architecture/adrs/adr-318-normative-character-layer.md` (D8, D9, AC3,
  Session amendment note)
- this session file (NEW)

## Notes
- Session 55a70a; pre-session audit clean (tsc clean, no stale artifacts,
  carried backlog only).
