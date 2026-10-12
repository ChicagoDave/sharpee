# Session Plan: Close the remaining rows of the author testing narrative's table

**Created**: 2026-10-02
**Plan Status**: ACTIVE
**Superseded by**: docs/work/archive/chord-syntax-round/plan-20261009-adr-360-362.md (archived 2026-10-10; set aside "still live" on hold at Phase 6b, David, 2026-10-09)
**Resumed**: 2026-10-05 (session f8ef32) at Phase 6b, after the ADR-359 D1 plan (`docs/work/archive/adr-359-kind-line/plan-20261005-d1.md`) finished; it had set this plan aside "still live" (David, 2026-10-05).
**Serves objective**: author-narrative-testing (`docs/objectives/author-narrative-testing.md`, O-1, due 2026-10-15; checkpoints 2026-10-06 and 2026-10-13)
**Overall scope**: Re-count the closing table of `docs/work/testing-narrative/narrative-20260926-author-testing.md`, ready the harness for David's 60-room story, and plan the four rows not yet shipped. Three of the four need a ruling from David before any build. No story content is planned; David invents and writes the story himself.
**Bounded contexts touched**: Narrative test harness (`scripts/__tests__/`), Testing surface (`tools/ide/web/testing-surface`), derived rule tests (`packages/branch-tester`, platform), author CLI (`packages/devkit`, platform), docs.
**Key domain language**: closing table row, derived tier, SKIPPED shape, arrange shape, lens, Testing tab.
**Authorization**: planning only. Every `packages/` phase below is a platform change and needs David's discussion first. No implementation starts without his go.

## References consulted
- `docs/objectives/author-narrative-testing.md` — O-1 falsified if a beat fails on the new story, a coverage gap goes unlisted, or David hand-writes a test; baseline 10 of 15; not-ruled-out-of-scope is David's call.
- `docs/architecture/adrs/adr-308-testing-navigation.md` — DRAFT, cursory; D1 says navigation is a derived view, no wire/schema/branch-tester changes; Q-1 to Q-5 unresolved, so it cannot be built yet.
- `docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md` — ACCEPTED; D2 arrange floor (amended 2026-09-27 for timer phases); SKIPPED shapes never fail the build.
- `docs/architecture/adrs/adr-355-the-test-tree-is-segmented.md` — landed 2026-09-30 (note in the ADR); the narrative table row still says "not yet merged".
- `docs/work/archive/segmented-test-tree/plan-20260929-adr-355.md` — DONE; the pattern for a platform-touching plan here.
- GH #525 (open) — next arrange shapes, ranked by secret-letter SKIPPED counts: occurrence 4, command-none 90, no-claims 52 (the last two "need a different tier or mapping, not a new arrange shape").
- GH #508, #515 (closed) — the two lenses, shipped as developer tools.

## Verified state of the closing table (2026-10-02)

15 rows. 11 shipped, 4 remain.

