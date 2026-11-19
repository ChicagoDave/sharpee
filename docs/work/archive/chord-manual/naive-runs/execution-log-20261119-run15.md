# Execution log — The Chord Manual, documentation acceptance test

```
$ sharpee --version
Sharpee 5.6.4 · Chord 4.0.3
```

Title page version line: `Chord 4.1.0, Sharpee 5.7.0` (PDF `the-chord-manual-4.1.0.pdf`, 593 pages). Not a stale artifact.
The installed pair is the interim release the brief expects (accepted item 8).

## Setup

All four checks passed; nothing was repaired or installed beforehand.

1. `npm config get prefix` → `/home/node/.local` (under the home directory `/home/node`).
2. Playwright in `~/tools/playwright`: a three-line script launched Chromium (`159.0.8154.6`) and closed it.
3. `~/repos/book-test` holds `the-chord-manual-4.1.0.pdf` and `companion/`.
4. `pdftotext -v` → `pdftotext version 22.12.0`; `pdftoppm -v` → `pdftoppm version 22.12.0`.

Run notes (apply to the whole log):

- Project folder: `~/repos/relighting` (the book says the folder "can be anywhere you keep your own work").
- **Substitution, logged once:** I cannot hold an interactive session, so every `sharpee play .` in this run was fed its commands on standard input, one to a line, ending with `/quit`.
- Node on this box is v22.23.2 (book asks for 18 or later).

---

## Preface and "How to read this book"

STATUS: PASS — read only; nothing to run. No issues.

## Chapter 1 — The shape of a story file

STATUS: PASS

- Typed the listing by hand into `relighting/relighting.story`, joining every `↪` row to the row above with one space, as section 0.7 says. Result is 32 lines, which agrees with every line number chapter 4 later quotes (24:3, 31:3, 25:13, 16:8).
- Not instructed, checked as quoted output: removing `end before` gives exactly the book's `relighting.story:30:1 error [parse.unterminated-block] Missing `end before` for the block opened at line 30.` The `lex.tab-indent` example (5:1) was not run: the book does not say which line to put the tab on.

## Chapter 2 — The story header

STATUS: PASS

- The chapter says "Nothing in this chapter is built." Its `about` block was reproduced in chapter 4's play session and matches word for word. The opening with the prologue matches. The smallest-header examples and the header error messages (2.1, 2.6) belong to files the book does not have the reader make, and were not run.

## Chapter 3 — The player and the start

STATUS: PASS

- `examine me` and the opening match word for word (run in chapter 4, once the command existed).
- Ambiguity resolved: section 3.4 prints the output of a reordered opening block but says "you need not add one". To reproduce that block of output I appended the reordered `when the game starts` block temporarily, played, and removed it. Output matched the book exactly (banner, prologue, room). The default-order block also "changes nothing", as stated.
- Not instructed, checked as quoted output with temporary edits, all exact matches: start block removed (`relighting.story:4:1 error [analysis.start-block-missing] …`); `starts in the Lodge` removed (gate-clean, then `Error loading story: Story player "Ansel" (ansel) is not placed in the world — an unplaced player character is nowhere to play.`).

## Chapter 4 — Build, play, read an error

STATUS: PASS

- 4.1 `npm install -g @sharpee/devkit` ended with the blocked-install-script warning the book predicts (`esbuild`). `sharpee --version` → `Sharpee 5.6.4 · Chord 4.0.3` (accepted item 8).
- 4.3 `compose: Chord 4.0.3 — relighting.story is gate-clean (--check: IR not emitted)` — matches apart from the version.
- 4.4 Opening and the five commands (`examine me`, `examine lamp`, `north`, `wait`, `xyzzy`) match word for word. Only difference from the printed session is spacing in `--- Play Mode ---  (/quit or /q to exit)` (two spaces here, four on the page), which I take to be typesetting.
- 4.5 `playble`: both diagnostics identical, same order, same positions (31:3 and 24:3).
- 4.6 `Loge`: identical (25:13).
- 4.7 Lodge description deleted: identical warning (16:8), still gate-clean; restored, single gate-clean line.
- 4.8 Both folder errors identical.
- Under the Hood: `sharpee compose relighting.story -o relighting.ir.json` → `loaded — 2 entities, 0 trait(s), 0 action(s)` / `IR written to relighting.ir.json`. Identical apart from version. `relighting.ir.json` is left in the project folder, since the book never says to remove it.

## Chapter 5 — Rooms and exits

STATUS: PASS

- Copied `companion/chapter-05/relighting.story` over my own. Gate-clean. `story-version: 0.2.0` as stated.
- All story output reproduced word for word: first visit and `look` in the Gate Court, `The Porter's Lodge` heading, the walk `north`, `north`, `north`, `up`, and `east` on the roof → `You can't go that way.`
- Not instructed, checked as quoted output: misspelling `Cloister` on the Gate Court's exit line gives the book's exact `relighting.story:30:39 error [analysis.unknown-entity] No entity named `Cloyster` — did you mean `cloister`?.`
- Not run (the book presents them as another story, the Den and the Attic): the `duplicate-exit` message, the one-way `> down` / `There are no obvious exits.`, and the `missing-kind-noun` message (line 54 of a file the reader does not have).

## Chapter 6 — Things

STATUS: PASS

