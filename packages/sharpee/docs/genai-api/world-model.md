# @sharpee/world-model

Entity system (IFEntity), WorldModel, all traits, capability dispatch, scope, annotations.

---

### entities/if-entity

```typescript
import { IEntity, EntityId, IEntityCreationParams } from '@sharpee/core';
import { ITrait, ITraitConstructor } from '../traits/trait';
import { TraitType } from '../traits/trait-types';
import { Annotation, AnnotationCondition } from '../annotations/types';
/**
 * Interactive Fiction Entity with trait-based composition.
 * Implements the core Entity interface and adds trait management capabilities.
 */
export declare class IFEntity implements IEntity {
    readonly id: EntityId;
    readonly type: string;
    attributes: Record<string, unknown>;
    relationships: Record<string, EntityId[]>;
    traits: Map<TraitType, ITrait>;
    /**
     * Author-controlled disambiguation priorities per action
     * Higher priority = more likely to be selected when ambiguous
     * Key is action ID (e.g., 'if.action.eating')
     * Value is priority (default 100, higher = preferred)
     */
    private scopePriorities;
    /**
     * Author-controlled minimum scope levels
     * Allows entities to be "in scope" regardless of spatial location.
     * Key is room ID (or '*' for all rooms)
     * Value is minimum scope level (0=UNAWARE, 1=AWARE, 2=VISIBLE, 3=REACHABLE, 4=CARRIED)
     *
     * Example uses:
     * - sky.setMinimumScope(2) - always visible everywhere
     * - mountain.setMinimumScope(2, ['overlook']) - visible from specific room
     * - butterfly.setMinimumScope(3, ['garden']) - reachable in garden
     */
    private minimumScopes;
    /**
     * Presentation metadata annotations (ADR-124).
     * Keyed by kind (e.g., 'illustration', 'portrait', 'voice').
     * Multiple annotations per kind are supported.
     */
    private annotations;
    constructor(id: string, type: string, params?: Partial<IEntityCreationParams>);
    /**
     * Check if entity has a specific trait
     */
    has(type: TraitType | string): boolean;
    /**
     * Get a typed trait from the entity
     */
    get<T extends ITrait>(type: TraitType | string | ITraitConstructor<T>): T | undefined;
    /**
     * Alias for get() method - for backwards compatibility
     */
    getTrait<T extends ITrait>(type: TraitType | string | ITraitConstructor<T>): T | undefined;
    /**
     * Add a trait to the entity
     */
    add(trait: ITrait): this;
    /**
     * Remove a trait from the entity
     */
    remove(type: TraitType | string): boolean;
    /**
     * Check if entity has all specified traits
     */
    hasAll(...types: (TraitType | string)[]): boolean;
    /**
     * Check if entity has any of the specified traits
     */
    hasAny(...types: (TraitType | string)[]): boolean;
    /**
     * Get all traits on this entity
     */
    getTraits(): ITrait[];
    /**
     * Get all trait types on this entity
     */
    getTraitTypes(): (TraitType | string)[];
    /**
     * Clear all traits from the entity
     */
    clearTraits(): void;
    /**
     * Get or set author-controlled disambiguation priority for an action.
     *
     * When multiple entities match a command, higher priority entities are
     * preferred for automatic disambiguation.
     *
     * @param actionId - The action ID (e.g., 'if.action.eating')
     * @param priority - Optional priority to set (100 = default, higher = preferred)
     * @returns The current priority for this action (default 100)
     *
     * @example
     * // Make real apple preferred for eating over wax apple
     * realApple.scope('if.action.eating', 150);
     * waxApple.scope('if.action.eating', 50);
     *
     * @example
     * // Get current priority
     * const priority = apple.scope('if.action.eating');  // Returns 150
     */
    scope(actionId: string, priority?: number): number;
    /**
     * Clear disambiguation priority for an action (resets to default)
     */
    clearScope(actionId: string): void;
    /**
     * Clear all disambiguation priorities
     */
    clearAllScopes(): void;
    /**
     * Get all scope priorities for serialization
     */
    getScopePriorities(): Record<string, number>;
    /**
     * Set minimum scope level for this entity.
     *
     * Makes an entity "in scope" regardless of its spatial location.
     * The scope resolver will return the maximum of the physical scope
     * and the minimum scope (additive only - can raise scope, not lower it).
     *
     * Scope levels (numeric values match ScopeLevel enum in stdlib):
     * - 0: UNAWARE - not in scope
     * - 1: AWARE - can hear/smell but not see
     * - 2: VISIBLE - can see but not reach
     * - 3: REACHABLE - can physically interact
     * - 4: CARRIED - in inventory (rarely used for minimum)
     *
     * @param level The minimum scope level (0-4)
     * @param rooms Optional array of room IDs where this applies. If omitted, applies everywhere.
     *
     * @example
     * // Sky is always visible everywhere
     * sky.setMinimumScope(2);
     *
     * // Mountain visible only from overlook and trail
     * mountain.setMinimumScope(2, ['overlook', 'mountain_trail']);
     *
     * // Butterfly reachable (but may escape) in garden areas
     * butterfly.setMinimumScope(3, ['garden', 'meadow', 'pond']);
     *
     * // Ticking clock audible from adjacent rooms
     * clock.setMinimumScope(1, ['hallway', 'study']);
     */
    setMinimumScope(level: number, rooms?: string[]): this;
    /**
     * Get the minimum scope level for this entity in a specific room.
     *
     * @param roomId The room to check (or null to get global minimum)
     * @returns The minimum scope level, or 0 (UNAWARE) if not set
     */
    getMinimumScope(roomId: string | null): number;
    /**
     * Clear minimum scope for specific rooms or all rooms.
     *
     * @param rooms Optional array of room IDs to clear. If omitted, clears all.
     */
    clearMinimumScope(rooms?: string[]): void;
    /**
     * Get all minimum scopes for serialization
     */
    getMinimumScopes(): Record<string, number>;
    /**
     * Add a presentation annotation to this entity.
     *
     * @param kind - Annotation kind (e.g., 'illustration', 'portrait')
     * @param data - Kind-specific payload. Must include an `id` field.
     * @param condition - Optional condition for when this annotation is active
     *
     * @example
     * entity.annotate('illustration', {
     *   id: 'dam-exterior',
     *   src: 'dam-dry.jpg',
     *   alt: 'The massive concrete face of Flood Control Dam #3',
     *   trigger: 'on-enter',
     *   position: 'right',
     * });
     */
    annotate(kind: string, data: Record<string, unknown> & {
        id: string;
    }, condition?: AnnotationCondition): this;
    /**
     * Get all annotations of a given kind (unfiltered).
     */
    getAnnotations(kind: string): Annotation[];
    /**
     * Get annotations whose conditions are currently met.
     * Requires a world model reference to resolve trait state on self/player/location.
     *
     * @param kind - Annotation kind to query
     * @param world - World model for condition evaluation (must have getEntity, getPlayer, getLocation)
     */
    getActiveAnnotations(kind: string, world: {
        getEntity(id: string): IFEntity | undefined;
        getPlayer(): IFEntity | undefined;
        getLocation(entityId: string): string | undefined;
    }): Annotation[];
    /**
     * Remove a specific annotation by kind and id.
     * @returns true if the annotation was found and removed
     */
    removeAnnotation(kind: string, id: string): boolean;
    /**
     * Check if entity has any annotations of a given kind.
     */
    hasAnnotations(kind: string): boolean;
    /**
     * Evaluate an annotation condition against current world state.
     */
    private evaluateCondition;
    /**
     * Clone this entity with all its traits
     */
    clone(newId: string): IFEntity;
    /**
     * Serialize entity and traits to JSON
     */
    toJSON(): any;
    /**
     * Create entity from JSON data
     */
    static fromJSON(json: any): IFEntity;
    /**
     * Check if this is a room
     */
    get isRoom(): boolean;
    /**
     * Check if this can contain other entities
     */
    get canContain(): boolean;
    /**
     * Check if this is takeable (default behavior unless has scenery trait)
     */
    get isTakeable(): boolean;
    /**
     * Check if this is fixed in place (has scenery trait)
     */
    get isScenery(): boolean;
    /**
     * Check if this can be opened
     */
    get isOpenable(): boolean;
    /**
     * Check if this is currently open
     */
    get isOpen(): boolean;
    /**
     * Check if this can be locked
     */
    get isLockable(): boolean;
    /**
     * Check if this is currently locked
     */
    get isLocked(): boolean;
    /**
     * Check if this is a container
     */
    get isContainer(): boolean;
    /**
     * Check if this is a supporter
     */
    get isSupporter(): boolean;
    /**
     * Check if this is a door
     */
    get isDoor(): boolean;
    /**
     * Check if this is an actor
     */
    get isActor(): boolean;
    /**
     * Check if this is the player
     */
    get isPlayer(): boolean;
    /**
     * Check if this provides light
     */
    get providesLight(): boolean;
    /**
     * Check if this is switchable
     */
    get isSwitchable(): boolean;
    /**
     * Check if this can be entered by actors
     * Vehicles are inherently enterable (boats, baskets, etc.)
     */
    get enterable(): boolean;
    /**
     * Check if this is switched on
     */
    get isOn(): boolean;
    /**
     * Get the name of this entity
     */
    get name(): string;
    /**
     * Get the description of this entity, computed from trait state.
     *
     * Priority: OpenableTrait (open/closed) > SwitchableTrait (on/off)
     * > LightSourceTrait (lit/unlit) > IdentityTrait.description.
     * Each trait is consulted only if the entity has it and the relevant
     * state-specific description field is populated; otherwise falls through.
     */
    get description(): string | undefined;
    /**
     * Get the weight of this entity
     */
    get weight(): number;
    /**
     * Alias for has() method - for backwards compatibility
     */
    hasTrait(type: TraitType | string): boolean;
}
```

### entities/entity-store

```typescript
import { IFEntity } from './if-entity';
/**
 * Entity store that works with IFEntity instances.
 * Provides trait-aware entity management.
 */
export declare class EntityStore {
    private ifEntities;
    constructor();
    /**
     * Add an IF entity to the store
     */
    add(entity: IFEntity): void;
    /**
     * Get an IF entity by ID
     */
    get(id: string): IFEntity | undefined;
    /**
     * Check if an entity exists
     */
    has(id: string): boolean;
    /**
     * Remove an entity from the store
     */
    remove(id: string): boolean;
    /**
     * Get all entities
     */
    getAll(): IFEntity[];
    /**
     * Get entities by type
     */
    getByType(type: string): IFEntity[];
    /**
     * Find entities with a specific trait
     */
    findWithTrait(traitType: string): IFEntity[];
    /**
     * Find entities with all specified traits
     */
    findWithAllTraits(...traitTypes: string[]): IFEntity[];
    /**
     * Find entities with any of the specified traits
     */
    findWithAnyTraits(...traitTypes: string[]): IFEntity[];
    /**
     * Clear all entities from the store
     */
    clear(): void;
    /**
     * Get the number of entities in the store
     */
    get size(): number;
    /**
     * Iterate over all entities
     */
    [Symbol.iterator](): Iterator<IFEntity>;
    /**
     * Serialize all entities to JSON
     */
    toJSON(): any[];
    /**
     * Load entities from JSON data
     */
    static fromJSON(json: any[]): EntityStore;
}
```

### entities/entity-types

```typescript
/**
 * Standard Interactive Fiction entity types
 *
 * These represent the fundamental object types in IF games.
 * The values match the type strings used throughout the system.
 */
export declare const EntityType: {
    /** A location in the game world */
    readonly ROOM: "room";
    /** A doorway or portal between rooms */
    readonly DOOR: "door";
    /** A generic takeable object */
    readonly ITEM: "item";
    /** A character (NPC or player) */
    readonly ACTOR: "actor";
    /** An object that can contain other objects */
    readonly CONTAINER: "container";
    /** An object that can support other objects on top */
    readonly SUPPORTER: "supporter";
    /** Fixed decorative objects that can't be taken */
    readonly SCENERY: "scenery";
    /** A directional exit (rarely used as entity) */
    readonly EXIT: "exit";
    /** Generic object type (default) */
    readonly OBJECT: "object";
};
/**
 * Type representing valid entity types
 */
export type EntityType = typeof EntityType[keyof typeof EntityType];
/**
 * Type guard to check if a string is a valid IF entity type
 */
export declare function isEntityType(type: string): type is EntityType;
/**
 * Get the ID prefix for an entity type
 * Used for generating consistent entity IDs
 */
export declare function getEntityTypePrefix(type: EntityType): string;
```

### behaviors/behavior

```typescript
import { IFEntity } from '../entities/if-entity';
import { TraitType } from '../traits/trait-types';
import { ITrait } from '../traits/trait';
/**
 * Base class for all behaviors in the IF system.
 *
 * Behaviors contain the logic that operates on trait data.
 * They declare their required traits and provide helper methods
 * for safely accessing those traits.
 *
 * Note: In the new architecture, behaviors are primarily static
 * utility classes rather than instantiated objects.
 */
export declare abstract class Behavior {
    /**
     * List of trait types that must be present on an entity
     * for this behavior to function properly.
     *
     * Example:
     * static requiredTraits = [TraitType.LOCKABLE, TraitType.OPENABLE];
     */
    static requiredTraits: (TraitType | string)[];
    /**
     * Helper method to require and retrieve a trait from an entity.
     * Throws an error if the trait is not present.
     *
     * @param entity - The entity to get the trait from
     * @param traitType - The type of trait to retrieve
     * @returns The trait instance
     * @throws Error if the trait is not present on the entity
     */
    protected static require<T extends ITrait>(entity: IFEntity, traitType: TraitType | string): T;
    /**
     * Helper method to optionally retrieve a trait from an entity.
     * Returns undefined if the trait is not present.
     *
     * @param entity - The entity to get the trait from
     * @param traitType - The type of trait to retrieve
     * @returns The trait instance or undefined
     */
    protected static optional<T extends ITrait>(entity: IFEntity, traitType: TraitType | string): T | undefined;
    /**
     * Validates that an entity has all required traits for this behavior.
     *
     * @param entity - The entity to validate
     * @returns true if all required traits are present
     */
    static validateEntity(entity: IFEntity): boolean;
    /**
     * Gets a list of missing required traits for an entity.
     *
     * @param entity - The entity to check
     * @returns Array of missing trait types
     */
    static getMissingTraits(entity: IFEntity): (TraitType | string)[];
}
/**
 * Interface for behaviors that need access to the world context
 */
export interface IWorldAwareBehavior {
    setWorldContext(context: any): void;
}
/**
 * Type guard to check if a behavior is world-aware
 */
export declare function isWorldAwareBehavior(behavior: any): behavior is IWorldAwareBehavior;
```

### traits/container/containerBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
/**
 * Result of an add item operation
 */
export interface IAddItemResult {
    success: boolean;
    alreadyContains?: boolean;
    containerFull?: boolean;
    wrongType?: boolean;
    containerClosed?: boolean;
    itemTooLarge?: boolean;
    itemTooHeavy?: boolean;
    stateChanged?: boolean;
}
/**
 * Result of a remove item operation
 */
export interface IRemoveItemResult {
    success: boolean;
    notContained?: boolean;
    containerClosed?: boolean;
    stateChanged?: boolean;
}
export interface IWorldQuery {
    getContents(containerId: string): IFEntity[];
    getLocation(entityId: string): string | undefined;
}
/**
 * Behavior for entities that can contain other entities.
 *
 * Handles capacity checks, type restrictions, and container state.
 */
export declare class ContainerBehavior extends Behavior {
    static requiredTraits: "container"[];
    /**
     * Check if a container can accept an item
     * @returns true if the item can be accepted
     */
    static canAccept(container: IFEntity, item: IFEntity, world: IWorldQuery): boolean;
    /**
     * Check capacity constraints
     */
    static checkCapacity(container: IFEntity, item: IFEntity, world: IWorldQuery): boolean;
    /**
     * Get total weight of contents (not recursive - container bears the weight)
     */
    static getTotalWeight(container: IFEntity, world: IWorldQuery): number;
    /**
     * Get total volume of contents
     */
    static getTotalVolume(container: IFEntity, world: IWorldQuery): number;
    /**
     * Get remaining capacity
     */
    static getRemainingCapacity(container: IFEntity, world: IWorldQuery): {
        items?: number;
        weight?: number;
        volume?: number;
    };
    /**
     * Check if the container is transparent (can see contents when closed)
     */
    static isTransparent(container: IFEntity): boolean;
    /**
     * Check if the container is enterable by actors
     */
    static isEnterable(container: IFEntity): boolean;
    /**
     * Get allowed types for this container
     */
    static getAllowedTypes(container: IFEntity): string[] | undefined;
    /**
     * Get excluded types for this container
     */
    static getExcludedTypes(container: IFEntity): string[] | undefined;
    /**
     * Add an item to a container
     * @param container The container to add to
     * @param item The item to add
     * @param world World query interface for getting current state
     * @returns Result describing what happened
     */
    static addItem(container: IFEntity, item: IFEntity, world: IWorldQuery): IAddItemResult;
    /**
     * Remove an item from a container
     * @param container The container to remove from
     * @param item The item to remove
     * @param world World query interface for getting current state
     * @returns Result describing what happened
     */
    static removeItem(container: IFEntity, item: IFEntity, world: IWorldQuery): IRemoveItemResult;
}
```

### traits/scenery/sceneryBehavior

```typescript
import { IFEntity } from '../../entities/if-entity';
/**
 * Behavior for scenery entities.
 * Handles logic related to fixed-in-place objects.
 */
export declare class SceneryBehavior {
    static readonly requiredTraits: "scenery"[];
    /**
     * Get the reason why this item can't be taken
     */
    static getUntakeableReason(entity: IFEntity): string;
    /**
     * Get the custom can't-take message if any
     */
    static getCantTakeMessage(entity: IFEntity): string | undefined;
    /**
     * Check if this scenery should be mentioned in room descriptions
     */
    static isMentioned(entity: IFEntity): boolean;
}
```

### traits/wearable/wearableBehavior

```typescript
import { IFEntity } from '../../entities/if-entity';
export interface IWearResult {
    success: boolean;
    alreadyWorn?: boolean;
    wornByOther?: string;
    slotConflict?: string;
    slot?: string;
    layer?: number;
    wearMessage?: string;
}
export interface IRemoveResult {
    success: boolean;
    notWorn?: boolean;
    wornByOther?: string;
    blocked?: boolean;
    removeMessage?: string;
}
/**
 * Behavior for wearable entities.
 *
 * Handles the logic for wearing and removing wearable items.
 */
export declare class WearableBehavior {
    static requiredTraits: "wearable"[];
    /**
     * Check if an item can be worn by an actor
     */
    static canWear(item: IFEntity, actor: IFEntity): boolean;
    /**
     * Check if an item can be removed by an actor
     */
    static canRemove(item: IFEntity, actor: IFEntity): boolean;
    /**
     * Wear an item
     * @returns Result object describing what happened
     */
    static wear(item: IFEntity, actor: IFEntity): IWearResult;
    /**
     * Remove (take off) a worn item
     * @returns Result object describing what happened
     */
    static remove(item: IFEntity, actor: IFEntity): IRemoveResult;
    /**
     * Check if item is currently worn
     */
    static isWorn(item: IFEntity): boolean;
    /**
     * Check who is wearing the item
     */
    static getWearer(item: IFEntity): string | undefined;
    /**
     * Get the slot this item occupies
     */
    static getSlot(item: IFEntity): string;
    /**
     * Get the layer for sorting
     */
    static getLayer(item: IFEntity): number;
    /**
     * Check if this item blocks any slots
     */
    static getBlockedSlots(item: IFEntity): string[];
}
```

### traits/readable/readableBehavior

```typescript
import { IFEntity } from '../../entities/if-entity';
import { ISemanticEvent } from '@sharpee/core';
/**
 * Behavior for readable entities.
 * Handles all logic related to reading text, turning pages, etc.
 */
export declare class ReadableBehavior {
    static readonly requiredTraits: "readable"[];
    /**
     * Get the current readable text
     */
    static getText(entity: IFEntity): string;
    /**
     * Mark entity as read
     */
    static markAsRead(entity: IFEntity): ISemanticEvent[];
    /**
     * Check if entity can be read with given ability
     */
    static canRead(entity: IFEntity, ability?: string): boolean;
    /**
     * Turn to a specific page
     */
    static turnToPage(entity: IFEntity, page: number): ISemanticEvent[];
    /**
     * Turn to next page
     */
    static nextPage(entity: IFEntity): ISemanticEvent[];
    /**
     * Turn to previous page
     */
    static previousPage(entity: IFEntity): ISemanticEvent[];
    /**
     * Get a preview of the text
     */
    static getPreview(entity: IFEntity): string;
    /**
     * Read the entity
     */
    static read(reader: IFEntity, readable: IFEntity): ISemanticEvent[];
}
```

### traits/light-source/lightSourceBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
/**
 * Behavior for light source entities.
 *
 * Handles the logic for entities that can provide illumination.
 */
export declare class LightSourceBehavior extends Behavior {
    static requiredTraits: "lightSource"[];
    /**
     * Turn on the light source
     * @returns true if successfully lit, false if out of fuel
     */
    static light(source: IFEntity): boolean;
    /**
     * Turn off the light source
     */
    static extinguish(source: IFEntity): void;
    /**
     * Check if the light source is currently lit.
     *
     * Priority:
     * 1. Explicit isLit property (true/false)
     * 2. Switchable trait state (isOn)
     * 3. Default to lit (for inherently glowing items)
     */
    static isLit(source: IFEntity): boolean;
    /**
     * Get the brightness level
     */
    static getBrightness(source: IFEntity): number;
    /**
     * Get remaining fuel
     * @returns Fuel amount or undefined if unlimited
     */
    static getFuelRemaining(source: IFEntity): number | undefined;
    /**
     * Check if the light source has fuel
     */
    static hasFuel(source: IFEntity): boolean;
    /**
     * Consume fuel (typically called each turn the light is on)
     * @returns true if fuel was consumed, false if out of fuel
     */
    static consumeFuel(source: IFEntity, amount?: number): boolean;
    /**
     * Refuel the light source
     * @param amount Amount to add, or fill to max if not specified
     */
    static refuel(source: IFEntity, amount?: number): void;
    /**
     * Get fuel percentage remaining
     * @returns 0-100, or undefined if unlimited fuel
     */
    static getFuelPercentage(source: IFEntity): number | undefined;
}
```

### traits/exit/exitBehavior

```typescript
import { IFEntity } from '../../entities/if-entity';
import { ExitTrait } from './exitTrait';
import { ISemanticEvent } from '@sharpee/core';
/**
 * Behavior for exit entities.
 * Handles all logic related to movement through exits.
 */
export declare class ExitBehavior {
    static readonly requiredTraits: "exit"[];
    /**
     * Check if an exit matches a command
     */
    static matchesCommand(exit: IFEntity, command: string): boolean;
    /**
     * Check if an exit can be used
     */
    static canUse(exit: IFEntity, actor: IFEntity, world?: any): boolean;
    /**
     * Use an exit to move between locations
     */
    static use(exit: IFEntity, actor: IFEntity, world?: any): ISemanticEvent[];
    /**
     * Get reason why exit is blocked
     */
    static getBlockedReason(exit: IFEntity): string;
    /**
     * Get all exits from a location
     */
    static getExitsFrom(locationId: string, world: any): IFEntity[];
    /**
     * Get visible exits from a location
     */
    static getVisibleExitsFrom(locationId: string, world: any): IFEntity[];
    /**
     * Get listed exits from a location (for room descriptions)
     */
    static getListedExitsFrom(locationId: string, world: any): IFEntity[];
    /**
     * Create a bidirectional exit (creates reverse exit entity)
     */
    static createBidirectional(exitData: Partial<ExitTrait>, world?: any): IFEntity[];
    /**
     * Get reverse direction for standard directions
     */
    static getReverseDirection(direction?: string): string | undefined;
    /**
     * Get reverse command for standard commands
     */
    static getReverseCommand(command: string): string;
}
```

### traits/climbable/climbableBehavior

```typescript
/**
 * Behavior functions for climbable objects
 */
import { IFEntity } from '../../entities/if-entity';
/**
 * Result of attempting to climb
 */
export interface IClimbResult {
    success: boolean;
    blocked?: boolean;
    blockedReason?: string;
    destination?: string;
    direction?: 'up' | 'down' | 'both';
    successMessage?: string;
}
/**
 * Behavior functions for climbable objects
 */
export declare class ClimbableBehavior {
    /**
     * Check if an entity is climbable
     */
    static isClimbable(entity: IFEntity): boolean;
    /**
     * Attempt to climb an object
     */
    static climb(entity: IFEntity): IClimbResult;
    /**
     * Get climb direction for an object
     */
    static getDirection(entity: IFEntity): 'up' | 'down' | 'both' | undefined;
    /**
     * Get climb destination for an object
     */
    static getDestination(entity: IFEntity): string | undefined;
}
```

