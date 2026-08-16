# Session Summary: 2026-08-15/16 (overnight) - feat/adr-310-318-implementation

## Status: COMPLETE

## Goals
- Continue Phase 7 (acceptance closure): G5 composition tests, then 318-AC3 legs, G6/G7
  measurement passes, IDE author-channel polish, `tsf build --npm` regression.

## Completed
- **G5 / 318-AC2 ordering flip CLOSED**: two `it`s in `arbiter.test.ts`'s B2 describe —
  same public demand to confess, audience present, duty (`answers honestly`) for vs honor
  (`admits fault`) against at the shared 0.7 baseline; `honor over duty` → refuse
  (brazen-out, obligation defeat deposited), `duty over honor` → comply (public
  confession, no deposit).
- **G5 / 318-AC4 third-NPC composition CLOSED**: new
  `character/tests/tick-phases/face-act-propagation.test.ts` — observe → propagation →
  selection with all real pieces (thief steals from the player before the Witness; third
  NPC two rooms away; Witness relocates; propagation carries the topic; the same ASK
  flips from unknown-topic to the gated authored line). Both legs: scene alias (D12a) and
  derived topic name. Assertions on received-fact trait state + told-record + selection.
- **G5a / 310-AC5 CLOSED (David's "Proceed")**: the fifth real defect of the closure
  pass — `transferFact` never read `factBeliefs`, so the belief *value* never traveled
  (AC5's named failure mode: a token, not a claim). Fix landed in
  `packages/character/src/propagation/fact-transfer.ts`: the speaker's held value rides
  the transfer at the receives-downgraded confidence (`believes`/`suspects`),
  `source: 'told'`, transfer turn, `resistance: 'none'`; a held listener belief is never
  displaced (belief revision = D14 resistance territory); beliefless speakers move the
  token only. 5 new tests in `propagation.test.ts` ("310-AC5" describe) through the real
  pipeline + B's dialogue via the claims surface (honest repeat mints nothing; claiming
  against the received value mints a pinned lie). Mutation-verification clean (all five
  GREEN, assertions on factBeliefs/ledger/pressure trait state).
- Verification 2026-08-15: character 414 passing (was 405 at session start);
  per-package tsc clean.
- Audit + gap-closure-design updated (AC2/AC4/AC5 rows DISCHARGED; G5/G5a CLOSED).

## Key Decisions
- **G5a fix approved by David** ("Proceed" after the finding was presented): platform
  change in packages/character, design + rejected alternatives recorded in
  `docs/work/adr-310/gap-closure-design.md` G5a.

- **Wiring audit written** (David: "Proceed with audit") at
  `docs/work/adr-310/wiring-audit.md`: every ADR-310/318 seam classified
  (LIVE/INERT/UNREACHABLE/ORPHAN/BUILDER-ONLY) with file:line or bundle-probe
  evidence. Headline: the turn plumbing and render chain are LIVE (proved by probe —
  influence phrases render); the goal execution layer is the big hole — NO goal step
  mutates the world (seek/move/acquire/give/drop all compute-and-discard, D6).
  Six open defects consolidated D6-D11: goal inertness, surplus phrase delivery,
  influence re-fire spam, interceptor attribution loss, raw-event-type knowledge
  topics, crack-without-drain (drainPressure orphaned). Fixed-this-pass renumbered
  D1-D5. b3-conscience fixture (NEW, `stories/character-acceptance/chord/`) built and
  probed: burdened flip exact, crack fires; seek-out leg blocked on D6.

- **D6 FIXED (David: "Just do D6 stop and reassess")**: goal steps now act on the
  world — `StepMutation` intent on `StepResult` (move/take/give/drop), applied by
  `applyStepMutation` in `executeNpcGoals`; evaluator pure; unheld give/drop block
  loudly; failed application = no advance, no announcement. 7 new tests on
  `world.getLocation` through the real tick (character 421 passing);
  mutation-verification GREEN; per-package tsc clean. Bundle rebuilt; composed proof
  live: b3 Steward climbs to breaking, D16 window lapses, he seeks the player into
  the Hall and confesses (existing ADR-097 render path, zero new rendering code).
  Regression: b1 fixtures 15, thealderman 53, Dungeo chain 952 — all passing.
  thealderman's John/Chelsea goals now genuinely execute (behavior differs under the
  hood; asserted lines unchanged).

