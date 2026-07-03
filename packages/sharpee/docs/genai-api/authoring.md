# Authoring Helpers

Fluent entity-builder DSL (helpers) and the EntityQuery API (queries).

---

## @sharpee/helpers

### create-helpers

```typescript
/**
 * createHelpers — factory that binds a world reference and returns
 * all entity builder functions.
 *
 * Public interface: createHelpers(world) => EntityHelpers
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */
import type { IWorldModel } from '@sharpee/world-model';
import { RoomBuilder } from './builders/room';
import { ObjectBuilder } from './builders/object';
import { ContainerBuilder } from './builders/container';
import { ActorBuilder } from './builders/actor';
import { DoorBuilder } from './builders/door';
/**
 * The set of builder factories returned by world.helpers().
 */
export interface EntityHelpers {
    /** Create a room entity */
    room(name: string): RoomBuilder;
    /** Create an object entity */
    object(name: string): ObjectBuilder;
    /** Create a container entity */
    container(name: string): ContainerBuilder;
    /** Create an actor entity (player or NPC) */
    actor(name: string): ActorBuilder;
    /** Create a door entity */
    door(name: string): DoorBuilder;
}
/**
 * Create a set of entity builder functions bound to a world reference.
 *
 * @param world - The IWorldModel to create entities in
 * @returns EntityHelpers with all builder factories
 */
export declare function createHelpers(world: IWorldModel): EntityHelpers;
```

### builders/room

```typescript
/**
 * RoomBuilder — fluent builder for room entities.
 *
 * Public interface: description, aliases, dark, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */
import { IFEntity } from '@sharpee/world-model';
import type { IWorldModel, ITrait } from '@sharpee/world-model';
/**
 * Fluent builder for creating room entities.
 *
 * @example
 * ```typescript
 * const kitchen = room('Kitchen')
 *   .description('A warm kitchen.')
 *   .build();
 * ```
 */
export declare class RoomBuilder {
    private world;
    private name;
    private _description?;
    private _initialDescription?;
    private _aliases?;
    private _isDark;
    private _traits;
    constructor(world: IWorldModel, name: string);
    /**
     * Set the room description.
     *
     * @param desc - Room description text
     * @returns this (for chaining)
     */
    description(desc: string): this;
    /**
     * Set the first-visit description (ADR-196 Phase 4).
     *
     * Shown the first time the player looks at the room; on subsequent visits the
     * standard `description` is used instead. Populates `RoomTrait.initialDescription`.
     *
     * @param desc - First-visit room description text
     * @returns this (for chaining)
     */
    initialDescription(desc: string): this;
    /**
     * Add name aliases for the room.
     *
     * @param names - Alternative names
     * @returns this (for chaining)
     */
    aliases(...names: string[]): this;
    /**
     * Add a custom trait to the entity.
     *
     * @param trait - Any ITrait instance
     * @returns this (for chaining)
     */
    addTrait(trait: ITrait): this;
    /**
     * Mark the room as dark (requires a light source to see).
     *
     * @returns this (for chaining)
     */
    dark(): this;
    /**
     * Create the room entity with configured traits.
     *
     * @returns The created IFEntity
     */
    build(): IFEntity;
}
```

### builders/object

