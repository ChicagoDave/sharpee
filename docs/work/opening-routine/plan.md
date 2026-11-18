# Session Plan: Implement ADR-404, the opening is a routine the engine runs, not a turn a head types

**Created**: 2026-11-18
**Plan Status**: ACTIVE
**Overall scope**: Build everything ADR-404 decides, to its acceptance criteria AC-1 to AC-11: the engine's opening routine outside the turn cycle, the `Story.opening` list and Chord's `when the game starts` block, every head calling the routine instead of typing `look`, the tree document's single `opening` card, the blank turn count, the re-recorded trees and transcripts, and the manual chapters the change moves. It ends with a release prepared for David to publish, which the Chord manual's naive runs then install.
**Bounded contexts touched**: N/A. This is platform and tooling work (the engine's turn cycle, the Chord language, the heads, the testing tools), framed in plain technical terms.
**Key domain language**: opening routine; `show-prologue`, `show-banner`, `do-first-look`; `runOpening()`; the `opening` card; the blank turn count.
**Source**: `docs/architecture/adrs/adr-404-the-opening-is-a-routine-not-a-turn.md` (ACCEPTED by David 2026-11-18, session 0349f4; Planning OPEN). Defect: GH #793.
**Outgoing plan**: `docs/work/chord-manual/plan.md` stays live. David disposed of it under rule 18b as "still live", and it carries `**Superseded by**: docs/work/opening-routine/plan.md`. None of its phases is touched here. Its Phase 8 (naive-reader runs) resumes after this plan's release, and this plan runs no naive reader.

## References consulted
- `docs/architecture/adrs/INDEX.md`: the ADR index, rebuilt for this plan with `adr-index.sh`. It has 408 records: 29 OPEN, 147 IMPLEMENTED, 52 ABANDONED, 7 IGNORE and 173 unclassified, and every record's Kind is unclassified. 17 were opened: 2 OPEN (ADR-404, ADR-400), 1 IMPLEMENTED (ADR-120) and 14 unclassified. **Deviation from the consultation rule, stated so `plan-review` can challenge it:** the rule says to open every OPEN and every unclassified record. Instead, all 29 OPEN rows were read by Summary, and the 173 unclassified records, which have no Summary, were triaged by title and by a full-text search of every record for the opening look, the boot card or look, `TURN_STAGES`/`META_STAGES`, `game.started`, `onAfterAction`/`TurnPlugin`, `turnOffset` and the `(opening)` row. Only the records that matched or bear by title were opened. ABANDONED and IGNORE records were not opened.
- `docs/architecture/adrs/adr-404-the-opening-is-a-routine-not-a-turn.md`: the specification. It covers decisions 1 to 14, AC-1 to AC-11, the sites in its Context and "Other sites this reaches", and the workarounds it says to examine rather than assume removable.
- `docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md`: the turn is a declared stage list (D1). D2's order test pins every list, and every stage's `requires` must name an earlier stage in the same list (`requiresOrderViolations`). D1a as amended adds a third list for the opening. D6's habit is that additive engine work lands byte-identical on the Dungeo chain.
- `docs/architecture/adrs/adr-330-chord-chapters.md`: D4 as amended puts the opening chapter card immediately before the first look. The card's place comes from manifest registration order (`before: 'room-name'`). Its real-path pins are `chapter-before-room.test.ts` and `adr-330-chapters.test.ts`.
- `docs/architecture/adrs/adr-307-testing-tree-model-v2.md`: D2 as amended has one `opening` card and no `boot` card type. D8 is a cutover with no migration path in the reader.
- `docs/architecture/adrs/adr-357-finding-your-way-in-a-large-test-tree.md`: D9 as amended says the walker runs no opening look and the `(opening)` row still carries the opening card's id. Run events are not in the `repokit protocol` contract.
- `docs/architecture/adrs/adr-298-story-block-metadata.md`: D3 as amended makes prologue-before-banner the default routine's order, not a fixed client rule. ADR-296's slot machinery is not involved.
- `docs/architecture/adrs/adr-345-the-engine-lifecycle-phase-is-an-explicit-concept.md`: the phase (`empty → ready → playing ⇄ stopped`) is the only lifecycle guard, and a refusal names the phase it found (D2). The phase is not exported (D7), so a "has a turn run" fact for `runOpening()` is a separate private fact, not a fifth phase. Restart is engine disposal (D10).
- `docs/architecture/adrs/adr-342-engine-package-contract.md`: `packages/engine/src/index.ts` is the package contract. A new export such as `OpeningRoutine` is an amendment line on D1 plus a `public-surface.test.ts` change in the same commit. Anything reachable but not named stays internal (D3).
- `docs/architecture/adrs/adr-248-restart-via-platform-events.md`: RESTART is the client's reboot through its own boot path. That includes bootstrap's in-place reboot for the headless harness (D5), so the routine runs on every rebooted engine.
- `docs/architecture/adrs/adr-120-engine-plugin-architecture.md`: the plugin contract stays minimal and gains a hook only for a concrete use, which `onOpening` is. Plugins run in TURN_BANDS order under the ADR-332 amendment.
- `docs/architecture/adrs/adr-305-create-transcript-from-play.md`: its "As built" D2/D3 entry records the browser's boot look as the play feed's first turn, `[SKIP]` unless selected, with the capture-parity suite aligning a boot turn at index 0. ADR-307 supersedes the record, but the workaround still lives in `BrowserClient.ts` and the testing surface.
- `docs/architecture/adrs/adr-300-addressable-channels-and-canonical-transcript.md`: D12 says assertions above the first command belong to the opening and report as `(opening)`. D15 says every surface that shows the game to a person must render the opening channels.
- `docs/architecture/adrs/adr-352-protocol-type-generation.md`: `./repokit protocol --check` is the gate. The tree card type and the IR's opening list are not in the emission spec, so no regeneration is expected. That is checked rather than assumed.
- `docs/architecture/adrs/adr-257-chord-language-version.md`: a new construct changes `chord.ebnf`, and the hash pin forces a recorded entry in `packages/chord/src/version.ts`. The public number moves once per publish, and David sets it.
- `docs/architecture/adrs/adr-361-chord-syntax-is-closed-hatches-are-removed.md`: Chord's syntax is closed, so a language change lands in the parser, analyzer, IR and `chord.ebnf` together.
- `docs/architecture/adrs/adr-395-exploring-tests-run-on-test-stories.md`: exploring tests run on `test-stories/`, and Claude writes test-story content (D3). A test set changes before its story. A plan that adds a Chord error compiles `test-stories/` in its census. Demonstrations cite test-story suites, never `./sharpee test` on a real story, as their floor (D7).
- `docs/architecture/adrs/adr-400-perception-runs-for-every-actor.md` (OPEN; Scope and Consequences read): it will change the enrichment funnel that the opening's look shares. It is not built and has no active plan, so whichever lands second accounts for the other.
- `docs/context/project-profile.md`: the gates beside `test:ci` are `pnpm test:scripts` (bundle first), the Dungeo chain (one run), `./sharpee test <story-dir>`, `node --test tools/explorer-probe/tests/*.test.js`, `dotnet test` for PaneHost.Tests and XCTest for SharpeeIDETests. `documentationStandard` is `always`.
- `docs/context/session-20261117-1748-main.md`: open items are #793, which this ADR fixes; #798's client channel ledger, which skips `turn` and `banner` on restore and bears on `turnOffset`; and #755, the manual's edition pin, which stays with the chord-manual plan. The book waits for this plan.
- `docs/proposals/code-documentation-sweep.md` and `docs/proposals/publish-readiness-defects.md`: both have accepted items, and none bears on this plan. No item is planned here, and no proposal status changes.
- Product ADRs not consulted (no Scope intersection): none

## How this plan is run

- **Discussion already held, and its edge.** ADR-404 and David's acceptance are the platform discussion CLAUDE.md requires for everything the record names. A change outside its Scope line, or a choice the record does not make, stops for David. The known ones are listed under "Settle with David" below. `packages/channel-service` is the likeliest Scope edge.
- **Build and test.** Build with `./repokit build` (never plain `pnpm build`). Run transcripts through `dist/cli/sharpee.js`. Never put `2>&1` on a pnpm command. A failed build or test is reported and waits, with no auto-retry. Bash commands use no shell expansion.
- **Statements.** Side-effect code gets a Behavior Statement before its tests (rule 12), then `mutation-verification` (rule 15). The engine, heads and browser phases each close with an Integration Reality Statement naming a real-path test: a real GameEngine, a compiled Chord story, a real BrowserClient, or the real CLI (rule 13a).
- **Evidence goes inline**, as the command, its result and the date, in `docs/work/opening-routine/` evidence files and on each phase's Demonstrated line.
- **Order.** 1 → 2 → 3 run in sequence. Phase 4 needs Phase 2, and uses Phase 3's fixtures for AC-4 in the command-line heads. Phase 5 needs Phase 4 (bootstrap's `runOpening`). Phase 6 needs Phase 5 (the surface maps the opening record). Phase 7 needs Phases 5 and 6, and Phase 8 comes last. Phases 2 and 3 are additive: no head calls the routine until Phase 4, so every gate stays byte-identical through them, and they may be committed together. Nothing is released until Phase 8.

