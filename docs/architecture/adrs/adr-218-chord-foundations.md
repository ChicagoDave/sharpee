# ADR-218: Chord Foundations — Catalog Adjectives, Door Loading, and Capability-Dispatch Fallback

## Status: ACCEPTED (2026-07-14 — foundations design for ADR-214 roadmap steps 1–3; all open questions resolved via interview, three spawned dedicated ADRs 219/220/221)

> Child of ADR-214 (Chord ⇄ Sharpee parity). ADR-214 §8 sequences the parity
> work "foundations first" and reserved ADR-215 (extensions/combat),
> ADR-216 (emit/media), and ADR-217 (timer controls) by name. This ADR takes
> the next free number (218) and covers the three foundation workstreams that
> ADR-214 grouped as low-risk, independent, and landable before the two
> design-heavy child ADRs: **catalog adjectives**, **door loading**, and the
> **capability-dispatch `on <verb> it` fallback**.

## Date: 2026-07-14

## Terminology

- **Composable vocabulary** — the closed word set a Chord author may write in a
  `create` block (`packages/chord/src/catalog.ts`): v1 kind nouns + trait
  adjectives. Anything else is a load error.
- **Trait adjective** — a bare word (no article) in a `create` block that the
  loader maps to a world-model trait (or a trait property).
- **Capability-dispatch verb** — a verb whose action has no single stdlib
  behavior by design (ADR-090); the per-entity meaning lives in a registered
  `CapabilityBehavior` (e.g. `lowering`, `raising`).
- **Grammar ratchet** — the one-way governance log
  `docs/architecture/chord-grammar-changes.md` (ADR-210); every composable-
  vocabulary or syntax change is a dated, owner-approved entry.

## Context

ADR-214 established the parity invariant (**100% Sharpee == 100% Chord**) and an
audited gap list. Its roadmap (§8) lands the independent, lower-risk workstreams
first as grammar-ratchet entries, before the two design-heavy child ADRs. This
ADR designs those first three workstreams:

1. **Catalog adjectives + the liquid model** — `enterable`, `climbable`,
   `drinkable`, and a `liquid` model (closes the `entering`, object-`climbing`,
   and `drinking` action gaps, and adds the non-drinkable-liquid substance the
   world model does not yet have — see §1).
2. **Door loading** — a two-room `between` placement (closes the `a door`
   construct, which the Phase A loader refuses).
3. **Capability-dispatch fallback** (ADR-214 OQ1) — the entity's `on <verb> it`
   clause as the dispatch target for `lowering`/`raising`.

> **Scope note (2026-07-14, interview).** Workstream 1 grew during the ADR-218
> interview: the audit's `drinking` gap was `edible.liquid` only, but "not all
> liquids are drinkable" surfaced that the world model has **no standalone
> liquid substance** (only `EdibleTrait.liquid` and `ContainerTrait.containsLiquid`).
> David chose to model liquids properly here (a new `LiquidTrait`), so ADR-218 is
> **no longer Chord-surface-only** — it carries one world-model addition and thus
> a platform change under CLAUDE.md's discussion gate. This ADR *is* that
> discussion.

Grounding in the current code (2026-07-14):

- **Traits already exist** in the world model: `EnterableTrait`
  (`packages/world-model/src/traits/enterable/`), `ClimbableTrait`
  (`.../climbable/`), and `EdibleTrait.liquid` (`.../edible/edibleTrait.ts:17`,
  read by `edibleBehavior.ts`). None are new platform traits — only the Chord
  surface is missing.
- **The catalog** (`packages/chord/src/catalog.ts`) lists 12 trait adjectives;
  `enterable`/`climbable`/`drinkable` are absent (audit "Notably absent" list).
- **The loader trait switch** (`packages/story-loader/src/loader.ts` ~line 639)
  maps each adjective to a trait; an unknown adjective throws "not a v1
  adjective" (loader.ts:684).
- **Doors do not load**: `loader.ts:600–601` throws `doors need `between`
  placement, which the Phase A loader does not support yet`. `door` is already a
  `KIND_NOUN`; `openable`/`lockable` already compose onto it — only placement is
  missing. Exits today are authored as `west to the Cloakroom` (cloak.story:11);
  there is no door-as-shared-portal construct yet.
- **Capability dispatch**: `lowering`/`raising` are built with
  `createCapabilityDispatchAction` (`packages/stdlib/src/actions/standard/
  lowering/lowering.ts`) keyed on `if.action.lowering` / `if.action.raising`;
  today an entity needs a TypeScript-registered `CapabilityBehavior`
  (`world.registerCapabilityBehavior(...)`). The loader already imports the
  `CapabilityBehavior` type (`loader.ts:42`) and already compiles entity
  `on <gerund> it` clauses (the `entering` event verb is in the catalog).

