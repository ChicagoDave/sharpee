# Session Summary: 2026-08-16 (~02:10 CDT) - feat/adr-310-318-implementation

## Status: COMPLETE

## Goals
- Phase 7 continuation: D11 (crack/drain semantics) assessment per David's
  pending-rulings list.

## Completed
- **D11 assessed with live probes (David: "again, D11 full assessment and
  examples")**: the audit one-liner covered four player-visible defects —
  (1) crack re-fires verbatim forever (b3: three identical confessions on
  three asks); (2) seek-out goal is an infinite loop (Steward re-blurts
  every 3rd turn); (3) pin gags the confession order-dependently
  (thealderman: alibi-first → truth permanently blocked, deflect delivers);
  (4) confession reversible (post-confession she re-lies, re-pins,
  un-confesses).
- **David rejected the bundled ruling ("you're conflating multiple seams")**;
  re-assessed as six separate seams: 1 goal lifecycle (ADR-145, independent
  of conscience — proven by Chelsea's unconditioned `seek-truth` looping in
  the shipping story), 2 pressure discharge trigger, 3 pin release (both D9
  paths unimplemented; `drainPressure` fuses drain+unpin — an accident, not
  a decision), 4 pin gating vs band (distinct from release), 5 Chord
  language marking (only if seam 2 picks delivery-marking), 6 story
  authoring (ruled by-design: "breaking is weather").
- **Seam 1 FIXED (David: "edge-triggered for seam 1, go")**:
  `GoalRuntimeState.conditionHeld` (world-model character-vocabulary.ts)
  samples the activation condition each tick for inactive goals;
  `GoalManager.evaluate` activates only on a rising edge. Active goals keep
  their activating sample; empty conditions can never re-edge. Rides the
  existing goalState save path.
- **Verification 2026-08-16**: character 430 passing, world-model 1483
  passing; bundle rebuilt — thealderman 53, b1 15 (each b1 leg against its
  own variant story), b3 26, Dungeo chain 952, all passing. Post-fix
  probes: Chelsea approaches Catherine exactly once (was every 3rd turn);
  Steward confesses exactly once then holds.
- Wiring audit: D11 row rewritten as the seam decomposition; new D12 row
  (goal reactivation) marked FIXED.
- **Edge-triggered activation folded into the ADR amendment batch (David:
  "yes, fold it into the amendment batch")** — rides with the pending
  ADR-318 AC3 forcing-clause amendment (+ ADR-145 activation contract).
- **Seam 4 FIXED (David: "seam 4 next")**: `pinAllowsClaim` band-aware —
  at the speaker's own `breaking` the pin stops gating (D9 implemented as
  written; suspension ≠ release, entry stays pinned — release is seam 3).
  `recordClaimDelivery` maintenance reclassified: maintenance = restating
  the pinned value; the escaping truth is neither mint nor maintenance
  (no deposit, no pin_held, pin untouched); a differently-valued lie at
  breaking still costs via isLie, mints nothing while a pin exists.
- **Verification (seam 4)**: character 434 passing (+4 selector tests),
  story-loader 497 passing; bundle rebuilt — thealderman 60 passing (incl.
  new `pin-vs-crack.transcript`: alibi-first path, pre-fix deflected
  forever), b1 15, b3 26, Dungeo chain 952, all passing. Probe: alibi →
  4× killer → truth now delivers the full confession.
- **Seam 3 assessed then RULED + FIXED (David: "per-audience, go")**:
  assessment established zero release paths existed (both D9 routes
  unbuilt; caught-lying is vocabulary only) and demonstrated the
  suspension-only re-gag live (post-drain, delivered confession →
  `no-matching-response`). Landed: truth-told per-audience release in
  `recordClaimDelivery` (+ `character.author.pin_released`);
  `drainPressure` now curve-only (global unpin removed — it would
  evaporate lies to absent audiences); authored break = the trait's
  `unpinLedger` (TS surface); caught-lying release ruled-but-dormant.
- **Verification (seam 3)**: character 435, world-model 1483,
  story-loader 497; bundle — thealderman 60, b1 15, b3 26, Dungeo chain
  952, all passing. Demo re-run post-fix: truth stays deliverable after
  a simulated drain, pin released; unconfessed audience's pin holds.