### traits/openable/openableBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
/**
 * Result of an open operation
 */
export interface IOpenResult {
    success: boolean;
    alreadyOpen?: boolean;
    stateChanged?: boolean;
    openMessage?: string;
    openSound?: string;
    revealsContents?: boolean;
}
/**
 * Result of a close operation
 */
export interface ICloseResult {
    success: boolean;
    alreadyClosed?: boolean;
    cantClose?: boolean;
    stateChanged?: boolean;
    closeMessage?: string;
    closeSound?: string;
}
/**
 * Behavior for openable entities.
 *
 * Handles the logic for opening and closing entities.
 */
export declare class OpenableBehavior extends Behavior {
    static requiredTraits: "openable"[];
    /**
     * Check if an entity can be opened
     */
    static canOpen(entity: IFEntity): boolean;
    /**
     * Check if an entity can be closed
     */
    static canClose(entity: IFEntity): boolean;
    /**
     * Open the entity
     * @returns Result describing what happened
     */
    static open(entity: IFEntity): IOpenResult;
    /**
     * Close the entity
     * @returns Result describing what happened
     */
    static close(entity: IFEntity): ICloseResult;
    /**
     * Toggle open/closed state
     * @returns Result from either open or close
     */
    static toggle(entity: IFEntity): IOpenResult | ICloseResult;
    /**
     * Check if entity is currently open
     */
    static isOpen(entity: IFEntity): boolean;
    /**
     * Check if opening reveals contents
     */
    static revealsContents(entity: IFEntity): boolean;
}
```

### traits/lockable/lockableBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { EntityId } from '@sharpee/core';
/**
 * Result of a lock operation
 */
export interface ILockResult {
    success: boolean;
    alreadyLocked?: boolean;
    notClosed?: boolean;
    noKey?: boolean;
    wrongKey?: boolean;
    stateChanged?: boolean;
    lockMessage?: string;
    lockSound?: string;
}
/**
 * Result of an unlock operation
 */
export interface IUnlockResult {
    success: boolean;
    alreadyUnlocked?: boolean;
    noKey?: boolean;
    wrongKey?: boolean;
    stateChanged?: boolean;
    unlockMessage?: string;
    unlockSound?: string;
}
/**
 * Behavior for lockable entities.
 *
 * Handles the logic for locking and unlocking entities.
 * Requires LOCKABLE trait, OPENABLE is optional.
 */
export declare class LockableBehavior extends Behavior {
    static requiredTraits: "lockable"[];
    /**
     * Check if a key can unlock this entity
     */
    static canUnlockWith(entity: IFEntity, keyId: EntityId): boolean;
    /**
     * Check if a key can lock this entity (usually same as unlock)
     */
    static canLockWith(entity: IFEntity, keyId: EntityId): boolean;
    /**
     * Check if this entity requires a key to unlock
     */
    static requiresKey(entity: IFEntity): boolean;
    /**
     * Check if an entity can be locked
     */
    static canLock(entity: IFEntity): boolean;
    /**
     * Check if an entity can be unlocked
     */
    static canUnlock(entity: IFEntity): boolean;
    /**
     * Lock the entity
     * @returns Result describing what happened
     */
    static lock(entity: IFEntity, keyEntity?: IFEntity): ILockResult;
    /**
     * Unlock the entity with a key
     * @returns Result describing what happened
     */
    static unlock(entity: IFEntity, keyEntity?: IFEntity): IUnlockResult;
    /**
     * Force unlock without a key (for admin/debug)
     */
    static forceUnlock(entity: IFEntity): void;
    /**
     * Check if entity is currently locked
     */
    static isLocked(entity: IFEntity): boolean;
    /**
     * Handle auto-lock when closing
     */
    static handleClose(entity: IFEntity): ILockResult | null;
    /**
     * Check if we can open this entity (not locked)
     */
    static canOpen(entity: IFEntity): boolean;
    /**
     * Get the locked message
     */
    static getLockedMessage(entity: IFEntity): string | undefined;
}
```

### traits/weapon/weaponBehavior

```typescript
/**
 * Behavior for weapon entities
 */
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
/**
 * Result of a weapon damage calculation
 */
export interface IWeaponDamageResult {
    damage: number;
    weaponType: string;
    criticalHit?: boolean;
    weaponBroke?: boolean;
}
/**
 * Behavior for weapon entities.
 *
 * Handles damage calculation and weapon durability.
 */
export declare class WeaponBehavior extends Behavior {
    static requiredTraits: "weapon"[];
    /**
     * Calculate damage for a weapon
     */
    static calculateDamage(weapon: IFEntity): IWeaponDamageResult;
    /**
     * Check if a weapon can damage a specific target type
     */
    static canDamage(weapon: IFEntity, targetType?: string): boolean;
    /**
     * Get weapon type
     */
    static getWeaponType(weapon: IFEntity): string;
    /**
     * Check if weapon requires two hands
     */
    static isTwoHanded(weapon: IFEntity): boolean;
    /**
     * Repair weapon (restore durability)
     */
    static repair(weapon: IFEntity): boolean;
    /**
     * Check if weapon is broken
     */
    static isBroken(weapon: IFEntity): boolean;
}
```

### traits/breakable/breakableBehavior

```typescript
/**
 * Behavior for breakable entities
 */
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { WorldModel } from '../../world/WorldModel';
import { EntityId } from '@sharpee/core';
/**
 * Result of breaking an entity
 */
export interface IBreakResult {
    success: boolean;
    alreadyBroken?: boolean;
    debrisCreated?: EntityId[];
    itemRemoved?: boolean;
    message?: string;
    sound?: string;
}
/**
 * Behavior for breakable entities.
 *
 * Handles breaking entities and creating debris.
 * This is a world-aware behavior because it needs to create/remove entities.
 */
export declare class BreakableBehavior extends Behavior {
    static requiredTraits: "breakable"[];
    /**
     * Check if an entity can be broken
     */
    static canBreak(entity: IFEntity): boolean;
    /**
     * Break the entity
     * @param entity The entity to break
     * @param world The world model (needed to create debris and remove entity)
     * @returns Result describing what happened
     */
    static break(entity: IFEntity, world: WorldModel): IBreakResult;
    /**
     * Check if entity is broken
     */
    static isBroken(entity: IFEntity): boolean;
}
```

### traits/destructible/destructibleBehavior

```typescript
/**
 * Behavior for destructible entities
 */
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { WorldModel } from '../../world/WorldModel';
import { EntityId } from '@sharpee/core';
/**
 * Result of damaging a destructible entity
 */
export interface IDamageResult {
    success: boolean;
    damage: number;
    destroyed: boolean;
    remainingHitPoints: number;
    requiresWeapon?: boolean;
    wrongWeaponType?: boolean;
    invulnerable?: boolean;
    transformedTo?: EntityId;
    exitRevealed?: string;
    message?: string;
}
/**
 * Behavior for destructible entities.
 *
 * Handles multi-hit destruction with hit points and armor.
 * This is a world-aware behavior because it may transform entities or reveal exits.
 */
export declare class DestructibleBehavior extends Behavior {
    static requiredTraits: "destructible"[];
    /**
     * Check if an entity can be damaged
     */
    static canDamage(entity: IFEntity, weaponType?: string): boolean;
    /**
     * Damage the entity
     * @param entity The entity to damage
     * @param damage Base damage amount
     * @param weaponType Type of weapon used (if any)
     * @param world The world model (needed for transformations)
     * @returns Result describing what happened
     */
    static damage(entity: IFEntity, damage: number, weaponType: string | undefined, world: WorldModel): IDamageResult;
    /**
     * Check if entity is destroyed
     */
    static isDestroyed(entity: IFEntity): boolean;
    /**
     * Get remaining hit points
     */
    static getHitPoints(entity: IFEntity): number;
    /**
     * Repair entity (restore hit points)
     */
    static repair(entity: IFEntity): boolean;
}
```

### traits/combatant/combatantBehavior

```typescript
/**
 * Behavior for combatant entities
 */
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { WorldModel } from '../../world/WorldModel';
import { EntityId } from '@sharpee/core';
/**
 * Result of a combat attack
 */
export interface ICombatResult {
    success: boolean;
    damage: number;
    killed: boolean;
    remainingHealth: number;
    droppedItems?: EntityId[];
    retaliated?: boolean;
    message?: string;
    deathMessage?: string;
}
/**
 * Behavior for combatant entities.
 *
 * Handles combat with health, armor, and death.
 * This is a world-aware behavior because it handles inventory dropping on death.
 */
export declare class CombatBehavior extends Behavior {
    static requiredTraits: "combatant"[];
    /**
     * Check if a combatant can be attacked
     */
    static canAttack(entity: IFEntity): boolean;
    /**
     * Attack a combatant
     * @param entity The combatant to attack
     * @param damage Base damage amount
     * @param world The world model (needed for dropping inventory)
     * @returns Result describing what happened
     */
    static attack(entity: IFEntity, damage: number, world: WorldModel): ICombatResult;
    /**
     * Heal a combatant
     */
    static heal(entity: IFEntity, amount: number): number;
    /**
     * Resurrect a dead combatant
     */
    static resurrect(entity: IFEntity): boolean;
    /**
     * Check if combatant is alive
     */
    static isAlive(entity: IFEntity): boolean;
    /**
     * Get current health
     */
    static getHealth(entity: IFEntity): number;
    /**
     * Get health percentage
     */
    static getHealthPercentage(entity: IFEntity): number;
    /**
     * Check if combatant is hostile
     */
    static isHostile(entity: IFEntity): boolean;
    /**
     * Set hostility
     */
    static setHostile(entity: IFEntity, hostile: boolean): void;
}
```

### behaviors/attack

```typescript
/**
 * Attack behavior coordinator
 *
 * Coordinates the various combat behaviors to handle attacks
 */
import { IFEntity } from '../entities/if-entity';
import { WorldModel } from '../world/WorldModel';
import { EntityId } from '@sharpee/core';
/**
 * Combined result of an attack
 */
export interface IAttackResult {
    success: boolean;
    type: 'broke' | 'damaged' | 'destroyed' | 'killed' | 'hit' | 'ineffective';
    damage?: number;
    remainingHitPoints?: number;
    targetDestroyed?: boolean;
    targetKilled?: boolean;
    itemsDropped?: EntityId[];
    debrisCreated?: EntityId[];
    exitRevealed?: string;
    transformedTo?: EntityId;
    weaponBroke?: boolean;
    message?: string;
}
/**
 * Attack behavior coordinator.
 *
 * This behavior coordinates attacks using weapon, breakable, destructible, and combat behaviors.
 * It determines which behavior to use based on the target's traits.
 */
export declare class AttackBehavior {
    /**
     * Perform an attack
     * @param target The entity being attacked
     * @param weapon Optional weapon being used
     * @param world The world model
     * @returns Combined attack result
     */
    static attack(target: IFEntity, weapon: IFEntity | undefined, world: WorldModel): IAttackResult;
    /**
     * Check if a target can be attacked
     */
    static canAttack(target: IFEntity, weapon?: IFEntity): boolean;
    /**
     * Infer the best weapon from inventory
     * @param inventory Array of entities in player's inventory
     * @returns The best weapon found, or undefined
     */
    static inferWeapon(inventory: IFEntity[]): IFEntity | undefined;
}
```

### constants/action-failures

```typescript
/**
 * Action failure reasons for the IF system.
 *
 * These are semantic codes used by behaviors to indicate why an action failed.
 * The language layer maps these to appropriate messages.
 */
export declare const ActionFailureReason: {
    readonly NOT_VISIBLE: "not_visible";
    readonly NOT_REACHABLE: "not_reachable";
    readonly NOT_IN_SCOPE: "not_in_scope";
    readonly FIXED_IN_PLACE: "fixed_in_place";
    readonly ALREADY_OPEN: "already_open";
    readonly ALREADY_CLOSED: "already_closed";
    readonly NOT_OPENABLE: "not_openable";
    readonly LOCKED: "locked";
    readonly NOT_LOCKABLE: "not_lockable";
    readonly ALREADY_LOCKED: "already_locked";
    readonly ALREADY_UNLOCKED: "already_unlocked";
    readonly CONTAINER_FULL: "container_full";
    readonly CONTAINER_CLOSED: "container_closed";
    readonly NOT_A_CONTAINER: "not_a_container";
    readonly NOT_A_SUPPORTER: "not_a_supporter";
    readonly ALREADY_IN_CONTAINER: "already_in_container";
    readonly NOT_WEARABLE: "not_wearable";
    readonly ALREADY_WEARING: "already_wearing";
    readonly NOT_WEARING: "not_wearing";
    readonly WORN_BY_OTHER: "worn_by_other";
    readonly TOO_HEAVY: "too_heavy";
    readonly CARRYING_TOO_MUCH: "carrying_too_much";
    readonly WRONG_KEY: "wrong_key";
    readonly NO_KEY_SPECIFIED: "no_key_specified";
    readonly NOT_A_KEY: "not_a_key";
    readonly ALREADY_ON: "already_on";
    readonly ALREADY_OFF: "already_off";
    readonly NOT_SWITCHABLE: "not_switchable";
    readonly NO_POWER: "no_power";
    readonly NO_EXIT_THAT_WAY: "no_exit_that_way";
    readonly CANT_GO_THAT_WAY: "cant_go_that_way";
    readonly DOOR_CLOSED: "door_closed";
    readonly DOOR_LOCKED: "door_locked";
    readonly CANT_DO_THAT: "cant_do_that";
    readonly NOT_IMPLEMENTED: "not_implemented";
    readonly INVALID_TARGET: "invalid_target";
    readonly NOTHING_HAPPENS: "nothing_happens";
    readonly ACTOR_CANT_SEE: "actor_cant_see";
    readonly ACTOR_CANT_REACH: "actor_cant_reach";
    readonly ACTOR_BUSY: "actor_busy";
    readonly NOT_EDIBLE: "not_edible";
    readonly NOTHING_LEFT: "nothing_left";
    readonly NOT_READABLE: "not_readable";
    readonly NOTHING_WRITTEN: "nothing_written";
};
export type ActionFailureReasonType = typeof ActionFailureReason[keyof typeof ActionFailureReason];
```

### constants/directions

```typescript
/**
 * Language-agnostic direction constants for Interactive Fiction
 *
 * These constants represent spatial relationships, not English words.
 * Direction vocabularies (ADR-143) control how these constants are
 * presented to and accepted from the player.
 */
export declare const Direction: {
    readonly NORTH: "NORTH";
    readonly SOUTH: "SOUTH";
    readonly EAST: "EAST";
    readonly WEST: "WEST";
    readonly NORTHEAST: "NORTHEAST";
    readonly NORTHWEST: "NORTHWEST";
    readonly SOUTHEAST: "SOUTHEAST";
    readonly SOUTHWEST: "SOUTHWEST";
    readonly UP: "UP";
    readonly DOWN: "DOWN";
    readonly IN: "IN";
    readonly OUT: "OUT";
};
export type DirectionType = typeof Direction[keyof typeof Direction];
/**
 * Map of opposite directions using constants
 */
export declare const DirectionOpposites: Record<DirectionType, DirectionType>;
/**
 * Get the opposite direction
 */
export declare function getOppositeDirection(direction: DirectionType): DirectionType;
/**
 * Check if a value is a valid Direction constant
 */
export declare function isDirection(value: unknown): value is DirectionType;
/**
 * A single entry in a direction vocabulary.
 *
 * @property display  - The word shown to the player (e.g., "fore")
 * @property words    - All words the parser accepts for this direction (e.g., ["fore", "f", "forward"])
 */
export interface DirectionEntry {
    display: string;
    words: string[];
}
/**
 * A named set of direction-word mappings.
 *
 * Only directions present in the entries map are available to the player.
 * A vocabulary that omits NORTHEAST means diagonal movement is not recognized.
 */
export interface DirectionVocabulary {
    id: string;
    entries: Partial<Record<DirectionType, DirectionEntry>>;
}
/**
 * Pre-defined compass vocabulary (the default).
 */
export declare const CompassVocabulary: DirectionVocabulary;
/**
 * Naval vocabulary — relative to the vessel.
 *
 * Maps cardinal directions to shipboard equivalents.
 * Diagonals are omitted (ships don't have northeast).
 */
export declare const NavalVocabulary: DirectionVocabulary;
/**
 * Minimal vocabulary — for caves, abstract spaces, interiors.
 *
 * Only vertical and threshold directions. No compass.
 */
export declare const MinimalVocabulary: DirectionVocabulary;
/**
 * Registry of named direction vocabularies.
 *
 * Stories retrieve the registry from the world model and call
 * `useVocabulary()` or `rename()` to configure direction words
 * from a single point.
 */
export declare class DirectionVocabularyRegistry {
    private vocabularies;
    private active;
    private listeners;
    constructor();
    /**
     * Register a custom vocabulary.
     */
    define(vocab: DirectionVocabulary): void;
    /**
     * Get a vocabulary by name.
     */
    get(id: string): DirectionVocabulary | undefined;
    /**
     * Switch the active vocabulary by name.
     * Notifies all listeners (parser, grammar) to rebuild their mappings.
     */
    useVocabulary(id: string): void;
    /**
     * Rename a single direction in the active vocabulary.
     * Creates a modified copy so the original named vocabulary is not mutated.
     */
    rename(direction: DirectionType, entry: DirectionEntry): void;
    /**
     * Add alias words to a direction without replacing the existing ones.
     */
    alias(direction: DirectionType, entry: DirectionEntry): void;
    /**
     * Get the currently active vocabulary.
     */
    getActive(): DirectionVocabulary;
    /**
     * Get the display name for a direction in the active vocabulary.
     * Falls back to lowercase direction constant if not in vocabulary.
     */
    getDisplayName(direction: DirectionType): string;
    /**
     * Register a listener that is called when the active vocabulary changes.
     * Used by the parser to rebuild direction mappings.
     */
    onVocabularyChange(listener: (vocab: DirectionVocabulary) => void): void;
    private notifyListeners;
}
```

### commands/parsed-command

```typescript
/**
 * Command types for the parsing phase
 * These types represent the syntactic structure of commands
 * without any world knowledge or entity resolution
 */
export interface IParsedObjectReference {
    /** Original text from input */
    text: string;
    /** Possible vocabulary matches */
    candidates: string[];
    /** Optional modifiers (adjectives, etc.) */
    modifiers?: string[];
}
export interface IParsedCommandV1 {
    /** Raw input text */
    rawInput: string;
    /** Identified action verb */
    action: string;
    /** Direct object if present */
    directObject?: IParsedObjectReference;
    /** Indirect object if present */
    indirectObject?: IParsedObjectReference;
    /** Preposition if present */
    preposition?: string;
    /** Additional parsed elements */
    extras?: Record<string, any>;
}
/**
 * Parts of speech classification
 */
export declare enum PartOfSpeech {
    VERB = "VERB",
    NOUN = "NOUN",
    ADJECTIVE = "ADJECTIVE",
    ARTICLE = "ARTICLE",
    PREPOSITION = "PREPOSITION",
    PRONOUN = "PRONOUN",
    DETERMINER = "DETERMINER",
    CONJUNCTION = "CONJUNCTION",
    UNKNOWN = "UNKNOWN"
}
/**
 * Token candidate from vocabulary
 */
export interface ITokenCandidate {
    /** Vocabulary ID */
    id: string;
    /** Type in vocabulary (verb, noun, etc.) */
    type: string;
    /** Confidence score */
    confidence: number;
}
/**
 * Individual token with full information
 */
export interface IToken {
    /** Original word as typed */
    word: string;
    /** Normalized form (lowercase, etc.) */
    normalized: string;
    /** Character position in original input */
    position: number;
    /** Length of the token */
    length: number;
    /** Possible parts of speech */
    partOfSpeech: PartOfSpeech[];
    /** Vocabulary candidates for this token */
    candidates: ITokenCandidate[];
}
/**
 * Verb phrase structure
 */
export interface IVerbPhrase {
    /** Indices into token array */
    tokens: number[];
    /** Original text (e.g., "look at") */
    text: string;
    /** Main verb */
    head: string;
    /** Verb particles ("at" in "look at") */
    particles?: string[];
}
/**
 * Noun phrase structure with all information preserved
 */
export interface INounPhrase {
    /** Indices into token array */
    tokens: number[];
    /** Original complete text (e.g., "the small red ball") */
    text: string;
    /** Head noun ("ball") */
    head: string;
    /** Modifiers/adjectives ("small", "red") */
    modifiers: string[];
    /** Articles ("the", "a", "an") */
    articles: string[];
    /** Determiners ("all", "every", "some") */
    determiners: string[];
    /** Vocabulary candidates for the head noun */
    candidates: string[];
    /** True if this represents "all" (e.g., "take all") */
    isAll?: boolean;
    /** True if this is a list of objects (e.g., "take knife and lamp") */
    isList?: boolean;
    /** Individual items when isList is true */
    items?: INounPhrase[];
    /** Pre-resolved entity ID (e.g., when "it" was resolved during parsing) */
    entityId?: string;
    /** True if this noun phrase was a pronoun (e.g., "it", "them") */
    wasPronoun?: boolean;
}
/**
 * Preposition phrase structure
 */
export interface IPrepPhrase {
    /** Indices into token array */
    tokens: number[];
    /** Preposition text */
    text: string;
}
/**
 * Result of parsing phase - rich structure with all information preserved
 */
export interface IParsedCommand {
    /** Raw input text exactly as typed */
    rawInput: string;
    /** All tokens with position and classification */
    tokens: IToken[];
    /** Structured command components */
    structure: {
        /** Verb phrase */
        verb: IVerbPhrase;
        /** Direct object noun phrase */
        directObject?: INounPhrase;
        /** Preposition phrase */
        preposition?: IPrepPhrase;
        /** Indirect object noun phrase */
        indirectObject?: INounPhrase;
    };
    /** Which grammar pattern matched (e.g., "VERB_NOUN_PREP_NOUN") */
    pattern: string;
    /** Parser confidence in this interpretation */
    confidence: number;
    /** Identified action (for compatibility) */
    action: string;
    /** Additional parsed elements */
    extras?: Record<string, any>;
    /** Raw text slot values (for patterns with .text() slots or :slot... syntax) */
    textSlots?: Map<string, string>;
    /** Excluded noun phrases for "all but X" patterns */
    excluded?: INounPhrase[];
    /** Instrument noun phrase for "with/through/using" clauses */
    instrument?: INounPhrase;
    /** Typed slot values for non-entity slots (number, ordinal, direction, etc.) */
    typedSlots?: Map<string, import('@sharpee/if-domain').TypedSlotValue>;
    /** Vocabulary slot matches (from .fromVocabulary() patterns) */
    vocabularySlots?: Map<string, import('@sharpee/if-domain').GrammarVocabularyMatch>;
    /** Matched manner adverb (from .manner() patterns) - feeds intention.manner */
    manner?: string;
}
/**
 * Parse error codes
 *
 * Error hierarchy (most specific to least):
 * - NO_VERB: Empty or no verb detected
 * - UNKNOWN_VERB: First word isn't a known verb
 * - MISSING_OBJECT: Verb needs a direct object
 * - MISSING_INDIRECT: Verb needs an indirect object (where/what)
 * - ENTITY_NOT_FOUND: Object name not recognized
 * - SCOPE_VIOLATION: Object exists but can't be accessed
 * - AMBIGUOUS_INPUT: Multiple valid interpretations
 * - UNKNOWN_COMMAND: Generic fallback (legacy)
 * - INVALID_SYNTAX: Generic fallback (legacy)
 */
export type ParseErrorCode = 'NO_VERB' | 'UNKNOWN_VERB' | 'MISSING_OBJECT' | 'MISSING_INDIRECT' | 'ENTITY_NOT_FOUND' | 'SCOPE_VIOLATION' | 'AMBIGUOUS_INPUT' | 'UNKNOWN_COMMAND' | 'INVALID_SYNTAX';
/**
 * Errors that can occur during parsing
 */
export interface IParseError {
    type: 'PARSE_ERROR';
    code: ParseErrorCode;
    /** Message ID for lang layer lookup (e.g., 'parser.error.unknownVerb') */
    messageId: string;
    /** Fallback message if lang layer lookup fails */
    message: string;
    /** Original input */
    input: string;
    /** Character position of error (if applicable) */
    position?: number;
    /** Recognized verb (if any) */
    verb?: string;
    /** The word that failed (for ENTITY_NOT_FOUND, UNKNOWN_VERB) */
    failedWord?: string;
    /** Which slot failed (directObject, indirectObject) */
    slot?: string;
    /** Suggestion for correction */
    suggestion?: string;
    /** For AMBIGUOUS_INPUT: the candidates */
    candidates?: Array<{
        entityId: string;
        label: string;
    }>;
}
```

