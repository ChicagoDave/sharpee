# Execution log — The Chord Manual, documentation acceptance test

- `sharpee --version` output: `Sharpee 5.6.2 · Chord 4.0.3`
- Title page version line: `Chord 4.1.0, Sharpee 5.7.0`

## Setup

1. `npm config get prefix` → `/home/node/.local` (under home). PASS
2. Playwright in `~/tools/playwright`: three-line script launched Chromium (159.0.8154.6) and closed it. PASS
3. `~/repos/book-test` holds one PDF (`the-chord-manual-4.1.0.pdf`) and `companion`. PASS
4. `pdftotext -v` → 22.12.0; `pdftoppm -v` → 22.12.0. PASS

Project folder: `~/repos/relighting`. Node v22.23.2.

Substitution (logged once): no interactive session can be held, so every `sharpee play .` in this run is fed its commands on standard input, one to a line, ending with `/quit`.

## Preface / How to read this book

Read. Nothing to execute. No issues.

## Chapter 1 — The shape of a story file

STATUS: PASS

- Typed the story at the top of the chapter into `relighting/relighting.story` (continuation rows joined with one space, mark left out, as 0.7 says).
- The two illustrated errors (`lex.tab-indent` at 5:1, `parse.unterminated-block` at 30:1) were reproduced word for word once the command existed (chapter 4).
- "Under the Hood" `sharpee compose relighting.story -o relighting.ir.json` run at the end of chapter 4, as the box says.

## Chapter 2 — The story header

STATUS: PASS

- Nothing is built in this chapter (2.2 says so). `about` output (2.3) and the opening (2.4) reproduced exactly in chapter 4. Illustrated errors `parse.header-inline-list` (3:3) and `parse.header-unknown-field` reproduced with identical wording. The smallest-header opening (2.2), the `parse.story-title` error and the IR excerpt were read, not run (no step asks for them).

## Chapter 3 — The player and the start

STATUS: PASS

- `examine me` output matches. Illustrated errors `analysis.start-block-missing` (4:1), `analysis.player-target-not-playable` (30:3) and the "not placed in the world" load error reproduced word for word.

## Chapter 4 — Build, play, read an error

STATUS: PASS

- `npm install -g @sharpee/devkit` ended with the blocked-install-script warning the book predicts. `sharpee --version` → `Sharpee 5.6.2 · Chord 4.0.3` (accepted, item 8).
- 4.3 check, 4.4 play transcript and the five commands, 4.5 `playble` (31:3 and 24:3), 4.6 `Loge` (25:13), 4.7 warning (16:8), 4.8 both folder errors, and the Under-the-Hood `compose -o` (2 entities, 0 traits, 0 actions): all identical to the book apart from the version numbers and the loading path.
- Ambiguity resolved (minor): 4.4's printed play transcript wraps `--- Play Mode ---    (/quit or /q to exit)` with four spaces; the command prints two. Taken as page layout, not reported as a wording difference.

## Chapter 5 — Rooms and exits

STATUS: PASS

- Copied `chapter-05/relighting.story`; gate-clean. Walked the map; 5.6, 5.7 and 5.8 output blocks identical. Illustrated errors (missing-kind-noun, duplicate-exit, `Cloyster`) and the Den/Attic example belong to other files and were read, not run.

## Chapter 6 — Things

STATUS: PASS

- Copied `chapter-06/relighting.story`; gate-clean. All output blocks in 6.1–6.8 identical (listing line, examine/take lamp, take chair, take hobb, inventory, spectacles/search/glasses, drop lamp/look). The curtain example (6.7) is "from another story" and was not run.

## Chapter 7 — Containers and supporters

STATUS: PASS

- Copied `chapter-07/relighting.story`; gate-clean. Every output block in 7.1–7.7 identical (desk/grimoire, crate/lens, `holds 1`, lantern, empty press, chair enter/exit, `put kettle on chair`, look). Bell jar and table examples are from "another story"; not run.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

- Copied `chapter-08/relighting.story`; gate-clean. 8.3 chain, wrong key, and 8.7 close/lock/east identical. 8.4 `opens when unlocked` is stated as left out of the story and 8.6 is a draft anecdote; neither run.

