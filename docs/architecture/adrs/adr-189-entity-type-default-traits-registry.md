# ADR-189: Entity types declare their default traits via a registry

## Status: ACCEPTED (2026-06-24)

## Date: 2026-06-24

## Context

`WorldModel.createEntity(displayName, type)` stamps an entity with an `EntityType`
(used for ID generation and categorization) and nothing else. The *behavior* a type
implies lives entirely in traits, which the author must add separately. Type and
behavior can therefore disagree, and that disagreement is a footgun.

The clearest case is scenery. The enum documents intent the type does not enforce:

```ts
/** Fixed decorative objects that can't be taken */
SCENERY: 'scenery',
```

But `createEntity(name, EntityType.SCENERY)` adds no `SceneryTrait`. The taking action
refuses an item only when `noun.has(TraitType.SCENERY)` (`taking.ts:103`), so a
SCENERY-typed entity with no `SceneryTrait` is still takeable — the opposite of what
the type's own comment promises. The author book has to spend a paragraph warning
about exactly this ("`EntityType.SCENERY` without `SceneryTrait` is scenery the player
can still pick up — almost never what you mean").

The platform already concedes that *some* types should arrive with their obvious
traits: `WorldModel.createDoor()` (`WorldModel.ts:1276`) hand-bundles `DoorTrait` +
`SceneryTrait` + `OpenableTrait` + `LockableTrait`. That knowledge is hardcoded in a
factory rather than declared, and it exists for doors but not for scenery or anything
else.

We want the type→trait relationship to be **declarative and centralized**, so a type
keeps its documented promise by construction, without coupling every type to traits
that genuinely need per-entity configuration.

## Decision

Introduce a **default-trait registry** in `@sharpee/world-model` mapping an
`EntityType` to factory functions that produce its default traits, and have
`createEntity` consult it.

### The registry

```ts
// type → factories that each return a FRESH trait instance (never shared)
type DefaultTraitFactory = () => ITrait;
const DEFAULT_TRAITS: Map<string /* EntityType */, DefaultTraitFactory[]>;
```

Factories (not shared instances) so every entity gets its own trait objects.

### createEntity consults it

After building the fresh entity, `createEntity` adds the default traits for its
type. The entity has no traits at that moment, so nothing is skipped; author
customization happens *afterward* and overwrites the default (see Override
semantics). An optional flag opts out:

```ts
createEntity(displayName, type, opts?: { defaultTraits?: boolean /* default true */ })
```

### Initial mappings (deliberately conservative)

- `SCENERY → [() => new SceneryTrait()]` — the unambiguous case: `SceneryTrait` is a
  pure marker with no per-entity data.

That is the **only** mapping this ADR commits to. Other types are decided individually,
not swept in:

- `ROOM`, `CONTAINER`, `SUPPORTER`, `ACTOR` *could* take empty-default traits (empty
  exits, no capacity limit, `isPlayer: false`); each is its own judgment call and is
  **out of scope here** until argued on its own merits.
- `DOOR` is **not** a registry case: a door needs its two connecting rooms, which no
  zero-arg default can supply. `createDoor()` remains the configured-bundle factory.
  The registry handles marker defaults; factories handle bundles that need arguments.

### Prerequisite: `IFEntity.add()` becomes replace-on-same-type

This registry depends on a change to `IFEntity.add()`, which today is
**first-wins**: it warns and *ignores* a second trait of the same type, silently
dropping the new trait and its params (`if-entity.ts:90`). Under that behavior the
registry's default would block an author's configured trait — the exact silent
failure we are trying to remove.

`add()` becomes **replace-on-same-type**: a second trait of the same `TraitType`
overwrites the first, params and all. The override story then needs no special case:
the registry adds the default during `createEntity`, and an author who later adds a
configured variant simply wins (last add wins).

This is a platform-wide change to the most-used world-model method, not scenery-only.
The overwrite is **silent** (David, 2026-06-24): the current duplicate `console.warn`
is removed and replacing a same-type trait logs nothing.

### Override semantics

To customize a defaulted trait, add the configured variant after creation; it
overwrites the registry default. To create a typed entity with *no* default trait at
all, pass `{ defaultTraits: false }`.

### Opt-out

`createEntity(name, type, { defaultTraits: false })` produces a bare typed entity with
no auto-added traits, for the rare case (e.g. a "scenery" object you intend to be
takeable).

## Consequences

- **A type keeps its documented promise.** `EntityType.SCENERY` is non-takeable by
  construction; the book's warning paragraph becomes unnecessary.
- **`createEntity` gains type-driven behavior.** Reading `createEntity(name, SCENERY)`
  no longer tells the whole story; the registry is the place to look. This is the
  *good* direction of surprise (it matches the type name) but must be documented at the
  `createEntity` call site and in core-concepts.
- **"Items are portable by default" gains an explicit, encoded exception.** Portability
  is still the default for `ITEM`/`OBJECT`; `SCENERY` now encodes its non-portability in
  the registry rather than relying on the author to remember the trait. The rule is
  unchanged for everything not in the map.
- **Every new entity type now asks "what are its default traits?"** — answered in one
  declarative place instead of a bespoke factory.
- **`createDoor` and the registry coexist.** The registry covers zero-config marker
  traits; factories cover bundles needing arguments. A future cleanup could let
  `createDoor` layer its configured traits on top of registry defaults, but that is not
  required here.
- **Risk: over-reach.** If later types are added to the map carelessly, `createEntity`
  could silently attach traits an author did not want. Mitigated by keeping the map
  minimal and decided per type, plus the `{ defaultTraits: false }` escape hatch.
- **`add()` semantics change has its own blast radius.** Every caller that adds a
  trait of a type already present now overwrites instead of being ignored, and loses
  the duplicate warning. No caller is known to rely on first-wins (the warning would
  have surfaced any intentional double-add); a quick audit of `.add(` call sites is
  part of the work.

**Backward compatibility:** no shim needed. Existing stories that create a `SCENERY`
entity *and* explicitly add `SceneryTrait` now have their explicit add cleanly
overwrite the registry default (their configured version wins), with no warning and no
silent loss. Stories that relied on nothing here are unchanged.

**Save/restore:** no new persistent state. The auto-added `SceneryTrait` is an
ordinary trait already covered by the existing trait serialization, so the save format
is unaffected.

**stdlib:** no change. The taking action already refuses an entity via
`noun.has(TraitType.SCENERY)`; the registry just guarantees the trait is present.

## Acceptance Criteria

- **AC-1** `createEntity(name, EntityType.SCENERY)` returns an entity for which
  `entity.has(TraitType.SCENERY)` is `true`, with no explicit `SceneryTrait` add.
- **AC-2** The taking action refuses such an entity (`fixed_in_place`) without any
  author-supplied `SceneryTrait`.
- **AC-3** An author who adds a configured `SceneryTrait` (e.g. a custom
  `cantTakeMessage`) after creation ends with exactly one `SceneryTrait` — theirs —
  because the later add overwrites the registry default.
- **AC-7** `IFEntity.add()` is replace-on-same-type: adding a trait whose `TraitType`
  is already present replaces it (params and all); the entity holds the later trait,
  not the original, and no duplicate is created.
- **AC-4** `createEntity(name, EntityType.SCENERY, { defaultTraits: false })` returns a
  bare entity with no `SceneryTrait`, and the taking action allows taking it.
- **AC-5** Two scenery entities have distinct `SceneryTrait` instances (no shared
  mutable trait object).
- **AC-6** No mapping other than `SCENERY` is added in this change; `createDoor`
  behavior is unchanged.

## Open Questions

- Which of `ROOM`/`CONTAINER`/`SUPPORTER`/`ACTOR` (if any) should get default traits,
  and with what defaults? (Each its own follow-up.)
- Should stories be able to register their own `EntityType → trait` defaults (for
  custom types)? Deferred; the registry is platform-internal for now.

## Notes

Raised while copy-editing the *Scenery & Portable Objects* chapter, where the
type-vs-trait drift forced a warning paragraph. The book chapter can drop or soften
that warning once this lands.
