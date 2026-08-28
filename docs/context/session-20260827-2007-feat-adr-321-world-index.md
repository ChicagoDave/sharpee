# Session Summary: 2026-08-27 - feat/adr-321-world-index

(Session continued past midnight into 2026-08-28 CDT; same session, not re-filed per naming convention.)

## Goals
- Finalize the prior session's outstanding commit.
- Write the session plan for ADR-328 ("Actors are a platform concept").
- Review the plan against recorded decisions and fold every finding.
- Execute Phase 0 (ADR-070/120 amendment stamps) and Phase 1 (D4 — actor voice as a per-actor rendering property).

## Phase Context
- **Plan**: `docs/work/adr-328-actors-platform-concept/plan.md` — "Land ADR-328's umbrella program" (one `(action, actorId)` execution path, perception tagging, actor voice as a rendering property, NpcService's decision/execution split, Dungeo's five-NPC rewrite, the Chord acting-surface child ADR).
- **Phase executed**: Phase 0 — "Paper trail — ADR-070/120 amendment stamps" (Small) — DONE 2026-08-27 (commit `a8093cff`). Phase 1 — "D4 — Actor voice as a per-actor rendering property" (Medium) — DONE 2026-08-28, uncommitted at time of writing. Phase 2a — "D3 — Perception tagging, emit-time half" (Medium) is now stamped `CURRENT (since 2026-08-28)`.
- **Tool calls used**: not tracked — no `.session-state-{id}.json` exists for this session (retired mid-session by an earlier `commit-remote` run; the brief that resumed this session after the mid-session date rollover confirmed the same gap).
- **Phase outcome**: Phase 0 completed on budget (Small, two-file hand-edit). Phase 1 completed on budget (Medium) — landed with one simplification versus the design presented to David (no Assembler player-pronoun rule needed; the existing per-subject verb agreement in `english-assembler.ts:213` already covered it).

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
- Phase 0 of the ADR-328 plan: ADR-070/120 supersession stamps appended; ADR-328 Acceptance item 4 satisfied (committed as `a8093cff`).
- `plan-review` run 2 found only STALE ADRs, all against ADR-328 itself (D3/D4/D5 lacked the amendments the plan's findings implied). David approved three amendments, written into `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` (committed as `ca865c80`):
  - **D3**: names all three drop sites (loader daemon presence gate `runtime.ts:3318-3438`, `witnessMove` `runtime.ts:4090`, engine `processPluginEvents` `game-engine.ts:2238`) and stamps ADR-213 §Witnessed, ADR-325 D2, ADR-069, ADR-070 §Visibility at the landing.
  - **D4**: records ADR-089 prior art (49/51 action files already use the placeholder mechanism) and that `lang-en-us/src/npc/`'s `npc.*` messages are the forbidden interim dialect, retiring with NpcService's dissolution.
  - **D5**: the engine owns the per-turn actor tick per `CLAUDE.md:77`; `plugin-npc` dissolves outright; what `NpcPlugin.onAfterAction` drove (`npcService.tick`, `onPlayerEnters`/`onPlayerLeaves`, ADR-310 `actionEvents`, ADR-320 `emitSound` feeds, behavior-state save/restore) becomes an engine-owned actor turn phase, and ADR-120's plugin priority ordering becomes engine sequencing.

### Phase 0 — ADR-070/120 amendment stamps (DONE, commit `a8093cff`)
- Both ADRs carry a new dated "Superseded in part by ADR-328" amendment section. ADR-070's stamp covers both halves (the execution table and §Visibility and Perception), which also satisfies Phase 2b's ADR-070 stamp item in advance. ADR-120's stamp retires the `plugin-npc` extraction and the NPC priority row; its stale `PROPOSED` Status line left untouched (not this plan's call). ADR-328 Acceptance item 4 marked satisfied in place.

### Phase 1 — D4: Actor voice as a per-actor rendering property (DONE 2026-08-28, uncommitted)
Design discussed with David first per CLAUDE.md's platform-change discussion-first rule; David: "Go." `{You}` becomes phrase sugar for the actor rather than a story-wide narrative setting. Verified before implementing: ADR-199 §4 B's Assembler already agrees verbs per subject (`nounPerson`, `english-assembler.ts:213`) — the actual defect was ADR-089 Phase D's string pre-pass resolving `{You}`/bare verbs against the provider-wide `NarrativeContext` before the parser ever saw the triggering event's actor.

