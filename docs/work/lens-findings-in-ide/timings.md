# Examinable lens timings — Phase 1 (2026-11-23, session c68c7b)

These are the spike lens's measurements (`tools/explorer-probe/lens-examinable.js --json`) at its default budgets: seed 1209, 5000 states, 120 s, depth 40. Each story was composed first with `./sharpee compose <story> -o <dir>/dist/<stem>.ir.json`. The script that ran them was a scratchpad file, `lens-timings.sh`, outside the repository.

- **walkMs** is the lens's own walk time, which includes every `examine` it types.
- **wall** is the whole process in whole seconds, from `date +%s`.
- **Finding rows** counts every class except resolved-described.

## Test stories (ADR-395: the floor)

| Story | walkMs | Stop reason | Rooms | States | Phrases typed | Finding rows | Counts |
|---|---|---|---|---|---|---|---|
| lodge | 118 | all-rooms-reached | 5 of 5 | 22 | 60 | 30 | not-in-scope 24, described 6, number-form 6 |
| bazaar | 31 | frontier-exhausted | 2 of 3 | 2 | 28 | 14 | not-in-scope 13, described 1, number-form 1 |
| ferry | 48 | frontier-exhausted | 3 of 4 | 5 | 38 | 18 | not-in-scope 16, described 3, number-form 2 |
| orchard | 86 | all-rooms-reached | 5 of 5 | 5 | 92 | 46 | not-in-scope 40, described 6, number-form 6 |
| quay | 6 | all-rooms-reached | 2 of 2 | 2 | 24 | 12 | not-in-scope 11, described 1, number-form 1 |
| scullery | 17 | all-rooms-reached | 2 of 2 | 2 | 42 | 23 | not-in-scope 18, described 3, number-form 4, resolved-default 1 |

Every test story finishes in under a second of wall time. Orchard's row matches its pin (92 forms, 40 / 6 / 6), but that pin is at seed 42 and 600 states, so the room and finding counts agree only because orchard stops when all its rooms are reached. Bazaar and ferry stop with their frontier exhausted, short of their declared rooms. The walk can't open whatever guards the rest, and the report says so, as ADR-294 D23's soundness line requires.

## Real Chord stories (on demand, outside any gate: ADR-395's 2026-11-12 note)

| Story | walkMs | Stop reason | Rooms | States | Phrases typed | Finding rows | Counts |
|---|---|---|---|---|---|---|---|
| cloak-of-darkness | 38 | all-rooms-reached | 3 of 3 | 3 | 58 | 30 | not-in-scope 26, described 3, number-form 4 |
| thealderman | 199 | all-rooms-reached | 8 of 8 | 8 | 196 | 98 | not-in-scope 90, described 6, number-form 8 |
| ides-of-march | 799 | all-rooms-reached | 5 of 5 | 71 | 202 | 100 | not-in-scope 78, described 21, number-form 21, ambiguous 1 |
| relighting (part-8) | 405 | frontier-exhausted | 6 of 13 | 6 | 266 | 132 | not-in-scope 116, described 17, number-form 16 |
| friendly-zoo | 120,000 | max-seconds | 5 of 8 | 3,454 | 272 | 131 | not-in-scope 113, described 21, number-form 17, ambiguous 1 |
| fernhill | 120,000 | max-seconds | 12 of 13 | 3,049 | 551 | 274 | not-in-scope 225, described 52, number-form 49 |
| secret-letter | 120,747 | max-seconds | 16 of 92 | 36 | 1,951 | 771 | not-in-scope 519, described 454, number-form 240, ambiguous 12 |

## Phase 2: the packaged lens (2026-11-23, session c68c7b)

Run as `node packages/devkit/dist/cli.js lens examinable <story> --json` at the defaults (seed 1209, 120 s).

**First, on the shared walk with no necessary set** (ADR-408 D3 as accepted), on the three stories that spent the spike's whole budget:

| Story | walkMs | Stop reason | Rooms | States | Phrases typed |
|---|---|---|---|---|---|
| fernhill | 80,466 | max-states | 9 of 13 | 5,000 | 427 |
| friendly-zoo | 101,201 | max-states | 7 of 8 | 5,000 | 346 |
| secret-letter | 120,006 | max-seconds | 12 of 92 | 130 | 1,389 |

Fernhill filled the state budget on combinations near the start, as the plan review warned (ADR-365 D2, D12). That was the blind search ADR-294 D23 retired, so David ruled routes instead (ADR-408 Amendment 1).

**Then by route** (Amendment 1): the shortest route to each room over the exits open at the start, typed in a fork of the real engine.

| Story | ms | Rooms | Moves typed | Phrases typed | Finding rows | Not reached, and why |
|---|---|---|---|---|---|---|
| lodge | 72 | 3 of 5 | 3 | 44 | 22 | Study, Vault: guarded until the player deals with the warden, the valve |
| bazaar | 56 | 2 of 3 | 1 | 28 | 14 | Back Lane: nothing reachable lifts the exit's condition |
| ferry | 58 | 2 of 4 | 1 | 28 | 13 | Deck: guarded; Far Bank: beyond it |
| orchard | 130 | 5 of 5 | 8 | 92 | 46 | none; findings match the pin exactly |
| quay | 52 | 2 of 2 | 1 | 24 | 12 | none |
| scullery | 64 | 2 of 2 | 1 | 42 | 23 | none; findings match the pin exactly |
| fernhill | 554 | 9 of 13 | 26 | 427 | 212 | four rooms behind guarded or locked ways |
| friendly-zoo | 342 | 5 of 8 | 8 | 272 | 131 | Supply Room guarded; two beyond it |
| secret-letter | 12,643 | 18 of 92 | 42 | 2,119 | 843 | 74: most lie beyond Commerce Street (guarded); Behind Fruit Stall's route did not arrive |

**The `sharpee test` tier's budget is 30 s** (ADR-408 D8, David's ruling "b", 2026-11-23): more than twice Secret Letter's time by route. That was 12,643 ms in the JSON run tabled above, and 12.8 s in a later console run of the same story after the unreached reasons were reworded.

By route, the largest story finishes in under 13 s and reaches more rooms than either walk did (18 of 92, against the spike's 16 and the packaged walk's 12). The price is puzzles. A room behind a lock or a guard is reported unreached, naming what opening it takes, where the walk sometimes got through by trying actions (lodge 5 of 5 on the spike; ferry 3 of 4).

## What the numbers say

1. **The lens is cheap where the walk stops on all rooms or an exhausted frontier.** That covers all six test stories and four of the seven real ones, every one under a second.
2. **Three stories spend the whole 120 s, for two different reasons.**
   - friendly-zoo and fernhill spend it on state space. Over 3,000 states each still leave rooms unreached (5 of 8, 12 of 13), because the walk explores world states as well as room discovery.
   - secret-letter spends it on typing. 36 states and 1,951 forms reach 16 of 92 rooms, at roughly 16 forms per second.
   - So a budget that stops on rooms reached still can't promise every room in a large story at any budget a Run could carry.
3. **Consequences for the trigger and for D-7(i):**
   - **Riding `sharpee test` at default budgets** would add up to two minutes to every Run on a large story. That is acceptable only with a budget well under the default, or with the lens tier off unless asked for.
   - **A background run after each build**, as world-index does, costs nothing in the author's foreground. On a large story its result would arrive up to two minutes after the build.
   - **On demand** costs nothing until asked.
4. **The re-timing Phase 2 owes** (on the packaged walk, which has no necessary set) should use a story that ends at max-seconds. No test story does, which is itself a finding for ADR-395: the floor has no story that exhausts the lens's budget.
