# ADR-404: The opening is a routine the engine runs, not a turn a head types

**Planning**: OPEN

**Summary**: The engine runs a story's opening itself, once, after the story is loaded and outside the turn cycle, as a routine whose default is prologue, banner, look and which the author may alter; no head runs its own opening `look`, and the opening no longer counts as turn 1.

**Status**: **DRAFT** (opened 2026-11-18, session 0e7432, at David's direction: "open the draft ADR"). Decisions 1 to 4 are David's proposal as he stated it in that session. Decisions 5 to 13 are his answers in the open questions interview of the same session, which closed every question. The review that followed scored 8 of 22, NEEDS WORK. Decision 14, the `onOpening` hook under decision 8 and the confirmations in decisions 3, 4 and 6 are his rulings on its findings, and the remaining findings were corrected in this text. The review has not been run again on the revised record, and the record is not accepted.

## Date: 2026-11-18

**Kind**: technical

**Scope**: `packages/engine` (the turn's stage lists, `start()`, the `Story` interface), `packages/plugins` (the plugin contract's `onOpening`), `packages/extensions/chapters` (the opening chapter card), `packages/chord` and `packages/story-loader` (the opening block and its list in the Story IR), `packages/stdlib` (the banner and prologue channels), `packages/devkit`, `packages/platform-browser`, `packages/transcript-tester`, `packages/branch-tester`, `scripts`, `tools/explorer-probe` (the heads that run an opening `look` today), `packages/world-index`, `tools/ide` (the tree document's `boot` card and the IDE's Testing surface).

## Context — read in the source, 2026-11-18

**Every head opens a story by typing `look`.** `engine.start()` emits a `game.started` event and returns (`packages/engine/src/game-engine.ts:746`). Nothing is shown, because only a turn can carry output. Each head then runs a real turn of its own:

- `packages/devkit/src/commands/play.ts:129`: `await game.executeCommand('look')`
- `packages/platform-browser/src/BrowserClient.ts:688`: `await this.engine.executeTurn('look')` (and `:677` on a failed restore)
- `packages/transcript-tester/src/cli.ts:177`: `await game.executeCommand('look')`
- `packages/branch-tester/src/claims/claims-walk.ts:129`: `await game.executeCommand('look')`
- `scripts/bundle-entry.js:429`: `await game.executeCommand('look')`. This is the entry of the CLI bundle, `dist/cli/sharpee.js`, which Dungeo's walkthrough chain runs through.
- `scripts/fast-cli.js:102`: `await engine.executeTurn('look')`
- `tools/explorer-probe/explore.js:499` and `tools/explorer-probe/plan.js:623`: `await game.executeCommand('look')`
- The tree walker, for the tree document's `boot` card type (`packages/branch-tester/src/tree-document.ts:125`). ADR-357 says of the walker: "One card is one command, and that includes the boot card, which executes as `look`."

Found with `git grep -n -E "execute(Turn|Command)\(['\"]look['\"]\)"` on 2026-11-18, leaving out tests, archives and documents. The same search finds the pattern in examples and READMEs (`packages/bootstrap/README.md:29`, `packages/sharpee/README.md:59`, `packages/engine/examples/basic-demo.ts:106`, `packages/engine/docs/text-service-migration.md`, `docs/work/stdlib-reference/verify.mjs:85`), which teach it and need the same change.

**That `look` is a full turn.** `TURN_STAGES` (`packages/engine/src/turn/stages.ts`) includes `pluginTickStage` and `advanceTurnStage`, so timers, sequences and every each-turn mechanic have run once, and the counter has moved, before the player types anything. The banner and the prologue are printed by that turn too: they ride on it because nothing else can carry them.

**What it has cost.** These are the cases found while the Chord manual was run by naive readers:

- A Chord sequence step `at turn 50` answers the player's 49th command, and a step thirty turns later the 79th (naive run 10, chapter 19). Replayed 2026-11-18 on Sharpee 5.6.3: in `tutorials/relighting/chord-v4.1.0/chapter-19`, 81 lines of `wait` and then `/quit` were piped to `sharpee play .`, and the output was split on the echoed `> wait` lines. The text "The light has turned" was in the reply to command 49 and "Dusk comes down" in the reply to command 79.
- `use hunger` has its meter at 1 before the first command, which chapter 35 of the manual has to explain to the reader. This is as GH #793 reports it and as the manual prints it; it was not run again for this record.
- The browser client's boot path records the opening look as the play feed's first turn "or every replayed turn number would be off by one" (`BrowserClient.ts`, the comment above `:688`). That comment gives ADR-305 D3 as its source, which is that record's "As built" entry "D2/D3 — the boot look is the lineage's first recorded turn" (`docs/architecture/adrs/adr-305-create-transcript-from-play.md:203`): "The browser client auto-runs `look` at every fresh boot; the headless harness does not." ADR-305 is superseded by ADR-307.

**The engine already has the mechanism.** A turn is a declared list of stages. `META_STAGES` is a second list, for SCORE, SAVE and the like, and it has neither the plugin tick nor the advance; that is how a meta command costs no turn. What is missing is a list, and an owner, for the opening.

**Chord has a neighbouring block that is not this one.** `before the game starts … end before` (`packages/chord/src/ast.ts:519`, ADR-327 D10) runs while the world is built, assigns the player role, and refuses `phrase` and `emit` because "the block runs before any turn exists to carry prose". The opening is the first moment that can carry prose.

## Decision

Stated by David, 2026-11-18. Where a point is the session's reading of his words and not his words, it says so.

1. **The opening is a routine the platform runs.** After the story is loaded, the engine runs an opening routine once. David: "something in the platform after the story is loaded runs an on-before-story-starts event and by default this only contains 'look', but the author is allowed to alter this routine".

2. **The prologue and the banner are steps of that routine.** David: "we might put the prologue and banner _in_ this routine". The default routine is then prologue, banner, look, in that order, which is the order they are printed in today.

3. **The opening is not a turn.** It runs outside the turn cycle: no plugin tick, no advance of the counter. It is a third stage list beside `TURN_STAGES` and `META_STAGES`, run by the engine from `start()`, and it takes no undo snapshot and adds nothing to the command history. This began as the session's reading and David confirmed it on the review's fifth finding (2026-11-18: "yes to all three").

4. **No head runs an opening `look`.** Every head's own opening `look` is removed, and a head shows what the engine's opening produced. The engine's routine is the only opening. This began as the session's reading of point 1 and David confirmed it on the review's fifth finding (2026-11-18: "yes to all three"). The call sites are listed in Context.

5. **The Chord block is `when the game starts … end when`** (David, 2026-11-18, interview Q-1: "a"). It stands beside `before the game starts … end before` and does not replace it: the start block still runs while the world is built and still refuses prose, and the new block is the first that can carry it. It joins the grammar's existing `when … end when` blocks (`when <timer> expires`, `when <thing> moves`) and uses the words `define chapters` already uses in `begins when the game starts`. A story with no such block gets the default routine.

6. **The block takes three special routines and nothing else: `show-prologue`, `show-banner` and `do-first-look`** (David, 2026-11-18). On the contents, interview Q-2: "let's just implement the when-end when block with just the banner, prologue, and look for now". On the names, interview Q-3: "we might need to make it clear these are special routines...so show-banner, show-prologue, do-first-look". The names are hyphenated so that they do not read as ordinary statements or as the player's `look`. The default routine, which a story with no block gets, is:

   ```chord
   when the game starts
     show-prologue
     show-banner
     do-first-look
   end when
   ```

   The routines may be put in another order. Other statements, and actions the player could type, are not admitted. The three names mean something only inside this block, and one written anywhere else is a compile error, so a story cannot print its title a second time in play. This began as the session's reading of "special routines" and David confirmed it on the review's fifth finding (2026-11-18: "yes to all three"). It can be widened later without breaking a story.

7. **A playable prologue story is not part of this record.** The interview on Q-2 grew into a larger idea: an authored prologue story with its own world, a passing setup routine, then the main story. David set it aside: "I'm cool with this being a rathole for later". The idea, his answers in order and its open questions are in `docs/work/prologue-ideas/prologue-story-ideas.md`. Nothing in it is decided, and nothing in this record waits on it.

8. **With `use chapters`, the opening chapter's card is printed automatically, immediately before the first look** (David, 2026-11-18, interview Q-4: "a"). It is not a routine the author places. Wherever `do-first-look` stands in the block, the card comes just ahead of it, so ADR-330 D4's rule that the chapter title is announced before the room holds in every ordering. With the default order this is where the card is today, after the banner.

   **How it is printed** (David, 2026-11-18, on the review's first finding: "a"). The chapters extension announces a chapter from a turn plugin's `onAfterAction`, which the engine calls during the plugin tick (`packages/extensions/chapters/src/chapters-plugin.ts:123`), and decision 3 takes that tick out of the opening. So the plugin contract (`packages/plugins/src/turn-plugin.ts`) gains one optional member, `onOpening?(context: TurnPluginContext): ISemanticEvent[]`, which the engine calls once on every plugin that has it, just before `do-first-look` and outside any tick. The chapters plugin implements it and returns its opening card. No other plugin implements it, so nothing else moves. The hook is not called when the block leaves `do-first-look` out.

9. **A block is exactly what the author wrote: any routine may be left out** (David, 2026-11-18, interview Q-5: "a"). Without `show-banner` the story never prints its title block. Without `show-prologue` the header's prologue text is not shown. Without `do-first-look` the first room is not described until the player looks, and it reads as a first visit then: a room is marked visited by a look (`packages/stdlib/src/actions/standard/looking/looking.ts:152`) and by arriving (`packages/stdlib/src/actions/standard/going/going.ts:512`), and the opening does neither. The engine adds nothing the block does not name, apart from the chapter card of decision 8, which goes with the first look and so is absent when the look is.

10. **The routine is a list the engine runs, and a TypeScript story states it the same way a Chord story does** (David, 2026-11-18, interview Q-6: "a", which also answers Q-10). The `Story` interface (`packages/engine/src/install/story.ts`) gains one optional field holding the ordered list of routine names, for example `opening: ['show-prologue', 'show-banner', 'do-first-look']`. A Chord block compiles to the same list in the Story IR. A story that leaves the field out gets the default. It is not an event with handlers and not a method the story implements, so a TypeScript story can do here exactly what a Chord story can and no more.

11. **The routine runs only when a new game begins** (David, 2026-11-18, interview Q-7: "a"). That is a first load, a RESTART, and a restore that fails and falls back to a new game, where the browser client's `look` at `BrowserClient.ts:677` becomes the routine. A restored session shows what was saved and prints no opening.

12. **A test tree records the opening as one `opening` card, and the `boot` card type goes away** (David, 2026-11-18, interview Q-8: "a"; and, while answering Q-4, "our testing system has to be adaptable"). The `opening` card holds whatever the routine printed, in the order the story's block gives, and its assertions are made against that. Every existing tree loses its `boot` card and is re-recorded, and chapter 38 of the Chord manual, which teaches the two cards, is rewritten.

13. **Nothing is owed to saves and recordings made before the change** (David, 2026-11-18, interview Q-9: "a - still greenfield"). An old save restores as it is, with the turn count it was saved with, one higher than the same position in a new game. No migration and no version check are written. The release note says so, and says that transcripts and test trees recorded earlier should be re-recorded. The repository's own are re-recorded as part of the work.

14. **The small rules** (David, 2026-11-18, on the review's sixth finding: "5 is a compiler error. 6 is it's blank, not 0. The others are fine").
   - **The list.** `Story` gains `opening?: readonly OpeningRoutine[]`, where `OpeningRoutine` is `'show-prologue' | 'show-banner' | 'do-first-look'`. The Story IR carries the same list under the same name, `opening`.
   - **A routine named twice** is a compile error in Chord, naming the repeated line. For a TypeScript story the engine refuses the story when it is installed and names the repeat.
   - **An unknown name** in a TypeScript list is stopped by the type. If one gets through, the engine refuses the story at install and names it.
   - **An empty block** is allowed and prints nothing.
   - **`show-prologue` in a story whose header has no `prologue:`** is a compile error. The session's extension of that ruling to a TypeScript story, not David's words: the engine refuses the story at install, as it does for a repeat.
   - **The turn count before the first command is blank.** The status line shows no turn count until a command has cost a turn, and then shows 1. It does not show 0. Inside the engine the first command runs as turn 1, which is what `at turn 1` means.
   - **UNDO as the first command** gets the answer it gets today when there is nothing to undo.

David, on the design as a whole: "this is one of those slap your head 'should have done this from the beginning' instead of all of the hacky mechanisms".

## Records this one amends

This record does not replace any other. It changes one statement in each of three, and each stays in force otherwise.

- **ADR-330 D4** says the chapter card lands "before that turn's prose and after the banner". Under decision 8 the opening card goes with the first look, so in a story whose block puts `show-banner` after `do-first-look` the card comes before the banner. For every later chapter D4 is unchanged.
- **ADR-307** says "the opening carries no command; the boot look is its own card". Under decision 12 there is one `opening` card and no `boot` card.
- **ADR-357** says "One card is one command, and that includes the boot card, which executes as `look`." Under decision 12 the walker runs no opening look.

**Who amends them, and when:** whoever flips this record from DRAFT to ACCEPTED adds a dated line to each of the three, at the statement quoted above, saying it is amended by ADR-404 and how, in the same commit as the flip. Their `**Planning**` lines do not change, because none of them is replaced.

## Acceptance

Each is checked on the built platform, not on a stand-in.

- **AC-1, the turn numbers.** In `tutorials/relighting/chord-v4.1.0/chapter-19`, a game of nothing but `wait` prints "The light has turned" in reply to the 50th command and "Dusk comes down" in reply to the 80th. Today they are the 49th and 79th (Context).
- **AC-2, nothing has run.** In a story with `use hunger` set to grow 1 each turn, the meter is 0 when the first command is typed. A timer started in `before the game starts` has not stepped.
- **AC-3, the default.** A story with no block opens with its prologue, its banner and its first room, in that order, word for word as it does today.
- **AC-4, the author's order.** A story whose block is `show-prologue`, `do-first-look`, `show-banner` prints the room before the banner. A story whose block leaves a routine out does not print that part.
- **AC-5, no head types the opening.** `git grep -n -E "execute(Turn|Command)\(['\"]look['\"]\)"` finds no opening look in any head listed in Context.
- **AC-6, the chapter card.** With `use chapters`, the opening card is printed immediately before the first room in the default order and in the order of AC-4, and is absent when the block has no `do-first-look`. `packages/platform-browser/tests/chapter-before-room.test.ts` still passes.
- **AC-7, refusals.** The compiler refuses, each with its own message: a routine named twice; `show-prologue` in a story with no `prologue:`; any other statement inside the block; one of the three names outside the block. The engine refuses at install a TypeScript story whose list repeats a routine or names an unknown one.
- **AC-8, when it runs.** The routine runs on a first load, on RESTART, and when a restore fails. It does not run on a session restored from a save, where the transcript ends with "[Session restored]" and no opening follows.
- **AC-9, the status line** shows no turn count before the first command and 1 after it.
- **AC-10, the trees.** A test tree has one `opening` card and no `boot` card, the walker runs no opening look, and the manual's companion trees pass after they are re-recorded.
- **AC-11, Dungeo.** The walkthrough chain passes after the lines this decision moves are re-recorded from a census, under the rule of 2026-10-25.

## Consequences

- **Every turn number moves by one.** A story's first command is turn 1. Anything keyed to a turn number fires one command later than it does today: sequences, timers, fuses and daemons, the hunger meter.
- **Recorded numbers move with it.** The Chord manual quotes turn numbers (claims locked "at turn 82" and "at turn 138", chapter 35's hunger counts, the timer lines), and its companion test trees record them. Dungeo's walkthrough chain pins exact sequences that depend on when daemons and NPCs act. Under the standing rule of 2026-10-25, Dungeo lines this decision moves are re-recorded after a census, not ruled on one at a time.
- **The manual waits.** David, 2026-11-18: "set the book aside until we have a complete plan". The manual's Phase 8 gets no further run until this is planned.
- **Workarounds to examine, not yet shown to be removable:** the browser client's `turnOffset`, the play feed's `[SKIP]` first turn (ADR-305, the "As built" entry D2/D3), and chapter 35's sentence about the opening being a turn.
- **A release is needed** before a naive run can see any of this, since the runs install the published command.

## Session

Opened in session 0e7432 (2026-11-18), during the Chord manual's Phase 8. Naive run 10 on published Sharpee 5.6.3 reported one issue, the turn-50 warning arriving on the 49th command, which is GH #793. David asked "is there an _elegant_ way to make the opening look _not a turn_?", then proposed the routine, then put the prologue and banner in it. The open questions interview ran in the same session and closed all ten questions. Two ideas that came up in it were set aside in `docs/work/prologue-ideas/`: a playable prologue story before the main story, and a routine that runs after a restore.
