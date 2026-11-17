# Execution log — The Chord Manual acceptance test

## Versions

- Title page version line: `Chord 4.1.0, Sharpee 5.7.0` (matches the expected title page; artifact not stale)
- `sharpee --version` at the start of the run: `/bin/bash: line 1: sharpee: command not found`. The command is not installed until chapter 4 (`npm install -g @sharpee/devkit`).
- `sharpee --version` after chapter 4's install:

      Sharpee 5.6.2 · Chord 4.0.3

  This matches the interim release the run expects (accepted item 8).

## Run notes

- The PDF was read as text extracted with pypdf (the Read tool could not render the PDF: poppler is not installed). Because of the extraction, the line breaks of printed prose and the blank lines inside Chord listings come from the text dump, not the page layout. Where a printed Chord line wraps at the page edge, I typed it as one line. The extraction also drops blank lines from the printed output blocks, so blank-line differences between the book's output and the story's output are not compared or reported.
- Project folder: `~/repos/relighting` (one folder for the whole run).

---

## Preface and How to read this book

STATUS: PASS

- AMBIGUITY — "How to read this book", 0.9 The companion folders. (a) 0.9. (b) "A folder holds the story file and a test tree". (c) The local companion directory also holds folders named `part-1` … `part-8`, which the book never mentions. They were not opened (no chapter step names them).

---

## Chapter 1 — The shape of a story file

STATUS: PASS-WITH-ISSUES

- AMBIGUITY — Chapter 1, 1.7 What you have so far. (a) 1.7. (b) "Type the story at the top of this chapter into a file called relighting.story". (c) The book never says which folder to create the file in, or that a project folder is needed at all (1 says "there is no project file beside it"). I resolved this by creating `~/repos/relighting/` and working there for the whole run.
- AMBIGUITY — Chapter 1, opening listing / 1.4 Blank lines. (a) The full listing of The Relighting at the top of chapter 1. (b) 1.4 says the Lodge and Ansel each have "a blank line, and then the description", and that a comment needs a blank line before and after it. (c) In the text I could extract, the listing shows no blank lines, so I placed them from the rules in 1.4 and 1.5: one blank line between blocks, one after the comment, and one between each create block's short lines and its description. Whether this matches the printed page can only be confirmed by compiling, in chapter 4.
- AMBIGUITY — Chapter 1, "Under the Hood: Story IR · sharpee compose". (a) The box. (b) "The command sharpee compose relighting.story -o relighting.ir.json writes it where you can read it." (c) Commands inside Under the Hood boxes are to be run, but `sharpee` is not installed until chapter 4. I deferred running this command until the tool was installed in chapter 4 (see that entry).

---

## Chapter 2 — The story header

STATUS: PASS

No "Build and try it" section. The Part I story's outputs (the opening and `about`) were reproduced after the tool was installed in chapter 4.

- `> about` matches the 2.3 block word for word.
- The 2.4 opening matches the play in chapter 4 word for word.
- NOT RUN — 2.2 What the player sees. The opening shown for "the smallest header" (`Story v0.0.0`, `The porter's lodge is one small room.`) comes from a different story, with a shorter Lodge description than the one the book has you type. The chapter gives no step to build that story, so I did not build it. The same applies to the 2.1 and 2.6 error blocks and the Under the Hood meta listing (the meta of a header the book never has you write). The IR from the real story (chapter 4) does have `title` plus a `fields` map, as the box describes.

---

## Chapter 3 — The player and the start

STATUS: PASS

No "Build and try it" section.

- `> examine me` matches the 3.1 block word for word (checked in chapter 4).
- Under the Hood: in the IR written in chapter 4, Ansel's entry has `"name": "Ansel"`, `"article": null`, `"aka": []` and `"isPlayable": true`, as shown.
- NOT RUN — 3.4 When it goes wrong. The four mistakes are described with their errors but not given as steps, so I did not make them.

---

## Chapter 4 — Build, play, read an error

STATUS: PASS-WITH-ISSUES

- SUBSTITUTION (logged once, as instructed) — I could not hold an interactive `sharpee play .` session. Every play in this run sends its commands on standard input, one to a line, ending with `/quit`.
- ISSUE — 4.1 Installing the command. (b) The book says only `npm install -g @sharpee/devkit`. (c) With this box's npm (12.0.2) the install succeeded, but npm printed a warning the book does not mention:
  ```
  npm warn install-scripts 1 package had install scripts blocked because they are not covered by allowScripts:
  npm warn install-scripts   esbuild@0.27.7 (postinstall: node install.js)
  npm warn install-scripts Run `npm install -g --allow-scripts=esbuild` to allow these scripts once, ...
  ```
  I did nothing about it (no R&D). If it matters, it will show up in a later chapter's build.
- `sharpee --version` → `Sharpee 5.6.2 · Chord 4.0.3` (accepted item 8).
- 4.3: `compose: Chord 4.0.3 — relighting.story is gate-clean (--check: IR not emitted)` matches, apart from the version (accepted item 8).
- OUTPUT DIFFERENCE — 4.4 Playing the story. (b) The block begins `--- Play Mode ---  (/quit or /q to exit)`. (c) `sharpee play .` first prints a line the book does not show: `Loading story from: /home/node/repos/relighting`. The path belongs to the run (item 3), but the book's block has no such line at all. Everything else in the opening, and the replies to `examine me`, `examine lamp`, `north`, `wait` and `xyzzy`, match word for word.
- 4.5 Reading an error: both diagnostics match word for word, including the line numbers 31:3 and 24:3, and so does the summary line `compose: relighting.story failed the load-time gates (2 error(s))`.
- OUTPUT DIFFERENCE — 4.6 When the compiler guesses. (b) The book prints one line: `relighting.story:25:13 error [analysis.unknown-entity] No entity named `Loge` — did you mean `lodge`?.` (c) That line matches word for word, but the compiler also printed a second line that the book leaves out: `compose: relighting.story failed the load-time gates (1 error(s))`. (In 4.5 the book does print this summary line.)
- AMBIGUITY — 4.7 Warnings. (b) "Delete the Lodge's description, leaving the header line with nothing under it". (c) It is unclear whether the blank line between the header and the description should go too. I deleted it along with the paragraph. The warning `relighting.story:16:8 warning [analysis.room-no-description] ...` and the gate-clean line match. I restored the description, and the check was gate-clean again.
- 4.8: `sharpee play relighting.story` printed the quoted `play: 'relighting.story' is neither a directory nor a registered story — ...` line word for word (exit status 2).
- NOT RUN — 4.8, the second .story file. The chapter describes the error but gives no step to cause it, so I did not create a second .story file.
- Under the Hood (and the chapter 1 box, deferred to here): `sharpee compose relighting.story -o relighting.ir.json` printed `compose: Chord 4.0.3 — relighting.story loaded — 2 entities, 0 trait(s), 0 action(s)` and `compose: IR written to relighting.ir.json`, which match apart from the version.
- AMBIGUITY — 4 introduction. (b) "This book gives both wherever a step is something you do rather than something you write, under the heading 'Build and try it'." (c) Chapter 4 itself has no section headed "Build and try it". Its steps are spread across 4.1–4.8. The missing Chord Writer steps are accepted item 1, so I am not reporting those.

---

## Chapter 5 — Rooms and exits

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-05/relighting.story` over my story. The check was gate-clean. I walked every room: Refectory, Library and Undercroft from the Cloister, then the Bell Stair, the Lantern Gallery and back down.

- The 5.6 blocks (`> north` first visit to the Gate Court, then `> look`), the 5.7 block (`> south` → `The Porter's Lodge` …), and the 5.8 blocks (`> north` → Bell Stair, `> up` → Lantern Gallery, `> east` → `You can't go that way.`) all match word for word.
- AMBIGUITY — 5.8 Build and try it. (b) "Then try a direction that has no exit, in a room that has others." (c) It comes straight after the walk to the Lantern Gallery, which has only one exit (down), so "a room that has others" is unclear. I typed `east` in the Lantern Gallery, and the reply matched the book (`You can't go that way.`).
- NOTE — 5.4 One-way exits / 5.3 (the Den/Attic/Cellar examples) and the `Cloyster` error in 5.8 are illustrations, not steps, so I did not run them.

---

## Chapter 6 — Things

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-06/relighting.story`. The check was gate-clean.

- These all match word for word: the 6.1 room listing `You can see a kettle, a hand lamp, and Hobb here.`, `> examine lamp` (6.1), `> take chair` → `The chair is fixed in place.` (6.2), `> take hobb` → `You can't take Hobb.` (6.3), `> inventory` (6.6), `> examine spectacles` / `> search` → `Hidden here, you discover: spectacles.` / `> take glasses` → `Taken.` (6.7), and in 6.8 `> drop lamp` → `Dropped.` and `> look` in the Gate Court with `You can see a hand lamp here.`
- NOT RUN — 6.7, the `hide behind curtain` example. It is "from another story" (the curtain in the Den), so it is not a step for The Relighting.
- ISSUE / AMBIGUITY — 6.8 Build and try it. (b) "Then examine everything a description mentions, in every room. Where the answer is 'You can't see any such thing', you have found a promise the story is not yet keeping. Some of those are deliberate, because the Library's desks and the bell rope have chapters of their own coming. The rest are yours to fix." (c) I examined every noun in every description. These answered `You can't see any such thing.`: Lodge — `door`; Gate Court — `flagstones`, `grass`, `cloister arch`; Cloister — `garth`, `nettles`, `steps`; Refectory — `tables`, `benches`; Library — `desks`, `galleries`, `shelves`, `stacks`; Undercroft — `vaults`, `pillars`; Bell Stair — `stair`, `well`, `rope`; Lantern Gallery — `drum`, `glass`. "The rest are yours to fix" asks the reader to write lines the book does not print. Under the rules (never invent lines) I did not fix them. A literal reader is left with an open-ended task that has no stated answer.
- 6.6: The inventory list matches. The chapter says the story "now does this for the blue flame on the sill, the chair, the newspapers, the gate, the hearth in the Refectory and the Great Lantern", and all six of those examine.

