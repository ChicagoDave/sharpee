# Session Summary: 2026-09-26 - explorer-prototype

## Goals
- Plan ADR-356 D4 (END STATE cards prove endings) plus the work the first-cut plan (GH #520) deferred to "the plan phase that lands D4": D9's three supersession notes, ADR-353 Phase 16's closure, and D5's remaining endings/rooms ratios.
- Implement Phase 1 on David's go-ahead, then Phase 2 in the same session.

## Phase Context
- **Plan**: `docs/work/testing-explorer/plan-20260926-adr356-d4-endstate.md` — "ADR-356 D4 — END STATE cards prove endings, plus D9's supersession notes and D5's remaining ratios."
- **Phase executed**: Phase 1 — "D4 — the END STATE card, the walker's line-ending change, the testing-surface affordance, and D9's notes" (Large, budget 400) and Phase 2 — "D5's remaining ratios — endings reached/declared, rooms entered/declared" (Large, budget 400), both in this session.
- **Tool calls used**: 220 (session state) against a combined 800 budget across the two phases.
- **Phase outcome**: Both completed under budget. Plan's own `**Plan Status**: DONE` (both phases DONE, 2026-09-26) — the plan header notes the directory stays in place, archiving being a human decision, so this write does not archive it.

## Completed

### Phase 1 — D4: END STATE cards, walker change, testing-surface affordance, D9 notes
- `packages/branch-tester/src/tree-document.ts`: `TreeCard.ending?: string` (the story-named `win`/`lose`/`kill` id, turn cards only), `TREE_DOCUMENT_VERSION` 1 → 2, validator accepts the field, `endingIdsDeclaredBy(document)` added for Phase 2's "reached" side.
- `packages/branch-tester/src/tree-walker.ts`: `flattenTreeLines` reports two new card-position defects (a card after an END STATE card; a branch forked from one) — defective documents run nothing, matching the existing opening/boot rule. `reviveEngine` removed from `TreeWalkerGame` and is never called.
- **Amendment A1** (recorded in the plan): the END STATE assertion lands as a new claim kind, not a walker-side read — `ending-assert` in `packages/transcript-tester` (`types.ts`, `assertion-core.ts`'s `checkEndingAssertion`, `serializer.ts` marks it unserializable like the four channel kinds, barrel export, `auto-assertion.ts` renders it `ending <id>`). Reason: the per-command row, the run-event wire, and the IDE run column all read the runner's rows through one evaluator (ADR-340 D3); a post-hoc walker check would desync the wire from the line's actual pass/fail. This widens the plan's touched packages by one that ADR-356's own Affected section already lists.
- `tools/ide/web/testing-surface`: `ending.ts` gains `endingIdOf` (messageId, else cause, off the `story-ending` channel); `main.ts` stamps the id when the ended flag flips; `model.ts` sets/fills it and `canBranch` refuses forking from an END STATE card; `cards.ts` renders `· END STATE · <id>`; bundle rebuilt into `tools/ide/SharpeeIDE/Resources/testing-surface`.
- D9's three supersession notes written (no Status lines flipped): beside ADR-353 D7 and D8 (quoting David's 2026-09-25 Q-5 ruling verbatim) in `docs/architecture/adrs/adr-353-the-testing-pane-visits-one-line.md`, and beside ADR-340 D5 in `docs/architecture/adrs/adr-340-testing-assertion-core.md`.
- `docs/work/chord-writer-avalonia-production/plan.md` Phase 16 closed: **Status: DONE (2026-09-26, session 54fb33)** — the ended-vs-failed presentation call was ruled by David under ADR-356 Q-5, not inferred.
- One-shot repair (throwaway scratchpad script, never shipped): every committed tree document moved to version 2 — `branch-stories/{fernhill,ides-of-march,secret-letter}`, `branch-stories/secret-letter/prototypes/w10-dance`, `stories/thealderman/chord`, `docs/work/john-chord-samples/no-signal-home`. Lines whose last card already reached a story-named ending were stamped: fernhill `main`→`fernhill-saved`, `main/b5`→`fuse-blast`; ides-of-march `main`→`ides-won`, `main/b2`→`unmasked-lose`; secret-letter `main/b16`, `main/b34/b38/b40`, `b48`, `b49`→`mercenary-brutality`, `main/b34/b45`→`stepped-out-caught`, `main/b34/b47`→`ride-out-caught`, `main/b34/b50`→`pole-falls`.
- Scan found (reported, not repaired): secret-letter `main` dies at card 77 (`ne` → death, cause `death-at-mercenaries-chord-167-5`) with 71 recorded cards after it failing against the stopped engine — this is issue #523's root cause. Three more lines (`main/b27`, `b28`, `b31`) reach the same synthesized-cause death with no authored id to stamp.

### Phase 2 — D5: endings and rooms ratios
- `packages/world-index/src/story.ts`: `endingsOf(ir): DeclaredEnding[]` beside `roomsOf` — static pass over `forEachStatementRoot` collecting every `win`/`lose`/`kill` by phrase-key id, deduplicated, unnamed ones (`id: null`) kept apart rather than folded into the denominator. Exported from the barrel.
- `packages/branch-tester/src/derived-runner.ts` and `tree-walker.ts`: each booted branch and each replayed line now tracks rooms entered (`DerivedOutcome.rooms`, `TreeDocumentRunResult.roomsEntered`) and endings reached (`endingsReached`, from passed `ending-assert` claims).
- `packages/branch-tester/src/coverage.ts`: `endingCoverageOf`, `roomCoverageOf`, `formatCoverageSummary` — three ratios (branches, endings, rooms) instead of one. Fixed a pre-existing blind spot in the same file's `siteOf` (unfixed since the first-cut plan's Phase 4): gap sites now honor the span's originating file, so an ending or branch in an imported `.chord` file cites `mercenaries.chord:167` rather than the main story file.
- `packages/devkit/src/commands/test-derived.ts` / `test-tree-document.ts`: print all three ratios in one report; exit-code rule unchanged — an unreached ending or unentered room is a gap, never a failure (D5a).
- **Measurement, run through `sharpee test`, recorded verbatim** (2026-09-26, session 54fb33; each story recompiled from source by the command itself):
  - fernhill — Branches 33/63 (unchanged); Endings 2/3 (not reached: `fernhill.story:636 · dawn-comes (lose)`); Rooms 13/13. Exit 1 (two pre-existing derived failures, issue #242).
  - ides-of-march — Branches 21/80; Endings 2/5 (not reached: `ides-no-book`, `ides-no-kemp`, `ides-nothing`, all `lose`); Rooms 5/5. Exit 0.
  - secret-letter (informational) — Branches 358/721, 12 derived failures (unchanged, issue #522); Endings 4/5 (not reached: `mercenaries.chord:167 · death-at-mercenaries-chord-167-5 (kill)`); Rooms 21/21. Exit 1 (the card-77 main-line failure, issue #523).

## Key Decisions
- The END STATE card's claim is evaluated as a claim kind in the assertion core (`ending-assert`), not a walker-side read after `runTranscript` — see Amendment A1 above (recorded in the plan itself).
- An ending id is the story's own name for it: `messageId` for `win`/`lose`, `cause` for `kill`. A death the story never named cannot be declared on a card — this is a permanent gap in the endings ratio, not a bug to fix by inventing an id.
- Card-position defects (a card after / a branch from an END STATE card) live in `flattenTreeLines` beside the existing opening/boot rules: the tab keeps showing the cards, but the CLI exits 2 and runs nothing.
- Phase 2 does not author new winning tree lines to improve fernhill's or ides-of-march's endings ratio — per CLAUDE.md's "do not invent story content," the ratio reported is whatever David's existing authored material produces.

## Next Phase
Plan complete — all phases done. `.current-plan` still points at this plan; per its own header note the directory stays in place ("archiving is a human decision"), so it was not moved to `docs/work/archive/`.

## Open Items

### Short Term
- #523: secret-letter pre-existing tree-line failure (`opening-northwest-junction` / `Grocery Stall`) — sharpened this session with the root cause (main line dies at card 77, 71 cards fail after it) via comment; disposition (trim vs. fix the story) is David's.
- #526: secret-letter's three lines reaching the compiler-generated death id (`mercenaries.chord:167`) can't be stamped with an END STATE card until the story names that death.
- #528: IDE Swift fixture (`TestRunnerTests.swift`) bumped to tree-document version 2 but XCTest was not run this session — TypeScript-side verification only.

### Long Term
- #527: `packages/bootstrap`'s `reviveEngine()` has no caller now that the walker no longer revives; its doc comment and one beside `derivePhaseFromEnding` in `game-engine.ts:1550` are stale. Comment added to #399 noting its premise (no real-path test for this call path) may now be moot since the call path itself is gone — left to David.
- #524: run-event wire type for derived branch outcomes — re-confirmed out of scope this session (comment added with the specific reasoning); stays filed for whenever live per-branch progress rendering is itself scoped.

## Files Modified

**branch-tester** (7 src + 6 test/fixture files):
- `packages/branch-tester/src/{tree-document,tree-walker,coverage,derived-runner,auto-assertion,index}.ts` - schema/version, walker line-ending change, three-ratio coverage
- `packages/branch-tester/tests/{derived-coverage,derived-runner,tree-document,tree-walker}.test.ts`, new `tree-end-state.test.ts`, new fixture `fixtures/end-state/`, `fixtures/assertion-core-names.json`, `fixtures/state-pins/state-pins.tests.json`

**transcript-tester** (4 src + 1 test):
- `packages/transcript-tester/src/{assertion-core,index,serializer,types}.ts` - new `ending-assert` claim kind
- `packages/transcript-tester/tests/claim-kinds.test.ts`

**world-index** (2 src + 1 new test):
- `packages/world-index/src/{story,index}.ts` - new `endingsOf`
- new `packages/world-index/tests/endings.test.ts`

**devkit** (4 src/test + 2 fixtures):
- `packages/devkit/src/commands/{test-derived,test-tree-document}.ts` and their `.test.ts` files, `test.test.ts`
- fixtures `derived-fail/derived-no-vocabulary.tests.json`, `derived-pass/derived-skip.tests.json`

**IDE testing-surface** (5 src + 5 test + rebuilt bundle + Swift fixture):
- `tools/ide/web/testing-surface/src/{cards,ending,main,model,surface.css}` and `tests/{ac-signoff-cli,ending,model,outline,tree-document}.test.ts`
- rebuilt bundle: `tools/ide/SharpeeIDE/Resources/testing-surface/{surface.css,surface.js}`
- `tools/ide/SharpeeIDETests/TestRunnerTests.swift` (version bump only, not run — see Open Items)

**One-shot repair, version 1 → 2** (6 tree documents):
- `branch-stories/{fernhill/fernhill,ides-of-march/ides-of-march,secret-letter/secret-letter,secret-letter/prototypes/w10-dance/w10-dance}.tests.json`, `stories/thealderman/chord/thealderman.tests.json`, `docs/work/john-chord-samples/no-signal-home.tests.json`

**Docs/ADRs/plans**:
- `docs/architecture/adrs/{adr-340-testing-assertion-core,adr-353-the-testing-pane-visits-one-line}.md` - D9 notes
- `docs/work/chord-writer-avalonia-production/plan.md` - Phase 16 → DONE
- `docs/context/.current-plan`, new `docs/work/testing-explorer/plan-20260926-adr356-d4-endstate.md`

## Notes
- Session duration: ~1 hour of active implementation (02:35–03:38 CDT); this terminal write and commit land at 12:30 CDT, several hours after Phase 2's own completion timestamp.
- Approach: session-planner wrote the two-phase plan continuing the first-cut plan's explicit deferral; both phases implemented in sequence within this session on David's go-ahead, each closed with Landed/Evidence sections and one plan amendment (A1) written into the plan itself rather than silently expanding scope.
- Test Coverage Delta's before/after totals were not diffed against a pre-session baseline (see below) — after-counts are evidence-backed, the delta itself is not computed.

---

## Session Metadata

- **Session**: 54fb33
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (all changes uncommitted at session end; nothing pushed or merged)

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-356's first cut (GH #520, DONE 2026-09-25/26) supplied `arrange()`, the derived rule-test runner, and the clause-branch enumerator that Phase 2 builds on; David's Q-5 ruling (2026-09-25, ADR-356's open-questions interview) was already in hand to close Phase 16 on a ruling given, not inferred; CLAUDE.md's "platform changes require discussion first" was satisfied by the plan itself plus David's go-ahead before each phase.
- **Prerequisites discovered**: Phase 1's scan found fernhill's main line already reaches `fernhill-saved` (correcting the plan's own planning-time assumption of a 0/2 endings ratio) — recorded as a plan correction at Phase 2's entry state, not a blocking prerequisite.

## Architectural Decisions

- ADR-356 D4, D5, and D9 implemented and closed out (D9's three supersession notes written, no Status lines flipped per D9's own instruction).
- ADR-353 D7/D8 and Phase 16 (in `docs/work/chord-writer-avalonia-production/plan.md`) closed on the quoted Q-5 ruling.
- ADR-340 D5's facade list re-confirmed with one added optional field.
- Plan amendment A1: `ending-assert` lands as a claim kind in `transcript-tester` rather than a walker-side read (ADR-340 D3's effect-catalog widening, not a new decision — recorded in the plan, not a separate ADR).
- Pattern applied: state-not-prose ending detection (`world.getEnding()`, ADR-347) mirrored between the play-time driver (`ending.ts`'s `endingOf`) and the offline Testing-tab affordance (`endingIdOf` reading the tree document's own field), per design precedent named in the plan's References.

## Mutation Audit

- Files with state-changing logic modified: `packages/branch-tester/src/{tree-document,tree-walker,coverage,derived-runner}.ts`, `packages/transcript-tester/src/assertion-core.ts`, `packages/world-index/src/story.ts`, `packages/devkit/src/commands/{test-derived,test-tree-document}.ts`, `tools/ide/web/testing-surface/src/{main,model}.ts`.
- Tests verify actual state mutations (not just events): **YES** (evidence: `pnpm --filter '@sharpee/branch-tester' test` → 190 passed, 12 files, 2026-09-26 session 54fb33 — `tree-end-state.test.ts` runs AC-6 against a real engine: a `win` and a `kill` declared by phrase key pass, the same line with the winning card removed fails naming the ending, the wrong declared id fails naming the actual ending reached, a card placed after an END STATE card is a defect with zero boots. `./sharpee test branch-stories/fernhill` → 86 cards passing, 106 assertions passing, both END STATE lines green.)

## Recurrence Check

- Similar to past issue? **YES** — `packages/branch-tester/src/coverage.ts`'s `siteOf` cited the main story file instead of an imported `.chord` file's span, a blind spot present since the first-cut plan's Phase 4 (`docs/work/testing-explorer/plan-20260925-520-adr356-first-cut.md`) and fixed in this session's Phase 2, one line.
- Otherwise NO for the rest of this session's work (new field/claim-kind/derivation additions, not repeats of prior findings).

## Test Coverage Delta

- Tests added: `packages/branch-tester/tests/tree-end-state.test.ts` (new), `packages/world-index/tests/endings.test.ts` (new, 4 cases), plus additions within `derived-coverage.test.ts`, `derived-runner.test.ts`, `tree-walker.test.ts`, `claim-kinds.test.ts`, `test-tree-document.test.ts`, `test.test.ts`, and the testing-surface's `ending.test.ts`/`model.test.ts`.
- Tests passing before → after: not diffed against a pre-session baseline this session. After-counts (evidence: run 2026-09-26, session 54fb33): `transcript-tester` 349 passed (27 files); `branch-tester` 190 passed (12 files); `world-index` whole suite green including `endings.test.ts`; `devkit` 17 passed across `test-derived`/`test-tree-document`/`test.test`; `testing-surface` 140 passed (12 files). `tsc --noEmit` clean on devkit, the surface, and branch-tester's test project; builds clean for transcript-tester, branch-tester, world-index, devkit.
- Known untested areas: the Swift `TestRunnerTests.swift` fixture (bumped, not run — issue #528); `packages/bootstrap`'s now-uncalled `reviveEngine()` (issue #527, pre-existing per #399); secret-letter's main line past card 77 (pre-existing, issue #523).

---

**Progressive update 03:16**: Phase 1 landed, all suites green, plan marked DONE with evidence; secret-letter main-line death (I-523 root cause) reported, not repaired.

**Progressive update 03:38**: Phase 2 landed — endingsOf, rooms/endings tracking in both tiers, three-ratio report; measured fernhill 2/3 endings 13/13 rooms, ides 2/5 and 5/5, secret-letter 4/5 and 21/21; plan marked DONE.

**Progressive update**: session completed 2026-09-26 12:30 — terminal write: both phases confirmed DONE against the plan's own Landed/Evidence sections, six open findings sorted into the issue store (#523 sharpened by comment, #399 commented, #524 re-confirmed by comment, #526/#527/#528 filed new), Phase 16 closure and D9 notes corroborated directly in their files.
