# ADR-193: Phrase Algebra — State-Derived Adjectives

## Status: ACCEPTED

> Accepted 2026-06-27 by David. Continues the ADR-192 atom roadmap. Unlike the
> other follow-ons this is **not a new `Phrase` kind** — `NounPhrase.adjectives`
> already exists and the Assembler already renders adjectives and agrees the
> article over the leading one (ADR-192 AC-4). ADR-193 adds the *contributor
> mechanism* that lets live trait state ("open", "locked") flow into those
> adjectives. Lands on `main` via `v2_adr193_state_adjectives`.

## Date: 2026-06-27

## Terminology

- **Static adjective** — from `IdentityTrait.adjectives` ("small", "iron"); already
  mapped by `nounPhraseFor` (ADR-192 §3).
- **State-derived adjective** — computed from a trait's *live state* ("open" from
  `OpenableTrait.isOpen`, "locked" from `LockableTrait.isLocked`).

## Context

The phrase algebra renders adjectives and recomputes a/an over them ("an open wooden
box" — "an" agrees over "open"). What was missing is the wiring from **trait state**
to `NounPhrase.adjectives`. ADR-192 §6 reserved this for ADR-193 ("trait contributor
hooks land in ADR-193"). The Assembler needs **no change**.

A naïve design — always prepend state adjectives in `nounPhraseFor` — is wrong: it
produces redundancy ("You open the **open** box.") and silently changes every
existing entity reference. So state adjectives are **opt-in** at the producer.

## Decision

Add a **contributor registry** in `@sharpee/world-model` keyed by trait type, and an
**opt-in flag** on `nounPhraseFor`. The Assembler is unchanged.

### 1. Contributor registry (`@sharpee/world-model`)

```ts
type AdjectiveContributor = (entity: IFEntity) => string[];
function registerAdjectiveContributor(traitType: string, fn: AdjectiveContributor): void;
function getStateAdjectives(entity: IFEntity): string[];  // collects from every registered trait the entity has
```

Default contributors (the "marked" states — IF prose says "the open door", not "the
closed door", by default):

| Trait | Contributes |
|-------|-------------|
| `OPENABLE` | `['open']` when `isOpen`, else `[]` |
| `LOCKABLE` | `['locked']` when `isLocked`, else `[]` |

The set is **open**: a story or extension calls `registerAdjectiveContributor` to add
its own (e.g. `LIGHT_SOURCE → 'lit'`, a story's `'glowing'`). Insertion order is the
adjective order; state adjectives are returned to be **prepended** before static ones.

### 2. Producer opt-in (`@sharpee/stdlib`)

```ts
nounPhraseFor(entity, ctx?, { stateAdjectives?: boolean })   // default false
```

When `stateAdjectives` is true, `nounPhraseFor` prepends `getStateAdjectives(entity)`
to the static `IdentityTrait.adjectives`. **Default false** ⇒ no change to any
existing call site; producers that *describe state* (examining, contents listing)
opt in deliberately, avoiding the "open the open box" redundancy.

### 3. Realization

No Assembler change. `NounPhrase.adjectives = ['open', 'wooden']` already renders
"open wooden box", and the Article authority agrees a/an over the realized head, so
the article **recomputes automatically** when the leading adjective changes with
state ("an open box" ↔ "a closed box" had it been contributed). This is the
ADR-192-vs-I7 advantage made dynamic (the experiment's row #18).

## Options considered

- **Always-on state adjectives in `nounPhraseFor`** — rejected: redundancy ("open the
  open box") and a silent global output change.
- **A new `Adjective`/`State` Phrase atom** — rejected: `NounPhrase.adjectives` is the
  right home; this is a producer-side data-flow, not a new realization.
- **Contributors on each trait class (`trait.stateAdjectives()`)** — viable, but a
  central registry keeps the mapping out of the trait's core contract and lets
  stories/extensions add contributors without subclassing traits.

## Scope

**In:** the contributor registry + `getStateAdjectives` in world-model; default
`OPENABLE`/`LOCKABLE` contributors; the `stateAdjectives` opt-in on `nounPhraseFor`;
prepend ordering.

**Out:** computed *names* (ADR-192 mentioned them alongside; deferred); wiring every
stdlib action to opt in (per-action judgment, separate); a fixed taxonomy of states
beyond the two defaults (the registry is open).

## Consequences

- Closes the I7 "state-derived adjective" gap (experiment row #18) — and the article
  auto-agrees over the dynamic head, which I7 needs a per-object override for.
- **No Assembler change; no default-output change** (opt-in) — platform stays green.
- **Extensible** — stories/extensions register contributors; world-model owns the
  hook, per ADR-192 §6's layer table.

## Acceptance Criteria

1. `getStateAdjectives` returns `['open']` for an open openable, `[]` for a closed
   one; `['locked']` for a locked lockable.
2. `nounPhraseFor(box, ctx, { stateAdjectives: true })` on an open box →
   `adjectives` begins with `'open'`; default (no opts) → unchanged (no state adj).
3. State adjectives **prepend** static ones: an open box with static `['wooden']` →
   `['open', 'wooden']`.
4. End-to-end: that NounPhrase renders "an open wooden box" with "an" agreeing over
   "open" (Assembler unchanged).
5. The registry is open: `registerAdjectiveContributor('lightSource', …)` then
   `getStateAdjectives` includes its output for a matching entity.
6. Determinism/boundary: no English strings cross into `if-domain`; identical state →
   identical adjectives.

## Relationships

- **Follow-on of** ADR-192 (the trait-contributor hook §6 reserved). Feeds
  `NounPhrase.adjectives` (no new kind). Sibling of ADR-197/198/199/200.

## Session

- Produced in session 491b9c (2026-06-27), the atom after `Pronoun` (ADR-197).