Landed:
- `packages/if-domain/src/phrase.ts`: `export const ACTOR_PARAM_KEY = '__actor__'` (reserved like `__slots__`).
- `packages/lang-en-us/src/perspective/placeholder-resolver.ts`: new `expandActorPlaceholders(message, params, actorKey)` — `{You}`→`{capitalize the __actor__}`, `{you}`→`{the __actor__}`, `{Your}`/`{your}`/`{Yours}`/`{yours}`→ +`'s`, `{You're}`→ actor + `{verb:is __actor__}`, `{yourself}`→`{pronoun:reflexive}`, bare `{take}`→`{verb:takes __actor__}` (3sg lemma via new `THIRD_SINGULAR_CONTEXT`; irregulars pulled from the existing ADR-089 table); `isBareVerb` extracted as a helper. `resolvePerspectivePlaceholders` (the player-voice path) unchanged in behavior.
- `packages/lang-en-us/src/language-provider.ts`: `renderTemplate` now branches via `hasNonPlayerActor` — `__actor__` is a `NounPhrase` with `referableId` ≠ `ctx.narrative.playerId` → the new expansion path; otherwise the unchanged ADR-089 pre-pass runs (player output byte-identical; 3rd-person narration pronouns preserved as before).
- `packages/engine/src/prose-pipeline/phrase-render.ts`: `renderViaPhrase(..., actorId?)` binds `params[ACTOR_PARAM_KEY] = renderWorld.nounPhraseFor(actorId)` when the emitter hasn't already bound one (an emitter's own binding wins); `handlers/domain-message.ts` and `handlers/generic.ts` both pass `event.entities?.actor` through.
- Four templates converted from actor-voice literals to placeholders: `going.ts:24` (`too_dark`), `taking.ts:24` (`too_heavy`), `taking.ts:28` (`nothing_to_take`), `asking.ts:32` (`responds`). The remaining 420 `{You}` sites are untouched — they are sugar and already work.
- ADR-089 amended in place with a dated note: Part 3 STANDS (the plan had wrongly claimed it was superseded); Phase D's pre-pass is now the player-voice resolver specifically, not the resolver of record for every actor. The plan's Phase 1 exit-state text was corrected to match.
- Builds required before implementation continued: `pnpm --filter '@sharpee/if-domain' build`, `pnpm --filter '@sharpee/lang-en-us' build` (sibling packages resolve the new export via `dist`, not source). `tsc --noEmit -p packages/engine/tsconfig.json` clean after the engine-side changes.

Rule 12 Behavior Statements were produced in-conversation for `expandActorPlaceholders`, the `renderTemplate` branch, and `renderViaPhrase`'s binding before any test was written; all three suites were graded and none came back RED or YELLOW.

Tests:
- `packages/lang-en-us/tests/actor-voice.test.ts` — 14 tests: pure rewrite forms for every placeholder family; rendered output for unique/proper/plural actors ("The thief takes the lamp.", "Jack takes the lamp.", "The mercenaries take the lamp."); contraction/possessive/irregular-verb cases; player path byte-identical to pre-change output; a string or id-less actor falls back to the player path; a story configured for 3rd-person narration still renders "She takes" for the player while an NPC keeps its own name in the same turn; all four rewritten templates render both player-identical and third-person correctly. One test-harness defect found and fixed mid-session: `makeCtx` had to be extended to carry the message's own `params`, because the Assembler reads `ctx.params[subjectRef]` directly — the plural-actor case is what caught the gap.
- `packages/engine/tests/prose-pipeline/phrase-render.test.ts` — +3 mock-level tests: binds `__actor__` correctly; an emitter's own binding wins over the auto-bind; no-actorId / unknown-actor / no-bridge cases leave params untouched.
- `packages/engine/tests/prose-pipeline/actor-voice.test.ts` — 6 REAL-PATH tests (rule 13a): real `WorldModel`, real `EnglishLanguageProvider`, the shipped `if.action.closing.closed` template, real `ProsePipeline` (no formatter double, no handler stub) — "The thief closes the brass lamp." / "You close the brass lamp." / both rendered correctly in the same turn / `game.message` routed through the generic handler with a non-player actor ("The thief waves." vs "You wave.") / an actorless event falls back to player voice.
- `mutation-verification` ran on the changed files and reported 2 real gaps: the generic handler had no test with a non-player actor, and the three rewritten templates (`too_heavy`, `nothing_to_take`, `responds`) had no rendered-output assertions, only rewrite-form assertions. Both gaps closed by the tests listed above before the phase was called done.

