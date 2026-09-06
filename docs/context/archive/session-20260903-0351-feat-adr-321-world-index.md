# Session Summary: 2026-09-03 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Re-review `docs/proposals/publish-readiness-defects.md` after last session's folds; fix what the review finds.
- Fold the Tier 1/2 platform plan (`docs/work/backlog-tier1-2-platform/plan.md`, Phases 4–8) into a new publish-readiness plan; close GH #248 as already built.

## Completed
- Session start: recap presented, pre-session-audit relayed verbatim, core concepts read, profile fresh (2026-08-30), gate cleared.
- `proposal-review` second pass (session 639650): 3 blocking (P-18 DECISION-IN-DISGUISE against ADR-273 D4; P-16/P-18/P-19/P-20/P-21 DUPLICATE of the live tier plan's Phases 4–8; P-34 DUPLICATE of go-live Phase 6a, built 2026-08-08), 1 prior finding withdrawn (P-20's held-command placement is ADR-225's, ACCEPTED 2026-07-15), 3 advisory (P-13 issue text stale — `Span.file` exists; P-39 waits on the #355 pin-form ruling; P-44 freeze vs ADR-331 OQ2).
- GH #248 closed with the go-live 6a evidence (`wipeStoryStorage` is prefix-only — P-34's "nothing outside it" holds as built).
- Proposal fixed: second-review record in the header; P-13 issue text corrected (`Span.file` exists); P-16/P-19/P-21 stamped as folded tier phases; P-18 reworded to keep ADR-273 D4's `OpenInventoryTrait` opt-in; P-20 ACCEPTED on ADR-225 (expiry as an ADR-225 amendment with the fix); P-34 DONE as built; P-39 sequenced after the #355 pin-form ruling; P-44 freeze sharpened against ADR-331 OQ2. Count: 41 ACCEPTED, 1 DONE, 3 PROPOSED.
- `docs/proposals/phase-6-fallout.md` P-3: the wrong "superseded by P-34, no plan file" stamp withdrawn; DONE via go-live Phase 6a.
- Tier plan dispositioned (rule 18b, David's ruling): Plan Status DONE with Phases 1–3 delivered, Phases 4–8 marked ABANDONED-here/folded; archived to `docs/work/archive/backlog-tier1-2-platform/`. The archive script listed five files still naming the old path — all history references, left as written.
- `session-planner` wrote `docs/work/publish-readiness/plan.md` (18 phases; Phase 1 CURRENT = the three gating ADR amendments + three design rulings; tier Phases 4–8 absorbed as Phases 1/5/7/8/9); `.current-plan` moved there; the port plan stamped "Superseded by … still live" (Phases 4 and 6 stay CURRENT); the proposal's 40 ACCEPTED items flipped PLANNED, the count corrected from 41.
- `plan-review`: 2 CONTRADICTIONS (the freeze declared at Phase 6 vs P-44's "from P-1's first fix", which as written forbade the proposal's own fixes; Phase 7 editing `packages/chord/src/stdlib-manifest.ts` inside the plan's own package-based freeze), 3 advisory (P-39's gate is David's default, not a ruling; Fernhill's `.transcript` suite is gone since the ADR-307 migration so P-33's markers do not exist; two "41 ACCEPTED" lines). All five fixed: P-44 (1) reworded in the proposal (freeze = nothing outside the proposal's items from P-1's first fix; the plan dates the full freeze), the plan declares the freeze at the end of Phase 9, Phase 7/8 freeze claims withdrawn, Phase 16 confirms the addendum default with David, Phase 12 re-derives the seven from #245 and pins them in `fernhill.tests.json`.

## Key Decisions
- David (2026-09-03): fold the tier plan into publish-readiness; close #248; fix the proposal per the review.
- P-18 takes the opt-in path (ADR-273 D4 unchanged) per the review's recommendation under David's "fix the proposal" — reversible; the Chord spelling of the opt-in is Phase 1's to choose.

## Open Items
- Carried: the every-turn `while <npc> knows <topic>` tick-order audit (runs inside P-11/P-17).
- The archived tier plan's old "pointer returns here after the ADR-327 plan" stamp is history now; the staleness sweep should stop raising it once archived.

## Files Modified
- `docs/work/publish-readiness/plan.md` — new (session-planner), then plan-review fixes (freeze moved to Phase 9; Phases 5, 6, 7, 9, 12, 16, 18 and the standing rules edited)
- `docs/context/.current-plan` — now `docs/work/publish-readiness/plan.md`
- `docs/work/secret-letter-port/plan.md` — "Superseded by" stamp (still live)
- `docs/proposals/publish-readiness-defects.md` — second-review record; P-13, P-16, P-18, P-19, P-20, P-21, P-34, P-39, P-44 edited; 40 items flipped PLANNED (planner); P-44 (1) reworded after plan-review
- `docs/proposals/phase-6-fallout.md` — P-3 status corrected to DONE via go-live 6a
- `docs/work/archive/backlog-tier1-2-platform/plan.md` — dispositioned (DONE; Phases 4–8 folded) and archived from `docs/work/backlog-tier1-2-platform/`
- `docs/context/session-20260903-0351-feat-adr-321-world-index.md` — this file

## Notes
- Session started: 2026-09-03 03:51 CDT (session 639650)
- No source code, tests, or builds this session — documentation only (proposal review + fixes, plan disposition, new plan, plan-review + fixes).

---

## Session Metadata

- **Session**: 639650
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — nothing pushed yet; GH #248 closed with a comment is the one external side effect

## Dependency/Prerequisite Check

- **Prerequisites met**: `docs/work/backlog-tier1-2-platform/plan.md` (Phases 4-8, source of the fold) and `docs/proposals/publish-readiness-defects.md` (prior session's folds) were both present and current.
- **Prerequisites discovered**: None.

## Architectural Decisions

- None this session. The three gating ADR amendments are scheduled as Phase 1 of `docs/work/publish-readiness/plan.md` and have not started — David has not yet said "go."

## Mutation Audit

- N/A — documentation-only session; no source files or side-effect functions were touched.

## Recurrence Check

- YES — the every-turn `while <npc> knows <topic>` tick-order audit was flagged again by `pre-session-audit` this session (5th consecutive carry across prior sessions; no single prior filename tracked here). This is the first session it has a planned home: `docs/work/publish-readiness/plan.md` Phase 6. Consider a one-time audit of NPC turn-tick ordering once Phase 6 is reached, since a pattern surfacing five times unaddressed is the kind of recurrence rule 19 exists to catch.

## Test Coverage Delta

- Tests added: 0.
- Tests passing before/after: No test changes this session.
- Known untested areas: N/A.

---

**Progressive update**: Session completed 2026-09-03 04:18 CDT
