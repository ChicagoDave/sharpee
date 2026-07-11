# Dungeo Full Sweep — Assessment (2026-07-10)

**Commit under test:** `ac69118a` (branch `v2-210-chord-a`) — includes the
Phase 6 platform changes (going.ts blocked-exit reorder, wearing/taking_off
grammar, still_worn message) and the Chord formatting work.
**Method:** full unit-transcript suite once, full walkthrough chain three
consecutive times, all via `node dist/cli/sharpee.js --test` (bundle).

## Verdict

**Unit suite: healthy and deterministic — green.** The walkthrough chain is
**functionally complete but nondeterministic**: 1 of 3 runs green
(consistent with the standing one-good-run policy). Every chain failure
traces to unseeded RNG plus chain-state coupling, not to broken game logic —
the same commands succeed on other runs. The platform changes from this
branch introduced **zero** dungeo regressions (the unit suite proves it;
the green chain run confirms end-to-end).

## Results

| Run | Result | Notes |
|---|---|---|
| Unit suite (107 transcripts) | **1698 passed, 0 failed**, 9 expected failures, 4 skipped | deterministic across runs |
| Walkthrough chain run 1 (17 files) | 10182 passed, **1080 failed** | troll-combat RNG in wt-01 poisons the chain |
| Walkthrough chain run 2 | **909 passed, 0 failed** ✓ | the good run (test count varies with WHILE retries) |
| Walkthrough chain run 3 | 10608 passed, **379 failed** | darkness cascade from wt-12 onward |

Logs: scratchpad `dungeo-unit.log`, `dungeo-chain-{1,2,3}.log` (session-local).

### Unit-suite bookkeeping (all intentional)

- **Expected failures (9):** `cyclops-magic-word` ×2 (north blocked before
  "odysseus" — deliberate negative assertions), `grue-mechanics` ×3 (dark
  movement refusals), `implicit-take-put` ×2, `troll-blocking` ×1,
  `troll-interactions` ×1.
- **Skipped (4):** in `combat-disengagement`, `grue-death-simple`,
  `grue-mechanics` (commands inside WHILE loops marked `[SKIP]`).

## Flake anatomy (why 2 of 3 chain runs fail)

The chain shares one game state across all 17 files, so a single RNG
misfortune propagates to everything downstream. Three distinct mechanisms
were observed in this sweep:

1. **Troll combat (run 1, wt-01).** Six `attack troll with sword` commands
   did not kill the troll (he disarmed the player instead — combat outcomes
   draw on unseeded `Math.random`). Every subsequent movement through the
   Troll Room fails ("The troll blocks your way"), and wt-03/04/07/15/16/17
   inherit the poisoned state (236 failures in exorcism alone). The
   walkthrough convention "6 attacks is usually sufficient" is a
   probabilistic patch, not a guarantee.

2. **Turn-count variance → lantern timer → darkness (run 3, wt-12).**
   WHILE-loop retries (carousel, Low Room, thief) consume a variable number
   of turns per run. The brass lantern's battery is turn-based, so a
   retry-heavy run reaches wt-12 with a dead lantern: "It is pitch dark"
   replaces room descriptions and navigation assertions fail from there
   (wt-12/14/15/16/17 in run 3).

3. **Thief fight grind (both flaky runs, wt-13).** The thief-fight WHILE
   loop ran ~10,000 iterations before giving up with 129–171 residual
   failures. Even the green run's totals move (909 vs 872 in an earlier
   green run today) because loop iteration counts are themselves random.

Documented-but-unhit this sweep: the Round Room / Low Room carousel uses
raw `Math.random()` (`carousel-handler.ts`, noted in the story CLAUDE.md as
not replay-deterministic).

## Assessment

- **Game logic:** complete and correct along the golden path — the green
  run traverses all 17 walkthroughs, 909 assertions, including the endgame.
- **Determinism debt:** all randomness (combat, thief, carousel) draws on
  raw `Math.random`, while the platform ships `SeededRandom`
  (`@sharpee/core`) and the Chord runtime already proves the pattern
  (AC-5: byte-identical seeded runs, RNG cursor persisted in world state —
  save/restore/undo-safe). Dungeo predates it.
- **Chain fragility multiplier:** state sharing means flake probability
  compounds across 17 files; a per-file failure rate of a few percent
  yields the observed ~2/3 run failure rate.

## Recommendations (in value order)

**Policy (David, 2026-07-11): story randomness is never seeded or turned
off. Flakiness is handled with transcript-level logic gates.** All
recommendations below are transcript-level accordingly.

1. **Gate the probabilistic combat with logic:** replace fixed "6 attacks"
   with `[WHILE: entity "troll" alive] > attack troll with sword [SKIP]
   [END WHILE]` (the harness supports it; the `[ENSURES: not entity alive]`
   postcondition already exists) — removes mechanism 1 entirely.
2. **Checkpoint the chain per file** (a `$save` at each walkthrough
   boundary already exists as a mechanism): on a transcript failure,
   restore the last checkpoint instead of letting poisoned state cascade —
   turns a 1080-failure run into a handful of localized ones and makes the
   real failure visible.
3. **Insulate the lantern from turn variance** in walkthroughs (pick up the
   torch earlier / switch off the lantern during retry loops, or gate the
   dark stretches with `[IF]`/`[NAVIGATE TO]` recovery).

Items 1 + 3 are cheap transcript edits that would likely take the chain to
green-most-runs; the one-good-run rule remains the standing evaluation
policy.
