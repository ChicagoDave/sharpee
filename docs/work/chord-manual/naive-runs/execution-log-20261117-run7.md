# Execution log — The Chord Manual, documentation acceptance test

`sharpee --version`:

    Sharpee 5.6.2 · Chord 4.0.3

Title page version line:

    Chord 4.1.0, Sharpee 5.7.0

## Setup

1. `npm config get prefix` → `/home/node/.local` (under home). PASS
2. Playwright in `~/tools/playwright`: three-line script launched Chromium (159.0.8154.6) and closed it. PASS
3. `~/repos/book-test` holds `the-chord-manual-4.1.0.pdf` and `companion`. PASS
4. `pdftotext -v` and `pdftoppm -v` both print `version 22.12.0`. PASS

Method notes (logged once):

- The book was read with `pdftotext -layout`.
- `sharpee play .` could not be held interactively. From chapter 4 on, commands are sent on standard input, one to a line, ending with `/quit`.
- Project folder: `~/repos/relighting`.

## Preface and How to read this book

STATUS: PASS (nothing to execute).

## Chapter 1 — The shape of a story file

STATUS: PASS-WITH-ISSUES

- (a) 1.7 "What you have so far". (b) "Make a new folder called relighting for it, with nothing else inside." The book does not say where to make the folder. (c) Ambiguity resolved by making `~/repos/relighting`. Worked.
- (a) Chapter opening listing and 1.4 "Blank lines". (b) The printed listing shows two blank lines between blocks and between a header line and its description; 1.4 says "A second blank line inside a description starts a second paragraph" but not how many blank lines the listing really has. (c) Ambiguity resolved by typing one blank line wherever the page shows a gap. That reading matches the line numbers the chapter-4 diagnostics quote (24, 25, 31, 16) and the story is gate-clean.

## Chapter 2 — The story header

STATUS: PASS-WITH-ISSUES

No commands to run in this chapter. The `about` block (2.3) and the opening (2.4) were reproduced word for word in chapter 4's play.

- (a) 2.2 "What the player sees". (b) "With the smallest header above, the opening looks like this:" followed by a room described as `The porter's lodge is one small room.` (c) With the smallest header and the rest of the story as chapter 1 has it typed, the first three lines match (`The Relighting` / `By The Sharpee Project` / `Story v0.0.0`) but the room prints the full description: `The porter's lodge is one small room built into the thickness of the gate arch. A chair, a kettle and thirty years of newspapers have filled most of it. On the sill a lamp is burning with a steady blue flame.` The book's block shows a Lodge description the reader was never given. (Tried in a scratch folder, not in the project.)

## Chapter 3 — The player and the start

STATUS: PASS

No commands to run. `examine me` (3.1) reproduced word for word in chapter 4's play. The diagnostics in 3.4 are described, not instructed, and were not provoked.

## Chapter 4 — Build, play, read an error

STATUS: PASS

- 4.1: `npm install -g @sharpee/devkit` ended with the install-script warning the book predicts. `sharpee --version` printed `Sharpee 5.6.2 · Chord 4.0.3` (expected for this run).
- 4.3 check, 4.4 play (all five commands), 4.5 `playble`, 4.6 `Loge`, 4.7 warning, 4.8 both folder errors, and the Under the Hood `compose -o relighting.ir.json`: every line matched the book apart from the version numbers and the path. Story restored after each break and re-checked gate-clean.

## Chapter 5 — Rooms and exits

STATUS: PASS

Copied `chapter-05/relighting.story`; gate-clean. 5.6 (first visit, `look`), 5.7 (`The Porter's Lodge`), 5.8 (walk to the roof, `east`) all reproduced word for word. 5.4's `down` block belongs to the Den/Attic example, which is not The Relighting, and was not run.

## Chapter 6 — Things

STATUS: PASS

Copied `chapter-06/relighting.story`; gate-clean. Every block reproduced word for word (`You can see a kettle, a hand lamp, and Hobb here.`, `examine lamp`, `take lamp`, `take chair`, `take hobb`, `inventory`, the spectacles, `drop lamp` / `look`). `examine arch` and `examine motto` both found the gate. The curtain (6.7) is from another story and was not run.