Two of the three are Chord-surface-only (catalog + loader). The exception,
after the interview, is the liquid model: `drinkable` and container liquid
contents map to existing traits, but a standalone non-drinkable liquid needs a
**new `LiquidTrait`** in the world model — the one platform-side addition in
this ADR (§1, LiquidTrait grep confirms none exists today).

## Decision

### 1. Catalog adjectives and the liquid model

#### 1a. `enterable` and `climbable` (kind (a), Chord-surface-only)

Add both to `catalog.ts` `TRAIT_ADJECTIVES` and add loader trait-switch cases:

| Adjective | Loader mapping | Closes |
|---|---|---|
| `enterable` | compose `EnterableTrait` (default config) | `entering` |
| `climbable` | compose `ClimbableTrait` (default config) | object-`climbing` |

Both map one-to-one to existing world-model traits. They compose onto any thing,
and legitimately onto `container`/`supporter` (a bench is an enterable
supporter). **`enterable` is always explicit** (interview, 2026-07-14): a
`container`/`supporter` is enterable only when the author writes `enterable`
(`create the cage, container, enterable`) — no kind is enterable by default and
there is no per-kind enterability config. This keeps the catalog uniform (one
adjective = one trait, no special cases). Each lands as its own dated
`chord-grammar-changes.md` ratchet entry with a fixture story.

#### 1b. The liquid model — `drinkable`, `liquid`, and container contents

"Drinkable" is **drink-eligibility**, not liquid-ness (interview, 2026-07-14):
`EdibleTrait.liquid = true` means "edible **and** a liquid," i.e. the player can
drink it. A non-drinkable liquid (acid, fuel) is simply not edible. The world
model currently has only two liquid representations — `EdibleTrait.liquid` and
`ContainerTrait.containsLiquid`/`liquidType`/`liquidAmount` — and **no standalone
liquid substance**. This ADR closes all three:

| Chord surface | Kind | Maps to | Example |
|---|---|---|---|
| `drinkable` adjective | (b) trait property | `EdibleTrait` with `liquid: true` | `create the water, drinkable` |
| `liquid` adjective | **new world-model trait** | a new `LiquidTrait` | `create the acid, liquid` |
| container liquid contents | (b) trait property | `ContainerTrait.containsLiquid` + `liquidType` (+ `liquidAmount`) | `create the bottle, container containing liquid water` |

- **`drinkable`** is not a new trait — it composes `EdibleTrait` with
  `liquid: true`, routing the item to `drinking` rather than `eating`. `edible`
  and `drinkable` are the two consumption-modes of one trait; declaring both on
  one entity is a conflict the loader rejects (AC-3). A generic `liquid` word is
  deliberately *not* the drink marker — it would wrongly imply acid is
  consumable.
- **`liquid`** is a **new `LiquidTrait`** (world-model addition — the platform
  change this ADR gates). In ADR-218 it is **marker-only**: it records that a
  discrete substance *is* a liquid (which is not, by itself, drinkable — `drink`
  and `eat` refuse it because it carries no `EdibleTrait`). It carries no further
  state and adds no new action. The full **pouring/fill/empty subsystem** (a
  `pouring` action, grammar, and container interactions) is **spun out to
  ADR-219 (Liquids & Pouring)** so this foundations ADR stays cohesive; ADR-219
  builds on the marker trait defined here.
