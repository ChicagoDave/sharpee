# Execution log — The Chord Manual, documentation acceptance test

`sharpee --version` (after chapter 4's install): `Sharpee 5.6.2 · Chord 4.0.3`

Title page version line: `Chord 4.1.0, Sharpee 5.7.0`

## Setup

1. `npm config get prefix` → `/home/node/.local` (under home `/home/node`). PASS. `sharpee` was not installed before chapter 4.
2. Playwright + Chromium in `~/tools/playwright`: three-line launch/close script printed `chromium ok`. PASS.
3. `~/repos/book-test` holds `the-chord-manual-4.1.0.pdf` and `companion`. PASS.
4. `pdftotext version 22.12.0`, `pdftoppm version 22.12.0`. PASS.

Run notes (logged once):

- The book was read with `pdftotext -layout`. In that extraction one blank line inside a code block appears as two; one blank line was typed, and every line:column the compiler printed in chapter 4 then agreed with the book.
- Project folder: `~/repos/relighting` (chapter 1.7 says "Make a new folder called relighting"; it does not say where).
- **Play substitution:** no interactive session could be held, so every `sharpee play .` in this run was sent its commands on standard input, one to a line, ending with `/quit`.
- Version numbers in `--version` and `compose:` lines differ as accepted (item 8) and are not reported.

---

## Preface and "How to read this book"

STATUS: PASS — nothing to execute. Companion address noted (`https://sharpee.net/chord-manual/4.1.0/relighting/`); local folder used instead as briefed.

## Chapter 1 — The shape of a story file

STATUS: PASS

- Typed the listing into `relighting/relighting.story`, joining each `↪` row to the row above with one space (0.7).
- Ambiguity resolved (worked): 1.7 says to make the folder `relighting` here; 4.2 says again "Make a folder for The Relighting and put relighting.story in it". Read as the same folder.
- Supplementary (not an instructed step; done in a scratch copy outside the project): the two diagnostics quoted in 1.2 and 1.3 (`lex.tab-indent` at 5:1, `parse.unterminated-block` at 30:1 "opened at line 30") reproduce word for word.

## Chapter 2 — The story header

STATUS: PASS

- Opening text (2.4) and `about` (2.3) reproduce exactly (verified in chapter 4's play).
- Supplementary (scratch copy): 2.2's smallest-header opening reproduces exactly; `parse.header-inline-list`, `parse.story-title`, `parse.header-unknown-field` reproduce with the book's wording (line numbers depend on which file is broken, as expected).

## Chapter 3 — The player and the start

STATUS: PASS

- `examine me` reproduces exactly.
- Supplementary (scratch copy): `analysis.start-block-missing` (4:1), `analysis.player-target-not-playable` (30:3), the unplaced-player load error, and the stock "As good-looking as ever." all reproduce word for word.

## Chapter 4 — Build, play, read an error

STATUS: PASS

- 4.1 install: `added 78 packages`; npm ended with the install-script warning the book predicts (`esbuild`). `sharpee --version` → `Sharpee 5.6.2 · Chord 4.0.3` (expected for this run).
- 4.3 `--check`: gate-clean line matches apart from the version number.
- 4.4 play: opening and the five commands reproduce exactly.
- 4.5 (`playble`), 4.6 (`Loge`), 4.7 (description deleted, then restored): all three outputs match the book word for word, including line:column.
- 4.8: both folder errors match word for word.
- Under the Hood `sharpee compose relighting.story -o relighting.ir.json`: matches (`2 entities, 0 trait(s), 0 action(s)`). This leaves `relighting.ir.json` in the project folder, as the book's command does.

General note for Parts II onward: several chapters print story output for small examples "from another story" (a Den, a curtain, a bell jar, a trolley…). The book gives no complete story for them and no step to run them, so a literal reader cannot reproduce those blocks; they were not run and are not counted as issues. Each "Build and try it" story was copied from its companion folder (`relighting.story` only).

## Chapter 5 — Rooms and exits

STATUS: PASS — gate-clean; every output block (5.6, 5.7, 5.8) reproduces exactly. Story v0.2.0.

## Chapter 6 — Things

STATUS: PASS — gate-clean; all Relighting output blocks (6.1–6.8) reproduce exactly.

- Observation, not a mismatch with any printed block: with two things held, `inventory` prints `a wax taper, hand lamp` (no article on the second item). The book only prints the one-item case (`a wax taper`), which matches.

## Chapter 7 — Containers and supporters

STATUS: PASS — gate-clean; all Relighting output blocks (7.1–7.7) reproduce exactly.

## Chapter 8 — Doors, locks and keys

STATUS: PASS — gate-clean; 8.3 and 8.7 reproduce exactly. 8.4's `opens when unlocked` output is for a line the book says The Relighting leaves out; not run.

## Chapter 9 — What things can do: the trait words

STATUS: PASS — gate-clean; 9.1 (coat), 9.2, 9.3, 9.4 (rope), 9.5, 9.9 reproduce exactly.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS — gate-clean; 10.1, 10.2, 10.6 reproduce exactly.

## Chapter 11 — Regions

STATUS: PASS — gate-clean; 11.3 and 11.5 reproduce exactly. Kettle placed `in the Grounds`: error matches word for word including `142:3`; restored, gate-clean.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS — gate-clean; 12.1, 12.4, 12.5 reproduce exactly. 12.2: removed the `up is blocked` line as instructed, walked up and east — the parapet text and `[The story has ended. RESTART, RESTORE or UNDO]` print exactly as quoted — and restored the line; gate-clean again.

## Chapter 13 — States

STATUS: PASS — gate-clean (v0.3.0); `read page` block matches. Start-block experiment (13.4: add `change the iron grille to lifted`, walk up, take the line out) reproduces the Lantern Gallery block exactly; restored and gate-clean. Under the Hood `sharpee compose relighting.story -o relighting.json`: grille entry has `"states": ["standing","lifted"]` and `"statesReversible": false` beside it, as described.

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS — gate-clean; every Relighting block (14.1, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9) reproduces exactly. Under the Hood: `sharpee test .` inside companion `chapter-14` prints "Derived rule tests (ADR-356): 11 branches" with `✓ kettle · on taking`, as described.

## Chapter 15 — What a clause can say and do

STATUS: PASS — gate-clean; 15.1, 15.2, 15.4, 15.5, 15.7 reproduce exactly. Under the Hood: `sharpee test .` in companion `chapter-15` lists `hand lamp · on lighting · refused no-such-word` and `seed cake · on eating · refused cake-watched` as quoted.

## Chapter 16 — Conditions

STATUS: PASS — gate-clean; 16.5 and 16.6 blocks reproduce exactly.

- Ambiguity resolved (worked): the Under the Hood box says "Compile to IR and find lantern-ready under conditions" and gives no command; used chapter 4's `sharpee compose relighting.story -o relighting.ir.json`. `lantern-ready` is an `and` of two tests; `faded-page` has `"open": true`, as described.

## Chapter 17 — Choosing between outcomes

STATUS: PASS — gate-clean; 17.3, 17.4, 17.5 reproduce exactly. Companion `chapter-17` `sharpee test .` shows the three lines quoted in the Under the Hood box.

## Chapter 18 — Counting, scoring and ending

STATUS: PASS — gate-clean; 18.1 (fourth pull), 18.3, 18.4, 18.8 reproduce exactly. 18.6: copy kept in its own folder (`~/repos/relighting-endings`), start block edited as printed; both endings reproduce exactly.

## Chapter 19 — Time

STATUS: PASS — gate-clean; 19.1, 19.2, 19.4 (turn 50 warning, turn 80 ending), 19.5 (both flame blocks), 19.7 (`15 out of 35`) reproduce. Where a block ends with a bell line, mine ended with a bell/timer line in the same place (which one varies, as the book states). IR: sequence `narration` is `broadcast`, as described.

## Chapter 20 — Phrases

STATUS: PASS — gate-clean (v0.4.0); 20.2 (three variants, then round again), 20.3, 20.4 (motto keeps its relative indentation), 20.5, 20.6, 20.7 reproduce. `examine bell` printed "makes 1" where the book's recording has "makes 3": the number is the toll count at the moment of asking, so it depends on the turn.

## Chapter 21 — A thing's own words

STATUS: PASS — gate-clean; 21.1 (lamp, candles), 21.3 (Hobb's present sentence), 21.6 (lens) reproduce exactly apart from which bell/timer line ends the turn. IR phrase table holds `hobb.present`, `hand-lamp.detail`, `candles.detail`, `candles.detail.2`, as described.

## Chapter 22 — Changing the standard messages

STATUS: PASS-WITH-ISSUES — gate-clean; 22.2, 22.3, 22.4, 22.7, 22.10 story output reproduces exactly.

- **Issue (22.1 "Finding a message", and the Under the Hood box "IDs and aliases").** The book says of `sharpee messages`: "Each entry looks like this. `{"id":"if.action.taking.taken","alias":"taking-taken","template":"Taken."}`", advises "send the list to a file and search the file for a few words of what the game printed", and the box says "Each line of sharpee messages has an id beside the alias". What happened: the command prints two lines. Line 1 is `Message catalog: 885 overridable messages (en-US)`; line 2 is one JSON document 113,064 characters long beginning `{"schemaVersion":1,"locale":"en-US","messages":[{"id":"if.action.about.about_compact","alias":"about-about-compact","template":"{verbatim:title} v{version} by {verbatim:author}"},…`. There is not one entry per line, so searching the saved file for "grue" with an ordinary text search returns the entire list as a single match. The entries themselves (count 885; `taking-taken`, `going-too-dark`, `lighting-lit`, `taking-taken-from`) are word for word as quoted. The book does not mention the first line or the enclosing `{"schemaVersion"…"messages":[…]}` wrapper.

## Chapter 23 — New verbs

STATUS: PASS — gate-clean; 23.2, 23.3, 23.4, 23.6, 23.8, 23.9 reproduce (the `no-such-word` variant shown depends on how many refusals came before, as chapter 20 states). `shout` answers "I don't understand that." as the book says of an action The Relighting does not use.

## Chapter 24 — New kinds of thing

STATUS: PASS — gate-clean; 24.1, 24.2, 24.3, 24.4, 24.6, 24.7, 24.10 reproduce. Full winning walk ends at 50 points and "the rank of a Lamplighter"; Journeyman came on `unbind grille` in the book's order. Replayed with the lens left cracked: the losing ending prints. IR: `wick`'s sparking clause has `"routing": "capability"`.

## Chapter 25 — Bending the standard grammar

STATUS: PASS — `sit on chair` in chapter 24's story: "I don't understand that." as quoted. Copied `relighting.story` and `synonyms.chord`; gate-clean; 25.1, 25.2, 25.4 (all three `light lamp` blocks), 25.7 reproduce; Journeyman came on `fix spectacles` as the book says. IR: `grammarRemovals` has 1 entry (lighting), `grammarExtensions` 4 (sparking, mending, hushing, entering).

## Chapter 26 — People who act

STATUS: PASS — gate-clean (v0.5.0); 26.2 (wisp arrives, "The wisp follows you."), 26.3 (Hobb closes the press, twice), 26.4 (Tamsin's rounds), 26.4.2 (Bell Stair two turns after she passes: line for line as printed), 26.5, 26.6 (`talk to hobb` → "Hobb doesn't respond.") reproduce. Only the cycling `wait` text and bell line differ by turn, as stated.

## Chapter 27 — Asking and telling

STATUS: PASS — gate-clean; 27.1, 27.1.1, 27.1.2 (both bell answers; Hobb gives the hush page once), 27.1.3 (override text; "Hobb doesn't seem inclined to hand over the kettle."), 27.2, 27.3, 27.5 reproduce. Which of Hobb's three beats precedes an answer depends on how many answers came before (the book states the beats are used in turn). Tamsin, asked about brass, stayed put for three turns (27.3.1). IR: `topics` on Hobb and the grimoire with `filter.kind: text`, `primary`, `aliases`; `mood: calm` under `character`.

## Chapter 28 — Conversations with a shape

STATUS: PASS — gate-clean; 28.1, 28.1.1, 28.2 (`yes`, `say maybe`), 28.3 (`no`, then the concluded thread), 28.4 (all three price blocks; the refusal lets Tamsin take her rounds step on the same turn), 28.5.1, 28.5.2, 28.6 reproduce exactly.

- Observation, not a mismatch with any printed block: with a conversation already open (after `ask tamsin about brass`), `talk to tamsin` printed "Tamsin Vey doesn't respond." Asked as the first thing said to her, it prints her greeting ("You'll be the one the old man let in," …). The book prints neither case for chapter 28.

## Chapter 29 — Inner lives

STATUS: PASS — gate-clean; 29.1.2 (rattled beat while the bell tolls), 29.2 (narrow refusal), 29.2.1 (spectacles given unmended, then the last-night answer; both of Tamsin's answers about magic) reproduce.

## Chapter 30 — Principles

STATUS: PASS — gate-clean; 30.2 (the confidence kept: "Hobb gives that some thought, and gives it back."), 30.3 (told after the spectacles), 30.6 (`ask hobb about spectacles`) reproduce. IR `character` holds `principles`, `temperaments` and the `knows` entry with `"confided": true`.

## Chapter 31 — More than one protagonist

STATUS: PASS — gate-clean; 31.2 (role passes to Hobb on the fourth turn after the page, on `light lamp with taper` as recorded), 31.3 (`take kettle`), 31.3.2 (`north`), 31.4 (newspapers, then `look` in the Library with the wisp) reproduce. `inventory` as Hobb printed "Your pockets are empty." (one of the three variants the book states).

## Chapter 32 — Machines

STATUS: PASS — gate-clean (v0.6.0); 32.3 (first turn; turn with the seat empty; push), 32.4 (pawl and shutters open), 32.5 (`spark lantern` refused by the shutters) reproduce exactly; the full walk still wins.

## Chapter 33 — Vehicles

STATUS: PASS — gate-clean; 33.1 (`up` with the lens: grille's phrase while it stands, lens's phrase after), 33.2.1 (hoist to the Library before the grille is lifted, to the Lantern Gallery after; both `look` blocks; `put lens in lantern` with "The book hoist pulls away."), 33.2.2 (`enter hoist`, `look`) reproduce exactly.

## Chapter 34 — Open water and open ground

STATUS: PASS — gate-clean; won to the roof (Lantern now prints its phrase and the score stands at 45), through the water gate, and across. 34.4 and 34.5 (`enter skiff`, `steer east`, `wait`, `make sail`, both `look` views with their bands, "The skiff arrives at the Beacon Isle."), 34.7 (`spark beacon`, Lamplighter, ending) reproduce exactly apart from the cycling `wait` text.

## Chapter 35 — The opt-in systems

STATUS: PASS — typed `cellar/cellar.story` and `yard/yard.story` in folders of their own; both gate-clean. Cellar: `attack rat` / `take poker` / `attack rat with poker` printed exactly the three replies in the book (the fight is rolled afresh each play; this run happened to match). Yard: "You could eat." on the first wait, "You are hungry now…" on the third, "You have starved to death." on the eighth, as printed.

- Ambiguity resolved (worked): in the cellar listing `Nobody` is printed four spaces in from `authors:`, where every other listing uses two. Typed as printed; the compiler accepted it.

## Chapter 36 — Sound, music and pictures

STATUS: PASS — copied `relighting.story` and the `assets` folder (three recordings, one picture); gate-clean. 36.3 (the wisp's flinch on the turn Hobb takes the role), 36.4 (`light lamp` ends "The wick takes with a small dry sound, like a page turned."), 36.5 (in the Bell Stair on the turn she pushes: "Iron shrieks on iron, close by, and stops."; waiting in the Library: "Somewhere in the Hall, iron complains about iron.") reproduce. Nothing plays in the terminal, as stated.

## Chapter 37 — The page the player sees

STATUS: PASS — copied `relighting.story`, `relighting.config.json` and `browser/`; gate-clean (v0.7.0). `sharpee build relighting.story` printed the block in 37.2 line for line apart from sizes and timing (`game.js 2.4mb`, `Done in 83ms`, `2425.8 KB`) and, as 37.9 says, without the "Minted the story's ifid" line. `npx serve dist/web/relighting` installed `serve@14.2.8` on first use and served at `http://localhost:3000`.

Playwright (Chromium, from `~/tools/playwright`):

- Page opens on the title and prologue; `data-theme="paper"`.
- Played to the Library and read the spark page: a column opened holding `workings` / `spark: wakes a flame`. It was hidden before.
- Settings → Theme lists Classic, Paper, Modern Dark. Chose Modern Dark, reloaded: theme still `modern-dark`; `localStorage` holds `relighting-theme=modern-dark` beside `relighting-saves-index` and `relighting-save-autosave`.
- Full walk on the page: `audio/catch.mp3` fetched on `light lamp`, `audio/toll.mp3` when the bell began, `img/lantern-lit.png` (960×600, rendered in `#sharpee-media`) on `spark lantern`, `audio/lapping.mp3` on `enter skiff`. No failed request, no page error. Panel at the end, in the order read: spark, unbind, hush, mend, with the glosses printed in 37.4.

## Chapter 38 — Test trees

STATUS: PASS-WITH-ISSUES

- Wrote `relighting.tests/manifest.json` and `mainline.json` by hand (keys alphabetical, two spaces, one element per line). 38.4 `sharpee test . --json --capture-output > records.txt`: the `card0003` record matches the book's sample field for field (`"actualOutput":"You take it."`).
- 38.6 `sharpee test .` with the asserting cards: `✓ opening-lodge` / `3 cards passing, 4 assertions passing`, exit 0, as printed.
- **Issue (38.6 "Running the tree").** The book says: "Here is the same tree after the take lamp card was made to expect Taken., which the story does not say." and prints `✗ opening-lodge — take lamp: Output does not contain "Taken."`. The chapter's `take lamp` card is an `exact` assertion (38.5). Changing its expected line to `"Taken."` printed:
  ```
  ✗ opening-lodge — take lamp: Output did not match expected
      You take it.
  2 cards passing, 3 assertions passing, 1 card failing, 1 assertion failing
  ```
  The first line's wording differs from the book's (the counts line and the echoed output agree; exit code 1 as stated). The book's wording appears only if the card is also changed from `exact` to `contains`, which the text does not say to do (tried once to confirm: that prints `Output does not contain "Taken."` exactly).
- 38.7: added `onward01.json` and `thecake1.json` together: `2 line(s)`, `✓ opening-lodge`, `✓ lodge · eat cake`, as printed.
- 38.10: changed `cake-watched`'s last sentence to "You decide against it.": `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` with the story's line beneath; restored, tree passes again.
- Replaced the folder with `chapter-38/relighting.tests`: seven lines with the names printed, `183 cards passing, 275 assertions passing`, `182 commands (182 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134` with 81 lines beneath, `Endings reached: 2 / 3`, `relighting.story:314 · night-falls (lose)`, `Rooms entered: 13 / 13` — all exactly as the book prints.

## Chapter 39 — Claims

STATUS: PASS-WITH-ISSUES

- 39.1: `sharpee claim winning1` lists the seven lines exactly as printed. `sharpee claim thelodge --at 82`: the ten facts printed, twenty-three more, and the closing `Lock one with:` line, as described.
- 39.2: the lock command's report, the three `Written:` lines and `Pinned "the ward on the stair can be lifted" on card b7wicd1b.` match word for word; `relighting.claims.chord`, the manifest's `claims` key and the card's `locks` key are as printed in 39.2–39.3.
- 39.5: claims section `1 of 1 held`, `0 walks`, HELD and lock lines as printed.
- 39.7: added "the story can be won" by hand and its lock on card `bjhmo3xt` (in `winning1.json`): `2 of 2 held`, both locks "held there", turn 138, as printed.
- 39.8/39.11: added "the cake can be eaten" by hand: `3 of 3 held`, `1 walk`, `17 states, 20 commands, stopped: all-claims-settled`, witness `take seed cake / north / eat seed cake` — the closing block of 39.11 word for word. With `needs rooms: the Lodge` alone: UNPROVEN, `161 states, 239 commands, stopped: max-depth-reached`, as the chapter describes; Gate Court put back.
- 39.9: `--verbose` prints `Claims budget per walk: 120s, 500000 states, depth 80`.
- 39.11 last step: removed `change it to lifted` from the ward trait. First failure line matches the book word for word (`✗ opening-lodge — unbind grille: State assertion failed: the iron grille is lifted. the iron grille is "standing", expected "lifted"`); 35 cards failing in all, as the book counts; exit 1; lock line `— NOT held there: the iron grille is standing` as printed. Line restored; tree back to 183 passing and 3 of 3 held.
- **Issue, low severity (39.6 "When a lock breaks" against 39.11 "Build and try it").** 39.6 prints the claims section for the broken story as `claims: 0 of 1 held, 1 unproven (seed 42)` / `1 walk`, and says the runner "gave up after two minutes". 39.11 has the reader break the story *last*, after all three claims are in the file. Doing the steps in that order printed instead:
  ```
  claims: 1 of 3 held, 2 unproven (seed 42)
  3 walks
    under the set of "the ward on the stair can be lifted": 6 rooms, 20 things, 24 verbs — 7849 states, 43334 commands, stopped: max-seconds
    under the set of "the story can be won": 10 rooms, 25 things, 21 verbs — 11927 states, 35376 commands, stopped: max-seconds
    under the set of "the cake can be eaten": 2 rooms, 3 things, 2 verbs — 17 states, 20 commands, stopped: all-claims-settled
  UNPROVEN  the ward on the stair can be lifted — not reached by any line; the walk stopped at max-seconds after 7849 states; …
  UNPROVEN  the story can be won — not reached by any line; the walk stopped at max-seconds after 11927 states; …
  HELD  the cake can be eaten — not reached by any line; by walk at depth 3: take seed cake / north / eat seed cake
    lock "the ward on the stair can be lifted" at line thelodge "opening-lodge" at turn 82 — NOT held there: the iron grille is standing
    lock "the story can be won" at line thelodge "opening-lodge" at turn 138 — NOT held there: the story has not ended
  ```
  and the run took four minutes (two walks stopped by the clock), not two. Nothing here contradicts what the chapter teaches; the printed block simply belongs to an earlier moment (one claim in the file) than the one the step list reaches. State and command counts differ from the book's because the walk was stopped by the clock, which the book says varies.
- Not run, as briefed: locking after the line's first `put`; `put` in a `needs verbs` line. 39.4's `claims.state-unknown` refusal and 39.7's canonical-form refusal are illustrations with no step; not run.

## Chapter 40 — Publishing

STATUS: PASS

- `sharpee ifid generate` printed one identifier of the printed shape (`7DFC2E25-CBDA-4C7B-8FFD-63E1A8EDB915`; a value that belongs to the run).
- Set `story-version: 1.0.0` and added `publish-source: yes` under it; gate-clean. `sharpee test .`: 183 cards passing, `claims: 3 of 3 held (seed 42)`.
- `sharpee publish relighting.story`: the block in 40.4 line for line apart from sizes and timing (`game.js 2.4mb`, `Done in 50ms`, `2425.8 KB`, `dist/relighting.zip (0.8 MB)`); `IFID: C24E29F8-C36B-4F55-9FE9-B6D75AE7133D`.
- `unzip dist/relighting.zip -d ../relighting-published`: exactly the fourteen files listed in 40.5; no `game.js.map`, no `index-testing.html`, no test tree, no claims file.
- Terminal opening shows the four lines with `Story v1.0.0` last, as 40.2 says.
- `npx serve .` inside the unzipped folder; Playwright played from the Lodge to the Beacon Isle: page shows `Story v1.0.0` under the title; `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` and `img/lantern-lit.png` all loaded (no failed request, no page error); the picture was on the page from `spark lantern` through the crossing and was gone after `spark beacon`; the story ended in the win; the workings panel held its four lines.
- Ambiguity resolved (worked): 40.3 says the place of `publish-source: yes` among the header fields does not matter; put directly under `story-version:`.

Appendices A–G: read, not run (accepted item 7).

---

## Totals

| Status | Chapters |
|---|---|
| PASS | 37 (1–21, 23–37, 40) |
| PASS-WITH-ISSUES | 3 (22, 38, 39) |
| BLOCKED | 0 |

DEVIATION entries: **0**. No chapter was skipped, and no change was made to keep the story gate-clean.

Issues a literal reader meets (3):

1. **Chapter 22, 22.1 and its Under the Hood box** — `sharpee messages` prints a header line and then the whole catalogue as one 113,064-character line of JSON, not one entry per line; the book's "search the file for a few words" and "Each line of sharpee messages has an id beside the alias" do not hold as written.
2. **Chapter 38, 38.6** — the failure quoted for the `take lamp` card expecting "Taken." (`Output does not contain "Taken."`) is what a `contains` assertion prints; the chapter's card is `exact`, which prints `Output did not match expected`.
3. **Chapter 39, 39.6 against 39.11** (low severity) — the broken-lock claims block is printed for a file with one claim; the step list breaks the story after all three claims exist, so the reader sees `1 of 3 held, 2 unproven`, `3 walks`, a second "NOT held there" lock line, and a four-minute run.

Ambiguities resolved without trouble (logged in place): where to make the `relighting` folder (1.7/4.2); no command given for "Compile to IR" (16, Under the Hood); the deeper-indented `Nobody` in the cellar listing (35.2); where `publish-source:` goes (40.3).

Not reproducible by a literal reader and not counted: output blocks for examples "from another story" (chapters 6, 7, 9, 10, 13, 14, 18, 19, 21, 23, 24, 26, 29, 30, 33, 34, 36), for which the book gives no complete story and no step.

Against "clean" (every chapter PASS, zero BLOCKED, zero deviations): **not clean** — three chapters are PASS-WITH-ISSUES; zero BLOCKED; zero deviations.
