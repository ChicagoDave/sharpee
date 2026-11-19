# Execution log — The Chord Manual acceptance test

`sharpee --version`: `Sharpee 5.6.4 · Chord 4.0.3`
Title page version line: `Chord 4.1.0, Sharpee 5.7.0`

## Setup

1. `npm config get prefix` → `/home/node/.local` (under home). PASS. `sharpee` was not installed before chapter 4.
2. Playwright + Chromium in `~/tools/playwright`: three-line launch/close script printed `chromium ok`. PASS.
3. `~/repos/book-test` holds `the-chord-manual-4.1.0.pdf` and `companion/`. PASS.
4. `pdftotext version 22.12.0`, `pdftoppm version 22.12.0`. PASS.

Project folder: `~/repos/relighting`. Node v22.23.2.

Note (logged once): `sharpee play .` is driven by sending the commands on standard input, one to a line, ending with `/quit`, instead of an interactive session.

## Preface / How to read this book
Read. No steps. No issues.

## Chapter 1 — The shape of a story file
STATUS: PASS
- Story typed by hand into `~/repos/relighting/relighting.story` (marked `↪` rows joined to the row above with one space, as 0.7 says). Blank lines and indentation confirmed against the page image (p. 23).

## Chapter 2 — The story header
STATUS: PASS
- No build steps. `about` (2.3) and the opening (2.4) reproduced word for word once chapter 4 had installed the command. The 2.2 block is stated to be "here to be read" and was not built.

## Chapter 3 — The player and the start
STATUS: PASS
- `examine me` (3.1) and the opening (3.4) match. The reordered opening block of 3.4 (banner first) was added temporarily, printed exactly the block the book shows, and was removed again (the book says the story has no opening block).

## Chapter 4 — Build, play, read an error
STATUS: PASS
- `npm install -g @sharpee/devkit` succeeded with the blocked-install-script warning the book predicts. `sharpee --version` → `Sharpee 5.6.4 · Chord 4.0.3` (expected for this run).
- 4.3 gate-clean line, 4.4 play transcript, 4.5 (`playble`, both diagnostics at 31:3 and 24:3), 4.6 (`Loge`), 4.7 (warning at 16:8, still gate-clean), 4.8 (both folder errors) and the Under the Hood `compose -o` (2 entities, 0 trait(s), 0 action(s)) all match the book apart from the two version numbers and the path. Story restored and gate-clean after each break.

Note (logged once): where a chapter illustrates a word with a thing "from another story" (the Den, the bell jar, the trolley and so on) and does not tell the reader to add it to The Relighting, the example was read and not built; building it would mean inventing rooms the book does not print.

