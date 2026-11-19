# Execution log — The Chord Manual acceptance run

`sharpee --version`: `Sharpee 5.6.2 · Chord 4.0.3`
Title page version line: `Chord 4.1.0, Sharpee 5.7.0`

## Setup

1. `npm config get prefix` → `/home/node/.local` (under home). PASS
2. Playwright in `~/tools/playwright`: three-line script launched Chromium (159.0.8154.6) and closed it. PASS
3. `~/repos/book-test` holds `the-chord-manual-4.1.0.pdf` and `companion`. PASS
4. `pdftotext -v` → 22.12.0; `pdftoppm -v` → 22.12.0. PASS

Project folder: `~/repos/relighting`.

Substitution (logged once): I cannot hold an interactive `sharpee play .` session, so every play in this run sends the commands on standard input, one to a line, ending with `/quit`.

---

## Preface and "How to read this book"

STATUS: PASS — read; nothing to execute.

## Chapter 1 — The shape of a story file

STATUS: PASS

- Typed the listing into `relighting/relighting.story`, joining each `↪` row to the row above with one space, as 0.7 instructs. No issues. (The diagnostics quoted in 1.2 and 1.3 are not steps and the command is not installed yet; not run.)

## Chapter 2 — The story header

STATUS: PASS

- Ambiguity (2.2 "What the player sees"): the opening printed there comes from "the smallest header above, and a first room cut down to one sentence", a story the chapter never asks the reader to make, and the command is not installed until chapter 4. I reproduced it after chapter 4 in a scratch folder (smallest header, the Lodge with the one sentence `The porter's lodge is one small room.`, Ansel and the start block from chapter 1). Output matched the book word for word, as did the "Under the Hood" `meta` JSON.
- 2.3 `about` block and 2.4 opening block: reproduced with the real story after chapter 4; match.
- The diagnostics in 2.1 and 2.6 are described, not instructed; not run.

## Chapter 3 — The player and the start

STATUS: PASS

- `examine me` output matches. The stock answer "As good-looking as ever." was seen in the scratch story (no description) and matches. The four mistakes in 3.4 are described, not instructed; not run. The `isPlayable` IR excerpt matches.

## Chapter 4 — Build, play, read an error

STATUS: PASS

- `npm install -g @sharpee/devkit` ended with the blocked-install-script warning the book predicts. `sharpee --version` printed `Sharpee 5.6.2 · Chord 4.0.3` (accepted, item 8).
- 4.3 check, 4.4 play and its five commands, 4.5 `playble`, 4.6 `Loge`, 4.7 deleted description, 4.8 both folder mistakes, and the "Under the Hood" `compose -o relighting.ir.json`: every line matched the book apart from version numbers and the path. Story restored and gate-clean at the end.

## Chapter 5 — Rooms and exits

STATUS: PASS

- Copied `chapter-05/relighting.story`; gate-clean. Walked all eight rooms; 5.6, 5.7 and 5.8 output blocks match word for word, including `You can't go that way.` on the roof.

## Chapter 6 — Things

STATUS: PASS

- Every block reproduced and matched: the "You can see" line, `examine lamp`, `take lamp`, `take chair`, `take hobb`, `examine arch`/`motto`, `inventory`, the spectacles sequence, and the Gate Court `drop lamp`/`look`. (The curtain in 6.7 is "from another story"; not run.)

## Chapter 7 — Containers and supporters

STATUS: PASS

- All blocks match (reading desk, crate and lens, `There's no room in the crate.`, Great Lantern, empty press, chair enter/north/exit, kettle on chair and the `look` after it). The bell jar and table in 7.5 are from another story; not run.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

- 8.3 chain, wrong key, and 8.7 close/lock/east all match. 8.4 `opens when unlocked` is stated as left out of The Relighting, and 8.6's key-ring question is from a draft; neither run.

## Chapter 9 — What things can do: the trait words

STATUS: PASS

- Coat, grimoire, seed cake, cup, bell rope, `read coat`, `eat coat` all match. Hat/cap, trolley, tassel and wireless are from other stories; not run.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

- Dark walk, lamp, extinguish/relight, `light taper`, and the dropped-lamp return all match. The tin in 10.5 is from another story; not run.

## Chapter 11 — Regions

STATUS: PASS

- Tower from both sides of the arch, the three stacks, and the kettle-in-`Grounds` error (`relighting.story:142:3`, same line and column as the book) all match. Kettle restored; gate-clean.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS

- Blocked stair, hearth, passage in the dark and with the lamp, `I don't understand that.` in the Undercroft all match. Removed `up is blocked` as 12.2 instructs, stepped off the parapet (text and `[The story has ended. RESTART, RESTORE or UNDO]` match), put the line back; gate-clean.

