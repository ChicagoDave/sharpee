# Execution log — The Chord Manual, documentation acceptance test

`sharpee --version` (run in chapter 4, after the book's install step):

    Sharpee 5.6.4 · Chord 4.0.3

Title page version line (PDF page 1):

    Chord 4.1.0, Sharpee 5.7.0

(The difference between the two pairs is accepted-by-design item 8 and is not reported anywhere below.)

## Setup

All four checks passed before the book was opened.

1. `npm config get prefix` → `/home/node/.local` (under home; no root needed). `sharpee` was not installed at this point.
2. Playwright: a three-line script run from `~/tools/playwright` launched Chromium (159.0.8154.6) and closed it.
3. `~/repos/book-test` holds one PDF (`the-chord-manual-4.1.0.pdf`) and a folder `companion`.
4. `pdftotext -v` and `pdftoppm -v` both print `version 22.12.0`.

Run-wide notes (logged once):

- AMBIGUITY (resolved, reading worked): the book says the project folder "can be anywhere you keep your own work"; I used `~/repos/relighting`. Side folders the book asks for went beside it: `relighting-endings` (ch. 18), `cellar` and `yard` (ch. 35), `relighting-published` (ch. 40).
- **Substitution, logged once:** no interactive session can be held here, so every `sharpee play .` in this run was fed its commands on standard input, one to a line, ending with `/quit`.
- Chord Writer steps: none done (no Chord Writer on this box; accepted item 1).

---

## Preface and "How to read this book"

STATUS: PASS

- Read only; nothing to run. No issues.

## Chapter 1 — The shape of a story file

STATUS: PASS

- Typed the listing at the top of the chapter into `relighting/relighting.story`, joining each `↪` row to the row above with one space as section 0.7 instructs. Blank lines checked against the page image (page 23). The resulting file is 32 lines and the line numbers the later chapters quote (16:8, 24:3, 25:13, 31:3) all agree with it.
- The two compiler messages the chapter quotes (`lex.tab-indent`, `parse.unterminated-block`) are shown, not instructed, and the reader has no command yet; they were read and not reproduced.

## Chapter 2 — The story header

STATUS: PASS

- Section 2.2 says of its opening block "It is here to be read. Nothing in this chapter is built." Followed as written; the smallest-header opening, the `authors:` inline-list error, the `parse.story-title` error and the `parse.header-unknown-field` error were read and not reproduced.
- The `> about` block of 2.3 and the opening of 2.4 were reproduced in chapter 4's play session: identical to the book.

## Chapter 3 — The player and the start

STATUS: PASS

- `> examine me` (3.1) and the opening (3.4) reproduced in chapter 4's play session: identical.
- AMBIGUITY (resolved, reading worked): section 3.4 prints a `when the game starts` block and a reordered opening, then says "this book's story has no opening block, and you need not add one." Read as: do not add it. The reordered opening and the two errors quoted after it were therefore not reproduced. Likewise the four mistakes of 3.5 are described, not instructed.

## Chapter 4 — Build, play, read an error

STATUS: PASS

- 4.1 `npm install -g @sharpee/devkit`: installed, ending with the blocked-install-script warning the book predicts. `sharpee --version` printed `Sharpee 5.6.4 · Chord 4.0.3` (the expected interim pair).
- 4.3 `--check`: gate-clean line as quoted (version number aside).
- 4.4 play: opening and all five commands (`examine me`, `examine lamp`, `north`, `wait`, `xyzzy`) identical to the book. `about` identical to 2.3.
- 4.5 `playble`: both diagnostics and the summary line identical, in the book's order.
- 4.6 `the Loge`: identical.
- 4.7 description deleted: warning identical; restored and gate-clean.
- 4.8 `sharpee play relighting.story` and the two-`.story` error: both identical (`notes.story` made and removed again).
- Under the Hood, `sharpee compose relighting.story -o relighting.ir.json`: both lines identical (`2 entities, 0 trait(s), 0 action(s)`). `relighting.ir.json` now sits in the project folder.
- No issues.

## Chapter 5 — Rooms and exits

STATUS: PASS

- Copied `chapter-05/relighting.story` over my own; gate-clean. Walked all eight rooms.
- `> north` (first visit), `> look`, `> south` (heading "The Porter's Lodge"), `> north`/`> up` to the roof and `> east` on the roof: all identical to the book.
- Not reproducible in The Relighting and not instructed: the Den/Attic examples of 5.3 and 5.4 (the `duplicate-exit` error and the `> down` / "There are no obvious exits." block) and the `Cloyster` error of 5.8. They belong to an illustration, not to a step. Read only.

## Chapter 6 — Things

STATUS: PASS

- Copied `chapter-06/relighting.story`; gate-clean.
- Reproduced identically: the "You can see a kettle, a hand lamp, and Hobb here." line, `examine lamp`, `take lamp`, `take chair`, `take hobb`, `inventory` (at the start: "You are carrying:" / "a wax taper"), `examine arch` / `examine motto`, `examine spectacles` → `search` → `take glasses`, and the Gate Court `drop lamp` / `look` block.
- "Then examine everything a description mentions, in every room": done. Unkept promises found, as the chapter says there will be: flagstones, grass, garth, nettles, steps, tables, benches, desks, shelves, stacks, vaults, pillars, stair, rope, bell, drum, glass. The chapter says nothing here needs fixing.
- The `hiding-spot` curtain of 6.7 is "from another story" (it is placed in a Den the story does not have); read only.

## Chapter 7 — Containers and supporters

STATUS: PASS

- Copied `chapter-07/relighting.story`; gate-clean.
- Reproduced identically: Library with "On the reading desk you see a grimoire.", `take book`, `put book on desk`; `take lens` / `open crate` / `take lens`; new game `open crate` / `put taper in crate` ("There's no room in the crate."); `put lens in lantern`; `open press` ("…which is empty."); `enter chair` / `north` / `exit`; `put kettle on chair` and the `look` that follows. Walked the lens from the Undercroft to the roof.
- The bell jar/moth and the `unlisted` table of 7.5 are "from another story" (placed in a Den); read only.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

- Copied `chapter-08/relighting.story`; gate-clean.
- Reproduced identically: `west` / `open door` (locked), `open press`, `take key`, `unlock door with taper`, `unlock door with key`, `west` (closed), `open door`, `west` (Library), `close door`, `lock door with key`, `east`.
- Not instructed, read only: `opens when unlocked` (8.4: "The Relighting leaves this line out"), the key-ring disambiguation of 8.6 (from a draft), and the two compiler errors of 8.1–8.2.

## Chapter 9 — What things can do: the trait words

STATUS: PASS

- Copied `chapter-09/relighting.story`; gate-clean.
- Reproduced identically: `inventory` ("You are carrying and wearing:" …), `take off coat`, `wear coat`, `examine book`, `read book`, `eat cake` twice, `pull rope`, `take rope`, `take cup`, `drop cup`, `read coat`, `eat coat`.
- "do to each new thing what it is for, and also what it is not for": also tried `examine candles`, `take candles`, `eat candles`, `wear book`, `push rope`, `examine cup` after breaking it. Nothing contradicted the chapter.
- From "another story" (the Den) and so read only: hat/cap, trolley, tassel, wireless.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

- Copied `chapter-10/relighting.story`; gate-clean.
- Reproduced identically: `down` into the dark (grue line), `look`, `examine crate`, `up`; `light taper`; `light lamp`; `down` with the lamp; `extinguish lamp`, `look`, `light lamp` (with the room shown again); `drop lamp`, `up`, `down` ("You can see a crate and a hand lamp here.").
- From "another story" and so read only: `night-vision` Ansel in a Cellar, the tin/cheese/clock/sock and its `smell` / `listen` block.

## Chapter 11 — Regions

STATUS: PASS

- Copied `chapter-11/relighting.story`; gate-clean.
- Reproduced identically: `examine tower` from the Lodge and the Gate Court, `north` to the Cloister, `examine tower` ("You can't see any such thing."); Stack 1, Stack 2, Stack 3, and `north` from Stack 3 ("You can't go that way."); walked back.
- Kettle placed `in the Grounds`: the error is identical to the book, line and column included (`relighting.story:142:3`). Put back; gate-clean.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS

- Copied `chapter-12/relighting.story`; gate-clean.
- Reproduced identically: `up` at the Bell Stair (stair-sealed phrase); `examine hearth`; `squeeze behind hearth` without the lamp (grue line); the same command in the Undercroft ("I don't understand that."); with the lit lamp, the Undercroft block of 12.5.
- 12.2: took out the `up is blocked: stair-sealed` line (line 102), walked up, `east`: phrase and `[The story has ended. RESTART, RESTORE or UNDO]` identical. Line put back; gate-clean.
- Read only (not in The Relighting): the Study/Vault `while` exit of 12.3 and the `missing-phrase` error.

## Chapter 13 — States

STATUS: PASS

- Copied `chapter-13/relighting.story`; gate-clean. "Nothing has changed": the grille still refuses `up`.
- `read page`: identical to the book.
- 13.4: added `change the iron grille to lifted` to the start block; gate-clean; `up` from the Bell Stair gave the Lantern Gallery block, identical. Line taken out again; gate-clean.
- Under the Hood: `sharpee compose relighting.story -o relighting.json` ran (`43 entities, 0 trait(s), 0 action(s)`); the grille's entry holds `"states": ["standing","lifted"]` and `"statesReversible": false` beside it, as described. `relighting.json` now sits in the project folder.
- Read only (other stories / `probe.story`): the sluice, the dial and its `set dial` block, and the four `probe.story` errors.

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS

- Copied `chapter-14/relighting.story`; gate-clean.
- Reproduced identically: `take kettle`; `search` / `take spectacles`; `give spectacles to hobb`; `eat cake` (with "It tastes of caraway, and of being nineteen."); first `west` into the Library with the wet-ink paragraph (and not on a second entry); `read page` with the spark-learned phrase; `pull rope` with the added sentence; `push grille`, `pull grille`.
- Under the Hood: ran `sharpee test .` inside `companion/chapter-14`. It printed a list under "Derived rule tests (ADR-356): 11 branches" that includes `✓ kettle · on taking`, as the box says. Nothing in the companion folder was changed by the run.
- Could not be reached in this chapter's story (the stair is sealed) and so not reproduced: the lens's `after the player inserting in the Great Lantern`. The chapter prints no output for it. The `set dial to high` block is from the other story.

## Chapter 15 — What a clause can say and do

STATUS: PASS

- Copied `chapter-15/relighting.story`; gate-clean.
- Reproduced identically: `light lamp` before the page is read ("You reach for the word and find only the place where it was."); `eat cake` in the Lodge (cake-watched) and eaten in the Gate Court; `read page` twice (spark-learned, then "You know it. You are not likely to lose it twice."); `light candles` and the `look` that lists the unbind page; `light lamp` / `down` block of 15.7.
- Under the Hood: `sharpee test .` in `companion/chapter-15` lists `✓ hand lamp · on lighting · refused no-such-word` and `✓ seed cake · on eating · refused cake-watched` under "Derived rule tests (ADR-356): 21 branches", as the box says.
- Not reachable in this chapter's story (sealed stair), and no output is printed for it: the Great Lantern's two `must` lines. Read only: the `cat-goes` inline phrase and the three `probe.story` errors.

## Chapter 16 — Conditions

STATUS: PASS

- Copied `chapter-16/relighting.story`; gate-clean.
- Reproduced identically: `examine grimoire` before (grimoire-waiting) and after (grimoire-filling); `read hush page` while faded (page-blank); after the spark page, `read hush page` ("(first taking the hush page)" / "Taken." / the third working).
- AMBIGUITY (resolved, reading worked): "Build and try it" says "come back for the spark page" and prints no command for it. Chapters 13–15 print `read page`; this chapter prints `read hush page` for the other leaf. I typed `read spark page`, which worked (the book itself prints that command later, in 37.2).
- Under the Hood: `sharpee compose relighting.story -o relighting.ir.json` ran (`45 entities`); `lantern-ready` is under `conditions` as an `and` of two tests each with a subject and an object, and `faded-page` has `"open": true`, as described.

## Chapter 17 — Choosing between outcomes

STATUS: PASS

- Copied `chapter-17/relighting.story`; gate-clean.
- Reproduced identically: `examine cistern` (frozen arm); four `pull rope` (nothing / dust / patience / nothing again); four `examine grille` (memory / cold / enough / description only).
- Under the Hood: `sharpee test .` in `companion/chapter-17` lists "spark page · on reading · when legible", "… when learned", "iron grille · after examining · the third time", and the cistern's three arms as `◌ … SKIPPED subject-unreachable`, as the box says.
- Read only: the `refusal-misplaced` error (17.2).

## Chapter 18 — Counting, scoring and ending

STATUS: PASS

- Copied `chapter-18/relighting.story`; gate-clean.
- Reproduced identically: `score` after the spark page (5 out of 25, Latecomer); `light candles` with "You have risen to the rank of a Second-Year."; `score` (10 out of 25, Second-Year); fourth `pull rope` with "Your palms have begun to object." before the cycling line.
- 18.6: made `~/repos/relighting-endings` beside the project, copied the story into it, added the three start-block lines; gate-clean. `put lens in lantern` / `light lantern`: defeat text and ending line identical. Added `change the lens to sound` as the last start-block line: victory text, rank line and ending line identical. The project's own story was not touched.
- Read only: the vial (`kill the player`, in a Yard), `counter sips`, and the `rank-above-max` error.

## Chapter 19 — Time

STATUS: PASS

- Copied `chapter-19/relighting.story`; gate-clean.
- Reproduced identically: `light lamp` + creak, `east` + sway, `down` + strike + "begins to sweat", `examine cistern` (thawing arm, ice breaks, bell line, rank line); `read mend page`; `score` → "15 out of 35 … Second-Year" with no bell line after it; `wait` + a bell line; `examine blue flame` in the morning and after the page (flame-later + a bell line; which bell line is accepted item 6).
- Sequence: in a game of waits only, turn 50 printed "The light has turned…" and turn 80 printed the dusk text and the ending line, both exactly as the 19.4 blocks. (In the game where the page had been read the same two turns carry a bell line after them, as 19.2 says they will.)
- Under the Hood: in `relighting.ir.json` the timer `waking` lists `creak, sway, strike` and the sequence `the day` has `"narration": "broadcast"`, as described.
- Read only: the squib's `fuse` timer.

## Chapter 20 — Phrases

STATUS: PASS

- Copied `chapter-20/relighting.story`; gate-clean.
- Reproduced identically: three `light lamp` refusals in cycling order; Hobb's three sayings on three entries to the Lodge (first, second, third variant in order; the book's block shows the second); `examine gate` with the three verbatim lines indented 4 / 1 / 0 as on the page; Bell Stair description ending "An iron grille stands across its third step."; `examine bell` while tolling ("By your count that makes 3, and it is not tired." + bell line — my count happened to be 3 as well); Lodge after the bell starts ("Hobb has his hands over his ears…" + bell line).
- No issues.