## Where the manual's edits live (decided here)

Chapters 19, 35 and 38 of the Chord manual, and its companion trees under `tutorials/relighting/chord-v4.1.0/`, are rewritten and re-recorded **in this plan, in Phase 7**. They do not wait for the chord-manual plan's Phase 8. The reasons:

1. Decision 12 names chapter 38's rewrite as part of the decision itself, and AC-10 names the companion trees as this record's acceptance.
2. Chapters 19 and 35 quote behavior that this change moves: the turn-50 warning, the hunger meter at the opening, and the claims locked "at turn 82" and "at turn 138". A naive run on the new release against the old prose would fail on exactly the lines this ADR fixes.
3. The chord-manual plan's Phase 8 is runs and triage only, and its phases are frozen by the rule 18b disposition, so there is nowhere there to put the edits.

Two things stay with the chord-manual plan: the snippet check against the *published* toolchain, which can only run after the publish, and the edition pin (#755). Whether the manual should *teach* `when the game starts` is not in the record, and this plan adds no such section unless David asks (see below).

## The Chord block in full

The default routine, which a story with no block gets (decision 6):

```chord
when the game starts
  show-prologue
  show-banner
  do-first-look
end when
```

A whole story with an author-reordered block. The room is printed before the banner, and with `use chapters` the opening chapter's card comes immediately before the room (decision 8):

```chord
story
  title: The Quay
  authors:
    Test Story
  id: quay
  story-version: 0.0.1
  prologue:
    The last ferry left an hour ago, and someone has to light the lamp.
  use chapters

define chapters
  dusk - Chapter I: Dusk
    begins when the game starts
  lamp - Chapter II: The Lamp
    begins when the player visits the Lamp Room for the first time
end chapters

create the Quay
  a room
  north to the Lamp Room

  A stone quay under a squat lighthouse.

create the Lamp Room
  a room
  south to the Quay

  A round room around a cold lamp.

create the keeper
  a person
  playable
  starts in the Quay

  You.

before the game starts
  change the player to the keeper
end before

when the game starts
  show-prologue
  do-first-look
  show-banner
end when
```

Its opening is three packets, in this order: the prologue, then the chapter card with the Quay's name and description and the status channels (the `turn` channel sends 0), then the banner. Leaving routines out is equally literal. The following block prints no prologue, no chapter card and no room, and the card and the Quay's first-visit description then come with the first command (decisions 8 and 9):

```chord
when the game starts
  show-banner
end when
```

What the compiler refuses (AC-7), each with its own message: a routine named twice; `show-prologue` in a story whose header has no `prologue:`; any other statement inside the block (`look`, `phrase …`, `change …`); `show-banner`, `show-prologue` or `do-first-look` written anywhere outside the block; and a second `when the game starts` block, named at the second block. An empty block (`when the game starts` followed directly by `end when`) is allowed and prints nothing. The same story written in TypeScript states `opening: ['show-prologue', 'do-first-look', 'show-banner']` on its `Story` object. At install, the engine refuses a repeated routine, an unknown name, and `show-prologue` without a prologue.

## Settle with David (known now)

Each of these stops the phase that reaches it until David rules. Each phase names its own.

1. **The `requires` contract versus the opening's list (Phase 2).** ADR-334 D2's check requires every stage's `requires` to name an earlier stage in its list. Six stages in the opening's `do-first-look` list name stages the opening omits: `execute-command` → `parse`, `sound-dispatch` → `plugin-tick`, `player-switch` → `advance-turn`, `platform-operations` → `plugin-tick`, `detect-death` → `plugin-tick`, and `render-prose` → `player-switch`. There are three ways through. The opening could have its own stage modules where a `requires` cannot hold. `requires` could become list-relative ("names a stage that must precede it when present"), which weakens D2's invariant. Or the check could carry a stated per-list exemption. Phase 2 reads each module, recommends one, and stops for David if the answer is the second or third, because both amend ADR-334's contract.
2. **How one packet per routine is built (Phase 2).** One option is for the engine to build each opening packet and keep only that routine's channel ids, an engine-only change. The other is a subset parameter on `ChannelService.build`, which is a `packages/channel-service` change outside ADR-404's Scope line. Phase 2 takes the engine-only route if it holds, and stops for David if it does not.
3. **The look's "status channels" (Phase 2).** The record says the look's packet carries "the status channels a turn's packet carries" without listing them. The proposal is that the look's packet carries every channel a turn's packet carries except `prologue` and `banner`. When the block has no `do-first-look`, the status channels (`info`, `ifid`, `location`, `score`, `turn`, `prompt`) first ride the first command's packet, so a browser page shows no title or status until then. David confirms or rules otherwise.
4. **The meta command's `turn` value (Phase 2).** A regular turn's packet is stamped with the turn being executed, which is 1 on the first command and so already "commands that have cost a turn". A meta command's packet is stamped with `engine.context.currentTurn` (`packages/engine/src/turn/meta-render.ts:40`), which is the *next* turn's number: after one command, SCORE's packet says 2. Decision 14's statement of what the value means implies currentTurn minus 1 there. Fixing it is a behavior change the record does not name, so it is David's call.
5. **world-index's `boot` command kind (Phase 5).** The ADR lists `packages/branch-tester/src/derived-runner.ts:931` as a boot-card site. It is not one: it reads world-index's start-block command kind (`packages/world-index/src/branches.ts:188`, `{ kind: 'boot' }`), the moment `before the game starts` runs. AC-5's search finds it anyway. The proposal is to rename the kind to `start`, inside the record's Scope line (`packages/world-index`) but not decided by it.
6. **What `do-first-look` enters (Phase 2).** The typed entry parses the text `look` (`commandExecutor.execute(input, …)`), so a story whose grammar changes what `look` means changes what the opening runs. Phase 2 checks whether the executor can be entered with the looking action directly and recommends one way. If the entry differs from "the same execution entry a typed `look` takes" (decision 9), David rules.
7. **The Chord primer's example (Phases 5 and 7).** `docs/work/chord-primer/` is David-supplied (pinned to the published CLI) and holds a tree with a boot card. Ask before migrating or editing it.
8. **Teaching the block in the manual (Phase 7).** The record does not ask for it. This plan does not add it unless David says so.
9. **Release numbers and the publish (Phase 8).** The Sharpee version, the Chord language number at the cut, and dispatching `publish-npm.yml` are all David's.
10. **Where the prologue is written (Phase 2).** ADR-404 decision 3 says "`start()` stays as it is", and its statement on a block without `show-prologue` says only that the `prologue` channel is held back. Phase 2's proposal moves the prologue write out of `start()` (`packages/engine/src/game-engine.ts:696`, `resolvePrologue`) into the routine, which changes `start()`. David rules between that and leaving the write in `start()` with the channel gated. Raised by plan-review, 2026-11-18.

## Phases

### Phase 1: Opening baselines and the site census, before any platform change
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: The "today" recording AC-3 compares against, and a verified census of every site the change reaches.
- **Entry state**: ADR-404 ACCEPTED, this plan approved, on `main` with the ADR-404 acceptance commit landed, and `./repokit build dungeo` succeeding on the unchanged platform.
- **Deliverable**: A new test story `test-stories/quay/quay.story` (new), with its test set `test-stories/quay/quay.test-set.md` (new) and a row in `test-stories/README.md`, plus the AC-3 baselines `docs/work/opening-routine/baseline/quay-play.txt` (new) and `docs/work/opening-routine/baseline/quay-browser.html` (new), the comparison tests that read them, and `docs/work/opening-routine/census.md` (new).
  - `quay` has five rooms at most and is written by Claude under ADR-395 D3. Its content carries no decision-record references. It has a header `prologue:` and `use chapters`, with an opener on `the game starts` and a second chapter on a first visit. It has **no** each-turn mechanics, because a story whose boot look ticks a timer or a meter cannot open "word for word as today" once AC-2 holds. The clock variants come in Phase 3. Its test set carries OB-46 onward: the default opening word for word; the author's order; omitted routines; the chapter card once; nothing has run; the blank turn count then 1; and when the routine runs.
  - The browser baseline comes from `packages/platform-browser/tests/opening-real-path.test.ts` (new). It compiles `quay` the way `chapter-before-room.test.ts` does, boots a real BrowserClient over a real GameEngine, and serializes the opening's DOM (prologue, banner, chapter card, room). In record mode (`RECORD_OPENING_BASELINE=1`) it writes the baseline; otherwise it compares against it.
  - The `--play` baseline is the bundle's opening for `quay`, captured from the first prologue line to the first prompt. `scripts/__tests__/opening-baseline.test.ts` (new) replays it and compares byte for byte.
  - The census records: (1) every opening-look site, by the AC-5 searches run today, with line numbers; (2) every `boot` site, separating the tree card type from world-index's start-block kind; (3) every head that shows a turn count, found so far as `packages/platform-browser/src/BrowserClient.ts#renderCombinedStatus`, `packages/platform-browser/src/channels/status.ts`, `packages/platform-browser/src/display/StatusLine.ts`, the static "Turns: 0" in `packages/devkit/templates/browser/index.html` and channel-service's `renderStatusLine` (check whether anything produces its `status.turns` block); (4) what `ctx.turn` holds today. The engine counter starts at 1 (`packages/engine/src/game-engine.ts:606`). A turn's packet is stamped with the turn being executed. A meta command's packet is stamped with the next turn's number. (5) The opening list's stage-by-stage check: each stage's module, its `requires`, and whether it is kept; (6) every tree directory with a boot card (60 segment files today), split into gating, non-gating and archived; (7) the baseline counts: the Dungeo chain's pass count, and the engine, branch-tester, devkit, platform-browser and testing-surface suite counts.
- **Files**: `test-stories/quay/` (new), `test-stories/README.md`, `docs/work/opening-routine/`, `packages/platform-browser/tests/opening-real-path.test.ts` (new), `scripts/__tests__/opening-baseline.test.ts` (new)
- **Exit state**: Both baselines are recorded on the unchanged platform and committed, and both comparison tests pass against them. The census is written, with every count measured on the day. No file under any package's src directory has changed.
- **Demonstration**: `./repokit build dungeo` succeeds; `printf 'wait\n' | node dist/cli/sharpee.js --play --story test-stories/quay/quay.story` shows prologue, banner, chapter card and the Quay, and its opening is the content of `docs/work/opening-routine/baseline/quay-play.txt`; `pnpm --filter='@sharpee/platform-browser' test opening-real-path` passes in compare mode; `pnpm test:scripts opening-baseline` passes; `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` passes and its count goes into the census; `git diff --stat -- packages` lists only the new platform-browser test.
- **Demonstrated**: 
- **Status**: CURRENT (since 2026-11-18)

### Phase 2: The engine runs the opening, with a third stage list, `runOpening()`, one packet per routine and the plugins' `onOpening`
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: The engine's turn cycle (ADR-334's lists), the lifecycle (ADR-345), the plugin contract (ADR-120) and the chapters extension (ADR-330 D4). Covers decisions 1, 2, 3, 8, 9, 10, 11 (the engine half) and 14.
- **Entry state**: Phase 1 exit holds and its baseline tests pass.
- **Deliverable**: `OpeningRoutine` and `Story.opening?: readonly OpeningRoutine[]` in `packages/engine/src/install/story.ts`; the install refusals in `packages/engine/src/install/validate-opening.ts` (new), registered in `packages/engine/src/install/steps.ts`; the opening's stage list in `packages/engine/src/turn/stages.ts`, run by `packages/engine/src/turn/opening.ts` (new); `runOpening()` on `packages/engine/src/game-engine.ts`; `onOpening` on `packages/plugins/src/turn-plugin.ts`; the chapters plugin's hook in `packages/extensions/chapters/src/chapters-plugin.ts`; and tests on a real GameEngine.
  - **The list.** For `do-first-look`, take the turn's stages from `execute-command` onward, minus `plugin-tick`, `advance-turn` and `command-history`. The routing stages, including `undo-snapshot`, are left out. Every kept stage is checked against its module and the result recorded in the census and in the stage list's header. The six `requires` that name an omitted stage go to Settle item 1.
  - **`runOpening()`.** It is asynchronous and accepts only `playing`, refusing by naming the phase found (ADR-345 D2). It throws on a second call in one engine's life and once any turn has run, tracked as a private fact and not as a phase. It returns the first look's result, which is empty when the block has no `do-first-look`.
  - **Packets.** One packet per routine, in block order, each carrying only that routine's channels: `prologue`, then `banner`, then for the look the prose channels with `preferred-layout` and the status channels (Settle item 3). Every opening packet stamps `turn` as 0. The mechanism goes to Settle item 2.
  - **Leaving routines out.** Without `show-banner`, the pending game.started is dropped from the first turn's events. Without `show-prologue`, no packet ever carries the prologue. The proposal is that the prologue is never written to the storyInfo capability, the routine and not `start()` owning the write; that changes `start()` and goes to Settle item 10. The opening's events never reach the first command's render, whichever bucket they are stamped into, and that is pinned by test.
  - **Plugins.** The engine calls `onOpening` once on every plugin that has it, just before `do-first-look` and outside any tick, and never when the block has no first look. The chapters plugin returns the opener's card from it and writes the same announced mark `onAfterAction` writes, so the first command never prints the card a second time.
  - **Randomness.** Find which seeded streams (ADR-293) the opening's look draws from. A draw that headless runs never made before shifts every later draw of that stream, so pin it and carry it into the Phase 4 census.
  - **Tests.** `packages/engine/tests/unit/opening-routine.test.ts` (new) runs a real GameEngine over a TypeScript story. It asserts the packet order for the default block, a reordered block, omitted routines and an empty block, each by packet payload. It asserts world state after the opening: the room is marked visited; the counter still reads 1; the history is empty; no undo snapshot exists, so UNDO as the first command gets today's nothing-to-undo answer; the session turn count is 0; and a scheduler daemon has not stepped (AC-2's engine half). It asserts the `turn` channel is 0 in every opening packet and 1 in the first command's (AC-9's engine half), the three install refusals (AC-7's engine half), and the three `runOpening()` refusals. `packages/engine/tests/unit/turn-stage-order.test.ts` pins the third list and drives it once; `packages/engine/tests/unit/story-install-order.test.ts` takes the new step; the ext-chapters suite asserts the card comes once, before the room, and that with no first look it comes with the first command (AC-6's engine half).
  - **Contract.** If a consumer must name `OpeningRoutine`, it joins `packages/engine/src/index.ts`, with an amendment line on ADR-342 D1 and the `public-surface.test.ts` fixture in the same commit. Otherwise it stays internal (ADR-342 D3).
