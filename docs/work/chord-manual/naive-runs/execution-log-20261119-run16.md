# Execution log — The Chord Manual, documentation acceptance test

`sharpee --version` (after chapter 4's install): `Sharpee 5.6.4 · Chord 4.0.3`
Title page version line: `Chord 4.1.0, Sharpee 5.7.0`

## Setup

All four checks passed before the book was opened.

1. `npm config get prefix` → `/home/node/.local` (under home). `sharpee` was not installed at that point.
2. Playwright in `~/tools/playwright`: a three-line script launched Chromium (159.0.8154.6) and closed it, exit 0.
3. `~/repos/book-test` holds `the-chord-manual-4.1.0.pdf` and `companion/`.
4. `pdftotext -v` → 22.12.0; `pdftoppm -v` → 22.12.0.

Run-wide notes (logged once):

- Project folder: `~/repos/relighting` (chapter 1.7 says "anywhere you keep your own work").
- **Substitution:** no interactive session could be held, so every `sharpee play .` was fed its commands on standard input, one to a line, ending with `/quit`.
- The book's story-output blocks are wrapped by the page; the terminal prints each paragraph on one line. Not counted as a difference (0.7 says the page wraps output).

---

## Preface and "How to read this book"

STATUS: PASS. Nothing to execute. No issues.

## Chapter 1 — The shape of a story file

STATUS: PASS

- Typed the listing by hand into `relighting/relighting.story`, joining each `↪` row to the row above with one space, as 0.7 instructs. Blank lines checked against the rendered page (p. 23).
- Note (no ambiguity in the end): the listing's first comment line is itself broken with `↪` ("…a header, a ↪ prologue,"). 0.7 states the rule for "a story file" line, so I joined it into one `##` line. The line numbers chapter 4 later quotes (24, 25, 16, 31) match that reading.
- The two error messages quoted (1.2 `lex.tab-indent`, 1.3 `parse.unterminated-block`) are shown, not instructed; not run.

## Chapter 2 — The story header

STATUS: PASS

- Nothing is built in this chapter (2.2 says so). Reproduced in chapter 4's play session: the `about` block (2.3) and the opening (2.4) — both word for word.
- Not reproduced, because the chapter gives no step: the 2.2 "smallest header" opening (needs a one-sentence room the book does not print), and the diagnostics in 2.1 and 2.6.

## Chapter 3 — The player and the start

STATUS: PASS

- `examine me` (3.1) and the opening (3.4) match word for word.
- 3.4's two `when the game starts` blocks: the book says the story does not keep one. I added each in turn at the end of the file, played, and removed it. Default order: output unchanged, as stated. Banner-first order: output matches the book's block exactly. File restored and gate-clean afterwards.
- The diagnostics quoted in 3.4 and 3.5 are shown, not instructed; not run.

## Chapter 4 — Build, play, read an error

STATUS: PASS

- 4.1 `npm install -g @sharpee/devkit`: installed without root; ended with the install-script warning the book predicts (`1 package had install scripts blocked … esbuild@0.27.7`). `sharpee --version` → `Sharpee 5.6.4 · Chord 4.0.3` (accepted item 8).
- 4.3 `--check`: `compose: Chord 4.0.3 — relighting.story is gate-clean (--check: IR not emitted)` — matches apart from the version.
- 4.4 play: opening and all five answers match word for word.
- 4.5 `playble`: both diagnostics and the summary line match exactly, same line/column numbers. Restored.
- 4.6 `Loge`: matches exactly. Restored.
- 4.7 description removed: warning matches exactly (`16:8`). Restored; single gate-clean line.
- 4.8 both folder errors match exactly (`notes.story` copy made and removed).
- Under the Hood (4.8): `sharpee compose relighting.story -o relighting.ir.json` → `loaded — 2 entities, 0 trait(s), 0 action(s)` / `IR written to relighting.ir.json` — matches. (`relighting.ir.json` now sits in the project folder beside the story.)

## Chapter 5 — Rooms and exits

STATUS: PASS

- Copied `chapter-05/relighting.story` over my own; gate-clean. Walked all eight rooms. Every quoted block (5.6 first visit and `look`, 5.7 `The Porter's Lodge`, 5.8 Bell Stair / Lantern Gallery / `You can't go that way.`) matches word for word.
- Diagnostics in 5.1, 5.3, 5.8 and the Den/Attic one-way example (5.4) are shown without a step; not run.

## Chapter 6 — Things

STATUS: PASS

- Copied `chapter-06`; gate-clean. All quoted output matches word for word (6.1, 6.2, 6.3, 6.6, 6.7, 6.8). `examine arch` and `examine motto` both find the gate, as 6.4 says.
- 6.8 "examine everything a description mentions": done for 20 nouns; 13 answer "You can't see any such thing." (flagstones, grass, garth, nettles, steps, tables, benches, desks, shelves, rope, stair, drum, glass), which the section says to expect.
- The curtain / `hide behind curtain` example (6.7) is "from another story" with no step; not run.

## Chapter 7 — Containers and supporters

STATUS: PASS

- Copied `chapter-07`; gate-clean. All quoted output matches word for word (7.1–7.4, 7.6, 7.7), including `There's no room in the crate.` and `You open the oak press, which is empty.`
- The bell jar and table examples (7.5) are from "another story" with no step; not run.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

- Copied `chapter-08`; gate-clean. The whole 8.3 chain, the wrong-key line, and 8.7's close/lock/east match word for word.
- 8.4 `opens when unlocked` is explicitly left out of the story; its output and 8.6's key-ring question were not reproduced (no step).

## Chapter 9 — What things can do: the trait words

STATUS: PASS

- Copied `chapter-09`; gate-clean. Matches word for word: 9.1 inventory / take off / wear, 9.2 examine and read, 9.3 both `eat cake` replies, 9.4 `pull rope` / `take rope`, 9.5 cup, 9.9 `read coat` / `eat coat`.
- The Den examples (hat and cap, trolley, tassel, wireless) are from "the other story" with no step; not run.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

- Copied `chapter-10`; gate-clean. Matches word for word: 10.1 (grue line, dark `look`, `examine crate`, Cloister with "down into the dark"), 10.2 (`light lamp`, lit Undercroft, extinguish, relight, `light taper`), 10.6 (drop lamp, up, down → "a crate and a hand lamp").
- 10.4 night-vision (`starts in the Cellar`) and 10.5 tin/cheese/clock/sock are from another story with no step; not run.

## Chapter 11 — Regions

STATUS: PASS

- Copied `chapter-11`; gate-clean. `examine tower` works in the Lodge and Gate Court and fails in the Cloister, as 11.3 quotes. Stacks 1–3 and the fourth `north` match 11.5 word for word. `examine shelves` / `examine spines` work in the Library and Stack 3.
- 11.7 kettle placed `in the Grounds`: diagnostic matches exactly, including `142:3`. Put back; gate-clean; file identical to the companion copy again.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS

- Copied `chapter-12`; gate-clean. Matches word for word: 12.1 `up`, 12.4 `examine hearth`, `squeeze behind hearth` into the dark, `I don't understand that.` from the Undercroft, 12.5 lit arrival. `crawl behind the hearth` also works.
- 12.2 as instructed: took out line 102 (`up is blocked: stair-sealed`), walked up, `east` → the parapet phrase and `[The story has ended. RESTART, RESTORE or UNDO]`, exactly as printed. Line put back (companion copy restored); gate-clean.
- 12.3 Study/Vault example has no step; not run.

## Chapter 13 — States

STATUS: PASS

- Copied `chapter-13`; gate-clean. `read page` (13.8) matches word for word.
- 13.4 experiment as instructed: added `change the iron grille to lifted` to the start block, built, walked to the Bell Stair, `up` → Lantern Gallery text exactly as printed. Line taken out again (companion copy restored); gate-clean.
- Under the Hood (13.8): `sharpee compose relighting.story -o relighting.json` ran; the grille's entry holds `"states": ["standing", "lifted"]` and `"statesReversible": false`, as the box describes.
- Sluice, dial and the `probe.story` diagnostics (13.4, 13.5, 13.7) are from another story with no step; not run.

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS

- Copied `chapter-14`; gate-clean. Matches word for word: 14.1 kettle, 14.3 `read page`, 14.4 `pull rope`, 14.5 `push grille` / `pull grille`, 14.6 `give spectacles to hobb`, 14.7 Library `once` (printed on first entry only), 14.8 `eat cake`, 14.9 `search` / `take spectacles`.
- Under the Hood (14.9): went into companion `chapter-14` and ran `sharpee test .` as the box says. It printed a section headed `Derived rule tests (ADR-356): 11 branches` with rows such as `✓ kettle · on taking`, as described.
- 14.6 `lens-seated` cannot be reached in this chapter's story (the stair is sealed); the chapter does not ask for it. The dial example is from another story; not run.

## Chapter 15 — What a clause can say and do

STATUS: PASS

- Copied `chapter-15`; gate-clean. Matches word for word: 15.1 `light lamp` refusal, 15.2 `eat cake` refusal (and the cake can be eaten in the Gate Court, as the prose says), 15.4 `light candles` and the `look` that follows, 15.5 both `read page` replies, 15.7 `light lamp` / `down`. Candles refuse with `no-such-word` before the page is read.
- Under the Hood (15.7): `sharpee test .` in companion `chapter-15` lists `✓ hand lamp · on lighting · refused no-such-word` and `✓ seed cake · on eating · refused cake-watched`, as quoted.
- The Great Lantern's two requirements (15.1) cannot be tried in play (stair sealed); the derived tests above show both refusals passing.

## Chapter 16 — Conditions

STATUS: PASS

- Copied `chapter-16`; gate-clean. Walked to Stack 3 before reading anything, as 16.8 says. Matches word for word: 16.5 `examine grimoire` (waiting), 16.6 both `read hush page` blocks and the second `examine grimoire`.
- Under the Hood (16.8): `sharpee compose relighting.story -o relighting.ir.json`; `conditions` holds `lantern-ready` as `"kind": "and"` with two operands and `faded-page` with `"open": true`, as described.

## Chapter 17 — Choosing between outcomes

STATUS: PASS

- Copied `chapter-17`; gate-clean. Matches word for word: 17.3 `examine cistern`, 17.4 four `pull rope` (cycle returns to the first), 17.5 four `examine grille`.
- Under the Hood (17.7): `sharpee test .` in companion `chapter-17` prints `✓ spark page · on reading · when legible`, `✓ spark page · on reading · when learned`, `✓ iron grille · after examining · the third time`, and the cistern's three arms as `◌ … SKIPPED subject-unreachable`, as the box says.

## Chapter 18 — Counting, scoring and ending

STATUS: PASS-WITH-ISSUES

- Copied `chapter-18`; gate-clean. Matches word for word: 18.1 fourth `pull rope` (`Your palms have begun to object.` then the cycled line), 18.3 `score` 5 out of 25 / Latecomer, 18.4 `light candles` with `You have risen to the rank of a Second-Year.`, 18.8 `score` 10 out of 25.
- 18.6 as instructed: copy of the story kept as `relighting.story` in a new folder `~/repos/relighting-endings` beside the project, with the three extra start-block lines; gate-clean. `put lens in lantern` / `light lantern` give the losing block exactly. With `change the lens to sound` added as the last start-block line, the winning block matches exactly, including the rank line.
- ISSUE — ambiguity resolved (my reading worked): 18.6, "Trying the endings", says "Then walk up and light the Lantern" but its output block starts with `put lens in lantern`, a command the sentence does not mention. I typed what the block shows.
- 18.7 vial example is from another story; not run.

## Chapter 19 — Time

STATUS: PASS

- Copied `chapter-19`; gate-clean. Matches word for word: 19.1 the two-turn Undercroft block (strike, sweat; thaw text, break-up, `The tower bell tolls.`, rank line), 19.2 `light lamp` + creak, `east` + draught, 19.5 both `examine blue flame` blocks (the trailing bell line is a stated variant), 19.7 `score` 15 out of 35 with no bell line after it.
- 19.4: in a game where nothing but `wait` is typed, turn 50 prints `The light has turned. The shadows in the Hall have begun to lean east.` and turn 80 prints the dusk phrase and ends the story — both blocks exact. (In a game where the page has been read, the turn-50 reply carries a bell line after it, as 19.2 says it will.)
- Fuse/squib timer example (19.3) has no step; not run. Under the Hood (19.7) gives no command; not run.

## Chapter 20 — Phrases

STATUS: PASS

- Copied `chapter-20`; gate-clean. Matches word for word: 20.2 three `light lamp` variants in order, 20.3 Hobb's three sayings on three entries (the second is the one the book quotes), 20.4 `examine gate` with the three-line motto and its relative indentation, 20.5 `examine bell` (`By your count that makes 3` on the turn after three tolls), 20.6 Bell Stair description, 20.7 Hobb deafened.

## Chapter 21 — A thing's own words

STATUS: PASS

- Copied `chapter-21`; gate-clean. Matches word for word: 21.1 lamp unlit / lit with detail joined to the paragraph, all three candle blocks (bell line before the rank line, as printed), 21.3 Lodge with Hobb's `present` sentence, 21.6 `examine lens`.
- 21.1 `the candles are lit` diagnostic and the 21.4 cat example have no step; not run.

## Chapter 22 — Changing the standard messages

STATUS: PASS

- 22.1 `sharpee messages`: prints `Message catalog: 885 overridable messages (en-US)` and then the list as one line; 885 aliases counted. The four entries the chapter quotes (`taking-taken`, `going-too-dark`, `lighting-lit`, `taking-taken-from`) are present with the quoted templates.
- Copied `chapter-22`; gate-clean. Matches word for word: 22.2 `down`, 22.3 three `wait` variants, 22.4 `take lamp` → `You take it.`, 22.7 both `push grille` replies, 22.10 dark `look`. `take kettle` changes to `"Still mine," …` after the page is read.
- 22.5 `taking-taken-from` override and 22.9 `import "books"` are shown but not in the story and have no step; not run.

## Chapter 23 — New verbs

STATUS: PASS

- Copied `chapter-23`; gate-clean. Matches word for word: 23.2 bare `spark`, 23.3 `hush bell` in the Library, 23.4 `mend lamp` (stated cycling variant), 23.6 `spark lamp` / `spark grimoire` misses, 23.8 `gnusto` (also `say gnusto`, `gnusto kettle`), 23.9 all four remembering replies.
- "Try each working before and after its page": before, each refuses with a `no-such-word` variant; after its own page each misses with its own line (`hush lamp` → `That is making no noise you could quiet.`, `unbind lamp` → `Nothing holds that but its own weight.`, `mend lamp` → `That was never one thing to begin with.`). `light lamp` still lights, as stated.
- `scrawl` (23.10) and `shout` (23.11) are examples the story does not contain; not run.

## Chapter 24 — New kinds of thing

STATUS: PASS

- Copied `chapter-24`; gate-clean. Played to the winning end in 42 turns. Matches word for word: 24.1 both `spark lamp`, 24.2 `spark candles`, 24.3 `light lamp`, 24.4 empty `spark lantern`, 24.6 `mend spectacles`, `mend lens`, `examine lens`, 24.7 the three-command grille block including `You have risen to the rank of a Journeyman.`, 24.10 the winning `spark lantern` with `Lamplighter`.
- Played again with the lens left cracked: `spark lantern` gives the lens-shatters ending.
- Under the Hood (24.10): in the compiled IR, `wick`'s sparking clause has `"routing": "capability"`, as stated.
- 24.8 burner/brazier example is from another story; not run.

## Chapter 25 — Bending the standard grammar

STATUS: PASS

- 25.2: in the chapter-24 story `sit on chair` → `I don't understand that.`, as quoted.
- Copied `relighting.story` over my own and `synonyms.chord` beside it from `chapter-25`; gate-clean. Winning walk played with the plain words. Matches word for word: 25.1 `fix spectacles`, 25.2 `sit on chair` / `exit`, 25.4 `light lamp` before and after the page and `light lamp with taper`, 25.7 `quiet bell`. The Journeyman line came on `fix spectacles`, as 25.7 says; the game ended with `Lamplighter`.
- Under the Hood (25.7): compiled IR has `grammarRemovals` with 1 entry (lighting) and `grammarExtensions` with 4 (sparking, mending, hushing, entering), as stated.

## Chapter 26 — People who act

STATUS: PASS

- Copied `chapter-26`; gate-clean. Followed 26.5's route. Matches word for word, including which wait variant and which bell line came up: 26.2 `light lamp` with the wisp and `east` with `The wisp follows you.`, 26.3 both `Hobb closes the oak press.` blocks, 26.4 Refectory / `examine tamsin` / `wait`, 26.4.2 the three-turn Bell Stair block, 26.5 `Tamsin Vey enters from the east.`, 26.6 `talk to hobb`.
- Note (not counted as an issue): 26.2 says that from the wisp's arrival on "the wisp is in the room with Ansel, and the room lists it." On walking into a room the list is printed before `The wisp follows you.` and does not name the wisp (e.g. `You can see a kettle and Hobb here.`); a `look` afterwards does (`You can see a wisp here.`). The book's own transcripts (26.4.2) show the same.
- Sam (`ey`), the cat, the watchman and Nell are from other stories with no step; not run.

## Chapter 27 — Asking and telling

STATUS: PASS

- Copied `chapter-27`; gate-clean. Matches word for word (manner beats are a stated rotation): 27.1 dimming and tamsin answers, 27.1.1 kettle, 27.1.2 both bell blocks with `Hobb gives the hush page to Ansel.`, 27.1.3 weather override and `Hobb doesn't seem inclined to hand over the kettle.`, 27.2 both grimoire lookups, 27.3 greeting / `goodbye` / return greeting, `Tamsin Vey doesn't respond.`, 27.5 `read hush page`.
- `ask hobb about lanterns` gets the unknown-subject line while `lantern` answers, as 27.1 says. `tell hobb about gnusto` reaches the same row. A second `ask hobb about the bell` repeats the speech with nothing given.
- 27.5's longer day confirmed: waiting only, the warning comes at turn 70 and dusk at turn 110.

## Chapter 28 — Conversations with a shape

STATUS: PASS

- Copied `chapter-28`; gate-clean. Three games played (accept; refuse and find the way back; silence). Matches word for word: 28.1 first beat, 28.1.1 parting / resuming / price, 28.2 `yes` with the conclusion line and `say maybe`, 28.3 `no` with conclusion and the dead `ask tamsin about the page`, 28.4 all three price blocks (including Tamsin's rounds step on the refused turn), 28.5.1 brass once / again, 28.5.2 the three-question Hobb block, 28.6 the silence line on the second quiet turn.
- A `wait` after the first beat is answered with the price, as 28.1 says. Once Tamsin is bound, three silent turns print nothing from her.

## Chapter 29 — Inner lives

STATUS: PASS

- Copied `chapter-29`; gate-clean. Done before reading the spark page, as 29.4 says. Matches word for word: 29.2 the wary refusal, 29.2.1 `give spectacles to hobb` / `talk to hobb` (`Still here`) / `ask hobb about last night`, both `ask tamsin about magic` answers (before and after the bargain), 29.1.2 `ask hobb about the bell` with the rattled beat.
- After `hush bell`, Hobb's next three answers came with no manner sentence and the fourth had the kettle beat again, as 29.1.2 describes.
- Nell/Tom rumour example (29.3.1) is from another story; not run.

## Chapter 30 — Principles

STATUS: PASS-WITH-ISSUES

- Copied `chapter-30`; gate-clean. Matches word for word: 30.2 `ask hobb about last night` → the unknown-subject line, 30.6 `ask hobb about spectacles`, 30.3 give spectacles then the full answer. `ask hobb about night` reaches the same row.
- ISSUE — ambiguity resolved (my reading worked): 30.3, "What decides between principles", says "Then the spectacles are mended and given", but nothing can be mended before the pages are read, and 29.4 says Hobb trusts whoever gives them "mended or not". I gave them unmended; the output matches 30.3's block.
- Cy example (30.4) is from another story; not run.

## Chapter 31 — More than one protagonist

STATUS: PASS

- Copied `chapter-31`; gate-clean. Fourth turn after the page was `light lamp with taper`, as the chapter's caution asks. Matches word for word: 31.2 the hand-over block, Hobb's `look` (Lodge without the doorway sentence, `You can see a kettle here.`), `inventory` → `Your hands are empty.`, 31.3 `take kettle` → `You take it.`, 31.3.2 `north`, 31.4 `examine newspapers` and Ansel's `look` in the Library with the wisp.
- Afterwards, as Ansel, `ask hobb about the bell` gets the hush page, and `examine newspapers` does nothing extra.
- The muddled-reply fault the chapter states for a moving fourth turn was not tried (the chapter says to avoid it).

## Chapter 32 — Machines

STATUS: PASS

- Copied `chapter-32`; gate-clean. Walked to the roof with the mended lens (fourth turn after the page not a move). Matches word for word: 32.3 first `turn crank`, the guarded `turn crank` with the seat empty, `push crank` with the pawl, 32.4 the final `turn crank` (pawl, then shutters), 32.5 `spark lantern` → shuttered. Empty-seat `spark lantern` still gives the lantern-empty line; after `drawn` the crank turns with nothing more; the Lantern then lights and the game is won.

## Chapter 33 — Vehicles

STATUS: PASS

- Copied `chapter-33`; gate-clean. Matches word for word: 33.1 `up` with the lens after the grille is lifted (and the grille's phrase before), 33.2.1 `put lens in hoist` / `look`, the Lantern Gallery `look` and `put lens in lantern` with `The book hoist pulls away.`, 33.2.2 `enter hoist` / `look`.
- Lens given to the hoist before the grille was lifted: the hoist and lens were found in the Library; after: in the Lantern Gallery. As 33.2.1 says.
- 33.6's longer day confirmed by waiting only: warning at turn 100, dusk at turn 160.
- Tram, balloon, cart and barge (33.3–33.5) are from other stories with no step; not run.

## Chapter 34 — Open water and open ground

STATUS: PASS

- Copied `chapter-34`; gate-clean. Won as far as the roof (the Lantern now prints its phrase and the game goes on), went down through the water gate and across. Matches word for word: 34.5 `enter skiff`, `steer east`, `wait`, `make sail`, both `look` views (close by / on the horizon, then in the distance / on the horizon with the rock sentence), `The skiff arrives at the Beacon Isle.`, 34.7 `spark beacon` and the ending.
- No `Lamplighter` line in my win, because I had left the refectory candles unlit (score 40 before the beacon) — the case 34.7 describes.
- Before the Hall is awake, `north` in the Undercroft prints the water-gate phrase.
- Raft and bottle examples (34.3, 34.6) are from another story; not run.

## Chapter 35 — The opt-in systems

STATUS: PASS

- No companion folder, as the chapter says. Typed the two examples by hand (blank lines and indentation checked against rendered pages 368 and 370) into `~/repos/cellar/cellar.story` and `~/repos/yard/yard.story`, each in its own folder beside the project. Both gate-clean.
- Cellar: my roll went `You swing at the rat but miss!`, `Taken.`, `You have slain the rat!` — all three sentences are ones the chapter quotes; the blow-by-blow order is a stated per-play roll (accepted item 6).
- Yard: nine waits. `You could eat.` after the 2nd, `You are hungry now, and thinking about the loaf.` after the 4th, `You have starved to death.` and the ending after the 9th — exact.
- 35.3.1 `announce silent` is described with no step; not run.

## Chapter 36 — Sound, music and pictures

STATUS: PASS

- Copied `relighting.story` over my own and the `assets` folder beside it from `chapter-36` (3 recordings under `assets/audio`, 1 picture under `assets/img`); gate-clean.
- Matches word for word: 36.4 `light lamp` ending `The wick takes with a small dry sound, like a page turned.`, 36.3 the hand-over turn ending with the wisp sentence, 36.5 `north` into the Bell Stair on the turn of the push (`Tamsin Vey pushes the iron grille.` / `Iron shrieks on iron, close by, and stops.`), and from the Library `Somewhere in the Hall, iron complains about iron.` Waiting in the Cloister prints the close-by line on its own, as stated.
- Nothing plays in the terminal, as the chapter says. Gramophone / curtains (36.8, 36.9) are from another story; not run.

## Chapter 37 — The page the player sees

STATUS: PASS

- Copied `relighting.story` over my own, and `relighting.config.json` and the `browser` folder beside it, from `chapter-37`; gate-clean.
- `sharpee build relighting.story`: output has the same lines as 37.2's block in the same order, without the "Minted the story's ifid" line (as 37.9 says for the copied story); sizes and timing differ (accepted item 3). `✓ Wired 2 theme(s): paper, modern-dark`, `✓ Copied relighting.css`, `✓ Copied assets/ (2 entries)` all present.
- `npx serve dist/web/relighting` → `Accepting connections at http://localhost:3000`. Driven with Playwright (Chromium), run from `~/tools/playwright`:
  - Page opens on the title and prologue in the `paper` theme; `Morning` stands over the first room. Settings → Theme lists `Classic, Paper, Modern Dark`.
  - `read spark page` prints `Afternoon` / `The Hall has noticed you.` above `(first taking the spark page)`, exactly as 37.2 shows; the side column appears with `workings` / `spark: wakes a flame` (it was hidden before).
  - Chose Modern Dark, reloaded: theme still `modern-dark`; `localStorage` has `relighting-theme` beside `relighting-save-autosave`; the transcript ends `[Session restored]`; the status line reads `LIBRARY`; the workings panel still has its one line.
  - Played on in the page: `/audio/catch.mp3`, `/audio/toll.mp3`, `/audio/lapping.mp3` and `/img/lantern-lit.png` were all fetched (206/206/206/200); the picture rendered (960×600) above the story when the Lantern was lit; the panel reached four lines in the order I read the pages. No console errors, no failed requests.
- Note: the book writes the restored line as “Session restored”; the page prints it in square brackets, `[Session restored]`. The words are the same; logged for completeness, not counted as an issue.
- 37.1's two build errors (`unknown client`, `Unknown built-in theme`) and the 37.5/37.6 harbour examples have no step; not run.

## Chapter 38 — Test trees

STATUS: PASS

- 38.10 done step by step with the command line (no recorder, as the chapter says). Tree files typed by hand, two-space indentation checked against rendered page 404.
- Manifest + `mainline.json` with three skip cards, then `sharpee test . --json --capture-output > records.txt`: 142 JSON records, three of type `command-result`; the `take lamp` record matches 38.4's sample field for field (`"actualOutput":"You take it."`, `"turn":1`, `[SKIP]`), `elapsedMs` aside. The derived-test report still printed in the terminal.
- `mainline.json` replaced with the whole file from 38.5: `✓ opening-lodge` / `3 cards passing, 4 assertions passing`, exit 0 — exact.
- 38.6's failing variant (`"contains": ["Taken."]`): `✗ opening-lodge — take lamp: Output does not contain "Taken."` / `    You take it.` / `2 cards passing, 3 assertions passing, 1 card failing, 1 assertion failing`, exit 1 — exact. Card put back.
- `onward01.json` and `thecake1.json` added together: the four-line report of 38.7 exactly (`6 cards passing, 9 assertions passing` / `5 commands (5 authored + 0 replayed), 1 restored at a fork`).
- `cake-watched` changed to end "You decide against it.": `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` with the story's new sentence beneath, exit 1. Sentence put back (file byte-identical again); tree passes.
- My `relighting.tests` replaced by the one from companion `chapter-38`: seven lines all `✓`, `182 cards passing, 275 assertions passing`, `181 commands (181 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134` with 81 lines listed, `Endings reached: 2 / 3` / `relighting.story:314 · night-falls (lose)`, `Rooms entered: 13 / 13` — every figure as printed in 38.9. Exit 0.
- 38.3's "not in canonical form" message has no step; not run.

## Chapter 39 — Claims

STATUS: PASS-WITH-ISSUES

- Worked in my own project (story of chapter 37, full tree from `chapter-38`).
- `sharpee claim winning1` → the `no line "winning1"` message with the seven lines, exactly as 39.1. `sharpee claim thelodge --at 82` → the ten facts printed, 23 more, and `Lock one with: sharpee claim thelodge "<fact>" --at 82` — exact.
- ISSUE — ambiguity resolved (my reading worked): 39.1, "A fact worth keeping", says "The card that types `unbind grille` is turn 82", but the `--json --capture-output` records hold two cards on line `thelodge` that type `unbind grille` — card `2ktyxdwg` at turn 70 (the refused attempt while the bell tolls) and card `b7wicd1b` at turn 82. I used 82 as the book says; a reader looking the turn up for themselves finds two candidates.
- Lock command (39.2): output exact, including the three `needs` lines, the three `Written:` lines and `Pinned "the ward on the stair can be lifted" on card b7wicd1b.` Manifest gained `"claims": "relighting.claims.chord"`; `thebell1.json` gained the `locks` key on that card; the claims file is as printed in 39.3.
- `sharpee test .` → `claims: 1 of 1 held (seed 42)` / `0 walks` / HELD line / lock line — exact (39.5).
- Hand-written claim `the story can be won` added before `end claims` with one blank line above, and `locks` added to card `bjhmo3xt` in `winning1.json`: `claims: 2 of 2 held`, both HELD lines (turn 82, turn 138) and both lock lines — exact (39.7).
- Second cake claim added by hand: `3 of 3 held`, `1 walk`, `17 states, 20 commands, stopped: all-claims-settled`, witness `take seed cake / north / eat seed cake` — exact. With `needs rooms: the Lodge` alone: `2 of 3 held, 1 unproven`, `161 states, 239 commands, stopped: max-depth-reached` — the figures of 39.8. Gate Court put back.
- Story broken as instructed (`change it to lifted` removed from the `ward` trait): first failure reads exactly as 39.6 prints it; 35 cards failing in all (the book's "thirty-four more"); exit 1. Claims section: `1 of 3 held, 2 unproven`, `3 walks`, both big walks `stopped: max-seconds`, and `lock "the ward on the stair can be lifted" … — NOT held there: the iron grille is standing`, plus `lock "the story can be won" … — NOT held there: the story has not ended`, as 39.11 predicts. Line put back (file byte-identical).
- Note (timing, not counted as an issue): 39.11 says this run "takes about four minutes". Here it took 11m10s of wall-clock (2m26s of CPU). The state counts under the clock-stopped walks also differ from 39.6's (9519 / 51468 against 11612 / 63603), which the Under the Hood box says to expect.
- Final `sharpee test .`: the claims block of 39.11 exactly — `claims: 3 of 3 held (seed 42)`, `1 walk`, three HELD lines, two lock lines. Exit 0.
- Not tried, as the chapter states them as faults (accepted item 4): locking after a line's first `put`; a `needs verbs` line naming `put`. Also not run (no step): 39.4's `claims.state-unknown` refusal, 39.6's early-lock line, 39.7's canonical-form refusal, the first cake claim as a separate fourth claim, 39.9's shared `needs` block and `--verbose`.

## Chapter 40 — Publishing

STATUS: PASS

- 40.1 `sharpee ifid generate` → one identifier of the printed shape (`135F51D3-5119-4175-A70D-AF1A6D037E3A`; the value belongs to the run).
- 40.7: set `story-version: 1.0.0` and wrote `publish-source: yes` in the header of my own copy; gate-clean. `sharpee test .` → all seven lines `✓`, `claims: 3 of 3 held (seed 42)`.
- Terminal banner: title, description, authors, `Story v1.0.0` last, as 40.2 says.
- `sharpee publish relighting.story`: same lines in the same order as 40.4's block — `and shipped its source (\`publish-source: yes\`)`, `✓ Shipped 1 import fragment(s) → imports.json`, no `game.js.map` line, `IFID:   C24E29F8-C36B-4F55-9FE9-B6D75AE7133D`, `Output: dist/relighting.zip`, the closing instruction. Sizes and timing differ (2.4mb / 0.8 MB against 1.9mb / 0.7 MB; accepted item 3).
- `dist/relighting.zip` holds exactly the fourteen files listed in 40.5, `index.html` at the top; no test tree, no claims file, no `index-testing.html`, no source map.
- `unzip dist/relighting.zip -d ../relighting-published`, then `npx serve .` from inside it → `http://localhost:3000`. Played from the lodge to the beacon with Playwright (Chromium), 60 turns:
  - Page opens in the `paper` theme with File / Settings / Help menus; under the title it prints `Story v1.0.0`, then the description, then the authors — the order of 40.2's block.
  - `/audio/catch.mp3`, `/audio/toll.mp3`, `/audio/lapping.mp3` (206) and `/img/lantern-lit.png` (200) all loaded; the picture showed (960×600) from the lighting of the Lantern and was hidden on `spark beacon`.
  - `spark beacon` printed the ending prose and `You have risen to the rank of a Lamplighter.`; status line `BEACON ISLE | Score: 50`. Workings panel held four lines. No console errors, no failed requests.
- 40.4's `publish: … has no identity` refusal and the `--out` / `--no-menu` options have no step; not run. The companion `chapter-40` folder was not opened (no step takes anything from it).

## Appendices A–G

Read, not run (accepted item 7). Each opens with a "Generated from … (Sharpee 5.6.4 · Chord 4.0.3)" line (accepted item 8). Appendix F's count, 885 aliases, agrees with what `sharpee messages` printed in chapter 22. Nothing to report.

---

## Totals

| Status | Chapters | Count |
|---|---|---|
| PASS | 1–17, 19–29, 31–38, 40 | 37 |
| PASS-WITH-ISSUES | 18, 30, 39 | 3 |
| BLOCKED | — | 0 |

DEVIATION entries: **0**. No chapter needed a change the book did not ask for; every deliberate breakage the book asked for was made and put back.

Every block of story output and command output the chapters instruct a reader to produce was reproduced, and none differed from the book by a word outside the accepted list (version numbers, run values, stated variants).

The three issues, all places where the prose leaves a literal reader to choose and the choice the output block implies works:

1. **Chapter 18, 18.6 "Trying the endings"** — the instruction is "walk up and light the Lantern"; the block beneath it begins with `put lens in lantern`, which the sentence never mentions.
2. **Chapter 30, 30.3 "What decides between principles"** — "Then the spectacles are mended and given"; at that point of 30.6's steps nothing can yet be mended, and chapter 29 says mending is not needed. Giving them unmended produces the printed block.
3. **Chapter 39, 39.1 "A fact worth keeping"** — "The card that types `unbind grille` is turn 82"; the tree's main line has two such cards (turn 70, refused; turn 82, the one meant).

Notes logged but not counted as issues: the wisp is not in a room's list on arrival, only on a later `look` (ch. 26); the page prints `[Session restored]` in brackets (ch. 37); the broken-story test run took 11 minutes here against the book's "about four" (ch. 39).

Not exercised anywhere in the run, because the book gives no step for them: the examples it marks as coming from "another story" (the Den, the Yard, `probe.story` diagnostics and the like), and the diagnostics it quotes without asking the reader to cause them.