Evidence (observed 2026-08-28, after the last edit to the covered files): `pnpm --filter '@sharpee/lang-en-us' run test:ci` — 26 files, 444 passing. `pnpm --filter '@sharpee/engine' run test:ci` — 64 files, 646 passing, 7 skipped (pre-existing, unrelated to this phase). `./repokit build dungeo` then `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` — 952 passing across 17 transcripts, every golden byte-identical, which is the required result before any non-player actor runs through the pipeline (that's Phase 6b's job, not this one's). Build side effects present in the working tree (not hand-edited): regenerated `packages/sharpee/docs/genai-api/{engine,if-domain,index,lang}.md` (picked up `ACTOR_PARAM_KEY`) and `stories/dungeo/src/version.ts` (`BUILD_DATE` bump from the `repokit build`).

## Key Decisions

### 1. Phase 0 (ADR-070/120 amendment stamps) pulled ahead of Phase 1
ADR-328 has been ACCEPTED since 2026-08-25 and its own §Consequences describes these stamps as landing "at acceptance," so leaving them for program-end left the record wrong for the whole program; David ruled to do the paper trail first since it has no code dependency (`plan-review` run 1, CONTRADICTION 3).

### 2. Engine owns the per-turn actor tick — ADR-328 D5 amended
David's recollection of a prior decision could not be found in any ADR or session record; `CLAUDE.md:77`'s Logic Location table already places "NPC turn phase" under the engine, and `docs/core-concepts/README.md:48` (which says the opposite) is the document being corrected, not the source of truth. See `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` D5.

### 3. Book chapter 20 + zoo tutorial + devkit fixture pulled in-program as Phase 6c
These sit on the exact `plugin-npc`/shadow-NPC surface D5/D6 delete; leaving them out would break the book and tutorial silently. New Phase 6c (Medium, 250) — its real-path note corrected mid-session: the book has no checkpoint harness, only `scripts/extract-book-snippets.cjs` for verbatim extraction, so assembly stays by hand.

### 4. Three ADR-328 amendments (D3/D4/D5) — see `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md`
Full diffs quoted in Completed above; each closes a gap `plan-review` run 2 found between the plan's verified findings and what the ADR itself recorded.

### 5. `{You}` is phrase sugar, not a story-wide setting — ADR-089 amended, Part 3 confirmed to stand
The plan's Phase 1 text originally claimed Part 3 (`NarrativeSettings`, immutable after game start) was superseded by D4. Implementation proved otherwise: Part 3 still governs the player's own narrative person exactly as written; what changes is that Phase D's pre-pass is no longer the resolver for every actor — it's now scoped to the player specifically, with `expandActorPlaceholders` handling everyone else via the phrase algebra. `docs/architecture/adrs/adr-089-pronoun-identity-system.md` carries the dated amendment; the plan's Phase 1 exit-state text was corrected to match, in place, rather than left wrong.

### 6. No new Assembler rule needed — simpler than the design presented to David
The design session anticipated a new Assembler player-pronoun rule to make `{You}` phrase-algebra-native. In practice, ADR-199 §4 B's existing per-subject verb agreement (`nounPerson`, `english-assembler.ts:213`) already covers it once the placeholder rewrite feeds it the right forms — no new phrase kinds were needed. Recorded because it's a simplification versus what was presented, not a silent scope cut.

## Next Phase
- **Phase 2a**: "D3 — Perception tagging, emit-time half (core → character → story-loader)" (Medium, budget 250) — `CURRENT (since 2026-08-28)`. Adds `location`/`presence` to actor-sourced narration events at the emit boundary; does not yet touch any drop site's control flow (that's Phase 2b, in the same landing unit).
- **Tier**: Medium; touches `packages/core`, `packages/character`, `packages/stdlib`, `packages/story-loader` — CLAUDE.md's platform-change discussion-first rule applies before any edit.
- **Entry state**: none — independent of D1/D2/D5/D6. The emit-boundary design (which single chokepoint stamps `location`+`presence` on every actor-sourced narration event, covering both the entity-daemon path today and the execution-entry path once Phase 3/4 land) needs to be presented to David before any `packages/` edit begins.

## Open Items