```typescript
/**
 * ObjectBuilder — fluent builder for object entities.
 *
 * Public interface: description, aliases, in, scenery, plural, lightSource,
 * skipValidation, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */
import { IFEntity } from '@sharpee/world-model';
import type { IWorldModel, ITrait } from '@sharpee/world-model';
/**
 * Fluent builder for creating object entities.
 *
 * @example
 * ```typescript
 * const knife = object('bread knife')
 *   .description('A sharp bread knife.')
 *   .aliases('knife', 'blade')
 *   .in(kitchen)
 *   .build();
 * ```
 */
export declare class ObjectBuilder {
    private world;
    private name;
    private _description?;
    private _aliases?;
    private _location?;
    private _scenery;
    private _grammaticalNumber?;
    private _lightSource?;
    private _skipValidation;
    private _traits;
    constructor(world: IWorldModel, name: string);
    /**
     * Set the object description.
     *
     * @param desc - Object description text
     * @returns this (for chaining)
     */
    description(desc: string): this;
    /**
     * Add name aliases for the object.
     *
     * @param names - Alternative names
     * @returns this (for chaining)
     */
    aliases(...names: string[]): this;
    /**
     * Place the object in a location.
     *
     * @param location - The entity to place this object in
     * @returns this (for chaining)
     */
    in(location: IFEntity): this;
    /**
     * Mark as scenery (non-portable).
     *
     * @returns this (for chaining)
     */
    scenery(): this;
    /**
     * Mark the object as grammatically plural (e.g. "pygmy goats", "direction
     * signs"). Sets the identity's `grammaticalNumber` to `'plural'` so message
     * templates render agreeing verbs ("the goats are fixed in place") and
     * pronouns ("take them").
     *
     * @returns this (for chaining)
     */
    plural(): this;
    /**
     * Add light source trait.
     *
     * @param opts - Light source options. `detailWhenLit` is the author-set state
     *   text the ADR-195 S2 examine `{slot:detail}` channel *appends* when lit (e.g.
     *   "A thin beam plays across the floor."); `litDescription` / `unlitDescription`
     *   *replace* the description via the computed getter.
     * @returns this (for chaining)
     */
    lightSource(opts?: {
        isLit?: boolean;
        fuelTurns?: number;
        litDescription?: string;
        unlitDescription?: string;
        detailWhenLit?: string;
    }): this;
    /**
     * Add a custom trait to the entity.
     *
     * @param trait - Any ITrait instance
     * @returns this (for chaining)
     */
    addTrait(trait: ITrait): this;
    /**
     * Bypass validation for placement (e.g., placing in closed containers).
     * Internally wraps the world in an AuthorModel.
     *
     * @returns this (for chaining)
     */
    skipValidation(): this;
    /**
     * Create the object entity with configured traits.
     *
     * @returns The created IFEntity
     */
    build(): IFEntity;
}
```

### builders/container

```typescript
/**
 * ContainerBuilder — fluent builder for container entities.
 *
 * Public interface: description, aliases, in, openable, lockable,
 * skipValidation, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */
import { IFEntity } from '@sharpee/world-model';
import type { IWorldModel, ITrait } from '@sharpee/world-model';
/**
 * Fluent builder for creating container entities.
 *
 * @example
 * ```typescript
 * const chest = container('wooden chest')
 *   .description('A sturdy wooden chest.')
 *   .openable({ isOpen: false })
 *   .lockable({ isLocked: true, keyId: key.id })
 *   .in(treasureRoom)
 *   .build();
 * ```
 */
export declare class ContainerBuilder {
    private world;
    private name;
    private _description?;
    private _aliases?;
    private _location?;
    private _openable?;
    private _lockable?;
    private _skipValidation;
    private _traits;
    constructor(world: IWorldModel, name: string);
    /**
     * Set the container description.
     *
     * @param desc - Container description text
     * @returns this (for chaining)
     */
    description(desc: string): this;
    /**
     * Add name aliases.
     *
     * @param names - Alternative names
     * @returns this (for chaining)
     */
    aliases(...names: string[]): this;
    /**
     * Place the container in a location.
     *
     * @param location - The entity to place this container in
     * @returns this (for chaining)
     */
    in(location: IFEntity): this;
    /**
     * Make the container openable.
     *
     * @param opts - Openable options
     * @returns this (for chaining)
     */
    openable(opts?: {
        isOpen?: boolean;
    }): this;
    /**
     * Make the container lockable.
     *
     * @param opts - Lockable options
     * @returns this (for chaining)
     */
    lockable(opts?: {
        isLocked?: boolean;
        keyId?: string;
    }): this;
    /**
     * Add a custom trait to the entity.
     *
     * @param trait - Any ITrait instance
     * @returns this (for chaining)
     */
    addTrait(trait: ITrait): this;
    /**
     * Bypass validation for placement.
     *
     * @returns this (for chaining)
     */
    skipValidation(): this;
    /**
     * Create the container entity with configured traits.
     *
     * @returns The created IFEntity
     */
    build(): IFEntity;
}
```

