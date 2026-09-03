# Session Summary: 2026-09-02 - feat/adr-321-world-index

## Goals
- Close Phase 2 of `docs/work/adr-320-d10-interruption/plan.md`: bless the Dungeo `wt-01` golden and regenerate `ides-of-march` per David's rulings.
- Fix the ADR-332 band-reorder regression in arrival-narrated every-turn clauses (GH #353), then carry the plan through Phase 3's real-path acceptance test and the W-10 re-transcription.

## Phase Context
- **Plan**: `docs/work/adr-320-d10-interruption/plan.md` — build the interruption facet of ADR-320 D10 in `packages/character`/`packages/story-loader` so an NPC's `opens when` thread can take the floor from the player's current scene.
- **Phases executed**: Phase 2 — "Turn-phase bands — ADR-332" (Small); Phase 2b — "Fix GH #353 — arrival-narrated every-turn clauses fire on the arrival tick" (Medium); Phase 3 — "Real-path acceptance — story-loader test, W-10 prototype re-transcribed, baselines checked" (Medium).
- **Tool calls used**: 311 (session-state counter, anchored to Phase 2's Small/120 budget at session start — stale once the session moved into Phase 2b/3's Medium/200 budgets; the plan's own Status lines are the authoritative record of what each phase covered, per the finalize instruction that the state file's phase fields are stale).
- **Phase outcome**: All three phases completed and marked DONE on the plan, each with evidence stamped inline.

## Completed

### Phase 2 — Turn-phase bands close-out (ADR-332)
- Blessed `wt-01` alone (`--test --bless`), then the full chain (`--test --chain --bless`): 952 passed in 17 transcripts. `git diff` touched only `wt-01` (8 lines) and `wt-07` (4 lines); a scratchpad multiset script classified both as PURE-REORDER (same lines, different order) — David's ruling covered this class.
- Regenerated `ides-of-march` via `scripts/make-story-artifacts.mjs`; the script emits an empty opening card and the tree walker never writes it (`packages/branch-tester/src/tree-walker.ts:37`), so the IDE-recorded opening claims (commit 3d3c9d82) would have been dropped — restored the committed tree and applied only the two card hunks the regeneration produced. Replay: 39 cards / 49 assertions (was 39/48).
- Found a third ADR-332 D4 instance in the regenerated walkthrough: Kemp's storm-off (`ides-of-march.story:208`) now fires a turn later, after the player has left the Yard — the tree never asserted on that paragraph, so the gate hadn't caught it. Reported to David as its own content decision; not blocking.
- Plan Phase 2 → DONE. ADR-332 Status line carries Acceptance 3–5 evidence.

### Phase 2b — GH #353 fix (David: "Go ahead", then "Go")
- David asked to "fix the story" for the third D4 instance; investigation found the story rule is the platform's documented arrival-narrated contract (`tick-phases.ts:145-160`, `loader.ts:40-52`), which ADR-332's reorder broke — every story-side rewrite tried (moving Kemp, gating on the player's presence, dropping the `knows` gate) broke other content. No story-side fix exists; filed GH #353 instead.
- `session-planner` added Phase 2b to the existing plan; its event-chain mechanism was corrected after reading `game-engine.ts:2306-2350` — plugin events never reach the event processor, so a `world.chainEvent` handler would never see them. The fix rides a load-bound hook on the registry instead (the same shape as `setOracle`/`setWitnessedAliases`).
- Built: `ArrivedFact`/`ArrivalReaction` types and `CharacterPhaseRegistry.setArrivalReaction`/`getArrivalReaction`; `recordTransfer` queues arrivals; `runtime.runEntityTurnClause` shared by the daemon and `fireArrivalReaction`; `knownTopicsIn` shared walk; loader binds the hook.
- Gate caught a second, pre-existing defect: `sourced` was placing every-turn narration at the owner's *destination* (after the body's `move`), tagging the line absent on the very turn it should fire — fixed by snapshotting `placeOf` before the body runs.
- First regeneration showed Burbage following Kemp mid-tick (the goals sub-step saw Kemp already gone). David: "Fix it" — reactions now run as the tick's LAST sub-step (`runArrivalReactions`, surface `arrivals`), matching the order the old scheduler gave these clauses. Final regeneration: walkthrough differs from HEAD only by the already-ruled card-31 change.
- `mutation-verification` ran GREEN (one gap — the no-reaction-bound case — closed by an added test). ADR-332 D4a written. Tests: character +4 (`arrival-narration.test.ts`), story-loader +2 (`adr-332-arrival-reaction.test.ts`, real path via `GameEngine.executeTurn`).
- Plan Phase 2b → DONE.

### Phase 3 — Real-path acceptance (David: "Phase 3")
- `session-checkpoint` ran at the four-hour mark: on track, no drift, no orphaned artifacts.
- New `packages/story-loader/tests/adr-320-d10-interruption.test.ts` (3, real path, two-hand fixture, no stubs): interruption on the hand-off turn, `on parting` rendered, resume at the parked cursor.
- W-10 prototype re-transcribed from a real `./sharpee play` run via a scratchpad driver script (14 turns; 15 cards / 46 assertions — the lagged engine had needed 28 turns to reach the same point).
- Two deliverable clauses did not hold, recorded rather than forced: the `beat, when <partner> is dancing:` hold gates were KEPT — removing them exposed step 4a's entity-id candidate ordering serving one more floor turn before the challenge parks the outgoing partner (filed GH #354); partner `waiting`/`dancing` state pins are not expressible in the tree grammar's `entity.property` head (filed GH #355) — `story.state` pinned instead.
- README updated. Plan Phase 3 → DONE.

## Key Decisions

### 1. Bless the class, not the diff
David's "bless the dungeo golden and regenerate ides-of-march" was read as authorizing the whole class of pure line-reorder swaps under ADR-332 D4, not just the one diff already seen — both `wt-01`'s second swap and `wt-07`'s swap (surfaced only once the chain ran past the first fix) were blessed under it. Anything other than a reorder would have been reverted and reported instead.

### 2. "Fix the story" converted to a platform issue
David's request to fix the story-side symptom was not carried out as asked once every rewrite tried broke other content (Kemp's `norwich` knowledge, the doubled "mentions something" line, the recipe spine). The underlying cause is a platform contract ADR-332 broke, not a story defect — filed GH #353 and proposed a platform fix instead, which David then approved ("Go ahead", "Go").

### 3. Arrival reactions run as the tick's last sub-step
The first regeneration under the GH #353 fix caused a new visible defect (Burbage following Kemp mid-tick, before the goals sub-step). Rather than accept it as a side effect of "fixed", David said "Fix it" — reactions were moved to fire after scenes, as the tick's last sub-step, restoring the pre-ADR-332 visibility order for goal/scene logic.

### 4. W-10 hold gates kept, not removed
Phase 3's deliverable called for removing the prototype's hold gates now that the interruption exists. Removing them surfaced a real ordering gap (GH #354) rather than working correctly, so the gates stay and the gap is filed for David's ruling instead of being silently patched around.

## Next Phase
- **Phase 4**: "Close-out" — update the `docs/work/secret-letter-port/watch-list.md` W-10 entry with the resolution; close GH #348 with evidence inline (test names, prototype diff, baseline check results); finalize ADR-320's Status line/D10a note; write the session summary (this file).
- **Tier**: Small (60 tool-call budget).
- **Entry state**: Phase 3 green (met). Phase 4 stays PENDING on the plan until David says to start it (rule 5).
- Phase 4's exit state also calls for the `.current-plan` disposition: per the stamp already on `docs/work/secret-letter-port/plan.md`, the pointer returns there (Phases 4 and 6 still CURRENT) once this plan closes out — not done in this session.

## Open Items

### Short Term
- David's ruling needed on GH #354 (step 4a candidate order — whether a seated owner should get one more floor turn before an interruption challenge parks them) and GH #355 (partner state pins not expressible in the tree grammar's `entity.property` head).
- GH #353 (arrival-narration timing) is fixed but not yet closed — close at commit/Phase 4 with the evidence inline.
- GH #348 (the original interruption gap this plan builds against) stays open until Phase 4 closes it with evidence.
- Nothing committed yet — `commit-remote` follows this finalize.

### Long Term
- ADR-331 (Chord rotation syntax) remains DRAFT, deliberately unbuilt — independent of this facet.
- GH #347 (D10's shared-floor/open-address family beyond interruption), #349, #350, #351, #352 — each its own small fix, filed and untouched by this plan.
- The two-facts-one-line propagation duplicate noted in Phase 2b's residual walkthrough diff (`propagation-evaluator.ts:270-288`) is pre-existing and newly visible, not something this session touched.

## Files Modified

**Platform source** (4 files):
- `packages/character/src/tick-phases.ts` — `ArrivedFact`/`ArrivalReaction` types, `CharacterPhaseRegistry.setArrivalReaction`/`getArrivalReaction`, `recordTransfer` arrival dispatch, `runArrivalReactions` as the tick's last sub-step
- `packages/character/src/index.ts` — new exports
- `packages/story-loader/src/runtime.ts` — `knownTopicsIn`, `runEntityTurnClause`, `fireArrivalReaction`, `placeOf`-before-body fix for `sourced`
- `packages/story-loader/src/loader.ts` — `arrivalNarratedTopicsOf` via `knownTopicsIn`, binds the arrival-reaction hook beside `setOracle`

**Tests** (3 files):
- `packages/character/tests/tick-phases/arrival-narration.test.ts` — +4
- `packages/story-loader/tests/adr-332-arrival-reaction.test.ts` — new, 2, real path
- `packages/story-loader/tests/adr-320-d10-interruption.test.ts` — new, 3, real path

**Story artifacts** (6 files):
- `stories/dungeo/walkthroughs/wt-01-get-torch-early.golden`, `wt-07-exorcism.golden` — blessed (pure reorders per ADR-332 D4)
- `branch-stories/ides-of-march/ides-of-march.tests.json`, `WALKTHROUGH.txt` — regenerated (two card hunks applied by hand, opening claims preserved)
- `branch-stories/secret-letter/prototypes/w10-dance/w10-dance.tests.json`, `README.md` — re-transcribed from a real `./sharpee play` run

**Documentation** (2 files):
- `docs/architecture/adrs/adr-332-story-reactions-before-the-actor-phase.md` — D4a amendment (propagation-arrival inline reaction path), Status/Session lines
- `docs/work/adr-320-d10-interruption/plan.md` — Phases 2, 2b, 3 → DONE with evidence inline; Phase 4 → CURRENT

**Build-generated, not authored** (3 files):
- `stories/dungeo/src/version.ts`, `packages/sharpee/docs/genai-api/character.md`, `packages/sharpee/docs/genai-api/index.md` — build stamp / auto-generated API reference, touched by `./repokit build dungeo`

## Notes

**Session duration**: ~4.5 hours (18:31–22:55 CDT, 2026-09-02).

**Approach**: Sequential phase execution under one plan, each phase gated on David's explicit go-ahead; every gate diff traced to a specific cause (reorder class, contract regression, mid-tick visibility order) and reported rather than silently blessed or patched around; two genuine platform gaps found during Phase 3 filed as issues instead of forced to pass.

---

## Session Metadata

- **Session**: 69a114
- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A — Phase 4 (Small, 60 budget) is the plan's last remaining phase
- **Rollback Safety**: safe to revert (nothing committed yet this session)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2 required Phase 1 DONE and green (prior session 6a3da1) — met. Phase 2b required Phase 2 DONE, GH #353 filed and read, and David's "Go ahead" — met. Phase 3 required Phase 1 (and Phase 2) green — met.
- **Prerequisites discovered**: None — no new prerequisite surfaced beyond what the plan already named.

## Architectural Decisions

- ADR-332 D4a (this session): propagation arrival is a second inline reaction path alongside D4's `after <npc> <gerund>`, which doesn't cover a tick sub-step — the arrival-narrated contract is restored by firing the gated clause on the transfer's own tick via a load-bound registry hook.
- Pattern applied: load-bound hook on `CharacterPhaseRegistry` (the same shape as `setOracle`/`setWitnessedAliases`) rather than an event-chain mechanism — keeps ADR-310 D17's "no mutable runtime state on the registry" intact.
- ADR-332's band-reorder (Acceptance 3–5) confirmed via the Dungeo golden chain and four Chord corpus trees (fernhill, ides-of-march, secret-letter, thealderman); `cloak` and `zoo` carry no `.tests.json` and were removed from the corpus list as a plan correction.

## Mutation Audit

- Files with state-changing logic modified: `packages/character/src/tick-phases.ts` (`recordTransfer`, `runArrivalReactions`), `packages/story-loader/src/runtime.ts` (`fireArrivalReaction`, `runEntityTurnClause`, `sourced`'s place snapshot), `packages/story-loader/src/loader.ts` (hook binding).
- Tests verify actual state mutations (not just events): YES (evidence: `mutation-verification` agent completed 2026-09-03T02:34:26Z per the session event log, GREEN — real path confirmed, refactor byte-equivalent, its one gap [no-reaction-bound case] closed by an added assertion; story-loader's real-path tests assert on persisted location/mood/once-key state and thread status per the plan's Phase 2b/3 Status lines, not on events alone).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — turn-order-sensitive regressions surfacing after ADR-332's band reorder recurred three times within this plan alone: the Dungeo `wt-01`/`wt-07` golden reorders (Phase 2), `ides-of-march` card 31 (Phase 2, D10a working as designed) and Kemp's storm-off (Phase 2, found in the regenerated walkthrough), and GH #353's arrival-narration contract break (Phase 2b). All three trace to the same root cause (the scheduler now running before the actor phase) rather than three independent bugs.
- Consider a one-time audit of remaining every-turn/`on every turn while <npc> knows <topic>` clauses across the Chord corpus for the same class of tick-order sensitivity, now that GH #353's fix pattern (load-bound arrival hook) exists as a template — not done this session; flagging for the next session or David's call.

## Test Coverage Delta

- Tests added: 9 (character +4 `arrival-narration.test.ts`; story-loader +2 `adr-332-arrival-reaction.test.ts` real path; story-loader +3 `adr-320-d10-interruption.test.ts` real path).
- Tests passing before: story-loader 1017 (Phase 2 evidence, 18:40 CDT) → after: 1022 (Phase 3 evidence, 22:49 CDT); character 593 (Phase 1 evidence, prior session) → 597 (Phase 2b evidence, 21:41 CDT). engine 680 passing + 7 pre-existing skips and stdlib 1663 passing + 27 pre-existing skips held unchanged across all three phases (re-run green each time; no source in either package touched this session).
- Known untested areas: GH #354 (step 4a candidate order) and GH #355 (partner state pins in the tree grammar) are filed platform gaps with no test coverage yet, pending David's ruling on each.

---

**Progressive update**: Session completed 2026-09-02 22:55 CDT
