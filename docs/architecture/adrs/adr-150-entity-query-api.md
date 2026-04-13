# ADR-150: Entity Query API (LINQ-Style)

## Status: DRAFT

## Date: 2026-04-13

## Context

### The Problem

Story authors and platform code frequently need to find, filter, and transform entities. The current approach requires imperative loops or chaining raw array methods on `getContents()`, `getAllEntities()`, `findByTrait()`, etc.

John's Fever Dream story illustrates the pattern:

```typescript
// 10 lines to find an entity by name and update its description
for (const child of w.getContents(roomId)) {
  const id = child.get(IdentityTrait);
  if (id && child.name === entityName) {
    id.description = desc;
    break;
  }
}
```

This pattern repeats dozens of times in Fever Dream alone. In Dungeo it appears in handlers, region setup, and NPC logic. The result is:

- **Verbose**: 5-10 lines for what should be one expression
- **Error-prone**: Easy to forget `break`, miss null checks, or iterate the wrong collection
- **Opaque**: The intent ("find the iron valve in the cistern") is buried in loop mechanics
- **Inconsistent**: Some code uses `for-of` + `break`, some uses `.find()`, some uses `findWhere()` — all doing the same thing

### What Exists Today

`IWorldModel` already has query methods:

| Method | Returns | Usage |
|--------|---------|-------|
| `getAllEntities()` | `IFEntity[]` | Everything in the world |
| `getContents(id, opts?)` | `IFEntity[]` | Direct children of a container/room |
| `getAllContents(id, opts?)` | `IFEntity[]` | Recursive children |
| `findByTrait(traitType)` | `IFEntity[]` | All entities with a specific trait |
| `findByType(entityType)` | `IFEntity[]` | All entities of a type (room, object, actor) |
| `findWhere(predicate)` | `IFEntity[]` | Arbitrary predicate filter |
| `getVisible(observerId)` | `IFEntity[]` | Visibility-scoped entities |
| `getInScope(observerId)` | `IFEntity[]` | Interaction-scoped entities |

These all return plain arrays. Authors must chain `.filter()`, `.find()`, `.map()`, `.some()` manually. There's no composable query language.

### Inspiration: LINQ

C#'s Language Integrated Query (LINQ) provides a fluent, chainable API for querying collections:

```csharp
var valve = world.Contents(cisternId)
    .Where(e => e.Name == "iron valve")
    .Single();
```

TypeScript has no built-in equivalent, but a thin wrapper class can provide the same authoring experience without any external dependencies.

### Relationship to ADR-140 (Entity Helpers)

ADR-140 provides fluent *creation* (`room('Kitchen').description(...).build()`). This ADR provides fluent *querying*. They are complementary:

- ADR-140: "Make it easy to build the world"
- ADR-150: "Make it easy to ask questions about the world"

Both use the same declaration-merging pattern to extend `IWorldModel` without modifying the base interface.

### Relationship to ADR-149 (Regions and Scenes)

ADR-149 introduces Region and Scene entity types. Without a query API, each would need bespoke WorldModel methods (`getRoomsInRegion()`, `getActiveScenes()`, etc.) that bloat the interface and repeat the same filter-and-return pattern. With EntityQuery:

- Region queries become `w.rooms.inRegion('reg-forest')` — an EntityQuery filter that traverses the parent hierarchy
- Scene queries become `w.scenes.where(s => s.get(SceneTrait)?.state === 'active')` — standard filtering
- Tooling queries become `w.rooms.groupBy(r => r.get(RoomTrait)?.regionId)` — no bespoke method needed

ADR-149 lists this ADR as a prerequisite. Only the boolean convenience methods (`world.isInRegion()`, `world.isSceneActive()`) remain on WorldModel because they encapsulate traversal logic that doesn't belong in a generic query filter.

## Decision

### 1. EntityQuery Wrapper Class

A lightweight, immutable wrapper over `IFEntity[]` that provides chainable query methods. Each filtering method returns a new `EntityQuery`, enabling composition without mutating the source.