### Short Term
- `docs/work/chord-reference-adr-327/` is terminal (DONE) but was never archived when `.current-plan` was repointed away from it this session — rule 18b's archival step did not fire because that rule only triggers on a *non-terminal* outgoing plan; this is a gap in that plan's own lifecycle, not a rule violation, and should be archived by hand.
- Phase 1's changes are uncommitted (17 modified files, 2 new test files) — not yet staged/committed as of this write.
- Phase 2a's emit-boundary design needs to be presented to David before any edit, per CLAUDE.md's discussion-first rule for `packages/`.

### Long Term
- Phase 5's budget (NpcService decision/execution split, `plugin-npc` dissolution) is likely under its stated budget given the scope now confirmed (six call sites plus book/tutorial/fixture fallout moved to 6c).
- A `website/` install mismatch was carried forward from a prior session and remains unaddressed.
- Seven stranded DevArch event logs were noted by the pre-session audit; per standing user feedback these are ignorable and not something to proactively prune.

## Files Modified

**ADR amendments** (2 files):
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` — D3/D4/D5 amended with drop-site enumeration, ADR-089 prior-art note, and the engine-owns-the-tick ruling. Committed `ca865c80`.
- `docs/architecture/adrs/adr-089-pronoun-identity-system.md` — dated amendment: Part 3 stands; Phase D's pre-pass rescoped to player-voice only. Uncommitted.

**ADR-070/120 stamps** (committed `a8093cff`, part of Phase 0):
- `docs/architecture/adrs/adr-070-npc-system.md`, `docs/architecture/adrs/adr-120-engine-plugin-architecture.md` — supersession-in-part amendment sections.

**Plan pointer and plan** (2 files):
- `docs/context/.current-plan` — repointed from `docs/work/chord-reference-adr-327/plan.md` to `docs/work/adr-328-actors-platform-concept/plan.md`.
- `docs/work/adr-328-actors-platform-concept/plan.md` — 12-phase program plan; Phase 0 and Phase 1 marked DONE, Phase 2a advanced to CURRENT (since 2026-08-28) in this write.

**Phase 1 implementation** (uncommitted, 19 files):
- `packages/if-domain/src/phrase.ts` — `ACTOR_PARAM_KEY` export.
- `packages/lang-en-us/src/perspective/placeholder-resolver.ts`, `packages/lang-en-us/src/perspective/index.ts` — `expandActorPlaceholders`, `isBareVerb`, `THIRD_SINGULAR_CONTEXT`.
- `packages/lang-en-us/src/language-provider.ts` — `renderTemplate`'s `hasNonPlayerActor` branch.
- `packages/lang-en-us/src/actions/{asking,going,taking}.ts` — four actor-voice literals converted to placeholders.
- `packages/engine/src/prose-pipeline/phrase-render.ts` — `renderViaPhrase` actor binding.
- `packages/engine/src/prose-pipeline/handlers/{domain-message,generic}.ts` — pass `event.entities?.actor` through.
- `packages/lang-en-us/tests/actor-voice.test.ts` (new, 14 tests), `packages/engine/tests/prose-pipeline/actor-voice.test.ts` (new, 6 REAL-PATH tests), `packages/engine/tests/prose-pipeline/phrase-render.test.ts` (+3 tests).
- `packages/sharpee/docs/genai-api/{engine,if-domain,index,lang}.md` — regenerated by the build, not hand-edited.
- `stories/dungeo/src/version.ts` — `BUILD_DATE` bump, build side effect.

**Committed earlier this session** (`c740a5e7`, 1 file):
- `docs/work/zoo-chain/plan.md` → `docs/work/archive/zoo-chain/plan.md` — rule 18b archival, prior session's leftover working-tree change.

## Notes

**Session duration**: ~2 hours planning/review (20:07-22:09 CDT, 2026-08-27), plus a separate Phase 0/Phase 1 execution arc into 2026-08-28 (exact start/end not tracked — no session-state file).

**Approach**: Finalize-then-plan-then-review-then-fold for the planning arc, iterated twice against `plan-review`, every finding independently verified against source (file:line citations) before folding. Phase 1's execution followed CLAUDE.md's discussion-first rule (design presented to David, "Go" received) before any `packages/` edit, then rule 12 Behavior Statements before tests, then `mutation-verification` after — the standard DevArch coding-discipline sequence, run in full.

**Gap**: no `.session-state-{id}.json` file exists for this session (retired by an earlier `commit-remote` run), so tool-call count and hook-tracked file list are unavailable for both the planning arc and the Phase 0/1 execution arc; the Files Modified list above was reconstructed from `git status`/`git log` at write time.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — Phase 0 and Phase 1 are both DONE; Phase 2a is next-session work, not a continuation of an interrupted phase.
- **Rollback Safety**: safe to revert — Phase 0 is committed (`a8093cff`) and stable; Phase 1's 19 files are uncommitted and can be discarded cleanly if needed, though the evidence above shows them green.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-328 (ACCEPTED, 2026-08-25) existed as the subject of the plan; ADR-089's placeholder/conjugation mechanism (ACCEPTED, Phases A-D shipped 2026-01-05/16) was available and verified as prior art for D4; ADR-199 §4 B's Assembler subject-agreement rule (`english-assembler.ts:213`) was verified present before Phase 1 began, which is why no new Assembler rule was needed.
- **Prerequisites discovered**: ADR-070/120 amendment stamps required by ADR-328's own Acceptance item 4 did not exist before this session (now Phase 0's deliverable, DONE); ADR-328 D3/D4/D5 lacked the drop-site/prior-art/tick-ownership detail this session's review surfaced and folded in as amendments; the `makeCtx` test helper in `lang-en-us` was missing `params` threading, discovered only when the plural-actor test case exercised the Assembler's `ctx.params[subjectRef]` read.

## Architectural Decisions

- ADR-328 D3 amended: three drop sites (loader daemon gate, `witnessMove`, engine `processPluginEvents`) named, not one — rationale: `plan-review` verification found the engine's own filter dropping all 39 `npc.*` messages, previously unnamed in the ADR.
- ADR-328 D4 amended: ADR-089 prior art documented; `lang-en-us/src/npc/` flagged as the forbidden interim dialect already built — rationale: narrows D4's real remaining scope and names the surface that retires with it.
- ADR-328 D5 amended: engine owns the per-turn actor tick, `plugin-npc` dissolves outright — rationale: David's ruling, grounded in `CLAUDE.md:77`'s existing Logic Location assignment (no separate ADR/session record of a prior decision was found).
- ADR-089 amended (2026-08-28): Part 3 confirmed to stand; Phase D's pre-pass rescoped to the player-voice resolver specifically, no longer the resolver of record for every actor — rationale: Phase 1 implementation proved the plan's original "Part 3 superseded" claim wrong; amend-after-code, not a re-interview.
- Pattern applied: ADR-266 umbrella-plan pattern (one program plan carries per-phase real-path acceptance instead of a child ADR per phase, except D7 which gets its own child ADR at Phase 8). ADR-199 §4 B's phrase-algebra subject-agreement pattern reused as-is for Phase 1, per CLAUDE.md's "extend existing patterns" rule.

## Mutation Audit

- Files with state-changing logic modified: `packages/lang-en-us/src/perspective/placeholder-resolver.ts`, `packages/lang-en-us/src/language-provider.ts`, `packages/engine/src/prose-pipeline/phrase-render.ts`, `packages/engine/src/prose-pipeline/handlers/{domain-message,generic}.ts`.
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/lang-en-us' run test:ci` — 26 files, 444 passing, 2026-08-28, after the last edit to the covered files; `pnpm --filter '@sharpee/engine' run test:ci` — 64 files, 646 passing, 7 pre-existing skips, same date; the REAL-PATH tests in `actor-voice.test.ts` assert on actual rendered string output from the real `ProsePipeline`, not on events or mocks — "The thief closes the brass lamp." is asserted verbatim, not "didn't throw").
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — no prior session recorded a plan requiring two full review-and-fold cycles before acceptance (that's the normal `plan-review` workflow operating as designed), and no prior session recorded a test-harness gap of the `makeCtx`/`ctx.params` shape found during Phase 1.

## Test Coverage Delta

- Tests added: 23 (14 in `packages/lang-en-us/tests/actor-voice.test.ts`, 6 in `packages/engine/tests/prose-pipeline/actor-voice.test.ts`, 3 in `packages/engine/tests/prose-pipeline/phrase-render.test.ts`).
- Tests passing before: not separately tracked for this phase (no isolated pre-Phase-1 test run recorded) → after: `@sharpee/lang-en-us` 444/444 passing across 26 files; `@sharpee/engine` 646/646 passing (7 pre-existing skips) across 64 files (evidence: runs observed 2026-08-28, after the last edit to the covered files).
- Known untested areas: none identified for Phase 1's scope — `mutation-verification`'s two gaps (generic handler with a non-player actor; rendered-output assertions for the three rewritten templates) were both closed before the phase was called done.

---

**Progressive update**: Session completed 2026-08-28
