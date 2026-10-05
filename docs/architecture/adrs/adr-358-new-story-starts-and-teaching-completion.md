# ADR-358: Three ways to start a story, and completion that teaches as the author types

**Status**: DRAFT. The decisions below are David's, taken on 2026-10-04 (session 4d81b6), D5 among them ("the problems panel needs to be a right-side panel and not sure we need Game Errors at all"); all seven open questions were resolved by interview the same day and folded into D1–D6. `adr-review` scored 6/17; its findings were drafted into fixes the same day: New Story's write steps (D1, which also corrects D6: the starts' templates are a `packages/devkit` change), the completion protocol, help catalog, quiet-in-prose rule and service lifecycle (D4), saved layout (D5), the Affected and Acceptance Criteria sections, and the latency citation. The protocol, the lifecycle, the quiet rule and the editable id are proposals awaiting David's confirmation. D4 reaches `packages/chord`, which is a platform change and gets its own discussion before it is built. Amended 2026-10-05 (session f8ef32, David approving) for ADR-359 D1, which made `a thing` a kind: no completion entry inserts nothing any more (D2, the protocol, AC-4).
**Scope**: `tools/ide/SharpeeIDE` (New Story, `Launch/CreateStoryViewController.swift`; the editor, `Editor/`), the Avalonia head's equivalents under `tools/ide/PaneHost`, `tools/ide/editor-bridge`, and a completion entry point in `packages/chord` (D4).

## Date: 2026-10-04

## Parent

- **The author-narrative-testing objective** (`docs/objectives/author-narrative-testing.md`, O-1): the 60-room story is written and tested one room at a time. UPPS (`branch-stories/upps/`) is that story, and these decisions came from its first minutes.
- **Findings F-1 and F-2** (`docs/work/author-narrative-testing/upps-findings.md`), which record what David met and said.
- **ADR-341 D4** (two native editors, one grammar) and **ADR-258 D7** (the macOS highlighter keys off the in-process Chord lexer, no parse tree). This ADR needs something neither provides: knowledge of what may come next at a position, which only the compiler's parser has.

## Context

David started UPPS from an empty file to see what an author starting from nothing meets (F-1). The header-only story builds to one error: `upps.story:1:1 error [analysis.start-block-missing] This story never says who the player is. Add a 'before the game starts' block assigning the role: 'change the player to <character>'.` The message is good, but an empty story lacks several things and the build names one at a time. From there an author has nothing but errors to learn from.

Today, as of 2026-10-04:
- **New Story** asks for a title and a location (`CreateStoryViewController.swift`, the `titleField` and `locationField`) and writes one template: a room (`the Landing`), a thing with an `aka` (`the brass lantern`), a playable person who `starts in` the room and `carries` the thing (`Alex`), and the `before the game starts` block. It runs, but it holds the author's own names nowhere, and the from-scratch author can only delete it.
- **The editor has no completion.** No completion code exists in `tools/ide/SharpeeIDE` or `tools/ide/editor-bridge/src`.
- **The compiler already holds what completion needs.** `packages/chord/src/catalog.ts` lists the closed vocabulary: the kind nouns that take an article (`room`, `door`, `person`, `container`, `supporter`, `region`), and the bare trait adjectives (`scenery`, `wearable`, `openable`, and the rest). "Plain thing = no kind noun." (Since ADR-359 D1, `thing` is a kind noun and every `create` block names one.) The parser knows which line forms a block accepts (`parseCreate` in `parser.ts` reads `aka`, `pronouns`, composition lines, and so on), and its diagnostics name what is missing.

David's direction (F-2): "the author should be able to type everything in from the start … we need guides to explain to the author what they need to do. And then, we definitely need syntax completion."

## Decision

### D1: New Story offers three starts (David, 2026-10-04)

**Start 1, a named start.** The author enters the story's name, the player character's name and the first room's name, and gets that code pre-entered. For the story name *UPPS (United Planetary Postal Service)*, a PC named *Postman*, and a first room named *Sorting Room* (example names only; the author's own fill them), it writes:

```chord
story
  title: UPPS (United Planetary Postal Service)
  authors:
    David Cornelson
  id: upps
  ifid: 29E1F727-29D4-44A0-9E87-D2BDC6AC021F
  story-version: 0.1.0

create the Sorting Room
  a room

create Postman
  a person
  playable
  starts in the Sorting Room

before the game starts
  change the player to Postman
end before
```

It compiles and plays, so the first test can be recorded at once (checked 2026-10-04 in a scratch directory: `sharpee compose` → `2 entities`; `sharpee play`, `look` → `Sorting Room`). It carries no description prose, because the prose is the author's to write.

**Start 1 writes only that minimum, and no test** (David, 2026-10-04, Q-1: "Testing is secondary to getting this new story dialogue right. Once the author has a compiling story, we introduce testing"). Getting the New Story dialogue right comes first. Testing is introduced to the author once their story compiles, not written into the first file: a first recorded test, or a hint toward one, belongs to the guides (D3), triggered by the first clean compile, on any of the three starts.

**Start 2, open without template.** The author enters the story's name and chooses "open without template". The file holds only the story block, as `branch-stories/upps/upps.story` does today, and the compiler's errors for what is missing are the starting state. This is the from-scratch path, and D2 to D5 exist so that it is not a dead end.

**Start 3, pre-baked templates**, a list designed later. This ADR only reserves a place for it in New Story; which templates exist and what they hold is out of scope.

**How a start is written** (proposed at review, 2026-10-04). Today's single template lives in `@sharpee/devkit` (`packages/devkit/templates/story-chord/story.story.template`, with `{{STORY_TITLE}}`, `{{AUTHOR}}`, `{{STORY_ID}}`, `{{IFID}}`, `{{DESCRIPTION}}`). The macOS head renders it through `tools/ide/SharpeeIDE/Workspace/StoryScaffold.swift` from a copy `tools/ide/vendor-story-templates.sh` mirrors into the app; the Avalonia head runs `sharpee init <name>` (`tools/ide/PaneHost/Shell/ShellWindow.axaml.cs`). The starts keep that arrangement, so devkit stays the one owner of what a new story contains:
1. devkit holds one template per start: `story-named.story.template` (start 1, adding `{{PLAYER_NAME}}` and `{{FIRST_ROOM}}`) and `story-empty.story.template` (start 2, the story block only). `sharpee init` takes the start as a flag (`--start named|empty`, with `--player` and `--room` for start 1). This is a change to `packages/devkit`, so a platform change, discussed before it is built.
2. The id is derived from the title by the rule `StoryScaffold.storyId(from:)` already applies: lowercase, every run of other characters becomes `-`, trimmed, `my-story` if nothing is left. The dialogue shows the derived id and lets the author edit it, because a long title derives a long id: "UPPS (United Planetary Postal Service)" derives `upps-united-planetary-postal-service`, where David chose `upps`.
3. The IFID is minted and the config sidecar written beside the story, as `StoryScaffold` does today (ADR-309 D2: the story is born with identity), with the same `.gitignore`.
4. The new `<id>.story` opens in the editor. On start 2 the compiler's diagnostics appear at once, with their guides (D3).

### D2: Completion is a help balloon, then a dropdown (David, 2026-10-04)

The interaction, as David described it:

1. The author types `create` and a space. A **help balloon** appears: *type in the name of your room, object or person, followed by Enter*.
2. The author types `the Sorting Room` and presses Enter. On the new, indented line a **dropdown** offers what may come next: `a person`, `a room`, `a thing`, and the rest of what the language allows there. (David's original list read "a person, a room, (object), scenery"; ADR-359 D1 made `a thing` a kind, and `scenery` is offered only after the kind, at `a thing, `.)
3. The author moves with the up and down arrows and presses **Tab** to insert the highlighted entry.

"Same process for other completions": every place where the language offers a closed set of next words works this way, with a balloon explaining what goes there and a dropdown of what may.

A worked example, in the order the author types it:

```chord
create the cargo robot        ← balloon after "create ": name it, then Enter
  a person                    ← dropdown on the new line; ↓ to "a person", Tab
  starts in the Sorting Room  ← dropdown offers create's next lines; "starts in", Tab; then the rooms the story has
```

**The flow chains** (David, 2026-10-04, Q-3: "A"). Every choice inserts its text, and then the next dropdown opens, so an author can Tab through a whole `create` block. `a thing` is a kind like any other (ADR-359 D1), so once the kind line exists every later position has an unambiguous context.
- **A choice that needs a value.** Tab on `starts in` inserts it and immediately opens a second dropdown of the rooms the story already has. The list comes from the same compiler answer (D4), which has read the whole file. The same holds for every line form whose value is a story entity.
- **Not now: "(new room…)"** in a value dropdown, writing a `create` block for a room that does not exist yet. It would move the cursor somewhere the author did not go. It is left until UPPS shows authors wanting it.

### D3: Guides explain each missing piece in author terms (David, 2026-10-04)

When the story is missing something the compiler requires, such as a player, a place for the player, or the start block, the IDE explains what it is, why the story needs it, and what to type, rather than only showing the error. Each guide is driven by the compiler's own diagnostic for that piece, so it appears exactly when the compiler would refuse the story and goes away when the compiler is satisfied.

**The guide appears inline, in the editor, where the missing piece belongs** (David, 2026-10-04, Q-4: "C"), not in a separate panel. A missing player's guide sits where the start block and the player's `create` block would go. On a file with only a story block there is no such spot yet, so the guide sits on the first empty line after the story block, where the author's next block would start. Problems (D5) still lists every diagnostic, and selecting one moves to its inline guide.

**The words live in `packages/chord`**, beside the diagnostic and the completion entries they explain, in one help catalog keyed by diagnostic code and completion key (D4's help key). A new diagnostic cannot ship without its explanation, and both heads show the same words. This follows where the compiler's diagnostics already live: Chord is an English-syntax language whose messages are in `packages/chord`, not in the `lang-en-us` layer CLAUDE.md names for user-facing text, so the guides keep that existing exception rather than create a second one.

### D4: The compiler is the only source of what may come next

Completion entries, help text keys and guides come from `packages/chord`: the closed sets in `catalog.ts`, the line forms the parser accepts in each block, and the diagnostics the analyzer raises. The IDE never carries its own list of Chord syntax. This is ADR-341 D4's rule ("one grammar") applied to completion: if the language grows a kind noun, the dropdown offers it with no IDE change, and the IDE can never teach a form the compiler rejects. Growing `catalog.ts` stays a grammar change with owner approval (its header, `docs/architecture/chord-grammar-changes.md`).

This needs an entry point in `packages/chord` that answers "at this position in this text, what may come next, and what goes here": a platform change, discussed before it is built.

**Both heads reach it through one completion service** (David, 2026-10-04, Q-5: "A"): a long-lived Node process in `tools/ide/editor-bridge`, beside the lexer service (`src/lexer-server.ts`), started by each head with its editor and spoken to one JSON request and response per line, as the lexer service is. On macOS this is a new long-lived process, run on the Node the app already ships (`tools/ide/vendor/node`, the build scripts' first choice); the macOS editor's own Swift lexer (ADR-258 D7) keeps colouring code and plays no part in completion. One service and one protocol means both heads give the same answers by construction. Running the compiler in-process in JavaScriptCore on macOS (`packages/chord` is browser-safe) is the fallback if the latency measurement in this decision misses there; porting completion to Swift is ruled out as a second grammar.

**Its shape: whole text and a position in, entries out, no state kept** (David, 2026-10-04, Q-2: "A"). The editor sends the whole file and the cursor position. The compiler re-reads the file, tolerating the unfinished line under the cursor (the file need not parse cleanly), and returns the entries. Each entry carries the text to insert, how it reads in the dropdown, a key for its help text (Q-4 settles where the words live), and whether a value must follow, as `starts in` needs a room. The same call returns the help balloon's key for the position, so balloon and dropdown come from one answer. Nothing is held between keystrokes.

**The protocol** (proposed at review, 2026-10-04). One JSON object per line each way, as the lexer service speaks (`tools/ide/editor-bridge/src/lexer-server.ts`). Positions are 1-based, matching the lexer's tokens.

```ts
/** Editor → service. */
type CompletionRequest =
  | { id: number; op: 'complete'; text: string; line: number; column: number }
  | { id: number; op: 'help'; keys: string[] };

/** Service → editor, one per request, carrying the request's id. */
type CompletionResponse =
  | {
      id: number;
      op: 'complete';
      /** True where nothing may be offered: description prose, a comment, a string. */
      quiet: boolean;
      /** The balloon for this position, as a help key; absent when there is nothing to say. */
      balloon?: string;
      entries: CompletionEntry[];
    }
  | { id: number; op: 'help'; help: Record<string, HelpText> };

interface CompletionEntry {
  /** Text Tab inserts; never empty. */
  insert: string;
  /** How the entry reads in the dropdown. */
  label: string;
  /** Help key for the entry's explanation. */
  help: string;
  /** What follows: the next line's dropdown, a dropdown of story entities of a kind, or nothing. */
  then: { kind: 'next-line' } | { kind: 'value'; of: 'room' | 'person' | 'thing' | 'door' | 'region' } | { kind: 'none' };
}

/** One help-catalog entry. */
interface HelpText {
  title: string;
  body: string;
  /** Chord the author can type, shown in the guide or balloon. */
  example?: string;
}
```

The help catalog is one module in `packages/chord` (`src/help-catalog.ts`) mapping each key to its `HelpText`. Keys are diagnostic codes (`analysis.start-block-missing`) and completion keys (`kind.person`, `balloon.create-name`). A unit test fails when a diagnostic code the analyzer can raise, or a help key a completion can return, has no entry, so no new error ships without its explanation (D3). Guides (D3) take their diagnostics from the compile the IDE already runs (`compose --json`, ADR-258 D5) and their words from the `help` op.

**Quiet where the author is writing prose.** The answer is `quiet: true`, with no balloon and no entries, when the cursor is in description prose (a paragraph inside a block, which the parser reads as prose after a blank line), in a comment (`##`), or in a string. Otherwise every word of a room description would pop a dropdown.

**The service's lifecycle** (proposed at review, 2026-10-04):
- Each head starts one service per window when a `.story` opens in the editor, and stops it when the window closes.
- On start the service writes a ready line naming the Chord language version it loaded, as the lexer service names its lexer. The head compares it with the toolchain's version (as `Compose/ChordVersionCheck.swift` does for compose) and restarts the service on a mismatch, so a rebuilt compiler is never answered by a stale one.
- Requests carry rising ids, and the editor acts only on the response to its latest request. An answer that arrives after the next keystroke is dropped, and that keystroke shows nothing rather than a stale list.
- If the service exits, the head restarts it once. If it exits again, completion turns off for the window and Problems says so, while editing goes on unaffected.

**Latency is a target to measure, not a claim.** The answer has to arrive before the author's next keystroke on a story of O-1's size (60 rooms). The lexer service's header shows an example response lexing a 1,756-line file in 3.2 ms (`lexMs` in `tools/ide/editor-bridge/src/lexer-server.ts`; the file is not named there); the parser has not been measured. The first measurement belongs to the entry point's implementation, on UPPS and on a story of 60 rooms. If the measurement misses, a long-lived service that keeps the parsed file between keystrokes is the upgrade, and the entries it returns do not change. Rejected: a static table of line forms with the editor locating the cursor itself, because the editor would then re-implement part of the parser, which this decision rules out.

### D5: Problems moves to the right-hand panel (David, 2026-10-04)

The Problems list, the compiler's diagnostics, moves from the bottom dock to the right-hand side, where the author's other working surfaces already are. Today it shares the bottom dock with Game Errors (`tools/ide/SharpeeIDE/Build/BottomPanelViewController.swift`, tabs "Problems" and "Game Errors"), while the right panel holds Build, Play, Testing, Diagnosis, Documentation, Publish and World (`Play/RightPanelViewController.swift`). D3's guides appear inline in the editor, not in Problems; Problems lists every diagnostic and leads to its guide.

**Game Errors folds into Diagnosis, and the bottom dock goes** (David, 2026-10-04, Q-7: "B"). Game Errors lists Play's runtime errors in author terms (`Build/GameErrorsView.swift`), and selecting a row already opens its explanation in the right panel's Diagnosis tab (`Play/ErrorDiagnosisView.swift`), so the separate list duplicates a door. The Diagnosis tab takes the list: the session's runtime errors at the top, the selected error's explanation below. The tab carries a count badge, so a new error is noticed from any tab, including Testing, where the Play transcript is out of sight; the right panel already passes Diagnosis a count (`showDiagnosis(_:count:)` in `Play/RightPanelViewController.swift`). With Problems moved right and Game Errors folded in, the bottom dock holds nothing and is removed.

**Saved layout.** The right panel persists its selected tab by index (its header: the tab order is kept "so the persisted tab index keeps meaning what it meant before it existed", `Play/RightPanelViewController.swift`). Problems is appended after the existing tabs, so saved indices keep their meaning. Whatever the window saved about the bottom dock is ignored once the dock is gone.

### D6: Order of work: the dialogue, then guidance, then testing (David, 2026-10-04, Q-6: "A")

1. **The New Story dialogue**: the three starts (D1) in both heads, and Problems moved right (D5). *Corrected at review:* the starts' templates and `sharpee init`'s flag are in `packages/devkit` (D1, "How a start is written"), so this step carries one platform discussion. The dialogue itself and moving Problems are IDE-only.
2. **Completion and guides** (D2, D3), starting with the platform discussion for the compiler's completion entry point (D4) and its help catalog.
3. **Testing work resumes** after these: the paused steps of the author-narrative-testing plan's Phase 6 (ADR-357), then Phase 7.

This follows David's order: "Testing is secondary to getting this new story dialogue right." Whether O-1's due date of 2026-10-15 moves is left to David once the dialogue has landed and the pace of UPPS rooms can be seen.

## Affected

- `packages/devkit/templates/story-chord/`: the start 1 and start 2 templates; `packages/devkit/src/cli.ts`: `sharpee init --start` (D1).
- `tools/ide/SharpeeIDE/Launch/CreateStoryViewController.swift` (the three starts, the player and room fields, the editable id), `Workspace/StoryScaffold.swift` (rendering per start), `tools/ide/vendor-story-templates.sh` (mirroring the new templates) (D1).
- `tools/ide/PaneHost/Shell/ShellWindow.axaml.cs`: New Story's dialogue and `sharpee init --start` (D1).
- `packages/chord`: the completion entry point and `src/help-catalog.ts`, with the catalog-coverage test (D3, D4).
- `tools/ide/editor-bridge/src/`: the completion service beside `lexer-server.ts` (D4).
- `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` and `tools/ide/PaneHost/Editor/EditorWindow.axaml.cs`: the balloon, the dropdown, inline guides, and the service's lifecycle (D2, D3, D4).
- `tools/ide/SharpeeIDE/Build/BottomPanelViewController.swift`, `Compose/ProblemsView.swift`, `Build/GameErrorsView.swift`, `Play/RightPanelViewController.swift`, `Play/ErrorDiagnosisView.swift`, and the window wiring that places the bottom dock (`MainWindow.swift`): Problems moved right, Game Errors folded into Diagnosis, the dock removed; the Avalonia head's equivalents likewise (D5).

## Acceptance Criteria

Each names its test. Editor behaviour is checked through the completion service's real responses, never a hand-written stand-in (DEVARCH 13a); what only a screen shows needs David's click-through, and he is told beforehand.

- **AC-1 (named start, D1).** `sharpee init --start named --player Postman --room "Sorting Room"` on a title "UPPS (United Planetary Postal Service)" writes `upps-united-planetary-postal-service.story` holding exactly D1's start 1 shape, a config sidecar with the same IFID, and a `.gitignore`; `sharpee compose` loads it with 2 entities and `sharpee play` answers `look` with the room's name. Test: devkit real-path test in a scratch directory.
- **AC-2 (empty start, D1).** `--start empty` writes the story block only; `sharpee compose` fails with exactly one diagnostic, `analysis.start-block-missing`. Test: devkit real-path test.
- **AC-3 (both heads agree, D1).** macOS `StoryScaffold` and `sharpee init` produce byte-identical `.story` files for the same inputs and start (the IFID aside). Test: an XCTest rendering through `StoryScaffold` compared with the devkit test's output.
- **AC-4 (the create flow, D2, D4).** Against the real service: after `create ` the answer's balloon is `balloon.create-name` and there are no entries; on the indented line after `create the cargo robot` the entries include `a person`, `a room` and `a thing`, every entry has a non-empty `insert`, and `scenery` is offered after `a thing, `; with `starts in ` typed in a story that has the Sorting Room, the entries are its rooms. Test: editor-bridge service test spawning the real service.
- **AC-5 (quiet in prose, D4).** With the cursor in a room's description paragraph, in a `##` comment, and in a string, the answer is `quiet: true` with no balloon and no entries. Test: editor-bridge service test.
- **AC-6 (unfinished file, D4).** With the cursor on an unfinished line in a file that does not parse, the service still answers for that position and does not exit. Test: editor-bridge service test.
- **AC-7 (no error without words, D3).** Every diagnostic code the analyzer can raise and every help key a completion can return has a help-catalog entry. Test: `packages/chord` unit test that fails on a missing key.
- **AC-8 (guides follow diagnostics, D3).** On the empty start, the missing-player guide appears on the first empty line after the story block; after the start block and a placed player are typed and the story compiles, it is gone. Test: XCTest driving the editor with the real compose output; David's click-through.
- **AC-9 (lifecycle, D4).** A service started against a different Chord version is restarted; a killed service is restarted once; killed twice, completion is off and Problems says so while the editor keeps editing. Test: editor-bridge and XCTest lifecycle tests with a real service process.
- **AC-10 (layout, D5).** Problems is a right-panel tab appended after the existing ones, a saved tab index from before the change selects the same tab, Diagnosis lists the session's runtime errors with a count badge, and the window has no bottom dock. Test: XCTest; David's click-through.

## Consequences

- New Story changes in both heads: three starts instead of one template. The current template stops being the only door.
- The compiler gains a second consumer beside `compose`: the editor asks it questions while the author types, so the answer has to come fast enough to keep up with typing. D4 carries that as a target to measure.
- Every closed set the language has becomes visible to authors as they type. A set that is hard to explain in a balloon is a signal about the language, not only about the help text (core concepts: the platform and Chord align from both sides).
- Start 2 puts compiler diagnostics in front of beginners as their first experience, so the wording of each start-up diagnostic becomes product copy.
- The UPPS findings record keeps collecting what the from-scratch path exposes, and later findings may amend these decisions.
- The bottom dock is removed in both heads (D5), so the window's layout changes for every author, not only new ones.

## Session

2026-10-04, session 4d81b6. David, after starting UPPS from an empty file: "write the ADR for the three starts and completion - and I see completion as like this: I type create <space> and see a balloon for help (type in the name of your room, object, person followed by Enter). Then a dropdown list shows a person, a room, (object), scenery and I up/down arrow and hit TAB to add it - same process for other completions." The seven open questions were resolved by interview the same session.

