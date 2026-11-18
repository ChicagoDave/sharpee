# Execution log — The Chord Manual, documentation acceptance test

`sharpee --version` (after chapter 4's `npm install -g @sharpee/devkit`):

    Sharpee 5.6.2 · Chord 4.0.3

Title page version line:

    Chord 4.1.0, Sharpee 5.7.0

## Setup

Checked once, before the book was opened. All three passed.

1. `npm config get prefix` printed `/home/node/.local` (under the home directory). `sharpee` was not installed at this point.
2. A three-line script run from `~/tools/playwright` launched Chromium (159.0.8154.6) and closed it.
3. `~/repos/book-test` holds one PDF (`the-chord-manual-4.1.0.pdf`) and a folder `companion`.

Run notes (about the run, not the book):

- The box has no PDF reader, and nothing may be installed. The book was read through a text extraction of the PDF made with a small script (Python standard library only). Code blocks, their indentation and their blank lines come from that extraction; a listing line the PDF wraps at the right-hand edge of a block was typed as one line.
- No interactive session could be held. From chapter 4 on, `sharpee play .` was sent its commands on standard input, one to a line, ending with `/quit`. This substitution is logged here once.
- The project folder is `~/repos/relighting`.

---

## Preface and "How to read this book"

STATUS: PASS — read; nothing to run.

## Chapter 1 — The shape of a story file

STATUS: PASS-WITH-ISSUES

- Typed the listing into `relighting/relighting.story` (§1.7). Nothing to build yet, as the chapter says.
- Ambiguity resolved (§1 listing, repeated in §1.5, §2 and §2.4): the PDF wraps long listing lines at the block's edge with no continuation mark, so the comment's first line shows as `## The Relighting, as it stands at the end of Part I: a header, a` / `prologue,` and `description:` shows as two lines. Read each wrapped pair as one line. §1.5 would make a stray `prologue,` line an error, and §1.1 says prose may wrap, so this reading is the only one that fits; it worked (chapter 4 is gate-clean).
- Ambiguity resolved (§1.7): "Make a new folder called relighting" does not say where. Made it at `~/repos/relighting`.

## Chapter 2 — The story header

STATUS: PASS

- No steps to run in the chapter; `sharpee` is not installed until chapter 4. Reproduced after chapter 4 with the story as typed: the §2.3 `about` block and the §2.4 opening match word for word.
- Not reproduced: the §2.2 opening for "the smallest header" (it shows a one-sentence Lodge description the book never asks the reader to type) and the error messages of §2.1 and §2.6 (the chapter gives no step that produces them).

## Chapter 3 — The player and the start

STATUS: PASS

- Reproduced after chapter 4: `examine me` (§3.1) matches word for word.
- Not reproduced: the three error messages of §3.4 (the chapter gives no step that produces them).

## Chapter 4 — Build, play, read an error

STATUS: PASS

- §4.1 install ended with the "install scripts blocked" warning the book predicts (esbuild). `sharpee --version` printed `Sharpee 5.6.2 · Chord 4.0.3` (accepted item 8).
- §4.3 check, §4.4 opening and five commands, §4.5 `playble`, §4.6 `Loge`, §4.7 warning, §4.8 both folder mistakes, and the Under the Hood `compose -o` all match the book word for word apart from the version number and the path.
- `relighting.ir.json` written by the Under the Hood box was left in the project folder; the book does not say to remove it.

## Chapter 5 — Rooms and exits

STATUS: PASS

- Copied `chapter-05/relighting.story`; gate-clean. §5.6, §5.7 and §5.8 output reproduced word for word. (§5.4's `down` block and the `Cloyster` error belong to examples the chapter does not ask the reader to build.)

## Chapter 6 — Things

STATUS: PASS

- Copied `chapter-06/relighting.story`; gate-clean. Every block of The Relighting's output in §6.1–§6.8 reproduced word for word. The curtain of §6.7 is "from another story" and was not built.
- §6.8 "examine everything a description mentions, in every room": done for 20 nouns; the unkept promises are as the chapter predicts (desks, rope and others answer "You can't see any such thing.").

## Chapter 7 — Containers and supporters

STATUS: PASS

- Copied `chapter-07/relighting.story`; gate-clean. All output of The Relighting in §7.1–§7.7 reproduced word for word (the §7.3 block in a new game, as the chapter says). The bell jar and table of §7.5 are from "another story" and were not built.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

- Copied `chapter-08/relighting.story`; gate-clean. §8.3 and §8.7 reproduced word for word. §8.4 (`opens when unlocked`) and §8.6 (the key ring) are stated not to be in The Relighting and were not built.

## Chapter 9 — What things can do: the trait words

STATUS: PASS

- Copied `chapter-09/relighting.story`; gate-clean. All output of The Relighting (§9.1 coat, §9.2 grimoire, §9.3 cake, §9.4 rope, §9.5 cup, §9.9) reproduced word for word. The hat and cap, trolley, tassel and wireless are examples set in "the Den", not in The Relighting, and were not built.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

- Copied `chapter-10/relighting.story`; gate-clean. §10.1, §10.2 and §10.6 reproduced word for word. The tin of §10.5 is "from another story" and was not built.

## Chapter 11 — Regions

STATUS: PASS

- Copied `chapter-11/relighting.story`; gate-clean. §11.3 and §11.5 reproduced word for word. §11.7's kettle-in-the-Grounds error reproduced exactly (same line 142, column 3), then the kettle was put back and the story is gate-clean.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS-WITH-ISSUES

- Copied `chapter-12/relighting.story`; gate-clean. §12.1, §12.4 and §12.5 reproduced word for word. §12.2: removed `up is blocked: stair-sealed`, walked up and stepped off (output matches, including the ending line), then put the line back; gate-clean.

- Ambiguity resolved (§12.2 "To see it work, take out the up is blocked line for a moment"): this step comes three sections before §12.5, where the chapter's story is copied in. At §12.2 a reader who copies (rather than types) still holds chapter 11's story, which has no `up is blocked` line and no deadly way to see. Did the step after §12.5's copy; it then works as printed.

## Chapter 13 — States

STATUS: PASS-WITH-ISSUES

- §13.4 "Add the line to it for a moment … Build the story and walk to the Bell Stair": the book says this before §13.8's copy. Done as written, on the story as it stood (chapter 12's), the check fails:

      relighting.story:340:3 error [analysis.undeclared-state] `lifted` is not a declared state of iron grille.
      compose: relighting.story failed the load-time gates (1 error(s))

  The grille gets its `states:` line only when chapter 13's story is copied in at §13.8. Took the line out, did §13.8's copy, then repeated the experiment: gate-clean, and `up` from the Bell Stair prints the Lantern Gallery exactly as §13.4 shows. Took the line out again; gate-clean.
- Copied `chapter-13/relighting.story`; gate-clean. §13.8 `read page` reproduced word for word; `up` is refused with the grille phrase, as the chapter says ("nothing has changed").
- Under the Hood (`sharpee compose relighting.story -o relighting.json`): ran; the grille's entry has `"states": ["standing", "lifted"]` and `"statesReversible": false` beside it, as described. `relighting.json` left in the project folder.
- The sluice, the seal, the dial and the `probe.story` errors (§13.2, §13.5, §13.7) belong to other stories and were not built.

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS

- Copied `chapter-14/relighting.story`; gate-clean. §14.1, §14.3, §14.4, §14.5, §14.6 (spectacles), §14.7, §14.8 and §14.9 reproduced word for word. The dial of §14.6 is from another story.
- Under the Hood: ran `sharpee test .` inside `companion/chapter-14` as told. It lists clauses by owner and gerund under "Derived rule tests (ADR-356): 11 branches", including `✓ kettle · on taking`, as described.

## Chapter 15 — What a clause can say and do

STATUS: PASS

- Copied `chapter-15/relighting.story`; gate-clean. §15.1, §15.2 (refusal in the Lodge; eaten in the Gate Court), §15.4, §15.5 and §15.7 reproduced word for word.
- Under the Hood: ran `sharpee test .` inside `companion/chapter-15`. The list under "Derived rule tests" contains `hand lamp · on lighting · refused no-such-word` and `seed cake · on eating · refused cake-watched`, as quoted.

## Chapter 16 — Conditions

STATUS: PASS

- Copied `chapter-16/relighting.story`; gate-clean. §16.5 and §16.6 (hush page refused, then readable; grimoire before and after) reproduced word for word, in the order §16.8 asks for.
- Under the Hood: "Compile to IR" prints no command here; used chapter 4's `sharpee compose relighting.story -o relighting.ir.json`. `lantern-ready` is under `conditions` as an `and` of two tests, and `faded-page` has `"open": true`, as described.

## Chapter 17 — Choosing between outcomes

STATUS: PASS

- Copied `chapter-17/relighting.story`; gate-clean. §17.3 (cistern), §17.4 (four pulls of the rope, cycling in the printed order) and §17.5 (four examinations of the grille) reproduced word for word.
- Under the Hood: ran `sharpee test .` inside `companion/chapter-17`; the three quoted lines are there (`spark page · on reading · when legible`, `… when learned`, `iron grille · after examining · the third time`).

## Chapter 18 — Counting, scoring and ending

STATUS: PASS-WITH-ISSUES

- §18.6 "Trying the endings" ("In a copy of the file, set the world up … Then walk up and light the Lantern"): the book gives this step before §18.8's copy. Done as written, with a copy of the story as it stood (chapter 17's) in a folder of its own, the copy is gate-clean but there is no ending. Where the book prints the shattering lens and `[The story has ended. RESTART, RESTORE or UNDO]`, the story printed only:

      > light lantern
      You light the Great Lantern.

  The Lantern's `after the player lighting` clause arrives with chapter 18's story at §18.8. Repeated the step with a copy of chapter 18's story: both endings (cracked lens, then with `change the lens to sound` added) match the book word for word.