- **Files**: `packages/engine/src/`, `packages/engine/tests/unit/`, `packages/plugins/src/turn-plugin.ts`, `packages/extensions/chapters/`, `packages/stdlib/src/channels/standard.ts`, `docs/architecture/adrs/adr-342-engine-package-contract.md`, `packages/sharpee/docs/genai-api/`, `docs/work/opening-routine/`
- **Exit state**: `runOpening()` exists, is called by no head, and passes its real-path tests. Settle items 1 to 4, 6 and 10 are ruled or recorded as not arising. Every gate is byte-identical to Phase 1: the Dungeo chain at the Phase 1 count with every golden matched, the three test-story trees passing unchanged, and both Phase 1 baseline tests passing.
- **Demonstration**: `pnpm --filter='@sharpee/engine' test opening-routine` and `pnpm --filter='@sharpee/engine' test turn-stage-order` pass; `pnpm --filter='@sharpee/engine' test public-surface` and `pnpm --filter='@sharpee/engine' test story-install-order` pass; `pnpm --filter='@sharpee/ext-chapters' test` passes; `./repokit build dungeo` then `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` reports the Phase 1 count with all goldens matched; `./sharpee test test-stories/ferry`, `./sharpee test test-stories/lodge` and `./sharpee test test-stories/orchard` pass; `pnpm --filter='@sharpee/platform-browser' test opening-real-path` still passes.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 3: Chord's `when the game starts` block, from parser to loader
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The Chord language (decisions 5, 6, 10 and 14) and the Story IR's `opening` list.
- **Entry state**: Phase 2 exit holds, and `Story.opening` and `runOpening()` exist.
- **Deliverable**: The block in `packages/chord/src/ast.ts`, `packages/chord/src/parser.ts` and `packages/chord/src/analyzer.ts`, with the five compile refusals of AC-7; the IR list `opening` in `packages/chord/src/ir.ts`, checked in `packages/chord/src/validate-ir.ts`; the loader mapping it onto the story in `packages/story-loader/src/loader.ts`; the grammar paper trail; clock and order variants of `quay` under `test-stories/quay/seeded/` (new); and real-path tests through a compiled story.
  - **The block.** `when the game starts` … `end when` is top-level, and there is exactly one per story. It holds only the three routine lines, may be empty, and the three names are a compile error anywhere else. Each refusal gets its own code and message, naming the repeated line, the second block, the stray statement or the misplaced name. The full example is in "The Chord block in full" above.
  - **IR.** The IR carries `opening: OpeningRoutine[] | null`, where null means no block and so the default. Check whether a new top-level IR field needs an `IR_FORMAT` move. Also check that `./repokit protocol --check` stays clean, since the IDE projection decodes no such field (ADR-352).
  - **Paper trail.** Update `packages/chord/chord.ebnf` and its copy `website/public/chord.ebnf`, and re-record the hash in `packages/chord/tests/language-version.test.ts`. Add a row to `docs/architecture/chord-grammar-changes.md`. Add a "Pending publish" entry in `packages/chord/src/version.ts`; the number is David's at the cut (ADR-257 D2 as amended). Update the website grammar reference under `website/src/app/chord/reference/grammar/`.
  - **Census (ADR-395).** Compile every `.story` under `stories/`, `branch-stories/`, `test-stories/` and `tutorials/relighting/chord-v4.1.0/`, one line per story in the census. Zero new diagnostics are expected, since nothing uses the names today.
  - **Variants.** The `quay` variants are copies differing only in their block, and the test set is updated first: reordered (prologue, look, banner); no look; no banner; no prologue; and empty. A clock variant adds a timer started in `before the game starts`, a sequence step `at turn 3` and `use hunger` with a rung at its first growth.
  - **Tests.** `packages/story-loader/tests/opening-block.test.ts` (new) compiles each variant, installs it on a real GameEngine and calls `runOpening()`. It asserts the packet order and contents (AC-4 at engine level), that the card comes once before the room in the default and reordered blocks and with the first command in the no-look block (AC-6 at engine level), and that the clock variant's timer has not stepped, the sequence's step answers the third command, and the meter's rung is in the first command's reply and not in the opening (AC-1 and AC-2 on a test story). `packages/chord/tests/opening-block.test.ts` (new) covers each refusal by code and message (AC-7, compiler half), plus the empty block.
