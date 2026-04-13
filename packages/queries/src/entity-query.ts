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
export class EntityQuery implements Iterable<IFEntity> {
  private readonly items: IFEntity[];

  constructor(items: IFEntity[]) {
    this.items = items;
  }

  // ── Filtering ──────────────────────────────────────────────────────────

  /**
   * Filter entities by predicate.
   *
   * @param predicate - Test function applied to each entity
   * @returns New EntityQuery containing only entities where predicate returns true
   */
  where(predicate: (entity: IFEntity) => boolean): EntityQuery {
    return new EntityQuery(this.items.filter(predicate));
  }

  /**
   * Filter to entities that have a specific trait.
   *
   * @param traitType - The trait type to check for
   * @returns New EntityQuery containing only entities with the trait
   */
  withTrait(traitType: TraitType | string): EntityQuery {
    return new EntityQuery(this.items.filter(e => e.has(traitType as TraitType)));
  }

  /**
   * Filter to entities that do NOT have a specific trait.
   *
   * @param traitType - The trait type to exclude
   * @returns New EntityQuery containing only entities without the trait
   */
  withoutTrait(traitType: TraitType | string): EntityQuery {
    return new EntityQuery(this.items.filter(e => !e.has(traitType as TraitType)));
  }

  /**
   * Filter to entities of a specific EntityType.
   *
   * @param entityType - The entity type string (e.g., 'room', 'object')
   * @returns New EntityQuery containing only entities of that type
   */
  ofType(entityType: string): EntityQuery {
    return new EntityQuery(this.items.filter(e => e.type === entityType));
  }

  /**
   * Filter to entities whose IdentityTrait.name matches exactly (case-sensitive).
   * Entities without an IdentityTrait are silently excluded.
   *
   * @param name - The exact name to match
   * @returns New EntityQuery containing only matching entities
   */
  named(name: string): EntityQuery {
    return new EntityQuery(this.items.filter(e => {
      const identity = e.get('identity' as TraitType);
      return identity && (identity as { name?: string }).name === name;
    }));
  }

  /**
   * Filter to entities whose name or aliases contain the term (case-insensitive).
   * Entities without an IdentityTrait are silently excluded.
   *
   * @param term - The search term (case-insensitive substring match)
   * @returns New EntityQuery containing matching entities
   */
  matching(term: string): EntityQuery {
    const lower = term.toLowerCase();
    return new EntityQuery(this.items.filter(e => {
      const identity = e.get('identity' as TraitType) as { name?: string; aliases?: string[] } | undefined;
      if (!identity) return false;
      if (identity.name && identity.name.toLowerCase().includes(lower)) return true;
      if (identity.aliases) {
        return identity.aliases.some(a => a.toLowerCase().includes(lower));
      }
      return false;
    }));
  }

  /**
   * Filter to entities that are portable (no SceneryTrait).
   *
   * @returns New EntityQuery containing only non-scenery entities
   */
  portable(): EntityQuery {
    return new EntityQuery(this.items.filter(e => !e.has('scenery' as TraitType)));
  }

  /**
   * Filter to entities visible to an observer.
   * Delegates to the world model's visibility calculation.
   *
   * @param observerId - The observer entity ID
   * @param world - The world model (needed for visibility calculation)
   * @returns New EntityQuery containing only visible entities
   */
  visibleTo(observerId: string, world: { getVisible(id: string): IFEntity[] }): EntityQuery {
    const visibleIds = new Set(world.getVisible(observerId).map(e => e.id));
    return new EntityQuery(this.items.filter(e => visibleIds.has(e.id)));
  }

  // ── Spatial/Temporal Filters (ADR-149 forward) ─────────────────────────

  /**
   * Filter rooms to those in a region (traverses parent hierarchy).
   * Returns empty query until ADR-149 provides RegionTrait.
   *
   * @param regionId - The region entity ID
   * @param world - The world model (needed for region traversal)
   * @returns New EntityQuery containing rooms in the region
   */
  inRegion(regionId: string, world: { isInRegion?(entityId: string, regionId: string): boolean }): EntityQuery {
    if (!world.isInRegion) return new EntityQuery([]);
    return new EntityQuery(this.items.filter(e => world.isInRegion!(e.id, regionId)));
  }

