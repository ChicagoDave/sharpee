# Execution log — The Chord Manual acceptance run

```
$ sharpee --version
Sharpee 5.6.2 · Chord 4.0.3
```

Title page version line: `Chord 4.1.0, Sharpee 5.7.0` (matches the expected title page; not a stale artifact).

Run date: 2026-11-17. Project folder: `~/repos/relighting`. Book: `~/repos/book-test/the-chord-manual-4.1.0.pdf` (578 pages).

## Run-wide notes

- **Standard-input substitution (logged once).** No interactive session can be held here. Every `sharpee play .` in this run was fed its commands on standard input, one to a line, ending with `/quit`.
- **Wrapped lines in code blocks (ambiguity, resolved once for the whole book).** The PDF soft-wraps long lines inside Chord, command and output blocks; the continuation is printed at the block's left margin with no wrap mark (e.g. page 23: `## The Relighting, ... a header, a` / `prologue,` and `description: Thirty years ... the world,` / `a lamp burns blue.`). A literal reader cannot tell a wrapped line from a new line at the margin, and the book's "Conventions" (0.7) never mentions wrapping. I read every such continuation as part of the line above. That reading compiled wherever it was used.
- **`Loading story from: <path>` line.** Every `sharpee play .` prints `Loading story from: /home/node/repos/relighting` before `--- Play Mode ---`. The book's transcripts (first at ch. 4 §4.4) begin at `--- Play Mode ---` and never show this line. Logged once here; not repeated per chapter.
- **npm install note (environment, not book).** `npm install -g @sharpee/devkit` printed `npm warn install-scripts 1 package had install scripts blocked because they are not covered by allowScripts: esbuild@0.27.7 (postinstall: node install.js)`. The book's §4.1 shows no such output. The command installed and ran.

## Preface / How to read this book

STATUS: PASS (read only; nothing to execute).

## Chapter 1 — The shape of a story file

STATUS: PASS

- Typed the page-23 story into `relighting.story` (soft-wrapped lines joined, see run-wide note). Line numbers later quoted by chapter 4 (16:8, 24:3, 25:13, 31:3) all match the typed file, which confirms the joined-line reading.
- No issues.

## Chapter 2 — The story header

STATUS: PASS

- Chapter has no "Build and try it" and the command is not installed until chapter 4. The diagnostics it quotes were reproduced afterwards in a scratch copy: `parse.header-inline-list`, `parse.story-title`, `parse.header-unknown-field` (key list identical), the smallest-header opening (`Story v0.0.0`), the `about` output, and the `meta` IR — all word-for-word the same apart from line numbers that depend on the example file.
- No issues.

## Chapter 3 — The player and the start

STATUS: PASS

- `analysis.start-block-missing`, `analysis.player-target-not-playable`, and the play-time `Error loading story: Story player "Ansel" (ansel) is not placed in the world …` reproduced word for word in a scratch copy. `examine me` output matches.
- No issues.

## Chapter 4 — Build, play, read an error

STATUS: PASS

- §4.2 "Make a folder for The Relighting": the book gives no folder name. Used `relighting`. (Ambiguity; any name works.)
- §4.3, §4.4, §4.5 (`playble`), §4.6 (`Loge`), §4.7 (description deleted, then restored), §4.8 (file instead of folder; second `.story` file), and the "What compose writes" box: every quoted line reproduced word for word (versions aside, accepted item 8).
- §4.6 prints only the diagnostic line; the command also prints `compose: relighting.story failed the load-time gates (1 error(s))` after it. The book's excerpt omits that trailer here although §4.5 shows it. Cosmetic.

## Chapter 5 — Rooms and exits

STATUS: PASS

- §5.8 "Add the seven new rooms and the changes to the Lodge": the chapter never says where in the file the new `create` blocks go. I put them after the Lodge and before `create Ansel`, in the order printed (Gate Court from §5.6 first). Compiled. (Ambiguity.)
- §5.7 `room name:` block: printed with the header and exit line only; the chapter does not say whether it sits before or after the description paragraph (§5.6 does say this for `first time`). I put it between the exit line and the description. Compiled and printed the heading as the book shows. (Ambiguity.)
- §5.8 quoted error is at `relighting.story:30:39`; with the story typed as above the same mistake reports `relighting.story:28:39 error [analysis.unknown-entity] No entity named `Cloyster` — did you mean `cloister`?.` Wording identical; the line number shows the book's own file has two more lines above the Gate Court than a reader's does at this point. Likewise §5.1 quotes `relighting.story:54:1` for `missing-kind-noun`; mine reports `50:1`, wording identical.
- All transcripts in §5.6, §5.7, §5.8 reproduced word for word.

## Chapter 6 — Things

STATUS: BLOCKED (unblocked by DEVIATION 1)

- **§6.8 "Add the things in this chapter to your story" / §6.1 transcript — the hand lamp is never printed.** The book says "Take the hand lamp, carry it north, and put it down in the Gate Court", and §6.1 prints `You can see a kettle, a hand lamp, and Hobb here.` and `> examine lamp` / `A tin hand lamp with a wire handle. Its wick is dry and its glass is clean, which is Hobb all over.` No `create the hand lamp` block appears anywhere in the chapter. With every block the chapter prints typed in, the story is gate-clean and says:
  ```
  You can see a kettle and Hobb here.

  > examine lamp
  You can't see any such thing.

  > take lamp
  You can't see any such thing.
  ```
  and in the Gate Court `> drop lamp` / `You can't see any such thing.` The Build-and-try step cannot be done as written.
