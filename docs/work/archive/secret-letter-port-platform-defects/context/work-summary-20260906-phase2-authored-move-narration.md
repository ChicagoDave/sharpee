# Work Summary — Secret Letter Port Platform Defects, Phase 2

**Date:** 2026-09-06
**Branch:** feat/secret-letter-port
**Target:** `docs/work/secret-letter-port-platform-defects/` (proposal `docs/proposals/secret-letter-port-platform-defects.md`, P-6)
**Plan:** `docs/work/secret-letter-port-platform-defects/plan.md`
**Session:** `docs/context/session-20260906-2130-feat-secret-letter-port.md` (full chronological record, session b87995)

## Goals
- Land P-6: a systemic audit of authored-move narration and event order, plus the four cases it governs (GH #367, #368, #373, #275) — the recurrence class two prior sessions (2026-09-04 ~23:10, 2026-09-05 ~10:07) had flagged.

## Phase Context
- **Plan**: `docs/work/secret-letter-port-platform-defects/plan.md`
- **Phase executed**: Phase 2 — "Authored-move narration/event order — the audit document and its four cases (P-6)" (Large, 400 budget)
- **Tool calls used**: 242 / 400
- **Phase outcome**: Completed under budget.

## Completed

### The audit document
`docs/architecture/authored-move-narration-and-event-order.md` (new, indexed from `docs/architecture/README.md`) states, for an authored move, the order of arrival narration, destination entering clauses, watchers, and chapter triggers, and which events an offstage move raises.

### (a) GH #367 — player arrival describes before arrival-clause narration
`packages/story-loader/src/runtime.ts`'s `moveWithLifecycle`/`fireMoveArrival`: a player arrival describes first; arrival-clause narration joins the act queue behind the description via a splice at the position the queue held before the clause bodies ran. The prior "outermost only" gate is dropped — David ruled walked parity ("Go"): every level of a re-entry chain describes its room, including a blocked-stall bounce (stall text, then the yell, then the landing room). ADR-326 D5's addendum corrected in place.

### (b) GH #368 — first-visit rides the arrival event
`chord.visited.<room>` (`state-keys.ts`) is stamped on both arrival paths — a chain on `actor_moved` in `bind()`, and in `moveWithLifecycle`. The loader lowers a chapter's `first-visit` trigger to this state key; `packages/extensions/chapters/src/chapters-plugin.ts`'s `holds()` reads it instead of `ctx.playerLocation`, fixing the case where the destination's own entering clause moves the player again in the same turn. The start room is not an arrival (ADR-330 requires an explicit `the game starts` opener).

### (c) GH #373 — offstage move raises the mover's own movement clause
`fireMoveDeparture` fires `when <entity> moves` on a move offstage and on `remove`, with no destination. ADR-325 D3h amended to cover authored moves, not only the two-clause case it originally named.

### (d) GH #275 — tick-side turn stamp aligned to the action-side window
`packages/character/src/tick-phases.ts` now writes `character.turn` at the END of the tick phase; `runtime.ts`'s `buildThreadTurnReady` and the thread-turn advance drop their compensating `- 1`. This closes the mismatch between the phase-entry stamp and the action-side window: a player-driven topic change now reliably seizes an authored `when the subject changes:` row on the same tick it should. `scene-sub-step.test.ts` retuned: lastMoveTurn 2→1, markers lastTurn 2→1, D16 hold window ticks 2-4 (was 2-5), silence-occasion lastMoveTurn 5→4, NPC↔NPC silence at tick 4 (was 3).

## Key Decisions

### 1. Walked parity for re-entry chains (David, "Go", 2026-09-06)
Every level of a re-entry chain describes its room before its clauses fire — not just the outermost move. This withdraws ADR-326 D5's original "outermost only" rule; the addendum is corrected rather than superseded, since it was the same decision point being resolved differently.

### 2. The start room is not an arrival
A `visits <start room>` chapter row never fires on its own initial placement — only an explicit `the game starts` opener begins it (ADR-330). Documented in the new audit document's §5 so the next case in this recurrence class checks this first.

## Next Phase
- **Phase 3**: "Region daemon presence and offstage-owned timer narration" (P-7) — a region's `on every turn` clause fires only while the player is in a member room (ADR-236 D4); a timer owned by an unplaced entity speaks wherever the player is (re-owned to the player, per David's ruling in the proposal's acceptance).
- **Tier**: Medium (250 tool-call budget).
- **Entry state**: Phase 2 landed, sharing this session's story-loader turn-order audit findings. Present both fix approaches to David before editing `packages/story-loader` (per plan and CLAUDE.md's platform-changes-require-discussion rule).

## Open Items

### Short Term
- None opened this session — the one known deferral (see below) is scoped inside Phase 9 of the plan itself.

### Long Term
- Phase 9 close-out carries: revert Chapter VI's `becomes` workaround (`black-gate.chord:54`) back to the `visits` row; re-pin `enter hole`/`follow bobby`/`follow olmer` in the tree once that revert lands.

## Files Modified

