# Session Summary: 2026-08-28 - feat/adr-321-world-index

## Goals
- Get David's "Go" on ADR-328 Phase 2b, trace the code, and present the client-facing perception-tagging + daemon-gate-retirement design before touching `packages/`.
- Correct a stale audit claim about Phase 2a's commit status.

## Phase Context
- **Plan**: `docs/work/adr-328-actors-platform-concept/plan.md` — ADR-328 "Actors are a platform concept" (12-phase program plan).
- **Phase executed**: Phase 2b — "D3 — Perception tagging, client-facing half + daemon-gate retirement" (Large, budget 350). Design-only session — the phase was **not** executed or completed; no `packages/` edits were made per CLAUDE.md's platform-change discussion-first rule. Phase 2b remains `**Status**: CURRENT (since 2026-08-28)` in the plan, unchanged by this session.
- **Tool calls used**: 67 (per `.session-state-cb97c7.json`) / 350 budget — all spent tracing code and presenting the design, none on implementation.
- **Phase outcome**: Design presented to David; approval pending. No phase-status change made to the plan.

## Completed

### Session Start / audit correction
- Recapped session 0042, ran `pre-session-audit` (clean: tsc clean, no stale artifacts, 7 stranded devarch event logs noted as ignorable), confirmed `docs/context/project-profile.md` fresh (5 days old), read `docs/core-concepts/README.md` in full, cleared the session gate.
- Corrected the audit's `[reported]` claim that Phase 2a was uncommitted: verified it landed in commit `003b8e21` (24 files, 968 insertions), working tree clean.

