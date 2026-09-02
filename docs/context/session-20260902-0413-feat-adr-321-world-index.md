# Session Summary: 2026-09-02 - feat/adr-321-world-index

## Goals
- W-10 check: write the Chapter 11 dance's engine as a minimal `.chord` prototype and record whether it needed anything Chord does not have.
- Resolve the resulting platform findings (tick order, `on parting` coverage, interruption grip) through ADR-320 D10a and a new ADR, then implement.

## Phase Context
- **Plan**: `docs/work/adr-320-d10-interruption/plan.md` — "Build the interruption facet of ADR-320 D10 ... so an NPC's authored `opens when` thread can take the floor from the scene the player is currently in."
- **Phase executed**: Phase 2 — "Turn-phase bands — ADR-332" (Small, budget 120)
- **Tool calls used**: 420 / (session budget tracked in state file; state file's own `phase`/`phaseName` fields are stale — they still read Phase 0's name, the plan.md phase table is authoritative per rule 5)
- **Phase outcome**: Built and green, but not closed — two gate diffs are traced and both wait on David's ruling (bless vs. investigate). Plan phase Status remains `CURRENT`.

## Completed

### W-10 dance prototype and platform findings (plan predecessor work, same session)
- Built `branch-stories/secret-letter/prototypes/w10-dance/` (story, `dance.chord`, config, README, `w10-dance.tests.json` transcribed from a real `./sharpee play` run, 29 cards passing at the time).
- Verdict: a primitive is missing — the story cannot hand the player's conversation to the next partner (`ensureScene` refuses while either party is seated elsewhere; nothing closes a scene from outside dialogue).
- Filed GH #348 (hand-off unbuilt, ADR-320 D10), #349 (`is concluded`/`leave` analyzer-runtime mismatch), #350 (trait `on asking` shadows topic table), #351 (`talks to` slot shape), #352 (bundle `--exec/--play` has no import resolver).
- ADR-331 (`docs/architecture/adrs/adr-331-chord-rotation.md`) written DRAFT for a rotation construct; David not satisfied with the syntax, may become story-specific; four open questions; not built.

