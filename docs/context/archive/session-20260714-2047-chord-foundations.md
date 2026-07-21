# Session Summary: 2026-07-14 - chord-foundations

## Goals
- Accept the ADR-214 Chord↔Sharpee parity umbrella ADR.
- Design and accept the full ADR-214 child roadmap (six new ADRs) via open-questions interviews.
- Cross-check the new ADR set for seams and fix any findings.
- Refresh the ADR-218 implementation plan to match final decisions.
- Build a master roadmap sequencing all seven Chord-parity workstreams and write per-workstream session plans.
- Reconcile older overlapping ADRs (115, 119) and pin scope-gating language on ADR-215/217 so the new set doesn't silently reopen settled platform behavior.

## Phase Context
- **Plan**: `docs/work/chord-foundations/plan.md` — "Land the three foundations-first ADR-214 §8 workstreams ADR-218 designs (catalog adjectives, liquid model, door loading), plus the capability-dispatch fallback workstream gated separately."
- **Phase executed**: None — this was pure ADR design/planning work upstream of Phase 1. Phase 1 ("Catalog adjectives — enterable and climbable (§1a)") remains **CURRENT** (queued, not started) in the plan; the `.session-state-ae2a61.json` phase/budget fields reflect that queued phase, not work performed this session.
- **Tool calls used**: 471 (session total; not charged against Phase 1's budget since Phase 1 has not started).
- **Phase outcome**: N/A — no plan phase was executed. This session did the ADR design and cross-workstream planning that Phase 1 (and Phases 2–5, plus the six sibling workstreams) depend on.

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

### Master roadmap and per-workstream plans (second phase of the session)
- `docs/work/chord-parity/roadmap.md` — master implementation roadmap sequencing all seven Chord-parity workstreams (W1–W7) in dependency order. W1 = chord-foundations (already existed), W2 = chord-foundations Phase 5 (capability-dispatch fallback), W3–W7 are the newly planned workstreams below. Build order is documented as a recommended sequence, not a strict gate — W4/W5/W6 only depend on W1.
- Per-workstream session plans written (each leaves `docs/context/.current-plan` pointed at chord-foundations — these are plan-ahead artifacts, not active plans):
  - `docs/work/chord-liquids/plan.md` (W3 — Liquids & pouring, ADR-219)
  - `docs/work/chord-doors/plan.md` (W4 — Doors & portals, ADR-220)
  - `docs/work/chord-timers/plan.md` (W5 — Timers, ADR-217)
  - `docs/work/chord-extensions/plan.md` (W6 — Extensions & combat, ADR-215)
  - `docs/work/chord-media/plan.md` (W7 — Emit & media, ADR-216)
  - Each plan passed plan-review, with a couple of advisory tensions surfaced and resolved inline.

### ADR housekeeping (reconciling with pre-existing ADRs)
- **Closed ADR-115** (Map Export CLI): its map-tooling scope moves into SharpeeIDE (ADR-154); its exit-condition metadata is subsumed by ADR-220's `when`/computed-destination model. Added reconciliation notes cross-referencing ADR-220 and a pointer in ADR-154.
- **Corrected ADR-119** (State Machines) status: stale `PROPOSED` → `IMPLEMENTED (core)`, reflecting that `@sharpee/plugin-state-machine` already ships. Open questions #2/#3 marked RESOLVED by what shipped; #4/#5/#6 reframed as future enhancements rather than open blockers.
- **Pinned ADR-215's** `use state-machines` gating scope: only the new ADR-119-depth behavior is gated by this Chord work; existing `states:`/`select`/`change` usage stays unconditional — no breaking change to already-shipped behavior.
- **Pinned ADR-217's** `, once` → `runOnce` scope: new constructs use the real `runOnce` primitive; existing sequence/every-turn timer behavior is unchanged (additive only).
- Clarified the roadmap's build-order numbering as recommended, not strict, given the ADR-215/217 scope pins above.

## Key Decisions

### 1. Foundations-first sequencing (ADR-214 §8)
Catalog adjectives → liquid model → door loading → capability-dispatch fallback → timer controls → extensions/combat → emit/media, each gated on its own ADR design being ACCEPTED before implementation planning proceeds.

### 2. `drinkable` implies `liquid` (ADR-219)
A drinkable entity is by definition a liquid; `LiquidTrait` is the single source of truth for liquid-ness so a `drinkable` entity is automatically pourable once ADR-219's pouring subsystem lands. This drove the ADR-218 Phase 2 fixture design (drinkable fixture must assert both `EdibleTrait.liquid` and `LiquidTrait`).

### 3. Capability-dispatch fallback reuses the clause interpreter (ADR-221)
Rather than inventing a second execution path for synthesized behaviors, `on <verb> it` clauses replay through the existing clause interpreter (`runtime.runClause`), with `refuse` as the in-clause rejection mechanism. This clears the design blocker for ADR-218 Phase 5 (Sharpee↔Chord parity goal, `docs/context/sharpee-chord-parity-goal.md`-tracked work).

### 4. Doors stay simple by default (ADR-220)
Direct two-room exits remain the simple case (unchanged from ADR-218's `between` construct); logic-gating (when/computed-destination) is reserved for everything more complex, avoiding forcing every door author through a full logic-gate.

### 5. "Every open ADR gets realized" is scoped to the Chord-alignment set, not the whole ADR corpus
David clarified this applies to ADR-214 + its children only. The project has roughly 40 ADRs total, most already implemented but never formally flipped to ACCEPTED — those are out of scope for this directive. Within the Chord-alignment set specifically, "do nothing / stay dormant" is never an acceptable outcome for any child ADR.

### 6. Parity means access, not reimplementation
Overlapping older ADRs (119 state-machines, 138 audio, 070 npc, 072 combat) describe platform systems that already exist; the new parity children EXPOSE those systems to Chord authors rather than competing with or replacing them — complementary, not conflicting. Reconciliation work (like the ADR-115 closure) is reserved for cases where an older ADR proposed a parallel, never-built design that the new ADRs now supersede.

## Next Phase
- **Phase 1**: "Catalog adjectives — enterable and climbable (§1a)" — implements ADR-218 §1a: add `enterable`/`climbable` to `TRAIT_ADJECTIVES` in `packages/chord/src/catalog.ts`, wire loader trait-switch arms in `packages/story-loader/src/loader.ts`, two compiled fixtures under `docs/work/chord-foundations/fixtures/`.
- **Tier**: Small (100 tool-call budget).
- **Entry state**: David's explicit go-ahead to implement ADR-218 (W1) — **not yet given**. This is the sole remaining gate; ADR-218 itself is ACCEPTED but per CLAUDE.md ("platform changes require discussion first"), design acceptance does not substitute for the separate implementation go-ahead. No `packages/` code should be touched until that go-ahead is given. Once W1 (chord-foundations) and W2 (its Phase 5) are built, `docs/work/chord-parity/roadmap.md` sequences W3 (liquids) → W4 (doors) → W5 (timers) → W6 (extensions/combat) → W7 (emit/media), each gated on its own separate go-ahead.

## Open Items

### Short Term
- Get David's explicit go-ahead to begin ADR-218 Phase 1 (W1) implementation (`packages/chord`, `packages/story-loader` — no code has been touched yet).
- Once unblocked, Phases 1–4 of `docs/work/chord-foundations/plan.md` implement ADR-218's three foundations workstreams; Phase 5 (W2, capability-dispatch fallback) additionally requires a separate go-ahead call-out per its own gating note.
- Commit `8dc45883` (roadmap + W3/W4 plans + ADR-115 closure/220/154 edits) is local-only — not yet pushed.
- Uncommitted at session end: W5 (`docs/work/chord-timers/plan.md`) and W6 (`docs/work/chord-extensions/plan.md`) plans, the ADR-119/215/217 scope-pin edits, the roadmap build-order clarification, and the W7 (`docs/work/chord-media/plan.md`) plan — none of this is staged or committed.

### Long Term
- ADR-217 (timers, W5), ADR-215 (extensions/combat, W6), ADR-216 (emit/media, W7), and ADR-219/ADR-220 (liquids/doors, W3/W4, beyond what ADR-218 Phase 2/3 cover) are all ACCEPTED and now each have a written session plan — implementation of every one is gated on its own explicit go-ahead per the platform-change rule.
- Sharpee↔Chord parity goal (`docs/context/sharpee-chord-parity-goal.md`) tracks these workstreams against `docs/work/stdlib-reference/chord-availability-audit.md`'s scoreboard; each phase's exit criteria name which audit rows flip to reachable.

## Files Modified

**ADRs** (11 files):
- `docs/architecture/adrs/adr-214-chord-platform-parity.md` — DRAFT → ACCEPTED
- `docs/architecture/adrs/adr-215-chord-extensions-and-combat.md` — drafted, interviewed, ACCEPTED; later pinned `use state-machines` gating scope (uncommitted)
- `docs/architecture/adrs/adr-216-chord-emit-payload-and-media.md` — drafted, interviewed, ACCEPTED
- `docs/architecture/adrs/adr-217-chord-timer-controls.md` — drafted, interviewed, ACCEPTED; later pinned `, once`→`runOnce` scope (uncommitted)
- `docs/architecture/adrs/adr-218-chord-foundations.md` — drafted, interviewed, ACCEPTED
- `docs/architecture/adrs/adr-219-liquids-and-pouring.md` — drafted, interviewed, ACCEPTED
- `docs/architecture/adrs/adr-220-doors-and-portals.md` — drafted, interviewed, ACCEPTED; reconciliation notes added for ADR-115 closure (committed in `8dc45883`)
- `docs/architecture/adrs/adr-221-capability-dispatch-fallback-wiring.md` — drafted, interviewed, ACCEPTED
- `docs/architecture/adrs/adr-115-map-export-cli.md` — closed, superseded by ADR-220/154 (committed in `8dc45883`)
- `docs/architecture/adrs/adr-154-sharpee-ide.md` — pointer to ADR-115 closure added (committed in `8dc45883`)
- `docs/architecture/adrs/adr-119-state-machines.md` — status corrected `PROPOSED` → `IMPLEMENTED (core)`; OQ #2/#3 resolved, #4/#5/#6 reframed (uncommitted)

**Planning** (7 files):
- `docs/work/chord-foundations/plan.md` — created for ADR-218 implementation, then refreshed post-interview (committed in `3ab214b2`)
- `docs/work/chord-parity/roadmap.md` — master W1–W7 roadmap, created then clarified on build-order (created in `8dc45883`; clarification uncommitted)
- `docs/work/chord-liquids/plan.md` — W3 session plan (committed in `8dc45883`)
- `docs/work/chord-doors/plan.md` — W4 session plan (committed in `8dc45883`)
- `docs/work/chord-timers/plan.md` — W5 session plan (uncommitted, untracked)
- `docs/work/chord-extensions/plan.md` — W6 session plan (uncommitted, untracked)
- `docs/work/chord-media/plan.md` — W7 session plan (uncommitted, untracked)

## Notes

**Session duration**: several hours across two phases (session start 2026-07-14 23:58 UTC per `.session-state-ae2a61.json`; 471 tool calls recorded).

**Approach**: Phase A ran sequential ADR interviews (one open question at a time, per ADR-0009 discipline), each ADR folding answers immediately, followed by a cross-ADR review pass to catch seams between the six sibling designs before accepting the set as final. Phase B built the master roadmap and wrote one session plan per remaining workstream (each plan passing plan-review), then reconciled the new ADR set against pre-existing overlapping ADRs (115, 119) and pinned scope-gating language on ADR-215/217 so the Chord work doesn't silently reopen already-shipped platform behavior. No platform or package code (`packages/*`) was touched at any point — the entire session is documentation/design under `docs/architecture/adrs/` and `docs/work/`.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A — design and planning work is complete; the noted next step (David's implementation go-ahead per workstream) is an explicit gate, not a blocker to this session's own scope.
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (design/planning phase complete for all seven workstreams; implementation estimates live in each workstream's own plan.md)
- **Rollback Safety**: safe to revert (documentation-only changes; no code, no schema, no build artifacts). Note: second commit (`8dc45883`) is local-only and unpushed, and several further edits (ADR-119/215/217 fixes, roadmap clarification, W5/W6/W7 plans) are still uncommitted working-tree changes.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-214 umbrella existed in DRAFT form from the prior session (`4b449d0b docs(chord): Sharpee->Chord parity audit + ADR-214 (DRAFT)`) as the entry point for this session's interviews.
- **Prerequisites discovered**: None — all six child ADR designs and all seven workstream plans were resolvable within this session without external blockers.

## Architectural Decisions

- ADR-214: Chord↔Sharpee parity umbrella — ACCEPTED, all 6 OQs resolved.
- ADR-215: Chord Extensions & Combat — ACCEPTED, all 6 OQs resolved; `use state-machines` gating scope pinned to new ADR-119 depth only.
- ADR-216: Emit Payload & Media — ACCEPTED, all 6 OQs resolved.
- ADR-217: Timer & Scheduler Controls — ACCEPTED, all 5 OQs resolved; `, once`→`runOnce` scope pinned as additive-only.
- ADR-218: Chord Foundations — ACCEPTED, all OQs resolved (spawned ADR-219/220/221).
- ADR-219: Liquids & Pouring — ACCEPTED, all 4 OQs resolved.
- ADR-220: Doors & Portals — ACCEPTED, all OQs resolved; absorbed ADR-115's exit-condition metadata via `when`/computed-destination.
- ADR-221: Capability-Dispatch Fallback Wiring — ACCEPTED, all 3 OQs resolved.
- ADR-115: Map Export CLI — CLOSED, superseded by ADR-154 (tooling) and ADR-220 (exit-condition metadata).
- ADR-119: State Machines — status corrected PROPOSED → IMPLEMENTED (core); no new OQs, existing OQs reclassified.
- Pattern applied: ADR-0009 open-questions interview discipline (one question at a time, folded immediately) across all six child ADRs; cross-ADR review pattern applied once across the full set before final acceptance; session-planner + plan-review applied once per workstream (W3–W7).

## Mutation Audit

- Files with state-changing logic modified: None — no source code was touched this session.
- Tests verify actual state mutations (not just events): N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this is the first full ADR-214 child-roadmap design-and-planning pass; no comparable multi-ADR interview + multi-workstream planning batch appears in prior session summaries.

## Test Coverage Delta

- Tests added: 0
- Tests passing before: N/A → after: N/A
- Known untested areas: All of ADR-218's designed surfaces (catalog adjectives, liquid model, door loading, capability-dispatch fallback) and all six sibling workstreams' surfaces (liquids, doors, timers, extensions/combat, emit/media) remain untested until their respective implementation phases begin — none of that code exists yet.

---

**Progressive update**: Session completed 2026-07-14 20:47