---

## Chapter 7 — Containers and supporters

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-07/relighting.story`. The check was gate-clean.

- These all match word for word: 7.1 (`> west` → Library with `On the reading desk you see a grimoire.`, `> take book`, `> put book on desk`), 7.2 (`> take lens` → `You can't see any such thing.`, `> open crate`, `> take lens`), 7.3 `> put lens in lantern`, 7.4 `> open press` → `You open the oak press, which is empty.`, 7.6 (`> enter chair` / `> north` → `You're not in a place where you can go anywhere.` / `> exit`), and 7.7 (`> put kettle on chair` with `(first taking the kettle)`, and `> look` with the press clause, `You can see a hand lamp and Hobb here.` and `On the chair you see a kettle.`).
- AMBIGUITY — 7.3 How much it holds. (b) `> put taper in crate` → `There's no room in the crate.` (c) This block comes right after 7.2's sequence, which ends `> take lens` → `You take the lens from the crate.` Typed in that order, the crate is empty and the story answers `You put the wax taper in the crate.` The book's reply appears only if the taper goes in while the lens is still in the crate (`open crate`, then `put taper in crate` → `There's no room in the crate.`, which matches). The prose ("The crate holds one, and that one is the lens") implies the second order, but the blocks as printed read as one continuing session.
- NOT RUN — the 7.5 bell jar and table come "from another story" (the Den), so they are not steps.
- The walk in 7.7 ("walk to the Undercroft, open the crate, and carry the lens to the roof") worked, ending in `You put the lens in the Great Lantern.`

---

## Chapter 8 — Doors, locks and keys

STATUS: PASS

Copied `companion/chapter-08/relighting.story`. The check was gate-clean.

- These all match word for word: 8.3 (`> west` / `> open door` → `The library door is locked.`, `> open press` → `You open the oak press.` / `In the oak press you see a library key.`, `> take key`, `> unlock door with key`, `> west` → `The library door is closed.`, `> open door`, `> west` → Library), 8.3 `> unlock door with taper` → `The wax taper doesn't fit the library door.`, and 8.7 (`> close door`, `> lock door with key`, `> east` → `The library door is locked.`). The Cloister description now reads "the library door west", as 8.7 says.
- AMBIGUITY (resolved) — 8.3 Playing it. (b) The wrong-key block (`> unlock door with taper`) comes after the door has been unlocked and opened. (c) Once the door is unlocked, trying the taper no longer tests the lock, so I typed it while the door was still locked. The reply matched the book.
- NOT RUN — 8.4 `opens when unlocked`. The Relighting "leaves this line out", so I did not add it. The 8.5 strongbox and the 8.6 key ring are illustrations.

---

## Chapter 9 — What things can do: the trait words

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-09/relighting.story`. The check was gate-clean. I used each new thing for what it is for and for what it is not (coat, cake, cup, candles, grimoire, bell rope).

- These all match word for word: 9.1 `> inventory` (`You are carrying and wearing:` …), `> take off coat`, `> wear coat`; 9.2 `> examine book`; 9.3 `> eat cake` ×2; 9.4 `> pull rope`, `> take rope`; 9.5 `> take cup`, `> drop cup` → `The cup hits the floor and breaks.`; 9.9 `> eat coat` → `That's not something you can eat.`
- OUTPUT DIFFERENCE — 9.9 Build and try it. (b) `> read coat` → `There's nothing written on the coat.` (c) The story printed `There's nothing written on the travelling coat.` (it uses the full name, "travelling coat", where the book has "coat").
- OUTPUT DIFFERENCE — 9.2 Reading. (b)
  ```
  > read book
  The grimoire reads:
  In the margin, ...
  ```
  (c) With the grimoire on the desk (where the story places it), the story first takes it:
  ```
  > read book
  (first taking the grimoire)
  You take the grimoire from the reading desk.
  The grimoire reads:
  In the margin, in a small brown hand: gnusto. Came over the water as a working, they say. Meaning lost.
  ```
  The book's block has no implicit take. A later `read margin` (with the book now held) printed just the two lines.
- NOT RUN — the hat and cap (9.1), the trolley (9.4), the tassel (9.6) and the wireless (9.7) are Den/Yard examples from another story, not steps.
- NOTE — the candles: `examine candles` gives their description, and `take candles` → `The candles are fixed in place.` The chapter prints neither, and gives no block for what the candles "are for". Chapter 10 is about light.

---

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

Copied `companion/chapter-10/relighting.story`. The check was gate-clean. I walked down without the lamp, fetched it, lit it, walked down with it, then left it lit in the Undercroft and came back.

- These all match word for word: 10.1 (`> down` → grue line, `> look`, `> examine crate`, `> up` → the Cloister with "down into the dark"), 10.2 (`> light lamp`, `> down` → Undercroft with `You can see a crate here.`, `> extinguish lamp` → `…, and darkness closes in.`, `> look`, `> light lamp` → `…, and the darkness draws back.` plus the room, `> light taper` → `The wax taper isn't something you can light.`), and 10.6 (`> drop lamp`, `> up`, `> down` → `You can see a crate and a hand lamp here.`).
- NOT RUN — 10.4 night-vision (Ansel "starts in the Cellar", an illustration) and the 10.5 tin/cheese/clock/sock from another story.

---

## Chapter 11 — Regions

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-11/relighting.story`. The check was gate-clean.

- These all match word for word: 11.3 (`> examine tower` in the Grounds, `> north` → Cloister, `> examine tower` → `You can't see any such thing.`) and 11.5 (`> north` ×3 through Stack 1–3, then `> north` → `You can't go that way.`). I walked back to the Library. The shelves backdrop answers in the Library and in the stacks. The tower examines from both the Lodge and the Gate Court.
- 11.7 kettle-in-the-Grounds break: the diagnostic matches word for word, including `142:3`. As in 4.6, the compiler also printed `compose: relighting.story failed the load-time gates (1 error(s))`, which the book's block leaves out.
- ISSUE — 11.7 Build and try it. (b) "Then try placing the kettle in the Grounds instead of the Lodge, and read what the compiler says." (c) The chapter breaks the story and never says to put it back, unlike 4.5 ("Put the letter back before you go on") and 4.7 ("Restore the description"). A literal reader ends chapter 11 with a story that is not gate-clean. (Chapter 12 copies a new story over it, so the run was not harmed. I restored the line, and the check was gate-clean again.)

---

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS

Copied `companion/chapter-12/relighting.story`. The check was gate-clean.

- These all match word for word: 12.1 `> up` at the Bell Stair → `The grille stands across the stair, and there is no way round it.`; 12.4 `> examine hearth`, `> squeeze behind hearth` (no lamp) → grue line, and `> squeeze behind hearth` in the Undercroft → `I don't understand that.`; 12.5 (lamp fetched and lit) `> squeeze behind hearth` → Undercroft with `You can see a crate here.`
- 12.2 (the temporary step the chapter asks for): I removed `up is blocked: stair-sealed` (line 102, the line the 12.1 error message also names). The story was gate-clean. `up` then `east` printed the parapet phrase and `[The story has ended. RESTART, RESTORE or UNDO]`, word for word. I put the line back, and the check was gate-clean.
- NOT RUN — 12.3 (the Study/Vault `while` exit) is an illustration. The Relighting "has no hidden exit of this kind".

---

## Chapter 13 — States

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-13/relighting.story`. The check was gate-clean.

- 13.8 `> read page` (first taking the kindle page …) matches word for word. As the chapter says, nothing else has changed. `up` at the Bell Stair is still refused.
- 13.4 (temporary experiment): I added `change the iron grille to lifted` to the start block. The story was gate-clean, and `> up` gave the Lantern Gallery word for word. I took the line out again.
- Under the Hood: `sharpee compose relighting.story -o relighting.json` worked. The grille's entry has `states: ["standing","lifted"]` and `statesReversible: false`, as described.
- ISSUE — 13 introduction and 13.9 What you have so far. (b) "This chapter gives states to the story and to six of its things" and "The story and six of its things can now be in one condition or another". (c) The chapter declares states on five things: the iron grille, the lens, the cistern, the tower bell and the kindle page. The companion story has exactly five thing-level `states:` lines (265, 291, 300, 310, 324) plus the header's. Its own opening comment also says "six of its things now have states". The count is wrong in the book (and in the companion comment).
- NOT RUN — 13.2 (the wax seal), 13.5 (the sluice), the 13.7 probe.story errors and the dial are illustrations from other stories.

---

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-14/relighting.story`. The check was gate-clean.