## Chapter 7 — Containers and supporters

STATUS: PASS

Copied `chapter-07/relighting.story`; gate-clean. Every block for The Relighting reproduced word for word (Library and grimoire, crate and lens, `There's no room in the crate.`, `put lens in lantern`, the empty press, the chair, `put kettle on chair` / `look`). The bell jar and table (7.5) are from another story and were not run.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

Copied `chapter-08/relighting.story`; gate-clean. 8.3 (locked, press, key, wrong key, unlock, closed, open, Library) and 8.7 (close, lock, `east`) reproduced word for word. 8.4 (`opens when unlocked`) and 8.6 (key ring) describe lines the story does not have and were not run.

## Chapter 9 — What things can do: the trait words

STATUS: PASS

Copied `chapter-09/relighting.story`; gate-clean. Coat, grimoire, seed cake, bell rope, cup, `read coat`, `eat coat` all reproduced word for word. Hat/cap, trolley, tassel and wireless are from another story and were not run.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

Copied `chapter-10/relighting.story`; gate-clean. 10.1 (grue, dark `look`, `examine crate`, `up`), 10.2 (`light lamp`, lit Undercroft, `extinguish lamp`, relight, `light taper`) and 10.6 (lamp left below) reproduced word for word. The tin (10.5) is from another story and was not run.

## Chapter 11 — Regions

STATUS: PASS

Copied `chapter-11/relighting.story`; gate-clean. Tower from both sides of the arch, the three stacks and `You can't go that way.` reproduced word for word. Kettle placed `in the Grounds`: diagnostic matched exactly, at `relighting.story:142:3`. Kettle put back; gate-clean again.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS

Copied `chapter-12/relighting.story`; gate-clean. Blocked stair, `examine hearth`, the passage in the dark, `I don't understand that.` in the Undercroft, and the passage with the lit lamp reproduced word for word. 12.2: removed `up is blocked: stair-sealed` (line 102), walked up, stepped east: phrase and `[The story has ended. RESTART, RESTORE or UNDO]` matched; line put back, gate-clean.

## Chapter 13 — States

STATUS: PASS

Copied `chapter-13/relighting.story`; gate-clean. `read page` (13.8) reproduced word for word. 13.4: added `change the iron grille to lifted` to the start block, walked up to the Lantern Gallery (text matched), removed the line; gate-clean. Under the Hood: `sharpee compose relighting.story -o relighting.json` ran; the grille entry has `states: ["standing", "lifted"]` and `statesReversible: false` beside it, as described. Sluice and dial are from another story and were not run.

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS

Copied `chapter-14/relighting.story`; gate-clean. Kettle, spark page, bell rope, grille, spectacles, Library `once` clause, cake, and `search` / `take spectacles` reproduced word for word. Under the Hood: `sharpee test .` in `companion/chapter-14` printed a list headed `Derived rule tests (ADR-356): 11 branches` containing `kettle · on taking`, as the box says. The dial clause (14.6) is from another story.

## Chapter 15 — What a clause can say and do

STATUS: PASS

Copied `chapter-15/relighting.story`; gate-clean. `light lamp` refusal, cake refusal (and eaten in the Gate Court), candles and unbind page, both readings of the spark page, lamp lit and Undercroft reproduced word for word. Under the Hood: `sharpee test .` in `companion/chapter-15` lists `hand lamp · on lighting · refused no-such-word` and `seed cake · on eating · refused cake-watched`, as quoted.

## Chapter 16 — Conditions

STATUS: PASS

Copied `chapter-16/relighting.story`; gate-clean. Grimoire before and after, hush page blank, then readable, reproduced word for word. Under the Hood: `sharpee compose relighting.story -o relighting.ir.json`; `lantern-ready` is under `conditions` as an `and` with two operands, and `faded-page` has `"open": true`, as described.

## Chapter 17 — Choosing between outcomes