## Chapter 9 — What things can do: the trait words

STATUS: PASS

- Copied `chapter-09/relighting.story`; gate-clean. Coat, grimoire (examine/read), seed cake, bell rope, cup, `read coat`, `eat coat`: identical. Hat/cap, trolley, tassel and wireless examples use rooms (`the Den`, `the Yard`) that are not in The Relighting; read, not run.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

- Copied `chapter-10/relighting.story`; gate-clean. Dark Undercroft, lamp lit/put out/relit, `light taper`, lamp left below: identical. Tin example is "from another story"; not run.

## Chapter 11 — Regions

STATUS: PASS

- Copied `chapter-11/relighting.story`; gate-clean. Tower from both sides of the arch, the three stacks and the final `north`: identical. Kettle placed `in the Grounds`: error `relighting.story:142:3 … [analysis.thing-in-region]` identical, line number included; restored, gate-clean.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS

- Copied `chapter-12/relighting.story`; gate-clean. Blocked stair, hearth passage dark and lit, `squeeze behind hearth` in the Undercroft: identical. 12.2: removed the `up is blocked` line (line 102), walked up, `east` printed the phrase and `[The story has ended. RESTART, RESTORE or UNDO]` as printed; line put back, gate-clean.

## Chapter 13 — States

STATUS: PASS

- Copied `chapter-13/relighting.story`; gate-clean. `read page` identical. 13.4 experiment: added `change the iron grille to lifted` to the start block, `up` from the Bell Stair printed the Lantern Gallery text as printed; line removed, gate-clean. Under-the-Hood `compose -o relighting.json`: grille entry has `states` in order and `statesReversible` beside it, as described. Sluice, dial and `probe.story` errors belong to other stories; read, not run.

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS

- Copied `chapter-14/relighting.story`; gate-clean. Kettle refusal, spark page, rope, grille (push/pull), spectacles given, Library first entry, cake: identical. Under-the-Hood `sharpee test .` run inside `companion/chapter-14` as the box directs: prints a list under `Derived rule tests (ADR-356): 11 branches` including `kettle · on taking`, as described.

## Chapter 15 — What a clause can say and do

STATUS: PASS

- Copied `chapter-15/relighting.story`; gate-clean. Lamp refused before the page, cake refused under Hobb's eye (and eaten in the Gate Court), candles and the unbind page, spark page read twice, lamp lit and Undercroft: identical. Under-the-Hood `sharpee test .` in `companion/chapter-15` lists `hand lamp · on lighting · refused no-such-word` and `seed cake · on eating · refused cake-watched` as quoted. The Great Lantern's two requirements cannot be reached in play at this chapter (stair sealed); seen only in that derived-test list.

## Chapter 16 — Conditions

STATUS: PASS

- Copied `chapter-16/relighting.story`; gate-clean. Grimoire before/after, hush page blank then read: identical. Under-the-Hood IR: `lantern-ready` under `conditions` is an `and` of two tests, `faded-page` has `"open": true`, as described.

## Chapter 17 — Choosing between outcomes

STATUS: PASS

- Copied `chapter-17/relighting.story`; gate-clean. Cistern, four rope pulls (cycling), four grille examinations: identical. Under-the-Hood `sharpee test .` in `companion/chapter-17` lists `spark page · on reading · when legible`, `… when learned`, `iron grille · after examining · the third time`, and the cistern's three arms with `◌`, as described.

## Chapter 18 — Counting, scoring and ending

STATUS: PASS-WITH-ISSUES

- Copied `chapter-18/relighting.story`; gate-clean. `score` 5/25 Latecomer, rank rise on the candles, `score` 10/25, fourth pull "Your palms have begun to object.": identical. 18.6: made `~/repos/relighting-endings` with a copy and the four start-block lines; both endings (cracked lens; with `change the lens to sound`) identical to the book.
- Issue (listing vs companion story) — 18.5 "Winning and losing". (a) The book's listing of `create the Great Lantern` prints `score relit worth 15` among the short facts, directly under `holds 1` and above the description. (b) In the copied `chapter-18/relighting.story` the line stands after the description paragraph (line 270: blank line, `score relit worth 15`, blank line, then the `on the player lighting` clause). (c) Both compile; a reader comparing page and file sees two different places for the line, and the chapter never says a `score` line may also follow the description. (The spark page's `score` line in 18.3 does match the file.)
- Ambiguity resolved: 18.6 says "Check and play it there" for `relighting-endings`; the main project was left as the companion copy.