- **DEVIATION 1.** Added, after the kettle's block, exactly:
  ```
  create the hand lamp
    a thing
    in the Lodge
  ```
  (name from the book's transcript, form from §6.1, no description, no `aka`). Why: §6.8's only instructed play step needs the lamp and later chapters carry it; the book prints no block for it. After the change §6.8 reproduces word for word (`Dropped.` … `You can see a hand lamp here.`) and the Lodge lists `You can see a kettle, a hand lamp, and Hobb here.`
- **§6.1 output differs (consequence of the above).** Book: `A tin hand lamp with a wire handle. Its wick is dry and its glass is clean, which is Hobb all over.` Actual: `The hand lamp is just a hand lamp.` The description text exists only inside the transcript; the chapter never prints it as Chord, so I did not add it.
- **§6.2 names four scenery things it does not print.** "The Relighting now does this for the blue flame on the sill, the chair, the newspapers, the gate, the hearth in the Refectory and the Great Lantern on the roof." Only the chair, newspapers and gate have blocks in the chapter. The blue flame, the hearth and the Great Lantern are never printed (§6.4 also refers to "the blue flame" as an existing name). Not created; nothing in this chapter's build step needs them. §6.9's "the hearth and the Great Lantern can be examined" is therefore false for a reader's story.
- §6.8: block positions again unstated; placed all new things after the rooms and before `create Ansel`, in printed order. (Ambiguity.)
- §6.5 quoted error is at `relighting.story:134:3`; mine reports `relighting.story:113:3`, wording identical.
- §6.7 `hiding-spot` curtain is "from another story" (needs a Den); not typed.
- Reproduced word for word: `take chair`, `take hobb`, `inventory`, the spectacles transcript, §6.8.

## Chapter 7 — Containers and supporters

STATUS: PASS-WITH-ISSUES

- **§7.7 "Change the chair and the Great Lantern to their new kinds".** A reader's story has no Great Lantern to change: chapter 6 named it but never printed its block (see chapter 6). I typed §7.3's block as a new block. Note that §7.3's block has no description paragraph and the chapter does not say whether the (never printed) chapter-6 description is to be kept. Compiled.
- **§7.7 "add the clause about the press to the Lodge's description".** §7.4 gives the clause as "and an oak press hangs on the wall beside it" without saying where in the paragraph it goes or that a comma precedes it. Position and comma taken from the §7.7 transcript (`…steady blue flame, and an oak press hangs on the wall beside it. The door…`). (Ambiguity; the transcript then matched word for word.)
- **§7.3 `put taper in crate` context.** The section follows directly on §7.2's transcript, in which the lens has just been taken out of the crate. Played in that order the story says `You put the wax taper in the crate.`, not the book's `There's no room in the crate.` The book's line appears only if the lens is still in the crate (open crate, then `put taper in crate` → `There's no room in the crate.`). The prose ("The crate holds one, and that one is the lens") implies this but the transcript order does not. (Ambiguity.)
- Block positions unstated; new blocks placed before `create Ansel` in printed order. (Ambiguity, as before.)
- §7.5 bell jar / moth / table are "from another story" (need a Den); not typed.
- Reproduced word for word: §7.1 Library transcript, §7.2 crate transcript, §7.3 `put lens in lantern`, §7.4 `open press`, §7.6 chair transcript, §7.7 transcript.

## Chapter 8 — Doors, locks and keys

STATUS: PASS

- Block positions unstated; door and key placed before `create Ansel`. (Ambiguity, as before.)
- §8.4 `opens when unlocked` added, tried (`…and it swings open.` matches), and removed again as the book says The Relighting leaves it out.
- §8.1/§8.2 quoted errors reproduce word for word at different line numbers (book `86:1` and `87:21`; mine `177:1` and `178:21`) — a reader's file order differs from the book's.
- §8.6 key ring is described as removed from the story; not typed.
- All transcripts in §8.3, §8.4, §8.7 reproduced word for word.

## Chapter 9 — What things can do: the trait words

STATUS: BLOCKED (one instructed step impossible; story stayed gate-clean, no deviation needed)

- **§9.9 "Add the coat, the seed cake, the cup, the candles and the bell rope … and mention the candles in the Refectory's description."** No block for "the candles" is printed anywhere in the chapter (or earlier), and no wording is given for the Refectory sentence. Neither step could be done. Not invented; the story is gate-clean without them.
- **§9.9 output differs.** Book: `> read coat` / `There's nothing written on the coat.` Actual: `There's nothing written on the travelling coat.`
- **§9.2 output differs.** Book prints `> read book` / `The grimoire reads:` / `In the margin, …`. Actual, with the grimoire on the desk as the chapter leaves it:
  ```
  > read book
  (first taking the grimoire)

  You take the grimoire from the reading desk.

  The grimoire reads:
  In the margin, in a small brown hand: gnusto. Came over the water as a working, they say. Meaning lost.
  ```
  The book's shorter form appears only if the grimoire is already held.
- **§9.1 Ansel's block silently gains `proper`.** The printed block reads `a person, proper`; chapters 3 and 6 printed `a person`, and neither §9.1 nor §9.9 mentions the change ("give Ansel the `wears` line" is all §9.9 says). Typed as printed. (Ambiguity.)
- §9.2: the grimoire's `aka` line and description also change in the printed block (`aka book, margin, note`; new last sentence "Someone has written in one margin."); §9.9 says only "Make the grimoire readable". Typed as printed; the prose in §9.2 does explain both.
- Other-story examples not typed: hat/cap (§9.1), trolley (§9.4), tassel (§9.6), wireless (§9.7).
- Reproduced word for word: §9.1 inventory / take off / wear, §9.2 `examine book`, §9.3 cake, §9.4 rope, §9.5 cup, §9.9 `eat coat`.

## Chapter 10 — Light, dark and the other senses

STATUS: PASS

- §10.2 prints the hand lamp's full block for the first time (kind line, placement, description). It replaced the bare block of DEVIATION 1 entirely, so from here the story contains nothing the book did not print. The chapter presents it as a change ("make the hand lamp a light source"), confirming chapter 6 was meant to have printed the plain block.
- §10.6 "let the Cloister's description warn of the dark at the bottom of the steps": no Chord is printed for the change; the wording ("Worn steps go down into the dark under the hall.") was taken from the §10.1 transcript. (Ambiguity; transcripts then matched.)
- §10.2 quoted error at `259:12`; mine `87:12`, wording identical.
- §10.4 `night-vision` (starts in the Cellar) and §10.5 tin/cheese/clock/sock are other-story examples; not typed.
- All transcripts in §10.1, §10.2, §10.6 reproduced word for word.

## Chapter 11 — Regions

STATUS: PASS

- §11.4/§11.5: the `rooms Stack 1 to 3` group and the `exits` table are printed as two separate fragments of the Hall's block; the chapter does not say in which order they sit or whether a blank line separates them. I put the group first, a blank line, then the table. Compiled. (Ambiguity.)
- §11.2: "The six rooms behind the arch each take `in the Hall` in the same way" — no blocks printed; added `in the Hall` as the first line under each of the six room headers, as the Lodge example shows. Compiled.
- Quoted errors reproduce word for word at other line numbers (§11.2 book `35:3 … line 34`, mine `30:3 … line 29`; §11.7 book `142:3`, mine `102:3`).
- All transcripts in §11.3, §11.5 reproduced word for word.

## Chapter 12 — Ways that are closed, hidden or strange

STATUS: PASS-WITH-ISSUES

- **§12.4 output differs — the hearth is never printed.** Book: `> examine hearth` / `The back of the hearth is a single iron plate, and it does not sit quite square. There is a hand's breadth of darkness down one side.` Actual: `> examine hearth` / `You can't see any such thing.` No `create the hearth` block appears in this chapter or any earlier one (chapter 6 §6.2 only says the story "now does this for … the hearth in the Refectory"). The passage itself works without it. §12.4 says "the hearth's description does the work" of inviting the command; in a reader's story nothing does.
- **§12.2 "The Gallery's description now says, 'To the east a low parapet is all there is between you and the court.'"** The printed Lantern Gallery block shows only the header, `in the Hall` and the `east is deadly` line; the sentence's position in the description is not given, and §12.5's list of things to add does not mention it. I appended it as the description's last sentence. (Ambiguity.)
- **§12.4 Refectory description changes without being called out.** The printed block reads "Three long tables, each with its row of candles, and a hearth…"; §12.5 says only to add "the passage to the Refectory". This is where the candles sentence chapter 9 asked for finally appears in print. Typed as printed.
- §12.1/§12.2 print two separate `define phrases en-US` blocks; §12.5 says "the `define phrases` block" (singular). I typed one block holding both keys, after the last `create` block and before the start block. Compiled. (Ambiguity.)
- §12.1 Bell Stair description gains "and an iron grille stands across its third step"; typed as printed (§12.5 mentions only "the two lines").
- §12.2: took out `up is blocked`, walked up, stepped off, put the line back, as instructed — output matched word for word.
- §12.3 Study/Vault is another story; not typed.
- §12.1 quoted error at `102:3`; mine `95:3`, wording identical.
- Reproduced word for word: §12.1 `up`, §12.2 parapet and ending line, §12.4 `squeeze behind hearth` (dark), `I don't understand that.` in the Undercroft, §12.5 lit-lamp transcript.

## Chapter 13 — States

STATUS: PASS-WITH-ISSUES

- **§13.4 output differs (resolves the chapter 12 ambiguity against my reading).** Book: `…its glass thirty years dirty. To the east a low parapet is all there is between you and the court. The stair goes back down.` Mine: `…its glass thirty years dirty. The stair goes back down. To the east a low parapet is all there is between you and the court.` Chapter 12 never said where the sentence goes; this transcript is the first place its position can be seen. I moved the sentence in the description to the position this transcript shows (before "The stair goes back down."), since the book has now shown it. Not counted as a deviation: it brings the story to the book's printed text.
- §13.1 prints the lens block as header, kind, placement and `states:` only (no description). Read as an excerpt; I added only the `states` line, as §13.8 says, and kept the description.
- §13.4 experiment done as instructed (line added to the start block, played, removed).
- §13.2/§13.4/§13.5/§13.7 errors are quoted from `probe.story`, a file the book never prints; not reproduced. §13.5 sluice and §13.7 dial are other-story examples; not typed.
- Reproduced word for word: §13.8 `read page`.

## Chapter 14 — Reacting to the player: on and after

STATUS: BLOCKED (unblocked by DEVIATION 2)

- **§14.9 "add their eight phrases" — six of the eight are never printed.** The chapter prints `kettle-is-hobbs` (§14.1) and `kindle-learned` (§14.3) as Chord. It prints no `define phrases` entry for `rope-nothing`, `grille-fixed`, `spectacles-given`, `lens-seated`, `library-ink` or `cake-eaten`. With everything the chapter prints typed in:
  ```
  relighting.story:88:5 error [analysis.missing-phrase] Phrase `library-ink` is not declared in en-US.
  relighting.story:174:5 error [analysis.missing-phrase] Phrase `spectacles-given` is not declared in en-US.
  relighting.story:210:5 error [analysis.missing-phrase] Phrase `lens-seated` is not declared in en-US.
  relighting.story:269:5 error [analysis.missing-phrase] Phrase `rope-nothing` is not declared in en-US.
  relighting.story:331:5 error [analysis.missing-phrase] Phrase `cake-eaten` is not declared in en-US.
  relighting.story:344:5 error [analysis.missing-phrase] Phrase `grille-fixed` is not declared in en-US.
  relighting.story:344:5 error [analysis.missing-phrase] Phrase `grille-fixed` is not declared in en-US.
  relighting.story:344:5 error [analysis.missing-phrase] Phrase `grille-fixed` is not declared in en-US.
  compose: relighting.story failed the load-time gates (8 error(s))
  ```
  The story is not gate-clean at the end of the chapter as written.
- **DEVIATION 2.** Added the six keys the compiler names to the `define phrases en-US` block. For five of them the chapter prints the words as story output, and I used exactly those words, each on one line: `rope-nothing` ("Nothing answers. The bell has not been rung in thirty years and sees no reason to start for you."), `grille-fixed` ("It does not so much as rattle."), `spectacles-given` ("Hobb hooks them over his ears … "You were always late.""), `library-ink` ("There is a smell in here … It is wet ink."), `cake-eaten` ("It tastes of caraway, and of being nineteen."). `lens-seated` has no text anywhere in the chapter. An entry with nothing in it is refused (`relighting.story:369:3 error [parse.phrase-entry-empty] Phrase `lens-seated` has no text.`), so its text is the placeholder `(lens-seated)`. Why: the book tells the reader to add eight phrases and prints two.
- **§14.8 output differs.** Book: `> eat cake` / `You eat some of the seed cake.` / `It tastes of caraway, and of being nineteen.` Actual from the cake's starting place on the chair:
  ```
  > eat cake
  (first taking the seed cake)

  You take the seed cake from the chair.

  You eat some of the seed cake.

  It tastes of caraway, and of being nineteen.
  ```
- §14.5 transcript shows `push` and `pull`; `take grille` also answers `It does not so much as rattle.` as the prose says.
- §14.6 lens clause is printed as a bare clause with no block around it; placed after the lens's description, like the other clauses. §14.6 dial clause (`setting to high`) is another story; not typed.
- §14.4/§14.5 errors are quoted from `probe.story`; not reproduced.
- Reproduced word for word (after DEVIATION 2): §14.1, §14.3, §14.4, §14.5, §14.6 spectacles, §14.7 Library, §14.9.

## Chapter 15 — What a clause can say and do

STATUS: BLOCKED (unblocked by DEVIATION 3)

- **§15.7 "add the five new phrases" — none of the five is printed.** The chapter's clauses name `no-such-word`, `lantern-empty`, `cake-watched`, `candles-catch` and `kindle-known`; no `define phrases` entry is printed for any of them. With everything the chapter prints typed in:
  ```
  relighting.story:133:5 error [analysis.missing-phrase] Phrase `no-such-word` is not declared in en-US.
  relighting.story:225:5 error [analysis.missing-phrase] Phrase `no-such-word` is not declared in en-US.
  relighting.story:226:5 error [analysis.missing-phrase] Phrase `lantern-empty` is not declared in en-US.
  relighting.story:265:5 error [analysis.missing-phrase] Phrase `cake-watched` is not declared in en-US — did you mean `cake-eaten`?.
  relighting.story:330:5 error [analysis.missing-phrase] Phrase `kindle-known` is not declared in en-US.
  relighting.story:352:5 error [analysis.missing-phrase] Phrase `no-such-word` is not declared in en-US.
  relighting.story:357:5 error [analysis.missing-phrase] Phrase `candles-catch` is not declared in en-US.
  compose: relighting.story failed the load-time gates (7 error(s))
  ```
- **DEVIATION 3.** Added the five keys the compiler names to `define phrases en-US`. Four use, word for word, the text the chapter prints as story output: `no-such-word` (§15.1), `cake-watched` (§15.2), `candles-catch` (§15.4), `kindle-known` (§15.5). `lantern-empty` has no text anywhere in the chapter; its text is the placeholder `(lantern-empty)`. Why: the book tells the reader to add five phrases and prints none.
- §15.7 "Give the Lantern and the candles `light-source, starts unlit`": for the Lantern no kind line is printed; I wrote `a container, scenery, light-source, starts unlit` following the candles' printed line. The Lantern's clause is printed bare; placed after a blank line under its short facts. Compiled. (Ambiguity.)
- §15.4 "the spectacles need the trait word `wearable` on their kind line": no line printed; wrote `a thing, plural, concealed, wearable`. Compiled. (Ambiguity.)
- §15.4: the candles block is printed here for the first time (chapter 9 asked for it). The `candles` scenery now exists from this chapter on.
- §15.3 cat, and the §15.4 table's page/cat/bun/robe rows, are illustrations; not typed. §15.2/§15.6 errors are from `probe.story`; not reproduced.
- Reproduced word for word (after DEVIATION 3): §15.1 `light lamp` refusal, §15.2 `eat cake`, §15.4 candles and `look`, §15.5 both readings, §15.7 transcript. Eating the cake in the Gate Court works as §15.2 says.

## Chapter 16 — Conditions

STATUS: BLOCKED (unblocked by DEVIATION 4; one instructed step left undone)

- **§16.8 "There are seven new phrases" — none is printed.** With everything the chapter prints typed in:
  ```
  relighting.story:204:5 error [analysis.missing-phrase] Phrase `grimoire-waiting` is not declared in en-US.
  relighting.story:205:5 error [analysis.missing-phrase] Phrase `grimoire-filling` is not declared in en-US.
  relighting.story:383:5 error [analysis.missing-phrase] Phrase `page-blank` is not declared in en-US.
  relighting.story:384:5 error [analysis.missing-phrase] Phrase `hush-known` is not declared in en-US.
  relighting.story:385:5 error [analysis.missing-phrase] Phrase `hush-learned` is not declared in en-US.
  compose: relighting.story failed the load-time gates (5 error(s))
  ```
- **DEVIATION 4.** Added the five keys the compiler names. Four use the chapter's printed story output word for word: `grimoire-waiting`, `grimoire-filling` (§16.5/§16.6), `page-blank`, `hush-learned` (§16.6). `hush-known` has no text anywhere; placeholder `(hush-known)`. Why: the book tells the reader to add seven phrases and prints none.
- **§16.8 "give the unbind page its states and its clause in place of `with text`" — the unbind page's clause is never printed.** §16.4 says only "The unbind page under the candles gets the same `states` line". No reading clause for the unbind page appears in the chapter (the hush page's does). I added `states: faded, legible, learned` and removed `with text` and its string, as instructed; the clause could not be added. Result: the story is gate-clean with five phrases, not seven (the two the unprinted clause would presumably name are never referenced), and
  ```
  > read unbind page
  (first taking the unbind page)

  Taken.

  The unbind page reads:
  ```
  with nothing after it. The unbind page can never reach `learned` in a reader's story. Not invented; later chapters that need it will be noted.
- §16.8 "Add the two `define condition` lines near the top of the file, after the header": placed directly after the `story` block, before the regions. Compiled.
- §16.4 hush page: block and clause are printed separately; clause placed after the description. §16.6 `each` block added to the kindle page's existing clause as printed.
- §16.1 `one chance in 3` (rooks) and §16.2 jar/hat/coin are illustrations; not typed.
- Reproduced word for word (after DEVIATION 4): §16.5 `examine grimoire`, §16.6 both `read hush page` transcripts and the second `examine grimoire`.

## Chapter 17 — Choosing between outcomes

STATUS: BLOCKED (unblocked by DEVIATION 5; one instructed step left undone)

- **§17.7 "There are eight new phrases" — none is printed.** With everything the chapter prints typed in:
  ```
  relighting.story:295:7 error [analysis.missing-phrase] Phrase `rope-dust` is not declared in en-US.
  relighting.story:297:7 error [analysis.missing-phrase] Phrase `rope-patience` is not declared in en-US.
  relighting.story:329:9 error [analysis.missing-phrase] Phrase `cistern-frozen` is not declared in en-US.
  relighting.story:331:9 error [analysis.missing-phrase] Phrase `cistern-thawing` is not declared in en-US.
  relighting.story:333:9 error [analysis.missing-phrase] Phrase `cistern-running` is not declared in en-US.
  relighting.story:442:7 error [analysis.missing-phrase] Phrase `grille-memory` is not declared in en-US.
  relighting.story:444:7 error [analysis.missing-phrase] Phrase `grille-cold` is not declared in en-US.
  relighting.story:446:7 error [analysis.missing-phrase] Phrase `grille-enough` is not declared in en-US.
  compose: relighting.story failed the load-time gates (8 error(s))
  ```
