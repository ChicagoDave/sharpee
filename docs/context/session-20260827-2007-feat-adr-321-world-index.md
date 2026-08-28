# Session Summary: 2026-08-27 - feat/adr-321-world-index

## Goals
- Finalize the prior session's outstanding commit.
- Write the session plan for ADR-328 ("Actors are a platform concept").
- Review the plan against recorded decisions and fold every finding.

## Phase Context
- **Plan**: `docs/work/adr-328-actors-platform-concept/plan.md` — "Land ADR-328's umbrella program" (one `(action, actorId)` execution path, perception tagging, actor voice as a rendering property, NpcService's decision/execution split, Dungeo's five-NPC rewrite, the Chord acting-surface child ADR).
- **Phase executed**: Phase 0 — "Paper trail — ADR-070/120 amendment stamps" (Small) is queued to run first; Phase 1 — "D4 — Actor voice as a per-actor rendering property" (Medium) is stamped `CURRENT (since 2026-08-27)`. No implementation phase was executed this session — the session's own work was planning and review, not a plan phase.
- **Tool calls used**: not tracked — the session-state file was retired mid-session by the earlier `commit-remote` run; no other budget-tracking artifact exists for this session.
- **Phase outcome**: N/A — no phase was executed. The plan itself was authored and twice reviewed.

## Completed

### Finalize of the prior session's pending change
- Committed and pushed `c740a5e7`: rule 18b archival of `docs/work/zoo-chain/plan.md` to `docs/work/archive/zoo-chain/plan.md` (the only working-tree change at session start). `commit-remote`'s `turbo run test:ci` ran green (1 suite, EXIT 0) before the push.

### ADR-328 plan authored
- `session-planner` wrote `docs/work/adr-328-actors-platform-concept/plan.md`, 12 phases (0, 1, 2a, 2b, 3, 4, 5, 6a, 6b, 6c, 8, 9), ~529 lines. `docs/context/.current-plan` repointed to it from `docs/work/chord-reference-adr-327/plan.md` (that plan is terminal DONE, so rule 18b did not fire — it is not yet archived; see Open Items).
- Scope-correcting finding recorded directly in the plan: ADR-089's placeholder/conjugation mechanism already ships and is used by 49 of 51 `packages/lang-en-us/src/actions/*.ts` files, so D4's real gap is narrower than ADR-328's own framing — per-actor resolution and non-player name substitution, not a template sweep.

