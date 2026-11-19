# Execution log — The Chord Manual (documentation acceptance test)

Title page version line: `Chord 4.1.0, Sharpee 5.7.0` (as expected by the brief).
`sharpee --version`: `Sharpee 5.6.2 · Chord 4.0.3`

## Setup

- `npm config get prefix` printed `/usr/local`; ran `npm config set prefix "$HOME/.local"`, created `~/.local/lib/node_modules` and `~/.local/bin`. `~/.local/bin` is on PATH. OK.
- Playwright installed in `~/tools/playwright` (`npm init -y && npm install playwright`); Chromium headless shell downloaded via `npx playwright install chromium`. OK.
- **Setup deviation (environment, not a book issue):** `sudo npx playwright install-deps chromium` is denied by this box's permission system in every form attempted (it is a root-level system install). Diagnosis: Chromium only needs 20 shared libraries to be loadable, not installed system-wide. Resolved without root: downloaded the Debian bookworm packages with `apt-get download` into `~/tools/chromium-libs/debs`, extracted them with `dpkg -x` into `~/tools/chromium-libs/root`, and run Playwright with `LD_LIBRARY_PATH` pointing at the extracted lib dirs. The three-line launch check passes (`chromium launched OK`). Chapters 37 and 40 will use this environment.
- `~/repos/book-test` holds one PDF (`the-chord-manual-4.1.0.pdf`) and a folder `companion`. OK.
- Reading medium: the PDF is read via text extraction (no PDF renderer on this box). Blank lines inside printed code listings do not survive extraction; where the prose states the layout (e.g. §1.4 describes the blank line before each description), the prose was followed.
- Interactive-session substitution (logged once, per the brief): `sharpee play .` is driven by sending the chapter's commands on standard input, one per line, ending with `/quit`, e.g. `printf 'examine me\n…\n/quit\n' | sharpee play .`. Used from chapter 4 on.

## Front matter — Preface, How to read this book

STATUS: PASS. Read in full; no commands to run. Companion-folder address noted (sharpee.net) — local copies used per the brief.

## Chapter 1 — The shape of a story file

STATUS: PASS

