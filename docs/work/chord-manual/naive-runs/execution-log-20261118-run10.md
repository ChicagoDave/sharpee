# Execution log — The Chord Manual acceptance run

`sharpee --version`: `Sharpee 5.6.3 · Chord 4.0.3`
Title page version line: `Chord 4.1.0, Sharpee 5.7.0`

## Setup

1. `npm config get prefix` → `/home/node/.local` (under home). OK.
2. Playwright in `~/tools/playwright`: three-line script launched Chromium (159.0.8154.6) and closed it. OK.
3. `~/repos/book-test` holds `the-chord-manual-4.1.0.pdf` and `companion/`. OK.
4. `pdftotext -v` and `pdftoppm -v` both print `version 22.12.0`. OK.

Project folder: `~/repos/relighting`.

Note (logged once): `sharpee play .` cannot be held interactively here; throughout this run commands are sent on standard input, one to a line, ending with `/quit`. Consequence visible in every transcript: the bare `>` prompt the book shows before the first command is not shown separately.

## Preface and "How to read this book"
STATUS: PASS — read; nothing to execute.

## Chapter 1 — The shape of a story file
STATUS: PASS
- Typed the listing into `~/repos/relighting/relighting.story` (↪ rows joined with one space). No issues.

## Chapter 2 — The story header
STATUS: PASS
- Nothing is built in this chapter ("Nothing in this chapter is built"). The `about` output (2.3) and the opening (2.4) were reproduced word for word during chapter 4.

## Chapter 3 — The player and the start
STATUS: PASS
- `examine me` output reproduced exactly in chapter 4. The four error messages in 3.4 are shown to be read; the chapter gives no step to produce them, so they were not run.

## Chapter 4 — Build, play, read an error
STATUS: PASS
- 4.1 install: ended with the install-script warning the book predicts. `sharpee --version` → `Sharpee 5.6.3 · Chord 4.0.3` (accepted, item 8).
- 4.3, 4.4, 4.5, 4.6, 4.7, 4.8 and the "What compose writes" box: every quoted line reproduced exactly (version numbers and the loading path aside).

