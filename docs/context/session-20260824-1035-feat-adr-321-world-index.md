# Session Summary: 2026-08-24 - feat/adr-321-world-index

## Goals
- Triage the open issue backlog and decide what to do next with the paused Secret Letter port
- Plan, design, implement, and verify Phase 1 (#316) of the resulting platform-fixes plan

## Phase Context
- **Plan**: `docs/work/backlog-tier1-2-platform/plan.md` — "Eight platform issues filed by the Secret Letter port's Phase 6 rounds, worked in two tiers"
- **Phase executed**: Phase 1 (#316) and Phase 2 (#315) — both implemented and tested this session; Phase 3 (#311) opened but did not reach implementation
- **Tool calls used**: 137 / 150 as of the Phase 2 checkpoint (session budget); count not retaken for the subsequent ADR/interview work
- **Phase outcome**: Phases 1-2 completed under budget. Phase 3's design conversation (ADR-326) escalated through a language-level gap (ADR-327) into a platform-architecture proposal (ADR-328, "actors are a platform concept") — DRAFT, fully interviewed, direction confirmed, ACCEPTED flip still pending David. Phase 3 itself stays PENDING behind ADR-326's two remaining open questions, which are now sequenced behind ADR-328/327 landing first.

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

### Phase 3 opened (#311) — ADR-326 drafted, interview paused
- ADR-326 "adjacent-room place expression" (`docs/architecture/adrs/adr-326-adjacent-room-place-expression.md`, DRAFT). Mechanism ruled: extends ADR-325's place-expression family — loader-evaluated, seeded per-mover stream, adjacency = traversable exits via the going read points — not ADR-295's exit resolver, matching the CONTRADICTION plan-review had already flagged against the original Phase 3 sketch.
- Open-questions interview started: Q-1 (candidate filter) resolved — David: "we've gone down this road and it's in lessons learned" — no filter clause; blocked-stall exclusion is story composition (`chord-lessons-learned-timers.md` lessons 1/5/8). Two questions remain OPEN (article/noun spelling; computed-exit directions); 326 stays DRAFT, interview paused.

### Language reform surfaced mid-interview — ADR-327 drafted
- David's NPC question on the bounce-rule example exposed that `after entering it` fires for any going actor with no word for the enterer, and that move-effect arrivals fire no entering clause at all (`runtime.ts:3915` emits no `actor_moved`).
- David's rulings across the conversation: clause heads should name their actor ("an IF language should be explicit"); `for <actor>` rejected (collides with timer ownership); subject-position won (`on the player taking`, the `when the player moves` pattern); forcing the actor lets heads lose `it`; then "I hate 'it' with a passion" — syntactic `it`/`its` leaves the language entirely.
- Full gerund assessment run: ~40 wired gerunds + customs across 4 buckets, two mechanical hazards found, and the finding that only the player fires these paths today — plugin-npc never touches the pipeline.
- ADR-327 "explicit references" drafted (`docs/architecture/adrs/adr-327-explicit-references.md`, DRAFT, 3 open questions: forced-actor vs player-only runtime; the trait-carrier reference — the one load-bearing `it`, `mercenaries.chord:250`; own-block bare heads). Not yet interviewed.

### ADR-327 Q-1 escalated to platform direction — impact analysis, ADR-328
- David: "NPCs need to be pulled into the platform." Impact analysis written at `docs/work/actor-platform/impact-analysis-20260825.md` (Sharpee / Chord / Dungeo): CommandExecutor accepts-then-ignores `actorId`; stdlib `NpcService` is an 832-line shadow action system (no validate/interceptors/dispatch); 126 `context.player` reads across 49 action files; prose is second-person by convention — clarified per David to person-generic voice for ALL actors (first/second/third), rotating PC (ADR-319/Reflections) the live requirement; Chord loader does perception's job by hand; Dungeo has 5 NPCs on the shadow system and the 952-test chain re-pins by design.
- ADR-328 "actors are a platform concept" drafted and interviewed to completion (`docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md`): D1 one execution path (action, actorId); D2 programmatic execution entry; D3 perception-gated witnessing; D4 person-generic voice with the FULL template sweep landing up front (David: "full sweep"); D5 `NpcService`'s execution half DELETED, no compatibility layers (David: "dissolve — we don't keep compatibility layers"); D6 Dungeo's five NPCs rewrite in the same cutover, chain re-pins; D7 the Chord acting surface IS designed in this program (David corrected an initial misread — his actual answer was (b)).
- `adr-review` run: 12/12 checked, READY as a direction umbrella; two broken ADR links fixed in 328 plus one in 326 during the review.
- Status: DRAFT — David has not yet answered the ACCEPTED flip; `/devarch:finalize` was invoked instead of answering, and the flip offer stands for next session.

### Process/feedback
- New memory saved: answer yes/no questions directly, one line (David: "I am not a mechanical alien"); MEMORY.md index compacted under the size limit.
- One misread corrected mid-interview (ADR-328 Q2: David's parenthetical was a joke; actual answer (b), refolded).

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

### 6. ADR-326 extends the place-expression family, not the exit resolver
Ruled during design: #311's random-adjacent-room mechanism is loader-evaluated and seeded per-mover, following ADR-325's place-expression precedent, rather than ADR-295's exit resolver — matching the CONTRADICTION plan-review had already flagged against the original Phase 3 sketch.

### 7. No candidate-filter clause on adjacent-room selection
David: exclusion logic (e.g., a blocked stall) belongs in story composition, not a platform filter clause — this ground was covered before and the lesson is recorded in `chord-lessons-learned-timers.md` (lessons 1/5/8).

### 8. Clause heads name their actor; `it`/`its` leave the language
The ADR-326 open-questions interview surfaced that action clauses are implicitly player-scoped. David ruled clause heads must be explicit about which actor they fire for (subject-position syntax, e.g. `on the player taking`) and then extended the ruling to remove pronominal `it`/`its` from clause syntax entirely ("I hate 'it' with a passion") — captured as ADR-327, not yet interviewed.

### 9. NPCs become a platform concept, not a story-layer shadow system
David's "NPCs need to be pulled into the platform" turned an ADR-327 open question into its own program. ADR-328 rules one execution path for every actor (player and NPC alike), deletes `NpcService`'s execution half with no compatibility shim, and requires Dungeo's five NPCs to rewrite in the same cutover — consistent with David's standing "no backward compatibility" and "dissolve, don't shim" positions.

### 10. Person-generic voice, full sweep up front
Rather than defer prose-template rework, David chose to land the full second-person-to-person-generic template sweep as part of ADR-328's initial cutover (D4), driven by the live requirement from ADR-319/Reflections' rotating-PC design.

## Next Phase
- **Phase 3**: "#311 — random-adjacent-room" — mechanism ruled (ADR-326, extends ADR-325's place-expression family) but not yet implementable: two open questions remain (article/noun spelling; computed-exit directions) and the interview is paused.
- **Entry state**: Phase 2 (#315) is done — implemented, tested, and verified 2026-08-24; #315 closes with its commit. ADR-326's remaining open questions now sequence behind two upstream ADRs it surfaced mid-interview: ADR-328 ("actors are a platform concept," DRAFT and interviewed, awaiting David's ACCEPTED flip) lands first, then ADR-327 ("explicit references," DRAFT, 3 open questions, not yet interviewed — its Q-1 now reads through ADR-328's landing order), then ADR-326's own remaining questions, before Phase 3 code starts.

## Open Items

### Short Term
- Commit Phase 2's changes and close #315 on GitHub with the verification evidence (Phase 1 was already committed as `45dce17d`, #316 closed).
- Resolve ADR-328's ACCEPTED flip with David — the offer stands from this session's `adr-review`/finalize; David has not yet answered.
- Interview ADR-327's three open questions once ADR-328's direction is settled (its Q-1 now reads through ADR-328's landing order).
- Resume ADR-326's interview for its two remaining open questions (article/noun spelling; computed-exit directions) once 327/328 settle — then Phase 3 (#311) implementation can start.

### Long Term
- Once ADR-328 flips ACCEPTED, its child ADRs/plans need to be written: the actor-platform program's CommandExecutor path unification, `NpcService` execution-half deletion, Dungeo's five-NPC rewrite (with chain re-pins), and the Chord acting-surface design (D7).
- Phases 3-8 of the new plan remain PENDING: #311's Chord place-expression / adjacency primitive (ADR-326, mechanism ruled, gated on the ADR chain above), the Tier 2 seam design, and its four implementation phases (#313/#312 scope predicates, #314 grammar coverage, #317 story-grammar scoping, #318 cross-turn clarification state — also likely ADR-worthy).
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
- `docs/work/backlog-tier1-2-platform/plan.md` - new, 8-phase plan; updated through Phase 2 (compose-vs-diagnostic ruling folded in), then again with a Phase 2 DONE stamp and a Phase 3 status note (blocked on the ADR chain)
- `docs/work/secret-letter-port/plan.md` - supersession stamp (rule 18b "still live")
- `docs/work/issue-triage/triage-20260824.md` - new triage pass
- `docs/context/.current-plan` - repointed to the new plan

**ADRs and platform design** (5 files):
- `docs/architecture/adrs/adr-326-adjacent-room-place-expression.md` - new, DRAFT, #311 mechanism ruled (ADR-325's place-expression family), 2 open questions remain, interview paused
- `docs/architecture/adrs/adr-327-explicit-references.md` - new, DRAFT, 3 open questions, not yet interviewed
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` - new, DRAFT, interviewed to completion (D1-D7), `adr-review` READY as a direction umbrella, ACCEPTED flip pending David
- `docs/work/actor-platform/impact-analysis-20260825.md` - new, Sharpee/Chord/Dungeo impact analysis for pulling NPCs into the platform
- `~/.claude` memory files (not in repo) - new yes/no-directness feedback memory; MEMORY.md index compacted under the size limit

## Notes

**Session duration**: ~5.5 hours to the Phase 2 checkpoint (started ~10:35 local, 2026-08-24), continuing through the evening of 2026-08-24 into 2026-08-25 for the ADR-326/327/328 design and interview work.

**Approach**: Triage-first session — audited the issue backlog, made a pause/redirect call on the in-flight Secret Letter port, planned the resulting platform work, then executed and fully verified its first two phases before checkpointing. Phase 3's design conversation then escalated through two further ADRs into a platform-architecture proposal, interviewed to completion but not yet accepted. The test/build claims for Phases 1-2 were independently re-run that pass (fresh `./repokit build dungeo`, fresh unit-test and tree-document runs) rather than taken from the session's own narrative — the event log (`docs/context/.devarch-events-915e68.jsonl`) had rows confirming the `pnpm test:ci` runs but none for the `./sharpee test branch-stories/secret-letter` or Dungeo walkthrough-chain commands specifically, so those two were re-run directly to corroborate. The subsequent ADR/interview/impact-analysis work is documentation and design only — no code was written and no test/mutation claims apply to it.

---

## Session Metadata

- **Status**: COMPLETE (unverified: the mutation-verification agent's GREEN grading of Phase 1's 4 new tests — the agent's run is confirmed by the event log, but its grading output was not independently reproduced this pass; and Phase 2's `./sharpee test branch-stories/secret-letter` (160 cards / 209 assertions) and Dungeo walkthrough-chain (952 in 17 transcripts) counts, reported by the session but not re-run this pass — Phase 2's unit-suite counts for chord/story-loader/world-index WERE independently re-run and confirmed exact-match this pass)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — this checkpoint is mid-plan; Phases 3-8 remain, plus the ADR-328/327/326 chain must resolve before Phase 3 code starts; no single time estimate given this session
- **Rollback Safety**: safe to revert — Phase 1 was committed earlier this session (`45dce17d`); Phase 2's code changes and this update's new ADR/impact-analysis/plan files remain uncommitted working-tree edits

## Dependency/Prerequisite Check

- **Prerequisites met**: Secret Letter port's Phase 6 filings (#311-#318) existed and were triaged before planning; ADR-090, ADR-195, ADR-209, ADR-240, ADR-268, ADR-269, ADR-270, ADR-273, ADR-295, and ADR-325 were all read and cited in the new plan's "References consulted." ADR-326's design re-consulted ADR-325 and ADR-295 directly; ADR-328's impact analysis newly draws in ADR-319 (rotating-PC voice requirement), ADR-090 (capability dispatch), and the CommandExecutor/`NpcService` source itself.
- **Prerequisites discovered**: Plan-review's 1 CONTRADICTION and 3 TENSIONs were folded directly into the plan text. Separately, ADR-326's interview surfaced an unstated prerequisite the plan hadn't scoped: clause-head actor-explicitness (ADR-327), which itself surfaced a further prerequisite — NPC execution as a platform concern (ADR-328) — neither anticipated when the plan was written.

## Architectural Decisions

- Phase 1's fix explicitly extends existing patterns rather than inventing one: ADR-195 S2's state-clause registry (the same registry `examining` already consults) and ADR-209's snippet-gate splice point (engine's shared room handler).
- ADR-326 "adjacent-room place expression" — DRAFT, extends ADR-325's place-expression family; two open questions remain, interview paused.
- ADR-327 "explicit references" — DRAFT, 3 open questions, not yet interviewed; surfaced from ADR-326's interview when clause-head actor-scoping needed a name of its own.
- ADR-328 "actors are a platform concept" — DRAFT, interviewed to completion (D1-D7), `adr-review` READY as a direction umbrella (12/12 checked, two broken links fixed), ACCEPTED flip pending David's answer.
- Impact analysis (`docs/work/actor-platform/impact-analysis-20260825.md`) grounds ADR-328's scope: CommandExecutor's ignored `actorId`, `NpcService`'s 832-line shadow system, 126 `context.player` reads across 49 action files, Dungeo's 5 shadow-system NPCs.
- Pattern applied: render-point consolidation for Phase 1 (three separate event emitters converging on one shared handler); a three-ADR escalation chain for Phase 3 — a local design question (#311 adjacency) surfaced a language gap (explicit references) which surfaced a platform-architecture gap (actors), each captured as its own ADR rather than folded into the one ahead of it.

## Mutation Audit

- Files with state-changing logic modified: `packages/engine/src/prose-pipeline/handlers/room.ts` (reads the world-model state-clause registry and composes the rendered room-description output).
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/engine' test room-detail-slot` — re-run this pass, 2026-08-24, 4 tests passed, asserting the rendered room-description output includes the gated detail line when its condition holds and excludes it when false; event log confirms the mutation-verification agent completed at `2026-08-24T15:54:53Z`, after the last edit to `room.ts` at `15:52:50Z` — its GREEN grading of these 4 tests is [reported by session, unverified], per the Status qualifier above).
- If NO: N/A
- The ADR-326/327/328 and impact-analysis work added this update is documentation/design only — no source files with state-changing logic were modified; not subject to this audit.

## Recurrence Check

- Similar to past issue? NO — no prior session in this repo's context flagged the room-description/gated-detail convergence gap; this is the first time the three emitters' divergence from `examining`'s registry consult was found and fixed. The ADR-326→327→328 escalation chain is also novel in this repo's context — no prior session recorded a design question cascading through three ADRs in one sitting.

## Test Coverage Delta

- Tests added: 4 (`room-detail-slot.test.ts`) + 1 restored assertion in `branch-stories/secret-letter/secret-letter.tests.json` (assertion count 201 → 202).
- Tests passing before: N/A (new test file) → after: `@sharpee/engine` 637 passed / 7 skipped (evidence: `pnpm --filter '@sharpee/engine' run test:ci`, re-run this pass, 2026-08-24, after the `room.ts` edits completed at 15:52:32-15:52:50Z); `@sharpee/lang-en-us` 430 passed (evidence: `pnpm --filter '@sharpee/lang-en-us' run test:ci`, re-run this pass, 2026-08-24, after the `language-provider.ts` edit at 15:52:25Z); `./sharpee test branch-stories/secret-letter` — 157 cards passing, 202 assertions passing (evidence: re-run this pass, 2026-08-24, after the `secret-letter.tests.json` edit at 15:55:19Z); Dungeo walkthrough chain — 952 tests in 17 transcripts, 952 passed (evidence: fresh `./repokit build dungeo` followed by `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`, re-run this pass, 2026-08-24).
- No test changes for the ADR-326/327/328/impact-analysis work added this update — pure design and documentation, no source touched.
- Known untested areas: none flagged for Phase 1's scope.

---

**Progressive update**: Session completed 2026-08-25 (checkpoint through ADR-328's full interview — Phase 1/#316 and Phase 2/#315 implemented and tested 2026-08-24; Phase 3/#311 opened, mechanism ruled in ADR-326 but blocked on 2 open questions; those questions in turn surfaced ADR-327 (explicit references, DRAFT, 3 open questions, not yet interviewed) and ADR-328 (actors are a platform concept, DRAFT, interviewed to completion, `adr-review` READY, ACCEPTED flip pending David).