```typescript
/**
 * EntityQuery — Fluent query wrapper for entity collections.
 *
 * Public interface: chainable filter/transform methods.
 * Owner context: @sharpee/queries package, consumed by stories and platform code.
 */
class EntityQuery implements Iterable<IFEntity> {
  constructor(private readonly items: IFEntity[]) {}

  // ── Filtering ──

  /** Filter entities by predicate. */
  where(predicate: (entity: IFEntity) => boolean): EntityQuery;

  /** Filter to entities that have a specific trait. */
  withTrait<T extends ITrait>(traitType: TraitType<T>): EntityQuery;

  /** Filter to entities that do NOT have a specific trait. */
  withoutTrait<T extends ITrait>(traitType: TraitType<T>): EntityQuery;

  /** Filter to entities of a specific EntityType. */
  ofType(entityType: EntityType): EntityQuery;

  /** Filter to entities whose IdentityTrait.name matches. */
  named(name: string): EntityQuery;

  /** Filter to entities whose name or aliases contain the term (case-insensitive). */
  matching(term: string): EntityQuery;

  /** Filter to entities within a spatial container (room, container, actor). */
  in(containerId: string): EntityQuery;

  /** Filter to entities that are portable (no SceneryTrait). */
  portable(): EntityQuery;

  /** Filter to entities visible to an observer. */
  visibleTo(observerId: string, world: IWorldModel): EntityQuery;

  // ── Spatial/Temporal Filters (ADR-149) ──

  /** Filter rooms to those in a region (traverses parent hierarchy). */
  inRegion(regionId: string, world: IWorldModel): EntityQuery;

  /** Filter to entities located in rooms belonging to a region. */
  withinRegion(regionId: string, world: IWorldModel): EntityQuery;

  // ── Retrieval ──

  /** Return the first matching entity, or undefined. */
  first(): IFEntity | undefined;

  /** Return the first matching entity, or throw if none found. */
  firstOrThrow(message?: string): IFEntity;

  /** Return exactly one entity. Throw if zero or more than one. */
  single(): IFEntity;

  /** Return the last matching entity, or undefined. */
  last(): IFEntity | undefined;

  /** Return entity at index, or undefined. */
  at(index: number): IFEntity | undefined;

  // ── Aggregation ──

  /** True if any entity matches the optional predicate. */
  any(predicate?: (entity: IFEntity) => boolean): boolean;

  /** True if all entities match the predicate. */
  all(predicate: (entity: IFEntity) => boolean): boolean;

  /** True if no entities match the optional predicate. */
  none(predicate?: (entity: IFEntity) => boolean): boolean;

  /** Count of entities (optionally matching a predicate). */
  count(predicate?: (entity: IFEntity) => boolean): number;

  // ── Transformation ──

  /** Project entities to a new form. */
  select<T>(selector: (entity: IFEntity) => T): T[];

  /** Project and flatten. */
  selectMany<T>(selector: (entity: IFEntity) => T[]): T[];

  /** Extract a specific trait from all matching entities. */
  traits<T extends ITrait>(traitType: TraitType<T>): (T | undefined)[];

  /** Extract a specific trait, filtering out entities that lack it. */
  traitsOf<T extends ITrait>(traitType: TraitType<T>): T[];

  // ── Ordering ──

  /** Sort entities by a key. */
  orderBy<K>(keyFn: (entity: IFEntity) => K, direction?: 'asc' | 'desc'): EntityQuery;

  // ── Set Operations ──

  /** Combine with another query (union, no duplicates by entity ID). */
  union(other: EntityQuery): EntityQuery;

  /** Entities present in both queries. */
  intersect(other: EntityQuery): EntityQuery;

  /** Entities in this query but not in the other. */
  except(other: EntityQuery): EntityQuery;

  /** Remove duplicate entities (by ID). */
  distinct(): EntityQuery;

  // ── Partitioning ──

  /** Skip the first N entities. */
  skip(count: number): EntityQuery;

  /** Take at most N entities. */
  take(count: number): EntityQuery;

  // ── Grouping ──

  /** Group entities by a key function. Returns a Map. */
  groupBy<K>(keyFn: (entity: IFEntity) => K): Map<K, EntityQuery>;

  // ── Materialization ──

  /** Return as a plain array. */
  toArray(): IFEntity[];

  /** Return as a Map keyed by entity ID. */
  toMap(): Map<string, IFEntity>;

  /** Return as a Set of entity IDs. */
  toIdSet(): Set<string>;

  // ── Iteration ──

  /** Execute a side effect for each entity. Returns this for chaining. */
  forEach(fn: (entity: IFEntity) => void): EntityQuery;

  /** Iterable protocol — works with for-of loops and spread. */
  [Symbol.iterator](): Iterator<IFEntity>;
}
```

