// packages/world-model/tests/unit/world/connect-rooms-door.test.ts
//
// ADR-237 D4: connectRooms(room1Id, room2Id, direction, doorId?) is the
// platform's ONE door-wiring implementation — via-stamping both directions
// plus room1 placement — with a door-side contract: throws on unknown id,
// on an entity without DoorTrait, and on a trait room pair that disagrees
// with the rooms passed. Tests derive from the connectRooms Behavior
// Statement: every DOES line asserts on world state (exit configs, spatial
// location), every REJECTS WHEN line asserts a thrown error AND that no
// partial wiring occurred.

import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { DoorTrait } from '../../../src/traits/door/doorTrait';
import { SceneryTrait } from '../../../src/traits/scenery/sceneryTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { Direction } from '../../../src/constants/directions';

describe('connectRooms with a door (ADR-237 D4)', () => {
  let world: WorldModel;
  let kitchen: IFEntity;
  let hall: IFEntity;

  const roomTrait = (room: IFEntity) => room.get(TraitType.ROOM) as RoomTrait;

  const makeRoom = (name: string): IFEntity => {
    const room = world.createEntity(name, 'room');
    room.add(new RoomTrait({}));
    return room;
  };

  const composeDoor = (name: string, room1Id: string, room2Id: string): IFEntity => {
    const door = world.createEntity(name, 'door');
    door.add(new DoorTrait({ room1: room1Id, room2: room2Id }));
    door.add(new SceneryTrait());
    door.add(new OpenableTrait({ isOpen: false }));
    return door;
  };

  beforeEach(() => {
    world = new WorldModel();
    kitchen = makeRoom('Kitchen');
    hall = makeRoom('Hall');
  });

  describe('doored wiring (pre-built entity, the Chord-loader path)', () => {
    it('stamps via on BOTH exits and places the door in room1', () => {
      const door = composeDoor('oak door', kitchen.id, hall.id);
      world.connectRooms(kitchen.id, hall.id, Direction.NORTH, door.id);

      expect(roomTrait(kitchen).exits?.[Direction.NORTH]?.destination).toBe(hall.id);
      expect(roomTrait(kitchen).exits?.[Direction.NORTH]?.via).toBe(door.id);
      expect(roomTrait(hall).exits?.[Direction.SOUTH]?.destination).toBe(kitchen.id);
      expect(roomTrait(hall).exits?.[Direction.SOUTH]?.via).toBe(door.id);
      expect(world.getLocation(door.id)).toBe(kitchen.id);
    });

    it('plain wiring (no doorId) still sets both exits with no via', () => {
      world.connectRooms(kitchen.id, hall.id, Direction.NORTH);

      expect(roomTrait(kitchen).exits?.[Direction.NORTH]?.destination).toBe(hall.id);
      expect(roomTrait(kitchen).exits?.[Direction.NORTH]?.via).toBeUndefined();
      expect(roomTrait(hall).exits?.[Direction.SOUTH]?.destination).toBe(kitchen.id);
      expect(roomTrait(hall).exits?.[Direction.SOUTH]?.via).toBeUndefined();
    });
  });

  describe('door-side rejections (each leaves the rooms unwired)', () => {
    const expectUnwired = () => {
      expect(roomTrait(kitchen).exits?.[Direction.NORTH]).toBeUndefined();
      expect(roomTrait(hall).exits?.[Direction.SOUTH]).toBeUndefined();
    };

    it('rejects an unknown door id', () => {
      expect(() => world.connectRooms(kitchen.id, hall.id, Direction.NORTH, 'no-such-door'))
        .toThrow(/connectRooms: door must exist \(no-such-door\)/);
      expectUnwired();
    });

    it('rejects an entity without DoorTrait', () => {
      const rug = world.createEntity('rug', 'object');
      expect(() => world.connectRooms(kitchen.id, hall.id, Direction.NORTH, rug.id))
        .toThrow(/has no DoorTrait/);
      expectUnwired();
    });

    it('rejects a DoorTrait whose room pair disagrees with the rooms passed', () => {
      const pantry = makeRoom('Pantry');
      const door = composeDoor('oak door', kitchen.id, pantry.id);
      expect(() => world.connectRooms(kitchen.id, hall.id, Direction.NORTH, door.id))
        .toThrow(/connects \(.*\), not \(.*\)/);
      expectUnwired();
      expect(world.getLocation(door.id)).toBeUndefined();
    });

    it('rejects a reversed room order (room1 is the placement room, never guessed)', () => {
      const door = composeDoor('oak door', kitchen.id, hall.id);
      expect(() => world.connectRooms(hall.id, kitchen.id, Direction.SOUTH, door.id))
        .toThrow(/connects \(.*\), not \(.*\)/);
    });

    it('still rejects missing rooms first', () => {
      expect(() => world.connectRooms(kitchen.id, 'nowhere', Direction.NORTH, 'irrelevant'))
        .toThrow(/connectRooms: both rooms must exist/);
    });
  });

  describe('two-sided door presence (ADR-234 AC-3; David ruling 2026-07-18)', () => {
    let door: IFEntity;
    let observer: IFEntity;
    let farItem: IFEntity;

    beforeEach(() => {
      door = composeDoor('oak door', kitchen.id, hall.id);
      world.connectRooms(kitchen.id, hall.id, Direction.NORTH, door.id);
      observer = world.createEntity('observer', 'actor');
      farItem = world.createEntity('teapot', 'object');
      world.moveEntity(farItem.id, hall.id); // contents of the far room
      world.moveEntity(observer.id, kitchen.id);
    });

    const scopeIds = () => world.getInScope(observer.id).map((e) => e.id);

    it('the door is in scope from BOTH rooms (spatial home is room1 only)', () => {
      expect(world.getLocation(door.id)).toBe(kitchen.id);
      expect(scopeIds()).toContain(door.id);
      world.moveEntity(observer.id, hall.id);
      expect(scopeIds()).toContain(door.id);
    });

    it('only the door is two-sided — the far room and its contents stay OUT of scope', () => {
      expect(scopeIds()).toContain(door.id);
      expect(scopeIds()).not.toContain(hall.id);
      expect(scopeIds()).not.toContain(farItem.id);
    });

    it('the door is visible from BOTH rooms, even closed; far-room contents are not', () => {
      expect(world.canSee(observer.id, door.id)).toBe(true);
      expect(world.canSee(observer.id, farItem.id)).toBe(false);
      world.moveEntity(observer.id, hall.id);
      expect(world.canSee(observer.id, door.id)).toBe(true); // far side, door closed
      expect(world.getVisible(observer.id).map((e) => e.id)).toContain(door.id);
    });
  });

  describe('createDoor delegates to the same wiring (behavior preserved)', () => {
    it('produces identical exit/via/placement state to the pre-built-entity path', () => {
      const door = world.createDoor('iron door', {
        room1Id: kitchen.id,
        room2Id: hall.id,
        direction: Direction.NORTH,
        isLocked: true,
      });

      expect(roomTrait(kitchen).exits?.[Direction.NORTH]?.via).toBe(door.id);
      expect(roomTrait(hall).exits?.[Direction.SOUTH]?.via).toBe(door.id);
      expect(world.getLocation(door.id)).toBe(kitchen.id);
      expect((door.get(TraitType.DOOR) as DoorTrait).room1).toBe(kitchen.id);
      expect(door.has(TraitType.LOCKABLE)).toBe(true);
    });
  });
});
