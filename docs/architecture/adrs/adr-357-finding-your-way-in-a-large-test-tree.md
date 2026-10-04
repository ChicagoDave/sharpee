# ADR-357: Finding your way in a large test tree

**Status**: **ACCEPTED** (David, 2026-10-03, session 4d81b6 — "yes, mark it accepted"). There is no Open Questions section. Acceptance authorizes no platform implementation by itself: D9's field (`packages/branch-tester`, `packages/transcript-tester`, `packages/ide-protocol`) still gets its own discussion before it is built. History: all seven open questions were resolved by interview on 2026-10-03 (session 4d81b6) and folded into D4–D10. `adr-review` the same day scored 7/18; its findings were drafted into fixes: D11 (staleness contract), D9's signature, D4's status mapping, D6's correction of record, the Affected and Acceptance Criteria sections, and three citation corrections. David's review of those fixes (same day) found D9's exported rule off by one on the main line and the edit-time reset in `main.ts`; D9 now carries the card id on the wire, and D11 removes the reset and catches inserted and reordered cards. David confirmed D11, D4's mapping and roll-up order, and D9's field the same day ("confirm and re-review"). D9's field is a platform change and still gets its own discussion before it is built. A second `adr-review` pass scored 14/18 with one finding, that the build id was taken from a bundle the run never executes; D11 now hashes the story's source files and the CLI executable before the spawn, and AC-11 and the ADR-322 wording close the other two items.
**Supersedes**: ADR-308 (testing navigation). ADR-308 was written on 2026-08-10, before ADR-353 and ADR-355, and parts of it no longer match the code. This ADR carries forward only what still holds. ADR-308's Status was flipped to SUPERSEDED by session 4d81b6 on 2026-10-03, when this ADR was written, at David's instruction; nothing further is owed.
**Scope**: `tools/ide/web/testing-surface/src`; one additive optional field on the run event, threaded through `packages/branch-tester`, `packages/transcript-tester` and `packages/ide-protocol` (D9), a platform change discussed before it is built; and host fields in each head's session payload (D11's `build`, and D5's phrase text when search ships). No schema change, and no view state on the wire (D1 as amended). The Affected section names every module.

## Date: 2026-10-03

## Parent

