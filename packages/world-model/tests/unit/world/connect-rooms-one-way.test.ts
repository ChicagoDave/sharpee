/**
 * connect-rooms-one-way.test.ts — ADR-234 D4 `, one-way` (GH #327):
 * `connectRooms(..., { oneWay: true })` stamps the written direction only.
 * A plain one-way connection leaves the far room's reverse exit unset; a
 * doored one-way connection additionally marks the door
 * `bidirectional = false` and still places it in room1. The default (no
 * options) is byte-for-byte the standing both-directions behaviour.
 * Every assertion reads exit configs and trait state back from the world.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { DoorTrait } from '../../../src/traits/door/doorTrait';
import { Direction } from '../../../src/constants/directions';

describe('connectRooms one-way (ADR-234 D4, GH #327)', () => {
  let world: WorldModel;
  let landing: IFEntity;
  let stall: IFEntity;

  const roomTrait = (room: IFEntity) => room.get(TraitType.ROOM) as RoomTrait;
  const makeRoom = (name: string): IFEntity => {
    const room = world.createEntity(name, 'room');
    room.add(new RoomTrait({}));
    return room;
  };

  beforeEach(() => {
    world = new WorldModel();
    landing = makeRoom('Behind the Fruit Stall');
    stall = makeRoom('Fruit Stall');
  });

  it('a plain one-way connection stamps the written direction and nothing on the far room', () => {
    world.connectRooms(landing.id, stall.id, Direction.SOUTHWEST, undefined, { oneWay: true });

    expect(roomTrait(landing).exits?.[Direction.SOUTHWEST]).toEqual({ destination: stall.id, via: undefined });
    expect(roomTrait(stall).exits?.[Direction.NORTHEAST]).toBeUndefined();
  });

  it('the default connection still stamps both directions', () => {
    world.connectRooms(landing.id, stall.id, Direction.SOUTHWEST);

    expect(roomTrait(landing).exits?.[Direction.SOUTHWEST]?.destination).toBe(stall.id);
    expect(roomTrait(stall).exits?.[Direction.NORTHEAST]?.destination).toBe(landing.id);
  });

  it('a doored one-way connection marks the door one-way, stamps one side, and places the door in room1', () => {
    const gate = world.createEntity('iron gate', 'door');
    gate.add(new DoorTrait({ room1: landing.id, room2: stall.id }));

    world.connectRooms(landing.id, stall.id, Direction.SOUTHWEST, gate.id, { oneWay: true });

    expect(roomTrait(landing).exits?.[Direction.SOUTHWEST]).toEqual({ destination: stall.id, via: gate.id });
    expect(roomTrait(stall).exits?.[Direction.NORTHEAST]).toBeUndefined();
    expect((gate.get(TraitType.DOOR) as DoorTrait).bidirectional).toBe(false);
    expect(world.getLocation(gate.id)).toBe(landing.id);
  });
});