## Chapter 21 — A thing's own words

STATUS: PASS

- Copied `chapter-21/relighting.story`; gate-clean.
- Reproduced identically: `examine lamp` unlit; `light lamp` (+creak) and `examine lamp` with the detail sentence joined to the paragraph (+sway); the Lodge with Hobb's `present` sentence at the end of the description and Hobb still in the list; `examine candles` / `light candles` / `examine candles`; `examine lens` in the Undercroft with the crack sentence. Bell/timer lines present in the same places (variants per accepted item 6).
- Read only: the `are` error (405:35) and the cat's `disappeared` (a Yard).

## Chapter 22 — Changing the standard messages

STATUS: PASS

- `sharpee messages`: prints "Message catalog: 885 overridable messages (en-US)" and then the list as one line (sent to a file, the file is exactly one line holding 885 entries). The four entries the chapter quotes (`taking-taken`, `going-too-dark`, `lighting-lit`, `taking-taken-from`) are in it, character for character.
- Copied `chapter-22/relighting.story`; gate-clean.
- Reproduced identically: `down` without a lamp (the override text); `look` ("It is dark, and the dark here is old and has no interest in you."); three `wait`s in cycling order; `take lamp` ("You take it."); `push grille` before the page ("It does not so much as rattle.") and after ("It hums under your hand…" + timer line); `take kettle` before and after ("Still mine,").
- Read only: `import "books"` (22.9; the chapter gives no file and no step), the `taking-taken-from` override example (22.5; not in the "Build and try it" list), the `probe.story` error.

