# Room 3 — seeded authoring errors

Each `TEST-003-<letter>.story` is the whole UPPS story with one authoring error in room 3 (the loader robot's reaction, the ship's states, the dock's `up` exit, the giving refusals, the Hold and its things); `TEST-003-Z.story` is the correct version, byte-identical to `upps.story` as of room 3. The tester must catch each error, point at its cause, and go green once the file is fixed (objective O-1). Rationale and observed output: `docs/work/author-narrative-testing/upps-error-catalog.md`, "Room 3 catalog". Seeded 2026-10-12.

Rooms 1 and 2's kinds are not repeated; room 3 seeds the constructs it introduces: a person the player gives to, `after the player giving` with statement-level `when` guards, `on the player giving` refusals, a `while` on an exit that a `change` lifts, an `openable` container holding a `wearable`, a `move` into an unentered room, and a second blocked exit.

Room 3's tree was recorded on 2026-10-12 in the Testing tab (`upps.tests/opejfh5t.json`, cards 16 to 27 after the room-1 and room-2 cards): `east` (tab-recorded name and description), `give card to robot` (the refusal), `give satchel to robot` (the refusal), `give bundle to robot` (the loading phrase), `up` (tab-recorded, plus the listing "a suit locker and a mail bundle here"), `north` (the hatch phrase), `open locker` (open plus the suit listed), `take suit` (no claim), `wear suit`, `take bundle` (no claim), `down` (tab-recorded), `give bundle to robot` (not contains "unfolds its arms"). The correct story: 25 cards passing, 34 assertions passing, rooms 3 of 3. "The tree" below is that tree run against each seed in a scratch copy the same day; `sharpee test` names only the first failing card in its summary line (F-11); the counts carry the rest.

| File | Error | Caught by | What it reports |
|---|---|---|---|
| A | the robot is `a thing, scenery`, not `a person` | the tree, on `give bundle to robot` | `give bundle to robot`: "You can only give things to people."; the robot is also no longer listed in the dock; derived tier drops to 2 of 7 (the two `on giving` refusals become `object-unreachable: nothing fills [someone]`); 6 cards failing, `Rooms entered: 2 / 3` |
| B | the robot's guard moved onto the head: `after the player giving while the loader robot has the mail bundle, once` (F-21) | the tree, on `give bundle to robot` | gate-clean; "You give the mail bundle to the loader robot." and nothing else; the ramp never comes down; derived `object-unreachable`; 6 cards failing, `Rooms entered: 2 / 3` |
| C | the three `when` guards dropped | not an error | gate-clean; play and the tree identical to `Z`, since the satchel and the card refuse giving; derived `object-unreachable`, as `Z` |
| D | `states: buttoned, boarding` removed from the ship | compiler | `analysis.unknown-value` on the `while` line and `analysis.undeclared-state` on the `change` line |
| E | `change the courier ship to boarding …` removed | the tree, on `up` | the robot speaks and the bundle moves to the Hold, but `up` stays "The Sparrow's ramp stays up."; 5 cards failing, `Rooms entered: 2 / 3` |
| F | `up to the Hold` removed | not an error | the Hold's `down to the Loading Dock` makes the `up` exit; plays as `Z` |
| G | `up is blocked while …: ramp-up` removed | the tree, on `up` | `up` before the gift enters the Hold, and every dock turn after it is displaced: 9 cards failing, `Rooms entered: 3 / 3` (3 cards failing with the room-2 tree alone) |
| H | `move the mail bundle to the Hod` | compiler | `analysis.unknown-entity`, "did you mean `hold`" |
| I | `move the mail bundle to the Hold …` removed | the tree, on `up` | the bundle stays with the robot; the Hold lists only the locker; `take bundle` there: "You can't see any such thing."; 1 card failing |
| J | the route card's `on the player giving` refusal removed | the tree, on `give card to robot` | `give card to robot` is accepted, the guards are false, and `, once` is consumed by that empty firing (F-23): the bundle given afterwards is taken with no reaction, and the ramp never comes down; 7 cards failing, `Rooms entered: 2 / 3` |
| K | `refuse satchel-is-your` | compiler | `analysis.missing-phrase`, "did you mean `satchel-is-yours`" |
| L | the locker not `openable` | the tree, on `open locker` | the locker is open from the start, its suit listed on every `look`; `open locker`: "The suit locker can't be opened."; 1 card failing |
| M | the locker `starts open` | the tree, on `open locker` | as `L` in the room listing; `open locker`: "The suit locker is already open."; 1 card failing |
| N | the suit placed `in the Hold` instead of the locker | the tree, on `up` | the suit is listed on the floor; `open locker`: "You open the suit locker, which is empty."; `take suit`: "Taken."; 2 cards failing |
| O | the suit not `wearable` | the tree, on `wear suit` | `wear suit`: "You can't wear the space suit."; 1 card failing |
| P | `north is blocked: hatch-latched` removed | the tree, on `north` | `north` in the Hold: "You can't go that way."; 1 card failing |
| Q | `down to the Loading Dock` removed | not an error | the dock's `up to the Hold` makes the `down` exit; plays as `Z` |
| R | `after the player given, once` | the runner at load (exit 3), with a line | `compose --check` is gate-clean; `sharpee test` and `sharpee play` both stop: "`after given it` — no standard action consults `if.action.given` … (line 126)" (F-18) |
| S | the Hold's `after the player entering, once` written as `on … end on` | not an error | plays as `Z`; the derived tier lists it as `Hold · on entering, once`, SKIPPED command-lifecycle like the `after` form |
| T | `holds` for `has` in a guard | not an error | plays as `Z` |
| U | a guard names `the mail bundel` | compiler | `analysis.unknown-entity`, "did you mean `mail bundle`" |
| V | `, once` dropped from the robot's reaction | the tree, on the second `give bundle to robot` | gate-clean; retrieving the bundle from the Hold and giving it again fires the whole reaction a second time; 1 card failing |
| Z | correct | — | gate-clean; 25 cards passing, 34 assertions passing; derived 4 of 7; rooms 3 of 3 |