- **Files**: `packages/chord/`, `packages/story-loader/src/loader.ts`, `packages/story-loader/tests/opening-block.test.ts` (new), `website/public/chord.ebnf`, `website/src/app/chord/reference/grammar/`, `docs/architecture/chord-grammar-changes.md`, `test-stories/quay/`, `docs/work/opening-routine/`, `packages/sharpee/docs/genai-api/`
- **Exit state**: The block compiles, and each of the five refusals has its own message. `runOpening()` on a compiled Chord story prints in the block's order. Still no head calls the routine, and every gate is byte-identical to Phase 1.
- **Demonstration**: `pnpm --filter='@sharpee/chord' test` passes, including its opening-block and language-version suites; `pnpm --filter='@sharpee/story-loader' test opening-block` passes; `./repokit verify` passes (EBNF pin, protocol check, grammar and manifest gates); `./sharpee compose test-stories/quay/quay.story` compiles clean, and the census lists every corpus story compiled; `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` still reports the Phase 1 count.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 4: The headless and command-line heads open with the routine, and the Dungeo census
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Every head that is not a tree or a browser: bootstrap, the transcript runner, the CLI bundle, `sharpee play`, fast-cli and the explorer probe. Covers decisions 3 (the headless runner), 4 and 11, and AC-11.
- **Entry state**: Phases 2 and 3 exit, and the census's opening-look list is current.
- **Deliverable**: `runOpening()` on the bootstrap game handle in `packages/bootstrap/src/index.ts`; the transcript runner's call in `packages/transcript-tester/src/runner.ts` and its interactive CLI `packages/transcript-tester/src/cli.ts`; the bundle's modes in `scripts/bundle-entry.js`; packet-order printing in `packages/devkit/src/commands/play.ts`; `scripts/fast-cli.js`; `tools/explorer-probe/explore.js` and `tools/explorer-probe/plan.js`; the READMEs and examples; and the Dungeo census `docs/work/opening-routine/dungeo-census.md` (new), followed by the reviewed re-record.
  - **Bootstrap.** `runOpening()` is an explicit call on the game handle, not made by `assembleGame`, so the tree walker keeps its current behavior until Phase 5. It captures the opening's packets **in arrival order** and as the boot captures the `(opening)` row reads. A RESTART's in-place reboot runs the new engine's opening (decision 11, ADR-248 D5). In a chain, that is a new engine's first call, not a second call on one engine.
  - **The transcript runner.** It calls the routine once before the first transcript's first command and never again within a chain, and every runner entry that starts a game (the outcome search among them) does the same. The `(opening)` row asserts against the opening's captures.
  - **The bundle.** `--play` calls the routine and prints the packets in order, which replaces the fixed prologue-then-banner order of `printOpening`. `--exec` calls it unless `--restore` was given, because a restored session prints no opening. `--test` and `--chain` call it through the runner.
  - **`sharpee play`.** It prints the opening in packet order instead of reading it after a typed `look`.
  - **READMEs and examples.** `packages/bootstrap/README.md`, `packages/sharpee/README.md`, `packages/engine/README.md`, `packages/engine/examples/basic-demo.ts`, `packages/engine/docs/text-service-migration.md`, `docs/work/stdlib-reference/verify.mjs`, and the two design scripts under `docs/architecture/diagrams/design/` where they open a story with `look`. Archives under `packages/_archive/` are left alone.
  - **The Dungeo census (AC-11).** Run the chain and Dungeo's unit transcripts (`stories/dungeo/tests/transcripts/`) on the changed platform *before* anything is re-recorded, and list every differing line in the census. The expected moves are the banner and prologue leaving the first command's reply, and the first room appearing in the opening. Any difference in a turn number or in a seeded outcome (combat counts) is a regression and stops for a ruling. David reviews the census, then the listed lines are re-recorded through `--bless` under the rule of 2026-10-25, with no transcript's commands changed.
  - **Acceptance runs.** AC-1 on the tutorial's chapter-19 through `sharpee play`; AC-2 on `stories/hunger-demo/hunger-demo.story` through the bundle's `--play`; AC-3's command-line half through Phase 1's test; AC-4's command-line half on the reordered `quay` variant; AC-8's headless half (restart reboot, and `--exec --restore`).
  - **Tests.** Update the bootstrap, transcript-tester, devkit `play`, `scripts/__tests__` and explorer-probe tests, each asserting on the captured opening's order and on world state, not only on the returned text.
