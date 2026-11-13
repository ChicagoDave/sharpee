# Survey: where a `sharpee test` run spends its time

Measured 2026-11-12 (session e4b2c8) with `scripts/perf/survey-test-run.mjs`, an on-demand
instrument outside every gate. Each command below was run once, one at a time, on the
build of that morning (`./repokit build dungeo`, Phase 1's changes in the tree). Times are
one machine's and are not asserted anywhere.

## The ranked table

Shares are of Secret Letter's whole run (257 s), the story where the time is. Fernhill's
whole run is 5.5 s and is listed beside it.

| # | Cost | Secret Letter | Fernhill | Grows with story size? | Fix size | Platform files a fix touches | Phase |
|---|---|---|---|---|---|---|---|
| 1 | Prefix replay in the tree tier: 19,667 replayed commands against 1,468 authored | about 118 s, 46% | 137 replayed against 84 authored; about 0.2 s, 4% | Yes, with lines times depth | Medium | `packages/branch-tester/src/tree-walker.ts` | 4 |
| 2 | The story is compiled again for every boot: 1,373 compiles in the run, 95 ms each | about 90 s, 35% (81.5 s inside the derived tier's instrumented run) | 51 compiles at 6 ms, 0.3 s, 6% | Yes, compile time times boots | Small | `packages/devkit/src/standalone/author-game.ts` | not in the plan as its own item; nearest is 5 |
| 3 | The undo snapshot, taken every turn: 28.6% of a turn | about 36 s, 14% | 16% of a turn; about 0.3 s | Yes, with world size (788 KB serialized) | Small | `packages/bootstrap/src/index.ts`, the three runners | 3 |
| 4 | The player-role scan: 479 scans a turn, each over all 480 entities, 28.8% of a turn | about 36 s, 14% | 96 scans a turn, 2.9% of a turn | Yes, roughly with entities squared | Small to medium | `packages/world-model/src/world/WorldModel.ts`, `if-entity.ts` | 3 |
| 5 | A boot per derived row: 1,267 boots at 22 ms, compile excluded | about 28 s, 11% | 40 boots at 4 ms, 0.15 s | Yes, rows times boot | Medium | `packages/branch-tester/src/derived-runner.ts` | 5 |
| 6 | The walk step: 3.3 world serializations, a save and 1.3 restores for each command walked | no claims fragment is selected, so 0 | claims tier 4.5 s of 5.5 s, 82% | Yes, with states times world size | Medium | `packages/branch-tester/src/claims/` | 6 |
| 7 | `deriveNameVocabulary`, and the per-candidate lookup in command-validator | not separated by this instrument (6.3% of a turn in the 2026-11-12 scratch profile) | not separated | Unknown | Small | `name-vocabulary.ts`, `command-validator.ts` | 3, item 3 |

Rows 3 and 4 overlap row 1: both are shares of turn time, and 93% of Secret Letter's tree
turns are replay. Once forks restore, the turns left are about 2,400, so rows 3 and 4 are
then worth about 4 s each on this story, not 36.

**What the table says about order.** Row 2 is the largest cost for the smallest change and
no phase names it: `loadAuthorGame` calls `loadChordStory`, which compiles the story file on
every call, and every tree line, derived row and walk boots through it. It also explains the
80 ms derived row: 95 ms of compile and 22 ms of boot for each row that boots, against a
40 ms estimate that counted the boot alone. Recommended: do it first, as its own small
phase or as the first item of Phase 5. Row 7 is not worth touching until row 4 lands and
the turn is measured again.

## Whole runs by tier

`node scripts/perf/survey-test-run.mjs --run <story>`

| Story | Wall | Start | Tree | Derived | Claims | Lines | Authored / replayed commands | Derived rows | ms a row |
|---|---|---|---|---|---|---|---|---|---|
| secret-letter | 257.3 s | 0.19 s | 127.0 s | 130.1 s | none selected | 106 | 1,468 / 19,667 (deepest prefix 796) | 1,737 (947 passed, 778 skipped, 12 failed) | 74.9 |
| fernhill | 5.49 s | 0.22 s | 0.44 s | 0.35 s | 4.49 s | 11 | 84 / 137 | 63 (36 passed, 27 skipped) | 5.5 |
| orchard | 0.38 s | 0.18 s | 0.11 s | 0.09 s | none | 4 | 20 / 45 | 20 | 4.5 |
| lodge | 0.49 s | 0.21 s | 0.04 s | 0.03 s | 0.22 s | 1 | 9 / 0 | 7 | 4.1 |
| ferry | 0.31 s | 0.19 s | 0.05 s | 0.02 s | 0.06 s | 2 | 9 / 5 | 3 | 5.7 |

- Secret Letter's run exits 1: 12 derived rows and some tree lines fail. The story is on hold
  as port work; it is measured here, not judged.
- Fernhill's claims tier was 1.2 s before Phase 1 and is 4.5 s after it: the identity by
  exclusion finds more states (ADR-365, the 2026-11-12 note).
- Dungeo has no test tree. Its walkthrough chain,
  `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`,
  took 9.2 s for 949 passing assertions.
- bazaar has no test tree, so `sharpee test` exits 2 on it and its baseline digest is empty.
  Its claims run only from branch-tester's own suite.

## Primitives

`node scripts/perf/survey-test-run.mjs --primitives <story>` (medians of 5 compiles and
boots and of 15 saves; the turn is the longest tree line replayed once)

| | secret-letter | fernhill | orchard |
|---|---|---|---|
| Entities | 480 | 66 | 19 |
| Compile | 95.2 ms | 6.1 ms | 2.3 ms |
| Boot, compile included | 119.2 ms | 9.6 ms | 5.7 ms |
| A turn | 5.69 ms over 808 turns | 1.59 ms over 32 | 1.65 ms over 16 |
| Undo snapshot's share of a turn | 28.6% | 16.4% | 4.1% |
| Player-role scans a turn, and their share | 479, 28.8% | 96, 2.9% | not run after the scan timer was added |
| Save / restore | 11.1 ms (92 KB) / 3.6 ms | 1.35 ms / 0.47 ms | 0.55 ms / 0.15 ms |
| World serialize / parse | 2.1 ms (788 KB) / 1.1 ms | 0.27 ms / 0.14 ms | 0.04 ms / 0.04 ms |

A turn by kind on Secret Letter: look and examine 6.07 ms (241 turns), movement 4.36 ms
(312), manipulation 9.21 ms (115), refused or unparsed 8.88 ms (95), meta 3.10 ms (45). The
kind is read from the turn's result first and the command's first word second.

## Counts

`node scripts/perf/survey-test-run.mjs --counts <story>` (an instrumented run in one
process; its times are inflated by the wrappers, above all the trait-check counter, so
only its counts and ratios are used)

| | secret-letter tree | secret-letter derived | fernhill tree | fernhill derived | fernhill claims |
|---|---|---|---|---|---|
| Boots | 106 | 1,267 | 11 | 40 | 4 |
| Compiles | 106 | 1,267 | 11 | 40 | 4 |
| Turns | 21,136 | 958 | 222 | 35 | 1,308 |
| World serializations a turn | 0.75 | 0.97 | 1.31 | 0.97 | 3.34 |
| Undo snapshots | 15,883 | 930 | 206 | 34 | 1,304 |
| Player-role scans a turn | 487 | 742 | 101 | 161 | 123 |
| Trait checks a turn | 308,476 | 624,670 | 9,333 | 17,895 | 9,922 |
| Saves / restores | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 455 / 1,697 |

- **Compiles per run**: one for each boot, plus two or three before the tiers start.
- **Derived rows on Secret Letter**: 1,737 rows; 1,267 boot; 958 run a command; 778 are
  skipped; 146 of the commands are read-only by their verb (look, examine, read and the
  like), which is an estimate from the verb and not from the outcome.
- **The player-role scan's callers**: `playerCharacter` and `hasPlayerCharacter` are read at
  29 places in `packages/story-loader/src`, 23 in `packages/stdlib/src`, 22 in
  `packages/engine/src`, 10 in `packages/world-model/src` and 1 in `packages/bootstrap/src`.
  Every read walks every entity.
- **Can anything type `undo`?** No tree card on any story measured types it, no derived
  row's command is it, and no turn run in any tier of any story was it (0 of 21,136, 958,
  222, 35 and 1,308). The walk's candidate generator emits exits and verbs on entities
  only. So a runner can decide from the commands it is about to run, and today every
  engine a test run boots could run with no undo snapshot.

## Equivalence: a restored world against a replayed one

`node scripts/perf/survey-test-run.mjs --equivalence <story>`. At each fork one game
replays the prefix from a fresh boot; another plays the prefix, saves, plays on up to 25
turns, and is restored. The worlds are compared, then the branch's next turns (up to 25)
are played on both and their event types and message ids compared, then the worlds again.

| Story | Forks | Equivalent | Different |
|---|---|---|---|
| ferry | 1 | 1 | 0 |
| orchard | 3 | 3 | 0 |
| lodge, bazaar | 0 | n/a | n/a |
| fernhill | 10 | 10 | 0 |
| secret-letter | 105 | 101 | 4 |

Left out of the comparison, each for a stated reason: every `timestamp` field (the wall
clock); every capability's `schema` (shape, not state); and the `commandHistory` capability
whole, because of GH #689: every world in a process shares one history array until a
restore gives a world its own, so a freshly booted game already holds the commands of the
games booted before it. That is a defect in the replayed side, found by this mode.

**The four forks that differ, all on Secret Letter.** At each, the two worlds are the same
at the moment of the restore and come apart during the turns after it:

| Line | Prefix | What differs, and when |
|---|---|---|
| `oq73o01x` | 3 | after 25 turns, `chord.rng` |
| `ozqxlw3l` | 3 | after 16 turns, `chord.rng`, the `teisha` every-turn clause's firing counter (1 against 2) and `textState` `teisha-atmosphere` (1 against 2) |
| `cqigz7ic` | 127 | after 8 turns, `textState` `jeweler's-shop/pieter-at-his-post` (1 against 2) |
| `irrp8zkt` | 641 | after 4 turns, `textState` `royal-tunic/clothier-waiting-to-serve` (absent against 1) |

In every case the events of the turns compared were the same; only these counters and the
random cursor moved differently. So something a turn reads is not in the save: the worlds
match, and then behave differently. This is the save gap Phase 4's Entry state names, and
by that Entry state Phase 4 stops for David's ruling (fix the save, or drop restore). It is
not yet known which in-memory state is missing; the random stream's live state and the
prose pipeline's counters are the two places to look first.

### Diagnosed and corrected (2026-11-12, session a64f6a)

The table above is as first measured, and two of its four differences were this mode's
own artifact. What the four forks were:

- `oq73o01x`, `ozqxlw3l`: a real save gap. A save taken before the story's first random
  draw carries no `chord.rng`; `drawChance` and `pickIndex` in
  `packages/story-loader/src/evaluator.ts` reloaded the cursor only when the world held
  one, so the restored game carried on from the in-memory stream the abandoned turns had
  moved. Fixed: no stored cursor now means the story seed.
- `cqigz7ic`, `irrp8zkt`: not a save gap. This mode stepped two live games side by side,
  and the description-marker gates are one process-wide registry where the last game
  booted wins (GH #691). The replayed game's gates read the restored game's world one
  turn behind, and it dropped a gated sentence from a room description. The replayed
  side was the wrong one.

The mode now plays the two games of a fork one after the other, and compares the rendered
blocks of every turn as well as the world. The first version compared event types and
message ids only, which cannot see a difference in prose. A block's `timestamp` is left
out as a wall-clock reading.

With the fix built, each run once on 2026-11-12:

| Command | Forks | Equivalent | Different |
|---|---|---|---|
| `node scripts/perf/survey-test-run.mjs --equivalence branch-stories/secret-letter` | 105 | 105 | 0 |
| `node scripts/perf/survey-test-run.mjs --equivalence test-stories/orchard` | 3 | 3 | 0 |
| `node scripts/perf/survey-test-run.mjs --equivalence test-stories/ferry` | 1 | 1 | 0 |

Fernhill was not re-run.

## The baseline digests

`node scripts/perf/survey-test-run.mjs --run <story> --digest <file>` writes every run
event minus its sequence number, clocks and durations. Committed under
`docs/work/engine-test-performance/baseline/`: `lodge` (31 lines), `ferry` (24), `orchard`
(47), `secret-letter` (3,315) and `bazaar` (empty: no tree). A second run of lodge, ferry
and orchard the same morning wrote byte-identical digests. Secret Letter's was written
once and not repeated.

## The instrument's own check

`node scripts/perf/survey-test-run.mjs --self-check` runs the boot counter over
`test-stories/ferry` twice, the second time through a loader that boots every game twice.
It printed `"honestBoots": 9, "doubledLoaderBoots": 18, "detected": true` and exited 1,
which is its pass: exit 1 means the doubling was seen, exit 2 would mean the counter is
blind.

## After Phase 3 (the same day, the same commands, each run once)

Phase 3 landed two changes: a test run's engine takes no undo snapshot unless one of its
commands is `undo`, and the player-role lookup reads an index of actors, not every entity.

| | Before | After |
|---|---|---|
| secret-letter whole run | 257.3 s | 183.7 s |
| secret-letter tree tier | 127.0 s | 58.0 s |
| secret-letter derived tier | 130.1 s | 125.5 s |
| secret-letter, a turn (`--primitives`, undo snapshots still on in that mode) | 5.69 ms | 4.28 ms |
| secret-letter, the player-role scan's share of a turn | 28.8% | 3.8% |
| fernhill whole run | 5.49 s | 4.81 s |
| fernhill, the player-role scan's share of a turn | 2.9% | 0.8% |

- Secret Letter's verdict digest after the change is byte-identical to the baseline
  (`diff` printed nothing), as are lodge's, ferry's and orchard's.
- The derived tier barely moved, as the table predicted: its cost is the compile and the
  boot for each row (rows 2 and 5), not its turns.
- The Secret Letter run shared the machine with a read-only review agent for part of its
  time, so its figures are, if anything, high.

## After Phase 4 (2026-11-12, session a64f6a, each run once)

Phase 4 landed one change to the tree tier: a branch line starts from the engine's save,
captured in memory at its fork card and restored on the game its parent ran on. A line
whose own cards type `undo`, and a fork before any command, still boot fresh and replay.

`node scripts/perf/survey-test-run.mjs --run branch-stories/secret-letter --digest <file>`:

| | Baseline | After Phase 3 | After Phase 4 |
|---|---|---|---|
| secret-letter whole run | 257.3 s | 183.7 s | 138.9 s |
| secret-letter tree tier | 127.0 s | 58.0 s | 5.5 s |
| secret-letter derived tier | 130.1 s | 125.5 s | 133.2 s |

`node scripts/perf/survey-test-run.mjs --counts branch-stories/secret-letter`, the tree
tier:

| | Baseline | After Phase 4 |
|---|---|---|
| Boots | 106 | 1 |
| Compiles | 106 | 1 |
| Turns | 21,136 | 1,469 |
| Saves captured | 0 | 54 |
| Restores | 0 | 105 |

- Secret Letter's verdict digest is byte-identical to the baseline (3,315 lines, `diff`
  printed nothing), as are lodge's, ferry's and orchard's.
- 105 restores from 54 saves: one save serves every branch of its fork card. None of
  Secret Letter's 106 lines types `undo`, so none replays.
- The derived tier did not change in this phase; its 133.2 s against 125.5 s is the same
  work on a machine that was also running the branch-tester and devkit test suites.
- The self-check (`--self-check`) now also hands the equivalence mode a save with one
  world state value removed, on ferry. It reports the honest save equivalent and the
  stripped one different, naming the field:
  `/state/chord.occurrence.clause.lever.on-pulling-by-player: replayed 1 / restored undefined`.
