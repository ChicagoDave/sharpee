# Session Summary: 2026-09-22 - explorer-prototype

## Goals
- Prototype ADR-294 D20 ("the explorer — bounded exhaustive play") in response to David's pushback that the testing UX is "too mechanical," and his framing of the alternative: a graph of all possibilities with likely actions discernable.
- Measure the prototype against fernhill and secret-letter on a dedicated branch, without touching `packages/`.

## Phase Context
- **Plan**: No active plan. `.current-plan` points to `docs/work/chord-writer-avalonia-production/plan.md`, unrelated and untouched this session; this work is a spike, not a decomposed plan.
- **Phase executed**: N/A — spike work, not a plan phase.
- **Tool calls used**: 126 (session total, per `.session-state-a33939.json`; no phase budget applies).
- **Phase outcome**: N/A.

## Completed

### Explorer probe tool
- Wrote `tools/explorer-probe/explore.js`: a breadth-first state-space walker built entirely on public surfaces — `loadAuthorGame` to boot the story, and the engine's existing save/restore hooks as the fork primitive (the same pattern `transcript-tester/src/search.ts` uses for ADR-293 D12). Candidate commands are derived from room exits plus each in-scope entity's traits. No `packages/` code was touched.

### Measurement spike
- Ran the probe against fernhill (9 rooms) and secret-letter, wrote findings to `docs/work/testing-explorer/spike-20260922-explorer-measurement.md`.
- Confirmed the fork primitive is sound: save/restore round-trips byte-identically (~4ms save, ~2ms restore; 859 cmd/s fernhill, ~350 cmd/s secret-letter — consistent with the ~640/s ADR-353 measured for the tree runner).
- Falsified ADR-294 D20's proposed dedup mechanism: "a hash of the canonical snapshot deduplicates states" measured at 1.0025 new states per command — effectively zero dedup. Traced to five independent bookkeeping carriers in the snapshot (capabilities.commandHistory with wall-clock timestamps, capabilities.textState, state.chord.rng, state.chord.occurrence.*, state.character.turn), four found on fernhill and the fifth only on secret-letter — two stories gave two different blocklists, so a hand-maintained exclusion list is the wrong shape.
- Measured the identity-sensitivity of object placement on fernhill: with placement in the identity, 34,654 states / 207,607 commands / 240s, did not finish (19,609 queued, depth 12). With placement ignored (deliberately unsound — can't see "the key is in the cellar"): 174 states, 2.6s, exhausted, all 9 rooms, depth 21. A 200x difference from one identity choice.
- Tested David's mid-session suggestion to throw more cores at it: branching factor is ~2.4x/depth on fernhill, 5.4-6.3x on secret-letter. At 6.3x, 8 cores buys ~1.1 extra depth level, 64 cores buys ~2.3. secret-letter reached depth 6 in 240s; a walkthrough is 50-200 moves. Parallelism is the wrong lever.
- Found a real, previously unreached defect: secret-letter's `renderMessage("stall-lift-quietly")` fails with `param 'item' is not bound` — an authored phrase whose template never renders. Fired 10,021 times for this one defect, which is why a findings surface has to fold by defect, not occurrence. Filed as issue #504.
- The key finding: profiling identity-component cardinality over 4,000 states showed `loc` (containment) = 3,102 distinct values, `state` = 254, `flags` = 27, and ~20 individual `chord.state.<ware>` keys at 2 each. secret-letter mirrors placement into its own per-ware binary state, so stripping containment loses nothing. ~20 independently-takeable market wares is a 2^20 combination space — a **product of independent dimensions**, not a graph (taking the pear doesn't interact with taking the lime). BFS spends its whole budget crossing dimensions that never interact.

## Key Decisions

### 1. The explorer is viable, but never as exhaustive play
Bounded exhaustive graph search cannot cover a story whose state is dominated by independent, combinable dimensions (secret-letter: ~2^20 from wares alone). The state-identity rule — what counts as "the same state" — is the product decision here, not an implementation detail, and the story's own component cardinality is what reveals whether a space is graph-shaped or product-shaped.

### 2. Dedup needs a state/history partition the engine doesn't have yet
ADR-294 D20's hash-based dedup fails not from a bug but from a category gap: the engine cannot currently distinguish game state from history/presentation/bookkeeping in its snapshot. A hand-maintained blocklist per story is the wrong shape (fernhill and secret-letter disagreed on it). Filed as issue #505 — this is the real prerequisite for D20, ahead of any dedup implementation work.

### 3. Direction for the next spike: factor, don't brute-force
The path forward is not more cores and not a smarter graph traversal — it's factoring state into dimensions from the story's own declarations, searching the dependent structure (rooms, doors, puzzle chains, rule preconditions) exhaustively, and covering independent dimensions combinatorially (pairwise coverage is the standard answer to the measured shape; it is proposed, not yet measured). Filed as issue #506. This also answers the underlying UX complaint without repeating the rejected "author-written promises curating the tree" approach (correctly rejected earlier as still being author labor) — factoring is derived from the story's own trait/room declarations, consistent with ADR-308 D1 ("navigation is derived, never authored").

## Next Phase
- No active plan — this was a spike, not a plan phase. The next unit of work is issue #506 (factored explorer: dependency-graph search + combinatorial dimension coverage), which David asked to continue with next.

## Open Items

### Short Term
- #504: secret-letter: renderMessage('stall-lift-quietly') fails — param 'item' not bound
- #505: Engine has no state/history/bookkeeping partition — blocks ADR-294 D20's dedup

### Long Term
- #506: Build the factored explorer: dependency-graph search + combinatorial dimension coverage

## Files Modified

**New (this session)** (2 files):
- `tools/explorer-probe/explore.js` — breadth-first state-space explorer using public save/restore surfaces
- `docs/work/testing-explorer/spike-20260922-explorer-measurement.md` — measured findings write-up

*(`branch-stories/secret-letter/secret-letter.tests.json` and three `docs/context/session-2026-09-22-*-main.md` files show modified in `git status` but were already dirty at session start per `.session-state-a33939.json`'s `dirtyBaseline` — not attributed to this session.)*

## Notes

**Session duration**: ~2 hours (started 06:49 CDT on `main`; branch `explorer-prototype` created mid-session off `main`).

**Approach**: Built the probe against public engine surfaces only (no `packages/` changes), ran it against both target stories, then let the measured numbers — not the ADR's proposed mechanism — decide the next design step. Two of David's mid-session suggestions (parallel branch spawning, hash-based dedup as specified) were tested directly and both measured out; the pivot to combinatorial coverage came from profiling identity-component cardinality, not from guessing.

**Evidence caveat**: the quantitative findings above (throughput, state counts, branching factors, defect fire count) are the session's own measurements from running `explore.js` in conversation; no test/build event-log row backs them and this agent did not re-run the probe independently to corroborate. See Status qualifier below.

---

## Session Metadata

- **Session**: a33939
- **Status**: COMPLETE (unverified: measured throughput/state-count/branching-factor figures in Completed and Key Decisions — no event-log corroboration exists for these research measurements, and this agent did not independently re-run the probe)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (session's stated goal — prototype + measure — was met; #506 is a new unit of future work, not a remainder of this one)
- **Rollback Safety**: safe to revert — new files only, nothing committed yet, no `packages/` changes

## Dependency/Prerequisite Check

- **Prerequisites met**: public `loadAuthorGame` entry point and engine save/restore hooks, both pre-existing and unmodified; the same fork pattern already proven by `transcript-tester/src/search.ts` (ADR-293 D12).
- **Prerequisites discovered**: a state/history/bookkeeping partition in the engine's snapshot does not exist and is now tracked as issue #505 — a prerequisite for ADR-294 D20 that wasn't visible until measured.

## Architectural Decisions

- ADR-294 D20 (the explorer): its proposed hash-based dedup measured as non-functional (1.0025 new states/command); the concept survives but its dedup mechanism does not, per Key Decision 2.
- ADR-308 D1 ("navigation is derived, never authored"): cited as the reason a factored/combinatorial explorer is consistent with prior direction while an author-curated tree (rejected earlier) was not.
- ADR-353: its ~640 cmd/s tree-runner measurement is the reference point this session's 859/350 cmd/s throughput numbers were checked against.
- Pattern applied: fork-via-save/restore, reused from `transcript-tester/src/search.ts` (ADR-293 D12) rather than inventing a new mechanism.

## Mutation Audit

- Files with state-changing logic modified: none — `explore.js` is a research probe under `tools/`, not `packages/` production code; no side-effect business logic was authored or changed this session.
- Tests verify actual state mutations (not just events): N/A — no production mutation code was touched.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — searched prior `docs/context/session-2026*.md` for "explorer" and "D20"; no matches. This is the first session to prototype ADR-294 D20.

## Test Coverage Delta

- Tests added: 0 — `explore.js` is a probe tool, not a test suite.
- Tests passing before: N/A → after: N/A — no test suite changes this session.
- Known untested areas: secret-letter's `stall-lift-quietly` phrase (issue #504) is confirmed unreached by any hand-written test — that's how the probe found it.

---

**Progressive update**: Session completed 2026-09-22 09:11 CDT