  /**
   * Filter to entities located in rooms belonging to a region.
   * Returns empty query until ADR-149 provides RegionTrait.
   *
   * @param regionId - The region entity ID
   * @param world - The world model (needed for region and location lookup)
   * @returns New EntityQuery containing entities within the region
   */
  withinRegion(
    regionId: string,
    world: { isInRegion?(entityId: string, regionId: string): boolean; getLocation(entityId: string): string | null },
  ): EntityQuery {
    if (!world.isInRegion) return new EntityQuery([]);
    return new EntityQuery(this.items.filter(e => {
      const loc = world.getLocation(e.id);
      return loc !== null && world.isInRegion!(loc, regionId);
    }));
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  /**
   * Return the first entity, or undefined if empty.
   */
  first(): IFEntity | undefined {
    return this.items[0];
  }

  /**
   * Return the first entity, or throw if empty.
   *
   * @param message - Optional error message
   * @throws Error if the query is empty
   */
  firstOrThrow(message?: string): IFEntity {
    if (this.items.length === 0) {
      throw new Error(message ?? 'Expected at least one entity, found none');
    }
    return this.items[0];
  }

  /**
   * Return exactly one entity. Throws if zero or more than one.
   *
   * @throws Error if count is not exactly 1
   */
  single(): IFEntity {
    if (this.items.length === 0) {
      throw new Error('Expected exactly one entity, found none');
    }
    if (this.items.length > 1) {
      throw new Error(`Expected exactly one entity, found ${this.items.length}`);
    }
    return this.items[0];
  }

  /**
   * Return the last entity, or undefined if empty.
   */
  last(): IFEntity | undefined {
    return this.items[this.items.length - 1];
  }

  /**
   * Return entity at index, or undefined if out of bounds.
   *
   * @param index - Zero-based index
   */
  at(index: number): IFEntity | undefined {
    return this.items[index];
  }

  // ── Aggregation ────────────────────────────────────────────────────────

  /**
   * True if any entity matches the optional predicate.
   * If no predicate, true if the query is non-empty.
   */
  any(predicate?: (entity: IFEntity) => boolean): boolean {
    if (!predicate) return this.items.length > 0;
    return this.items.some(predicate);
  }

  /**
   * True if all entities match the predicate.
   * Returns true for empty collections (vacuous truth).
   */
  all(predicate: (entity: IFEntity) => boolean): boolean {
    return this.items.every(predicate);
  }

  /**
   * True if no entities match the optional predicate.
   * If no predicate, true if the query is empty.
   */
  none(predicate?: (entity: IFEntity) => boolean): boolean {
    if (!predicate) return this.items.length === 0;
    return !this.items.some(predicate);
  }

  /**
   * Count of entities, optionally matching a predicate.
   */
  count(predicate?: (entity: IFEntity) => boolean): number {
    if (!predicate) return this.items.length;
    return this.items.filter(predicate).length;
  }

  // ── Transformation ─────────────────────────────────────────────────────

  /**
   * Project entities to a new form.
   *
   * @param selector - Transform function applied to each entity
   * @returns Array of transformed values
   */
  select<T>(selector: (entity: IFEntity) => T): T[] {
    return this.items.map(selector);
  }

  /**
   * Project and flatten.
   *
   * @param selector - Transform function returning an array per entity
   * @returns Flattened array of all results
   */
  selectMany<T>(selector: (entity: IFEntity) => T[]): T[] {
    const result: T[] = [];
    for (const item of this.items) {
      result.push(...selector(item));
    }
    return result;
  }

  /**
   * Extract a specific trait from all entities (undefined for those lacking it).
   *
   * @param traitType - The trait type to extract
   * @returns Array of trait instances or undefined
   */
  traits<T>(traitType: TraitType | string): (T | undefined)[] {
    return this.items.map(e => e.get(traitType as TraitType) as T | undefined);
  }

  /**
   * Extract a specific trait, filtering out entities that lack it.
   *
   * @param traitType - The trait type to extract
   * @returns Array of trait instances (no undefined values)
   */
  traitsOf<T>(traitType: TraitType | string): T[] {
    const result: T[] = [];
    for (const item of this.items) {
      const trait = item.get(traitType as TraitType);
      if (trait !== undefined) {
        result.push(trait as T);
      }
    }
    return result;
  }

  // ── Ordering ───────────────────────────────────────────────────────────

  /**
   * Sort entities by a key function.
   *
   * @param keyFn - Function that extracts the sort key
   * @param direction - 'asc' (default) or 'desc'
   * @returns New EntityQuery in sorted order
   */
  orderBy<K>(keyFn: (entity: IFEntity) => K, direction: 'asc' | 'desc' = 'asc'): EntityQuery {
    const sorted = [...this.items].sort((a, b) => {
      const ka = keyFn(a);
      const kb = keyFn(b);
      if (ka < kb) return direction === 'asc' ? -1 : 1;
      if (ka > kb) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return new EntityQuery(sorted);
  }

  // ── Set Operations ─────────────────────────────────────────────────────

  /**
   * Combine with another query (union, no duplicates by entity ID).
   */
  union(other: EntityQuery): EntityQuery {
    const seen = new Set(this.items.map(e => e.id));
    const combined = [...this.items];
    for (const item of other.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }
    return new EntityQuery(combined);
  }

  /**
   * Entities present in both queries (by entity ID).
   */
  intersect(other: EntityQuery): EntityQuery {
    const otherIds = new Set(other.items.map(e => e.id));
    return new EntityQuery(this.items.filter(e => otherIds.has(e.id)));
  }

  /**
   * Entities in this query but not in the other (by entity ID).
   */
  except(other: EntityQuery): EntityQuery {
    const otherIds = new Set(other.items.map(e => e.id));
    return new EntityQuery(this.items.filter(e => !otherIds.has(e.id)));
  }

  /**
   * Remove duplicate entities (by entity ID).
   */
  distinct(): EntityQuery {
    const seen = new Set<string>();
    const unique: IFEntity[] = [];
    for (const item of this.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return new EntityQuery(unique);
  }

  // ── Partitioning ───────────────────────────────────────────────────────

  /**
   * Skip the first N entities.
   */
  skip(count: number): EntityQuery {
    return new EntityQuery(this.items.slice(count));
  }

  /**
   * Take at most N entities.
   */
  take(count: number): EntityQuery {
    return new EntityQuery(this.items.slice(0, count));
  }

  // ── Grouping ───────────────────────────────────────────────────────────

  /**
   * Group entities by a key function. Returns a Map of key → EntityQuery.
   *
   * @param keyFn - Function that extracts the group key
   * @returns Map from group key to EntityQuery of members
   */
  groupBy<K>(keyFn: (entity: IFEntity) => K): Map<K, EntityQuery> {
    const groups = new Map<K, IFEntity[]>();
    for (const item of this.items) {
      const key = keyFn(item);
      const group = groups.get(key);
      if (group) {
        group.push(item);
      } else {
        groups.set(key, [item]);
      }
    }
    const result = new Map<K, EntityQuery>();
    for (const [key, items] of groups) {
      result.set(key, new EntityQuery(items));
    }
    return result;
  }

  // ── Materialization ────────────────────────────────────────────────────

  /**
   * Return as a plain array.
   */
  toArray(): IFEntity[] {
    return [...this.items];
  }

  /**
   * Return as a Map keyed by entity ID.
   */
  toMap(): Map<string, IFEntity> {
    const map = new Map<string, IFEntity>();
    for (const item of this.items) {
      map.set(item.id, item);
    }
    return map;
  }

  /**
   * Return as a Set of entity IDs.
   */
  toIdSet(): Set<string> {
    return new Set(this.items.map(e => e.id));
  }

  // ── Iteration ──────────────────────────────────────────────────────────

  /**
   * Execute a side effect for each entity. Returns this for chaining.
   */
  forEach(fn: (entity: IFEntity) => void): EntityQuery {
    this.items.forEach(fn);
    return new EntityQuery(this.items);
  }

  /**
   * Iterable protocol — works with for-of loops and spread.
   */
  [Symbol.iterator](): Iterator<IFEntity> {
    return this.items[Symbol.iterator]();
  }
}
