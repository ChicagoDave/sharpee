/**
 * door-builder-parity.test.ts — ADR-237 D4: createDoor (world-model
 * convenience constructor) and DoorBuilder (author-facing sugar) both
 * delegate their wiring tails to connectRooms, the platform's one
 * door-wiring implementation. This test proves the de-dup by asserting
 * the two paths produce identical exit-config/via/placement/trait state
 * for the same inputs — not just that both still work.
 */
import { describe, expect, it } from 'vitest';
import {
  Direction,
  DoorTrait,
  RoomTrait,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';
import type { IFEntity } from '@sharpee/world-model';
import { DoorBuilder } from '../src/builders/door';

interface DoorWorld {
  world: WorldModel;
  kitchen: IFEntity;
  hall: IFEntity;
  door: IFEntity;
}

const makeRooms = (world: WorldModel): { kitchen: IFEntity; hall: IFEntity } => {
  const kitchen = world.createEntity('Kitchen', 'room');
  kitchen.add(new RoomTrait({}));
  const hall = world.createEntity('Hall', 'room');
  hall.add(new RoomTrait({}));
  return { kitchen, hall };
};

const viaCreateDoor = (): DoorWorld => {
  const world = new WorldModel();
  const { kitchen, hall } = makeRooms(world);
  const door = world.createDoor('iron door', {
    room1Id: kitchen.id,
    room2Id: hall.id,
    direction: Direction.NORTH,
    isOpen: false,
    isLocked: true,
  });
  return { world, kitchen, hall, door };
};

const viaBuilder = (): DoorWorld => {
  const world = new WorldModel();
  const { kitchen, hall } = makeRooms(world);
  const door = new DoorBuilder(world, 'iron door')
    .between(kitchen, hall, Direction.NORTH)
    .openable({ isOpen: false })
    .lockable({ isLocked: true })
    .build();
  return { world, kitchen, hall, door };
};

describe('createDoor ≡ DoorBuilder through the shared connectRooms primitive (ADR-237 D4)', () => {
  it('produces identical exit-config, via, placement, and door-trait state', () => {
    const a = viaCreateDoor();
    const b = viaBuilder();

    // Same creation order in both worlds → same entity ids → the exit
    // configs and locations must be deep-equal, not merely similar.
    expect(a.door.id).toBe(b.door.id);

    const exits = ({ kitchen, hall }: DoorWorld) => ({
      kitchen: (kitchen.get(TraitType.ROOM) as RoomTrait).exits,
      hall: (hall.get(TraitType.ROOM) as RoomTrait).exits,
    });
    expect(exits(a)).toEqual(exits(b));

    expect(a.world.getLocation(a.door.id)).toBe(b.world.getLocation(b.door.id));

    const doorState = ({ door }: DoorWorld) => ({
      door: door.get(TraitType.DOOR) as DoorTrait,
      scenery: door.has(TraitType.SCENERY),
      openable: door.get(TraitType.OPENABLE),
      lockable: door.get(TraitType.LOCKABLE),
    });
    expect(doorState(a)).toEqual(doorState(b));
  });

  it('both paths stamp via on both directions', () => {
    for (const { kitchen, hall, door } of [viaCreateDoor(), viaBuilder()]) {
      expect((kitchen.get(TraitType.ROOM) as RoomTrait).exits?.[Direction.NORTH]?.via).toBe(door.id);
      expect((hall.get(TraitType.ROOM) as RoomTrait).exits?.[Direction.SOUTH]?.via).toBe(door.id);
    }
  });
});
