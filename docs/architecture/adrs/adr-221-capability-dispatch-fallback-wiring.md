# ADR-221: Capability-Dispatch Fallback Wiring (implementation)

## Status: ACCEPTED — implementation-level (2026-07-14; deferred from ADR-218 §3, then designed via interview the same session; all three open questions resolved)

> Created 2026-07-14 during the ADR-218 (Chord Foundations) interview. ADR-218 §3
> fixes the *decision*: a capability-dispatch verb's per-entity meaning is the
> entity's `on <verb> it` clause (ADR-214 OQ1), a registered TypeScript
> `CapabilityBehavior` wins over the synthesized on-clause fallback, and the
> wiring is loader-only. David chose (ADR-218 interview) to give the
> *implementation details* their own ADR rather than settle them inside the
> foundations ADR. This is that placeholder — the wiring is not yet designed and
> must be before the dispatch-fallback workstream is coded.

## Date: 2026-07-14

## Context

ADR-218 §3 closes the `lowering`/`raising` capability-dispatch gap by having the
loader synthesize a `CapabilityBehavior` from an entity's compiled `on <verb> it`
clause when no TypeScript behavior is registered. The high-level shape is fixed
there; the mechanical details of turning compiled Chord effects into a behavior
that the dispatch action invokes are non-trivial and warrant their own record.

Grounding: `lowering`/`raising` are built with `createCapabilityDispatchAction`
(`packages/stdlib/src/actions/standard/lowering/lowering.ts`) keyed on
`if.action.lowering` / `if.action.raising`; the loader already imports the
`CapabilityBehavior` type (`loader.ts:42`) and compiles entity `on <gerund> it`
clauses.

## Decision

### Effect replay — reuse the clause interpreter (resolved 2026-07-14)

The synthesized `CapabilityBehavior.execute` **reuses the same runtime path that
already executes entity on-clauses** (e.g. `after entering it`), passing a
dispatch context — it does **not** lower the clause to a separate compiled thunk.
Rationale: one execution path to maintain, and the fallback's semantics are
guaranteed identical to every other on-clause (no risk of a divergent second
interpreter). Shape: `behavior.execute = (ctx) => runtime.runClause(clauseIR,
dispatchCtx)`.

### Error semantics — `refuse` inside the clause (resolved 2026-07-14)

Failure is expressed **by the on-clause itself, through Chord's existing `refuse`
mechanism** — the author writes the guard and message inside the clause
(`refuse "…" when <cond>`), and the dispatch action surfaces whatever the clause
emitted. No new error channel; consistent with how Chord authors already reject
actions. The **no-handler-at-all** case (an entity with neither an `on <verb> it`
clause nor a registered TS `CapabilityBehavior`) falls back to the dispatch
action's own default blocked message (its existing message id) — the clause path
only runs when a clause exists.

### Dispatch-time arguments — general arg-binding (resolved 2026-07-14)

The on-clause supports **binding dispatch-time arguments beyond `it`**, designed
generally now rather than deferred. The base form `on <verb> it` binds only the
target; an extended form binds the verb's additional operands to names — e.g.
`on turning it to <target>` binds `<target>` to the verb's second slot. At
dispatch time the action passes its resolved operands into the clause context
under those names, so the clause body can read them. The **specific slot
vocabulary for each verb derives from that verb's parser grammar pattern**
(parser-en-us) and is fixed when the verb is added (a ratchet entry per verb);
`lowering`/`raising` use only `it` today, but the binding mechanism is in place
for `turn`/`wave`/`wind`/etc. without a further ADR.

### Event ordering & registration (bounded, to confirm in implementation)

- **Event ordering** — the synthesized behavior runs through the standard clause
  interpreter (reuse decision above), so its events order relative to the dispatch
  action's report phase (ADR-051) exactly as any on-clause does; deterministic by
  construction.
- **Registration timing & precedence** — the loader registers the synthesized
  behavior at load; a real `registerCapabilityBehavior` call always overrides it
  for the same entity+capability (ADR-218 §3 / AC-4). Asserted by test.

## Consequences

- The dispatch-fallback wiring is fully specified: one execution path (the clause
  interpreter reused), refusal via `refuse` in the clause, a general arg-binding
  mechanism, and TS-behavior-wins precedence. ADR-218 Phase 5 is unblocked to
  plan against this ADR.
- No new Chord author surface (the surface is ADR-218 §3's existing
  `on <verb> it`); the work is loader/analyzer plus a small stdlib
  capability-dispatch touch. Additive — existing stories unaffected.
- The general arg-binding mechanism makes every future capability-dispatch verb
  (`turn`/`wave`/`wind`) reachable via `on <verb> it [<extra-slots>]` with only a
  per-verb ratchet entry, no further ADR.

## Acceptance criteria

- **AC-1 — fallback runs the clause.** A fixture entity with `on lowering it`
  (no TS behavior) lowers via the `lower` verb; the clause's effects are asserted,
  and an event-order check confirms they interleave with the dispatch action's
  report exactly as a normal on-clause would.
- **AC-2 — refuse surfaces.** A clause with `refuse "…" when <cond>` refuses the
  dispatch when the condition holds, surfacing the author's message; the
  no-handler entity gets the action's default blocked message instead.
- **AC-3 — precedence.** A registered TS `CapabilityBehavior` overrides the
  synthesized on-clause fallback for the same entity+capability (shared with
  ADR-218 AC-4).
- **AC-4 — arg-binding.** A test verb with a second slot binds its operand in the
  clause (mechanism-level; may use a scaffolded verb until a real multi-arg
  dispatch verb ships).

## Session

Session ae2a61 (2026-07-14) — created as an implementation-level placeholder
during the ADR-218 interview, designed via interview the same session (3 open
questions resolved). Parent: ADR-218 §3 (the fixed decision). Related: ADR-214
OQ1 (the seam), ADR-090 (capability dispatch), ADR-051 (action phases).
