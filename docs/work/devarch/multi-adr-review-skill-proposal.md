# DevArch — Multi-ADR Review Skill Proposal

**Date**: 2026-05-01
**Author**: Sharpee project (David Cornelson + Claude)
**Status**: Proposal — for DevArch maintainers' consideration
**Context**: surfaced from real-world ADR review work in the Sharpee project; validated against a tightly coupled ADR trio (channel-I/O platform / multi-user server / renderer architecture).

---

## Summary

The existing DevArch `/adr-review` skill reviews **one ADR at a time**. When a feature is documented across **two or more tightly coupled ADRs** (typical of platform / consumer / transport splits), the per-ADR review misses load-bearing structural findings that are only visible when reading the ADRs together.

This proposal specifies a **multi-ADR review mode** — either as an extension to the existing skill or as a sibling skill — that takes 2–4 ADR identifiers, runs the existing per-ADR checklist on each, and adds a battery of **cross-ADR checks** that catch what per-ADR review misses.

The proposal is grounded in an ad-hoc trial run against three Sharpee ADRs, captured at `docs/work/channel-io-unification/triple-review-20260501.md`. That trial surfaced three real, non-trivial findings that **none of the three single-ADR reviews would have caught**.

---

## Motivation

### What single-ADR review covers well

The existing `/adr-review` skill checks per-ADR completeness:
- Architecture compliance (boundary respect, dependency direction, naming)
- Contract completeness (modules, update contracts, interfaces, boundaries)
- Test requirements (end-to-end scenario, boundary tests, rejection tests)
- Acceptance criteria (explicit, persistence, backward compatibility)
- Open questions resolved

Each check is local to one ADR. The skill is well-tuned for "is this ADR ready to implement?"

### What single-ADR review misses

When an architecture is decomposed across N ADRs (which is the usual pattern for non-trivial features — platform vs consumer, producer vs transport vs renderer, infrastructure vs domain), **the seams between ADRs become a source of bugs that no individual ADR's review can catch**. Specifically:

1. **Cross-reference resolution.** ADR-A cites "ADR-B §5"; the skill checking ADR-A doesn't open ADR-B to verify the section exists, says what A claims it says, and hasn't drifted since A was written.

2. **Vocabulary drift.** ADR-A defines a term in passing; ADR-B reuses it with a slightly different meaning. Each ADR is internally consistent; the trio isn't. A reader of one ADR won't notice; a reader of the trio will trip on it during implementation.

3. **"Stable across" claims.** ADR-A says "the contract here is stable across ADR-B's decisions." That claim is a structural promise that has to be verified by reading ADR-B and confirming it doesn't actually require ADR-A changes. A per-ADR review of ADR-A only checks whether the *claim* is well-formed; not whether it *holds*.

4. **Seam coverage gaps.** "What happens at the boundary between ADR-A's responsibility and ADR-B's responsibility?" is a question that only emerges when reading both ADRs in proximity. Per-ADR review reports each ADR as complete; the trio still has holes at the seams.

5. **Sequencing dependencies.** Does ADR-A reference something ADR-B doesn't yet specify? The graph of "Builds on" / "References" relationships forms a dependency structure that has to be checked for cycles and dangling edges.

6. **Open-question reconciliation.** An "Open Question" in ADR-A may be answered by ADR-B's content; the per-ADR review of A flags it as open without checking whether B settled it.

7. **Lifecycle / resource correctness across responsibilities.** A long-lived resource may be allocated by ADR-A's specified component and freed (or not) by ADR-B's. Tracing this requires the cross-ADR walk-through.

### Validation: the Sharpee trio

The Sharpee project has three ADRs that form a closed feature surface for channel-I/O:

- **ADR-163** — Channel-Service Platform (producer side)
- **ADR-164** — Stateless Multi-User Server (one downstream consumer)
- **ADR-165** — Renderer Architecture (consumer side)