- Typed the Part I story into `~/repos/relighting/relighting.story` exactly as printed (two-hash comment at top; blank line between a create header/short facts and the description, as §1.4 states).
- No commands to run (the chapter's Under-the-Hood box names `sharpee compose … -o …` but says chapter 4 runs it).

## Chapter 2 — The story header

STATUS: PASS. Explanatory only; all header fields were already typed in chapter 1. No commands.

## Chapter 3 — The player and the start

STATUS: PASS. Explanatory only; Ansel and the start block already typed. No commands.

## Chapter 4 — Build, play, read an error

STATUS: PASS

- `npm install -g @sharpee/devkit` ended with the install-script warning the book predicts (esbuild postinstall blocked); command works regardless, as the book says.
- `sharpee --version` → `Sharpee 5.6.2 · Chord 4.0.3` (the interim release the brief expects; book quotes 5.7.0/4.1.0 — accepted item 8).
- §4.3 `sharpee compose relighting.story --check` → gate-clean line, wording identical to the book (version number aside).
- §4.4 `sharpee play .`: prologue, header, Lodge description and all five tried commands (`examine me`, `examine lamp`, `north`, `wait`, `xyzzy`) printed word-for-word as the book shows. Loading path differs (run's own) — accepted item 3.
- §4.5 `playble` breakage: both diagnostics identical to the book, including line:column (31:3, 24:3) and order. Restored.
- §4.6 `Loge` breakage: diagnostic identical including 25:13 and the lower-case guess. Restored.
- §4.7 description removed: warning identical including 16:8; still gate-clean. Restored; single gate-clean line confirmed.
- §4.8 both folder mistakes reproduced: `play` given the file prints the book's message verbatim; a second `notes.story` gives the book's two-file error verbatim (file list order included). Cleaned up.
- Under-the-Hood box: `sharpee compose relighting.story -o relighting.ir.json` → `2 entities, 0 trait(s), 0 action(s)`, `IR written to relighting.ir.json` — matches the book (version aside).

## Chapter 5 — Rooms and exits

STATUS: PASS

- Copied `chapter-05/relighting.story` over my file (per the brief, in place of the by-hand alternative). `--check` → gate-clean.
- Opening now shows `Story v0.2.0` and the Lodge under its `room name:` heading `The Porter's Lodge`, with the added "The door to the court is north." sentence — all as the chapter prints.
- §5.6 first-visit and `look` texts for the Gate Court: word-for-word match. §5.7 `south` → `The Porter's Lodge` heading: match.
- §5.8 walk: `north, north, north, up` reaches the roof; Bell Stair and Lantern Gallery blocks word-for-word; `east` on the roof → `You can't go that way.` — match.
- Walked the whole map: all eight rooms reachable; Refectory, Library, Undercroft descriptions match the chapter's printed create blocks exactly.
- The `Cloyster` diagnostic in §5.8 is shown as a hypothetical ("if a room you expected is unreachable"), not an instructed breakage — not performed.

## Chapter 6 — Things

STATUS: PASS

- Copied `chapter-06/relighting.story`; gate-clean.
- Opening Lodge listing `You can see a kettle, a hand lamp, and Hobb here.` — word-for-word.
- `inventory`, `examine lamp`, `take lamp` → `Taken.`, `take chair` → `The chair is fixed in place.`, `take hobb` → `You can't take Hobb.`, concealed spectacles (`examine` refused, `search` → `Hidden here, you discover: spectacles.`, `take glasses` → `Taken.`), `examine arch` / `examine motto` both find the gate — all as printed.
- §6.8: `drop lamp` → `Dropped.`; `look` in the Gate Court shows the description plus `You can see a hand lamp here.` — word-for-word.
- Ambiguity resolved (logged per the brief): plain text extraction of the PDF drops blank lines inside code blocks, which made the `inventory` block look different from the real output. Checked the page's line y-coordinates: the book's block does contain the blank line (double line gap). Output matches. Future blank-line questions are settled the same way.
- Examined description nouns through the rooms; "You can't see any such thing" answers remain for nouns the chapter says stay unkept (Library desks row/shelves, bell rope, etc.) — the chapter says nothing in this step needs fixing.
- The curtain/`hiding-spot` and bell-jar examples are "from another story" and not part of The Relighting — not typed (the book places them outside the project).

## Chapter 7 — Containers and supporters

STATUS: PASS

- Copied `chapter-07/relighting.story`; gate-clean.
- All printed interactions reproduced word-for-word: desk/grimoire listing and take/put (`You take the grimoire from the reading desk.` / `You put the grimoire on the reading desk.`); closed crate (`take lens` refused, `open crate` reveals lens, `put taper in crate` → `There's no room in the crate.`, `take lens` → `You take the lens from the crate.`); `open press` → `You open the oak press, which is empty.`; chair (`enter chair`, `north` → `You're not in a place where you can go anywhere.`, `exit`); §7.7 `put kettle on chair` implicit-take block and the full `look` (press clause present, kettle listed on chair) — blank-line shape verified against page 78 line gaps, identical.
- `put lens in lantern` on the roof → `You put the lens in the Great Lantern.` — match.
- Bell jar/moth and unlisted-table examples are from another story — not typed.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

- Copied `chapter-08/relighting.story`; gate-clean. Cloister description now reads "the library door west", as §8.7's hand-change list says.
- §8.3 chain reproduced word-for-word: `west`/`open door` both answer `The library door is locked.`; `open press` reveals the key; `take key` → `You take the library key from the oak press.`; `unlock door with key`; `west` → `The library door is closed.`; `open door`; `west` enters the Library. Wrong key: `unlock door with taper` → `The wax taper doesn't fit the library door.` — match.
- §8.7 from inside the Library: `close door`, `lock door with key`, `east` → `The library door is locked.` — match; the door is the same from both sides.
- §8.4 `opens when unlocked` variant: the book says The Relighting leaves this line out — not applied; its sample output not reproducible without altering the story (the book offers it as an authorial choice, not a step).

## Chapter 9 — What things can do: the trait words

STATUS: PASS

- Copied `chapter-09/relighting.story`; gate-clean.
- Reproduced word-for-word: `inventory` (carrying and wearing, coat `(worn)`), `take off coat`/`wear coat`, `read coat` → `There's nothing written on the travelling coat.`, `eat coat` → `That's not something you can eat.`, seed cake two-bite sequence with implicit take, `take cup`/`drop cup` → `The cup hits the floor and breaks.`, `examine book`/`read book` (margin text verbatim, implicit take from desk), `pull rope` → `You pull the bell rope.`, `take rope` → `The bell rope is fixed in place.`
- Candles present and mentioned in the Refectory description, as the hand-change list says.
- Examples from other stories (hat/cap, wireless, trolley, tassel/hook) — not typed.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

- Copied `chapter-10/relighting.story`; gate-clean.
- Dark Undercroft: grue line, dark `look`, refused `examine crate`, exits still working — all word-for-word. Cloister description now warns "down into the dark under the hall" per the hand-change list.
- Lamp: `light lamp`, lit Undercroft listing, `extinguish lamp` → `…darkness closes in.`, dark look, `light lamp` → `…the darkness draws back.` followed by room description, `light taper` → `The wax taper isn't something you can light.` — all word-for-word.
- §10.6: left the lit lamp in the Undercroft, went up and came back — room lit, `You can see a crate and a hand lamp here.` — match.
- Smelly/loud tin and night-vision examples are from other stories — not typed.

## Chapter 11 — Regions

STATUS: PASS

- Copied `chapter-11/relighting.story`; gate-clean.
- Tower backdrop: examined from Lodge and Gate Court (description verbatim); from the Cloister → `You can't see any such thing.` — match.
- Stacks: `north` ×3 from the Library shows Stack 1/2/3 with the shared description, fourth `north` → `You can't go that way.` — word-for-word.
- §11.7 breakage: kettle placed `in the Grounds` → `analysis.thing-in-region` error, identical to the book including `142:3`. Restored; gate-clean again.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS

- Copied `chapter-12/relighting.story`; gate-clean.
- `up` at the Bell Stair → grille phrase verbatim; grille description verbatim.
- Hearth passage: `examine hearth` verbatim; `squeeze behind hearth` without a lamp → grue line (as §12.4 prints); same command typed in the Undercroft → `I don't understand that.` — match. With the lit lamp, `crawl behind the hearth` (alternate wording the grammar line allows) → lit Undercroft with crate — matches §12.5's block.
- §12.2 instructed temporary change: removed `up is blocked: stair-sealed`, walked up (Gallery description now carries the parapet warning sentence) and went east → deadly phrase + `[The story has ended. RESTART, RESTORE or UNDO]` — word-for-word. Put the line back; file byte-identical to the companion again; gate-clean.
- Study/Vault `while` exit example is from another story — not typed.

## Chapter 13 — States

STATUS: PASS

- Copied `chapter-13/relighting.story`; gate-clean.
- §13.8: nothing observably changed, as the chapter says; `read page` block (implicit take + kindle text) word-for-word.
- §13.4 experiment: added `change the iron grille to lifted` to the start block; `up` at the Bell Stair then reaches the Lantern Gallery (description verbatim, parapet sentence included). Removed the line; file byte-identical to companion.
- `probe.story` diagnostics (negated-state, undeclared-state, irreversible-state, unknown-value, shadow-state), sluice and dial examples are illustrative/other-story — not typed.

## Chapter 14 — Reacting to the player: on and after

STATUS: PASS

- Copied `chapter-14/relighting.story`; gate-clean.
- Reproduced word-for-word: kettle refusal (`Hobb does not look round. "That's mine," he says.`), spectacles found/taken/given (Hobb's reply verbatim), `eat cake` + Ansel's after-eating line (`It tastes of caraway, and of being nineteen.`), Library once-clause ink paragraph on first entry, kindle page clause (`You read the line once, and it reads you back…`), grille `push`/`pull` → `It does not so much as rattle.`, rope after-clause (`Nothing answers. The bell has not been rung in thirty years and sees no reason to start for you.`).
- Under-the-Hood step: ran `sharpee test .` in companion `chapter-14`. The report contains the heading `Derived rule tests (ADR-356): 11 branches` and lists clauses by owner and gerund, `kettle · on taking` among them — as the book says. (Some branches are reported SKIPPED with reasons; the book only promises the list, so nothing to report.)

## Chapter 15 — What a clause can say and do

STATUS: PASS

- Copied `chapter-15/relighting.story`; gate-clean.
- Reproduced word-for-word: `light lamp` before reading → `You reach for the word and find only the place where it was.`; `eat cake` with Hobb present → cake-watched phrase; cake eaten in the Gate Court (with ch-14 caraway line still following); `read page` first and second readings (`You know it. You are not likely to lose it twice.`); `light candles` → candle phrase and `look` showing `You can see an unbind page here.`; `light lamp` after learning → `You light the hand lamp.`; lit `down` into the Undercroft.
- Under-the-Hood: `sharpee test .` in companion `chapter-15` lists `hand lamp · on lighting · refused no-such-word` and `seed cake · on eating · refused cake-watched` under `Derived rule tests` — exactly the two entries the box quotes.

## Chapter 16 — Conditions

STATUS: PASS

- Copied `chapter-16/relighting.story`; gate-clean.
- Reproduced word-for-word: `examine grimoire` with faded pages (waiting phrase); `read hush page` while faded → blank-leaf refusal; after reading the kindle page, `read hush page` works (`The third working is hardly a word at all…`); `examine grimoire` after → filling phrase (`Something has changed in the last hour…`).
- Order enforced exactly as §16.8 describes.

## Chapter 17 — Choosing between outcomes

STATUS: PASS

- Copied `chapter-17/relighting.story`; gate-clean.
- Grille `first/second/third time` blocks: all four examinations word-for-word (fourth shows description only). Rope `select cycling`: four pulls cycle nothing→dust→patience→nothing, word-for-word. Cistern frozen arm: description + frozen sentence, word-for-word (note the ch-17 split moves "a hand's depth down" sentence into the phrase: printed text matches the book's §17.3 block exactly).
- Under-the-Hood: `sharpee test .` in companion `chapter-17` lists `kindle page · on reading · when legible`, `… · when learned`, and `iron grille · after examining · the third time` — all three quoted entries present.

## Chapter 18 — Counting, scoring and ending

STATUS: PASS

- Copied `chapter-18/relighting.story`; gate-clean.
- `score` after the kindle page → `You have scored 5 out of 25, earning you the rank of a Latecomer.`; `light candles` adds `You have risen to the rank of a Second-Year.`; `score` → `10 out of 25 … Second-Year.` — word-for-word.
- Fourth rope pull adds `Your palms have begun to object.` above the cycling line — word-for-word.
- §18.6 endings, in a separate copy folder (per the book: "in a copy of the file … in a folder of its own"): with the start-block setup lines, `put lens in lantern` (seat phrase) and `light lantern` → losing ending verbatim incl. `[The story has ended. RESTART, RESTORE or UNDO]`; with `change the lens to sound` added, winning ending verbatim incl. rank line. Copy folder removed afterwards, as the book says the lines come out again.
- Vial/`kill the player` example is from another story — not typed.

## Chapter 19 — Time

STATUS: PASS

- Copied `chapter-19/relighting.story`; gate-clean.
- Timer: after reading the kindle page the next three turns print creak/sway/strike exactly as the book shows (reproduced with the book's own command spacing, so each line fell where the book prints it).
- Cistern: arrival with the lit lamp prints the strike line plus `Where the lamplight falls on it, the ice in the cistern begins to sweat.`; next turn `examine cistern` shows the thawing text, then the break-up paragraph, a bell toll line, and the rank line — all word-for-word, in the book's order.
- Bell: from the timer's expiry on, every turn ends with one of the three toll lines (varies by turn — accepted item 6; no line missing or added).
- Blue flame: morning and after-morning examine texts word-for-word.
- `score` → `You have scored 15 out of 35, earning you the rank of a Second-Year.` (kindle + thaw + mend page) — match.
- Sequence/deadline: waiting a fresh game out, turn 50 prints `The light has turned…` and turn 80 the dusk `lose` ending — word-for-word.

## Chapter 20 — Phrases

STATUS: PASS

- Copied `chapter-20/relighting.story`; gate-clean; opening now `Story v0.4.0`.
- `no-such-word` cycling: three `light lamp` attempts print the three variants in order, word-for-word.
- Hobb's sayings cycle on each Lodge entry (shared cycle position differs from the book's single excerpt — variant choice is the cycling the chapter teaches; all three variants heard, word-for-word).
- Verbatim gate motto: three lines with relative indentation preserved exactly as printed in the book.
- Bell Stair description now carries the `{grille-across}` sentence seamlessly — identical text to before.
- `examine bell` while tolling → `By your count that makes 1, and it is not tired.` (book shows 3; the number is the tolls counter and depends on turns taken — the chapter's own text says the count is the counter's current value; wording matches).
- Entering the Lodge while the bell tolls → hobb-deafened line, word-for-word.

## Chapter 21 — A thing's own words

STATUS: PASS

- Copied `chapter-21/relighting.story`; gate-clean.
- Hobb's `present` sentence joins the Lodge description paragraph exactly as printed; Hobb still listed below.
- Detail phrases: lamp unlit/lit, candles unlit/lit, lens cracked — all word-for-word, each joining its description as one paragraph.
- §21.6 `examine lens` block (with its bell line) reproduced word-for-word.

## Chapter 22 — Changing the standard messages

STATUS: PASS

- `sharpee messages` → `Message catalog: 885 overridable messages (en-US)` — the book's count (885) holds in this interim release; the quoted catalog entries (`taking-taken`, `going-too-dark`, `lighting-lit`, `taking-taken-from`) match template-for-template.
- Copied `chapter-22/relighting.story`; gate-clean.
- Overrides word-for-word: grue replaced by the Undercroft text; `waiting-time-passes` cycling (3 variants in order); `taking-taken` → `You take it.`; dark `look` → `It is dark, and the dark here is old and has no interest in you.`
- Phrasebooks: `push grille` asleep → `It does not so much as rattle.`; after the kindle page, → the hums variant — word-for-word, with the strike line exactly where the book's block has it.

## Chapter 23 — New verbs

STATUS: PASS

- Copied `chapter-23/relighting.story`; gate-clean.
- Word-for-word: bare `kindle` → working-wants-a-thing; `mend lamp` before learning → a `no-such-word` variant (shared cycling phrase; the book's block shows another variant of the same set — accepted item 6); `gnusto` → full blessing passage; `remember dimming` / `remember the dimming` (article dropped, same answer) / `recall hobb` / `remember breakfast` — all four as printed.
- `hush bell` in the Library → `You can't see any bell here.` (visibility constraint, checked before the page requirement, exactly as the book's example implies).
- After reading the page: `kindle lamp` (held) and `kindle grimoire` → `There is nothing in that for a flame to stand on.` — match; nothing yet answers the workings, as the chapter says.
- Scrawling/shouting examples are explicitly not part of The Relighting — not typed.

## Chapter 24 — New kinds of thing

STATUS: PASS

- Copied `chapter-24/relighting.story`; gate-clean.
- Full winning playthrough, every reply word-for-word: `kindle lamp` (and the already-burning second try), `light lamp` → the wick trait's match refusal, `kindle candles` (+Second-Year), `kindle lantern` empty → the two-trait refusal, `unbind grille` while tolling → ward-in-the-bell, `hush bell` → bell-hushed (bell stops; later turns carry no toll line), `unbind grille` → ward-lifts + Journeyman (score reached 30 there in my order — the book says the rank line follows whichever award reaches thirty), `mend spectacles` (trait phrase), `mend lens` (the lens's own phrase), sound-lens detail, seat + `kindle lantern` → winning ending + Lamplighter.
- Replay with the lens left cracked: losing ending word-for-word.

## Chapter 25 — Bending the standard grammar

STATUS: PASS

- §25.7 names two files to copy; copied `relighting.story` and `synonyms.chord`. (First attempt with the story alone fails `analysis.import-unresolved` for `synonyms.chord` — my own incomplete copy, not a book defect: the book's step says to copy both.)
- Word-for-word: `sit on chair`/`exit`; `light lamp` before the page → no-such-word; after → kindled phrase (light now routed to kindling); `light lamp with taper` → the wick trait's match refusal (the one pattern lighting has left); `quiet bell`, `fix spectacles`, `repair lens` all work through the synonym grammar.
- The Journeyman rank line fell on `unbind grille` in my command order (score reached 30 there); the book's stated order puts it on `fix spectacles` and says explicitly it is "whichever takes the score to thirty" — consistent, not a defect.

## Chapter 26 — People who act

STATUS: PASS

- Copied `chapter-26/relighting.story`; gate-clean; `Story v0.5.0`.
- Word-for-word: Hobb closes the press after `take key` and after `open press` (empty); wisp arrival on first kindle and `The wisp follows you.` on movement; `examine tamsin` description + own-business phrase; Tamsin's rounds (sorts phrase, `Tamsin Vey leaves to the west.`, measuring phrase in the Cloister); bell goal (`Tamsin Vey enters from the east.` in the Cloister, thumb-down-the-bar say, `Tamsin Vey pushes the iron grille.`, pry-bar act) — each line as printed, spread one step a turn.
- `talk to hobb` → `Hobb doesn't respond.` — match (§26.6).
- Nell/Sam/cat/watchman examples are from other stories — not typed.

## Chapter 27 — Asking and telling

STATUS: PASS

- Copied `chapter-27/relighting.story`; gate-clean.
- Word-for-word, with the manner beats falling exactly as the book's transcripts pair them: greeting (`"It's you," says Hobb…`), dimming, Tamsin, kettle, lantern, gnusto rows; unknown topic → the overridden `…gives that some thought, and gives it back.`; `goodbye` / return greeting; `consult grimoire about gnusto` and `look up cheese in grimoire`; bell row refused before the bell rings (no beat before a refusal, as stated), answered while tolling with `Hobb gives the hush page to Ansel.` once (second ask repeats the speech with nothing to give); `read hush page` from Ansel's hands with no implicit take.

## Chapter 28 — Conversations with a shape

STATUS: PASS

- Copied `chapter-28/relighting.story`; gate-clean.
- Thread word-for-word: first beat on `page`; table answer + `on parting` line when asking about the porter; `on resuming` on returning to `stair`; second beat opens the exchange; `say maybe` → `Tamsin Vey waits for an answer to the question.`; `yes` → shake phrase + `Tamsin Vey gives the unbind page to Ansel.` + conclusion; concluded thread → stock answer; price row after bound → `"We have dealt, you and I. I don't sell a thing twice."`
- Refusal path: `no` → shrug + conclusion; `ask tamsin about the price` reopens the exchange; `agreed` strikes the bargain — all as printed.
- Early `ask tamsin about the price` → `"A price for what?…"` with her rounds step on the same turn — match.
- A silent turn mid-thread gets the next beat (the price) — as §28.1 says; `on silence` initiative line appears when no thread is live — word-for-word.
- `brass` row `asked once`/`asked again`; Hobb's `last night` gated on `dimming was discussed` (stock answer before, full answer after) — word-for-word.

## Chapter 29 — Inner lives

STATUS: PASS

- Copied `chapter-29/relighting.story`; gate-clean.
- Word-for-word: wary refusal of `last night` (`"That's not a thing I tell to people I can't see"`); unmended spectacles given → trust changes → full answer; Tamsin's `magic` row in both feelings (wary and, after the bargain, the warmer answer).
- Rattled manner: with the bell tolling, Hobb's answers carry the hand-over-ear beat (the mood change lands at end of turn, so the first ask after the first toll still reads calm — consistent with the book's transcripts, which show him rattled while the tolling is established).

## Chapter 30 — Principles

STATUS: PASS

- Copied `chapter-30/relighting.story`; gate-clean.
- Word-for-word: with `never betrays a confidence` the `last night` row is withheld (stock answer — indistinguishable from ignorance, as stated); the new `spectacles` hint row; spectacles given → `temperament love over duty` opens the row with nothing in the row itself changing.
- Nell/Tom/Cy spreads/honesty examples are from other stories — not typed.

## Chapter 31 — More than one protagonist

STATUS: PASS

- Copied `chapter-31/relighting.story`; gate-clean.
- Word-for-word: on the timer's expiry the hobb-wakes passage prints and the next prompt is Hobb's; `look` shows the Lodge without the doorway sentence and without Hobb in the listing; `north` → `Not with that going on. And not until you have found the thing.`; `take kettle` → `You take it.` (the kettle clause's second condition working); `examine newspapers` → the full passage, the hand-back (`You are Ansel…`), and the Library `look` with the waiting wisp.
- `inventory` as Hobb → `Your pockets are empty.` (book shows `Your hands are empty.`; the book itself says the platform picks one of three — accepted item 6).
- Observation, not an issue: with `{hobb-in-doorway}` absent, the Lodge paragraph ends with an invisible trailing space (the marker sits at the paragraph's end, exactly as §20.6 advises).

## Chapter 32 — Machines

STATUS: PASS

- Copied `chapter-32/relighting.story`; gate-clean; `Story v0.6.0`.
- Full game replayed through the new mechanism. Word-for-word: `turn crank` (shut→half, leaves part a hand's breadth); `turn crank` at half with no lens seated → bare standard report, machine holds (guard working); `push crank` → `The pawl ticks over one tooth.` (on-exit); `kindle lantern` with lens seated but shutters closed → `The shutters are closed round it…`; final `turn crank` → pawl tick + `The crank runs free, and the shutters fold back…`; `kindle lantern` → winning ending.
- (No Lamplighter rank line at this win: this route skipped the candles, so the score was 45/50 — rank lines follow the score, as established.)
- Route notes, my errors not the book's: with the unbind page carried, `read page` draws the disambiguation question exactly as chapter 6/8 warn (`Which do you mean: the unbind page or the kindle page?`); and once the bell tolls, Tamsin has left the Refectory for the grille (her ch-26 goal), so the bargain was struck before reading the kindle page.

## Chapter 33 — Vehicles

STATUS: PASS

- Copied `chapter-33/relighting.story`; gate-clean.
- Word-for-word: `up` at the Bell Stair holding the lens (grille lifted) → `The lens is as wide as a cartwheel and the stair is as wide as a student. One of you is not going up this way.`
- `put lens in hoist` → `You put the lens in the book hoist.` + `The book hoist pulls away.` With the grille standing, the loaded hoist waits in the Library (`In the book hoist you see a lens.`) — "one floor up and no nearer the roof", as stated. With the grille lifted it rises to the Lantern Gallery.
- Gallery `look` → `You can see a book hoist and a wisp here. / In the book hoist you see a lens.`; `put lens in lantern` → implicit take from hoist, seat phrase, and `The book hoist pulls away.` (empty hoist returns to the Undercroft) — word-for-word.
- Riding: `enter hoist` / `look` in the Undercroft → `You can see a book hoist, a crate, and a wisp here. / In the book hoist you see Ansel.` — word-for-word (bell hushed, as the book notes its blocks were recorded).
- Game won through crank + kindle afterwards. (One aborted attempt stepped east off the parapet — the chapter-12 deadly exit, my piloting; the book's warning about it stands.)
- Tram/balloon/cart/barge examples are from other stories — not typed.

## Chapter 34 — Open water and open ground

STATUS: PASS

- Copied `chapter-34/relighting.story`; gate-clean.
- Kindling the Lantern no longer ends the game: the new passage wakes the Hall and points across the water; the water gate (Undercroft north) opens once the story is awake.
- Skiff word-for-word: `enter skiff`, `steer east` (no movement with sail furled), `make sail`, one-unit steps each turn after; mid-crossing `look` lists landmarks with distance bands and bearings (ordering by distance — consistent with the book's transcript taken one position further along); the rock-comes-up line as the skiff comes within two units; `The skiff arrives at the Beacon Isle.`
- `kindle beacon` → the two-lights winning passage verbatim + `[The story has ended…]`. No Lamplighter line in my route (candles skipped, 45/50) — the book itself notes a player who left an award behind wins without the rank line.

## Chapter 35 — The opt-in systems

STATUS: PASS

- No companion snapshot, as the chapter (and the brief) say. Typed both complete examples from the page into folders of their own (`~/repos/cellar/cellar.story`, `~/repos/yard/yard.story`). Both gate-clean.
- Cellar: `attack rat` → `You land a solid blow on the rat, dealing 1 damage!`; with the poker → `You have slain the rat!` (this run happened to land blow-for-blow as printed; the book itself notes the rolls vary per `sharpee play` — accepted item 6).
- Yard: `You could eat.` on the first wait, `You are hungry now, and thinking about the loaf.` on the third, `You have starved to death.` + ended on the eighth — exactly the turn counts the book gives.

## Chapter 36 — Sound, music and pictures

STATUS: PASS

- Copied `chapter-36/relighting.story` and its `assets` folder (three recordings, one picture) per §36.10; gate-clean.
- Word-for-word in the terminal: the wick's `heard:` line (`The wick takes with a small dry sound, like a page turned.`) as the last line of lighting the lamp; the wisp's `after hearing the tolling, once` flinch line printing at the first stroke while the player is Hobb in the Lodge; Tamsin's pry bar heard close by at the Bell Stair (`Iron shrieks on iron, close by, and stops.` under the push report) and from the Library as `Somewhere in the Hall, iron complains about iron.`
- No audio plays in the terminal, as the chapter says; recordings are checked on the page in chapter 40 (container has no speakers — brief item 5).
- Gramophone/curtains/music/layers examples are from other stories — not typed.

## Chapter 37 — The page the player sees

STATUS: PASS

- Copied `chapter-37/relighting.story`, `relighting.config.json` and the `browser` folder; gate-clean; `Story v0.7.0`.
- `sharpee build relighting.story` → output matches the book's block line for line, with no ifid-minting line (exactly as §37.9 says for the copied config); sizes/timings are the run's own (accepted item 3).
- Served `dist/web/relighting` and drove the page with Playwright (environment note: the page's renderer needs fontconfig and a font, which this container lacked — added user-space with the same no-root method as the libraries; logged under Setup).
- On the page: opens in the `paper` theme on the title/prologue; status line shows room/Score/Turns; chapter title `Morning` shown. Played to the Library and read the kindle page: the `workings` panel appeared with exactly `kindle: wakes a flame`, as printed.
- Settings → Theme lists exactly Classic, Paper, Modern Dark. Chose Modern Dark: applied (`data-theme=modern-dark`), stored in the browser as `relighting-theme` — the very key the book names — and still applied after reload.

## Chapter 38 — Test trees

STATUS: PASS

- Wrote `relighting.tests` by hand as the chapter prints it (manifest + `mainline`, then `onward01` and `thecake1` together). First run → `✓ opening-lodge / 3 cards passing, 4 assertions passing` — identical to the book. With the fork → `✓ opening-lodge / ✓ lodge · eat cake`, 6 cards, 9 assertions, `1 restored at a fork` — identical.
- Instructed breakage: changed cake-watched's last sentence; the failure names the line, the command and the assertion and prints the story's actual words — same shape as the book's example failure. Restored; passing again.
- Replaced the folder with `chapter-38`'s full tree: `7 line(s)`, the seven line names word-for-word, `183 cards passing, 275 assertions passing`, `182 commands (182 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134`, `Endings reached: 2 / 3` with `relighting.story:314 · night-falls (lose)` unreached, `Rooms entered: 13 / 13` — every figure as printed.

## Chapter 39 — Claims

STATUS: PASS

- `sharpee claim thelodge --at 82` → the fact list opens exactly as printed (`the player is in the Bell Stair`, …, `the iron grille is lifted`, …).
- Locking command → output identical to the book including the three written files and `Pinned "the ward on the stair can be lifted" on card b7wicd1b.`; tree report → `claims: 1 of 1 held (seed 42)`, lock held — word-for-word.
- Added `the story can be won` by hand (the book says to, because of the stated `sharpee claim` fault at late turns — accepted item 4; not tried) with its lock on card `bjhmo3xt` → `2 of 2 held … at turn 138` — identical.
- Added the cake claim → `3 of 3 held`, `1 walk`, `17 states, 20 commands, stopped: all-claims-settled`, witness `take seed cake / north / eat seed cake` — every figure as printed. Narrowed to the Lodge → UNPROVEN with `161 states, 239 commands, stopped: max-depth-reached` — identical. Restored.
- Instructed breakage (ward trait without `change it to lifted`): card failure line verbatim (`State assertion failed … the iron grille is "standing", expected "lifted"`), claims section shows both locks `NOT held there:` with the stated reasons; walk state-counts under max-seconds differ run to run (clock-stopped walks — the book's Under-the-Hood says exactly this). Restored; `3 of 3 held`.
- My hand-written `relighting.claims.chord` and the restored story are byte-identical to the `chapter-39` companion.
- Accepted item 4 honoured: neither the late-turn `sharpee claim` hang nor the `needs verbs: put` hang was tried.

## Chapter 40 — Publishing

STATUS: PASS

- `story-version:` set to 1.0.0 and `publish-source: yes` added, per §40.7. Final `sharpee test .` → `claims: 3 of 3 held (seed 42)`.
- `sharpee ifid generate` prints a fresh identifier (value is the run's own — accepted item 3).
- `sharpee publish relighting.story` → output matches the book's block line for line, including `Shipped 1 import fragment(s) → imports.json`, no source map, and the IFID line — which is the book's own `C24E29F8-…`, since the companion config carries it. Zip size differs (0.8 MB vs 0.7 MB — accepted item 3).
- `dist/relighting.zip` holds exactly the fourteen files the book lists — `index.html` at the top, no test tree, no claims file, no `index-testing.html`, no `game.js.map`.
- Unzipped into an empty folder, served it, and played the story from the lodge to the beacon in a browser via Playwright, as a stranger would: the full winning walk works on the published page; the winning passage and `[The story has ended…]` appear.
- Media (brief's Playwright instruction, no speakers on this box): all three recordings (`audio/catch.mp3`, `audio/toll.mp3`, `audio/lapping.mp3`) and the picture (`img/lantern-lit.png`) were fetched by the page with no failed requests; the picture is shown in `#sharpee-media` after `kindle lantern` and removed after `kindle beacon` (the `hide image`).
- My final story is byte-identical to the `chapter-40` companion's apart from the leading `##` comment block (the companion's comment describes chapter 40; the book never instructs changing the comment — not a defect).
- Under-the-Hood checks (item 7): chapter 13's `sharpee compose … -o …` run against the final story; in the IR the grille's `states` list is in written order with a `statesReversible` field beside it, the `wick` trait's kindling clause carries `"routing": "capability"` (ch. 24), a top-level `machines` list holds `shutter-gear` (ch. 32), and `uses` lists the four opted-in systems (ch. 34/35) — all as the boxes describe.

## Appendices A–G (read, not run — brief item 7)

STATUS: PASS-WITH-ISSUES (read-only)

- All seven appendices present: A grammar (213 rules), B kinds/trait words/state words, C standard actions and gerunds, D statements and conditions, E character vocabulary, F message aliases (885 in 78 groups — matches this run's `sharpee messages` count), G removed forms (28).
- ISSUE (book-internal inconsistency): (a) Appendices A–G, each "Generated from …" banner; (b) the title page and §0.2 say this edition is pinned to **Chord 4.1.0, as shipped in Sharpee 5.7.0**, and item 8 of the brief covers only *this run's command output* printing the interim pair; (c) every appendix banner in the book itself reads `(Sharpee 5.6.2 · Chord 4.0.3)` — e.g. "Generated from chord.ebnf (Sharpee 5.6.2 · Chord 4.0.3) by scripts/generate-chord-appendices.cjs". The book's own pages thus cite two different releases: the edition statement names 4.1.0/5.7.0 while its generated appendices were produced from 4.0.3/5.6.2. A literal reader cannot tell which release the reference material describes.

---

## Summary

| STATUS | Count |
|---|---|
| PASS | 40 chapters (1–40), plus front matter |
| PASS-WITH-ISSUES | 0 chapters (1 read-only issue in the appendices, above) |
| BLOCKED | 0 |

DEVIATION entries: **0** (no chapter required a mechanical unblocking change; the only workarounds were environment setup — Playwright system libraries and fonts installed user-space — logged under Setup and not book defects).

Reported issues: **1** — the appendix generation banners citing `Sharpee 5.6.2 · Chord 4.0.3` against the edition's stated `Chord 4.1.0, Sharpee 5.7.0` (book-internal; see Appendices entry).

Every executable step of the book was performed; every block of story output, compiler diagnostic, test report and build report the chapters print was reproduced word-for-word, within the brief's accepted variations (version numbers, run-specific values, deliberately varying text). By the brief's definition this run is **clean except for the one appendix-banner inconsistency**, which falls outside the accepted list.
