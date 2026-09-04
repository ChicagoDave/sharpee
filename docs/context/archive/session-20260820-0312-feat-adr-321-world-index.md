# Session Summary: 2026-08-20 - feat/adr-321-world-index

## Goals
- Close and archive the ADR-321 world-index plan.
- Sweep open DRAFT ADRs; take ADR-303 (convergent paths and unwinnable states) through review toward acceptance.
- Reconcile ADR-303 with prior art and with a parallel state-space-analysis proposal David was drafting with Claude Desktop.

## Phase Context
- **Plan**: ADR-321 world-index — closed this session (Phase 6 done-by-inference, Phase 7 ABANDONED) and archived to `docs/work/archive/world-index/plan.md`. No plan is active after this session; `.current-plan` was released.
- **Phase executed**: N/A — plan closure, not a phase execution.
- **Tool calls used**: 191 (no phase budget was set; the state file carries `phase: 0`, `tier: ""`).
- **Phase outcome**: Plan closed and archived.

## Completed

### ADR-321 world-index plan closed and archived
- Phase 6 ("World tab renders") marked DONE by inference — it had sat at AWAITING CONFIRMATION for David's own look at the rendered tab, and was closed on the evidence that Phases 8/9 and two ADR-321 amendments were all worked through that same rendered tab since.
- Phase 7 ("delete `tools/vscode-ext/src/world-explorer.ts`") marked ABANDONED on David's ruling that the VS Code extension is out of scope. Nothing under `tools/vscode-ext/` was touched.
- Archived via `plan-archive.sh`: `docs/work/world-index/plan.md` -> `docs/work/archive/world-index/plan.md`; `.current-plan` pointer released.

### ADR-303 review cycle — four rounds, then a full discard
- Ran `/devarch:adr-review` on ADR-303 four times. Scores: 8/19 -> 14/19 -> 11/18 -> 10/18. Each round's amendment introduced defects the next round caught — the file grew from 301 to 1507 lines across five written amendments.
- **At David's direction ("this ADR is circling the drain"), all five amendments were discarded.** Both `adr-303-convergent-paths-and-unwinnable-states.md` and the affected companion file were reverted via `git checkout`; the discarded content survives only as copies in the session scratchpad. This is the session's central event: a day's amendment work on ADR-303 was thrown away, not merged forward, not partially salvaged into ADR-322 except where explicitly named below.
- Root cause identified in-session: invoking review-then-amend-then-review turned the review into a generation loop. A review's job is to judge readiness, not produce content, but every finding got answered by writing more document instead of stopping to ask a scoping question. The correct stop point was the *first* review, which flagged that ADR-303's referenced ADR-302 and ADR-131 were both already superseded — that finding should have triggered "does this feature have a live home elsewhere?" immediately, rather than being rediscovered by accident (see below) after four rounds and five amendments.
- Substantive factual errors caught and corrected during the cycle: ADR-303's motivating corpus was wrong since its drafting session — Fernhill's "two LOSE endings" (`dawn-lose`, `fuse-lose`) are transcript filenames, not outcomes; the actual endings are win (`fernhill-saved`, turn 60), kill-the-player (`fuse-blast`, turn 612), and lose (`dawn-comes`, turn 622), and `the-long-night` is a `define sequence` doom clock at turn 615, not a winning answer key. The first attempt at this correction, made in-session, also got it wrong — it grepped only for `lose`/`win` and missed the `kill the player` outcome. Also corrected: an invented "milliseconds" performance claim, an ADR-103 overclaim (ADR-103 is Proposed with no implementing package), and a proposed Chord syntax that violated the closed `TRAIT_ADJECTIVES` contract in `packages/chord/src/catalog.ts`.

### Prior art discovered mid-session
- ADR-294 D20 ("The explorer — bounded exhaustive play", ACCEPTED 2026-08-01, unbuilt) is prior art for the whole feature ADR-303 was reinventing — found incidentally while carrying an unrelated rule into ADR-294. Three prior attempts at this feature now exist, each drafted without knowledge of the one before it: ADR-292 (superseded in place by ADR-293), ADR-294 D20, ADR-303.
- ADR-321's shipped Reach view already computes six of ADR-303's proposed findings, and its `lifted` list (with `pass` and `requires`) already *is* the puzzle dependency graph several proposed checks would have re-derived from scratch.

### ADR-294 Amendment 1 (D21, D22)
- D21: a transcript command must never use a pronoun, with a REQUIRED exception for `stories/dungeo/tests/transcripts/implicit-inference.transcript`, which asserts a platform guarantee about pronoun predictability. Corpus-verified before writing: Fernhill has zero pronoun commands; Dungeo has exactly two, both in that one file.
- D22 was first drafted as ~90 lines of corrections to D20, then cut down to a pointer once David and Claude Desktop's parallel proposal superseded that content.

