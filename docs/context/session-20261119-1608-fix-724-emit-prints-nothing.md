# Session Summary: 2026-11-19 - fix/724-emit-prints-nothing (16:08 CST)

## Goals
- Fix GH #724: an `emit` whose event name is also a phrase key prints that phrase, using the trait's default text rather than the entity's override.
- Do it by saying what the event is, not by flagging it (David: "I dislike the narrate: false construct - it is not a DDD construct"), and remove the `narrate` flag from the platform in the same patch-sized change ("one big happy patch bump change").

## Phase Context
- **Plan**: `docs/work/story-event-not-prose/plan.md`: a Chord `emit` raises a story event, the story declares its story-event vocabulary, and the prose pipeline's filter drops those types; `narrate` leaves the platform. `**Plan Status**: DONE` (read back from the plan; the session's `plan-phase.sh advance` printed "every phase is terminal — Plan Status DONE (archive with plan-archive.sh)").
- **Phases executed**:
  - Phase 1, "A story event is not prose — the story declares its story events, and the prose pipeline drops them" (Large, budget 400): DONE.
  - Phase 2, "A domain event carries no rendering flag — `narrate` removed from the platform" (Medium, budget 250): DONE.
- **Tool calls used**: 639 for the whole session at this write (state file). About 128 came before the plan existed, and Phase 1 closed by 338. Phase 2 used at most 188 of its 250; the calls after its flip (about 110) went to its mutation check, the test it asked for, ADR-405's acceptance and three summary writes.
- **Phase outcome**: Both completed under budget.
- **Out-of-scope changes**: both flips printed the same two lines, and both files are this session's Phase 1 work (the plan's Phase 1 "As built", departure 1).
  - Phase 1's flip:
    - `out of scope: packages/chord/src/story-events.ts`
    - `out of scope: packages/chord/src/validate-ir.ts`
  - Phase 2's flip, with the Phase 1 files still in the tree:
    - `out of scope: packages/chord/src/story-events.ts`
    - `out of scope: packages/chord/src/validate-ir.ts`

## Completed

### Diagnosis of #724
- Cause found by reading the source. `emit` raises type `petted` (`packages/story-loader/src/runtime/statements.ts`, `case 'emit'`), and the loader registers every phrase key as a message id (`extendLanguage` in `packages/story-loader/src/loader.ts`). `handleGenericEvent` (`packages/engine/src/prose-pipeline/handlers/generic.ts:87`, "try the event type as a template key") then renders it.
- John's Family Zoo v13, with his two `emit` lines restored in a scratch copy, reproduced the doubled line on main. `stories/friendly-zoo/zoo.story` prints the same doubled line.
- The published manual promises the opposite: "An event is not prose, and `emit` prints nothing" (`docs/book/chord-v4.1.0/parts/part-7/37-the-page-the-player-sees.md:213`).
- Not a 5.6.1 regression: `git log -S` dates the event-type lookup to `ac970ce06` (2026-01-13, "feat(text): Implement text pipeline and formatter system").
- These findings were posted as a comment on #724.

### First attempt, reversed
- A `narrate: false` stamp on `emit`, honoured by the prose filter and carried through the CapabilityEffect envelope, passed its tests and the Dungeo chain. An `emit` in `on every turn` still printed, because the loader's `narrated()` stamped `narrate: true` over it.
- Phase 1 reversed it with `git checkout` of the ten files it touched. The state file still lists the world-model capabilities files, `capability-dispatch-helper.ts`, `universal-capability-dispatch.test.ts`, `interceptor-report-result.test.ts`, `runtime/dispatch-verbs.ts`, `runtime/statements.ts` and `genai-api/world-model.md`; `git status` at this write shows none of them differing from main.

