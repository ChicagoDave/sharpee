# ADR-210 Platform Prerequisites — Worked Resolutions (proposed)

**Status:** APPROVED as proposed by David, 2026-07-10. Each entry states
the finding, the proposed v1 resolution, and what (if anything) changes in the
platform. Companion to `docs/architecture/adrs/adr-210-story-language.md` and
`design.md`.

## 1. Derived properties — `dark while <cond>`

**Proposed resolution (sign-off only):** v1 compiles to a loader-registered
turn-end rule: evaluate the condition, write the trait field (`RoomTrait.isDark`).
No platform change. One-turn staleness is not observable in practice because the
rule runs before the next command's scope/visibility evaluation.

A first-class dependency-tracked "derived property" mechanism is explicitly out of
scope; if staleness ever produces a real bug, that becomes its own ADR. Record the
limitation in the language reference ("`while` conditions on traits re-evaluate at
end of turn").

## 2. Conditional trait composition — `chatty while not after-hours`

**Finding:** runtime behavior swap exists **only** for NPC behaviors
(register/unregister, used by friendly-zoo's parrot). Generalized runtime trait
add/remove has no platform support and real hazards (what happens to trait data,
in-flight interceptor bindings, save shape when a trait vanishes mid-game).

**Proposed v1 resolution:** `<trait> while <cond>` is legal **only for traits whose
clauses are all NPC-behavior-shaped** (on-every-turn / on-player-enters — the swap
machinery that exists). For any other trait, it is a **load error** with the
diagnostic: "conditional composition isn't supported for this trait — move the
condition inside the trait (`on <action> it` clauses can test it) or split the
behavior." The generalized mechanism, if ever wanted, is its own ADR. No platform
change for v1.

## 3. First-class endings — `win` / `lose`

**Proposed resolution:** bless the existing convention as a small engine-owned
service in Phase A scope (no separate ADR; contract lives in design.md §5 and
ADR-210):

- `win [<phrase>]` emits `story.victory` (with the phrase's message ID) and sets a
  completion flag in world state; `lose` likewise with `story.defeat`.
- The loader's generic `isComplete()` reads the flag — stories never implement
  completion logic.
- Platform delta: none required for the loader (it can do all of the above with
  existing primitives); *blessing* means documenting the event types + flag key as
  a stable contract in if-domain so clients/tests rely on them. One wire-type
  addition, no behavior change.

## 4. Per-entity phrase override — `phrase fed: "…"` in a create block

**Finding (verified in code):** the closest existing mechanism,
`SceneryTrait.cantTakeMessage` (`sceneryBehavior.ts:33`), stores a **literal
English string in trait data** — itself a latent given-3 violation (text outside
the Language Provider).

**Proposed resolution: no platform change; loader-internal.** The loader:

1. registers the override prose under an entity-scoped ID
   (`{story}.{entity}.{key}`, e.g. `zoo.pygmy-goats.fed`) via the standard
   Language Provider registration;
2. keeps an (entity, trait-key) → ID override table in the IR;
3. when a trait behavior executes `phrase <key>`, the evaluator resolves the key
   against the current entity's override table first, then the trait's own ID.

Resolution is data lookup at emit time; both candidate IDs are registered at load,
so given 3 holds and localization sees both. **Side observation** (not blocking):
`cantTakeMessage` should eventually migrate to an ID-based field; the language
never exposes the literal-in-trait-data pattern, so new content can't reproduce
it.

## 5. v1 kinds catalog and default player (blocks Phase A)

**Finding:** the ADR-189 registry is deliberately conservative (only
`SCENERY → SceneryTrait`) because other types need per-entity data. That is not an
obstacle: kind nouns compile in the **loader**, which has the entity's `with`
configuration in hand — exactly what the ADR-140 builders do today. The registry
does not need to grow.

**Proposed v1 catalog — kind nouns** (take articles; compile to entity type +
traits):

| Kind noun | EntityType | Traits added |
|---|---|---|
| `a room` | ROOM | RoomTrait (+ `dark`, exits, blocked exits from lines) |
| `a door` | DOOR | DoorTrait; requires `between` placement; `openable`/`lockable` via adjectives |
| `a person` | ACTOR | ActorTrait (+ ContainerTrait when `with inventory …`) |
| `a container` | CONTAINER | ContainerTrait (`with max items N and max weight N`) |
| `a supporter` | SUPPORTER | SupporterTrait (`with capacity N`) |
| *(no kind noun)* | ITEM | none — plain thing, **portable by default** (world-model rule) |

Every entity additionally gets IdentityTrait (name, description, aliases,
article/properName) from its create block — as all five ADR-140 builders do.

**Proposed v1 trait adjectives** (bare, from the world-model trait set):
`scenery`, `wearable`, `readable` (`with text …`), `openable`, `lockable`
(`with key …`), `switchable`, `edible`, `pushable`, `pullable`, `light-source`,
`plural`. Room-scoped: `dark`. Author-defined traits join this set by
declaration. Additions to the built-in list follow grammar governance (ADR-210
Open Question 4).

**Proposed default player** (matches the devkit template's neutral register, not
Cloak's flavor text):

- EntityType ACTOR, name `yourself`, aliases `self`, `me`, `myself`, proper name
  (no article), description "An adventurer."
- ActorTrait `isPlayer`, ContainerTrait capacity `max items 10`.
- `create the player` in a story configures/overrides any of the above; absent
  that block, the default stands and `starts in` defaults to the first declared
  room.

---

**Net platform delta across all five prerequisites: one wire-type addition
(ending event/flag contract in if-domain).** Everything else is loader-internal
or a documented restriction. Sign-off on these five resolutions clears the
ADR-210 gate "Platform Prerequisites have owners" — the owner for all five is
the story-loader work itself.