- **318-AC3 legs CLOSED (2026-08-16, David: "do just the unblocked legs")**: three
  new transcripts on the b3 fixture — `b3-strained-voice` (band-gated phrasebook flips
  exactly at the crossing deposit, negative control one deposit earlier),
  `b3-breaking-crack` (deflect below the band at 0 AND burdened; crack on the first
  ask after 70), `b3-seek-out` (goal active at breaking suppressed through continued
  asks + 4-turn window, then the Steward seeks the player into the Hall and confesses
  there). 26 steps, all passing via the bundle at seed 42, first run. AC3 audit row
  DISCHARGED except the forcing-clause wording (ADR amendment, David's ruling).

- **G6 + G7 measurement passes DISCHARGED (2026-08-16)**: Dungeo chain byte-identical
  vs cold-built main (5,509 filtered verbose lines); Fernhill byte-identical at seed
  42 (cards + --exec prose); cloak-of-darkness IR byte-identical same-source through
  both compilers; thealderman suspect normative line counts 0–3 vs the ≤6 ceiling.
  `./repokit verify` blocked at the ADR-289 control-byte gate (analyzer NUL — since
  fixed with D7; docs/work U+0001 still present) — npm leg still owed.
- **D7 FIXED (David's ruling: only-match, compiler-enforced)**: `analysis.phrase-overlap`
  pass — topic-arm conditional lines must be provably pairwise exclusive (witness
  prover in `chord/src/condition-disjoint.ts`: mood/band/threat/owner-state axes,
  feels words, story phases, negation flips, numeric ranges, and/or composition);
  one unconditional default, required last; deliberate variety = `or`-variants in one
  phrase. Runtime drops surplus `chord.phrase` events (rogue-IR backstop). The raw
  NUL in analyzer.ts:3492 escaped to \u0000 en route (it was binary-classifying the
  file for grep). 12 new chord tests; chord 848, story-loader 497, tsc clean; bundle
  rebuilt — b3 26 (crack pinned no-deflect), b1 15, thealderman 53 (Viola's
  confession pinned no-deflect), Dungeo 952.

## Open Items
- David's rulings pending: ADR-318 AC3 forcing-clause amendment; D11 crack/drain
  semantics; D8/D9/D10 fix go-ahead (audit §7/§9). D7 ruling may be ADR-worthy
  (only-match topic arms — a durable language semantics decision).
- `tsf build --npm` leg: rerun `./repokit verify` once the docs/work U+0001 byte is
  ruled on (delete/escape — it's in an old history-retrospective artifact).
- Phase 7 remaining: IDE author-channel polish; the `tsf build --npm` leg (above).
- Carried: stale plans (adr-280-chord-writer-project-model, live-derived-state)
  undispositioned; 23 stranded event logs; ADR-location split.

## Files Modified
- `packages/character/src/propagation/fact-transfer.ts` (G5a belief-value leg)
- `packages/character/tests/arbiter/arbiter.test.ts` (+2 tests)
- `packages/character/tests/tick-phases/face-act-propagation.test.ts` (NEW, 2 tests)
- `packages/character/tests/propagation/propagation.test.ts` (+5 tests, AC5 describe)
- `docs/work/adr-310/gap-closure-design.md` (G5 + G5a CLOSED)
- `docs/work/adr-310/acceptance-audit.md` (AC2/AC4/AC5 rows DISCHARGED, work-list item 5)
- this session file (NEW)

## Notes
- Session 2aea28, started ~22:05 CDT after /clear; pre-session audit clean.