- **Files**: `packages/bootstrap/`, `packages/transcript-tester/`, `scripts/bundle-entry.js`, `packages/devkit/src/commands/play.ts`, `packages/devkit/src/commands/play.test.ts`, `scripts/fast-cli.js`, `tools/explorer-probe/`, `packages/sharpee/README.md`, `packages/engine/README.md`, `packages/engine/examples/basic-demo.ts`, `packages/engine/docs/text-service-migration.md`, `docs/work/stdlib-reference/verify.mjs`, `docs/architecture/diagrams/design/`, `stories/dungeo/walkthroughs/`, `stories/dungeo/tests/transcripts/`, `scripts/__tests__/`, `docs/work/opening-routine/`
- **Exit state**: No headless or command-line head types an opening look. The tree walker and the claims walk are unchanged, and the trees still pass. The Dungeo census is reviewed by David, no turn number moved, and the chain passes after the listed lines are re-recorded. AC-1, AC-2, AC-11 and the command-line halves of AC-3, AC-4 and AC-8 hold, with evidence inline.
- **Demonstration**: `pnpm --filter='@sharpee/bootstrap' test`, `pnpm --filter='@sharpee/transcript-tester' test` and `pnpm --filter='@sharpee/devkit' test play` pass; `node --test tools/explorer-probe/tests/*.test.js` passes; `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` passes after the census-reviewed re-record; `yes wait | head -81 | ./sharpee play tutorials/relighting/chord-v4.1.0/chapter-19` puts "The light has turned" in the reply to command 50 and "Dusk comes down" in the reply to command 80 (AC-1); `printf 'wait\nwait\n' | node dist/cli/sharpee.js --play --story stories/hunger-demo/hunger-demo.story` shows neither hunger line in the opening, "A hollow ache settles behind your ribs." after the first wait and "Your stomach knots and will not let go." after the second (AC-2); `pnpm test:scripts opening-baseline` passes (AC-3, command line); `node dist/cli/sharpee.js --exec "look" --story stories/dungeo --restore wt-13a` prints no opening (AC-8, headless restore); `git grep -n -E "execute(Turn|Command)\(['\"]look['\"]\)" -- packages scripts tools` lists only `packages/platform-browser/src/BrowserClient.ts` and archives.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 5: The tree's single `opening` card across the walker, claims, derived tier and Testing surface model, with the gating trees re-recorded
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: The tree document (ADR-307 D2 as amended), the walker (ADR-357 D9 as amended) and every consumer of the card type, including the Testing surface both IDE heads carry. Covers decision 12 and AC-10's code half.
- **Entry state**: Phase 4 exit holds, and bootstrap's `runOpening()` exists.
- **Deliverable**: The `boot` type is removed from `packages/branch-tester/src/tree-document.ts`, and the walker calls the opening in `packages/branch-tester/src/tree-walker.ts`, with no `return 'look'`. Also: the `(opening)` row in `packages/branch-tester/src/runner.ts`; `packages/branch-tester/src/claims/claim-lock.ts` and `packages/branch-tester/src/claims/claims-walk.ts`; the start-block kind in `packages/world-index/src/branches.ts` and `packages/branch-tester/src/derived-runner.ts`; `scripts/make-story-artifacts.mjs`; the Testing surface in `tools/ide/web/testing-surface/src/model.ts`, `tools/ide/web/testing-surface/src/cards.ts` and `tools/ide/web/testing-surface/src/main.ts`; a one-shot migration `scripts/migrate-boot-cards.mjs` (new); and the gating trees re-recorded.
  - **Tree document.** `TreeCardType` is `'opening' | 'turn'`. A document carrying a `boot` card is a named defect, with no migration in the reader (ADR-307 D8, ADR-404 decision 13).
  - **Walker.** It calls the game's `runOpening()` once per line's boot, before the first command, and the boot-placement defect goes. The `(opening)` row and the default opening claims read the opening's captures, and the row still carries the opening card's id (ADR-357 D9).
  - **Claims.** The claims walk starts from the state after the opening, with no typed `look`, and claim-lock's boot-card offsets go.
  - **world-index.** The start-block kind is renamed per Settle item 5.
  - **make-story-artifacts.** No leading `look` probe; the opening card carries the room's assertions, and there is no boot card.
  - **Migration.** Through branch-tester's canonical writer, strip each boot card and move its assertions onto the opening card, in every tracked tree outside `docs/work/archive/` (historical evidence, left as is) and `docs/work/chord-primer/` (Settle item 7). Then run each gating tree and re-record what moves: `test-stories/ferry/ferry.tests`, `test-stories/lodge/lodge.tests` and `test-stories/orchard/orchard.tests`, with OB-40 rewritten first in `test-stories/orchard/orchard.test-set.md`; the claims pins read from `lodge`, `bazaar` and `ferry`; `packages/branch-tester/tests/fixtures/state-pins/state-pins.tests` and the devkit fixtures; and the `scripts/__tests__` narrative pins. Record `test-stories/quay/quay.tests` (new) with one opening card. The non-gating trees (the tutorial, `branch-stories/`, `thealderman`) are migrated here and re-recorded in Phase 7.
  - **Testing surface.** The first record after any boot binds to the opening card, and no boot card is ever made. Rebuild `surface.js` with `tools/ide/web/testing-surface/build.mjs` into `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js`, and update the surface's tests and the SharpeeIDETests fixtures and assertions. Interim, stated so nobody reads it as a defect: until Phase 6, the browser client still runs its own `look`, which the surface binds to the opening card, so IDE play runs one turn ahead of the command line until then. Nothing ships between the two phases.