### Phase 2b design trace (read-only)
- Traced the tag-propagation path block → wire → renderer: `ITextBlock` (`packages/text-blocks/src/types.ts:117`) gains `location?`/`presence?` as an inline literal union (text-blocks has zero dependencies and cannot import core's `Presence`); engine prose pipeline stamps at one chokepoint (`pipeline.ts:258-261`); `if-domain` `ProseEntry` (`channels/types.ts:73-86`) and stdlib's `toProseEntry` (`channels/standard.ts:130-139`) carry it through; `channel-service`'s `joinProseEntries`/`packetProseText` (`utils/prose.ts:113-160`) gain `opts { presence, locationLabel }`; `platform-browser` prose flush (`channels/prose.ts:139-154`) skips absent by default with an IDE Play-panel opt-in; bootstrap (`index.ts:322`) threads presence with world-name label lookup; `--play`/`--exec` get a `--omniscient` flag; `transcript-tester` gets a `presence: omniscient` header field (`parser.ts:33`, `:580`, threaded via `story-loader.ts:37`). No `PROTOCOL_VERSION` bump — all additive fields.
- Traced the three gate retirements: (a) `story-loader/src/runtime.ts` `playerPresentAt` (`:3590-3600` + call sites `:3327`, `:3386`) — delete; (b) `witnessMove` (`:4117-4139`) — drop `playerRoom` checks, always enqueue; (c) `character/src/tick-phases.ts:677` — drop `roomId === playerLocation`, always push. Verified `processPluginEvents`/`PerceptionService.filterEvents` (`stdlib/src/services/PerceptionService.ts:49-95`) has **nothing to retire** — it already transforms, never drops; the real plugin-side drops are in `NpcService` decision logic (`stdlib/src/npc/behaviors.ts:114`, `npc-service.ts:500`), which Phase 5 deletes. Flagged that the plan, the ADR-328 2026-08-27 amendment, and the ADR-070 stamp (`:538`) all incorrectly claim `filterEvents` "stops dropping" — needs correcting at landing. Proposed one real engine change: `filterEvents` leaves `presence === 'absent'` events untouched (ADR-069 contract amendment).
- Surfaced a decision item for David: the same drop-not-tag pattern exists for goal steps (`tick-phases.ts:827`, `character/src/goals/step-evaluator.ts:128,171,201,266,288` — `ctx.playerPresent ? … : undefined`), and `propagation-evaluator.ts:46` declares `playerPresent` but never reads it. Recommended folding the goal-step gate into Phase 2b; awaiting David's call.
- Scoped the real-path test: a new dedicated test story under `stories/` with an entity-owned every-turn daemon, two transcripts through the bundle (default vs. omniscient). Flagged expected re-pins: `story-loader` tests `region-daemon.test.ts:213,237` and `ownership-runtime.test.ts:319-342` (assert the old gate), friendly-zoo after-hours `, once` daemons (`zoo.story:264,578,615,652`) likely re-pinning `wt-05`/`wt-06`/`timeline.transcript`; Dungeo chain expected to stay 952 byte-identical.

## Key Decisions

### 1. No implementation without approval
Per CLAUDE.md's platform-change discussion-first rule, the session stopped at presenting the design — David had said "Go" to *starting* Phase 2b, not to a specific implementation shape, so the session traced the code and laid out the design rather than editing `packages/`.

### 2. Goal-step gate scope left open
The goal-step `playerPresent` drop pattern mirrors the daemon gate exactly, but folding it into Phase 2b vs. deferring it is David's call — not decided this session.

## Next Phase
- **Phase 2b** itself is next — awaiting David's Go on the presented design (with or without the goal-step gate in scope).
- **Entry state**: fold the corrections into `plan.md` Phase 2b text (the `filterEvents` "stops dropping" claim is wrong in three places — plan, ADR-328 amendment, ADR-070 stamp `:538`); get an explicit decision on goal-step gate scope; then implement.

## Open Items

### Short Term
- David's approval on the Phase 2b design (tag propagation + three gate retirements).
- Decision: fold the goal-step `playerPresent` gate (`tick-phases.ts:827`, `step-evaluator.ts` x5, `propagation-evaluator.ts:46`) into Phase 2b or defer.
- Correct the three "`filterEvents` stops dropping" texts at landing: `plan.md` Phase 2b, the ADR-328 2026-08-27 amendment, and the ADR-070 stamp (`:538`).

### Long Term
- Pre-existing, unrelated: GitHub issue #319 (`friendly-zoo/state-assertions.transcript:19`, `yourself`).

## Files Modified

None this session — read-only design/tracing session, working tree clean.

## Notes

**Session duration**: ~1 hour (01:22–02:25 CDT).

**Approach**: Read-only code trace across `packages/text-blocks`, `packages/engine`, `packages/if-domain`, `packages/stdlib`, `packages/channel-service`, `packages/platform-browser`, `packages/story-loader`, `packages/character`, `packages/transcript-tester`, followed by a design presentation to David rather than implementation, per CLAUDE.md's platform-change discussion-first rule. David invoked `/devarch:finalize` before responding to the presented design.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (not INCOMPLETE — design phase closed cleanly, next session picks up with approval + implementation)
- **Rollback Safety**: safe to revert (no files changed)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2a landed and committed (`003b8e21`, verified this session), which Phase 2b's client-facing half depends on.
- **Prerequisites discovered**: None beyond what the plan already scoped.

## Architectural Decisions

- None written or amended this session.
- ADRs referenced (not modified): ADR-213 (§Witnessed), ADR-325 (D2, Non-goals), ADR-069 (`filterEvents` contract), ADR-328 (D3), ADR-070 (`:538` stamp) — all flagged for correction/stamping at Phase 2b's eventual landing, not touched now.

## Mutation Audit

- Files with state-changing logic modified: none.
- Tests verify actual state mutations (not just events): N/A — no code changed.
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this is a new design-tracing session for a fresh phase (2b), not a repeat of a prior blocker or bug class.

## Test Coverage Delta

- Tests added: 0.
- Tests passing before: N/A → after: N/A (no code changed this session).
- Known untested areas: Phase 2b's real path (a dedicated test story exercising an entity-owned every-turn daemon on-stage vs. off-stage through the real Chord runtime and transcript-tester) — scoped this session, not yet built.

---

**Progressive update**: Session completed 2026-08-28 02:25