Each ADR was reviewed (or written) with `/adr-review`-shaped checks; each ADR individually passed. An ad-hoc combined review (`docs/work/channel-io-unification/triple-review-20260501.md`) surfaced **three findings none of the per-ADR reviews caught**:

1. **Repaint flow ambiguity.** ADR-163 §14 specified one repaint pattern; the validating spike used another. Both work, but the ADR didn't say which is canonical.
2. **"Story init" overloaded between server and client.** Multi-user has two halves of story init — channel registration server-side, renderer registration client-side — and the trio used the same name for both.
3. **`onCmgt` resource lifecycle gap.** ADR-165 specified a setup hook with no teardown, leaking resources across repaints.

All three were small fixes (one edit per ADR), but all three would have shown up at implementation time as confusing bugs — the kind of thing a reviewer should catch *before* implementation. None of the per-ADR reviews flagged them, because each was a seam-shaped problem.

---

## Two design options

### Option A — Extend `/adr-review` to accept multiple ADR IDs

```
/adr-review 163
/adr-review 163 164 165
/adr-review 0042-event-sourcing 0043-projections
```

When given one ADR, behavior is unchanged. When given two or more, the skill runs:
1. The existing per-ADR checklist on each input.
2. The cross-ADR checks (specified below).
3. A combined report.

**Pros**: one entry point; easy to discover; backward-compatible.
**Cons**: the skill becomes larger; harder to evolve the cross-ADR mode independently of the per-ADR mode; harder to reason about which cross-ADR checks are still cheap when the user is doing a casual single-ADR review.

### Option B — A separate `/adr-review-stack` (or `/adr-stack`, `/adr-review-multi`) skill

A sibling skill that handles only multi-ADR review. Per-ADR review stays small.

**Pros**: clearer separation of concerns; easier to evolve independently; the per-ADR skill stays terse.
**Cons**: two skills to discover; the user must know which to invoke.

### Recommendation

**Option A** (extend existing). Reasons:

- Multi-ADR review is the *strict superset* of single-ADR review (it runs the per-ADR checks first, then adds cross-ADR checks). Splitting them creates code duplication or a forced dependency between two skills.
- The argument count is the natural disambiguator: 1 arg → per-ADR mode; 2+ args → multi-ADR mode. No mental overhead for users.
- The `/adr-review` brand is already established and remembered. A sibling skill name (`/adr-review-stack`?) would be guessable but not obvious.
- If the multi-ADR mode grows expensive, the cost is paid only when the user actually invokes it with multiple args. The per-ADR path stays cheap.

A minor counterargument: if the cross-ADR checks involve expensive LLM-driven seam walkthroughs (see below), invoking them by accident might be surprising. Mitigated by: the skill emits a "running multi-ADR review (N ADRs, K seams)" notice early and the user can interrupt.

---

## Spec for the multi-ADR mode

### Inputs

- **2 to 4 ADR identifiers**. Each can be: a number (`163`), a partial filename (`stateless-multiuser`), or a full path (`docs/architecture/adrs/adr-164-stateless-multiuser-server.md`). The skill resolves each via the same matching used by single-ADR mode.
- **Cap at 4** in the v1. Cross-checks scale as O(N²) in the number of ADR pairs (4 ADRs → 6 pairs, 5 ADRs → 10 pairs, 6 ADRs → 15 pairs); past 4, the LLM-driven seam walkthrough becomes expensive enough to want a different invocation pattern.
- If the user passes more than 4, the skill prints a warning and runs against the first 4, suggesting the user invoke `/adr-review` separately on the rest.

### Process

```
For each input ADR i:
  1. Run the existing per-ADR checklist on ADR_i. Capture results.

For each pair (ADR_i, ADR_j) where i < j:
  2. Run the mechanizable cross-checks on the pair.

Across all N inputs:
  3. Run the mechanizable global checks (vocabulary census, open-question matrix, sequencing graph).

For each "Builds on" / "Replaces" / explicit cross-reference link:
  4. Run an LLM-driven seam walkthrough for that link.

Output:
  5. Combined report with per-ADR results + cross-ADR findings.
```

