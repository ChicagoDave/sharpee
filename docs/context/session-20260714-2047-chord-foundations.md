# Session Summary: 2026-07-14 - chord-foundations

## Goals
- Accept the ADR-214 Chord↔Sharpee parity umbrella ADR.
- Design and accept the full ADR-214 child roadmap (six new ADRs) via open-questions interviews.
- Cross-check the new ADR set for seams and fix any findings.
- Refresh the ADR-218 implementation plan to match final decisions.

## Phase Context
- **Plan**: `docs/work/chord-foundations/plan.md` — "Land the three foundations-first ADR-214 §8 workstreams ADR-218 designs (catalog adjectives, liquid model, door loading), plus the capability-dispatch fallback workstream gated separately."
- **Phase executed**: None — this was pure ADR design/planning work upstream of Phase 1. Phase 1 ("Catalog adjectives — enterable and climbable (§1a)") remains **CURRENT** (queued, not started) in the plan; the `.session-state-ae2a61.json` phase/budget fields reflect that queued phase, not work performed this session.
- **Tool calls used**: 286 (session total; not charged against Phase 1's budget since Phase 1 has not started).
- **Phase outcome**: N/A — no plan phase was executed. This session did the ADR design that Phase 1 (and Phases 2–5) depend on, plus produced/refreshed the plan itself.

## Completed

### ADR-214 accepted (umbrella)
- `docs/architecture/adrs/adr-214-chord-platform-parity.md` flipped DRAFT → ACCEPTED (all six open questions resolved via interview).

### Six child ADRs drafted, interviewed, and accepted
- **ADR-218** Chord Foundations (`adr-218-chord-foundations.md`) — catalog adjectives (enterable/climbable/drinkable/liquid), door loading, capability-dispatch fallback behavior; spawned ADR-219/220/221 as dedicated designs.
- **ADR-221** Capability-Dispatch Fallback Wiring (`adr-221-capability-dispatch-fallback-wiring.md`) — reuses the existing clause interpreter for effect replay; `refuse`-based error path; general argument-binding for extra slots.
- **ADR-217** Chord Timer & Scheduler Controls (`adr-217-chord-timer-controls.md`) — first-class fuses, lexical handle scope, early/normal/late priority bands, widened to the full Daemon concept.
- **ADR-219** Liquids & Pouring (`adr-219-liquids-and-pouring.md`) — pour/fill/empty plus mixing; container is source of truth for amount; `drinkable` implies `liquid`; defines a reaction/on-mixing hook.
- **ADR-220** Doors & Portals (`adr-220-doors-and-portals.md`) — direct exits stay simple, everything else logic-gated; when/computed-destination fields; retains the `between` construct.
- **ADR-215** Chord Extensions & Combat (`adr-215-chord-extensions-and-combat.md`) — `use <extension>` syntax; static vocabulary manifest; combat adjectives plus with-stats; NPCs auto-wire; runtime-bundled trust registry; three-part extension contribution surface including renderers.
- **ADR-216** Emit Payload & Media (`adr-216-chord-emit-payload-and-media.md`) — full nested emit payload; full media sugar; declared assets; client-has capability degradation; custom channels.
- Roughly 28 open questions resolved one at a time across the six interviews.

### Cross-ADR review and fixes
- Ran a multi-ADR review across the new set; fixed 4 findings: the ADR-215↔ADR-216 renderer seam, a `define...from` overload ambiguity, emit `=` drift, and plan staleness.

### Plan created and refreshed
- `docs/work/chord-foundations/plan.md` created for ADR-218 implementation, then refreshed after the interviews concluded to reflect final ADR decisions (notably ADR-221's design-block clearing, which un-gates Phase 5's design dependency while leaving David's platform go-ahead as the remaining gate).

## Key Decisions

### 1. Foundations-first sequencing (ADR-214 §8)
Catalog adjectives → liquid model → door loading → capability-dispatch fallback → timer controls → extensions/combat → emit/media, each gated on its own ADR design being ACCEPTED before implementation planning proceeds.

### 2. `drinkable` implies `liquid` (ADR-219)
A drinkable entity is by definition a liquid; `LiquidTrait` is the single source of truth for liquid-ness so a `drinkable` entity is automatically pourable once ADR-219's pouring subsystem lands. This drove the ADR-218 Phase 2 fixture design (drinkable fixture must assert both `EdibleTrait.liquid` and `LiquidTrait`).

### 3. Capability-dispatch fallback reuses the clause interpreter (ADR-221)
Rather than inventing a second execution path for synthesized behaviors, `on <verb> it` clauses replay through the existing clause interpreter (`runtime.runClause`), with `refuse` as the in-clause rejection mechanism. This clears the design blocker for ADR-218 Phase 5 (Sharpee↔Chord parity goal, `docs/context/sharpee-chord-parity-goal.md`-tracked work).

### 4. Doors stay simple by default (ADR-220)
Direct two-room exits remain the simple case (unchanged from ADR-218's `between` construct); logic-gating (when/computed-destination) is reserved for everything more complex, avoiding forcing every door author through a full logic-gate.

## Next Phase
- **Phase 1**: "Catalog adjectives — enterable and climbable (§1a)" — implements ADR-218 §1a: add `enterable`/`climbable` to `TRAIT_ADJECTIVES` in `packages/chord/src/catalog.ts`, wire loader trait-switch arms in `packages/story-loader/src/loader.ts`, two compiled fixtures under `docs/work/chord-foundations/fixtures/`.
- **Tier**: Small (100 tool-call budget).
- **Entry state**: David's explicit go-ahead to implement ADR-218 — **not yet given**. This is the sole remaining gate; ADR-218 itself is ACCEPTED but per CLAUDE.md ("platform changes require discussion first"), design acceptance does not substitute for the separate implementation go-ahead. No `packages/` code should be touched until that go-ahead is given.

## Open Items

### Short Term
- Get David's explicit go-ahead to begin ADR-218 Phase 1 implementation (`packages/chord`, `packages/story-loader` — no code has been touched yet).
- Once unblocked, Phases 1–4 of `docs/work/chord-foundations/plan.md` implement ADR-218's three foundations workstreams; Phase 5 (capability-dispatch fallback) additionally requires a separate go-ahead call-out per its own gating note.

### Long Term
- ADR-217 (timer controls), ADR-215 (extensions/combat), ADR-216 (emit/media), and ADR-219/ADR-220 (liquids/doors, beyond what ADR-218 Phase 2/3 cover) are all ACCEPTED but each needs its own implementation plan — explicitly out of scope for the chord-foundations plan per its own Notes section.
- Sharpee↔Chord parity goal (`docs/context/sharpee-chord-parity-goal.md`) tracks these workstreams against `docs/work/stdlib-reference/chord-availability-audit.md`'s scoreboard; each phase's exit criteria name which audit rows flip to reachable.

## Files Modified

**ADRs** (8 files):
- `docs/architecture/adrs/adr-214-chord-platform-parity.md` — DRAFT → ACCEPTED
- `docs/architecture/adrs/adr-215-chord-extensions-and-combat.md` — drafted, interviewed, ACCEPTED
- `docs/architecture/adrs/adr-216-chord-emit-payload-and-media.md` — drafted, interviewed, ACCEPTED
- `docs/architecture/adrs/adr-217-chord-timer-controls.md` — drafted, interviewed, ACCEPTED
- `docs/architecture/adrs/adr-218-chord-foundations.md` — drafted, interviewed, ACCEPTED
- `docs/architecture/adrs/adr-219-liquids-and-pouring.md` — drafted, interviewed, ACCEPTED
- `docs/architecture/adrs/adr-220-doors-and-portals.md` — drafted, interviewed, ACCEPTED
- `docs/architecture/adrs/adr-221-capability-dispatch-fallback-wiring.md` — drafted, interviewed, ACCEPTED

**Planning** (1 file):
- `docs/work/chord-foundations/plan.md` — created for ADR-218 implementation, then refreshed post-interview

## Notes

**Session duration**: several hours (session start 2026-07-14 23:58 UTC per `.session-state-ae2a61.json`; 286 tool calls recorded).

**Approach**: Sequential ADR interviews (one open question at a time, per ADR-0009 discipline), each ADR folding answers immediately, followed by a cross-ADR review pass to catch seams between the six sibling designs before accepting the set as final. No platform or package code (`packages/*`) was touched — this session is entirely documentation/design under `docs/architecture/adrs/` and `docs/work/chord-foundations/`.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A — design work is complete; the noted next step (David's implementation go-ahead) is an explicit gate, not a blocker to this session's own scope.
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (design phase complete; implementation estimate lives in `docs/work/chord-foundations/plan.md`'s per-phase budgets)
- **Rollback Safety**: safe to revert (documentation-only changes; no code, no schema, no build artifacts)

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-214 umbrella existed in DRAFT form from the prior session (`4b449d0b docs(chord): Sharpee->Chord parity audit + ADR-214 (DRAFT)`) as the entry point for this session's interviews.
- **Prerequisites discovered**: None — all six child ADR designs were resolvable within this session without external blockers.

## Architectural Decisions

- ADR-214: Chord↔Sharpee parity umbrella — ACCEPTED, all 6 OQs resolved.
- ADR-215: Chord Extensions & Combat — ACCEPTED, all 6 OQs resolved.
- ADR-216: Emit Payload & Media — ACCEPTED, all 6 OQs resolved.
- ADR-217: Timer & Scheduler Controls — ACCEPTED, all 5 OQs resolved.
- ADR-218: Chord Foundations — ACCEPTED, all OQs resolved (spawned ADR-219/220/221).
- ADR-219: Liquids & Pouring — ACCEPTED, all 4 OQs resolved.
- ADR-220: Doors & Portals — ACCEPTED, all OQs resolved.
- ADR-221: Capability-Dispatch Fallback Wiring — ACCEPTED, all 3 OQs resolved.
- Pattern applied: ADR-0009 open-questions interview discipline (one question at a time, folded immediately) across all six child ADRs; cross-ADR review pattern applied once across the full set before final acceptance.

## Mutation Audit

- Files with state-changing logic modified: None — no source code was touched this session.
- Tests verify actual state mutations (not just events): N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this is the first full ADR-214 child-roadmap design pass; no comparable multi-ADR interview batch appears in prior session summaries.

## Test Coverage Delta

- Tests added: 0
- Tests passing before: N/A → after: N/A
- Known untested areas: All of ADR-218's designed surfaces (catalog adjectives, liquid model, door loading, capability-dispatch fallback) remain untested until Phase 1 implementation begins — none of that code exists yet.

---

**Progressive update**: Session completed 2026-07-14 20:47