### commands/validated-command

```typescript
/**
 * Command types for the validation phase
 * These types represent fully resolved and validated commands
 * with entities and action IDs identified
 */
import type { IParsedObjectReference, IParsedCommand } from './parsed-command';
import type { IFEntity } from '../entities/if-entity';
/**
 * Resolved entity reference after validation
 */
export interface IValidatedObjectReference {
    /** The resolved entity */
    entity: IFEntity;
    /** Original parsed reference */
    parsed: IParsedObjectReference;
}
/**
 * Result of validation phase - fully resolved and checked
 */
export interface IValidatedCommand {
    /** Original parsed command */
    parsed: IParsedCommand;
    /** ID of the action that will handle this command */
    actionId: string;
    /** Resolved direct object if present */
    directObject?: IValidatedObjectReference;
    /** Resolved indirect object if present */
    indirectObject?: IValidatedObjectReference;
    /**
     * Resolved instrument if present (ADR-080)
     * For patterns using .instrument() to mark a slot as a tool/weapon
     * e.g., "attack troll with sword" where sword is the instrument
     */
    instrument?: IValidatedObjectReference;
    /** Validation metadata */
    metadata?: {
        /** Time taken to validate */
        validationTime?: number;
        /** Any warnings during validation */
        warnings?: string[];
    };
}
/**
 * Errors that can occur during validation
 */
export interface IValidationError {
    type: 'VALIDATION_ERROR';
    code: 'ENTITY_NOT_FOUND' | 'ENTITY_NOT_VISIBLE' | 'ACTION_NOT_AVAILABLE' | 'PRECONDITION_FAILED' | 'AMBIGUOUS_ENTITY';
    parsed: IParsedCommand;
    details?: Record<string, any>;
}
```

### commands/command-types

```typescript
/**
 * Command processing error types and result types
 */
import type { IParseError } from './parsed-command';
import type { IValidationError, IValidatedCommand } from './validated-command';
/**
 * Errors that can occur during execution
 */
export interface IExecutionError {
    type: 'EXECUTION_ERROR';
    code: 'HANDLER_ERROR' | 'EVENT_GENERATION_FAILED' | 'STATE_CORRUPTION';
    message: string;
    validated: IValidatedCommand;
    error?: Error;
}
/**
 * Union type for all command processing errors
 */
export type CommandError = IParseError | IValidationError | IExecutionError;
/**
 * Result type for command processing phases
 */
export type CommandResult<T, E = CommandError> = {
    success: true;
    value: T;
} | {
    success: false;
    error: E;
};
```

### interfaces/parser

```typescript
/**
 * Parser interface for converting text input to parsed commands
 */
import type { IParsedCommand, IParseError, CommandResult } from '../commands';
/**
 * Parser interface - pure syntax, no world knowledge
 */
export interface IParser {
    /**
     * Parse input text into structured command
     * @param input Raw text input
     * @returns Parsed command or parse error
     */
    parse(input: string): CommandResult<IParsedCommand, IParseError>;
}
```

### interfaces/command-validator

```typescript
/**
 * Command validator interface for resolving entities and checking preconditions
 */
import type { IParsedCommand, IValidatedCommand, IValidationError } from '../commands';
import type { Result } from '@sharpee/core';
/**
 * Validator interface - resolves entities and checks preconditions
 */
export interface ICommandValidator {
    /**
     * Validate parsed command against world state
     * @param command Parsed command to validate
     * @returns Validated command or validation error
     */
    validate(command: IParsedCommand): Result<IValidatedCommand, IValidationError>;
}
```

### interfaces/command-executor

```typescript
/**
 * Command executor interface for executing validated commands
 */
import type { ISemanticEvent } from '@sharpee/core';
import type { IValidatedCommand, IExecutionError, CommandResult } from '../commands';
/**
 * Executor interface - applies business logic
 */
export interface ICommandExecutor {
    /**
     * Execute validated command
     * @param command Validated command to execute
     * @returns Generated events or execution error
     */
    execute(command: IValidatedCommand): CommandResult<ISemanticEvent[], IExecutionError>;
}
```

### interfaces/command-processor

```typescript
/**
 * Command processor interface for the complete command pipeline
 */
import type { ISemanticEvent } from '@sharpee/core';
import type { CommandError, CommandResult } from '../commands';
/**
 * Combined command processor using all three phases
 */
export interface ICommandProcessor {
    /**
     * Process raw input through all phases
     * @param input Raw text input
     * @returns Generated events or appropriate error
     */
    process(input: string): Promise<CommandResult<ISemanticEvent[], CommandError>>;
}
```

### traits/trait

```typescript
/**
 * Base trait types and utilities
 *
 * Traits are pure data structures with no behavior.
 * All logic belongs in behaviors.
 */
import { TraitType } from './trait-types';
/**
 * Base trait interface - just type identification
 */
export interface ITrait {
    readonly type: TraitType | string;
}
/**
 * Trait constructor type for registry
 */
export interface ITraitConstructor<T extends ITrait = ITrait> {
    new (data?: any): T;
    readonly type: TraitType | string;
    /** Action IDs this trait handles via capability dispatch (ADR-090) */
    readonly capabilities?: readonly string[];
    /** Action IDs this trait intercepts via interceptor hooks (ADR-118) */
    readonly interceptors?: readonly string[];
}
/**
 * Type guard to check if an object is a trait
 */
export declare function isTrait(obj: any): obj is ITrait;
/**
 * Helper type to extract trait data type from a trait class
 */
export type TraitData<T extends ITrait> = Omit<T, keyof ITrait>;
/**
 * Registry for trait constructors (optional use)
 */
export declare class TraitRegistry {
    private static traits;
    static register(trait: ITraitConstructor): void;
    static get(type: string): ITraitConstructor | undefined;
    static has(type: string): boolean;
    static clear(): void;
    static getAll(): Map<string, ITraitConstructor>;
}
```

### traits/trait-types

```typescript
/**
 * Centralized trait type definitions
 *
 * All trait types used in the world model system
 */
/**
 * Trait types as a const object for extensibility
 */
export declare const TraitType: {
    readonly IDENTITY: "identity";
    readonly CONTAINER: "container";
    readonly SUPPORTER: "supporter";
    readonly ROOM: "room";
    readonly WEARABLE: "wearable";
    readonly CLOTHING: "clothing";
    readonly EDIBLE: "edible";
    readonly SCENERY: "scenery";
    readonly OPENABLE: "openable";
    readonly LOCKABLE: "lockable";
    readonly SWITCHABLE: "switchable";
    readonly READABLE: "readable";
    readonly LIGHT_SOURCE: "lightSource";
    readonly PULLABLE: "pullable";
    readonly ATTACHED: "attached";
    readonly PUSHABLE: "pushable";
    readonly BUTTON: "button";
    readonly MOVEABLE_SCENERY: "moveableScenery";
    readonly DOOR: "door";
    readonly CLIMBABLE: "climbable";
    readonly ACTOR: "actor";
    readonly EXIT: "exit";
    readonly WEAPON: "weapon";
    readonly BREAKABLE: "breakable";
    readonly DESTRUCTIBLE: "destructible";
    readonly COMBATANT: "combatant";
    readonly EQUIPPED: "equipped";
    readonly NPC: "npc";
    readonly OPEN_INVENTORY: "openInventory";
    readonly VEHICLE: "vehicle";
    readonly ENTERABLE: "enterable";
    readonly STORY_INFO: "storyInfo";
};
/**
 * Type for trait type values
 */
export type TraitType = typeof TraitType[keyof typeof TraitType];
/**
 * Trait categories for organization
 */
export declare const TraitCategory: {
    readonly STANDARD: "standard";
    readonly INTERACTIVE: "interactive";
    readonly ADVANCED: "advanced";
};
/**
 * Type for trait category values
 */
export type TraitCategory = typeof TraitCategory[keyof typeof TraitCategory];
/**
 * Map trait types to categories
 */
export declare const TRAIT_CATEGORIES: Record<TraitType, TraitCategory>;
/**
 * Helper to check if a trait type exists
 */
export declare function isValidTraitType(type: string): type is TraitType;
/**
 * Get trait category
 */
export declare function getTraitCategory(type: TraitType): TraitCategory;
/**
 * Get all trait types in a category
 */
export declare function getTraitsByCategory(category: TraitCategory): TraitType[];
/**
 * Get all trait types
 */
export declare function getAllTraitTypes(): TraitType[];
/**
 * Add a new trait type at runtime (for extensions)
 */
export declare function registerTraitType(name: string, value: string, category?: TraitCategory): void;
```

### traits/implementations

```typescript
/**
 * Trait implementations map
 *
 * Maps trait types to their implementation classes
 */
import { TraitType } from './trait-types';
import { ITraitConstructor } from './trait';
import { IdentityTrait } from './identity/identityTrait';
import { ContainerTrait } from './container/containerTrait';
import { SupporterTrait } from './supporter/supporterTrait';
import { RoomTrait } from './room/roomTrait';
import { WearableTrait } from './wearable/wearableTrait';
import { ClothingTrait } from './clothing/clothingTrait';
import { EdibleTrait } from './edible/edibleTrait';
import { SceneryTrait } from './scenery/sceneryTrait';
import { OpenableTrait } from './openable/openableTrait';
import { LockableTrait } from './lockable/lockableTrait';
import { SwitchableTrait } from './switchable/switchableTrait';
import { ReadableTrait } from './readable/readableTrait';
import { LightSourceTrait } from './light-source/lightSourceTrait';
import { DoorTrait } from './door/doorTrait';
import { ClimbableTrait } from './climbable/climbableTrait';
import { ActorTrait } from './actor/actorTrait';
import { ExitTrait } from './exit/exitTrait';
import { PullableTrait } from './pullable/pullableTrait';
import { AttachedTrait } from './attached/attachedTrait';
import { PushableTrait } from './pushable/pushableTrait';
import { ButtonTrait } from './button/buttonTrait';
import { MoveableSceneryTrait } from './moveable-scenery/moveableSceneryTrait';
import { WeaponTrait } from './weapon/weaponTrait';
import { BreakableTrait } from './breakable/breakableTrait';
import { DestructibleTrait } from './destructible/destructibleTrait';
import { CombatantTrait } from './combatant/combatantTrait';
import { EquippedTrait } from './equipped/equippedTrait';
import { NpcTrait } from './npc/npcTrait';
import { OpenInventoryTrait } from './open-inventory/openInventoryTrait';
import { VehicleTrait } from './vehicle/vehicleTrait';
import { EnterableTrait } from './enterable/enterableTrait';
import { StoryInfoTrait } from './story-info/storyInfoTrait';
/**
 * Map of trait types to their constructors
 */
export declare const TRAIT_IMPLEMENTATIONS: Record<TraitType, ITraitConstructor>;
/**
 * Get trait implementation by type
 */
export declare function getTraitImplementation(type: TraitType): ITraitConstructor | undefined;
/**
 * Create trait instance by type
 */
export declare function createTrait(type: TraitType, data?: any): InstanceType<ITraitConstructor>;
export { IdentityTrait, ContainerTrait, SupporterTrait, RoomTrait, WearableTrait, ClothingTrait, EdibleTrait, SceneryTrait, OpenableTrait, LockableTrait, SwitchableTrait, ReadableTrait, LightSourceTrait, DoorTrait, ActorTrait, ExitTrait, ClimbableTrait, PullableTrait, AttachedTrait, PushableTrait, ButtonTrait, MoveableSceneryTrait, WeaponTrait, BreakableTrait, DestructibleTrait, CombatantTrait, EquippedTrait, NpcTrait, OpenInventoryTrait, VehicleTrait, EnterableTrait, StoryInfoTrait };
```

### traits/identity/identityTrait

```typescript
import { ITrait } from '../trait';
/**
 * Identity trait provides basic naming and description for entities.
 * This is one of the most fundamental traits in IF.
 *
 * This is a pure data structure - all validation and logic
 * should be handled by IdentityBehavior.
 */
export declare class IdentityTrait implements ITrait {
    static readonly type: "identity";
    readonly type: "identity";
    /** Primary name of the entity */
    name: string;
    /** Full description shown when examining */
    description: string;
    /**
     * Message ID for localized name (ADR-107).
     * If set, the language layer resolves this ID to the actual name text.
     * Takes precedence over literal `name` if both are set.
     */
    nameId?: string;
    /**
     * Message ID for localized description (ADR-107).
     * If set, the language layer resolves this ID to the actual description text.
     * Takes precedence over literal `description` if both are set.
     */
    descriptionId?: string;
    /** Alternative names/aliases the entity can be referred to by */
    aliases: string[];
    /** Brief description shown in room listings */
    brief?: string;
    /** Whether the entity has a proper name (like "John" vs "a man") */
    properName: boolean;
    /** Article to use with the name ("a", "an", "the", "some", or empty for proper names) */
    article: string;
    /** Whether this entity is concealed from normal view */
    concealed: boolean;
    /** Weight of the object (undefined = negligible/not tracked) */
    weight?: number;
    /** Volume of the object (undefined = negligible/not tracked) */
    volume?: number;
    /** Size category of the object */
    size?: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
    /**
     * Grammatical number for inanimate objects (ADR-089).
     * - 'singular': "it" (default) - "take it", "the lamp"
     * - 'plural': "them" - "take them", "the coins"
     * Only used for entities WITHOUT ActorTrait.
     */
    grammaticalNumber?: 'singular' | 'plural';
    /**
     * Adjectives that can be used to refer to this entity (ADR-093).
     * Used for disambiguation when multiple entities share a noun.
     * Example: ['yellow'] for "yellow button" vs ['red'] for "red button"
     */
    adjectives: string[];
    /**
     * Noun type for article/formatter selection (ADR-095).
     * - 'common': Regular countable noun (a sword, the sword)
     * - 'proper': Proper name (John, not "a John")
     * - 'mass': Uncountable noun (water, not "a water" - use "some water")
     * - 'unique': One-of-a-kind (the sun, not "a sun")
     * - 'plural': Inherently plural (scissors, pants)
     *
     * If not set, formatters use `properName` and `grammaticalNumber` as fallback.
     */
    nounType?: 'common' | 'proper' | 'mass' | 'unique' | 'plural';
    /**
     * Points awarded when player first takes this item (ADR-129).
     * Stdlib taking action calls world.awardScore() with this value.
     * Deduplication is automatic via entity ID.
     */
    points?: number;
    /**
     * Description for the score ledger entry (ADR-129).
     * Defaults to the entity name if not set.
     */
    pointsDescription?: string;
    constructor(data?: Partial<IdentityTrait>);
}
```

### traits/identity/identityBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
/**
 * Behavior for entities with identity.
 *
 * Handles name formatting, visibility, and validation of identity data.
 */
export declare class IdentityBehavior extends Behavior {
    static requiredTraits: "identity"[];
    /**
     * Check if identity data is valid for game use
     * @throws Error if identity data is invalid
     */
    static validateIdentity(entity: IFEntity): void;
    /**
     * Format an entity's name for display with proper article
     */
    static formatName(entity: IFEntity, options?: {
        capitalize?: boolean;
        definite?: boolean;
    }): string;
    /**
     * Get a possessive form of the entity's name
     */
    static getPossessiveName(entity: IFEntity): string;
    /**
     * Check if a given name matches this entity
     */
    static matchesName(entity: IFEntity, name: string): boolean;
    /**
     * Check if an entity should be visible in normal circumstances
     */
    static isConcealed(entity: IFEntity): boolean;
    /**
     * Set whether an entity is concealed
     */
    static setConcealed(entity: IFEntity, concealed: boolean): void;
    /**
     * Reveal a concealed entity (convenience method)
     */
    static reveal(entity: IFEntity): void;
    /**
     * Conceal an entity (convenience method)
     */
    static conceal(entity: IFEntity): void;
    /**
     * Get the weight of the entity (not including contents)
     */
    static getWeight(entity: IFEntity): number;
    /**
     * Get the volume of the entity
     */
    static getVolume(entity: IFEntity): number;
    /**
     * Get the size category of the entity
     */
    static getSize(entity: IFEntity): 'tiny' | 'small' | 'medium' | 'large' | 'huge' | undefined;
    /**
     * Get total weight including contents (for containers/supporters)
     * Note: This method needs a world context to access contents
     */
    static getTotalWeight(entity: IFEntity, getContents?: (entityId: string) => IFEntity[]): number;
}
```

### traits/container/containerTrait

```typescript
import { ITrait } from '../trait';
/**
 * Container trait allows entities to hold other entities inside them.
 *
 * This is a pure data structure - all validation and logic
 * should be handled by ContainerBehavior.
 */
export declare class ContainerTrait implements ITrait {
    static readonly type: "container";
    readonly type: "container";
    /** Capacity constraints for the container */
    capacity?: {
        /** Maximum total weight the container can hold (in kg) */
        maxWeight?: number;
        /** Maximum total volume the container can hold (in liters) */
        maxVolume?: number;
        /** Maximum number of items the container can hold */
        maxItems?: number;
    };
    /** Whether contents are visible when the container is closed */
    isTransparent: boolean;
    /** Whether actors can enter this container */
    enterable: boolean;
    /** Only these entity types can be placed in the container */
    allowedTypes?: string[];
    /** These entity types cannot be placed in the container */
    excludedTypes?: string[];
    /** Whether this container holds a liquid */
    containsLiquid?: boolean;
    /** Type of liquid in the container (e.g., 'water', 'ale') */
    liquidType?: string;
    /** Amount of liquid remaining (arbitrary units) */
    liquidAmount?: number;
    constructor(data?: Partial<ContainerTrait>);
}
```

### traits/container/container-utils

```typescript
import { ITrait } from '../trait';
import { IFEntity } from '../../entities/if-entity';
/**
 * Interface for traits that provide container functionality.
 * This includes ContainerTrait, RoomTrait, and ActorTrait.
 */
export interface IContainerCapable extends ITrait {
    /** Capacity constraints */
    capacity?: {
        maxWeight?: number;
        maxVolume?: number;
        maxItems?: number;
    };
    /** Whether contents are visible when the container is closed */
    isTransparent: boolean;
    /** Whether actors can enter this container */
    enterable: boolean;
    /** Only these entity types can be placed in the container */
    allowedTypes?: string[];
    /** These entity types cannot be placed in the container */
    excludedTypes?: string[];
}
/**
 * Check if a trait provides container functionality
 */
export declare function isContainerCapable(trait: ITrait): trait is IContainerCapable;
/**
 * Check if an entity can contain other entities
 */
export declare function canContain(entity: IFEntity): boolean;
/**
 * Get the container trait from an entity, regardless of which trait provides it
 */
export declare function getContainerTrait(entity: IFEntity): IContainerCapable | undefined;
/**
 * Type guard to check if a trait has container properties
 */
export declare function hasContainerProperties(trait: any): trait is IContainerCapable;
```

### traits/room/roomTrait

```typescript
import { ITrait } from '../trait';
import { DirectionType } from '../../constants/directions';
/**
 * Map position hint for an exit (ADR-113).
 * Overrides direction-based positioning in the auto-mapper.
 */
export interface IExitMapHint {
    /** Grid offset X (-1 = west, +1 = east) */
    dx?: number;
    /** Grid offset Y (-1 = north, +1 = south) */
    dy?: number;
    /** Grid offset Z (-1 = down, +1 = up) */
    dz?: number;
}
export interface IExitInfo {
    /** The destination room ID (must be an entity ID, not a name) */
    destination: string;
    /** Optional door/portal entity ID that must be traversed (must be an entity ID, not a name) */
    via?: string;
    /** Optional map positioning hint (ADR-113) */
    mapHint?: IExitMapHint;
}
export interface IRoomData {
    /** Whether this room has been visited by the player */
    visited?: boolean;
    /** Exits from this room */
    exits?: Partial<Record<DirectionType, IExitInfo>>;
    /** Custom messages for blocked exits */
    blockedExits?: Partial<Record<DirectionType, string>>;
    /** Whether this is an outdoor location */
    outdoor?: boolean;
    /** Whether this room is dark (requires light source to see) */
    isDark?: boolean;
    /** Whether this room is affected by time of day (for outdoor locations) */
    isOutdoors?: boolean;
    /** Whether this room is underground (never has natural light) */
    isUnderground?: boolean;
    /** Initial description (shown on first visit) */
    initialDescription?: string;
    /**
     * Message ID for localized initial description (ADR-107).
     * If set, takes precedence over literal `initialDescription`.
     */
    initialDescriptionId?: string;
    /** Ambient sound description */
    ambientSound?: string;
    /** Ambient smell description */
    ambientSmell?: string;
    /** Region or area this room belongs to */
    region?: string;
    /** Tags for categorizing rooms */
    tags?: string[];
    /** Capacity constraints for the room (optional) */
    capacity?: {
        /** Maximum total weight the room can hold (in kg) */
        maxWeight?: number;
        /** Maximum total volume the room can hold (in liters) */
        maxVolume?: number;
        /** Maximum number of items the room can hold */
        maxItems?: number;
    };
    /** Only these entity types can be placed in the room */
    allowedTypes?: string[];
    /** These entity types cannot be placed in the room */
    excludedTypes?: string[];
}
/**
 * Room trait marks an entity as a location/room in the game world.
 * Rooms are special entities that represent locations and can contain other entities.
 *
 * Rooms inherently have container functionality - they can hold items, actors, and other entities.
 * The actual containment relationships are stored in the SpatialIndex, not in the trait itself.
 */
export declare class RoomTrait implements ITrait, IRoomData {
    static readonly type: "room";
    readonly type: "room";
    visited: boolean;
    exits: Partial<Record<DirectionType, IExitInfo>>;
    blockedExits?: Partial<Record<DirectionType, string>>;
    outdoor: boolean;
    isDark: boolean;
    isOutdoors: boolean;
    isUnderground: boolean;
    initialDescription?: string;
    initialDescriptionId?: string;
    ambientSound?: string;
    ambientSmell?: string;
    region?: string;
    tags: string[];
    capacity?: {
        maxWeight?: number;
        maxVolume?: number;
        maxItems?: number;
    };
    allowedTypes?: string[];
    excludedTypes?: string[];
    readonly isTransparent: boolean;
    readonly enterable: boolean;
    constructor(data?: IRoomData);
}
```

### traits/room/roomBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { IExitInfo } from './roomTrait';
import { ISemanticEvent } from '@sharpee/core';
import { DirectionType } from '../../constants/directions';
/**
 * Behavior for room entities.
 *
 * Handles the logic for rooms including exits, lighting, and visits.
 * All methods are pure and only operate on the given room entity.
 */
export declare class RoomBehavior extends Behavior {
    static requiredTraits: "room"[];
    /**
     * Get the exit in a given direction
     */
    static getExit(room: IFEntity, direction: DirectionType): IExitInfo | null;
    /**
     * Check if an exit exists in a direction
     */
    static hasExit(room: IFEntity, direction: DirectionType): boolean;
    /**
     * Check if an exit is blocked
     */
    static isExitBlocked(room: IFEntity, direction: DirectionType): boolean;
    /**
     * Get blocked exit message
     */
    static getBlockedMessage(room: IFEntity, direction: DirectionType): string | undefined;
    /**
     * Add or update an exit in this room
     */
    static setExit(room: IFEntity, direction: DirectionType, destination: string, via?: string): void;
    /**
     * Block an exit with a message
     */
    static blockExit(room: IFEntity, direction: DirectionType, message: string): ISemanticEvent[];
    /**
     * Unblock an exit
     */
    static unblockExit(room: IFEntity, direction: DirectionType): ISemanticEvent[];
    /**
     * Remove an exit from this room
     */
    static removeExit(room: IFEntity, direction: DirectionType): void;
    /**
     * Mark room as visited
     */
    static markVisited(room: IFEntity, actor: IFEntity): ISemanticEvent[];
    /**
     * Check if room has been visited
     */
    static hasBeenVisited(room: IFEntity): boolean;
    /**
     * Get all exits from the room
     */
    static getAllExits(room: IFEntity): Map<DirectionType, IExitInfo>;
    /**
     * Get available (non-blocked) exits
     */
    static getAvailableExits(room: IFEntity): Map<DirectionType, IExitInfo>;
    /**
     * Check if room is outdoors
     */
    static isOutdoors(room: IFEntity): boolean;
    /**
     * Check if room is underground
     */
    static isUnderground(room: IFEntity): boolean;
    /**
     * Get room region
     */
    static getRegion(room: IFEntity): string | undefined;
    /**
     * Check if room has a specific tag
     */
    static hasTag(room: IFEntity, tag: string): boolean;
    /**
     * Add a tag to the room
     */
    static addTag(room: IFEntity, tag: string): void;
    /**
     * Remove a tag from the room
     */
    static removeTag(room: IFEntity, tag: string): void;
}
```

