# Session Summary: 2026-07-16 11:59 — chord-foundations (session c39d83)

## Goals
- Run the parked ADR-118 hook audit: which stdlib standard actions lack interceptor wiring vs. what Chord routes to interceptors (the eating/throwing silent-seam class from session accf8b).

## Key decisions
- Audit is report-only (findings at `docs/work/adr-118-hook-audit/audit.md`); all fixes need David's go-ahead (platform changes).

## Work log
- Pre-session audit: clean (typecheck green, no stale artifacts, prior session COMPLETE at b489e2e1).
- Project profile refreshed (was 9 days stale): added Chord Story Language domain, ADR-223..227 signatures, corrected scale counts.
- Grounding for audit: ADR-118 interface (5 hooks: preValidate/postValidate/postExecute/postReport/onBlocked); canonical wiring = taking.ts; Chord loader routes ANY non-event `on <gerund> it` clause to `registerActionInterceptor('if.action.<gerund>')` with NO validation against a known-action list (chord analyzer.ts:1055 — routing = capability only for Chord-declared actions; story-loader runtime.ts:149-155); EVENT_TRIGGERS carve-out = `entering` only.

## Work log (audit)
- 8 parallel audit agents (4 wired-action grading, 4 unwired classification); W3 agent hung and was killed — pushing/putting/reading/switching_on verified directly instead.
- Full findings written to `docs/work/adr-118-hook-audit/audit.md`. Headlines:
  - 19 unwired object-verb actions = silently dead Chord `on <gerund> it` clauses (drinking/pulling/touching/switching_off top the plausibility list; switching_on↔switching_off asymmetry).
  - LIVE Dungeo bug (code-verified): putting's multi-object path bypasses ALL 5 hooks → "put all in case" deposits treasures with no `awardScore` (TrophyCasePuttingInterceptor is postExecute-only).
  - LIVE canon regression (code-verified): TrollTalkingInterceptor ("troll can't hear you", MDL) registered on unwired `if.action.talking` — never fires; no transcript covers talk-to-troll.
  - Delegation seams: REMOVE FROM bypasses taking interceptors (TrollAxe class); inserting keys on if.action.putting so `on inserting it` is dead.
  - Second-entity gaps: attacking never checks weapon; going never checks door; putting/dropping item-side unchecked; throwing single-winner rule.
  - Contract drift across the 14 wired actions: pre/postValidate short-circuit-on-valid vs !result.valid split; onBlocked replace-vs-append split; going dark-path drops postReport.
  - Chord loader accepts any gerund (analyzer.ts:1055) — incl. lowering/raising where interceptors don't apply by design; fail-fast validation recommended.

## Scope decision (David)
- **100% coverage** — every action, every path, every entity; not a high-value triage.
- Decision document written for David's review: `docs/work/adr-118-hook-audit/decisions.md` (D1 guard semantics, D2 onBlocked shape, D3 multi-entity resolution, D4 multi-object lifecycle, D5 Chord gerund fail-fast + stdlib registry export, D6 removing/inserting delegation, D7 path-skip rulings). Grounded: no existing interceptor returns `{valid:true}`; Chord dispatcher has no onBlocked arm; ADR-118 prose contradicts its own example on D1.

## D1 follow-up (David's question: does unfixed D1 lose Chord negative when clauses?)
- **No** — Chord entity-clause hooks only return `{valid:false}` or null (runtime.ts:335-336, 339-357); refusals incl. `must` (negative form) block identically under both D1 guard semantics. Chord loses refusals via D4 (multi-object skips validate hooks) and unwired/second-entity gaps, not D1.
- **NEW BUG FOUND while verifying (D8 added to decisions.md)**: `while <cond>` clause gates do NOT gate leading refusals — findRefusal runs in preValidate unconditionally, gate evaluated only in postValidate (entity path); trait-clause paths (buildTraitInterceptor :462, buildCapabilityBehavior :420) never evaluate `while` at all and never check `, once`. Language spec is unambiguous (design.md "all qualifiers ride on one connective"; fixtures legally combine while+refusals; parser.ts:1753 "legal on every binding"). No test pins any of it — only while-gate runtime test is Cloak's stumble (`after` clause, event path).

## D0 added (David's question: foundational refactor needed?)
- Answer: architecture (ADR-051 four-phase, registry, ADR-090) is sound; the LIFECYCLE OWNERSHIP is the problem — convention (hand-copied into each action, drifted 3 ways in 14 files) vs mechanism. D0 options: A fix-file-by-file (how we got here), B shared stdlib lifecycle engine + per-action declarative descriptor (recommended; D5 registry falls out of the descriptor table), C engine-level wrap (blocked by D4 multi-object loops living inside actions).

## Status: COMPLETE — audit + decision doc delivered; David chose finalize-before-starting-B
- Direction signaled: D0 option B (shared stdlib lifecycle engine + declarative descriptors). NOT started — next session begins with rulings on D1–D6, folding into the ADR, then session-planner.
- Deliverables this session: `docs/work/adr-118-hook-audit/audit.md`, `docs/work/adr-118-hook-audit/decisions.md` (D0–D8), refreshed `docs/context/project-profile.md`.