### builders/actor

```typescript
/**
 * ActorBuilder — fluent builder for actor entities.
 *
 * Public interface: description, aliases, properName, inventory, in,
 * skipValidation, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */
import { IFEntity } from '@sharpee/world-model';
import type { IWorldModel, ITrait } from '@sharpee/world-model';
/**
 * Fluent builder for creating actor entities (players and NPCs).
 *
 * @example
 * ```typescript
 * const player = actor('yourself')
 *   .description('As good-looking as ever.')
 *   .aliases('self', 'me', 'myself')
 *   .properName()
 *   .inventory({ maxItems: 10 })
 *   .build();
 * ```
 */
export declare class ActorBuilder {
    private world;
    private name;
    private _description?;
    private _aliases?;
    private _properName;
    private _inventory?;
    private _location?;
    private _skipValidation;
    private _traits;
    constructor(world: IWorldModel, name: string);
    /**
     * Set the actor description.
     *
     * @param desc - Actor description text
     * @returns this (for chaining)
     */
    description(desc: string): this;
    /**
     * Add name aliases.
     *
     * @param names - Alternative names
     * @returns this (for chaining)
     */
    aliases(...names: string[]): this;
    /**
     * Mark as a proper name (no article).
     *
     * @returns this (for chaining)
     */
    properName(): this;
    /**
     * Add inventory capacity (adds ContainerTrait).
     *
     * @param opts - Inventory options
     * @returns this (for chaining)
     */
    inventory(opts?: {
        maxItems?: number;
    }): this;
    /**
     * Place the actor in a location.
     *
     * @param location - The entity to place this actor in
     * @returns this (for chaining)
     */
    in(location: IFEntity): this;
    /**
     * Add a custom trait to the entity.
     *
     * @param trait - Any ITrait instance
     * @returns this (for chaining)
     */
    addTrait(trait: ITrait): this;
    /**
     * Bypass validation for placement.
     *
     * @returns this (for chaining)
     */
    skipValidation(): this;
    /**
     * Create the actor entity with configured traits.
     *
     * @returns The created IFEntity
     */
    build(): IFEntity;
}
```

### builders/door

```typescript
/**
 * DoorBuilder — fluent builder for door entities.
 *
 * Public interface: description, aliases, between, openable, lockable, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */
import { IFEntity } from '@sharpee/world-model';
import type { IWorldModel, ITrait } from '@sharpee/world-model';
import type { DirectionType } from '@sharpee/world-model';
/**
 * Fluent builder for creating door entities.
 *
 * @example
 * ```typescript
 * const ironDoor = door('iron door')
 *   .description('A heavy iron door.')
 *   .between(room1, room2, Direction.NORTH)
 *   .openable({ isOpen: false })
 *   .lockable({ isLocked: true, keyId: ironKey.id })
 *   .build();
 * ```
 */
export declare class DoorBuilder {
    private world;
    private name;
    private _description?;
    private _aliases?;
    private _room1?;
    private _room2?;
    private _direction?;
    private _openable?;
    private _lockable?;
    private _traits;
    constructor(world: IWorldModel, name: string);
    /**
     * Set the door description.
     *
     * @param desc - Door description text
     * @returns this (for chaining)
     */
    description(desc: string): this;
    /**
     * Add name aliases.
     *
     * @param names - Alternative names
     * @returns this (for chaining)
     */
    aliases(...names: string[]): this;
    /**
     * Set the two rooms the door connects and the direction from room1 to room2.
     *
     * @param room1 - First room entity
     * @param room2 - Second room entity
     * @param direction - Direction from room1 to room2
     * @returns this (for chaining)
     */
    between(room1: IFEntity, room2: IFEntity, direction: DirectionType): this;
    /**
     * Add a custom trait to the entity.
     *
     * @param trait - Any ITrait instance
     * @returns this (for chaining)
     */
    addTrait(trait: ITrait): this;
    /**
     * Make the door openable.
     *
     * @param opts - Openable options
     * @returns this (for chaining)
     */
    openable(opts?: {
        isOpen?: boolean;
    }): this;
    /**
     * Make the door lockable.
     *
     * @param opts - Lockable options
     * @returns this (for chaining)
     */
    lockable(opts?: {
        isLocked?: boolean;
        keyId?: string;
    }): this;
    /**
     * Create the door entity with configured traits and wire room exits.
     *
     * @returns The created IFEntity
     * @throws Error if between() was not called
     */
    build(): IFEntity;
}
```