**Platform (packages/)** (9 files):
- `packages/story-loader/src/runtime.ts` - arrival narration splice, departure-clause firing
- `packages/story-loader/src/loader.ts` - first-visit trigger lowered to the visited-room state key
- `packages/story-loader/src/state-keys.ts` - `chord.visited.<room>` key
- `packages/story-loader/tests/authored-move-order.test.ts` (new) - 9 tests, cases (a)-(c)
- `packages/story-loader/tests/gh-275-subject-change-occasion.test.ts` (new) - 2 tests, case (d)
- `packages/story-loader/tests/authorial-move-describes.test.ts` - room-before-arrival assertion added
- `packages/extensions/chapters/src/chapters-plugin.ts` - `holds()` reads the state key
- `packages/extensions/chapters/tests/chapters.test.ts` - retargeted to the new trigger
- `packages/character/src/tick-phases.ts`, `character-clock.ts`, `tests/tick-phases/scene-sub-step.test.ts` - end-of-tick turn stamp, retuned windows

**Docs** (5 files):
- `docs/architecture/authored-move-narration-and-event-order.md` (new) - the audit document
- `docs/architecture/README.md` - index entry
- `docs/architecture/adrs/adr-326-adjacent-room-place-expression.md` - D5 addendum corrected
- `docs/architecture/adrs/adr-325-chord-presence-and-duration.md` - D3h amended
- `docs/work/secret-letter-port-platform-defects/plan.md` - Phase 2 marked DONE with outcome; Phase 3 advanced to CURRENT

**Build side-effects** (3 files, incidental to `./repokit build dungeo`):
- `packages/sharpee/docs/genai-api/character.md`, `index.md` - regenerated API reference
- `stories/dungeo/src/version.ts` - version stamp

## Notes

**Session duration**: ~1.5 hours (session start ~21:30 CDT through phase close ~22:10 CDT, per session state and event log timestamps).

**Approach**: Presented the four-case approach (plus the re-entry-chain narration question) to David before editing; David's "Go" resolved case (a) toward walked parity. Implemented all four cases together since they share the same story-loader turn-order code paths, then wrote the audit document last, capturing the now-implemented order as the reference for future cases in this recurrence class.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert — all changes are uncommitted working-tree edits on `feat/secret-letter-port`, none pushed.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1's bundle-import fix (P-3) and tree-channel plumbing (P-4) let this phase's story-loader/tree tests run reliably.
- **Prerequisites discovered**: None.

## Architectural Decisions

- ADR-326 D5's addendum corrected (walked-parity re-entry narration).
- ADR-325 D3h amended (offstage move raises the mover's own movement clause).
- No new ADRs; both are in-place corrections to existing accepted decisions, driven by the audit document's findings.

## Mutation Audit

- Files with state-changing logic modified: `packages/story-loader/src/runtime.ts` (act-queue splice, departure event firing), `packages/story-loader/src/state-keys.ts` (visited-room state key), `packages/character/src/tick-phases.ts` (turn-stamp timing).
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/story-loader' test` — 124 test files passed, 1101 tests passed, 2026-09-07T02:53:17Z, after the last story-loader src/test edit at 02:52:32Z; `pnpm --filter '@sharpee/character' test` — 51 test files passed, 600 tests passed, re-run directly by this writer 2026-09-06 22:08 CDT, after the session's last edit to `scene-sub-step.test.ts`; `pnpm --filter '@sharpee/ext-chapters' test` build-passed 2026-09-07T02:44:04Z, after its last edit at 02:43:32Z).
- If NO: N/A

## Recurrence Check

- Similar to past issue? YES — the plan's Phase 2 domain-focus note names this as matching the recurrence class two prior sessions flagged (2026-09-04 ~23:10, 2026-09-05 ~10:07): authored-move narration and event-order gaps surfacing repeatedly during the port.
- If YES: this session's counter-measure was a systemic audit document (not another point fix) covering all four known cases at once, so the ordering rule is written down for the next case in this class to check first.

## Test Coverage Delta

- Tests added: 11 (9 in `authored-move-order.test.ts`, 2 in `gh-275-subject-change-occasion.test.ts`), plus one assertion added to `authorial-move-describes.test.ts` and one new case in `scene-sub-step.test.ts` (not new files).
- Tests passing before → after (evidence: fresh runs by this writer, 2026-09-06 22:0x CDT):
  - `@sharpee/story-loader`: 1101 passing (124 test files).
  - `@sharpee/character`: 600 passing (51 test files) — a mid-session run reported 599 before the final `scene-sub-step.test.ts` edit; the fresh count supersedes it.
  - `@sharpee/ext-chapters`: 8 passing.
  - `./sharpee test branch-stories/secret-letter`: 1468 cards / 2643 assertions passing (unchanged, confirms no regression).
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure`: 952 of 952 passed (confirms no regression).
- Known untested areas: none newly introduced. Phase 9's close-out re-pins the `enter hole`/`follow bobby`/`follow olmer` tree branches once the port's own workarounds are reverted.

---

**Progressive update**: Session completed 2026-09-06