## Chapter 5 — Rooms and exits
STATUS: PASS
- 5.8: copied `chapter-05/relighting.story`; gate-clean. 5.6, 5.7 and 5.8 output blocks reproduced exactly. (5.4's `> down` block belongs to the Den/Attic illustration, which is not in the story; not run.)

## Chapter 6 — Things
STATUS: PASS
- 6.8: copied `chapter-06/relighting.story`; gate-clean. Every output block (6.1, 6.2, 6.3, 6.6, 6.7, 6.8) reproduced exactly. (6.7's curtain block is "from another story"; not run.) The "examine everything" step found only unkept promises of the kind the section says to expect.

## Chapter 7 — Containers and supporters
STATUS: PASS
- 7.7: copied `chapter-07/relighting.story`; gate-clean. Output blocks of 7.1, 7.2, 7.3, 7.4, 7.6, 7.7 reproduced exactly. (7.5's bell jar is "from another story"; not run.)

## Chapter 8 — Doors, locks and keys
STATUS: PASS
- 8.7: copied `chapter-08/relighting.story`; gate-clean. Output blocks of 8.3 and 8.7 reproduced exactly. (8.4's `opens when unlocked` and 8.6's key ring are stated not to be in The Relighting; not run.)

## Chapter 9 — What things can do: the trait words
STATUS: PASS
- 9.9: copied `chapter-09/relighting.story`; gate-clean. Output blocks of 9.1 (inventory, coat), 9.2, 9.3, 9.4 (rope), 9.5, 9.9 reproduced exactly. (Hat/cap, trolley, tassel and wireless examples are not in The Relighting; not run.)

## Chapter 10 — Light, dark and the other senses
STATUS: PASS
- 10.6: copied `chapter-10/relighting.story`; gate-clean. Output blocks of 10.1, 10.2, 10.6 reproduced exactly. (10.5's tin is "from another story"; not run.)

## Chapter 11 — Regions
STATUS: PASS
- 11.7: copied `chapter-11/relighting.story`; gate-clean. Output blocks of 11.3 and 11.5 reproduced exactly. Kettle placed `in the Grounds` (line 142): error text matches the book exactly; restored, gate-clean.

## Chapter 12 — Ways that are closed, hidden or strange
STATUS: PASS
- 12.5: copied `chapter-12/relighting.story`; gate-clean. Output blocks of 12.1, 12.4, 12.5 reproduced exactly. 12.2: removed the `up is blocked` line (line 102), walked up, `east` printed the parapet text and `[The story has ended. RESTART, RESTORE or UNDO]` exactly; line put back, gate-clean. (12.3's Study/Vault is not in The Relighting; not run.)

## Chapter 13 — States
STATUS: PASS
- 13.8: copied `chapter-13/relighting.story`; gate-clean. `read page` block reproduced exactly. 13.4 experiment (extra start-block line added, then removed): `up` output matches exactly. "Where a state lives" box: `sharpee compose relighting.story -o relighting.json` wrote the IR; the grille's entry has `"states": ["standing","lifted"]` and `"statesReversible": false` beside it, as described. (13.5 sluice, 13.7 dial: other stories; not run.)

## Chapter 14 — Reacting to the player: on and after
STATUS: PASS
- 14.9: copied `chapter-14/relighting.story`; gate-clean. Output blocks of 14.1, 14.3, 14.4, 14.5, 14.6 (spectacles), 14.7, 14.8, 14.9 reproduced exactly. (14.6's `set dial to high` is the other story's dial; the lens clause cannot be reached while the grille stands, as the text implies.)
- "The phases of an action" box: ran `sharpee test .` inside `companion/chapter-14` as told; it printed a section headed `Derived rule tests (ADR-356): 11 branches` listing clauses by owner and gerund, including `✓ kettle · on taking`. As described.

## Chapter 15 — What a clause can say and do
STATUS: PASS
- 15.7: copied `chapter-15/relighting.story`; gate-clean. Output blocks of 15.1, 15.2, 15.4, 15.5, 15.7 reproduced exactly.
- "What the test runner derives" box: `sharpee test .` in `companion/chapter-15` lists `✓ hand lamp · on lighting · refused no-such-word` and `✓ seed cake · on eating · refused cake-watched` under `Derived rule tests`. As described.

## Chapter 16 — Conditions
STATUS: PASS
- 16.8: copied `chapter-16/relighting.story`; gate-clean. Output blocks of 16.5 and 16.6 reproduced exactly. "A condition is a tree" box: `lantern-ready` is under `conditions` as an `and` with two operands; `faded-page` is marked `"open": true`. As described.

## Chapter 17 — Choosing between outcomes
STATUS: PASS
- 17.7: copied `chapter-17/relighting.story`; gate-clean. Output blocks of 17.3, 17.4, 17.5 reproduced exactly. "A branch is a test" box: `sharpee test .` in `companion/chapter-17` shows the quoted lines (`spark page · on reading · when legible` / `when learned`, `iron grille · after examining · the third time`) and the cistern's three arms as `◌ … SKIPPED subject-unreachable`. As described.

## Chapter 18 — Counting, scoring and ending
STATUS: PASS
- 18.8: copied `chapter-18/relighting.story`; gate-clean. Output blocks of 18.1 (fourth pull), 18.3 (`score` 5 of 25), 18.4, 18.8 (`score` 10 of 25) reproduced exactly.
- 18.6: copy kept in new folder `~/repos/relighting-endings` with the three start-block lines; both endings (cracked lens / `change the lens to sound` added) reproduced exactly. (18.7's vial is another story; not run.)

## Chapter 19 — Time
STATUS: PASS-WITH-ISSUES
- 19.7: copied `chapter-19/relighting.story`; gate-clean. Output blocks of 19.1, 19.2, 19.5 and 19.7 (`score` 15 of 35) reproduced; the only differences are which bell line ends a turn (accepted, item 6). "Who is listening" box: IR lists timer `waking` with states `creak, sway, strike`, and the sequence has `"narration":"broadcast"`. As described.
- ISSUE — 19.4 "A sequence". Book says: "At turn fifty the player is warned" and "Thirty turns after that … the day is over", and that the player "need only wait". What happened: from a fresh start, typing nothing but `wait`, the warning `The light has turned. The shadows in the Hall have begun to lean east.` was printed in reply to the **49th** command, and `Dusk comes down on Lanternhall and finds the Lantern dark. The blue flame in the porter's lodge goes yellow, and then goes out.` / `[The story has ended. RESTART, RESTORE or UNDO]` in reply to the **79th**. The wording of both blocks matches the book exactly; the count is one command earlier than a reader counting "fifty turns" and "eighty turns" would expect, and the book does not say how turns are numbered.

## Chapter 20 — Phrases
STATUS: PASS
- 20.7: copied `chapter-20/relighting.story`; gate-clean. Output blocks of 20.2, 20.3, 20.4 (motto indentation 4/1/0 relative, as printed), 20.5, 20.6, 20.7 reproduced. Differences only in which bell line ends the turn and in the bell count (`By your count that makes 1` here, `3` in the book — the count depends on turns taken); accepted, item 6.

## Chapter 21 — A thing's own words
STATUS: PASS
- 21.6: copied `chapter-21/relighting.story`; gate-clean. Output blocks of 21.1, 21.3, 21.6 reproduced exactly (bell-line variants aside, item 6). (21.4's cat is another story; not run.)

## Chapter 22 — Changing the standard messages
STATUS: PASS
- 22.1: `sharpee messages` prints `Message catalog: 885 overridable messages (en-US)` and then the list as one line; the four entries the chapter quotes (`taking-taken`, `going-too-dark`, `lighting-lit`, `taking-taken-from`) are present verbatim.
- 22.10: copied `chapter-22/relighting.story`; gate-clean. Output blocks of 22.2, 22.3, 22.4, 22.7, 22.10 reproduced exactly.

## Chapter 23 — New verbs
STATUS: PASS
- 23.13: copied `chapter-23/relighting.story`; gate-clean. Output blocks of 23.2, 23.3, 23.4, 23.6, 23.8, 23.9 reproduced exactly (cycling `no-such-word` variant and bell lines aside, item 6). Each working tried before and after its page. (23.10 scrawling and 23.11 shouting are stated examples not in The Relighting; not run.)

## Chapter 24 — New kinds of thing
STATUS: PASS
- 24.10: copied `chapter-24/relighting.story`; gate-clean. Played to the win and, a second time, with the lens left cracked (loss). Output blocks of 24.1, 24.2, 24.3, 24.4, 24.6, 24.7, 24.10 reproduced exactly (bell-line variants aside, item 6). "Capability" box: the `wick` trait's sparking clause in the IR reads `"routing":"capability"`. (24.8's brazier is another story; not run.)

## Chapter 25 — Bending the standard grammar
STATUS: PASS
- 25.2: with chapter 24's story, `sit on chair` → `I don't understand that.` as quoted.
- 25.7: copied `relighting.story` and `synonyms.chord` from `chapter-25`; gate-clean. Output blocks of 25.1, 25.2, 25.4, 25.7 reproduced exactly; the Journeyman line came on `fix spectacles`, as the chapter says. Winning walk with the plain words completed.

## Chapter 26 — People who act
STATUS: PASS
- 26.5: copied `chapter-26/relighting.story`; gate-clean. Output blocks of 26.1 (Tamsin), 26.2 (wisp), 26.3, 26.4, 26.4.2, 26.5, 26.6 reproduced exactly (cycling `wait` and bell variants aside, item 6). (Sam, the cat/watchman and Nell are other stories; not run.)

## Chapter 27 — Asking and telling
STATUS: PASS
- 27.5: copied `chapter-27/relighting.story`; gate-clean. Output blocks of 27.1, 27.1.1, 27.1.2, 27.1.3 (overridden reply and `ask hobb for the kettle`), 27.2, 27.3, 27.5 reproduced exactly (manner beats and bell lines vary as the chapter says). `talk to tamsin` → `Tamsin Vey doesn't respond.` as stated.

## Chapter 28 — Conversations with a shape
STATUS: PASS
- 28.7: copied `chapter-28/relighting.story`; gate-clean. Played the bargain accepted, refused and re-opened, and the price asked first. Output blocks of 28.1, 28.1.1, 28.2, 28.3, 28.4, 28.5.1, 28.5.2, 28.6 reproduced exactly (Hobb's manner beats vary as chapter 27 says).

## Chapter 29 — Inner lives
STATUS: PASS
- 29.4: copied `chapter-29/relighting.story`; gate-clean. Output blocks of 29.1.2, 29.2, 29.2.1 (Hobb and both of Tamsin's magic answers) reproduced exactly (manner beats vary as chapter 27 says). After the bell was hushed, Hobb's first three answers came with no manner sentence and then the kettle beat returned, as 29.1.2 describes. (29.3.1's Nell and Tom are another story; not run.)

## Chapter 30 — Principles
STATUS: PASS
- 30.6: copied `chapter-30/relighting.story`; gate-clean. Output blocks of 30.2, 30.3, 30.6 reproduced exactly (manner beats vary as chapter 27 says). (30.4's Cy is another story; not run.)

## Chapter 31 — More than one protagonist
STATUS: PASS
- 31.6: copied `chapter-31/relighting.story`; gate-clean. Output blocks of 31.2, 31.3, 31.3.2, 31.4 reproduced exactly; the empty inventory read `Your pockets are empty.` (one of the stated variants, item 6). Afterwards Hobb handed the hush page over on being asked about the bell, as 31.4 says.

## Chapter 32 — Machines
STATUS: PASS
- 32.6: copied `chapter-32/relighting.story`; gate-clean. Played the whole winning walk. Output blocks of 32.3, 32.4, 32.5 reproduced exactly; crank turned before and after seating the lens with the refused spark in between, then the win.

## Chapter 33 — Vehicles
STATUS: PASS
- 33.6: copied `chapter-33/relighting.story`; gate-clean. Output blocks of 33.1, 33.2.1, 33.2.2 reproduced exactly. With the grille standing the stair gave the grille's phrase and the loaded hoist went to the Library; with the grille lifted the stair gave the lens phrase and the loaded hoist went to the Lantern Gallery. Played on to the win. (Tram, balloon, cart and barge are other stories; not run.)

## Chapter 34 — Open water and open ground
STATUS: PASS
- 34.8: copied `chapter-34/relighting.story`; gate-clean. Won as far as the roof, went through the water gate and across. Output blocks of 34.4, 34.5, 34.7 reproduced exactly (cycling `wait` variants aside, item 6). (34.3's raft and 34.6's bottle are other stories; not run.)

## Chapter 35 — The opt-in systems
STATUS: PASS
- 35.5: typed `cellar.story` into new folder `~/repos/cellar` and `yard.story` into `~/repos/yard`; both gate-clean.
- Cellar: `attack rat` → `You swing at the rat but miss!` (the miss line the chapter quotes; rolls differ per play, item 6), `take poker` → `Taken.`, `attack rat with poker` → `You have slain the rat!`.
- Yard: `You could eat.` on the first `wait`, `You are hungry now, and thinking about the loaf.` on the third, `You have starved to death.` and the ending line on the eighth, exactly as stated.

## Chapter 36 — Sound, music and pictures
STATUS: PASS
- 36.10: copied `relighting.story` and the `assets` folder (`audio/catch.mp3`, `audio/lapping.mp3`, `audio/toll.mp3`, `img/lantern-lit.png`) from `chapter-36`; gate-clean. Output blocks of 36.3, 36.4, 36.5 (in the Bell Stair, and from the Library) reproduced exactly; waiting in the Cloister printed `Iron shrieks on iron, close by, and stops.` by itself, as stated. (36.8/36.9's gramophone is another story; not run.)

## Chapter 37 — The page the player sees
STATUS: PASS
- 37.9: copied `relighting.story`, `relighting.config.json` and `browser/` from `chapter-37`; gate-clean. `sharpee build relighting.story` printed the block shown in 37.2 line for line, without the minting line (as 37.9 says), sizes and timing aside (item 3). `npx serve dist/web/relighting` (npx installed `serve@14.2.8`) answered at `http://localhost:3000`.
- Playwright (Chromium, from `~/tools/playwright`): the page opened on the title and prologue with `data-theme="paper"`; Settings → Theme listed `Classic`, `Paper`, `Modern Dark`. Played to the Library and read the spark page: a side panel appeared reading `workings` / `spark: wakes a flame`. Chose Modern Dark and reloaded: theme still `modern-dark`, localStorage holds `relighting-theme=modern-dark` beside `relighting-save-autosave` and `relighting-saves-index`; the page printed `[Session restored]`, the status line read `LIBRARY`, and the panel still had its one line.
- Recordings and picture: playing the whole game on the page fetched `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` (HTTP 206) and `img/lantern-lit.png` (HTTP 200; shown in `#sharpee-media`, natural width 960). The panel ended with four lines in the order the pages were read. No console or page errors.

## Chapter 38 — Test trees
STATUS: PASS
- 38.10: made `relighting.tests/` with `manifest.json` and the four-skip-card `mainline.json`; `sharpee test . --json --capture-output > records.txt` wrote one record per line, and the `take lamp` record matches the one quoted in 38.4 (`"actualOutput":"You take it.","turn":2`; `elapsedMs` aside).
- With the 38.5 file: `✓ opening-lodge` / `3 cards passing, 4 assertions passing`, exit 0. With `"contains": ["Taken."]` (38.6): the failure block matches exactly, exit 1. With `onward01.json` and `thecake1.json` added together: the 38.7 report matches exactly.
- Phrase `cake-watched` changed to end "You decide against it.": `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` followed by the story's sentence; sentence put back, tree passes again.
- Folder replaced by `chapter-38/relighting.tests`: the 38.9 report matches exactly (7 lines, `183 cards passing, 275 assertions passing`, `182 commands (182 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134` with 81 unexercised lines, `Endings reached: 2 / 3`, `Rooms entered: 13 / 13`).

## Chapter 39 — Claims
STATUS: PASS
- 39.1: `sharpee claim winning1` printed the "no line" list exactly as quoted; `sharpee claim thelodge --at 82` printed the ten facts shown, twenty-three more, and the `Lock one with:` line.
- 39.2/39.3: the lock command's report, the three `Written:` lines, `Pinned … on card b7wicd1b.`, the manifest, the card's `locks` key and `relighting.claims.chord` all match the book exactly.
- 39.5, 39.7, 39.8: reports `1 of 1 held`, `2 of 2 held` (after adding "the story can be won" and its lock on card `bjhmo3xt` by hand), and `3 of 3 held` with the witness `take seed cake / north / eat seed cake` match exactly. With the cake claim's `needs rooms` cut to the Lodge: `UNPROVEN … max-depth-reached after 161 states`, `161 states, 239 commands`, as quoted; Gate Court put back.
- 39.11 break (`change it to lifted` removed from the `ward` trait, line 185): run took four minutes, exit 1; first failure line and the story's sentence match 39.6 exactly; `148 cards passing, 217 assertions passing, 35 cards failing, 60 assertions failing`; claims section `1 of 3 held, 2 unproven`, `3 walks`, both locks `NOT held there` (`the iron grille is standing` / `the story has not ended`). Walk state counts differ from the book's (walks stopped by the clock, as the chapter says they may). Line put back; final report matches the block printed in 39.11 exactly.
- `sharpee test . --verbose` prints `Claims budget per walk: 120s, 500000 states, depth 80`, as 39.9 says.
- Not tried, by the book's own statement (item 4): locking a fact after the line's first `put`, and a `needs verbs` line naming `put`.

## Chapter 40 — Publishing
STATUS: PASS
- 40.1: `sharpee ifid generate` printed one identifier (`A2E1E095-649E-475E-8CFC-6D19FF58AA68`; value differs, item 3). The copied story's header carries `ifid: C24E29F8-C36B-4F55-9FE9-B6D75AE7133D`, the same as `relighting.config.json`, as described.
- 40.7: set `story-version: 1.0.0` and added `publish-source: yes` in the header; gate-clean. `sharpee test .` → all seven lines pass, `claims: 3 of 3 held (seed 42)`. In the terminal the opening prints title, description, authors, then `Story v1.0.0` (version last, as 40.2 says).
- `sharpee publish relighting.story`: report matches the 40.4 block line for line (game.js size, timing and zip size aside, item 3; `Output: dist/relighting.zip (0.8 MB)` here, `0.7 MB` in the book). `dist/relighting.zip` holds exactly the fourteen files listed in 40.5; no `game.js.map`, no `index-testing.html`, no tests, no claims file.
- `unzip dist/relighting.zip -d ../relighting-published`, then `npx serve .` inside it. Playwright: the page opens with `The Relighting` / `Story v1.0.0` / description / `By The Sharpee Project`, as 40.2 shows. Played from the lodge to the beacon: all three recordings fetched (`audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3`, HTTP 206), `img/lantern-lit.png` fetched (HTTP 200) and shown when the Lantern was lit, hidden again on the last turn; four lines in the workings panel; final score 50, `You have risen to the rank of a Lamplighter.`, `[The story has ended. RESTART, RESTORE or UNDO]`. No console or page errors.

## Appendices
Not executed (item 7). Skimmed only: seven appendices, A to G, each headed by a "Generated from … (Sharpee 5.6.3 · Chord 4.0.3)" line (accepted, item 8).

## Ambiguities resolved (none changed an outcome)
- Chapter 1, 1.7: "The folder can be anywhere" — used `~/repos/relighting`. Chapter 18's `relighting-endings`, chapter 35's `cellar` and `yard`, and chapter 40's `relighting-published` were made beside it in `~/repos`, as each chapter says.
- Chapters 14, 15, 17, "Under the Hood" boxes: "Go into that folder and run `sharpee test .`" — run inside `companion/chapter-NN` itself, as written.
- Chapter 22, 22.1: "one line that gives the count, and then the whole list as a single very long line" — when the list is sent to a file with `>`, the count line stays on the terminal and the file holds only the list. The text does not say so; it did not get in the way.
- Chapter 38, 38.3: the page prints the JSON with deep indentation; typed with two spaces a level, as the prose says, and the files were accepted.
- Chapter 38, 38.10: "replace your folder with the one from chapter-38" — took only `relighting.tests`; the story stayed the chapter-37 copy (the chapter says the two are the same story). Chapters 38, 39 and 40 have no "copy the story" step, so none was copied.
- Chapter 39, 39.11: 39.8 prints two cake claims, 39.11 says to add "the second cake claim" and then narrow its `needs rooms`; followed 39.11. The closing sentence "The companion folder chapter-39 holds the story with its three claims", followed by `sharpee test .`, was read as a run in my own project (the section opens "Work in your own project"); nothing was copied from `chapter-39`.
- Chapter 40, 40.7: "write `publish-source: yes` in the header" — placed directly under `story-version:` (40.3 says its place does not matter). "The companion folder chapter-40 holds the story as it was published" was read as information; nothing was copied from `chapter-40`.

## Totals
- Chapters: 40
- PASS: 39
- PASS-WITH-ISSUES: 1 (chapter 19)
- BLOCKED: 0
- DEVIATION entries: 0
- Issues logged: 1 (chapter 19, 19.4 — the turn-50 warning and the turn-80 ending arrive on the 49th and 79th commands)

By the brief's definition the run is not "clean": one chapter is PASS-WITH-ISSUES for an issue that is not on the accepted list.
