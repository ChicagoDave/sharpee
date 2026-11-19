# Execution log — The Chord Manual, documentation acceptance test

`sharpee --version`: `Sharpee 5.6.4 · Chord 4.0.3`
Title page version line: `Chord 4.1.0, Sharpee 5.7.0`

## Setup

1. `npm config get prefix` → `/home/node/.local` (under home). OK.
2. Playwright in `~/tools/playwright`: three-line script launched Chromium (159.0.8154.6) and closed it. OK.
3. `~/repos/book-test` holds `the-chord-manual-4.1.0.pdf` and `companion/`. OK.
4. `pdftotext -v` and `pdftoppm -v` both print `version 22.12.0`. OK.

Project folder: `~/repos/relighting` (the book says the folder "can be anywhere you keep your own work").

Substitution (logged once): I cannot hold an interactive session, so every `sharpee play .` in this run is fed its commands on standard input, one to a line, ending with `/quit`.

## Preface and "How to read this book"

STATUS: PASS — read; nothing to run.

## Chapter 1 — The shape of a story file

STATUS: PASS

- Typed the listing by hand into `relighting/relighting.story`, joining the `↪` rows as 0.7 instructs. The two quoted errors (`lex.tab-indent` at 5:1, `parse.unterminated-block` at 30:1) reproduce word for word once chapter 4 has installed the command.

## Chapter 2 — The story header

STATUS: PASS

- "Nothing in this chapter is built." The `about` output (2.3) and the opening (2.4) reproduce word for word in chapter 4's play. `parse.header-inline-list` reproduces (my line is 8:3; the book's 3:3 is for its smallest header).

## Chapter 3 — The player and the start

STATUS: PASS