- These all match word for word: 14.1 `> take kettle`, 14.3 `> read page` (with the first-taking lines, as printed), 14.4 `> pull rope` plus `Nothing answers. …`, 14.5 `> push grille` / `> pull grille`, 14.6 `> give spectacles to hobb`, 14.7 `> west` with `There is a smell in here …`, and 14.9 `> search` / `> take spectacles`.
- OUTPUT DIFFERENCE — 14.8 Clauses about the person. (b)
  ```
  > eat cake
  You eat some of the seed cake.
  It tastes of caraway, and of being nineteen.
  ```
  (c) The cake is on the chair, where the story places it, and the story printed:
  ```
  > eat cake
  (first taking the seed cake)
  You take the seed cake from the chair.
  You eat some of the seed cake.
  It tastes of caraway, and of being nineteen.
  ```
  The book's block leaves out the two implicit-take lines (chapter 9.3's block for the same command does include them).
- ISSUE — 14.9 Under the Hood: The phases of an action. (b) "`sharpee test` lists every clause it found by owner and gerund, such as 'kettle · on taking'". (c) Run as written in the project folder, `sharpee test` printed `test: no test tree found in /home/node/repos/relighting — expected a <story-id>.tests/ directory beside the .story file (record tests in the IDE's Testing tab)` and exited with status 2. No clause list was shown. The box gives no hint that a test tree (chapter 38) is needed first. The message's mention of "the IDE's Testing tab" is the Chord Writer path (accepted item 1).
- NOT RUN — the 14.6 dial clause (`set dial to high`) belongs to the Yard dial from another story. I could not test the lens's `after the player inserting in the Great Lantern` clause, because the stair is still sealed.

---

## Chapter 15 — What a clause can say and do

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-15/relighting.story`. The check was gate-clean.

- These all match word for word: 15.1 `> light lamp` → `You reach for the word and find only the place where it was.`; 15.2 `> eat cake` → `Hobb cut that cake …`, and the cake can be eaten in the Gate Court; 15.4 `> light candles` (+ `candles-catch`) and `> look` with `You can see an unbind page here.`; 15.5 `> read page` ×2 (the second gives `You know it. You are not likely to lose it twice.`); 15.7 `> light lamp` / `> down` → Undercroft with the crate.
- AMBIGUITY — 15.7 Under the Hood: What the test runner derives. (b) "Run sharpee test . on this chapter's folder and read the list under 'Derived rule tests'." (c) "This chapter's folder" could mean my project (which, by the book's own instruction, holds only the copied `relighting.story` and no test tree, so `sharpee test` fails there; see chapter 14) or the companion folder `chapter-15`. I ran `sharpee test .` inside `companion/chapter-15` (no files were added or changed there). It exited with status 0. The list is headed `Derived rule tests (ADR-356): 21 branches`, not just "Derived rule tests" (the `(ADR-356)` tag is not in the book), and it includes the two lines the book quotes, word for word: `✓ hand lamp · on lighting · refused no-such-word` and `✓ seed cake · on eating · refused cake-watched`. The output starts with `Test tree: relighting.tests/ (seed 42, 1 line(s))`, `✓ opening-lodge` and `30 cards passing, 37 assertions passing`, and ends with `Branches exercised: 13 / 21`, `Endings reached: 0 / 0` and `Rooms entered: 8 / 11`, none of which the box mentions.
- NOT TESTED — the Great Lantern's `lantern-empty` requirement and the lens clause in play: the stair is still sealed, so the roof cannot be reached.

---

## Chapter 16 — Conditions

STATUS: PASS

Copied `companion/chapter-16/relighting.story`. The check was gate-clean. I walked to Stack 3 before reading anything, tried the hush page, came back for the kindle page, then returned.

- These all match word for word: 16.5 `> examine grimoire` (`… still as blank as these.`), 16.6 `> read hush page` while faded (`The leaf is blank on both sides …`), and after the kindle page `> read hush page` (`(first taking the hush page)` / `Taken.` / `The third working …`) and `> examine grimoire` (`Something has changed in the last hour …`).
- Under the Hood: in the IR, `conditions` has `lantern-ready` as an `and` with two predicate branches, each with a subject and an object, and `faded-page` with `"open": true`, as described.

---

## Chapter 17 — Choosing between outcomes

STATUS: PASS

Copied `companion/chapter-17/relighting.story`. The check was gate-clean.

- These all match word for word: 17.1 kindle page readings (legible, then learned), 17.3 `> examine cistern` (`It is a block of grey ice …`), 17.4 `> pull rope` ×4 (cycling back to the first arm on the fourth pull), and 17.5 `> examine grille` ×4 (first, second, third, then the description only).
- Under the Hood (run as `sharpee test .` inside `companion/chapter-17`, the same reading as chapter 15): it lists `✓ kindle page · on reading · when legible`, `✓ kindle page · on reading · when learned` and `✓ iron grille · after examining · the third time`, word for word as quoted. `33 cards passing, 38 assertions passing`.
- NOT RUN — the 17.2 refusal-inside-select error is shown as a mistake, not as a step.

---

## Chapter 18 — Counting, scoring and ending

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-18/relighting.story`. The check was gate-clean.

- These all match word for word: 18.1 the fourth `> pull rope` (`Your palms have begun to object.` before the cycling line), 18.3 `> score` → `You have scored 5 out of 25, earning you the rank of a Latecomer.`, 18.4 `> light candles` with `You have risen to the rank of a Second-Year.`, and 18.8 `> score` → `You have scored 10 out of 25, earning you the rank of a Second-Year.` The grimoire's `grimoire-half` line appears once two workings are learned (18.2).
- 18.6 Trying the endings: both blocks match word for word. The cracked lens gives `For one breath …` and `[The story has ended …]`. With `change the lens to sound` added, it gives `The lens gathers the flame …`, `You have risen to the rank of a Second-Year.` and the ending line.
- AMBIGUITY — 18.6. (b) "In a copy of the file, set the world up as it will be late in the game." (c) The book does not say where the copy goes. Chapter 4.8 says a project may hold only one .story file and advises "Keep your experiments in another folder", so I put the copy in a separate scratch folder and played it there. My project's story was left as the companion file.
- Under the Hood: the IR has `scores` (three entries, each with a name and a worth) and `ranks` sorted by threshold (0, 10, 25), as described.
- NOT RUN — the 18.7 vial (Yard, another story), the sips/vial counter examples, and the rank-above-max error are illustrations.

---

## Chapter 19 — Time

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-19/relighting.story`. The check was gate-clean. I played through the reading of the page and down to the Undercroft with the lamp lit, as 19.7 says.

- These all match word for word: 19.2 `> light lamp` + `Somewhere above you, old timber …` and `> east` → Cloister + `A slow draught …`; 19.2 `> wait` → `The bell tolls again, and the rooks go up off the roof.` (cycling, accepted item 6); 19.5 `> examine blue flame` in the morning (`It is early yet …`) and after the page (`It is taller than it was this morning …`); 19.7 `> score` → `You have scored 15 out of 35, earning you the rank of a Second-Year.`
- 19.4: In a fresh game of `wait` only, `The light has turned. The shadows in the Hall have begun to lean east.` came after a `Time passes...`, and exactly 30 waits later `Dusk comes down on Lanternhall …` and `[The story has ended. RESTART, RESTORE or UNDO]`. Both match word for word.
- OUTPUT DIFFERENCE — 19.1 Every turn. (b) The book prints:
  ```
  > down
  Undercroft
  ... You can see a crate here.
  Where the lamplight falls on it, the ice in the cistern begins to sweat.
  > examine cistern
  A stone cistern ... somewhere above.
  The ice has gone dark and wet, ...
  The ice in the cistern breaks up all at once. A leaf of paper rides up on the meltwater and slides out onto the flags.
  ```
  (c) The story printed extra lines in both turns:
  ```
  > down
  Undercroft
  ... You can see a crate here.
  The tower bell strikes once, and the sound goes through the stones under your feet.
  Where the lamplight falls on it, the ice in the cistern begins to sweat.
  > examine cistern
  ...
  The ice in the cistern breaks up all at once. A leaf of paper rides up on the meltwater and slides out onto the flags.
  The tower bell tolls.
  You have risen to the rank of a Second-Year.
  ```
  As far as I can tell from the chapter, the book's version cannot be reached. The lamp lights only after the kindle page is read (chapter 15), reading the page starts the three-turn timer, and the bell tolls on every turn after it expires. So any lamplit visit to the cistern carries the strike or toll lines. (The rank line appears unless the candles were lit first.)
- Under the Hood: the IR has `timers` (waking, with `states: ["creak","sway","strike"]`) and `sequences` (the day, with `narration: "broadcast"` and steps `at-turn 50` and `later 30`), as described.
- NOT RUN — the 19.3 squib/fuse timer and the 19.6 `when Hobb moves` clause are illustrations.

---

## Chapter 20 — Phrases

STATUS: PASS

Copied `companion/chapter-20/relighting.story`. The check was gate-clean. I walked in and out of the Lodge three times, read the page, waited for the bell, and went back.

- These all match word for word: 20.2 `> light lamp` ×3 (the three cycling variants), 20.3 Hobb's three sayings on the three entries (cycling order; the book shows the second saying in 20.3, accepted item 6), 20.4 `> examine gate` with the verbatim motto and its relative indentation preserved, 20.6 `> north` → Bell Stair with `An iron grille stands across its third step.`, 20.5 `> examine bell` → `By your count that makes 1, and it is not tired.` (the number belongs to the run; the book shows 3), and 20.7 `> south` with `Hobb has his hands over his ears. …` followed by a bell line (the book's `The tower bell tolls.` is one arm of the cycling toll; I got `The bell tolls again, …`, accepted item 6).
- NOTE — 20.3/20.7: the book's Lodge listing reads `You can see a kettle and Hobb here.` Mine read `You can see a kettle, a hand lamp, and Hobb here.` because I had not taken the lamp. That is a difference in play state, not wording, so it is not a defect.

---

## Chapter 21 — A thing's own words

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-21/relighting.story`. The check was gate-clean.