- Copied `chapter-06` story. Gate-clean. Reproduced exactly: `You can see a kettle, a hand lamp, and Hobb here.`, `examine lamp`, `take lamp`, `take chair`, `take hobb`, `inventory`, `examine spectacles` / `search` / `take glasses`, `drop lamp` + `look` in the Gate Court. `examine arch` and `examine motto` both find the gate.
- "Examine everything a description mentions": unkept promises found, as the chapter predicts (`flagstones`, `grass`, `garth`, `nettles`, `tables`, `benches`, `desks`, `shelves`, `pillars`, `rope`, `stair`, `glass`, `drum` → `You can't see any such thing.`). Nothing to fix, per the text.
- Not run (other story): the curtain / `hide behind curtain`; the `backdrop-not-scenery` message.

## Chapter 7 — Containers and supporters

STATUS: PASS

- Copied `chapter-07` story. Gate-clean. Every block of Relighting output reproduced exactly (Library with grimoire on the desk, `take book`, `put book on desk`, the crate sequence, `There's no room in the crate.`, `put lens in lantern`, `open press` → `…which is empty.`, `enter chair` / `north` / `exit`, `put kettle on chair`, `look`).
- Not run (other story): the bell jar and moth, the `unlisted` table.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

- Copied `chapter-08` story. Gate-clean. The whole chain reproduced exactly, including `unlock door with taper` → `The wax taper doesn't fit the library door.` and the close/lock/`east` sequence from inside the Library.
- Not run, as the book says The Relighting leaves them out: `opens when unlocked` (8.4), the key ring disambiguation (8.6), and the two compiler messages at lines 86 and 87 (the book does not say what edit produces them at those positions).

## Chapter 9 — What things can do: the trait words

STATUS: PASS

- Copied `chapter-09` story. Gate-clean. Reproduced exactly: `inventory` (`You are carrying and wearing:`), `take off coat`, `wear coat`, `examine book`, `read book`, both `eat cake` replies, `pull rope`, `take rope`, `take cup`, `drop cup`, `read coat`, `eat coat`. `read margin` works, as 9.2 says it must.
- Not run (all "from another story" with a Den): hat and cap, trolley, tassel, wireless.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

- Copied `chapter-10` story. Gate-clean. Reproduced exactly: the grue line on `down`, `look` in the dark, `examine crate`, `up`; `light lamp`; the lit Undercroft; `extinguish lamp` / `look` / `light lamp` (with `…and the darkness draws back.` and the room); `light taper`; the "Build and try it" `drop lamp` / `up` / `down` block.
- Not run (other story): `night-vision` on Ansel in a Cellar; the tin, cheese, clock and sock (`smell`, `listen`, `listen to tin`); the `starts lit` error at 259:12.

## Chapter 11 — Regions

STATUS: PASS

- Copied `chapter-11` story. Gate-clean. Reproduced exactly: `examine tower` from the Lodge and the Gate Court, `You can't see any such thing.` from the Cloister; Stack 1, 2, 3 and `You can't go that way.`; the shelves answer in the Library and all three stacks and not in the Refectory.
- "Try placing the kettle in the Grounds": the diagnostic is the book's, position included (`relighting.story:142:3 error [analysis.thing-in-region] …`), then `failed the load-time gates (1 error(s))`. Put back; gate-clean.
- Not run: the `room-two-regions` message (no step asks for it).

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS

- Copied `chapter-12` story. Gate-clean; still `story-version: 0.2.0` as stated.
- Reproduced exactly: `up` at the grille; `examine hearth`; `squeeze behind hearth` without the lamp (grue line); the same words in the Undercroft → `I don't understand that.`; with the lit lamp, the Undercroft and `You can see a crate here.` `crawl behind the hearth` also works.
- 12.2's experiment (take out the `up is blocked` line, walk up, step off, put it back): output matches, including `[The story has ended. RESTART, RESTORE or UNDO]`. Line restored, gate-clean.

## Chapter 13 — States

STATUS: PASS

- Copied `chapter-13` story. Gate-clean; `story-version: 0.3.0`.
- `read page` matches word for word. `up` at the Bell Stair is still refused, "nothing has changed", as the chapter says.
- 13.4's experiment (`change the iron grille to lifted` added to the start block): `up` gives the Lantern Gallery text exactly as printed. Line taken out again, gate-clean.
- Under the Hood: `sharpee compose relighting.story -o relighting.json` ran (`loaded — 43 entities, 0 trait(s), 0 action(s)`); the grille's entry has `"states": ["standing", "lifted"]` and `"statesReversible": false` beside it, as described. `relighting.json` is left in the project folder (the book does not say to remove it).
- Not run (other story / `probe.story`): the sluice, the dial, and the four `probe.story` diagnostics.

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS

- Copied `chapter-14` story. Gate-clean. Reproduced exactly: `take kettle`, `search` / `take spectacles`, `give spectacles to hobb`, the Library's once-only wet-ink paragraph (absent on the second entry), `read page`, `pull rope` with its added sentence, `push grille` / `pull grille` (and `take grille`), `eat cake` with `It tastes of caraway, and of being nineteen.`
- Under the Hood: ran `sharpee test .` inside `companion/chapter-14` as told. The list under `Derived rule tests (ADR-356): 11 branches` includes `✓ kettle · on taking`, as the box says.
- Not run (other story / `probe.story`): the dial's `setting to high`, the two `probe.story` diagnostics.

