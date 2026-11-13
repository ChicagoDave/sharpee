# Before and after: a whole `sharpee test` run

Measured 2026-11-12 with `scripts/perf/survey-test-run.mjs`, the on-demand instrument,
on the machine the baseline was taken on. "Before" is the Phase 2 baseline in
[`survey.md`](./survey.md), taken that morning (session e4b2c8). "After" is the build made
by `./repokit build dungeo` at the end of Phase 5 (session a8ee8f), each command run once.
Times are one machine's and are asserted nowhere; no timing gate exists or is added
(ADR-395 D8).

## Whole runs by tier

`node scripts/perf/survey-test-run.mjs --run <story>`

| Story | | Whole run | Tree | Derived | Claims |
|---|---|---|---|---|---|
| secret-letter (480 entities, 106 lines, 1,737 derived rows) | before | 257.3 s | 127.0 s | 130.1 s | none selected |
| | after | 14.4 s | 5.3 s | 8.9 s | none selected |
| fernhill (66 entities, 11 lines, 63 derived rows, 10 claims) | before | 5.49 s | 0.44 s | 0.35 s | 4.49 s |
| | after | 3.41 s | 0.19 s | 0.08 s | 2.91 s |

- Secret Letter's run is 17.9 times faster; Fernhill's is 1.6 times faster.
- Secret Letter's after figures are from the run made for Phase 5's Demonstration on this
  same build (`--run branch-stories/secret-letter --digest <file>`); no source changed
  between that run and this file, so it was not run a second time.
- Dungeo has no test tree. Its walkthrough chain,
  `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`,
  took 9.2 s before and 8.7 s after, 949 assertions passing both times.
- Verdicts did not move: the digests of lodge, bazaar, ferry, orchard and Secret Letter
  (3,315 lines) are byte-identical to `baseline/`.

## What each phase bought, on Secret Letter's whole run

| After | Whole run | What changed |
|---|---|---|
| Baseline | 257.3 s | |
| Phase 1 | not timed alone | Claims walk soundness (#687, #688, #587). A correctness phase; it made Fernhill's claims tier slower, 1.2 s to 4.5 s, because the corrected identity finds more states. |
| Phase 3 | 183.7 s | No undo snapshot on an engine that cannot be asked to undo; the player lookup reads an index of actors. |
| Phase 4 | 138.9 s | A branch line starts from the save at its fork card, not from a replay of its prefix. |
| Phase 5 | 14.4 s | A derived suite boots once and restores before each row; the claims walk reads the world once per state. |
| Phase 6 | not built | Dropped by ruling: the compiles and boots the caches were aimed at were already gone. |

## The counts

`node scripts/perf/survey-test-run.mjs --counts <story>`

| | Before | After |
|---|---|---|
| secret-letter tree: boots | 106 | 1 |
| secret-letter tree: turns executed | 21,136 | 1,469 |
| secret-letter tree: undo snapshots | 15,883 | 0 serialized |
| secret-letter derived: boots and compiles | 1,267 each | 1 each |
| secret-letter derived: restores | 0 | 1,267 |
| secret-letter, compiles in the whole run | 1,373 | not counted whole; 1 in each of the tree and derived tiers |
| fernhill derived: boots | 40 | 1 |
| fernhill derived: restores | 0 | 40 |
| fernhill claims: world serializations a turn | 3.34 | 1.35 |
| fernhill claims: turns, saves, restores | 1,308 / 455 / 1,697 | 1,308 / 455 / 1,697 |
| secret-letter, player-role scan's share of a turn | 28.8% | 5.5% (derived tier, instrumented) |

Fernhill's walk reaches the same states by the same commands as before; only what each
state costs changed.

## What remains on the ranked table

- **The claims walk is now the cost on a story that selects claims.** Fernhill: 2.9 s of
  3.4 s. In the instrumented run its 3.0 s splits into turns 0.98 s, restores 0.74 s (two
  for each command walked), saves 0.56 s and world reads 0.40 s. The stored-witness and
  per-cone caches Phase 6 named would remove most of it on an unchanged story; each needs
  an amendment to ADR-365 D2 and ADR-367 first.
- **Secret Letter's 14.4 s** is 5.3 s of tree and 8.9 s of derived. The derived tier is
  restores (3.7 s instrumented, 1.6 s of it parsing the world back) and its 958 turns
  (4.8 s instrumented).
- **The compile inside every boot** (`loadAuthorGame`, table row 2) is still there. A run
  now boots a handful of times, so it is worth under a second on Secret Letter.
- **`deriveNameVocabulary` and the per-candidate lookup in command-validator** (row 7) were
  never separated by the instrument and were not touched.
- **Open issues found on the way**: #689 (worlds in one process share a command history),
  #690 (a story's own word for undo is unseen), #691 (snippet gates are process-wide),
  #692 to #694 (walker coverage gaps and a save's `turnCount`).

## Rulings

David, 2026-11-12 (session a8ee8f), answering "A" to the three put to him:

1. **The branch-testing paradigm stays** (tree, derived and claims tiers).
2. **`scripts/perf/` stays.** It carries no bound, so it is a measurement and not a scale
   check. ADR-395's Consequence "Nothing watches walk speed at scale" carries a note dated
   2026-11-12 saying the on-demand instrument exists and gates nothing.
3. **The claims-walk caches wait.** Filed as GH #695; a 2.9 s walk does not justify
   reopening ADR-365 and ADR-367 now.