- These all match word for word: 21.1 `> examine lamp` unlit, `> light lamp` + creak, `> examine lamp` lit (detail joined to the paragraph) + sway; the candle sequence `> examine candles` / `> light candles` / `> examine candles`, including the three toll lines and the rank line in the same order as the book; and 21.3 the Lodge with Hobb's present sentence joined to the description and Hobb still in the list.
- OUTPUT DIFFERENCE — 21.6 Build and try it. (b)
  ```
  > examine lens
  A disc of glass as wide as a cartwheel, ground in rings. A crack runs across it from edge to edge.
  ```
  (c) The story printed those two lines and then `The bell tolls again, and the rooks go up off the roof.` On the path 21.6 prescribes (lit lamp, so the page has been read), the bell is tolling, so a toll line ends every turn. The book's block leaves it out. (Same cause as chapter 19.1. Only the wording of the toll varies on purpose, not whether it appears.)
- NOT RUN — the 21.4 cat (Yard) is from another story.

---

## Chapter 22 — Changing the standard messages

STATUS: PASS-WITH-ISSUES

- 22.1: `sharpee messages` printed `Message catalog: 885 overridable messages (en-US)` and then one JSON document (`{"schemaVersion":1,"locale":"en-US","messages":[…]}`). It has 885 aliases, as the book says. The entries for `taking-taken`, `going-too-dark`, `lighting-lit` and `taking-taken-from` have the id/alias/template shape the book quotes. NOTE: the output is one long line of JSON after a header line, not one entry per line, so "search the file for a few words" works, but each entry is not on a line of its own.

Copied `companion/chapter-22/relighting.story`. The check was gate-clean.

- These all match word for word: 22.2 `> down` (no lamp) → the shins override; 22.3 `> wait` ×3 (the three cycling variants); 22.4 `> take lamp` → `You take it.`; 22.7 `> push grille` while asleep → `It does not so much as rattle.`; 22.10 `> look` in the dark → `It is dark, and the dark here is old and has no interest in you.` After the page, `take kettle` gives `"Still mine," says Hobb, with his eye on the ceiling.`
- OUTPUT DIFFERENCE — 22.7 Phrasebooks. (b) "After the kindle page has been read:" `> push grille` → `It hums under your hand, very faintly, like a rail with a train a long way off. It does not move.` (c) The story printed that line and then `The tower bell strikes once, and the sound goes through the stones under your feet.` Every turn after the page is read ends with a timer line or a toll line (chapter 19), so the book's single-line block cannot be reproduced. Same cause as 19.1 and 21.6.
- Under the Hood: the IR has `messageOverrides` and `phrasebooks` sections.
- NOT RUN — the 22.5 `taking-taken-from` override and the 22.9 `import "books"` are described but are not part of the chapter's story (the 22.10 list does not include them).

---

## Chapter 23 — New verbs

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-23/relighting.story`. The check was gate-clean. I tried each working before and after its page (kindle, hush; mend and unbind before only).

- These all match word for word: 23.2 `> kindle` → `A working is said to something …`; 23.3 `> hush bell` in the Library → `You can't see any bell here.`; 23.4 `> mend lamp` → `The shape of it is there, …` (the second no-such-word variant, which came up because it was the second use); 23.8 `> gnusto` before the bell; 23.9 `> remember dimming`, `> remember the dimming`, `> recall hobb`, `> remember breakfast`. After the hush page, `hush shelves` and `hush bell` give `That is making no noise you could quiet.`, and `gnusto` while tolling gives the gnusto-drowned line. `light lamp` still works with the standard verb, as the chapter says.
- OUTPUT DIFFERENCE — 23.6 When nothing answers. (b)
  ```
  > kindle lamp
  There is nothing in that for a flame to stand on.
  > kindle grimoire
  There is nothing in that for a flame to stand on.
  ```
  (c) After the page is read (which kindling requires), each turn adds a timer line:
  ```
  > kindle lamp
  There is nothing in that for a flame to stand on.
  Somewhere above you, old timber takes a weight it had forgotten.
  > kindle grimoire
  There is nothing in that for a flame to stand on.
  A slow draught moves through the Hall, one way and then the other.
  ```
  Same cause as 19.1, 21.6 and 22.7: the book's quoted blocks leave out the waking/toll narration that follows every turn after the page.
- NOTE — `scrawl` and `shout` are `I don't understand that.` in this story, as expected: 23.10 and 23.11 say they are examples, and The Relighting "does not use this action". The 23.2, 23.5 and 23.12 probe.story errors are illustrations.

---

## Chapter 24 — New kinds of thing

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-24/relighting.story`. The check was gate-clean. I played the game to its end three times: once in a free order, once in exactly the order 24.10 gives (read the first page; kindle the lamp and the candles; find and read the other three pages; hush the bell, unbind the grille, mend the lens, carry it to the roof and seat it), and once more leaving the lens cracked.

- The final 24.10 block matches word for word: `> kindle lantern` → the kindled line, `The lens gathers the flame …`, `You have risen to the rank of a Lamplighter.` and `[The story has ended. RESTART, RESTORE or UNDO]`. Score before the last move was 35 of 50. The cracked-lens replay ends with `For one breath the cracked lens …` and the end line.
- These also match word for word in their first lines: 24.1 `> kindle lamp` ×2 (kindled, then `It is burning already, …`), 24.3 `> light lamp` (`You have no match, …`), 24.4 `> kindle lantern` with no lens (`There is a wick, and there is a seat …`), 24.6 `> mend spectacles` (the trait's phrase), `> mend lens` (the lens's own phrase) and `> examine lens` (`… There is no flaw in it anywhere, and you looked.`), and 24.7 `> unbind grille` while tolling, `> hush bell` and `> unbind grille`.
- OUTPUT DIFFERENCE — 24.1, 24.2, 24.3, 24.6 and the first `unbind grille` in 24.7 (the timer/toll family again, same cause as 19.1). Each book block ends at the action's own text. In play, a timer or toll line follows each one, e.g. `> kindle lamp` … `Somewhere above you, old timber takes a weight it had forgotten.`; `> light lamp` … `The tower bell strikes once, …`; `> mend spectacles` … `The bell tolls. You have stopped counting.` In 24.2 the book's block runs straight from `… the daylight did not show.` to `You have risen to the rank of a Second-Year.`, and the story printed `The tower bell tolls.` between those two lines.
- OUTPUT DIFFERENCE — 24.7 The bell and the grille. (b)
  ```
  > unbind grille
  You say the word. The grille is not there, in the manner of a thing that was never there, and the stair goes up.
  ```
  (c) Played in the order 24.10 gives, the story printed a third line: `You have risen to the rank of a Journeyman.` (the unsealed award takes the score to 30). In my free-order play the Journeyman line came after `hush bell` instead. Neither of the book's blocks shows a rank line.
- Under the Hood: the IR's `wick` trait has `"routing": "capability"` on its kindling clause, as described. (Its lighting clause shows `"routing": "interceptor"`, which the box doesn't mention.)
- NOT RUN — the 24.8 brazier/cresset (Yard, another story) and the 24.9 `cold-wick` example.

---

## Chapter 25 — Bending the standard grammar

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-25/relighting.story` over my story and `synonyms.chord` beside it. The check was gate-clean. I played the winning walk with the plain words (light lamp, light candles, quiet bell, fix spectacles, repair lens, light lantern), and the story was won.

- These all match word for word: 25.1 `> fix spectacles` (first line), 25.2 `> sit on chair` → `You get into the chair.` and `> exit`, 25.4 `> light lamp` before the page (`You reach for the word …`) and after it (kindled), `> light lamp with taper` (`You have no match, …`), and the first line of 25.7 `> quiet bell`.
- OUTPUT DIFFERENCE — 25.7 Build and try it. (b) `> quiet bell` → the hush line only. (c) Played in the walk's own order (`fix spectacles` before `quiet bell`), the story added `You have risen to the rank of a Journeyman.` after the hush line. The rank line depends on order; the book's block shows none.
- OUTPUT DIFFERENCE — 25.4 (timer family, as in 19.1). `> light lamp` after the page was followed by `Somewhere above you, old timber takes a weight it had forgotten.`, and `> light lamp with taper` by `A slow draught moves through the Hall, …`. The book's blocks show only the action's line.
- NOT REPRODUCIBLE — 25.2 `> sit on chair` → `I don't understand that.` describes the story before this chapter's change. The chapter-25 story already has the extension.
- Under the Hood: the IR has `grammarRemovals` with one entry (lighting, `light :target`) and `grammarExtensions` with four (kindling, mending, hushing, entering), as described.

