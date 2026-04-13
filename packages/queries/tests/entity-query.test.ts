/**
 * Unit tests for EntityQuery (ADR-150).
 *
 * Tests cover all method categories: filtering, retrieval, aggregation,
 * transformation, ordering, set operations, partitioning, grouping,
 * materialization, and iteration.
 */

import { describe, it, expect } from 'vitest';
import { IFEntity } from '@sharpee/world-model';
import { EntityQuery } from '../src/entity-query';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Creates an IFEntity with optional traits. */
function makeEntity(id: string, type: string, traits: Record<string, unknown>[] = []): IFEntity {
  const entity = new IFEntity(id, type);
  for (const trait of traits) {
    entity.add(trait as any);
  }
  return entity;
}

/** Shorthand for an identity trait. */
function identity(name: string, aliases: string[] = []): Record<string, unknown> {
  return { type: 'identity', name, aliases };
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function createTestEntities() {
  const sword = makeEntity('y01', 'object', [
    identity('sword', ['blade']),
    { type: 'weapon' },
  ]);
  const shield = makeEntity('y02', 'object', [
    identity('shield'),
    { type: 'wearable' },
  ]);
  const torch = makeEntity('y03', 'object', [
    identity('torch', ['lantern']),
    { type: 'lightSource', isLit: true },
  ]);
  const table = makeEntity('y04', 'object', [
    identity('table'),
    { type: 'scenery' },
    { type: 'supporter' },
  ]);
  const room = makeEntity('r01', 'room', [
    identity('Armory'),
    { type: 'room' },
  ]);
  const npc = makeEntity('n01', 'actor', [
    identity('Guard'),
    { type: 'actor' },
    { type: 'npc' },
  ]);

  return { sword, shield, torch, table, room, npc };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EntityQuery', () => {
  const { sword, shield, torch, table, room, npc } = createTestEntities();
  const allItems = [sword, shield, torch, table];
  const allEntities = [room, sword, shield, torch, table, npc];

  // ── Filtering ──────────────────────────────────────────────────────

  describe('where', () => {
    it('filters by predicate', () => {
      const q = new EntityQuery(allItems).where(e => e.id === 'y01');
      expect(q.toArray()).toEqual([sword]);
    });

    it('returns empty query when nothing matches', () => {
      const q = new EntityQuery(allItems).where(() => false);
      expect(q.toArray()).toEqual([]);
    });
  });

  describe('withTrait', () => {
    it('filters to entities with the trait', () => {
      const q = new EntityQuery(allItems).withTrait('weapon');
      expect(q.toArray()).toEqual([sword]);
    });

    it('returns empty when no entities have the trait', () => {
      const q = new EntityQuery(allItems).withTrait('lockable');
      expect(q.toArray()).toEqual([]);
    });
  });

  describe('withoutTrait', () => {
    it('excludes entities with the trait', () => {
      const q = new EntityQuery(allItems).withoutTrait('scenery');
      expect(q.count()).toBe(3);
      expect(q.toIdSet()).toEqual(new Set(['y01', 'y02', 'y03']));
    });
  });

  describe('ofType', () => {
    it('filters by entity type', () => {
      const q = new EntityQuery(allEntities).ofType('room');
      expect(q.toArray()).toEqual([room]);
    });

    it('filters actors', () => {
      const q = new EntityQuery(allEntities).ofType('actor');
      expect(q.toArray()).toEqual([npc]);
    });
  });

  describe('named', () => {
    it('matches exact name (case-sensitive)', () => {
      const q = new EntityQuery(allItems).named('sword');
      expect(q.single().id).toBe('y01');
    });

    it('does not match wrong case', () => {
      const q = new EntityQuery(allItems).named('Sword');
      expect(q.any()).toBe(false);
    });

    it('excludes entities without IdentityTrait', () => {
      const bare = makeEntity('x01', 'object');
      const q = new EntityQuery([bare, sword]).named('sword');
      expect(q.single().id).toBe('y01');
    });
  });

  describe('matching', () => {
    it('matches name substring (case-insensitive)', () => {
      const q = new EntityQuery(allItems).matching('SWORD');
      expect(q.single().id).toBe('y01');
    });

    it('matches aliases', () => {
      const q = new EntityQuery(allItems).matching('blade');
      expect(q.single().id).toBe('y01');
    });

    it('matches partial alias', () => {
      const q = new EntityQuery(allItems).matching('lant');
      expect(q.single().id).toBe('y03');
    });

    it('returns empty for no match', () => {
      const q = new EntityQuery(allItems).matching('axe');
      expect(q.none()).toBe(true);
    });
  });

  describe('portable', () => {
    it('excludes scenery entities', () => {
      const q = new EntityQuery(allItems).portable();
      expect(q.count()).toBe(3);
      expect(q.none(e => e.id === 'y04')).toBe(true);
    });
  });

  describe('visibleTo', () => {
    it('filters to visible entities', () => {
      const mockWorld = {
        getVisible: (id: string) => [sword, shield],
      };
      const q = new EntityQuery(allItems).visibleTo('player', mockWorld);
      expect(q.count()).toBe(2);
      expect(q.toIdSet()).toEqual(new Set(['y01', 'y02']));
    });
  });

  // ── Spatial/Temporal (ADR-149 forward) ─────────────────────────────

  describe('inRegion', () => {
    it('returns empty when world has no isInRegion', () => {
      const q = new EntityQuery(allEntities).inRegion('reg-1', {});
      expect(q.none()).toBe(true);
    });

    it('filters using isInRegion when available', () => {
      const mockWorld = {
        isInRegion: (entityId: string, regionId: string) =>
          entityId === 'r01' && regionId === 'reg-armory',
      };
      const q = new EntityQuery(allEntities).inRegion('reg-armory', mockWorld);
      expect(q.single().id).toBe('r01');
    });
  });

  describe('withinRegion', () => {
    it('returns empty when world has no isInRegion', () => {
      const q = new EntityQuery(allItems).withinRegion('reg-1', {
        getLocation: () => 'r01',
      });
      expect(q.none()).toBe(true);
    });
  });

  // ── Retrieval ──────────────────────────────────────────────────────

  describe('first', () => {
    it('returns the first entity', () => {
      expect(new EntityQuery(allItems).first()!.id).toBe('y01');
    });

    it('returns undefined for empty query', () => {
      expect(new EntityQuery([]).first()).toBeUndefined();
    });
  });

  describe('firstOrThrow', () => {
    it('returns the first entity', () => {
      expect(new EntityQuery(allItems).firstOrThrow().id).toBe('y01');
    });

    it('throws for empty query', () => {
      expect(() => new EntityQuery([]).firstOrThrow()).toThrow('Expected at least one entity, found none');
    });

    it('throws with custom message', () => {
      expect(() => new EntityQuery([]).firstOrThrow('No sword')).toThrow('No sword');
    });
  });

  describe('single', () => {
    it('returns the one entity', () => {
      expect(new EntityQuery([sword]).single().id).toBe('y01');
    });

    it('throws for empty query', () => {
      expect(() => new EntityQuery([]).single()).toThrow('Expected exactly one entity, found none');
    });

    it('throws for multiple entities', () => {
      expect(() => new EntityQuery(allItems).single()).toThrow('Expected exactly one entity, found 4');
    });
  });

  describe('last', () => {
    it('returns the last entity', () => {
      expect(new EntityQuery(allItems).last()!.id).toBe('y04');
    });

    it('returns undefined for empty query', () => {
      expect(new EntityQuery([]).last()).toBeUndefined();
    });
  });

  describe('at', () => {
    it('returns entity at index', () => {
      expect(new EntityQuery(allItems).at(2)!.id).toBe('y03');
    });

    it('returns undefined for out of bounds', () => {
      expect(new EntityQuery(allItems).at(99)).toBeUndefined();
    });
  });

  // ── Aggregation ────────────────────────────────────────────────────

  describe('any', () => {
    it('returns true for non-empty query', () => {
      expect(new EntityQuery(allItems).any()).toBe(true);
    });

    it('returns false for empty query', () => {
      expect(new EntityQuery([]).any()).toBe(false);
    });

    it('returns true when predicate matches', () => {
      expect(new EntityQuery(allItems).any(e => e.has('weapon' as any))).toBe(true);
    });

    it('returns false when predicate matches nothing', () => {
      expect(new EntityQuery(allItems).any(e => e.has('lockable' as any))).toBe(false);
    });
  });

  describe('all', () => {
    it('returns true when all match', () => {
      expect(new EntityQuery(allItems).all(e => e.type === 'object')).toBe(true);
    });

    it('returns false when some do not match', () => {
      expect(new EntityQuery(allEntities).all(e => e.type === 'object')).toBe(false);
    });

    it('returns true for empty query (vacuous truth)', () => {
      expect(new EntityQuery([]).all(() => false)).toBe(true);
    });
  });

  describe('none', () => {
    it('returns true for empty query', () => {
      expect(new EntityQuery([]).none()).toBe(true);
    });

    it('returns false for non-empty query', () => {
      expect(new EntityQuery(allItems).none()).toBe(false);
    });

    it('returns true when predicate matches nothing', () => {
      expect(new EntityQuery(allItems).none(e => e.has('lockable' as any))).toBe(true);
    });
  });

  describe('count', () => {
    it('returns total count', () => {
      expect(new EntityQuery(allItems).count()).toBe(4);
    });

    it('returns filtered count', () => {
      expect(new EntityQuery(allItems).count(e => e.has('weapon' as any))).toBe(1);
    });

    it('returns 0 for empty query', () => {
      expect(new EntityQuery([]).count()).toBe(0);
    });
  });

  // ── Transformation ─────────────────────────────────────────────────

  describe('select', () => {
    it('projects entities to new form', () => {
      const ids = new EntityQuery(allItems).select(e => e.id);
      expect(ids).toEqual(['y01', 'y02', 'y03', 'y04']);
    });
  });

  describe('selectMany', () => {
    it('projects and flattens', () => {
      const types = new EntityQuery([sword, table]).selectMany(e =>
        Array.from(e.traits.keys()),
      );
      expect(types).toContain('weapon');
      expect(types).toContain('scenery');
      expect(types).toContain('supporter');
    });
  });

  describe('traits', () => {
    it('extracts traits including undefined', () => {
      const weapons = new EntityQuery(allItems).traits<{ type: string }>('weapon');
      expect(weapons.length).toBe(4);
      expect(weapons[0]).toBeDefined(); // sword has weapon
      expect(weapons[1]).toBeUndefined(); // shield does not
    });
  });

  describe('traitsOf', () => {
    it('extracts traits excluding undefined', () => {
      const weapons = new EntityQuery(allItems).traitsOf<{ type: string }>('weapon');
      expect(weapons.length).toBe(1);
      expect(weapons[0].type).toBe('weapon');
    });
  });

  // ── Ordering ───────────────────────────────────────────────────────

  describe('orderBy', () => {
    it('sorts ascending by default', () => {
      const sorted = new EntityQuery(allItems).orderBy(e => e.id);
      expect(sorted.select(e => e.id)).toEqual(['y01', 'y02', 'y03', 'y04']);
    });

    it('sorts descending', () => {
      const sorted = new EntityQuery(allItems).orderBy(e => e.id, 'desc');
      expect(sorted.select(e => e.id)).toEqual(['y04', 'y03', 'y02', 'y01']);
    });

    it('sorts by name', () => {
      const sorted = new EntityQuery(allItems).orderBy(e => {
        const id = e.get('identity' as any) as { name: string } | undefined;
        return id?.name ?? '';
      });
      expect(sorted.select(e => e.id)).toEqual(['y02', 'y01', 'y04', 'y03']);
      // shield, sword, table, torch (alphabetical)
    });
  });

  // ── Set Operations ─────────────────────────────────────────────────

  describe('union', () => {
    it('combines without duplicates', () => {
      const a = new EntityQuery([sword, shield]);
      const b = new EntityQuery([shield, torch]);
      const result = a.union(b);
      expect(result.count()).toBe(3);
      expect(result.toIdSet()).toEqual(new Set(['y01', 'y02', 'y03']));
    });
  });

  describe('intersect', () => {
    it('keeps only common entities', () => {
      const a = new EntityQuery([sword, shield, torch]);
      const b = new EntityQuery([shield, table]);
      const result = a.intersect(b);
      expect(result.single().id).toBe('y02');
    });

    it('returns empty for disjoint sets', () => {
      const a = new EntityQuery([sword]);
      const b = new EntityQuery([shield]);
      expect(a.intersect(b).none()).toBe(true);
    });
  });

  describe('except', () => {
    it('removes entities in the other set', () => {
      const a = new EntityQuery([sword, shield, torch]);
      const b = new EntityQuery([shield]);
      const result = a.except(b);
      expect(result.count()).toBe(2);
      expect(result.toIdSet()).toEqual(new Set(['y01', 'y03']));
    });
  });

  describe('distinct', () => {
    it('removes duplicates by ID', () => {
      const q = new EntityQuery([sword, shield, sword, torch, shield]);
      const result = q.distinct();
      expect(result.count()).toBe(3);
      expect(result.toIdSet()).toEqual(new Set(['y01', 'y02', 'y03']));
    });

    it('preserves order of first occurrence', () => {
      const q = new EntityQuery([torch, sword, torch]);
      expect(q.distinct().select(e => e.id)).toEqual(['y03', 'y01']);
    });
  });

  // ── Partitioning ───────────────────────────────────────────────────

  describe('skip', () => {
    it('skips first N entities', () => {
      const q = new EntityQuery(allItems).skip(2);
      expect(q.count()).toBe(2);
      expect(q.first()!.id).toBe('y03');
    });

    it('returns empty when skipping all', () => {
      expect(new EntityQuery(allItems).skip(10).none()).toBe(true);
    });
  });

  describe('take', () => {
    it('takes first N entities', () => {
      const q = new EntityQuery(allItems).take(2);
      expect(q.count()).toBe(2);
      expect(q.toIdSet()).toEqual(new Set(['y01', 'y02']));
    });

    it('takes all when N exceeds count', () => {
      expect(new EntityQuery(allItems).take(100).count()).toBe(4);
    });
  });

  // ── Grouping ───────────────────────────────────────────────────────

  describe('groupBy', () => {
    it('groups by entity type', () => {
      const groups = new EntityQuery(allEntities).groupBy(e => e.type);
      expect(groups.size).toBe(3); // room, object, actor
      expect(groups.get('object')!.count()).toBe(4);
      expect(groups.get('room')!.count()).toBe(1);
      expect(groups.get('actor')!.count()).toBe(1);
    });

    it('groups by trait presence', () => {
      const groups = new EntityQuery(allItems).groupBy(e =>
        e.has('scenery' as any) ? 'scenery' : 'portable',
      );
      expect(groups.get('scenery')!.count()).toBe(1);
      expect(groups.get('portable')!.count()).toBe(3);
    });
  });

  // ── Materialization ────────────────────────────────────────────────

  describe('toArray', () => {
    it('returns a copy', () => {
      const q = new EntityQuery(allItems);
      const arr = q.toArray();
      expect(arr).toEqual(allItems);
      expect(arr).not.toBe(allItems); // different reference
    });
  });

  describe('toMap', () => {
    it('returns Map keyed by ID', () => {
      const map = new EntityQuery(allItems).toMap();
      expect(map.size).toBe(4);
      expect(map.get('y01')).toBe(sword);
      expect(map.get('y03')).toBe(torch);
    });
  });

  describe('toIdSet', () => {
    it('returns Set of IDs', () => {
      const ids = new EntityQuery(allItems).toIdSet();
      expect(ids).toEqual(new Set(['y01', 'y02', 'y03', 'y04']));
    });
  });

  // ── Iteration ──────────────────────────────────────────────────────

  describe('forEach', () => {
    it('executes side effect for each entity', () => {
      const collected: string[] = [];
      new EntityQuery(allItems).forEach(e => collected.push(e.id));
      expect(collected).toEqual(['y01', 'y02', 'y03', 'y04']);
    });

    it('returns a new EntityQuery for chaining', () => {
      const result = new EntityQuery(allItems).forEach(() => {});
      expect(result.count()).toBe(4);
    });
  });

  describe('Symbol.iterator', () => {
    it('works with for-of', () => {
      const ids: string[] = [];
      for (const e of new EntityQuery(allItems)) {
        ids.push(e.id);
      }
      expect(ids).toEqual(['y01', 'y02', 'y03', 'y04']);
    });

    it('works with spread', () => {
      const arr = [...new EntityQuery([sword, shield])];
      expect(arr.length).toBe(2);
    });
  });

  // ── Chaining ───────────────────────────────────────────────────────

  describe('chaining', () => {
    it('chains multiple filters', () => {
      const result = new EntityQuery(allEntities)
        .ofType('object')
        .portable()
        .withTrait('weapon')
        .single();
      expect(result.id).toBe('y01');
    });

    it('chains filter + aggregation', () => {
      const hasLight = new EntityQuery(allItems)
        .withTrait('lightSource')
        .any();
      expect(hasLight).toBe(true);
    });

    it('chains filter + ordering + take', () => {
      const first2 = new EntityQuery(allItems)
        .portable()
        .orderBy(e => e.id, 'desc')
        .take(2);
      expect(first2.select(e => e.id)).toEqual(['y03', 'y02']);
    });
  });

  // ── Empty query behavior ───────────────────────────────────────────

  describe('empty query', () => {
    const empty = new EntityQuery([]);

    it('where returns empty', () => expect(empty.where(() => true).none()).toBe(true));
    it('withTrait returns empty', () => expect(empty.withTrait('room').none()).toBe(true));
    it('named returns empty', () => expect(empty.named('x').none()).toBe(true));
    it('first returns undefined', () => expect(empty.first()).toBeUndefined());
    it('count returns 0', () => expect(empty.count()).toBe(0));
    it('toArray returns []', () => expect(empty.toArray()).toEqual([]));
    it('toIdSet returns empty set', () => expect(empty.toIdSet().size).toBe(0));
    it('groupBy returns empty map', () => expect(empty.groupBy(e => e.type).size).toBe(0));
    it('select returns []', () => expect(empty.select(e => e.id)).toEqual([]));
    it('skip returns empty', () => expect(empty.skip(5).none()).toBe(true));
    it('take returns empty', () => expect(empty.take(5).none()).toBe(true));
  });
});
