# Session Summary: 2026-09-06 - feat/secret-letter-port

## Goals
- Execute Phase 2 of `docs/work/secret-letter-port-platform-defects/plan.md` (P-6): an authored-move narration/event-order audit document plus four fixes (GH #367, #368, #373, #275).

## Phase Context
- **Plan**: `docs/work/secret-letter-port-platform-defects/plan.md` — "Land the fifteen ACCEPTED items ... against `packages/`, each with the real-path test its Done-when names."
- **Phase executed**: Phase 2 — "Authored-move narration/event order — the audit document and its four cases (P-6)" (Large)
- **Tool calls used**: 242 / 400 (session state at last progressive checkpoint; this finalization added a handful more for evidence verification)
- **Phase outcome**: Completed under budget.

## Completed

### Audit document
- `docs/architecture/authored-move-narration-and-event-order.md` (new), indexed from `docs/architecture/README.md`. States, for an authored move, the order of arrival narration, destination entering clauses, watchers, and chapter triggers, and which events an offstage move raises.

### (a) GH #367 — arrival narration order
- `packages/story-loader/src/runtime.ts`, `moveWithLifecycle`/`fireMoveArrival`: a player arrival describes first; arrival-clause narration joins the act queue behind the description (splice-at-mark, so a body's own text precedes anything a nested move deferred). The prior "outermost only" gate is dropped — every level of a re-entry chain describes (David: "Go" — walked parity). ADR-326 D5's addendum corrected to match.

### (b) GH #368 — first-visit reads the arrival event, not end-of-turn location
- `chord.visited.<room>` (packages/story-loader/src/state-keys.ts) is stamped on both arrival paths: a chain on `actor_moved` in `bind()`, and in `moveWithLifecycle`. The loader lowers a chapter's `first-visit` trigger to that state key; `packages/extensions/chapters/src/chapters-plugin.ts`'s `holds()` reads it instead of `ctx.playerLocation`. The start room is not an arrival — a `visits <start room>` chapter row never begins on its own (ADR-330 requires a `the game starts` opener).

### (c) GH #373 — offstage move raises the mover's own movement clause
- `fireMoveDeparture` (runtime.ts) fires `when <entity> moves` on a move offstage and on `remove`, with no destination. ADR-325 D3h amended to cover this case.

### (d) GH #275 — tick-side turn stamp moved to end-of-tick
- `packages/character/src/tick-phases.ts` writes `character.turn` at the END of the tick phase (previously mid-tick); `runtime.ts`'s `buildThreadTurnReady` and the thread-turn advance drop their compensating `- 1`. `scene-sub-step.test.ts` retuned to match: lastMoveTurn 2→1, markers lastTurn 2→1, D16 hold window ticks 2-4 (was 2-5), silence-occasion lastMoveTurn 5→4, NPC↔NPC silence fires at tick 4 (was 3). This aligns the tick-side stamp with the action-side window that already existed, closing the phase-entry-vs-action-side mismatch issue 275 reported.

### Tests
- `packages/story-loader/tests/authored-move-order.test.ts` (new, 9 tests, cases a-c).
- `packages/story-loader/tests/gh-275-subject-change-occasion.test.ts` (new, 2 tests, case d).
- `packages/story-loader/tests/authorial-move-describes.test.ts` — room-before-arrival assertion added.
- `packages/character/tests/tick-phases/scene-sub-step.test.ts` — player-side stamp case added, existing cases retuned.
- `packages/extensions/chapters/tests/chapters.test.ts` — retargeted to the new state-key trigger.

## Key Decisions

### 1. Walked parity for re-entry chains
David, "Go" (2026-09-06): every level of a re-entry chain describes its room before its clauses; a blocked-stall bounce renders the stall, the yell, then the landing room. This withdrew the "outermost only" rule in ADR-326 D5's original addendum — the addendum is now corrected rather than superseded by a new one.

### 2. The start room is not an arrival
A `visits <start room>` chapter row never fires on its own; ADR-330 requires an explicit `the game starts` opener. Recorded in the new audit document's §5.

## Next Phase
- **Phase 3**: "Region daemon presence and offstage-owned timer narration" (P-7) — a region's `on every turn` clause fires only while the player is in a member room (ADR-236 D4); a timer owned by an unplaced entity speaks wherever the player is (re-owned to the player).
- **Tier**: Medium (250 tool-call budget).
- **Entry state**: Phase 2 landed (shares this session's story-loader turn-order audit findings). Present both fix approaches to David before editing `packages/story-loader`.

## Open Items
- None opened in the ledger this session. The one known deferral — reverting Chapter VI's `becomes` workaround and re-pinning `enter hole`/`follow bobby`/`follow olmer` in the tree — is already scoped inside Phase 9's deliverable in the plan itself, not a floating item.
- Two pre-existing, unrelated ledger items remain open from the sibling `secret-letter-port` plan (I-c8a56c-1, I-c8a56c-2) — untouched this session.

## Files Modified
- `packages/story-loader/src/{runtime,loader,state-keys}.ts`
- `packages/extensions/chapters/src/chapters-plugin.ts`, `tests/chapters.test.ts`
- `packages/character/src/{tick-phases,character-clock}.ts`, `tests/tick-phases/scene-sub-step.test.ts`
- `packages/story-loader/tests/{authored-move-order,gh-275-subject-change-occasion,authorial-move-describes}.test.ts`
- `docs/architecture/authored-move-narration-and-event-order.md` (new)
- `docs/architecture/adrs/adr-325-chord-presence-and-duration.md` (D3h amended), `adr-326-adjacent-room-place-expression.md` (D5 addendum corrected)
- `docs/architecture/README.md` (index entry)
- `docs/work/secret-letter-port-platform-defects/plan.md` (Phase 2 DONE, Phase 3 CURRENT), `docs/proposals/secret-letter-port-platform-defects.md` (P-6 PLANNED → DONE, rule 18a)
- Build side-effects: `packages/sharpee/docs/genai-api/{character,index}.md` (regenerated), `stories/dungeo/src/version.ts` (stamp)

## Notes
- Session started: 2026-09-06 ~21:30 CDT (session b87995).
- This finalization re-ran the three suites this session's narrative had reported passing, to corroborate against a fresh state rather than trust the narrative (ADR-0019): `packages/character`'s suite had drifted from 599 to 600 tests between the reported run and the session's final edit to `scene-sub-step.test.ts` — the fresh re-run (below) is the authoritative count.

---

## Session Metadata

- **Session**: b87995
- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert — all changes are uncommitted working-tree edits on `feat/secret-letter-port`, none pushed

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 1's bundle-import fix (P-3) and tree-channel plumbing (P-4) let this phase's story-loader/tree tests run reliably, as the plan's entry state required.
- **Prerequisites discovered**: None.

## Architectural Decisions
- ADR-326 D5's addendum corrected (walked-parity re-entry narration, superseding the "outermost only" gate it originally stated).
- ADR-325 D3h amended (offstage move raises the mover's own movement clause).
- No new ADRs written this session; both are amendments to existing accepted decisions per the audit document's findings.

## Mutation Audit
- Files with state-changing logic modified: `packages/story-loader/src/runtime.ts` (move lifecycle, act-queue splice, departure event firing), `packages/story-loader/src/state-keys.ts` (visited-room state key), `packages/character/src/tick-phases.ts` (turn-stamp timing).
- Tests verify actual state mutations (not just events): YES (evidence: fresh re-run this session — `pnpm --filter '@sharpee/story-loader' test`: 124 test files passed, 1101 tests passed, 2026-09-07T02:53:17Z, after the last edit to any story-loader src or test file at 02:52:32Z; `pnpm --filter '@sharpee/character' test`: 51 test files passed, 600 tests passed, run directly by this writer 2026-09-06 22:08 CDT, after the session's last edit to `scene-sub-step.test.ts`; `pnpm --filter '@sharpee/ext-chapters' test` build-passed 2026-09-07T02:44:04Z, after its last file edit at 02:43:32Z). `authored-move-order.test.ts` and `gh-275-subject-change-occasion.test.ts` assert on room-description order and on `character.turn`/clock state directly, not on return values alone.
- If NO: N/A

## Recurrence Check
- Similar to past issue? YES — the plan itself names this as matching a recurrence class two prior sessions flagged (2026-09-04 ~23:10 and 2026-09-05 ~10:07 sessions, per `docs/work/secret-letter-port-platform-defects/plan.md` Phase 2's domain-focus note): authored-move narration and event-order gaps surfacing repeatedly as the port advanced.
- If YES: this session's counter-measure was the systemic audit document rather than another point fix — the four cases (a)-(d) are now pinned by tests and the ordering rule is written down once, for the next case in this class to check against instead of rediscovering.

## Test Coverage Delta
- Tests added: 11 new tests (9 in `authored-move-order.test.ts`, 2 in `gh-275-subject-change-occasion.test.ts`), plus one new assertion in `authorial-move-describes.test.ts` and one new case in `scene-sub-step.test.ts` (not new files).
- Tests passing before → after (evidence: fresh runs by this writer, 2026-09-06 22:08 CDT / 2026-09-07 02:53 UTC, both after the session's final source and test edits):
  - `@sharpee/story-loader`: 1101 passing (124 test files).
  - `@sharpee/character`: 600 passing (51 test files) — up from a mid-session 599 reported before the final `scene-sub-step.test.ts` edit; the fresh count supersedes it.
  - `@sharpee/ext-chapters`: 8 passing.
  - `./sharpee test branch-stories/secret-letter`: 1468 cards / 2643 assertions passing (unchanged from pre-session baseline; re-run by this writer 2026-09-06 22:0x CDT, confirms no regression).
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure`: 952 of 952 passed (re-run by this writer, confirms no regression).
- Known untested areas: none newly introduced by this phase; Phase 9's close-out re-pins the `enter hole`/`follow bobby`/`follow olmer` tree branches once the port's workarounds are reverted.

---

**Progressive update**: Session completed 2026-09-06