---

## Chapter 26 — People who act

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-26/relighting.story`. The check was gate-clean. I walked to the Refectory, waited, followed Tamsin into the Cloister, read the page, lit the lamp, and waited in the Cloister for the bell. Tamsin came through, and I followed her to the tower.

- These all match word for word: 26.3 `> take key` / `> open press` with `Hobb closes the oak press.` after each; 26.4 `> east` (Refectory with Tamsin), `> examine tamsin` (own-business with she/her, plus tamsin-sorts), `> wait` → `Tamsin Vey leaves to the west.`; 26.4.2 `> north` → Bell Stair with `You can see Tamsin Vey here.` / `The tower bell tolls.` / `The wisp follows you.` / the grille line, then her push and her pry bar on the next two turns; 26.5 `> wait` → `The tower bell tolls.` / `Tamsin Vey enters from the east.`; 26.6 `> talk to hobb` → `Hobb doesn't respond.` The `You wait.` lines came up as whichever variant the cycling waiting override gave (accepted item 6).
- OUTPUT DIFFERENCE — 26.2 The stock behaviours (timer family, as in 19.1). (b) `> light lamp` → kindled + `Something small and blue …`; `> east` → Cloister + `The wisp follows you.` (c) The story added `Somewhere above you, old timber takes a weight it had forgotten.` after the wisp line on the first turn, and `A slow draught moves through the Hall, one way and then the other.` between the room description and `The wisp follows you.` on the second. Both come from the waking timer, which reading the page (needed to light the lamp) has started.
- NOT RUN — Sam and the custom pronoun set, the cat and watchman (26.2.1), and Nell/Pat (26.4.1) are from other stories.

---

## Chapter 27 — Asking and telling

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-27/relighting.story`. The check was gate-clean. I asked Hobb about everything in his table and about something not in it, then played on until the bell tolled, came back to the Lodge and asked him about the bell.

- These all match word for word, beats included: 27.1 `> ask hobb about the dimming` and `> ask hobb about tamsin`; 27.1.1 `> ask hobb about the kettle`; 27.1.2 `> ask hobb about the bell` before the bell (refusal, no beat) and while tolling (beat, line, `Hobb gives the hush page to Ansel.`); 27.1.3 `> ask hobb about the weather` → `Hobb gives that some thought, and gives it back.` and `ask hobb for the kettle` → `Hobb doesn't seem inclined to hand over the kettle.`; 27.2 `> consult grimoire about gnusto` and `> look up cheese in grimoire`; 27.3 `> talk to hobb` (first time), `> goodbye`, `> talk to hobb` (on return); 27.5 `> read hush page`. Asking a second time gave his piece again with no page, as the chapter says.
- OUTPUT DIFFERENCE — 27.1.2 and 27.5 (toll family, as in 19.1). While the bell is tolling, every turn ends with a toll line the book's blocks leave out: `… Hobb gives the hush page to Ansel.` was followed by `The bell tolls. You have stopped counting.`, and `> read hush page` … by `The bell tolls again, and the rooks go up off the roof.`
- NOT RUN — the 27.3.2 Nell load error is an illustration. I did not ask Tamsin her three questions, because the chapter's step names only Hobb.

---

## Chapter 28 — Conversations with a shape

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-28/relighting.story`. The check was gate-clean. I went to the Refectory, asked Tamsin about the page twice and answered her. Then I played again, refused, and found the way back.

- In the book's own order these all match word for word: 28.1 `> ask tamsin about the page`; 28.1.1 `> ask tamsin about the porter` (+ on-parting), `> ask tamsin about the stair` (on-resuming), `> ask tamsin about the page` (the price); 28.2 `> say maybe` → `Tamsin Vey waits for an answer to the question.` and `> yes` (+ the gift and the conclusion); 28.3 `> no` (+ conclusion) and `> ask tamsin about the page` → stock answer; 28.4 the second `ask tamsin about the price`, `> agreed` and the final `ask tamsin about the price` → `We have dealt, …`; 28.5.1 `> ask tamsin about brass` ×2; 28.6 `> wait` ×2 after a brass question → `Tamsin Vey sorts hinges …` on the second wait.
- 28.5.2: The `ask hobb about last night` sequence (stock answer, dimming, then the row) matches in its text. The manner beats in front of the two answers were `He turns the kettle …` and `He looks at the blue flame …`, where the book shows `He looks at the blue flame …` and `He takes his time …`. In a fresh game the beats cycle from the first one (accepted item 6).
- OUTPUT DIFFERENCE — 28.4 A way back. (b) `> ask tamsin about the price` → `"A price for what? You haven't said what you want."` (c) The story printed that line and then `Tamsin Vey turns over a heap of door furniture on the end of a table, and puts two hinges in her apron.` The refusal does not open a conversation, so her `rounds` goal takes its step on the same turn. The book's block has only the refusal.
- ISSUE (undocumented behaviour) — 28.1 A thread / 28.6 Speaking first. (b) 28.1 says the player's questions about the thread's subjects move it on: "each such question moves the thread on by one beat". 28.6 says that `on silence` is when "the player has let a turn or two go by" in an open conversation. (c) A silent turn in the middle of the thread moves the thread on instead:
  ```
  > ask tamsin about the page
  "I have a page that came out of a wall with a bracket," ...
  > wait
  You wait. The Hall has had thirty years of practice and is better at it than you are.
  "Here is my price. Lantern lit or Lantern dark, the brass in the closed wings stays mine to take. Your word on it. Yes or no?"
  > wait
  You wait. Somewhere a shutter knocks, twice, and thinks better of it.
  > wait
  You wait.
  ```
  Tamsin names her price unprompted, and the `tamsin-fills-silence` initiative never fires while the thread is live. In a first run where I waited between `ask … stair` and `ask … page`, the next `ask tamsin about the page` got the stock answer `Tamsin Vey gives that some thought, and gives it back.`, because the second beat had already been spent on the silence. The book does not say that silence advances a thread. I found this while playing the chapter's steps and did not look into it further.

---

## Chapter 29 — Inner lives

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-29/relighting.story`. The check was gate-clean. I asked Hobb about the Dimming and then about last night, played on until the spectacles were mended, gave them to him, and asked again. I also struck Tamsin's bargain and asked her about magic before and after.

- These all match word for word: 29.2 `> ask hobb about last night` while he is wary (`Hobb looks at you for a while, narrowly, …`); 29.1.2 `> ask hobb about the bell` while tolling (rattled beat, line, `Hobb gives the hush page to Ansel.`), apart from the trailing toll line (toll family, as in 19.1); 29.2.1 `> ask tamsin about magic` before (`My mother kept a stall …`) and after (`I'll tell you what I never told the old man …`) the bargain; `> give spectacles to hobb`.
- OUTPUT DIFFERENCE — 29.2.1 Changing a feeling. (b)
  ```
  > talk to hobb
  He turns the kettle a quarter round on its hook, to no purpose.
  "Still here," says Hobb, of one of you.
  > ask hobb about last night
  He looks at the blue flame on the sill before he answers.
  Hobb is quiet for some time. ...
  ```
  (c) On the path 29.4 prescribes ("play on until you have mended his spectacles, give them to him, and ask again"), the mend working needs the mend page, the mend page needs the cistern thawed by the lit lamp, and the lit lamp needs the kindle page, so the bell is tolling by then. In that state the story printed:
  ```
  > talk to hobb
  Hobb doesn't respond.
  The bell tolls. You have stopped counting.
  > ask hobb about last night
  He takes one hand off one ear to hear you, and puts it back.
  Hobb is quiet for some time. "Somebody had to put the Lantern out," ... He looks at his hands.
  The tower bell tolls.
  ```
  The greeting is replaced by `Hobb doesn't respond.` (the conversation opened by asking about the bell was already open), and the beat is the rattled one. The book's calm transcript can be reached only by giving him the spectacles unmended before reading the kindle page. In that run `talk to hobb` gave `"Still here," …` and `ask hobb about last night` gave the row with calm beats (`He looks at the blue flame …` / `He takes his time …`; beat order accepted item 6).
- NOTE — not a book defect: in one run I typed `read page` while holding the unbind page and got `Which do you mean: the unbind page or the kindle page?`. That was my wording. I reran with `read kindle page`.
- NOT RUN — the 29.3.1 Nell/Tom rumour (Yard, another story).

---

## Chapter 30 — Principles

STATUS: PASS

Copied `companion/chapter-30/relighting.story`. The check was gate-clean. I asked Hobb about the Dimming, then about the last night, then about his spectacles, as 30.6 says. Then I gave him the spectacles and asked again.