STATUS: PASS

Copied `chapter-17/relighting.story`; gate-clean. Cistern, four pulls of the rope (cycling), four examinations of the grille reproduced word for word. Under the Hood: `sharpee test .` in `companion/chapter-17` lists `spark page · on reading · when legible`, `… · when learned` and `iron grille · after examining · the third time`, as quoted.

## Chapter 18 — Counting, scoring and ending

STATUS: PASS-WITH-ISSUES

Copied `chapter-18/relighting.story`; gate-clean. Fourth pull (`Your palms have begun to object.`), `score` at 5 and at 10, the rank line on lighting the candles, and both endings reproduced word for word. The vial (18.7) is from another story.

- (a) 18.6 "Trying the endings". (b) "Keep the copy in a folder of its own" — no name or place given for the folder. (c) Ambiguity resolved by making `~/repos/relighting-endings` beside the project and running `sharpee compose … --check` and `sharpee play .` there. Worked; the project's own file was left as the companion copy.

## Chapter 19 — Time

STATUS: PASS

Copied `chapter-19/relighting.story`; gate-clean. Timer lines after reading the page (creak, sway, strike), the two-turn thaw with the rank line, the mend page, `score` (15 out of 35), the blue flame during and after morning, the turn-50 warning (on the 50th command) and the dusk ending (on the 80th) all reproduced word for word; bell/timer trailing lines differ only as item 6 allows. Under the Hood: the IR's sequence has `"narration": "broadcast"` and the timer lists its named turns in order.

## Chapter 20 — Phrases

STATUS: PASS

Copied `chapter-20/relighting.story`; gate-clean. Three `light lamp` variants in order, the verbatim gate motto (indentation 4/1/0 as printed), Hobb's three sayings on three returns, the Bell Stair description with the grille sentence, `examine bell` and Hobb deafened reproduced. The bell count read `2` where the book's block has `3`; the number is the count of tolls so far and depends on the turn (item 6), and the wording is otherwise identical.

## Chapter 21 — A thing's own words

STATUS: PASS

Copied `chapter-21/relighting.story`; gate-clean. Lamp unlit and lit, candles before and after, Hobb's `present` sentence in the Lodge, and `examine lens` reproduced word for word (trailing timer/bell lines as item 6 allows). The cat (21.4) is from another story.

## Chapter 22 — Changing the standard messages

STATUS: PASS

`sharpee messages` printed a count line (`Message catalog: 885 overridable messages (en-US)`) and then the list as one line; the four entries the chapter quotes (`taking-taken`, `going-too-dark`, `lighting-lit`, `taking-taken-from`) match character for character. Copied `chapter-22/relighting.story`; gate-clean. The dark-steps override, three `wait` variants in order, `You take it.`, the dark `look`, and the grille and kettle before and after the page reproduced word for word.

## Chapter 23 — New verbs

STATUS: PASS

Copied `chapter-23/relighting.story`; gate-clean. Bare `spark`, `hush bell` in the Library, `mend lamp` before its page, `spark lamp` / `spark grimoire` after the spark page, `gnusto`, and the four remembering replies reproduced word for word. `light lamp` still lights the lamp, as 23.13 says. Scrawling and shouting are examples the story does not have.

## Chapter 24 — New kinds of thing

STATUS: PASS

Copied `chapter-24/relighting.story`; gate-clean. Played to the win: `spark lamp` twice, `light lamp` refusal, `spark candles` with rank, the grille refused while tolling, `hush bell`, `unbind grille` with `Journeyman`, the empty Lantern, `mend spectacles`, `mend lens`, `examine lens`, and the winning `spark lantern` with `Lamplighter` all reproduced word for word. Played again with the lens cracked: the losing ending printed. Under the Hood: `wick`'s sparking clause in the IR reads `"routing": "capability"`. The brazier (24.8) is from another story.

## Chapter 25 — Bending the standard grammar

STATUS: PASS-WITH-ISSUES