## Chapter 19 — Time

STATUS: PASS

- Copied `chapter-19/relighting.story`; gate-clean. Timer lines (creak, sway, strike), cistern sweating then breaking up, bell tolling, rank line, mend page, `score` 15/35, blue flame morning/later: identical apart from which bell line closes a turn (accepted, item 6). In a second play, 82 bare `wait`s: "The light has turned…" on turn 50 and the dusk ending on turn 80, as printed. Under-the-Hood IR: timer `waking` has states creak/sway/strike; sequence `the day` has `"narration": "broadcast"`.

## Chapter 20 — Phrases

STATUS: PASS

- Copied `chapter-20/relighting.story`; gate-clean. Three `no-such-word` variants, Hobb's three sayings on three entries, gate motto (three centred lines, relative indentation as printed), `examine bell` with the count, Bell Stair description with the grille sentence, Hobb deafened: identical.

## Chapter 21 — A thing's own words

STATUS: PASS

- Copied `chapter-21/relighting.story`; gate-clean. Lodge opening with Hobb's `present` sentence, lamp before/after lighting, candles before/after, lens detail: identical. The cat example (`the Yard`) is not in The Relighting; not run.

## Chapter 22 — Changing the standard messages

STATUS: PASS

- Copied `chapter-22/relighting.story`; gate-clean. `sharpee messages`: a count line (`Message catalog: 885 overridable messages (en-US)`) and the list as one line; the four entries quoted in the chapter are in it character for character. Dark-room override, `look` in the dark, three `wait` variants, `take lamp` → "You take it.", grille and kettle phrasebook entries before and after the page: identical.
- Note (not counted as an issue): the count line is written to standard error and the list to standard output, so "send the list to a file" with `>` leaves the count on the screen. The chapter does not say either way.

## Chapter 23 — New verbs

STATUS: PASS

- Copied `chapter-23/relighting.story`; gate-clean. `spark` with no target, `mend lamp` before the page, `hush bell` in the Library, `spark lamp` / `spark grimoire` misses, `gnusto` (all three patterns), the four `remember`/`recall` replies, `shout` not understood: identical. Scrawling, shouting-while-tolling and tuning are stated or evident examples outside the story; not run.

## Chapter 24 — New kinds of thing

STATUS: PASS

- Copied `chapter-24/relighting.story`; gate-clean. Played the whole game to the win in the order 24.7 describes: every block identical (`spark lamp` twice, `light lamp` refusal, `spark candles` with rank, empty-Lantern refusal, `unbind grille` under the bell, `hush bell`, `unbind grille` with "rank of a Journeyman", `mend spectacles`, `mend lens`, `examine lens`, final `spark lantern` with "rank of a Lamplighter"). Second play with the lens left cracked ends in the loss text. Under-the-Hood IR: `wick`'s sparking clause has `"routing": "capability"`. The burner/cresset/brazier example is "from another story"; not run.

## Chapter 25 — Bending the standard grammar

STATUS: PASS

- Copied `relighting.story` and `synonyms.chord` from `chapter-25`; gate-clean. `synonyms.chord` is line for line the listing in 25.6. `sit on chair` → "I don't understand that." confirmed against the chapter-24 story (put back for one command), then with chapter 25's story: `sit on chair` / `exit`, `light lamp` before and after the page, `light lamp with taper`, `quiet bell`, `fix spectacles` (carries the Journeyman line, as the chapter says), `repair lens`, `unbind grille`, win: identical.

## Chapter 26 — People who act

STATUS: PASS

