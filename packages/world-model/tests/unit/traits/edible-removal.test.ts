/**
 * edible-removal.test.ts — a thing with no serving left leaves the world,
 * and the behavior is the one that takes it out. Every case asserts on the
 * world: whether the entity still exists and what its holder contains.
 *
 * Owner context: world-model test suite (edible trait and behavior).
 *
 * References:
 * - docs/work/event-processor-one-writer/plan.md, Phase 6 — the ruling that
 *   eaten items disappear, and the removal of `remainsType`.
 */
import { EdibleBehavior } from '../../../src/traits/edible/edibleBehavior';
import { EdibleTrait } from '../../../src/traits/edible/edibleTrait';
import { IFEvents } from '../../../src/constants/if-events';
import { WorldModel } from '../../../src/world/WorldModel';
import type { IFEntity } from '../../../src/entities/if-entity';

describe('EdibleBehavior.removeIfFinished', () => {
  let world: WorldModel;
  let eater: IFEntity;

  const food = (name: string, servings: number): IFEntity => {
    const item = world.createEntity(name, 'item');
    item.add(new EdibleTrait({ servings }));
    world.moveEntity(item.id, eater.id);
    return item;
  };
  const heldIds = (): string[] => world.getContents(eater.id).map((e) => e.id);

  beforeEach(() => {
    world = new WorldModel();
    eater = world.createEntity('eater', 'actor');
  });

  it('removes a thing whose last serving has been consumed', () => {
    const biscuit = food('biscuit', 1);
    expect(world.hasEntity(biscuit.id)).toBe(true);
    expect(heldIds()).toContain(biscuit.id);

    EdibleBehavior.consume(biscuit, eater);
    const removed = EdibleBehavior.removeIfFinished(biscuit, world);

    expect(removed).toBe(true);
    expect(world.hasEntity(biscuit.id)).toBe(false);
    expect(heldIds()).not.toContain(biscuit.id);
  });

  it('leaves a thing that still has a serving, and removes it after the last', () => {
    const loaf = food('loaf', 2);

    EdibleBehavior.consume(loaf, eater);
    expect(EdibleBehavior.removeIfFinished(loaf, world)).toBe(false);
    expect(world.hasEntity(loaf.id)).toBe(true);
    expect(heldIds()).toContain(loaf.id);
    expect(EdibleBehavior.getServings(loaf)).toBe(1);

    EdibleBehavior.consume(loaf, eater);
    expect(EdibleBehavior.removeIfFinished(loaf, world)).toBe(true);
    expect(world.hasEntity(loaf.id)).toBe(false);
    expect(heldIds()).not.toContain(loaf.id);
  });

  it('removes nothing when no serving has been consumed', () => {
    const apple = food('apple', 1);

    expect(EdibleBehavior.removeIfFinished(apple, world)).toBe(false);
    expect(world.hasEntity(apple.id)).toBe(true);
    expect(heldIds()).toContain(apple.id);
  });

  it('the consumed event names no leftover', () => {
    const biscuit = food('biscuit', 1);

    const events = EdibleBehavior.consume(biscuit, eater);
    const destroyed = events.find((e) => e.type === IFEvents.ITEM_DESTROYED);

    expect(destroyed).toBeDefined();
    expect(destroyed!.data).toEqual({ reason: 'consumed' });
  });
});