### Phase 0 — decisions (DONE)
- ADR-320 D10a amendment: Q1 ruled wide (`on parting` fires on every park, not just same-pair dispatch); Q2 folded from plan-review (thread-aware grip — the stronger of scene grip and the outgoing pair's ACTIVE thread strength); Q3 deferred to a new ADR.
- ADR-332 (`docs/architecture/adrs/adr-332-story-reactions-before-the-actor-phase.md`) written, interviewed (Q-1 resolved as three named bands), reviewed (`adr-review` 19/19 after four folded fixes), David ACCEPTED. ADR-120 tagged with an amendment note.

### Phase 1 — the guard (DONE, David: "go ahead with Phase 1")
- world-model: `scene-wire.ts` (`thread-parked` gains `partnerId`; new `thread-parting` kind), `scene-runtime-binding.ts` (`partingLine?` hook).
- character: `scene-scoring.ts` (`strongerStrength`), `thread-runtime.ts`, `scene-runtime.ts` (`PartingLine` threaded through `closeScene`/`applySceneDirectives`/`ageScenes`), `scene-binding.ts` (thread-aware grip in `resolveIntrusion`), `tick-phases.ts` (step 4a challenges the player's foreign scene before `ensureScene`; emits `character.thread.parting`).
- story-loader: `runtime.ts` (`wireToEvents`/`buildThreadStrength`/`buildPartingLine`; inline same-pair park refactored onto the shared deliverer), `loader.ts` (binds both hooks).
- stdlib: `dialogue-selector.ts` (`toSceneEvents`).
- Tests: `character/tests/conversation/interruption-d10a.test.ts` (10), `character/tests/tick-phases/thread-interruption.test.ts` (4), `thread-runtime.test.ts` shape updated for `partnerId`; `story-loader/tests/adr-320-phase10-threads.test.ts` AC14 added to assert the dispatch-path parting event — the one gap `mutation-verification` found.
- Test-run claim `[reported by session, unverified — no session event log present]`: character 593 passing, story-loader 1014 passing, stdlib 1663 passing (+27 pre-existing skips), tsc clean, 16:14–16:34 CDT.

### Phase 2 — turn-phase bands, ADR-332 (built and green; David: "go ahead with Phase 2", then "go ahead" on the eleven-row correction)
- `packages/plugins/src/turn-bands.ts` — `TURN_BANDS`, `TURN_BAND_ORDER`, `bandOf`, exported from the barrel.
- Eleven plugins renumbered (not seven — the loader's four object-literal plugins were missed by the original ADR-332 sweep and found when the placement test ran): acting flush 390, scheduler 350, hunger daemon 340 (story reactions); actor 250, state machines 240, scene evaluation 230 (platform phases); rank/hunger watchers 120, promotion/hunger narrators 115, chapters 110 (watchers). Headers rewritten to name the band.
- ADR-332 D2 and ADR-120's amendment note corrected from seven rows to the eleven a live engine registers.
- Tests: `plugins/tests/turn-bands.test.ts` (4), `story-loader/tests/adr-332-turn-bands.test.ts` (3, live engine — ids in order, every plugin banded, the eleven numbers pinned), `engine/tests/unit/scene-evaluation-plugin.test.ts` pinned literal `60` replaced with the band constant.
- Test-run claim `[reported by session, unverified — no session event log present]`: plugins 17, story-loader 1017, engine 680 (+7 pre-existing skips), character 593, ext-hunger 5, ext-chapters 7, ext-scoring 14, 18:02–18:40 CDT. `plugin-scheduler` and `plugin-state-machine` have no test directories.
- `./repokit build dungeo` clean (self-reported, unverified — no event-log corroboration).
- Corpus gates: fernhill (36 cards), secret-letter (562 cards), thealderman (4 cards) byte-identical.
- **Two gate diffs, both traced, both pending David's ruling** (this is why Status is INCOMPLETE, not COMPLETE):
  1. Dungeo `wt-01` `down` — the trapdoor line (state machine) and the sword-glow line (scheduler daemon) swap order under the new bands, content unchanged (ADR-332 D4). The chain halts there; `wt-02`..`wt-17` are unverified until the golden transcript is blessed (`--bless`) or rejected.
  2. `ides-of-march` card 31 — Burbage's `opens when third-day` thread now opens three turns earlier because the player's concluded-thread scene with Kemp yields to it. This is Phase 1/D10a's thread-aware grip working as designed, not a band-ordering artifact (isolated: putting scheduler back at 50 still produces it). The corpus tree needs regenerating from its recipe once David confirms the new timing is correct content.

## Key Decisions

### 1. ADR-331 (Chord rotation) stays DRAFT
David is not satisfied with the switch/swap → circle/turn → rotation/advance syntax and flagged it may be a story-specific extension rather than core grammar. His correction is recorded as standing feedback: an extension is itself a platform change because it adds syntax — it does not bypass the "discuss platform changes first" rule.

### 2. ADR-332 — story reactions run before the actor phase
Named three bands (`storyReactions` 300s, `platformPhases` 200s, `watchers` 100s) instead of a single priority swap, so future plugins have a slot to declare into rather than a number to guess. ADR-120's rationale ("NPCs act first, daemons run last") no longer covered the case now that Chord timers are story clocks driving NPC state (ADR-325), so this is recorded as an ADR-120 amendment, not a bug fix.

### 3. Eleven plugins, not seven
The original ADR-332 interview/design pass counted plugins from the registry's static registrations and missed four the story-loader wires as object literals. Corrected in the ADR and the plan rather than silently building to the wrong count — found by the placement test, not assumed correct.

### 4. Plan supersession handled per rule 18b
`docs/work/secret-letter-port/plan.md` (still has live phases 4 and 6) was stamped "Superseded by `docs/work/adr-320-d10-interruption/plan.md`" and left otherwise untouched — option 2 of rule 18b — rather than closed or abandoned, since the interruption work is a detour off it, not a replacement for it.

## Next Phase
- **Immediate**: David rules on the two Phase 2 gate diffs (bless the Dungeo golden or investigate further; confirm/regenerate the ides-of-march tree). Phase 2 does not move to DONE until both are resolved — this is not new work, it is closing out what already built green.
- **Phase 3**: "Real-path acceptance — story-loader test, W-10 prototype re-transcribed, baselines checked" (Medium, budget 200) — a new `story-loader/tests/adr-320-d10-interruption.test.ts` real-path test (rule 13a) driving `GameEngine.executeTurn` on a two-partner fixture with no stubs; the W-10 prototype re-transcribed from a live `./sharpee play` run with its hold gates removed now that the interruption makes them unnecessary.
- **Tier**: Medium (200 budget).
- **Entry state**: Phase 2's two gates resolved and its Status flipped DONE.

## Open Items

### Short Term
- David's ruling on the two Phase 2 gate diffs (blocking Phase 2 close-out).
- GH #348 stays open until Phase 4 closes it with evidence.
- `branch-stories/secret-letter/README.md`'s bundle "Running it" command is wrong for imported stories (#352) — left as is pending a ruling on where the fix belongs.

### Long Term
- ADR-331 rotation syntax — resolve DRAFT status (core grammar vs. story extension) before Chapter 11's dance can build against it.
- GH #347, #349, #350, #351, #352 — filed, each its own small fix, none touched this session.

## Files Modified

**Platform code** (18 files): `packages/character/src/conversation/{index,scene-binding,scene-runtime,scene-scoring,thread-runtime}.ts`, `packages/character/src/tick-phases.ts`, `packages/engine/src/{actor-turn-plugin,scene-evaluation-plugin}.ts`, `packages/extensions/{chapters/src/chapters-plugin,hunger/src/hunger,scoring/src/rank-watcher-plugin}.ts`, `packages/plugin-scheduler/src/scheduler-plugin.ts`, `packages/plugin-state-machine/src/state-machine-plugin.ts`, `packages/plugins/src/{index,plugin-registry}.ts` (+ new `turn-bands.ts`), `packages/stdlib/src/actions/helpers/dialogue-selector.ts`, `packages/story-loader/src/{loader,runtime}.ts`, `packages/world-model/src/capabilities/{scene-runtime-binding,scene-wire}.ts`

**Tests** (7 files): `packages/character/tests/conversation/thread-runtime.test.ts` (modified), `packages/character/tests/conversation/interruption-d10a.test.ts` (new), `packages/character/tests/tick-phases/thread-interruption.test.ts` (new), `packages/engine/tests/unit/scene-evaluation-plugin.test.ts`, `packages/plugins/tests/turn-bands.test.ts` (new), `packages/story-loader/tests/adr-320-phase10-threads.test.ts`, `packages/story-loader/tests/adr-332-turn-bands.test.ts` (new)

**ADRs and docs**: `docs/architecture/adrs/adr-120-engine-plugin-architecture.md` (amendment note), `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` (D10a), `docs/architecture/adrs/adr-331-chord-rotation.md` (new, DRAFT), `docs/architecture/adrs/adr-332-story-reactions-before-the-actor-phase.md` (new, ACCEPTED), `packages/sharpee/docs/genai-api/*.md` (auto-generated, 6 files)

**Plan/work docs**: `docs/work/adr-320-d10-interruption/plan.md` (new), `docs/context/.current-plan` (repointed), `docs/work/secret-letter-port/plan.md` (superseded stamp), `docs/work/secret-letter-port/watch-list.md`, `docs/work/secret-letter-port/change-document.md`

**Prototype**: `branch-stories/secret-letter/prototypes/w10-dance/` (new tree)

**Build artifact**: `stories/dungeo/src/version.ts` (version stamp from `./repokit build`)

## Notes

**Session duration**: ~13.5 hours (04:13–18:40+ CDT, per timestamps embedded in the plan and prior progressive summary; the state file's `started` field reads 09:09 UTC = 04:09 CDT, consistent).

**Approach**: platform-change discussion first (CLAUDE.md) — prototype exposed the gap, findings filed as GitHub issues rather than worked around, two ADRs (D10a amendment + new ADR-332) written and reviewed before any code, then implementation proceeded phase-by-phase with explicit David go-aheads at each phase boundary.

**Evidence gap**: no `docs/context/.devarch-events-6a3da1.jsonl` was found for this session, so every test-suite-passing and build-clean claim above carries the `[reported by session, unverified]` marker per ADR-0019 rather than being independently corroborated. The session state file's `files` array is stale (only 3 entries, memory-write artifacts) — `git status`/`git diff --stat` was used instead per the session-start note, and its output matches the plan's own file listing.

**Harness notes**: auto-mode safety classifier was down for a stretch mid-session (Agent/Bash tool calls refused; resumed on retry). `./sharpee play` fed one command per 350ms via a scratchpad driver script is the working probe harness for imported stories (the bundle's `--exec`/`--play` still lacks an import resolver, #352). `tsf` builds `dist/` only by default; `dist-esm` needs `--target esm --packageList`; extensions build via `pnpm --filter … build` and skip the esm target.

---

## Session Metadata

- **Session**: 6a3da1
- **Status**: INCOMPLETE
- **Blocker**: Platform / Architecture — Phase 2 (ADR-332 turn-band reordering) built and green, but two gate diffs against golden transcripts (Dungeo `wt-01`, `ides-of-march` card 31) are traced to intended behavior changes and require David's explicit ruling (bless / regenerate) before the phase can close.
- **Blocker Category**: Architecture
- **Estimated Remaining**: ~0.5–1 hour for David's two rulings and re-running the gates, then Phase 3 (~1 session, Medium tier, 200 budget) and Phase 4 close-out (~1 session, Small tier, 60 budget).
- **Rollback Safety**: safe to revert — nothing committed or pushed this session; all changes are in the working tree only.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-320 (conversation/dialogue model) as the facet's authorizing ADR; ADR-120 (plugin priority ordering) as the mechanism ADR-332 amends; the W-10 prototype as the acceptance vehicle that surfaced the gap; `docs/context/project-profile.md`'s mutation-signature bar for `packages/character` tests.
- **Prerequisites discovered**: `on parting` rendering was already a pre-existing gap broader than this facet (only one of five park paths rendered it) — folded into D10a Q1's wide fix rather than treated as a separate blocker.

## Architectural Decisions

- ADR-320 D10a (amendment, 2026-09-02): interruption rule as built — wide `on parting` fix, thread-aware grip, tick-order deferred to ADR-332.
- ADR-332 (new, ACCEPTED 2026-09-02): story reactions run before the platform actor phase via three named turn bands (`TURN_BANDS` in `packages/plugins`); ADR-120 tagged with an amendment note rather than rewritten.
- ADR-331 (new, DRAFT, not built): Chord rotation construct — syntax unresolved, may become a story-specific extension.
- Pattern applied: capability dispatch / behavior-owns-mutation pattern extended to `resolveIntrusion` (Phase 1) rather than inventing new scoring; band constants exported from `packages/plugins` rather than each plugin hardcoding a priority number (Phase 2).

## Mutation Audit

- Files with state-changing logic modified: `packages/character/src/conversation/{scene-binding,scene-runtime,scene-scoring,thread-runtime}.ts`, `packages/character/src/tick-phases.ts`, `packages/story-loader/src/runtime.ts`, `packages/world-model/src/capabilities/scene-wire.ts`.
- Tests verify actual state mutations (not just events): YES `[reported by session, unverified]` — `mutation-verification` ran after Phase 1 and found one real gap (the dispatch-path park's parting event was unasserted), which was closed with `story-loader/tests/adr-320-phase10-threads.test.ts` AC14 rather than left open. No independent event-log confirmation exists for this session.
- If NO: N/A (gap found and closed, per above).

## Recurrence Check

- Similar to past issue? NO — this session's blocker (a golden-transcript gate awaiting a content-timing ruling) is not flagged as matching any pattern in prior sessions' recorded blockers; no `pattern-recurrence-detector` run this session since Status is INCOMPLETE only on a pending-ruling gate, not a technical blocker/failure.

## Test Coverage Delta

- Tests added: 21 new test cases across 5 new test files (`interruption-d10a.test.ts` 10, `thread-interruption.test.ts` 4, `turn-bands.test.ts` 4, `adr-332-turn-bands.test.ts` 3) plus 1 assertion added to an existing test (`adr-320-phase10-threads.test.ts` AC14).
- Tests passing before: not measured this session (no baseline suite run captured before Phase 1's edits) → after: character 593, story-loader 1017, stdlib 1663, plugins 17, engine 680, ext-hunger 5, ext-chapters 7, ext-scoring 14 `[reported by session, unverified — no session event log present]`.
- Known untested areas: `plugin-scheduler` and `plugin-state-machine` have no test directories at all, so Phase 2's renumbering of those two plugins' priorities has no suite-level guard beyond the cross-package placement tests.

---

**Progressive update**: Session completed 2026-09-02 (finalized ~18:40+ CDT)
