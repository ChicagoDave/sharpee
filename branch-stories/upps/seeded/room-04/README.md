# Room 4 — seeded authoring errors

Each `TEST-004-<letter>.story` is the whole UPPS story with one authoring error in room 4 (the suit's wearing reaction, the hatch's states, the Hold's `north` exit, the Cockpit and its things, the fold drive's requirement, reaction and refusal); `TEST-004-Z.story` is the correct version, byte-identical to `upps.story` as of room 4. The tester must catch each error, point at its cause, and go green once the file is fixed (objective O-1). Rationale and observed output: `docs/work/author-narrative-testing/upps-error-catalog.md`, "Room 4 catalog". Seeded 2026-10-12.

Rooms 1 to 3's kinds are not repeated; room 4 seeds the constructs it introduces: `after the player wearing`, a `change` on one entity that lifts a `while` on another room's exit, an `enterable` scenery thing, a `switchable` scenery thing, a `must` requirement in an `on` body, a two-word action head (`switching_on`), and a bare `refuse` on `switching_off`.

Room 4's cards were added to the tree on 2026-10-12 through the CLI path, by editing `upps.tests/opejfh5t.json` directly (rooms 1 to 3 were recorded in the Testing tab; room 4 was not, see the session summary). The existing `wear suit` card gained a second `contains` ("PRE-FLIGHT COMPLETE"); ten cards follow the room-3 cards: `up` (name and description), `north` (name, description, arrival phrase), `examine viewport`, `switch on drive` standing (the requirement phrase, and not "hums to life"), `enter couch`, `switch on drive` seated (the standard line, the fold phrase, and the state claim `the courier ship is underway`), `switch off drive` (the refusal, and not "You switch off"), `switch on drive` again ("already on", and not "folds away"), `exit`, `south` (name and description). The correct story: 35 cards passing, 54 assertions passing, rooms 4 of 4, derived 8 of 13. "The tree" below is that tree run against each seed in a scratch copy the same day; `sharpee test` names only the first failing card in its summary line (F-11); the counts carry the rest.

| File | Error | Caught by | What it reports |
|---|---|---|---|
| A | `after the player wear, once` | the runner at load (exit 3), with a line | `compose --check` is gate-clean; `sharpee test` stops: "`after wear it` — no standard action consults `if.action.wear` … (line 183)" (F-18) |
| B | `change the cockpit hatch to free` removed | the tree, on `north` after the suit | the pre-flight phrase is spoken but the hatch stays dogged; 9 cards failing; `Rooms entered: 4 / 4` all the same (F-25) |
| C | the suit's reaction written `on the player wearing, once … end on` | the tree, on `wear suit` | gate-clean; the hatch is freed and the phrase spoken, but "You put on the space suit." is no longer printed (F-26); 1 card failing |
| D | `states: dogged, free` removed from the hatch | compiler | `analysis.unknown-value` on the `while` line and `analysis.undeclared-state` on the `change` line |
| E | `north to the Cockpit` removed | not an error | the Cockpit's `south to the Hold` makes the `north` exit, and the blocked line still gates it; plays as `Z` |
| F | `north is blocked while …: hatch-latched` removed | the tree, on `north` before the suit | `north` enters the Cockpit from the first visit; 6 cards failing |
| G | the `while` dropped: `north is blocked: hatch-latched` (room 3's original line) | the tree, on `north` after the suit | the hatch is freed and nothing changes; 9 cards failing, as `B` |
| H | `change the cockpit hatch to fre` | compiler | `analysis.undeclared-state`, "did you mean `free`" |
| I | the couch not `enterable` | the tree, on `enter couch` | "You can't enter the flight couch." and the drive can never be lit; 4 cards failing |
| J | the `must` line removed | the tree, on the first `switch on drive` | the drive lights with the pilot standing; 2 cards failing |
| K | `refuse when the player is not in the flight couch: not-strapped-in` for the `must` line | not an error | gate-clean, though the guide says a negated refusal is flagged; the predicate-level `is not` passes the polarity gate (F-27); plays as `Z` |
| L | the `must` line moved into the `after` body | compiler | `parse.react-refusal` |
| M | `on the player switching on` (two words) | compiler | `analysis.head-actor`: "`the player switching` is not the player or a character … the action word (here `on`)"; the message never names `switching_on` (F-24) |
| N | the drive not `switchable` | the tree, on the seated `switch on drive` | "The fold drive isn't something you can switch on."; 2 cards failing; the derived tier also reports its `after switching_on` row refused |
| O | `, once` dropped from the drive's reaction | not an error | the refusal on `switching_off` means the drive is never off again, so the reaction cannot fire twice; plays as `Z` |
| P | the `on the player switching_off` refusal removed | the tree, on `switch off drive` | "You switch off the fold drive."; 2 cards failing |
| Q | `phrase fold-begins` removed | the tree, on the seated `switch on drive` | only "The fold drive hums to life."; 1 card failing |
| R | `change the courier ship to underway` removed | the tree, on the seated `switch on drive` | the state claim: "the courier ship is "boarding", expected "underway""; 1 card failing |
| S | `underway` missing from the ship's states | compiler | `analysis.undeclared-state` |
| T | the Cockpit's `south to the Hold` removed | not an error | the Hold's `north to the Cockpit` makes the `south` exit; plays as `Z` |
| U | the viewport placed `in the Hold` | the tree, on `examine viewport` | "You can't see any such thing." in the Cockpit; 1 card failing |
| V | the suit's wearing reaction moved onto the suit locker | the tree, on `wear suit`, and the derived tier with a line | the hatch is never freed; 10 cards failing; the derived row reads "suit locker · after wearing, once — the standard action refused first: if.action.wearing.not_wearable (upps.story:175)", the first wrong-owner seed caught at its line |
| Z | correct | — | gate-clean; 35 cards passing, 54 assertions passing; derived 8 of 13; rooms 4 of 4 |