## Chapter 13 — States

STATUS: PASS

- `read page` block matches. 13.4 start-block experiment (`change the iron grille to lifted`): stair open, Lantern Gallery text matches; line removed again, gate-clean. Under the Hood: `sharpee compose relighting.story -o relighting.json` shows the grille's `states` list and `statesReversible` beside it, as described. Sluice, dial and `probe.story` diagnostics are from other stories; not run.

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS

- Kettle, spark page, bell rope, grille (push/pull), spectacles given to Hobb, Library first entry, `eat cake`, and `search`/`take spectacles` all match. Under the Hood: `sharpee test .` in `companion/chapter-14` prints the heading `Derived rule tests (ADR-356): 11 branches` and the line `✓ kettle · on taking`, as described. The dial clause in 14.6 is from another story; not run.

## Chapter 15 — What a clause can say and do

STATUS: PASS

- `light lamp` refusal, `eat cake` refusal (and eating it in the Gate Court), candles and unbind page, the two readings of the spark page, and 15.7's `light lamp`/`down` all match. Under the Hood: `sharpee test .` in `companion/chapter-15` lists `✓ hand lamp · on lighting · refused no-such-word` and `✓ seed cake · on eating · refused cake-watched`, as quoted.

## Chapter 16 — Conditions

STATUS: PASS

- Hush page blank then readable, and both grimoire examinations, match word for word. Under the Hood: `relighting.ir.json` has `lantern-ready` under `conditions` as an `and` with two operands, and `faded-page` with `"open": true`, as described.

## Chapter 17 — Choosing between outcomes

STATUS: PASS-WITH-ISSUES

- All story output matches: cistern frozen, four pulls of the rope, four examinations of the grille.
- ISSUE — 17.7 "Build and try it", box "Under the Hood: A branch is a test · sharpee test". The book says: "Run sharpee test . inside the companion folder chapter-17 and you will see one line for each arm … For a select on the runner puts the thing in the arm's state before it types the command … An arm you never reach in play is still exercised here." What happened: the three quoted lines are there and pass (`✓ spark page · on reading · when legible`, `✓ spark page · on reading · when learned`, `✓ iron grille · after examining · the third time`), but several `select on` arms are listed as skipped, not exercised, including the two cistern arms the chapter itself says nothing in play reaches yet:
  ```
  ◌ cistern · after examining · when frozen — SKIPPED subject-unreachable: cistern is not in the player's sight after arranging (relighting.story:428)
  ◌ cistern · after examining · when thawing — SKIPPED subject-unreachable: cistern is not in the player's sight after arranging (relighting.story:430)
  ◌ cistern · after examining · when running — SKIPPED subject-unreachable: cistern is not in the player's sight after arranging (relighting.story:432)
  ◌ unbind page · on reading · when legible — SKIPPED subject-offstage: unbind-page is in no room, so no command reaches it (relighting.story:409)
  ◌ bell rope · after pulling · alternative 0 — SKIPPED select-alternative: alternative 0 of select bell-rope.after-pulling-by-player.select#1 (relighting.story:294)
  ```
  and the summary reads `Branches exercised: 19 / 38`. The sentence "An arm you never reach in play is still exercised here" is not true of this story's own example.

## Chapter 18 — Counting, scoring and ending

STATUS: PASS

- `score` 5/25 Latecomer, candles and the rise to Second-Year, `score` 10/25, fourth pull with "Your palms have begun to object." all match.
- 18.6: made `~/repos/relighting-endings` beside the project, copied the chapter's story in, added the three start-block lines; both endings (cracked lens, then with `change the lens to sound`) match word for word.
- Ambiguity (18.6): "Add change the lens to sound to the start block" gives no position; I put it last, after the `move` line. It worked.
- The vial in 18.7 is from another story; the `rank-above-max` diagnostic is described, not instructed; neither run.

## Chapter 19 — Time

STATUS: PASS

- 19.1 Undercroft block matches line for line (strike, sweat, thawing, break-up, toll, rank). Timer lines after `light lamp` and `east` match. Blue flame in the morning and after the reading match (closing bell line is one of the stated variants). `light-turning` came on the 50th command and `night-falls` on the 80th, with the ending line. `score` 15/35 Second-Year matches. Under the Hood: the sequence's `narration` is `broadcast` in the IR, as described.

## Chapter 20 — Phrases

STATUS: PASS