## Chapter 23 — New verbs

STATUS: PASS

- Copied `chapter-23/relighting.story`; gate-clean.
- Reproduced identically: `spark` (working-wants-a-thing); `hush bell` in the Library ("You can't see any bell here."); `mend lamp` before its page (a no-such-word variant; which one is the cycle's); after the spark page `spark lamp` and `spark grimoire` ("There is nothing in that for a flame to stand on." + creak / sway); `gnusto`; `remember dimming`, `remember the dimming`, `recall hobb`, `remember breakfast`. `light lamp` still lights the lamp, as the chapter says.
- "Try each working before and after its page": done for spark; the other three pages cannot all be learned yet in this story (hush is readable, mend needs the thaw, unbind the candles) and the chapter prints no output for them; each refused with a no-such-word variant before its page.
- Read only (examples the chapter says are not in the story, or not in its "Build and try it" list): `scrawling`, `shouting`, `nothing-to-tune`, the two `probe.story` errors.

## Chapter 24 — New kinds of thing

STATUS: PASS

- Copied `chapter-24/relighting.story`; gate-clean.
- Played the game to its end. Reproduced identically: `spark lamp` (sparked + creak), `spark lamp` again (already-burning + sway), `light lamp` (light-needs-the-word + strike), `spark candles` (+ candles-catch, bell, Second-Year), `unbind grille` while tolling (ward-in-the-bell + bell), `hush bell`, `unbind grille` (ward-lifts + "You have risen to the rank of a Journeyman." — same award as in the book's order), `mend spectacles` (trait's phrase, no bell line), `mend lens` (the lens's own phrase), `examine lens` (sound detail), `spark lantern` with no lens (lantern-empty), and the winning `spark lantern` block with the Lamplighter line and the ending.
- Played again leaving the lens cracked: `spark lantern` gives the sparked line, the lens-shatters text and the ending.
- Under the Hood: in `relighting.ir.json`, trait `wick`'s sparking clause has `"routing": "capability"`.
- Read only: the `burner` trait with data and `cold-wick` (other story / not in the "Build and try it" list).

## Chapter 25 — Bending the standard grammar

STATUS: PASS

- Copied `relighting.story` and `synonyms.chord` from `chapter-25` into the project; gate-clean.
- Reproduced identically: `sit on chair` / `exit`; `light lamp` before the page (no-such-word) and after (sparked + creak); `light lamp with taper` (light-needs-the-word + sway); `quiet bell`; `fix spectacles` (with the Journeyman line, as the chapter predicts for this order); `repair lens`; `unbind grille`; win with `light lantern`.
- Under the Hood: `grammarRemovals` has one entry (lighting) and `grammarExtensions` four (sparking, mending, hushing, entering).
- AMBIGUITY (noted, block not reproduced): 25.2's first block (`sit on chair` → "I don't understand that." "in the story as chapter 24 left it"). The chapter prints it as a statement about the previous chapter's story and gives no step to try it before the copy; I had already copied chapter 25's story. Read only: the `ignite` removal error.

## Chapter 26 — People who act

STATUS: PASS

- Copied `chapter-26/relighting.story`; gate-clean.
- Reproduced identically: `take key` + "Hobb closes the oak press."; `open press` ("…which is empty.") + Hobb closing it again; Refectory with Tamsin Vey; `examine tamsin` (description, own-business with "She", tamsin-sorts); `wait` + "Tamsin Vey leaves to the west."; `light lamp` (sparked, wisp-arrives, creak); `east` + sway + "The wisp follows you."; in the Cloister `wait` + bell + "Tamsin Vey enters from the east."; two more waits then `north`: the Bell Stair block with the thumb line, then `wait` + "Tamsin Vey pushes the iron grille.", `wait` + the pry-bar line; `talk to hobb` → "Hobb doesn't respond."
- Read only (other stories): Sam and the `ey` pronoun set, the cat and watchman, Nell's `fetch` goal, the `act-player-actor` error.

## Chapter 27 — Asking and telling

STATUS: PASS

- Copied `chapter-27/relighting.story`; gate-clean.
- Reproduced identically (the manner beat in front of each answer is one of Hobb's three in turn, as the chapter says it will be): `ask hobb about the dimming`, `… about tamsin`, `… about the kettle`, `… about the bell` before the bell (refusal, no beat), `… about the weather` (override, no beat), `ask hobb for the kettle`, `tell hobb about gnusto` (same row as `ask`); `consult grimoire about gnusto`, `look up cheese in grimoire`; `talk to hobb` (first-time greeting), `goodbye`, `talk to hobb` (on-return greeting); `talk to tamsin` → "Tamsin Vey doesn't respond."; with the bell tolling, `ask hobb about the bell` (one-beat manner, answer, "Hobb gives the hush page to Ansel.", bell line), then `read hush page`; asked again he answers and gives nothing.
- Read only: the `Nell` load error of 27.3.2 and the two `probe.story` errors.

## Chapter 28 — Conversations with a shape

STATUS: PASS

- Copied `chapter-28/relighting.story`; gate-clean.
- Reproduced identically, in three short games: the thread (`ask tamsin about the page`; `… about the porter` with the on-parting line; `… about the stair` with the on-resuming line; `… about the page` → the price; `say maybe` → "Tamsin Vey waits for an answer to the question."; `yes` → shakes, "Tamsin Vey gives the unbind page to Ansel.", conclusion); a `wait` after the first beat is answered with her price; `no` → shrugs + conclusion; `ask tamsin about the page` afterwards → stock override; `ask tamsin about the price` before the thread (refusal + her rounds step), after a refusal (price again), `agreed`, and after the bargain ("We have dealt…"); `ask tamsin about brass` once and again; brass / `wait` / `wait` + the on-silence line; Hobb's `last night` before and after `the dimming`.
- No issues.

## Chapter 29 — Inner lives

STATUS: PASS

- Copied `chapter-29/relighting.story`; gate-clean.
- Reproduced identically (before the spark page, as instructed): `ask hobb about the dimming`; `ask hobb about last night` → hobb-not-to-strangers; `search`, `take spectacles`, `give spectacles to hobb`; `talk to hobb` ("Still here…"); `ask hobb about last night` → the story. `ask tamsin about magic` wary, then after the bargain the warmer answer. With the bell tolling, Hobb answers with the one-hand-over-an-ear beat.
- Read only: Nell and Tom (`spreads`) and its `You hear:` block (a Yard).

## Chapter 30 — Principles

STATUS: PASS

- Copied `chapter-30/relighting.story`; gate-clean.
- Reproduced identically: `ask hobb about last night` while he is wary → "Hobb gives that some thought, and gives it back."; `ask hobb about spectacles` (beat + "Lost them in the spring…"); after `give spectacles to hobb`, `ask hobb about last night` → beat + the story.
- Read only: Cy (`answers honestly`, a Yard) and the table of six.

## Chapter 31 — More than one protagonist

STATUS: PASS

- Copied `chapter-31/relighting.story`; gate-clean.
- Read the spark page and played four more turns (`light lamp`, `wait`, `wait`, then `light lamp with taper` so that the fourth does not move Ansel, per the chapter's caution). Reproduced identically: the fourth-turn block (refusal, "In the lodge, an old man…", "You are Hobb…", bell); as Hobb `look` (Lodge without the doorway sentence, "You can see a kettle here."), `inventory` (empty — the variant printed was "You aren't carrying anything at all.", accepted item 6), `north` (hobb-stays-put), `take kettle` ("You take it."), `examine newspapers` (description, hobb-finds-page, "You are Ansel…", bell); then `look` as Ansel in the Library with the wisp. As Ansel before the scene, `take kettle` is still refused.
- The stated fault (a move on the role-change turn garbles the reply) was avoided as instructed and not tried.

## Chapter 32 — Machines

STATUS: PASS

- Copied `chapter-32/relighting.story`; gate-clean.
- Played the winning walk to the roof (fourth turn after the spark page was a `wait`). Reproduced identically: `turn crank` (report + shutters-shift); `turn crank` with the seat empty (report only); `push crank` (report + "The pawl ticks over one tooth."); `spark lantern` with the lens seated and the shutter not drawn (lantern-shuttered); `turn crank` with the lens seated (report, pawl, shutters-open); the shutter's two detail sentences; a further `turn crank` does nothing more; `spark lantern` wins.
- No issues.

## Chapter 33 — Vehicles

STATUS: PASS

- Copied `chapter-33/relighting.story`; gate-clean.
- Reproduced identically: with the grille standing, `up` with the lens gives the grille's phrase; with the grille lifted, `up` gives lens-too-wide; `put lens in hoist` + "The book hoist pulls away." and the Undercroft `look` without the hoist; before the grille is lifted the hoist and lens are found in the Library; after, in the Lantern Gallery (`look` block identical); `put lens in lantern` ("(first taking the lens)" … "The book hoist pulls away."); `enter hoist` and the `look` showing "In the book hoist you see Ansel." Won from there.
- Read only (other stories): tram, balloon, cart, barge and their blocks.

## Chapter 34 — Open water and open ground

STATUS: PASS

- Copied `chapter-34/relighting.story`; gate-clean.
- Won "as far as the roof" (all awards taken: 45 of 50 after the Lantern, which now prints its text and does not end the game), then Undercroft → `north` through the water gate (blocked with its own phrase before the Hall is awake) → Water Stair, skiff at the foot of the steps.
- Reproduced identically: `enter skiff`, `steer east`, `wait`, `make sail`; `look` one unit out (Water Stair close by / Beacon Isle on the horizon); `wait`, `wait`, `look` (Isle in the distance, Stair on the horizon, the beacon-near paragraph); `wait` + "The skiff arrives at the Beacon Isle."; `spark beacon` (sparked, beacon-lit, "You have risen to the rank of a Lamplighter.", ending).
- Read only (other story / not in the story): the raft, the bottle and `drift:`, the `isle-near` examples.

## Chapter 35 — The opt-in systems

STATUS: PASS

- No companion folder, as the chapter says. Made `~/repos/cellar` and `~/repos/yard` beside the project and typed each example from the page (blank lines and indentation checked against the page images, pages 368 and 370).
- `cellar.story`: gate-clean. `attack rat` → "You land a solid blow on the rat, dealing 1 damage!"; `take poker` → "Taken."; `attack rat with poker` → "You have slain the rat!". (This run happened to go blow for blow as the book's did; the chapter says it need not.)
- `yard.story`: gate-clean. "You could eat." after the second `wait`, "You are hungry now…" after the fourth, "You have starved to death." and the ending line on the ninth — identical.
- No issues.

## Chapter 36 — Sound, music and pictures

STATUS: PASS

- Copied `relighting.story` and the `assets` folder (three `.mp3` files under `assets/audio`, one `.png` under `assets/img`) from `chapter-36` into the project; gate-clean.
- Reproduced identically in the terminal: `light lamp` with the last line "The wick takes with a small dry sound, like a page turned."; the role-change turn ending with the bell line and the wisp-flinches sentence; as Ansel waiting in the Library, `wait` + bell + "Somewhere in the Hall, iron complains about iron."; waiting in the Cloister the `heard:` line "Iron shrieks on iron, close by, and stops." alone after a `wait`; and walking `north` on the turn she pushes gives the whole Bell Stair block of 36.5.
- Nothing plays in a terminal, as the chapter says; the recordings and the picture are checked in the browser in chapters 37 and 40.
- Read only (another story, a Parlour): the gramophone, curtains, named beds and layers, `client has`.

## Chapter 37 — The page the player sees

STATUS: PASS

- Copied `relighting.story`, `relighting.config.json` and the `browser` folder from `chapter-37` into the project. `--check` gate-clean. `sharpee build relighting.story` printed the block of 37.2 line for line apart from sizes and timing, and without the "Minted the story's ifid" line, as 37.9 says it will. Output in `dist/web/relighting/` (index.html, game.js, the stylesheets, `audio`, `img`; also a `themes` folder and `index-testing.html`, both of which the build output names).
- `npx serve dist/web/relighting` (npx installed `serve`; the command is the book's own) → `http://localhost:3000`. Driven with Playwright from `~/tools/playwright`.
- Page opens on the prologue and title in the `paper` theme; "Morning" stands over the first room. Settings → Theme lists Classic, Paper, Modern Dark.
- Played to the Library and `read spark page`: the page prints "Afternoon" (title) and "The Hall has noticed you." (description) above "(first taking the spark page)", exactly as the 37.2 block; a side column opens with the panel `workings` / `spark: wakes a flame`.
- Chose Modern Dark and reloaded: theme remembered (browser storage key `relighting-theme`, with `relighting-save-autosave` and `relighting-saves-index` beside it); the transcript returns with `[Session restored]`; the status line reads LIBRARY; the workings panel is there with its one line.
- Recordings and picture (no speakers; checked as loads): on a full walk the page fetched `audio/catch.mp3` (first spark), `audio/toll.mp3` (bell), `img/lantern-lit.png` (Lantern lit; rendered 960×600 in `#sharpee-media`, screenshot taken) and `audio/lapping.mp3` (entering the skiff), all with success status; no failed requests and no console errors. The picture is hidden again on the last turn. By the Lantern the panel holds four lines in the order read — spark, unbind, hush, mend — the same four lines as 37.4.
- Read only: the `unknown client` and `Unknown built-in theme` errors, the harbour channel examples, 37.8 (a page of your own; no step).

## Chapter 38 — Test trees

STATUS: PASS

- Made `relighting.tests` beside the story; wrote `manifest.json` and `mainline.json` with three skip cards (two-space indentation, keys in alphabetical order, one final newline).
- `sharpee test . --json --capture-output > records.txt`: one JSON record to a line (142 lines); the derived-tests report still printed in the terminal. The `take lamp` record matches the book's field for field (`"seq":3`, `"cardId":"card0002"`, `"actualOutput":"You take it."`, `"turn":1`, the `[SKIP]` assertion result) apart from `elapsedMs`. `records.txt` now sits in the project folder.
- Replaced `mainline.json` with the asserting version; `sharpee test .` → "✓ opening-lodge" / "3 cards passing, 4 assertions passing", exit 0. Identical.
- Added `onward01.json` and `thecake1.json` together → "2 line(s)", "✓ opening-lodge", "✓ lodge · eat cake", "6 cards passing, 9 assertions passing", "5 commands (5 authored + 0 replayed), 1 restored at a fork". Identical.
- Broke `cake-watched` ("You find you cannot." → "You decide against it."): exit 1, `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` followed by the story's sentence, and "5 cards passing, 8 assertions passing, 1 card failing, 1 assertion failing". (The chapter prints the failure report only for its own `take lamp` example; the shape is the same.) Put the sentence back: passes again.
- Replaced `relighting.tests` with `chapter-38`'s; story left as it is. Full tree: 7 lines with the seven names in the book's order, "182 cards passing, 275 assertions passing", "181 commands (181 authored + 0 replayed), 6 restored at a fork", "Branches exercised: 53 / 134" with 81 not exercised, "Endings reached: 2 / 3" with `relighting.story:314 · night-falls (lose)`, "Rooms entered: 13 / 13". Identical, line number included.
- Not run, as stated: the `Taken.` variant of 38.6 and the non-canonical-form error are shown, not instructed. No recorder on the command line (accepted item 4).

## Chapter 39 — Claims

STATUS: PASS

- Worked in my own project (chapter 37's story, the full tree from chapter 38).
- `sharpee claim winning1` → the "no line" message and the seven lines by segment id and first command, identical. `sharpee claim thelodge --at 82` → the header, the ten facts printed in the book in the same order, twenty-three more, and "Lock one with: sharpee claim thelodge "<fact>" --at 82". Identical.
- `sharpee claim thelodge "the iron grille is lifted" --at 82 --name "the ward on the stair can be lifted"` → the Locking report (rooms, things, verbs), the three "Written:" lines and "Pinned … on card b7wicd1b." Identical. `relighting.claims.chord`, the manifest's `claims` key and the `locks` key on card `b7wicd1b` are as printed in 39.2–39.3.
- `sharpee test .` → "claims: 1 of 1 held (seed 42)", "0 walks", HELD line and lock line. Identical.
- Added `the story can be won` by hand before `end claims` with one blank line above, and the `locks` key on card `bjhmo3xt` in `winning1.json` → "claims: 2 of 2 held", both HELD lines (turn 82, turn 138), both locks held. Identical.
- Added `the cake can be eaten` by hand → "3 of 3 held", "1 walk", "17 states, 20 commands, stopped: all-claims-settled", witness "take seed cake / north / eat seed cake". Identical to 39.11's block. With `needs rooms: the Lodge` alone → "2 of 3 held, 1 unproven", "1 rooms, 3 things, 2 verbs — 161 states, 239 commands, stopped: max-depth-reached" (the same numbers the book prints for its Lodge-only claim). Gate Court put back.
- Took `change it to lifted` out of the ward trait: exit 1; the failure line for `unbind grille` and the sentence under it are identical to 39.6; "147 cards passing … 35 cards failing" (the book: one card and thirty-four after it); claims "1 of 3 held, 2 unproven", "3 walks", both walks "stopped: max-seconds", and the lock line `— NOT held there: the iron grille is standing` identical; the second lock reads "NOT held there: the story has not ended". The run took 4 min 1 s, as the chapter warns. State and command counts of the two clock-stopped walks differ from the book's single-claim figure (9988 / 54285 against 11612 / 63603), which the chapter says a clock-stopped walk will. Line put back: 182 cards pass and the claims section is 39.11's block, line for line.
- `sharpee test . --verbose` prints "Claims budget per walk: 120s, 500000 states, depth 80".
- Stated faults not tried (accepted item 4): locking after the line's first `put`; a `needs verbs` line naming `put`.
- Read only: the first cake claim "in the Lodge" as a separate fourth claim (the "Build and try it" has the same test done by editing the second claim), the `claims.state-unknown` and canonical-form refusals, the shared-`needs` example of 39.9, the lock pinned one card early.

## Chapter 40 — Publishing

STATUS: PASS

- `sharpee ifid generate` printed one identifier of the book's shape (`3D224413-C1EF-49CA-9203-38CC9C3650C3`; the value belongs to the run).
- The copied story's header already carries `ifid: C24E29F8-C36B-4F55-9FE9-B6D75AE7133D` under `id:`, the same value as `relighting.config.json`, as 40.1 describes.
- Set `story-version: 1.0.0` and wrote `publish-source: yes` in the header (placed after `story-version:`; the chapter says its place does not matter). Gate-clean.
- `sharpee test .` → 182 cards passing, `claims: 3 of 3 held (seed 42)`.
- `sharpee publish relighting.story` → the report of 40.4 line for line (sizes and timing aside): "shipped its source (`publish-source: yes`)", "Shipped 1 import fragment(s) → imports.json", no `game.js.map` line, `IFID:` line with the same identifier, `Output: dist/relighting.zip (0.8 MB)`, the "Unzip anywhere…" line.
- `unzip dist/relighting.zip -d ../relighting-published` → exactly the fourteen files listed in 40.5, `index.html` at the top; no test tree, no claims file, no `index-testing.html`, no source map.
- `npx serve .` inside `relighting-published`, driven with Playwright: the page opens with "The Relighting" / "Story v1.0.0" / the description / "By The Sharpee Project", as the 40.2 block; `sharpee play .` in the terminal prints the same four lines with the version last. Played from the lodge to the beacon (62 turns, score 50, Lamplighter, ending line). The page fetched `audio/catch.mp3`, `audio/toll.mp3`, `img/lantern-lit.png` and `audio/lapping.mp3`, all with success status; no failed requests, no page errors; the workings panel ended with its four lines.
- Read only: the "no identity" refusal, `--out` and `--no-menu` (described, no step).

---

## Appendices A–G

Read, not run (accepted item 7). Not reported on.

---

## Summary

Chapters at each status (40 chapters; the Preface and "How to read this book" are logged above as a 41st entry and also PASS):

| Status | Count |
| --- | --- |
| PASS | 40 |
| PASS-WITH-ISSUES | 0 |
| BLOCKED | 0 |

DEVIATION entries: **0**. Nothing was created, renamed or changed beyond what a chapter's own step said; every deliberate break the book asks for was made and put back.

Differences between the story's output and the book's quoted output, by so much as a word: **none found** outside the accepted-by-design list (version numbers; run values such as paths, sizes, timings, the generated IFID; which of several stated variants came up — bell/timer line, Hobb's manner beat, the empty-inventory sentence, the clock-stopped walk counts in 39.6).

Ambiguities logged (4, each marked `AMBIGUITY` above; none stopped a step):

1. Where the project folder goes (ch. 1) — "anywhere".
2. Ch. 3.4 — an opening block is printed, then "you need not add one"; read as do not add it, so the reordered opening was not reproduced.
3. Ch. 16.8 — "come back for the spark page" prints no command.
4. Ch. 25.2 — a reply is quoted for "the story as chapter 24 left it" with no step to try it; by the time "Build and try it" is reached the reader's file is chapter 25's.

What was not exercised, and why (none of it a failure of the book):

- Blocks that belong to "another story" or to `probe.story` (the Den, the Yard, the Parlour, the harbour channels, Nell/Tom/Cy/Sam and so on) and compiler errors the chapters quote without a step. The book gives no file for them, and the brief forbids inventing one.
- The four faults the book states (ch. 31 role-change on a move; ch. 39 `claim` after the first `put` and `needs verbs: put`; ch. 38 no recorder) were avoided as instructed, not tried.
- Chord Writer steps (none on this box; accepted item 1).
- Sound was checked as "the page fetched the recording successfully", not heard (accepted item 5).

State of the box at the end: `~/repos/relighting` holds the published 1.0.0 story with its tree, claims, assets, `browser/`, `dist/`, plus by-products of book commands (`relighting.ir.json`, `relighting.json`, `records.txt`). `sharpee test .` passes there with 3 of 3 claims held. Nothing under `~/repos/book-test/companion` was modified. Helper scripts are in `~/repos/tools` and `~/tools/playwright` (outside the project).

By the brief's definition the run is **clean**: every chapter PASS, zero BLOCKED, zero deviations.
