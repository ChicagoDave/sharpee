# Test set: ferry

**Carries**: OB-22 to OB-32, without OB-24 (retired with the `never` claim it pinned; the number is not reused)
**Read by**: `packages/devkit/tests/test-claims.test.ts`, `packages/devkit/tests/claim-broken.test.ts`, `tools/ide/web/testing-surface/tests/claims-real-path.test.ts`
**Seed**: 42

## Obligations

- OB-22: the claims section prints after the derived report, and its ratio line carries the tree's seed; in this story: "4 of 4 held".
- OB-23: lines prove the claims they reach, so only the claims no line reaches are walked, and the walk count and held-by-line count are exact; three held by lines, one walk, the timetable read by no line.
- OB-25: a claim held by a line names the line, its label and the turn, and a lock's row names its card and turn; the lock is held at its card while the claim is reported held by another line; "the lantern is open", reached by the main line at turn 6 and locked on the branch at turn 7.
- OB-26: with and without the manifest's `claims` key, the exit is the same, the tally differs by exactly the held lock's assertion, and the report is the same up to the claims.
- OB-27: after a story edit that breaks a locked claim, an earlier card fails with the story's own output under its cite and the run exits 1; the edit removes the line that docks the ferry.
- OB-28: the lock's card fails on its own row, "not held here", with what is so instead.
- OB-29: the claim is UNPROVEN, not reached by any line, and its walk stopped at a budget; the lock's set holds the biscuit, a hundred bites deep, so the walk stops at its depth limit.
- OB-30: the lock's row names its line, label and turn and reads "NOT held there" with what is so.
- OB-31: after an edit that leaves every card green and puts a claim out of reach, the exit is 0, the ratio counts one unproven, the claim reads UNPROVEN by exhaustion naming its set, and the lock still reads "held there"; the edit moves the timetable to the Far Bank.
- OB-32: the IDE web surface folds the same run's claim results and summary, and its lines are the command's own.

## What the story's parts are for

- The lever and the ferry: the gate the breaking edit breaks.
- The biscuit: a thing whose state changes a hundred times, so a walk whose set holds it cannot be exhausted. The walk tells states apart by where things are, their declared states, and a few traits' own fields, of which an edible's servings is one. A counter would not do: the walk does not read counters.
- The timetable: read by no tree line, so only a walk proves its claim, and the quiet edit can put it out of reach without failing a card.
- The Far Bank: a room nothing leads to, where the quiet edit of OB-31 puts the timetable.