- **Files**: `packages/branch-tester/`, `packages/world-index/`, `packages/devkit/`, `scripts/make-story-artifacts.mjs`, `scripts/migrate-boot-cards.mjs` (new), `scripts/__tests__/`, `tools/ide/web/testing-surface/`, `tools/ide/SharpeeIDE/Resources/testing-surface/`, `tools/ide/SharpeeIDETests/`, `test-stories/`, `tutorials/relighting/chord-v4.1.0/`, `branch-stories/`, `stories/thealderman/chord/thealderman.tests/`, `docs/work/opening-routine/`
- **Exit state**: A tree has one opening card and no boot card, and the walker runs no opening look. Every gating suite and tree passes. AC-5's second and third searches find nothing in branch-tester, world-index, `scripts/` or the Testing surface. Every tracked tree outside the two exclusions is canonical.
- **Demonstration**: `pnpm --filter='@sharpee/branch-tester' test`, `pnpm --filter='@sharpee/world-index' test` and `pnpm --filter='@sharpee/devkit' test` pass; `pnpm test:scripts` passes; `npx vitest run --config tools/ide/web/testing-surface/vitest.config.ts` passes; `./sharpee test test-stories/quay/`, `./sharpee test test-stories/ferry`, `./sharpee test test-stories/lodge` and `./sharpee test test-stories/orchard` pass; `node scripts/check-test-trees.mjs --all` exits 0; `git grep -n "return 'look'" -- packages/branch-tester/src` prints nothing; `git grep -n -E "'boot'|\"boot\"" -- packages/branch-tester/src packages/world-index/src scripts tools/ide/web/testing-surface/src tools/ide/SharpeeIDE/Resources/testing-surface` prints nothing; `xcodebuild test -project tools/ide/SharpeeIDE.xcodeproj -scheme SharpeeIDE -destination 'platform=macOS' -derivedDataPath tools/ide/DerivedData -only-testing:SharpeeIDETests/TestingSurfaceRealPathTests` passes, run with the SYMROOT and OBJROOT overrides of the pinned IDE invocation.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 6: The browser client opens with the routine, shows a blank turn count, and has its workarounds examined
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The browser head that every built page, the IDE's Play pane and the Testing surface use. Covers decisions 4, 11 and 14 (the client rule), and AC-3, AC-4, AC-6, AC-8 and AC-9 in the browser.
- **Entry state**: Phase 5 exit holds, and the Testing surface already binds the first record after a boot to the opening card.
- **Deliverable**: `packages/platform-browser/src/BrowserClient.ts` calls `runOpening()` on a new game, on RESTART through its reboot, and on a failed restore. A restored session prints no opening. The play feed's first record is the opening, with no command and no echo. 0 is shown as blank in `packages/platform-browser/src/channels/status.ts`, `packages/platform-browser/src/display/StatusLine.ts`, `packages/platform-browser/src/BrowserClient.ts#renderCombinedStatus` and the static text of `packages/devkit/templates/browser/index.html`. The workarounds are examined, and the browser's real-path tests are extended.
  - **channel-service.** `packages/channel-service/src/render-to-string.ts` changes only if the census found a producer of `status.turns`, and only with David's agreement, because that package is outside the record's Scope line.
  - **Workarounds examined, each with its verdict and reason recorded in the census.** `turnOffset` at the autosave restore and the Restore-menu path: is it still needed once the opening costs no turn, given #798's channel ledger skips `turn` on restore? The play feed's `[SKIP]` boot turn: does anything still record a boot turn once the feed's first record is the opening? `packages/platform-browser/tests/capture-parity.test.ts` aligns both sides on the opening instead of a boot turn.
  - **Tests.** `packages/platform-browser/tests/opening-real-path.test.ts` compares the default story's DOM with Phase 1's baseline (AC-3, browser) and checks the reordered and omitted variants (AC-4, browser). `packages/platform-browser/tests/chapter-before-room.test.ts` still passes, and the card comes once (AC-6). AC-8 is tested on a real BrowserClient: first load, RESTART through `restart-reboot.test.ts`, a failed restore, and a restored session ending with "[Session restored]" and no opening. AC-9: the status line shows no turn count before the first command and 1 after it, with the channel at 0 and then 1.
  - **The Restore-menu seam (#800).** The `turnOffset` verdict covers the Restore-menu path, which has no real-engine test today. `packages/platform-browser/tests/channel-restore-real-path.test.ts` gains a Restore-menu case on a real GameEngine before the verdict is recorded, and the verdict cites it. If that case cannot be written in this phase, the verdict is recorded for the boot seam only and says so.
  - **The surface's wait for a boot turn.** `tools/ide/web/testing-surface/src/main.ts` waits for the boot look as a turn (`:986`, "no boot look in 15s", and `:1161`), and `cards.ts`, `run.ts` and `busy.ts` mark it. Once the browser client runs no such turn, those waits read the opening record instead; the source changes here and `surface.js` is rebuilt.
  - **IDE heads.** The Play and Testing real-path suites pass on the rebuilt bundle, and so does PaneHost.Tests.
- **Files**: `packages/platform-browser/`, `packages/devkit/templates/browser/index.html`, `packages/channel-service/src/render-to-string.ts`, `tools/ide/web/testing-surface/`, `tools/ide/SharpeeIDETests/`, `tools/ide/PaneHost.Tests/`, `tools/ide/SharpeeIDE/Resources/testing-surface/`, `docs/work/opening-routine/`
- **Exit state**: No head anywhere types an opening look. AC-5's first search finds no opening look in any head. AC-3, AC-4, AC-6, AC-8 and AC-9 hold in the browser. Both workarounds have a recorded verdict.
- **Demonstration**: `pnpm --filter='@sharpee/platform-browser' test` passes, including its opening-real-path suite against the Phase 1 baseline and its chapter-before-room, restart-reboot and capture-parity suites; `git grep -n -E "execute(Turn|Command)\(['\"]look['\"]\)" -- packages scripts tools` lists only archives under `packages/_archive/`; `xcodebuild test -project tools/ide/SharpeeIDE.xcodeproj -scheme SharpeeIDE -destination 'platform=macOS' -derivedDataPath tools/ide/DerivedData` passes, run with the SYMROOT and OBJROOT overrides of the pinned IDE invocation; `dotnet test tools/ide/PaneHost.Tests` passes.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 7: The repository's own recordings re-recorded, and the manual's chapters 19, 35 and 38 rewritten
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Everything recorded or taught before the change (decision 13), and the manual chapters that decision 12 and the Consequences name.
- **Entry state**: Phases 5 and 6 exit. Every head opens with the routine, and every tree is migrated.
- **Deliverable**: The companion trees under `tutorials/relighting/chord-v4.1.0/` re-run and re-recorded; `docs/book/chord-v4.1.0/parts/part-3/19-time.md`, `docs/book/chord-v4.1.0/parts/part-6/35-the-opt-in-systems.md` and `docs/book/chord-v4.1.0/parts/part-8/38-test-trees.md` rewritten; the non-gating trees and transcripts re-recorded; and the website and IDE docs that show a boot card updated.
  - **Companion trees.** Every tree under the tutorial is re-recorded (AC-10). Turn-keyed lines move by one, including the claims locked "at turn 82" and "at turn 138". Chapter-19's tree carries AC-1's two warnings at commands 50 and 80.
  - **The chapters.** Chapter 19's numbers. Chapter 35's sentence that the opening is a turn (line 184 today), examined against the new behavior and rewritten. Chapter 38 teaches one opening card, including its embedded tree and the quoted runs. Search every other chapter for a quoted number this change moves. Re-extract the snippets (`node ../../../scripts/extract-book-snippets.cjs` from the edition directory), run the snippet check against the in-repo CLI, build the HTML edition, and run the em-dash check. The published-toolchain check and the edition pin stay with the chord-manual plan.
  - **Non-gating recordings.** `stories/thealderman/chord/thealderman.tests`, the trees under `branch-stories/` (regenerate the three recipe stories with `scripts/make-story-artifacts.mjs`), and every non-Dungeo transcript corpus under `stories/`, each re-run and re-recorded, with differences listed in the census before re-recording.
  - **Docs.** `website/src/app/chord/guide/tooling/sharpee-test/content.mdx` loses its boot card. `website/src/app/chord/guide/world/the-story-header/content.mdx` says the opening is a routine and links the grammar reference, but teaches the block only if David asks (Settle item 8). Regenerate the IDE docs tab with `tools/ide/build-docs-tab.sh`. Edit the Chord primer's example only on David's word (Settle item 7).
- **Files**: `tutorials/relighting/chord-v4.1.0/`, `docs/book/chord-v4.1.0/`, `stories/thealderman/`, `branch-stories/`, `stories/`, `website/src/app/chord/`, `tools/ide/SharpeeIDE/Resources/docs-tab/`, `docs/work/chord-primer/`, `docs/work/opening-routine/`
- **Exit state**: Every companion tree passes after re-recording (AC-10). Chapters 19, 35 and 38 match the new behavior, the edition builds clean, and the snippet check passes against the in-repo CLI. Every repository recording outside the archives is re-recorded. No published page or IDE doc shows a boot card.
- **Demonstration**: `./sharpee test tutorials/relighting/chord-v4.1.0/chapter-19` passes, and every other directory under `tutorials/relighting/chord-v4.1.0/` passes the same way, one line per directory in the evidence; `node scripts/check-chord-snippets.cjs docs/book/chord-v4.1.0` exits 0 against the in-repo CLI; `./scripts/build-book.sh chord-v4.1.0 html` builds clean; `grep -rn "—" docs/book/chord-v4.1.0/frontmatter docs/book/chord-v4.1.0/parts` lists only verbatim platform output; `docs/work/opening-routine/census.md` lists each non-gating recording (thealderman, the `branch-stories/` trees, the non-Dungeo transcripts) with its differences before re-recording and its result after, as a record and not as a gate (ADR-395 D7); `bash tools/ide/build-docs-tab.sh` regenerates the docs tab, and the `git grep -n -E "'boot'|\"boot\"" -- website/src tools/ide/SharpeeIDE/Resources` search finds no boot card.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 8: The acceptance sweep, the record, and the release prepared for David
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: AC-1 to AC-11 evidenced together, ADR-404 marked built, and a release the naive runs can install.
- **Entry state**: Phases 1 to 7 exit.
- **Deliverable**: `docs/work/opening-routine/acceptance.md` (new), with each criterion as its command, result and date, re-run on one build. ADR-404 gets an "As built" note (the list rule from Settle item 1, the packet mechanism, the status-channel set, the meta-turn ruling, the world-index rename, and the workaround verdicts) and its Scope line widened to the paths the work reached beyond it (`website/`, `packages/sharpee`, `branch-stories/`, `stories/thealderman`, `docs/architecture/`, and `packages/channel-service` if Settle item 2 or Phase 6 touched it), with `**Planning**` flipped from OPEN to IMPLEMENTED and the index rebuilt with `~/.claude/scripts/adr-index.sh`. The release cut is prepared at David's numbers: a release note in `docs/releases/` (with decision 13's line: old saves restore one turn higher, and earlier transcripts and trees should be re-recorded), `website/src/lib/releases-data.json`, `tsf version` across the workspace, and the Chord number in `packages/chord/src/version.ts`. It is committed on David's word, and David dispatches `.github/workflows/publish-npm.yml`.
- **Files**: `docs/work/opening-routine/`, `docs/architecture/adrs/adr-404-the-opening-is-a-routine-not-a-turn.md`, `docs/architecture/adrs/INDEX.md`, `docs/releases/`, `website/src/lib/releases-data.json`, `packages/`, `stories/`, `tools/`
- **Exit state**: AC-1 to AC-11 all hold on one build, with evidence inline. ADR-404 reads IMPLEMENTED in the index. The release is published by David's dispatch, and the chord-manual plan's Phase 8 can resume on it.
- **Demonstration**: `pnpm exec turbo run test:ci` passes; `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` passes; `git grep -n -E "execute(Turn|Command)\(['\"]look['\"]\)" -- packages scripts tools` lists only archives, and `git grep -n "return 'look'" -- packages/branch-tester/src` prints nothing; `bash ~/.claude/scripts/adr-index.sh` rebuilds an index whose ADR-404 row reads IMPLEMENTED; after David's dispatch, npm view on the devkit package prints the new version, recorded in the evidence.
- **Demonstrated**: 
- **Status**: PENDING
