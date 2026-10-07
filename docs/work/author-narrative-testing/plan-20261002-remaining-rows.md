# Session Plan: Close the remaining rows of the author testing narrative's table

**Created**: 2026-10-02
**Plan Status**: ACTIVE
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
| Testing navigation | Cursory DRAFT. `testing-surface/src` has only the State picker's search; no overview graph, failure navigation or tree search | ADR-308; grep of `tools/ide/web/testing-surface/src` |

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
- **Status**: PAUSED after step 1 (2026-10-03, session 4d81b6). Step 1 DONE: outline tint (`src/line-verdict.ts`, `outline-view.ts`) and position indicator (`positionOf` in `outline.ts`, `renderPosition`); testing surface `npx vitest run` → 191 passing, 0 failures, 17 files; `tsc --noEmit` clean; real-path AC-1 test plants a failure through `scripts/__tests__/support/scratch-story.ts`'s `editTree`, plus a refused-run test; Chord Writer built with the new bundle. Paused at David's direction after his first click-through: the three-column tab is unreadable to an author who did not grow up with it, and secret-letter is too much noise to design the harness against. Steps 2–4 wait on what Phase 6b's incremental story shows the tab needs. Open from the click-through: pass and fail tints differ only by colour.

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
- **Status**: CURRENT (since 2026-10-04)

### Phase 7: Occurrence ordinals arrange shape (only if G1 says IN)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: derived rule tests, ADR-356 D2 arrange shapes
- **Entry state**: G1 IN; discussion held (platform change in `packages/branch-tester`)
- **Deliverable**: occurrence ordinals arrangeable; an ADR-356 D2 amendment note; secret-letter exercised count re-measured against 392 of 721
- **Exit state**: row complete; GH #525 updated
- **Status**: PENDING

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