## @sharpee/queries

### entity-query

```typescript
/**
 * EntityQuery — Fluent, chainable query wrapper for IFEntity collections.
 *
 * Lightweight, immutable wrapper over IFEntity[] providing LINQ-style
 * filtering, retrieval, aggregation, transformation, ordering, set
 * operations, partitioning, grouping, and materialization methods.
 * Each filtering method returns a new EntityQuery; the source is never mutated.
 *
 * Public interface: all chainable query methods.
 * Owner context: @sharpee/queries (ADR-150)
 */
import { IFEntity } from '@sharpee/world-model';
import { TraitType } from '@sharpee/world-model';
/**
 * Fluent query wrapper for entity collections.
 * Implements Iterable so it works with for-of loops and spread.
 */
export declare class EntityQuery implements Iterable<IFEntity> {
    private readonly items;
    constructor(items: IFEntity[]);
    /**
     * Filter entities by predicate.
     *
     * @param predicate - Test function applied to each entity
     * @returns New EntityQuery containing only entities where predicate returns true
     */
    where(predicate: (entity: IFEntity) => boolean): EntityQuery;
    /**
     * Filter to entities that have a specific trait.
     *
     * @param traitType - The trait type to check for
     * @returns New EntityQuery containing only entities with the trait
     */
    withTrait(traitType: TraitType | string): EntityQuery;
    /**
     * Filter to entities that do NOT have a specific trait.
     *
     * @param traitType - The trait type to exclude
     * @returns New EntityQuery containing only entities without the trait
     */
    withoutTrait(traitType: TraitType | string): EntityQuery;
    /**
     * Filter to entities of a specific EntityType.
     *
     * @param entityType - The entity type string (e.g., 'room', 'object')
     * @returns New EntityQuery containing only entities of that type
     */
    ofType(entityType: string): EntityQuery;
    /**
     * Filter to entities whose IdentityTrait.name matches exactly (case-sensitive).
     * Entities without an IdentityTrait are silently excluded.
     *
     * @param name - The exact name to match
     * @returns New EntityQuery containing only matching entities
     */
    named(name: string): EntityQuery;
    /**
     * Filter to entities whose name or aliases contain the term (case-insensitive).
     * Entities without an IdentityTrait are silently excluded.
     *
     * @param term - The search term (case-insensitive substring match)
     * @returns New EntityQuery containing matching entities
     */
    matching(term: string): EntityQuery;
    /**
     * Filter to entities that are portable (no SceneryTrait).
     *
     * @returns New EntityQuery containing only non-scenery entities
     */
    portable(): EntityQuery;
    /**
     * Filter to entities visible to an observer.
     * Delegates to the world model's visibility calculation.
     *
     * @param observerId - The observer entity ID
     * @param world - The world model (needed for visibility calculation)
     * @returns New EntityQuery containing only visible entities
     */
    visibleTo(observerId: string, world: {
        getVisible(id: string): IFEntity[];
    }): EntityQuery;
    /**
     * Filter rooms to those in a region (traverses parent hierarchy).
     * Returns empty query until ADR-149 provides RegionTrait.
     *
     * @param regionId - The region entity ID
     * @param world - The world model (needed for region traversal)
     * @returns New EntityQuery containing rooms in the region
     */
    inRegion(regionId: string, world: {
        isInRegion?(entityId: string, regionId: string): boolean;
    }): EntityQuery;
    /**
     * Filter to entities located in rooms belonging to a region.
     * Returns empty query until ADR-149 provides RegionTrait.
     *
     * @param regionId - The region entity ID
     * @param world - The world model (needed for region and location lookup)
     * @returns New EntityQuery containing entities within the region
     */
    withinRegion(regionId: string, world: {
        isInRegion?(entityId: string, regionId: string): boolean;
        getLocation(entityId: string): string | null;
    }): EntityQuery;
    /**
     * Return the first entity, or undefined if empty.
     */
    first(): IFEntity | undefined;
    /**
     * Return the first entity, or throw if empty.
     *
     * @param message - Optional error message
     * @throws Error if the query is empty
     */
    firstOrThrow(message?: string): IFEntity;
    /**
     * Return exactly one entity. Throws if zero or more than one.
     *
     * @throws Error if count is not exactly 1
     */
    single(): IFEntity;
    /**
     * Return the last entity, or undefined if empty.
     */
    last(): IFEntity | undefined;
    /**
     * Return entity at index, or undefined if out of bounds.
     *
     * @param index - Zero-based index
     */
    at(index: number): IFEntity | undefined;
    /**
     * True if any entity matches the optional predicate.
     * If no predicate, true if the query is non-empty.
     */
    any(predicate?: (entity: IFEntity) => boolean): boolean;
    /**
     * True if all entities match the predicate.
     * Returns true for empty collections (vacuous truth).
     */
    all(predicate: (entity: IFEntity) => boolean): boolean;
    /**
     * True if no entities match the optional predicate.
     * If no predicate, true if the query is empty.
     */
    none(predicate?: (entity: IFEntity) => boolean): boolean;
    /**
     * Count of entities, optionally matching a predicate.
     */
    count(predicate?: (entity: IFEntity) => boolean): number;
    /**
     * Project entities to a new form.
     *
     * @param selector - Transform function applied to each entity
     * @returns Array of transformed values
     */
    select<T>(selector: (entity: IFEntity) => T): T[];
    /**
     * Project and flatten.
     *
     * @param selector - Transform function returning an array per entity
     * @returns Flattened array of all results
     */
    selectMany<T>(selector: (entity: IFEntity) => T[]): T[];
    /**
     * Extract a specific trait from all entities (undefined for those lacking it).
     *
     * @param traitType - The trait type to extract
     * @returns Array of trait instances or undefined
     */
    traits<T>(traitType: TraitType | string): (T | undefined)[];
    /**
     * Extract a specific trait, filtering out entities that lack it.
     *
     * @param traitType - The trait type to extract
     * @returns Array of trait instances (no undefined values)
     */
    traitsOf<T>(traitType: TraitType | string): T[];
    /**
     * Sort entities by a key function.
     *
     * @param keyFn - Function that extracts the sort key
     * @param direction - 'asc' (default) or 'desc'
     * @returns New EntityQuery in sorted order
     */
    orderBy<K>(keyFn: (entity: IFEntity) => K, direction?: 'asc' | 'desc'): EntityQuery;
    /**
     * Combine with another query (union, no duplicates by entity ID).
     */
    union(other: EntityQuery): EntityQuery;
    /**
     * Entities present in both queries (by entity ID).
     */
    intersect(other: EntityQuery): EntityQuery;
    /**
     * Entities in this query but not in the other (by entity ID).
     */
    except(other: EntityQuery): EntityQuery;
    /**
     * Remove duplicate entities (by entity ID).
     */
    distinct(): EntityQuery;
    /**
     * Skip the first N entities.
     */
    skip(count: number): EntityQuery;
    /**
     * Take at most N entities.
     */
    take(count: number): EntityQuery;
    /**
     * Group entities by a key function. Returns a Map of key → EntityQuery.
     *
     * @param keyFn - Function that extracts the group key
     * @returns Map from group key to EntityQuery of members
     */
    groupBy<K>(keyFn: (entity: IFEntity) => K): Map<K, EntityQuery>;
    /**
     * Return as a plain array.
     */
    toArray(): IFEntity[];
    /**
     * Return as a Map keyed by entity ID.
     */
    toMap(): Map<string, IFEntity>;
    /**
     * Return as a Set of entity IDs.
     */
    toIdSet(): Set<string>;
    /**
     * Execute a side effect for each entity. Returns this for chaining.
     */
    forEach(fn: (entity: IFEntity) => void): EntityQuery;
    /**
     * Iterable protocol — works with for-of loops and spread.
     */
    [Symbol.iterator](): Iterator<IFEntity>;
}
```