- Three `light lamp` variants in order, Hobb's three sayings on three entries to the Lodge (then the first again), the verbatim gate motto (relative indentation 4/1/0 as printed), Bell Stair with `{grille-across}`, `examine bell` with the count, and the deafened Hobb all match. The count printed was 2 where the book's block shows 3; it depends on turns taken (accepted, item 6 / 19.2).

## Chapter 21 — A thing's own words

STATUS: PASS

- Lamp unlit and lit, candles before and after, Hobb's `present` sentence in the Lodge, and `examine lens` all match. Under the Hood: IR holds `hobb.present`, `hand-lamp.detail`, `candles.detail`, `candles.detail.2`. The cat in 21.4 is from another story; not run.

## Chapter 22 — Changing the standard messages

STATUS: PASS

- `sharpee messages`: count line `Message catalog: 885 overridable messages (en-US)` and the list as one line; the four entries quoted (taking-taken, going-too-dark, lighting-lit, taking-taken-from) match character for character.
- `down` in the dark, `look` in the dark, three `wait` variants, `take lamp` → `You take it.`, `push grille` asleep and waking, kettle asleep and waking: all match.
- 22.9 `import "books"` is described with no step and no file; not run.

## Chapter 23 — New verbs

STATUS: PASS

- `spark` with no target, the workings before their pages, `hush bell` in the Library (`You can't see any bell here.`), `gnusto`, the four `remember`/`recall` commands, and `spark lamp`/`spark grimoire` after the page all match. `scrawl` and `shout` are stated examples outside The Relighting; `shout` answered `I don't understand that.` as the book says a missing verb does.
- Under the Hood: the sparking action in the IR has `patterns`, `constraints`, `musts` and `body` as described (and, beyond the "four lists" the box names, `refusals`, `otherwise` and `scores`).

## Chapter 24 — New kinds of thing

STATUS: PASS

- Played the story to its winning ending. `spark lamp` twice, `light lamp` refusal, `spark candles`, `spark lantern` empty, `mend spectacles`, `mend lens`, `examine lens`, `unbind grille` under the bell, `hush bell`, `unbind grille`, and the win all match word for word. Final `score`: `You have achieved a perfect score of 50 points!` (not quoted in the book). The brazier in 24.8 is from another story; not run.

## Chapter 25 — Bending the standard grammar

STATUS: PASS

- `sit on chair` was `I don't understand that.` with chapter 24's story, as 25.2 says. Copied `relighting.story` and `synonyms.chord` from `chapter-25`; gate-clean. `sit on chair`/`exit`, `light lamp` before and after the page, `light lamp with taper`, and the plain-word winning walk (`quiet bell`, `fix spectacles`, `repair lens`, then `unbind grille`) all match; the Journeyman line came on `fix spectacles`, as the chapter says. IR: `grammarRemovals` has 1 entry (lighting), `grammarExtensions` 4 (sparking, mending, hushing, entering).

## Chapter 26 — People who act

STATUS: PASS

- Hobb closing the press (twice), Tamsin's rounds (`examine tamsin`, sorting, `leaves to the west`), the wisp arriving and following, `Tamsin Vey enters from the east.`, and the Bell Stair block (thumb, push, pry bar) all match line for line. `talk to hobb` → `Hobb doesn't respond.` matches. (The `wait` reply differs between turns: cycling, accepted.) Sam, the cat, the watchman and Nell are from other stories; not run.

## Chapter 27 — Asking and telling

STATUS: PASS

- Every row in Hobb's table, `tell hobb about gnusto`, the unknown subject (overridden line), `ask hobb for the kettle`, the bell row refused and then answered with `Hobb gives the hush page to Ansel.`, the second asking, `read hush page`, `talk to hobb`/`goodbye`/`talk to hobb`, `talk to tamsin`, and the three grimoire consultations match. Manner beats rotate as the chapter says.

## Chapter 28 — Conversations with a shape

STATUS: PASS

- The thread (two beats, parting, resuming), `say maybe`, `yes`, conclusion, the concluded thread's stock answer, `no` and the way back through `ask tamsin about the price`/`agreed`, the refused price before the thread (with Tamsin's rounds step on the same turn), the brass row once/again, Hobb's `last night` gated on the Dimming, and Tamsin's silence line all match word for word.

## Chapter 29 — Inner lives

STATUS: PASS

- Hobb's refusal while wary, the spectacles, `talk to hobb`, `last night` once trusted, Tamsin's two answers about magic, and the rattled Hobb under the bell all match. Nell and Tom are from another story; not run.

## Chapter 30 — Principles

STATUS: PASS

- `last night` withheld with the stock line, the spectacles row, and `last night` told after the spectacles are given all match. Cy is from another story; not run.

## Chapter 31 — More than one protagonist

STATUS: PASS

- The hand-over on the fourth turn after the reading (same command as the book, `light lamp with taper`), `look` as Hobb, `inventory` (`You aren't carrying anything.`, one of the three stated variants), `north` blocked, `take kettle`, `examine newspapers` and the hand-back, and `look` as Ansel in the Library with the wisp all match.

