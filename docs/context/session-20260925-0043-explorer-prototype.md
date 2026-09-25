# Session Summary: 2026-09-25 - explorer-prototype

## Goals
- Answer David's question after the explorer week: is there a deterministic path to a reasonably complete testing suite for a large Chord story?
- Draft, interview, and (if David accepts) land the ADR that records the answer.

## Phase Context
- **Plan**: `docs/work/testing-explorer/plan-20260924-518-reader-walk.md` (GH #518, `collectStateReaders`) — resolved via `.current-plan`, but both its phases were already DONE and its **Plan Status: DONE** before this session started (2026-09-24, session 700415).
- **Phase executed**: None — this session's work (drafting and accepting ADR-356) was direct, off-plan work per David's instruction ("go ahead and draft the ADR"), not execution of a plan phase.
- **Tool calls used**: 80 (no budget — off-plan work).
- **Phase outcome**: N/A — no plan phase was in scope this session.

## Completed

### Session start and GH cleanup
- Recap of the #518 session relayed, pre-session-audit block relayed verbatim, project profile regenerated (`dev-context-detector`, was 7 days old), `docs/core-concepts/README.md` read in full, gate cleared.
- GH #515, #517, #518 closed as shipped, each comment citing its landing commit (c0a5cc6bf, f5365bb13, c05335e17).

### Design discussion → measured baseline
- David rejected incremental next-steps and posed the actual question: is there a deterministic path to a reasonably complete suite, or does this stay "experimental"?
- Conclusion reached in conversation: the hand-authored tree and transcript files are the same recorded-path artifact and fail identically at scale (ADR-355's 93% rewrite on one session); the compiled IR already contains every rule as a precondition/action/effects triple; state can be arranged directly instead of planned to (removes the GH #507 planner/heuristic dependency from the critical path); completeness is measured against IR-derived denominators, not estimated.
- Clause-branch counts pulled from committed `dist/*.ir.json` with a scratch node script: fernhill 31 entity `on` clauses + 3 trait `on` clauses, 3 `select-on` arms, 2 `refuse-when`, 1 `win`, 1 `lose`, 6 topics, 1 machine, 2 sequences/5 steps; secret-letter 197 + 41 `on` clauses, 75 `refuse-when`, 4 `when`, 41 topics, 13 timers, 0 endings. (These are the counts as measured; the committed ADR table rounds/re-presents some rows — read the ADR for the exact published table.)

### ADR-356 written, interviewed, reviewed, accepted
`docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md` — **ACCEPTED** (David, 2026-09-25, "yes, mark it accepted").
- Written per direct instruction after the design discussion.
- Rule-11a open-questions interview run one question at a time, each folded immediately:
  - **Q-1** ("a"): the `arrange(world, expression)` primitive is a public function of `@sharpee/story-loader`, not `branch-tester` or `world-index`.
  - **Q-2** ("a"): the first cut arranges the floor only — entity state, placement, holdings, player location, story phase, openable/lockable/switchable trait flags — measured green on fernhill first; everything else (occurrence ordinals, topic history, timer phases, timer-driven NPC positions) is SKIPPED with a named shape until secret-letter's SKIPPED counts justify the next shape.
  - **Q-3** ("a"): the derived suite runs by default under `sharpee test`; a derived failure fails the build; a SKIPPED branch never does (D5a).
  - **Q-4**: David overturned the draft's assumption. On "how do you test an ending deterministically without a walkthrough," the answer is you don't — but `WALKTHROUGH.txt` is not that walkthrough ("walkthrough.txt is just an artifact and has no bearing on testing for a chord story"). He chose the test tree's own lines instead: a line that reaches an ending *is* that ending's walkthrough, and "the author has to provide the shape of winning states."
  - **Q-5**: "an ending is a declarative state. A card would block additional commands in that card and show a message for END STATE" — folded as the END STATE card (D4); D4 asserts against the card's declared ending id, no prose re-check.
  - Open Questions section removed after the fifth fold.
- `adr-review` run inline: 21/21 after four folds — card count corrected 566→639 per ADR-355; the arrange grammar pinned to the assertion core's exact pin forms (replacing an invented `player holds`); `is gone` and `emitted` stated explicitly as new claim kinds the assertion core gains; new **D9** added, a supersession-owner table for ADR-353 D7, ADR-353 D8/Phase 16, and ADR-340 D5. 23 citations verified during review, including `analyzer.ts:7235`, `tree-walker.ts:368`, `assertion-core.ts:296`, and GH #506/#507/#509–#514 confirmed still OPEN.
- David accepted with no further changes. **No implementation is authorized** — every decision (D1–D9) reaches `packages/` (`world-index`, `story-loader`, `branch-tester`, `chord`), and CLAUDE.md gates each on its own platform-change discussion before a plan phase touches it.

## Key Decisions

### ADR-356 D1–D9 (ACCEPTED)
- **D1**: rule tests are derived from the compiled IR, one per clause branch (`on` clauses, `select-on` arms, `refuse-when`/`must`, `when`, topic answers, machine transitions, sequence steps, timer phases) — a static `@sharpee/world-index` enumerator beside `collectStateWriters`/`collectStateReaders`, never hand-transcribed and never a path-planning search.
- **D2**: a rule test arranges its precondition directly (never plays to it) via the same `states:` pin grammar the assertion core already reads, exposed as a new public `arrange(world, expression)` in `@sharpee/story-loader` (Q-1); an unsupported shape is SKIPPED with a named reason, never silently dropped, and counts against D5's coverage; the first cut is floor-only (Q-2).
- **D3**: each rule test runs exactly one real command through the real parser/engine (ADR-293 D12 preserved — no model) and asserts effects via ADR-340's assertion core, which gains two new claim kinds (`is gone`, `emitted`); a refusal test also asserts the guarded body's negative space.
- **D4**: endings are proved by the test tree's own lines, not `WALKTHROUGH.txt` (Q-4); an ending-reaching card becomes an END STATE card that blocks further commands (Q-5); this changes `tree-walker.ts:368`'s revive-after-ending behavior — a line now ends where the story ends.
- **D5/D5a**: completeness is three IR-denominated ratios (branches/endings/rooms) with unexercised branches named by source span; the derived suite is default-on and build-failing on a real rule failure, never on a SKIP (Q-3).
- **D6**: the derived suite is never stored — generated at test time only, so it cannot reinstate the tree's 93%-rewrite churn in a new format; the tree's format and job don't change, only its expected size shrinks.
- **D7**: ADR-294 D23's lenses stay diagnostics — on-demand, budgeted, "absence is not proof" — and never gate a build or count toward D5.
- **D8**: Dungeo and its `.transcript` world are untouched (outlier per standing project direction).
- **D9**: a supersession-owner table naming three records this ADR touches (ADR-353 D7, ADR-353 D8/Phase 16, ADR-340 D5) and assigning note-writing to the plan phase that lands D4 — not to ADR-356's acceptance, which authorizes nothing.
- **David's Q-5 ruling is the exact ruling ADR-353 D8 held Phase 16 open for** ("ended vs. failed," "no session may close it by inferring") — D9 records it in writing so Phase 16 can close on a ruling David gave rather than one inferred from what gets built.

## Next Phase
- No plan governs ADR-356's implementation yet. Filed as an open item (issue #520) rather than started: a `session-planner` pass for the `story-loader` `arrange()` primitive and the `world-index` clause enumerator together, scoped to the Q-2 floor, measured on fernhill — pending David's go-ahead, since every Affected module needs its own CLAUDE.md platform-change discussion first.

## Open Items

### Short Term
- #520: Plan ADR-356's first cut — `story-loader` `arrange()` + `world-index` clause enumerator, measured against fernhill; blocked on David starting the platform-change discussion, not on any technical unknown.
- #521: Schedule the `packages/chord` fix — predicate conditions carry no `span` (`analyzer.ts:7235`), first surfaced in the #518 session; ADR-356's clause enumerator (D1) will make the gap visible to authors, but the fix itself is compiler work, not part of the enumerator.

### Long Term
- (none raised this session)

## Files Modified

**Docs/architecture** (1 file):
- `docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md` — new, ACCEPTED

**Session/context** (2 files):
- `docs/context/project-profile.md` — regenerated by `dev-context-detector` (was stale)
- `docs/context/session-20260924-1541-explorer-prototype.md` — hook-appended activity log from the prior session, not this session's authored content

## Notes

**Session duration**: ~45 minutes (started 2026-09-25 00:43 MDT per session state; ended ~03:05 local).

**Approach**: design-first — a measurement pass over the compiled IR grounded the ADR's claims before writing it, then a strict one-question-at-a-time interview resolved every open question with David overturning at least one drafted assumption (Q-4) rather than rubber-stamping it.

**Plan-archival gap noted, not fixed this session**: `.current-plan` still points at `plan-20260924-518-reader-walk.md`, whose **Plan Status: DONE** was set in a prior session (2026-09-24, session 700415). Per this agent's own rule, archival (`plan-archive.sh`) fires only for a Plan Status this agent sets to DONE in the same run — this session didn't touch that plan, so it's flagged here for visibility rather than archived.

**Issue-store degradation note**: none — the store answered normally (`issues.sh list-open`, `issues.sh create` ×2); no `[reported by session, unverified]` markers apply to the Open Items above.

---

## Session Metadata

- **Session**: 082049
- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (ADR accepted; no phase in flight)
- **Rollback Safety**: safe to revert (docs-only change: one new ADR file, one regenerated profile)

## Dependency/Prerequisite Check

- **Prerequisites met**: GH #515/#517/#518 (the prior session's `collectStateReaders` work) already shipped and closed, giving `world-index` the read-side derivation ADR-356 D1 builds beside.
- **Prerequisites discovered**: none — the session's blocker-free path was itself the finding (a deterministic design exists without new tooling dependencies).

## Architectural Decisions

- **ADR-356** (ACCEPTED, this session): "The story is the test suite" — see Key Decisions above for D1–D9. Supersedes nothing outright; D9 records three touched-but-not-superseded decisions (ADR-353 D7, ADR-353 D8/Phase 16, ADR-340 D5), each note owed by the future plan phase that lands D4.
- No platform code was changed — ADR-356 explicitly authorizes none.

## Mutation Audit

- Files with state-changing logic modified: none (docs-only session).
- Tests verify actual state mutations: N/A — no code changed.

## Recurrence Check

- Similar to past issue? NO — this session's pattern (design conclusion reached by inline measurement, then ADR + interview + review in one sitting) does not match a prior session in this corpus that I found. ADR-355's own prior 93% rewrite is the *evidence* ADR-356 responds to, not a recurrence of a process problem in this session.

## Test Coverage Delta

- Tests added: 0 (no code changed this session)
- Tests passing before/after: N/A — no test runs performed or required
- Known untested areas: N/A

---

**Progressive update**: Session completed 2026-09-25 03:05