- **DEVIATION 5.** Added the eight keys the compiler names. Six use the chapter's printed story output word for word: `rope-dust`, `rope-patience` (§17.4), `cistern-frozen` (§17.3), `grille-memory`, `grille-cold`, `grille-enough` (§17.5). `cistern-thawing` and `cistern-running` have no text anywhere in the chapter; placeholders `(cistern-thawing)` and `(cistern-running)`. Why: the book tells the reader to add eight phrases and prints none.
- **§17.7 "Rewrite the reading clauses of the kindle, hush and unbind pages with `select on`" — the unbind page's clause is not printed here either** (§17.1 prints the kindle page's, §17.2 the hush page's). The unbind page still has no reading clause (see chapter 16). Step not done.
- §17.2 quoted error at `relighting.story:390:9`; mine `406:9`, wording identical.
- §17.3: cistern description shortened and clause added exactly as printed.
- Reproduced word for word (after DEVIATION 5): §17.3 `examine cistern`, §17.4 four pulls, §17.5 four examinations; kindle and hush pages behave as in chapter 16.

## Chapter 18 — Counting, scoring and ending

STATUS: BLOCKED (unblocked by DEVIATION 6; one instructed step left undone)

- **§18.8 "There are four new phrases" — none is printed.** With everything the chapter prints typed in:
  ```
  relighting.story:212:5 error [analysis.missing-phrase] Phrase `grimoire-half` is not declared in en-US.
  relighting.story:251:5 error [analysis.missing-phrase] Phrase `lens-shatters` is not declared in en-US — did you mean `lens-seated`?.
  relighting.story:254:5 error [analysis.missing-phrase] Phrase `lantern-lit` is not declared in en-US.
  relighting.story:313:5 error [analysis.missing-phrase] Phrase `rope-sore` is not declared in en-US.
  compose: relighting.story failed the load-time gates (4 error(s))
  ```