### David + Claude Desktop's parallel proposal
- `docs/proposals/state-space-analysis.md` (783 lines, untracked) was written by David via Claude Desktop in parallel with this session — **not authored by this session.** It is a stronger analysis than ADR-303: four layers (L1-L4), a declaration-vs-claim split, roughly 30 checks including lexicon/guess-the-verb checks, metrics, a Plotkin-grounded cruelty treatment, and a staging plan.
- Its first version (599 lines) cited none of the prior art this session had just surfaced (ADR-292/293, ADR-294 D20, ADR-321's Reach view). After this session supplied that context, David/Desktop folded it in, growing the proposal to 783 lines and adding a §13 disposition table. This session verified the fold against source — §4A's ADR-321 D14 claims quote accurately.

### ADR-303 closed as SUPERSEDED; ADR-322 drafted
- ADR-303 marked **SUPERSEDED** (2026-08-20, session c5bc96), with each of its decisions' destination recorded in the file.
- ADR-322 ("State-Space Analysis (umbrella)") written fresh — 183 lines, **DRAFT**, deliberately thin against the 783-line proposal. Covers D1-D10: the layer split, three annotation rules, the <2s budget as a chosen constraint, the soundness contract carried forward from ADR-294 D20, "consume ADR-321, don't extend it," and an open finding vocabulary. Deliberately excludes the check catalog — the proposal's own §12 argues a fixed list is the failure mode — and carries no Open Questions section.

## Key Decisions

### 1. Discard, don't salvage, the ADR-303 amendments
David ruled the ADR was circling the drain rather than converging; all five amendments were reverted rather than partially kept, and the useful findings (corpus corrections, prior-art discovery) were carried forward into ADR-294 Amendment 1 and ADR-322 instead of left inside the discarded file.

### 2. ADR-322 is a thin umbrella, not the catalog
The check catalog, syntax sketches, metrics, and staging stay in `docs/proposals/state-space-analysis.md` as a "working document" the ADR points to rather than restates — matching the proposal's own §12 argument that a fixed catalog baked into an ADR is the failure mode being avoided.

### 3. Scope rulings by David this session
VS Code extension (Phase 7) out of scope; ADR-303 D4 (comparing runs across sweeps) out of scope; a cruelty-scale addition was superseded by the proposal's recovery-cost/foreseeability treatment; P-2 resolved as an on-the-thing declaration; P-1 and P-3 accepted and later absorbed into the proposal; pronoun context excluded from the state signature; the implicit-taking test (D21's exception file) is required.

## Next Phase
No active plan follows. ADR-322 is DRAFT and awaits David's acceptance (rule 11a offers the open-questions interview, but ADR-322 currently has no Open Questions section to interview). The next planning step is: accept or amend ADR-322, then run `session-planner` against `docs/proposals/state-space-analysis.md` once its own catalog is settled.

## Open Items

### Short Term
- ADR-322 (DRAFT) needs David's review/acceptance before any implementation planning starts.
- `docs/proposals/state-space-analysis.md` is untracked — not staged or committed by this session.
- The meter-banding question is flagged in the proposal as answer-before-implementing: a per-turn meter (as opposed to a bounded one) makes the exhaustive sweep non-terminating.

### Long Term
- Whether `scoreLedger` is part of a world's identity for sweep-comparison purposes is open.
- Once ADR-322 is accepted and the proposal's catalog stabilizes, plan the actual analysis engine — a fourth attempt, this time built on the first three's discovered prior art instead of blind to it.

## Files Modified

**Plan** (1, closed + archived):
- `docs/work/world-index/plan.md` -> `docs/work/archive/world-index/plan.md` — Phase 6 DONE by inference, Phase 7 ABANDONED, plan archived, `.current-plan` released.

**ADRs** (3):
- `docs/architecture/adrs/adr-303-convergent-paths-and-unwinnable-states.md` — closed SUPERSEDED after four review rounds and a full amendment discard (see Completed above).
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` — Amendment 1 added: D21 (no-pronoun transcript rule + required exception file), D22 (pointer to the proposal, cut down from a longer draft).
- `docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md` — new, 183 lines, DRAFT. Umbrella decisions D1-D10.

**Not written by this session**:
- `docs/proposals/state-space-analysis.md` (783 lines, untracked) — authored by David via Claude Desktop in parallel; this session supplied prior-art context that got folded into it and verified the fold against source.

## Notes

**Session duration**: multi-hour session (started 2026-08-20 03:12 CDT); see prior same-branch sessions on 2026-08-19 for the lead-up.

**Approach**: Plan closure first, then an ADR sweep that turned into a single-ADR review-and-amend cycle that ran past its useful stopping point before David called it off. The session's real yield is the diagnosis of *why* that happened (review loop treated as a content generator) plus the prior-art discovery, both carried into ADR-322 and ADR-294 Amendment 1.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — nothing this session touched is merged; the ADR-303 amendment discard was already executed via `git checkout` before this summary was written.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-321's Reach/lifted view existed and was checked against ADR-303's proposed findings; ADR-294 D20 existed as prior art once found.
- **Prerequisites discovered**: ADR-294 D20 itself was an undiscovered prerequisite — it should have been checked before ADR-303 was drafted (in an earlier session), and its absence from that earlier check is most of why this session's review cycle ran as long as it did.

## Architectural Decisions

- ADR-303: SUPERSEDED — see the file's own recorded destination-per-decision table.
- ADR-294 Amendment 1 (D21, D22): no-pronoun transcript rule with a required exception file; pointer to the proposal for the explorer's corrections.
- ADR-322 (DRAFT, D1-D10): layer split, annotation rules, <2s budget, soundness contract inherited from ADR-294 D20, "consume ADR-321, don't extend it," open finding vocabulary.
- Pattern applied: umbrella ADR deliberately kept thin, pointing to a working proposal document rather than absorbing its catalog — a direct response to this session's own review-loop failure mode.

## Mutation Audit

- Files with state-changing logic modified: N/A — documentation/ADR-only session, no source code changed.
- Tests verify actual state mutations: N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — one prior session (`session-20260819-1745-feat-adr-321-world-index.md`) references `adr-review` but not this specific failure mode; no prior "review triggers amendment triggers review" loop was found in the corpus checked this pass.
- If YES: N/A

## Test Coverage Delta

- Tests added: 0
- Tests passing before: N/A -> after: N/A (no test suite run this session)
- Known untested areas: N/A — no code changed this session

---

**Progressive update**: Session completed 2026-08-20
