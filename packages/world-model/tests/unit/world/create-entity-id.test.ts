/**
 * create-entity-id.test.ts — `createEntity` with an explicit id (ADR-388 D1).
 *
 * Behavior Statement — `WorldModel.createEntity(name, type, { id })`
 *   DOES: registers the entity under the caller's id, so a story whose
 *         entities have stable authored names persists them under those
 *         names and a later declaration-order edit moves no id; the
 *         counter-generated ids skip a spelling an explicit id already holds.
 *   WHEN: `opts.id` is a non-empty string no entity holds.
 *   BECAUSE: a save keeps world ids; a counter id shifts when an author
 *            inserts an entity ahead of others, and every map built against
 *            the fresh world then names the wrong entity.
 *   REJECTS WHEN: `opts.id` is empty or already in use — throws, creates nothing.
 */
import { describe, expect, it } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';

describe('createEntity with an explicit id (ADR-388 D1)', () => {
  it('registers the entity under the given id', () => {
    const world = new WorldModel();
    const hall = world.createEntity('Hall', 'room', { id: 'hall' });
    expect(hall.id).toBe('hall');
    expect(world.getEntity('hall')).toBe(hall);
  });

  it('the generated counter skips a spelling an explicit id already holds', () => {
    const world = new WorldModel();
    world.createEntity('Oddly named', 'room', { id: 'r01' });
    const generated = world.createEntity('Plain', 'room');
    expect(generated.id).not.toBe('r01');
    expect(world.getEntity(generated.id)).toBe(generated);
    expect(world.getEntity('r01')?.attributes.displayName).toBe('Oddly named');
  });

  it('rejects an empty id and a duplicate id, creating nothing', () => {
    const world = new WorldModel();
    expect(() => world.createEntity('Nothing', 'room', { id: '' })).toThrow(/must not be empty/);
    world.createEntity('Hall', 'room', { id: 'hall' });
    expect(() => world.createEntity('Hall again', 'room', { id: 'hall' })).toThrow(/already exists/);
    expect(world.getAllEntities().filter((e) => e.id === 'hall')).toHaveLength(1);
  });
});
