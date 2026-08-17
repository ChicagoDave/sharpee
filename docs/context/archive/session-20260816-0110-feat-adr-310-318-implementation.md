# Session Summary: 2026-08-16 (early AM) - feat/adr-310-318-implementation

## Status: COMPLETE

## Goals
- Phase 7 continuation: work the wiring-audit defect list (D8 next in fix order),
  pending David's rulings on the rest.

## Completed
- **D8 assessed with live examples (David: "assess D8 first")**: the audit's
  one-liner covered four defects — (1) witnessed phrase re-fired every turn
  (`trackInfluence`'s dedupe boolean discarded at the emission site); (2) the
  ×2/turn was per-target fan-out (Ross + player co-located with John), not a
  double tick; (3) the effect was inert — nothing applied `makes mood/threat`
  to any state, nothing read `influencesInForce` at runtime (`isUnderInfluence`
  / `evaluatePcInfluence` had zero callers); (4) `while present` never expired
  (`expireInfluencesOnDeparture` uncalled). Probe: thealderman Bar, "The room
  gets quieter around John Barber." ×2 every turn forever.
- **D8 design walked through and approved (David: "go")** after two refinement
  rounds he drove: overlay (effective state = base masked/floored by in-force
  records, never written) over transition-apply; and knowing event cardinality
  *before* creation — one exertion result per (influencer, influence) with
  per-target outcomes nested (duplicate witnessed events unrepresentable), plus
  edge-triggered minting (events mark transitions, records mark levels;
  the trackInfluence boolean IS the edge detector).
- **D8 FIXED**: world-model — `InfluenceInForce.status?` field;
  `getEffectiveMood()` (mask, latest-applied wins) / `getEffectiveThreatValue()`
  (floor) / `getEffectiveThreat()`; mood + threat platform predicates switched
  to effective accessors. character — `PassiveInfluenceExertion` result shape;
  `trackInfluence` status option with applied↔resisted flip-in-place counting
  as a transition; `isUnderInfluence` counts applied only;
  `expireInfluencesBySeparation` (location-aware, both homing directions)
  replaces `expireInfluencesOnDeparture`; influence sub-step expires BEFORE
  evaluating so re-entry/momentary recurrence re-transition the turn they
  recur; one `character.influence.applied` per exertion (payload gains
  `targetIds`, keeps singular `targetId`/`targetName` = first new target for
  the lang default template), per-target resisted on its own edge.
- **Mutation-verification run**: one finding — the `character.influence.resisted`
  minting path was never exercised end-to-end (no `resistanceDefs` in the phase
  suite); closed with an integration test (record lands `status: 'resisted'`,
  event minted with ids/messageId on the transitioning turn, no re-mint while
  the resistance holds, resisted overlay never masks). Everything else GREEN.
- **Verification 2026-08-16**: character 428 passing, world-model 1483 passing;
  per-package tsc clean; bundle rebuilt — thealderman 53, b1 15, b3 26,
  Dungeo chain 952, all passing. Live probe: enter Bar → one line, wait/wait →
  silence, leave + re-enter → one line. Fernhill authors no influences (zero
  records → effective ≡ base), not re-run.
- Wiring-audit D8 row updated to FIXED with the four-defect finding and design.

- **D10 assessed (David: "pick one and full assessment with examples") then FIXED
  (David: "go, include the yourself naming fix")**: observeEvent minted every
  perceived event's raw wire type as certain witnessed knowledge — probe showed
  8 "facts" per Bar NPC in 5 commands (7 raw types incl. room.description /
  list.contents), 12/13 junk fact_learned author rows, propagation leak latent
  only behind thealderman's explicit spreads lists, zero consumers repo-wide.
  Fix: deleted the raw mint + its FACT_LEARNED emission (detectActs/witnessActs
  D12a is the one topic factory); player-actor derived topics now use stable
  `the player` (was display-name `yourself` — read as a fact about the listener
  once propagated). 4 pinning tests rewritten, 1 obsolete removed (rule 14),
  observe-substep fixture now carries the real player id. Post-fix probe: same
  5 commands → exactly one topic, `the player harmed`. stdlib 1618, character
  428, story-loader 497; bundle — thealderman 53, b1 15, b3 26, Dungeo chain
  all passing. Rule 15 not fired: no changed function matches the side-effect
  name signal (observeEvent removes a mutation; actorNameOf is pure).

## Key Decisions
- D8 design (David approved the full walkthrough): overlay not transition;
  exertion-shaped evaluator results; edge-triggered minting; separation expiry
  landing together as one coherent change. Threat floors (`max(base, effect)`),
  mood masks (latest-applied wins). Resisted records tracked so the
  applied↔resisted flip is a detectable transition; momentary influences
  re-fire each turn by design (expire → re-track each tick).
- Expired events stay messageId-less: the dormant lang defaults
  (`character.influence.effect.departed`) NOT wired up — no new rendered prose
  in this change; flagged as a follow-up design choice.

## Open Items
- David's rulings still pending: ADR-318 AC3 forcing-clause amendment; D11
  crack/drain semantics; D9/D10 go-ahead; whether D7 (and now D8's overlay
  semantics) are ADR-worthy.
- Phase 7 remaining: IDE author-channel polish; `tsf build --npm` leg (blocked
  on the docs/work U+0001 ruling).
- Carried: stale plans (adr-280-chord-writer-project-model, live-derived-state);
  23 stranded event logs; ADR-location split.

## Files Modified
- `packages/world-model/src/traits/character-model/character-vocabulary.ts`
- `packages/world-model/src/traits/character-model/characterModelTrait.ts`
- `packages/character/src/influence/influence-types.ts`
- `packages/character/src/influence/influence-evaluator.ts`
- `packages/character/src/influence/influence-duration.ts`
- `packages/character/src/influence/index.ts`, `packages/character/src/index.ts`
- `packages/character/src/tick-phases.ts`
- `packages/character/tests/influence/influence.test.ts` (reshaped + flip/separation)
- `packages/character/tests/tick-phases/character-model-phase.test.ts` (+4 D8 describe)
- `packages/world-model/tests/unit/traits/character-model.test.ts` (+4 overlay describe)
- `docs/work/adr-310/wiring-audit.md` (D8 row → FIXED)
- this session file (NEW)

## Notes
- Session db7388, started ~01:00 CDT after /clear; pre-session audit clean
  (carried backlog only).
