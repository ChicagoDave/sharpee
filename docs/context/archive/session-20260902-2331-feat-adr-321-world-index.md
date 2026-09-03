# Session Summary: 2026-09-02 - feat/adr-321-world-index

## Goals
- Run Phase 4 "Close-out" of `docs/work/adr-320-d10-interruption/plan.md` (David: "Phase 4").

## Phase Context
- **Plan**: `docs/work/archive/adr-320-d10-interruption/plan.md` — goal was to build ADR-320's D10a interruption facet (GH #348) and close out.
- **Phase executed**: Phase 4 — "Close-out" (Small)
- **Tool calls used**: ~25 / 60
- **Phase outcome**: Completed under budget

## Completed

### W-10 watch-list resolution
`docs/work/secret-letter-port/watch-list.md` W-10 entry gained a "Resolved" block: the D10a mechanism as ruled and built, the prototype result (14 turns to the music's end vs. 28 with the lagged engine; `w10-dance.tests.json` 15 cards / 46 assertions passing), the three real-path tests by name (`packages/story-loader/tests/adr-320-d10-interruption.test.ts`, `packages/character/tests/conversation/interruption-d10a.test.ts`, `tests/tick-phases/thread-interruption.test.ts`), suite counts at commit 07e1949d (character 597, story-loader 1022, engine 680, stdlib 1663), and baseline results (Dungeo chain 952 byte-identical, fernhill 36/40, secret-letter 562/953, thealderman 4/9). Status line flipped OPEN → CLOSED (2026-09-03). Verified: `git diff docs/work/secret-letter-port/watch-list.md`.

### GitHub issue closure
GH #348 closed with the evidence comment inline (mechanism, prototype diff, real-path tests, baselines). GH #353 closed the same way — its `Closes #353` trailer on commit 07e1949d does not fire because the branch isn't merged to main. Verified via `gh issue view 348/353 --json state`: both `CLOSED`.

### ADR-320 / ADR-332 / contracts.md corrections
`docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` gained a top-level "D10a IMPLEMENTED" Status line (commits 30ff3673, 07e1949d); the D10a "Contract delta" paragraph was rewritten from the plan's prediction ("no new wire kind") to what Phase 1 actually built — `thread-parting` added to `packages/world-model/src/capabilities/scene-wire.ts`, `thread-parked` gained `partnerId`; the D10a Session line was extended through Phase 3 (was "Not implemented"). `docs/work/archive/adr-320-conversation/contracts.md` §1.3 got the one-line D10a note the amendment had promised "when Phase 1 lands" and Phase 1 had left unwritten. ADR-332's two `docs/work/adr-320-d10-interruption/plan.md` path references were repointed to the archive path.

### Plan closure and archival
Phase 4 marked DONE with evidence inline; Plan Status set to DONE; archived via `~/.claude/scripts/plan-archive.sh adr-320-d10-interruption` (moved to `docs/work/archive/adr-320-d10-interruption/`, confirmed empty at the old path). The script's own path-reference scan named six files; ADR-320, ADR-332, the watch-list, and the secret-letter-port plan were repointed to the archive path — the two session files were left as-is (historical record, not live pointers).

### .current-plan disposition
`.current-plan` returned to `docs/work/secret-letter-port/plan.md`, per that plan's standing "Superseded by" stamp from session 6a3da1 (rule 18b "still live"). Added a "Resumed: 2026-09-03, session ef1966" line under the stamp naming what the interruption plan closed and what carries forward (GH #354/#355, hold gates). This was not a fresh rule 18b event — the outgoing plan (adr-320-d10-interruption) was fully DONE, not superseded.

## Key Decisions

### 1. ADR-320's contract-delta text corrected to match the code, not the plan's prediction
The plan had said "no new wire kind"; Phase 1 built one (`thread-parting`). Per standing feedback (ADRs are reference, code + David's intent decide — amend the ADR after), the amendment now states what was built rather than leaving a stale prediction in an ACCEPTED ADR.

### 2. GH #353 closed by hand rather than waiting on a merge to main
The commit's `Closes #353` trailer only fires on merge to the default branch; closing directly keeps the tracker accurate while the branch is still open.

## Next Phase
- Plan complete — all phases of `adr-320-d10-interruption` done, plan archived.
- `.current-plan` now points to `docs/work/secret-letter-port/plan.md`; Phases 4 and 6 remain CURRENT there (Chapter 11's dance can now build on D10a).

## Open Items

### Short Term
- GH #354 (step 4a candidate order — should a seated owner get one more floor turn before an interruption challenge parks them) awaits David's ruling; the W-10 prototype keeps its hold gates until ruled.
- GH #355 (partner state pins not expressible in the tree grammar's `entity.property` head) awaits David's ruling.

### Long Term
- GH #347 (D10 shared-floor/open-address family) remains open.
- ADR-331 stays DRAFT, deliberately unbuilt.
- Carried from the prior session's Recurrence Check: a one-time audit of every-turn `while <npc> knows <topic>` clauses across the Chord corpus for tick-order sensitivity (GH #353's load-bound-hook pattern) — not done, still flagged for David's call, not actioned this session.

## Files Modified

**Docs only** (7 files, all uncommitted at session end):
- `docs/work/secret-letter-port/watch-list.md` - W-10 resolution block, Status → CLOSED
- `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` - Status line, contract-delta correction, Session line extended
- `docs/architecture/adrs/adr-332-story-reactions-before-the-actor-phase.md` - path repoint (2 references)
- `docs/work/archive/adr-320-conversation/contracts.md` - §1.3 one-line D10a note
- `docs/work/archive/adr-320-d10-interruption/plan.md` - Phase 4 → DONE, Plan Status → DONE (moved from `docs/work/adr-320-d10-interruption/plan.md`)
- `docs/work/secret-letter-port/plan.md` - "Resumed" line added
- `docs/context/.current-plan` - repointed to secret-letter-port plan

## Notes

**Session duration**: ~40 minutes (23:31–00:10 CDT).

**Approach**: Documentation-only close-out session — verified plan Phase 4 entry state via the archived plan's own Status line, wrote the evidence inline per standing feedback, closed both GitHub issues by hand, corrected the ADR to match shipped code rather than the plan's prediction, then ran the standard plan-archival and pointer-disposition steps. No source touched.

---

## Session Metadata

- **Session**: ef1966
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (all changes staged/unstaged, nothing pushed)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 3 green (real-path tests landed and passing per commit 07e1949d, per the archived plan's Phase 3 Status line and the prior session's evidence).
- **Prerequisites discovered**: None.

## Architectural Decisions

- ADR-320 (D10a amendment): contract-delta text corrected to reflect the shipped `thread-parting` wire kind rather than the plan's "no new wire kind" prediction — rationale: code + David's intent decide, ADR is reference and gets amended after (standing feedback).
- Pattern applied: rule 18b "still live" disposition (from session 6a3da1) resolved correctly — the outgoing plan (adr-320-d10-interruption) reached DONE on its own, so no new supersession judgment was needed this session, only the pointer return already promised by the stamp.

## Mutation Audit

- Files with state-changing logic modified: none — docs only.
- Tests verify actual state mutations: N/A (no source changed this session).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — this is a routine plan close-out, not a recurring blocker class.

## Test Coverage Delta

- Tests added: 0.
- Tests passing before: N/A → after: N/A — no suites run this session; the counts cited in the watch-list and ADR-320 (character 597, story-loader 1022, engine 680, stdlib 1663) are carried forward from commit 07e1949d, established in a prior session, not re-verified here [reported by session, unverified for this session — no fresh run].
- Known untested areas: none newly introduced.

---

**Progressive update**: Session completed 2026-09-03 00:10
