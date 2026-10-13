# Room 6 — seeded authoring errors

Each `TEST-006-<letter>.story` is the whole UPPS story with one authoring error in room 6 (the Landing Pad, the pad master and her topics, the tram line, the route card's showing reaction, the Airlock's west exit, the Hold's sealed ramp, and the loader robot's reload); `TEST-006-Z.story` is the correct version, byte-identical to `upps.story` as of room 6. The tester must catch each error, point at its cause, and go green once the file is fixed (objective O-1). Rationale and observed output: `docs/work/author-narrative-testing/upps-error-catalog.md`, "Room 6 catalog". Seeded 2026-10-12.

Rooms 1 to 5's kinds are not repeated; room 6 seeds the constructs it introduces: `define topics` with quoted keys, a person with `states:` gating an exit by `while`, a blocked exit with no destination yet, `after the player showing while …, once` on the thing shown, `lose <key> when …` on the recipient, an `and` guard, two blocked lines on one direction sharing a key, and a reaction without `, once` whose statements are guarded by state. Room 6 is also the first room that changed an earlier room: the loader robot's `after giving, once` left the bundle with the robot after a second give (room 3's cards do that on purpose), so it became a guarded reaction that reloads the bundle every time; every earlier card still passes, and the room-3 give card gained a claim on the new reload line.

Room 6's cards were added on 2026-10-12 through the CLI path. The main line `w7eqlqnb` gained fifteen cards after the second `open hatch`: `west` (name, description, the pad master listed, the arrival paragraph), `examine quint`, `examine tram`, `north` (the block, and not "You can't go that way."), `ask quint about the mail`, `ask quint about vance` (and not the default reply), `ask quint about the dome`, `show card to quint` (the standard line, the waved-through paragraph, and the state claim `the pad master is waved-through`), `east`, `east` (the bundle listed in the Hold), `down` (the sealed ramp, and not "Loading Dock"), `take bundle`, `west`, `west`, and `give bundle to quint` with `ending: parcel-signed-away`. The dock line `8alivtpe` gained `west` (the hatch-shut refusal) between its `open hatch` and `east`. A lone continuation segment is refused by the loader ("whose last card is not a fork"), so the lose ending sits on the main line itself; room 7 forks before it. The correct story: 3 lines, 65 cards passing, 112 assertions passing, endings 2 of 2, rooms 6 of 6, derived 14 of 25. "The tree" below is that tree run against each seed in a scratch copy the same day; `sharpee test` names only the first failing card in each line's summary (F-11); the counts carry the rest.

| File | Error | Caught by | What it reports |
|---|---|---|---|
| A | `about the mail bundle, "the parcel": …` (an entity key mixed with quoted ones) | compiler | `parse.topics-colon`: "Expected `:` after the topic key" |
| B | `about the mail bundle:` beside `about "the mail":` | compiler | `analysis.topic-entity-collision`: ""the mail" collides with `mail bundle` … Remove one" |
| C | `states: unconvinced, waved-through` removed | compiler | `analysis.undeclared-state` at the route card's `change` (line 66), not at the pad master |
| D | `change the pad master to waved-through` removed | the tree, on `show card to quint` | the state claim: "the pad master is "unconvinced", expected "waved-through""; 1 card failing |
| E | the `north is blocked while …` line removed | the tree, on `north` | the block paragraph missing; 1 card failing |
| F | the `while` dropped: `north is blocked: quint-blocks` | nothing | no card goes north after the card is shown, so the block that never lifts is invisible; 65 cards passing |
| G | the head `while the player is in the Landing Pad` dropped | nothing | the card is shown nowhere else in the tree; the derived row still passes; 65 cards passing |
| H | the showing reaction moved onto the pad master | nothing, and the derived tier reports it as unreachable | play fires it on the recipient, so every card passes; the derived tier says "pad master · after showing, once — SKIPPED object-unreachable: nothing fills [something]" and the count drops to 13 of 25 (F-33) |
| I | `win parcel-signed-away` for `lose` | nothing | the card's `ending` names the phrase, not the kind; 65 cards passing, `Endings reached: 2 / 2` (F-32) |
| J | the `vance` topic line removed | the tree, on `ask quint about vance` | the default reply; 1 card failing; the derived count reads 13 of 24 |
| K | `define phrase quint-blocks` removed | compiler | `analysis.missing-phrase` at the blocked line |
| L | the pad master placed `in the Airlock` | the tree, on `west` | 7 cards failing (she is not listed, cannot be examined, asked or shown), one ✗ line (F-11); `north` still passes, since the block reads her state, not her presence; endings 1 of 2 |
| M | the Pad's `east to the Airlock` removed | not an error | the Airlock's `west to the Landing Pad` makes the return |
| N | the Airlock's `west to the Landing Pad` removed, its blocked line kept | not an error | the Pad's `east to the Airlock` makes the exit, and the blocked line beside a return-made exit still guards it |
| O | `west is blocked while the outer hatch is closed` removed | the tree, on the dock line's `west` | the carrier walks through a shut hatch; 1 card failing |
| P | `down is blocked while the courier ship is landed` removed | the tree, on `down` | the ramp leads back to the Loading Dock from Ceres; 5 cards failing; endings 1 of 2 |
| Q | the first-load phrase guarded on `boarding` instead of `buttoned` | the tree, on both `give bundle to robot` cards | the paragraph missing on the first give and present on the second; 2 cards failing |
| R | the `move the mail bundle to the Hold` line removed | the tree, on `up` after the robot loads | the bundle not listed in the Hold; 5 cards failing; endings 1 of 2 |
| S | the reload phrase removed | the tree, on the second `give bundle to robot` | the new reload claim; 1 card failing |
| T | `define topics for quint` (an alias for the name) | not an error | the alias resolves; 65 cards passing |
| U | the tram line placed `in the Airlock` | the tree, on `examine tram` | 1 card failing |
| V | the giving reaction moved onto the mail bundle | not an error | the thing given fires it as the recipient does; the lose ending is reached from either owner |
| Z | correct | — | gate-clean; 3 lines, 65 cards passing, 112 assertions passing; endings 2 of 2; rooms 6 of 6; derived 14 of 25 |