- 3.4 banner-first opening block: added the block as printed, output matches the book; block removed again (the book's story has none).
- 3.5: `start-block-missing` (4:1), `player-target-not-playable`, and the play-time "not placed in the world" error all reproduce word for word.

## Chapter 4 — Build, play, read an error

STATUS: PASS

- 4.1 install: `npm install -g @sharpee/devkit` ended with the blocked-install-script warning the book predicts. `sharpee --version` → `Sharpee 5.6.4 · Chord 4.0.3` (expected for this run).
- 4.3–4.8 and the Under the Hood `compose -o`: every quoted output reproduced word for word (version numbers and the load path aside). Each break was put back; final check is a single gate-clean line.

## Chapter 5 — Rooms and exits

STATUS: PASS

- Copied `chapter-05/relighting.story`; gate-clean. Walked all eight rooms; every quoted block (first visit, `look`, The Porter's Lodge heading, Bell Stair, Lantern Gallery, `You can't go that way.`) matches. The `Cloyster` diagnostic reproduces at 30:39 exactly.

## Chapter 6 — Things

STATUS: PASS

- Copied `chapter-06`; gate-clean. Every quoted block matches (listing line, lamp, chair, Hobb, inventory, spectacles/search, drop lamp + look). `backdrop-not-scenery` reproduces at 134:3.
- Not run: the `curtain`/`hide behind curtain` example (6.7) is "from another story" set in a Den this story does not have.

## Chapter 7 — Containers and supporters

STATUS: PASS

- Copied `chapter-07`; gate-clean. Every quoted block matches (desk/grimoire, crate/lens, `There's no room in the crate.`, lantern, press, chair, kettle-on-chair + look).
- Not run: the bell jar and supper table (7.5) are from another story.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

- Copied `chapter-08`; gate-clean. Every quoted block matches (locked/closed refusals, press and key, wrong key, lock behind you). `door-unconnected` (86:1) and `starts-state-pairing` (87:21) reproduce exactly; `opens when unlocked` gives "…, and it swings open." Each change put back.
- Not run: the key-ring disambiguation (8.6) is from "a draft of this chapter"; the ring is not in the story.

## Chapter 9 — What things can do: the trait words

STATUS: PASS-WITH-ISSUES

- Copied `chapter-09`; gate-clean. Coat, grimoire (`examine`/`read`), seed cake, cup, bell rope, `read coat`, `eat coat` all match word for word.
- Issue (ambiguity, minor) — 9.1 "Wearing" (hat and cap), 9.4 "Pulling and pushing" (trolley), 9.6 "Fixed to something" (tassel): the book prints these blocks and their story output with no remark that they belong to another story, unlike 6.7, 7.5, 10.5 ("from another story") and 9.7 ("The Relighting does not use this word"). They are placed `in the Den`, the trolley names `the Yard`, and the tassel is `attached to the hook`; the Relighting has no Den, Yard or hook, and "Build and try it" does not list them. I read them as illustrations and did not type them, so `wear hat`/`wear cap`, `push trolley north` and the tassel transcript were not reproduced.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

- Copied `chapter-10`; gate-clean. Every quoted block matches (grue line, dark `look`, lamp lit/extinguished/relit, `light taper`, lamp left in the Undercroft).
- Not run: night-vision Ansel "starts in the Cellar" and the tin (10.5, "from another story").

## Chapter 11 — Regions

STATUS: PASS

- Copied `chapter-11`; gate-clean. Tower from both sides of the arch, the three stacks and back, shelves: all match. `thing-in-region` reproduces at 142:3 with the failed-gates line; kettle put back, gate-clean. `room-two-regions` reproduces at 35:3.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS

- Copied `chapter-12`; gate-clean. Grille refusal, hearth, passage in the dark and with the lit lamp, `I don't understand that.` in the Undercroft: all match. 12.2: took out the `up is blocked` line, walked up, stepped east — output matches including `[The story has ended. RESTART, RESTORE or UNDO]`; line put back. `missing-phrase` reproduces at 102:3.
- Not run: the Study/Vault/bookcase `while` exit (12.3) — the book says The Relighting has none.

## Chapter 13 — States

STATUS: PASS

- Copied `chapter-13`; gate-clean. `read page` matches. 13.4 experiment (`change the iron grille to lifted` in the start block) opens the stair and prints the Lantern Gallery text as quoted; line taken out again. Under the Hood `compose -o relighting.json`: the grille's entry has `states: [standing, lifted]` and a `statesReversible` field beside it, as described.
- Not run: `probe.story` diagnostics, the sluice ("from another one") and the dial (both `in the Yard`).

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS

- Copied `chapter-14`; gate-clean. Kettle, spark page, bell rope, grille, spectacles, Library `once`, cake: all match. Under the Hood: `sharpee test .` in `companion/chapter-14` lists clauses as "kettle · on taking" under "Derived rule tests (ADR-356): 11 branches".
- Not run: `set dial to high` (14.6; the dial is not in this story) and the `probe.story` diagnostics.

## Chapter 15 — What a clause can say and do

STATUS: PASS

- Copied `chapter-15`; gate-clean. `light lamp` refusal, cake refused while Hobb is here and eaten in the Gate Court, candles and unbind page, spark page first/second reading, lit lamp in the Undercroft: all match. Under the Hood: `sharpee test .` in `companion/chapter-15` prints "hand lamp · on lighting · refused no-such-word" and "seed cake · on eating · refused cake-watched" as quoted.

## Chapter 16 — Conditions

STATUS: PASS

- Copied `chapter-16`; gate-clean. Grimoire before/after, hush page blank then readable: all match. Under the Hood `compose -o relighting.ir.json`: `lantern-ready` is an `and` of two tests; `faded-page` is marked `open`, as described.

## Chapter 17 — Choosing between outcomes

STATUS: PASS

- Copied `chapter-17`; gate-clean. Cistern, bell rope cycling (four pulls), grille first/second/third/fourth examine: all match. `refusal-misplaced` reproduces at 390:9 when the `when faded` arm is written as shown. Under the Hood: `sharpee test .` in `companion/chapter-17` lists "spark page · on reading · when legible", "… when learned", "iron grille · after examining · the third time", and the cistern's three arms with ◌.

## Chapter 18 — Counting, scoring and ending

STATUS: PASS

- Copied `chapter-18`; gate-clean. Score 5/25 Latecomer, rank rise on the candles, 10/25 Second-Year, fourth pull "Your palms have begun to object.": all match. `rank-above-max` reproduces with the same wording (at 20:5, because I added "Journeyman" as a fourth rank line; the book's 19:5 comes from an edit it does not show).
- 18.6: made `~/repos/relighting-endings` with a copy and the four start-block lines; both endings match the book word for word (lose; then, with `change the lens to sound`, win with the rank line).
- Not run: the vial (18.7, `in the Yard`).

## Chapter 19 — Time

STATUS: PASS

- Copied `chapter-19`; gate-clean. Undercroft thaw over two turns (timer strike, drip, break-up, toll, rank line), timer lines after `light lamp`/`east`, bell lines, blue flame morning/afternoon, `score` 15 out of 35 with no bell line: all match. Waiting from a new game: turn 50 prints the light-turning line, turn 80 prints the dusk ending, as quoted. Under the Hood: the sequence's `narration` in the IR is `broadcast`.
- Not run: the squib's `fuse` timer (19.3), which belongs to no thing in this story.

## Chapter 20 — Phrases

STATUS: PASS

- Copied `chapter-20`; gate-clean. `no-such-word` cycling, Hobb's three sayings, the verbatim gate motto (relative indentation 4/1/0 as on the page), Bell Stair with `{grille-across}`, Hobb deafened: all match. `examine bell` printed "By your count that makes 2, and it is not tired." where the book shows 3; the number is the toll count on the turn examined, so this is the turn, not a wording difference.

## Chapter 21 — A thing's own words

STATUS: PASS-WITH-ISSUES

- Copied `chapter-21`; gate-clean. Lamp detail, candles before/after, lens, Hobb's `present` sentence in the Lodge: all match word for word. Under the Hood: `hobb.present`, `hand-lamp.detail`, `candles.detail`, `candles.detail.2`, `spark-page.description` are all in the IR.
- Issue (minor) — 21.1 "Detail: a sentence that depends": the book shows one diagnostic for writing `are`:
  `relighting.story:402:35 error [parse.predicate] Unknown predicate `are` — expected is, is a, is in, has, holds, wears, feels, knows, or can see/reach.`
  Changing `the candles is not lit` to `are` in the chapter's own story gave two diagnostics, on line 401 not 402:
  ```
  relighting.story:401:35 error [parse.predicate] Unknown predicate `are` — expected is, is a, is in, has, holds, wears, feels, knows, or can see/reach.
  relighting.story:401:35 error [analysis.unknown-condition] `are` is not a declared condition or story state.
  compose: relighting.story failed the load-time gates (2 error(s))
  ```
  (The other candle line is 405, so neither is 402.) The book does not ask the reader to make this edit; I made it to reproduce the quoted block, then restored the file.
- Not run: the cat's `disappeared` phrase (21.4, `in the Yard`).

## Chapter 22 — Changing the standard messages

STATUS: PASS

- `sharpee messages` prints `Message catalog: 885 overridable messages (en-US)` and then the list as one line; the four quoted entries (taking-taken, going-too-dark, lighting-lit, taking-taken-from) are in it exactly as printed.
- Copied `chapter-22`; gate-clean. Dark arrival, dark `look`, three waits cycling, `You take it.`, grille asleep/waking (with the timer's strike line on the same turn as the book), Hobb's "Still mine": all match. IR has `messageOverrides` and `phrasebooks`.
- Not run: `import "books"` (22.9) — no `books.chord` is given and "Build and try it" does not use it; `taking-taken-from` override (22.5) is not in the chapter's story.

## Chapter 23 — New verbs

STATUS: PASS-WITH-ISSUES

- Copied `chapter-23`; gate-clean. `spark` alone, `hush bell` in the Library, `mend lamp`, the two `spark` misses with timer lines, `gnusto`, all four `remember`/`recall` blocks, `shout` → "I don't understand that.": all match.
- Issue (minor) — 23.13 Under the Hood "An action is data": the book says the sparking entry in the IR is "an entry with four lists: its patterns … its constraints … its musts … and its body". The entry written by `sharpee compose relighting.story -o relighting.ir.json` has the keys `name, patterns, constraints, musts, refusals, otherwise, scores, body, span` — three more (`refusals`, `otherwise`, `scores`) than the box names.
- Not run: `scrawling` (23.10) and `shouting … while the tower bell is tolling` (23.11; "The Relighting does not use this action"), `nothing-to-tune`, and the `probe.story` diagnostics.

## Chapter 24 — New kinds of thing

STATUS: PASS

- Copied `chapter-24`; gate-clean. Played to the win: `spark lamp` twice, `light lamp` refusal (with the timer's strike line, as in the book), `spark candles` with rank line, `unbind grille` in the bell, `hush bell`, `unbind grille` + "rank of a Journeyman", `mend spectacles`, `mend lens`, `examine lens`, empty-Lantern refusal, and the winning `spark lantern` block with "rank of a Lamplighter": all match word for word. Second play with the lens left cracked ends with the lens-shatters text. IR: wick's clauses carry `"routing": "capability"`.
- Not run: the `burner` trait, cresset and brazier (24.8, "from another story"), `cold-wick` (24.9, not in the story).

## Chapter 25 — Bending the standard grammar

STATUS: PASS

- With chapter 24's story `sit on chair` → "I don't understand that." as quoted. Copied `relighting.story` and `synonyms.chord` from `chapter-25`; gate-clean. `sit on chair`/`exit`, `light lamp` before and after the page, `light lamp with taper`, `quiet bell`, `fix spectacles` (carrying the Journeyman line, as the book says for this order), `repair lens`, win: all match. `unmatched-removal-pattern` reproduces at 192:1. IR: `grammarRemovals` has one entry (lighting), `grammarExtensions` four (sparking, mending, hushing, entering).

## Chapter 26 — People who act

STATUS: PASS

- Copied `chapter-26`; gate-clean. Hobb closing the press (both blocks), the wisp's arrival and "The wisp follows you.", Tamsin in the Refectory (`examine tamsin`, sorts, "leaves to the west"), "Tamsin Vey enters from the east." in the Cloister on the turn the bell first tolls, and the Bell Stair view two turns later (thumb / "pushes the iron grille." / pry bar) all match word for word. `talk to hobb` → "Hobb doesn't respond." IR: Tamsin's `passive` trait carries `announces-movement`; the goal step is stored as `pushing` / `push :target`.
- Not run: Sam and the `ey` pronoun set, the cat, the watchman, Nell and Pat (all in the Yard/Shed of another story).

## Chapter 27 — Asking and telling

STATUS: PASS

- Copied `chapter-27`; gate-clean. Hobb on the dimming, Tamsin, the kettle, the bell (refused before it rings; answered with "Hobb gives the hush page to Ansel." while it tolls; nothing to give the second time), the weather override, `ask hobb for the kettle`, greeting first time / `goodbye` / on return, `consult grimoire about gnusto`, `look up cheese in grimoire`, `talk to tamsin` → "Tamsin Vey doesn't respond.", `read hush page`: all match (beats rotate as the book says). IR: `topics` rows have `filter` (kind `text`, `primary`, `aliases`) and `body`; `mood` is under `character`.
- Not run: the `Nell` load error (27.3.2) and `probe.story` diagnostics.

## Chapter 28 — Conversations with a shape

STATUS: PASS

- Copied `chapter-28`; gate-clean. The thread (has-it, parting on "the porter", resuming on "the stair", price), `say maybe`, `yes` with the page handed over and the conclusion, `no` with the conclusion, the concluded thread's stock answer, the `price` row before (refusal, then Tamsin sorts and next turn leaves west), after `no` (price again, `agreed`) and after the bargain ("We have dealt"), brass once/again, the silence line after two waits, Hobb on last night before and after the Dimming: all match. A silent turn after the first beat is answered with the price, as 28.1 says.

## Chapter 29 — Inner lives

STATUS: PASS

- Copied `chapter-29`; gate-clean. Hobb's refusal to a stranger, spectacles given, `talk to hobb`, last night told; Tamsin on magic before and after the bargain; Hobb rattled while the bell tolls (one-hand-over-an-ear beat, page handed over): all match (manner beats rotate as the book says).
- Not run: Nell and Tom's rumour (29.3.1, in the Yard).

## Chapter 30 — Principles

STATUS: PASS

- Copied `chapter-30`; gate-clean. Dimming, then last night withheld with the stock line "Hobb gives that some thought, and gives it back.", the spectacles row, spectacles given, last night told: all match.
- Not run: Cy (30.4, in the Yard) and the six-person table (30.5).

## Chapter 31 — More than one protagonist

STATUS: PASS

- Copied `chapter-31`; gate-clean. Read the spark page and played four turns: the hand-over block on `light lamp with taper` matches the book line for line, as do Hobb's `look` (no doorway sentence, "You can see a kettle here."), `inventory` ("Your hands are empty."), `north` refusal, `take kettle`, `examine newspapers` with the return to Ansel, and Ansel's `look` in the Library with the wisp. Hobb then hands over the hush page when asked about the bell.

## Chapter 32 — Machines

STATUS: PASS

- Copied `chapter-32`; gate-clean (story-version 0.6.0). On the roof: `turn crank` (leaves part), `turn crank` with the seat empty (only the platform line), `push crank` (pawl), `spark lantern` shuttered refusal, `turn crank` after seating the lens (pawl + shutters fold back), shutter details in both states, then the win: all match.

## Chapter 33 — Vehicles

STATUS: PASS

- Copied `chapter-33`; gate-clean. With the lens in hand the stair gives the grille's phrase until the grille is lifted and the lens-too-wide phrase after. Lens in the hoist before the grille is lifted: "The book hoist pulls away." and it is found in the Library; after: it is on the roof ("You can see a book hoist and a wisp here." / "In the book hoist you see a lens."). `put lens in lantern` from the hoist, `enter hoist` + `look` ("In the book hoist you see Ansel."): all match.
- Not run: tram, balloon, cart, barge (Yard/Shed/Mill of another story).

## Chapter 34 — Open water and open ground

STATUS: PASS

- Copied `chapter-34`; gate-clean. Water gate refuses before the Hall is awake. Won as far as the roof (the Lantern now prints its phrase and does not end the game), went through the gate, `enter skiff`, `steer east`, `wait`, `make sail`, then the two `look` views, the dusk line, "The skiff arrives at the Beacon Isle.", and `spark beacon` with the Lamplighter line and the ending: all match word for word. IR `uses` lists scoring, chapters, expanses, sailing.
- Not run: the raft and the bottle (34.3, 34.6, `in the Lake`).

## Chapter 35 — The opt-in systems

STATUS: PASS

- No companion folder, as the chapter says. Typed `cellar.story` into `~/repos/cellar` and `yard.story` into `~/repos/yard`; both gate-clean.
- Cellar: `attack rat` → "You land a solid blow on the rat, dealing 1 damage!", `take poker` → "Taken.", then one "You swing at the rat but miss!" and "You have slain the rat!" (the fight is rolled afresh; both lines are the ones the book names).
- Yard: "You could eat." after the second wait, "You are hungry now, and thinking about the loaf." after the fourth, "You have starved to death." and the ending on the ninth: matches.

## Chapter 36 — Sound, music and pictures

STATUS: PASS

- Copied `relighting.story` and the `assets` folder (three recordings, one picture) from `chapter-36`; gate-clean. `light lamp` ends with "The wick takes with a small dry sound, like a page turned."; the hand-over to Hobb ends with the wisp's flinch; walking into the Bell Stair on the turn Tamsin pushes gives "Tamsin Vey pushes the iron grille." / "Iron shrieks on iron, close by, and stops."; waiting in the Cloister gives the near line alone; waiting in the Library gives "Somewhere in the Hall, iron complains about iron.": all match.
- Not run: the gramophone and curtains (36.8–36.9, in a Parlour this story does not have).

## Chapter 37 — The page the player sees

STATUS: PASS

- Copied `relighting.story`, `relighting.config.json` and `browser/` from `chapter-37`; gate-clean. `sharpee build relighting.story` printed the block the book shows, line for line, without the "Minted the story's ifid" line (as 37.9 says for the copied story); sizes and timing differ (game.js 2.4mb / 2435.5 KB, 66ms). `npx serve dist/web/relighting` served at http://localhost:3000.
- Playwright (Chromium, from `~/tools/playwright`): the page opens on the prologue and title in the `paper` theme; Settings → Theme lists Classic, Paper, Modern Dark; after `read spark page` in the Library a side panel shows `workings` / `spark: wakes a flame`; choosing Modern Dark and reloading keeps the theme (`relighting-theme` = `modern-dark` in localStorage, with `relighting-save-autosave` and `relighting-saves-index` beside it), prints `[Session restored]`, the status line reads LIBRARY again and the panel still has its one line.
- Played the whole game on the page: the panel ends with the four lines in the book's order (spark, unbind, hush, mend). The page loaded `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` (HTTP 206) and `img/lantern-lit.png` (HTTP 200, 960×600, shown in `#sharpee-media` when the Lantern is lit and hidden again by the beacon). No console errors, no failed requests.
- Not run: the `client: terminal` and theme `parchment` build errors (37.1), the harbour channels (37.5–37.6), a page of one's own (37.8) — none is a step of "Build and try it".

## Chapter 38 — Test trees

STATUS: PASS

- Wrote `relighting.tests/manifest.json` and `mainline.json` with three skip cards. `sharpee test . --json --capture-output > records.txt` wrote one JSON record to a line; the `take lamp` record matches the book's (`"actualOutput":"You take it."`, `"turn":1`, `[SKIP]`), `elapsedMs` aside; the derived-test report still printed in the terminal.
- With the asserted `mainline.json`: "✓ opening-lodge / 3 cards passing, 4 assertions passing", exit 0. With `onward01.json` and `thecake1.json`: "2 line(s)", "✓ lodge · eat cake", "6 cards passing, 9 assertions passing", "5 commands (5 authored + 0 replayed), 1 restored at a fork". All as quoted.
- The 38.6 failure (`"contains": ["Taken."]`) prints `✗ opening-lodge — take lamp: Output does not contain "Taken."` / `You take it.`, exit 1. (My run had the two-line tree by then, so the count line reads "5 cards passing, 8 assertions passing, 1 card failing, 1 assertion failing"; the book's "2 cards passing, 3 assertions passing…" is for the one-line tree.)
- Broke `cake-watched` ("You decide against it."): `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."`, exit 1; put back: all pass.
- Replaced the folder with `chapter-38/relighting.tests`: seven lines with the names the book lists, "182 cards passing, 275 assertions passing", "181 commands (181 authored + 0 replayed), 6 restored at a fork", "Branches exercised: 53 / 134" with 81 not exercised, "Endings reached: 2 / 3", `relighting.story:314 · night-falls (lose)`, "Rooms entered: 13 / 13". All as quoted.

## Chapter 39 — Claims

STATUS: PASS

- `sharpee claim winning1` lists the seven lines exactly as quoted. `sharpee claim thelodge --at 82` prints the ten facts shown and 23 more, then the "Lock one with:" line.
- Locking `the iron grille is lifted` under the book's name printed the quoted report word for word, created `relighting.claims.chord` (identical to the listing in 39.3), added `claims` to the manifest and `locks` to card `b7wicd1b`. `sharpee test .` → "claims: 1 of 1 held (seed 42)", HELD at turn 82, lock held.
- Added "the story can be won" by hand with its lock on `bjhmo3xt`: "claims: 2 of 2 held", HELD at turn 138, both locks held.
- Added "the cake can be eaten": "3 of 3 held", "1 walk … 17 states, 20 commands, stopped: all-claims-settled", witness `take seed cake / north / eat seed cake`. With `needs rooms: the Lodge` alone: "2 of 3 held, 1 unproven", "161 states, 239 commands, stopped: max-depth-reached". Gate Court put back.
- Took `change it to lifted` out of the `ward` trait: the `unbind grille` card fails with the quoted state-assertion text, 35 cards fail in all, the run takes 4m01s and exits 1, and the claims section reads "1 of 3 held, 2 unproven", "3 walks", with `lock "the ward on the stair can be lifted" … — NOT held there: the iron grille is standing` and the win lock not held, as 39.11 says for three claims (state/command counts of the two clock-stopped walks differ from the one-claim figures in 39.6, as the book allows). Line put back: 3 of 3 held, matching the block in 39.11.
- Not tried, as instructed: locking after the line's first `put`, and `put` in a `needs verbs` line. Not run: `--propose`, `--verbose`, the `raised` and canonical-form refusals (not steps of "Build and try it").

## Chapter 40 — Publishing

STATUS: PASS

- `sharpee ifid generate` prints one identifier of the quoted shape. The copied story's header already carries `ifid: C24E29F8-C36B-4F55-9FE9-B6D75AE7133D`, the same value as `relighting.config.json`.
- Set `story-version: 1.0.0` and added `publish-source: yes`; gate-clean. The terminal opening prints the four lines with `Story v1.0.0` last, as 40.2 says. `sharpee test .`: all seven lines pass, `claims: 3 of 3 held (seed 42)`.
- `sharpee publish relighting.story` printed the quoted report line for line (sizes and timing aside: game.js 2.4mb / 2435.5 KB, 50ms, zip 0.8 MB), with the same IFID. `unzip dist/relighting.zip -d ../relighting-published` gave exactly the fourteen files listed in 40.5; no `game.js.map`, no `index-testing.html`, no test tree, no claims file.
- `npx serve .` inside `relighting-published` served at http://localhost:38825. Playwright (Chromium): the page opens on the prologue, "The Relighting", "Story v1.0.0", description, authors, in the `paper` theme, with the File menu's Save/Restore/Restart/Quit. Played from the Lodge to the beacon: the workings panel fills with four lines, the picture `img/lantern-lit.png` loads (200, 960×600) and shows when the Lantern is lit and is hidden by the beacon, `audio/catch.mp3`, `audio/toll.mp3` and `audio/lapping.mp3` load (206), the final turn prints the beacon text and "You have risen to the rank of a Lamplighter.", score 50. No console errors, no failed requests.
- Not run: the "has no identity" refusal, `--out`, `--no-menu` (not steps of "Build and try it"). The companion folder `chapter-40` was not opened; no step uses it.

## Appendices

Read, not run (accepted by design).

## Totals

| Status | Chapters | Which |
|---|---|---|
| PASS | 37 | 1–8, 10–20, 22, 24–40 |
| PASS-WITH-ISSUES | 3 | 9, 21, 23 |
| BLOCKED | 0 | — |

DEVIATION entries: 0.

Issues reported (all minor; none stopped a step):

1. Chapter 9 (9.1, 9.4, 9.6) — hat/cap, trolley and tassel examples are printed with story output but are not marked as belonging to another story, and name a Den, a Yard and a hook the Relighting does not have.
2. Chapter 21 (21.1) — the `are` diagnostic: the chapter's story gives it at line 401 (book: 402) and with a second `analysis.unknown-condition` diagnostic the book does not show.
3. Chapter 23 (23.13, Under the Hood) — the sparking entry in the IR has `refusals`, `otherwise` and `scores` beside the "four lists" the box names.

What was not exercised: examples the book sets in other stories (Den, Yard, Shed, Mill, Lake, Parlour, harbour), `probe.story` diagnostics, and optional forms that no "Build and try it" step uses; each is listed under its chapter. Nothing was skipped because of a failure, so no later chapter went untested.
