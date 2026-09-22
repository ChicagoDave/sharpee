# Session Summary: 2026-09-22 - explorer-prototype

## Goals
- Decide issue #508: pivot the testing-explorer from exhaustive/planning search to scoped lenses.
- Plan the first lens (mentioned-but-not-examinable).

## Phase Context
- **Plan**: `docs/work/testing-explorer/plan-20260922-examinable-lens.md` — "Build and ship the first scoped lens for the testing-explorer" (written this session).
- **Phase executed**: none. Phase 1 — "Lens core — a running report against fernhill" (Medium) — was written and set CURRENT; no implementation work against it started this session.
- **Tool calls used**: 109 / 250 (session total; the 250 budget belongs to Phase 1's not-yet-started execution).
- **Phase outcome**: Not started. This was a decision-and-planning session — the deliverable is the plan itself, not code against it.

## Completed

### Issue #508 decided — pivot to scoped lenses
Comment posted: https://github.com/ChicagoDave/sharpee/issues/508#issuecomment-5779633303
- The testing-explorer pivots from exhaustive/planning search to scoped lenses.
- ADR-294 D20 ("bounded exhaustive play") is retired as the mechanism; the ADR amendment recording this is deferred until the first lens exists to cite it (Phase 4 of the new plan carries this forward explicitly).
- Lenses are real-path: the parser and engine decide outcomes, never a vocabulary-matching heuristic standing in for the verdict.
- The walker's existing room-reachability traversal (`tools/explorer-probe/explore.js`, declared-mode) is the shared substrate every lens reuses rather than re-deriving.
- #507 (planner degenerates to blind search without a landmark heuristic) is parked, not closed. #505 and #506 are unchanged.
- First lens picked: mentioned-but-not-examinable. Candidate lenses for after it were listed in the decision comment.

### First lens planned
`session-planner` wrote `docs/work/testing-explorer/plan-20260922-examinable-lens.md` — 4 phases, Phase 1 CURRENT (since 2026-09-22). Key research finding folded into the plan: `@sharpee/world-index` already ships a corpus-pinned `extractNounPhrases` (ADR-321 D6b), so the lens needs no new NLP dependency — it reuses the extractor for phrase generation but executes `examine <phrase>` through the real engine (`game.executeCommand`) for the verdict, never through the static check's vocabulary resolver. A manual plan-review pass found no contradictions against the References Consulted list; one advisory TENSION was raised (ADR-322 D7's soundness contract — the report must carry `stopReason` and rooms-reached-vs-total, not imply exhaustiveness) and the main session decided to fold that requirement directly into Phase 1's exit state rather than defer it.

## Key Decisions

### 1. Plan supersession disposition (rule 18b) — Avalonia plan stays "still live"
`.current-plan` moved from `docs/work/chord-writer-avalonia-production/plan.md` to the new lens plan. Per rule 18b, the outgoing Avalonia plan still had non-terminal phases, so its disposition needed David's call before the pointer moved. His answer, after two rounds of clarification: the lens plan grew directly out of the IDE work (the Avalonia plan's channel-IO/testing phase is started, and the IDE's testing surface is waiting on how testing itself should be done), so the lens plan runs first and the IDE plan resumes once the testing approach is settled — this is "still live," not "done but unmarked" or "abandoned." The Avalonia plan was stamped `**Superseded by**: docs/work/testing-explorer/plan-20260922-examinable-lens.md — still live`, every phase left untouched, resumable at exactly the phase it reached (Phase 4/8 per its own slice ordering). It was not archived — option 2 deliberately leaves the plan live per rule 18b's own text.

### 2. Real-path execution over vocabulary matching, as the lens's defining constraint
Both the #508 decision and the new plan's Phase 1 design fix this as non-negotiable: a lens verdict comes from `game.executeCommand` and the resulting event's `messageId`, never from text matching or from the static vocabulary-resolver used elsewhere in the codebase. This was carried into the plan's design-question record (extraction / default-response detection / execution surface) rather than left as a one-line constraint, so Phase 1 has to justify each design choice against it explicitly.