- **DEVIATION 6.** Added the four keys the compiler names. Three use the chapter's printed output word for word: `rope-sore` (§18.1), `lens-shatters`, `lantern-lit` (§18.6). `grimoire-half` has no text anywhere; placeholder `(grimoire-half)`. Also replaced the chapter-14 placeholder for `lens-seated` with the sentence §18.6 finally prints as output ("The lens drops into its seat with a sound like a coin on a counter."). Why: the book tells the reader to add four phrases and prints none.
- **§18.8 "the `raise workings` line in each page's first arm".** Done for the kindle page (§18.3 prints it) and the hush page (§18.2 prints it). The unbind page has no clause to put it in (never printed; see chapters 16 and 17). Step not done for that page.
- §18.3 "The candles get `score supper-lit worth 5` … with an `award` line in the clause that earns it": no lines printed. I put `score supper-lit worth 5` under the candles' placement and `award supper-lit` in their `after the player lighting` clause before the phrase. Compiled; the rank message appeared where §18.4 shows it. (Ambiguity.)
- §18.2 prints a third line for the grimoire's clause (`phrase grimoire-half when workings is at least 2`) that §18.8's list of things to add does not mention. Typed as printed.
- §18.5 prints a description for the Great Lantern for the first time ("A drum of brass and glass…"); §18.8 mentions only "the `after` clause on the Great Lantern". Typed as printed.
- §18.6 done in a copy of the file in another folder, as the book says; start-block lines never entered the project file. With only the three printed start-block lines, the `light lantern` loss matched word for word; with `change the lens to sound` added, the win matched word for word. (Lighting before seating the lens printed my placeholder `(lantern-empty)`.)
- §18.4 quoted error at `19:5`; mine `13:5`, wording identical. §18.1 `counter sips` and §18.7 vial are illustrations; not typed.
- Reproduced word for word (after DEVIATION 6): §18.1 fourth pull, §18.3 `score` (5 out of 25), §18.4 rank line, §18.6 both endings, §18.8 `score` (10 out of 25; the book's block wraps `Second-` / `Year.` across two lines, which I read as a page wrap).

## Chapter 19 — Time

STATUS: BLOCKED (unblocked by DEVIATION 7; two instructed steps left undone)

- **§19.7 "There are eleven new phrases" and "Add the mend page" — none of it is printed.** §19.1 says of the mend page only that it "is declared like the other pages, with the states `faded, legible, learned`, a reading clause and a score of its own"; no block. No phrase entry is printed. With everything the chapter prints typed in:
  ```
  relighting.story:26:7 error [analysis.missing-phrase] Phrase `toll-near` is not declared in en-US.
  relighting.story:28:7 error [analysis.missing-phrase] Phrase `toll-far` is not declared in en-US.
  relighting.story:30:7 error [analysis.missing-phrase] Phrase `toll-count` is not declared in en-US.
  relighting.story:51:5 error [analysis.missing-phrase] Phrase `light-turning` is not declared in en-US.
  relighting.story:53:5 error [analysis.missing-phrase] Phrase `night-falls` is not declared in en-US.
  relighting.story:396:10 error [analysis.unknown-entity] No entity named `mend page`.
  relighting.story:398:5 error [analysis.missing-phrase] Phrase `cistern-gives` is not declared in en-US.
  relighting.story:403:5 error [analysis.missing-phrase] Phrase `cistern-drips` is not declared in en-US.
  relighting.story:510:5 error [analysis.missing-phrase] Phrase `flame-morning` is not declared in en-US.
  relighting.story:511:5 error [analysis.missing-phrase] Phrase `flame-later` is not declared in en-US.
  compose: relighting.story failed the load-time gates (10 error(s))
  ```
- **DEVIATION 7.** (a) Added `create the mend page` / `  a thing` with nothing else (no placement, states, clause, score or description). (b) Added the nine phrase keys the compiler names. Six use the chapter's printed output word for word: `cistern-drips`, `cistern-gives` (§19.1), `light-turning`, `night-falls` (§19.4), `flame-morning`, `flame-later` (§19.5). `toll-near`, `toll-far`, `toll-count` are placeholders `(toll-near)` etc.: §19.2 prints one tolling sentence ("The bell tolls again, and the rooks go up off the roof.") but nothing says which of the three keys it belongs to. (c) Replaced the chapter-17 placeholder for `cistern-thawing` with the sentence §19.1 prints as output ("The ice has gone dark and wet, and stands a finger's width clear of the stone all round."). Why: the book names all of these and prints none.
- **§19.7 "lengthen the rank ladder to four ranks ending at 35" — the fourth rank is never printed** (no name, no thresholds). Not done; the ladder stays at the three ranks of chapter 18.
- **§19.1 mend page's "reading clause and a score of its own" not printed.** Not added. Consequences below.
- **§19.7 output differs.** Book: `You have scored 15 out of 35, earning you the rank of a Second-Year.` Actual after the instructed play (read the page, down to the Undercroft with the lamp lit, cistern thawed): `You have scored 10 out of 30, earning you the rank of a Second-Year.` The maximum is 30 because the mend page's unprinted score is missing; the book's 15 is not reachable by the instructed walk alone in a reader's story (page 5 + thaw 5).
- **§19.1 output differs.** Played as §19.2 and §19.7 direct (read page, `light lamp`, `east`, `down`), the Undercroft arrival is:
  ```
  You can see a crate here.

  The tower bell strikes once, and the sound goes through the stones under your feet.

  Where the lamplight falls on it, the ice in the cistern begins to sweat.
  ```
  and the next turn is:
  ```
  > examine cistern
  A stone cistern sunk in the floor, fed by a lead pipe from somewhere above.

  The ice has gone dark and wet, and stands a finger's width clear of the stone all round.

  The ice in the cistern breaks up all at once. A leaf of paper rides up on the meltwater and slides out onto the flags.

  (toll-near)

  You have risen to the rank of a Second-Year.
  ```
  The book's §19.1 transcript shows neither the timer's `strike` line, nor a tolling line, nor `You have risen to the rank of a Second-Year.` (the `award thaw` takes the score from 5 to 10, which is the Second-Year threshold). The book's transcript can only come from a walk on which the timer was not running, which its own build step does not describe.
- **§19.4 timing differs from the prose.** "At turn fifty the player is warned … Thirty turns after that … Eighty turns is generous". Waiting from the first prompt, the warning prints after the 49th command and the ending after the 79th. Wording of both matches.
- §19.7 header additions: `use chapters` placed after the `use scoring` block; the `when waking expires` and `on every turn` clauses placed at the end of the `story` block (after the prologue), in the order printed. §19.2 shows them with `...` for the rest of the header. Compiled. (Ambiguity.)
- §19.1 "two clauses on the cistern": the printed block shows them with no description and without the chapter-17 `after … examining` clause. Read as an excerpt; I kept the description and the examining clause and put the two every-turn clauses between them. Compiled. (Ambiguity.)
- §19.5: the blue flame is printed here for the first time (chapter 6 said the story already had it).
- §19.3 squib/fuse is an illustration; not typed.
- Reproduced word for word (after DEVIATION 7): §19.2 `light lamp` / `east` timer lines, §19.4 both sequence texts and the ending line, §19.5 both blue-flame examinations. §19.2's tolling line cannot be compared (placeholders).

## Chapter 20 — Phrases

STATUS: BLOCKED (unblocked by DEVIATION 8)

- **§20.7 "add the two new entries `bell-count` and `hobb-deafened`" — `hobb-deafened` is never printed** (`bell-count` is, §20.5). With everything the chapter prints typed in:
  ```
  relighting.story:128:5 error [analysis.missing-phrase] Phrase `hobb-deafened` is not declared in en-US.
  compose: relighting.story failed the load-time gates (1 error(s))
  ```
- **DEVIATION 8.** Added `hobb-deafened` with the sentence §20.7 prints as output ("Hobb has his hands over his ears. He says something, and the bell says something louder."). Why: the book names the entry and does not print it.
- **Update to DEVIATION 7's placeholders (my inference, flagged).** Chapters 20 and 21 print three different tolling sentences as output. §21.1 shows them on consecutive turns in the order "…the rooks go up off the roof." → "The bell tolls. You have stopped counting." → "The tower bell tolls."; chapter 19's clause cycles `toll-near`, `toll-far`, `toll-count`. I assigned `toll-near` = "The tower bell tolls.", `toll-far` = "The bell tolls again, and the rooks go up off the roof.", `toll-count` = "The bell tolls. You have stopped counting." The book never states this mapping.
- §20.7 "Remove `no-such-word` from the `define phrases` block": in a reader's story that entry exists only because of DEVIATION 3 (chapter 15 never printed it). Removed.
- §20.7 "Add the four `define phrase` blocks near the top of the file": §20.1 also prints a plain `define phrase gate-motto` block that §20.4 replaces with the `verbatim` one; the four typed are `no-such-word`, `hobb-saying`, `gate-motto, verbatim`, `grille-across`. Placed after the header, before the counters. Compiled.
- §20.4: the gate is given a description here for the first time ("change the gate's description" — it had none in chapter 6). Typed as printed.
- Reproduced word for word: §20.2 three refusals, §20.3 sayings on re-entering the Lodge, §20.4 `examine gate` with the motto's shape, §20.6 Bell Stair, §20.5 `examine bell` (count differs by turn, as expected), §20.7 Lodge while tolling (which tolling line follows depends on the cycle; accepted item 6).

## Chapter 21 — A thing's own words

STATUS: PASS-WITH-ISSUES

- **§21.1 quoted error is incomplete.** Book prints one diagnostic for `the candles are lit`. Actual (mine at line 528; book `402:35`):
  ```
  relighting.story:528:35 error [parse.predicate] Unknown predicate `are` — expected is, is a, is in, has, holds, wears, feels, knows, or can see/reach.
  relighting.story:528:35 error [analysis.unknown-condition] `are` is not a declared condition or story state.
  compose: relighting.story failed the load-time gates (2 error(s))
  ```
  The second diagnostic is not in the book.
- **§21.6 output differs.** Book: `> examine lens` / `A disc of glass as wide as a cartwheel, ground in rings. A crack runs across it from edge to edge.` and nothing more. Played as instructed ("Take the lit lamp down to the Undercroft and open the crate" — the lamp can only be lit after reading the page, so the bell is tolling by then), a tolling line follows every turn, e.g. `The bell tolls again, and the rooks go up off the roof.` The book's block stops before it.
- §21.1 hand lamp: the `phrase detail` line is printed after the `on … lighting` clause; placed there. Candles and lens blocks are printed without their clauses (candles: `on`/`after lighting`; lens: `after … inserting`); read as excerpts — descriptions cut back and detail phrases added, clauses and `score` line kept. Compiled. (Ambiguity.)
- §21.4 cat is an illustration; not typed.
- Reproduced word for word: §21.1 lamp before and after lighting (with the timer lines), the full §21.1 candles transcript including the three tolling lines and the rank line in the book's order, §21.3 Lodge with Hobb's `present` sentence.

## Chapter 22 — Changing the standard messages

STATUS: PASS

- §22.1 `sharpee messages`: prints `Message catalog: 885 overridable messages (en-US)` and then one JSON document on a single line, `{"schemaVersion":1,"locale":"en-US","messages":[ … ]}`, holding 885 entries. The book says the list "is printed as data for a program to read" and shows single entries; it does not show the heading line or the wrapper. The six entries the chapter quotes (`taking-taken`, `going-too-dark`, `lighting-lit`, `taking-taken-from`, and by name `waiting-time-passes`, `looking-room-dark`) are present with identical id, alias and template.
- §22.10: block positions unstated ("a block at the top level of the file"); the three override blocks and the two phrasebooks were placed after the `define phrase` blocks near the top, waking book first. `kettle-is-hobbs` (printed in chapter 14) and `grille-fixed` (present only through DEVIATION 2) removed from `define phrases`. Compiled. (Ambiguity.)
- §22.5 `override message taking-taken-from` is shown as an example and is not in §22.10's list; not typed. §22.9 `import "books"` is described but not part of the build step; not done. §22.2 error is from `probe.story`; not reproduced.
- Reproduced word for word: §22.2 `down`, §22.3 three waits, §22.4 `take lamp` → `You take it.`, §22.7 both `push grille` answers (and the kettle's two), §22.10 `look`.
- Note for later chapters: from here `Taken.` is `You take it.` in the story.

## Chapter 23 — New verbs

STATUS: BLOCKED (unblocked by DEVIATION 9)

- **§23.13 "add their eleven phrases" — none is printed; and the mending action needs a mend page the book never printed.** With the six action blocks typed as printed:
  ```
  relighting.story:104:3 error [analysis.missing-phrase] Phrase `working-wants-a-thing` is not declared in en-US.
  relighting.story:107:3 error [analysis.missing-phrase] Phrase `nothing-to-mend` is not declared in en-US.
  relighting.story:106:25 error [analysis.unknown-value] `learned` is not a state of mend page or a known trait.
  relighting.story:113:3 error [analysis.missing-phrase] Phrase `working-wants-a-thing` is not declared in en-US.
  relighting.story:116:3 error [analysis.missing-phrase] Phrase `nothing-to-kindle` is not declared in en-US.
  relighting.story:122:3 error [analysis.missing-phrase] Phrase `working-wants-a-thing` is not declared in en-US.
  relighting.story:125:3 error [analysis.missing-phrase] Phrase `nothing-to-hush` is not declared in en-US.
  relighting.story:131:3 error [analysis.missing-phrase] Phrase `working-wants-a-thing` is not declared in en-US.
  relighting.story:134:3 error [analysis.missing-phrase] Phrase `nothing-to-unbind` is not declared in en-US.
  relighting.story:141:3 error [analysis.missing-phrase] Phrase `gnusto-drowned` is not declared in en-US.
  relighting.story:142:3 error [analysis.missing-phrase] Phrase `gnusto-said` is not declared in en-US.
  relighting.story:155:3 error [analysis.missing-phrase] Phrase `remember-nothing` is not declared in en-US.
  relighting.story:150:5 error [analysis.missing-phrase] Phrase `remember-dimming` is not declared in en-US.
  relighting.story:152:5 error [analysis.missing-phrase] Phrase `remember-gnusto` is not declared in en-US.
  relighting.story:154:5 error [analysis.missing-phrase] Phrase `remember-hobb` is not declared in en-US.
  compose: relighting.story failed the load-time gates (15 error(s))
  ```
- **DEVIATION 9.** (a) Added `states: faded, legible, learned` to the bare mend page of DEVIATION 7 (the three state names are the ones §19.1's prose gives). (b) Added the eleven phrase keys. Six use the chapter's printed output word for word: `working-wants-a-thing` (§23.2), `nothing-to-kindle` (§23.6), `gnusto-said` (§23.8), `remember-dimming`, `remember-hobb`, `remember-nothing` (§23.9). Five have no text anywhere and are placeholders: `(nothing-to-mend)`, `(nothing-to-hush)`, `(nothing-to-unbind)`, `(gnusto-drowned)`, `(remember-gnusto)`. Why: the book names eleven phrases and prints none, and its mending action reads a state of a thing it never printed.
- §23.7 "Mending takes the same two extra lines": no block printed for the lengthened mending action; I added `    mend` under `grammar` and `  refuse without target: working-wants-a-thing` in the positions the other three blocks show. Compiled. (Ambiguity.)
- §23.13 "near the top of the file": placed after the phrasebooks, before the counters.
- **Cannot be tested in a reader's story:** `mend` and `unbind` after their pages (the mend page and the unbind page have no reading clause, so neither can become `learned`; see chapters 16, 17, 19). Before the page, all four workings refuse with `no-such-word` variants as §23.4 shows.
- §23.6 `nothing-to-tune`, §23.10 scrawling, §23.11 shouting ("The Relighting does not use this action") are examples; not typed. `shout` → `I don't understand that.` as the book says for a story without it. §23.2/§23.12 errors are from `probe.story`.
- Reproduced word for word (after DEVIATION 9): §23.2 bare `kindle`, §23.3 `hush bell` in the Library, §23.4 `mend lamp`, §23.6 `kindle lamp` / `kindle grimoire`, §23.8 `gnusto` (also `say gnusto`, `gnusto lamp`), §23.9 all four remember/recall lines.

## Chapter 24 — New kinds of thing

STATUS: BLOCKED (gate-clean only through DEVIATION 10; the chapter's build step — winning the game — cannot be done in a reader's story)

- **§24.10 "There are nine new phrases" — none is printed; and "Lamplighter at 50" cannot compile.** With every block and change the chapter prints typed in:
  ```
  relighting.story:13:5 error [analysis.rank-above-max] Rank "Lamplighter" sits at 50, above the 45 points this story declares — no player could reach it.
  relighting.story:103:5 error [analysis.missing-phrase] Phrase `already-burning` is not declared in en-US.
  relighting.story:105:5 error [analysis.missing-phrase] Phrase `kindled` is not declared in en-US.
  relighting.story:109:5 error [analysis.missing-phrase] Phrase `light-needs-the-word` is not declared in en-US.
  relighting.story:128:5 error [analysis.missing-phrase] Phrase `already-whole` is not declared in en-US.
  relighting.story:139:5 error [analysis.missing-phrase] Phrase `already-quiet` is not declared in en-US.
  relighting.story:142:5 error [analysis.missing-phrase] Phrase `bell-hushed` is not declared in en-US.
  relighting.story:150:5 error [analysis.missing-phrase] Phrase `ward-asleep` is not declared in en-US.
  relighting.story:151:5 error [analysis.missing-phrase] Phrase `ward-in-the-bell` is not declared in en-US.
  relighting.story:155:5 error [analysis.missing-phrase] Phrase `ward-lifts` is not declared in en-US.
  compose: relighting.story failed the load-time gates (10 error(s))
  ```
  The story declares 45 points (first-working 5, supper-lit 5, relit 15, thaw 5, made-whole 5, quieted 5, unsealed 5). The other 5 belong to the mend page's "score of its own", which chapter 19 mentioned and never printed.
- **DEVIATION 10.** (a) Added `score mend-read worth 5` to the mend page stub (the name is mine; the book gives none) so that the declared total is the 50 the book's ladder needs. Nothing awards it. (b) Added the nine phrase keys. Six use the chapter's printed output word for word: `kindled`, `already-burning` (§24.1), `light-needs-the-word` (§24.3), `ward-in-the-bell`, `bell-hushed`, `ward-lifts` (§24.7). Three are placeholders: `(already-whole)`, `(already-quiet)`, `(ward-asleep)`. (c) Replaced the chapter-15 placeholder for `lantern-empty` with the sentence §24.4 prints as output. Why: the chapter's own rank ladder and trait clauses do not compile against what the book has printed.
- **§24.10 "The game can be played to its end for the first time" — not in a reader's story.** The walk needs the unbind and mend workings. Their pages have no reading clause in print (chapters 16, 17, 19), so neither can be learned:
  ```
  > read unbind page
  The unbind page reads:
  …
  > unbind grille
  You reach for the word and find only the place where it was.
  …
  > mend lens
  Nothing comes. You would need to read it first.
  > score
  You have scored 20 out of 50, earning you the rank of a Second-Year.
  ```
  The grille cannot be lifted, the roof cannot be reached, and neither Lantern ending can be played. (`up` → `The grille stands across the stair, and there is no way round it.`)
- **How the rest of the chapter was verified (book's own method, not a story change).** In a copy of the file in another folder I added `change the unbind page to learned` and `change the mend page to learned` to the start block — the testing trick §13.4 and §18.6 teach. The project file does not contain those lines. In that copy:
  - §24.1, §24.2, §24.3, §24.4, §24.6 (`mend spectacles`, `mend lens`, `examine lens`), §24.7 (all three lines) reproduce word for word.
  - **§24.10 output differs.** Book ends the winning `kindle lantern` with `You have risen to the rank of a Lamplighter.` before the ending line. Mine prints the kindled and lantern-lit paragraphs and then `[The story has ended. RESTART, RESTORE or UNDO]` with no rank line: the score reaches 45, not 50, because the mend page's award does not exist; the player is already a Journeyman (reached at `mend spectacles`: `You have risen to the rank of a Journeyman.`).
  - Leaving the lens cracked ends with the `lens-shatters` paragraph, as the book says.
  - After the grille lifts, `look` in the Bell Stair prints `…The cloister is south. ` with a trailing space where the marker was (§20.6 warned of this for mid-paragraph markers; here the marker is at the end).
- §24.6 spectacles: the printed block omits the `after the player giving to Hobb` clause; read as an excerpt and kept. §24.5/§24.6 lens: `states` line removed, `mendable` added, `phrase mended` added after the description; detail phrases and the inserting clause kept. (Ambiguity.)
- §24.3: the `wick` trait typed in its second, longer form (with the `lighting` clause). §24.8 burner/cresset/brazier and §24.9 `cold-wick` are examples; not typed.
- §24.10 "Add the five traits above the actions": done.

## Chapter 25 — Bending the standard grammar

STATUS: PASS-WITH-ISSUES

- **§25.7 "Play the winning walk once more with the plain words: `light lamp`, `quiet bell`, `fix spectacles`, `repair lens`" — not possible in a reader's story** for the reason logged at chapter 24 (unbind and mend pages cannot be learned). `light lamp`, `light lamp with taper`, `sit on chair`, `quiet bell` work in the project as it stands. `fix spectacles`, `repair lens` and the win were verified only in the start-block copy described at chapter 24; there every quoted line matched (`quiet bell`, `fix spectacles`, `light lamp` before and after the page, `light lamp with taper`, `sit on chair` / `exit`).
- §25.7 "Add the `remove from action` block, the `extend action kindling` block and the `import` line near the workings": placed the three, in that order, directly after the `define action blessing` block. `synonyms.chord` created beside the story with the printed comment and three blocks. Compiled. (Ambiguity: exact position.)
- §25.1/§25.2 print the `extend action` blocks for mending, hushing and entering as if in the story, and §25.6 then moves them to the fragment; typed only in `synonyms.chord`, as §25.7 says.
- §25.3 quoted error at `192:1`; mine `203:1`, wording identical.
- §25.2 "`sit on chair` / `I don't understand that.`" is the before-state; not separately replayed.

## Chapter 26 — People who act

STATUS: BLOCKED (unblocked by DEVIATION 11)

- **§26.5 "add their six phrases to the phrases block" — five of the six are never printed** (`own-business` is, §26.1). With everything the chapter prints typed in:
  ```
  relighting.story:386:5 error [analysis.missing-phrase] Phrase `wisp-arrives` is not declared in en-US.
  relighting.story:431:5 error [analysis.missing-phrase] Phrase `tamsin-sorts` is not declared in en-US.
  relighting.story:433:5 error [analysis.missing-phrase] Phrase `tamsin-measures` is not declared in en-US.
  relighting.story:440:5 error [analysis.missing-phrase] Phrase `tamsin-at-the-grille` is not declared in en-US.
  relighting.story:442:5 error [analysis.missing-phrase] Phrase `tamsin-tries-the-bar` is not declared in en-US.
  compose: relighting.story failed the load-time gates (5 error(s))
  ```
- **DEVIATION 11.** Added the five keys. Four use the chapter's printed output word for word: `wisp-arrives` (§26.2), `tamsin-sorts` (§26.4), `tamsin-at-the-grille`, `tamsin-tries-the-bar` (§26.4.2). `tamsin-measures` has no text anywhere; placeholder `(tamsin-measures)`. Why: the book names six phrases and prints one.
- §26.1 prints `after the player examining` / `phrase own-business with who = Tamsin Vey` as a bare clause and §26.5 does not list it; the §26.4 transcript shows it on `examine tamsin`, so I put it in Tamsin's block after her description. §26.4.2's second goal (`the-grille`) is also printed bare; placed after `goal rounds` in her block. §26.3's `on every turn` clause placed after the oak press's description; §26.2's `after the player kindling, once` clause placed at the end of the hand lamp's block. All compiled. (Ambiguities.)
- §26.5 "Create Tamsin Vey and the wisp near Hobb": placed directly after Hobb's block.
- §26.1.1 Sam / `define pronouns ey`, §26.2.1 cat and watchman, §26.4.1 Nell are other-story examples; not typed. §26.3 error is from `probe.story`.
- Reproduced word for word (after DEVIATION 11): §26.2 `light lamp` with the wisp and `The wisp follows you.`, §26.3 press transcript, §26.4 Refectory transcript, §26.4.2 the three Tamsin lines at the grille (my arrival was a turn earlier than the book's, so her first line came on the next turn), §26.5 `Tamsin Vey enters from the east.`, §26.6 `talk to hobb` / `Hobb doesn't respond.`

## Chapter 27 — Asking and telling

STATUS: BLOCKED (unblocked by DEVIATION 12; one instructed step left undone)

- **§27.5 "the new phrases" — none is printed.** With everything the chapter prints typed in:
  ```
  relighting.story:421:5 error [analysis.missing-phrase] Phrase `hobb-on-dimming` is not declared in en-US.
  relighting.story:423:5 error [analysis.missing-phrase] Phrase `hobb-on-lantern` is not declared in en-US.
  relighting.story:425:5 error [analysis.missing-phrase] Phrase `hobb-on-tamsin` is not declared in en-US.
  relighting.story:427:5 error [analysis.missing-phrase] Phrase `hobb-on-gnusto` is not declared in en-US.
  relighting.story:429:5 error [analysis.missing-phrase] Phrase `hobb-on-kettle` is not declared in en-US.
  relighting.story:431:5 error [analysis.missing-phrase] Phrase `hobb-what-bell` is not declared in en-US.
  relighting.story:432:5 error [analysis.missing-phrase] Phrase `hobb-on-bell` is not declared in en-US.
  relighting.story:454:5 error [analysis.missing-phrase] Phrase `grimoire-on-gnusto` is not declared in en-US.
  relighting.story:456:5 error [analysis.missing-phrase] Phrase `grimoire-on-kindle` is not declared in en-US.
  relighting.story:438:5 error [analysis.missing-phrase] Phrase `hobb-greets` is not declared in en-US.
  relighting.story:440:5 error [analysis.missing-phrase] Phrase `hobb-greets-again` is not declared in en-US.
  compose: relighting.story failed the load-time gates (11 error(s))
  ```
- **DEVIATION 12.** Added the eleven keys. Eight use the chapter's printed output word for word: `hobb-on-dimming`, `hobb-on-tamsin` (§27.1), `hobb-on-kettle` (§27.1.1), `hobb-what-bell`, `hobb-on-bell` (§27.1.2), `grimoire-on-gnusto` (§27.2), `hobb-greets`, `hobb-greets-again` (§27.3). Three are placeholders: `(hobb-on-lantern)`, `(hobb-on-gnusto)`, `(grimoire-on-kindle)`. Why: the book names the phrases and prints none.
- **§27.5 "the three topic tables" — Tamsin Vey's table is not printed in this chapter.** Hobb's (§27.1, plus the kettle row §27.1.1 and the bell row §27.1.2) and the grimoire's (§27.2) are. §27.3 and §27.6 say "Tamsin has a table" and "Tamsin answers three questions"; no rows are shown. Not added. `talk to tamsin` → `Tamsin Vey doesn't respond.` matches §27.3; her three answers cannot be tested.
- §27.1.1 and §27.1.2 print single rows outside the table; appended to Hobb's table after the four rows of §27.1, in that order. §27.5 "near the people": the tables, greetings and manner placed between Hobb's block and Tamsin's. Compiled. (Ambiguity.)
- §27.5 sequence change ("first step is at turn 70 and its second 40 turns later") made by editing the two numbers in `define sequence the day`; no block printed.
- Greeting order: at the first prompt `talk to hobb` gives the kettle beat and `"It's you," says Hobb. He does not say which you.`; after `goodbye`, `talk to hobb` gives the next beat and `"Still here," says Hobb, of one of you.` Book's §27.3 shows the third beat ("He takes his time…") before "Still here", which depends on how many answers came between; cycle position only.
- §27.1 beats: the book's transcript pairs "He looks at the blue flame…" with the Dimming answer and "He takes his time…" with the Tamsin answer; asked as the first two questions of a session mine pair them with the first and second beats. Cycle position only (accepted item 6).
- Reproduced word for word (after DEVIATION 12): §27.1 both answers, §27.1.1 kettle, §27.1.2 refusal, answer and `Hobb gives the hush page to Ansel.`, the second asking with nothing to give, §27.1.3 override line and the `ask hobb for the kettle` stock line, §27.2 both consult lines, §27.3 `goodbye`, §27.5 `read hush page`.

## Chapter 28 — Conversations with a shape

STATUS: BLOCKED (unblocked by DEVIATION 13; two instructed steps left undone)

- **No phrase the chapter's blocks name is printed.** With everything the chapter prints typed in, the compiler reports 15 `analysis.missing-phrase` errors (14 distinct keys): `hobb-on-last-night`, `tamsin-already-dealt`, `tamsin-no-price-yet`, `tamsin-names-price` (twice), `tamsin-on-brass`, `tamsin-on-brass-again`, `tamsin-on-brass-enough`, `tamsin-shakes` ("— did you mean `tamsin-sorts`?"), `tamsin-shrugs` (same guess), `tamsin-fills-silence`, `tamsin-has-it`, `tamsin-parting`, `tamsin-resuming`, `tamsin-settled`; `compose: relighting.story failed the load-time gates (15 error(s))`. Unlike earlier chapters, §28.7 does not even tell the reader to add phrases.
- **DEVIATION 13.** Added the fourteen keys. Thirteen use the chapter's printed output word for word (§28.1, §28.1.1, §28.2, §28.3, §28.4, §28.5.1, §28.5.2, §28.6). `tamsin-on-brass-enough` has no text anywhere; placeholder `(tamsin-on-brass-enough)`. Why: the chapter's blocks do not compile without them.
- **§28.7 "Add her greetings" — no greetings block for Tamsin Vey is printed** (chapter 27 said she has none; this chapter shows none). Not added.
- **§28.7 "the new rows in both topic tables" — Tamsin's table is only partly printed.** §28.4 prints the `define topics for Tamsin Vey` head with the price row (and no `end topics`), §28.5.1 the brass row, §28.5.3 the deflect row. I assembled those three under the head and closed it with `end topics`. The rows chapter 27 said she already had are still unprinted, including the one §28.1.1's transcript uses:
  - **§28.1.1 output differs.** Book: `> ask tamsin about the porter` / `"He pretends not to see me and I pretend to be quiet. It has worked for eleven years."` / `"The page will keep," says Tamsin Vey. "So will I."`, then `ask tamsin about the stair` → the resuming line, then `ask tamsin about the page` → the price. Actual, with no porter row in print:
    ```
    > ask tamsin about the porter
    Tamsin Vey gives that some thought, and gives it back.

    "Here is my price. Lantern lit or Lantern dark, the brass in the closed wings stays mine to take. Your word on it. Yes or no?"

    > ask tamsin about the stair
    Tamsin Vey gives that some thought, and gives it back.

    > ask tamsin about the page
    Tamsin Vey gives that some thought, and gives it back.
    ```
    i.e. an unknown subject moves the thread on a beat and opens the exchange, and no parting or resuming line appears. Substituting a row that is printed (`brass`) for `porter`, the whole §28.1.1–§28.2 sequence reproduces word for word, including `say maybe` and the conclusion.
- §28.7 "take the `move the unbind page here` line out of the candles": done. (The `candles-catch` text, taken from chapter 15's transcript, still speaks of a leaf of paper under the pricket; the book does not say whether that phrase changes.)
- Block positions unstated; conversation, exchange, Tamsin's table and initiative placed after her `create` block. Hobb's `last night` row appended to his table. (Ambiguity.)
- §28.6: the initiative line came after the first silent turn in mine (`wait` → the hinges line), the book shows it after the second. Wording identical.
- **Still true:** `read unbind page` → `The unbind page reads:` with nothing after it. The page now comes from Tamsin but still has no reading clause in print.
- Reproduced word for word (after DEVIATION 13): §28.1, §28.2 (`yes`, `say maybe`), §28.3 (`no`, concluded thread), §28.4 (all four), §28.5.1 (first and second asking; `brackets` deflects to brass), §28.5.2 (all three).

## Chapter 29 — Inner lives

STATUS: BLOCKED (unblocked by DEVIATION 14)

- **Three phrases the chapter's rows name are never printed.** With everything the chapter prints typed in:
  ```
  relighting.story:447:5 error [analysis.missing-phrase] Phrase `hobb-not-to-strangers` is not declared in en-US.
  relighting.story:546:5 error [analysis.missing-phrase] Phrase `tamsin-on-magic` is not declared in en-US — did you mean `tamsin-on-brass`?.
  relighting.story:547:5 error [analysis.missing-phrase] Phrase `tamsin-on-magic-warmer` is not declared in en-US.
  compose: relighting.story failed the load-time gates (3 error(s))
  ```
  §29.4 does not mention adding phrases at all.
- **DEVIATION 14.** Added the three keys with the text §29.2 and §29.2.1 print as output, word for word. Why: the chapter's rows do not compile without them.
- §29.4 "split her row about magic in two": a reader's story has no magic row to split (Tamsin's chapter-27 table was never printed). Typed §29.2.1's two-phrase row as a new row at the end of her table.
- §29.4 "Give Hobb his `feels` and `knows` lines": §29.3 prints `knows the-last-night, witnessed, certain` as a bare line without saying it is Hobb's; taken as Hobb's and placed under `feels wary of Ansel`. §29.3's `phrase hobb-keeps-it when Hobb knows the-last-night` is a bare illustration with no stated place and is not in §29.4's list; not typed. (Ambiguity.)
- §29.4 "Give Tamsin Vey her `mood` and `feels` lines": from §29.2's prose ("so has Tamsin Vey's, with a `mood suspicious` above it"); no block printed. Wrote `mood suspicious` then `feels wary of Ansel` under her `states` line. Compiled.
- The two `on every turn` clauses are printed bare; placed in Hobb's block after his `phrase present`. `define mood` placed first after the header.
- **§29.4 "play on until you have mended his spectacles" — mending is not possible in a reader's story** (mend page cannot be learned; chapter 24). The spectacles can be given unmended, and the result is the same as the book's transcript, because the clause reads `Hobb wears the spectacles`.
- §29.3.1 Nell/Tom is another story; not typed.
- Reproduced word for word (after DEVIATION 14): §29.1.2 (seen in chapter 27's run), §29.2 refusal, §29.2.1 `give spectacles` / `talk to hobb` / `ask hobb about last night`, both `ask tamsin about magic` answers. The beat sentence in front of each answer differs from the book's by position in the cycle only.

## Chapter 30 — Principles

STATUS: BLOCKED (one instructed step impossible; story gate-clean, no deviation needed)

- **§30.6 "Add a row about his spectacles, so that the player has something to go on" — the row is never printed**, nor its phrase key. Not added. Consequently:
  - **§30.6 output differs.** Book: `> ask hobb about spectacles` / `He turns the kettle a quarter round on its hook, to no purpose.` / `"Lost them in the spring," says Hobb. "Since then a face is a face. There are things I was told that I don't tell to a face."` Actual: `> ask hobb about spectacles` / `Hobb gives that some thought, and gives it back.`
- §30.6 "Change Hobb's `knows` line and add the two lines beneath it": done from §30.3's full block (`knows night, told, certain, confided`, `never betrays a confidence`, `temperament love over duty`). Row changed to §30.1's printed form. `hobb-not-to-strangers` (DEVIATION 14) is now unused; left in the phrases block since the book does not say to remove it.
- §30.4 Cy is another story; not typed.
- Reproduced word for word: §30.2 `ask hobb about last night` → `Hobb gives that some thought, and gives it back.` (after asking about the Dimming); §30.3 `give spectacles to hobb` and the confided answer afterwards.

## Chapter 31 — More than one protagonist

STATUS: BLOCKED (unblocked by DEVIATION 15)

- **Four phrases the chapter's lines name are never printed.** With everything the chapter prints typed in:
  ```
  relighting.story:25:5 error [analysis.missing-phrase] Phrase `hobb-wakes` is not declared in en-US.
  relighting.story:289:3 error [analysis.missing-phrase] Phrase `hobb-stays-put` is not declared in en-US.
  relighting.story:418:5 error [analysis.missing-phrase] Phrase `hobb-finds-page` is not declared in en-US.
  relighting.story:420:5 error [analysis.missing-phrase] Phrase `ansel-again` is not declared in en-US.
  compose: relighting.story failed the load-time gates (4 error(s))
  ```
  §31.6 does not mention adding phrases.
- **DEVIATION 15.** Added the four keys with the text the chapter prints as output (§31.2, §31.3.2, §31.4), word for word. `hobb-wakes` is two paragraphs in the transcript; I wrote it as two paragraphs separated by a blank line inside the entry, which compiled and printed as two paragraphs. Why: the chapter's lines do not compile without them.
- **§31.6 "Read the kindle page and play three more turns" — it takes four.** After `read page`, turns one to three print the timer's `creak`, `sway` and `strike` lines; the role moves to Hobb at the end of the fourth turn (which is what §19.2 describes). The book's §31.2 transcript shows the change with no `strike` line before it.
- **Garbled output if the fourth turn is `look` (platform defect seen while following §31.6 literally).** With `read page`, `light lamp`, `wait`, `light lamp with taper`, `look`:
  ```
  > look
  The Porter's Lodge
  The reading room of Lanternhall, with its desks in rows and its galleries of shelves. The stacks run back to the north, out of the light. The cloister is east.

  Ansel can sees a wisp here.

  On the reading desk Ansel sees a grimoire.

  In the lodge, an old man who was not asleep opens his eyes.

  You are Hobb, and that is the bell. …
  ```
  The Lodge's heading over the Library's description, and "Ansel can sees a wisp here." / "On the reading desk Ansel sees a grimoire." The book says "The platform does not announce the change, and it does not describe the new room"; nothing in it predicts this. With any non-`look` command on that turn the output is as the book shows.
- **§31.2 output differs.** Book: `> inventory` / `Your hands are empty.` Actual, two separate runs: `You aren't carrying anything at all.` and `Your pockets are empty.` The platform appears to vary this message; the book's wording did not come up.
- §31.2 `look` as Hobb: matches the book except that the description ends `…The door to the court is north. ` with a trailing space where the `{hobb-in-doorway}` marker is empty (same effect as chapter 24's grille marker).
- §31.6: Hobb's block edited from §31.1's excerpt — `playable` added after the kind line, `states: dozing, roused, settled` added, `carries the hush page` and `phrase present` removed; `feels`, `knows`, `never`, `temperament` and the two every-turn clauses kept (the excerpt omits them; §31.6 does not say to remove them). (Ambiguity.)
- §31.3.1 "The Lodge's description ends with the marker `{hobb-in-doorway}`": no block printed; marker appended after "north." on the description's last line. Gated phrase placed with the other `define phrase` blocks.
- `examine me` as Hobb prints "The porter of Lanternhall, who was old when you were a student…" — the problem §31.3.1 itself points out and leaves to the reader.
- Reproduced word for word (after DEVIATION 15): §31.2 the change (on a non-`look` turn), §31.3 `take kettle` → `You take it.`, §31.3.2 `north`, §31.4 newspapers and the `look` in the Library; afterwards `ask hobb about the bell` hands over the hush page, and Ansel's `take kettle` is refused again.

## Chapter 32 — Machines

STATUS: BLOCKED (unblocked by DEVIATION 16)

- **§32.6 "four phrases" — none is printed.** With everything the chapter prints typed in:
  ```
  relighting.story:122:7 error [analysis.missing-phrase] Phrase `shutters-shift` is not declared in en-US.
  relighting.story:127:7 error [analysis.missing-phrase] Phrase `gear-ticks` is not declared in en-US.
  relighting.story:133:7 error [analysis.missing-phrase] Phrase `shutters-open` is not declared in en-US.
  relighting.story:152:5 error [analysis.missing-phrase] Phrase `lantern-shuttered` is not declared in en-US.
  compose: relighting.story failed the load-time gates (4 error(s))
  ```
- **DEVIATION 16.** Added the four keys with the text §32.3, §32.4 and §32.5 print as output, word for word. Why: the book names four phrases and prints none.
- **§32.6's play step needs the roof, which a reader's story cannot reach** (chapter 24). Verified in a copy using the start-block trick of §13.4/§18.6 (`change the iron grille to lifted`, `change the kindle page to learned`, `move the lens to the Lantern Gallery`, `change the lens to sound`). There every transcript in §32.3, §32.4 and §32.5 reproduced word for word: first turn, guarded turn with the seat empty (`You turn the shutter crank.` only), `push crank` with the pawl, the turn to `drawn`, `kindle lantern` refused while shuttered, and the win once drawn.
- §32.6 "the machine near the top of the story": placed above the traits. Shutter and crank blocks placed before the oak press. (Ambiguity: position.)

## Chapter 33 — Vehicles

STATUS: BLOCKED (unblocked by DEVIATION 17)

- **§33.6 "one phrase" — not printed.** With everything the chapter prints typed in:
  ```
  relighting.story:389:3 error [analysis.missing-phrase] Phrase `lens-too-wide` is not declared in en-US.
  compose: relighting.story failed the load-time gates (1 error(s))
  ```
- **DEVIATION 17.** Added `lens-too-wide` with the sentence §33.1 prints as output. Why: the book names the phrase and does not print it.
- **§33.6 "Take the lens from the crate and try the stair with it" — in a reader's story the answer is the grille's, not the lens's.** Actual: `> up` / `The grille stands across the stair, and there is no way round it.` The first `blocked` line wins while the grille stands, and the grille cannot be lifted (chapter 24). §33.1's `The lens is as wide as a cartwheel…` appears only with the grille lifted; confirmed word for word in a start-block copy.
- **"…before and after the grille is lifted" — only "before" is possible in the project.** Before: `put lens in hoist` → `You put the lens in the book hoist.` / `The book hoist pulls away.`; the hoist and lens are then found in the Library, as §33.2.1 says. After (start-block copy): hoist and lens are in the Lantern Gallery; `put lens in lantern` reproduces the book's block including `The book hoist pulls away.`
- **§33.2.1 / §33.2.2 output differs in the order of the room lists.** Book: `You can see a crate and a wisp here.`; `You can see a book hoist and a wisp here.`; `You can see a book hoist, a crate, and a wisp here.` Mine: `You can see a wisp, a crate, and a mend page here.`; `You can see a wisp and a book hoist here.`; `You can see a wisp, a crate, a book hoist, and a mend page here.` The words are the same things in a different order (the mend page is there because the cistern had thawed on my walk). The order appears to follow where blocks sit in the file, which the book has never specified for a reader (see chapter 5 onward).
- **Third-person lines on the turn the role changes (seen while walking to the hoist).** If the turn on which the waking timer expires is `enter hoist`, the reply is `Ansel gets into the book hoist.` and, further down, `Ansel has risen to the rank of a Second-Year.`, followed by the Hobb passage. Same family as the `look` garbling logged at chapter 31; the book's build steps for chapters 32–33 do not warn that the Hobb scene will interrupt the walk.
- §33.6 sequence change ("at turn 100 and 60 turns later") made by editing the two numbers; hoist block placed before the oak press. §33.3–§33.5 tram, balloon, cart, barge are other-story examples; not typed.
- Reproduced word for word: §33.2.1 `put lens in hoist`, §33.2.2 `enter hoist` / `In the book hoist you see Ansel.`, the Gallery `put lens in lantern` block (copy).

## Chapter 34 — Open water and open ground

STATUS: BLOCKED (unblocked by DEVIATION 18)

- **Two phrases the chapter's lines name are never printed.** With everything §34.8 lists typed in:
  ```
  relighting.story:386:3 error [analysis.missing-phrase] Phrase `water-gate-shut` is not declared in en-US.
  relighting.story:801:5 error [analysis.missing-phrase] Phrase `beacon-lit` is not declared in en-US.
  compose: relighting.story failed the load-time gates (2 error(s))
  ```
  §34.8 does not mention adding phrases.
- **DEVIATION 18.** Added `beacon-lit` with the paragraph §34.7 prints as output, and `water-gate-shut` as the placeholder `(water-gate-shut)` (no text anywhere). Why: the chapter's lines do not compile without them.
- **§34.8 "Win the game as far as the roof" — not possible in a reader's story** (chapter 24). In the project the water gate stays shut: `> north` in the Undercroft → `(water-gate-shut)`. The crossing was verified in a start-block copy (grille lifted, kindle page learned, sound lens on the roof), where the story reached `awake`, the gate opened, and the skiff sailed to the Beacon Isle.
- **§34.5 output differs — `beacon-near` is not part of what §34.8 tells the reader to add.** The book's mid-crossing `look` ends with `The rock comes up out of the dusk ahead, and on it a pole with a basket at the top, black against the last of the sky.` That sentence can only come from §34.4's bare clause `on every turn while the skiff is within 2 of the Beacon Isle, once` / `phrase beacon-near`, which is printed as an illustration with no owner or place and is absent from §34.8's list; its phrase text is not printed as Chord either. Not typed; the line does not appear in mine.
- **§34.7 output differs.** Book ends `kindle beacon` with `You have risen to the rank of a Lamplighter.` Mine prints the two paragraphs and then `[The story has ended. RESTART, RESTORE or UNDO]`. (In the copy the score was low because of the start-block shortcut; but in any reader's story the maximum reachable is 45 of 50 — the remaining 5 belong to the unprinted mend page — so the Lamplighter line at 50 cannot appear.)
- **§34.5 "The player steps out onto the rock."** After `The skiff arrives at the Beacon Isle.`, `look` shows `Beacon Isle` … `You can see a skiff here.` / `In the skiff you see Ansel.` — the player is still aboard. `kindle beacon` works from the skiff. If the sentence describes something the platform does, it does not; if it is advice to the player, no command is given.
- §34.8 "adjust the two scores": Lantern `relit` 15 → 10; the beacon's `answered worth 5` comes with its printed block. Declared total is 50 only because of DEVIATION 10's `mend-read`.
- §34.2 `west is blocked: lake-edge`, §34.3 raft, §34.4 `isle-near`/`isle-far`, §34.6 bottle are illustrations; not typed. Header `use` lines added after `use chapters`; new blocks placed before the book hoist; `crossing` added as the last row of `define chapters`.
- Reproduced word for word (copy): §34.4 first `look` on the Mere (bands and bearings), §34.5 `enter skiff`, `steer east`, `make sail`, `The skiff arrives at the Beacon Isle.`, §34.7 kindled + beacon-lit paragraphs. Crossing took four turns under sail after `make sail`; the book shows fewer `wait`s in its excerpt.

## Chapter 35 — The opt-in systems

STATUS: PASS-WITH-ISSUES

- Two separate stories, each in a folder of its own: `~/repos/cellar/cellar.story` and `~/repos/yard/yard.story`. Nothing added to The Relighting.
- **§35.5 "complete stories once each has a room and a player" — neither is printed.** The book gives no room block, no player and no start block for either example. I added the least Part I teaches: `create the Cellar, a room` (resp. `create the Yard, a room`), a `create Ansel` / `a person` / `playable` / `starts in the …` block, and the `before the game starts` block. The player's name is mine to choose and the book does not give one; I reused Ansel. (Ambiguity; both compiled.) Each room has no description, so each check prints a warning the book does not show, e.g. `cellar.story:8:8 warning [analysis.room-no-description] `the Cellar` has no description, so LOOK there shows only its name.` before `compose: Chord 4.0.3 — cellar.story is gate-clean (--check: IR not emitted)`.
- §35.5 prints only `sharpee compose cellar.story --check`; the Yard's equivalent (`sharpee compose yard.story --check`) is left to the reader.
- **§35.2 output differs.** Book:
  ```
  > attack rat
  You land a solid blow on the rat, dealing 1 damage!

  > take poker
  Taken.

  > attack rat with poker
  You have slain the rat!
  ```
  Actual, first play:
  ```
  > attack rat
  You swing at the rat but miss!

  > take poker
  Taken.

  > attack rat with poker
  You swing at the rat but miss!
  ```
  The book says the roll "comes from the story's seeded random numbers, so a test tree that pins a fight sees the same fight every time"; the fight is indeed the same on every run here (three runs: miss, `Taken.`, miss, then a third attack `You have slain the rat!`, then `The rat is already dead.`), but it is not the book's fight: the book's first blow lands for 1 damage and the first poker blow kills.
- **§35.3 timing differs.** Book: `You could eat.` after the second `wait`, `You are hungry now…` after the fourth, death when "the meter reaches nine". Actual: `You could eat.` after the first `wait`, `You are hungry now, and thinking about the loaf.` after the third, and `You have starved to death.` + `[The story has ended. RESTART, RESTORE or UNDO]` after the eighth. Every rung arrives one turn earlier than the book's transcript. Wording identical. (Same one-turn offset as the day sequence in chapter 19.)
- §35.3.1 `use hunger, announce silent` is described, not part of the build; not tried.

## Chapter 36 — Sound, music and pictures

STATUS: BLOCKED (unblocked by DEVIATION 19)

- **One phrase the chapter's clause names is never printed.** With everything §36.10 lists typed in:
  ```
  relighting.story:628:5 error [analysis.missing-phrase] Phrase `wisp-flinches` is not declared in en-US.
  compose: relighting.story failed the load-time gates (1 error(s))
  ```
- **DEVIATION 19.** Added `wisp-flinches` with the sentence §36.3 prints as output. Why: the chapter's clause does not compile without it; §36.10 does not mention a phrase.
- §36.10 "Copy the `assets` folder from the companion folder `chapter-36`": fetched only `chapter-36/assets/` from the address the book prints (`audio/catch.mp3` 5,492 bytes, `audio/lapping.mp3` 52,292, `audio/toll.mp3` 16,999, `img/lantern-lit.png` 123,926) into `relighting/assets/`. Nothing else in the companion folder was opened. (Accepted item 2.)
- §36.10 "the five declarations at the top of the story": taken to be `tolling`, `lapping`, `lantern-lit-picture` (§36.1), `catch` (§36.4, block form) and `prising` (§36.5, block form, no file). The chapter also prints declarations for a gramophone example (§36.8); the count of five is what told me which were meant. (Ambiguity.)
- §36.5 grille clause, §36.6 skiff clauses, §36.7 `show image` / `hide image` lines: each printed inside an excerpt of its block; added to the existing blocks without removing what the excerpts omit. §36.3 wisp: `listener` added to the kind line and the clause added after the description.
- §36.8/§36.9 gramophone, curtains, `client has` are another story; not typed.
- Reproduced word for word (after DEVIATION 19): §36.3 the change to Hobb with the wisp's sentence after `The tower bell tolls.`; §36.4 `light lamp` ending `The wick takes with a small dry sound, like a page turned.`; §36.5 in the Bell Stair `Tamsin Vey pushes the iron grille.` / `Iron shrieks on iron, close by, and stops.`, and waiting in the Library `Somewhere in the Hall, iron complains about iron.`
- §36.6/§36.7 (skiff bed, Lantern picture) cannot be reached in a reader's story (chapter 24); whether the page loads the recordings and the picture is checked under chapter 37.

## Chapter 37 — The page the player sees

STATUS: PASS-WITH-ISSUES

- Environment note: playwright and Chromium were not on the box; installed into the scratchpad (outside the project). The page was served with the book's `npx serve dist/web/relighting` (it printed `Accepting connections at http://localhost:3000`) and driven with playwright (headless Chromium).
- **§37.9 "one `emit` line to each of the four pages' `on the player reading` clauses" — only the kindle page's line is printed (§37.4), and two of the four pages have no such clause in a reader's story.** Kindle: typed as printed. Hush: no line printed; I wrote `emit relighting-working-learned with working "hush" and gloss "quiets a thing"` in its first arm, taking the two strings from §37.4's panel listing (ambiguity; compiled). Unbind and mend: no reading clause exists to hold a line (chapters 16, 17, 19); not done. The four-line panel of §37.4 can therefore never appear; at most two lines can.
- **§37.1 header block shows `story-version: 0.7.0`; no chapter told the reader to raise it past 0.4.0.** Chapter 2 said the middle number rises with each Part, and chapters 5, 13 and 20 said so explicitly; chapters 26, 32 and 36 (first chapters of Parts V–VII) did not. §37.9 lists only "the four client fields". Left at `0.4.0`; the page shows `Story v0.4.0`.
- **§37.2 "Turn the sound on before you kindle the lamp" — the page has no visible control for it.** The Settings menu holds one entry, `Theme ▸` (Classic, Paper, Modern Dark, as the book says). File holds Save Game…, Restore Game…, Restart, Reset Story Data…, Quit; Help holds Commands…, About…. The book names no control. The recordings were requested by the page without any switch being touched (below).
- §37.2 `sharpee build relighting.story`: output has the book's lines in the book's order (`Minted the story's ifid…`, `Validated … (gate-clean) — source not shipped`, `Story IR → dist/relighting.ir.json`, …, `Wired 2 theme(s): paper, modern-dark`, `Copied relighting.css`, `Copied assets/ (2 entries)`, `Build complete!`, `Output: dist/web/relighting/`, `To test locally:` / `npx serve dist/web/relighting`). Sizes and timing differ (accepted item 3). `relighting.config.json` was written beside the story.
- **What the page did (playwright):**
  - Opened with title `The Relighting`, the prologue, the header lines and the Lodge, `data-theme="paper"`; all stylesheets and `game.js` returned 200; no console errors.
  - Played to the Library and `read page`: the side column appeared with `workings` / `kindle: wakes a flame`, in an element with id `channel-panel-workings` — as §37.4 and §37.7 say.
  - `light lamp`: the page requested `audio/catch.mp3` (HTTP 206). When the bell began: `audio/toll.mp3` (206). No failed requests, no page errors.
  - Theme changed to Modern Dark from Settings → Theme, page reloaded: still `modern-dark`; `localStorage` holds `relighting-theme` = `modern-dark`, beside `relighting-save-autosave` and `relighting-saves-index` — as §37.9 says.
  - Picture and sound bed (not reachable in the project; checked in a start-block copy built and served separately): after `kindle lantern` the page requested `img/lantern-lit.png` (200) and shows it in `#sharpee-media` (960×600, loaded); after `enter skiff` it requested `audio/lapping.mp3` (206). No errors.
- §37.1 errors (`unknown client 'terminal'`, `Unknown built-in theme "parchment"`) need deliberate breaks the chapter does not ask for; not tried. §37.5/§37.6 harbour channels are examples; not typed.
- `browser/relighting.css` typed as printed (the PDF shows the rule bodies without indentation; indented two spaces).

## Chapter 38 — Test trees

STATUS: PASS-WITH-ISSUES

- §38.2/§38.3: the PDF prints the JSON with no indentation at all, while the prose says "The indentation is two spaces … A tree file laid out any other way is refused" and §38.10 says "laid out exactly as they are printed here". Typed with keys in alphabetical order, two-space indentation, one list element per line; accepted by the runner. A file typed literally as printed (no indentation) would be refused. (Ambiguity; the refusal message itself matched the book word for word when I flattened one file: `test: relighting.tests/ has files not in canonical form (re-save them from the Testing tab):` / `  thecake1.json`.)
- **§38.10 "Run `sharpee test .` after each one" — the run after the second segment fails.** With `manifest.json`, `mainline.json` and `onward01.json` in the folder (before `thecake1.json` exists):
  ```
  test: relighting.tests/: segment 'onward01' continues 'mainline', whose last card is not a fork (no branch descends from it)
  ```
  exit status 2. The book shows no output for this intermediate state and does not warn that a lone ordinal-0 continuation is refused. Once `thecake1.json` is added the tree runs.
- **§38.3 skip cards.** With the four skip cards of §38.3 the report is `✓ opening-lodge` / `1 card passing, 1 assertion passing`; the `--json` record for the opening card says `"skipped":false`. The book says a skipped card "is played and nothing is checked" and "is not counted"; the opening card with `"skip": true` was counted as a pass.
- **§38.6 failure wording differs.** Book, for the `take lamp` card "made to expect `Taken.`": `✗ opening-lodge — take lamp: Output does not contain "Taken."`. The card as §38.5 prints it uses `exact`; changing its text to `Taken.` gives `✗ opening-lodge — take lamp: Output did not match expected` / `    You take it.` The book's wording belongs to a `contains` assertion, which is not the card it printed. Counts differ accordingly only because my tree by then had the second line (`5 cards passing, 8 assertions passing, 1 card failing, 1 assertion failing`).
- §38.4 `sharpee test . --json --capture-output`: the `take lamp` record matches the book's field for field (`"seq":4`, `"cardId":"card0003"`, `"actualOutput":"You take it."`, `"turn":2`), timing aside.
- §38.6: `Test tree: relighting.tests/ (seed 42, 1 line(s))` / `✓ opening-lodge` / `3 cards passing, 4 assertions passing` — word for word. §38.7: `(seed 42, 2 line(s))`, `✓ opening-lodge`, `✓ lodge · eat cake` — word for word. Every run also prints `Loading story from: …` first and, after the cards, the derived-test report.
- §38.10 "change the phrase the seed cake's refusal prints, run the tree, and read the failure": `✗ lodge · eat cake — eat cake: Output does not contain "You find you cannot."` with the story's new sentence beneath, exit status 1; mended, the tree passed again (`6 cards passing, 9 assertions passing` / `6 commands (6 authored + 0 replayed), 1 restored at a fork`).
- **§38.9/§38.10 the full tree does not pass against a reader's story.** Replaced `relighting.tests/` with the folder from the companion's `chapter-38` (11 files; only that folder was fetched — the companion's story file was not opened). Result:
  ```
  Test tree: relighting.tests/ (seed 42, 7 line(s))

  ✗ opening-lodge — ask hobb about spectacles: Output does not contain "There are things I was told that I don't tell to a face."
      Hobb gives that some thought, and gives it back.
  ✓ refectory · no
  ✓ library · east
  ✓ library · wait
  ✗ undercroft · put lens in hoist — up: Output does not contain "Lantern Gallery"
      The grille stands across the stair, and there is no way round it.
  ✗ undercroft · drop lens — up: Output does not contain "Lantern Gallery"
      The grille stands across the stair, and there is no way round it.
  ✓ undercroft · up
  128 cards passing, 190 assertions passing, 55 cards failing, 85 assertions failing
  182 commands (182 authored + 0 replayed), 6 restored at a fork
  ```
  exit status 1, and at the end `Endings reached: 0 / 3` (book: `2 / 3`), `Rooms entered: 13 / 13` (same), `Derived rule tests (ADR-356): 123 branches` (book counts 134). Book: `183 cards passing, 275 assertions passing`. The first failure is the spectacles row chapter 30 never printed; the other two are the grille that cannot be lifted because the unbind page's clause was never printed. This is the measure of the gap between the story the book prints and the story its tree tests.
- The seven line names match the book's list exactly (`opening-lodge`, `refectory · no`, `library · east`, `library · wait`, `undercroft · put lens in hoist`, `undercroft · drop lens`, `undercroft · up`).
- Not tried (accepted item 4): the command line has no recorder.

## Chapter 39 — Claims

STATUS: PASS

- §39.11 "Start from the folder `chapter-38`": fetched the companion's `chapter-38` folder from the address the book prints into `~/repos/chapter-38` (story, `synonyms.chord`, `relighting.config.json`, `browser/relighting.css`, `assets/`, `relighting.tests/`) and worked there (accepted item 2). The reader's own project in `~/repos/relighting` was not used for this chapter and was not changed by it. Nothing in the companion story was read to settle anything about earlier chapters.
- In that folder, on this interim release, `sharpee test .` gives the book's §38.9 report word for word: seven `✓` lines, `183 cards passing, 275 assertions passing`, `182 commands (182 authored + 0 replayed), 6 restored at a fork`, `Branches exercised: 53 / 134`, `Endings reached: 2 / 3` with `relighting.story:314 · night-falls (lose)`, `Rooms entered: 13 / 13`. (Compare chapter 38's entry for the same tree against the reader's story.)
- §39.1 `sharpee claim winning1` → the "no line" list, word for word, exit status 2. `sharpee claim thelodge --at 82` → the book's ten lines, then twenty-three more, then `Lock one with: sharpee claim thelodge "<fact>" --at 82`.
- §39.2 lock with `--name "the ward on the stair can be lifted"`: output, `relighting.claims.chord`, the manifest's `claims` key and the `locks` key on card `b7wicd1b` all match the book word for word.
- §39.5 report: `claims: 1 of 1 held (seed 42)` / `0 walks` / `HELD …` / `lock … — held there` — word for word.
- §39.7 hand-written `the story can be won` claim and its lock on card `bjhmo3xt`: `claims: 2 of 2 held (seed 42)` and both HELD/lock lines — word for word.
- §39.8/§39.11 second cake claim by hand: `claims: 3 of 3 held (seed 42)` / `1 walk` / `… 17 states, 20 commands, stopped: all-claims-settled` / `HELD  the cake can be eaten — not reached by any line; by walk at depth 3: take seed cake / north / eat seed cake` — word for word with §39.11's final block. With `needs rooms: the Lodge` alone: `claims: 2 of 3 held, 1 unproven`, `161 states, 239 commands, stopped: max-depth-reached`, `UNPROVEN  the cake can be eaten — …` (numbers as in §39.8). Restored afterwards.
- §39.6/§39.11 `change it to lifted` removed from the `ward` trait: `✗ opening-lodge — unbind grille: State assertion failed: the iron grille is lifted. the iron grille is "standing", expected "lifted"` with the prose line under it, exit status 1, and `lock "the ward on the stair can be lifted" … — NOT held there: the iron grille is standing` — word for word. Because my file by then held three claims, the report also showed `kindle beacon: lock "the story can be won" not held here: the story has not ended`, a second two-minute walk, and `claims: 1 of 3 held, 2 unproven`; walk counts differ from the book's (`8692 states, 47290 commands` against the book's `11612 states, 63603 commands`) because the walk is stopped by the clock, as the book says. Line put back; `claims: 3 of 3 held (seed 42)` again.
- Ambiguity: §39.11 lists three things to do and does not mention §39.7's winning claim, which §39.7's own text tells the reader to add; I added it in chapter order. §39.4's `claims.state-unknown` error and §39.7's canonical-form refusal need mistakes the chapter does not ask for; not tried.
- Not tried (accepted item 4): locking after a line's first `put`; a `needs verbs` line naming `put`.

## Chapter 40 — Publishing

STATUS: PASS-WITH-ISSUES

- "Your own copy" taken as the reader's project, `~/repos/relighting`. Because chapter 39 had to start from the companion's `chapter-38`, the same steps were repeated in `~/repos/chapter-38` to see the outputs the book quotes. (Ambiguity: after chapter 39 the book does not say which folder "your own copy" is.)
- **§40.2 "`story-version:` has stood at `0.7.0` since Part VII" — not in a reader's story**, where it stood at `0.4.0` (see chapter 37). Set to `1.0.0`; `publish-source: yes` added beneath it.
- §40.1: the header did gain `ifid: 30764DF9-5391-4088-BC2F-75499B623D1A` under `id:` at chapter 37's first build, matching `relighting.config.json`, as the chapter says (chapter 37 itself did not mention that the build edits the story file). `sharpee ifid generate` printed one identifier (`26A6E86C-5AB2-41D3-9A43-47376A58D87A`); value belongs to the run.
- **§40.4 "A story that is about to go to strangers should hold every claim" / `claims: 3 of 3 held (seed 42)` — the reader's project has no claims and its tree fails.** In `~/repos/relighting`, `sharpee test .` exits 1 with `128 cards passing, 190 assertions passing, 55 cards failing, 85 assertions failing` (same three `✗` lines as chapter 38) and prints no claims section, because chapter 39's claims were made in the companion folder. In `~/repos/chapter-38`: `183 cards passing, 277 assertions passing` and `claims: 3 of 3 held (seed 42)`, as the book shows (277 rather than 275 because of the two locks).
- §40.4 `sharpee publish relighting.story` (both folders): output matches the book's block line for line, including `✓ Validated relighting.story (gate-clean) and shipped its source (`publish-source: yes`)`, `✓ Shipped 1 import fragment(s) → imports.json`, the `IFID:` and `Output: dist/relighting.zip (0.8 MB)` lines and `Unzip anywhere and open index.html, or upload the zip to itch.io.` One difference in shape: between `Bundling game.js...` and `✓ Built game.js` the command prints `dist/web/relighting/game.js  2.4mb ⚠️` and `⚡ Done in 43ms`, which the book's publish block omits (its build block in §37.2 has them). Sizes aside (accepted item 3).
- §40.5: `dist/relighting.zip` holds exactly the fourteen files the book lists, with `index.html` at the top; no `game.js.map`, no `index-testing.html`, no test tree, no claims file.
- **§40.7 "play the story you wrote from the lodge to the beacon, as a stranger will" — not possible with the story a reader wrote.** The reader's zip, unzipped into an empty folder, served with `npx serve` and opened with playwright, loads without errors, shows `Story v1.0.0`, shows the `workings` panel with `kindle: wakes a flame`, and requests `audio/catch.mp3` and `audio/toll.mp3` (206). It cannot be played past the grille (chapter 24). The companion-derived zip, served the same way and fed the 138 commands of its tree's winning line, ends at `BEACON ISLE`, `Score: 50 | Turns: 139`, with `You have risen to the rank of a Lamplighter.`, the four-line `workings` panel exactly as §37.4 prints it, and requests for `audio/catch.mp3`, `audio/toll.mp3`, `img/lantern-lit.png` (200) and `audio/lapping.mp3`; no failed requests, no page errors.
- §40.4's refusal for a story with no identity and §40.5's `--out` / `--no-menu` are described, not instructed; not tried.

## Appendices A–G

Read, not run (accepted item 7).

## Summary

### Chapters by status (40 chapters)

| Status | Count | Chapters |
|---|---|---|
| PASS | 10 | 1, 2, 3, 4, 5, 8, 10, 11, 22, 39 |
| PASS-WITH-ISSUES | 9 | 7, 12, 13, 21, 25, 35, 37, 38, 40 |
| BLOCKED | 21 | 6, 9, 14, 15, 16, 17, 18, 19, 20, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36 |

(Preface and "How to read this book": PASS, read only.)

### DEVIATION entries: 19

| # | Chapter | What was added to keep the story gate-clean |
|---|---|---|
| 1 | 6 | bare `create the hand lamp` (superseded when chapter 10 printed the block) |
| 2 | 14 | 6 phrase keys (5 from transcripts, 1 placeholder) |
| 3 | 15 | 5 phrase keys (4 from transcripts, 1 placeholder) |
| 4 | 16 | 5 phrase keys (4 from transcripts, 1 placeholder) |
| 5 | 17 | 8 phrase keys (6 from transcripts, 2 placeholders) |
| 6 | 18 | 4 phrase keys (3 from transcripts, 1 placeholder) |
| 7 | 19 | bare `create the mend page`; 9 phrase keys (6 from transcripts, 3 placeholders later filled by inference) |
| 8 | 20 | 1 phrase key (from transcript) |
| 9 | 23 | mend page `states` line; 11 phrase keys (6 from transcripts, 5 placeholders) |
| 10 | 24 | `score mend-read worth 5` on the mend page; 9 phrase keys (6 from transcripts, 3 placeholders) |
| 11 | 26 | 5 phrase keys (4 from transcripts, 1 placeholder) |
| 12 | 27 | 11 phrase keys (8 from transcripts, 3 placeholders) |
| 13 | 28 | 14 phrase keys (13 from transcripts, 1 placeholder) |
| 14 | 29 | 3 phrase keys (from transcripts) |
| 15 | 31 | 4 phrase keys (from transcripts) |
| 16 | 32 | 4 phrase keys (from transcripts) |
| 17 | 33 | 1 phrase key (from transcript) |
| 18 | 34 | 2 phrase keys (1 from transcript, 1 placeholder) |
| 19 | 36 | 1 phrase key (from transcript) |

Placeholders still in the reader's story at the end (text never printed anywhere in the book): `hush-known`, `cistern-running`, `grimoire-half`, `nothing-to-mend`, `nothing-to-hush`, `nothing-to-unbind`, `gnusto-drowned`, `remember-gnusto`, `already-whole`, `already-quiet`, `ward-asleep`, `tamsin-measures`, `hobb-on-lantern`, `hobb-on-gnusto`, `grimoire-on-kindle`, `tamsin-on-brass-enough`, `water-gate-shut`.

### Where the book fails a literal reader — the causes behind the entries above

1. **Phrases are named and never printed.** From chapter 14 to chapter 36 almost every chapter tells the reader to add "their N phrases" (or adds lines that name phrases without saying so) and prints at most one or two of them as Chord. In 18 chapters the story does not compile at the end of the chapter as written (`analysis.missing-phrase`). Most of the wording can be recovered from the transcripts; seventeen keys cannot be recovered at all.
2. **Things are named and never printed.** The hand lamp (ch. 6, printed in ch. 10), the blue flame (ch. 6, printed in ch. 19), the candles (ch. 9, printed in ch. 15), the Great Lantern (ch. 6, printed in ch. 7), the hearth (never), the mend page (never), the unbind page's reading clause (never), the fourth rank of chapter 19 (printed in ch. 24/35), Tamsin Vey's chapter-27 topic table and its porter row (never), her greetings (never), Hobb's spectacles row (never), the `beacon-near` clause's place (never), three of the four `emit` lines (never).
3. **The game cannot be won from the printed text.** Because the unbind and mend pages have no reading clause in print, the grille cannot be lifted and the lens cannot be mended. Everything from chapter 24 on that happens past the grille (chapters 24, 25, 32, 33, 34, the picture of 36, the full panel of 37, the endings) could only be checked in a copy using the book's own start-block trick, and the companion's 183-card tree fails 55 cards against the reader's story.
4. **Where blocks go is rarely said**, and room lists print in file order, so several transcripts differ in the order of listed things.
5. **Transcripts recorded on a different walk from the one the build step describes** (ch. 9 `read book`, ch. 14 `eat cake`, ch. 19 cistern, ch. 21 lens): implicit takes, timer lines and tolling lines appear that the book's blocks do not show.
6. **One-turn offsets**: the day sequence (ch. 19) and the hunger rungs (ch. 35) fire a turn earlier than the prose says; the role change of chapter 31 comes after four turns, not three.
7. **Platform behaviour the book does not describe**, seen on the interim release: garbled `look` / third-person lines on the turn the player role changes (ch. 31, 33); `inventory` wording (ch. 31); a second diagnostic for `are` (ch. 21); an unknown topic advancing a conversation thread (ch. 28); a lone ordinal-0 segment refused (ch. 38); the combat example's fight (ch. 35); no visible sound control on the page (ch. 37).
8. **Versions**: `story-version` 0.7.0 appears in chapter 37 without the reader ever being told to raise it past 0.4.0.

What works exactly as printed: Parts I and II apart from the unprinted things; chapter 22; the hand-built tree of chapter 38; and, starting from the companion's `chapter-38` folder, all of chapter 39 and the publish of chapter 40.

### Result against "clean"

Not clean: 10 of 40 chapters PASS, 21 BLOCKED, 19 deviations.