`sit on chair` under chapter 24's story printed `I don't understand that.` as 25.2 says. Copied `relighting.story` and `synonyms.chord` from `chapter-25`; gate-clean. `sit on chair` / `exit`, `light lamp` before and after the page, `light lamp with taper`, `quiet bell`, `fix spectacles`, `repair lens` and the win with `light lantern` reproduced word for word. Under the Hood: the IR has `grammarRemovals` (1: lighting) and `grammarExtensions` (4: sparking, mending, hushing, entering).

- (a) 25.7 "Build and try it". (b) "Play the winning walk once more with the plain words: light lamp, quiet bell, fix spectacles, repair lens. … One of the replies on this walk ends with the line about the rank of a Journeyman. It is whichever takes the score to thirty, and in the order given here that is fix spectacles." The list leaves out `unbind grille`, which has no plain word, so its place in the order is not given; chapter 24's walk has it straight after hushing the bell. (c) Ambiguity. Following chapter 24's order (`quiet bell`, `unbind grille`, `fix spectacles`, `repair lens`), the rank line came on the grille: `You say the word. The grille is not there, in the manner of a thing that was never there, and the stair goes up.` / `You have risen to the rank of a Journeyman.` and `fix spectacles` printed no rank line. Typing the four listed commands back to back before `unbind grille`, the line came on `fix spectacles`, as the book says.

## Chapter 26 — People who act

STATUS: PASS

Copied `chapter-26/relighting.story`; gate-clean. Hobb closing the press (both times), the wisp's arrival and `The wisp follows you.`, Tamsin in the Refectory (`examine tamsin`, her sorting, `leaves to the west`), `Tamsin Vey enters from the east.` in the Cloister, the Bell Stair two turns later (thumb, push, pry bar) and `talk to hobb` → `Hobb doesn't respond.` reproduced word for word (wait/bell variants as item 6 allows). Sam, the cat, the watchman and Nell are from other stories.

## Chapter 27 — Asking and telling

STATUS: PASS-WITH-ISSUES

Copied `chapter-27/relighting.story`; gate-clean. Hobb on the dimming, Tamsin, the kettle, the bell (refusal before, answer and `Hobb gives the hush page to Ansel.` while tolling), the overridden unknown-topic line, `ask hobb for the kettle`, both grimoire consultations, both greetings, `goodbye` and `read hush page` reproduced; every answer's own text matched word for word. The un-overridden `Hobb says, "I don't know anything about that."` (27.1.3) cannot be seen with the companion story, which already has the override.

- (a) 27.3 "Greetings" and 27.4 "Manner". (b) 27.4: "The beats of a row are used in turn, so Hobb's three come round one after another". 27.3's block shows `> talk to hobb` with the beat `He turns the kettle a quarter round on its hook, to no purpose.`, then `> goodbye`, then `> talk to hobb` with the beat `He takes his time, of which he has had a great deal.` (the third beat). (c) Typing exactly those three commands in a new game, the second greeting came with the second beat: `He looks at the blue flame on the sill before he answers.` / `"Still here," says Hobb, of one of you.` The story does what 27.4 says; the block in 27.3 skips a beat. Likewise the first question of a new game (`ask hobb about the dimming`) came with the kettle beat where 27.1's block shows the blue-flame beat. Which beat comes up depends on how many answers went before (compare item 6); logged because the printed block cannot be reproduced by the commands it shows.

## Chapter 28 — Conversations with a shape

STATUS: PASS-WITH-ISSUES

Copied `chapter-28/relighting.story`; gate-clean. The thread (page, parting on "porter", resuming on "stair", price), `say maybe`, `yes`, the silent-turn beat, `no` and the conclusion, the concluded thread, the way back by "price" (refused before, `agreed`, `We have dealt`), brass once and again, the silence line after two waits, and Hobb on "last night" before and after "dimming" all reproduced; every phrase matched word for word.