### Cross-ADR check categories

#### Mechanizable (pattern-matching only)

These don't require an LLM and run cheaply.

##### A. Cross-reference resolution

For each input ADR, extract all references of these shapes:
- `ADR-NNN` (matching another input ADR) — verify target exists in the input set OR exists in `docs/adrs/` (fallback) and is in the right state (ACCEPTED, REPLACED, etc., as the citing ADR claims).
- `§N` references — verify the target ADR has a `### N.` section header (or equivalent).
- `AC-N` references — verify the target ADR has an AC of that number.
- File path references (e.g., `spikes/...`, `packages/...`) — verify the path exists.

Output: table of references with PASS / FAIL / WARNING (FAIL = unresolvable; WARNING = resolves but to a different state than claimed).

##### B. Vocabulary census

For each input ADR, extract:
- Bolded short phrases (`**term**`) and their surrounding sentence.
- Definitional phrases (`**X is Y.**`, `X means Z`, `the X is the Y`).

Cluster by term across all input ADRs. For each term that appears in 2+ ADRs:
- Compare the surrounding context.
- Flag if the contexts suggest different meanings (e.g., one ADR uses "renderer" as a class name, another as a generic noun — surface to human).

Output: table of multi-ADR terms with USES_CONSISTENT / POSSIBLE_DRIFT / DIFFERENT_MEANINGS.

##### C. "Stable across" / "depends on" claim collection

Grep for phrases:
- "stable across"
- "depends only on"
- "does not depend on"
- "compatible with"
- "without modification"

Surface each instance with surrounding context. The skill does not verify the claim mechanically — that's the LLM's job in the seam walkthrough — but **collecting them** lets the seam walkthrough know what to verify.

##### D. Open-question matrix