- These all match word for word: 30.2 `> ask hobb about last night` → `Hobb gives that some thought, and gives it back.`; 30.6 `> ask hobb about spectacles` (the line; the beat in front was `He looks at the blue flame …` where the book shows `He turns the kettle …`, cycling beats, accepted item 6); 30.3 `> give spectacles to hobb` and `> ask hobb about last night` → `He takes his time, …` plus the row.
- NOTE — 30.3 says "Then the spectacles are mended and given". The trust clause fires on Hobb wearing them, mended or not. I gave them unmended, before the bell, so the calm beats would match. (Mending them first brings in the bell, as in chapter 29.)
- NOT RUN — Cy (30.4) and the six-person table (30.5) are illustrations.

---

## Chapter 31 — More than one protagonist

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-31/relighting.story`. The check was gate-clean. I read the kindle page and played on until the role passed to Hobb. As Hobb I tried the door, took the kettle, and looked through the newspapers.

- These all match word for word: 31.2 `> light lamp with taper` (the match refusal, the hobb-wakes passage and `The tower bell tolls.`); 31.2 `> look` as Hobb (the Lodge with no doorway sentence, `You can see a kettle here.`, the chair line and `The bell tolls again, …`); 31.3.2 `> north` → `Not with that going on. …`; 31.3 `> take kettle` → `You take it.`; 31.4 `> examine newspapers` (description, hobb-finds-page, ansel-again and `The tower bell tolls.`, the toll arm differing by cycle) and `> look` back as Ansel in the Library with `You can see a wisp here.`
- OUTPUT DIFFERENCE — 31.2 Handing the role over. (b) `> inventory` → `Your hands are empty.` (c) The story printed `Your pockets are empty.` (then the toll line).
- OUTPUT DIFFERENCE — 31.3, 31.3.2 and 31.4 (toll family, as in 19.1). `> take kettle`, `> north` and the final `> look` each had a toll line after them in play, which the book's blocks leave out.
- AMBIGUITY — 31.6 Build and try it. (b) "Read the kindle page and play three more turns. When you are Hobb, …" (c) After `read page` and three more turns (`light lamp`, `wait`, `wait`), Ansel still had the role. The hand-over came at the end of the fourth turn (`light lamp with taper`, which is also the command the 31.2 block shows). A literal reader counting three turns is not yet Hobb.
- NOTE — the Lodge description as Hobb ends with a trailing space where the `{hobb-in-doorway}` marker fell silent (`… The door to the court is north. ` then the line break). 20.6 warns about a marker in mid-paragraph. This one is at the end, and the space is invisible in the terminal.

---

## Chapter 32 — Machines

STATUS: PASS

Copied `companion/chapter-32/relighting.story`. The check was gate-clean. I played the winning walk to the roof, including Tamsin's bargain and Hobb's scene. On the roof I turned the crank before the lens was seated, tried to kindle the Lantern, seated the lens, cranked again and kindled. The story was won.

- These all match word for word: 32.3 `> turn crank` (shut → half: the platform's line plus shutters-shift), `> turn crank` with the seat empty (the platform's line only), and `> push crank` → `The pawl ticks over one tooth.`; 32.4 `> turn crank` (half → drawn: pawl and shutters-open); 32.5 `> kindle lantern` with the shutters closed → `The shutters are closed round it. …` (once the lens was seated; with the seat empty the lens-empty refusal comes first, as 24.4 says it should).
- NOTE (not in the book, no block contradicted): when Ansel's score crossed a rank while Hobb held the role, the story printed `Ansel has risen to the rank of a Second-Year.`

---

## Chapter 33 — Vehicles

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-33/relighting.story`. The check was gate-clean. I took the lens from the crate, tried the stair with it, and gave it to the hoist before the grille was lifted (it rose to the Library) and after (it rose to the roof).

- These all match word for word: 33.1 `> up` with the lens and the grille lifted (`The lens is as wide as a cartwheel …`); 33.2.1 `> put lens in hoist` → `… The book hoist pulls away.`; `> look` in the Undercroft (`You can see a crate and a wisp here.`); `> look` in the Lantern Gallery (`You can see a book hoist and a wisp here.` / `In the book hoist you see a lens.`); `> put lens in lantern` (first taking it from the hoist, seat line, `The book hoist pulls away.`); 33.2.2 `> enter hoist` and `> look` (`You can see a book hoist, a crate, and a wisp here.` / `In the book hoist you see Ansel.`). Before the grille was lifted, the loaded hoist stood in the Library, as 33.2.1 says.
- NOTE — with the grille still standing, `up` with the lens gives the grille's `stair-sealed` phrase, not `lens-too-wide`. The first blocked line wins, which fits 33.1's two-line example. The book's block for `lens-too-wide` is consistent with trying the stair after the grille is lifted.
- OUTPUT DIFFERENCE (toll family, as in 19.1) — 33.2.2 Riding. In play the bell was still tolling when I rode the hoist, so `> enter hoist` and `> look` each had a toll line after them, which the book's blocks leave out. (By the second hoist trip the bell had been hushed, and the 33.2.1 blocks matched exactly.)
- NOT RUN — the tram (33.3), the balloon (33.3.1), the cart (33.4) and the barge (33.5) are from other stories.

---

## Chapter 34 — Open water and open ground

STATUS: PASS-WITH-ISSUES

Copied `companion/chapter-34/relighting.story`. The check was gate-clean. I won the game as far as the roof (the Lantern now gives a phrase, not the win), went down to the Undercroft, through the water gate, and across the Mere. Kindling the beacon won the game.

- These all match word for word: 34.5 `> enter skiff`, `> steer east` → `You steer the skiff east.`, `> make sail` → `You make sail.`, the beacon-near phrase (`The rock comes up out of the dusk ahead, …`), `The skiff arrives at the Beacon Isle.`; and 34.7 `> kindle beacon` (kindled line plus beacon-lit).
- OUTPUT DIFFERENCE — 34.4 Looking across water. (b) The first `> look` block shows `Mere` / `… with a short chop on it.` / `You can see a skiff here.` / `In the skiff you see Ansel.` / `The Water Stair, close by, to the west.` / `The Beacon Isle, on the horizon, to the east.` (c) Typed straight after `enter skiff` at the foot of the steps (where 34.3 says the player finds the skiff), `look` describes the Water Stair room: `Water Stair` / `Six steps going down …` / `You can see a skiff and a wisp here.` / `In the skiff you see Ansel.` The book's Mere block appeared word for word only once the skiff had left the landmark (after `make sail`). The book shows no step that moves the skiff before that look.
- OUTPUT DIFFERENCE — 34.5 Wind. (b) After `> make sail` the book shows one `> look` giving `The Beacon Isle, in the distance, to the east.` / `The Water Stair, on the horizon, to the west.` plus the beacon-near phrase, and then one `> wait` → `The skiff arrives at the Beacon Isle.` (c) The isle is 6 units off at a step a turn. In play, the `look` after `make sail` showed the Water Stair `close by` and the isle `on the horizon` (the 34.4 block). The beacon-near phrase came three waits later, and the arrival on the fourth wait. The book's two-turn crossing does not match the six-unit Mere it declares.
- OUTPUT DIFFERENCE — 34.7 The new ending. (b) The `> kindle beacon` block ends `You have risen to the rank of a Lamplighter.` and shows no end line. (c) The story printed `[The story has ended. RESTART, RESTORE or UNDO]` after the beacon-lit phrase, which is a correct win but missing from the book's block. My score was below 50 (I had not kindled the candles), so no rank line appeared. That part depends on the play, not the wording.
- NOT RUN — the raft (34.3), the bottle (34.6) and the Lake are illustrations.

---

## Chapter 35 — The opt-in systems

STATUS: BLOCKED

As the chapter says, there is no companion snapshot. I typed each example into a folder of its own (`~/repos/cellar/cellar.story` and `~/repos/yard/yard.story`) exactly as printed, with blank lines placed by the chapter 1 rules.

- BLOCKED — 35.5 Build and try it. (b) "The two examples above are complete stories once each has a room and a player, and you can build them as you built the first story in Part I." followed by `sharpee compose cellar.story --check` / `sharpee play .`. (c) The book never prints the room or the player for either story, and the Cellar room that the rat and the poker are placed `in` is never created. As printed:
  ```
  cellar.story:10:6 error [analysis.unknown-entity] No entity named `Cellar`.
  cellar.story:16:6 error [analysis.unknown-entity] No entity named `Cellar`.
  cellar.story:1:1 error [analysis.start-block-missing] This story never says who the player is. Add a `before the game starts` block assigning the role: `change the player to <character>`.
  compose: cellar.story failed the load-time gates (3 error(s))
  yard.story:1:1 error [analysis.start-block-missing] This story never says who the player is. ...
  compose: yard.story failed the load-time gates (1 error(s))
  ```
