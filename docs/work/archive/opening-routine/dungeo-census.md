# The Dungeo census for the opening routine (ADR-404, AC-11)

Taken 2026-11-18 (session 70211a) on `main` at 59e8fbcbe with the Phase 4 changes uncommitted, after `./repokit build dungeo` (exit 0). The comparison runs below were made on the phase's first build (bundle 5397434 bytes); the chain was run again on the final build (bundle 5397548 bytes, after the `mutation-verification` fixes) with the same result. Nothing was re-recorded before these runs, and nothing has been re-recorded since.

## The result

**No line differs.** With the transcript runner calling the opening routine before the first command, every Dungeo recording and every Dungeo assertion gives the result it gave without the call. There is no line to re-record, no turn number moved, and no seeded outcome moved.

## What was run

| Run | Command | Result |
|---|---|---|
| The walkthrough chain | `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` | 949 passed, 0 failures, 17 transcripts, "All tests passed!"; each of the 17 goldens "matched recording" |
| The unit transcripts at one seed, both ways | `node dist/cli/sharpee.js --test --seed 42 stories/dungeo/tests/transcripts/*.transcript`, on the changed bundle and on a copy of it whose runner does not open the game | 1715 passed, 10 failed, 10 expected failures, 2 skipped, 2 transcript errors, on both; the two outputs are identical once the timings are masked (`diff`, 0 lines) |
| The 13 unit transcripts that pin their own seed, both ways | the same two bundles, with no `--seed`, on `carousel`, `combat-disengagement`, `cyclops-magic-word`, `force-forest-ambience`, `force-villain-killed`, `maze-navigation`, `save-restore-basic`, `troll-combat`, `troll-blocking`, `troll-interactions`, `troll-visibility`, `troll-talking` and `troll-recovery` | 3 failed on both; the two outputs are identical once the timings are masked (`diff`, 0 lines) |

The comparison copy was `dist/cli/sharpee.js` with `openNewGame` made to return at once, so the runner behaved as it did before the phase; it was made for these two runs and removed after them. The unit transcripts are run at `--seed 42` for the comparison because most of them pin no seed and a clock seed differs from run to run. The two transcript errors in that run are the two golden transcripts that pin a seed of their own and refuse another, which is why the 13 pinned ones were run again at their pins.

## Why nothing moved

- **The banner and the prologue were never in a command's reply.** They travel on their own channels (ADR-300), a golden records a command's composed prose, and no Dungeo transcript declares the `banner` or `prologue` channel. The plan expected the banner to leave the first command's reply; it was not there to leave.
- **The opening's look costs no turn**, so every command runs at the turn number it ran at before: the chain's turn-keyed lines (the lamp, the thief, the fuses) match their recordings.
- **No seeded draw shifted.** The chain's combat lines match at the pinned seed with the opening's look run ahead of them, so the look draws from no stream the chain reads later. This closes the question Phase 2 carried here (census section 9, "Seeded streams").
- **The first room is marked visited by the opening's look**, as it was by a transcript's own first `look` or first move, and no recording shows a difference from it.

## Failures that are not from this change

The unit transcripts fail the same lines with and without the opening call. They are listed so nobody reads them as this phase's:

- At `--seed 42`, 10 failed lines in 4 transcripts: `adr-287-fenced-literals` (`open mailbox`, the expected text says "Inside the small mailbox you see leaflet."), `dam-puzzle` (`press yellow`, `turn bolt`), `flooding` (`press blue`, three `wait`, `press blue`), and `troll-interactions` (`attack troll`, `kill troll`, "No event matching game.message"). The first three pin no seed, so each of their runs is at whatever seed it is given.
- At their own pins, 3 failed lines in 2 transcripts: `force-villain-killed` (`west`, "output diverged from the recording") and `troll-interactions` (the same two lines as above).

None was changed, and none is re-recorded here.

## David's review

The plan stops Phase 4 for a review of this census before any line is re-recorded. There was no line to re-record, so the review was of the finding itself: that the Dungeo floor did not move. David accepted it on 2026-11-18 ("a"), and Phase 4 closed with nothing re-recorded.
