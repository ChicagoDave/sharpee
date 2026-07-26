# ADR-275: Chord dispatch runtime — entity-less commands and semantic value binding

## Status: DRAFT (2026-07-25) — open questions below; not ACCEPTED until they are resolved (ADR-0009 discipline).

## Parent: ADR-267 (D12 direction map / acceptance 8 — the owner's ship-directions condition is this ADR's reason to exist). Relates to ADR-090 (capability dispatch), ADR-271 (dispatch grammar emission), ADR-268 (ordering — unaffected), the ADR-266 umbrella (D8 boundary: this is runtime wiring for a grammar construct, not a trait/behavior surface).

## Date: 2026-07-25

## Context

ADR-267 landing group 4 landed the `directions` block: `sail the direction` + a nautical
block emits `sail port`, `sail p`, …, and standalone `port`, `p`, … — each a registered
rule carrying `direction: <canonical>` in `rule.defaultSemantics` (asserted against a real
grammar engine; loader suite green). Acceptance 8 then requires a transcript proving
`sail port` and bare `starboard` **reach the action with the right direction**.

The dispatch runtime cannot serve that today (`runtime.ts` `buildDispatchAction`):

1. **Entity requirement.** Validate hard-requires `context.command.directObject?.entity` —
   no entity means the refusal ladder's `without` arm or the `otherwise` miss. A
   direction-expanded rule has **no entity slot at all**: `sail port` is two literals.
   The command parses, matches the rule, and can never reach the body.
2. **No semantic read.** `ctx.slots` binds slot name → **world entity id** (`animal` → the
   goat). The parsed command's semantics (`direction: 'port'`) are never bound anywhere a
   Chord body, condition, or phrase can see.

Both are runtime wiring for constructs the language already ruled — but the *shape* of the
runtime surface (what `the direction` means in body scope, conditions, and phrase
interpolation) was not ruled by ADR-267 and is owner territory (mini-ADR ruled 2026-07-25
over implement-in-gate).

## Decision (settled parts)

- **D1 — Entity-less dispatch exists.** A `define action` whose matched rule binds no
  entity runs its body without one, instead of dying at the entity gate. The refusal
  ladder still runs: `refuse when <condition>` arms evaluate (with no entity-dependent
  bindings), `refuse without <slot>` arms refuse only when the named slot is an entity
  slot of the matched rule. A body remains required — no body and no claiming behavior is
  still the dispatch miss (§5.4 unchanged for entity commands).
- **D2 — Semantics bind into the evaluation context.** The matched rule's semantic values
  (the `directions` canonical, `means` keys) become readable in the action's body scope by
  name — the same scope discipline as grammar slots (slot-first, single-word). The exact
  value surface is Q-1/Q-2.
- **D3 — The acceptance test is ADR-267 acceptance 8's fixture**, unchanged: a nautical
  sailing action; a transcript proves `sail port` and bare `starboard` reach the body with
  the right direction (direction-dependent output, no RNG).

## Open Questions

- **Q-1 (value surface):** How does a body read a semantic value? (a) semantic keys join
  the slots context as **word values** — `the direction` resolves to `port` (a word, not
  an entity); `{the direction}` in a phrase renders the word verbatim; or (b) a distinct
  reference form for semantics (e.g. only interpolation, no condition use), keeping
  entity-slot reads and word reads visibly different.
- **Q-2 (condition use):** May conditions compare semantic words — `refuse when the
  direction is aft: no-sailing-aft`, `select on the direction`? If yes, `is <word>`
  against a semantic value is plain word equality (never entity resolution); if no, the
  fixture proves direction via per-direction `select`-free means (e.g. distinct patterns),
  which weakens the proof.
- **Q-3 (shadowing):** A semantic key that collides with an entity name or a declared
  slot: does `analysis.slot-shadows-entity` (ADR-267 D2) extend to semantic keys, and does
  a semantic key lose to a real slot of the same name in the same action?
- **Q-4 (scope):** Do `must` requirement lines evaluate for entity-less commands (with
  entity-dependent predicates failing loud), or are they skipped when no entity is bound?

## Consequences

**Gained (when ACCEPTED + implemented):** ADR-267 acceptance 8 becomes provable; Chord
actions can own commands with no object (`sail port`, `pray`, `sing`) — a class the
dispatch runtime has excluded since Phase B. **Cost:** the dispatch validate/execute path
gains a second (entity-less) shape; the evaluator's slots context carries words as well as
entity ids — every consumer of `ctx.slots` must stay honest about which it holds.

## Session

Session of 2026-07-25 (2d5bc7). Written mid-ADR-267 Phase 4: emission landed and
rule-shape-tested; the runtime gap surfaced rather than silently bridged (dispatch entity
requirement at `runtime.ts` `buildDispatchAction`; `EvalContext.slots` entity-id-only).
Mini-ADR-first ruled by David same session.
