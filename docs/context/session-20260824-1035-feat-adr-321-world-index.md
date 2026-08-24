# Session Summary: 2026-08-24 - feat/adr-321-world-index

## Goals
- Triage the open issue backlog and decide what to do next with the paused Secret Letter port
- Plan, design, implement, and verify Phase 1 (#316) of the resulting platform-fixes plan

## Phase Context
- **Plan**: `docs/work/backlog-tier1-2-platform/plan.md` — "Eight platform issues filed by the Secret Letter port's Phase 6 rounds, worked in two tiers"
- **Phase executed**: Phase 1 — "Looking consults gated detail text the same way examining does (#316)" (Medium)
- **Tool calls used**: 137 / 150 (session budget; Phase 1's own plan budget is 250)
- **Phase outcome**: Completed under budget for implementation and verification. The phase's own Exit State also requires "#316 closed on GitHub," which had not happened yet as of this checkpoint — plan.md's Phase 1 status line already reflects this ("Remaining for DONE: commit, then close #316") and was left as-is rather than flipped to DONE.

## Completed

### Issue triage pass
- `docs/work/issue-triage/triage-20260824.md`: backlog at 80 open; movement since yesterday — #304 closed, #311-#318 filed.
- Created and applied the `testing-ux-revamp` GitHub label to the ten parked issues (#193, #194, #198, #239, #240, #243, #244, #252, #253, #254), recommended by both prior triage passes.
- Key finding: the paused Secret Letter port's own runway is blocked by its own filings — #315/#316 gate the gates increment, #311 gates the chase increment.
- Tiers named: Tier 1 = #316, #315, #311 (the port's own blockers); Tier 2 = the scope-and-grammar seam (#313, #314, #317, #318, #312).

### Secret Letter port paused
- `docs/work/secret-letter-port/plan.md` stamped `Superseded by` under rule 18b's "still live" disposition, per David's "pause the port." Phases 4 and 6 left untouched; `.current-plan` returns there once the new plan reaches DONE.

### New plan: backlog-tier1-2-platform
- `docs/work/backlog-tier1-2-platform/plan.md` — 8 phases: Tier 1 implementation (Phases 1-3), one seam-design conversation (Phase 4), then Tier 2 implementation (Phases 5-8). `.current-plan` repointed here.
- plan-review ran and found 1 CONTRADICTION (Phase 3 had misapplied ADR-295's exit-resolver mandate to #311's story-move effects; ADR-325's place expressions are the nearer precedent) plus 3 TENSIONs (ADR-240 D6's last-wins registry constraint bearing on #315's fix; ADR-273 D4's deliberately-ported NPC-inventory reachability rule bearing on #313; ADR-268 D2's unconditional story-tier rule bearing on #317). All four folded into the plan text.

### Phase 1 (#316) — designed, elegance-reviewed, implemented, verified
- The elegance+alignment review moved the fix from stdlib's `looking` action to the render point: all three emitters of `if.event.room.description` (`looking.ts:94`, `going.ts:601` arrival, `switching_on.ts:333` light-reveal) hand-assemble their event data separately and converge only in `engine/src/prose-pipeline/handlers/room.ts` — which already consults render-world gates (the ADR-209 snippet splice) and already renders through the slot-capable `if.room.description_body` template. David ruled: fix at the render point, room-level clauses only (a contained entity's `detail while` stays examine-only).
- `packages/engine/src/prose-pipeline/handlers/room.ts` — reads `getStateClauses(room)` (the ADR-195 S2 registry examining already consults) and fills a new `{slot:detail}` channel via `renderViaPhrase`'s `__slots__` staging.
- `packages/lang-en-us/src/language-provider.ts` — `if.room.description_body` template changed to `'{verbatim:description}{slot:detail}{slot:here}'`.
- `packages/engine/tests/prose-pipeline/handlers/room-detail-slot.test.ts` — new, 4 tests asserting on rendered output (gated line present when its condition holds, absent when it doesn't).
- `branch-stories/secret-letter/secret-letter.tests.json` — restored the trimmed Fruit Stall `look` assertion (the "phrase detail while calm:" banana line) — the issue's own named acceptance check.

### Phase 2 (#315) — blocked-exit lines compose instead of last-wins
- David challenged the initial compose proposal ("seems hacky breaky potentially dangerous"); a deep dive followed before implementing. Findings: the read contract was always one-value-per-key (`packages/stdlib/src/actions/standard/going.ts:136`/`:143`, `packages/stdlib/src/actions/standard/exit-legality.ts:50`); zero existing stories carry a multi-line direction; the `mergeArms` idiom (`packages/story-loader/src/runtime.ts:799`) is the loader's established declaration-order merge precedent; two real dangers were found — the blocked/message evaluator pair can drift if composed independently, and world-index's `gateIndex` (`packages/world-index/src/reach.ts:149`, `Map.set`) had the same last-wins clobber at the IR layer. David ruled the revised shape 2026-08-24.
- Implementation: `packages/story-loader/src/runtime.ts` `registerDerivedEvaluators` — one `selectArm` closure per (room, direction), declaration order, first-true-wins, condition-less line = always-true fallback; `exitBlockedKey := selectArm ≠ undefined`, `exitMessageKey := selected arm's phrase` (single selection, no drift). `packages/world-index/src/reach.ts` — `GateIndex` now holds all arms per edge; `obstacleOn` blocks while any arm holds, opens only when every holding arm is liftable, condition-less arm anywhere = permanent block. `packages/chord/src/analyzer.ts` — new warning `analysis.blocked-exit-unreachable` for a blocked line after a condition-less line on the same direction. Story: `grubbers-market.chord` wires both gates-locked arms (hunted, chase) beside the calm deflection; the earlier clobber comment was retired.
- New tests: `packages/story-loader/tests/blocked-exit-compose.test.ts` (4), `packages/world-index/tests/multi-arm-gates.test.ts` (2), `packages/chord/tests/blocked-exit-unreachable.test.ts` (4). Tree pins: calm-deflection trunk card after boot + branch 9 on the eat-apple card (swept lockout).
- Verification (2026-08-24, re-run this pass to corroborate the unit counts): `pnpm --filter '@sharpee/chord' run test:ci` → 991 passed (991); `pnpm --filter '@sharpee/story-loader' run test:ci` → 610 passed (610); `pnpm --filter '@sharpee/world-index' run test:ci` → 169 passed | 1 skipped (170, the skip is pre-existing). `./sharpee test branch-stories/secret-letter` (160 cards / 209 assertions passing) and the Dungeo walkthrough chain (952 passing in 17 transcripts at the pinned seed) were not re-run this pass — those two counts are [reported by session, unverified].
- Note recorded: two arms covering an entity's whole state space are a permanent block in disguise; the static walk analyzes per-arm at start state and won't catch it (same approximation class as ADR-321's stopcock note).
- Phase 1 was committed earlier this session as `45dce17d` and #316 closed. The Phase 2 commit follows this summary update; #315 closes with it.

## Key Decisions

### 1. Render-point fix over a stdlib-only fix
Landing #316's fix in engine's shared room-description handler, rather than in stdlib's `looking` action alone, means `going`'s arrival description and `switching_on`'s light-reveal get the same gated-detail treatment for free — all three converge at one render point already.

### 2. Pause the port; work its own blockers as one combined platform plan
David's "pause the port," combined with the triage finding that the port's own filings block its next increments, led to a single Tier-1+Tier-2 plan (`docs/work/backlog-tier1-2-platform/plan.md`) rather than resuming the port directly or fixing the eight issues piecemeal.

### 3. Seam design before Tier 2 implementation
Phase 4 of the new plan is one design conversation (no code) covering all five Tier-2 issues together, since plan-review and the triage doc both treat them as facets of one parser-scope/story-grammar seam rather than five independent bugs.

### 4. Single-selection arm model, not independent composition (Phase 2, #315)
The first compose proposal treated `exitBlockedKey` and `exitMessageKey` as two independently-composed values; David flagged it as risky before implementation. The revised design derives both keys from one `selectArm` closure per (room, direction) — first-true-wins in declaration order, condition-less line as an always-true fallback — so the blocked flag and the message text can never drift apart, by construction rather than by discipline.

### 5. Fix world-index's `gateIndex` clobber alongside the loader fix
The deep dive for #315 surfaced a second, independent last-wins bug: world-index's `GateIndex` (`reach.ts:149`) used `Map.set` per edge, silently keeping only the last-declared arm at the IR layer. Left alone, the static analyzer would have kept reasoning about a single-arm model even after the loader started reading all of them. Fixed in the same phase so runtime and static analysis agree on the multi-arm model.

## Next Phase
- **Phase 3**: "#311 — random-adjacent-room" — an ADR is expected for this one; the entry state is a design discussion with David before implementation, not a ruled mechanism yet.
- **Entry state**: Phase 2 (#315) is done — implemented, tested, and verified 2026-08-24; #315 closes with its commit. Phase 3 has not started; per rule 8a/11-style discipline, David wants the design conversation first (likely a new Chord place-expression / adjacency primitive) before any code is written.

## Open Items

### Short Term
- Commit Phase 2's changes and close #315 on GitHub with the verification evidence — immediate next step after this summary (Phase 1 was already committed as `45dce17d`, #316 closed).
- Phase 3 (#311, random-adjacent-room) design discussion with David before any implementation — an ADR is expected out of it.

### Long Term
- Phases 3-8 of the new plan remain PENDING: #311's Chord place-expression / adjacency primitive (likely ADR-worthy), the Tier 2 seam design, and its four implementation phases (#313/#312 scope predicates, #314 grammar coverage, #317 story-grammar scoping, #318 cross-turn clarification state — also likely ADR-worthy).
- Static-analysis approximation noted in Phase 2: two arms that together cover an entity's whole state space are a permanent block in disguise; the per-arm-at-start-state static walk won't catch it (same approximation class as ADR-321's stopcock note) — worth a future look if it causes a real false-negative.
- Secret Letter port Phases 4 and 6 stay paused, resumable once this plan reaches DONE.

## Files Modified

**Platform code — Phase 1** (3 files):
- `packages/engine/src/prose-pipeline/handlers/room.ts` - reads gated state-clauses for room descriptions, fills new `{slot:detail}` channel
- `packages/lang-en-us/src/language-provider.ts` - `if.room.description_body` template gains `{slot:detail}`
- `packages/engine/tests/prose-pipeline/handlers/room-detail-slot.test.ts` - new, 4 tests

**Platform code — Phase 2** (6 files):
- `packages/story-loader/src/runtime.ts` - `registerDerivedEvaluators` builds one `selectArm` closure per (room, direction); first-true-wins in declaration order, condition-less line = fallback
- `packages/world-index/src/reach.ts` - `GateIndex` holds all arms per edge instead of last-write-wins; blocks while any arm holds, opens only when every holding arm is liftable
- `packages/chord/src/analyzer.ts` - new `analysis.blocked-exit-unreachable` warning for a blocked line declared after a condition-less line on the same direction
- `packages/story-loader/tests/blocked-exit-compose.test.ts` - new, 4 tests
- `packages/world-index/tests/multi-arm-gates.test.ts` - new, 2 tests
- `packages/chord/tests/blocked-exit-unreachable.test.ts` - new, 4 tests

**Story content** (2 files):
- `branch-stories/secret-letter/secret-letter.tests.json` - restored trimmed Fruit Stall `look` assertion (Phase 1)
- `branch-stories/secret-letter/grubbers-market.chord` - wires both gates-locked arms (hunted, chase) beside the calm deflection; retires the earlier clobber comment (Phase 2)

**Planning/process** (4 files):
- `docs/work/backlog-tier1-2-platform/plan.md` - new, 8-phase plan; updated again through Phase 2 (compose-vs-diagnostic ruling folded in, Phase 1 and Phase 2 status)
- `docs/work/secret-letter-port/plan.md` - supersession stamp (rule 18b "still live")
- `docs/work/issue-triage/triage-20260824.md` - new triage pass
- `docs/context/.current-plan` - repointed to the new plan

## Notes

**Session duration**: ~5.5 hours (started ~10:35 local).

**Approach**: Triage-first session — audited the issue backlog, made a pause/redirect call on the in-flight Secret Letter port, planned the resulting platform work, then executed and fully verified its first phase before checkpointing. The test/build claims below were independently re-run this pass (fresh `./repokit build dungeo`, fresh unit-test and tree-document runs) rather than taken from the session's own narrative — the event log (`docs/context/.devarch-events-915e68.jsonl`) had rows confirming the `pnpm test:ci` runs but none for the `./sharpee test branch-stories/secret-letter` or Dungeo walkthrough-chain commands specifically, so those two were re-run directly to corroborate.

---

## Session Metadata

- **Status**: COMPLETE (unverified: the mutation-verification agent's GREEN grading of Phase 1's 4 new tests — the agent's run is confirmed by the event log, but its grading output was not independently reproduced this pass; and Phase 2's `./sharpee test branch-stories/secret-letter` (160 cards / 209 assertions) and Dungeo walkthrough-chain (952 in 17 transcripts) counts, reported by the session but not re-run this pass — Phase 2's unit-suite counts for chord/story-loader/world-index WERE independently re-run and confirmed exact-match this pass)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — this checkpoint is mid-plan; Phases 2-8 remain, no single time estimate given this session
- **Rollback Safety**: safe to revert — no commit made this session; all changes are uncommitted working-tree edits

## Dependency/Prerequisite Check

- **Prerequisites met**: Secret Letter port's Phase 6 filings (#311-#318) existed and were triaged before planning; ADR-090, ADR-195, ADR-209, ADR-240, ADR-268, ADR-269, ADR-270, ADR-273, ADR-295, and ADR-325 were all read and cited in the new plan's "References consulted."
- **Prerequisites discovered**: None beyond what plan-review surfaced — its 1 CONTRADICTION and 3 TENSIONs were folded directly into the plan text rather than requiring a separate follow-up.

## Architectural Decisions

- No new ADR written this session. Phase 1's fix explicitly extends existing patterns rather than inventing one: ADR-195 S2's state-clause registry (the same registry `examining` already consults) and ADR-209's snippet-gate splice point (engine's shared room handler).
- The plan flags two future phases as likely ADR-worthy, neither confirmed by David yet: Phase 3 (#311 — a new Chord place-expression / adjacency-movement language surface) and Phase 4/8 (#318 — cross-turn parser clarification state).
- Pattern applied: render-point consolidation — three separate event emitters converging on one shared handler — rather than a stdlib-only fix.

## Mutation Audit

- Files with state-changing logic modified: `packages/engine/src/prose-pipeline/handlers/room.ts` (reads the world-model state-clause registry and composes the rendered room-description output).
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/engine' test room-detail-slot` — re-run this pass, 2026-08-24, 4 tests passed, asserting the rendered room-description output includes the gated detail line when its condition holds and excludes it when false; event log confirms the mutation-verification agent completed at `2026-08-24T15:54:53Z`, after the last edit to `room.ts` at `15:52:50Z` — its GREEN grading of these 4 tests is [reported by session, unverified], per the Status qualifier above).
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — no prior session in this repo's context flagged the room-description/gated-detail convergence gap; this is the first time the three emitters' divergence from `examining`'s registry consult was found and fixed.

## Test Coverage Delta

- Tests added: 4 (`room-detail-slot.test.ts`) + 1 restored assertion in `branch-stories/secret-letter/secret-letter.tests.json` (assertion count 201 → 202).
- Tests passing before: N/A (new test file) → after: `@sharpee/engine` 637 passed / 7 skipped (evidence: `pnpm --filter '@sharpee/engine' run test:ci`, re-run this pass, 2026-08-24, after the `room.ts` edits completed at 15:52:32-15:52:50Z); `@sharpee/lang-en-us` 430 passed (evidence: `pnpm --filter '@sharpee/lang-en-us' run test:ci`, re-run this pass, 2026-08-24, after the `language-provider.ts` edit at 15:52:25Z); `./sharpee test branch-stories/secret-letter` — 157 cards passing, 202 assertions passing (evidence: re-run this pass, 2026-08-24, after the `secret-letter.tests.json` edit at 15:55:19Z); Dungeo walkthrough chain — 952 tests in 17 transcripts, 952 passed (evidence: fresh `./repokit build dungeo` followed by `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`, re-run this pass, 2026-08-24).
- Known untested areas: none flagged for Phase 1's scope.

---

**Progressive update**: Session completed 2026-08-24 (checkpoint through Phase 2 — #315 fixed, tested, verified; #316 already committed and closed. Phase 3 (#311) needs a design discussion with David before implementation.)