## Chapter 5 — Rooms and exits
STATUS: PASS
- `chapter-05/relighting.story` copied; gate-clean. 5.6, 5.7 and 5.8 transcripts (Gate Court first visit, `look`, The Porter's Lodge heading, Bell Stair, Lantern Gallery, `east` → "You can't go that way.") match word for word.

## Chapter 6 — Things
STATUS: PASS
- Gate-clean. Every Relighting block (room listing, `examine lamp`, `take lamp`, `take chair`, `take hobb`, `inventory`, spectacles/`search`/`take glasses`, `drop lamp`/`look`) matches.

## Chapter 7 — Containers and supporters
STATUS: PASS
- Gate-clean. Library/grimoire, crate/lens, `put taper in crate`, `put lens in lantern`, `open press`, chair, `put kettle on chair`/`look` all match.

## Chapter 8 — Doors, locks and keys
STATUS: PASS
- Gate-clean. 8.3 chain, wrong key, and 8.7 lock-behind-you all match. 8.4 (`opens when unlocked`) and 8.6 (key ring) are stated not to be in the story and were not built.

## Chapter 9 — What things can do: the trait words
STATUS: PASS
- Gate-clean. Coat (inventory, take off, wear, `read coat`, `eat coat`), seed cake (two servings), cup, grimoire (`examine`/`read`), bell rope all match.

## Chapter 10 — Light, dark and the other senses
STATUS: PASS
- Gate-clean. Dark Undercroft, lamp lit/extinguished/relit, `light taper`, lamp left below and found again: all match.

## Chapter 11 — Regions
STATUS: PASS
- Gate-clean. Tower from both sides of the arch and the three stacks match. Kettle placed `in the Grounds`: the diagnostic matches exactly (142:3); restored, gate-clean.

## Chapter 12 — Ways that are closed, hidden or strange
STATUS: PASS
- Gate-clean. Sealed stair, hearth, `squeeze behind hearth` dark and lit, the command not understood in the Undercroft, and the parapet death (with `up is blocked` removed for a moment and put back) all match.

## Chapter 13 — States
STATUS: PASS
- Gate-clean; `read page` matches. 13.4 experiment (`change the iron grille to lifted` in the start block) opens the stair and prints the Lantern Gallery text as shown; line removed, gate-clean. Under the Hood: `compose -o relighting.json` shows the grille's `states` list and `statesReversible: false` beside it, as described.
- Housekeeping note (mine, not the book's): I deleted `relighting.ir.json` and `relighting.json` from the project by mistake and recreated them at once by re-running the compose command.

## Chapter 14 — Reacting to the player: on and after
STATUS: PASS
- Gate-clean. Kettle refusal, spark page, bell rope, grille (push/pull), spectacles given, Library first entry, cake taste, `search`/`take spectacles` all match. Under the Hood: `sharpee test .` in `companion/chapter-14` prints a "Derived rule tests (ADR-356): 11 branches" list containing "kettle · on taking", as described.

## Chapter 15 — What a clause can say and do
STATUS: PASS
- Gate-clean. `light lamp` refusal, cake refusal (and eaten in the Gate Court), two readings of the spark page, candles/unbind page, lamp and Undercroft all match. Under the Hood: `sharpee test .` in `companion/chapter-15` lists "hand lamp · on lighting · refused no-such-word" and "seed cake · on eating · refused cake-watched", as quoted.

## Chapter 16 — Conditions
STATUS: PASS
- Gate-clean. Hush page blank then readable, grimoire's two after-lines all match. Under the Hood: IR shows `lantern-ready` as an `and` of two tests, `open: false`; `any`/`no`/`each` entries refer to `faded-page` by name.

## Chapter 17 — Choosing between outcomes
STATUS: PASS
- Gate-clean. Cistern (frozen arm), four rope pulls (cycling), four grille examinations (counted blocks then description only) match. Under the Hood: `sharpee test .` in `companion/chapter-17` lists "spark page · on reading · when legible", "… when learned", "iron grille · after examining · the third time", and the cistern's three arms as `◌` lines, as described.

## Chapter 18 — Counting, scoring and ending
STATUS: PASS
- Gate-clean. `score` 5/25 Latecomer, rank line on lighting the candles, `score` 10/25, fourth pull ("Your palms have begun to object.") match.
- 18.6: copy kept in `~/repos/relighting-endings` with the four start-block lines; losing ending matches; with `change the lens to sound` added as the last line the winning ending matches, including the rank line.

## Chapter 19 — Time
STATUS: PASS
- Gate-clean. Timer lines (creak, sway, strike), cistern thaw over two turns, rank line, mend page, `score` 15/35, both blue-flame lines match. Waiting: "The light has turned…" on command 50, dusk ending on command 80, as stated. Under the Hood: IR sequence has `"narration": "broadcast"`; timer listed with its three named turns.

## Chapter 20 — Phrases
STATUS: PASS
- Gate-clean. Three `no-such-word` variants in order, Hobb's three sayings, the verbatim motto (line offsets 4/1/0 as on the page), `examine bell` with a count, the Bell Stair with `{grille-across}`, and Hobb deafened all match. (The bell count was 1 where the book's block shows 3: a turn-dependent value.)

## Chapter 21 — A thing's own words
STATUS: PASS
- Gate-clean. Lamp detail (unlit/lit), candles' two details, Lodge with Hobb's `present` sentence, `examine lens` match. Under the Hood: IR has `hobb.present`, `hand-lamp.detail`, `candles.detail`, `candles.detail.2`.

## Chapter 22 — Changing the standard messages
STATUS: PASS
- Gate-clean. `sharpee messages` prints "Message catalog: 885 overridable messages (en-US)" and then the list as one line; the four quoted entries (taking-taken, going-too-dark, lighting-lit, taking-taken-from) are exactly as printed. New dark messages, three waits, "You take it.", grille and kettle before/after waking all match.

## Chapter 23 — New verbs
STATUS: PASS
- Gate-clean. `spark` with no target, `mend lamp` (second variant), `hush bell` in the Library, the two misses after the page, `gnusto`, the four `remember`/`recall` replies and `shout` → "I don't understand that." all match. `compose -o` reports 6 action(s); the sparking entry has `patterns`, `constraints`, `musts` and `body`.

## Chapter 24 — New kinds of thing
STATUS: PASS
- Gate-clean. Full winning walk played: `spark lamp` twice, `light lamp` refusal, `spark candles` with rank line, `spark lantern` with no lens, `unbind grille` while tolling, `hush bell`, `unbind grille` (Journeyman), `mend spectacles`, `mend lens`, `examine lens`, final `spark lantern` (Lamplighter, story ends) all match. Replayed with the lens left cracked: losing ending. IR has `"routing": "capability"`.

## Chapter 25 — Bending the standard grammar
STATUS: PASS
- `relighting.story` and `synonyms.chord` copied; gate-clean. `sit on chair`/`exit`, `light lamp` before and after the page, `light lamp with taper`, `quiet bell`, `fix spectacles` (carrying the Journeyman line, as the book says for this order), `repair lens`, and the win with `light lantern` all match. IR: `grammarRemovals` 1 entry, `grammarExtensions` 4.

## Chapter 26 — People who act
STATUS: PASS
- Gate-clean. `talk to hobb` → "Hobb doesn't respond."; Hobb closes the press twice; Tamsin's rounds in the Refectory and Cloister; the wisp arriving and following; Tamsin entering from the east on the bell; and the Bell Stair block two turns later (thumb, push, pry bar) all match. IR shows `passive` with `announces-movement` in `config`, goals with `priority`/`activeWhen`, and the push step stored as `pushing` / `push :target`.

## Chapter 27 — Asking and telling
STATUS: PASS
- Gate-clean. Hobb's greeting, `goodbye`, return greeting, the dimming/tamsin/gnusto/kettle answers, bell row refusing before the bell and answering (with the page handed over) once it tolls, the overridden unknown-topic line, `ask hobb for the kettle`, both grimoire consultations, "Tamsin Vey doesn't respond.", and `read hush page` all match. The manner sentence ahead of each answer was sometimes a different one of Hobb's three, as the chapter says it will be.

## Chapter 28 — Conversations with a shape
STATUS: PASS
- Gate-clean. The thread (first beat, parting, resuming, price), `say maybe`, `yes` with the conclusion, `no` with the conclusion, the concluded thread's stock answer, the way back through "price" (refused before, answered after, "We have dealt" once bound), the silent turn taking a beat, brass asked once/again, `on silence`, and Hobb's "last night" before and after the Dimming all match.
- Observation outside the book's steps (not counted as an issue): `talk to tamsin` typed while a conversation with her is already open prints "Tamsin Vey doesn't respond."; typed on arrival it prints her greeting. The book does not say what `talk to` does mid-conversation.

## Chapter 29 — Inner lives
STATUS: PASS
- Gate-clean. Hobb's "last night" refused while wary, the spectacles given, `talk to hobb`, the story told once trusted; Tamsin's two answers about magic either side of the bargain; Hobb rattled under the bell (one-hand-off-one-ear beat, page handed over) all match. IR `character` holds `mood`, `feels`, and `knows` with source and confidence.
- Observation (not a difference from any printed block): after chapter 22's `taking-taken` override, `take spectacles` prints "You take it." for a plural thing.

## Chapter 30 — Principles
STATUS: PASS
- Gate-clean. "last night" withheld with the stock line, the spectacles row, and the story told after the spectacles are given all match. IR has `principles`, `temperaments` and `"confided": true`.

## Chapter 31 — More than one protagonist
STATUS: PASS
- Gate-clean. Role passes to Hobb on the fourth turn after the page (the `hobb-wakes` passage), `look` as Hobb (no doorway sentence), empty inventory ("You aren't carrying anything at all." — one of the three stated forms), `north` blocked, `take kettle`, `examine newspapers` handing the role back, `look` in the Library with the wisp all match; Hobb then gives Ansel the hush page when asked about the bell.

## Chapter 32 — Machines
STATUS: PASS
- Gate-clean. Played to the roof: first turn of the crank (leaves part), second turn with the seat empty (platform line only), `push crank` (pawl), `spark lantern` empty, lens seated, `spark lantern` shuttered, turn to drawn (pawl + shutters fold back), crank turning free, win. All replies match.

## Chapter 33 — Vehicles
STATUS: PASS
- Gate-clean. With the grille standing: `up` gives the grille's phrase, and the loaded hoist is found in the Library. With it lifted: `up` gives the lens-too-wide phrase, `enter hoist`/`look` ("In the book hoist you see Ansel."), `put lens in hoist` ("The book hoist pulls away."), the Lantern Gallery `look` with the hoist and lens, and `put lens in lantern` all match.

## Chapter 34 — Open water and open ground
STATUS: PASS-WITH-ISSUES
- Gate-clean. New Lantern text (no win), water gate, Water Stair, `enter skiff`, `steer east`, `wait`, `make sail`, the one-unit-out `look` of 34.4, the later `look`, arrival, `spark beacon` and the Lamplighter line (on a 50-point walk) all reproduce word for word, but only with one command the transcript does not print:
- ISSUE (ambiguity; 34.5 "Wind", the two transcript blocks). The book prints `enter skiff`, `steer east`, `wait`, `make sail`, then prose ("A look typed now gives the view of the last section, with the stair close by. Two turns after it the view has changed, and the turn after that brings the skiff in."), then `wait`, `wait`, `look`, `wait` ending "The skiff arrives at the Beacon Isle." Typed exactly as printed (no `look` after `make sail`), the story is one turn behind the page. The third command's `look` printed:
  "The Water Stair, in the distance, to the west." / "The Beacon Isle, in the distance, to the east."
  with no "The rock comes up out of the dusk ahead…" line (book: "The Beacon Isle, in the distance, to the east." / "The Water Stair, on the horizon, to the west." / "The rock comes up out of the dusk ahead, and on it a pole with a basket at the top, black against the last of the sky."). The following `wait` printed the rock line and not "The skiff arrives at the Beacon Isle."; the arrival came one command later. Reading the prose as an instruction and typing `look` straight after `make sail` makes every block match exactly. The book never says outright that the `look` must be typed for the second block to hold.

## Chapter 35 — The opt-in systems
STATUS: PASS
- No companion folder, as stated. `~/repos/cellar/cellar.story` and `~/repos/yard/yard.story` typed by hand; both gate-clean.
- Cellar: "You swing at the rat but miss!", "Taken.", a miss, then "You have slain the rat!" — all lines the chapter quotes; the fight is rolled afresh (accepted). Yard: "You could eat." on the 2nd wait, "You are hungry now, and thinking about the loaf." on the 4th, "You have starved to death." and the ending on the 9th, exactly as stated.

## Chapter 36 — Sound, music and pictures
STATUS: PASS
- `relighting.story` and `assets/` (three recordings, one picture) copied; gate-clean. `light lamp` ends with "The wick takes with a small dry sound, like a page turned."; the Hobb hand-over turn ends with the wisp's flinch; walking into the Bell Stair on the turn Tamsin pushes prints "Iron shrieks on iron, close by, and stops."; waiting in the Cloister prints that line by itself; waiting in the Library as Ansel prints "Somewhere in the Hall, iron complains about iron." All as the chapter shows. Nothing plays in the terminal, as stated.

## Chapter 37 — The page the player sees
STATUS: PASS
- `relighting.story`, `relighting.config.json` and `browser/` copied; gate-clean. `sharpee build relighting.story` printed the block the book shows, line for line in shape (no ifid-minting line, as 37.9 says; sizes and timing differ; "Wired 2 theme(s): paper, modern-dark", "Copied relighting.css", "Copied assets/ (2 entries)"). `npx serve dist/web/relighting` served at http://localhost:3000.
- Playwright (Chromium): the page opens on the title and prologue in the paper theme; Settings → Theme lists Classic, Paper, Modern Dark. Played to the Library and read the spark page: a side panel "workings / spark: wakes a flame" appears. Chose Modern Dark and reloaded: theme remembered (`relighting-theme=modern-dark` in the browser's storage, saves beside it), "[Session restored]" printed, status line reads Library, panel still shows its one line.
- Played the whole game on the page: `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` and `img/lantern-lit.png` were all fetched (HTTP 206/200; picture rendered 960×600 in `#sharpee-media` and hidden again on the last turn); the workings panel held the four lines in the order printed (spark, unbind, hush, mend). No console or page errors, no failed requests.

## Chapter 38 — Test trees
STATUS: PASS-WITH-ISSUES
- `relighting.tests/manifest.json` and `mainline.json` (three skip cards) written by hand, two-space indentation, keys in alphabetical order. `sharpee test . --json --capture-output > records.txt` wrote one JSON record to a line; the `take lamp` record matches the one printed (seq 3, `"actualOutput":"You take it."`, turn 1, `[SKIP]`).
- Whole `mainline.json` from 38.5: "✓ opening-lodge / 3 cards passing, 4 assertions passing", exit 0. The 38.6 variant (`"contains": ["Taken."]`): the failure block matches exactly, exit 1. Restored.
- `onward01.json` and `thecake1.json` added together: "2 line(s)", "✓ lodge · eat cake", "6 cards passing, 9 assertions passing", "5 commands (5 authored + 0 replayed), 1 restored at a fork" — exact.
- `cake-watched` changed to "You decide against it.": `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` with the story's new sentence under it, exit 1. Put back: passes.
- Full tree from `chapter-38`: 7 lines with the seven names printed, "182 cards passing, 275 assertions passing", "181 commands (181 authored + 0 replayed), 6 restored at a fork", "Branches exercised: 53 / 134" (81 not-exercised lines), "Endings reached: 2 / 3", `relighting.story:314 · night-falls (lose)`, "Rooms entered: 13 / 13" — all exact.
- ISSUE (ambiguity; 38.10 "Build and try it"). The book says "replace your folder with the one from chapter-38 and run the full tree." "Your folder" could be the `relighting.tests` folder just made or the whole project folder. I read it as the test tree only (`relighting.tests`), since 38.9 says the companion's story is "as chapter 37 left it". That reading worked.

## Chapter 39 — Claims
STATUS: PASS
- `sharpee claim winning1` prints the "no line" message and the seven lines exactly as shown. `sharpee claim thelodge --at 82` prints the ten facts shown plus twenty-three more and the "Lock one with:" line.
- `--propose` prints the report and writes nothing. The lock command prints the block shown (needs rooms/things/verbs, three "Written:" lines, "Pinned … on card b7wicd1b."); `relighting.claims.chord`, the manifest's `claims` key and the card's `locks` key are exactly as printed.
- `sharpee test .`: "claims: 1 of 1 held (seed 42) / 0 walks / HELD … at turn 82 / lock … — held there". The 39.4 refusal (`raised`) reproduces exactly at 7:24; restored.
- "the story can be won" added by hand with its lock on card `bjhmo3xt`: "2 of 2 held", both HELD lines (turn 82, turn 138), both locks held. The 39.7 layout refusal (`relighting.claims.chord:17 · … the next block follows without a blank line`) reproduces exactly; fixed.
- Second cake claim: "3 of 3 held", "1 walk … 2 rooms, 3 things, 2 verbs — 17 states, 20 commands, stopped: all-claims-settled", witness "take seed cake / north / eat seed cake". With `needs rooms: the Lodge` alone: "2 of 3 held, 1 unproven … 1 rooms, 3 things, 2 verbs — 161 states, 239 commands, stopped: max-depth-reached". Gate Court put back. `--verbose` prints "Claims budget per walk: 120s, 500000 states, depth 80".
- Story broken (`change it to lifted` removed from the ward trait): `✗ opening-lodge — unbind grille: State assertion failed: the iron grille is lifted. the iron grille is "standing", expected "lifted"`, 35 cards failing, "claims: 1 of 3 held, 2 unproven", three walks (two stopped at max-seconds; their state counts are clock-dependent, as the book says), both locks "NOT held there", run took 4m01s, exit 1. Line put back; the final report is the 3-of-3 block printed at the end of 39.11, word for word.
- The two faults the chapter states (locking after a line's first `put`; `put` in a `needs verbs` line) were not tried.

## Chapter 40 — Publishing
STATUS: PASS
- `sharpee ifid generate` prints one identifier of the shape shown. `story-version: 1.0.0` and `publish-source: yes` written into the header; `sharpee play .` shows the four banner lines with "Story v1.0.0" last, as 40.2 says of the terminal. `sharpee test .`: 182 cards passing, "claims: 3 of 3 held (seed 42)".
- `sharpee publish relighting.story` prints the block shown, line for line in shape ("shipped its source (`publish-source: yes`)", "Shipped 1 import fragment(s) → imports.json", no `game.js.map` line, IFID `C24E29F8-C36B-4F55-9FE9-B6D75AE7133D`, "Output: dist/relighting.zip", the unzip/itch.io line). Sizes and timing differ (2.4mb, 0.8 MB): values of the run.
- `dist/relighting.zip` holds exactly the fourteen files listed in 40.5, `index.html` at the top; no test tree, no claims file, no `index-testing.html`, no source map.
- `unzip dist/relighting.zip -d ../relighting-published`, `npx serve .` from inside it, Playwright (Chromium): the page opens with "The Relighting / Story v1.0.0 / description / By The Sharpee Project" (version under the title, as 40.2 says of the page). Played from the lodge to the beacon: win with "You have risen to the rank of a Lamplighter.", score 50; `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` and `img/lantern-lit.png` all fetched (206/200), picture rendered and hidden on the last turn, workings panel with four lines. No console or page errors, no failed requests.
- The 40.4 refusal for a story with no identifier is quoted for reading; no step asks for it and it was not provoked.

## Appendices A–G
Not executed (reference material). Each opens with a "Generated from … (Sharpee 5.6.4 · Chord 4.0.3)" line, the accepted interim-release difference.

## Summary

Chapters at each status (40 chapters):
- PASS: 38 (chapters 1–33, 35–37, 39, 40)
- PASS-WITH-ISSUES: 2 (chapters 34, 38)
- BLOCKED: 0

DEVIATION entries: 0

Issues reported (2, both ambiguities in the book's wording; neither is a wrong output once resolved):
1. Chapter 34, section 34.5 "Wind": the second transcript block only matches if `look` is typed straight after `make sail`. The prose mentions that look conditionally ("A look typed now gives…") and the printed commands omit it; typed exactly as printed, the story runs one turn behind the page.
2. Chapter 38, section 38.10 "Build and try it": "replace your folder with the one from chapter-38" does not say whether "your folder" is `relighting.tests` or the whole project.

Observations outside the book's own steps (not counted): `talk to tamsin` during an already-open conversation prints "Tamsin Vey doesn't respond." (chapter 28); after chapter 22's override, taking a plural thing prints "You take it." (chapters 29–30).

Not tried, by instruction or because the book states the fault: Chord Writer steps; `sharpee claim` locking after a line's first `put`; `put` in a `needs verbs` line; examples the book marks as "from another story".

Folders left by the run: `~/repos/relighting` (project), `~/repos/relighting-endings` (18.6), `~/repos/cellar`, `~/repos/yard` (35), `~/repos/relighting-published` (40).