- **Seams 2+5 FIXED (David: "seam 2 as recommended, go") — D11 CLOSED**:
  `conditionRequiresSelfBreaking` walker in chord (new module + export);
  row leg drains on delivering a self-breaking-gated phrase (loader walks
  row bodies at build, `character.author.pressure_drain` emitted); goal
  leg drains on completing a `discharges`-stamped goal (apply-compiled
  stamps from the gate; TS builder `.discharges()`). Live composition:
  crack→deflect→rebuild→crack; seek-out confess→quiet→re-break→seeks out
  again (2 confessions, 1 per cycle).
- **Verification (seams 2+5)**: chord 853 (+5), character 438 (+3),
  story-loader 497; new transcripts b3-crack-discharge +
  b3-seek-out-recycle; bundle — b3 63, thealderman 60, b1 15, Dungeo
  chain 952, all passing. Chord dist-esm staleness hit after the new
  export (known trap) — rebuilt both targets.

## Key Decisions
- Seam 1 = edge-triggered goal activation (David, 2026-08-16). Rejected:
  level-triggered (status quo, loops) and one-shot latch (forbids
  legitimate re-runs, e.g. flee on fresh threat). Re-break → re-confess
  falls out as a re-edge once seam 2 lands drain.
- Rule 15 not fired: `evaluate` matches no side-effect name signal; state
  mutation asserted directly in the new tests.

## Open Items
- **D11 seam rulings: ALL SETTLED.** Seams 2+5 landed (David: "seam 2 as
  recommended, go"): discharge = delivery through a breaking-gated outlet
  on self; gate is the marker; phrasebooks = non-discharging color.
  Remaining D11 item is seam 6 only — story-level permanence authoring
  (thealderman `change it to confessed`), by-design semantics.
- **ADR amendment batch (accumulating, ready to write)**: AC3 forcing
  clause; edge-triggered goal activation (ADR-145 contract); seam-4
  band-aware pin gating; seam-3 per-audience release (truth-told +
  caught-lying-dormant + authored break = trait method; discharge never
  unpins); seam-2/5 discharge contract (gate-is-marker, self-only,
  curve-only drain, both outlets).
- Carried: ADR-318 AC3 forcing-clause amendment; D9 attribution; `tsf build
  --npm` leg (blocked on docs/work U+0001 ruling); IDE author-channel
  polish; stale plans (adr-280-chord-writer-project-model,
  live-derived-state); 23 stranded event logs; ADR-location split.

## Files Modified (seams 2-5 adds)
- `packages/chord/src/condition-discharge.ts` (NEW) + index export;
  `packages/chord/tests/condition-discharge.test.ts` (NEW)
- `packages/character/src/conversation/claims.ts` (band gating, release)
- `packages/character/src/arbiter/pressure.ts` (curve-only drain)
- `packages/character/src/goals/goal-types.ts` + `builder.ts`
  (`discharges`), `apply-compiled.ts` (stamping), `tick-phases.ts` (goal
  leg drain)
- `packages/world-model/.../characterModelTrait.ts` (unpinLedger doc)
- `packages/story-loader/src/runtime.ts` (row-leg discharge + comments)
- `packages/character/tests`: selector.test.ts (+6), pressure.test.ts,
  oracle-goals.test.ts (+3)
- `stories/thealderman/tests/transcripts/pin-vs-crack.transcript` (NEW);
  `stories/character-acceptance/tests/transcripts/b3-crack-discharge.transcript`
  + `b3-seek-out-recycle.transcript` (NEW)

## Files Modified
- `packages/world-model/src/traits/character-model/character-vocabulary.ts`
  (`GoalRuntimeState.conditionHeld`)
- `packages/character/src/goals/goal-activation.ts` (edge-triggered
  `evaluate`)
- `packages/character/tests/goals/goals.test.ts` (obsolete pin rewritten,
  +2 edge tests)
- `packages/character/tests/tick-phases/character-model-phase.test.ts`
  (shape pin + conditionHeld)
- `docs/work/adr-310/wiring-audit.md` (D11 seam decomposition, D12 FIXED)
- this session file (NEW)

## Notes
- Session f123de, started ~02:00 CDT after /clear; pre-session audit clean
  (carried backlog only).