- DEVIATION 1 — cellar.story: I appended the smallest Part I-shaped lines the errors require, with no descriptions: `create the Cellar, a room`; `create Reader` / `a person` / `playable` / `starts in the Cellar`; and the start block `change the player to Reader`. The name `Reader` is mine: the book names no player for this story. Reason: the compiler names `Cellar` as missing, and a start block is required (chapter 3). After this the story was gate-clean, with one warning: `cellar.story:20:8 warning [analysis.room-no-description] …`.
- DEVIATION 2 — yard.story: the same additions with `the Yard` as the room (`create the Yard, a room`, plus `Reader`, playable, starting in the Yard, and the start block). Reason: the start-block-missing error, and the hunger example has no room to stand in. After this it was gate-clean, with a room-no-description warning.
- AMBIGUITY — 35.5. The commands block names only `cellar.story`. For the yard story I ran the same two commands with `yard.story`.
- Cellar results: `> attack rat` → `You land a solid blow on the rat, dealing 1 damage!`, `> take poker` → `Taken.`, `> attack rat with poker` → `You have slain the rat!`. All three match word for word (seed 42; the miss line did not come up).
- OUTPUT DIFFERENCE — 35.3 Hunger. (b) The book's transcript has `You could eat.` after the second `wait`, `You are hungry now, …` after the fourth, and says "Left alone, the meter reaches nine" before `You have starved to death.` (c) The story printed `You could eat.` after the first wait, `You are hungry now, and thinking about the loaf.` after the third, and `You have starved to death.` after the eighth, followed by `[The story has ended. RESTART, RESTORE or UNDO]` (not shown in the book). Every rung came one turn earlier than the book shows. The wording matches.
- Not testable as printed: the 35.3.1 announce modes. The chapter gives no step for them.

---

## Chapter 36 — Sound, music and pictures

STATUS: PASS

Copied `companion/chapter-36/relighting.story` over my story and its `assets` folder (`audio/catch.mp3`, `audio/lapping.mp3`, `audio/toll.mp3`, `img/lantern-lit.png`) beside it. The check was gate-clean. I lit the lamp and read its last line, waited in the Library for the bell, looked through the newspapers as Hobb, and kept waiting as Ansel until iron complained about iron.

- These all match word for word: 36.4 `> light lamp` (all four lines, including the creak and `The wick takes with a small dry sound, like a page turned.`); 36.3 `> light lamp with taper` (the match refusal, hobb-wakes, `The tower bell tolls.`, and the wisp-flinches line); 36.5 from the Library, `> wait` → `You wait.` / `The bell tolls again, …` / `Somewhere in the Hall, iron complains about iron.`; 36.5 from the Cloister, `> north` → Bell Stair with Tamsin, the toll line, `The wisp follows you.`, `Tamsin Vey pushes the iron grille.` and `Iron shrieks on iron, close by, and stops.`
- As the chapter says, nothing played in the terminal.
- NOT RUN — the gramophone, curtains and Parlour (36.8–36.9) are from another story.

---

## Chapter 37 — The page the player sees

STATUS: PASS-WITH-ISSUES

- TOOLING (environment, not the book): Playwright was not installed (`npx --no-install playwright` → `npx canceled due to missing packages`). I installed `playwright@1.49.1` and Chromium (with system deps) in the scratchpad, as the run instructions direct. `npx serve` was fetched by npx on first use.
- AMBIGUITY — 37.2 Building the page. (b) `sharpee build relighting.story` comes in 37.2, before 37.9 tells you to copy the chapter-37 story. The quoted output includes `✓ Wired 2 theme(s): paper, modern-dark`. (c) Run as the text orders it, on the chapter-36 story (which has no client fields), the build succeeded and printed `✓ Minted the story's ifid into relighting.config.json` and the other lines in the book's shape, but no `Wired 2 theme(s)` line and no `Copied relighting.css` line. That fits, since this story has no themes and no browser folder, but it shows that 37.2's block was made from a later state of the story. (Sizes `2.4mb`/`2.7mb` and timings belong to the run, accepted item 3.)
- 37.9: I copied `relighting.story`, `relighting.config.json` and the `browser` folder from `companion/chapter-37`. `sharpee compose relighting.story --check` was gate-clean. `sharpee build relighting.story` printed the 37.2 block's lines without the mint line, as 37.9 says, including `✓ Wired 2 theme(s): paper, modern-dark`, `✓ Copied relighting.css` and `✓ Copied assets/ (2 entries)`. `npx serve dist/web/relighting` printed `INFO  Accepting connections at http://localhost:3000`.
- Playwright on http://localhost:3000/: the page title was `The Relighting`, and `data-theme="paper"` was set. The page opens on the title bar, then the prologue and title. The Settings menu has a Theme submenu listing `Classic`, `Paper` (checked) and `Modern Dark`, as 37.2 says. I played to the Library and read the kindle page: a sidebar panel appeared, `#channel-panel-workings`, titled `workings` (styled small-caps by `relighting.css`), with the row `kindle: wakes a flame`, as 37.4 prints. I chose Modern Dark and reloaded: the theme was remembered under localStorage key `relighting-theme` = `modern-dark`, with saves beside it (`relighting-save-autosave`, `relighting-saves-index`), as 37.9 says. No console errors or page errors at any point.
- Media load check (no speakers in the container, accepted item 5): over a full winning walk in the page, `audio/catch.mp3` (206), `audio/toll.mp3` (206), `audio/lapping.mp3` (206) and `img/lantern-lit.png` (200) were all fetched. After `kindle lantern` the picture was in `#sharpee-media` (`<img src="img/lantern-lit.png">`, loaded, 960×600). The beacon's `hide image` removed it at the end. At the end the panel held all four workings in the order I read them (37.4 says "in the order Ansel read the pages").
- ISSUE — 37.2. (b) "Turn the sound on before you kindle the lamp." (c) The page has no sound control. The Settings menu holds only the Theme submenu, and the File and Help menus have none. The book does not say where or how to turn the sound on. (The recordings were fetched anyway.)

---

## Chapter 38 — Test trees

STATUS: PASS-WITH-ISSUES

My story was the chapter-37 story, identical to `companion/chapter-38/relighting.story` (diff empty). I made `relighting.tests/` beside it and wrote the files by hand with sorted keys, two-space indentation and one list element per line. Each file ends with a trailing newline. The book does not say whether one is wanted, and the runner accepted it.

- 38.4: with `manifest.json` and a four-skip-card `mainline.json` (as printed in 38.3), `sharpee test . --json --capture-output` exited 0 and gave one JSON record per line. The `take lamp` record matches the book's shape field for field: `"type":"command-result"`, `"file":"mainline"`, `"input":"take lamp"`, `"skipped":true`, `"cardId":"card0003"`, `"actualOutput":"You take it."`, `"turn":2`, and `assertionResults` `[{"description":"[SKIP]","passed":true,"message":"Skipped"}]`. Timings and seq belong to the run.
- NOTE — 38.3 says `"skip": true` means "nothing is checked". In the JSON, the opening card written with `"skip": true` was reported as `"skipped":false` (with a `[SKIP]` assertion result and no `turn` field). The other skip cards reported `"skipped":true`. Minor, and not something the book quotes.
- 38.6: with the asserted mainline (38.5's two cards plus 38.6's opening card with the `info.title` channel claim), `sharpee test .` printed `Test tree: relighting.tests/ (seed 42, 1 line(s))` / `✓ opening-lodge` / `3 cards passing, 4 assertions passing`, word for word, exit 0. The first line printed was `Loading story from: /home/node/repos/relighting`, which the book's block does not have (as in 4.4).
- 38.7: with `onward01.json` and `thecake1.json` added together, as 38.10 says: `Test tree: relighting.tests/ (seed 42, 2 line(s))` / `✓ opening-lodge` / `✓ lodge · eat cake`, word for word, followed by `6 cards passing, 9 assertions passing` and `6 commands (6 authored + 0 replayed), 1 restored at a fork`.
- AMBIGUITY — 38.10. (b) "in the story, change the phrase the seed cake's refusal prints, run the tree, and read the failure." (c) The book does not say what to change it to, so some wording had to be made up. I changed the last sentence of `cake-watched` (line 1557) from `You find you cannot.` to `You decide against it.` The tree failed with exit 1: `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` followed by the new text and `5 cards passing, 8 assertions passing, 1 card failing, 1 assertion failing`, the same shape as 38.6's example failure. I restored the line, and the tree passed again.
- 38.9/38.10: I replaced my `relighting.tests` with the one from `companion/chapter-38` and ran `sharpee test .`, exit 0. Word for word with 38.9: `Test tree: relighting.tests/ (seed 42, 7 line(s))`, the seven line names in the book's order, `183 cards passing, 275 assertions passing`, `182 commands (182 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134`, `Endings reached: 2 / 3`, `Not reached (1):` / `relighting.story:314 · night-falls (lose)`, and `Rooms entered: 13 / 13`. No ✗ anywhere in the report. Between the cards and the counts the report also has a `Derived rule tests (ADR-356): 134 branches` header and a `Not exercised (81):` list. The book describes these and does not quote them.

---

## Chapter 39 — Claims

STATUS: PASS-WITH-ISSUES

I worked in my own project (the chapter-37 story plus the chapter-38 tree), as 39.11 says. I stayed away from the two faults the book states (accepted item 4): I did not lock after a line's first `put`, and I did not name `put` in a needs verbs line.