- Ambiguity resolved (§18.6 "Keep the copy in a folder of its own"): the folder is not named. Used `~/repos/relighting-endings`, kept the file name `relighting.story`, and left the folder in place afterwards.
- Copied `chapter-18/relighting.story`; gate-clean. §18.1 (fourth pull), §18.3 (`score` after the page: 5 out of 25, Latecomer), §18.4 (candles and the rise in rank) and §18.8 (10 out of 25, Second-Year) reproduced word for word. The vial of §18.7 is from another story.

## Chapter 19 — Time

STATUS: PASS-WITH-ISSUES

- Copied `chapter-19/relighting.story`; gate-clean. §19.1 (the two turns at the cistern), §19.2 (timer lines after `light lamp` and `east`; a bell line after `wait`), §19.5 (blue flame in the morning) reproduced word for word. §19.4 reproduced word for word in a game where nothing is done but `wait` (warning on the 50th command, dusk on the 80th).
- §19.7 "Play through the reading of the page and down to the Undercroft with the lamp lit … `> score` / You have scored 15 out of 35": doing exactly that (read the page, light the lamp, go down, let the cistern thaw) the story printed

      > score
      You have scored 10 out of 35, earning you the rank of a Second-Year.

  The step earns two awards of 5 (the page and the thaw). The book's 15 needs a third award the step does not mention. After also reading the mend page that the thaw frees, `score` printed `You have scored 15 out of 35, earning you the rank of a Second-Year.`
