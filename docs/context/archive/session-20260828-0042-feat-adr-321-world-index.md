# Session Summary: 2026-08-28 - feat/adr-321-world-index

## Goals
- Session Start housekeeping: archive the terminal `chord-reference-adr-327` plan by hand (rule 18b did not fire on a terminal plan at the prior session's pointer repoint).
- Present the Phase 2a (ADR-328 D3, emit-time half) emit-boundary design to David; on "Go," fold the corrections into the plan and implement.

## Phase Context
- **Plan**: `docs/work/adr-328-actors-platform-concept/plan.md` — "Land ADR-328's umbrella program" (Plan Status: ACTIVE).
- **Phase executed**: Phase 2a — "D3 — Perception tagging, emit-time half (core → character → story-loader)" (Medium, budget 250).
- **Tool calls used**: 196 (from `.session-state-13615f.json`; no fixed budget tracked against this figure in the state file).
- **Phase outcome**: Completed on budget. Marked DONE in the plan (2026-08-28, session 13615f); Phase 2b advanced to `CURRENT (since 2026-08-28)`.

## Completed

### Session Start housekeeping
- `docs/work/chord-reference-adr-327/` archived to `docs/work/archive/` via `plan-archive.sh`; the `Superseded by` stamp in `docs/work/adr-327-explicit-references/plan.md` repointed to the archive path (read by the staleness sweep and the plan-pointer gate).

### Phase 2a — D3: Perception tagging, emit-time half (DONE)
Design presented to David before any `packages/` edit, per CLAUDE.md's discussion-first rule for platform changes; approved ("Go," 2026-08-28 00:42 CDT). Four corrections were folded into the plan text at design time, verified against source before implementing:
1. The chokepoint is the engine's enrichment funnel (`enrichEvent`, `turn-event-processor.ts:63`), reached by both the action and plugin funnels.
2. `location` reuses `entities.location` (`core/src/events/types.ts:45`) — only `presence` is a new field.
3. Presence is co-location + concealment via a new `PerceptionService.presenceOf`, not `canPerceive` (darkness stays a transform, ADR-069/ADR-328 D3).
4. The `Presence` union is declared in `core`; `character` re-exports it as `PlayerPresence`.

A fifth correction was found at implementation: player action events ARE producer-located — `action-context-factory.ts:87-99` stamps `entities.location` at context creation, so they reach the funnel already tagged `present`. A `going` event is located at the origin room after the move, so the funnel treats `entities.actor === playerId` as `present` by identity, ahead of consulting `presenceOf`, to keep `going` narration correct.

Landed:
- `packages/core/src/events/types.ts` — `Presence` type, `presence?` field on `ISemanticEvent`.
- `packages/if-services/src/perception-service.ts` — `presenceOf` added to `IPerceptionService`.
- `packages/stdlib/src/services/PerceptionService.ts` — `presenceOf` implementation + `isCoLocated`.
- `packages/engine/src/turn-event-processor.ts` — `presenceOf` in `EventProcessingContext`; `enrichEvent` tags `location`/`presence`.
- `packages/engine/src/game-engine.ts` — `presenceResolver()` wired into both funnels.
- `packages/story-loader/src/runtime.ts` — `sourced()` helper applied to entity-turn and trait-turn daemons (story-owned daemons untouched — untagged means "show").
- `packages/character/src/tick-phases.ts` — witnessed event carries `entities.location`; `createEvent` gains a `locationId` parameter.
- `packages/character/src/propagation/visibility.ts` — `PlayerPresence = Presence` (alias, not a redefinition).

Rule 12 Behavior Statements were produced in-conversation for `presenceOf`, `enrichEvent`, `sourced`, and `recordTransfer` before any test was written; all suites were graded with no RED or YELLOW.

Tests (new):
- `packages/stdlib/tests/unit/services/presence-of.test.ts` — 10 tests.
- `packages/engine/tests/unit/presence-tagging.test.ts` — 10 tests, 5 REAL-PATH through a real `GameEngine` + real `PerceptionService` + real `SchedulerPlugin`, including a `go east` case.
- `packages/story-loader/tests/presence-sourcing.test.ts` — 4 tests.
- `packages/character/tests/tick-phases/presence-location.test.ts` — 1 test.

Evidence (observed 2026-08-28, after the last edit to the covered files): `core` 176 passing (13 files); `stdlib` 1647 passing, 27 pre-existing skips (117 files); `character` 568 passing (48 files); `engine` 656 passing, 7 pre-existing skips (65 files); `story-loader` 963 passing (89 files); `if-services` has no test script (types only). `./repokit build dungeo` then `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`: 952 passing, every golden byte-identical. Root `npx tsc --noEmit`: clean. `mutation-verification` ran clean (5 mutation/producer functions scanned, no gaps).

Findings recorded (not this phase's job to act on):
- `narrate` is written in 8 places and read by nothing downstream (`runtime.ts:3422`'s comment claiming otherwise is stale).
- A **fourth** D3 drop site exists at `packages/character/src/tick-phases.ts:674` (`roomId === playerLocation` gate on propagation `witnessed`) — retires in Phase 2b; the ADR-328 D3 amendment should say four sites, to be stamped at 2b's landing.
- `resolvePlayerPresence` (`character/visibility.ts:137`) was exported with zero callers — `tick-phases.ts` hardcoded `'present'`; its concealed-case rule now lives in `presenceOf`.

## Key Decisions

### 1. Enrichment funnel is the single chokepoint, not per-producer tagging
Both the action-context path and the plugin/NPC path converge on `enrichEvent` in `turn-event-processor.ts`, so tagging there (reading a producer-stamped `entities.location`) covers every actor-sourced event through one code path, including Phase 3/4's future execution-entry path — rather than requiring every producer to compute and stamp `presence` itself.

### 2. Presence is co-location + concealment, not a sense check
`canPerceive` (darkness/blindness) stays a separate transform (ADR-069). `presenceOf` answers "is the observer co-located with this event, and if so, is it concealed" — folding the loader's room/region/containing-room rule with the concealed-trait check that `tick-phases.ts` had hardcoded away.

### 3. Player-by-identity rule for `going` events (found at implementation, not design)
Because the action context locates an event at context creation (before execute runs), a `going` event's location is the origin room after the move completes — which would tag `absent` under the co-location rule alone. The funnel instead treats `entities.actor === playerId` as `present` by identity, ahead of consulting `presenceOf`. This is load-bearing for Phase 2b: once a client hides `absent` events, this identity rule is what keeps `going` narration visible to the player who caused it.

## Next Phase
- **Phase 2b**: "D3 — Perception tagging, client-facing half + daemon-gate retirement" (Large, budget 350) — `CURRENT (since 2026-08-28)`. Carries the tag through `core` → `engine` (prose pipeline) → `text-blocks` → `channel-service` → the default client in one landing; retires the daemon presence gate, `witnessMove`'s hand-rolled drop, and the engine's `processPluginEvents` `filterEvents` drop (four gates total, per the finding above) the same session the last consumer lands. Adds an omniscient transcript-tester mode.
- **Tier**: Large — CLAUDE.md's platform-change discussion-first rule applies; the client-facing design must be presented to David before any `packages/` edit.
- **Entry state**: Phase 2a shipped — every actor-sourced event already carries `location`/`presence`. Carry forward the player-by-identity rule (Key Decision 3) so 2b's client-facing half does not bypass it and hide the player's own `going` narration.

## Open Items

### Short Term
- Phase 2a's changes are uncommitted — David has not asked for a commit.
- Phase 2b's design (text-blocks, prose pipeline, channel-service, default client, transcript-tester omniscient mode, four gate retirements) needs to be presented to David before any edit.
- ADR-328 D3 amendment to name four drop sites (not three) is deferred to Phase 2b's landing, per the plan's own note.

### Long Term
- Pre-existing, unrelated: `stories/friendly-zoo/tests/transcripts/state-assertions.transcript:19` fails (`yourself` no longer resolves after the ADR-327 player-role migration, `c4cea87e`, 2026-08-27) — filed as GitHub issue #319.
- `narrate` hint (8 write sites, 0 downstream readers) is stale and should eventually be cleaned up, but is out of scope for D3.

## Files Modified

**Phase 2a implementation** (uncommitted, per `.session-state-13615f.json`'s hook-tracked list):
- `packages/core/src/events/types.ts` — `Presence` type, `presence?` field.
- `packages/if-services/src/perception-service.ts` — `presenceOf` on `IPerceptionService`.
- `packages/stdlib/src/services/PerceptionService.ts` — `presenceOf` + `isCoLocated`.
- `packages/engine/src/turn-event-processor.ts` — `presenceOf` in context; `enrichEvent` tagging.
- `packages/engine/src/game-engine.ts` — `presenceResolver()` wired into both funnels.
- `packages/story-loader/src/runtime.ts` — `sourced()` applied to entity-turn/trait-turn daemons.
- `packages/character/src/tick-phases.ts` — witnessed event carries `entities.location`.
- `packages/character/src/propagation/visibility.ts` — `PlayerPresence = Presence` alias.
- New tests: `packages/stdlib/tests/unit/services/presence-of.test.ts`, `packages/engine/tests/unit/presence-tagging.test.ts`, `packages/story-loader/tests/presence-sourcing.test.ts`, `packages/character/tests/tick-phases/presence-location.test.ts`.
- `docs/work/adr-328-actors-platform-concept/plan.md` — Phase 2a corrections folded in; Phase 2a marked DONE; Phase 2b advanced to CURRENT.

**Session Start housekeeping** (uncommitted):
- `docs/work/adr-327-explicit-references/plan.md` — supersession stamp repointed to the archive path.
- `docs/work/chord-reference-adr-327/` → `docs/work/archive/chord-reference-adr-327/` — moved by `plan-archive.sh`.

**Build side effects** (not hand-edited):
- `packages/sharpee/docs/genai-api/{character,core,engine,if-services,index,stdlib}.md` — regenerated.
- `stories/dungeo/src/version.ts` — `BUILD_DATE` bump.

## Notes
- Session started 2026-08-28 00:42 CDT.
- Phase 2a is intentionally not independently shippable: the tag exists on every actor-sourced event, but nothing downstream reads it yet, and the daemon presence gate still silently drops off-stage firings exactly as before. This is the same shape as ADR-327 Phase 1's "corpus not expected to parse yet" — Phase 2b closes the loop in the same landing unit.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — Phase 2a is DONE; Phase 2b is next-session work, not a continuation of an interrupted phase.
- **Rollback Safety**: safe to revert — all of this session's changes are uncommitted and can be discarded cleanly; the evidence above shows them green.

## Dependency/Prerequisite Check

- **Prerequisites met**: `PlayerPresence` type already existed in `character/visibility.ts:20` and was reused (not redefined); `PerceptionService.canPerceive` (`stdlib`, `:96`) existed as the sense-check precedent that `presenceOf` was built alongside rather than replacing; the ADR-327 D9 role gate in `story-loader/src/runtime.ts` was already in place ahead of the daemon presence gate this phase's producers now feed.
- **Prerequisites discovered**: the player-by-identity rule for `going` events (Key Decision 3) was not anticipated in the approved design — found only when implementation traced `action-context-factory.ts`'s location-at-context-creation timing against a post-move event; a fourth D3 drop site (`tick-phases.ts:674`) was found during implementation, not during the design review that named the first three.

## Architectural Decisions

- None this session — ADR-328's D3 amendment to enumerate four drop sites (rather than three) is deferred to Phase 2b's landing, per the plan's own note; no ADR was written or amended in this session.

## Mutation Audit

- Files with state-changing logic modified: `packages/engine/src/turn-event-processor.ts` (`enrichEvent`), `packages/stdlib/src/services/PerceptionService.ts` (`presenceOf`), `packages/story-loader/src/runtime.ts` (`sourced`), `packages/character/src/tick-phases.ts` (`createEvent`/`recordTransfer`).
- Tests verify actual state mutations (not just events): YES (evidence: engine `presence-tagging.test.ts` — 10 tests, 5 REAL-PATH through a real `GameEngine` + real `PerceptionService` + real `SchedulerPlugin`, asserting on actual emitted event payloads' `location`/`presence` fields, not on mocks; `pnpm --filter '@sharpee/engine' run test:ci` — 656 passing, 7 pre-existing skips, observed 2026-08-28 after the last edit to the covered files; `mutation-verification` agent ran clean, 5 functions scanned, no gaps reported).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — no prior session recorded a mid-implementation correction to an approved design of this shape (the player-by-identity rule for `going` events was a genuinely new finding, not a repeat of a previously-seen defect class).

## Test Coverage Delta

- Tests added: 25 (10 in `stdlib/presence-of.test.ts`, 10 in `engine/presence-tagging.test.ts`, 4 in `story-loader/presence-sourcing.test.ts`, 1 in `character/presence-location.test.ts`).
- Tests passing before: not separately tracked for this phase (no isolated pre-Phase-2a run recorded) → after: `core` 176/176 (13 files), `stdlib` 1647/1647 with 27 pre-existing skips (117 files), `character` 568/568 (48 files), `engine` 656/656 with 7 pre-existing skips (65 files), `story-loader` 963/963 (89 files) (evidence: runs observed 2026-08-28, after the last edit to the covered files). Root `npx tsc --noEmit` clean. `./repokit build dungeo` + walkthrough chain: 952 passing, all goldens byte-identical.
- Known untested areas: none identified for Phase 2a's scope — `mutation-verification` ran clean with no gaps reported.

---

**Progressive update**: Session completed 2026-08-28