### traits/openable/openableTrait

```typescript
import { ITrait } from '../trait';
export interface IOpenableData {
    /** Whether the entity is currently open */
    isOpen?: boolean;
    /** Whether the entity starts open */
    startsOpen?: boolean;
    /** Custom message when opening */
    openMessage?: string;
    /** Custom message when closing */
    closeMessage?: string;
    /** Custom message when already open */
    alreadyOpenMessage?: string;
    /** Custom message when already closed */
    alreadyClosedMessage?: string;
    /** Whether opening reveals contents (for containers) */
    revealsContents?: boolean;
    /** Whether this can be closed once opened */
    canClose?: boolean;
    /** Sound made when opening */
    openSound?: string;
    /** Sound made when closing */
    closeSound?: string;
    /** Description when open (used by computed description getter on IFEntity) */
    openDescription?: string;
    /** Description when closed (used by computed description getter on IFEntity) */
    closedDescription?: string;
}
/**
 * Openable trait for entities that can be opened and closed.
 * Used for doors, containers, books, etc.
 *
 * This trait contains only data - all logic for opening/closing
 * is in OpenableBehavior.
 */
export declare class OpenableTrait implements ITrait, IOpenableData {
    static readonly type: "openable";
    readonly type: "openable";
    isOpen: boolean;
    startsOpen: boolean;
    openMessage?: string;
    closeMessage?: string;
    alreadyOpenMessage?: string;
    alreadyClosedMessage?: string;
    revealsContents: boolean;
    canClose: boolean;
    openSound?: string;
    closeSound?: string;
    openDescription?: string;
    closedDescription?: string;
    constructor(data?: IOpenableData);
}
```

### traits/lockable/lockableTrait

```typescript
import { EntityId } from '@sharpee/core';
import { ITrait } from '../trait';
export interface ILockableData {
    /** Whether the entity is currently locked */
    isLocked?: boolean;
    /** Whether the entity starts locked */
    startsLocked?: boolean;
    /** ID of the key entity that unlocks this */
    keyId?: EntityId;
    /** Multiple keys that can unlock this */
    keyIds?: EntityId[];
    /** Whether any key can unlock (master key support) */
    acceptsMasterKey?: boolean;
    /** Custom message when locking */
    lockMessage?: string;
    /** Custom message when unlocking */
    unlockMessage?: string;
    /** Custom message when already locked */
    alreadyLockedMessage?: string;
    /** Custom message when already unlocked */
    alreadyUnlockedMessage?: string;
    /** Custom message when trying to open while locked */
    lockedMessage?: string;
    /** Custom message when wrong key is used */
    wrongKeyMessage?: string;
    /** Whether this automatically locks when closed */
    autoLock?: boolean;
    /** Sound made when locking */
    lockSound?: string;
    /** Sound made when unlocking */
    unlockSound?: string;
}
/**
 * Lockable trait for entities that can be locked and unlocked.
 * Usually combined with OpenableTrait.
 *
 * This trait contains only data - all locking/unlocking logic
 * is in LockableBehavior.
 */
export declare class LockableTrait implements ITrait, ILockableData {
    static readonly type: "lockable";
    readonly type: "lockable";
    isLocked: boolean;
    startsLocked: boolean;
    keyId?: EntityId;
    keyIds?: EntityId[];
    acceptsMasterKey: boolean;
    lockMessage?: string;
    unlockMessage?: string;
    alreadyLockedMessage?: string;
    alreadyUnlockedMessage?: string;
    lockedMessage?: string;
    wrongKeyMessage?: string;
    autoLock: boolean;
    lockSound?: string;
    unlockSound?: string;
    constructor(data?: ILockableData);
}
```

### traits/readable/readableTrait

```typescript
import { ITrait } from '../trait';
/**
 * Readable trait for entities that have text to read.
 * Used for books, signs, notes, inscriptions, etc.
 *
 * This trait contains only data - all behavior is in ReadableBehavior.
 */
export declare class ReadableTrait implements ITrait {
    static readonly type: "readable";
    readonly type: "readable";
    /** The main text content */
    text: string;
    /** Short preview shown in descriptions */
    preview?: string;
    /** Whether the text is currently visible */
    isReadable: boolean;
    /** Language of the text (for multi-language games) */
    language: string;
    /** Whether reading requires a specific skill or item */
    requiresAbility: boolean;
    /** Ability/item needed to read (if requiresAbility) */
    requiredAbility?: string;
    /** Message when unable to read */
    cannotReadMessage?: string;
    /** Whether this has been read by the player */
    hasBeenRead: boolean;
    /** Type of readable (book, sign, note, inscription, etc.) */
    readableType: string;
    /** Number of pages (for books) */
    pages?: number;
    /** Current page (for multi-page items) */
    currentPage?: number;
    /** Content per page (for multi-page items) */
    pageContent?: string[];
    constructor(data?: Partial<ReadableTrait>);
}
```

### traits/light-source/lightSourceTrait

```typescript
import { ITrait } from '../trait';
/**
 * LightSource trait allows entities to provide illumination.
 *
 * This is a pure data structure - all validation and logic
 * should be handled by LightSourceBehavior.
 */
export declare class LightSourceTrait implements ITrait {
    static readonly type: "lightSource";
    readonly type: "lightSource";
    /** Light output level (1-10) */
    brightness: number;
    /**
     * Whether the light is currently providing illumination.
     * - true: explicitly lit
     * - false: explicitly not lit
     * - undefined: use switchable state or default to lit
     */
    isLit?: boolean;
    /** Optional fuel/battery remaining (undefined = infinite) */
    fuelRemaining?: number;
    /** Maximum fuel capacity (for refillable lights) */
    maxFuel?: number;
    /** Fuel consumption rate per turn (when lit) */
    fuelConsumptionRate?: number;
    /** Description when lit (used by computed description getter on IFEntity) */
    litDescription?: string;
    /** Description when unlit (used by computed description getter on IFEntity) */
    unlitDescription?: string;
    constructor(data?: Partial<LightSourceTrait>);
}
```

### traits/exit/exitTrait

```typescript
import { ITrait } from '../trait';
/**
 * Exit trait for entities that represent passages between locations.
 * Used for doors, passages, portals, and any custom exits like "xyzzy".
 *
 * This trait contains only data - all behavior is in ExitBehavior.
 */
export declare class ExitTrait implements ITrait {
    static readonly type: "exit";
    readonly type: "exit";
    /** Source location ID (must be an entity ID, not a name) */
    from: string;
    /** Destination location ID (must be an entity ID, not a name) */
    to: string;
    /** Standard direction (north, south, up, etc.) - optional */
    direction?: string;
    /** Command to use this exit (e.g., "go north", "enter portal", "xyzzy") */
    command: string;
    /** Alternative commands that work for this exit */
    aliases?: string[];
    /** Whether this exit is visible to players */
    visible: boolean;
    /** Whether this exit appears in room descriptions */
    listed: boolean;
    /** Whether this exit works in reverse (bidirectional) */
    bidirectional: boolean;
    /** The reverse command if bidirectional */
    reverseCommand?: string;
    /** The reverse direction if bidirectional */
    reverseDirection?: string;
    /** Custom message when using this exit */
    useMessage?: string;
    /** Custom message when this exit is blocked */
    blockedMessage?: string;
    /** Whether this exit requires special conditions */
    conditional: boolean;
    /** Condition identifier (checked by behaviors) */
    conditionId?: string;
    constructor(data: Partial<ExitTrait>);
}
```

### traits/climbable/climbableTrait

```typescript
/**
 * Trait for objects that can be climbed (ladders, trees, mountains, etc.)
 */
import { ITrait } from '../trait';
/**
 * Trait for climbable objects
 */
export declare class ClimbableTrait implements ITrait {
    static readonly type: "climbable";
    readonly type: "climbable";
    /** Whether the object can currently be climbed */
    canClimb: boolean;
    /** Optional message when climbing is blocked */
    blockedMessage?: string;
    /** Direction of climbing (up, down, or both) */
    direction?: 'up' | 'down' | 'both';
    /** Destination entity ID when climbing (e.g., top of tree, other side of fence) */
    destination?: string;
    /** Message shown when successfully climbing */
    successMessage?: string;
    constructor(options?: Partial<Omit<ClimbableTrait, 'type'>>);
}
/**
 * Type guard for ClimbableTrait
 */
export declare function isClimbableTrait(trait: ITrait): trait is ClimbableTrait;
/**
 * Factory function for creating ClimbableTrait
 */
export declare function createClimbableTrait(options?: Partial<Omit<ClimbableTrait, 'type'>>): ClimbableTrait;
```

### traits/scenery/sceneryTrait

```typescript
import { ITrait } from '../trait';
/**
 * Scenery trait marks items as fixed in place and not takeable.
 *
 * In IF conventions, objects are takeable by default unless they have
 * this trait. This replaces the need for a separate "portable" trait.
 *
 * This trait contains only data - all behavior is in SceneryBehavior.
 */
export declare class SceneryTrait implements ITrait {
    static readonly type: "scenery";
    readonly type: "scenery";
    /**
     * Custom message when trying to take this item.
     * If not provided, a default message will be used.
     */
    cantTakeMessage?: string;
    /**
     * Whether this scenery is mentioned in room descriptions.
     * If false, the item won't be listed but can still be examined.
     */
    mentioned: boolean;
    /**
     * Whether this scenery is visible.
     * If false, the item is hidden from view and queries unless explicitly requested.
     */
    visible: boolean;
    constructor(data?: Partial<SceneryTrait>);
}
```

### traits/supporter/supporterTrait

```typescript
import { ITrait } from '../trait';
/**
 * Supporter trait allows entities to have other entities placed on top of them.
 *
 * This is a pure data structure - all validation and logic
 * should be handled by SupporterBehavior.
 */
export declare class SupporterTrait implements ITrait {
    static readonly type: "supporter";
    readonly type: "supporter";
    /** Capacity constraints for the supporter */
    capacity?: {
        /** Maximum total weight the supporter can hold (in kg) */
        maxWeight?: number;
        /** Maximum number of items that can be placed on the supporter */
        maxItems?: number;
    };
    /** Whether actors can sit/stand/lie on this supporter */
    enterable?: boolean;
    /** Only these entity types can be placed on the supporter */
    allowedTypes?: string[];
    /** These entity types cannot be placed on the supporter */
    excludedTypes?: string[];
    constructor(data?: Partial<SupporterTrait>);
}
```

### traits/supporter/supporterBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { IWorldQuery } from '../container/containerBehavior';
/**
 * Result of adding an item to a supporter
 */
export interface IAddItemToSupporterResult {
    success: boolean;
    stateChanged: boolean;
    alreadyThere?: boolean;
    noSpace?: boolean;
    wrongType?: boolean;
}
/**
 * Result of removing an item from a supporter
 */
export interface IRemoveItemFromSupporterResult {
    success: boolean;
    stateChanged: boolean;
    notThere?: boolean;
}
/**
 * Behavior for entities that can support other entities on their surface.
 *
 * Handles capacity checks, type restrictions, and weight calculations.
 */
export declare class SupporterBehavior extends Behavior {
    static requiredTraits: "supporter"[];
    /**
     * Check if a supporter can accept an item
     * @returns true if the item can be accepted
     */
    static canAccept(supporter: IFEntity, item: IFEntity, world: IWorldQuery): boolean;
    /**
     * Check capacity constraints
     */
    static checkCapacity(supporter: IFEntity, item: IFEntity, world: IWorldQuery): boolean;
    /**
     * Get total weight on supporter
     * For supporters, we count the total weight of all items including their contents
     */
    static getTotalWeight(supporter: IFEntity, world: IWorldQuery): number;
    /**
     * Get total weight of an item including its contents
     */
    private static getItemTotalWeight;
    /**
     * Get remaining capacity
     */
    static getRemainingCapacity(supporter: IFEntity, world: IWorldQuery): {
        items?: number;
        weight?: number;
    };
    /**
     * Check if the supporter is enterable by actors
     */
    static isEnterable(supporter: IFEntity): boolean;
    /**
     * Get allowed types for this supporter
     */
    static getAllowedTypes(supporter: IFEntity): string[] | undefined;
    /**
     * Get excluded types for this supporter
     */
    static getExcludedTypes(supporter: IFEntity): string[] | undefined;
    /**
     * Add an item to a supporter
     * @param supporter The supporter receiving the item
     * @param item The item being added
     * @param world World query interface
     * @returns Result describing what happened
     */
    static addItem(supporter: IFEntity, item: IFEntity, world: IWorldQuery): IAddItemToSupporterResult;
    /**
     * Remove an item from a supporter
     * @param supporter The supporter losing the item
     * @param item The item being removed
     * @param world World query interface
     * @returns Result describing what happened
     */
    static removeItem(supporter: IFEntity, item: IFEntity, world: IWorldQuery): IRemoveItemFromSupporterResult;
}
```

### traits/switchable/switchableTrait

```typescript
import { ITrait } from '../trait';
export interface ISwitchableData {
    /** Whether the entity is currently on */
    isOn?: boolean;
    /** Whether the entity starts on */
    startsOn?: boolean;
    /** Power consumption when on (arbitrary units) */
    powerConsumption?: number;
    /** Whether this requires power to operate */
    requiresPower?: boolean;
    /** Whether power is currently available */
    hasPower?: boolean;
    /** Custom message when turning on */
    onMessage?: string;
    /** Custom message when turning off */
    offMessage?: string;
    /** Custom message when already on */
    alreadyOnMessage?: string;
    /** Custom message when already off */
    alreadyOffMessage?: string;
    /** Custom message when no power available */
    noPowerMessage?: string;
    /** Sound made when switching on */
    onSound?: string;
    /** Sound made when switching off */
    offSound?: string;
    /** Continuous sound while on */
    runningSound?: string;
    /** Time in turns before auto-off (0 = never) */
    autoOffTime?: number;
    /** Turns remaining before auto-off */
    autoOffCounter?: number;
    /** Description when switched on (used by computed description getter on IFEntity) */
    onDescription?: string;
    /** Description when switched off (used by computed description getter on IFEntity) */
    offDescription?: string;
}
/**
 * Switchable trait for entities that can be turned on and off.
 * Used for lights, machines, devices, etc.
 *
 * This trait contains only data - all switching logic
 * is in SwitchableBehavior.
 */
export declare class SwitchableTrait implements ITrait, ISwitchableData {
    static readonly type: "switchable";
    readonly type: "switchable";
    isOn: boolean;
    startsOn: boolean;
    powerConsumption: number;
    requiresPower: boolean;
    hasPower: boolean;
    onMessage?: string;
    offMessage?: string;
    alreadyOnMessage?: string;
    alreadyOffMessage?: string;
    noPowerMessage?: string;
    onSound?: string;
    offSound?: string;
    runningSound?: string;
    autoOffTime: number;
    autoOffCounter: number;
    onDescription?: string;
    offDescription?: string;
    constructor(data?: ISwitchableData);
}
```

### traits/switchable/switchableBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { ISemanticEvent } from '@sharpee/core';
export interface ISwitchOnResult {
    success: boolean;
    wasOn?: boolean;
    noPower?: boolean;
    autoOffTime?: number;
    powerConsumption?: number;
    runningSound?: string;
    onSound?: string;
    onMessage?: string;
}
export interface ISwitchOffResult {
    success: boolean;
    wasOff?: boolean;
    offSound?: string;
    offMessage?: string;
}
/**
 * Behavior for switchable entities.
 *
 * Handles the logic for turning devices on and off.
 */
export declare class SwitchableBehavior extends Behavior {
    static requiredTraits: "switchable"[];
    /**
     * Check if the device can be turned on
     */
    static canSwitchOn(entity: IFEntity): boolean;
    /**
     * Check if the device can be turned off
     */
    static canSwitchOff(entity: IFEntity): boolean;
    /**
     * Turn the entity on
     * @returns Result object describing what happened
     */
    static switchOn(entity: IFEntity): ISwitchOnResult;
    /**
     * Turn the entity off
     * @returns Result object describing what happened
     */
    static switchOff(entity: IFEntity): ISwitchOffResult;
    /**
     * Toggle on/off state
     * @returns Result from either switch on or off
     */
    static toggle(entity: IFEntity): ISwitchOnResult | ISwitchOffResult;
    /**
     * Update power state
     * @returns Events if device was forced off due to power loss
     */
    static setPower(entity: IFEntity, hasPower: boolean): ISemanticEvent[];
    /**
     * Process turn-based updates (for auto-off)
     * @returns Events if device auto-turned off
     */
    static updateTurn(entity: IFEntity): ISemanticEvent[];
    /**
     * Check if entity is currently on
     */
    static isOn(entity: IFEntity): boolean;
    /**
     * Get time remaining before auto-off
     */
    static getTimeRemaining(entity: IFEntity): number;
    /**
     * Get power consumption
     */
    static getPowerConsumption(entity: IFEntity): number;
}
```

### traits/wearable/wearableTrait

```typescript
import { ITrait } from '../trait';
export interface IWearableData {
    /** Whether the item is currently being worn */
    isWorn?: boolean;
    /** ID of who is wearing this (if worn) */
    wornBy?: string;
    /** Body slot this item occupies when worn */
    slot?: string;
    /** Layer for items in same slot (higher = outer) */
    layer?: number;
    /** Custom message when wearing this item */
    wearMessage?: string;
    /** Custom message when removing this item */
    removeMessage?: string;
    /** Whether this item can be worn over other items */
    wearableOver?: boolean;
    /** Slots this item blocks when worn */
    blocksSlots?: string[];
    /** Weight of the item */
    weight?: number;
    /** Bulk of the item */
    bulk?: number;
    /** Whether this item can be removed once worn */
    canRemove?: boolean;
    /** Body part this item is worn on */
    bodyPart?: string;
}
/**
 * Wearable trait indicates an entity can be worn by the player.
 * This is the base trait for all wearable items (rings, necklaces, clothing, etc.)
 *
 * This trait contains only data - all logic for wearing/removing
 * is in WearableBehavior.
 */
export declare class WearableTrait implements ITrait, IWearableData {
    static readonly type: "wearable";
    readonly type: "wearable";
    worn: boolean;
    wornBy?: string;
    slot: string;
    layer: number;
    wearMessage?: string;
    removeMessage?: string;
    wearableOver: boolean;
    blocksSlots: string[];
    weight: number;
    bulk: number;
    canRemove: boolean;
    bodyPart: string;
    get isWorn(): boolean;
    set isWorn(value: boolean);
    constructor(data?: IWearableData);
}
```

### traits/edible/edibleTrait

```typescript
import { ITrait } from '../trait';
/** Taste quality values */
export type TasteQuality = 'delicious' | 'tasty' | 'good' | 'plain' | 'bland' | 'awful' | 'terrible';
export interface IEdibleData {
    /** Nutrition value (arbitrary units) */
    nutrition?: number;
    /** Number of bites/servings remaining */
    servings?: number;
    /** Whether this is a liquid (drunk vs eaten) */
    liquid?: boolean;
    /** Custom message when eating/drinking */
    consumeMessage?: string;
    /** What remains after consumption (entity type to create) */
    remainsType?: string;
    /** Whether consuming this has special effects */
    hasEffect?: boolean;
    /** Effect description if hasEffect is true */
    effectDescription?: string;
    /** Weight of the item */
    weight?: number;
    /** Bulk of the item */
    bulk?: number;
    /** Taste quality of the food */
    taste?: TasteQuality;
    /** Array of effect names (e.g., 'poison', 'heal', 'sleep') */
    effects?: string[];
    /** Whether eating this satisfies hunger */
    satisfiesHunger?: boolean;
    /** Whether drinking this satisfies thirst */
    satisfiesThirst?: boolean;
}
/**
 * Edible trait indicates an entity can be eaten or drunk.
 *
 * This trait contains only data - all consumption logic
 * is in EdibleBehavior.
 */
export declare class EdibleTrait implements ITrait, IEdibleData {
    static readonly type: "edible";
    readonly type: "edible";
    nutrition: number;
    servings: number;
    liquid: boolean;
    consumeMessage?: string;
    remainsType?: string;
    hasEffect: boolean;
    effectDescription?: string;
    weight: number;
    bulk: number;
    taste?: TasteQuality;
    effects?: string[];
    satisfiesHunger?: boolean;
    satisfiesThirst?: boolean;
    constructor(data?: IEdibleData);
}
```

### traits/edible/edibleBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TasteQuality } from './edibleTrait';
import { ISemanticEvent } from '@sharpee/core';
/**
 * Behavior for edible entities.
 *
 * Handles the logic for consuming food and drink.
 */
export declare class EdibleBehavior extends Behavior {
    static requiredTraits: "edible"[];
    /**
     * Check if an item can be consumed
     */
    static canConsume(item: IFEntity): boolean;
    /**
     * Consume the item
     * @returns Events describing what happened
     */
    static consume(item: IFEntity, actor: IFEntity): ISemanticEvent[];
    /**
     * Check if item is fully consumed
     */
    static isEmpty(item: IFEntity): boolean;
    /**
     * Check if this is a liquid
     */
    static isLiquid(item: IFEntity): boolean;
    /**
     * Get nutrition value
     */
    static getNutrition(item: IFEntity): number;
    /**
     * Get remaining servings
     */
    static getServings(item: IFEntity): number;
    /**
     * Check if consuming has special effects
     */
    static hasEffect(item: IFEntity): boolean;
    /**
     * Get taste quality
     */
    static getTaste(item: IFEntity): TasteQuality | undefined;
    /**
     * Get effects array
     */
    static getEffects(item: IFEntity): string[] | undefined;
    /**
     * Check if item has a specific effect
     */
    static hasSpecificEffect(item: IFEntity, effect: string): boolean;
    /**
     * Check if eating satisfies hunger
     */
    static satisfiesHunger(item: IFEntity): boolean | undefined;
}
```

### traits/door/doorTrait

```typescript
import { ITrait } from '../trait';
/**
 * Door trait marks an entity as a connection between two rooms.
 *
 * This is a pure data structure - all validation and logic
 * should be handled by DoorBehavior.
 */
export declare class DoorTrait implements ITrait {
    static readonly type: "door";
    readonly type: "door";
    /** First room this door connects (must be an entity ID, not a name) */
    room1: string;
    /** Second room this door connects (must be an entity ID, not a name) */
    room2: string;
    /** Whether the door can be traversed in both directions */
    bidirectional: boolean;
    constructor(data?: Partial<DoorTrait>);
}
```

### traits/door/doorBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
/**
 * Behavior for door entities.
 *
 * Handles the logic for doors that connect two rooms.
 */
export declare class DoorBehavior extends Behavior {
    static requiredTraits: "door"[];
    /**
     * Get the rooms this door connects
     */
    static getRooms(door: IFEntity): [string, string];
    /**
     * Get the other room when coming from a specific room
     * @returns The other room ID, or undefined if the door doesn't connect to the current room
     */
    static getOtherRoom(door: IFEntity, currentRoom: string): string | undefined;
    /**
     * Check if the door can be traversed in both directions
     */
    static isBidirectional(door: IFEntity): boolean;
    /**
     * Check if the door connects two specific rooms (in any order)
     */
    static connects(door: IFEntity, room1: string, room2: string): boolean;
    /**
     * Check if the door connects to a specific room
     */
    static connectsTo(door: IFEntity, roomId: string): boolean;
    /**
     * Get the entry room (for one-way doors)
     * This is the room you can enter from
     */
    static getEntryRoom(door: IFEntity): string;
    /**
     * Get the exit room (for one-way doors)
     * This is the room you exit to
     */
    static getExitRoom(door: IFEntity): string;
}
```

### traits/actor/actorTrait