- §19.5 "Come back after reading the page and the flame says something else": the block prints one line, `It is taller than it was this morning, and it leans toward the Hall.` In play the reply is the flame's description, that line, and then a bell line (`The bell tolls. You have stopped counting.`). §19.2 says every reply quoted from a game in which the page has been read ends with such a line; this block does not show it (nor the description).
- Under the Hood: compiled to IR (chapter 4's command); the sequence `the day` has `"narration": "broadcast"` and the timer `waking` lists `creak, sway, strike` in order, as described.

## Chapter 20 — Phrases

STATUS: PASS-WITH-ISSUES

- Copied `chapter-20/relighting.story`; gate-clean. §20.2 (three variants in order), §20.3 (Hobb's three sayings over three entries; the block's saying is the second), §20.4 (the motto, with its indentation), §20.6 (Bell Stair) and §20.7 (Hobb deafened, then a bell line) reproduced word for word; the bell line that ends §20.7's block was a different one of the three (accepted item 6).
- §20.5 `> examine bell`: the book prints two lines and stops at `By your count that makes 3, and it is not tired.` In play the reply had a third line:

      > examine bell
      You cannot see the bell from here, only the dark it hangs in.

      By your count that makes 2, and it is not tired.

      The bell tolls. You have stopped counting.

  The bell is tolling whenever this clause can print, so by §19.2's own rule the block should end with a bell line; it does not. (The count, 2 against 3, depends on how many turns were taken and is not reported.)

## Chapter 21 — A thing's own words

STATUS: PASS

- Copied `chapter-21/relighting.story`; gate-clean. §21.1 (lamp unlit, lit; candles before, during and after lighting), §21.3 (Hobb's sentence in the Lodge) and §21.6 (the lens) reproduced word for word, timer and bell lines included. The cat of §21.4 is from another story.

## Chapter 22 — Changing the standard messages

STATUS: PASS

- §22.1 `sharpee messages`: ran (sent to `~/repos/messages.txt`, outside the project). It reports 885 messages, and the four entries quoted in §22.1, §22.2 and §22.5 are there character for character.
- Copied `chapter-22/relighting.story`; gate-clean. §22.2 (new darkness line), §22.3 (three waits in order), §22.4 (`You take it.`), §22.7 (grille asleep; grille waking, with the timer's strike line) and §22.10 (`look` in the dark) reproduced word for word. Also saw the kettle's two phrasebook entries, before and after the page.

## Chapter 23 — New verbs

STATUS: PASS

- Copied `chapter-23/relighting.story`; gate-clean. §23.2 (`spark`), §23.3 (`hush bell` in the Library), §23.4 (`mend lamp`), §23.6 (two misses after the page, with the timer's lines), §23.8 (`gnusto`) and §23.9 (four `remember`/`recall` replies) reproduced word for word. Tried each working before its page (refused with a `no-such-word` variant) and spark after it, as §23.13 asks.
- `scrawling` (§23.10) and `shouting` (§23.11) are examples the chapter does not add to The Relighting ("The Relighting does not use this action"; neither is in §23.13's list) and were not tried.

## Chapter 24 — New kinds of thing

STATUS: PASS

- Copied `chapter-24/relighting.story`; gate-clean. Played the game to its end by §24.10's list: §24.1 (spark lamp twice), §24.2 (candles, Second-Year), §24.3 (`light lamp` refused), §24.4 (empty Lantern), §24.6 (spectacles with the trait's phrase, lens with its own, lens examined), §24.7 (grille refused in the bell, bell hushed, grille lifted, Journeyman) and §24.10 (win, Lamplighter) all reproduced word for word; the one bell line that differs is a different variant (accepted item 6). Played again with the lens left cracked: the losing ending prints.
- Under the Hood: compiled to IR; the trait clauses carry `"routing": "capability"`, as described. The brazier of §24.8 is from another story.

## Chapter 25 — Bending the standard grammar

STATUS: PASS

- §25.2 `sit on chair` "in the story as chapter 24 left it": tried before the copy; `I don't understand that.`, as printed.
- Copied `relighting.story` and `synonyms.chord` from `chapter-25`; gate-clean. §25.1, §25.2, §25.4 (three `light lamp` blocks) and §25.7 reproduced word for word. The winning walk with the plain words (light, quiet, fix, repair) wins; the Journeyman line comes on `fix spectacles`, as §25.7 says.
- Under the Hood: the IR has `grammarRemovals` with one entry (lighting) and `grammarExtensions` with four (sparking, mending, hushing, entering), as described.

## Chapter 26 — People who act

STATUS: PASS-WITH-ISSUES

- Copied `chapter-26/relighting.story`; gate-clean. §26.2 (the wisp arrives and follows), §26.3 (Hobb closes the press, twice), §26.4 (Tamsin sorts, then leaves west), §26.5 (`Tamsin Vey enters from the east.`) and §26.6 (`talk to hobb`) reproduced word for word, apart from which wait/bell variant came up (accepted item 6). §26.1's two-paragraph `examine tamsin` is reproduced exactly when she is between steps (it gains a third paragraph on the turn she sorts, as §26.4's own block shows).
- Ambiguity resolved (§26.4.2 block beginning `> north` / `Bell Stair`, with §26.5 "wait in the Cloister for the bell. Tamsin comes through on her way to the tower"): the book does not say how long to wait before following her, and the block is only reproduced with one particular timing. Going north on the turn after she enters the Cloister gives `Tamsin Vey enters from the south.` and no "thumb" line until two turns later; going north the turn after she leaves gives `You can see Tamsin Vey here.` but the "thumb" line a turn later. Only by waiting two turns after she enters the Cloister and then going north does the reply read as printed (Tamsin already there, and the "thumb" line at the end of that same turn). The two `wait` replies that follow (the push, the pry bar) then match.
- Under the Hood: in the IR Tamsin's traits list has `passive` with a `config` entry `announces-movement`; her goals are under `character.goals`, and the `push the iron grille` step is stored with the action it resolved to. As described.
- Sam, the cat, the watchman and Nell (§26.1.1, §26.2.1, §26.4.1) are from other stories and were not built.

## Chapter 27 — Asking and telling

STATUS: PASS

- Copied `chapter-27/relighting.story`; gate-clean. §27.1 (dimming, tamsin), §27.1.1 (kettle), §27.1.2 (bell refused; bell answered and the page handed over), §27.1.3 (the overridden unknown-topic line; `ask hobb for the kettle`), §27.2 (both grimoire lookups), §27.3 (greeting, goodbye, return greeting; `Tamsin Vey doesn't respond.`) and §27.5 (`read hush page`) reproduced word for word, with Hobb's beats coming round in the order the blocks show. Asked Hobb about every row and one that is not there, and Tamsin about her brass.

## Chapter 28 — Conversations with a shape

STATUS: PASS-WITH-ISSUES

- Copied `chapter-28/relighting.story`; gate-clean. §28.1 (first beat), §28.1.1 (parting, resuming, the price), §28.2 (`yes`; `say maybe`), §28.3 (`no`; the concluded thread), §28.4 (price refused before the thread, with Tamsin's sorting line; price named again and `agreed`; "We have dealt"), §28.5.1 (brass once and again) and §28.5.2 (Hobb on last night, before and after the Dimming) reproduced word for word. A silent turn after the first beat got the price, as §28.1 says.
- §28.6 block (the silence row): the book prints three `> wait` lines, the first with no reply at all:

      > wait
      > wait
      You wait. The Hall has had thirty years of practice and is better at it than you are.

      > wait
      You wait. Somewhere a shutter knocks, twice, and thinks better of it.

      Tamsin Vey sorts hinges into sizes while she waits for you to say something. …

  In play every `wait` has a reply, and Tamsin's line comes on the second wait after the question about brass, not the third:

      > ask tamsin about brass
      "Door furniture, mostly. Lamp brackets. Nobody was using them."

      > wait
      You wait. The Hall has had thirty years of practice and is better at it than you are.

      > wait
      You wait. Somewhere a shutter knocks, twice, and thinks better of it.

      Tamsin Vey sorts hinges into sizes while she waits for you to say something. There are more sizes than you would have thought.

  The block has one `> wait` line too many (or is missing that line's reply).

## Chapter 29 — Inner lives

STATUS: PASS

- Copied `chapter-29/relighting.story`; gate-clean. §29.1.2 (Hobb rattled, asked about the bell), §29.2 (refusal to a stranger), §29.2.1 (spectacles given; return greeting; last night told) and both `ask tamsin about magic` replies (wary, then after the bargain) reproduced word for word, except which of Hobb's three beats led two replies.
- Note, not counted as an issue (beats are a choice that cycles, accepted item 6): following §29.4's order exactly (Dimming, last night, find and give the spectacles, `talk to hobb`, last night) the beats came kettle / flame / takes-his-time, so `talk to hobb` opened with "He looks at the blue flame on the sill before he answers." and `ask hobb about last night` with "He takes his time, of which he has had a great deal." §29.2.1's block shows them one step earlier in the cycle (kettle, then flame).
- Nell and Tom (§29.3.1) are from another story and were not built.

## Chapter 30 — Principles

STATUS: PASS

- Copied `chapter-30/relighting.story`; gate-clean. §30.2 (confidence kept: the unknown-topic line), §30.3 (spectacles given; last night told) and §30.6 (`ask hobb about spectacles`) reproduced word for word apart from Hobb's beat.
- Note, not counted as an issue (accepted item 6, as in chapter 29): in §30.6's own order (Dimming, last night, spectacles) the spectacles answer opened with the second beat, "He looks at the blue flame on the sill before he answers.", where the block shows the first, "He turns the kettle a quarter round on its hook, to no purpose."
- Cy (§30.4) is from another story and was not built.

## Chapter 31 — More than one protagonist

STATUS: PASS

- Copied `chapter-31/relighting.story`; gate-clean. Read the page and played four more turns: the role moved to Hobb on the fourth, on `light lamp with taper`, exactly as §31.2 prints. As Hobb: `look`, `inventory` (the sentence was "You aren't carrying anything at all.", one of the three the chapter allows; accepted item 6), `north` (§31.3.2), `take kettle` (§31.3), `examine newspapers` and `look` back in the Library as Ansel (§31.4) all reproduced word for word. Back in the Lodge, Hobb hands over the hush page when asked about the bell.

## Chapter 32 — Machines

STATUS: PASS

- Copied `chapter-32/relighting.story`; gate-clean. Walked to the roof with the mended lens and did §32.6's step (crank once before the lens is seated, spark in between, crank once after): §32.3 (first turn; turn with the seat empty; push back), §32.4 (pawl and shutters), §32.5 (`spark lantern` refused by the shutters) reproduced word for word, and the Lantern then lights and the story is won.

## Chapter 33 — Vehicles

STATUS: PASS-WITH-ISSUES

- Copied `chapter-33/relighting.story`; gate-clean. §33.2.1 (lens into the hoist, hoist gone; hoist and lens on the roof; lens seated and the hoist pulls away) and §33.2.2 (riding; recorded here with the bell tolling, so each reply ends with a bell line, as the section says) reproduced word for word. Before the grille is lifted the loaded hoist stops at the Library, as §33.2.1 says. The story can still be won.
- §33.6 "Take the lens from the crate and try the stair with it" against §33.1's block: done as the step is ordered (lens in hand, grille still standing) the stair answers with the grille, not the lens:

      > up
      The grille stands across the stair, and there is no way round it.

  §33.1's reply (`The lens is as wide as a cartwheel and the stair is as wide as a student. One of you is not going up this way.`) appears only once the grille has been unbound; it was reproduced word for word then. Neither §33.1 nor §33.6 says the grille must be lifted first to see it.
- The tram, balloon, cart and barge (§33.3–§33.5) are examples from other stories and were not built.

## Chapter 34 — Open water and open ground

STATUS: PASS

- Copied `chapter-34/relighting.story`; gate-clean. Won the game as far as the roof (the Lantern now prints its phrase and the story goes on), went down through the water gate and across. §34.4 (the view one unit out), §34.5 (`enter skiff`, `steer east`, `wait`, `make sail`; the second view with the "rock comes up" line; the arrival) and §34.7 (`spark beacon`, Lamplighter, the ending) reproduced word for word apart from which `wait` variant came up. The raft and the bottle (§34.3, §34.6) are from another story.

## Chapter 35 — The opt-in systems

STATUS: PASS

- No companion folder, as the chapter says. Typed the two examples by hand into `~/repos/cellar/cellar.story` and `~/repos/yard/yard.story` (the chapter does not say where to make the folders; made them beside `relighting`). Both gate-clean.
- The Cellar: `attack rat` landed 1 damage, `take poker` gave `Taken.`, and the rat died on the third `attack rat with poker` after two misses (`You swing at the rat but miss!`). Every line is one the chapter quotes; the fight is rolled afresh (accepted item 6).
- The Yard: all three §35.3 blocks reproduced word for word. "You could eat." on the first wait, "You are hungry now…" on the third, starved on the eighth.

## Chapter 36 — Sound, music and pictures

STATUS: PASS-WITH-ISSUES

- Copied `relighting.story` and the `assets` folder (three recordings, one picture) from `chapter-36`; gate-clean. §36.4 (`light lamp` ending with the wick's `heard:` line), §36.3 (the role moves to Hobb and the wisp flinches) and §36.5's Library block (`Somewhere in the Hall, iron complains about iron.`, on the third wait as Ansel) reproduced word for word by §36.10's steps. Nothing played in the terminal, as the chapter says.
- Ambiguity resolved (§36.5 "Standing in the Cloister, next to the stair:" followed by a block that begins `> north` / `Bell Stair`): the lead-in names the Cloister but the block is the player walking into the Bell Stair on the very turn Tamsin pushes, and no step says when to go. Waiting in the Cloister itself, the near line prints on a `wait` with no sight of the push:

      > wait
      You wait. The Hall has had thirty years of practice and is better at it than you are.

      The bell tolls again, and the rooks go up off the roof.

      Iron shrieks on iron, close by, and stops.

  Going north one turn later finds Tamsin already at her pry bar and no sound. The block as printed was reproduced only by going east out of the Library on the first turn back as Ansel, waiting one turn, and then going north.
- The gramophone and curtains (§36.8, §36.9) are from another story and were not built.

## Chapter 37 — The page the player sees

STATUS: PASS

- Copied `relighting.story`, `relighting.config.json` and the `browser` folder from `chapter-37`; gate-clean. `sharpee build relighting.story` printed the lines §37.2 shows, in the same order and wording (no "Minted" line, as §37.9 says; sizes and timing differ, accepted item 3): `✓ Wired 2 theme(s): paper, modern-dark`, `✓ Copied relighting.css`, `✓ Copied assets/ (2 entries)`, `✅ Build complete!`.
- `npx serve dist/web/relighting` installed `serve` on first use and served at `http://localhost:3000`. Opened with Playwright (Chromium, from `~/tools/playwright`):
  - the page opens on the title and prologue in the paper theme; Settings → Theme lists Classic, Paper and Modern Dark;
  - the side column is hidden until a channel has a value; after playing to the Library and `read page` it shows `workings` / `spark: wakes a flame`;
  - chose Modern Dark and reloaded: the theme was remembered, filed as `relighting-theme`, with the saves beside it (`relighting-save-autosave`, `relighting-saves-index`);
  - played on to the end: the page fetched `audio/catch.mp3` (lamp), `audio/toll.mp3` (bell), `img/lantern-lit.png` (shown, 960×600, when the Lantern is lit; hidden again when the beacon is lit) and `audio/lapping.mp3` (skiff). By the time the Lantern was lit the panel held the four lines in §37.4's order. No failed request and no error on the page's console.
- The tide, bell and card channels (§37.5, §37.6) are from another story and were not built. The server was stopped afterwards.

## Chapter 38 — Test trees

STATUS: PASS-WITH-ISSUES

- §38.2 manifest and §38.3 `mainline.json`, typed exactly as the listings print them (keys in alphabetical order, two spaces a level, one list element a line, and no space after any colon, e.g. `"seed":42,` and `"id":"card0001",`): `sharpee test .` refused both files.

      test: relighting.tests/ has files not in canonical form (re-save them from the Testing tab):
        mainline.json
        manifest.json

  (exit status 2; `sharpee test . --json --capture-output` printed the same three lines.) The chapter's layout rules (§38.3, repeated in §38.10) name key order, indentation and one element to a line; all three were met. The message's only remedy is the Testing tab, which this run does not have.
- Ambiguity resolved (same place): every listing of a tree file in the chapter (§38.2, §38.3, §38.5, §38.7, §38.8) prints `"key":value` with no space, but the prose of §38.3 writes the same thing as `"skip": true`, with one. Retyped the files with a single space after each colon and changed nothing else; they were accepted. All tree files from here on were typed that way. Not counted as a DEVIATION, because the form used is one the chapter itself prints; if the listings are taken as the only authority, this is a block at §38.3 and the retyping is the deviation.
- With that spacing: the four-skip-card tree runs; `sharpee test . --json --capture-output` gives one JSON record to a line and the `take lamp` record matches §38.4's field for field (`"actualOutput":"You take it."`, `"turn":2`, the `[SKIP]` assertion result); with §38.5's assertions the report is `✓ opening-lodge` / `3 cards passing, 4 assertions passing`, as §38.6 prints; with §38.7's two segments added it is two lines, `✓ opening-lodge` and `✓ lodge · eat cake`.
- §38.10 break on purpose: changed `cake-watched`'s last sentence to "You decide against it."; the tree failed (exit 1) with `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` and the story's new sentence beneath it. Put the sentence back; the tree passes again.
- Replaced `relighting.tests` with the one from `chapter-38` and ran the full tree: seven lines with the names §38.9 prints, `183 cards passing, 275 assertions passing`, `182 commands (182 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134`, `Endings reached: 2 / 3` with `relighting.story:314 · night-falls (lose)` not reached, `Rooms entered: 13 / 13`. All as printed.
- Small difference (§38.9 "The report closes with three counts"): the block shows `Branches exercised: 53 / 134` followed by a blank line and `Endings reached`. In the report those two are separated by `Not exercised (81):` and its 81 lines.
- §38.6's failing report for a card "made to expect `Taken.`" is described, not given as a step, and was not reproduced.

## Chapter 39 — Claims

STATUS: PASS-WITH-ISSUES

- Worked in the own project (story of chapter 37, full tree of chapter 38), by §39.11's list.
- §39.1: `sharpee claim winning1` lists the seven lines exactly as printed; `sharpee claim thelodge --at 82` prints the ten facts shown, twenty-three more, and the `Lock one with:` line.
- §39.2: the lock command printed the report shown, word for word (the three `needs` lines, the three `Written:` lines, `Pinned "the ward on the stair can be lifted" on card b7wicd1b.`). §39.3: the claims file it wrote is the one printed. §39.5: `claims: 1 of 1 held (seed 42)` and its lock line, as printed.
- §39.7: added `the story can be won` by hand and its `locks` key on card `bjhmo3xt`; the report is the `2 of 2 held` block, word for word. §39.8/§39.11: added the second cake claim; `3 of 3 held` with the witness `take seed cake / north / eat seed cake`, exactly as §39.11's closing block. Narrowed to the Lodge alone it comes back `UNPROVEN` at `max-depth-reached after 161 states`; put the Gate Court back.
- §39.6/§39.11 break: took `change it to lifted` out of the ward trait. The run exits 1; the first failure and the 35 failing cards are as the chapter says, and the lock's line reads `lock "the ward on the stair can be lifted" at line thelodge "opening-lodge" at turn 82 — NOT held there: the iron grille is standing`. (With three claims in the file by this point, as §39.11 orders the steps, the section also reports the winning claim unproven and its lock not held; the walks stopped at `max-seconds`, with state counts that depend on the clock.) Put the line back: 183 cards passing, `3 of 3 held`.
- `sharpee test . --verbose` prints `Claims budget per walk: 120s, 500000 states, depth 80`, as §39.9 quotes.
- Difference between listing and file (§39.2, the manifest and the card with `locks`; §39.7, the `locks` key): the book prints `"claims":"relighting.claims.chord"`, `"locks":[` and so on with no space after the colon. The files the command itself wrote have one: `"claims": "relighting.claims.chord",` and `"locks": [`. This is the same spacing that chapter 38's listings omit and that the runner insists on; the hand-added `locks` key was typed with the space.
- The faults the chapter states (locking after a line's first `put`; `put` in a `needs verbs` line) were not tried (accepted item 4). The first cake claim ("in the Lodge") and the shared-set example of §39.9 are not in §39.11's steps and were not added.

## Chapter 40 — Publishing

STATUS: PASS-WITH-ISSUES

- §40.1: the copied story already carries `ifid: C24E29F8-C36B-4F55-9FE9-B6D75AE7133D` under `id:` and `relighting.config.json` holds the same value. `sharpee ifid generate` printed one identifier (`41CBABAD-1E15-4C21-96FC-9B6716F6E848`; the value belongs to the run).
- §40.7: set `story-version: 1.0.0` and added `publish-source: yes` in the own copy; gate-clean. The tree still passes (183 cards) and reports `claims: 3 of 3 held (seed 42)`, as §40.4 prints.
- §40.4 `sharpee publish relighting.story`: every line the book prints was printed, in the same words. The command also printed two lines the block does not show, between `Bundling game.js...` and `✓ Built game.js`:

      Bundling game.js...

        dist/web/relighting/game.js  2.4mb ⚠️

      ⚡ Done in 45ms
        ✓ Built game.js

  (Chapter 37's build block does show its equivalents of these lines.) The zip was reported as `dist/relighting.zip (0.8 MB)` against the book's 0.7 MB; a size, not reported as an issue.
- §40.5: the zip holds exactly the fourteen files listed, `index.html` at the top; no test tree, no claims file, no `index-testing.html`, no `game.js.map`.
- §40.2 block (`The Relighting` / `Story v1.0.0` / description / `By The Sharpee Project`, "The story prints it under the title when it opens"): that order is the browser page's, and the published page opens exactly so. In the terminal the same story opens with the version last, as chapters 2 and 4 showed:

      The Relighting
      Thirty years after the magic went out of the world, a lamp burns blue.
      By The Sharpee Project
      Story v1.0.0

  The block does not say which of the two it is quoting.
- §40.7: unzipped `dist/relighting.zip` into an empty folder (`~/repos/relighting-published`; no `unzip` on the box, so Python's standard `zipfile` did it), served it with `npx serve .` from inside, and played it with Playwright from the lodge to the beacon. The page opens in the paper theme with its menu, at `Story v1.0.0`; it fetched `audio/catch.mp3`, `audio/toll.mp3`, `img/lantern-lit.png` (shown when the Lantern is lit, hidden at the beacon) and `audio/lapping.mp3`; the workings panel filled to four lines; the story was won at the Beacon Isle. No failed request and no error on the page's console.
- The "no identity" refusal of §40.4 and the `--out` and `--no-menu` options of §40.5 are described, not given as steps, and were not tried. `companion/chapter-40` was not opened; no step uses it.

## Appendices A–G

Read, not run (accepted item 7). Their "Generated from" lines name `Sharpee 5.6.2 · Chord 4.0.3` (accepted item 8). Nothing logged.

---

## Where the book fails a literal reader — the issues in one place

Not on the accepted list, in the order met:

1. **Chapter 38, §38.2–§38.8 (the one that stops a reader).** Tree files typed as the listings print them (`"key":value`, no space after the colon) are refused as "not in canonical form", and the only remedy the message offers is Chord Writer's Testing tab. A space after each colon, which the prose of §38.3 happens to show (`"skip": true`) and which the files `sharpee claim` writes also have, makes them acceptable. The chapter's stated layout rules do not mention it. The same unspaced form is printed in §39.2, §39.7 and §40.1.
2. **Steps placed before the chapter's copy.** §12.2 (take out the `up is blocked` line), §13.4 (the start-block experiment) and §18.6 (trying the endings) each come before that chapter's "Build and try it", where the chapter's story is copied in. On the story a copying reader holds at that moment, §12.2 has no line to take out, §13.4 fails with `analysis.undeclared-state`, and §18.6 prints no ending. All three work after the copy.
3. **§19.7** quotes a score of 15 out of 35 for a step that earns 10.
4. **§28.6** prints a `> wait` with no reply; Tamsin's line comes one wait earlier than the block shows.
5. **Blocks that need a turn-exact approach the text does not give:** §26.4.2 (Tamsin's "thumb" line on arrival at the Bell Stair) and §36.5 (the block under "Standing in the Cloister", which is in fact a walk into the Bell Stair on the turn she pushes).
6. **§33.6 / §33.1:** "try the stair with it" gives the grille's refusal, not the lens's, until the grille is lifted.
7. **Missing closing line:** §19.5 (flame after the page) and §20.5 (`examine bell`) omit the bell line that §19.2 says ends every such reply.
8. **§40.4** omits two lines of the publish report; **§40.2** quotes the page's opening order without saying so; **§38.9**'s three-counts block omits the `Not exercised (81):` list that sits between the first two.
9. **Typing from the PDF (chapter 1 on):** long listing lines wrap at the block's edge with no continuation mark, including a `##` comment line and `description:`.

Places where the reader must choose something the book does not name (all logged above): where to make the `relighting` folder (§1.7), the folder for the endings copy (§18.6), the command for "Compile to IR" (§16 Under the Hood), where to make `cellar` and `yard` (§35.5).

Covered by the accepted list and so only noted: which of Hobb's three beats opens a reply (§29.2.1, §30.6), which bell, timer, wait or inventory variant came up, the fight in chapter 35, and the version numbers.

---

## Totals

Chapters 1–40:

- PASS: 27
- PASS-WITH-ISSUES: 13 (chapters 1, 12, 13, 18, 19, 20, 26, 28, 33, 36, 38, 39, 40)
- BLOCKED: 0

DEVIATION entries: 0

(Chapter 38's respacing of the tree files is logged there as an ambiguity resolved from the chapter's own prose, not as a DEVIATION; that entry says how to read it if the listings are taken as the only authority.)
