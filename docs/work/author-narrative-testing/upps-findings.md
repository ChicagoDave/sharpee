# UPPS findings — what an author starting from nothing meets

**Plan**: `plan-20261002-remaining-rows.md`, Phase 6b. **Objective**: `docs/objectives/author-narrative-testing.md`, O-1.
**Story**: `branch-stories/upps/`, written room by room. Claude writes it from 2026-10-05, because it is a testing story (David: "this is a testing story, so it supersedes my llm-no-content rule"); David's premise is fixed.

Each entry is something David met while writing UPPS from an empty file, recorded as he said it, with what was observed and where it belongs (Chord, the IDE, the Testing tab, the CLI, or the platform). Entries are findings, not decisions: designs come later, from several findings together.

## F-1: Starting from scratch, the IDE gives no guidance (2026-10-04)

**What David said**: "we could use templates, but that still leaves the author wanting to start from scratch and not having any real guidance from the IDE."

**Observed**, on the header-only `upps.story` (title, author, id, IFID, version):
- `sharpee build upps.story` fails with one error: `upps.story:1:1 error [analysis.start-block-missing] This story never says who the player is. Add a 'before the game starts' block assigning the role: 'change the player to <character>'.` The message is good: it names what is missing and gives the syntax.
- But an empty story lacks several things, and the build names only the first. The author learns what a minimal story needs one failed build at a time.
- `sharpee test upps.story --tree` says `test: no test tree found ... (record tests in the IDE's Testing tab)`, a dead end for an author working in the CLI.
- Templates (Chord Writer's New Story) would skip all of this for the author who takes one, and leave the author who starts from scratch exactly here.

**Amended the same day: what New Story actually gives.** Chord Writer's New Story does not start empty. It writes a runnable minimum that teaches by example: a room with its description (`create the Landing` / `a room`), a thing with an `aka` (the brass lantern), a playable person who `starts in` the room and `carries` the thing, and the `before the game starts` block with `change the player to`. The header-only file above was the agent's scaffold, the wrong door, not what an author meets. What still holds:
- Leave the template, by deleting it to start from scratch or by writing past its four constructs, and the guidance stops: errors arrive one at a time, as above.
- The template says nothing about testing: no test tree and no hint of one. The template's author first meets testing in the three-column Testing tab, which is where David's first click-through lost track of what the tab was doing.

**The shape of it**: the compiler already knows the story's state and the next missing piece. The IDE passes that on only as an error. The same gap as the Testing tab's three columns: nothing tells the author what state the story is in or what to do next.

**Belongs to**: the IDE (Chord Writer), drawing on what the compiler and world index already derive. Not a template question.

## F-2: The author types everything from the start, guided as they type (2026-10-04)

**What David said**: "the author should be able to type everything in from the start. The opening new story should only contain the story block with errors for the missing items as you presented with upps. So then we need guides to explain to the author what they need to do. And then, we definitely need syntax completion: if I type create<sp> the IDE should somehow tell the author to type in the name of the object and hit [Enter], then explain 'a room or a person or an object (no qualifier)'."

**Corrected the same day, David: "we have a list of possible starts".** New Story offers three starts, not one:
- **Start 1, a named start.** The author enters the story's name, the player character's name and the first room's name, and gets that code pre-entered: a story block, the room, the player in it, and the start block, written with the author's own names.
- **Start 2, open without template.** The author enters the story's name and chooses "open without template". The file holds only the story block, and the compiler's errors for what is missing (F-1) are the starting state. This is the from-scratch path, and UPPS is on it.
- **Start 3, pre-baked templates**, a list designed later.

Today New Story asks for a title and a location only (`tools/ide/SharpeeIDE/Launch/CreateStoryViewController.swift`) and writes the one template F-1 records.

**The direction, in three parts:**
1. **New Story offers the three starts above.** On start 2, the compiler's errors for what is missing are the starting state, not something a template hides.
2. **Guides explain what to do about each missing piece**, in author terms: what a player is, why the story needs one, what to type.
3. **Syntax completion that teaches as it completes.** After `create ` the IDE says to type the name and press Enter; on the next line it offers the kinds with what each means: `a room`, `a person`, or nothing for a plain object.

**Observed, 2026-10-04**: the editor has no completion today (no completion code in `tools/ide/SharpeeIDE` or `tools/ide/editor-bridge/src`). It does run the real Chord lexer as a service (`tools/ide/editor-bridge/src/lexer-server.ts`), so editor colouring uses the same tokens `sharpee compose` does rather than a hand-written grammar (ADR-341 D4). The guides and completion should follow that pattern: derived from the compiler's own parser and diagnostics, so the IDE never teaches syntax the compiler rejects.

**Belongs to**: the IDE (New Story, the editor), with the compiler as the source of what may come next. Its design needs a mock first, and a full Chord example under each option. Recorded as decisions in ADR-358 (DRAFT, 2026-10-04).

## F-3: Problems belongs on the right; Game Errors may not belong at all (2026-10-04)

**What David said**: "the problems panel needs to be a right-side panel and not sure we need Game Errors at all."

**Observed**: the bottom dock holds two tabs, Problems (the compiler's diagnostics) and Game Errors (Play's runtime errors in author terms) (`tools/ide/SharpeeIDE/Build/BottomPanelViewController.swift`). Selecting a Game Errors row opens its full explanation in the right panel's Diagnosis tab (`Play/ErrorDiagnosisView.swift`), so the list largely duplicates a door to Diagnosis.

**Belongs to**: the IDE layout. Recorded as ADR-358 D5 (Problems moves right) and Q-7 (Game Errors, and what remains of the bottom dock).

## F-4: Inventory hides what a worn container holds (2026-10-05)

**Observed** in room 1 (`./sharpee play branch-stories/upps`): after `wear satchel`, `take card` and `put card in satchel`, `inventory` answers only "You are wearing: / a mail satchel (worn)". The route card is in the satchel but is not listed, and "(worn)" repeats the heading above it.

**Belongs to**: the platform's inventory report (stdlib and lang-en-us), not Chord. Not investigated yet.

## F-5: `create player Postman` compiles as an entity named "player Postman" (2026-10-05)

**Observed**: `parse.removed-create-player` fires only when the whole name is the one word `player` (`packages/chord/src/parser.ts:1692`). David's first attempt, `create player postman` (`snippets/snippet-001.txt`), therefore compiles clean. The person is named `player Postman`, and `change the player to Postman` still resolves to it. Nothing tells the author that the old form was read as part of the name.

**Belongs to**: the Chord parser (and a guide, ADR-358 D3).

## F-6: Unquoted readable text is read as a different config key (2026-10-05)

**Observed**: `a thing, readable with text ROUTE 7` compiles clean. The IR records the trait config as key `text ROUTE`, value `7` (a number), and `read card` prints "The route card reads:" followed by nothing. No diagnostic names the unknown key.

**Belongs to**: the Chord analyzer: a trait config key the trait does not declare should be an error.

## F-7: A player with no `starts in` passes compose and fails at load, without a line (2026-10-05)

**Observed**: with `starts in the Sorting Room` removed, `sharpee compose --check` reports gate-clean. `sharpee play` then exits 3 with "Story player "Postman" (a01) is not placed in the world — an unplaced player character is nowhere to play." The message names no file or line and shows an internal id (`a01`).

**Belongs to**: the Chord analyzer. It already knows which entity the start block makes the player and whether that entity is placed, so this could be a compile error with a span.

## F-8: Test-tree failures point at the turn, not the source line (2026-10-05)

**Observed**: `packages/branch-tester/src/tree-walker.ts` carries no source span, so a failed claim names the card and the claim. Derived-tier branches do carry spans (`coverage.ts`). A room with no clauses, like room 1, has no derived branches, so every behaviour error in it (a missing trait, `scenery` or `aka`, a misplaced thing, a wrong blocked direction) is reported against a turn. O-1 counts "caught without pointing at its cause" as a falsifier.

**Belongs to**: the testing surface and branch-tester. Detail in `upps-error-catalog.md`.

## F-9: The "did you mean" suggestion lowercases the name and doubles the punctuation (2026-10-05)

**Observed**: "No entity named `Sorting Hall` — did you mean `sorting room`?." The room is declared `the Sorting Room`.

**Belongs to**: the Chord analyzer's message text.

## F-10: A failed `contains` claim does not show what the game printed (2026-10-07)

**Observed**: running the seeded room-1 files against David's recorded tree (`upps.tests/opejfh5t.json`), every tree failure reads only `Output does not contain "<expected>"`, with or without `--verbose`. For `TEST-001-Y` (one word of the description changed), the author sees the whole expected paragraph and has to find the difference by eye. For `TEST-001-U` and `TEST-001-T` the failure is identical, although the causes differ (no `wearable`; satchel not placed), because the actual reply ("You can't wear…" against "You can't see any such thing.") is not shown.

**Belongs to**: branch-tester's CLI reporter (and the Testing tab, unchecked): a failed text claim should print the actual output, ideally with the differing span.

## F-11: The CLI shows one failing card when two failed (2026-10-07)

**Observed**: `TEST-001-Y` reports "2 cards failing, 2 assertions failing" but prints a single ✗ line (`look`). The other failure is the `boot` card, which makes the same claim on the opening description; it is counted but never named.

**Belongs to**: branch-tester's CLI reporter.

## F-12: A misplaced thing is caught on the wrong turn (2026-10-07)

**Observed**: the seeded manifest expected `TEST-001-T` (satchel not placed) to be caught on `look`. It is caught on `wear satchel` instead, because David's `look` claim covers the room description and not the list of things in it. The failure therefore reports a wear problem for what is a placement error. This is a property of what the recorded claim covers rather than a defect, but it shows how far F-8's "names the turn" can be from the cause.

**Belongs to**: the testing surface (what claims recording offers by default); recorded for Phase 6.

### Testing tab check, `TEST-001-Y` (2026-10-07)

David ran his tree in Chord Writer's Testing tab with `TEST-001-Y` copied over `upps.story`. The tally matched the CLI (6 cards passing, 8 assertions passing, 2 cards failing, 2 assertions failing, 1 rule passing).
- **F-10 holds in the tab.** "rattles" appears nowhere in the run results. Each failure shows the expected paragraph three times: in the line header, as the ✗ claim, and as its explanation. The game's actual output is not shown. David saw the change only in the source editor.
- **F-11 is CLI-only.** The tab lists both failing cards.

## F-13: The boot card shows as a second `> look`, and the header calls it turn 1 (2026-10-07)

**Observed** in the tab with `TEST-001-Y`: the results list `> look` twice, each with the same ✗. The first is the boot card (the opening description), not a turn the author typed, and the line header reads "turn 1 — Output does not contain …". An author sees one `look` in their tree and two in the results.

**Belongs to**: the Testing tab's run results (`tools/ide/web/testing-surface/src/cards.ts`, `detail`), and the runner's label for the boot card.

## F-14: A failed claim's explanation repeats the claim (2026-10-07)

**Observed**: under `✗ contains "<text>"` the explanation reads `Output does not contain "<text>"`. The second line adds nothing to the first; it is where the actual output (F-10) would go.

**Belongs to**: the Testing tab's run results, together with F-10.

### Testing tab check, `TEST-001-T` (2026-10-07)

With the satchel unplaced, the tab fails one card: "turn 3 — Output does not contain "You put on the mail satchel."" (turn 3 because the boot card is counted as turn 1, F-13). Nothing in the results or the coverage panel points at placement. The game's actual reply, "You can't see any such thing.", is the clue an author would need, and it is not shown (F-10). F-12 holds in the tab.

### Testing tab check, `TEST-001-Q` (2026-10-07)

With Postman's `starts in` removed, the tab's run reports the load error verbatim: "Story player "Postman" (a01) is not placed in the world — an unplaced player character is nowhere to play." F-7 holds in the tab: no file or line, and the internal id `a01` is shown to the author.

### Testing tab check, `TEST-001-A` (2026-10-07)

With the machine's kind missing, the compiler error (`analysis.missing-kind-noun`, line 33) shows in Problems and in Diagnosis on reload, before any run. Run refuses, and the same error shows in Diagnosis. The compiler tier (A to P) is readable in the IDE without the tab's help.