```typescript
import { ITrait } from '../trait';
/**
 * Full pronoun set for animate entities (ADR-089)
 */
export interface PronounSet {
    /** Nominative case: "he", "she", "they", "xe" */
    subject: string;
    /** Accusative case: "him", "her", "them", "xem" */
    object: string;
    /** Possessive pronoun (standalone): "his", "hers", "theirs", "xyrs" */
    possessive: string;
    /** Possessive adjective (before noun): "his", "her", "their", "xyr" */
    possessiveAdj: string;
    /** Reflexive: "himself", "herself", "themselves", "xemself" */
    reflexive: string;
    /** Verb agreement: 'singular' or 'plural' (they takes plural verbs) */
    verbForm: 'singular' | 'plural';
}
/**
 * Standard pronoun sets (ADR-089)
 */
export declare const PRONOUNS: {
    readonly HE_HIM: PronounSet;
    readonly SHE_HER: PronounSet;
    readonly THEY_THEM: PronounSet;
    readonly XE_XEM: PronounSet;
    readonly ZE_ZIR: PronounSet;
    readonly ZE_HIR: PronounSet;
    readonly EY_EM: PronounSet;
    readonly FAE_FAER: PronounSet;
};
/**
 * Standard honorifics/titles (ADR-089)
 */
export declare const HONORIFICS: {
    readonly MR: "Mr.";
    readonly MRS: "Mrs.";
    readonly MS: "Ms.";
    readonly MX: "Mx.";
    readonly MISS: "Miss";
    readonly DR: "Dr.";
    readonly PROF: "Prof.";
};
/**
 * Grammatical gender for localization (ADR-089)
 * Separate from pronouns - used for agreement in gendered languages
 */
export type GrammaticalGender = 'masculine' | 'feminine' | 'neuter' | 'common';
/**
 * Interface for the Actor trait data
 */
export interface IActorTrait {
    /** Whether this actor is the player character */
    isPlayer?: boolean;
    /** Whether this actor can be controlled by the player */
    isPlayable?: boolean;
    /** Current state/mood of the actor */
    state?: string;
    /**
     * Pronouns for this actor. Can be:
     * - A single PronounSet (most common)
     * - An array of PronounSets for people who use multiple (e.g., he/they)
     *   First in array is "primary" for parser resolution; all are valid
     */
    pronouns?: PronounSet | PronounSet[];
    /** Optional honorific/title: "Mr.", "Ms.", "Mx.", "Dr.", etc. */
    honorific?: string;
    /**
     * Semantic gender for grammatical agreement in gendered languages.
     * IMPORTANT: Separate from pronouns! A they/them person may specify
     * 'masculine' for French "il" agreement.
     */
    grammaticalGender?: GrammaticalGender;
    /**
     * Brief description for disambiguation prompts.
     * Example: "the tall woman", "the barista", "your friend Sam"
     */
    briefDescription?: string;
    /** Inventory capacity - actors can carry items */
    capacity?: {
        maxItems?: number;
        maxWeight?: number;
        maxVolume?: number;
    };
    /** Only these entity types can be carried by the actor */
    allowedTypes?: string[];
    /** These entity types cannot be carried by the actor */
    excludedTypes?: string[];
    /** Custom properties for game-specific actor data */
    customProperties?: Record<string, any>;
}
/**
 * Trait for entities that can act in the world (player, NPCs, etc.)
 *
 * Actors can:
 * - Perform actions
 * - Hold inventory (actors inherently have container functionality)
 * - Move between locations
 * - Interact with objects
 *
 * Like rooms, actors have built-in container functionality for their inventory.
 * The actual containment relationships are stored in the SpatialIndex.
 */
export declare class ActorTrait implements ITrait, IActorTrait {
    static readonly type: "actor";
    readonly type: "actor";
    isPlayer: boolean;
    isPlayable: boolean;
    state?: string;
    /** Pronouns - defaults to they/them (ADR-089) */
    pronouns: PronounSet | PronounSet[];
    /** Optional honorific/title */
    honorific?: string;
    /** Grammatical gender for localization */
    grammaticalGender?: GrammaticalGender;
    /** Brief description for disambiguation */
    briefDescription?: string;
    capacity?: {
        maxItems?: number;
        maxWeight?: number;
        maxVolume?: number;
    };
    allowedTypes?: string[];
    excludedTypes?: string[];
    readonly isTransparent: boolean;
    readonly enterable: boolean;
    customProperties?: Record<string, any>;
    constructor(data?: Partial<IActorTrait>);
    /**
     * Get the primary pronoun set (first if array, or the single set)
     */
    getPrimaryPronouns(): PronounSet;
    /**
     * Set pronouns for this actor
     */
    setPronouns(pronouns: PronounSet | PronounSet[]): void;
    /**
     * Set inventory limits
     */
    setInventoryLimit(limit: Partial<{
        maxItems?: number;
        maxWeight?: number;
        maxVolume?: number;
    }>): void;
    /**
     * Mark as player character
     */
    makePlayer(): void;
    /**
     * Set custom property
     */
    setCustomProperty(key: string, value: any): void;
    /**
     * Get custom property
     */
    getCustomProperty(key: string): any;
}
```

### traits/actor/actorBehavior

```typescript
import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { ActorTrait } from './actorTrait';
import { IWorldQuery } from '../container/containerBehavior';
import { EntityId } from '@sharpee/core';
/**
 * Result of a take item operation
 */
export interface ITakeItemResult {
    success: boolean;
    alreadyHeld?: boolean;
    tooHeavy?: boolean;
    inventoryFull?: boolean;
    cantTake?: boolean;
    needsRemoval?: boolean;
    fromContainer?: string;
    stateChanged?: boolean;
}
/**
 * Result of a drop item operation
 */
export interface IDropItemResult {
    success: boolean;
    notHeld?: boolean;
    stillWorn?: boolean;
    containerFull?: boolean;
    stateChanged?: boolean;
}
/**
 * Behavior for actors in the world.
 *
 * Handles inventory management, movement validation, and actor-specific logic.
 */
export declare class ActorBehavior extends Behavior {
    static requiredTraits: "actor"[];
    /**
     * Check if this is the player character
     */
    static isPlayer(entity: IFEntity): boolean;
    /**
     * Check if this actor can be controlled by the player
     */
    static isPlayable(entity: IFEntity): boolean;
    /**
     * Get actor's pronouns
     */
    static getPronouns(entity: IFEntity): ActorTrait['pronouns'];
    /**
     * Get a specific pronoun
     */
    static getPronoun(entity: IFEntity, type: keyof ActorTrait['pronouns']): string;
    /**
     * Check if actor can carry an item
     */
    static canCarry(actor: IFEntity, item: IFEntity, world: IWorldQuery): boolean;
    /**
     * Get total weight of carried items
     */
    static getCarriedWeight(actor: IFEntity, world: IWorldQuery): number;
    /**
     * Get total volume of carried items
     */
    static getCarriedVolume(actor: IFEntity, world: IWorldQuery): number;
    /**
     * Get remaining carrying capacity
     */
    static getRemainingCapacity(actor: IFEntity, world: IWorldQuery): {
        items?: number;
        weight?: number;
        volume?: number;
    };
    /**
     * Check if actor is holding a specific item
     */
    static isHolding(actor: IFEntity, itemId: EntityId, world: IWorldQuery): boolean;
    /**
     * Get actor's current state
     */
    static getState(entity: IFEntity): string | undefined;
    /**
     * Set actor's state
     */
    static setState(entity: IFEntity, state: string | undefined): void;
    /**
     * Get custom property value
     */
    static getCustomProperty(entity: IFEntity, key: string): any;
    /**
     * Set custom property value
     */
    static setCustomProperty(entity: IFEntity, key: string, value: any): void;
    /**
     * Find the player actor in a collection of entities
     */
    static findPlayer(entities: IFEntity[]): IFEntity | undefined;
    /**
     * Check if an actor can take an item (capacity validation)
     * @param actor The actor trying to take the item
     * @param item The item being taken
     * @param world World query interface
     * @returns True if the actor can take the item
     */
    static canTakeItem(actor: IFEntity, item: IFEntity, world: IWorldQuery): boolean;
    /**
     * Have an actor take an item
     * @param actor The actor taking the item
     * @param item The item being taken
     * @param world World query interface
     * @returns Result describing what happened
     */
    static takeItem(actor: IFEntity, item: IFEntity, world: IWorldQuery): ITakeItemResult;
    /**
     * Have an actor drop an item
     * @param actor The actor dropping the item
     * @param item The item being dropped
     * @param world World query interface
     * @returns Result describing what happened
     */
    static dropItem(actor: IFEntity, item: IFEntity, world: IWorldQuery): IDropItemResult;
}
```

### traits/attached/attachedTrait

```typescript
/**
 * Attached trait implementation
 */
import { ITrait } from '../trait';
export interface IAttachedData {
    /**
     * What this is attached to (entity ID)
     */
    attachedTo?: string;
    /**
     * How it's attached
     */
    attachmentType?: 'glued' | 'nailed' | 'screwed' | 'tied' | 'welded' | 'magnetic' | 'stuck';
    /**
     * Whether it can be detached by pulling
     */
    detachable?: boolean;
    /**
     * Force required to detach (if detachable)
     */
    detachForce?: number;
    /**
     * Whether it's currently loose
     */
    loose?: boolean;
    /**
     * Sound when detached
     */
    detachSound?: string;
    /**
     * What happens when detached
     */
    onDetach?: {
        breaksObject?: boolean;
        breaksAttachment?: boolean;
        leavesResidue?: boolean;
    };
}
/**
 * Attached trait for objects that are attached, fastened, or connected to something
 *
 * This trait contains only data - all logic for detachment
 * is handled by the pulling action.
 */
export declare class AttachedTrait implements ITrait, IAttachedData {
    static readonly type: "attached";
    readonly type: "attached";
    attachedTo?: string;
    attachmentType: 'glued' | 'nailed' | 'screwed' | 'tied' | 'welded' | 'magnetic' | 'stuck';
    detachable: boolean;
    detachForce?: number;
    loose: boolean;
    detachSound?: string;
    onDetach?: {
        breaksObject?: boolean;
        breaksAttachment?: boolean;
        leavesResidue?: boolean;
    };
    constructor(data?: IAttachedData);
}
```

### traits/button/buttonTrait

```typescript
/**
 * Button trait implementation
 */
import { ITrait } from '../trait';
export interface IButtonData {
    /**
     * Whether the button stays pressed or pops back
     */
    latching?: boolean;
    /**
     * Color of the button (for descriptive purposes)
     */
    color?: string;
    /**
     * Size of the button
     */
    size?: 'tiny' | 'small' | 'medium' | 'large';
    /**
     * Shape of the button
     */
    shape?: 'round' | 'square' | 'rectangular' | 'oval';
    /**
     * Material of the button
     */
    material?: string;
    /**
     * Label on the button
     */
    label?: string;
    /**
     * Whether the button is currently pressed (for latching buttons)
     */
    pressed?: boolean;
}
/**
 * Button trait for button-specific properties
 *
 * Buttons should also have the PUSHABLE trait for push behavior.
 * This trait adds button-specific descriptive properties.
 */
export declare class ButtonTrait implements ITrait, IButtonData {
    static readonly type: "button";
    readonly type: "button";
    latching: boolean;
    color?: string;
    size?: 'tiny' | 'small' | 'medium' | 'large';
    shape?: 'round' | 'square' | 'rectangular' | 'oval';
    material?: string;
    label?: string;
    pressed: boolean;
    constructor(data?: IButtonData);
}
```

### traits/clothing/clothingTrait

```typescript
import { ITrait } from '../trait';
import { IWearableData } from '../wearable/wearableTrait';
export interface IClothingData extends IWearableData {
    /** Material the clothing is made from */
    material?: string;
    /** Style or type of clothing */
    style?: string;
    /** Whether this clothing can get wet, dirty, torn, etc. */
    damageable?: boolean;
    /** Current condition of the clothing */
    condition?: 'pristine' | 'good' | 'worn' | 'torn' | 'ruined';
}
/**
 * ClothingTrait is a specialized wearable trait for clothing items.
 * Clothing items (coats, pants, dresses) can have pockets and other special properties.
 *
 * This trait includes all WearableData properties but is a separate trait type
 * to allow for clothing-specific behaviors and queries.
 *
 * Pockets should be created as separate container entities with SceneryTrait
 * and placed inside the clothing item.
 *
 * @example
 * ```typescript
 * const coat = world.createEntity('Winter Coat', 'item');
 * coat.add(new ClothingTrait({ slot: 'torso', material: 'wool' }));
 * coat.add(new ContainerTrait()); // So it can contain pockets
 *
 * const pocket = world.createEntity('inside pocket', 'container');
 * pocket.add(new ContainerTrait({ capacity: 3 }));
 * pocket.add(new SceneryTrait({ cantTakeMessage: "The pocket is sewn into the coat." }));
 * world.moveEntity(pocket.id, coat.id);
 * ```
 */
export declare class ClothingTrait implements ITrait, IClothingData {
    static readonly type: "clothing";
    readonly type: "clothing";
    worn: boolean;
    wornBy?: string;
    slot: string;
    layer: number;
    wearMessage?: string;
    removeMessage?: string;
    wearableOver: boolean;
    blocksSlots: string[];
    weight: number;
    bulk: number;
    canRemove: boolean;
    bodyPart: string;
    material: string;
    style: string;
    damageable: boolean;
    condition: 'pristine' | 'good' | 'worn' | 'torn' | 'ruined';
    get isWorn(): boolean;
    set isWorn(value: boolean);
    constructor(data?: IClothingData);
}
```

### traits/moveable-scenery/moveableSceneryTrait

```typescript
/**
 * Moveable scenery trait implementation
 */
import { ITrait } from '../trait';
export interface IMoveableSceneryData {
    /**
     * Weight class of the object
     */
    weightClass?: 'light' | 'medium' | 'heavy' | 'immense';
    /**
     * Whether it reveals something when moved
     */
    revealsWhenMoved?: boolean;
    /**
     * Entity ID of what is revealed
     */
    reveals?: string;
    /**
     * Whether it blocks exits in its current position
     */
    blocksExits?: boolean;
    /**
     * Which exits it blocks (direction names)
     */
    blockedExits?: string[];
    /**
     * Whether it has been moved from its original position
     */
    moved?: boolean;
    /**
     * Original room ID (to track if it's been moved between rooms)
     */
    originalRoom?: string;
    /**
     * Sound made when moving
     */
    moveSound?: string;
    /**
     * Whether multiple people are needed to move it
     */
    requiresMultiplePeople?: boolean;
    /**
     * Number of people required
     */
    peopleRequired?: number;
}
/**
 * Moveable scenery trait for large pushable/pullable objects
 *
 * Objects with this trait should also have PUSHABLE and/or PULLABLE
 * traits to define how they can be moved. This trait adds properties
 * specific to large moveable scenery objects.
 */
export declare class MoveableSceneryTrait implements ITrait, IMoveableSceneryData {
    static readonly type: "moveableScenery";
    readonly type: "moveableScenery";
    weightClass: 'light' | 'medium' | 'heavy' | 'immense';
    revealsWhenMoved: boolean;
    reveals?: string;
    blocksExits: boolean;
    blockedExits?: string[];
    moved: boolean;
    originalRoom?: string;
    moveSound?: string;
    requiresMultiplePeople: boolean;
    peopleRequired?: number;
    constructor(data?: IMoveableSceneryData);
}
```

### traits/pullable/pullableTrait

```typescript
/**
 * Pullable trait implementation
 */
import { ITrait } from '../trait';
export interface IPullableData {
    /**
     * Type of pullable object - determines behavior
     */
    pullType?: 'lever' | 'cord' | 'attached' | 'heavy';
    /**
     * Entity ID that this activates when pulled
     */
    activates?: string;
    /**
     * Entity ID that this is linked to (for levers)
     */
    linkedTo?: string;
    /**
     * Sound made when pulled
     */
    pullSound?: string;
    /**
     * Minimum strength required to pull (for heavy objects)
     */
    requiresStrength?: number;
    /**
     * Whether this can be pulled multiple times
     */
    repeatable?: boolean;
    /**
     * Current state for toggleable pullables
     */
    state?: 'default' | 'pulled' | 'activated';
    /**
     * Number of times this has been pulled
     */
    pullCount?: number;
    /**
     * Maximum number of pulls allowed
     */
    maxPulls?: number;
    /**
     * Whether pulling detaches this object
     */
    detachesOnPull?: boolean;
    /**
     * Custom effects when pulled
     */
    effects?: {
        onPull?: string;
        onMaxPulls?: string;
        onDetach?: string;
    };
}
/**
 * Pullable trait for objects that can be pulled
 *
 * This trait contains only data - all logic for pulling
 * is handled by the pulling action.
 */
export declare class PullableTrait implements ITrait, IPullableData {
    static readonly type: "pullable";
    readonly type: "pullable";
    pullType: 'lever' | 'cord' | 'attached' | 'heavy';
    activates?: string;
    linkedTo?: string;
    pullSound?: string;
    requiresStrength?: number;
    repeatable: boolean;
    state: 'default' | 'pulled' | 'activated';
    pullCount: number;
    maxPulls?: number;
    detachesOnPull: boolean;
    effects?: {
        onPull?: string;
        onMaxPulls?: string;
        onDetach?: string;
    };
    constructor(data?: IPullableData);
}
```

### traits/pushable/pushableTrait

```typescript
/**
 * Pushable trait implementation
 */
import { ITrait } from '../trait';
export interface IPushableData {
    /**
     * Type of pushable object - determines behavior
     */
    pushType?: 'button' | 'heavy' | 'moveable';
    /**
     * Whether pushing reveals a hidden passage
     */
    revealsPassage?: boolean;
    /**
     * Sound made when pushed
     */
    pushSound?: string;
    /**
     * Minimum strength required to push (for heavy objects)
     */
    requiresStrength?: number;
    /**
     * Whether this can be pushed multiple times
     */
    repeatable?: boolean;
    /**
     * Current state for toggleable pushables
     */
    state?: 'default' | 'pushed' | 'activated';
    /**
     * Number of times this has been pushed
     */
    pushCount?: number;
    /**
     * Maximum number of pushes allowed
     */
    maxPushes?: number;
    /**
     * Direction it can be pushed (for moveable objects)
     */
    pushDirection?: 'north' | 'south' | 'east' | 'west' | 'any';
    /**
     * Entity ID that this activates when pushed
     */
    activates?: string;
    /**
     * Custom effects when pushed
     */
    effects?: {
        onPush?: string;
        onMaxPushes?: string;
        onMove?: string;
    };
}
/**
 * Pushable trait for objects that can be pushed
 *
 * This trait contains only data - all logic for pushing
 * is handled by the pushing action.
 */
export declare class PushableTrait implements ITrait, IPushableData {
    static readonly type: "pushable";
    readonly type: "pushable";
    pushType: 'button' | 'heavy' | 'moveable';
    revealsPassage?: boolean;
    pushSound?: string;
    requiresStrength?: number;
    repeatable: boolean;
    state: 'default' | 'pushed' | 'activated';
    pushCount: number;
    maxPushes?: number;
    pushDirection?: 'north' | 'south' | 'east' | 'west' | 'any';
    activates?: string;
    effects?: {
        onPush?: string;
        onMaxPushes?: string;
        onMove?: string;
    };
    constructor(data?: IPushableData);
}
```

### traits/npc/npcTrait

```typescript
/**
 * NPC Trait (ADR-070)
 *
 * Marks an entity as a Non-Player Character that can act autonomously.
 * NPCs participate in the turn cycle and can have behaviors.
 */
import { ITrait } from '../trait';
import { EntityId } from '@sharpee/core';
/**
 * Interface for NPC trait data
 */
export interface INpcData {
    /** Whether this NPC is currently alive */
    isAlive?: boolean;
    /** Whether this NPC is conscious (can act) */
    isConscious?: boolean;
    /** Whether this NPC is hostile to the player */
    isHostile?: boolean;
    /** Whether this NPC can move between rooms */
    canMove?: boolean;
    /** Rooms this NPC is allowed to enter (undefined = any room) */
    allowedRooms?: EntityId[];
    /** Rooms this NPC cannot enter */
    forbiddenRooms?: EntityId[];
    /** ID of the behavior to use for this NPC */
    behaviorId?: string;
    /** Conversation state for dialogue */
    conversationState?: string;
    /** Knowledge state - what this NPC knows */
    knowledge?: Record<string, unknown>;
    /** Goal state - what this NPC is trying to do */
    goals?: string[];
    /** Custom NPC properties */
    customProperties?: Record<string, unknown>;
}
/**
 * NPC trait indicates an entity is an autonomous character.
 *
 * NPCs can:
 * - Act during the NPC turn phase
 * - Move between rooms (if canMove is true)
 * - Respond to player actions (speak, attack, observe)
 * - Maintain state across turns
 *
 * The actual behavior logic is defined in NpcBehavior implementations
 * registered with the NpcService.
 */
export declare class NpcTrait implements ITrait, INpcData {
    static readonly type: "npc";
    readonly type: "npc";
    isAlive: boolean;
    isConscious: boolean;
    isHostile: boolean;
    canMove: boolean;
    allowedRooms?: EntityId[];
    forbiddenRooms?: EntityId[];
    behaviorId?: string;
    conversationState?: string;
    knowledge?: Record<string, unknown>;
    goals?: string[];
    customProperties?: Record<string, unknown>;
    constructor(data?: INpcData);
    /**
     * Check if NPC can act (alive and conscious)
     */
    get canAct(): boolean;
    /**
     * Check if NPC can enter a specific room
     */
    canEnterRoom(roomId: EntityId): boolean;
    /**
     * Make this NPC hostile
     */
    makeHostile(): void;
    /**
     * Make this NPC non-hostile
     */
    makePassive(): void;
    /**
     * Knock out this NPC (unconscious but alive)
     */
    knockOut(): void;
    /**
     * Wake up this NPC
     */
    wakeUp(): void;
    /**
     * Kill this NPC
     */
    kill(): void;
    /**
     * Revive this NPC
     */
    revive(): void;
    /**
     * Set a knowledge item
     */
    setKnowledge(key: string, value: unknown): void;
    /**
     * Get a knowledge item
     */
    getKnowledge(key: string): unknown;
    /**
     * Check if NPC knows something
     */
    knows(key: string): boolean;
    /**
     * Add a goal
     */
    addGoal(goal: string): void;
    /**
     * Remove a goal
     */
    removeGoal(goal: string): void;
    /**
     * Check if NPC has a goal
     */
    hasGoal(goal: string): boolean;
    /**
     * Set a custom property
     */
    setCustomProperty(key: string, value: unknown): void;
    /**
     * Get a custom property
     */
    getCustomProperty(key: string): unknown;
}
```

### traits/vehicle/vehicleTrait

```typescript
/**
 * Vehicle Trait - For enterable containers that transport actors
 *
 * Vehicles are enterable containers (bucket, boat, basket, balloon) where:
 * - Actor enters the vehicle (ENTER BUCKET)
 * - Vehicle moves, taking its contents with it
 * - Actor exits the vehicle (EXIT BUCKET)
 *
 * Based on Infocom's vehicle concept from Zork.
 */
import { ITrait } from '../trait';
/**
 * Vehicle type determines movement behavior
 */
export type VehicleType = 'counterweight' | 'watercraft' | 'aircraft' | 'cable' | 'generic';
/**
 * Trait for vehicles - enterable containers that transport actors
 */
export declare class VehicleTrait implements ITrait {
    static readonly type: "vehicle";
    readonly type: "vehicle";
    /** Type of vehicle determines default behavior */
    vehicleType: VehicleType;
    /**
     * When vehicle moves, all contents (including actors) move with it.
     * This is always true for vehicles.
     */
    readonly movesWithContents: boolean;
    /**
     * If true, actor cannot use GO/walk commands while in vehicle.
     * Movement must be through vehicle-specific actions.
     * - Bucket: POUR/FILL moves it
     * - Boat: row, current moves it
     * - Balloon: burn/release moves it
     */
    blocksWalkingMovement: boolean;
    /**
     * If true, actor must EXIT vehicle before leaving the room on foot.
     * Prevents "GO EAST" while sitting in a bucket.
     */
    requiresExitBeforeLeaving: boolean;
    /**
     * Current location/state of the vehicle (e.g., 'top', 'bottom', 'river-1')
     * Used by vehicle-specific logic to track position.
     */
    currentPosition?: string;
    /**
     * Map of position names to room IDs.
     * e.g., { 'top': 'top-of-well', 'bottom': 'well-bottom' }
     */
    positionRooms?: Record<string, string>;
    /**
     * Whether the vehicle is currently operational/usable.
     * Boat might need to be inflated, balloon might need fuel.
     */
    isOperational: boolean;
    /**
     * Reason the vehicle is not operational (for error messages).
     */
    notOperationalReason?: string;
    /**
     * If true, visibility passes through to the containing room.
     * - Bucket, raft, boat: transparent (can see the room you're in)
     * - Airplane, submarine: not transparent (see vehicle interior only)
     */
    transparent: boolean;
    constructor(options?: Partial<Omit<VehicleTrait, 'type' | 'movesWithContents'>>);
}
/**
 * Type guard for VehicleTrait
 */
export declare function isVehicleTrait(trait: ITrait): trait is VehicleTrait;
/**
 * Factory function for creating VehicleTrait
 */
export declare function createVehicleTrait(options?: Partial<Omit<VehicleTrait, 'type' | 'movesWithContents'>>): VehicleTrait;
```