| Row | Verified state | Evidence |
| --- | --- | --- |
| Rows 1-9 (World tab, Testing tab, forking, END STATE, derived rule tests, SKIPPED, three ratios, derived rows, span links) | Shipped | nine `scripts/__tests__/narrative-*.test.ts` suites exist; IDE-only beats carried by the macOS/Avalonia heads |
| Tobias topics | Shipped (GH #530 closed) | `narrative-unexpected-failure.test.ts` |
| Segmented test tree | Shipped and merged to main (commit 43e851807). The table row still says "not yet merged"; stale | ADR-355 landed note; `narrative-support.test.ts` |
| Arranging beyond the floor | Partial, as the table says: `or`, failed `and`, named conditions, timer phases shipped; negations are a policy read-only; occurrence ordinals unbuilt (no ordinal code in `packages/branch-tester/src`) | GH #525 open; 4 occurrence branches of 721 on secret-letter |
| Effect-less bodies and conversation rows with no player command | Unplanned. Code skips them by name (`derived-runner.ts:322`, "the body has no effects"); no tier or mapping exists. Secret-letter: 52 no-claims, 90 command-none | GH #525 |
| Explorer lenses | Developer CLIs only: `tools/explorer-probe/lens-examinable.js`, `lens-declared-state.js`; no `sharpee` subcommand, nothing in `packages/devkit` | grep of devkit and scripts found no wiring |
| Testing navigation | **Shipped** (2026-10-12, Phase 6): outline tint and position indicator, run-column click landing on the failing card (D9), staleness contract (D11), next/previous failure with the failures-only switch and its filter (D6/D10). Tree search (D5) and keyboard movement (D7) follow the first aid by ADR-357 D8's order. Was: cursory DRAFT with only the State picker's search | ADR-357; `tools/ide/web/testing-surface/src/{failures,outline,line-verdict,staleness}.ts`; `TestingSurfaceRealPathTests.swift` |

Baseline "10 of 15" becomes **11 of 15** after the segmented tree row. Checkpoint count to report on 2026-10-06: 11 of 15 unless David rules rows out of scope or one ships.

## Phases

### Phase 1: Reconcile the table and the objective baseline
- **Tier**: Small
- **Budget**: ~100 tool calls (likely far fewer)
- **Domain focus**: docs only
- **Entry state**: no plan current; the table row for the segmented tree says "not yet merged to main"
- **Deliverable**: the segmented-tree row and its Status column corrected in the narrative; a dated re-count (11 of 15) noted in the objective; the plan path in the objective's Spawned work
- **Exit state**: the table and the objective agree with code and with each other
- **Status**: DONE (2026-10-02, session b32782) — narrative row and table date updated; objective carries a dated Progress line (11 of 15) beside the untouched baseline; Phase 2's question cross-references corrected to Phases 5, 7, 8, 9

### Phase 2: Gate G1 — David's scope rulings (decision, no code)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: which rows O-1 must hold
- **Entry state**: Phase 1 done
- **Deliverable**: David's recorded answer to each question, written into the objective. Questions:
  1. **Explorer lenses**: ruled out of scope for O-1 (they are developer tools, not an author surface), or promoted? His call. If promoted, Phase 9 is a platform change adding a `sharpee` subcommand.
  2. **Effect-less bodies and command-none rows**: they are listed as SKIPPED and never fail, so the "no gap goes unlisted" falsifier holds already. Rule out of scope for O-1, or build a tier/mapping (needs an ADR-356 amendment first, Phase 8)?
  3. **Occurrence ordinals**: 4 of 721 on the stress case. Rule out of scope, defer, or build (Phase 7)?
  4. **Testing navigation**: required for a 60-room tree to count as "reviewable"? If yes, the Phase 5 interview is needed; if no, rule out for O-1.
- **Exit state**: each of the four rows is IN or OUT for O-1; phases below marked ABANDONED or DEFERRED accordingly
- **Status**: DONE (2026-10-03, session 4d81b6) — David ruled: explorer lenses DEFERRED (Phase 9 DEFERRED); effect-less bodies and command-none rows DEFERRED (Phase 8 DEFERRED); occurrence ordinals IN (Phase 7); testing navigation IN (Phases 5 and 6). Recorded in the objective's Scope rulings line; rows counted for O-1 are now 13, 11 shipped.

### Phase 3: Make the narrative suites story-parameterised
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: harness (`scripts/__tests__/support/fernhill-run.ts` hard-codes fernhill; nine suites import it)
- **Entry state**: Phase 1 done; no new story needs to exist (tested against fernhill and a scratch fixture)
- **Deliverable**: the support module takes a story directory (default fernhill) so every `narrative-*.test.ts` suite runs against fernhill and, when named, David's story, with no per-story assertions hard-coded and no story content written. Beats that cannot apply to a story (for example Tobias) stay fernhill-only. Not a `packages/` change.
- **Exit state**: `pnpm test:scripts` green on fernhill; one command points the suites at another story directory
- **Status**: DONE (2026-10-02, session b32782; Phase 2 gate deliberately skipped ahead of on David's go — Phase 3 does not depend on it). Unblocked by GH #554, fixed the same day: the four suites match a line by `lineLabel` (its `transcript-start` label) and the main line by the tree's root segment id; `pnpm test:scripts` → 93 passing, 0 failures, 15 files. The record as first written:
  - Built: `support/story-under-test.ts` (fernhill plus the story `NARRATIVE_STORY` names; async spawn so a 90 s run does not starve the vitest worker's RPC) and `narrative-holds.test.ts` (each beat's story-independent claims, tool claims and story claims in separate cases). The nine fernhill suites stay as fernhill's pinned record, unchanged. One command: `NARRATIVE_STORY=branch-stories/<story> pnpm test:scripts narrative-holds`.
  - Evidence (2026-10-02): `pnpm test:scripts narrative-support narrative-holds` → 28 passing, 0 failures on fernhill; `NARRATIVE_STORY=branch-stories/ides-of-march` → 26 passing, 0 failures; `NARRATIVE_STORY=branch-stories/secret-letter` → 40 passing, 3 failures, all story claims (32 rooms unplaced on the Map, 40 unreached, 53 derived rows failing), every tool claim green, no worker timeout.
  - Blocked: `pnpm test:scripts` is not green on fernhill. 9 failures in `narrative-endings`, `narrative-pinned-prose`, `narrative-playing-through` and `narrative-rule-tests-itself`, present on main before this phase (verified by stash): they match lines by the pre-ADR-355 name (`opening-iron-gates`, `folly · wait`) where the wire now carries the segment id and puts the name in `label`. Awaiting David's go to fix.

### Phase 4: Checkpoint 2026-10-06 run
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: objective cadence
- **Entry state**: Phases 1 and 3 done; whatever of the story exists (may be partial)
- **Deliverable**: `sharpee test <story>` report and the narrative suites run against it, closing table re-counted against 11 of 15; failures reported, not fixed. No story authored by the agent.
- **Exit state**: checkpoint result recorded in the objective
- **Status**: PENDING

### Phase 5: Gate G2 — ADR-357 open-questions interview (testing navigation; ADR-357 superseded ADR-308 on 2026-10-03)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: ADR-357 Q-1 to Q-5 (outline as the overview with run tint, search, failure navigation, other aids, which ships first)
- **Entry state**: G1 says navigation is IN; David available for `/devarch:adr-interview`
- **Deliverable**: ADR-357 resolved and ACCEPTED (not before: DRAFT with open questions must not be treated as authorization)
- **Exit state**: a concrete first aid chosen, probably failure navigation or search
- **Status**: DONE (2026-10-03, session 4d81b6) — ADR-308 found out of date and SUPERSEDED at David's instruction; ADR-357 written, its seven questions resolved by interview, two `adr-review` passes (7/18, then 14/18 with one finding, fixed), ACCEPTED. First aid chosen (ADR-357 D8): the failure path, ordered tint and position indicator, run-column click, the D11 staleness contract, then next/previous failure and the failures-only switch. Phase 6 carries one platform discussion: D9's `cardId` on the run event.

### Phase 6: Implement the first testing-navigation aid
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Testing surface, a derived view over the tree and last run fold
- **Entry state**: Phase 5 done
- **Deliverable**: the chosen aid in `tools/ide/web/testing-surface` (web surface shared by both heads), with tests, exercised on a secret-letter-sized tree. Built in ADR-357 D8's order: (1) outline tint and position indicator, target 2026-10-06; (2) run-column click; (3) D11 staleness contract, including both hosts' build id; (4) next/previous failure and the switch. Step 4 needs D9's `cardId` on the run event, a platform change across `packages/branch-tester`, `packages/transcript-tester` and `packages/ide-protocol` that is discussed with David before it is built. Steps 1–3 need no `packages/` change. The IDE-only beat needs David's eyes (warn him beforehand).
- **Exit state**: aid shipped; table row moves to partial or shipped
- **Resumed** (2026-10-11, session fd3ae9, David: "go"): Phase 6b's findings come before steps 2–4. First the failure path's missing half, F-10 and F-14 — a failed claim in the run results shows the game's actual output in place of the line that repeats the claim. The `command-result` wire event already carries `actualOutput` on failed results (`packages/ide-protocol/src/run-events.ts`; emitted at `packages/transcript-tester/src/run-event-stream.ts:256`), so this is a `tools/ide/web/testing-surface` change only: the fold in `src/run.ts` keeps the field, the detail in `src/cards.ts` renders it. F-10's CLI side is a `packages/` reporter change and waits for discussion.
- **F-13 landed** (2026-10-11, session 10f6b3): the fold keeps a line's first failure as data (`FirstFailure`: where, message, command index) and the column composes the header line; the main line's boot row is titled `(boot look)` and a failing boot look's header reads `turn 1 · boot — …`, matching the card column's own `turn 1 · boot`. `bootLookIndex`, `commandRowText`, `firstFailureText` in `src/run.ts`; `src/cards.ts` renders. Testing surface `npx vitest run` → 195 passing, 0 failures, 17 files; `tsc --noEmit` clean (2026-10-11 13:57 CDT); bundle rebuilt. Surface only; the runner's own label for the boot card is untouched.
- **Step 2 DONE** (2026-10-11, session 10f6b3, David: "go"): the run-column click. A failed or errored row is a button (`role=button`, Enter/Space) that visits its line and lands at the top of the line — the opening for the main line, the first own card for a branch (`scrollToLineTop` in `src/cards.ts`; `visitFailure` in `src/main.ts`; the rule `runRowVisitTarget` in `src/run.ts`, AC-4's vitest). Passed, skipped, unreached and unrun rows stay inert. Landing on the failing card waits on D9's card id. Testing surface `npx vitest run` → 196 passing, 0 failures, 17 files; `tsc --noEmit` clean (2026-10-11 16:16 CDT); bundle rebuilt. The click itself needs David's click-through in Chord Writer.
- **Step 2 verified** (2026-10-11, session 487a1f): David's click-through in Chord Writer over `TEST-001-T` copied onto `upps.story` — the FAIL row's click, Enter and Space each select the line and scroll the card column to the opening; a passing row stays inert. Found on screen: the derived-rules header printed its pass count as a bare `1`; now `1 pass`, matching the tree header (`renderDerivedRows` in `src/cards.ts`). Testing surface `npx vitest run` → 196 passing, 0 failures, 17 files; `tsc --noEmit` clean (2026-10-11 21:40 CDT); bundle rebuilt. The suite runs in the node environment, so header text has no DOM test, as before. New finding F-15 (the tab says what failed, not what to do; the World Index already names the cause) recorded in `upps-findings.md` for steps 3–4's scope.
- **Step 3 built** (2026-10-11, session 487a1f, David: "go"): the D11 staleness contract. Surface: `src/staleness.ts` (baseline = host build id + per-line card-id paths + per-card fingerprints without `branches`/`continuation`; `isLineStale`, `areDerivedStale`; the stored run `StoredRun` v1 — verdicts, first failures, derived failures, baseline, never passing commands — `storedRunOf`/`restoreRun`); `run.ts` carries `stale` on a result and `baseline`/`derivedStale` on the column; `main.ts` captures the baseline at the Run click, no longer resets the column on a tree edit (it re-judges), restores `view.lastRun` at boot, posts `lastRun` in the D7 sidecar `state`, and exposes `runStart(build)` and `buildChanged(build)` to the hosts; `line-verdict.ts` reads `stale`; the run row dims its badge and says "edited since this run — unverified"; the derived header says "story rebuilt since — unverified". macOS host: `TestingBuildIdentity.swift` (SHA-256 over every `.story`/`.chord` under the project by relative path and bytes, then the CLI's path/size/mtime; `.tests`, `dist`, `node_modules` skipped), `build` in the session payload, `runStart` before the spawn in `startTestRun`, `noteSourceSaved` → `buildChanged` from a new `EditorViewController.onDocumentSaved` wired in `MainWindow`; the sidecar store is unchanged (it holds `view` opaquely). Avalonia host: `TestingSession.BuildIdentity`, `build` in the payload, `runStart` before the spawn, `buildChanged` on a `.story`/`.chord` save; its sidecar store does not exist and is filed as GH #586. Tests: `tests/staleness.test.ts` 21 passing (every D11 rule both ways, the fork-below exemption, stored-run round trip including derived rows and a populated column, junk restores nothing, and `evaluateStaleness` — the wiring, moved out of `main.ts` after the mutation check so it is testable — setting and clearing the flags); surface suite 218 passing, 18 files, tsc clean (2026-10-11 22:58 CDT); `TestingBuildIdentityTests` 7 passing (xcodebuild, pinned invocation); `TestingSessionTests` 9 passing (3 new, dotnet test); bundle rebuilt. **The IDE scenario is automated, not hand-clicked** (David, 2026-10-11: "why can't you automate these tests"): `testRunResultsGoStaleOnEditAndOnSaveAndSurviveReload` in `SharpeeIDETests/TestingSurfaceRealPathTests.swift` boots the real page over the project's own tree, runs it on the real CLI, authors a claim on the fork card (both lines through it go stale, nothing vanishes, the outline tints), ⌘Z clears it, a saved `.chord` stales every row and the derived tier, restoring the file clears it, a reload (waited for on the genuinely new page) restores the run current from the sidecar, and a save after the reload stales the restored run — 23 passing in the class, 30 with the identity tests (2026-10-11 23:17 CDT). Two findings from writing it: a restored run keeps no passing derived rows, so the stale note had to move onto the coverage strip (`.ts-cov-stale`); and the host's build relays now log a delivery error instead of swallowing it.
- **Step 4a built — D9's `cardId` on the wire** (2026-10-12, session ef7e8e, David: "go" after the discussion this step waited on): every `command-result` names the tree card it came from, the `(opening)` row included. Platform: `TranscriptCommand.cardId` and `Transcript.openingCardId` (`packages/transcript-tester/src/types.ts`), the stream writes `cardId` when the command has one (`run-event-stream.ts`), `CommandResultEvent.cardId` and its guard (`packages/ide-protocol/src/run-events.ts`), the walker names each card and the opening card whether or not it has authored claims (`tree-walker.ts`), and branch-tester's OWN runner puts the id on the `(opening)` row (`packages/branch-tester/src/runner.ts` — ADR-357 D9 named transcript-tester's runner, which the walker does not use; corrected in the ADR). Surface: `CommandOutcome.cardId`, `FirstFailure.cardId`, `RunVisitTarget`; the run-column click lands on the failing card (`ordinalOfCardId` in `model.ts`, `scrollToCard` in `cards.ts`, `visitFailure` in `main.ts`), the line top when the wire named none or the card is gone. Tests: walker 34 passing (opening row = result 0 names its card; no id → no field); transcript-tester 370 passing; ide-protocol 55 passing; branch-tester 329 passing; surface 222 passing, `tsc --noEmit` clean (2026-10-12 00:00 CDT); bundle rebuilt; `./repokit build dungeo` complete. Real path: `./sharpee test branch-stories/upps/upps.story --json` carries `cardId` on all 8 results. `pnpm test:scripts` → 4 failing, 69 passing, 24 skipped, every failure a Fernhill timeout or the claims report's wall-clock line in a stderr byte-compare (`narrative-holds.test.ts:166`), none from this step — GH #587. The landing is automated on the real IDE path rather than click-tested: `testRunColumnClickLandsOnTheFailingCardTheWireNamed` in `TestingSurfaceRealPathTests.swift` runs the mini project through the real CLI, clicks the FAIL row, and asserts exactly one card carries `.ts-card-landed` with the id the wire named for the first failure (the pre-D9 line-top fallback sets no mark) — passed under the pinned xcodebuild invocation (2026-10-12 00:29 CDT). The landed card gets a fading ring (`.ts-card-landed`, `surface.css`).
- **Step 4b built — next/previous failure and the failures-only switch** (2026-10-12, session ef7e8e, David: "let's start step 4b"): `src/failures.ts` holds the one list (D10: derived failures and errors first in arrival order, then one stop per failing card in run order, an errored line with no failing card as one stop; unreached lines are not stops; stale failures stay and the count reads "N failing, M edited since run" per D6), the text filter over label and message (failure text searchable here and nowhere else, D5/D6), and the wraparound step (inert on an empty list, AC-9). `narrowOutline` in `src/outline.ts` keeps the kept lines and the fork headings above them; `OutlineView.render` takes the kept set, forces kept forks open, and its summary reads "N failing lines" or "no failures" (AC-8). The run column gains a failure header (`‹ ›`, the count, the "failures only" switch, a filter field shown while the switch is on; `src/cards.ts`); derived failure rows are focusable and Enter opens the editor at the span (the step itself never leaves the tab, D10); `main.ts` walks the list (`stepFailure`: a card stop is the D9 landing, a derived stop focuses its row), binds F8 / Shift+F8 outside text fields, and resets the walk on a new run or a new filter. Tests: `tests/failures.test.ts` (7: order and fold, empty run, stale count, filter, step, switch) and two `narrowOutline` tests → surface 230 passing, 0 failures, 19 files; `tsc --noEmit` clean (2026-10-12 00:50 CDT); bundle rebuilt. Real path: `testNextFailureAndTheFailuresOnlySwitchOnARealRun` (`TestingSurfaceRealPathTests.swift`) runs the mini project through the real CLI, counts, steps by button and by F8 onto the marked card, narrows the outline to "1 failing line", and empties it with a filter nothing matches ("no failures", step buttons disabled) — class 25 passing (2026-10-12 00:54 CDT). AC-7's "David's click-through" is replaced by that scenario. Decision: F8 / Shift+F8 (the VS Code next/previous-problem keys); David can rebind.
- **Demonstrated** (2026-10-12 01:05 CDT, session ef7e8e): the aid on the real paths and at scale. (1) Real IDE path: `TestingSurfaceRealPathTests` — 25 passing under the pinned xcodebuild invocation (00:54 CDT), including the run-column click landing on the failing card (D9), next by button and by F8 landing and marking the card, the switch narrowing the outline to "1 failing line", and a filter nothing matches leaving "no failures" with stepping inert. (2) Secret-letter-sized tree: `./sharpee test branch-stories/secret-letter/secret-letter.story --json` (3341 wire lines, exit 1) folded through the real `foldRunLine` and `failureStopsOf` in a one-off vitest probe → 106 lines, 0 tree failures, 12 derived failures = 12 stops, count "12 failing", derived stops first (indices 452, 583, 704 …), filter `contains` → 1 stop. The 12 are the known story findings (GH #549 residual), so the list at scale is the derived tier, walked first as D10 orders it. (3) Surface 230 passing, tsc clean; CLI bundle rebuilt (`./repokit build dungeo`). Table row above flipped to Shipped; the objective's Progress line records 13 of 13. [verified: surface vitest, 19 files 230 passed, event log 2026-10-12T05:53:55Z; the xcodebuild 25-passing run and the secret-letter fold are reported by session, unverified]
- **Status**: DONE

### Phase 6b: Start the incremental story — the harness is designed against it (inserted 2026-10-03)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: a new story under `branch-stories/`, written room by room by David; the Testing tab's design follows what each room exposes
- **Entry state**: Phase 6 step 1 committed; David has named the story
- **Deliverable**: the story's project scaffolded (no story content written by the agent); David's room 1; a catalog of the error kinds one room can carry, drafted from what the tester can report (compiler diagnostics, derived-tier failures, tree claim failures, unreached lines, coverage gaps, ending claims); room 1's `TEST-001-A` onward sequence, one error per file and the correct version last (objective O-1, David 2026-10-03); a record of what an author arriving cold cannot read in the tab at room 1, which becomes the input to Phase 6's remaining steps
- **Exit state**: room 1 tested end to end in Chord Writer and the CLI, its error sequence seeded, and the tab's findings recorded
- **The story** (David, 2026-10-03/04, his words): *UPPS (United Planetary Postal Service)*. "It's the future. mankind has discovered how to fold space or create stable wormholes. The PC is an interplanetary postal worker delivering mail. The PC runs into varying challenges along the way. The story ends when the PC returns and has successfully delivered all mail." Settings he named: "navigating space in and outside of a ship, landing on planets, moon, asteroids, needing/not needing space suits, robots." Lives at `branch-stories/upps/`; scaffolded 2026-10-04 with the header only (title, author, id `upps`, a fresh IFID) and `upps.config.json`. No story content was written by the agent.
- **Authorship changed** (David, 2026-10-05): UPPS is a testing story, so Claude writes its content within David's premise. Read "David's room 1" above as room 1 written by Claude.
- **Progress** (2026-10-05, session f8ef32): room 1 written in `upps.story`. It has:
  - the Sorting Room, with east blocked by the `dock-sealed` phrase;
  - Postman, the playable person, set as the player by the start block;
  - the sorting machine (scenery), the mail satchel (a wearable container) and the route card (readable).

  `./sharpee compose branch-stories/upps/upps.story --check` reports it gate-clean (Chord 3.6.0). A scripted `./sharpee play branch-stories/upps` reads as intended. Finding F-4 (inventory hides a worn container's contents) is recorded.
  - Error catalog drafted in `upps-error-catalog.md` from 20 probes against scratch copies of room 1. 16 errors are caught by the compiler with a span. Of the 9 that compile clean:
    - 7 are left to test-tree claims, which name the turn, not the line;
    - 1 fails only at load, with no line;
    - 1 passes silently.
  - Findings F-5 to F-9 are recorded.
  - Room 1's sequence is seeded in `branch-stories/upps/seeded/room-01/`: `TEST-001-A` to `Z`, with a README manifest.
    - Every file was compiled once. `A` to `P` each raise their expected code, and `Q` to `Z` are gate-clean.
    - `U` to `Y` were played. `W` is caught on `examine sorter`, not `examine machine`, because "machine" is part of the name.
    - `Z` is byte-identical to `upps.story` (`cmp`).
  - **Progress** (2026-10-07, session bafcb7): David recorded room 1's tree (`branch-stories/upps/upps.tests/`, 8 cards: opening, boot, and the six turns). `./sharpee test branch-stories/upps/upps.story --tree` on the correct story: 8 cards passing, 10 assertions passing. Each seeded file was copied with the tree into a scratch `upps/` directory and run with `--tree`:
    - `A` to `P` stop at the load-time gate with the README's code and a file:line:col (exit 3).
    - `Q` exits 3 with "not placed in the world", no line.
    - `R` passes everything (8 cards passing): nothing catches it.
    - `S`, `U`, `V`, `W`, `X` each fail one card on their README turn (exit 1). `T` fails on `wear satchel`, not `look` (F-12). `Y` fails `look` and also the boot card, which is counted but not printed (F-11).
    - `Z` passes everything.
    - Findings F-10 to F-12 are recorded. F-10: a failed claim never shows the actual output.
  - Testing tab checked on `Y`, `T`, `Q` and `A` (David in Chord Writer, each file copied over `upps.story`, then `Z` restored). The compiler tier shows in Problems and Diagnosis, and Run refuses. The load error shows verbatim with no line. Tree failures show the expected text but never the actual output (F-10 holds in the tab; F-11 is CLI-only). The boot card renders as a second `> look` and counts as turn 1 (F-13). The explanation line repeats the claim (F-14). Detail in `upps-findings.md`.
  - Room 1 is tested end to end in the CLI and Chord Writer. What an author arriving cold cannot read: the actual output of a failed claim (F-10, F-14), the cause behind a turn-level failure (F-8, F-12), the boot card's identity (F-13), the line for an unplaced player (F-7), and `create player` read as a name (F-5).
  - Next: bring these findings into Phase 6's remaining steps (David decides which come first), or write room 2.
- **Status**: DONE (2026-10-11, session fd3ae9) — the exit state held since 2026-10-07 (room 1 tested end to end in the CLI and Chord Writer, sequence seeded, findings F-4 to F-14 recorded); closed by hand when Phase 6 resumed, because `plan-phase.sh` keeps one CURRENT phase and does not address a lettered phase. Room 2 is not part of this phase; it is written when Phase 6's aid needs what room 1 cannot show.

### Phase 6c: The failed card names the cause — F-15 (inserted 2026-10-11, David: "1 platform", "go")
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: platform (`packages/transcript-tester`, `packages/world-index`, `packages/branch-tester`, `packages/ide-protocol`) and the testing surface (`tools/ide/web/testing-surface`, generated host decoders)
- **Entry state**: Phase 6 step 2 verified; F-15 recorded in `upps-findings.md`: the tab says what failed, and the World Index already names the cause ("placed nowhere and never moved into play") one tab over
- **Deliverable**, in data-flow order:
  1. The transcript runner records why the engine refused a command (`refusal`: the failed-command `reason` and the blocked action's message id) on each command result.
  2. A pure explainer in `world-index`, beside `deriveReach`, maps the IR, the Reach result and a refusal to a cause sentence and a fix line, or nothing. First rules: entity-not-found whose input names a stranded thing (seed `T`); a wearing refusal for a thing declared without `wearable` (seed `U`). The words are composed here so the CLI and the tab say the same thing.
  3. `branch-tester` calls the explainer for each failed card and carries the cause on the result.
  4. `command-result` on the wire gains `cause`, failed results only; `repokit protocol` regenerates the Swift and C# decoders.
  5. The branch-tester CLI formatter prints the two lines under the failed claim; the surface renders them under "the story printed", with no label.
- **Tests**: world-index unit tests for the explainer over the `T` and `U` IR; a real-path branch-tester test running the UPPS `T` seed through the walker and asserting the cause on the result; a surface vitest for the fold keeping the field.
- **Exit state**: `sharpee test` and the Testing tab both print, for `TEST-001-T`: `"satchel" is the mail satchel, which is placed nowhere and never moved into play.` and the fix line; Phase 6 steps 3 and 4 stay queued behind this phase.
- **Built** (2026-10-11, session 487a1f): step 1 turned out to need no runner change — every command result already carries the turn's events (`actualEvents`), so the walker reads the refusal off them. `explainRefusal` in `packages/world-index/src/refusal.ts` (two rules; the Reach view's own reason words); `CommandCause` on the wire (`packages/ide-protocol/src/run-events.ts`, guard `isCommandCause`); `cause?` on the runner's `CommandResult` and the stream's `StreamableCommandResult`, written on failed results only; the walker's `explain` option and `attachCause` inside its command observer, so the live stream and the final rows share one object; the CLI builds the explainer from the compiled IR and `deriveReach` (`refusalExplainerFor` in `packages/devkit/src/commands/test-tree-document.ts`); `formatTreeDocumentRun` prints the two sentences under the failed line; the surface's fold keeps `cause` and `cards.ts` renders it under "the story printed" (`.ts-run-cause`). The hosts pass run-event lines through untouched, so no Swift or C# change.
- **Demonstrated** (2026-10-11 22:15 CDT): `./sharpee test branch-stories/upps/upps.story` with seed `T` on disk printed `✗ opening-sorting-room — wear satchel: Output does not contain "You put on the mail satchel."` / `  "satchel" is the mail satchel, which is placed nowhere and never moved into play.` / `  Give it a place (in the Sorting Room) or move it into play.`; `--json` carried `cause: { kind: "placed-nowhere", entity: "mail-satchel", … }` on the failed `command-result`. Tests: world-index `refusal.test.ts` 8 passing (suite 226 passing, 1 skipped); ide-protocol guard case added (suite passing); surface `run.test.ts` cause case added (suite 197 passing, 0 failures, 17 files, tsc clean); branch-tester suite 327 passing; transcript-tester 369 passing; devkit 188 passing, 1 skipped; real-path `scripts/__tests__/narrative-names-the-cause.test.ts` 4 passing — seeds `T` and `U` through the built CLI on scratch copies, the wire's cause and the human report's two lines asserted, seed `Z` carries none. Bundle rebuilt. Seen in Chord Writer (David, 2026-10-11, after the checkpoint commit cfe584afb): the `wear satchel` card ends with the two cause sentences; seed `Z` restored.
- **Status**: DONE (2026-10-11, session 487a1f)

### Phase 7: Occurrence ordinals arrange shape (only if G1 says IN)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: derived rule tests, ADR-356 D2 arrange shapes
- **Entry state**: G1 IN; discussion held (platform change in `packages/branch-tester`)
- **Deliverable**: occurrence ordinals arrangeable; an ADR-356 D2 amendment note; secret-letter exercised count re-measured against 392 of 721
- **Exit state**: row complete; GH #525 updated
- **Status**: DONE (2026-10-11, session ce4e4c) — carried out by `docs/work/branch-tester/plan-20261011-occurrence-ordinals.md` (option (a), structural clause identity; David's choice). The measure moved with the denominator since this line was written: Secret Letter 955 → 959 of 1656 exercised, 12 failing before and after, zero `occurrence` SKIPPED. ADR-356 D2 amended 2026-10-11; GH #525 commented.

### Phase 8: Effect-less bodies and command-none rows (only if G1 says IN)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: derived tier, a new mapping for the 52 no-claims bodies and 90 command-none conversation rows
- **Entry state**: G1 IN; an ADR-356 amendment or new ADR decided with David first (no design exists; this is a decision gate disguised as a phase, and its first deliverable is the amendment, not code); platform discussion
- **Deliverable**: the amendment, then a plan of its own. This phase will not be sized further until the decision exists.
- **Exit state**: decision recorded; a follow-on plan written or the row ruled out
- **Status**: DEFERRED (2026-10-03, G1) — out of scope for O-1; the rows stay listed as SKIPPED; design after 2026-10-15

### Phase 9: Promote the explorer lenses to an author surface (only if G1 says IN)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: author CLI (`packages/devkit`) and the Testing/World surfaces
- **Entry state**: G1 IN; David has said where authors meet the lenses (a subcommand, a World tab view, a report section); platform discussion
- **Deliverable**: the two lenses reachable by an author, with `narrative-*` coverage
- **Exit state**: row shipped
- **Status**: DEFERRED (2026-10-03, G1) — out of scope for O-1; the lenses stay developer tools and remain a roadmap item

### Phase 10: Checkpoint 2026-10-13 and final re-count
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: objective cadence
- **Entry state**: story as far as it exists; whichever of Phases 6-9 were IN are done
- **Deliverable**: both evidence sources run, table re-counted, rows ruled out recorded as such, results for the 2026-10-15 grade
- **Exit state**: objective ready to grade
- **Status**: PENDING

## Ordering notes
- Phases 1, 3 do not depend on David's rulings and are ready now; Phase 2 is a gate, and it decides whether 5-9 happen at all.
- Phases 7, 8, 9 are independent of each other and of 5-6; any order after G1. Recommended order by cost and risk: 6 (no platform change), 7 (small), 9, 8 (largest, undesigned).
- The 2026-10-06 checkpoint needs only Phases 1, 3 and 4; navigation (5-6) fits before 2026-10-13 only if G2 happens by about 2026-10-07.