### 2. WorldModel Entry Points

Exposed via declaration merging (same pattern as ADR-140's `@sharpee/helpers`):

```typescript
// In @sharpee/queries — augments IWorldModel
declare module '@sharpee/world-model' {
  interface IWorldModel {
    /** Query all entities in the world. */
    readonly entities: EntityQuery;

    /** Query all rooms. */
    readonly rooms: EntityQuery;

    /** Query all actors. */
    readonly actors: EntityQuery;

    /** Query all objects (items). */
    readonly objects: EntityQuery;

    /** Query all scenes (ADR-149). Returns empty query if no scenes exist. */
    readonly scenes: EntityQuery;

    /** Query all regions (ADR-149). Returns empty query if no regions exist. */
    readonly regions: EntityQuery;

    /** Query contents of a specific container/room. */
    contents(parentId: string, options?: ContentsOptions): EntityQuery;

    /** Query all contents recursively. */
    allContents(parentId: string, options?: ContentsOptions): EntityQuery;

    /** Query entities with a specific trait. */
    having<T extends ITrait>(traitType: TraitType<T>): EntityQuery;

    /** Query entities visible to an observer. */
    visible(observerId: string): EntityQuery;

    /** Query entities in interaction scope for an observer. */
    inScope(observerId: string): EntityQuery;
  }
}
```

### 3. Usage Examples

#### Story Setup — Finding Entities

```typescript
// Before: imperative loop (Fever Dream pattern)
for (const child of w.getContents(depthIds.cistern)) {
  if (child.name === 'instructional sign') {
    const id = child.get(IdentityTrait);
    if (id) id.description = 'The letters swim...';
    const readable = child.get(ReadableTrait);
    if (readable) readable.text = 'LEFT drains...';
    break;
  }
}

// After: single expression
const sign = w.contents(depthIds.cistern).named('instructional sign').single();
sign.get(IdentityTrait)!.description = 'The letters swim...';
sign.get(ReadableTrait)!.text = 'LEFT drains...';
```

#### Event Handlers — Checking Inventory

```typescript
// Before
const inventory = context.world.getContents(context.player.id);
const hasWrench = inventory.some(i =>
  i.get(IdentityTrait)?.aliases?.includes('wrench')
);

// After
const hasWrench = w.contents(player.id).matching('wrench').any();
```

#### Bulk Description Transforms

```typescript
// Before: repeated helper function with for-of loops
const updateDesc = (roomId: string, name: string, desc: string) => {
  for (const child of w.getContents(roomId)) {
    if (child.name === name) {
      const id = child.get(IdentityTrait);
      if (id) id.description = desc;
      break;
    }
  }
};
updateDesc(depthIds.cistern, 'dark water', 'Gone. Only pale slime...');
updateDesc(depthIds.cistern, 'iron valve', 'A growth of iron...');

// After: direct expression, no helper needed
w.contents(depthIds.cistern).named('dark water').first()
  ?.get(IdentityTrait)?.description = 'Gone. Only pale slime...';

w.contents(depthIds.cistern).named('iron valve').first()
  ?.get(IdentityTrait)?.description = 'A growth of iron...';
```

#### Platform Code — Scope Resolution

```typescript
// Before
const lightSources = world.findByTrait(TraitType.LIGHT_SOURCE)
  .filter(e => {
    const ls = e.get(LightSourceTrait);
    return ls?.isLit && world.getContainingRoom(e.id)?.id === roomId;
  });

// After
const lightSources = w.having(LightSourceTrait)
  .where(e => e.get(LightSourceTrait)!.isLit)
  .in(roomId);
```

#### Trait Extraction

```typescript
// Get all room descriptions in one expression
const descriptions = w.rooms
  .traitsOf(IdentityTrait)
  .map(id => ({ name: id.name, desc: id.description }));
```

#### Regions and Scenes (ADR-149)

```typescript
// All rooms in the Underground (traverses parent hierarchy — Coal Mine rooms included)
const undergroundRooms = w.rooms.inRegion('reg-underground', w);

// All NPCs currently in the forest
const forestNpcs = w.actors
  .withinRegion('reg-forest', w)
  .where(a => !a.get(ActorTrait)?.isPlayer);

// Group rooms by region for the VS Code World Index panel
const roomsByRegion = w.rooms.groupBy(r => r.get(RoomTrait)?.regionId ?? 'unassigned');

// Active scenes — for debug panel or NPC behavior scoping
const activeScenes = w.scenes
  .where(s => s.get(SceneTrait)?.state === 'active');

// Check if any scene involving flooding is active
const floodActive = w.scenes
  .named('The Flood')
  .any(s => s.get(SceneTrait)?.state === 'active');

// All regions as a hierarchy for tooling
const regionTree = w.regions.select(r => ({
  id: r.id,
  name: r.get(RegionTrait)!.name,
  parent: r.get(RegionTrait)?.parentRegionId,
  roomCount: w.rooms.inRegion(r.id, w).count(),
}));
```

#### Grouping — VS Code Extension / Debug Tools

```typescript
// Group all entities by their containing room
const byRoom = w.entities.groupBy(e => w.getLocation(e.id) ?? 'nowhere');

// Group objects by type
const byType = w.objects.groupBy(e => {
  if (e.has(SceneryTrait)) return 'scenery';
  if (e.has(ContainerTrait)) return 'container';
  return 'portable';
});
```

#### Set Operations — Complex Queries

```typescript
// Items the player can see but doesn't have
const available = w.visible(player.id)
  .ofType(EntityType.OBJECT)
  .portable()
  .except(w.contents(player.id));

// Rooms that have both light sources and NPCs
const litNpcRooms = w.rooms.where(room => {
  const contents = w.contents(room.id);
  return contents.withTrait(LightSourceTrait).any()
      && contents.ofType(EntityType.ACTOR).any();
});
```

#### Iteration — forEach with Chaining

```typescript
// Corrupt all scenery descriptions in a room (perception shift)
w.contents(depthIds.cistern)
  .withTrait(SceneryTrait)
  .forEach(e => {
    const id = e.get(IdentityTrait);
    if (id) id.description = corruptText(id.description);
  });
```

### 4. Package Structure

New package: `@sharpee/queries`

```
packages/queries/
├── src/
│   ├── index.ts              # Public exports + IWorldModel augmentation
│   ├── entity-query.ts       # EntityQuery class implementation
│   └── augmentation.ts       # WorldModel.prototype patches
├── package.json
├── tsconfig.json
└── README.md
```

**Dependencies**: `@sharpee/world-model` (peer), `@sharpee/if-domain` (for ContentsOptions).

**Activation**: Stories import the package to enable augmentation:

```typescript
import '@sharpee/queries';  // Activates w.entities, w.rooms, etc.
```

Or import it alongside helpers:

```typescript
import '@sharpee/helpers';   // ADR-140: fluent creation
import '@sharpee/queries';   // ADR-150: fluent querying
```

### 5. Design Constraints

**Eager evaluation only.** Each method materializes immediately — no deferred execution, no query planners, no lazy iterators. Sharpee worlds are small (hundreds of entities, not millions). The simplicity of eager evaluation outweighs the theoretical efficiency of lazy evaluation. If profiling ever shows query hot-paths, specific methods can be optimized internally without changing the API.

**Immutable wrappers.** `where()`, `skip()`, `take()`, etc. return a new `EntityQuery`. The source array is never mutated. `forEach()` executes side effects on the *entities* but returns a new query wrapping the same array.

**No world reference on EntityQuery.** The query object wraps an array, not a world. Methods like `visibleTo()` and `in()` that need world access accept it as a parameter. This keeps queries serializable and avoids circular references. The entry-point methods on `IWorldModel` (`w.contents()`, `w.visible()`) handle the world interaction before returning a plain `EntityQuery`.

**Exception: `single()` and `firstOrThrow()`.** These throw on violation (zero or multiple results). All other methods return empty queries or `undefined` — no exceptions for "not found."

**Backward compatible.** All existing `IWorldModel` methods (`getContents`, `findByTrait`, `findWhere`, etc.) remain unchanged. The query API is additive. Stories that don't import `@sharpee/queries` see no difference.

### 6. Behavior Statements

**EntityQuery.where(predicate)**
- DOES: Returns a new EntityQuery containing only entities for which predicate returns true
- WHEN: Called on any EntityQuery instance with a predicate function
- BECAUSE: Enables composable filtering without mutating the source collection
- REJECTS WHEN: Never — an empty result is valid (returns EntityQuery wrapping `[]`)

**EntityQuery.single()**
- DOES: Returns the one entity in the collection
- WHEN: The query contains exactly one entity
- BECAUSE: Expresses the invariant "there should be exactly one match" — violations indicate a world-building bug
- REJECTS WHEN: Collection has 0 entities (throws "Expected exactly one entity, found none") or 2+ entities (throws "Expected exactly one entity, found N")

**EntityQuery.named(name)**
- DOES: Returns a new EntityQuery filtered to entities whose `IdentityTrait.name` equals the given name (case-sensitive)
- WHEN: Entities in the source have IdentityTrait attached
- BECAUSE: Finding entities by name is the most common query pattern in story code
- REJECTS WHEN: Never — entities without IdentityTrait are silently excluded

**EntityQuery.matching(term)**
- DOES: Returns a new EntityQuery filtered to entities whose name or any alias contains the term (case-insensitive substring match)
- WHEN: Used for fuzzy matching — "find anything called wrench"
- BECAUSE: Aliases are part of entity identity; authors shouldn't need separate queries for name vs aliases
- REJECTS WHEN: Never — no match returns empty query

## Consequences

### Positive

- **Dramatically reduces story boilerplate**: 5-10 line loops become single expressions
- **Self-documenting**: `w.contents(room).named('valve').single()` reads as English
- **Consistent**: One way to query, replacing three competing patterns (for-of, .find(), findWhere)
- **Composable**: Queries chain naturally — add `.portable()` to exclude scenery, `.take(3)` to limit
- **Type-safe**: TypeScript infers types through the chain; `withTrait<T>` preserves trait type info
- **Zero dependencies**: Pure TypeScript wrapper, no libraries
- **VS Code extension / tooling**: `groupBy`, `toMap`, `toIdSet` enable rich visualizations

### Negative

- **New package to maintain**: Though small (~200 lines of implementation)
- **Two ways to query**: `world.findByTrait()` and `world.having()` coexist. Mitigated: existing methods remain for platform internals; query API is the recommended authoring surface
- **Eager evaluation**: `w.entities.where(expensive).first()` evaluates `expensive` on all entities even though only the first match is needed. Acceptable for Sharpee's world sizes

### Neutral

- **No breaking changes**: Additive only — opt-in via import
- **AuthorModel compatibility**: Since AuthorModel implements IWorldModel (ADR-140), the augmentation works for both setup code and runtime queries
- **Complements ADR-140**: Creation (helpers) + querying (queries) form a complete fluent authoring surface

## References

- ADR-140: Entity Helper Builders (fluent creation, declaration merging pattern)
- ADR-149: Regions and Scenes (depends on this ADR for query entry points and filters)
- ADR-090: Entity-Centric Action Dispatch (capability queries that could use this API)
- LINQ documentation: https://learn.microsoft.com/en-us/dotnet/csharp/linq/