## Chapter 15 — What a clause can say and do

STATUS: PASS

- Copied `chapter-15` story. Gate-clean. Reproduced exactly: `light lamp` refused before the page is read; `eat cake` refused in the Lodge and allowed in the Gate Court; both readings of the spark page; `light lamp` / `down`; `light candles` and the `look` that lists `an unbind page`.
- Under the Hood: `sharpee test .` inside `companion/chapter-15` lists `✓ hand lamp · on lighting · refused no-such-word` and `✓ seed cake · on eating · refused cake-watched` under "Derived rule tests", as quoted.
- Not run (`probe.story`, illustrative): the three diagnostics and the `cat-goes` in-place phrase.

## Chapter 16 — Conditions

STATUS: PASS

- Copied `chapter-16` story. Gate-clean. Reproduced exactly: `read hush page` refused while faded; after the spark page, `(first taking the hush page)` / `Taken.` / the third working; `examine grimoire` before (`…still as blank as these.`) and after (`…the ink is on them now.`).
- Under the Hood: `sharpee compose relighting.story -o relighting.ir.json` (`loaded — 45 entities, 0 trait(s), 0 action(s)`); `lantern-ready` is under `conditions` as an `and` with two operands, each with a subject and an object, and `faded-page` has `"open": true`. As described.

## Chapter 17 — Choosing between outcomes

STATUS: PASS

- Copied `chapter-17` story. Gate-clean. Reproduced exactly: `examine cistern` (frozen), four `pull rope` in cycling order, four `examine grille` (three counted sentences, then the description alone). Reading clauses still behave as before.
- Under the Hood: `sharpee test .` in `companion/chapter-17` lists `spark page · on reading · when legible`, `… · when learned`, `iron grille · after examining · the third time`, and the cistern's three arms each begin with `◌` (`SKIPPED subject-unreachable: cistern is not in the player's sight after arranging`). As described.
- Not run: the `refusal-misplaced` message at 390:9 (no step asks for the edit).

## Chapter 18 — Counting, scoring and ending

STATUS: PASS

- Copied `chapter-18` story. Gate-clean. Reproduced exactly: the fourth `pull rope` (`Your palms have begun to object.`), `score` → `5 out of 25 … a Latecomer`, `light candles` with `You have risen to the rank of a Second-Year.`, `score` → `10 out of 25 … a Second-Year`.
- 18.6: made `~/repos/relighting-endings` beside the project with a copy of the story and the four start-block lines. Gate-clean. `put lens in lantern` / `light lantern` give the defeat exactly as printed. With `change the lens to sound` added as the last line of the start block, the victory text, the rank line and the ending line match exactly. The main project's story was not touched.
- Ambiguity resolved: the book says to "keep the copy" in `relighting-endings`; I left that folder in place with the winning start block and did not use it again.
- Not run (other story): the vial / `kill the player`; the `rank-above-max` message.

## Chapter 19 — Time

STATUS: PASS

- Copied `chapter-19` story. Gate-clean.
- Reproduced exactly: `light lamp` + creak, `east` + draught, `down` with the bell striking once and the ice beginning to sweat, `examine cistern` with the thaw, `The tower bell tolls.` and the rank line; `score` → `15 out of 35 … a Second-Year` with no bell line after it; `examine blue flame` before (`It is early yet…`) and after (`It is taller than it was…`).
- The sequence fires on the turns stated: `The light has turned…` on the 50th turn-taking command and the dusk ending on the 80th (`score` not counted).
- Only differences from printed blocks are which bell line ended a turn (accepted item 6): e.g. the book's second `examine blue flame` ends `The bell tolls. You have stopped counting.` and mine ended `The tower bell tolls.`
- Under the Hood: the compiled IR's sequence `the day` has `"narration": "broadcast"`; the timer lists `creak`, `sway`, `strike` in order. As described.

## Chapter 20 — Phrases

STATUS: PASS

- Copied `chapter-20` story. Gate-clean; `story-version: 0.4.0`.
- Reproduced exactly: three `light lamp` refusals in cycling order; Hobb's three sayings on three entries to the Lodge, in the printed order; `examine gate` with the three-line motto (relative indentation 4 / 1 / 0, as on the page); `examine bell` with `By your count that makes N, and it is not tired.`; the Bell Stair description ending `An iron grille stands across its third step.`; the Lodge with `Hobb has his hands over his ears…` once the bell tolls.
- Note, not a defect: the book's Lodge blocks list `a kettle and Hobb` because the lamp had been taken in the book's session; in mine the lamp was still there (`a kettle, a hand lamp, and Hobb`).

## Chapter 21 — A thing's own words

STATUS: PASS

- Copied `chapter-21` story. Gate-clean. Reproduced exactly: `examine lamp` unlit and lit (the detail sentence joins the paragraph); `examine candles` before and after `light candles`; the Lodge with `Hobb is in the doorway…` joined to the description and Hobb still in the list; `examine lens` with the crack sentence. Trailing timer/bell lines differ only in which variant came up (accepted item 6).
- Under the Hood: the IR phrase table has `hobb.present`, `hand-lamp.detail`, `candles.detail` and `candles.detail.2`.
- Not run: `the candles are lit` (405:35) — the chapter describes the error but gives no step to make it; the cat (other story).

## Chapter 22 — Changing the standard messages

STATUS: PASS

- `sharpee messages`: first line `Message catalog: 885 overridable messages (en-US)`, then the list as one line — count and shape as the book says. The four entries the chapter quotes (`taking-taken`, `going-too-dark`, `lighting-lit`, `taking-taken-from`) are in the list character for character.
- Copied `chapter-22` story. Gate-clean. Reproduced exactly: the new `down` text in the dark; `look` → `It is dark, and the dark here is old and has no interest in you.`; three `wait` variants in order; `take lamp` → `You take it.`; `push grille` before and after the spark page; Hobb's `"Still mine,"` once the Hall is waking.
- Under the Hood: the IR has `messageOverrides` keyed by alias and `phrasebooks` with a condition and entries each.
- Not run: `import "books"` (9.9 describes it; The Relighting does not use it here), the `probe.story` alias error, the `taking-taken-from` override (not in this chapter's list of changes).

## Chapter 23 — New verbs

STATUS: PASS

- Copied `chapter-23` story. Gate-clean. Reproduced exactly: bare `spark`; `hush bell` in the Library (`You can't see any bell here.`); `mend lamp` before its page (a `no-such-word` variant); `spark lamp` and `spark grimoire` after the page (`There is nothing in that for a flame to stand on.` + timer lines); `gnusto`, `say gnusto`, `gnusto kettle`; `remember dimming`, `remember the dimming`, `recall hobb`, `remember breakfast`. `light lamp` still lights the lamp, as 23.13 says.
- `shout` → `I don't understand that.` both before and during the tolling, consistent with "The Relighting does not use this action."
- Under the Hood: the `sparking` entry in the IR has exactly the fields named: `name, patterns, constraints, musts, refusals, otherwise, scores, body, span`; `otherwise` is `nothing-to-spark`, `scores` is empty.
- Not run (examples, `probe.story`): `scrawling`, `shouting`, `nothing-to-tune`, the two diagnostics.