Extract the "Open Questions" section from each input ADR. Cluster by topic (LLM-assisted clustering OK here, but a simple keyword match is good enough for v1). For each cluster:
- If a question is open in ADR-A but the cluster also matches a *resolved* item in ADR-B, flag for human review (probably ADR-A's open question should be marked resolved).
- If two ADRs both have an open question on the same topic, flag (probably one entry should reference the other, or they should be merged into a forthcoming ADR).

Output: matrix of (topic × ADR) with open / resolved / not-mentioned status.

##### E. Sequencing dependency graph

For each input ADR, extract:
- "Builds on" entries.
- "Replaces" entries.
- "Carries forward" entries.
- "References" / "See" entries linking to other ADRs.

Build a directed graph. Run:
- Cycle detection. Flag cycles as ERROR.
- Dangling-edge detection (reference to a non-existent ADR). Flag as ERROR.
- Out-of-set detection (reference to an ADR not in the input set but exists elsewhere). Flag as INFO.
- Mutual-dependency detection (both ADRs cite each other). Flag as WARNING (often legitimate but worth a human glance).

Output: graph diagram (mermaid OK) plus a list of edges with annotations.

##### F. Acceptance-criteria coordination

For each input ADR's ACs, search the other input ADRs' ACs for:
- ACs that explicitly cite an AC in another input ADR (e.g., "AC-7 here mirrors ADR-163 AC-12").
- ACs that depend on a behavior another ADR specifies but doesn't have a corresponding AC of its own.

Output: AC-coordination table showing which cross-ADR pairs of ACs must pass together.

#### LLM-driven (judgment-shaped)

These require model-driven analysis and are more expensive. The skill runs them *after* the mechanizable checks, using the mechanizable output as context.

##### G. Seam walkthrough

For each pair (ADR_i, ADR_j) connected by a "Builds on" / "Replaces" / strong cross-reference link, run a structured seam walkthrough:

> "ADR-A defines [decisions / contracts / invariants]. ADR-B claims to [build on / consume / extend / supersede] ADR-A's contract. Walk through the boundary between them. For each ADR-A decision that ADR-B touches, identify:
> - Does ADR-B's behavior match the contract?
> - Are there scenarios at the boundary that neither ADR specifies?
> - Are any "stable across" claims (from check C) violated by ADR-B's content?
> - Are there resource-lifecycle questions that span the boundary (allocation in A, teardown in B, or vice versa)?
> Surface a short list of concrete findings, each tagged as BLOCKER / SMALL_CLARIFICATION / DEFERRED."

The model's prompt context includes:
- The two ADRs in full (or relevant sections).
- The mechanizable check outputs for the pair.
- The user's project profile if available (`docs/context/project-profile.md`).

Output: per-pair findings list. Each finding is concrete enough to land as a doc edit.

##### H. Cross-ADR contradiction detection

Given the full input set, ask the model:

> "Read all N ADRs. Are there any places where ADR-A states X (declarative or implied) and ADR-B states ¬X (or behavior incompatible with X)? Surface each as a finding."

Less structured than the seam walkthrough; catches contradictions that aren't at named seams. Lower precision (more false positives), but worth the cost when the input set is small.

Output: a flat list of candidate contradictions with citations.

##### I. Lifecycle / resource correctness

For each long-lived resource implied by the ADRs (state stores, channel registrations, transcripts, save blobs, etc.), trace its lifecycle across the input set:

> "Resource R is allocated by [ADR-A decision X]. Where is it freed / reset / superseded? If allocation and freeing are in different ADRs, do they reference each other? Are there scenarios where the resource leaks?"

This is the check that would have caught Sharpee's `onCmgt` lifecycle gap (Finding 4c). It's cost-effective because the model is reasoning over a small, structured set of resources rather than the full ADR text.

Output: per-resource lifecycle table with ALLOCATED_BY / RELEASED_BY / NEVER_RELEASED / UNCLEAR rows.

### Output format

```
Multi-ADR Review: ADR-163, ADR-164, ADR-165
═════════════════════════════════════════════════

Per-ADR Verdicts
  ADR-163: READY (15/15 PASS)
  ADR-164: READY (10/10 PASS)
  ADR-165: READY (12/12 PASS)

Cross-ADR Findings
──────────────────────────────────────────────────

Cross-reference resolution:    PASS (12 references checked)
Vocabulary consistency:        PASS WITH NOTE (1 minor: Renderer/renderer)
"Stable across" claims:        PASS (3 claims verified)
Open-question matrix:          1 duplicate (asset-pipeline question
                               appears in 163 + 165, both correctly
                               point at forthcoming ADR)
Sequencing graph:              ACYCLIC (no warnings)

Seam walkthroughs:
  ADR-163 ↔ ADR-164:    1 finding (repaint flow ambiguity)
  ADR-163 ↔ ADR-165:    2 findings (story-init overload, onCmgt teardown)
  ADR-164 ↔ ADR-165:    0 findings

Lifecycle analysis:            1 finding (onCmgt with no onDestroy)
Contradiction sweep:           0 findings

──────────────────────────────────────────────────
Combined Verdict: READY FOR IMPLEMENTATION with
  3 small clarifications.

Findings (sorted by severity):

  [SMALL] Repaint flow ambiguity.
    Where: ADR-163 §14
    What: Spec says re-produce CMGT; spike captures and replays.
    Fix: One sentence clarifying the produce-vs-capture distinction
         and stating story-init determinism as an assumption.

  [SMALL] "Story init" overloaded.
    Where: ADR-165 §3
    What: Same name covers server-side and client-side halves
          in multi-user; trio doesn't disambiguate.
    Fix: Note that this ADR's "story init" is the client-side half.

  [SMALL] onCmgt resource lifecycle.
    Where: ADR-165 §1, §4, Consequences
    What: Setup hook with no teardown; leaks across repaints.
    Fix: Add an optional onDestroy hook; specify pairing in §4.
```

### Cost / scaling considerations

- **Mechanizable checks** scale linearly in total ADR text. Cheap; can run on every invocation.
- **LLM-driven seam walkthroughs** scale as O(N²) in number of ADR pairs. For N=2 → 1 pair, N=3 → 3 pairs, N=4 → 6 pairs. At 6 pairs the cost is ~6× a single-ADR LLM review, which is the practical ceiling for casual use.
- **Lifecycle and contradiction sweeps** are O(N) global passes — one per global check, not per pair.
- **Recommended cap of 4 ADRs per invocation.** Past 4, the cost shape suggests the user really wants a different artifact (e.g., a stack overview doc, an architecture-review session) rather than a mechanical review.

### Implementation considerations

For maintainers integrating into DevArch:

1. **Backward compatibility.** Single-ADR invocation must remain unchanged. The cross-ADR checks live behind a "≥2 args" branch.
2. **Reuse of per-ADR primitives.** The per-ADR checklist code should be refactored into a pure function (input: one ADR; output: structured per-ADR results) that the multi-ADR mode invokes N times before adding its own checks. No code duplication.
3. **Project profile dependency.** Multi-ADR review benefits even more than single-ADR review from `docs/context/project-profile.md` — the seam walkthrough's prompt reads better with project context. Keep the existing profile-reading logic; just feed it through to multi-ADR prompts too.
4. **Output to stdout, not file.** Match the existing `/adr-review` behavior. Users can redirect to a file if they want a persistent artifact (the Sharpee project did this manually for `triple-review-20260501.md`).
5. **Optional: support `--save <path>`** for the multi-ADR case specifically, since the output is bigger and more valuable as a persistent artifact than the single-ADR case.

---

## Open questions for the DevArch maintainers

1. **Naming**: stick with `/adr-review` for both modes (Option A), or split into `/adr-review` + `/adr-review-stack` (Option B)? This proposal recommends A but defers to maintainers' aesthetic.
2. **LLM model selection**: do the seam walkthroughs use the same model as the existing skill, or a larger one? Cost vs depth tradeoff.
3. **Failure mode**: if one of the input ADRs fails its per-ADR check (e.g., is a stub), does the multi-ADR review skip the cross-checks involving it, or run them with a warning? This proposal suggests "run with a warning" — incomplete ADRs are exactly when seam findings are most useful.
4. **Output verbosity**: the proposed output format is mid-detail. Maintainers may want a `--brief` flag (just the verdict and finding count) or a `--full` flag (every check's raw output).
5. **Where this proposal lands**: the Sharpee project authored this proposal but doesn't own DevArch. Suggest a PR / issue / conversation pattern that fits the DevArch maintainer workflow.

---

## Appendix — files referenced

The findings and validation that drove this proposal:

- `docs/work/channel-io-unification/triple-review-20260501.md` — the ad-hoc multi-ADR review that surfaced the three findings.
- `docs/architecture/adrs/adr-163-channel-service-platform.md` — platform ADR.
- `docs/architecture/adrs/adr-164-stateless-multiuser-server.md` — multi-user server ADR.
- `docs/architecture/adrs/adr-165-renderer-architecture.md` — renderer architecture ADR.
- `spikes/channel-io/` — the spike that informed all three ADRs and surfaced the original 8 gaps.
- `~/.claude/skills/adr-review/` — the existing single-ADR review skill (the baseline this proposal extends).

---

## Status / next step

This proposal is sized for a DevArch maintainer to read in ~10 minutes and respond with one of: "yes, build it as Option A", "yes, but Option B", "the cross-checks are useful but the implementation cost is too high — let's do a subset", or "the existing single-ADR pattern is sufficient if used N times manually."

The Sharpee project will continue using ad-hoc multi-ADR reviews (triple-review-20260501.md is the template) until / unless the skill is built. Each additional ad-hoc review is a free input to refining this proposal.