- Copied `chapter-26/relighting.story`; gate-clean. Hobb closing the press (both blocks), Tamsin in the Refectory (`examine tamsin`, sorting, leaving west), the wisp arriving and following, Tamsin entering the Cloister from the east on the first tolling turn, the Bell Stair view two turns later and the two `wait`s after it, `talk to hobb` → "Hobb doesn't respond.": identical, turn for turn. Sam, the cat, the watchman and Nell belong to other stories; not run.

## Chapter 27 — Asking and telling

STATUS: PASS

- Copied `chapter-27/relighting.story`; gate-clean. Hobb on the dimming, Tamsin, the kettle, the bell (refused before it rings; answered with the hush page handed over once it tolls; nothing to give the second time), unknown subject with the override, `ask hobb for the kettle`, grimoire consulted three ways, `talk to hobb` / `goodbye` / `talk to hobb`, `talk to tamsin` → "Tamsin Vey doesn't respond.", `read hush page`: identical; the manner beat before an answer is sometimes a different one of Hobb's three, as 27.1 says it will be.
- Not reproducible with the copied story: 27.1.3's first block (`Hobb says, "I don't know anything about that."`) is the stock answer before the override that the same story already contains. Read, not run.

## Chapter 28 — Conversations with a shape

STATUS: PASS

- Copied `chapter-28/relighting.story`; gate-clean. Thread beats, parting and resuming rows, `say maybe`, `yes` with the page handed over and the conclusion, `no` with the conclusion, the dead thread, the `price` row before / after / once bound, Tamsin taking the next beat on a silent turn, brass asked once and again, the silence line after two waits, Hobb's `last night` row before and after the dimming: identical (manner beats aside, as above).

## Chapter 29 — Inner lives

STATUS: PASS-WITH-ISSUES

