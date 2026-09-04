# Session Summary: 2026-08-20 22:07 CDT - feat/adr-321-world-index

## Goals
- Resolve ADR-322's Amendment 1 open decisions (D11 claim disposition, D12 IDE-integration gate) and flip ADR-322 DRAFT -> ACCEPTED.
- Scope a real-world validation corpus for the state-space sweep against a story David owns (Jack Toresal and The Secret Letter).

## Phase Context
- **Plan**: No active plan (`.current-plan` absent — released by the prior session).
- **Phase executed**: N/A — ADR/proposal work outside any plan phase.
- **Tool calls used**: 85 (no budget tier assigned — no active phase).
- **Phase outcome**: N/A.

## Completed

### ADR-322 Amendment 1 — D11 claim disposition
- A claim now has three outcomes: held / violated / unproven (unproven = the sweep hit the budget or a pruning rule before deciding).
- The claims block carries a disposition mapping the three outcomes onto Chord's existing two `DiagnosticSeverity` values ('error' | 'warning', `packages/chord/src/diagnostics.ts:13`; build success already means "no error-severity diagnostic," `diagnostics.ts:48` / `index.ts:45`) — no new plumbing needed.
- David corrected placement twice during drafting: the disposition line lives inside the `claims` block, not the `story` header; and the default is ADVISORY, not binding. D2's "a green build must distinguish verified from suppressed" requirement was re-homed onto a new mechanism instead of a label swap: the claim tally (held/violated/unproven) prints on every build at every disposition (AC-7) — downgrading severity is not suppression, going quiet is.
- Unproven is never reported as held at either disposition (guards D7's "absence is not proof").

### Light review pass (explicitly not `/devarch:adr-review`)
- David asked for a light review only, given the prior session's four-round review-loop failure. Two findings, both fixed: the Amendment intro said "header," contradicting D11's placement decision; "severity" named two different things across D9 and D11, settled as one word/one meaning (D9's closed severity set IS `DiagnosticSeverity`, making AC-5 checkable against a type).

### D12 — IDE-integration gate (went through a misread and correction)
- David: hold execution to after real perf tests against a large sample. First draft wrongly gated building the sweep itself; corrected to gate only the IDE connection — the sweep must be built to produce the numbers. D6's two regimes (batch tool >10s vs on-save diagnostic <2s) stand as the budget; the claim that the on-save diagnostic IS the integration is now the hypothesis D12 tests, and D6 now points to that.
- Corpus facts recorded: largest Chord story is `branch-stories/fernhill/fernhill.story` at 1,155 lines (thealderman 938, ides-of-march 921) — no large sample exists, so the probe must synthesize one scaled on state bits, not source lines. Dungeo is excluded on mechanism (TypeScript under `stories/dungeo/src/`, no `.story` file — not a Chord IR sweep target; corrects a wrong "stress test" line in the proposal's §0).
- Added a negative control (AC-9): a Chord port of a generative-entity-space story (David's example: Counterfeit Monkey) is a different class, not a bigger instance, and the sweep must decline it in bounded time with a stated reason.

### Secret Letter — validation corpus scoping (D13)
- Identified: Jack Toresal and The Secret Letter (Gentry & Cornelson, Textfyre, 2009, Inform 7 pre-v10), owned by David. Analyzed from the three GitHub sources he supplied (`ChicagoDave/textfyre`), not from memory.
- `story.ni`: 12,635 lines / 862 KB, 32 rooms, 20 NPCs, 57 scenes (strictly linear scene chain), 778 `instead of` rules, 414 check/before/after, 472 quip references, 48 every-turn rules, 43 counters, 132 randomness references.
- Design archive: 16 Detail Design revisions, dialogue tables, Visio puzzle/map diagrams, 5 clean playtest transcripts (largest `SecLet-EE07.txt` 357KB), recorded bugs, 18+ builds.
- Textfyre I7 extensions triaged into three piles: already solved by the platform (~90KB — FyreVM Support, channel shims, Image/XML Output -> ADR-163 channels; Standard Rules -> stdlib); direct Chord equivalents (Counters -> ADR-264/ADR-217; Scripted Events -> `define sequence`/`define machine`, ADR-215); and two with no equivalent — Quips (16KB, explicit menu-node conversation network vs Chord's beat-based `define conversation`, 472 references, entangled with the remake's agency goal) and Dramatic Priority (4KB, six-level tension ladder governing what not to say — a candidate platform feature).
- **Key correction**: I initially framed reviewer agency complaints as defects the sweep should catch. David: Textfyre's design invariant was "non-IF middle-school target," no longer true for the remake — the linear spine was the design working as specified, so a sweep reporting it as a defect would violate ADR-322's own non-goal and ADR-294 D22's intent-neutrality. Reframed Secret Letter as the intent-neutrality test: a story whose extreme agency metrics are *correct*.
- This produced D13 (validation corpus, kept separate from D12 — D12 measures speed, D13 measures truth): (1) reachability against the five playtest transcripts (the only real-world check on D7's soundness contract); (2) derived dependency graph vs. the designers' own Visio puzzle diagrams, validating D8's claim that ADR-321's `lifted` IS the puzzle graph; (3) intent-neutrality (AC-11). Recorded that Secret Letter is not the D12 performance sample (large source, small state space, likely millisecond sweeps) — that synthetic curve is a separate job.
- Also produced `declare guided` — the proposal's §7 gained the first L3 declaration argued for by real material rather than a whiteboard sketch: clears ADR-322 D3's test (deliberate spine vs. accidental railroading are byte-identical in the IR) and carries a D4 obligation (asserts the spine stays a chain; a later branching edit fails the declaration).

### ADR-322 status flip and ADR-131 cleanup
- ADR-322 flipped DRAFT -> ACCEPTED on David's instruction; clean under rule 11a (no Open Questions section). Status line states acceptance authorizes neither checks (D10) nor IDE integration (D12 ungated) nor `packages/` placement (still CLAUDE.md-gated). Final shape D1-D13, AC-1 through AC-11.
- ADR-131's 2026-08-05 "SCOPE WIDENED" block closed in place as history, not repointed at ADR-322 as the proposal's item 8 suggested — that would have been wrong: ADR-303's own supersession record already disposes of D6 ("D6's widening of ADR-131 is moot: ADR-321 subsumed ADR-131's static half on 2026-08-19"), and ADR-322 D8 consumes ADR-321's `lifted` rather than widening any explorer. Also recorded the block's stated trigger ("whoever accepts ADR-303") never fired — ADR-303 went to SUPERSEDED without acceptance. Proposal item 8 marked resolved with this reasoning.

## Key Decisions

### 1. Claim disposition is a tally, not a label swap (D11)
Advisory-by-default with a printed held/violated/unproven tally on every build satisfies D2's verified-vs-suppressed requirement without inventing binding-by-default; a silent disposition would itself be the suppression D4 forbids.

### 2. D12 gates IDE connection, not sweep construction
The sweep must exist to generate the performance numbers the gate depends on; only the on-save-diagnostic integration path is held pending measurement against a state-bit-scaled synthetic sample (no real large sample exists in the current Chord corpus).

### 3. Secret Letter is a correctness test, not a defect-catching fixture (D13)
A story with intentionally extreme, linear agency metrics is the only available check on ADR-322's non-goal (cannot judge whether a failure is "good") and ADR-294 D22 intent-neutrality — reframing it this way is harder to satisfy than the original framing and was a real correction mid-session, not a refinement.

## Next Phase
- No active plan — this was ADR/proposal work outside plan tracking. Next work is Secret Letter port scoping (see Open Items) or a new plan phase if David starts one.

## Open Items

### Short Term
- Secret Letter port: two undecided design questions — Quips-vs-beat conversation model (entangled with the remake's agency goal) and whether Dramatic Priority becomes a Chord platform feature.
- The Textfyre extensions read this session were Shadow's copies; Secret Letter's own extension tree should be read before porting (three FyreVM variants exist and Quips semantics could differ).
- `Adjacent Rooms` (13KB Textfyre extension) has no identified Chord equivalent and was not investigated.

### Long Term
- ADR-322 D12's state-bit-scaled synthetic stress story does not exist yet.
- ADR-322 D13's validation corpus exists in source form only — playtest transcripts need conversion to `.transcript` format, `.vsd` puzzle diagrams need conversion to a comparable dependency-graph format.

## Files Modified

**ADR / proposal work** (3 files):
- `docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md` - Amendment 1 (D11, D12, D13; AC-6 through AC-11), DRAFT -> ACCEPTED flip.
- `docs/architecture/adrs/adr-131-automated-world-explorer.md` - closed the 2026-08-05 SCOPE WIDENED block in place, recording that its stated trigger never fired.
- `docs/proposals/state-space-analysis.md` - authored by David via Claude Desktop in the prior session and committed there in b444f5fe (not untracked, as stated mid-session); synced to Amendment 1, gained the `declare guided` L3 sketch, open questions 8 and 9 resolved.

## Notes

**Session duration**: not tracked precisely; 85 tool calls, ADR/proposal drafting session with no code changes, no builds, no tests.

**Approach**: Iterative ADR amendment drafting with David correcting placement, defaults, and framing in real time (D11 disposition placement/default, D12 misread on what execution gates, and the agency-complaints reframe for D13) rather than a single-pass write.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: `packages/chord/src/diagnostics.ts` existing `DiagnosticSeverity` type ('error' | 'warning') and existing build-success semantics (no error-severity diagnostic) were confirmed as the grounding for D11 before drafting it.
- **Prerequisites discovered**: None.

## Architectural Decisions

- ADR-322: Amendment 1 added D11 (claim disposition — advisory default, printed held/violated/unproven tally), D12 (IDE-integration gate, not a sweep-construction gate), D13 (validation corpus using Secret Letter as an intent-neutrality test); AC-6 through AC-11 added; ADR flipped DRAFT -> ACCEPTED.
- ADR-131: 2026-08-05 SCOPE WIDENED block closed in place as history rather than repointed at ADR-322, per ADR-303's own supersession record (D6 already moot — ADR-321 subsumed ADR-131's static half 2026-08-19) and ADR-322 D8 (consumes `lifted` rather than widening any explorer).
- Pattern applied: intent-neutrality (ADR-294 D22) and ADR-322's own non-goal ("cannot establish whether the failure is good") governed the reframe of Secret Letter from a defect-catching fixture to a correctness test.

## Mutation Audit

- N/A — documentation/ADR-only session, no side-effect code written or modified.

## Recurrence Check

- Similar to past issue? YES — the prior session's four-round `/devarch:adr-review` loop failure (referenced explicitly by David when he asked for a "light" review instead this session; not independently corroborated against a specific prior summary filename in this session).
- If YES: no new systemic audit proposed this session — David's own mitigation (skip the heavyweight review skill, do a light manual pass) was applied directly.

## Test Coverage Delta

- No test changes this session.

---

**Progressive update**: Session completed 2026-08-20 22:07 CDT (documentation session; no further updates expected)
