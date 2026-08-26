# Session Summary: 2026-08-26 - feat/adr-321-world-index

## Status: In Progress

## Goals
- ADR-327 Phase 1: record David's rulings on the shape doc, then Chord grammar reform in `packages/chord`

## Completed
- Session Start: recap of session e4250f presented; pre-session-audit relayed (type check clean; Phase 1 CURRENT; 2 plans lack `**Plan Status**` — advisory; 7 stranded event logs — ignorable); profile fresh (2026-08-23); `docs/core-concepts/README.md` read in full; gate cleared.
- Phase 1 shape-doc rulings recorded (David, 2026-08-26): Q1 (ii) bare head generalizes to any gerund; Q2 yes, role heads take the explicit actor; Q3 analyzer owns `analysis.it-removed`, head `it` stays `parse.removed-head-it`; Q4 yes, `'it'`→`'object'` rename + `IR_FORMAT` bump.

- Player-switch design conversation: traced the Chord every-turn presence gate to Phase C decision 10 (2026-07-11, `phase-c-ownership-proposal.md:240`, grammar-changes D11) and showed it contradicts ADR-144 (NPC-to-NPC propagation runs off-stage: `character/src/propagation/visibility.ts`) and ADR-328 D3. Wrote: ADR-328 D3 amendment (perception tags `location` + `presence`, never drops; client decides; decision-10 gate retired; lands whole with the wire tag — no interim); ADR-327 D9 note (autonomous behaviour gates on the role at fire time, scenarios A/B); plan Phase 3 role-gate item + new "Off-stage firing lands whole in ADR-328's plan" section; grammar-changes supersession row for D11.

## Key Decisions
- Phase 1 shape Q1–Q4: all four recommendations accepted (David, 2026-08-26).
- Actor-owned daemons gate on the role at fire time; no toggle on switch (David, 2026-08-26 — ADR-327 D9 note).
- Perception tags, never drops: `location` + `presence` on event and block; default client hides `absent`; decision-10 firing gate retired; no interim, lands in full (David, 2026-08-26 — ADR-328 D3 amended).
- Where it lands: ADR-328's plan (first witnessing phase), not the ADR-327 plan.

## Open Items
- "go" for Phase 1 edits in `packages/chord`.
- Session-planner for ADR-328's plan when David is ready (witnessing tag first, then D2).
- Stray `1` file at repo root — David's call to delete.

## Files Modified
- `docs/work/adr-327-explicit-references/phase-1-grammar-shape.md` — rulings section
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` — D3 amended
- `docs/architecture/adrs/adr-327-explicit-references.md` — D9 fire-time role note
- `docs/work/adr-327-explicit-references/plan.md` — Phase 3 role-gate item; off-stage section
- `docs/architecture/chord-grammar-changes.md` — D11 supersession row
- `docs/context/session-20260826-0900-feat-adr-321-world-index.md` — this file

## Notes
- Session started: 2026-08-26 (session 1f4b9f)