- (a) 28.5.2 "What has been discussed". (b) The block shows `> ask hobb about the dimming` with the beat `He looks at the blue flame on the sill before he answers.` and the second `> ask hobb about last night` with `He takes his time, of which he has had a great deal.` (c) Typing the block's three commands in a new game gave the first and second beats instead: `He turns the kettle a quarter round on its hook, to no purpose.` and `He looks at the blue flame on the sill before he answers.` Same cause as the chapter 27 entry: the block was recorded one answer further into Hobb's manner than its commands account for.

## Chapter 29 — Inner lives

STATUS: PASS-WITH-ISSUES

Copied `chapter-29/relighting.story`; gate-clean. Hobb's refusal to a stranger, the spectacles, `talk to hobb`, the story of last night, Tamsin on magic before and after the bargain, and Hobb rattled while the bell tolls all reproduced; every phrase matched word for word. Nell and Tom (29.3.1) are from another story.

- (a) 29.2.1 "Changing a feeling", read with 29.4 "Build and try it". (b) 29.4: "Ask Hobb about the Dimming and then about last night. Then find his spectacles, give them to him as they are, and ask again." The block in 29.2.1 shows `> talk to hobb` with the kettle beat and `> ask hobb about last night` with the blue-flame beat. (c) Following 29.4's steps, then the block's commands, the beats were one further on: `> talk to hobb` / `He looks at the blue flame on the sill before he answers.` and `> ask hobb about last night` / `He takes his time, of which he has had a great deal.` The answer to the Dimming, which 29.4 requires first, had already used the kettle beat. Same class as the chapter 27 and 28 entries.

## Chapter 30 — Principles

STATUS: PASS-WITH-ISSUES

Copied `chapter-30/relighting.story`; gate-clean. The kept confidence (`Hobb gives that some thought, and gives it back.`), the spectacles, the story told once he trusts Ansel, and the row about his spectacles reproduced; every phrase matched word for word. Cy (30.4) is from another story.

- (a) 30.6 "Build and try it". (b) "Ask Hobb about the Dimming, then about the last night, then about his spectacles." and the block `> ask hobb about spectacles` / `He turns the kettle a quarter round on its hook, to no purpose.` (c) After those three commands in a new game the spectacles answer came with the second beat: `He looks at the blue flame on the sill before he answers.` / `"Lost them in the spring," says Hobb. "Since then a face is a face. There are things I was told that I don't tell to a face."` The Dimming answer had used the kettle beat. Same class as the chapter 27–29 entries.

## Chapter 31 — More than one protagonist

STATUS: PASS

Copied `chapter-31/relighting.story`; gate-clean. Read the page and played four more turns: the role passed to Hobb on the fourth (`In the lodge, an old man who was not asleep opens his eyes.` … `You are Hobb, and that is the bell.` …). As Hobb: `look`, `inventory` (`Your hands are empty.`), `take kettle`, `north` (blocked), `examine newspapers`, then `look` as Ansel in the Library with the wisp — all word for word. Back in the Lodge, Hobb gave Ansel the hush page when asked about the bell.

## Chapter 32 — Machines

STATUS: PASS

Copied `chapter-32/relighting.story`; gate-clean. On the roof: first turn of the crank (leaves part), second turn with the seat empty (only `You turn the shutter crank.`), `push crank` (`The pawl ticks over one tooth.`), `spark lantern` with the lens seated and shutters shut (`The shutters are closed round it. …`), the turn that draws them (pawl, then `The crank runs free, …`) all word for word; then the win.

## Chapter 33 — Vehicles

STATUS: PASS-WITH-ISSUES