- 39.1: `sharpee claim winning1` printed the quoted `claim: no line "winning1" — the tree's lines, …` and the seven lines word for word (exit 2). `sharpee claim thelodge --at 82` printed the header and the ten facts word for word, then exactly 23 more (the book says "another twenty-three lines") and `Lock one with: sharpee claim thelodge "<fact>" --at 82`.
- 39.2: `sharpee claim thelodge "the iron grille is lifted" --at 82 --name "the ward on the stair can be lifted"` matches word for word: the `Locking at turn 82 …` line, the three needs lines, the three `Written:` lines and `Pinned "the ward on the stair can be lifted" on card b7wicd1b.` The manifest gained `"claims": "relighting.claims.chord"`, card `b7wicd1b` (unbind grille) in `thebell1.json` gained `locks`, and `relighting.claims.chord` matches 39.3 word for word.
- AMBIGUITY — 39.11. (b) "lock the iron grille is lifted under a name of your own." (c) The book's own example name appears in every later quoted report, so I used it (`the ward on the stair can be lifted`) to keep the reports comparable. A reader who picks another name will see that name in every later report instead of the book's.
- 39.5: the `sharpee test .` claims section matches word for word (`claims: 1 of 1 held (seed 42)`, `0 walks`, the HELD line and the lock line).
- 39.7 (done because the chapter text says "Add the block before end claims"): I added `claim the story can be won` by hand, with one blank line above it, and `"locks": ["the story can be won"]` between `id` and `type` on card `bjhmo3xt` in `winning1.json`. The report matches 39.7's `claims: 2 of 2 held` block word for word.
- AMBIGUITY — 39.7. In the text I could extract, the canonical-form refusal `test: claims file 'relighting.claims.chord' is not in the lock's canonical form … relighting.claims.chord:17 · claim the story can be won — the next block follows without a blank line` runs straight into the `claims: 2 of 2 held` report, as if one run printed both. No step leads to the refusal. My file (`end claims` straight after the claim, no blank line) was accepted, and only the report printed.
- 39.11 / 39.8: with the second cake claim added (`the cake can be eaten`, the Lodge and the Gate Court), the report shows the witness `by walk at depth 3: take seed cake / north / eat seed cake` and `17 states, 20 commands, stopped: all-claims-settled`, word for word. With its needs rooms changed to the Lodge alone: `claims: 2 of 3 held, 1 unproven`, `1 rooms, 3 things, 2 verbs — 161 states, 239 commands, stopped: max-depth-reached` and `UNPROVEN  the cake can be eaten — … max-depth-reached after 161 states; its set carries 3 things, …`, which matches 39.8's figures for the Lodge-only claim.
- AMBIGUITY — 39.11. (b) "Change its needs rooms line to the Lodge alone, and see it come back unproven." (c) The chapter never says to change it back, but its closing block expects `claims: 3 of 3 held`. I restored `the Lodge, the Gate Court` before going on.
- 39.6 / 39.11 break: I took `change it to lifted` out of the ward trait (line 185). The story stayed gate-clean, and the run exited 1. The first failure is word for word `✗ opening-lodge — unbind grille: State assertion failed: the iron grille is lifted. the iron grille is "standing", expected "lifted"`, followed by the grille prose. `35 cards failing` in total ("Thirty-four more cards fail after it"). The lock line, word for word: `lock "the ward on the stair can be lifted" at line thelodge "opening-lodge" at turn 82 — NOT held there: the iron grille is standing`. With three claims in the file the summary was `claims: 1 of 3 held, 2 unproven`, with two max-seconds walks (state counts belong to the run). I put the line back.
- Final `sharpee test .` (exit 0): the claims section matches 39.11's closing block word for word. My `relighting.claims.chord` is byte-identical to the one in `companion/chapter-39` (the chapter's own folder, which 39.11 names; compared after the fact, with no disagreement to settle).

---

## Chapter 40 — Publishing

STATUS: PASS-WITH-ISSUES

- 40.1: `relighting.config.json` holds `"ifid": "C24E29F8-C36B-4F55-9FE9-B6D75AE7133D"` and `"version": 1`, the same value as in the book. The header carries `ifid: C24E29F8-…` under `id:`, as shown. `sharpee ifid generate` printed one new IFID (`D173C422-2DDA-44EE-A9CD-1E08AAE1CDCC`, a value of the run) and exited 0.
- 40.7: I set `story-version: 1.0.0` and added `publish-source: yes`. The check was gate-clean.
- AMBIGUITY — 40.3/40.7. (b) The book prints `publish-source: yes` as an indented header line but never says where in the header it goes. (c) I put it after `storage-prefix:`. It was accepted.
- 40.4: `sharpee test .` exited 0 with `claims: 3 of 3 held (seed 42)`, word for word (`183 cards passing, 277 assertions passing`; the book quotes no card count here).
- 40.4: `sharpee publish relighting.story` exited 0. Every line has the book's wording and shape, including `✓ Validated relighting.story (gate-clean) and shipped its source (`publish-source: yes`)`, `✓ Shipped 1 import fragment(s) → imports.json`, `✓ Wired 2 theme(s): paper, modern-dark`, `IFID:   C24E29F8-C36B-4F55-9FE9-B6D75AE7133D`, `Output: dist/relighting.zip (0.8 MB)` and `Unzip anywhere and open index.html, or upload the zip to itch.io.` Sizes and timings (2.4mb, 0.8 MB, 43ms) belong to the run. As 40.4 says, no source map line was printed and the published folder has no `game.js.map`.
- 40.5: `dist/relighting.zip` holds exactly the fourteen files listed, by the same names. There is no test tree, claims file, `index-testing.html` or source map in it.
- 40.7 with Playwright: I unzipped the zip into an empty scratch folder, served it with `npx serve . -l 3040`, and played the full walk from the lodge to the beacon at http://localhost:3040/. The opening reads `The Relighting` / `Story v1.0.0` / `Thirty years after …` / `By The Sharpee Project`, word for word with 40.2. All three recordings (`audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3`, 206) and the picture (`img/lantern-lit.png`, 200, shown in `#sharpee-media` at 960 px wide after `kindle lantern`) loaded. There were no console errors or page errors. The workings panel showed all four lines. After `kindle beacon` the game ended in victory: the command input became disabled, with `data-story-ended="victory"`.
- AMBIGUITY — 40.7. (b) "serve that folder". (c) No command is given for this. I used `npx serve` from chapter 37, on port 3040 (`-l 3040`), because another server had just held port 3000. Neither the page nor the play depends on the port.
- NOTE — the browser never prints `[The story has ended. RESTART, RESTORE or UNDO]`. The ending shows only as the disabled input. The book quotes no browser ending, so this is not counted as a difference.

---

## Appendices A–G

Read, not run (accepted item 7).

---

## Summary

### Chapters by status

| Status | Count | Chapters |
|---|---|---|
| PASS | 11 | 2, 3, 8, 10, 12, 16, 17, 20, 30, 32, 36 |
| PASS-WITH-ISSUES | 28 | 1, 4, 5, 6, 7, 9, 11, 13, 14, 15, 18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 33, 34, 37, 38, 39, 40 |
| BLOCKED | 1 | 35 |

40 numbered chapters in total. The front matter (Preface and How to read this book) is PASS and is not included in the counts.

### DEVIATION entries: 2

Both are in chapter 35: the room and player added to `cellar.story` and to `yard.story`, which the chapter says each needs but never prints.

### Where the book fails a literal reader (main themes)

1. **Blocked step (ch 35).** The two opt-in examples cannot compile as printed. The room and the player they need are described but never given.
2. **The bell and timer narration missing from quoted blocks (ch 19, 21–27, 31, 33).** After the kindle page is read, every turn ends with a waking-timer line or a toll line. Many quoted blocks on paths that require the page leave these lines out, so they cannot be reproduced as printed (19.1, 21.6, 22.7, 23.6, 24.1–24.7, 25.4, 26.2, 27.1.2/27.5, 31.x, 33.2.2).
3. **Word-level output differences.** `read coat` (9.9: "the travelling coat"); `inventory` as Hobb (31.2: "Your pockets are empty." vs "Your hands are empty."); implicit-take lines missing from 9.2 and 14.8; summary error lines missing from 4.6 and 11.7; `Loading story from:` missing from 4.4 and 38.6; rank lines that depend on order (24.7, 25.7, 34.7); hunger rungs one turn early (35.3); the end line missing from 34.7.
4. **Reachability and order contradictions.** 7.3 (crate capacity in the printed order), 29.2.1 (calm greeting unreachable on the prescribed path), 34.4/34.5 (the Mere look and a two-turn crossing that contradict the 6-unit expanse), 37.2 (build output quoted from a later story state).
5. **Missing instructions.** 6.8 "the rest are yours to fix" (lines never printed), 11.7 (break never restored), 37.2 "turn the sound on" (the page has no sound control), 38.10 (no replacement text given for the phrase to break), 39.11 (Lodge-only change never reverted), and where to put `publish-source:` (40) and the project folder (1).
6. **Undocumented behaviour.** A silent turn advances a conversation thread (28), and the initiative line never fires mid-thread. `sharpee test` in the Under the Hood box of 14.9 needs a test tree that does not exist yet. The count "six of its things" in chapter 13 is really five.
7. **Environment (not book defects).** npm 12 blocked esbuild's postinstall during `npm install -g @sharpee/devkit` (the builds worked anyway). Playwright was not present and was installed for chapters 37 and 40.