## Chapter 32 — Machines

STATUS: PASS

- On the roof: `turn crank` to half, `turn crank` with the seat empty (bare line only), `push crank` and the pawl, `spark lantern` shuttered, `turn crank` to drawn (pawl, then shutters), and the win all match. `story-version` is 0.6.0 as stated.

## Chapter 33 — Vehicles

STATUS: PASS

- Stair with the lens: the grille's phrase while it stands, the lens's phrase after. Lens in the hoist before the grille is lifted: hoist found in the Library; after: in the Lantern Gallery. `put lens in hoist`/`look`, the Gallery `look`, `put lens in lantern` with `The book hoist pulls away.`, and `enter hoist`/`look` all match. Tram, balloon, cart and barge are from other stories; not run.

## Chapter 34 — Open water and open ground

STATUS: PASS

- Lit the Lantern (no win now; 45 of 50), went through the water gate, and crossed: `enter skiff`, `steer east`, `wait`, `make sail`, the `look` one unit out, two waits, the second `look` with the rock sentence, arrival, and `spark beacon` with the win and the Lamplighter line all match. The raft and the bottle are from another story; not run.

## Chapter 35 — The opt-in systems

STATUS: PASS

- Made `~/repos/cellar` and `~/repos/yard` beside the project and typed both stories from the page; both gate-clean.
- Cellar: `You land a solid blow on the rat, dealing 1 damage!`, `Taken.`, two misses (`You swing at the rat but miss!`), then `You have slain the rat!` — the fight is rolled afresh (accepted, item 6); every line is one the chapter quotes.
- Yard: `You could eat.` on the first `wait`, `You are hungry now, and thinking about the loaf.` on the third, `You have starved to death.` and the ending line on the eighth, as stated.

## Chapter 36 — Sound, music and pictures

STATUS: PASS

- Copied `relighting.story` and the `assets` folder from `chapter-36`; gate-clean. In the terminal: the `heard:` line after `light lamp`, the wisp's flinch on the turn Hobb takes the role, `Somewhere in the Hall, iron complains about iron.` while waiting in the Library, `Iron shrieks on iron, close by, and stops.` from the Cloister, and the whole Bell Stair block on the turn Tamsin pushes all match word for word. The gramophone and curtains are from another story; not run. (That the recordings and picture load is checked on the page in chapters 37 and 40.)

## Chapter 37 — The page the player sees

STATUS: PASS

- Copied `relighting.story`, `relighting.config.json` and `browser` from `chapter-37`. `sharpee build relighting.story` printed the report of 37.2 without the "Minted" line, as 37.9 says it would; `game.js` is 2.4mb / 2425.8 KB against the book's 1.9mb / 1907.7 KB (size, accepted). `npx serve dist/web/relighting` served at `http://localhost:3000`.
- Playwright (Chromium, from `~/tools/playwright`): the page opens with the prologue, title, `Story v0.7.0`, description and author in the `paper` theme; Settings → Theme lists Classic, Paper, Modern Dark. Played to the Library and read the spark page: the side panel shows `workings` / `spark: wakes a flame`. Chose Modern Dark and reloaded: the theme was still `modern-dark`, filed in the browser as `relighting-theme`, with the saves beside it (`relighting-save-autosave`, `relighting-saves-index`).
- Beyond the chapter's step, to check loading as the brief asks, I played the whole game on the page: `audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3` (HTTP 206) and `img/lantern-lit.png` (HTTP 200) all loaded; the panel ended with the four workings; no console or page errors.

## Chapter 38 — Test trees

STATUS: PASS

- Wrote `relighting.tests/manifest.json` and `mainline.json` by hand; `sharpee test . --json --capture-output > records.txt` gave the `take lamp` record as quoted (`"actualOutput":"You take it."`, `"turn":2`). The full `mainline.json`: `✓ opening-lodge` / `3 cards passing, 4 assertions passing`. With `"contains": ["Taken."]`: the failure block as printed, exit 1. With `onward01.json` and `thecake1.json`: two lines, `6 cards passing, 9 assertions passing`, `6 commands (6 authored + 0 replayed), 1 restored at a fork`. Broke `cake-watched` to "You decide against it.": `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."`; mended, green again.
- Replaced the folder with `chapter-38/relighting.tests`: seven lines, `183 cards passing, 275 assertions passing`, `182 commands (182 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134` with 81 not exercised, `Endings reached: 2 / 3` (`relighting.story:314 · night-falls (lose)`), `Rooms entered: 13 / 13`. All as printed.
- Ambiguity (38.3 "A segment and its cards"): the canonical layout is given as sorted keys, two-space indentation, one element to a line and one space after each colon; whether the file ends with a newline is not said. I ended each file with one newline and it was accepted.