Copied `chapter-33/relighting.story`; gate-clean. The stair with the lens (grille's phrase until it is lifted, then `The lens is as wide as a cartwheel …`), riding the hoist (`enter hoist`, `look`), `put lens in hoist` / `The book hoist pulls away.`, the Undercroft without it, the hoist waiting on the roof, and seating the lens reproduced with the same wording. Before the grille was lifted the loaded hoist went to the Library, as 33.2.1 says. Tram, balloon, cart and barge are from other stories.

- (a) 33.2.1 "Where a state-driven vehicle is", block beginning `> look` / `Lantern Gallery`. (b) The block prints `(first taking the lens)` and `You take the lens from the book hoist.` on consecutive lines, with no gap (checked against the rendered page 340). (c) The story prints a blank line between them, as every other implicit take in the book does:

      > put lens in lantern
      (first taking the lens)

      You take the lens from the book hoist.

      You put the lens in the Great Lantern.

  Wording identical; one blank line is missing from the printed block.

## Chapter 34 — Open water and open ground

STATUS: PASS

Copied `chapter-34/relighting.story`; gate-clean. Won as far as the roof (the Lantern now prints its phrase and the story goes on), went down through the water gate, `enter skiff`, `steer east`, `wait`, `make sail`, the view one unit out, the view two turns later with the rock coming up, `The skiff arrives at the Beacon Isle.`, and `spark beacon` with `Lamplighter` and the ending — all word for word (wait variants as item 6 allows). The raft and the bottle are from other stories.

## Chapter 35 — The opt-in systems

STATUS: PASS-WITH-ISSUES

No companion folder, as the chapter says. Typed `cellar.story` into `~/repos/cellar` and `yard.story` into `~/repos/yard`. Both gate-clean. Cellar: `attack rat` missed (`You swing at the rat but miss!`, a line the chapter quotes), `take poker` → `Taken.`, `attack rat with poker` → `You have slain the rat!` (rolls vary, item 6). Yard: `You could eat.` on the first wait, `You are hungry now, and thinking about the loaf.` on the third, `You have starved to death.` and the ending on the eighth, exactly as counted in 35.3.

- (a) 35.5 "Build and try it". (b) "Make a folder called cellar" … "make a folder called yard" — no place given for either. (c) Ambiguity resolved by making both beside the project folder. Worked.

## Chapter 36 — Sound, music and pictures

STATUS: PASS

Copied `relighting.story` and the `assets` folder (three recordings, one picture) from `chapter-36`; gate-clean. `light lamp` ends with `The wick takes with a small dry sound, like a page turned.`; the wisp's flinch prints on the turn the role passes to Hobb; waiting in the Library as Ansel printed `Somewhere in the Hall, iron complains about iron.`; walking into the Bell Stair on the turn Tamsin pushes printed `Iron shrieks on iron, close by, and stops.`, and waiting in the Cloister printed the same line by itself after a wait — all word for word. Nothing played in the terminal, as expected. The gramophone and curtains are from another story.

## Chapter 37 — The page the player sees

STATUS: PASS

Copied `relighting.story`, `relighting.config.json` and the `browser` folder from `chapter-37`; gate-clean. `sharpee build relighting.story` printed the block in 37.2 line for line, without the minting line (as 37.9 says) and with this run's sizes and timing (`game.js 2.4mb`, `Done in 67ms`, `game.js 2425.8 KB`). `npx serve dist/web/relighting` installed `serve` and served at `http://localhost:3000`.

With Playwright (Chromium):

- The page opened on the title and prologue in the `paper` theme.
- Played to the Library and read the spark page: the side column opened with `workings` / `spark: wakes a flame`; the panel has the id `channel-panel-workings`.
- Settings → Theme listed `Classic`, `Paper`, `Modern Dark`. Chose Modern Dark, reloaded: still `modern-dark`. Browser storage holds `relighting-theme=modern-dark` beside `relighting-save-autosave` and `relighting-saves-index`.
- Played the whole game on the page: `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` and `img/lantern-lit.png` were all fetched (206/200); the picture appeared in `#sharpee-media` above the story when the Lantern was lit and was gone on the last turn; the panel ended with the four workings in the order read (spark, unbind, hush, mend). No console errors, no failed requests.

## Chapter 38 — Test trees

STATUS: PASS-WITH-ISSUES

Made `relighting.tests` by hand (two-space indentation, keys in alphabetical order). With the manifest and the four skip cards, `sharpee test . --json --capture-output > records.txt` wrote one record to a line and the `card0003` record matched the one printed in 38.4 field for field (apart from `elapsedMs`); the derived-test report still printed in the terminal, as the book says. With the assertions in place `sharpee test .` printed `✓ opening-lodge` / `3 cards passing, 4 assertions passing` (exit 0). The 38.6 failure (`"contains": ["Taken."]`) printed the block exactly and exited 1; card put back. Added `onward01` and `thecake1` together: two lines, both passing. Changed `You find you cannot.` to `You decide against it.` in `cake-watched`: `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` with the story's new sentence beneath; sentence put back, tree green. Replaced the folder with `chapter-38/relighting.tests`: seven lines, `183 cards passing, 275 assertions passing`, `182 commands (182 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134`, `Endings reached: 2 / 3`, `relighting.story:314 · night-falls (lose)`, `Rooms entered: 13 / 13` — all as printed in 38.9.

- (a) 38.7 "A fork", the report block after the `thecake1` segment. (b) The block ends after `✓ opening-lodge` and `✓ lodge · eat cake`. (c) The run prints two more lines that the block leaves out, where 38.6's block and 38.9's block both show their count lines:

      Test tree: relighting.tests/ (seed 42, 2 line(s))

      ✓ opening-lodge
      ✓ lodge · eat cake
      6 cards passing, 9 assertions passing
      6 commands (6 authored + 0 replayed), 1 restored at a fork

- (a) 38.10 "Build and try it". (b) "write the manifest and the three segments of this chapter into it" — the chapter prints `mainline.json` twice, first as four skip cards (38.3) and then with assertions (38.5), and 38.4's `--json --capture-output` step belongs to the first. (c) Ambiguity resolved by writing the skip-card version first, running 38.4's command, then replacing it with the 38.5 version before the first plain `sharpee test .`. Worked.
- (a) 38.3. (b) The printed JSON is indented five spaces a level on the page, while the text says "The indentation is two spaces". (c) Typed with two spaces as the text says; accepted. Whether a file needs a final newline is not said; typed with one; accepted.

## Chapter 39 — Claims

STATUS: PASS

Worked in the project (chapter 37's story and the chapter-38 tree).

- `sharpee claim winning1` printed the "no line" message and the seven lines by segment id and first command, exactly as 39.1 shows.
- `sharpee claim thelodge --at 82` listed the ten facts printed, twenty-three more, and `Lock one with: sharpee claim thelodge "<fact>" --at 82`.
- `sharpee claim thelodge "the iron grille is lifted" --at 82 --name "the ward on the stair can be lifted"` printed the block in 39.2 word for word, created `relighting.claims.chord` (identical to 39.3's listing), added `"claims"` to the manifest and `"locks"` to card `b7wicd1b` in `thebell1.json`.
- `sharpee test .`: `claims: 1 of 1 held (seed 42)` / `0 walks` / `HELD … at turn 82` / lock `held there`.
- Added `the story can be won` by hand with its lock on card `bjhmo3xt` (`winning1.json`): `claims: 2 of 2 held`, both locks held, turn 138.
- Added `the cake can be eaten` by hand: `3 of 3 held`, `1 walk`, `17 states, 20 commands, stopped: all-claims-settled`, witness `take seed cake / north / eat seed cake` — the block at the end of 39.11 word for word.
- `needs rooms: the Lodge` alone: `UNPROVEN … max-depth-reached after 161 states` (161 states, 239 commands, as 39.8 has for the Lodge-only claim). Gate Court put back.
- Took `change it to lifted` out of the ward trait: `✗ opening-lodge — unbind grille: State assertion failed: the iron grille is lifted. the iron grille is "standing", expected "lifted"`, 35 cards failing, `claims: 1 of 3 held, 2 unproven`, three walks (two stopped at `max-seconds`), both locks `NOT held there`; the run took 4m01s, as 39.11 says. Line put back (story byte-identical to the companion copy); `3 of 3 held` again.
- `sharpee test . --verbose` prints `Claims budget per walk: 120s, 500000 states, depth 80`.

The faults the chapter states (locking after a line's first `put`; `put` on a `needs verbs` line) were not tried (item 4). The state-unknown and canonical-form refusals (39.4, 39.7) are described, not instructed, and were not provoked.

## Chapter 40 — Publishing

STATUS: PASS-WITH-ISSUES

`sharpee ifid generate` printed one identifier (`920D0CA4-7977-49F0-A457-C860E47CCD7D`; the value belongs to the run). The header already carries `ifid: C24E29F8-C36B-4F55-9FE9-B6D75AE7133D` and `relighting.config.json` holds the same value, as 40.1 shows. Set `story-version: 1.0.0`, added `publish-source: yes`; gate-clean. `sharpee test .`: 183 cards passing, `claims: 3 of 3 held (seed 42)`. The terminal opening prints the four lines with the version last (`Story v1.0.0`), as 40.2 says.

`sharpee publish relighting.story` printed the block in 40.4 line for line, with this run's sizes and timing (`game.js 2.4mb`, `Done in 43ms`, `game.js 2425.8 KB`, `dist/relighting.zip (0.8 MB)`) and the same IFID. The zip holds exactly the fourteen files listed in 40.5; no `game.js.map`, no `index-testing.html`, no test tree, no claims file.

`unzip dist/relighting.zip -d ../relighting-published`, then `npx serve .` from inside it (`http://localhost:3000`). With Playwright: the page opened with `The Relighting` / `Story v1.0.0` / the description / `By The Sharpee Project`, in the order 40.2 prints. Played from the Lodge to the beacon: the story ended on `spark beacon` at score 50; `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` and `img/lantern-lit.png` were all fetched (206/200); the picture showed when the Lantern was lit and was hidden on the last turn; the workings panel filled in order. No console errors, no failed requests.

- (a) 40.7 "Build and try it". (b) "Decide whether your source goes along, and write publish-source: yes if it does." The step leaves the choice to the reader, while the publish report and the fourteen-file list in 40.4–40.5 are those of a story that has the line. (c) Ambiguity resolved by writing `publish-source: yes` (40.3: "The Relighting is a teaching story and it takes the line"), placed under `story-version:`. With it the output matched the book. A reader who decides the other way gets a different report and twelve files, as 40.5 notes.

## Appendices

Read, not run (item 7).

## Summary

Chapters at each status:

| Status | Count | Chapters |
|---|---|---|
| PASS | 28 | 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 26, 31, 32, 34, 36, 37, 39 |
| PASS-WITH-ISSUES | 12 | 1, 2, 18, 25, 27, 28, 29, 30, 33, 35, 38, 40 |
| BLOCKED | 0 | — |

DEVIATION entries: 0. The story was never changed except where a chapter said to break it and put it back, and it was put back each time.

Not clean by the brief's definition (every chapter PASS): twelve chapters carry issues. None stopped the run. By kind:

**Printed output that the commands shown do not produce**

- Ch. 2, 2.2: the "smallest header" opening shows a one-sentence Lodge description the reader was never given.
- Ch. 27 (27.1, 27.3), 28 (28.5.2), 29 (29.2.1), 30 (30.6): Hobb's manner beats in the printed blocks are out of step with the commands shown beside them (27.3 skips a beat between two greetings; the others are one beat off). The answers themselves match word for word.
- Ch. 33, 33.2.1: a blank line is missing between `(first taking the lens)` and `You take the lens from the book hoist.`
- Ch. 38, 38.7: the two-line report block leaves out its two count lines.

**Steps a literal reader has to interpret**

- Ch. 1 (1.7), 18 (18.6), 35 (35.5): a folder is to be made and the book does not say where.
- Ch. 1: the listing shows doubled blank lines; one blank line is what the diagnostics' line numbers assume.
- Ch. 25, 25.7: the plain-words walk omits `unbind grille`, and the rank line falls on `fix spectacles` only if the grille is left until after it.
- Ch. 38: `mainline.json` is printed in two versions and 38.10 says "the three segments"; the page indents JSON by five spaces where the text says two; a final newline is not mentioned.
- Ch. 40, 40.7: `publish-source: yes` is left to the reader's choice, while the printed results assume it.
