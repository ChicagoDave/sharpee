# Execution log — The Chord Manual, documentation acceptance test

`sharpee --version` printed: `Sharpee 5.6.4 · Chord 4.0.3`

Title page version line: `Chord 4.1.0, Sharpee 5.7.0`

## Setup

All four checks passed before the book was opened.

1. `npm config get prefix` printed `/home/node/.local` (under the home directory). `sharpee` was not installed at this point.
2. A three-line script run from `~/tools/playwright` launched Chromium (reported version 159.0.8154.6) and closed it.
3. `~/repos/book-test` holds `the-chord-manual-4.1.0.pdf` and the folder `companion`, nothing else.
4. `pdftotext -v` and `pdftoppm -v` each printed `version 22.12.0`.

Run notes (not book issues):

- The project folder is `~/repos/relighting` (chapter 1 says the folder "can be anywhere you keep your own work").
- I cannot hold an interactive session, so every `sharpee play .` in this run was sent its commands on standard input, one to a line, ending with `/quit`. Logged here once, as the brief asks.
- `~/tools/playwright` already held scripts from some earlier run (`ch37.js`, `ch40.js`, `fullwalk.js`, two PNGs). I did not read or use them; my own scripts are named `run-*.js`.

---

## Chapter 1 — The shape of a story file
STATUS: PASS