### Two review passes, folded
- `plan-review` run 1 found 3 CONTRADICTIONs (watch-mode `test` used as a phase gate in Phases 1/3; three phases lacking real-path acceptance; ADR-070/120 amendment stamps deferred to program end though ADR-328 says "at acceptance"), 3 STALE ADRs, 1 TENSION, and a wrong "next ADR number" claim in the ADR-authoring phase (plan said 336+; actual highest is 328, 332 files exist). David directed: fix the two cheap ones and pull the ADR-070/120 stamp phase forward to Phase 0.
- Two false/overreaching claims were investigated and corrected in-session rather than left in the plan: ADR-120 was verified fully shipped (`packages/plugins/{turn-plugin,plugin-registry,turn-plugin-context}.ts`, wired into `game-engine.ts`) — only its Status line is stale, not an open decision, so the "litigate ADR-120" framing was dropped; and the plan's claim that `plugin-npc` could be "deleted outright (nothing else references it)" was verified FALSE — live consumers are `story-loader/src/loader.ts` (auto-wire, tested at `npc-behaviors.test.ts:68`), `packages/sharpee/src/{index.ts:110, runtime-surface.ts:119}` (ADR-178 baseline, `:148`), `stories/dungeo/src/orchestration/index.ts`, `stories/family-zoo-tutorial/src/index.ts:70,:353`, `packages/devkit/fixtures/basic-story`, and six story-loader test suites; `NpcPlugin.onAfterAction` is the sole caller of `npcService.tick()` and `onPlayerEnters/Leaves`.
- A full review of ADR-325–328 plus the plan (David's request) surfaced further findings, all verified against source and folded: Phase 1 originally cited Chord `move` as a real-path source, but `move`/`witnessMove`/`channelEvent` (`runtime.ts:4071/4090/4327`) only emits author-phrase channel events, never `actor_moved` — Phase 1's real-path test was rebuilt on a real `if.event.taken` event instead; D3 has three drop sites, not one — the previously unnamed third is the engine's `processPluginEvents` (`game-engine.ts:2238`) calling `perceptionService.filterEvents`, which gates all 39 `npc.*` messages; `hasTraversableExit` is also used at `story-loader/src/runtime.ts:1337,:2373`, so Phase 5 must not delete the helper; book chapter 20 (`docs/book/v2.0.0/parts/part-6/20-non-player-characters.md` plus 7 snippets, 48 references) plus the zoo tutorial and devkit fixture sit on the same surface Phase 5 deletes but were outside D6's original Dungeo-only scope; ADR-328 was silent on where the NPC tick lives; `lang-en-us/src/npc/`'s 39 `npc.*` messages are exactly the "interim dialect" D4 says must not be built, and it already exists; the residual literal-second-person count was corrected from 2 files to 21 lines/9 files, of which ~11 are quoted NPC speech or meta text that should stay second person — the phase's exit metric was rewritten to "actor-voice sites," not "0 literal You"; and the original Phase 2b design would have violated ADR-213 §Witnessed (`:37-39`, "consume nothing"), ADR-325 D2 and its Non-goals (`:556`), and ADR-069's `filterEvents`.
- David ruled two open questions directly: the engine owns the per-turn actor tick (no prior ADR/session record found for this; `CLAUDE.md:77`'s Logic Location table already assigns "NPC turn phase" to the engine, while `docs/core-concepts/README.md:48` says the opposite and is corrected as part of Phase 5); and the book chapter 20 rewrite is in-program, not deferred — it became Phase 6c (Medium, 250).
- Phase 0 of the ADR-328 plan: ADR-070/120 supersession stamps appended; ADR-328 Acceptance item 4 satisfied (committed in this commit)
- `plan-review` run 2 found only STALE ADRs, all against ADR-328 itself (D3/D4/D5 lacked the amendments the plan's findings implied). David approved three amendments, written into `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md`:
  - **D3**: names all three drop sites (loader daemon presence gate `runtime.ts:3318-3438`, `witnessMove` `runtime.ts:4090`, engine `processPluginEvents` `game-engine.ts:2238`) and stamps ADR-213 §Witnessed, ADR-325 D2, ADR-069, ADR-070 §Visibility at the landing.
  - **D4**: records ADR-089 prior art (49/51 action files already use the placeholder mechanism) and that `lang-en-us/src/npc/`'s `npc.*` messages are the forbidden interim dialect, retiring with NpcService's dissolution.
  - **D5**: the engine owns the per-turn actor tick per `CLAUDE.md:77`; `plugin-npc` dissolves outright; what `NpcPlugin.onAfterAction` drove (`npcService.tick`, `onPlayerEnters`/`onPlayerLeaves`, ADR-310 `actionEvents`, ADR-320 `emitSound` feeds, behavior-state save/restore) becomes an engine-owned actor turn phase, and ADR-120's plugin priority ordering becomes engine sequencing.

## Key Decisions

### 1. Phase 0 (ADR-070/120 amendment stamps) pulled ahead of Phase 1
ADR-328 has been ACCEPTED since 2026-08-25 and its own §Consequences describes these stamps as landing "at acceptance," so leaving them for program-end left the record wrong for the whole program; David ruled to do the paper trail first since it has no code dependency (`plan-review` run 1, CONTRADICTION 3).

### 2. Engine owns the per-turn actor tick — ADR-328 D5 amended
David's recollection of a prior decision could not be found in any ADR or session record; `CLAUDE.md:77`'s Logic Location table already places "NPC turn phase" under the engine, and `docs/core-concepts/README.md:48` (which says the opposite) is the document being corrected, not the source of truth. See `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` D5.

### 3. Book chapter 20 + zoo tutorial + devkit fixture pulled in-program as Phase 6c
These sit on the exact `plugin-npc`/shadow-NPC surface D5/D6 delete; leaving them out would break the book and tutorial silently. New Phase 6c (Medium, 250) — its real-path note corrected mid-session: the book has no checkpoint harness, only `scripts/extract-book-snippets.cjs` for verbatim extraction, so assembly stays by hand.

### 4. Three ADR-328 amendments (D3/D4/D5) — see `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md`
Full diffs quoted in Completed above; each closes a gap `plan-review` run 2 found between the plan's verified findings and what the ADR itself recorded.

## Next Phase
- **Phase 0**: "Paper trail — ADR-070/120 amendment stamps" (Small, budget 100) — no code dependency; PENDING, runs first per the plan's own note even though Phase 1 carries the `CURRENT` stamp.
- **Phase 1**: "D4 — Actor voice as a per-actor rendering property" (Medium, budget 250) — `CURRENT (since 2026-08-27)`.
- **Tier**: both are pre-implementation for `packages/lang-en-us` and `packages/engine`; CLAUDE.md's platform-change discussion-first rule applies before either phase edits `packages/`.
- **Entry state**: Phase 0 needs nothing further — it is a two-file ADR hand-edit. Phase 1 needs the call-site threading design presented to David before any `lang-en-us`/`engine` edit begins.

## Open Items

### Short Term
- `docs/work/chord-reference-adr-327/` is terminal (DONE) but was never archived when `.current-plan` was repointed away from it this session — rule 18b's archival step did not fire because that rule only triggers on a *non-terminal* outgoing plan; this is a gap in that plan's own lifecycle, not a rule violation, and should be archived by hand.
- Phase 0 and Phase 1 both require the discussion-first presentation to David before any `packages/` edit, per CLAUDE.md.

### Long Term
- Phase 5's budget (NpcService decision/execution split, `plugin-npc` dissolution) is likely under its stated budget given the scope now confirmed (six call sites plus book/tutorial/fixture fallout moved to 6c).
- A `website/` install mismatch was carried forward from a prior session and remains unaddressed.
- Seven stranded DevArch event logs were noted by the pre-session audit; per standing user feedback these are ignorable and not something to proactively prune.

## Files Modified

**ADR amendment** (1 file):
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` — D3/D4/D5 amended with drop-site enumeration, ADR-089 prior-art note, and the engine-owns-the-tick ruling.

**Plan pointer** (1 file):
- `docs/context/.current-plan` — repointed from `docs/work/chord-reference-adr-327/plan.md` to `docs/work/adr-328-actors-platform-concept/plan.md`.

**New plan** (1 file, untracked):
- `docs/work/adr-328-actors-platform-concept/plan.md` — 12-phase session plan for the ADR-328 program, ~529 lines.

**Committed earlier this session** (`c740a5e7`, 1 file):
- `docs/work/zoo-chain/plan.md` → `docs/work/archive/zoo-chain/plan.md` — rule 18b archival, prior session's leftover working-tree change.

## Notes

**Session duration**: ~2 hours (20:07-22:09 CDT).

**Approach**: Finalize-then-plan-then-review-then-fold, iterated twice against `plan-review`; every finding was independently verified against source (file:line citations) rather than taken from the ADR's or plan's own framing before being folded in.

**Gap**: no `.session-state-{id}.json` file exists for this session (retired by the earlier `commit-remote` run), so tool-call count and hook-tracked file list are unavailable; the Files Modified list above was reconstructed from `git status`/`git diff` at write time.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — planning/review complete; Phase 0/1 are next-session work, not a continuation of an interrupted phase.
- **Rollback Safety**: safe to revert — no source code changed; only the ADR, the plan pointer, and the new plan file are uncommitted.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-328 (ACCEPTED, 2026-08-25) existed as the subject of the plan; ADR-089's placeholder/conjugation mechanism (ACCEPTED, Phases A-D shipped 2026-01-05/16) was available and verified as prior art for D4.
- **Prerequisites discovered**: ADR-070/120 amendment stamps required by ADR-328's own Acceptance item 4 did not exist before this session (now Phase 0's deliverable); ADR-328 D3/D4/D5 lacked the drop-site/prior-art/tick-ownership detail this session's review surfaced and folded in as amendments.

## Architectural Decisions

- ADR-328 D3 amended: three drop sites (loader daemon gate, `witnessMove`, engine `processPluginEvents`) named, not one — rationale: `plan-review` verification found the engine's own filter dropping all 39 `npc.*` messages, previously unnamed in the ADR.
- ADR-328 D4 amended: ADR-089 prior art documented; `lang-en-us/src/npc/` flagged as the forbidden interim dialect already built — rationale: narrows D4's real remaining scope and names the surface that retires with it.
- ADR-328 D5 amended: engine owns the per-turn actor tick, `plugin-npc` dissolves outright — rationale: David's ruling, grounded in `CLAUDE.md:77`'s existing Logic Location assignment (no separate ADR/session record of a prior decision was found).
- Pattern applied: ADR-266 umbrella-plan pattern (one program plan carries per-phase real-path acceptance instead of a child ADR per phase, except D7 which gets its own child ADR at Phase 8).

## Mutation Audit

- Files with state-changing logic modified: none — this session touched only an ADR, a plan file, and a plan pointer.
- Tests verify actual state mutations (not just events): N/A — no source code changed this session.
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — no prior session recorded a plan requiring two full review-and-fold cycles before acceptance; this is the normal `plan-review` workflow operating as designed, not a recurring defect.

## Test Coverage Delta

- Tests added: 0
- Tests passing before: N/A → after: N/A (evidence: `commit-remote`'s `turbo run test:ci` ran once at session start for the `c740a5e7` commit — 1 suite, EXIT 0 — but that run predates and is unrelated to this session's planning/review work, which changed no source)
- Known untested areas: N/A — no test changes this session.

---

**Progressive update**: Session completed 2026-08-27 22:09