- Copied `chapter-29/relighting.story`; gate-clean. Hobb refusing `last night` to a stranger, spectacles given, `talk to hobb`, `last night` told; Tamsin on magic before and after the bargain; Hobb rattled under the bell (`ask hobb about the bell`): identical (which of Hobb's three calm beats comes up differs, accepted per 27.1). Nell/Tom rumour example is another story; not run.
- Issue — 29.1.2 "Changing a mood". (a) The book says: "Hush the bell, and by the time Ansel has walked back to the Lodge he is calm again and turning his kettle." (b) Hushed the bell in the Bell Stair and walked straight back (`south`, `south`, `south`). On arrival Hobb's answers carried no manner sentence at all, neither the calm one nor the rattled one:
  ```
  > ask hobb about the dimming
  "Went out like a pipe," says Hobb. "No bang. The Master stood in the court with his hand up for an hour and nothing came to it."
  > ask hobb about tamsin
  "Vey? Takes the brass and leaves the hinges. I let her. …
  ```
  (c) After three more `wait`s the calm beat returned (`> ask hobb about gnusto` / `He turns the kettle a quarter round on its hook, to no purpose.`). So he is not yet "calm again and turning his kettle" by the time Ansel has walked back; for the first turns in the Lodge he has no manner. The chapter does not mention a stretch with no beat.

## Chapter 30 — Principles

STATUS: PASS

- Copied `chapter-30/relighting.story`; gate-clean. `last night` withheld with the stock line while Hobb is wary, the `spectacles` row, spectacles given, `last night` told: identical (manner beat differs: the page shows the kettle beat before the spectacles answer, play gave "He looks at the blue flame on the sill before he answers."; accepted per 27.1). Cy and the six-person table are other stories; not run.
- Ambiguity resolved: 30.3 says "Then the spectacles are mended and given"; they were given unmended, as chapter 29's "Build and try it" allows ("mended or not"), and the result was the printed one.

## Chapter 31 — More than one protagonist

STATUS: PASS

- Copied `chapter-31/relighting.story`; gate-clean. Role handed to Hobb on the fourth turn after the page (`light lamp with taper` block), `look` as Hobb, `inventory` (printed "You aren't carrying anything at all." where the page has "Your hands are empty."; one of the three stated sentences, item 6), `north` blocked, `take kettle`, `examine newspapers` handing the role back, `look` in the Library with the wisp: identical.

## Chapter 32 — Machines

STATUS: PASS

- Copied `chapter-32/relighting.story`; gate-clean. Played the winning walk to the roof. `turn crank` (leaves part), `turn crank` with the seat empty (platform line only), `push crank` (pawl), `spark lantern` shuttered, `turn crank` after seating (pawl, shutters open), shutter detail in both states, win: identical.

## Chapter 33 — Vehicles

STATUS: PASS

- Copied `chapter-33/relighting.story`; gate-clean. With the lens: `up` answered by the grille while it stands and by "The lens is as wide as a cartwheel…" once it is lifted. Lens given to the hoist before the grille is lifted (found in the Library) and after (found on the roof); `put lens in hoist` / `look`, the Lantern Gallery `look`, `put lens in lantern` with "The book hoist pulls away.", `enter hoist` / `look`: identical. Tram, balloon, cart and barge are other stories; not run.

## Chapter 34 — Open water and open ground

STATUS: PASS

- Copied `chapter-34/relighting.story`; gate-clean. Won as far as the roof (`score` 45 of 50), water gate shut before and open after, `enter skiff`, `steer east`, `wait`, `make sail`, `look` one unit out, two waits, `look` with the isle in the distance and the rock line, arrival, `spark beacon` with "rank of a Lamplighter" and the ending: identical. Raft and bottle are other stories; not run.

## Chapter 35 — The opt-in systems

STATUS: PASS

- No companion folder, as the chapter says. Typed `cellar/cellar.story` and `yard/yard.story` in folders beside the project; both gate-clean. Cellar: `attack rat` → "You land a solid blow on the rat, dealing 1 damage!", `take poker` → "Taken.", then two misses ("You swing at the rat but miss!") before "You have slain the rat!" (fight rolled afresh, item 6; every line is one the chapter quotes). Yard: "You could eat." on the first `wait`, "You are hungry now…" on the third, "You have starved to death." and the ending on the eighth: identical.

## Chapter 36 — Sound, music and pictures

STATUS: PASS

- Copied `relighting.story` and the `assets` folder (`audio/catch.mp3`, `audio/lapping.mp3`, `audio/toll.mp3`, `img/lantern-lit.png`) from `chapter-36`; gate-clean. In the terminal: `light lamp` ending "The wick takes with a small dry sound, like a page turned.", the hand-over to Hobb with the wisp's flinch line, "Somewhere in the Hall, iron complains about iron." after waiting in the Library, "Iron shrieks on iron, close by, and stops." both on walking into the Bell Stair as Tamsin pushes and after a `wait` in the Cloister: identical. The gramophone/curtains example (`the Parlour`) is another story; not run. Recordings and picture are checked on the page in chapters 37 and 40.

## Chapter 37 — The page the player sees

STATUS: PASS-WITH-ISSUES

- Copied `relighting.story`, `relighting.config.json` and the `browser` folder from `chapter-37`; gate-clean. `sharpee build relighting.story` printed the block in 37.2 line for line, without the "Minted the story's ifid" line (as 37.9 says) and with run-specific sizes and timing (`game.js 2.4mb`, `Done in 62ms`; item 3). `npx serve dist/web/relighting` served at `http://localhost:3000`.
- Playwright (Chromium, from `~/tools/playwright`): page opens on the title and prologue in the `paper` theme; Settings → Theme lists `Classic`, `Paper`, `Modern Dark`. Played to the Library and read the spark page: a side column opened with `workings` / `spark: wakes a flame`. Chose Modern Dark, reloaded: the page came back in `modern-dark`, and `localStorage` holds `relighting-theme` = `modern-dark` beside `relighting-save-autosave` and `relighting-saves-index`, as described. A second, full walk on the page: panel shows the four lines in the printed order (spark, unbind, hush, mend); the page requested and received `audio/catch.mp3` (206), `audio/toll.mp3` (206), `audio/lapping.mp3` (206) and `img/lantern-lit.png` (200; rendered 960×600 in `#sharpee-media`). No console errors, no failed requests.
- Issue — 37.9 "Build and try it" (reload step). (a) The book says: "Then change the theme from the Settings menu and reload the page. The theme you chose has been remembered." It says nothing else about what the reload does. (b) After the reload the page restored the game (`[Session restored]`, transcript replayed, `Score: 5 | Turns: 11`), but the `workings` column that the chapter has just built was gone (sidebar empty and hidden, though the spark page had been read), and the status line no longer showed the room name (before: `LIBRARY` / `Score: 5 | Turns: 11`; after: `Score: 5 | Turns: 11` only). (c) The theme claim itself holds; the lost panel and room name are not mentioned anywhere in the chapter, which elsewhere says the panel "grows as Ansel learns" the workings.
- Ambiguity resolved: "serve the folder and open the address it prints" was done with Playwright per the run brief; "see that your machine's sound is up" cannot apply here (item 5).

## Chapter 38 — Test trees

STATUS: PASS

- No story copy in this chapter's "Build and try it"; worked on the chapter-37 story as instructed. Wrote `relighting.tests/manifest.json` and `mainline.json` (four skip cards) by hand, two-space indentation as the page shows (checked the page image with `pdftoppm`). `sharpee test . --json --capture-output > records.txt`: one JSON record per line; the `card0003` record is the one printed in 38.4 apart from `elapsedMs`; the derived-test report still printed in the terminal.
- Replaced `mainline.json` with the asserting version: `✓ opening-lodge` / `3 cards passing, 4 assertions passing`, exit 0. With `"contains": ["Taken."]`: the 38.6 failure block word for word, exit 1. Added `onward01.json` and `thecake1.json` together: the 38.7 block word for word (`6 cards passing, 9 assertions passing` / `6 commands (6 authored + 0 replayed), 1 restored at a fork`).
- Deliberate break: `cake-watched` changed to "You decide against it." → `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` with the story's line beneath; put back, tree passes.
- Replaced the folder with `chapter-38/relighting.tests`: seven lines, `183 cards passing, 275 assertions passing`, `182 commands (182 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134` with 81 unexercised lines, `Endings reached: 2 / 3` (`relighting.story:314 · night-falls (lose)`), `Rooms entered: 13 / 13`: identical.
- The "not in canonical form" message (38.3) is illustrated, not instructed; not run.

## Chapter 39 — Claims

STATUS: PASS

- Worked in the project as chapter 38 left it. `sharpee claim winning1` → the "no line" listing of seven lines as printed. `sharpee claim thelodge --at 82` → the ten printed facts, twenty-three more, and the `Lock one with:` line. The lock command printed the 39.2 block word for word and wrote `relighting.claims.chord` (identical to the 39.3 listing), the `claims` key in the manifest and the `locks` key on card `b7wicd1b` in `thebell1.json`. `sharpee test .` → `claims: 1 of 1 held (seed 42)` block as printed.
- Hand-written "the story can be won" claim plus the `locks` key on card `bjhmo3xt` in `winning1.json` → the `2 of 2 held` block as printed. Second cake claim → `3 of 3 held`, `1 walk`, witness `take seed cake / north / eat seed cake`, as printed. `needs rooms: the Lodge` alone → `UNPROVEN … max-depth-reached after 161 states` (161 states, 239 commands, as in 39.8); Gate Court put back.
- Deliberate break (removed `change it to lifted` from the `ward` trait, line 185): the `✗ opening-lodge — unbind grille: State assertion failed…` lines as printed, 35 cards failing, both locks `NOT held there`, two claims unproven, three walks, run took 4m01s ("about four minutes"); state and command counts of the clock-stopped walks differ from the page's single-claim example, as the box says they may. Line put back; final `sharpee test .` gives the 39.11 block word for word. `--verbose` prints `Claims budget per walk: 120s, 500000 states, depth 80`.
- Not tried, as the book states them as faults (item 4): locking a fact after the line's first `put`; a `needs verbs` line naming `put`. The canonical-form refusal, the `claims.state-unknown` error, the one-card-too-early lock and the shared-`needs` block are illustrations with no step; not run.
- Note (not counted as an issue): chapter 38 printed `183 cards passing, 275 assertions passing` for the full tree; once locks are pinned the same line reads `277 assertions passing`. Chapter 39 never prints that line, so nothing on the page is contradicted.

## Chapter 40 — Publishing

STATUS: PASS

- This chapter's "Build and try it" copies nothing; edited the project's own story as it says: `story-version: 1.0.0` and `publish-source: yes` in the header (placed under `story-version:`; the chapter says the place does not matter). Gate-clean. Terminal opening prints title, description, authors, `Story v1.0.0` (version last, as 40.2 says).
- `sharpee ifid generate` → one identifier (`211F9779-94AC-43F1-BBF1-3083FD0D0BFB`; run value). `sharpee test .` → all seven lines pass, `claims: 3 of 3 held (seed 42)`.
- `sharpee publish relighting.story` printed the 40.4 block line for line (run values: `game.js 2.4mb`, `Done in 42ms`, `game.js 2425.8 KB`, `dist/relighting.zip (0.8 MB)` against the page's 1.9mb / 66ms / 1907.7 KB / 0.7 MB; item 3). IFID line `C24E29F8-C36B-4F55-9FE9-B6D75AE7133D` as printed. `dist/web/relighting` has no `game.js.map`. The zip holds exactly the fourteen files listed in 40.5, `index.html` at the top; no test tree, no claims file, no `index-testing.html`.
- `unzip dist/relighting.zip -d ../relighting-published`, `npx serve .` inside it, then Playwright: page opens with `The Relighting` / `Story v1.0.0` / description / `By The Sharpee Project`; played from the Lodge to the beacon (57 turns): workings panel fills in order, `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` (206 each) and `img/lantern-lit.png` (200, rendered) all loaded, the picture is shown from the lit Lantern through the crossing and removed on `spark beacon`, final text is the 34.7 ending with "You have risen to the rank of a Lamplighter." and `Score: 50`. No console errors, no failed requests.
- Ambiguity resolved: the run brief says each "Build and try it" from chapter 5 on begins with a companion copy; chapter 40's does not (it only mentions that `chapter-40` "holds the story as it was published"), so nothing was copied and that folder was not opened. Same for chapters 38 and 39 (38 takes only the test tree, at its last step).
- The "has no identity" refusal (40.4) is illustrated, not instructed; not run.

## Appendices A–G

Read, not run (item 7). Each opens with a "Generated from … (Sharpee 5.6.2 · Chord 4.0.3)" line (accepted, item 8). Where chapters lean on them, the heads agree with the text: Appendix F states 885 aliases (the count `sharpee messages` printed in chapter 22).

## Summary

| Status | Chapters | Which |
|---|---|---|
| PASS | 37 | 1–17, 19–28, 30–36, 38–40 |
| PASS-WITH-ISSUES | 3 | 18, 29, 37 |
| BLOCKED | 0 | — |

DEVIATION entries: 0. No story line was invented, renamed or changed outside the breaks the book itself orders, and every such break was put back.

Issues reported (3), none on the accepted-by-design list:

1. Chapter 18, 18.5 — the printed `create the Great Lantern` listing puts `score relit worth 15` among the short facts; the companion `chapter-18/relighting.story` has it after the description.
2. Chapter 29, 29.1.2 — "by the time Ansel has walked back to the Lodge he is calm again and turning his kettle": on walking straight back after hushing the bell, Hobb answers with no manner sentence at all for the first turns; the calm beat returns a few turns later.
3. Chapter 37, 37.9 — after the reload the step asks for, the theme is remembered as stated, but the `workings` panel is gone and the status line has lost the room name; the chapter does not mention either.

Things in the book that this run could not or did not execute, each noted in its chapter: examples the book places in other stories (the Den, the Yard, the Shed, the Parlour and their kin), `probe.story` diagnostics, the two faults the book states in chapter 39, and 27.1.3's pre-override stock answer.

Files left by the run: `~/repos/relighting` (project, as published), `~/repos/relighting-endings` (18.6), `~/repos/cellar`, `~/repos/yard` (35), `~/repos/relighting-published` (40), and two helper scripts in `~/tools/playwright` (`probe.js`, `drive.js`).