- No issues. Typed the listing by hand into `relighting/relighting.story` (32 lines; the line numbers later quoted by chapter 4's diagnostics confirm the layout).

## Chapter 2 — The story header
STATUS: PASS

- No issues. The chapter says "Nothing in this chapter is built"; its opening and `about` output were reproduced in chapter 4's play and match word for word.

## Chapter 3 — The player and the start
STATUS: PASS

- No issues. `examine me` and the opening match. The opening block is described as optional ("you need not add one"), so it was not added.

## Chapter 4 — Build, play, read an error
STATUS: PASS

- No issues. `npm install -g @sharpee/devkit` ended with the blocked-install-script warning the book predicts. `--check`, the play transcript (4.4), the `playble` pair of errors (4.5, lines 31:3 and 24:3), the `Loge` guess (4.6, 25:13), the room-no-description warning (4.7, 16:8), both folder mistakes (4.8) and the `compose -o` box all printed exactly what the book quotes, apart from the version numbers (accepted item 8) and my own path (item 3).

## Chapter 5 — Rooms and exits
STATUS: PASS

- No issues. Copied `chapter-05/relighting.story`, gate-clean. Walked all eight rooms; 5.6, 5.7 and 5.8 output matches word for word.

## Chapter 6 — Things
STATUS: PASS

- No issues. Every printed block (6.1, 6.2, 6.3, 6.6, 6.7, 6.8) reproduced exactly.
- Not verified (no step given): 6.7's curtain / `hide behind curtain` is "from another story" whose file the book does not print. The same applies to every later example the book places in "another story" with a room called the Den (7.5 bell jar and table; 9.1 hat and cap; 9.4 trolley; 9.6 tassel; 9.7 wireless; 10.4; 10.5 tin; 12.3 Study). None has a step in a "Build and try it", and a literal reader has no file to run them in, so their quoted output was not reproduced. Logged once, here.

## Chapter 7 — Containers and supporters
STATUS: PASS

- No issues. 7.1, 7.2, 7.3, 7.4, 7.6, 7.7 output reproduced exactly, including the walk with the lens to the roof.

## Chapter 8 — Doors, locks and keys
STATUS: PASS

- No issues. 8.3 and 8.7 reproduced exactly. 8.4 (`opens when unlocked`) is described as a line The Relighting leaves out, with no step, so it was not run.

## Chapter 9 — What things can do: the trait words
STATUS: PASS

- No issues. 9.1 (coat), 9.2 (grimoire), 9.3 (seed cake), 9.4 (bell rope), 9.5 (cup), 9.9 (`read coat`, `eat coat`) reproduced exactly.

## Chapter 10 — Light, dark and the other senses
STATUS: PASS

- No issues. 10.1, 10.2 and 10.6 reproduced exactly.

## Chapter 11 — Regions
STATUS: PASS

- No issues. 11.3 and 11.5 reproduced exactly. Placing the kettle in the Grounds gave the quoted `analysis.thing-in-region` error at 142:3; restored and gate-clean.

## Chapter 12 — Ways that are closed, hidden or strange
STATUS: PASS

- No issues. 12.1, 12.4, 12.5 reproduced exactly. For 12.2 I removed the `up is blocked` line (line 102), walked up, stepped east and got the quoted death and `[The story has ended. RESTART, RESTORE or UNDO]`; put the line back, gate-clean.

## Chapter 13 — States
STATUS: PASS

- No issues. `read page` matches. The start-block experiment (13.4: add `change the iron grille to lifted`, walk up, take it out) gave the quoted Lantern Gallery text. The box's `sharpee compose relighting.story -o relighting.json` shows the grille with `"states": ["standing","lifted"]` and `"statesReversible": false`, as described. 13.5 and 13.7 (sluice, dial) are "from another story" and were not run.

## Chapter 14 — Reacting to the player: on and after
STATUS: PASS

- No issues. 14.1, 14.3, 14.4, 14.5, 14.6 (spectacles), 14.7, 14.8, 14.9 reproduced exactly. `sharpee test .` in `companion/chapter-14` printed the "Derived rule tests" list with entries of the form `kettle · on taking`.
- Not reachable, so not verified: the lens's `after the player inserting in the Great Lantern` (14.6); the stair is sealed in this chapter's story and the book prints no output for it. 14.6's dial example is from another story.

## Chapter 15 — What a clause can say and do
STATUS: PASS

- No issues. 15.1, 15.2, 15.4, 15.5, 15.7 reproduced exactly; the cake can be eaten in the Gate Court as 15.2 says. `sharpee test .` in `companion/chapter-15` lists `hand lamp · on lighting · refused no-such-word` and `seed cake · on eating · refused cake-watched`, as the box quotes.

## Chapter 16 — Conditions
STATUS: PASS

- No issues. 16.5 and 16.6 output reproduced exactly, in the order 16.8 asks for (third stack first). The IR's `conditions` holds `lantern-ready` as an `and` of two tests and `faded-page` with `"open": true`, as the box says.

## Chapter 17 — Choosing between outcomes
STATUS: PASS

- No issues. 17.3 (cistern), 17.4 (four pulls, cycling) and 17.5 (four examinations of the grille) reproduced exactly. `sharpee test .` in `companion/chapter-17` shows `spark page · on reading · when legible`, `… when learned`, `iron grille · after examining · the third time`, and the cistern's three arms as `◌` lines, as the box says.

## Chapter 18 — Counting, scoring and ending
STATUS: PASS

- No issues. 18.1 (fourth pull), 18.3 (`score` 5 of 25), 18.4 (rank message on lighting the candles), 18.8 (`score` 10 of 25) reproduced exactly. 18.6: made `~/repos/relighting-endings` with the copied story and the four start-block lines; both endings printed exactly as quoted (losing with the cracked lens; winning, with the rank line, after adding `change the lens to sound`). 18.7's vial is from another story and was not run.

## Chapter 19 — Time
STATUS: PASS

- No issues. 19.1 (down with the lit lamp, then `examine cistern`: same five closing lines in the same order, including the strike, the toll and the rank), 19.2 (creak after `light lamp`, sway after `east`), 19.5 (blue flame in the morning and afterwards) and 19.7 (`score` 15 of 35, with no bell line) reproduced. 19.4: eighty `wait`s from a new game gave the `light-turning` line on the 50th and the dusk ending on the 80th, worded as quoted. The IR's sequence has `"narration":"broadcast"` and the timer lists `creak, sway, strike`.
- Bell/timer closing lines differed from the book's only in which of the stated variants came up (accepted item 6).

## Chapter 20 — Phrases
STATUS: PASS

- No issues. 20.2 (three variants in order), 20.3 (Hobb's three sayings on three entries), 20.4 (the motto, with relative indentation 4/1/0 as printed), 20.5 (`examine bell`; my count was 1 where the book's was 3, a value of the run), 20.6 (Bell Stair with the grille sentence at the end) and 20.7 (Hobb deafened) reproduced.

## Chapter 21 — A thing's own words
STATUS: PASS

- No issues. 21.1 (lamp unlit / lit, candles before and after), 21.3 (Hobb's sentence joins the Lodge paragraph and he is still listed), 21.6 (`examine lens`) reproduced exactly. The IR's phrase table holds `hobb.present`, `hand-lamp.detail`, `candles.detail` and `candles.detail.2`.

## Chapter 22 — Changing the standard messages
STATUS: PASS

- No issues. `sharpee messages` printed a count line (`Message catalog: 885 overridable messages (en-US)`) and one very long line; the `taking-taken`, `going-too-dark`, `lighting-lit` and `taking-taken-from` entries read as quoted. 22.2, 22.3, 22.4, 22.7 (grille and kettle, before and after the page) and 22.10 reproduced exactly.

## Chapter 23 — New verbs
STATUS: PASS

- No issues. 23.2 (`spark`), 23.3 (`hush bell` in the Library), 23.4, 23.6, 23.8, 23.9 reproduced exactly. The IR's `sparking` entry has the fields the box lists, in the order listed (`name, patterns, constraints, musts, refusals, otherwise, scores, body, span`). 23.10 and 23.11 (`scrawl`, `shout`) are examples the story does not contain and were not run.

## Chapter 24 — New kinds of thing
STATUS: PASS

- No issues. Played the whole game to the winning ending and again with the lens left cracked to the losing one. 24.1, 24.2, 24.3, 24.4, 24.6, 24.7 and 24.10 output matches word for word; the Journeyman line arrived on a different award from the book's (the book says it follows whichever award reaches thirty). The IR's `wick` sparking clause has `"routing":"capability"`.

## Chapter 25 — Bending the standard grammar
STATUS: PASS

- No issues. Copied `relighting.story` and `synonyms.chord` from `chapter-25`. 25.2 (`sit on chair`, `exit`), 25.4 (`light lamp` before and after the page, `light lamp with taper`) and 25.7 (`quiet bell`; the Journeyman line arrived on `fix spectacles`, as the book says for this order) reproduced exactly, and the winning walk completes with the plain words. The IR's `grammarRemovals` has one entry (lighting) and `grammarExtensions` four (sparking, mending, hushing, entering).
- Not verified: 25.2's first block (`sit on chair` → `I don't understand that.`) belongs to "the story as chapter 24 left it"; the book gives no step to try it there and I did not go back.

## Chapter 26 — People who act
STATUS: PASS

- No issues. 26.1/26.4 (`examine tamsin`, her sorting, `Tamsin Vey leaves to the west.`), 26.2 (the wisp arriving and following), 26.3 (Hobb closing the press twice), 26.4.2 (the Bell Stair two turns after she comes through, then the push, then the pry bar), 26.5 (`Tamsin Vey enters from the east.`) and 26.6 (`talk to hobb`) reproduced exactly. The IR shows `passive` with `announces-movement` in her traits and her goals under `character.goals` with `pushing` / `push :target`.
- Ambiguity resolved (my reading worked): 26.5 says "Wait two turns more and then go north". I first waited three turns after Tamsin came through and arrived one step late (her push, not her remark); counting exactly two waits after the turn she enters gives the book's view. The book itself says "Go sooner or later and the same lines come on other turns", so this is not logged as a fault.
- 26.1.1 (Sam), 26.2.1 (cat, watchman) and 26.4.1 (Nell) are from other stories and were not run.

## Chapter 27 — Asking and telling
STATUS: PASS

- No issues. 27.1 (dimming, Tamsin), 27.1.1 (kettle), 27.1.2 (the bell refused before it rings; answered with the page handed over once it tolls; a second asking gives nothing more), 27.1.3 (`weather` with the override; `ask hobb for the kettle`), 27.2 (`consult`, `look up`), 27.3 (`talk to hobb`, `goodbye`, `talk to hobb`; `Tamsin Vey doesn't respond.`), 27.3.1 (Tamsin does not sort while being asked about brass) and 27.5 (`read hush page`) reproduced. Hobb's beats came round in a different order from the page's, which the chapter says to expect. The IR has `topics`, `greetings`, `manner` on Hobb, a `text` filter with `primary` and `aliases`, and `"mood":"calm"` under `character`.

## Chapter 28 — Conversations with a shape
STATUS: PASS

- No issues. Played the bargain accepted (28.1, 28.1.1, 28.2, 28.3), refused and reopened by the `price` row (28.3, 28.4, including the refusal before the thread has run, followed by Tamsin's sorting on the same turn), the brass row once/again/many times and the deflected `brackets` row (28.5.1, 28.5.3), Hobb's `last night` before and after `dimming` (28.5.2), and the silence line after two waits (28.6). Every quoted reply matches word for word. A silent turn after the first beat was answered with her price, as 28.1 says. With the page bought and read before the bell, `unbind grille` is still refused, as 28.7 says.

## Chapter 29 — Inner lives
STATUS: PASS

- No issues. 29.1.2 (Hobb rattled while the bell tolls), 29.2 (`last night` refused to a stranger), 29.2.1 (spectacles given unmended, `talk to hobb`, `last night` answered; Tamsin on magic before and after the bargain) reproduced exactly. After `hush bell`, Hobb's next two answers came with no manner sentence and later ones with a calm beat, as 29.1.2 describes. 29.3.1 (Nell and Tom) is from another story and was not run.

## Chapter 30 — Principles
STATUS: PASS

- No issues. 30.2 (`last night` withheld with the stock line), 30.3 (answered after the spectacles are given) and 30.6 (`ask hobb about spectacles`) reproduced exactly. The IR records the principle, the temperament and the `confided` mark under `character`. 30.4 (Cy) is from another story.

## Chapter 31 — More than one protagonist
STATUS: PASS

- No issues with the chapter's own steps. Reading the page and playing four turns (the fourth being `light lamp with taper`, as in 31.2) gave the quoted hand-over; `look`, `inventory` (variant "You aren't carrying anything.", accepted item 6), `north`, `take kettle`, `examine newspapers` and the `look` back in the Library all match.
- See chapter 32 for what the same hand-over prints when the fourth turn is a move.

## Chapter 32 — Machines
STATUS: PASS-WITH-ISSUES

- 32.3, 32.4, 32.5 reproduced exactly: first turn of the crank, a second turn with the seat empty (`You turn the shutter crank.` and nothing else), `push crank` with the pawl, `spark lantern` refused for the shutters, the final turn with the pawl and the shutters opening, and both `examine shutter` details. The game was won from the roof. The IR has a top-level `machines` list.
- ISSUE — (a) 32.6 "Build and try it" ("The last room of the winning walk now takes a little longer"), together with 31.2 ("The platform does not announce the change, and it does not describe the new room"). (b) The book has the reader play the winning walk, and says of the hand-over to Hobb only that the platform prints nothing about the new room. (c) On my walk the fourth turn after reading the spark page was `down` into the Undercroft with the lamp lit. The reply to that command put the Lodge's heading over the Undercroft's description and printed a malformed listing line:

      > down
      The Porter's Lodge
      Low vaults on squat pillars, running off under the whole of the hall. The air is cold and smells of stone. The steps go back up.

      Ansel can sees a crate here.

      In the lodge, an old man who was not asleep opens his eyes.

  The heading is the room Hobb is in, the paragraph is the room Ansel walked into, and "Ansel can sees a crate here." is not a sentence. Chapter 31's own example avoids this because its fourth turn (`light lamp with taper`) does not move Ansel. Not investigated further (NO R&D).

## Chapter 33 — Vehicles
STATUS: PASS

- No issues with the chapter's own text. 33.1 (`up` with the lens: the grille's phrase while it stands, the lens's phrase once it is lifted), 33.2.1 (`put lens in hoist` / `The book hoist pulls away.` / the Undercroft without the hoist; the hoist at the Library while the grille stands and at the Lantern Gallery once it is lifted; `put lens in lantern` taking it from the hoist, after which the hoist pulls away) and 33.2.2 (`enter hoist`, `look`) reproduced exactly. The game was won from the roof.
- The hand-over fault logged under chapter 32 appeared again on this walk, in the same place and for the same reason (fourth turn after the page was `down`): the heading `The Porter's Lodge` over the Undercroft's description, then `Ansel can sees a book hoist and a crate here.` Not counted as a second issue.
- 33.3–33.5 (tram, balloon, cart, barge) are from other stories and were not run.

## Chapter 34 — Open water and open ground
STATUS: PASS

- No issues. Won as far as the roof (the Lantern now prints its phrase and the story goes on), went down through the water gate to the Water Stair, and crossed with exactly the commands of 34.5: `enter skiff`, `steer east`, `wait`, `make sail`, `look`, `wait`, `wait`, `look`, `wait`. Both `look` blocks, the beacon-near line, `The skiff arrives at the Beacon Isle.` and the `spark beacon` ending with the Lamplighter line (score 45 before, 50 after) match word for word. On this walk the fourth turn after the page was a `wait`, and the hand-over to Hobb printed cleanly.
- 34.3's raft and 34.6's bottle are from another story and were not run.

## Chapter 35 — The opt-in systems
STATUS: PASS

- No issues. Typed `cellar.story` into `~/repos/cellar` and `yard.story` into `~/repos/yard` by hand; both gate-clean. Cellar, two plays: the hit (`You land a solid blow on the rat, dealing 1 damage!`), the miss (`You swing at the rat but miss!`), `Taken.` and `You have slain the rat!` all appear, worded as quoted; the order of blows differs from the page's, as the chapter says it will (accepted item 6). Yard: nine `wait`s give `You could eat.` on the second, the hungry line on the fourth, and `You have starved to death.` with the ending line on the ninth, exactly as printed.

## Chapter 36 — Sound, music and pictures
STATUS: PASS

- No issues. Copied `relighting.story` and `assets/` (three recordings, one picture) from `chapter-36`. 36.3 (the hand-over turn ending with the bell and the wisp's flinch), 36.4 (`light lamp` ending with `The wick takes with a small dry sound, like a page turned.` after the timer's line), and all three hearings of the pry bar in 36.5 reproduced exactly: from the Library (`Somewhere in the Hall, iron complains about iron.`), from the Cloister after a `wait` (`Iron shrieks on iron, close by, and stops.`), and walking north into the Bell Stair on the turn she pushes (the whole quoted block). Nothing plays in the terminal, as stated; the page is checked in chapters 37 and 40.
- 36.8 and 36.9 (gramophone, curtains) are from another story and were not run.

## Chapter 37 — The page the player sees
STATUS: PASS

- No issues. Copied `relighting.story`, `relighting.config.json` and `browser/` from `chapter-37`; gate-clean. `sharpee build relighting.story` printed the lines of 37.2 in the same order and shape, without the "Minted the story's ifid" line (as 37.9 says for the copied story); sizes and timing differ (item 3). `npx serve dist/web/relighting` installed `serve` on first use and printed `Accepting connections at http://localhost:3000`.
- With Playwright (`~/tools/playwright/run-ch37.js`): the page opens on the title and prologue with `data-theme="paper"`; Settings → Theme lists `Classic`, `Paper`, `Modern Dark`; after `read spark page` in the Library the side column shows `workings` / `spark: wakes a flame`; choosing Modern Dark and reloading keeps the theme (`localStorage` has `relighting-theme=modern-dark` beside `relighting-save-autosave` and `relighting-saves-index`), the transcript ends `[Session restored]`, the status line reads `LIBRARY`, and the panel still has its one line. Playing on, the panel reached the four lines in the book's order (spark, unbind, hush, mend).
- Recordings and picture: the page fetched `audio/catch.mp3` (206) on `light lamp`, `audio/toll.mp3` (206) when the bell began, `audio/lapping.mp3` (206) on `enter skiff`, and `img/lantern-lit.png` (200, decoded, 960 px wide) into `#sharpee-media` on `spark lantern`; the picture was gone after `spark beacon`. No failed request and no console error. Nothing could be heard (item 5).

## Chapter 38 — Test trees
STATUS: PASS

- No issues. Wrote `relighting.tests/manifest.json` and `mainline.json` (three skip cards) by hand in the stated layout; `sharpee test . --json --capture-output > records.txt` wrote one JSON record to a line, and the `take lamp` record has the fields of the quoted one (`"actualOutput":"You take it."`, `"turn":1`, `[SKIP]`). With the asserted `mainline.json`: `✓ opening-lodge` / `3 cards passing, 4 assertions passing`, exit 0. With `"contains": ["Taken."]` (38.6): the quoted failure, word for word, exit 1; restored. With `onward01.json` and `thecake1.json`: two lines, `6 cards passing, 9 assertions passing`, `5 commands (5 authored + 0 replayed), 1 restored at a fork`. Changing `cake-watched` to end "You decide against it." failed the `eat cake` card with the story's new sentence printed beneath; put back (file identical), tree green again.
- Full tree from `chapter-38`: seven lines with the seven names printed in 38.9, `182 cards passing, 275 assertions passing`, `181 commands (181 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134` with 81 lines beneath, `Endings reached: 2 / 3` naming `relighting.story:314 · night-falls (lose)`, `Rooms entered: 13 / 13`. Exit 0.
- Ambiguity resolved (my reading worked): the page's JSON listings come out of `pdftotext -layout` with widened indentation; I typed them at two spaces a level as 38.3 states, and the runner accepted them as canonical.
- Run note: `records.txt` from 38.4 is left in the project folder; the book does not say to remove it.

## Chapter 39 — Claims
STATUS: PASS

- No issues. `sharpee claim winning1` listed the seven lines as in 39.1. `sharpee claim thelodge --at 82` printed the ten facts quoted, twenty-three more, and the closing `Lock one with:` line. The lock command printed the quoted report (same rooms, things and verbs), wrote `relighting.claims.chord`, added `"claims"` to the manifest and `"locks"` to card `b7wicd1b` in `thebell1.json`; the claims file reads as printed in 39.3.
- `sharpee test .` then reported `claims: 1 of 1 held (seed 42)` / `0 walks` / the HELD line and its lock, as in 39.5. With the winning claim added by hand (without `put`) and its lock on `bjhmo3xt`: `2 of 2 held`, both locks held, turn 138. With the cake claim: `3 of 3 held`, `1 walk`, `17 states, 20 commands, stopped: all-claims-settled`, witness `take seed cake / north / eat seed cake`. With its rooms cut to the Lodge alone: `2 of 3 held, 1 unproven`, `161 states, 239 commands, stopped: max-depth-reached`, exit 0; Gate Court put back.
- Broken story (39.11, `change it to lifted` removed from the ward trait): the `unbind grille` card failed with the quoted State-assertion message, 35 cards failed in all, the run took four minutes and exited 1, and the report read `claims: 1 of 3 held, 2 unproven`, `3 walks`, both long walks `stopped: max-seconds`, and `lock "the ward on the stair can be lifted" … — NOT held there: the iron grille is standing`, with the winning lock `NOT held there: the story has not ended`. State and command counts of the two timed walks differ from the page's (the book says a walk stopped by the clock varies). Line put back (file identical); final report `claims: 3 of 3 held (seed 42)`, identical to the block in 39.11.
- Not tried, as instructed (accepted item 4): locking after the line's first `put`, and a `needs verbs` line naming `put`. 39.4's `raised` error, 39.6's lock pinned one card early, 39.7's missing-blank-line refusal and 39.9's shared-set file have no step and were not run.
- Run note (mine, not the book's): my first attempt at removing the trait line used the wrong indentation and removed nothing; that run was all green and is not counted.

## Chapter 40 — Publishing
STATUS: PASS

- No issues. `sharpee ifid generate` printed one identifier of the quoted shape. Set `story-version: 1.0.0` and added `publish-source: yes` to the header (after `storage-prefix:`; the book says its place does not matter); gate-clean. The terminal banner prints the four lines with the version last, as 40.2 says. `sharpee test .`: 182 cards passing, `claims: 3 of 3 held (seed 42)`.
- `sharpee publish relighting.story` printed the report of 40.4 line for line, including `shipped its source (`publish-source: yes`)`, `Shipped 1 import fragment(s) → imports.json`, no source-map line, the IFID `C24E29F8-C36B-4F55-9FE9-B6D75AE7133D` and the closing advice; sizes and timing differ (`2.4mb`, `0.8 MB`; item 3). `unzip dist/relighting.zip -d ../relighting-published` produced exactly the fourteen files listed in 40.5, with `index.html` at the top and no test tree, claims file, source map or `index-testing.html`.
- `npx serve .` inside `~/repos/relighting-published`, then Playwright (`~/tools/playwright/run-ch40.js`) played from the Lodge to the beacon: the page opens in the paper theme with `The Relighting` / `Story v1.0.0` / the description / `By The Sharpee Project` in the order 40.2 prints; the hand-over to Hobb and back, the Lantern, the crossing and `spark beacon` all read as in the terminal; the game ended at `Score: 50` with `You have risen to the rank of a Lamplighter.` Recordings and picture: `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` each answered 206, `img/lantern-lit.png` answered 200 and was shown on `spark lantern` and hidden after `spark beacon`. No failed request, no console error.
- 40.4's refusal for a story with no identifier has no step and was not provoked.

## Appendices A–G
Not executed (accepted item 7). The "Generated from" lines were not compared (item 8).

---

## Summary

Chapters at each status:

- PASS: 39 (chapters 1–31 and 33–40)
- PASS-WITH-ISSUES: 1 (chapter 32)
- BLOCKED: 0

DEVIATION entries: 0

Issues reported: 1.

1. **Chapter 32 (seen again in chapter 33), bearing on 31.2.** When the turn on which the `waking` timer expires is a turn on which Ansel walks into another room, the reply prints the heading of Hobb's room (`The Porter's Lodge`) over the description of the room Ansel entered, followed by a malformed listing line (`Ansel can sees a crate here.`). The book's own example of the hand-over uses a command that does not move Ansel and shows clean output, and 31.2 tells the reader that the platform "does not describe the new room". A literal reader following the winning walk the later chapters ask for can easily land on this.

Everything else the book quotes was reproduced word for word, apart from the differences the brief lists as accepted (version numbers, run-specific values, and text that varies on purpose).

What was not exercised, and why:

- Examples the book places in "another story" (the Den, the Yard, the Shed and so on) in chapters 6, 7, 9, 10, 12, 13, 14, 18, 21, 23, 24, 26, 29, 30, 33, 34 and 36. The book prints fragments, gives no step for them, and a literal reader has no file to run them in.
- Compiler error messages quoted as illustrations with a `probe.story` location, or with no step telling the reader to provoke them. Every error the book does tell the reader to provoke (chapters 4, 11, 38, 39) matched.
- Chord Writer steps (accepted item 1), and the two faults chapter 39 states (accepted item 4).
