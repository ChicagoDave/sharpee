// packages/world-model/tests/unit/world/night-vision.test.ts
//
// NightVisionTrait (ADR-328 D5): darkness is a rule about the observer.
// An observer carrying the trait sees a dark room's contents without any
// light; one without it does not; the room stays dark for everyone else.
// Assertions are on VisibilityBehavior's answers over a real WorldModel.

import { VisibilityBehavior } from '../../../src/world/VisibilityBehavior';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { NightVisionTrait } from '../../../src/traits/night-vision/nightVisionTrait';

describe('NightVisionTrait — seeing in the dark (ADR-328 D5)', () => {
  let world: WorldModel;
  let cave: IFEntity;
  let thief: IFEntity;
  let adventurer: IFEntity;
  let coins: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    cave = world.createEntity('Dark Cave', 'room');
    cave.add(new RoomTrait({ requiresLight: true }));
    cave.add(new ContainerTrait());

    thief = world.createEntity('thief', 'actor');
    thief.add(new ContainerTrait());
    thief.add(new NightVisionTrait());
    world.moveEntity(thief.id, cave.id);

    adventurer = world.createEntity('adventurer', 'actor');
    adventurer.add(new ContainerTrait());
    world.moveEntity(adventurer.id, cave.id);

    coins = world.createEntity('bag of coins', 'object');
    world.moveEntity(coins.id, cave.id);
  });

  it('is a marker: its presence is the fact', () => {
    expect(thief.hasTrait(TraitType.NIGHT_VISION)).toBe(true);
    expect(adventurer.hasTrait(TraitType.NIGHT_VISION)).toBe(false);
  });

  it('the observer with night vision sees the dark room’s contents; the one without does not', () => {
    expect(VisibilityBehavior.isDark(cave, world)).toBe(true);
    expect(VisibilityBehavior.canSee(thief, coins, world)).toBe(true);
    expect(VisibilityBehavior.canSee(adventurer, coins, world)).toBe(false);
  });

  it('getVisible lists the room’s contents for the night-vision observer only', () => {
    const seenByThief = VisibilityBehavior.getVisible(thief, world).map((e) => e.id);
    const seenByAdventurer = VisibilityBehavior.getVisible(adventurer, world).map((e) => e.id);
    expect(seenByThief).toContain(coins.id);
    expect(seenByAdventurer).not.toContain(coins.id);
  });

  it('the room stays dark — night vision is not a light source', () => {
    expect(VisibilityBehavior.isDark(cave, world)).toBe(true);
    // The world-level query agrees with the behavior, observer by observer.
    expect(world.canSee(thief.id, coins.id)).toBe(true);
    expect(world.canSee(adventurer.id, coins.id)).toBe(false);
  });
});
