# Room 2 — seeded authoring errors

Each `TEST-002-<letter>.story` is the whole UPPS story with one authoring error in room 2 (the dock door, the mail bundle, the Loading Dock and its things); `TEST-002-Z.story` is the correct version, byte-identical to `upps.story` as of room 2. The tester must catch each error, point at its cause, and go green once the file is fixed (objective O-1). Rationale and observed output: `docs/work/author-narrative-testing/upps-error-catalog.md`, "Room 2 catalog". Seeded 2026-10-12.

Room 1's kinds are not repeated here; room 2 seeds the constructs it introduces: a `states:` line, a `while` condition on an exit, two `after` clauses, a second room and its links.

| File | Error | Caught by | What it reports |
|---|---|---|---|
| A | link to a misspelled room (`east to the Loading Dok`) | compiler | `analysis.unknown-entity` with "did you mean", plus a cascading `analysis.duplicate-exit` that reads "leads to ``" (F-17) |
| B | `states:` line missing on the dock door | compiler | `analysis.unknown-value` on the `while` line and `analysis.undeclared-state` on the `change` line |
| C | `while` names an undeclared state (`sealedd`) | compiler | `analysis.unknown-value`, "did you mean `sealed`" |
| D | `change` to an undeclared state (`clearedd`) | compiler | `analysis.undeclared-state`, "did you mean `cleared`" |
| E | `end after` missing on the bundle | compiler | `parse.unterminated-block`, naming the opening line |
| F | `refuse` inside an `after` body | compiler | `parse.react-refusal`, pointing at `on` |
| G | `after the player taking it, once` | compiler | `parse.removed-head-it` |
| H | `after` body names an undefined phrase | compiler | `analysis.missing-phrase` |
| I | bare head on a thing (`after taking, once`) | compiler | `analysis.head-bare-outside-actor` |
| J | `up is blocked ramp-up`, no colon | compiler | `parse.blocked-exit` |
| K | `after the player entering, twice` | compiler | `parse.on-modifier` |
| L | placed by an alias (`in the Loading Bay`) | not an error | an `in` line resolves an `aka`; gate-clean and plays |
| M | `east to the Loading Dock` removed | not an error | the dock's `west to the Sorting Room` makes the east exit; plays both ways |
| N | `west to the Sorting Room` removed | not an error | the depot's `east to` makes the west exit; plays both ways |
| O | `change the dock door to cleared` removed | the tree, on `east` | the derived branch still passes (the phrase counts as the effect); `east` fails its description claim, 4 cards failing (the three dock turns follow), `Rooms entered: 1 / 2`; the `contains "Loading Dock"` claim passes on the refusal text (F-19) |
| P | `, once` removed | the tree, on the retake | the derived label drops `once`; the second `take bundle` fails `not contains "satisfied clunk"`, 1 card failing (a second `take bundle` without the drop is refused, "You already have the mail bundle.", and fires nothing) |
| Q | `states: cleared, sealed` (door starts cleared) | compiler | `analysis.irreversible-state` on the `change` line, not the order on the `states:` line |
| R | `while` dropped: `east is blocked: dock-sealed` beside `east to` | the tree, on `east`; World tab Reach for the line | same tree result as `O` (4 cards failing, `Rooms entered: 1 / 2`, the name claim passing on the refusal, F-19); the test says "not entered", not "cannot be entered" (F-16); Reach: `loading-dock` unreached, blocked with line 19 "no condition that lifts it", three things stranded |
| S | `up is blocked: ramp-up` removed | the tree, on `up` | `up` fails its ramp-up claim, 1 card failing; nothing else |
| T | `after the player leaving, once` on the room | the tree runner at load (exit 3), with a line | `compose --check` is gate-clean; the runner refuses before any card: `leaving` is a region crossing reaction and the Loading Dock is not a region (F-18) |
| U | `sparrow` alias removed from the ship | the tree, on `examine sparrow` | "You can't see any such thing."; 1 card failing |
| V | room linked from neither side | the tree, on `east`; World tab Reach, without a line | gate-clean; `east` after clearing: "There are no obvious exits.", so both `east` claims fail, 4 cards failing, `Rooms entered: 1 / 2` (F-16); Reach: unreached and three stranded, but the dangling `east is blocked while` line is not a finding |
| Z | correct | — | gate-clean; 15 cards passing, 20 assertions passing; derived 2 of 3 exercised; rooms 2 of 2 |

Room 2's tree was recorded on 2026-10-12 in the Testing tab (`upps.tests/opejfh5t.json`, cards 9 to 15 after the room-1 cards): `take bundle` (contains the dock-clears phrase), `drop bundle`, `take bundle` (not contains "satisfied clunk"), `east` (the room name and description, recorded by the tab, plus the arrival phrase), `up` (the ramp-up phrase), `examine sparrow` (the ship's description), `west` (the depot, recorded by the tab). The rows above were run the same day: each seed copied over a scratch copy of the story with that tree, `./sharpee test <copy>/upps.story`. `sharpee test` names only the first failing card in its summary line (F-11); the counts carry the rest.
