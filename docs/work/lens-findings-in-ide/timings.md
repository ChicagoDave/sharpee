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