### Phase 1: the story-event vocabulary, carried from compiler to filter
- Chord: `storyEvents` is a required IR list in `packages/chord/src/ir.ts` (the Chord ids every `emit` names, sorted, each once), and `IR_FORMAT` is `story language 7`. `collectStoryEvents` in the new `packages/chord/src/story-events.ts` reads the list off the built IR, and the `emitStoryEvents` pass in `analyzer.ts` records it before `emitIdentity`. `validateIR` refuses a list that disagrees (`analysis.story-events-mismatch`), and `version.ts` gains a pending-publish changelog entry.
- Loader: `ChordStory` in `packages/story-loader/src/loader.ts` sets `storyEvents` from the IR through `translateEventId`.
- Engine:
  - `Story.storyEvents?: readonly string[]` (`install/story.ts:314`).
  - Optional `IProsePipeline.setStoryEvents` (`prose-pipeline/types.ts:153`), implemented in `pipeline.ts`.
  - `filterEvents` (`stages/filter.ts`) drops members of the set before its existing rules.
  - `GameEngine.installStory` and `setTextService` hand the set to the pipeline.
- Tests:
  - New: `gh-724-emit-prints-nothing.test.ts` (18 real-path cases at Phase 1's close, 19 now), engine `tests/unit/story-events.test.ts` and chord `story-events-ir.test.ts` (7 each).
  - `filter.test.ts` gained 2 net.
  - The `story language 6` pins and four chord snapshots moved to `story language 7`.

### Mutation verification on Phase 1, and its two gaps closed
- The agent reported every state change asserted on real output, with no test that cannot fail, and two gaps [reported by session, unverified].
- Gap 1: `ProsePipeline.setStoryEvents` lower-cases the declared list, and no test covered it. Gap 2: `setTextService` was checked only through a recording double.
- Both gaps are closed in `packages/engine/tests/unit/story-events.test.ts`, by "a declared type is matched without regard to the case it was declared in" (line 87) and "a real pipeline swapped in after install renders no declared story event" (line 96, a real `ProsePipeline`, output asserted before and after the swap). Both pass in the writer's engine run (Test Coverage Delta).
- Two comments said media statements lower to `emit`, which `play sound` does not. Both now say "other than `play sound`" (`packages/chord/src/ir.ts:180`, `packages/chord/src/story-events.ts:50`).

### Phase 2: `narrate` removed from the platform, with no replacement
- Core: the field leaves `ISemanticEvent` (`types.ts`). `createEvent` (`event-system.ts`) loses the metadata key, the `?? true` default, the delete and the field. `CreateEventOptions` and `createTypedEvent` (`event-factory.ts`) lose theirs.
- Producers: the refused-meta event (`game-engine.ts`), `normalizeEvent` (`turn/turn-event-processor.ts`), `effect-processor.ts`, `english-parser.ts`, `WorldModel.ts`.
- Loader: `narrated()` is deleted from `runtime/core.ts`. Its five call sites in `runtime/scheduler-constructs.ts` and one in `runtime/timers.ts` return the events directly.
- Stories: 42 removed lines across 21 Dungeo files (40 `narrate: true`, 2 `narrate: false`), counted from `git diff -U0 -- stories/dungeo/src`. Nine lines in `stories/family-zoo-tutorial/src/events.ts` (8 single-line literals rewritten). `git diff --shortstat -- stories` reports "23 files changed, 9 insertions(+), 52 deletions(-)", including Dungeo's build stamp.
- Tests: core `event-system.test.ts` (one test removed, two assertions and two literals edited) and `typed-events.test.ts`, plus stdlib `going-computed-exits.test.ts`.
- Records: dated "Amended 2026-11-19 (ADR-405 Decision 5)" notes on ADR-082 and ADR-001. `genai-api/core.md` was regenerated without the three `narrate?: boolean` members.
- Left in place by design (plan): the `NpcContext.narrate(...)` method and its mocks, prose using the verb, the pinned book editions, `tutorials/familyzoo/`, archived records and ADR-076.

### Mutation verification on Phase 2, and the test it asked for
- The agent ran after Phase 2's flip (event log 23:29:16Z, "Agent completed", `mutation-verification`). Its verdict, as the main session relayed it [reported by session, unverified]: no behaviour change beyond dropping the field, and no remaining reader or writer of an event `narrate` field.
  - The call-site half is checked here: `git diff` of `runtime/{core,scheduler-constructs,timers}.ts` shows each of the six former `this.core.narrated(x)` returns now returning exactly `x`, and the helper's five lines deleted.
  - The field half is checked here: the plan's `narrate` pattern over `packages stories tools scripts test-stories website`, and `git grep -w narrated -- packages/story-loader/src`, both printed nothing at this write; so did the pattern with `--untracked` over the chord and loader sources and the new test files.
- One gap, which predates this work: nothing asserted that prose from a machine body, a trait's every-turn clause, or a story-header every-turn clause reaches the engine's printed text, though these are the bodies `narrated()` used to wrap.
- Two of the three are now pinned in `packages/story-loader/tests/gh-724-emit-prints-nothing.test.ts` (edited 23:34:34Z). The `EVERY_PATH` fixture gained `phrase gate-opens` in the gate machine's `on enter` and a `creaking` trait whose every-turn clause says `phrase weathervane-creaks`, on a new weathervane. The new case "prose from the scheduler-run bodies still reaches the player" (line 292) asserts "The gate swings open." is printed and "The weathervane creaks." is printed once per command in `PLAY`. The file now holds 19 cases (counted in the file). `pnpm --filter '@sharpee/story-loader' test run gh-724`: "Tests 19 passed (19)" [reported by session, unverified: no event-log row].
- The story-header `on every turn` path is still untested for printed prose: filed as 819.

### Records
- ADR-405, "A story event is not prose" (`docs/architecture/adrs/adr-405-a-story-event-is-not-prose.md`): Status ACCEPTED, with David's word quoted ("accept", to "Do you accept it?"); Planning stays OPEN until the branch lands on main, the main session's choice, stated to David. Kind technical. Its `INDEX.md` row (Planning OPEN, its Summary line) matches the ADR.
- Issue #818 was filed at David's request. Across six runs with and six without the filter line, five Dungeo unit transcripts failed every run in both arms, and three failed intermittently.
- Issue 819 filed at this write for the remaining test gap; #724 carries a comment from this write describing the fix as built and saying it stays open until the branch is merged.

## Key Decisions

### 1. The fix says what the event is, not how to render it (David)
A Chord `emit` raises a story event. The IR declares the story's story events, the engine gets them as `Story.storyEvents`, and the prose filter drops them by type. Nothing is flagged per event, which follows ADR-404's shape (an IR list becomes data on `Story`).

### 2. `narrate` leaves the platform in the same change, with no replacement (David)
Built in Phase 2. The field was read by nothing after Phase 1, so every removed occurrence was a dead write.

### 3. `IR_FORMAT` moves to `story language 7`, and no version number moves (David: a patch)
This follows ADR-388's precedent.

### 4. Media `emit` names are in the vocabulary (plan recommendation 2, approved)
The guarantee belongs to the statement, so a media `emit` carrying a `text` field prints nothing either.

### 5. Three as-built departures, each smaller than the plan's design
- The list is collected by one IR walk with a `validateIR` gate (from plan review's TENSION, approved by David), rather than filled at the two minting sites.
- There is no install step and no install-context collaborator: `installStory` and `setTextService` tell the pipeline directly.
- `setStoryEvents` is optional, so the mock and host pipelines are unchanged.

### 6. ADR-405 accepted, with Planning held at OPEN until main (David accepted; the hold is the session's call)
David answered "accept, hold the commit". Planning reads OPEN rather than IMPLEMENTED because the decisions are built only on this branch; it moves when the branch lands on main.

## Next Phase
Plan complete — all phases done. The session's own `advance` set `**Plan Status**: DONE`, so archiving it (`plan-archive.sh story-event-not-prose`) is the main session's step. It is held for David because ADR-405 and this summary cite the plan's current path, and `.current-plan` still names `docs/work/story-event-not-prose/plan.md`.

## Open Items

### Short Term
- 724: An emit whose event name is also a phrase key prints that phrase, using the trait's default text instead of the entity's override
- 819: No test pins that prose from a story-header on every turn clause reaches the printed text

### Long Term
- 818: Dungeo unit transcripts: five fail on every run and three fail intermittently
- 815: Role hand-over on a turn that moves the player prints the wrong room heading and "can sees"
- 817: Chord manual print-on-demand interior: spine width, an embedded Apple Color Emoji font, and Apple system font licences are unsettled
- 795: A silent phrase marker at the end of a description leaves a trailing space
- 799: Chord manual PDF: the wrap filter width for listings inside aside boxes is worked out, not seen on a rendered page

## Files Modified

**Chord compiler** (5 files):
- `packages/chord/src/story-events.ts` (new): `collectStoryEvents`.
- `packages/chord/src/ir.ts`: `storyEvents`, `story language 7`, the `play sound` comment.
- `packages/chord/src/analyzer.ts`: the `emitStoryEvents` pass.
- `packages/chord/src/validate-ir.ts`: the mismatch gate.
- `packages/chord/src/version.ts`: the pending-publish entry.

**Core** (3 files): `packages/core/src/events/{types,event-system,event-factory}.ts`: `narrate` removed.

**Engine** (6 files):
- `install/story.ts`, `prose-pipeline/{types,pipeline}.ts` and `prose-pipeline/stages/filter.ts`: the vocabulary.
- `game-engine.ts`: the hand-over, and the refused-meta flag removed.
- `turn/turn-event-processor.ts`: `normalizeEvent`'s flag removed.

**Loader** (4 files):
- `packages/story-loader/src/loader.ts`: `ChordStory.storyEvents`.
- `src/runtime/{core,scheduler-constructs,timers}.ts`: `narrated()` gone.

**Other producers** (3 files): `packages/event-processor/src/effects/effect-processor.ts`, `packages/parser-en-us/src/english-parser.ts`, `packages/world-model/src/world/WorldModel.ts`.

**Stories** (23 files):
- 21 under `stories/dungeo/src/{actions,handlers,npcs/robot,scheduler}`.
- `stories/dungeo/src/version.ts` (build stamp).
- `stories/family-zoo-tutorial/src/events.ts`.

**Tests** (17 files):
- New: `packages/story-loader/tests/gh-724-emit-prints-nothing.test.ts` (19 cases, the last from Phase 2's mutation check), `packages/engine/tests/unit/story-events.test.ts`, `packages/chord/tests/story-events-ir.test.ts`.
- Changed: `packages/engine/tests/prose-pipeline/stages/filter.test.ts`, `packages/core/tests/events/{event-system,typed-events}.test.ts`, `packages/stdlib/tests/unit/actions/going-computed-exits.test.ts`.
- Version pins: `packages/chord/tests/{adr-327-phase1,adr-327-phase3,analyzer}.test.ts`, four chord `__snapshots__`, `packages/story-loader/tests/{loader,select-ids}.test.ts`, `packages/devkit/src/{commands/compose,standalone/browser-core-build,standalone/chord-build}.test.ts`.

**Records and generated** (10 files):
- `docs/architecture/adrs/adr-405-a-story-event-is-not-prose.md` (new, ACCEPTED), plus `INDEX.md`, `adr-082-typed-event-system.md` and `adr-001-parser-debug-events.md`.
- `docs/work/story-event-not-prose/plan.md` (new) and `docs/context/.current-plan`.
- `packages/sharpee/docs/genai-api/{core,engine,index}.md`.
- `docs/context/session-20261119-0217-main.md`: carried from main, not this session's edit (Notes).

## Notes

**Session duration**: about 1h35m (16:08 to 17:42 CST).

**Approach**: The cause was traced in the source and reproduced with John's story. The flag-based fix found a hole in itself and was replaced by a plan, which plan review checked and David approved. Each phase was built against the plan, Phase 1's departures are recorded in its "As built" line, and each phase's mutation check ended in tests rather than a report.

**The published API change** (no version number moved):
- `@sharpee/core` loses `ISemanticEvent.narrate`, `createEvent`'s `narrate` metadata key and `CreateEventOptions.narrate`.
- `@sharpee/engine`'s `Story` gains the optional `storyEvents`.
- `@sharpee/chord`'s IR gains `storyEvents`, and `IR_FORMAT` is `story language 7`.

**A formatting slip, caught and redone**: the first pass at the story removals used Edit with an `old_string` that began with a newline and had an empty replacement. At about 44 sites this joined two lines, which was valid TypeScript but wrong formatting. The files were restored with `git checkout` and the removals redone as whole-line deletions. The diff counts above come from the redone tree.

**Write history**: the first write ran in the background while Phase 2 began, so its "Phase 2 has not begun" was stale when it landed (Phase 2 edits from 23:19Z; that write at 23:21:49Z). The later writes replaced it.

**Commit and push**: David held the commit when he accepted ADR-405, then invoked `/devarch:finalize`; the main session read that as lifting the hold, and told him it pushes the feature branch only, with no merge.

**Still David's**:
- Merging the branch to main; #724 stays open until then.
- The plan archive, held (ADR-405 and this summary cite the plan's path, so archiving means repointing them).
- Whether to delete `dist/cli/sharpee-nofilter.js`, the git-ignored patched bundle from the #818 measurement.
- Not run this session: `pnpm test:scripts`, lang-en-us, the extensions, transcript-tester, branch-tester, platform-browser, the friendly-zoo transcripts, the browser client, the IDE's Xcode tests and `./repokit verify`.
- Carried from session aed920 and untouched: #815, #817, #795, #799, the IDE's Xcode tests after the Chord 4.1.0 pin, and the container `chord-naive-15`.

**Carried on this branch**: `docs/context/session-20261119-0217-main.md` holds session aed920's final summary write, the Activity Log its SessionEnd hook appended after its last commit, `1db000f2f`; it ships in this branch's commit.

**Outside the repository**: one machine-local harness memory (no presentation flags on events), plus scratch stories and a copy of the patched bundle in the session scratchpad.

---

## Session Metadata

- **Session**: 785b7e
- **Status**: COMPLETE (unverified: the gh-724 file's 19-case run after its last edit, with no full story-loader run since that edit; `./repokit build dungeo`; the friendly-zoo typecheck; the Dungeo walkthrough chain)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: has orphaned artifacts (`dist/cli/sharpee-nofilter.js`, git-ignored, kept until David answers)
- **Commits**: none before this write. This write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261119-1608-fix-724-emit-prints-nothing.md`.

## Dependency/Prerequisite Check

- **Prerequisites met**: main at `1db000f2f` (Sharpee 5.7.0 / Chord 4.1.0); a bundle that builds; David's approval of the plan and its five recommendations.
- **Prerequisites discovered**: the Dungeo unit transcripts cannot serve as a gate (#818), so the walkthrough chain remains the floor.

## Architectural Decisions

- ADR-405 (ACCEPTED, Planning OPEN until main): a story event is not prose. The compiled story declares its story-event types, the prose filter drops them by type, and a domain event carries no rendering flag.
- ADR-082 and ADR-001 carry dated amendment notes: their samples show a field that no longer exists.
- Patterns applied:
  - ADR-404: an IR list becomes data on `Story`.
  - ADR-388: an `IR_FORMAT` move ruled a patch.
  - ADR-389 D4: IR invariants live in `validateIR`.
  - ADR-256 D1: event ids are translated in the loader, never in chord.

## Mutation Audit

- Files with state-changing logic modified:
  - Phase 1: `stages/filter.ts`, `pipeline.ts`, `game-engine.ts`, `loader.ts`, chord `analyzer.ts`, `story-events.ts`, `validate-ir.ts`.
  - Phase 2: core `event-system.ts` (`createEvent`) and `event-factory.ts` (`createTypedEvent`), `turn-event-processor.ts`, `effect-processor.ts`, `english-parser.ts`, `WorldModel.ts`, loader `runtime/{core,scheduler-constructs,timers}.ts`.
- Tests verify actual state mutations (not just events): YES.
  - Evidence: the writer's engine run at 23:25:47–23:25:53Z, "Tests 928 passed | 7 skipped (935)", with `tests/unit/story-events.test.ts (7 tests)`, including both Phase 1 gap-closing cases (read in the file).
  - The agents' own verdicts on both phases are [reported by session, unverified]; Phase 2's two load-bearing claims were checked at this write (the diff and the greps above).
  - Phase 2's new printed-prose case asserts on the turn's printed text (read in the file); its run is [reported by session, unverified].

## Test Coverage Delta

- Tests added:
  - 19 in gh-724 (18 in Phase 1, 1 from Phase 2's mutation check).
  - 7 in engine `story-events.test.ts` (5 in Phase 1, 2 from Phase 1's mutation check).
  - 7 in chord `story-events-ir.test.ts`.
  - 2 net in `filter.test.ts`.
  - One test removed from core `event-system.test.ts`.
- Before → after:
  - story-loader 1719/1 skipped → 1732/1 skipped at the last full run, before the 19th gh-724 case; not re-run since, so the current tree's count is unmeasured.
  - engine 919/7 → 928/7.
  - world-model 1687 → 1687.
  - Baselines from the plan [reported by session, unverified]; no baseline recorded for the other suites.
- Evidence: the writer's own runs, 2026-11-19 23:25:46–23:26:30Z, after the last source edit (`packages/story-loader/src/runtime/timers.ts`, 23:21:11Z) and the bundle (`dist/cli/sharpee.js`, 23:22:38Z, unchanged since). Each command was `pnpm --filter '@sharpee/<pkg>' test run`:
  - core "Tests 152 passed (152)".
  - engine "Tests 928 passed | 7 skipped (935)".
  - event-processor "Tests 33 passed (33)".
  - parser-en-us "Tests 553 passed (553)".
  - world-model "Tests 1687 passed (1687)".
  - stdlib "Tests 1970 passed (1970)".
  - story-loader "Tests 1732 passed | 1 skipped (1733)", with `gh-724-emit-prints-nothing.test.ts (18 tests)`; stale for that file since its 23:34:34Z edit.
  - chord "Tests 1966 passed (1966)", with `story-events-ir.test.ts (7 tests)`.
  - story-dungeo "Tests 58 passed (58)".
  - devkit, run as `pnpm --filter '@sharpee/devkit' test`: "Tests 240 passed | 1 skipped (241)"; the event log also has a devkit row at 23:24:30Z, "Tests passed", "35 passed 240 passed". Both follow the bundle devkit reads; the main session's later re-run reported the same count.
- Reported, not verified [reported by session, unverified], with no event-log rows:
  - `pnpm --filter '@sharpee/story-loader' test run gh-724`: "Tests 19 passed (19)", after the 23:34:34Z edit.
  - `./repokit build dungeo` ("=== build complete ===").
  - `pnpm --filter '@sharpee/story-friendly-zoo' typecheck` (clean).
  - The Dungeo walkthrough chain ("949 passed", "✓ All tests passed!").
- Known untested areas:
  - Prose from a story-header `on every turn` clause reaching the printed text (819).
  - `pnpm test:scripts`.
  - lang-en-us, the extensions, transcript-tester, branch-tester and platform-browser.
  - The friendly-zoo transcripts.
  - The browser client.
  - The IDE's Xcode tests.
  - `./repokit verify`.
  - The Dungeo unit transcripts (#818).

---

**Progressive update**: checkpoint 2026-11-19 17:21 — first write, at Phase 1's completion: diagnosis, the reversed flag attempt, Phase 1 as built, ADR-405 DRAFT, #818; four suite counts corroborated by re-run; Phase 1's Demonstrated line marked in the plan.
**Progressive update**: checkpoint 2026-11-19 17:27 — Phase 2 built and DONE, Plan Status DONE with the archive held; the mutation check's two gaps closed; ten suites and both greps re-run by the writer; Phase 2's Demonstrated line marked in the plan.
**Progressive update**: session completed 2026-11-19 17:42 — Phase 2's mutation check and the printed-prose case it asked for (gh-724 at 19 cases); ADR-405 ACCEPTED; 819 filed for the story-header gap and #724 commented; Phase 2's call-site and field claims checked by diff and grep; Status COMPLETE (unverified).