### traits/vehicle/vehicleBehavior

```typescript
/**
 * Vehicle Behavior - Handles vehicle movement and actor transport
 *
 * Provides utilities for:
 * - Moving a vehicle (and its contents) between rooms
 * - Checking if an actor is in a vehicle
 * - Getting the vehicle an actor is in
 */
import { WorldModel } from '../../world/WorldModel';
import { IFEntity } from '../../entities/if-entity';
/**
 * Check if an entity is a vehicle
 */
export declare function isVehicle(entity: IFEntity): boolean;
/**
 * Check if an actor is currently inside a vehicle
 */
export declare function isActorInVehicle(world: WorldModel, actorId: string): boolean;
/**
 * Get the vehicle an actor is in, or undefined if not in a vehicle
 */
export declare function getActorVehicle(world: WorldModel, actorId: string): IFEntity | undefined;
/**
 * Get all actors currently inside a vehicle
 */
export declare function getVehicleOccupants(world: WorldModel, vehicleId: string): IFEntity[];
/**
 * Move a vehicle to a new room, transporting all contents with it.
 * Returns true if movement succeeded.
 *
 * This is the core vehicle transport function - when a vehicle moves,
 * everything inside it (including actors) moves with it.
 */
export declare function moveVehicle(world: WorldModel, vehicleId: string, destinationRoomId: string): boolean;
/**
 * Check if a vehicle can move (is operational)
 */
export declare function canVehicleMove(vehicle: IFEntity): {
    canMove: boolean;
    reason?: string;
};
/**
 * Check if an actor can exit their current location.
 * If in a vehicle that requires exit, they cannot simply walk out.
 */
export declare function canActorLeaveLocation(world: WorldModel, actorId: string): {
    canLeave: boolean;
    mustExitVehicle?: IFEntity;
};
/**
 * Check if an actor in a vehicle can use GO/walk commands.
 * Some vehicles block walking movement entirely.
 *
 * Returns:
 * - canWalk: true if actor can use GO commands (not in vehicle, or in walkable vehicle)
 * - vehicle: the vehicle entity if actor is in one (undefined if not in a vehicle)
 */
export declare function canActorWalkInVehicle(world: WorldModel, actorId: string): {
    canWalk: boolean;
    vehicle?: IFEntity;
};
```

### traits/story-info/storyInfoTrait

```typescript
import { ITrait } from '../trait';
/**
 * StoryInfoTrait stores metadata about the game on a system entity.
 * Replaces scattered (world as any).storyConfig / .versionInfo casts.
 *
 * The entity carrying this trait has no location and is never visible
 * in the game world. Actions read it via world.findByTrait().
 */
export declare class StoryInfoTrait implements ITrait {
    static readonly type: "storyInfo";
    readonly type: "storyInfo";
    title: string;
    author: string;
    version: string;
    description?: string;
    buildDate?: string;
    engineVersion?: string;
    clientVersion?: string;
    portedBy?: string;
    constructor(data?: Partial<StoryInfoTrait>);
}
```

### extensions/types

```typescript
/**
 * Extension system interfaces and types
 *
 * This module defines the contract for creating trait extensions
 * that can add new functionality to the world model.
 */
import { ITraitConstructor } from '../traits/trait';
import { Behavior } from '../behaviors/behavior';
/**
 * Extension metadata
 */
export interface IExtensionMetadata {
    /** Unique identifier for the extension (e.g., 'com.example.dialogue') */
    id: string;
    /** Human-readable name */
    name: string;
    /** Extension version (semver format) */
    version: string;
    /** Brief description of what the extension provides */
    description?: string;
    /** Author information */
    author?: string | {
        name: string;
        email?: string;
        url?: string;
    };
    /** Dependencies on other extensions */
    dependencies?: IExtensionDependency[];
    /** Namespace for all traits/events/actions in this extension */
    namespace: string;
}
/**
 * Extension dependency specification
 */
export interface IExtensionDependency {
    /** Extension ID */
    id: string;
    /** Version requirement (e.g., '^1.0.0', '>=2.0.0') */
    version: string;
    /** Whether this dependency is optional */
    optional?: boolean;
}
/**
 * Trait definition for extensions
 */
export interface IExtensionTraitDefinition {
    /** Trait type (will be prefixed with namespace) */
    type: string;
    /** Trait constructor */
    implementation: ITraitConstructor;
    /** Associated behavior (optional) */
    behavior?: typeof Behavior;
    /** Category for organization */
    category?: string;
}
/**
 * Event type definition for extensions
 */
export interface IExtensionEventDefinition {
    /** Event type (will be prefixed with namespace) */
    type: string;
    /** Description of when this event is emitted */
    description?: string;
    /** Expected payload structure */
    payloadSchema?: Record<string, unknown>;
}
/**
 * Action definition for extensions
 */
export interface IExtensionActionDefinition {
    /** Action ID (will be prefixed with namespace) */
    id: string;
    /** Action executor function */
    execute: (command: any, context: any) => any[];
    /** Associated command definitions */
    commands?: IExtensionCommandDefinition[];
}
/**
 * Command definition for extensions
 */
export interface IExtensionCommandDefinition {
    /** Verb that triggers this command */
    verb: string;
    /** Aliases for the verb */
    aliases?: string[];
    /** Maps to which action */
    action: string;
    /** Command parsing rules */
    rules?: {
        requiresNoun?: boolean;
        requiresSecondNoun?: boolean;
        prepositions?: string[];
    };
}
/**
 * Main extension interface
 *
 * All trait extensions must implement this interface
 */
export interface ITraitExtension {
    /** Extension metadata */
    readonly metadata: IExtensionMetadata;
    /** Traits provided by this extension */
    readonly traits?: IExtensionTraitDefinition[];
    /** Event types defined by this extension */
    readonly events?: IExtensionEventDefinition[];
    /** Actions provided by this extension */
    readonly actions?: IExtensionActionDefinition[];
    /** Commands that map to actions */
    readonly commands?: IExtensionCommandDefinition[];
    /**
     * Initialize the extension
     * Called when the extension is loaded
     * @param registry - The extension registry for registering components
     */
    initialize?(registry?: IExtensionRegistry): Promise<void> | void;
    /**
     * Cleanup when extension is unloaded
     */
    cleanup?(): Promise<void> | void;
    /**
     * Shutdown the extension (alias for cleanup)
     */
    shutdown?(): Promise<void> | void;
    /**
     * Get extension API for other extensions to use
     */
    getAPI?(): Record<string, unknown>;
    /**
     * Get language data for a specific locale
     */
    getLanguageData?(locale: string): IExtensionLanguageData | undefined;
}
/**
 * Language data provided by extensions
 */
export interface IExtensionLanguageData {
    /** Locale identifier (e.g., 'en-US') */
    locale: string;
    /** Verb definitions */
    verbs?: Record<string, string[]>;
    /** Message templates */
    messages?: Record<string, string>;
    /** Event descriptions */
    events?: Record<string, string>;
    /** Action failure messages */
    failures?: Record<string, string>;
}
/**
 * Extension loader interface
 */
export interface IExtensionLoader {
    /**
     * Load an extension
     */
    loadExtension(extension: ITraitExtension): Promise<void>;
    /**
     * Unload an extension
     */
    unloadExtension(extensionId: string): Promise<void>;
    /**
     * Get loaded extension by ID
     */
    getExtension(extensionId: string): ITraitExtension | undefined;
    /**
     * Get all loaded extensions
     */
    getLoadedExtensions(): ITraitExtension[];
    /**
     * Check if an extension is loaded
     */
    isLoaded(extensionId: string): boolean;
}
/**
 * Extension registry interface
 *
 * Manages registration of traits, behaviors, and other extension components
 */
export interface IExtensionRegistry {
    /**
     * Register a trait from an extension
     */
    registerTrait(namespace: string, definition: IExtensionTraitDefinition): void;
    /**
     * Register an event type from an extension
     */
    registerEvent(namespace: string, definition: IExtensionEventDefinition): void;
    /**
     * Register an action from an extension
     */
    registerAction(namespace: string, definition: IExtensionActionDefinition): void;
    /**
     * Get a namespaced trait type
     */
    getTraitType(namespace: string, type: string): string;
    /**
     * Get a namespaced event type
     */
    getEventType(namespace: string, type: string): string;
    /**
     * Get a namespaced action ID
     */
    getActionId(namespace: string, id: string): string;
    /**
     * Clear all registrations for a namespace
     */
    clearNamespace(namespace: string): void;
}
/**
 * Utility to create namespaced identifiers
 */
export declare function createNamespacedId(namespace: string, id: string): string;
/**
 * Utility to parse namespaced identifiers
 */
export declare function parseNamespacedId(namespacedId: string): {
    namespace: string;
    id: string;
} | null;
/**
 * Type aliases for backwards compatibility
 */
export type IExtension = ITraitExtension;
export type IExtensionManager = IExtensionLoader;
export type VersionString = string;
```

### extensions/registry

```typescript
/**
 * Extension registry implementation
 *
 * Manages registration and lookup of extension-provided traits,
 * events, actions, and other components.
 */
import { ITraitConstructor } from '../traits/trait';
import { IExtensionRegistry, IExtensionTraitDefinition, IExtensionEventDefinition, IExtensionActionDefinition } from './types';
/**
 * Default implementation of the extension registry
 */
export declare class ExtensionRegistry implements IExtensionRegistry {
    private traits;
    private events;
    private actions;
    private namespaces;
    /**
     * Register a trait from an extension
     */
    registerTrait(namespace: string, definition: IExtensionTraitDefinition): void;
    /**
     * Register an event type from an extension
     */
    registerEvent(namespace: string, definition: IExtensionEventDefinition): void;
    /**
     * Register an action from an extension
     */
    registerAction(namespace: string, definition: IExtensionActionDefinition): void;
    /**
     * Get a namespaced trait type
     */
    getTraitType(namespace: string, type: string): string;
    /**
     * Get a namespaced event type
     */
    getEventType(namespace: string, type: string): string;
    /**
     * Get a namespaced action ID
     */
    getActionId(namespace: string, id: string): string;
    /**
     * Get a trait constructor by its full type
     */
    getTrait(fullType: string): ITraitConstructor | undefined;
    /**
     * Get an event definition by its full type
     */
    getEvent(fullType: string): IExtensionEventDefinition | undefined;
    /**
     * Get an action definition by its full ID
     */
    getAction(fullId: string): IExtensionActionDefinition | undefined;
    /**
     * Check if a namespace is registered
     */
    hasNamespace(namespace: string): boolean;
    /**
     * Get all registered namespaces
     */
    getNamespaces(): string[];
    /**
     * Get all traits in a namespace
     */
    getTraitsByNamespace(namespace: string): string[];
    /**
     * Get all events in a namespace
     */
    getEventsByNamespace(namespace: string): string[];
    /**
     * Get all actions in a namespace
     */
    getActionsByNamespace(namespace: string): string[];
    /**
     * Clear all registrations for a namespace
     */
    clearNamespace(namespace: string): void;
    /**
     * Clear all registrations
     */
    clear(): void;
    /**
     * Get all traits (for compatibility)
     */
    getTraits(): Map<string, ITraitConstructor>;
    /**
     * Get all events (for compatibility)
     */
    getEvents(): Map<string, IExtensionEventDefinition>;
    /**
     * Get all actions (for compatibility)
     */
    getActions(): Map<string, IExtensionActionDefinition>;
    /**
     * Get services (placeholder for future implementation)
     */
    getServices(): Map<string, unknown>;
}
export declare const extensionRegistry: ExtensionRegistry;
export declare function getExtensionRegistry(): ExtensionRegistry;
```

### extensions/loader

```typescript
/**
 * Extension loader implementation
 *
 * Manages loading, initialization, and lifecycle of trait extensions
 */
import { IExtensionLoader, ITraitExtension, IExtensionRegistry } from './types';
/**
 * Extension loading error
 */
export declare class ExtensionLoadError extends Error {
    extensionId: string;
    cause?: Error | undefined;
    constructor(message: string, extensionId: string, cause?: Error | undefined);
}
/**
 * Default implementation of the extension loader
 */
export declare class ExtensionLoader implements IExtensionLoader {
    private extensions;
    private registry;
    constructor(registry?: IExtensionRegistry);
    /**
     * Load an extension
     */
    loadExtension(extension: ITraitExtension): Promise<void>;
    /**
     * Unload an extension
     */
    unloadExtension(extensionId: string): Promise<void>;
    /**
     * Get loaded extension by ID
     */
    getExtension(extensionId: string): ITraitExtension | undefined;
    /**
     * Get all loaded extensions
     */
    getLoadedExtensions(): ITraitExtension[];
    /**
     * Check if an extension is loaded
     */
    isLoaded(extensionId: string): boolean;
    /**
     * Get extensions in load order (respecting dependencies)
     */
    getLoadOrder(): string[];
    /**
     * Validate extension dependencies are satisfied
     */
    validateDependencies(extension: ITraitExtension): string[];
}
export declare const extensionLoader: ExtensionLoader;
```

### world/WorldModel

```typescript
import { IFEntity } from '../entities/if-entity';
import { TraitType } from '../traits/trait-types';
import { DirectionType, DirectionVocabularyRegistry } from '../constants/directions';
import { ISemanticEvent, ISemanticEventSource } from '@sharpee/core';
import { IDataStore } from './AuthorModel';
import { ICapabilityData, ICapabilityRegistration } from './capabilities';
import { WorldState, WorldConfig, ContentsOptions, WorldChange, IGrammarVocabularyProvider, IEventProcessorWiring, GamePrompt } from '@sharpee/if-domain';
import { ScopeRegistry } from '../scope/scope-registry';
import { IScopeRule } from '../scope/scope-rule';
import { EventHandler, EventValidator, EventPreviewer, EventChainHandler, ChainEventOptions } from './WorldEventSystem';
export type { EventHandler, EventValidator, EventPreviewer, EventChainHandler, ChainEventOptions };
export { WorldState, WorldConfig, ContentsOptions, WorldChange } from '@sharpee/if-domain';
import { ScoreEntry } from './ScoreLedger';
export { ScoreEntry } from './ScoreLedger';
export interface IWorldModel {
    getDataStore(): IDataStore;
    registerCapability(name: string, registration: Partial<ICapabilityRegistration>): void;
    updateCapability(name: string, data: Partial<ICapabilityData>): void;
    getCapability(name: string): ICapabilityData | undefined;
    hasCapability(name: string): boolean;
    createEntity(displayName: string, type?: string): IFEntity;
    getEntity(id: string): IFEntity | undefined;
    hasEntity(id: string): boolean;
    removeEntity(id: string): boolean;
    getAllEntities(): IFEntity[];
    updateEntity(entityId: string, updater: (entity: IFEntity) => void): void;
    getLocation(entityId: string): string | undefined;
    getContents(containerId: string, options?: ContentsOptions): IFEntity[];
    moveEntity(entityId: string, targetId: string | null): boolean;
    canMoveEntity(entityId: string, targetId: string | null): boolean;
    getContainingRoom(entityId: string): IFEntity | undefined;
    getAllContents(entityId: string, options?: ContentsOptions): IFEntity[];
    getState(): WorldState;
    setState(state: WorldState): void;
    getStateValue(key: string): any;
    setStateValue(key: string, value: any): void;
    getPrompt(): GamePrompt;
    setPrompt(prompt: GamePrompt): void;
    findByTrait(traitType: TraitType): IFEntity[];
    findByType(entityType: string): IFEntity[];
    findWhere(predicate: (entity: IFEntity) => boolean): IFEntity[];
    getVisible(observerId: string): IFEntity[];
    getInScope(observerId: string): IFEntity[];
    canSee(observerId: string, targetId: string): boolean;
    getRelated(entityId: string, relationshipType: string): string[];
    areRelated(entity1Id: string, entity2Id: string, relationshipType: string): boolean;
    addRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void;
    removeRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void;
    getTotalWeight(entityId: string): number;
    wouldCreateLoop(entityId: string, targetId: string): boolean;
    findPath(fromRoomId: string, toRoomId: string): string[] | null;
    getPlayer(): IFEntity | undefined;
    setPlayer(entityId: string): void;
    connectRooms(room1Id: string, room2Id: string, direction: DirectionType): void;
    createDoor(displayName: string, opts: {
        room1Id: string;
        room2Id: string;
        direction: DirectionType;
        description?: string;
        aliases?: string[];
        isOpen?: boolean;
        isLocked?: boolean;
        keyId?: string;
    }): IFEntity;
    awardScore(id: string, points: number, description: string): boolean;
    revokeScore(id: string): boolean;
    hasScore(id: string): boolean;
    getScore(): number;
    getScoreEntries(): ScoreEntry[];
    setMaxScore(max: number): void;
    getMaxScore(): number;
    toJSON(): string;
    loadJSON(json: string): void;
    clear(): void;
    registerEventHandler(eventType: string, handler: EventHandler): void;
    unregisterEventHandler(eventType: string): void;
    registerEventValidator(eventType: string, validator: EventValidator): void;
    registerEventPreviewer(eventType: string, previewer: EventPreviewer): void;
    /**
     * Wire all registered event handlers to the engine's EventProcessor (ADR-086).
     * Called by the engine during initialization to ensure handlers are invoked.
     */
    connectEventProcessor(wiring: IEventProcessorWiring): void;
    /**
     * Register an event chain handler (ADR-094).
     * Chain handlers produce new events when a trigger event occurs.
     * Unlike regular handlers, chains return events to be emitted.
     *
     * @param triggerType - The event type that triggers this chain
     * @param handler - Function that receives the trigger event and returns new events
     * @param options - Chain registration options (mode, key, priority)
     */
    chainEvent(triggerType: string, handler: EventChainHandler, options?: ChainEventOptions): void;
    applyEvent(event: ISemanticEvent): void;
    canApplyEvent(event: ISemanticEvent): boolean;
    previewEvent(event: ISemanticEvent): WorldChange[];
    getAppliedEvents(): ISemanticEvent[];
    getEventsSince(timestamp: number): ISemanticEvent[];
    clearEventHistory(): void;
    getScopeRegistry(): ScopeRegistry;
    addScopeRule(rule: IScopeRule): void;
    removeScopeRule(ruleId: string): boolean;
    evaluateScope(actorId: string, actionId?: string): string[];
    getGrammarVocabularyProvider(): IGrammarVocabularyProvider;
    directions(): DirectionVocabularyRegistry;
}
export declare class WorldModel implements IWorldModel {
    private entities;
    private state;
    private playerId;
    private spatialIndex;
    private config;
    private capabilities;
    private scoreLedger;
    private idCounters;
    private eventSystem;
    private serializer;
    private platformEvents?;
    private scopeRegistry;
    private scopeEvaluator;
    private grammarVocabularyProvider;
    private directionVocabularyRegistry;
    constructor(config?: WorldConfig, platformEvents?: ISemanticEventSource);
    private emitPlatformEvent;
    registerCapability(name: string, registration?: Partial<ICapabilityRegistration>): void;
    updateCapability(name: string, updates: Partial<ICapabilityData>): void;
    getCapability(name: string): ICapabilityData | undefined;
    hasCapability(name: string): boolean;
    private generateId;
    createEntity(displayName: string, type?: string): IFEntity;
    getEntity(id: string): IFEntity | undefined;
    hasEntity(id: string): boolean;
    removeEntity(id: string): boolean;
    getAllEntities(): IFEntity[];
    updateEntity(entityId: string, updater: (entity: IFEntity) => void): void;
    getLocation(entityId: string): string | undefined;
    getContents(containerId: string, options?: ContentsOptions): IFEntity[];
    moveEntity(entityId: string, targetId: string | null): boolean;
    canMoveEntity(entityId: string, targetId: string | null): boolean;
    getContainingRoom(entityId: string): IFEntity | undefined;
    getAllContents(entityId: string, options?: ContentsOptions): IFEntity[];
    getState(): WorldState;
    setState(state: WorldState): void;
    getStateValue(key: string): any;
    setStateValue(key: string, value: any): void;
    getPrompt(): GamePrompt;
    setPrompt(prompt: GamePrompt): void;
    findByTrait(traitType: TraitType): IFEntity[];
    findByType(entityType: string): IFEntity[];
    findWhere(predicate: (entity: IFEntity) => boolean): IFEntity[];
    private relationships;
    getRelated(entityId: string, relationshipType: string): string[];
    areRelated(entity1Id: string, entity2Id: string, relationshipType: string): boolean;
    addRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void;
    removeRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void;
    getTotalWeight(entityId: string): number;
    wouldCreateLoop(entityId: string, targetId: string): boolean;
    findPath(fromRoomId: string, toRoomId: string): string[] | null;
    getPlayer(): IFEntity | undefined;
    setPlayer(entityId: string): void;
    awardScore(id: string, points: number, description: string): boolean;
    revokeScore(id: string): boolean;
    hasScore(id: string): boolean;
    getScore(): number;
    getScoreEntries(): ScoreEntry[];
    setMaxScore(max: number): void;
    getMaxScore(): number;
    toJSON(): string;
    loadJSON(json: string): void;
    private getSerializableState;
    clear(): void;
    registerEventHandler(eventType: string, handler: EventHandler): void;
    unregisterEventHandler(eventType: string): void;
    registerEventValidator(eventType: string, validator: EventValidator): void;
    registerEventPreviewer(eventType: string, previewer: EventPreviewer): void;
    connectEventProcessor(wiring: IEventProcessorWiring): void;
    chainEvent(triggerType: string, handler: EventChainHandler, options?: ChainEventOptions): void;
    applyEvent(event: ISemanticEvent): void;
    canApplyEvent(event: ISemanticEvent): boolean;
    previewEvent(event: ISemanticEvent): WorldChange[];
    getAppliedEvents(): ISemanticEvent[];
    getEventsSince(timestamp: number): ISemanticEvent[];
    clearEventHistory(): void;
    getDataStore(): IDataStore;
    getScopeRegistry(): ScopeRegistry;
    getGrammarVocabularyProvider(): IGrammarVocabularyProvider;
    /**
     * Access the direction vocabulary registry.
     *
     * Stories call this to override direction words from a single point:
     * ```
     * world.directions().useVocabulary('naval');
     * ```
     */
    directions(): DirectionVocabularyRegistry;
    addScopeRule(rule: IScopeRule): void;
    removeScopeRule(ruleId: string): boolean;
    evaluateScope(actorId: string, actionId?: string): string[];
    /**
     * Register default scope rules for standard visibility
     */
    private registerDefaultScopeRules;
    /**
     * Get physically visible entities using VisibilityBehavior (line-of-sight)
     *
     * Returns entities that can actually be seen by the observer based on:
     * - Physical location (must be in same room)
     * - Container state (can't see inside closed opaque containers)
     * - Lighting conditions (limited visibility in darkness)
     * - Scenery visibility flags
     *
     * This is for perception and display purposes. For command resolution,
     * use getInScope() instead which includes entities that can be referenced
     * even if not visible.
     *
     * @param observerId - The entity doing the observing
     * @returns Array of entities that are physically visible
     */
    getVisible(observerId: string): IFEntity[];
    /**
     * Get entities in scope for command resolution using the scope system
     *
     * Returns entities that can be referenced in commands, including:
     * - All entities in the current room
     * - Items in containers (even closed ones)
     * - Carried items and their contents
     * - Entities made available by scope rules (e.g., through windows)
     *
     * This is for parser/command resolution. For physical visibility,
     * use getVisible() instead.
     *
     * @param observerId - The entity whose scope to evaluate
     * @returns Array of entities that can be referenced in commands
     */
    getInScope(observerId: string): IFEntity[];
    /**
     * Check if observer can physically see target (line-of-sight)
     *
     * Uses VisibilityBehavior to determine if target is visible based on:
     * - Physical location
     * - Container state
     * - Lighting conditions
     *
     * This is for perception checks. To check if an entity can be
     * referenced in commands, check if it's in getInScope() instead.
     *
     * @param observerId - The entity doing the observing
     * @param targetId - The entity being observed
     * @returns true if observer can see target
     */
    canSee(observerId: string, targetId: string): boolean;
    /**
     * Create a bidirectional connection between two rooms.
     * Sets exits in both directions (e.g. NORTH on room1, SOUTH on room2).
     */
    connectRooms(room1Id: string, room2Id: string, direction: DirectionType): void;
    /**
     * Create a door entity and wire it into both rooms' exit data.
     * The door is placed in room1 spatially (for scope resolution).
     */
    createDoor(displayName: string, opts: {
        room1Id: string;
        room2Id: string;
        direction: DirectionType;
        description?: string;
        aliases?: string[];
        isOpen?: boolean;
        isLocked?: boolean;
        keyId?: string;
    }): IFEntity;
}
```