- **ADR-353** (the testing pane visits one line). It shipped the outline column that ADR-308 had no picture of.
- **ADR-355** (the test tree is segmented). D5 gives every segment and card a stable opaque id. Its Phase 3 (plan `docs/work/archive/segmented-test-tree/plan-20260929-adr-355.md`, DONE 2026-09-29) put the line's id, the id of the segment the line begins with, on the run event, and the run column is keyed by it.
- **ADR-322 D8** (consume ADR-321's derivations; do not rebuild them). It is written about world-index, so this ADR applies it by analogy, not as its rule: the walker knows which card each result came from, so it says so on the result, and the surface reads that rather than rebuilding the mapping (D9).
- **The explorer spike**, `docs/work/archive/testing-explorer/spike-20260922-explorer-measurement.md`, Finding 5 (lines 94-100): one defect fired 10,021 times across a walk.
- **ADR-356** (the story is the test suite). The derived tier's rows ride the same run stream.
- **Objective** `docs/objectives/author-narrative-testing.md`, O-1. David's scope ruling of 2026-10-03 makes testing navigation IN for O-1: one aid ships before 2026-10-15.

## Context

A fully tested story's tree is long. secret-letter held 61 lines behind 53 fork chips when ADR-353 measured it, and 106 lines by 2026-09-29 (`tests/outline.test.ts` header in the testing surface). The objective's story is 60 rooms, so its tree will be at least that size. As of 2026-10-03, the Testing surface offers the following ways to move around it:

- **The outline column** (`outline.ts`, `outline-view.ts`; ADR-353). It lists the tree's fork points. Opening one shows its lines, each named by its most distinctive command, and clicking a line visits it. It reads the tree document only, never the run. It does not show which lines passed or failed.
- **Fork chips** on the active line's cards (`cards.ts`). Each one visits a sibling line.
- **Region groups** on the active line's cards (`cards.ts`, `RegionGroup`). These are collapsible runs of same-region cards, derived from the Story IR's region map.
- **The run column** (`run.ts`, rendered in `cards.ts`). After a run it shows one result per line, keyed by the line's first segment id (ADR-355 Phase 3), plus the derived tier's rows. Clicking a row only expands or collapses it. Nothing in the column visits a line or moves the pane to a card.
- **Search.** The only search is the State picker's type-to-filter list (`picker.ts`), which searches world facts when you add an assertion. There is no search over the tree.

Two things changed underneath ADR-308. First, its "tree overview graph" now has a shipped counterpart, the outline column, in list form. Second, ADR-353 D2 blocked any line verdict that doesn't come from visiting the line, because the run keyed lines by labels that collided: 31 of secret-letter's 61 lines shared a label. ADR-355 removed that block: D5's segment ids, carried on the run event by its Phase 3. The run column can now be joined to the outline by id.

## Decision

### D1: Navigation is derived and never authored (carried from ADR-308 D1)

Every navigation aid reads the tree document, the last run's fold, and the Story IR's region map, then renders a view. No aid adds a field to the tests directory, the run stream, or the IR. Anything that must survive a reopen, such as collapse sets, is view state and is kept as view state. If an aid seems to need a wire or schema change, it is mis-scoped: stop and re-check against this decision. **Amended by D9 (2026-10-03):** the run stream may gain an additive, optional field that reports a fact its producer already holds, such as the card a result came from, so the surface reads the fact instead of deriving it. Such a field is a platform change and gets its own discussion. The line D1 still draws: no view state on the wire, nothing an aid needs written into the tests directory or the IR, and no field a consumer must understand to keep working.

### D2: Aids point into the pane; none replaces it (carried from ADR-308 D3, updated for ADR-353)

The pane shows one line at a time, and its card list is where detail lives. An aid gets you to a line, or to a card on a line. Getting to a line goes through the outline's existing visit, so there stays one boot path.

### D3: The outline and the run share one line id

Any aid that joins tree positions to run results joins on the line id: the id of the segment the line begins with (ADR-355 D5's segment id; `TreeLine.id` in `tree-walker.ts`; on the run event since ADR-355 Phase 3). Joins must never use labels, which are display text and are not unique.

### D4: The outline column is the tree overview, tinted from the last run (David, 2026-10-03, Q-1: "A")

There is no separate overview graph. ADR-308's drawn graph is retired. The outline column is the overview, and after a run each line pill carries its pass or fail from the run column's result, joined by D3's id. Each fork-point heading carries the worst result among its lines, so a closed heading still shows that a failure sits under it. A line the run tried and could not reach carries its own unreached tint, distinct from pass and fail, because it is a finding. A line with no result, because the tree has never been run or the line was added since, shows no tint, because that is unknown and not a finding (David, 2026-10-03, amending the first fold: "Never run means unknown. Unreached means the run tried and couldn't get there, which is a finding."). The tint is run-sourced, so it is subject to D11's staleness contract.

**The mapping from the wire's line status** (`run.ts`, `TranscriptRunResult.status`; proposed at review and confirmed by David, 2026-10-03): `passed` is pass; `failed` and `error` are fail; `unreached` is unreached; `skipped` and no result are untinted; a stale result (D11) is stale, whatever it was.

**The heading roll-up order** (proposed at review and confirmed by David, 2026-10-03), worst first: fail, unreached, stale, no result, pass. A heading shows pass only when every line under it passed on a current run. One line added since the run, or one stale line, keeps the heading from reading green.

### D5: Tree search looks through authored text and narrows the outline (David, 2026-10-03, Q-2: "A, with two additions")

The author's question is "which line was that on?", and the answer is a place in the tree. So search narrows the outline column to the lines with a hit, keeping their fork-point headings so each hit shows where it sits among the forks. A separate flat results panel is rejected because it strips out the structure the author then has to find their way back to.

Search looks only through what the tree document holds: commands, claim text, and the room names in authored location claims. All of that is always current. Two other sources are excluded.

- **Last-run failure messages** are excluded because they are true only until the next edit. One search field over data with two lifetimes would let some hits expire silently, and the author could not tell which kind they were looking at. If failure text becomes searchable, it does so as a filter inside failure navigation (D6), where everything on screen goes stale together.
- **Rooms captured from play** (`model.ts`, the per-ordinal room capture) are excluded because they are session-only, are persisted nowhere, and exist only for lines visited this session. Searching them would find a room on a visited line and miss it on every other.

The two additions:

- **Search sees through `emitted <id>` claims.** An `emitted <message-id>` claim (ADR-356 D3; `assertion-core.ts`, `checkEmittedAssertion`) pins a phrase id, not text, and 245 of secret-letter's claims are of that form (count over `secret-letter.tests/*.json`, 2026-10-03). Search matches against both the id and the phrase's text, resolved from the Story IR the surface already receives (as it receives the region map). Otherwise converting a claim to the better `emitted` form would quietly make it unfindable. This keeps to D1: the IR is read, not changed.
- **A line with several hits shows a count and moves between them.** Each narrowed line shows how many cards on it match. Visiting it highlights the first hit, and next/previous moves through the rest. One phrase can recur dozens of times on a single tree; "Time passes" is the measured case.

### D6: Failure navigation steps by failing card, and a stale failure stays visible (David, 2026-10-03, Q-3: "B, but the core is A's mechanics")

**The unit is the failing card, not the failing line.** Each failure is attributed to its card once. It is the explorer spike's Finding 5 again: one defect fired 10,021 times, so the report has to fold by defect. How a run result reaches its card is D9.

*Correction of record (review, 2026-10-03).* As first folded, this decision said a failing card above a fork makes every line below it fail for the same reason. The walker says otherwise for claims. A line's prefix is replayed as bare commands with no claims checked (`packages/branch-tester/src/tree-walker.ts`, the `for (const command of line.prefix)` loop), so a card's claims are checked once, in the line that owns the card, and a claim failure is already reported once. Where one card does reach many lines is an **execution error**: the owning line errors, and every line forking at or after that card, directly or through further forks, reports `unreached`. So the card's entry says how many lines it **blocks** ("blocks 6 lines"), counted from the tree and the run's `unreached` results; a claim failure carries no such count. The decision to step by card stands, because it still keeps one defect to one stop. The 2026-10-06 measure in D8 covers what this correction leaves open: one story defect can fail several lines at *different* cards, which no card fold merges.

**Next/previous failure** visits the failing card's line and scrolls the pane to that card. Clicking a failed row in the run column does the same, but it is not the only way in, because the run column scrolls away while the author is fixing things.

**A "failures only" switch** narrows the outline to the lines with a failed or unreached result, reusing D5's narrowing. Failure messages are searchable inside the switch and nowhere else, because everything the switch shows goes stale together (D5's reason for keeping them out of tree search). Three failures don't need the switch, but fifty do, and O-1's story is meant to find out what happens at scale.

**What makes a result stale.** A failure result is stale when any of these has changed since the run:
- a card the result's line runs through, including the line's shared prefix above its fork, so editing one shared card invalidates every line under it (the prefix's claims are not checked, but its commands set up the state the line runs in);
- the story itself, so a rebuild makes every result stale with no tree edit at all. This is the common case: the author sees the failure, fixes the story, and comes back.

How the surface detects each is D11.

**A stale failure stays visible.** It does not drop out of the failure list, because three failures becoming two would read as "one fixed" when it is only unverified. It stays in the list in a distinct stale state, and the list's count says so ("2 failing, 1 edited since run"). In the outline (D4), a line whose result is stale carries the stale state rather than its old tint.

### D7: A position indicator ships with the first aid, and keyboard movement follows (David, 2026-10-03, Q-4: "A")

**The position indicator is part of the first aid, not an extra.** Search (D5) and failure navigation (D6) both work by jumping. After a jump, the author's first question is "where did I land?", and without an indicator each jump drops them mid-line in a long pane, left to scroll up to find the fork they came through. The indicator is what makes D5 and D6 usable, so it ships alongside whichever of them ships first.

It is built from the tree document only: the fork's command and the line's name as the outline derives it (`outline.ts`). Rooms captured from play are not used, for D5's reason: they exist only for lines visited this session, so the indicator would name some lines and be blank on others.

**Keyboard movement** covers next/previous line, next/previous fork, and next/previous failure (D6 already defines that one as a command). It comes after the first aid. It is cheap once the indicator exists, because lines, forks and failures move through the same mechanism.

**Not on the list:**
- A coverage tint for rooms with no cards. It is on the wrong surface: the outline is organized by lines and forks, and a room with no cards has no place in it to tint. The Coverage strip already lists rooms entered out of rooms declared, with the gaps named. If a tint is wanted, it belongs on the World tab's Map, where it marks the room itself. That is outside this ADR.
- Bookmarks, because no observed pressure calls for them.

### D8: The failure path ships first, ordered so the card mapping (Q-6, now D9) cannot hold it up (David, 2026-10-03, Q-5: "A")

Before 2026-10-15, plan Phase 6 ships the outline tint (D4), failure navigation with its switch (D6), and the position indicator (D7). Search (D5) and keyboard movement (D7) come after.

**Why the failure path.** The first full run of a new 60-room story is a loop: run, see what failed, fix, run again. Search answers "where did I write that?", which matters once the tree is old enough to forget. The beats that can falsify O-1 are about failures and gaps being visible and reachable; none of them is "I couldn't find a card."

**Why not everything.** The binding constraint is not the plan's budget. It is that O-1 misses if the story is not written by 2026-10-15, and David is writing it. Every surface that ships before then is one more thing to try out while authoring 60 rooms, so one Medium phase done well is the right size.

**Order inside the phase**, so that the card id is harmless (it was open as Q-6 when this was decided; D9 has since settled it, but its wire field still waits on a platform discussion):
1. **The tint and the indicator.** Neither needs the card id: the tint works at line level, and the indicator reads authored data. Until step 3 lands, the existing reset on edit stays, so an edit after a run clears the tint to "no result". That is unknown rather than wrong, and it is the interim. Target: in place for the 2026-10-06 checkpoint.
2. **The run-column click.** A failed row visits its line, which works at line level. Scrolling to the failing card uses D9's card id once it is on the wire, so until then the click lands at the top of the line.
3. **D11, the staleness contract**: remove the reset on edit, capture the baseline, restore the last run from the sidecar, and have the hosts compute the build id (before each run, at load, and on each source save). It needs no card id for line-level staleness, so it can start before D9 lands.
4. **Next/previous failure and the switch**, after D9's card id lands, since both step by card. If that slips, these land for the 2026-10-13 checkpoint, and the first checkpoint still had a usable failure path.

**What the 2026-10-06 checkpoint measures for this ADR:** how many failures a real run of the new story produces, and how many of them are the same defect seen from several lines. That number says whether D6's fold-by-card rule is a nicety or a necessity before the switch is built.

### D9: Every run result carries the id of the card it came from (David, 2026-10-03, Q-6: "C, if it can ride the wire change Phase 3 is already making. Otherwise B. Not A."; revised at review the same day, below)

**What the walker does.** One card is one command, and that includes the boot card, which executes as `look`. A card marked to skip still runs its command; only its claims are suppressed. The walker leaves the opening card out of the command list and stops after an END STATE card. When the opening card has claims, the runner adds an `(opening)` row ahead of the commands (`packages/transcript-tester/src/runner.ts:450`), which the run stream carries and the surface keeps (`run.ts`, "opening row included"). The walker filters that row out before indexing (`tree-walker.ts:470`). It keeps the map from each command back to its card (`transcriptOfLine`, `cardIndexOfCommand`) but uses it only to place an execution error. A `command-result` event carries the line id, the input and the position, but no card id.

**First fold, and why it was revised.** The condition David set for C was not met: ADR-355's Phase 3 is DONE and merged (plan `docs/work/archive/segmented-test-tree/plan-20260929-adr-355.md`, Phase 3 DONE 2026-09-29; merge `43e851807`, 2026-10-02), so there was no wire change open to ride, and the first fold took B: export the walker's rule (`executedCardsOf`) for the surface to apply. David's review found B off by one on the main line. The `(opening)` row is result 0 whenever the opening card has claims, as secret-letter's does, so every later card would shift by one, and a failed opening claim would have no card to land on. Repairing B means the surface drops a row matched on the string `(opening)` and maps its failure to a card by a second special case. David left the choice between that and pulling C forward to this session. C is taken.

**The cost that decided it.** Run events are not in the `repokit protocol` contract, so no Swift or C# types regenerate (ADR-355 plan, Phase 4 progress note, 2026-09-30). The change is one optional field threaded through code that already holds the card:
- `packages/branch-tester/src/tree-walker.ts`: `transcriptOfLine` sets each command's card id, and the opening card's id for the opening row.
- `packages/transcript-tester/src/types.ts`: `TranscriptCommand` gains `cardId?: string`, and `Transcript` gains `openingCardId?: string`. `runner.ts` puts `openingCardId` on the `(opening)` row it synthesizes.
- `packages/transcript-tester/src/run-event-stream.ts`: `commandResult` writes `cardId` when the command has one. `packages/branch-tester/src/auto-assertion.ts`, `streamableCommandResult`, passes it through if it does not already.
- `packages/ide-protocol/src/run-events.ts`: `CommandResultEvent` gains `cardId?: string`, documented as the id of the tree card the result came from, absent for transcript runs.

The field is additive and optional, so a consumer that does not know it ignores it, the two heads need not move on the same day, and transcript runs are unchanged. It is a platform change across three packages and gets its own discussion before it is built (CLAUDE.md).

**What it buys.** A result names its card, so no rule is needed in the surface, including no special case for the opening. A failed opening claim lands on the opening card. Staleness (D11) can check the card directly: does this id still exist, and has the card changed? A `sharpee test` report line can carry the same id the IDE shows, so the two can be linked.

**Rejected:**
- **B, exporting the walker's rule.** It needs the opening special case above, and the surface would still be applying a rule to its own copy of the tree, which is correct only while that copy matches the one the run used.
- **The surface rebuilding the rule itself.** That is a second copy of a rule the walker owns, the pattern ADR-322 D8 forbids for world-index's derivations and this ADR applies by analogy.

### D10: Failure navigation includes derived-tier failures, walks them first, and never leaves the Testing tab by stepping (David, 2026-10-03, Q-7: "A, with two changes to how it walks")

**One list, one count.** The failure list counts tree failures and derived-tier failures (ADR-356) together: three failures, not "two, plus one over there." ADR-356 D5a rejected "run by default, report only" for the derived tier because it lets an author ignore the tier. A count beside the list that next/previous never visits would be a milder version of that.

**Derived failures come first.** A derived failure means the story contradicts its own source, and it is often the cause of the tree failures. The narrative has that exact case: the planted rule turns a derived row red, and the tree notices "one card later." Walking tree failures first would show two symptoms before the cause. Fixing the contradiction and re-running may clear some tree failures on its own.

**A derived step stays in the Testing tab.** It focuses the derived row in the run column and shows its span and message there. Opening the editor at the span is an explicit action: Enter, or the span link the row already has. Next and previous are Testing-tab commands, so if a step moved focus to the editor, the next key press would do nothing, or whatever the editor binds it to. A step that opens the editor directly would need next/previous to work from the editor too. That is global keyboard movement, which D7 put after the first aid.

**Derived results go stale on a rebuild.** The derived tier is generated from the IR, so any story rebuild makes every derived result stale. Stale derived failures take the same "edited since run" state as tree failures (D6) and stay in the list.

### D11: The staleness contract — a baseline captured at run start, and a last run that survives the reload (proposed at review and confirmed by David, 2026-10-03)

D6 and D10 say when a result is stale. This decision says how the surface knows.

**Two things wipe a run today, and both go.**
- **An edit.** `update()` in `tools/ide/web/testing-surface/src/main.ts` calls `resetRun` whenever the tree's files change ("its results describe a tree that no longer exists"), so the first edit after a run clears every result before any staleness rule can apply. That reset is removed. An edit re-evaluates staleness instead.
- **A rebuild.** The macOS host's `load(bundleDirectory:)` (`tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift`) reinstalls the session payload and reloads the page, and the run fold lives in memory (`run.ts`). The last run is restored from the sidecar instead (below).

Either one turns every result into "no result", not "stale", which is the vanishing D6 rules out.

**The baseline.** When a run starts (`beginRun` in `run.ts`), the surface records:
- the **build id** the host computed for this run (defined below).
- for every line, its **path**: the ordered list of card ids from the root through the fork card, then the line's own cards;
- for every card id, a **card fingerprint**: the card's canonical JSON with its `branches` and `continuation` left out, so a fork added below a card does not count as an edit to it.

**The build id describes what the run executed, not the bundle** (revised at the second review, 2026-10-03). A run does not touch the bundle: the macOS host spawns `sharpee test <story file> --tree --capture-output --capture-world --json` (`tools/ide/SharpeeIDE/Test/TestRunner.swift:97-113`), and the CLI compiles the story's source with its own platform. So the id is a hash over two things:
- **every story source file in the project**: the `.story` file and every `.chord` file under the project directory. The host does not follow imports. secret-letter is one `.story` plus 24 `.chord` files (`find branch-stories/secret-letter -name "*.chord"`, 2026-10-03), and following imports would put import resolution into two hosts. Hashing them all occasionally marks results stale after an edit to a file the story does not use, which errs the safe way.
- **the CLI executable the host spawns**, resolved to its file: its path, size and modification time. A version string is not enough, because it does not change while the platform is being rebuilt locally.

**When it is computed.** The host computes the id **before** it spawns the run, never after, and hands it to the surface with the run's start, where it becomes the baseline's build id. If the author saves between hashing and spawning, the baseline holds the old id while the run compiled the new source, so the result shows stale: the safe direction. Hashing after the spawn could do the opposite and mark a result current that describes older source. The host also gives the surface the **current** id: in the session payload at page load (a new `build` field in `__SHARPEE_TESTING_SESSION__`, alongside `regions`), and again whenever a story source file is saved.

**Intended end state, not built now.** The run could report what it compiled in its first event, a fact the producer already holds (D1 as amended), which would make the baseline exact. The host would still need its own hash for the current id, so this complements the host hash rather than replacing it.

**The test.** A tree result is stale when the current build id differs from the baseline's, or when the line's current path differs from its baseline path, or when any card on the path has a different fingerprint. Comparing the ordered path catches inserted, removed and reordered cards, which a fingerprint check alone misses. A line with no baseline path, because it was added after the run, has no result. A derived-tier result is stale when the build id differs. Staleness is re-evaluated whenever the tree changes or the page boots.

**The last run survives the reload.** The fold's line statuses, its failure entries (card id, message, `blocks N lines`), the derived failures, and the baseline are stored in the ADR-307 D7 view-state sidecar, which the host stores opaquely. The sidecar lives outside the repository (under Application Support on macOS, LocalApplicationData on Avalonia), so storing the last run there causes no repository churn. Passing commands are not kept, so the stored size scales with failures, not with the tree. On boot the surface restores the last run and evaluates staleness against the injected tree and build id. A sidecar that cannot be read restores nothing, and every line shows no result, which is honest, because it is unknown.

**Assumption, with its check:** the run executes the tree the surface shows. The surface writes each segment as it is edited (the per-segment bridge post, ADR-355 Phase 3), so this holds unless a run starts mid-write. AC-6 includes an edit-then-run case that would expose it.

## Affected

- `tools/ide/web/testing-surface/src/run.ts`: the baseline (D11), the per-card failure fold and `blocks N lines` (D6), stale evaluation, and sidecar restore.
- `tools/ide/web/testing-surface/src/outline.ts`, `outline-view.ts`: the tint and heading roll-up (D4), the failures-only narrowing (D6), later search narrowing (D5).
- `tools/ide/web/testing-surface/src/cards.ts`: the run-column click (D6), the failure list and its count, the derived-row focus (D10), the position indicator (D7).
- `tools/ide/web/testing-surface/src/main.ts`: removing the `resetRun` call in `update()` (D11), reading `build` from the session payload, next/previous wiring, and the sidecar write.
- `packages/branch-tester/src/tree-walker.ts` (`transcriptOfLine` sets card ids and the opening card's id) and `src/auto-assertion.ts` (`streamableCommandResult` passes `cardId` through) (D9).
- `packages/transcript-tester/src/types.ts` (`TranscriptCommand.cardId`, `Transcript.openingCardId`), `src/runner.ts` (the `(opening)` row), `src/run-event-stream.ts` (`commandResult` writes `cardId`) (D9).
- `packages/ide-protocol/src/run-events.ts`: `CommandResultEvent.cardId` (D9).
- `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift` and `tools/ide/PaneHost/Hosting/PaneServer.cs` (with `MainWindow.axaml.cs`, where the payload is built): the current build id in the `build` field, at load and on each story source save (D11); later a phrase-text field for search (D5), injected the way `regions` is.
- `tools/ide/SharpeeIDE/Test/TestRunner.swift` and `tools/ide/PaneHost/Shell/TestingSession.cs`: compute the build id before spawning the run and hand it to the surface with the run's start (D11).

## Acceptance Criteria

Each criterion names its test. "Real path" means a run of `sharpee test --tree --json` over a scratch copy of a real tree, folded by `run.ts`, never a hand-written event stream (DEVARCH 13a). The IDE-only beat needs David in Chord Writer, and he is told beforehand.

- **AC-1 (tint, D4).** On a scratch copy of secret-letter's tree with one planted claim failure on a card in line L: L's pill is fail, L's fork heading is fail, and every other line is pass. A never-run tree shows no tint anywhere. Test: surface vitest over the real-path fold.
- **AC-2 (unreached and blocks, D4/D6).** A planted execution error on a fork card: the owning line is fail, every line forking at or after it is unreached, and the card's failure entry reads "blocks N lines" with N equal to that count. A claim failure's entry carries no count. Test: real-path fold.
- **AC-3 (indicator, D7).** After a visit from the outline, a fork chip, or the run column, the indicator names the fork's command and the line's outline name, including for a line not visited earlier in the session. Test: surface vitest; David's click-through.
- **AC-4 (run-column click, D6/D8).** Clicking a failed row visits its line. Once D9 lands, the pane is scrolled to the card named by the failing result's `cardId`. Test: surface vitest.
- **AC-5 (card id on the wire, D9).** A real `sharpee test --tree --json` run over a tree whose main line holds an opening card with claims, a boot card, a card marked to skip, turns, an END STATE card and cards after it: every `command-result` carries the `cardId` of the card it came from, the `(opening)` row carries the opening card's id, the boot card's result carries the boot card's id, no result is emitted for the cards after the ending, and a planted failure on the opening claim lands on the opening card. A transcript run's events carry no `cardId`. The surface contains no command-to-card rule, checkable by absence. Test: devkit real-path test over a scratch tree, plus a transcript-tester stream test.
- **AC-6 (staleness, D11).** After a run: an edit no longer clears the run column; editing a prefix card makes every line under that fork stale, and the count reads "N failing, M edited since run"; inserting, removing or reordering a card on a line's path makes that line stale; a line added after the run has no result; saving any story source file (`.story` or `.chord`) after the run, or rebuilding the CLI, makes every tree and derived result stale; a save between the host's hash and the spawn shows the result stale, never current; deleting a failing card makes its result stale without an error; reopening the page restores the last run with the same stale states; editing a card and then running produces no stale state. Test: surface vitest with a real-path fold.
- **AC-7 (order and focus, D10).** With derived failures and tree failures both present, next walks every derived failure first, then tree failures in run order (line order, then card order). A derived step focuses its run-column row and leaves focus in the Testing tab, and Enter opens the editor at the span. Test: surface vitest; David's click-through.
- **AC-8 (switch, D6).** The switch narrows the outline to failed and unreached lines; text typed inside it matches failure messages; with no failures it says so and shows no lines. Test: surface vitest.
- **AC-9 (empty run).** A run with no failures leaves the list empty and next/previous inert, with no error. Test: surface vitest.
- **AC-10 (search, D5; after 2026-10-15).** Search narrows to lines with a hit, matches an `emitted` claim by its phrase text, shows a per-line count, and never matches failure messages or play-captured rooms. Test: surface vitest with an injected phrase table.
- **AC-11 (unreadable sidecar, D11).** A sidecar whose last-run entry is missing, malformed or from an older shape restores nothing: every line shows no result, the failure list is empty, and the surface boots without error. Test: surface vitest.

## Consequences

- Navigation work is IDE work. A navigation change that writes view state to the wire, or needs anything written into the tests directory or the IR, is a signal to re-scope (D1). An additive, optional field reporting a fact the producer already holds is a platform change to discuss, as D9's `cardId` is.
- An aid that uses run results can go stale. Search avoids the problem by reading only authored text (D5). The outline tint (D4) and failure navigation (D6, D10) read the run, and D11 says how they know.
- ADR-308's tree overview graph is retired (D4). A future proposal for a drawn graph would reopen D4, not extend it.
- O-1 counts this row as shipped once one aid from these questions ships and the narrative's navigation beat holds on the objective's story.

## Session

2026-10-03, session 4d81b6. David asked for this rewrite when the ADR-308 interview showed that ADR to be out of date: "if the ADR is out of date, we should close it and rewrite a new ADR with what isn't out of date."