## Chapter 39 — Claims

STATUS: PASS

- `sharpee claim winning1` listed the seven lines as printed. `sharpee claim thelodge --at 82` printed the ten facts shown and twenty-three more, then the `Lock one with:` line. The lock command wrote `relighting.claims.chord`, the manifest key and `locks` on card `b7wicd1b`, with the report and the file exactly as printed. `sharpee test .`: `claims: 1 of 1 held`.
- Hand-written "the story can be won" with its lock on `bjhmo3xt`: `claims: 2 of 2 held`, turn 138. Second cake claim: `3 of 3 held`, `by walk at depth 3: take seed cake / north / eat seed cake`, `17 states, 20 commands`. With `needs rooms: the Lodge` alone: `UNPROVEN … max-depth-reached after 161 states` (`161 states, 239 commands`); Gate Court put back.
- Took `change it to lifted` out of the `ward` trait: the first failure line and its quoted reply match; 35 cards failed (1 + 34, as the chapter says); `claims: 1 of 3 held, 2 unproven`, both locks `NOT held there` (`the iron grille is standing`; `the story has not ended`); the run took 4m01s. State counts under the two clock-stopped walks differ from the book's (9861 and 14845 here), which the chapter says a clock-stopped walk may. Line put back; final run `claims: 3 of 3 held (seed 42)` with the report of 39.11 line for line.
- Ambiguity (39.7 "A claim written by hand"): "The lock is one key on the winning card" does not say which file of the tree holds card `bjhmo3xt`. I found it by searching the tree folder for the id; it is in `relighting.tests/winning1.json`.
- Not tried, as instructed: locking a fact after the line's first `put`, and a `needs verbs` line naming `put` (accepted, item 4).

## Chapter 40 — Publishing

STATUS: PASS

- `sharpee ifid generate` printed one identifier (`993DD6F4-5E40-4473-8887-F51953350E1B`; run value). Set `story-version: 1.0.0` and added `publish-source: yes` (after `storage-prefix:`; the chapter says its place does not matter). The terminal opening prints `Story v1.0.0` last, as 40.2 says. Tree: 183 cards passing, `claims: 3 of 3 held (seed 42)`.
- `sharpee publish relighting.story`: report as printed, with `Shipped 1 import fragment(s) → imports.json` and the IFID `C24E29F8-C36B-4F55-9FE9-B6D75AE7133D`; `dist/relighting.zip (0.8 MB)` against the book's `0.7 MB` (size, accepted). The zip holds exactly the fourteen files listed; no `game.js.map`, no `index-testing.html`, no tree, no claims file.
- `unzip dist/relighting.zip -d ../relighting-published`, then `npx serve .` there (served at `http://localhost:42651`). Playwright played from the lodge to the beacon: the page opens with `The Relighting` / `Story v1.0.0` / description / author, the win prints with the Lamplighter line, score 50, the panel lists the four workings, all three recordings and the picture loaded (206/206/206/200), and the page printed no errors.

---

## Totals

Chapters by status (chapters 1–40):

- PASS: 39
- PASS-WITH-ISSUES: 1 (chapter 17)
- BLOCKED: 0

DEVIATION entries: 0

Issues reported: 1 — chapter 17, "Under the Hood: A branch is a test": the box says an arm never reached in play "is still exercised here", but `sharpee test .` in `companion/chapter-17` lists the cistern's `select on` arms (and others) as `SKIPPED` and reports `Branches exercised: 19 / 38`.

Ambiguities resolved (all worked as read): 2.2 (where the cut-down opening comes from), 18.6 (position of the extra start-block line), 38.3 (trailing newline of a tree file), 39.7 (which tree file holds the winning card).

By the "clean" definition in the brief (every chapter PASS, zero BLOCKED, zero deviations, every reported issue absent or on the accepted list), this run is not clean: one chapter is PASS-WITH-ISSUES for an issue that is not on the accepted list.

Folders this run made beside the project `~/repos/relighting`: `relighting-endings` (18.6), `cellar` and `yard` (35.5), `relighting-published` (40.7). One mistake of mine, corrected: a `compose -o` for chapter 16 first ran in `companion/chapter-14` and wrote `relighting.ir.json` there; I deleted that file and reran in the project, so the companion folder is as it was.