### world/SpatialIndex

```typescript
export declare class SpatialIndex {
    private parentToChildren;
    private childToParent;
    addChild(parentId: string, childId: string): void;
    removeChild(parentId: string, childId: string): void;
    remove(entityId: string): void;
    getParent(childId: string): string | undefined;
    getChildren(parentId: string): string[];
    hasChildren(parentId: string): boolean;
    getAllDescendants(parentId: string, maxDepth?: number): string[];
    getAncestors(childId: string, maxDepth?: number): string[];
    clear(): void;
    toJSON(): any;
    loadJSON(data: any): void;
}
```

### world/VisibilityBehavior

```typescript
import { Behavior } from '../behaviors/behavior';
import { IFEntity } from '../entities/if-entity';
import { WorldModel } from './WorldModel';
/**
 * Standard capability ID for visibility control.
 * Entities can claim this capability to control their own visibility.
 */
export declare const VISIBILITY_CAPABILITY = "if.scope.visible";
export declare class VisibilityBehavior extends Behavior {
    static requiredTraits: never[];
    /**
     * Determines if a room is effectively dark (no usable light sources).
     * This is the single source of truth for darkness checking.
     *
     * A room is dark if:
     * 1. It has RoomTrait with isDark = true
     * 2. There are no accessible, active light sources
     *
     * @param room - The room entity to check
     * @param world - The world model
     * @returns true if the room is dark and has no accessible light sources
     */
    static isDark(room: IFEntity, world: WorldModel): boolean;
    /**
     * Determines if a light source entity is currently providing light.
     * Checks isLit property first, falls back to switchable state, defaults to lit.
     *
     * Priority order:
     * 1. Explicit isLit property (e.g., lit torch, extinguished candle)
     * 2. Switchable trait state (e.g., flashlight isOn: true)
     * 3. Default to lit (e.g., glowing gems, phosphorescent moss)
     */
    private static isLightActive;
    /**
     * Determines if an observer can see a target entity
     */
    static canSee(observer: IFEntity, target: IFEntity, world: WorldModel): boolean;
    /**
     * Gets all entities visible to an observer
     */
    static getVisible(observer: IFEntity, world: WorldModel): IFEntity[];
    /**
     * Recursively adds visible contents of a container/supporter/actor
     */
    private static addVisibleContents;
    /**
     * Checks if a room has any accessible, active light sources.
     * Handles nested containers, worn items, and various light source types.
     */
    private static hasLightSource;
    /**
     * Walks the containment chain from an entity upward, checking whether any
     * closed opaque container blocks the path.
     *
     * This is the single implementation of the container-walk algorithm used by
     * `isAccessible`, `hasLineOfSight`, and `isVisible`.
     *
     * At each hop:
     * - Actors are transparent (carried/worn items are always reachable)
     * - Opaque closed containers block
     * - Transparent containers, open containers, and non-openable opaque containers pass
     *
     * @param entityId - Starting entity to walk upward from
     * @param world - The world model
     * @param stopAtId - Stop when this ancestor is reached (e.g., the room).
     *                   If omitted, walks until reaching a room or the top of the tree.
     * @returns true if no closed opaque container blocks the path
     */
    private static isContainmentPathClear;
    /**
     * Checks if an entity is accessible from a room (not blocked by closed containers)
     */
    private static isAccessible;
    /**
     * Checks if there's a line of sight between observer and target.
     * Walks the target's containment chain to verify no closed opaque container
     * blocks visibility.
     */
    private static hasLineOfSight;
    /**
     * Checks if an entity is visible in its current context
     * (used for filtering queries)
     */
    static isVisible(entity: IFEntity, world: WorldModel): boolean;
    /**
     * Gets the location that should be described when an observer looks around.
     * Accounts for vehicle/container transparency:
     * - In a transparent vehicle → describe the room
     * - In an open container → describe the room
     * - In a closed container → describe the container
     * - In a room → describe the room
     *
     * @returns The entity to describe and optionally the immediate container
     */
    static getDescribableLocation(observer: IFEntity, world: WorldModel): {
        location: IFEntity;
        immediateContainer: IFEntity | null;
    };
}
```

### world/AuthorModel

```typescript
/**
 * AuthorModel — unrestricted world model access for authoring and setup.
 *
 * Public interface: Implements IWorldModel. Entity creation and movement
 * bypass validation. All other methods delegate to the backing WorldModel.
 *
 * Owner context: packages/world-model. Used during initializeWorld() for
 * setup that requires bypassing game rules (placing items in closed
 * containers, etc.).
 */
import { IFEntity } from '../entities/if-entity';
import { TraitType } from '../traits/trait-types';
import { SpatialIndex } from './SpatialIndex';
import { ITrait } from '../traits/trait';
import { ICapabilityStore } from './capabilities';
import type { IWorldModel, EventHandler, EventValidator, EventPreviewer, EventChainHandler, ChainEventOptions } from './WorldModel';
import type { ScoreEntry } from './ScoreLedger';
import type { ISemanticEvent } from '@sharpee/core';
import type { WorldState, ContentsOptions, WorldChange, IEventProcessorWiring, GamePrompt, IGrammarVocabularyProvider } from '@sharpee/if-domain';
import type { DirectionType } from '../constants/directions';
import { DirectionVocabularyRegistry } from '../constants/directions';
import type { ScopeRegistry } from '../scope/scope-registry';
import type { IScopeRule } from '../scope/scope-rule';
import type { ICapabilityData, ICapabilityRegistration } from './capabilities';
/**
 * Data store shared between WorldModel and AuthorModel.
 */
export interface IDataStore {
    entities: Map<string, IFEntity>;
    spatialIndex: SpatialIndex;
    state: Record<string, any>;
    playerId?: string;
    relationships: Map<string, Map<string, Set<string>>>;
    idCounters: Map<string, number>;
    capabilities: ICapabilityStore;
}
/**
 * Item specification for bulk creation.
 */
export interface IItemSpec {
    name: string;
    type?: string;
    attributes?: Record<string, any>;
    traits?: TraitType[];
}
/**
 * AuthorModel provides unrestricted access to the world state for authoring,
 * testing, and world setup. It bypasses validation rules for entity creation
 * and movement. All other IWorldModel methods delegate to the backing WorldModel.
 *
 * @example
 * ```typescript
 * const author = new AuthorModel(world.getDataStore(), world);
 * const medicine = author.createEntity('Aspirin', 'item');
 * author.moveEntity(medicine.id, closedCabinet.id); // Works even though closed
 * ```
 */
export declare class AuthorModel implements IWorldModel {
    private dataStore;
    private worldModel;
    constructor(dataStore: IDataStore, worldModel: IWorldModel);
    /**
     * Get the shared data store.
     */
    getDataStore(): IDataStore;
    /**
     * Create a new entity without validation.
     *
     * @param name - Display name for the entity
     * @param type - Entity type (room, item, actor, etc.)
     * @returns The created entity
     */
    createEntity(name: string, type?: string): IFEntity;
    /**
     * Move an entity without validation. Can move into closed/locked containers.
     *
     * @param entityId - ID of entity to move
     * @param targetId - ID of target location (null to remove from world)
     * @returns Always true (no validation to fail)
     */
    moveEntity(entityId: string, targetId: string | null): boolean;
    getEntity(id: string): IFEntity | undefined;
    hasEntity(id: string): boolean;
    removeEntity(id: string): boolean;
    getAllEntities(): IFEntity[];
    updateEntity(entityId: string, updater: (entity: IFEntity) => void): void;
    getLocation(entityId: string): string | undefined;
    getContents(containerId: string, options?: ContentsOptions): IFEntity[];
    canMoveEntity(entityId: string, targetId: string | null): boolean;
    getContainingRoom(entityId: string): IFEntity | undefined;
    getAllContents(entityId: string, options?: ContentsOptions): IFEntity[];
    getState(): WorldState;
    setState(state: WorldState): void;
    getStateValue(key: string): any;
    setStateValue(key: string, value: any): void;
    getPrompt(): GamePrompt;
    setPrompt(prompt: GamePrompt): void;
    findByTrait(traitType: TraitType): IFEntity[];
    findByType(entityType: string): IFEntity[];
    findWhere(predicate: (entity: IFEntity) => boolean): IFEntity[];
    getVisible(observerId: string): IFEntity[];
    getInScope(observerId: string): IFEntity[];
    canSee(observerId: string, targetId: string): boolean;
    getRelated(entityId: string, relationshipType: string): string[];
    areRelated(entity1Id: string, entity2Id: string, relationshipType: string): boolean;
    addRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void;
    removeRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void;
    getTotalWeight(entityId: string): number;
    wouldCreateLoop(entityId: string, targetId: string): boolean;
    findPath(fromRoomId: string, toRoomId: string): string[] | null;
    getPlayer(): IFEntity | undefined;
    setPlayer(entityId: string): void;
    connectRooms(room1Id: string, room2Id: string, direction: DirectionType): void;
    createDoor(displayName: string, opts: {
        room1Id: string;
        room2Id: string;
        direction: DirectionType;
        description?: string;
        aliases?: string[];
        isOpen?: boolean;
        isLocked?: boolean;
        keyId?: string;
    }): IFEntity;
    registerCapability(name: string, registration: Partial<ICapabilityRegistration>): void;
    updateCapability(name: string, data: Partial<ICapabilityData>): void;
    getCapability(name: string): ICapabilityData | undefined;
    hasCapability(name: string): boolean;
    awardScore(id: string, points: number, description: string): boolean;
    revokeScore(id: string): boolean;
    hasScore(id: string): boolean;
    getScore(): number;
    getScoreEntries(): ScoreEntry[];
    setMaxScore(max: number): void;
    getMaxScore(): number;
    toJSON(): string;
    loadJSON(json: string): void;
    clear(): void;
    registerEventHandler(eventType: string, handler: EventHandler): void;
    unregisterEventHandler(eventType: string): void;
    registerEventValidator(eventType: string, validator: EventValidator): void;
    registerEventPreviewer(eventType: string, previewer: EventPreviewer): void;
    connectEventProcessor(wiring: IEventProcessorWiring): void;
    chainEvent(triggerType: string, handler: EventChainHandler, options?: ChainEventOptions): void;
    applyEvent(event: ISemanticEvent): void;
    canApplyEvent(event: ISemanticEvent): boolean;
    previewEvent(event: ISemanticEvent): WorldChange[];
    getAppliedEvents(): ISemanticEvent[];
    getEventsSince(timestamp: number): ISemanticEvent[];
    clearEventHistory(): void;
    getScopeRegistry(): ScopeRegistry;
    addScopeRule(rule: IScopeRule): void;
    removeScopeRule(ruleId: string): boolean;
    evaluateScope(actorId: string, actionId?: string): string[];
    getGrammarVocabularyProvider(): IGrammarVocabularyProvider;
    directions(): DirectionVocabularyRegistry;
    /**
     * Move multiple entities to a container in one operation.
     */
    populate(containerId: string, entityIds: string[]): void;
    /**
     * Add a trait to an entity.
     */
    addTrait(entityId: string, trait: ITrait): void;
    /**
     * Remove a trait from an entity.
     */
    removeTrait(entityId: string, traitType: TraitType): void;
    private generateId;
}
```

### world/capabilities

```typescript
/**
 * Capability system types for Sharpee IF Platform
 *
 * Capabilities store game state that doesn't naturally fit in the entity-relationship model
 */
export interface ICapabilityData {
    [key: string]: any;
}
export interface ICapabilitySchema {
    [field: string]: {
        type: 'string' | 'number' | 'boolean' | 'array' | 'object';
        default?: any;
        required?: boolean;
    };
}
export interface ICapabilityStore {
    [capabilityName: string]: {
        data: ICapabilityData;
        schema?: ICapabilitySchema;
    };
}
export interface ICapabilityRegistration {
    name: string;
    schema: ICapabilitySchema;
    initialData?: ICapabilityData;
}
export declare const StandardCapabilities: {
    readonly SCORING: "scoring";
    readonly SAVE_RESTORE: "saveRestore";
    readonly CONVERSATION: "conversation";
    readonly GAME_META: "gameMeta";
    readonly COMMAND_HISTORY: "commandHistory";
    readonly DEBUG: "debug";
};
export type StandardCapabilityName = typeof StandardCapabilities[keyof typeof StandardCapabilities];
```

### scope/scope-rule

```typescript
/**
 * @file Scope Rule Interface
 * @description Defines rules for entity visibility and interaction scope
 */
/**
 * Context provided to scope rules for evaluation
 */
export interface IScopeContext {
    /** The world model instance */
    world: any;
    /** ID of the actor performing the action */
    actorId: string;
    /** ID of the action being performed (optional) */
    actionId?: string;
    /** Actor's current location ID */
    currentLocation: string;
}
/**
 * A rule that defines scope (what entities are available) in specific contexts
 */
export interface IScopeRule {
    /** Unique identifier for this rule */
    id: string;
    /** Location IDs where this rule applies, or '*' for all */
    fromLocations: string[] | '*';
    /** Entity IDs to include, or function to compute them */
    includeEntities: string[] | ((context: IScopeContext) => string[]);
    /** Location IDs whose contents become visible (optional) */
    includeLocations?: string[];
    /** Action IDs this rule applies to, or '*' for all (optional) */
    forActions?: string[] | '*';
    /** Condition that must be true for rule to apply (optional) */
    condition?: (context: IScopeContext) => boolean;
    /** Message to display when this rule grants visibility (optional) */
    message?: string | ((entityId: string, actionId: string) => string);
    /** Priority for rule ordering (higher = evaluated first) */
    priority?: number;
    /** Whether this rule is enabled */
    enabled?: boolean;
    /** Source of this rule (core, story, extension) */
    source?: string;
}
/**
 * Result of evaluating a scope rule
 */
export interface IScopeRuleResult {
    /** The rule that was evaluated */
    rule: IScopeRule;
    /** Entity IDs included by this rule */
    includedEntities: string[];
    /** Whether the rule's condition passed */
    conditionMet: boolean;
    /** Optional message from the rule */
    message?: string;
}
/**
 * Options for scope evaluation
 */
export interface IScopeEvaluationOptions {
    /** Whether to include debug information */
    debug?: boolean;
    /** Maximum number of rules to evaluate */
    maxRules?: number;
    /** Whether to cache results */
    cache?: boolean;
    /** Custom rule filter */
    ruleFilter?: (rule: IScopeRule) => boolean;
}
/**
 * Result of scope evaluation
 */
export interface IScopeEvaluationResult {
    /** All entity IDs in scope */
    entityIds: Set<string>;
    /** Rules that contributed entities */
    appliedRules: IScopeRuleResult[];
    /** Rules that were skipped due to conditions */
    skippedRules?: IScopeRule[];
    /** Performance metrics */
    metrics?: {
        rulesEvaluated: number;
        totalTime: number;
        cacheHits?: number;
    };
}
```

### scope/scope-registry

```typescript
/**
 * @file Scope Registry
 * @description Manages scope rules and provides registration/lookup
 */
import { IScopeRule, IScopeContext } from './scope-rule';
/**
 * Registry for managing scope rules
 */
export declare class ScopeRegistry {
    private rules;
    private rulesByLocation;
    private rulesByAction;
    private globalRules;
    /**
     * Add a scope rule to the registry
     */
    addRule(rule: IScopeRule): void;
    /**
     * Remove a scope rule
     */
    removeRule(ruleId: string): boolean;
    /**
     * Get a rule by ID
     */
    getRule(ruleId: string): IScopeRule | undefined;
    /**
     * Get all rules
     */
    getAllRules(): IScopeRule[];
    /**
     * Get rules applicable to a context
     */
    getApplicableRules(context: IScopeContext): IScopeRule[];
    /**
     * Enable or disable a rule
     */
    setRuleEnabled(ruleId: string, enabled: boolean): boolean;
    /**
     * Clear all rules
     */
    clear(): void;
    /**
     * Get rules by source
     */
    getRulesBySource(source: string): IScopeRule[];
    /**
     * Get statistics about registered rules
     */
    getStats(): {
        totalRules: number;
        enabledRules: number;
        disabledRules: number;
        globalRules: number;
        locationSpecificRules: number;
        actionSpecificRules: number;
        rulesBySource: Map<string, number>;
    };
}
```

### scope/scope-evaluator

```typescript
/**
 * @file Rule-Based Scope Evaluator
 * @description Evaluates scope rules to determine which entities are "in scope"
 * for a given actor at a given location.
 *
 * Pipeline role: PRE-PARSE — called via WorldModel.evaluateScope() →
 * VocabularyManager.updateScopeVocabulary() to populate the parser's entity
 * vocabulary before each turn. Stories can add/remove rules via
 * world.addScopeRule() / world.removeScopeRule().
 *
 * NOT the same as the parser's GrammarScopeResolver (grammar constraint
 * evaluation) or the stdlib's StandardScopeResolver (validation-phase entity
 * resolution with disambiguation).
 */
import { IScopeRule, IScopeContext, IScopeEvaluationOptions, IScopeEvaluationResult } from './scope-rule';
import { ScopeRegistry } from './scope-registry';
/**
 * Evaluates scope rules to determine what entities are in scope
 */
export declare class RuleScopeEvaluator {
    private registry;
    private cache;
    constructor(registry: ScopeRegistry);
    /**
     * Evaluate scope for a given context
     */
    evaluate(context: IScopeContext, options?: IScopeEvaluationOptions): IScopeEvaluationResult;
    /**
     * Evaluate a single rule
     */
    private evaluateRule;
    /**
     * Get entities in a location
     */
    private getEntitiesInLocation;
    /**
     * Generate cache key for a context
     */
    private getCacheKey;
    /**
     * Clear the cache
     */
    clearCache(): void;
    /**
     * Get standard scope (visible entities) for backward compatibility
     */
    getVisibleEntities(context: IScopeContext): string[];
    /**
     * Get touchable entities for backward compatibility
     */
    getTouchableEntities(context: IScopeContext): string[];
    /**
     * Check if a specific entity is in scope
     */
    isEntityInScope(entityId: string, context: IScopeContext): boolean;
    /**
     * Get scope with detailed rule information
     */
    getScopeWithDetails(context: IScopeContext): {
        entities: string[];
        ruleDetails: Map<string, {
            rule: IScopeRule;
            entities: string[];
            message?: string;
        }>;
    };
}
```

### events/types

```typescript
/**
 * Event types for the world-model event system
 *
 * Entity `on` handler types were removed in ISSUE-068.
 * For ADR-075 effect-returning story handlers, use StoryEventHandler
 * from @sharpee/event-processor.
 */
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Game event that can be handled by the story
 */
export interface IGameEvent extends ISemanticEvent {
    type: string;
    data: Record<string, any>;
}
/**
 * Simple event handler that receives an event and optionally returns reaction events.
 *
 * Used by the engine's EventEmitter for story-level daemons and event listeners.
 */
export type SimpleEventHandler = (event: IGameEvent) => void | ISemanticEvent[];
```

### capabilities/types

```typescript
/**
 * Capability dispatch types (ADR-090)
 *
 * Types for entity-centric action dispatch where traits declare
 * which verbs/actions they respond to.
 */
/**
 * Result from capability behavior validation.
 * Mirrors stdlib's ValidationResult for consistency.
 */
export interface CapabilityValidationResult {
    /** Whether the behavior can execute */
    valid: boolean;
    /** Error code if validation failed (for message lookup) */
    error?: string;
    /** Additional context for error messages */
    params?: Record<string, any>;
    /** Data to pass to execute/report phases */
    data?: Record<string, any>;
}
/**
 * Effect returned by capability behaviors.
 * Simplified version - actual emit() is in event-processor.
 */
export interface CapabilityEffect {
    /** Event type (e.g., 'if.event.lowered', 'action.blocked') */
    type: string;
    /** Event payload */
    payload: Record<string, any>;
}
/**
 * Helper to create effects (mirrors event-processor's emit)
 */
export declare function createEffect(type: string, payload: Record<string, any>): CapabilityEffect;
```

### capabilities/capability-behavior

```typescript
/**
 * Capability Behavior interface (ADR-090)
 *
 * Standard interface for behaviors that handle capability dispatch.
 * Follows the same 4-phase pattern as stdlib actions for consistency.
 */
import { IFEntity } from '../entities';
import { WorldModel } from '../world';
import { CapabilityValidationResult, CapabilityEffect } from './types';
/**
 * Shared data object for passing data between behavior phases.
 * Mirrors ActionContext.sharedData pattern from stdlib.
 */
export type CapabilitySharedData = Record<string, any>;
/**
 * Standard interface for capability behaviors.
 *
 * Behaviors implement this interface to handle specific capabilities
 * (action IDs) declared by traits. When a trait declares a capability,
 * a corresponding behavior must be registered to handle it.
 *
 * The 4-phase pattern mirrors stdlib actions:
 * 1. validate - Check if the action can be performed
 * 2. execute - Perform mutations (no events)
 * 3. report - Generate success events
 * 4. blocked - Generate failure events
 *
 * @example
 * ```typescript
 * const BasketLoweringBehavior: CapabilityBehavior = {
 *   validate(entity, world, actorId, sharedData) {
 *     const trait = entity.get(BasketElevatorTrait);
 *     if (trait.position === 'bottom') {
 *       return { valid: false, error: 'dungeo.basket.already_down' };
 *     }
 *     return { valid: true };
 *   },
 *
 *   execute(entity, world, actorId, sharedData) {
 *     const trait = entity.get(BasketElevatorTrait);
 *     trait.position = 'bottom';
 *     world.moveEntity(entity.id, trait.bottomRoomId);
 *     sharedData.playerTransported = true; // Pass data to report()
 *   },
 *
 *   report(entity, world, actorId, sharedData) {
 *     const transported = sharedData.playerTransported;
 *     return [createEffect('if.event.lowered', { target: entity.id })];
 *   },
 *
 *   blocked(entity, world, actorId, error, sharedData) {
 *     return [createEffect('if.event.lower_blocked', { messageId: error })];
 *   }
 * };
 * ```
 */
export interface CapabilityBehavior {
    /**
     * Phase 1: Validate whether the action can be performed.
     *
     * Check preconditions, state, and constraints. Return validation
     * result with error code if action cannot proceed.
     *
     * @param entity - The entity being acted upon
     * @param world - The world model for querying state
     * @param actorId - ID of the actor performing the action
     * @param sharedData - Mutable object for passing data between phases
     * @returns Validation result with optional error info
     */
    validate(entity: IFEntity, world: WorldModel, actorId: string, sharedData: CapabilitySharedData): CapabilityValidationResult;
    /**
     * Phase 2: Execute mutations.
     *
     * Perform all state changes. Do NOT emit events here - that's
     * the report phase's job. This separation enables clean rollback
     * and consistent event generation.
     *
     * @param entity - The entity being acted upon
     * @param world - The world model for mutations
     * @param actorId - ID of the actor performing the action
     * @param sharedData - Mutable object for passing data between phases
     */
    execute(entity: IFEntity, world: WorldModel, actorId: string, sharedData: CapabilitySharedData): void;
    /**
     * Phase 3: Report success.
     *
     * Generate effects describing what happened. Called after
     * execute() succeeds. Return events with appropriate message IDs.
     *
     * @param entity - The entity that was acted upon
     * @param world - The world model (post-mutation state)
     * @param actorId - ID of the actor who performed the action
     * @param sharedData - Mutable object for passing data between phases
     * @returns Array of effects to emit
     */
    report(entity: IFEntity, world: WorldModel, actorId: string, sharedData: CapabilitySharedData): CapabilityEffect[];
    /**
     * Phase 4: Report failure.
     *
     * Generate effects for when validation fails. Called instead
     * of execute()/report() when validate() returns invalid.
     *
     * @param entity - The entity that couldn't be acted upon
     * @param world - The world model
     * @param actorId - ID of the actor who attempted the action
     * @param error - Error code from validation result
     * @param sharedData - Mutable object for passing data between phases
     * @returns Array of effects to emit
     */
    blocked(entity: IFEntity, world: WorldModel, actorId: string, error: string, sharedData: CapabilitySharedData): CapabilityEffect[];
}
```

### capabilities/capability-registry