## Chapter 24 — New kinds of thing

STATUS: PASS

- Copied `chapter-24` story. Gate-clean. Played the game to its end as the chapter directs. Reproduced exactly: `spark lamp` twice, `light lamp` (matches refusal), `spark candles` with the rank line, `unbind grille` while tolling, `hush bell`, `unbind grille` with `You have risen to the rank of a Journeyman.`, `mend spectacles`, `mend lens`, `examine lens`, `spark lantern` with no lens, and the winning `spark lantern` with `…the rank of a Lamplighter.` and the ending line.
- "Then play it again and leave the lens cracked": the defeat text and ending line appear.
- Under the Hood: `wick`'s sparking clause in the IR reads `"routing": "capability"`.
- Observation, not a discrepancy with any printed block: with the grille gone, `look` in the Bell Stair prints `…The cloister is south. ` with one trailing space where `{grille-across}` stood. The book warns only about a marker "in the middle" leaving its spaces behind and recommends the end of the paragraph, where a space is still left (invisible on screen).
- Not run (other story): the `burner` trait with data fields, `cold-wick`.

## Chapter 25 — Bending the standard grammar

STATUS: PASS

- In the chapter-24 story, `sit on chair` → `I don't understand that.`, as 25.2 quotes.
- Copied `relighting.story` and `synonyms.chord` from `chapter-25` into the project. Gate-clean. Reproduced exactly: `sit on chair` / `exit`; `light lamp` before the page (refused as a working) and after (sparks the lamp); `light lamp with taper` (matches refusal); `quiet bell`; `fix spectacles` — which is the reply that carries `You have risen to the rank of a Journeyman.`, as the chapter predicts for this order. The whole winning walk works with the plain words.
- Under the Hood: `grammarRemovals` has one entry (lighting); `grammarExtensions` has four (sparking, mending, hushing, entering).
- Not run: the `ignite` removal error at 192:1 (no step asks for it). Line 192 is where the story's `remove from action lighting` stands, which agrees with the quoted position.

## Chapter 26 — People who act

STATUS: PASS

- Copied `chapter-26` story. Gate-clean; `story-version: 0.5.0`.
- Reproduced exactly: `take key` / `open press` with `Hobb closes the oak press.`; `light lamp` with the wisp arriving; `east` with `The wisp follows you.`; the Refectory with Tamsin, `examine tamsin` (her own-business sentence and the door-furniture line), `wait` → `Tamsin Vey leaves to the west.`; in the Cloister `Tamsin Vey enters from the east.`; after two more waits, `north` shows the Bell Stair exactly as printed (Tamsin, bell, wisp, the thumb line), then `Tamsin Vey pushes the iron grille.` and the pry-bar line on the next two turns; `talk to hobb` → `Hobb doesn't respond.`
- Differences are only the cycling `wait` text and the bell line (accepted item 6).
- Under the Hood: Tamsin's `traits` list has `passive` with `announces-movement` in its `config`; goals are under `character.goals` with `priority`, `activeWhen`, `steps`; the push step is stored as `"action": "pushing", "shape": "push :target"`.
- Not run (other stories): Sam and the `ey` set, the cat and the watchman, Nell's `fetch` goal, the `probe.story` error.

## Chapter 27 — Asking and telling