- **`drinkable` implies `liquid`** (resolved in ADR-219, 2026-07-14). `drinkable`
  composes **both** `EdibleTrait.liquid` **and** `LiquidTrait`, so a `create the
  water, drinkable` entity is drinkable *and* (via ADR-219) pourable/mixable with
  no extra word; `LiquidTrait` is the single source of truth for liquid-ness. (The
  interim orthogonal framing this section first carried was superseded by ADR-219;
  ADR-218's loader composes both traits when it sees `drinkable`.)
- **Container liquid contents** — `container containing liquid <type>` sets
  `ContainerTrait.containsLiquid = true` and `liquidType = <type>`; the `drinking`
  action's existing container-liquid branch (`drinking.ts:101`) already consumes
  it. Chord-surface-only over existing state.
- Each surface lands as its own dated `chord-grammar-changes.md` ratchet entry
  with a fixture story (AC-1). The catalog/loader parts are additive (AC-2); the
  `LiquidTrait` addition follows the world-model discussion gate (this ADR).
- **Persistence.** `LiquidTrait` is marker-only, so it serializes as a bare trait
  (its own enumerable properties, per the world-serialization contract) with no
  migration — existing saves have no liquids and load unchanged; `EdibleTrait.liquid`
  and `ContainerTrait.containsLiquid` are pre-existing fields, unchanged here.

### 2. Door loading — `between` two-room placement

Finish the loader's door path (kind (c)) **for exactly the door the current
world model supports** — no more. Grounding: `DoorTrait` is `{ room1, room2,
bidirectional }` (a fixed pair of two rooms) and room exits are
`Partial<Record<DirectionType, IExitInfo>>` (direction-keyed, one exit per
direction, `IExitInfo = { destination, via }`). So the only door ADR-218 loads
is a **fixed two-room, directionally-placed** door. The author places it with a
`between` clause naming the two rooms and the reciprocal directions:

```
create a door called the oak door, openable, lockable with key the brass key
  between the Hall (east) and the Study (west)
```

- This maps 1:1 to the current model: build one `DoorTrait { room1: Hall,
  room2: Study }` entity, and set `Hall.exits.east = { destination: Study, via:
  door }` and `Study.exits.west = { destination: Hall, via: door }`. No
  world-model change. `openable`/`lockable` compose as they already do; a closed
  or locked door blocks passage from either side using the standard `going`/exit
  machinery — no new blocking mechanism.
- `door` stays a `KIND_NOUN` (already present); this ADR removes the
  `loader.ts:600` throw and implements this placement. The `between` create-line
  form is chosen over an exit-data `through` form because it declares the door
  and its reciprocal placement once (DRY) and matches `DoorTrait`'s two-room
  shape. **Confirmed retained by ADR-220** (2026-07-14): ADR-220 keeps `between`
  for the direct door and only *adds* optional logic-gating (`when` / computed
  destination) for richer doors — this spelling is stable, not interim.
- **Deferred to ADR-220 (Doors & Portals), full-vision informal ADR.** Doors that
  the *current* model cannot express are out of scope here and captured in
  ADR-220 for later design (each needs world-model exit-model changes):
  directionless doors (exits are direction-keyed); **multiple doors on one wall**
  disambiguated by adjective (a direction holds only one exit); **invisible
  portals** (partly supported via an undescribed `via` entity); and doors with
  **dynamic / multi-room destinations** (`destination` is a single fixed room
  ID). ADR-218 ships only the fixed directional door; **ADR-220 (ACCEPTED) keeps
  this `between` spelling and adds these richer cases purely additively** via
  optional `when`/computed-destination fields on `IExitInfo` — no exit-data-model
  expansion, and the direct door here is unchanged.
- Ratchet entry + a two-room fixture story that opens/locks/traverses the door
  (AC-1).

### 3. Capability-dispatch fallback — `on <verb> it` (ADR-214 OQ1)

ADR-214 OQ1 resolved that a capability-dispatch verb's per-entity meaning is
expressed by the entity's own `on <verb> it` clause, with **no new Chord
keyword**. This ADR specifies the wiring:

- When the loader compiles an entity that carries an `on lowering it` /
  `on raising it` clause (any capability-dispatch gerund), and **no** TypeScript
  `CapabilityBehavior` is registered for that entity+capability, the loader
  registers a synthesized `CapabilityBehavior` whose `execute` runs the compiled
  on-clause effects.
- Precedence: a TypeScript-registered `CapabilityBehavior` **wins** over the
  synthesized on-clause fallback for the same entity+capability (the hatch path
  stays authoritative; the Chord clause is the no-hatch default). This ordering
  is asserted by a test (AC-4).
- The capability-dispatch gerunds (`lowering`, `raising`, and any future
  `turn`/`wave`/`wind`) must be admitted to the catalog's `EVENT_VERBS` so
  `on <verb> it` parses. That admission is a ratchet entry.
- This is a loader/analyzer change only — no stdlib action change; the dispatch
  action already looks up a registered behavior.

This section fixes the **decision** (`on <verb> it` is the seam; TS behavior wins
precedence; loader-only wiring). The **implementation details** — how the
compiled on-clause effects are replayed as a `CapabilityBehavior.execute`, error
semantics when the clause fails, and event ordering relative to the dispatch
action — are deferred to an implementation-level **ADR-221 (Capability-Dispatch
Fallback Wiring)** (interview, 2026-07-14), to be designed before this workstream
is coded.

### 4. Governance

Every item above is platform work under CLAUDE.md's discussion gate and lands as
a dated `chord-grammar-changes.md` entry (ADR-210). This ADR is a child of
ADR-214 and inherits its parity acceptance bar. It changes `packages/chord`
(catalog), `packages/story-loader` (trait switch, door placement, dispatch
fallback, container-liquid mapping), and the ratchet log — **plus one world-model
addition**: a new `LiquidTrait` in `packages/world-model` (§1b). The world-model
change is the reason this ADR carries the discussion gate rather than proceeding
as a pure ratchet; no stdlib **behavior** change is required (the `drinking`
action already handles both edible-liquid and container-liquid paths).

## Acceptance criteria

Inherits ADR-214 AC-1..AC-4 (fixture-per-gap, pure-IR preserved, additive-only,
governance). Concretely for this ADR:

- **AC-1 — fixtures flip audit rows.** A fixture `.story` per closed gap compiles
  and runs against the real `@sharpee/chord` + loader: (i) an `enterable` thing
  the player can `enter`; (ii) a `climbable` object the player can `climb`;
  (iii) a `drinkable` item that routes to `drinking` (and is refused by `eat`);
  (iv) a `liquid` substance (`create the acid, liquid`) that loads with the new
  `LiquidTrait` and is refused by `drink`; (v) a `container containing liquid
  water` the player can drink from (consumes via the container branch); (vi) a
  two-room door that opens, locks with a key, and blocks/permits passage. Each
  flips its row in `chord-availability-audit.md` to reachable.
- **AC-2 — dispatch fallback exercised.** A fixture entity with `on lowering it`
  (and no TS behavior) lowers via the `lower` verb, asserting the on-clause
  effects ran through the capability-dispatch path.
- **AC-3 — conflicts rejected.** An entity declared both `edible` and
  `drinkable` is a load error naming the conflict; `drinkable` on a non-thing is
  rejected the same way any adjective misuse is.
- **AC-4 — precedence + additivity.** A test asserts a registered TS
  `CapabilityBehavior` wins over the synthesized on-clause fallback; and the
  shipping stories (cloak, zoo) still compile unchanged.

## Consequences

- Four of the six ADR-214 action gaps close (entering, climbing, drinking via
  the liquid model, and the dispatch verbs), plus the `a door` construct — the
  quick wins ADR-214 §8 called for. All but one are Chord-surface adds; the
  liquid model adds a single new world-model trait.
- The composable vocabulary grows from 12 to 16 trait adjectives (`enterable`,
  `climbable`, `drinkable`, `liquid`), gains a `containing liquid <type>`
  container form, and `EVENT_VERBS` gains the capability-dispatch gerunds. The
  audit scoreboard advances.
- The world model gains a first-class `LiquidTrait` (marker-only here), closing a
  modeling gap the audit did not name (non-drinkable liquid substances) — a
  parity win beyond the original action list, surfaced by the interview.
- A new **ADR-219 (Liquids & Pouring)** is spun out to design the pouring/fill/
  empty subsystem on top of this ADR's marker trait, keeping ADR-218 cohesive
  (foundations, not a liquids feature). ADR-219 is DRAFT/pending its own
  interview and does not block ADR-218.
- The `on <verb> it` fallback sets the pattern for **all** future capability-
  dispatch verbs (`turn`/`wave`/`wind`) — they become reachable by the same
  mechanism without further ADRs, only ratchet entries.
- Fixed two-room directional doors become authorable, which the `going` action
  and exit machinery already understand; this unblocks basic door-gated map
  design in Chord. Richer doors (directionless, multiple-per-wall, portals,
  dynamic destinations) are captured in the informal **ADR-220 (Doors &
  Portals)** for later design — they need world-model exit-model changes and are
  out of ADR-218's scope.
- Remaining ADR-214 gaps (hiding/concealment, NPC-combat) are **out of scope
  here**: concealment needs a grammar `position` extra and combat rides the
  extension surface (ADR-215) — both deferred to their own ADRs per ADR-214 §2
  kind (d).

## Session

Session ae2a61 (2026-07-14). Child of ADR-214 (parity umbrella; establishes the
foundations-first roadmap this ADR enacts). All open questions resolved via the
2026-07-14 interview; three spawned dedicated ADRs. Related: ADR-210 (Chord
language + grammar ratchet), ADR-090 (capability dispatch — the mechanism behind
§3), ADR-219 (Liquids & Pouring — spun out of §1b), ADR-220 (Doors & Portals —
informal full-vision ADR; ADR-218 ships only the current-model fixed door),
ADR-221 (Capability-Dispatch Fallback Wiring — implementation details deferred
from §3).
