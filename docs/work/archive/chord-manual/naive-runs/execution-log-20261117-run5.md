# Execution log — The Chord Manual acceptance test

`sharpee --version` (after chapter 4's install): `Sharpee 5.6.2 · Chord 4.0.3`
Title page version line: `Chord 4.1.0, Sharpee 5.7.0`

## Setup

1. `npm config get prefix` → `/home/node/.local` (under home). PASS.
2. Playwright in `~/tools/playwright`: a three-line script launched Chromium (159.0.8154.6) and closed it. PASS.
3. `~/repos/book-test` holds `the-chord-manual-4.1.0.pdf` and `companion`. PASS.
4. `pdftotext -v` and `pdftoppm -v` both print `22.12.0`. PASS.

Project folder: `~/repos/relighting`. Node v22.23.2.

Substitution (logged once): `sharpee play .` cannot be held interactively here, so every play session sends its commands on standard input, one to a line, ending with `/quit`.

## Preface and "How to read this book"

STATUS: PASS — nothing to execute. No issues.

## Chapter 1 — The shape of a story file

STATUS: PASS-WITH-ISSUES

- **Ambiguity resolved — (a) Chapter 1, opening listing (p. 23), repeated in 1.5, 2 (header), 2.4, 3.1.** (b) The book prints the whole story to be typed "into a file called relighting.story" (1.7) and says "Each line says one thing, and the end of the line is the end of what it says" (1.1) and "The ## must be at the left margin" (1.5). (c) In the printed listing, long lines are wrapped by the page with no mark, and the continuation starts at the block's left margin: e.g. `## The Relighting, as it stands at the end of Part I: a header, a` / `prologue,` and `  description: Thirty years after the magic went out of the world,` / `a lamp burns blue.` and prose lines ending `you would` / `have said`. Typed as printed, `prologue,` and `a lamp burns blue.` would be unindented lines of their own. The book nowhere says that listings wrap. I read each such break as a page wrap and typed the logical line whole; that reading compiled, and it is the reading that makes chapter 4's quoted line numbers (16, 24, 25, 31) come out right.
- **Not reproduced (no step given) — 1.2 and 1.3.** The two quoted diagnostics (`lex.tab-indent`, `parse.unterminated-block`) are printed without any instruction to produce them, and the reader has no `sharpee` command until chapter 4. Not run.

## Chapter 2 — The story header

STATUS: PASS

- The `about` output (2.3) and the full opening (2.4) were reproduced word for word in chapter 4's play session.
- Not reproduced (no step given): the smallest-header opening in 2.2 (which uses a one-sentence Lodge description the reader is never told to type), and the diagnostics in 2.1 and 2.6. Not counted as issues.

## Chapter 3 — The player and the start

STATUS: PASS

- `examine me` output (3.1) reproduced word for word in chapter 4's session.
- Not reproduced (no step given): the three diagnostics and the load error in 3.4. Not counted as issues.

## Chapter 4 — Build, play, read an error

STATUS: PASS

- 4.1 install: ended with npm's "1 package had install scripts blocked" warning (esbuild), as the book says it may. `sharpee --version` → `Sharpee 5.6.2 · Chord 4.0.3` (numbers per accepted item 8).
- 4.3 `--check`, 4.4 play session (opening, `examine me`, `examine lamp`, `north`, `wait`, `xyzzy`), 4.5 `playble`, 4.6 `Loge`, 4.7 missing description warning, 4.8 both folder mistakes, and the "Under the Hood" `compose -o relighting.ir.json`: every line matched the book apart from the version numbers and the loading path.
- No issues.

## Chapter 5 — Rooms and exits

STATUS: PASS

- Copied `chapter-05/relighting.story`; gate-clean. Walked Lodge → Gate Court (first-visit text, then `look`) → Cloister → Bell Stair → Lantern Gallery, `east` on the roof, and `south` back to "The Porter's Lodge": every quoted block matched word for word (`Story v0.2.0`).
- Not reproduced (no step, other stories): the Den/Attic `duplicate-exit` diagnostic and one-way `> down` (5.3, 5.4), `missing-kind-noun` (5.1), `Cloyster` (5.8, shown as an illustration). No issues.

## Chapter 6 — Things

STATUS: PASS

- Copied `chapter-06`; gate-clean. "You can see a kettle, a hand lamp, and Hobb here.", `examine lamp`, `take lamp`, `take chair`, `take hobb`, `examine arch`/`motto`, `inventory`, `examine spectacles`/`search`/`take glasses`, and the Gate Court `drop lamp`/`look` all matched word for word. Examined the promised nouns in every room as told; `desks` and `rope` answer "You can't see any such thing.", as the book says some will.
- Not reproduced (from "another story", no step): the curtain `hide behind curtain` (6.7); `backdrop-not-scenery` (6.5). No issues.

## Chapter 7 — Containers and supporters

STATUS: PASS

- Copied `chapter-07`; gate-clean. Library desk/grimoire, the crate and lens (including "There's no room in the crate." in a new game), `put lens in lantern`, `open press` ("which is empty"), the chair (`enter`/`north`/`exit`), and `put kettle on chair` + `look` all matched word for word.
- Not reproduced (other stories): the bell jar and the `unlisted` table (7.5). No issues.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

- Copied `chapter-08`; gate-clean. The whole chain in 8.3, the wrong key, and 8.7's close/lock/`east` matched word for word.
- Not reproduced (book says The Relighting leaves them out, or no step): `opens when unlocked` (8.4), the key-ring question (8.6), the two diagnostics in 8.1–8.2. No issues.

## Chapter 9 — What things can do: the trait words

STATUS: PASS

- Copied `chapter-09`; gate-clean. Inventory with the coat, `take off`/`wear coat`, `examine book`/`read book`, the seed cake twice, `pull rope`/`take rope`, `take cup`/`drop cup`, `read coat`, `eat coat` matched word for word.
- Not reproduced (other stories, no step): hat/cap (9.1), trolley (9.4), tassel (9.6), wireless (9.7). No issues.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

- Copied `chapter-10`; gate-clean. The dark Undercroft (`down`, `look`, `examine crate`, `up`), `light lamp` in the Lodge, the lit descent, `extinguish`/`look`/`light lamp`, `light taper`, and 10.6's drop/up/down matched word for word.
- Not reproduced (other stories): `night-vision` (10.4), the tin (10.5), `starts-state-pairing` (10.2). No issues.

## Chapter 11 — Regions

STATUS: PASS

- Copied `chapter-11`; gate-clean. `examine tower` from the Lodge, the Gate Court and (refused) the Cloister; the three stacks and the fourth `north`; all matched. Placing the kettle `in the Grounds` gave the quoted `analysis.thing-in-region` error at `relighting.story:142:3`, exactly as printed; restored, gate-clean.
- No issues.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS

- Copied `chapter-12`; gate-clean. `up` at the Bell Stair, `examine hearth`, `squeeze behind hearth` without the lamp (grue line) and with it lit (12.5), and the same command in the Undercroft ("I don't understand that.") matched word for word.
- 12.2: removed the `up is blocked: stair-sealed` line (line 102), walked up and `east`: parapet text and `[The story has ended. RESTART, RESTORE or UNDO]` matched. Line put back; gate-clean.
- Not reproduced (other story, no step): the Study/Vault `while` exit (12.3); `missing-phrase` (12.1). No issues.

## Chapter 13 — States

STATUS: PASS

- Copied `chapter-13`; gate-clean (`Story v0.3.0`). `read page` matched word for word.
- 13.4: added `change the iron grille to lifted` to the start block, gate-clean, `up` at the Bell Stair reached the Lantern Gallery with the quoted description; line taken out again, gate-clean.
- Under the Hood: `sharpee compose relighting.story -o relighting.json` wrote the IR; the grille's `states` holds `standing`, `lifted` and `statesReversible` is beside it, as described.
- Not reproduced (other stories, `probe.story`): sluice, dial, and the five diagnostics. No issues.

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS

- Copied `chapter-14`; gate-clean. `take kettle`, `search`/`take spectacles`, `give spectacles to hobb`, `eat cake`, the Library's once-only ink line, `read page`, `pull rope`, `push grille`/`pull grille` all matched word for word.
- Under the Hood: `sharpee test .` inside `companion/chapter-14` printed a list headed `Derived rule tests (ADR-356): 11 branches` including `✓ kettle · on taking`, as described.
- Not reproducible in play as the story stands: the lens's `lens-seated` line (the grille blocks the roof; the book says "for the day it reaches the roof"), the dial (other story). No issues.

## Chapter 15 — What a clause can say and do

STATUS: PASS

- Copied `chapter-15`; gate-clean. `light lamp` before the page ("You reach for the word…"), `eat cake` under Hobb's eye, eating it in the Gate Court, `read page` twice, `light lamp` after, `down`, `light candles` and `look` all matched word for word.
- Under the Hood: `sharpee test .` inside `companion/chapter-15` listed `✓ hand lamp · on lighting · refused no-such-word` and `✓ seed cake · on eating · refused cake-watched`, as quoted.
- Not reproduced (`probe.story`, other stories): the diagnostics in 15.2 and 15.6, the cat. No issues.

## Chapter 16 — Conditions

STATUS: PASS

- Copied `chapter-16`; gate-clean. `examine grimoire` before and after, `read hush page` while faded, and after the spark page (`(first taking the hush page)` / `Taken.` / the third working) all matched word for word.
- Under the Hood: in the IR, `lantern-ready` is under `conditions` as an `and` with two operands and `faded-page` has `"open": true`, as described.
- No issues.

## Chapter 17 — Choosing between outcomes

STATUS: PASS

- Copied `chapter-17`; gate-clean. `examine cistern`, four `pull rope` (cycling back to the first), four `examine grille` (three counted lines, then the bare description) all matched word for word.
- Under the Hood: `sharpee test .` inside `companion/chapter-17` listed `spark page · on reading · when legible`, `… when learned` and `iron grille · after examining · the third time`, as quoted.
- Not reproduced (no step): the `refusal-misplaced` diagnostic in 17.2. No issues.

## Chapter 18 — Counting, scoring and ending

STATUS: PASS

- Copied `chapter-18`; gate-clean. `score` after the page (5 of 25, Latecomer), `light candles` with the rank line, `score` (10 of 25, Second-Year), and the fourth `pull rope` ("Your palms have begun to object.") all matched word for word.
- 18.6: copied the story to its own folder `~/repos/relighting-endings`, added the three start-block lines, gate-clean; `put lens in lantern` / `light lantern` gave the losing ending word for word. With `change the lens to sound` added, the winning ending and "You have risen to the rank of a Second-Year." matched. The project's own story was left untouched.
- Not reproduced (other story, no step): the vial (18.7), `rank-above-max` (18.4). No issues.

## Chapter 19 — Time

STATUS: PASS

- Copied `chapter-19`; gate-clean. Read the page, `light lamp` (creak), `east` (draught), `down` (bell strikes, ice sweats), `examine cistern` (thawing text, ice breaks, "The tower bell tolls.", rank line), `read mend page`, `score` → "You have scored 15 out of 35, earning you the rank of a Second-Year.": all matched word for word. `examine blue flame` in the morning and after the page matched (trailing bell line is one of the stated three).
- 19.4: 82 `wait`s from a new game: "The light has turned…" printed after the 50th, "Dusk comes down…" and the ending line after the 80th, word for word.
- Under the Hood: in the IR the timer `waking` lists `creak`, `sway`, `strike`, and the sequence's `narration` is `broadcast`, as described.
- Not reproduced (other story): the squib's fuse (19.3). No issues.

## Chapter 20 — Phrases

STATUS: PASS

- Copied `chapter-20`; gate-clean (`Story v0.4.0`). Three `light lamp` refusals in cycle, Hobb's three sayings on three entries to the Lodge, `examine gate` with the three-line motto (relative indents 4/1/0 as printed), the Bell Stair description with "An iron grille stands across its third step." at the end, `examine bell` ("By your count that makes 2, and it is not tired." — the number is the run's toll count; the book's block shows 3), and the deafened Lodge entry: all matched.
- No issues.

## Chapter 21 — A thing's own words

STATUS: PASS

- Copied `chapter-21`; gate-clean. The Lodge with Hobb's `present` sentence, `examine lamp` unlit and lit, `examine candles` / `light candles` / `examine candles`, and `examine lens` in the Undercroft matched word for word (bell/timer lines as stated variants).
- Not reproduced (other story, no step): the cat's `disappeared` (21.4), the `are` diagnostic (21.1). No issues.

## Chapter 22 — Changing the standard messages

STATUS: PASS

- `sharpee messages` printed `Message catalog: 885 overridable messages (en-US)` and the catalogue; the quoted entries for `taking-taken`, `going-too-dark`, `lighting-lit` and `taking-taken-from` are in it character for character.
- Copied `chapter-22`; gate-clean. Dark `down` and `look`, three `wait`s, `take lamp` ("You take it."), `push grille` before and after the page, and Hobb's kettle line before and after all matched.
- Note, not an issue: the catalogue is written as one line of JSON, so "search the file for a few words" works in an editor but a line-based search tool returns the whole 330 KB line. The book does say it is "printed as data for a program to read".
- Not reproduced (no step): `import "books"` (22.9), the `taking-taken-from` override (22.5), `unknown-message-alias`. No issues.

## Chapter 23 — New verbs

STATUS: PASS

- Copied `chapter-23`; gate-clean. `spark` with no target, the four workings before their pages (the shared cycling refusal), `hush bell` in the Library ("You can't see any bell here."), `spark lamp` / `spark grimoire` after the page, `gnusto` before and during the tolling, and the four `remember`/`recall` commands all matched word for word.
- Under the Hood: the `sparking` entry in the IR has `patterns`, `constraints`, `musts` and `body` (and also `refusals`, `otherwise`, `scores`).
- Not reproduced (the book says The Relighting does not use them): `scrawl` (23.10), `shout` while tolling (23.11; `shout` answers "I don't understand that." as the book says it does before the bell), the two diagnostics. No issues.

## Chapter 24 — New kinds of thing

STATUS: PASS

- Copied `chapter-24`; gate-clean. Played the whole game to the win: `spark lamp` twice, `light lamp` (the match line), `spark candles` with the Second-Year line, `unbind grille` while tolling, `hush bell`, `unbind grille` ("You have risen to the rank of a Journeyman."), `mend spectacles`, `mend lens`, `examine lens`, `spark lantern` empty, then seated: winning text, "You have risen to the rank of a Lamplighter.", ending line. Every quoted block matched word for word.
- Played again leaving the lens cracked: the losing ending, as told.
- Not reproduced (other story): the burner/brazier (24.8). No issues.

## Chapter 25 — Bending the standard grammar

STATUS: PASS

- Copied `relighting.story` and `synonyms.chord` from `chapter-25`; gate-clean. `sit on chair` / `exit`, `light lamp` before the page (refused in the working's words) and after (sparked), `light lamp with taper`, and the plain-word winning walk (`light lamp`, `quiet bell`, `fix spectacles` with the Journeyman line, `repair lens`) matched word for word.
- Under the Hood: the IR has `grammarRemovals` with one entry (lighting) and `grammarExtensions` with four (sparking, mending, hushing, entering), as described.
- Not checked: 25.2's "in the story as chapter 24 left it" `sit on chair` → "I don't understand that." The chapter gives no step to try it before the copy. Not counted as an issue.

## Chapter 26 — People who act

STATUS: PASS

- Copied `chapter-26`; gate-clean (`Story v0.5.0`). Hobb closing the press twice, the Refectory with Tamsin (`examine tamsin`, her sorting, `wait` → "Tamsin Vey leaves to the west."), `light lamp` with the wisp's arrival, `east` with "The wisp follows you.", the Cloister `wait` with "Tamsin Vey enters from the east.", and the Bell Stair scene two turns later (thumb, push, pry bar) all matched word for word. `talk to hobb` → "Hobb doesn't respond."
- Not reproduced (other stories): Tamsin's `own-business` is in the story and matched; Sam, the cat, the watchman, Nell (26.1.1–26.4.1). No issues.

## Chapter 27 — Asking and telling

STATUS: PASS

- Copied `chapter-27`; gate-clean. Every row of Hobb's table, `tell hobb about gnusto`, the bell row refused before the bell and answered (with "Hobb gives the hush page to Ansel.") while it tolls, the unknown-topic override, `ask hobb for the kettle`, `talk to hobb` / `goodbye` / `talk to hobb`, `consult grimoire about gnusto`, `look up cheese in grimoire`, `talk to tamsin` ("Tamsin Vey doesn't respond."), and `read hush page` matched the book's text.
- Note, not an issue: which of Hobb's three beats precedes a given answer depends on how many answers came before (the book says the beats "are used in turn"); my sequence put a different beat before some answers than the book's separately recorded blocks show.

## Chapter 28 — Conversations with a shape

STATUS: PASS

- Copied `chapter-28`; gate-clean. Five short games: the page asked twice and `yes`; leaving the thread (`porter`, parting line), resuming (`stair`), `say maybe`, `no`, the concluded thread's stock answer, the way back by `price` and `agreed`, "We have dealt…"; `price` asked cold ("A price for what?" with Tamsin's sorting on the same turn, then "leaves to the west"); a `wait` taking the second beat; `brass` once/again, two `wait`s and the silence line; Hobb's `last night` before and after `dimming`. All matched word for word.
- No issues.

## Chapter 29 — Inner lives

STATUS: PASS

- Copied `chapter-29`; gate-clean. Before the spark page: `dimming`, `last night` refused ("…people I can't see"), spectacles found and given, `talk to hobb` ("Still here…"), `last night` answered; Tamsin on `magic` before and after the bargain. With the bell tolling: Hobb answers with one hand off one ear and gives the hush page. All matched the book's text (beats in turn, as above).
- Note, not an issue: in a game of my own ordering I struck the bargain before reading the spark page, and `read page` in the Library then asked "Which do you mean: the unbind page or the spark page?". The book's own steps never put the two together under the bare word, and chapter 6 explains the question.
- Not reproduced (other story): Nell and Tom's rumour (29.3.1). No issues.

## Chapter 30 — Principles

STATUS: PASS

- Copied `chapter-30`; gate-clean. `dimming`, then `last night` withheld with the stock line ("Hobb gives that some thought, and gives it back."), `ask hobb about spectacles`, then spectacles given and `last night` answered: all matched the book's text.
- Not reproduced (other story): Cy (30.4) and the six-person table (30.5). No issues.

## Chapter 31 — More than one protagonist

STATUS: PASS

- Copied `chapter-31`; gate-clean. Read the page and played four turns: the fourth (`light lamp with taper`) printed the match line, "In the lodge, an old man…", the "You are Hobb…" passage and "The tower bell tolls." As Hobb: `look` (Lodge without the doorway sentence, "You can see a kettle here."), `inventory` ("You aren't carrying anything at all." — one of the three stated variants), `north` (blocked line), `take kettle` ("You take it."), `examine newspapers` (finds the page, "You are Ansel…"), `look` (Library, wisp, grimoire). Then as Ansel `ask hobb about the bell` hands over the hush page. All matched word for word.
- No issues.

## Chapter 32 — Machines

STATUS: PASS

- Copied `chapter-32`; gate-clean. Walked to the roof and worked the crank: `turn crank` (leaves part), `turn crank` with the seat empty (only "You turn the shutter crank."), `push crank` (pawl), `spark lantern` with the lens seated and shutters shut ("The shutters are closed round it…"), `turn crank` (pawl, then "The crank runs free…"), `examine shutter` in both states, then the win. All matched word for word.
- Note, not an issue (outside the book's steps): in my ordering the candles were lit on the very turn the role passed to Hobb, and the rank line read "Ansel has risen to the rank of a Second-Year." The book quotes no such turn.

## Chapter 33 — Vehicles

STATUS: PASS

- Copied `chapter-33`; gate-clean. With the lens in hand: `up` at the Bell Stair gives the grille's line while the grille stands and "The lens is as wide as a cartwheel…" once it is lifted. `put lens in hoist` → "The book hoist pulls away."; the hoist was found in the Library before the grille was lifted and in the Lantern Gallery after; `look` in the Undercroft and on the roof, `put lens in lantern` ("(first taking the lens)" … "The book hoist pulls away."), `enter hoist` and `look` ("In the book hoist you see Ansel.") all matched word for word.
- Not reproduced (other stories): tram, balloon, cart, barge (33.3–33.5). No issues.

## Chapter 34 — Open water and open ground

STATUS: PASS

- Copied `chapter-34`; gate-clean. Won as far as the roof (the Lantern now prints its passage and does not end the game; `score` 45 of 50 before the beacon), went down through the water gate, then `enter skiff`, `steer east`, `wait`, `make sail`, `look` (stair close by, isle on the horizon), two `wait`s, `look` (isle in the distance, stair on the horizon, the rock passage), `wait` ("The skiff arrives at the Beacon Isle."), `spark beacon`: winning text, "You have risen to the rank of a Lamplighter.", ending line. All matched word for word.
- Note, not an issue: 34.5 says "The player steps out onto the rock"; `spark beacon` worked from aboard the skiff without stepping out.
- Not reproduced (other story): the raft and the bottle. No issues.

## Chapter 35 — The opt-in systems

STATUS: PASS

- No companion folder, as the chapter says. Typed `cellar.story` into `~/repos/cellar` and `yard.story` into `~/repos/yard` (same reading of the listings' page wraps and two-space levels as in chapter 1; there were no wrapped lines).
- Cellar: gate-clean. `attack rat` → "You land a solid blow on the rat, dealing 1 damage!"; `take poker` → "Taken."; `attack rat with poker` → "You swing at the rat but miss!" then "You have slain the rat!" (rolled afresh, as the book says).
- Yard: gate-clean. "You could eat." after the first `wait`, "You are hungry now…" after the third, "You have starved to death." and the ending line after the eighth: exactly as printed.
- No issues.

## Chapter 36 — Sound, music and pictures

STATUS: PASS

- Copied `relighting.story` and the `assets` folder (three `.mp3` files and `img/lantern-lit.png`) from `chapter-36`; gate-clean. In the terminal: `light lamp` ends with "The wick takes with a small dry sound, like a page turned."; the fourth turn after the page hands the role to Hobb and ends with the wisp line "Somewhere in the Hall a small blue light goes flat and dim…"; waiting on as Ansel in the Library printed "Somewhere in the Hall, iron complains about iron." after the third `wait`; waiting in the Cloister printed "Iron shrieks on iron, close by, and stops."; walking `north` into the Bell Stair on the turn of the push gave the book's block word for word.
- Nothing played in the terminal, as the book says.
- Not reproduced (other story): the gramophone and curtains (36.8–36.9). No issues.

## Chapter 37 — The page the player sees

STATUS: PASS

- Copied `relighting.story`, `relighting.config.json` and the `browser` folder from `chapter-37`; gate-clean. `sharpee build relighting.story` printed the book's report line for line, without the "Minted the story's ifid" line (as 37.9 says), with run values differing (`game.js 2.4mb`, `2425.8 KB`, `Done in 69ms`).
- `npx serve dist/web/relighting` installed `serve@14.2.8` on first use and served at `http://localhost:3000`.
- Playwright (Chromium, from `~/tools/playwright`): the page opened on the title and prologue with `data-theme="paper"`; Settings → Theme listed Classic, Paper, Modern Dark. Played to the Library and `read page`: the side column appeared with the panel `channel-panel-workings` reading "workings / spark: wakes a flame" (it was hidden before). Chose Modern Dark and reloaded: the page came back in `modern-dark`, and `localStorage` holds `relighting-theme=modern-dark` beside `relighting-save-autosave` and `relighting-saves-index`. No console errors, no failed requests.
- Recordings and picture (a further walk on the page, beyond the chapter's own steps): `audio/catch.mp3` (HTTP 206) on `light lamp`, `audio/toll.mp3` (206) when the bell began, `img/lantern-lit.png` (200, 960×600, shown in `#sharpee-media` above the story) on `spark lantern`, `audio/lapping.mp3` (206) on `enter skiff`. The panel ended with four lines in the order I read the pages. (That walk stopped one turn short of the isle through my own miscount of `wait`s; the last turn was played in chapter 40.)
- Note, not an issue: 37.2 says the build folder holds "a copy of the assets folder". It holds the two folders `audio` and `img` directly (the build line is "Copied assets/ (2 entries)"); there is no folder named `assets` in `dist/web/relighting`.
- Not reproduced (no step): the `unknown client` and `Unknown built-in theme` build errors (37.1), `browser/index.html` (37.8). No issues.

## Chapter 38 — Test trees

STATUS: PASS-WITH-ISSUES

- Wrote `relighting.tests/manifest.json` and `mainline.json` by hand (keys alphabetical, two-space indentation). `sharpee test . --json --capture-output` gave the `take lamp` record exactly as quoted (`"actualOutput":"You take it."`, `"turn":2`, `"cardId":"card0003"`). With the assertions in place `sharpee test .` printed `Test tree: relighting.tests/ (seed 42, 1 line(s))` / `✓ opening-lodge` / `3 cards passing, 4 assertions passing`, exit 0.
- The "Taken." example (38.6): with `take lamp` expecting `contains: ["Taken."]` the report was `✗ opening-lodge — take lamp: Output does not contain "Taken."` / `    You take it.` / `2 cards passing, 3 assertions passing, 1 card failing, 1 assertion failing`, exit 1 — as printed. Card put back.
- Added `onward01.json` and `thecake1.json` together: `(seed 42, 2 line(s))`, `✓ opening-lodge`, `✓ lodge · eat cake` (then `6 cards passing, 9 assertions passing` and `6 commands (6 authored + 0 replayed), 1 restored at a fork`, which the book's block leaves off).
- Broke `cake-watched` ("You decide against it."): `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` with the story's new sentence beneath, exit 1. Put back: passes.
- Replaced my folder with `chapter-38`'s tree: `(seed 42, 7 line(s))`, the seven `✓` lines as printed, `183 cards passing, 275 assertions passing`, `182 commands (182 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134` with 81 lines beneath, `Endings reached: 2 / 3`, `relighting.story:314 · night-falls (lose)`, `Rooms entered: 13 / 13`. Word for word.
- **Ambiguity resolved — (a) Chapter 38, "38.10 Build and try it" with 38.3 and 38.5.** (b) "write the manifest and the three segments of this chapter into it". (c) The chapter prints the first segment twice over: whole, with four `skip` cards (38.3), and then as loose replacement cards with assertions (38.5: `card0003`, `card0004`, and the opening card `card0001`), never as one finished file. I wrote the skip form first (to run 38.4's command), then assembled the asserted form: `card0001` with the `info.title` channel, `card0002` still `skip`, `card0003` and `card0004` as in 38.5. That reading gave the book's "3 cards passing, 4 assertions passing".
- **Issue — (a) Chapter 38, "38.4 Reading what the story says".** (b) "`sharpee test . --json --capture-output` … The output is one JSON record to a line." (c) In a terminal the command printed the JSON records (143 lines) and also the whole human-readable derived-tests report — about 230 lines beginning `Derived rule tests (ADR-356): 134 branches` and ending `Rooms entered: 7 / 13` / `Not entered (6):` … — on the error stream. Sending standard output to a file leaves only the JSON, but the book does not say to.

## Chapter 39 — Claims

STATUS: PASS

- `sharpee claim winning1` printed the "no line" message and the seven lines exactly as quoted. `sharpee claim thelodge --at 82` printed the header, the ten quoted facts first, twenty-three more, and `Lock one with: sharpee claim thelodge "<fact>" --at 82`.
- Locking: the command's report, `relighting.claims.chord`, the manifest's new `claims` key and the `locks` key on card `b7wicd1b` in `thebell1.json` all match the book character for character. `sharpee test .` → `claims: 1 of 1 held (seed 42)`, `0 walks`, HELD line and lock line as printed.
- Added "the story can be won" by hand with its lock on card `bjhmo3xt` (in `winning1.json`): `claims: 2 of 2 held`, both HELD lines (turns 82 and 138) and both lock lines as printed.
- Added "the cake can be eaten": `3 of 3 held`, `1 walk`, "17 states, 20 commands, stopped: all-claims-settled", witness `take seed cake / north / eat seed cake`. With `needs rooms: the Lodge` alone: `2 of 3 held, 1 unproven`, "161 states, 239 commands, stopped: max-depth-reached". Gate Court put back.
- Broke the ward trait (removed `change it to lifted`): `✗ opening-lodge — unbind grille: State assertion failed: the iron grille is lifted. the iron grille is "standing", expected "lifted"` with the prose beneath; 35 cards failing in all (the book's one plus thirty-four); lock line `— NOT held there: the iron grille is standing`; the claim UNPROVEN after a walk stopped at `max-seconds` (8100 states here; the book's 11612 is clock-bound, as its "Under the Hood" says). Exit 1; the run took four minutes because "the story can be won" was walked for its two minutes as well. Line put back: `3 of 3 held`, and the final claims section matches 39.11's block line for line.
- `--verbose` prints `Claims budget per walk: 120s, 500000 states, depth 80`, as quoted.
- Not tried, as instructed (accepted item 4): locking a fact after the line's first `put`; a `needs verbs` line naming `put`.
- Not reproduced (no step): `claims.state-unknown` (39.4), the canonical-form refusal (39.7), the lock pinned one card early (39.6), the first cake claim as a fourth claim (39.8; build-and-try has the reader narrow the second one instead, which I did).
- Disclosure: one of my commands ran a `diff` of my claims file against `chapter-39`'s with its output thrown away; nothing from it was read or used.
- No issues.

## Chapter 40 — Publishing

STATUS: PASS-WITH-ISSUES

- `sharpee ifid generate` printed one identifier (`07D1E9A4-2041-47C3-935A-6206ACDFAF8D`; a run value).
- Set `story-version: 1.0.0` and added `publish-source: yes` to the header; gate-clean. The terminal opening prints the four lines with the version last (`Story v1.0.0`), as 40.2 says. `sharpee test .` → `183 cards passing`, `claims: 3 of 3 held (seed 42)`.
- `sharpee publish relighting.story` printed the book's report line for line (run values differ: `game.js 2.4mb`, `2425.8 KB`, `Done in 44ms`, `dist/relighting.zip (0.8 MB)`), with the IFID `C24E29F8-C36B-4F55-9FE9-B6D75AE7133D`. The zip holds exactly the fourteen files listed in 40.5; no `game.js.map`, no `index-testing.html`, no test tree, no claims file.
- Extracted into the empty folder `~/repos/published`, served with `npx serve .` from inside it, and played from the lodge to the beacon with Playwright: the page opens in the paper theme with the title, `Story v1.0.0`, the description and the author; `audio/catch.mp3` (206), `audio/toll.mp3` (206), `img/lantern-lit.png` (200, shown on `spark lantern`) and `audio/lapping.mp3` (206) all loaded; `spark beacon` printed the winning passage and "You have risen to the rank of a Lamplighter.", the picture was taken down on that turn, and the status line read `Score: 50`. No console errors, no failed requests.
- **Ambiguity resolved — (a) Chapter 40, "40.7 Build and try it".** (b) "unzip dist/relighting.zip into an empty folder". (c) The book gives no command for the step, and this box has no `unzip` command (`/bin/bash: line 1: unzip: command not found`). I extracted the archive with `python3 -m zipfile -e`, which was already on the box; nothing was installed. This is as much the box as the book.
- Not reproduced (no step): the "has no identity" refusal (40.4), `--out`, `--no-menu`.

## Totals

| Status | Chapters | Count |
|---|---|---|
| PASS | 2–37, 39 | 37 |
| PASS-WITH-ISSUES | 1, 38, 40 | 3 |
| BLOCKED | — | 0 |

DEVIATION entries: 0.

Issues and ambiguities logged (4):

1. Chapter 1 — listings wrap long lines with no mark and return to the margin; typed as printed they would break the file. (Ambiguity; my reading compiled.)
2. Chapter 38 — the first segment is never printed in its finished, asserted form; the reader assembles it from 38.3 and 38.5. (Ambiguity; my reading gave the book's counts.)
3. Chapter 38 — `sharpee test . --json --capture-output` also prints the full human-readable derived-tests report in a terminal, where the book says the output is one JSON record to a line.
4. Chapter 40 — "unzip" has no command given, and the box has no `unzip`. (Ambiguity; extracted with Python's `zipfile`.)

Every block of story output the book prints for The Relighting, the Cellar and the Yard was reproduced word for word, apart from the differences the brief accepts (version numbers, run values, and text that varies by turn). Output blocks from "another story" and diagnostics shown without a step were not run, and are listed under each chapter.

By the brief's definition this run is not "clean": zero BLOCKED and zero deviations, but three chapters carry a logged ambiguity or issue.
