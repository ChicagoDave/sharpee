# ADR-219: Liquids & Pouring

## Status: ACCEPTED (2026-07-14 — spun out of ADR-218 §1b, then designed via interview the same session; all four open questions resolved)

> Created 2026-07-14 during the ADR-218 (Chord Foundations) interview. Resolving
> ADR-218's "LiquidTrait depth" question, David chose a full liquids subsystem
> (marker trait + a `pouring` action + fill/empty container interactions). To
> keep ADR-218 cohesive as a foundations ADR, the pouring subsystem is spun out
> here. ADR-218 defines the marker-only `LiquidTrait`; this ADR builds the
> pouring/fill/empty behavior on top of it. This is a **placeholder** — the
> design has not been done; it needs its own interview before ACCEPTED.

## Date: 2026-07-14

## Context

The world model models liquids only as `EdibleTrait.liquid` (a drinkable edible)
and `ContainerTrait.containsLiquid`/`liquidType`/`liquidAmount` (a vessel's
contents). ADR-218 adds a marker-only `LiquidTrait` so a standalone liquid
substance (`create the acid, liquid`) is authorable in Chord. It does **not** add
any liquid *interaction* — you cannot pour, fill, empty, or mix.

David's ADR-218 interview decision (2026-07-14): liquids should reach further —
a `pouring` action and container interactions (`pour A into B`, `fill X from Y`,
empty), which is a genuine platform feature (new stdlib action + parser grammar +
world-model behavior), not a Chord-surface add. That feature is this ADR.

## Decision

### Scope — transfer + mixing (resolved 2026-07-14)

The subsystem covers the **full** liquid model: transfer (`pour A into B`, `fill B
from A`, `empty B`) with amount/volume tracking, **plus mixing** — combining
liquids under reaction rules that produce new substances (acid + water → diluted
acid; potion mixing). This is a reactions/recipe model layered on transfer, the
largest of the three scope options. It spans:

- **World-model**: **the container is the single source of truth for amount**
  (resolved 2026-07-14). `ContainerTrait.liquidType` + `liquidAmount` track *how
  much* liquid is *where*; `LiquidTrait` carries only the substance's **intrinsic
  identity** (its type name, mixing/reaction rules — no transient amount). This
  gives a clean **type/instance split**: a `create the acid, liquid` entity
  *defines* the acid substance (its properties and reactions), and any container
  holds a quantity of it via `liquidType: 'acid'` + `liquidAmount`. Transfer moves
  amounts between holders; no two-field sync. Consequence: a *free-standing*
  quantity of liquid needs a holder (a container, or the room acting as one) —
  `LiquidTrait` alone never carries an amount. A reaction behavior combines two
  liquids in a holder into a result substance (design in OQ2/reactions below).
- **stdlib**: `pouring`, `filling`, `emptying`, and `mixing` actions
  (validate/execute/report/blocked), composing with the existing `drinking`
  container-liquid branch.
- **parser-en-us**: grammar for `pour :liquid into :container`, `fill :container
  from :source`, `empty :container`, `mix :a and :b`, and vocabulary.
- **Chord surface**: how a `.story` reaches all of the above, and how **reactions
  are declared** (a recipe table?) — under ADR-214 parity and the ADR-210 ratchet.

### `drinkable` implies `liquid` (resolved 2026-07-14)

A drinkable is by definition a liquid, so the `drinkable` adjective composes
**both** `EdibleTrait.liquid` **and** `LiquidTrait` — a `create the water,
drinkable` entity is drinkable *and* pourable/mixable with no extra word.
`LiquidTrait` is therefore the **single source of truth for liquid-ness**: pouring
and mixing test for `LiquidTrait`, and every drink carries it. This **refines
ADR-218 §1b**, which deferred the reconciliation here and had `drinkable`/`liquid`
orthogonal on an interim basis; the resolved rule is implication, not
orthogonality. (ADR-218's loader work composes both traits when it sees
`drinkable`.)

### Verbs and reactions (resolved 2026-07-14)

**Verbs are standard actions.** `pour`, `fill`, `empty`, and `mix` are ordinary
stdlib actions (validate/execute/report/blocked) with parser grammar, reachable
in Chord as verbs like any other — no special construct. `on mixing with <other>`
requires `mixing` in the catalog's `EVENT_VERBS` (as with other on-clause verbs).

**Reactions are declared two ways (both):**

- **Recipe table (primary, declarative)** — a top-level construct mapping liquid-
  type pairs to a result: `define reaction: acid + water -> diluted acid`. Central,
  data-driven, one place to scan; independent of the substance definitions.
- **On-clause hook (for custom logic)** — a liquid substance may carry
  `on mixing with <other>: …` to run effects beyond producing a result (emit,
  score, conditional outcomes), typically ending in `become <result>`. Keeps
  behavior on its owner (ADR-210 given 9).

The recipe table covers the common "A + B → C" case; the on-clause is the escape
hatch for reactions with side effects. When both match, the on-clause runs (it is
the more specific, effect-bearing form) — precedence to confirm in implementation.

*All ADR-219 design questions resolved.*

## Consequences

- A full liquids subsystem — transfer (pour/fill/empty), amount tracking, and
  mixing with reactions — spanning `packages/world-model` (LiquidTrait intrinsics
  + reaction behavior), `packages/stdlib` (four new actions), `packages/parser-en-us`
  (grammar), and the Chord surface (`define reaction`, `on mixing`, the verbs). A
  platform change under CLAUDE.md's world-model/stdlib discussion gate.
- The container is the single amount source of truth, so transfer never syncs two
  fields; `LiquidTrait` is a substance-identity/type definition, and quantities
  live in holders. Free-standing liquid needs a holder.
- `drinkable` now implies `LiquidTrait` (refining ADR-218 §1b), unifying drink-
  and pour-eligibility under one source of truth.
- Reactions have a clean declarative default (`define reaction`) with an on-clause
  escape hatch — data for the common case, code for effects.

## Acceptance criteria

Inherits ADR-214 AC-1..AC-4. Concretely:

- **AC-1 — transfer.** Fixtures: `pour` liquid from one container to another
  (amounts update on both), `fill` a container from a source, `empty` a container
  (amount → 0). Assert `ContainerTrait.liquidType`/`liquidAmount` after each.
- **AC-2 — mixing via recipe.** A `define reaction: acid + water -> diluted acid`
  fixture: pouring acid into water-holding container yields `diluted acid` as the
  container's `liquidType`.
- **AC-3 — mixing via on-clause.** A liquid with `on mixing with <other>` runs its
  effects (asserted event) and `become`s the result; on-clause wins when a recipe
  also matches.
- **AC-4 — drinkable implies liquid.** A `create the water, drinkable` entity is
  both drunk (routes to `drinking`) and poured (has `LiquidTrait`), asserted; and
  cloak/zoo compile unchanged (additive).

## Session

Session ae2a61 (2026-07-14) — created as a placeholder during the ADR-218
interview, then designed via interview the same session (4 open questions
resolved). Parent: ADR-218 §1b (marker `LiquidTrait`; §1b's drinkable/liquid
reconciliation resolved here). Related: ADR-214 (parity), ADR-210 (Chord grammar
ratchet).