## Next Phase
- **Phase 1**: "Lens core — a running report against fernhill" — refactor `explore.js` to expose a reusable `onRoomFirstSeen` hook, build `tools/explorer-probe/lens-examinable.js` driving it, classify each phrase's examine outcome by `messageId` (resolved-described / resolved-default / not-in-scope / ambiguous), and run it against fernhill (9 rooms) with hand-verified output.
- **Tier**: Medium (250 tool-call budget).
- **Entry state**: `explore.js`/`dimensions.js` already work (measured: fernhill 9/9 rooms ~4s, secret-letter 18/18 ~28s, `--hash declared` mode); `@sharpee/world-index` is built and exports `extractNounPhrases`/`readsAsThing`; `branch-stories/fernhill/dist/fernhill.ir.json` is compiled.
- Awaiting David's go — nothing in Phase 1 was started this session.

## Open Items

### Short Term
- #508: pivot decided and posted; not yet closed — Phase 4 of the lens plan carries "update #508 to record the pivot as executed" as its own deliverable, once the first lens ships.
- #507: parked (planner degenerates to blind search without a landmark heuristic) — no action this session, carried as-is.

### Long Term
- #505: engine has no state/history/bookkeeping partition, blocking ADR-294 D20's dedup — unchanged, its relevance is now historical (D20 is retired as the lens mechanism).
- #506: build the factored explorer (dependency-graph search + combinatorial dimension coverage) — unchanged, not picked as a candidate lens this session.

## Files Modified

**Planning** (3 files):
- `docs/context/.current-plan` - repointed from the Avalonia plan to the new lens plan
- `docs/work/chord-writer-avalonia-production/plan.md` - `Superseded by` stamp added per rule 18b; no phase status changed
- `docs/work/testing-explorer/plan-20260922-examinable-lens.md` - new, 4-phase plan, Phase 1 CURRENT

**Context** (1 file):
- `docs/context/session-20260922-1051-explorer-prototype.md` - this summary (hand-started, expanded here; the state file's `files`/event log still carry its earlier filename, `session-20260922-1600-explorer-prototype.md` — same file, renamed to the correct `summaryPrefix` this session)

## Notes

**Session duration**: ~4 hours elapsed (started 10:51 CDT), but the active work was concentrated at the ends: the #508 decision landed by ~10:54 CDT, then a roughly 3h15m gap (David away/deliberating) before the session-planner ran at ~14:09 CDT and the rest of the planning and disposition work followed in the next ~25 minutes.

**Approach**: Decision-only session — no code, no tests, no builds. The two goals were resolved through conversation and a session-planner run, not implementation.

**A prior-session discrepancy was noted but not investigated further**: session a33939's summary said `plan.js` was uncommitted; git shows it landed in `bf63f9111`. Recorded for visibility, not resolved this session.

**Open Items ids not independently re-verified against `issues.sh list-open`**: the store returns 145 open (DevArch-labelled) issues, oldest-first, capped at 50 per call — #505-508 fall outside that window by recency. Their titles/status above are otherwise carried directly from this session's own source material (the #508 decision comment and prior context), not filed or closed through the issue store this session.

---

## Session Metadata

- **Session**: 760fe6
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: `@sharpee/world-index`'s `extractNounPhrases`/`readsAsThing` confirmed real and built (`packages/world-index/dist/index.js`), verified by `session-planner`'s own research rather than assumed; `tools/explorer-probe/explore.js` and `dimensions.js` confirmed working from the prior session's measurements (fernhill/secret-letter walk times).
- **Prerequisites discovered**: none blocking — the plan's Phase 1 entry state is fully satisfied.

## Architectural Decisions

- ADR-294 D20 ("bounded exhaustive play") retired as the testing-explorer's mechanism, per the #508 decision — amendment text deferred to the new plan's Phase 4, once the first lens exists to cite.
- No ADR was written or modified this session. The new plan's References Consulted section cites ADR-294, ADR-308 D1, ADR-321 D5/D6b/D10/D11, ADR-322 D6-D9, and ADR-273 as design constraints for Phase 1 — read and applied, not amended.
- Pattern applied: real-path execution (parser + engine decide) as the lens's defining constraint, fixed in both the #508 decision and the plan's design-question record.

## Mutation Audit

- Files with state-changing logic modified: none — this session touched only plan/pointer documents.
- Tests verify actual state mutations: N/A
- N/A: no code was written this session.

## Recurrence Check

- Similar to past issue? NO — this session's only friction was the two-round clarification needed to reach the rule 18b disposition, which is the rule working as designed, not a recurring defect.

## Test Coverage Delta

- Tests added: 0
- Tests passing before/after: no test changes this session
- Known untested areas: N/A (no code written)

---

**Progressive update**: Session completed 2026-09-22 14:32 CDT (approximate, from the last recorded session event)