STATUS: PASS

- Copied `chapter-27` story. Gate-clean; the sequence now reads `at turn 70` / `40 turns later`, as stated.
- Reproduced: Hobb's answers on the dimming, Tamsin, the kettle, the lantern, gnusto (`ask` and `tell` reach the same row), `ask hobb about lanterns` and `about the weather` → `Hobb gives that some thought, and gives it back.`; `ask hobb about the bell` refused before it rings, then the answer, `Hobb gives the hush page to Ansel.`, and on a second asking the answer with nothing given; `read hush page`; `talk to hobb` / `goodbye` / `talk to hobb`; `consult grimoire about gnusto`, `look up cheese in grimoire`; `ask hobb for the kettle` → `Hobb doesn't seem inclined to hand over the kettle.`; `talk to tamsin` → `Tamsin Vey doesn't respond.`
- The sentence in front of each of Hobb's answers was a different one of his three from the page's in several places; the chapter says this will happen (and accepted item 6).
- Not run: the pre-override stock line `Hobb says, "I don't know anything about that."` (it can only be seen in a story without this chapter's override); the two `probe.story` errors; the `Nell` load error.

## Chapter 28 — Conversations with a shape

STATUS: PASS

- Copied `chapter-28` story. Gate-clean. Played five short games to cover the branches. Reproduced exactly: the thread's first beat; leaving it (`ask tamsin about the porter` + parting line); resuming (`about the stair`); the price; `say maybe` → `Tamsin Vey waits for an answer to the question.`; `yes` with the page handed over and the conclusion; a silent `wait` taking the next beat; `no` with the conclusion; the concluded thread giving the stock answer; `ask tamsin about the price` before the thread (refusal, and Tamsin's goal step on the same turn, then `leaves to the west`), after it (price again, `agreed`), and after the bargain (`We have dealt…`); `brass` asked once, again and a third time; the silence line after two waits; Hobb on `last night` before and after `the dimming`.
- `ask tamsin about brackets` is answered by the brass row, as `deflect to` promises.

## Chapter 29 — Inner lives

STATUS: PASS

