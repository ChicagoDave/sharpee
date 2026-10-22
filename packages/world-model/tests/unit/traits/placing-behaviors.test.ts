/**
 * placing-behaviors.test.ts — `ContainerBehavior.addItem` and
 * `SupporterBehavior.addItem` are the one writer of an item entering a
 * container or landing on a supporter (alignment-fixes D6, Q11 c): when
 * their checks pass the item moves, and a refusal names its reason and
 * leaves the item where it was.
 *
 * Owner context: world-model test suite.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { ContainerBehavior } from '../../../src/traits/container/containerBehavior';
import { SupporterTrait } from '../../../src/traits/supporter/supporterTrait';
import { SupporterBehavior } from '../../../src/traits/supporter/supporterBehavior';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';

describe('placing an item through its holder\'s behavior', () => {
  let world: WorldModel;
  let room: IFEntity;
  let coin: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    room = world.createEntity('Hall', EntityType.ROOM);
    room.add(new RoomTrait({ exits: {} }));
    coin = world.createEntity('coin', EntityType.ITEM);
    world.moveEntity(coin.id, room.id);
  });

  it('a container takes the item in', () => {
    const box = world.createEntity('box', EntityType.CONTAINER);
    box.add(new ContainerTrait());
    world.moveEntity(box.id, room.id);

    const result = ContainerBehavior.addItem(box, coin, world);

    expect(result).toMatchObject({ success: true, stateChanged: true });
    expect(world.getLocation(coin.id)).toBe(box.id);
  });

  it('a closed container refuses, and the item stays where it was', () => {
    const box = world.createEntity('box', EntityType.CONTAINER);
    box.add(new ContainerTrait());
    box.add(new OpenableTrait({ isOpen: false }));
    world.moveEntity(box.id, room.id);

    const result = ContainerBehavior.addItem(box, coin, world);

    expect(result).toMatchObject({ success: false, containerClosed: true, stateChanged: false });
    expect(world.getLocation(coin.id)).toBe(room.id);
  });

  it('a full container refuses, and the item stays where it was', () => {
    const box = world.createEntity('box', EntityType.CONTAINER);
    box.add(new ContainerTrait({ capacity: { maxItems: 1 } }));
    world.moveEntity(box.id, room.id);
    const pebble = world.createEntity('pebble', EntityType.ITEM);
    world.moveEntity(pebble.id, box.id);

    const result = ContainerBehavior.addItem(box, coin, world);

    expect(result).toMatchObject({ success: false, containerFull: true });
    expect(world.getLocation(coin.id)).toBe(room.id);
  });

  it('a move the world refuses is a failure, and the item stays where it was', () => {
    // A bag holding the box cannot go into that box: the world refuses the cycle.
    const bag = world.createEntity('bag', EntityType.CONTAINER);
    bag.add(new ContainerTrait());
    world.moveEntity(bag.id, room.id);
    const box = world.createEntity('box', EntityType.CONTAINER);
    box.add(new ContainerTrait());
    world.moveEntity(box.id, bag.id);

    const result = ContainerBehavior.addItem(box, bag, world);

    expect(result).toMatchObject({ success: false, stateChanged: false });
    expect(world.getLocation(bag.id)).toBe(room.id);
  });

  it('a full supporter refuses, and the item stays where it was', () => {
    const table = world.createEntity('table', EntityType.SUPPORTER);
    table.add(new SupporterTrait({ capacity: { maxItems: 1 } }));
    world.moveEntity(table.id, room.id);
    const cup = world.createEntity('cup', EntityType.ITEM);
    world.moveEntity(cup.id, table.id);

    const result = SupporterBehavior.addItem(table, coin, world);

    expect(result).toMatchObject({ success: false, stateChanged: false });
    expect(world.getLocation(coin.id)).toBe(room.id);
  });

  it('a supporter takes the item onto it', () => {
    const table = world.createEntity('table', EntityType.SUPPORTER);
    table.add(new SupporterTrait());
    world.moveEntity(table.id, room.id);

    const result = SupporterBehavior.addItem(table, coin, world);

    expect(result).toMatchObject({ success: true, stateChanged: true });
    expect(world.getLocation(coin.id)).toBe(table.id);
  });

  it('a supporter already holding the item refuses and changes nothing', () => {
    const table = world.createEntity('table', EntityType.SUPPORTER);
    table.add(new SupporterTrait());
    world.moveEntity(table.id, room.id);
    world.moveEntity(coin.id, table.id);

    const result = SupporterBehavior.addItem(table, coin, world);

    expect(result).toMatchObject({ success: false, alreadyThere: true, stateChanged: false });
    expect(world.getLocation(coin.id)).toBe(table.id);
  });
});
