# Session Summary: 2026-09-09 - refactor/survey-adr-334-340 (05:47 CDT)

## Goals
- Phase 4 of `docs/work/game-engine-residue/plan.md`: `setStory` into named ordered installation steps (`STORY_INSTALL_STEPS` under `packages/engine/src/install/`), the two validators moved as files, the idempotency/post-start guard added and pinned, an order test; gate byte-identical.

## Phase Context
- **Plan**: `docs/work/game-engine-residue/plan.md` — continue ADR-334's decomposition of `packages/engine/src/game-engine.ts` beyond the turn (survey Phases 15-16, archived).
- **Phase executed**: Phase 4 — "`setStory` into named ordered installation steps" (Large, budget 400).
- **Tool calls used**: 141 / 400 (session-state snapshot at last read; this write continues the same phase's session).
- **Phase outcome**: Completed under budget; gate byte-identical throughout.

## Completed
- Session start: recap presented; `pre-session-audit` relayed (type check clean, no stale artifacts, Phase 4 PENDING with two open decisions); profile fresh (2026-09-04); core concepts read in full; gate scripts and survey/residue captures copied from session bc5973's scratchpad into this session's (`gates/`), `gate-stage.sh` repointed; gate cleared.
- Phase 4 opened 05:55 CDT: David ruled the `installStory` rename IN. Two mid-sequence reads resolved: `configureLanguageProviderNarrative` became a pure function over (language provider, settings, player) in `install/narrative-language.ts`, shared by the install step and the player switch; `onEngineReady` is not a step — `installStory` calls it after adopting the result, the one playthrough-side call in the sequence.
- Step 1 **install-steps** (gate 06:03 CDT, IDENTICAL ×4, engine 75 files / 738 passed / 7 skipped, per the plan's progress note): `packages/engine/src/install/` — `context.ts` (`InstallStep`, `InstallContext`, `StoryInstallDraft`, `StoryInstallResult`), `runner.ts` (`runInstallSteps`), `steps.ts` (`STORY_INSTALL_STEPS`, 18 named modules: validate-config, emit-story-loading, narrative-settings, concealed-visibility, initialize-world, create-player, listener-trait, validate-room-snippets, validate-combatant-health, narrative-language, metadata, story-info-entity, story-info-capability, implicit-actions, custom-actions, story-initialize, emit-story-loaded, custom-vocabulary), `index.ts`; the two validators moved as files via `git mv` to `install/validate-room-snippets.ts` and `install/validate-combatant-health.ts`, each exporting its step. Guard added: a second install throws naming the story id; an install after `start()` throws naming `running: true`; a failing step adopts nothing — a recorded behavior change, not exercised by any gate. `tests/unit/story-install-order.test.ts` (9 tests at this step): order, `requires` satisfied, swapped pair reported by name, one module per step, every step runs once through a real engine, both guard rejections with state unchanged, failed-step adopts nothing, `onEngineReady` sees the adopted result. `tests/integration.test.ts`'s "should recover from action errors" given its own engine (it had been installing a second story on a started engine — exactly what the new guard forbids). Facade `game-engine.ts` 1532 → 1394 lines.
- Step 2 **install-story-rename** (gate 06:05 CDT, IDENTICAL ×4, engine 75 / 738 / 7): `setStory` → `installStory` in 68 files (perl `\bsetStory\b`, scoped to packages/stories/branch-stories/scripts minus dist/archives/genai-api and `packages/map-editor`; the map editor's store and the IDE's `PublishView` carry unrelated `setStory` members, untouched). ADR-334 AC-5 and A1(iv) amended to record the rename as taken. Outside the gate: story-loader 121 files / 1104 passed (= residue baseline), platform-browser 15 / 148, helpers 4 / 13, bootstrap 6 / 52, all passing. Reference regenerated (`tsc --build packages/engine/tsconfig.json --force` then `node scripts/generate-genai-api.js`, per I-71ed1a-3): `engine.md` carries `installStory` and no `setStory`; `GameEngine`'s public member names against HEAD: same count, removed `setStory`, added `installStory`, nothing else.
- `mutation-verification` run at phase close (event log: agent completed `2026-09-09T11:03:42Z`, i.e. 06:03:42 CDT, right after the install-steps gate): 6 mutations clean (`world.setPlayer`, the ListenerTrait add, story-info entity, storyInfo capability, custom actions, metadata adoption); 3 gaps reported — lifecycle events, `custom-vocabulary`, and `narrative-settings`/`implicit-actions` adoption from a non-default config — closed by adding 3 tests to `story-install-order.test.ts` (9 → 12 tests): the two lifecycle events asserted through `engine.on('event')` with type order and payload; `custom-vocabulary` asserted on `vocabularyRegistry.hasWord`/`lookup` before and after install; the settings/actions pair asserted on `getNarrativeSettings().perspective` and `getContext().implicitActions`. Engine suite after: 75 files / 741 passed / 7 skipped (`vitest run`, 06:08 CDT; devarch event log `2026-09-09T11:08:11Z` — "Tests passed", "75 passed 741 passed").
- Phase 4 marked DONE in the plan (2026-09-09, session 9277dc, 05:55-06:10 CDT) with the full progress note (gate tables, mutation-verification results) recorded inline.

## Key Decisions
- `installStory` rename taken (David, 05:55 CDT) — ADR-334 A1(iv) and AC-5 amended in the same phase to record it: "one rename — `setStory` is `installStory`; the member count is unchanged and every call site renamed in the same commit."
- `onEngineReady` is not an install step: the story must see an engine that has adopted the result, so `installStory` calls it after adoption, as the one playthrough-side hook in the sequence. `configureLanguageProviderNarrative` is a pure function shared by the install step and the player switch, rather than reading engine state mid-sequence.
- Validators renamed to their step names (`validate-room-snippets.ts`, `validate-combatant-health.ts`) so the one-module-per-step test holds for `install/` as it already does for `turn/`.
- The idempotency/post-start guard is a genuine behavior change (neither case was refused before this phase) — recorded explicitly on the plan rather than folded silently into the refactor, and confirmed not exercised by any gate transcript or tree (none call `setStory`/`installStory` twice).

## Next Phase
- **Phase 5**: "Small-stuff batch" — seven residual cleanup items in `game-engine.ts` (non-optional `parser`/`languageProvider`/`textService`/`commandExecutor` fields and the three now-unreachable `start()` guards removed per Amendment A1(iii); `stop()` single `Date.now()` call; three `console.error` calls routed through `systemEventSource`; two string-literal trait-access sites unified to `TraitType.ACTOR`; `emitPlatformEvent`'s id generation modernized (conditional on gate-capture impact); an unused import removed; stale refactoring-history comments stripped), all gate byte-identical or (e) explicitly deferred with a reason.
- **Tier**: Medium (250 tool-call budget)
- **Entry state**: Phase 4 done — met. Marked CURRENT (since 2026-09-09) in the plan by this write.

## Open Items
- None opened, amended, or resolved this session. `devarch items list --json` returned twelve open items across nine prior sessions; none concern the residue plan, `setStory`/`installStory`, the install-steps pipeline, or this phase's guard — checked and confirmed no overlap, so nothing was carried forward. (One item, `I-7f0471-1`, tracks the now-archived `refactoring-survey` plan's remaining phases — a different plan from this one — and was left untouched as out of this session's scope.)

## Files Modified
- `packages/engine/src/install/` (22 files, new; two are `git mv` of the validators), `packages/engine/src/game-engine.ts`, `packages/engine/src/index.ts`
- `packages/engine/tests/unit/story-install-order.test.ts` (new, 12 tests), `tests/integration.test.ts`, the two validator tests re-pointed
- 68 files renamed `setStory` → `installStory` across packages/, stories/ (bootstrap, bridge, runtime, story-loader src + tests, platform-browser tests, helpers fixture, engine tests/examples/READMEs, story browser entries and comments)
- `docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md` (AC-5, A1(iv) amended), `docs/work/game-engine-residue/plan.md` (Phase 4 DONE with full progress note; Phase 5 advanced to CURRENT by this write)
- `packages/sharpee/docs/genai-api/{engine,index,stdlib}.md` regenerated; `stories/dungeo/src/version.ts` build stamp

## Notes
- Session started: 2026-09-09 05:47 CDT (session-state `startedLocal`); Phase 4 ran 05:55-06:10 CDT per the plan's Status line.
- This session's hook-tracked `files` array in `.session-state-9277dc.json` lists only 3 paths (`game-engine.ts` and the two validator files) — narrower than the actual scope, because most of Phase 4's file moves were `git mv`/renames and a scripted 68-file rename rather than individual Edit/Write calls the file-tracking hook observes. The Files Modified list above is drawn from the plan's own progress note and this session's direct account, not solely from that array.
- **Evidence accounting**: the devarch event log for this session (`docs/context/.devarch-events-9277dc.jsonl`) directly captured a build pass at `2026-09-09T11:02:09Z` (`pnpm --filter '@sharpee/engine' test tests/unit`), the `mutation-verification` agent's completion at `11:03:42Z`, a build pass across story-loader/platform-browser/helpers/bootstrap at `11:05:53Z`, and the final gap-closing test count at `11:08:11Z` ("75 passed 741 passed") — all after the last edit to the files they cover. The per-step gate tables (IDENTICAL ×4 on the Dungeo chain and three Chord trees) were not separately captured by the hook; they are quoted above from `docs/work/game-engine-residue/plan.md`'s own Phase 4 progress note, which records command, result, and timestamp inline for each gated step, in the style used by prior sessions on this plan.
- Rule 13a's Integration Reality Statement does not apply here: the phase name and goals match the keyword "engine" only via the package/plan name (`packages/engine`, `game-engine-residue`), and this is a refactor session — no owned dependency (subprocess, runtime spawn, migration) is being integrated. The exemption for refactor sessions applies.
- Nothing committed yet as of this write; finalize (commit + push) runs immediately after this summary.

---

## Session Metadata

- **Session**: 9277dc
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (this session's scope — Phase 4 — fully closed; Phases 5-8 remain on the plan, ~3-4 more sessions at Medium/Small tiers, Phase 6 discuss-first)
- **Rollback Safety**: safe to revert — nothing committed yet as of this write; all changes are uncommitted working-tree edits on `refactor/survey-adr-334-340` (unmerged, survey's own branch)

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 4's entry state (Phase 3 done) — confirmed present at phase start. Gate scripts and baseline/phase16/residue captures carried across from session bc5973's scratchpad, as in prior sessions on this plan.
- **Prerequisites discovered**: none newly discovered. Phase 4 opened with two decisions already flagged in the plan (the conditional `installStory` rename, A1(iv); the two mid-sequence engine-state reads) — both resolved by David/the session at phase start, not new prerequisites surfacing mid-work.

## Architectural Decisions
- ADR-334 amended this session: AC-5 gains a recorded exception — "one rename — `setStory` is `installStory`; the member count is unchanged and every call site renamed in the same commit" — and A1(iv) is marked taken (2026-09-09).
- Pattern applied: the `TURN_STAGES`/`RUNTIME_BIND_STEPS`(ADR-335)/`ANALYSIS_PASSES`(ADR-336) idiom — an ordered data list of named step modules, each with a rule-9 header carrying its ordering rationale, plus an order test that fails by name on a misordered dependency. `STORY_INSTALL_STEPS` follows it exactly.
- Design constraint from `ddd-assessment-2.md` applied: install steps contribute to a load result the engine adopts at the end rather than writing `this.*` directly — the two mid-sequence engine-state reads were resolved to fit this (pure function; adopt-then-call), rather than carved out as exceptions.

## Mutation Audit
- Files with state-changing logic modified: the 18 `install/*.ts` step modules, `install/runner.ts` (the guard and adoption logic), `install/context.ts`.
- Tests verify actual state mutations (not just events): **YES** (evidence: `mutation-verification` agent run at phase close, completed `2026-09-09T11:03:42Z` per the devarch event log, reported 6 mutations clean and 3 gaps; the 3 gaps were closed with tests asserting on `engine.on('event')` payloads, `vocabularyRegistry.hasWord`/`lookup` state, and `getNarrativeSettings()`/`getContext().implicitActions` state — not on return values or mocks. Final engine suite 75 files / 741 passed / 7 skipped, corroborated by the event log at `2026-09-09T11:08:11Z`, timestamped after the last edit to the covered files.)
- If NO: N/A.

## Recurrence Check
- Similar to past issue? **NO** — this is the residue plan's planned Phase 4, not a recurrence of a prior blocker. No blockers were hit this session.

## Test Coverage Delta
- Tests added: 12 (`packages/engine/tests/unit/story-install-order.test.ts` — 9 at the install-steps step, 3 more closing mutation-verification gaps), plus `tests/integration.test.ts`'s "should recover from action errors" reshaped to boot its own engine (not a net-new test).
- Tests passing before: 74 files / 729 passed / 7 skipped (Phase 3 close, prior session bc5973) → after: 75 files / 741 passed / 7 skipped (Phase 4 close, 06:08 CDT). Evidence: quoted from `docs/work/game-engine-residue/plan.md`'s Phase 4 progress note (command, count, and timestamp recorded inline at each gated step), corroborated by the devarch event log's `2026-09-09T11:08:11Z` "Tests passed" row ("75 passed 741 passed").
- Gate byte-identical throughout: the install-steps gate (06:03 CDT) and the install-story-rename gate (06:05 CDT) both report IDENTICAL ×4 (Dungeo transcript chain, Dungeo unit-transcript run, three Chord trees) per the plan's progress note.
- Known untested areas: Phase 5's seven cleanup items are PENDING/not yet CURRENT-worked; Phase 6 (parser-adapter normalization) remains explicitly discuss-first and untouched.

---

**Progressive update**: Session completed 2026-09-09 06:10 CDT