```typescript
/**
 * Capability Registry (ADR-090)
 *
 * Registry for trait-behavior bindings. Stories register behaviors
 * for their traits, and the dispatch system looks them up at runtime.
 */
import { ITrait } from '../traits/trait';
import { CapabilityBehavior } from './capability-behavior';
import { CapabilityResolution, CapabilityMode } from './capability-defaults';
/**
 * Options for registering a capability behavior.
 */
export interface BehaviorRegistrationOptions<T extends ITrait = ITrait> {
    /** Priority for resolution (higher = checked first). Default: 0 */
    priority?: number;
    /** Override global resolution strategy for this binding */
    resolution?: CapabilityResolution;
    /** Override global mode for this binding */
    mode?: CapabilityMode;
    /** Optional runtime validation */
    validateBinding?: (trait: T) => boolean;
}
/**
 * Binding between a trait type, capability, and behavior.
 */
export interface TraitBehaviorBinding<T extends ITrait = ITrait> {
    /** Trait type identifier */
    traitType: string;
    /** Action ID (capability) this binding handles */
    capability: string;
    /** The behavior that handles this trait+capability */
    behavior: CapabilityBehavior;
    /** Priority for resolution (higher = checked first) */
    priority: number;
    /** Override resolution strategy (undefined = use global default) */
    resolution?: CapabilityResolution;
    /** Override mode (undefined = use global default) */
    mode?: CapabilityMode;
    /** Optional runtime validation */
    validateBinding?: (trait: T) => boolean;
}
/**
 * Register a behavior for a trait+capability combination.
 *
 * Stories call this to register their behaviors during initialization.
 * Each trait+capability pair can only have one behavior registered.
 *
 * @param traitType - The trait type identifier (e.g., 'dungeo.trait.basket_elevator')
 * @param capability - The action ID (e.g., 'if.action.lowering')
 * @param behavior - The behavior implementation
 * @param options - Optional configuration (priority, resolution override, mode override)
 *
 * @example
 * ```typescript
 * // Basic registration (uses global defaults)
 * registerCapabilityBehavior(
 *   BasketElevatorTrait.type,
 *   'if.action.lowering',
 *   BasketLoweringBehavior
 * );
 *
 * // With priority and overrides
 * registerCapabilityBehavior(
 *   TrollAxeTrait.type,
 *   'if.action.taking',
 *   TrollAxeTakingBehavior,
 *   { priority: 100, resolution: 'any-blocks' }
 * );
 * ```
 */
export declare function registerCapabilityBehavior<T extends ITrait>(traitType: string, capability: string, behavior: CapabilityBehavior, options?: BehaviorRegistrationOptions<T>): void;
/**
 * Get behavior for a trait instance and capability.
 *
 * Called by capability-dispatch actions to find the right behavior.
 *
 * @param trait - The trait instance
 * @param capability - The action ID
 * @returns The behavior, or undefined if not registered
 */
export declare function getBehaviorForCapability(trait: ITrait, capability: string): CapabilityBehavior | undefined;
/**
 * Get the full binding for a trait instance and capability.
 *
 * Includes priority and configuration overrides. Used by dispatch helper
 * for resolution logic.
 *
 * @param trait - The trait instance
 * @param capability - The action ID
 * @returns The binding, or undefined if not registered
 */
export declare function getBehaviorBinding(trait: ITrait, capability: string): TraitBehaviorBinding | undefined;
/**
 * Check if a behavior is registered for a trait+capability.
 *
 * @param traitType - The trait type identifier
 * @param capability - The action ID
 */
export declare function hasCapabilityBehavior(traitType: string, capability: string): boolean;
/**
 * Unregister a behavior (primarily for testing).
 *
 * @param traitType - The trait type identifier
 * @param capability - The action ID
 */
export declare function unregisterCapabilityBehavior(traitType: string, capability: string): void;
/**
 * Clear all registered behaviors (for testing).
 */
export declare function clearCapabilityRegistry(): void;
/**
 * Get all registered bindings (for debugging/introspection).
 */
export declare function getAllCapabilityBindings(): Map<string, TraitBehaviorBinding>;
```

### capabilities/capability-defaults

```typescript
/**
 * Capability Defaults (ADR-090 Extension)
 *
 * Global configuration for how capabilities are resolved when multiple
 * entities claim the same capability. Stories can override per-registration.
 */
/**
 * Resolution strategy when multiple entities claim the same capability.
 */
export type CapabilityResolution = 'first-wins' | 'any-blocks' | 'all-must-pass' | 'highest-priority';
/**
 * How the capability validation result affects the action.
 */
export type CapabilityMode = 'blocking' | 'advisory' | 'chain';
/**
 * Configuration for a capability.
 */
export interface CapabilityConfig {
    /** How to resolve multiple entities claiming this capability */
    resolution: CapabilityResolution;
    /** How validation result affects the action */
    mode: CapabilityMode;
}
/**
 * Define default configuration for a capability.
 *
 * Called during platform or story initialization to set how a capability
 * should behave when multiple entities claim it.
 *
 * @param capabilityId - The capability ID (e.g., 'if.scope.visible', 'if.action.taking')
 * @param config - Partial config, missing values use defaults
 *
 * @example
 * ```typescript
 * // Visibility should block if ANY entity says it's hidden
 * defineCapabilityDefaults('if.scope.visible', {
 *   resolution: 'any-blocks',
 *   mode: 'blocking'
 * });
 * ```
 */
export declare function defineCapabilityDefaults(capabilityId: string, config: Partial<CapabilityConfig>): void;
/**
 * Get configuration for a capability.
 *
 * Returns the registered config or defaults if not registered.
 *
 * @param capabilityId - The capability ID
 * @returns The capability configuration
 */
export declare function getCapabilityConfig(capabilityId: string): CapabilityConfig;
/**
 * Check if a capability has explicit defaults defined.
 *
 * @param capabilityId - The capability ID
 * @returns true if defaults have been defined
 */
export declare function hasCapabilityDefaults(capabilityId: string): boolean;
/**
 * Clear all capability defaults (for testing).
 */
export declare function clearCapabilityDefaults(): void;
/**
 * Get all defined capability defaults (for debugging/introspection).
 */
export declare function getAllCapabilityDefaults(): Map<string, CapabilityConfig>;
```

### capabilities/capability-helpers

```typescript
/**
 * Capability Helpers (ADR-090)
 *
 * Helper functions for working with trait capabilities.
 * Used by capability-dispatch actions to find and check capabilities.
 */
import { ITrait } from '../traits/trait';
import { IFEntity } from '../entities';
/**
 * Find a trait on the entity that declares the given capability.
 *
 * Entity resolution (which entity "lower X" refers to) is handled
 * by the parser using scope math. Once resolved to a specific entity,
 * this function finds the trait that handles the action.
 *
 * @param entity - The entity to search
 * @param actionId - The action ID (capability) to find
 * @returns The trait that claims the capability, or undefined
 *
 * @example
 * ```typescript
 * const trait = findTraitWithCapability(basket, 'if.action.lowering');
 * if (trait) {
 *   const behavior = getBehaviorForCapability(trait, 'if.action.lowering');
 *   // ... dispatch to behavior
 * }
 * ```
 */
export declare function findTraitWithCapability(entity: IFEntity, actionId: string): ITrait | undefined;
/**
 * Check if an entity has any trait claiming a capability.
 *
 * @param entity - The entity to check
 * @param actionId - The action ID (capability) to check for
 * @returns True if entity has a trait with this capability
 *
 * @example
 * ```typescript
 * if (hasCapability(entity, 'if.action.lowering')) {
 *   // Entity can be lowered
 * }
 * ```
 */
export declare function hasCapability(entity: IFEntity, actionId: string): boolean;
/**
 * Get all capabilities declared by an entity's traits.
 *
 * @param entity - The entity to inspect
 * @returns Array of action IDs the entity can handle
 */
export declare function getEntityCapabilities(entity: IFEntity): string[];
/**
 * Type guard to check if a trait has a specific capability.
 *
 * @param trait - The trait to check
 * @param actionId - The action ID to check for
 * @param traitType - Optional: specific trait class to narrow to
 * @returns True if trait has the capability (and is of specified type)
 *
 * @example
 * ```typescript
 * if (traitHasCapability(trait, 'if.action.lowering', BasketElevatorTrait)) {
 *   // trait is narrowed to BasketElevatorTrait
 *   console.log(trait.position);
 * }
 * ```
 */
export declare function traitHasCapability<T extends ITrait>(trait: ITrait, actionId: string, traitType?: new (...args: any[]) => T): trait is T;
/**
 * Find all traits on an entity that have capabilities.
 *
 * @param entity - The entity to inspect
 * @returns Array of traits that declare at least one capability
 */
export declare function getCapableTraits(entity: IFEntity): ITrait[];
```

### capabilities/entity-builder

```typescript
/**
 * Type-Safe Entity Builder (ADR-090)
 *
 * Builder pattern for creating entities with compile-time capability
 * conflict detection. When two traits claim the same capability,
 * TypeScript will error (and runtime will throw as backup).
 */
import { IFEntity } from '../entities';
import { ITrait } from '../traits/trait';
/**
 * Type-safe entity builder that tracks claimed capabilities.
 *
 * Provides runtime checks for capability conflicts. TypeScript's
 * type system can catch conflicts at compile time when traits
 * declare capabilities with `as const`.
 *
 * @example
 * ```typescript
 * const basket = new EntityBuilder(entity)
 *   .add(new IdentityTrait({ name: 'basket' }))
 *   .add(new ContainerTrait())
 *   .add(new BasketElevatorTrait({ ... }))  // claims: lowering, raising
 *   .build();
 *
 * // Runtime error - duplicate capability:
 * const bad = new EntityBuilder(entity)
 *   .add(new BasketElevatorTrait({ ... }))  // claims: lowering
 *   .add(new MirrorPoleTrait({ ... }))      // also claims: lowering
 *   .build();  // throws!
 * ```
 */
export declare class EntityBuilder {
    private entity;
    private claimedCaps;
    constructor(entity: IFEntity);
    /**
     * Add a trait to the entity.
     *
     * Checks for capability conflicts at runtime. If two traits
     * claim the same capability, throws an error.
     *
     * @param trait - The trait to add
     * @returns This builder for chaining
     * @throws Error if capability conflict detected
     */
    add<T extends ITrait>(trait: T): this;
    /**
     * Build and return the entity.
     */
    build(): IFEntity;
    /**
     * Get all capabilities claimed so far.
     */
    getClaimedCapabilities(): string[];
    /**
     * Find which trait claimed a capability.
     */
    private findTraitWithCapability;
}
/**
 * Create an entity builder for type-safe trait composition.
 *
 * This is a convenience function that wraps an existing entity
 * in a builder. Use when you want capability conflict checking.
 *
 * @param entity - The entity to wrap
 * @returns A new EntityBuilder
 *
 * @example
 * ```typescript
 * const basket = buildEntity(world.createEntity('basket', EntityType.CONTAINER))
 *   .add(new IdentityTrait({ name: 'rusty iron basket' }))
 *   .add(new ContainerTrait({ capacity: { maxItems: 10 } }))
 *   .add(new BasketElevatorTrait({ ... }))
 *   .build();
 * ```
 */
export declare function buildEntity(entity: IFEntity): EntityBuilder;
```

### capabilities/action-interceptor

```typescript
/**
 * Action Interceptor interface (ADR-118)
 *
 * Interceptors allow entities to hook into stdlib action phases
 * without replacing standard logic. This is the "Before/After" pattern
 * from Inform 6/7, complementing the full delegation pattern in
 * capability behaviors.
 *
 * Key difference from CapabilityBehavior:
 * - CapabilityBehavior: Full delegation, trait owns ALL logic (LOWER, RAISE)
 * - ActionInterceptor: Hooks into phases, action owns core logic (ENTER, PUT)
 */
import { IFEntity } from '../entities';
import { WorldModel } from '../world';
import { CapabilityEffect } from './types';
/**
 * Shared data object for passing data between interceptor phases.
 * Mirrors CapabilitySharedData pattern from capability-behavior.ts.
 *
 * Interceptors can store data here during earlier phases (e.g., postValidate)
 * and access it in later phases (e.g., postExecute, postReport).
 */
export type InterceptorSharedData = Record<string, unknown>;
/**
 * Result from interceptor validation hooks.
 * Returning null means "continue with standard logic".
 * Returning a result blocks or modifies the action.
 */
export interface InterceptorResult {
    /** Whether the action can proceed */
    valid: boolean;
    /** Error code if validation failed (for message lookup) */
    error?: string;
    /** Additional context for error messages */
    params?: Record<string, unknown>;
}
/**
 * Action interceptor interface.
 *
 * Interceptors hook into stdlib action phases to customize behavior
 * without reimplementing standard logic. All hooks are optional.
 *
 * Phase order:
 * 1. preValidate - Before standard validation
 * 2. (standard validation runs)
 * 3. postValidate - After standard validation passes
 * 4. (standard execute runs)
 * 5. postExecute - After standard execution
 * 6. (standard report runs)
 * 7. postReport - Additional effects after standard report
 *
 * If validation fails at any point:
 * - onBlocked - Called instead of execute/report phases
 *
 * @example
 * ```typescript
 * // Boat puncture interceptor - checks for sharp objects when entering
 * const InflatableEnteringInterceptor: ActionInterceptor = {
 *   postValidate(entity, world, actorId, sharedData) {
 *     const inventory = world.getContents(actorId);
 *     const sharpObject = inventory.find(item => item.puncturesBoat);
 *     if (sharpObject) {
 *       sharedData.willPuncture = true;
 *       sharedData.punctureItem = sharpObject.name;
 *     }
 *     return null; // Allow entering to proceed
 *   },
 *
 *   postExecute(entity, world, actorId, sharedData) {
 *     if (!sharedData.willPuncture) return;
 *     // Deflate the boat, eject player
 *     const trait = entity.get(InflatableTrait);
 *     trait.isInflated = false;
 *     world.moveEntity(actorId, world.getLocation(entity.id));
 *   },
 *
 *   postReport(entity, world, actorId, sharedData) {
 *     if (!sharedData.willPuncture) return [];
 *     return [createEffect('dungeo.boat.punctured', { item: sharedData.punctureItem })];
 *   }
 * };
 * ```
 */
export interface ActionInterceptor {
    /**
     * Called BEFORE standard validation.
     *
     * Use this to block actions early based on entity-specific conditions.
     * Return an InterceptorResult to block the action.
     * Return null to continue with standard validation.
     *
     * @example
     * // Troll blocks entering the Troll Room
     * preValidate(entity, world, actorId, sharedData) {
     *   if (trollIsAlive(world)) {
     *     return { valid: false, error: 'dungeo.troll.blocks_path' };
     *   }
     *   return null;
     * }
     */
    preValidate?(entity: IFEntity, world: WorldModel, actorId: string, sharedData: InterceptorSharedData): InterceptorResult | null;
    /**
     * Called AFTER standard validation passes.
     *
     * Use this to add entity-specific conditions that should block
     * an otherwise valid action, or to set up data for postExecute.
     * Return an InterceptorResult to block the action.
     * Return null to continue with execution.
     *
     * @example
     * // Check if player is carrying something that will puncture the boat
     * postValidate(entity, world, actorId, sharedData) {
     *   const sharp = findSharpObject(world, actorId);
     *   if (sharp) {
     *     sharedData.willPuncture = true;
     *     sharedData.punctureItem = sharp.name;
     *   }
     *   return null; // Still allow entering
     * }
     */
    postValidate?(entity: IFEntity, world: WorldModel, actorId: string, sharedData: InterceptorSharedData): InterceptorResult | null;
    /**
     * Called AFTER standard execution completes.
     *
     * Use this to perform additional mutations based on the action.
     * Cannot prevent the action (use postValidate for that).
     * Access data stored in sharedData during validation phases.
     *
     * @example
     * // Glacier melts when torch is thrown at it
     * postExecute(entity, world, actorId, sharedData) {
     *   if (!sharedData.willMelt) return;
     *   meltGlacier(world, entity.id);
     *   openPassage(world, 'glacier-passage');
     * }
     */
    postExecute?(entity: IFEntity, world: WorldModel, actorId: string, sharedData: InterceptorSharedData): void;
    /**
     * Called AFTER standard report.
     *
     * Return additional effects to emit after the standard effects.
     * Return empty array if no additional effects needed.
     *
     * @example
     * // Add glacier melting message
     * postReport(entity, world, actorId, sharedData) {
     *   if (!sharedData.melted) return [];
     *   return [createEffect('dungeo.glacier.melted', { messageId: 'dungeo.glacier.melts' })];
     * }
     */
    postReport?(entity: IFEntity, world: WorldModel, actorId: string, sharedData: InterceptorSharedData): CapabilityEffect[];
    /**
     * Called when action is blocked (validation failed).
     *
     * Use this to provide custom blocked handling for this entity.
     * Return effects to emit, or null to use standard blocked handling.
     *
     * @example
     * // Custom message when troll blocks entry
     * onBlocked(entity, world, actorId, error, sharedData) {
     *   if (error === 'dungeo.troll.blocks_path') {
     *     return [createEffect('game.message', { messageId: 'dungeo.troll.snarls' })];
     *   }
     *   return null; // Use standard blocked handling
     * }
     */
    onBlocked?(entity: IFEntity, world: WorldModel, actorId: string, error: string, sharedData: InterceptorSharedData): CapabilityEffect[] | null;
}
```

### capabilities/interceptor-registry

```typescript
/**
 * Interceptor Registry (ADR-118)
 *
 * Registry for trait-interceptor bindings. Stories register interceptors
 * for their traits, and stdlib actions look them up at runtime.
 *
 * Mirrors capability-registry.ts pattern but for interceptors instead
 * of full-delegation behaviors.
 */
import { ITrait } from '../traits/trait';
import { ActionInterceptor } from './action-interceptor';
/**
 * Options for registering an action interceptor.
 */
export interface InterceptorRegistrationOptions {
    /** Priority for resolution (higher = checked first). Default: 0 */
    priority?: number;
}
/**
 * Binding between a trait type, action, and interceptor.
 */
export interface TraitInterceptorBinding {
    /** Trait type identifier */
    traitType: string;
    /** Action ID this interceptor handles */
    actionId: string;
    /** The interceptor that handles this trait+action */
    interceptor: ActionInterceptor;
    /** Priority for resolution (higher = checked first) */
    priority: number;
}
/**
 * Register an interceptor for a trait+action combination.
 *
 * Stories call this to register their interceptors during initialization.
 * Each trait+action pair can only have one interceptor registered.
 *
 * @param traitType - The trait type identifier (e.g., 'dungeo.trait.inflatable')
 * @param actionId - The action ID (e.g., 'if.action.entering')
 * @param interceptor - The interceptor implementation
 * @param options - Optional configuration (priority)
 *
 * @example
 * ```typescript
 * // Register boat puncture interceptor
 * registerActionInterceptor(
 *   InflatableTrait.type,
 *   'if.action.entering',
 *   InflatableEnteringInterceptor
 * );
 *
 * // With priority
 * registerActionInterceptor(
 *   TrollGuardianTrait.type,
 *   'if.action.going',
 *   TrollGoingInterceptor,
 *   { priority: 100 }
 * );
 * ```
 */
export declare function registerActionInterceptor(traitType: string, actionId: string, interceptor: ActionInterceptor, options?: InterceptorRegistrationOptions): void;
/**
 * Result from looking up an interceptor for an entity+action.
 */
export interface InterceptorLookupResult {
    /** The interceptor */
    interceptor: ActionInterceptor;
    /** The trait that declared this interceptor */
    trait: ITrait;
    /** The binding metadata */
    binding: TraitInterceptorBinding;
}
/**
 * Get interceptor for an entity and action.
 *
 * Finds a trait on the entity that has an interceptor registered for
 * the given action. Looks up by trait type string in the registry.
 *
 * @param entity - The entity to check
 * @param actionId - The action ID
 * @returns The interceptor and trait, or undefined if not found
 *
 * @example
 * ```typescript
 * const result = getInterceptorForAction(boat, 'if.action.entering');
 * if (result) {
 *   const { interceptor, trait, binding } = result;
 *   // Call interceptor hooks during action execution
 * }
 * ```
 */
export declare function getInterceptorForAction(entity: {
    traits: Map<string, ITrait>;
}, actionId: string): InterceptorLookupResult | undefined;
/**
 * Get the interceptor binding for a trait type and action.
 *
 * @param traitType - The trait type identifier
 * @param actionId - The action ID
 * @returns The binding, or undefined if not registered
 */
export declare function getInterceptorBinding(traitType: string, actionId: string): TraitInterceptorBinding | undefined;
/**
 * Check if an interceptor is registered for a trait+action.
 *
 * @param traitType - The trait type identifier
 * @param actionId - The action ID
 */
export declare function hasActionInterceptor(traitType: string, actionId: string): boolean;
/**
 * Unregister an interceptor (primarily for testing).
 *
 * @param traitType - The trait type identifier
 * @param actionId - The action ID
 */
export declare function unregisterActionInterceptor(traitType: string, actionId: string): void;
/**
 * Clear all registered interceptors (for testing).
 */
export declare function clearInterceptorRegistry(): void;
/**
 * Get all registered interceptor bindings (for debugging/introspection).
 */
export declare function getAllInterceptorBindings(): Map<string, TraitInterceptorBinding>;
```

### capabilities/interceptor-helpers

```typescript
/**
 * Interceptor Helpers (ADR-118)
 *
 * Helper functions for working with trait interceptors.
 * Mirrors capability-helpers.ts pattern but for interceptors.
 */
import { ITrait } from '../traits/trait';
import { IFEntity } from '../entities';
/**
 * Find a trait on the entity that has an interceptor registered for the given action.
 *
 * Note: This checks both the static `interceptors` declaration on the trait class
 * AND the registry. Use this when you need the trait instance.
 *
 * @param entity - The entity to search
 * @param actionId - The action ID to find
 * @returns The trait that has an interceptor registered, or undefined
 *
 * @example
 * ```typescript
 * const trait = findTraitWithInterceptor(boat, 'if.action.entering');
 * if (trait) {
 *   // Entity has an interceptor for entering
 * }
 * ```
 */
export declare function findTraitWithInterceptor(entity: IFEntity, actionId: string): ITrait | undefined;
/**
 * Check if an entity has any trait declaring an interceptor for an action.
 *
 * @param entity - The entity to check
 * @param actionId - The action ID to check for
 * @returns True if entity has a trait with this interceptor
 *
 * @example
 * ```typescript
 * if (hasInterceptor(entity, 'if.action.entering')) {
 *   // Entity can intercept entering actions
 * }
 * ```
 */
export declare function hasInterceptor(entity: IFEntity, actionId: string): boolean;
/**
 * Get all interceptor action IDs declared by an entity's traits.
 *
 * @param entity - The entity to inspect
 * @returns Array of action IDs the entity intercepts
 */
export declare function getEntityInterceptors(entity: IFEntity): string[];
/**
 * Type guard to check if a trait declares a specific interceptor.
 *
 * @param trait - The trait to check
 * @param actionId - The action ID to check for
 * @param traitType - Optional: specific trait class to narrow to
 * @returns True if trait has the interceptor (and is of specified type)
 *
 * @example
 * ```typescript
 * if (traitHasInterceptor(trait, 'if.action.entering', InflatableTrait)) {
 *   // trait is narrowed to InflatableTrait
 *   console.log(trait.isInflated);
 * }
 * ```
 */
export declare function traitHasInterceptor<T extends ITrait>(trait: ITrait, actionId: string, traitType?: new (...args: unknown[]) => T): trait is T;
/**
 * Find all traits on an entity that have interceptors.
 *
 * @param entity - The entity to inspect
 * @returns Array of traits that declare at least one interceptor
 */
export declare function getInterceptorTraits(entity: IFEntity): ITrait[];
```

### annotations/types

```typescript
/**
 * Entity Annotations (ADR-124)
 *
 * Presentation metadata attached to entities. Annotations are separate from
 * traits — they carry UI hints that the engine ignores and clients interpret.
 */
/**
 * A single annotation on an entity.
 * Annotations are keyed by kind (e.g., 'illustration', 'portrait', 'voice').
 */
export interface Annotation {
    /** The annotation kind — groups annotations by purpose */
    kind: string;
    /** Unique identifier within entity+kind */
    id: string;
    /** Kind-specific payload (clients interpret this) */
    data: Record<string, unknown>;
    /** Optional condition — when absent, annotation is always active */
    condition?: AnnotationCondition;
}
/**
 * Pure-data condition evaluated against trait state.
 * No callbacks — serializable and evaluable at any time.
 */
export interface AnnotationCondition {
    /** Trait type to check (e.g., 'switchable', 'custom') */
    trait: string;
    /** Property name on the trait */
    property: string;
    /** Expected value (strict equality) */
    value: unknown;
    /** Which entity to check: self (default), player, or location */
    scope?: 'self' | 'player' | 'location';
}
```
