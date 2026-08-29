# Session Summary: 2026-08-28 - feat/adr-321-world-index

## Goals
- ADR-328 Phase 2b — D3 perception tagging, client-facing half + daemon-gate retirement. David said "go" (02:45 CDT); goal-step `playerPresent` gate and the influence expired/resisted/applied room gates folded in (recommendation, stated as an assumption).

## Phase Context
- **Plan**: `docs/work/adr-328-actors-platform-concept/plan.md` — "Land ADR-328's umbrella program: one `(action, actorId)` execution path (D1/D2), perception that tags actor-sourced narration instead of dropping it (D3), actor voice (D4), the NpcService decision/execution split (D5), Dungeo's NPC rewrite (D6), and the Chord acting-surface child ADR (D7)."
- **Phase executed**: Phase 2b — "D3 — Perception tagging, client-facing half + daemon-gate retirement" (Large, budget 350)
- **Tool calls used**: 196 (session state, `toolCalls` field) / 350 budget
- **Phase outcome**: Completed on budget

## Completed

### Phase 2b source edits (all packages, before build)
- `text-blocks`: `ITextBlock.presence`/`location`. `if-domain`: `ProseEntry.presence`/`location`. `stdlib`: `toProseEntry` copies both; `filterEvents` passes `absent` events through untouched (ADR-069 amendment — corrected from the plan's original framing that it dropped them). `engine` `pipeline.ts`: `tagPresence` chokepoint. `channel-service`: `joinProseEntries(entries, opts)` / `packetProseText(payload, opts)` plus `showsEntry` / `presenceLabel` / `ProsePresentationOptions`. `platform-browser`: `presentation` option (hide `absent` / omniscient label + `main-entry--<presence>` class). `bootstrap`: `assembleGame`/`loadStory` `presence` opt with world-name label. `transcript-tester`: `presence:` header (`default|omniscient`) threaded via `loadStory`'s 5th param. CLI bundle: `--omniscient` flag.

### Gate retirements
- `story-loader`: `playerPresentAt`, `timerOwnerPresent`, `roomOfIn` deleted; entity/trait daemon presence gates and the timer named-turn prose gate removed; `sourced()` stamps `presence: 'absent'` directly for a placeless owner; `witnessMove` always enqueues both rows located at source/destination (its hand-checked `playerRoom === fromRoom`/`toRoom` drop is gone — the exact drop-not-tag pattern D3 replaces).
- `character`: propagation `witnessed` room gate, goal-step gate (`playerPresent` removed from `PropagationContext`/`GoalStepContext`), and influence `expired`/`resisted`/`applied` gates all fold to location-stamped events — this scope beyond the plan's original text, folded on David's "go" as a stated assumption.

### Tests and REAL-PATH story
- Re-pinned: character `goals`/`propagation`; story-loader `region-daemon`, `region-forest`, `ownership-runtime`, `zoo-surfaces-phase3`, `places-runtime`, `timers-runtime`; transcript-tester `header-folding` LEGAL list (+`presence`).
- New: `stdlib` perception-service absent-passthrough + `prose-entry-presence.test.ts`; `engine` pipeline tag tests; `channel-service` presentation tests; `platform-browser` hide/omniscient tests; `transcript-tester` `presence:` header tests; `packages/character/tests/tick-phases/off-stage-narration.test.ts` (written to close a mutation-verification gap — goal step / influence applied+resisted / expired firing with the player elsewhere, asserting location on the emitted event).
- REAL-PATH story: `stories/presence-test/presence-test.story` + `tests/transcripts/{default,omniscient}-rendering.transcript` — an entity-owned `on every turn` daemon fires every turn regardless of player location; default rendering shows only the on-stage instance, omniscient shows both tagged by location.

### Build and verification (2026-08-28 03:03-03:10 CDT, after last source edit)
- `./repokit build dungeo` green; root `npx tsc --noEmit` clean.
- Unit suites: stdlib 1651 passing (27 pre-existing skips), engine 659 (7 pre-existing skips), channel-service 119, platform-browser 145, transcript-tester 282, story-loader 963, character 570 (incl. new `off-stage-narration.test.ts`).
- REAL-PATH via `dist/cli/sharpee.js`: `stories/presence-test` default-rendering 4 passing, omniscient-rendering 3 passing.
- Dungeo walkthrough chain: 952 passing (unchanged). friendly-zoo chain: 56 passing across wt-01..07 (wt-01 `examine yourself` exercised with a diagnostic substitute — pre-existing #319, not caused by this phase).
- Further re-pins found by the runs: `places-runtime` (first re-pin attempt was wrong — Teisha has no `disappeared` block; located-row assertion moved to the monkey test); friendly-zoo `timeline.transcript` turn 29, `wt-04` `> west`, `wt-05` snake/parrot confessions — all `, once` clauses now spent off-stage on the first after-hours turn.

### GitHub and documentation
- Commented on #319 (`examine yourself` blocks the zoo chain, pre-existing ADR-327 issue). Opened #320 (`cli-chord-seed.test.ts` fixture uses removed `create the player` grammar — 2 pre-existing failures in `pnpm test:scripts`, unrelated to this phase).
- ADR-328 D3 amended 2026-08-28 (filterEvents correction — it never dropped, only transforms; full drop-site list; wire/surface shape; real path). ADR-213 §Witnessed, ADR-325 D2 + Non-goals, ADR-069 (new amendment: absent events pass through `filterEvents`), ADR-070 `:538` correction — all stamped. No new ADR written this session.
- Plan `docs/work/adr-328-actors-platform-concept/plan.md`: Phase 2b marked DONE with full evidence paragraph; Phase 3 advanced to CURRENT (since 2026-08-28).

## Key Decisions

### 1. Fold goal-step and influence room gates into 2b
The goal-step `playerPresent` gate (`tick-phases.ts:827`, `step-evaluator.ts` x5, `propagation-evaluator.ts:46`) and the influence `expired`/`resisted`/`applied` room gates (`tick-phases.ts:917/1037/1047`) follow the identical drop-not-tag pattern D3 targets. Folding them into the same landing avoids a state where some off-stage narration is tagged and some is still silently dropped. Taken as an assumption under David's "go" rather than confirmed line-by-line beforehand.

### 2. Placeless owner tagged absent at the source
A placeless (offstage) owner's narration is tagged `absent` by the loader's `sourced()` directly, since the prose-pipeline funnel has no location to resolve for it. Keeps the tagging invariant (every actor-sourced entry carries a presence) intact without inventing a location.

### 3. Omniscient label format
`[<room name>] text` when a location is known; `[<presence>]` alone (no location) when the entry carries a tag but no resolvable location. Chosen for compactness with the transcript-tester's existing header-folding conventions.

## Next Phase
- **Phase 3**: "D1/D2a — The programmatic execution entry" — a new `(actionId, resolvedEntities, actorId) →` four-phase entry point with no parser, built on `CommandExecutor`'s existing (currently ignored) `actorId` option; player-bound reads at `command-executor.ts:188/268/308` become reads of the passed actor.
- **Tier**: Medium (budget 250)
- **Entry state**: none — independent of D3/D4; this phase starts the unblock of `docs/work/adr-327-explicit-references/plan.md` Phase 6 (Phase 4's later sweep completes it). Platform change (`packages/engine`) — present the entry's shape to David first per the plan's own instruction before implementing.

## Open Items

### Short Term
- Nothing committed yet as of this summary — commit-remote runs after this summary is finalized.
- **Flag for David**: friendly-zoo's four `on every turn while after-hours, once` confessions (snake, parrot, goats, keeper) now fire on the first after-hours turn wherever the player is, rather than only when the player is standing there at closing. ADR-predicted outcome, not a bug; the zoo may instead want `after the player entering while after-hours, once`. Not changed this session — David's call.

### Long Term
- Pre-existing #319 (`examine yourself` after ADR-327, blocks the zoo chain at wt-01) and #320 (`cli-chord-seed.test.ts` fixture uses removed grammar) remain open, unrelated to this phase.
- IDE Play-panel toggle for `prosePresentation: { presence: 'omniscient' }` is exposed on `registerDefaultBrowserRenderers` but not yet wired into the Swift IDE — separate track.

## Files Modified

**ADRs** (5 files):
- `docs/architecture/adrs/adr-069-perception-event-filtering.md` - new amendment (absent events pass through `filterEvents`)
- `docs/architecture/adrs/adr-070-npc-system.md` - `:538` correction
- `docs/architecture/adrs/adr-213-removed-from-play-signal.md` - §Witnessed stamped
- `docs/architecture/adrs/adr-325-chord-presence-and-duration.md` - D2 + Non-goals stamped
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` - D3 amended

**Plan** (1 file):
- `docs/work/adr-328-actors-platform-concept/plan.md` - Phase 2b DONE, Phase 3 CURRENT

**Platform source** (13 files):
- `packages/bootstrap/src/index.ts` - `presence` opt on `assembleGame`/`loadStory`
- `packages/channel-service/src/index.ts`, `src/utils/prose.ts` - `joinProseEntries`/`packetProseText`, `showsEntry`/`presenceLabel`/`ProsePresentationOptions`
- `packages/character/src/goals/step-evaluator.ts`, `src/propagation/propagation-evaluator.ts`, `src/tick-phases.ts` - gate retirement
- `packages/engine/src/prose-pipeline/pipeline.ts` - `tagPresence` chokepoint
- `packages/if-domain/src/channels/types.ts` - `ProseEntry.presence`/`location`
- `packages/platform-browser/src/channels/index.ts`, `src/channels/prose.ts` - `presentation` option
- `packages/stdlib/src/channels/standard.ts`, `src/services/PerceptionService.ts` - `filterEvents` passthrough
- `packages/story-loader/src/runtime.ts` - gate/`witnessMove` retirement, `sourced()` absent stamp
- `packages/text-blocks/src/types.ts` - `ITextBlock.presence`/`location`
- `packages/transcript-tester/src/cli.ts`, `src/parser.ts`, `src/story-loader.ts`, `src/types.ts` - `presence:` header, `--omniscient`
- `scripts/bundle-entry.js` - `--omniscient` flag

**Tests, new and re-pinned** (14 files + 2 new dirs):
- `packages/channel-service/tests/prose.test.ts`, `packages/character/tests/goals/goals.test.ts`, `tests/propagation/propagation.test.ts`, `packages/engine/tests/prose-pipeline/pipeline.test.ts`, `packages/platform-browser/tests/channels/prose.test.ts`, `packages/stdlib/tests/unit/services/perception-service.test.ts`, `packages/story-loader/tests/{ownership-runtime,places-runtime,region-daemon,region-forest,timers-runtime,zoo-surfaces-phase3}.test.ts`, `packages/transcript-tester/tests/{header-config,header-folding}.test.ts`
- New: `packages/character/tests/tick-phases/off-stage-narration.test.ts`, `packages/stdlib/tests/unit/channels/` (dir)

**REAL-PATH story** (new):
- `stories/presence-test/` — `presence-test.story` + `tests/transcripts/{default,omniscient}-rendering.transcript`

**friendly-zoo re-pins** (3 files):
- `stories/friendly-zoo/tests/transcripts/timeline.transcript`, `walkthroughs/wt-04-staff-area.transcript`, `walkthroughs/wt-05-after-hours.transcript`

**Build artifacts** (regenerated, not hand-edited):
- `stories/dungeo/src/version.ts`, `packages/sharpee/docs/genai-api/{character,if-domain,index,presentation,text,tooling}.md`

## Notes

**Session duration**: ~30 minutes (2026-08-28 02:46-03:17 CDT)

**Approach**: Implemented the client-facing half of D3's tag-not-drop perception model end-to-end in one landing (core through prose pipeline, text-blocks, channel-service, to the default client), then retired every hand-rolled presence-drop mechanism the ADR named plus two more of the same pattern found during implementation (goal-step and influence room gates), verified with a dedicated REAL-PATH story rather than relying solely on re-pinned goldens.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 2b complete; remaining program phases tracked in the plan)
- **Rollback Safety**: safe to revert (nothing committed yet)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2a shipped prior to this session (every actor-sourced event already carried the presence tag at emit time); this phase's entry state depended on that and was satisfied.
- **Prerequisites discovered**: None beyond plan scope — the goal-step and influence gates were discovered during implementation as instances of the same pattern, not as blocking prerequisites.

## Architectural Decisions

- ADR-328 D3 amended (2026-08-28): corrected the `filterEvents` characterization (it transforms and returns one event per input, never drops; the actual drops were in `NpcService` decision logic, retired separately in Phase 5), documented the full drop-site list, wire/surface shape, and real path.
- ADR-213 §Witnessed stamped: unwitnessed transitions now narrate nothing to the player but still consume state off-stage (Choice counters advance), a determinism re-pin for strategy-variant witness rows.
- ADR-325 D2 + Non-goals stamped: `disappeared`/`entered` observer semantics now change under D3 (previously declared out of scope).
- ADR-069 new amendment: an `absent`-tagged event passes through `filterEvents` untouched, so darkness in the player's room never rewrites an off-stage line.
- ADR-070 `:538` corrected (already partially stamped by Phase 0, 2026-08-27; this session's correction is additional).
- Pattern applied: tag-at-source, filter-at-render (D3) — replacing every prior drop-at-source mechanism (`playerPresentAt`, `timerOwnerPresent`, `witnessMove`'s hand-checked room comparison, the goal-step and influence room gates).

## Mutation Audit

- Files with state-changing logic modified: `packages/story-loader/src/runtime.ts` (`sourced()`, `witnessMove`, daemon gates), `packages/character/src/tick-phases.ts`, `src/goals/step-evaluator.ts`, `src/propagation/propagation-evaluator.ts`, `packages/engine/src/prose-pipeline/pipeline.ts`, `packages/stdlib/src/services/PerceptionService.ts`.
- Tests verify actual state mutations (not just events): YES (evidence: mutation-verification agent run 2026-08-28 03:12 CDT — reported one gap, character off-stage narration untested; closed same session by `packages/character/tests/tick-phases/off-stage-narration.test.ts`, which asserts location/presence on the emitted event for goal-step and influence expired/resisted/applied firing with the player elsewhere; all other changed files confirmed GREEN).
- If NO: N/A — gap closed within session.

## Recurrence Check

- Similar to past issue? NO — no prior session summary in `docs/context/` covers a drop-vs-tag perception pattern fix of this shape.

## Test Coverage Delta

- Tests added: `packages/character/tests/tick-phases/off-stage-narration.test.ts` (closes mutation-verification gap) plus new suites in stdlib (`prose-entry-presence.test.ts`, perception-service absent passthrough), engine (pipeline tag tests), channel-service (presentation tests), platform-browser (hide/omniscient tests), transcript-tester (`presence:` header tests), and the `stories/presence-test` REAL-PATH story (7 transcript tests: 4 default + 3 omniscient).
- Tests passing before: not captured pre-session (Phase 2b is additive to an already-green baseline) → after: stdlib 1651 (27 pre-existing skips), engine 659 (7 pre-existing skips), channel-service 119, platform-browser 145, transcript-tester 282, story-loader 963, character 570; Dungeo chain 952; friendly-zoo chain 56 (evidence: run output quoted in the plan's Phase 2b Status line and in this session's build/verification pass, 2026-08-28 03:03-03:10 CDT, timestamped after the last source edit).
- Known untested areas: none flagged for this phase's scope; IDE Play-panel omniscient wiring (Swift side) remains unbuilt, tracked as an open item rather than a test gap in this phase.

---

**Progressive update**: Session completed 2026-08-28 03:17