- Copied `chapter-29` story. Gate-clean.
- Reproduced exactly: `ask hobb about last night` refused while he is wary (`…small print…`); `give spectacles to hobb`; `talk to hobb`; `ask hobb about last night` answered; Tamsin on `magic` before the bargain and after it (the warmer answer); with the bell tolling, Hobb answers every row with the one-hand-over-an-ear beat and hands over the hush page.
- The chapter's claim about mood settling holds: for the first turns after `hush bell` Hobb's answers came with no manner sentence, and a few turns later the calm beats were back.
- Under the Hood: Hobb's `character` key holds `mood`, a `feels` list and a `knows` list whose entry carries `source` and `confidence`.
- Run note (my own command, not the book's): in one session I struck the bargain before reading the spark page, and `read page` then asked `Which do you mean: the unbind page or the spark page?`. Chapter 28 says the bargain "can be struck before the bell has rung", and the book's own `read page` is always typed before the player holds a second page, so nothing printed is contradicted; I re-ran in the book's order.
- Not run (other story): Nell and Tom, `spreads`.

## Chapter 30 — Principles

STATUS: PASS

- Copied `chapter-30` story. Gate-clean. Reproduced exactly: `ask hobb about last night` after the dimming → `Hobb gives that some thought, and gives it back.` (the confidence kept); `ask hobb about spectacles`; after `give spectacles to hobb`, `ask hobb about last night` is answered. `ask hobb about night` reaches the same row.
- Under the Hood: `character.principles` and `character.temperaments` are present, and the `knows` entry has `"confided": true`.
- Not run (other story): Cy, and the six-person table in 30.5.

## Chapter 31 — More than one protagonist

STATUS: PASS

- Copied `chapter-31` story. Gate-clean. Read the spark page, then `light lamp`, `wait`, `wait`, and `light lamp with taper` as the fourth turn (the chapter's caution). Reproduced exactly: the matches refusal followed by `In the lodge, an old man…`, `You are Hobb…` and the bell; `look` as Hobb (the Lodge without its porter, `You can see a kettle here.`); `north` → `Not with that going on…`; `take kettle` → `You take it.`; `examine newspapers` with the find, `You are Ansel…`; `look` in the Library with the wisp and the grimoire. Afterwards `ask hobb about the bell` hands over the hush page.
- `inventory` as Hobb gave `You aren't carrying anything at all.` where the page has `Your hands are empty.` — one of the three sentences the chapter says may appear (accepted item 6).
- Not run: the muddled reply the chapter warns of when the fourth turn is a move (the book says to avoid it, not to try it); the `probe.story` error.

## Chapter 32 — Machines

STATUS: PASS

- Copied `chapter-32` story. Gate-clean; `story-version: 0.6.0`. Walked to the roof keeping chapter 31's caution.
- Reproduced exactly: `turn crank` (leaves part), `turn crank` with the seat empty (`You turn the shutter crank.` only), `push crank` (`The pawl ticks over one tooth.`), `spark lantern` with the lens seated and the shutters shut (`The shutters are closed round it…`), `turn crank` to drawn (pawl + shutters fold back). `examine shutter` shows each detail sentence. Sparking then wins.

## Chapter 33 — Vehicles

STATUS: PASS

- Copied `chapter-33` story. Gate-clean; the sequence reads `at turn 100` / `60 turns later`, as stated.
- Reproduced exactly: with the lens in hand, `up` at the Bell Stair gives the grille's phrase while the grille stands and `The lens is as wide as a cartwheel…` once it is lifted; `put lens in hoist` → `The book hoist pulls away.`; before the grille is lifted the hoist and lens are found in the Library, after it in the Lantern Gallery (`You can see a book hoist and a wisp here.` / `In the book hoist you see a lens.`); `put lens in lantern` with the implicit take and the hoist pulling away; `enter hoist` / `look` with `In the book hoist you see Ansel.`
- Under the Hood: the hoist's entity has a `vehicle` record with movement, drive and stops.
- Not run (other stories): tram, balloon, cart, barge.

## Chapter 34 — Open water and open ground

STATUS: PASS

- Copied `chapter-34` story. Gate-clean. Won "as far as the roof" (the Lantern now prints its text and the game goes on), went down through the water gate and across.
- Reproduced exactly: `enter skiff`, `steer east`, `wait`, `make sail`, the first `look` (Water Stair close by, Beacon Isle on the horizon), two waits, the second `look` (isle in the distance, stair on the horizon, the rock sentence), `wait` → `The skiff arrives at the Beacon Isle.`, and `spark beacon` with the ending and `You have risen to the rank of a Lamplighter.` (score 45 → 50 with every award collected). Before the Hall is awake, `north` from the Undercroft is refused by the water gate.
- Under the Hood: the IR's `uses` list holds `expanses` and `sailing` beside the others.
- Not run (other story): the raft, the bottle adrift, `lake-edge`.

## Chapter 35 — The opt-in systems

STATUS: PASS

- No companion folder, as the chapter says. Made `~/repos/cellar` and `~/repos/yard` beside the project and typed each example by hand.
- `cellar.story`: gate-clean. `attack rat` → `You land a solid blow on the rat, dealing 1 damage!`, `take poker` → `Taken.`, `attack rat with poker` → `You have slain the rat!` — as it happens blow for blow as printed (the chapter says the rolls may differ; accepted item 6).
- `yard.story`: gate-clean. `You could eat.` after the second `wait`, `You are hungry now…` after the fourth, `You have starved to death.` and the ending line on the ninth. Exactly as printed.
- Ambiguity resolved: the page shows `Nobody` indented four spaces under `authors:` in the cellar listing and two in the yard listing. I typed two in both (the book's stated indent; `pdftotext` widens indentation). Both compiled.
- Not run: `use hunger, announce silent` and `use npc` (described, no step).

## Chapter 36 — Sound, music and pictures

STATUS: PASS

- Copied `relighting.story` and the `assets` folder from `chapter-36` (three recordings in `assets/audio`, one picture in `assets/img`). Gate-clean.
- Reproduced exactly: `light lamp` ending `The wick takes with a small dry sound, like a page turned.`; the hand-over to Hobb followed by `Somewhere in the Hall a small blue light goes flat and dim…`; waiting in the Library as Ansel until `Somewhere in the Hall, iron complains about iron.`; waiting in the Cloister, where `Iron shrieks on iron, close by, and stops.` prints by itself after a `wait`; and walking `north` on the turn Tamsin pushes, which gives the Bell Stair block as printed.
- Nothing plays in the terminal, as stated (accepted item 5).
- Editorial, no effect on any step: in 36.5 the sentence "Walking from the Cloister into the Bell Stair on the turn she pushes." has no main verb; it reads as a caption for the transcript that follows two sentences later.
- Not run (other story): the gramophone, curtains, music, named beds and layers, `client has`.

## Chapter 37 — The page the player sees

STATUS: PASS-WITH-ISSUES

- Copied `relighting.story`, `relighting.config.json` and the `browser` folder from `chapter-37`. Gate-clean; `story-version: 0.7.0`; the header and the config file both carry the ifid, as stated.
- `sharpee build relighting.story`: output has the printed shape line for line, without the "Minted" line (as the chapter says for the copied story): `✓ Validated relighting.story (gate-clean) — source not shipped (`publish-source:` absent)`, `✓ Story IR → dist/relighting.ir.json`, …, `✓ Wired 2 theme(s): paper, modern-dark`, `✓ Copied relighting.css`, `✓ Copied assets/ (2 entries)`, `✅ Build complete!`, `Output: dist/web/relighting/`. Sizes and timing differ (accepted item 3: `game.js 2.4mb`, `Done in 59ms`).
- `npx serve dist/web/relighting` fetched `serve@14.2.8` and printed `Accepting connections at http://localhost:3000`.
- With Playwright (Chromium, run from `~/tools/playwright`): the page opens on the title and prologue in the `paper` theme; Settings → Theme lists `Classic`, `Paper`, `Modern Dark`. Played to the Library and read the spark page: the side column opens with `workings` / `spark: wakes a flame`, and the stylesheet's small-caps rule is applied to the panel title. Chose Modern Dark and reloaded: theme still `modern-dark`; `localStorage` has `relighting-theme=modern-dark` beside `relighting-save-autosave` and `relighting-saves-index`; the page shows `[Session restored]`; the status line names `LIBRARY`; the workings panel is there with its one line. All as described.
- Recordings: `light lamp` on the page fetched `audio/catch.mp3` (HTTP 206). No page errors, no failed requests (accepted item 5: not heard).
- **Issue (broken forward reference).** Location: chapter 19, section 19.5 "Chapters", pointing at chapter 37. The book says: "In the terminal a new chapter prints nothing. The title and description are sent to the page the player sees, and chapter 37 shows what a browser does with them." What happened: chapter 37 never mentions chapter titles (its only use of the word is "the name of a chapter is a replace channel"). The page itself does show them — on reading the spark page it printed, above the reply:
  ```
  Afternoon

  The Hall has noticed you.
  ```
  and `Morning` above the first room at the opening — but a literal reader is not told to expect these lines anywhere.
- Not run (described, no step): `client: terminal` and `parchment` build errors, the `tide`/`bell`/`card` channels, a page of one's own.

## Chapter 38 — Test trees

STATUS: PASS

- Made `relighting.tests` with the manifest and `mainline.json` (three skip cards), typed with two-space indentation and alphabetical keys as 38.3 requires; the files were accepted as canonical.
- `sharpee test . --json --capture-output > records.txt`: the derived-test report printed in the terminal, as stated; `records.txt` has one JSON record to a line, and the `take lamp` record is the book's field for field (`"actualOutput":"You take it.","turn":1,…,"description":"[SKIP]"`), `elapsedMs` aside.
- With the three assertions: `✓ opening-lodge` / `3 cards passing, 4 assertions passing`, exit 0.
- 38.6's failure (`"contains": ["Taken."]`, made temporarily): `✗ opening-lodge — take lamp: Output does not contain "Taken."` / `You take it.` / `2 cards passing, 3 assertions passing, 1 card failing, 1 assertion failing`, exit 1. Restored.
- With `onward01.json` and `thecake1.json` added together: `2 line(s)`, `✓ opening-lodge`, `✓ lodge · eat cake`, `6 cards passing, 9 assertions passing`, `5 commands (5 authored + 0 replayed), 1 restored at a fork`.
- Broke `cake-watched` ("You decide against it."): `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` with the story's new sentence beneath, exit 1. Put back: all passing.
- Replaced my `relighting.tests` with the one from `companion/chapter-38` and ran the full tree: the seven lines by the printed names, `182 cards passing, 275 assertions passing`, `181 commands (181 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134` (81 listed), `Endings reached: 2 / 3`, `relighting.story:314 · night-falls (lose)`, `Rooms entered: 13 / 13`. Exactly as printed.
- Ambiguity resolved: the page prints the JSON listings with wide indentation (15 columns for a card's keys). The text says "two spaces of indentation for each level" and the brief says `pdftotext` widens indentation, so I used two.

## Chapter 39 — Claims

STATUS: PASS

- Worked in my own project (chapter 37's story and the full tree from chapter 38).
- `sharpee claim winning1` (the chapter's example of a name that is not a line): the message and the seven lines are the book's.
- `sharpee claim thelodge --at 82`: the heading, the ten facts printed, twenty-three more (33 in all), and `Lock one with: sharpee claim thelodge "<fact>" --at 82`. As printed.
- Lock: output identical to the book's — the three `needs` lines, `Written: created relighting.claims.chord`, `Written: relighting.tests/manifest.json`, `Written: relighting.tests/thebell1.json`, `Pinned "the ward on the stair can be lifted" on card b7wicd1b.` The manifest gained `"claims"`, the card gained `"locks"`, and the claims file is the one printed in 39.3.
- `sharpee test .`: `claims: 1 of 1 held (seed 42)` / `0 walks` / `HELD … at turn 82` / the lock `held there`.
- Added `the story can be won` by hand before `end claims` with one blank line above, and `"locks"` on card `bjhmo3xt` in `winning1.json`: `claims: 2 of 2 held (seed 42)`, both locks held, the win at turn 138.
- Added `the cake can be eaten` by hand: `claims: 3 of 3 held`, `1 walk`, `17 states, 20 commands, stopped: all-claims-settled`, witness `take seed cake / north / eat seed cake` — the report printed in 39.11, line for line.
- `needs rooms: the Lodge` alone: `2 of 3 held, 1 unproven`, `161 states, 239 commands, stopped: max-depth-reached`. Gate Court put back. `--verbose` prints `Claims budget per walk: 120s, 500000 states, depth 80`.
- Broke the story (`change it to lifted` out of the `ward` trait): `✗ opening-lodge — unbind grille: State assertion failed: the iron grille is lifted. the iron grille is "standing", expected "lifted"`, 35 cards failing in all, exit 1; claims `1 of 3 held, 2 unproven`, `3 walks`, both locks `NOT held there` (`the iron grille is standing` / `the story has not ended`). The run took 241 s ("about four minutes"). State counts of the two clock-stopped walks differ from the page's (9821 and 14734 here), which the chapter says a clock-stopped walk will. Line put back; 182 cards passing, 3 of 3 held.
- Only differences from printed reports: spacing after `HELD`/`UNPROVEN` (two spaces here, more on the page), which I take to be typesetting.
- Not tried, as instructed (accepted item 4): locking after the line's first `put`; a `needs verbs` line naming `put`. Not run: the first cake claim "in the Lodge" as a fourth claim (39.8 shows it, 39.10 takes it out, and 39.11's steps use the one-word change instead), the shared-set form in 39.9, the `raised` and blank-line refusals.

## Chapter 40 — Publishing

STATUS: PASS

- `sharpee ifid generate` printed one identifier of the printed shape (`80C790BA-EB6A-4113-B631-E0D957C9399B`; the value belongs to the run, accepted item 3).
- Set `story-version: 1.0.0` and wrote `publish-source: yes` in the header (after `storage-prefix:`; the chapter says its place does not matter). Gate-clean. The terminal banner prints the four lines with `Story v1.0.0` last, and the page prints them as the block in 40.2 has them (title, `Story v1.0.0`, description, authors).
- `sharpee test .`: all seven lines pass and `claims: 3 of 3 held (seed 42)`.
- `sharpee publish relighting.story`: the report is the book's line for line — `✓ Validated relighting.story (gate-clean) and shipped its source (`publish-source: yes`)`, `✓ Shipped 1 import fragment(s) → imports.json`, …, `IFID:   C24E29F8-C36B-4F55-9FE9-B6D75AE7133D`, `Output: dist/relighting.zip (0.8 MB)`, `Unzip anywhere and open index.html, or upload the zip to itch.io.` Sizes and timing differ (accepted item 3: `2.4mb`, `2435.5 KB`, `0.8 MB` against the page's `1.9mb`, `1907.7 KB`, `0.7 MB`).
- `unzip dist/relighting.zip -d ../relighting-published`: exactly the fourteen files listed in 40.5, `index.html` at the top; no `game.js.map`, no `index-testing.html`, no test tree, no claims file.
- `npx serve .` inside `relighting-published`, then Playwright from `~/tools/playwright`: played from the lodge to the beacon (65 turns, 0 commands not understood). The page ends with the beacon text, `You have risen to the rank of a Lamplighter.` and `[The story has ended. RESTART, RESTORE or UNDO]`; status line `BEACON ISLE | Score: 50`; the workings panel has its four lines in the order the pages were read.
- Recordings and picture (accepted item 5, loading only): `audio/catch.mp3` (206), `audio/toll.mp3` (206), `audio/lapping.mp3` (206) and `img/lantern-lit.png` (200, 960×600) were all fetched. The picture appeared above the story when the Lantern was lit, stayed up for the crossing, and was gone after `spark beacon`. No page errors, no failed requests, nothing on the console at error level.
- Not run: the no-identity refusal, `--out`, `--no-menu` (described, no step). The companion folder `chapter-40` was not opened; no step asks for anything from it.

## Appendices A–G

Not executed (accepted item 7). I did not read them through; nothing in chapters 1–40 required looking anything up in them to complete a step.

---

## Summary

Chapters at each status (chapters 1–40):

| Status | Count | Chapters |
|---|---|---|
| PASS | 39 | 1–36, 38–40 |
| PASS-WITH-ISSUES | 1 | 37 |
| BLOCKED | 0 | — |

Count of deviation entries: **0**. Nothing was created, renamed or patched to keep the story gate-clean; every chapter's story compiled as copied (or, in Part I and chapter 35, as typed).

Where the book fails a literal reader — the complete list:

1. **Chapter 19 §19.5 → chapter 37 (broken forward reference).** 19.5 says "chapter 37 shows what a browser does with" a chapter's title and description. Chapter 37 never does. The page prints them (`Morning` at the opening; `Afternoon` / `The Hall has noticed you.` when the spark page is read; `The Crossing` when the Lantern is lit) and no transcript or prose in the book prepares the reader for those lines.

Smaller observations that stopped nothing and contradict no printed output (logged under their chapters):

- Chapter 36 §36.5: the sentence "Walking from the Cloister into the Bell Stair on the turn she pushes." has no main verb.
- Chapter 24 (and 20.6): with the grille gone, the Bell Stair's description ends with a trailing space where `{grille-across}` stood, although the marker is at the end of the paragraph as 20.6 recommends.

Against the brief's definition of "clean" (every chapter PASS, zero BLOCKED, zero deviations, every reported issue absent or on the accepted list): zero BLOCKED and zero deviations, but **not clean** — chapter 37 is PASS-WITH-ISSUES for the one issue above, which is not on the accepted list.

Things this run did not exercise, so they are not vouched for:

- Examples the book presents as "another story" (the Den, the Yard, `probe.story` diagnostics, the tram, balloon, cart, barge, gramophone, Nell, Tom, Cy, Sam and so on), except chapter 35's two stories, which were built and played.
- Compiler messages that no step asks the reader to provoke.
- The four faults the book states (accepted item 4) and the muddled reply chapter 31 warns of; none was tried.
- Chord Writer (accepted item 1) and audible playback (accepted item 5).

Left on the box by the run: `~/repos/relighting` (the finished project, with `dist/`, `records.txt`, `relighting.ir.json`, `relighting.json`, the tree and the claims file), `~/repos/relighting-endings`, `~/repos/cellar`, `~/repos/yard`, `~/repos/relighting-published`, and my Playwright scripts in `~/tools/playwright`. The `npx serve` processes were stopped.

---

**Final counts.** Chapters PASS: 39. Chapters PASS-WITH-ISSUES: 1 (chapter 37). Chapters BLOCKED: 0. DEVIATION entries: 0.
