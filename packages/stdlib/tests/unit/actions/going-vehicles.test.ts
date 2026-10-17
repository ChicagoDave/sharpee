/**
 * goingAction from inside a vehicle (ADR-366 D5, D6, D7a)
 *
 * The vehicle's movement model decides what GO means: a line rides, a
 * vehicle with no model stays, a streets vehicle is steered into rooms that
 * admit it. Every case asserts where the vehicle and the player end up.
 */

import { describe, test, expect } from 'vitest';
import { goingAction } from '../../../src/actions/standard/going';
import { IFActions } from '../../../src/actions/constants';
import {
  TraitType,
  Direction,
  RoomTrait,
  VehicleTrait,
  type VehicleModel,
  IFEntity,
  WorldModel
} from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  executeWithValidation,
  createCommand
} from '../../test-utils';

interface VehicleFixture {
  world: WorldModel;
  player: IFEntity;
  room: IFEntity;
  north: IFEntity;
  vehicle: IFEntity;
}

/** room --north--> north, with the player in a vehicle standing in room. */
function setupVehicleWorld(model: VehicleModel | undefined): VehicleFixture {
  const { world, player, room } = setupBasicWorld();

  const north = world.createEntity('North Room', 'object');
  north.add(new RoomTrait());
  room.getTrait(RoomTrait)!.exits = { [Direction.NORTH]: { destination: north.id } };

  const vehicle = world.createEntity('cart', 'object');
  vehicle.add(new VehicleTrait({ model }));
  vehicle.add({ type: TraitType.CONTAINER, enterable: true } as any);
  world.moveEntity(vehicle.id, room.id);
  world.moveEntity(player.id, vehicle.id);

  return { world, player, room, north, vehicle };
}

function goNorth(world: WorldModel) {
  const command = createCommand(IFActions.GOING);
  command.parsed.extras = { direction: Direction.NORTH };
  return createRealTestContext(goingAction, world, command);
}

function refusal(events: { data?: any }[]): string | undefined {
  return events.map(e => e.data?.messageId).find((id: unknown) =>
    typeof id === 'string' && id.includes('vehicle_'));
}

describe('goingAction from inside a vehicle (ADR-366)', () => {
  test('a line vehicle rides: GO is refused and nothing moves', () => {
    const { world, player, room, north, vehicle } = setupVehicleWorld({
      kind: 'line', stops: ['a', 'b'], oneWay: false
    });

    const events = executeWithValidation(goingAction, goNorth(world));

    expect(refusal(events)).toMatch(/vehicle_ride$/);
    expect(world.getLocation(vehicle.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(vehicle.id);
    expect(world.getContents(north.id)).toHaveLength(0);
  });

  test('a vehicle with no model stays: GO is refused and nothing moves', () => {
    const { world, player, room, vehicle } = setupVehicleWorld(undefined);

    const events = executeWithValidation(goingAction, goNorth(world));

    expect(refusal(events)).toMatch(/vehicle_cannot_walk$/);
    expect(world.getLocation(vehicle.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(vehicle.id);
  });

  test('a streets vehicle refuses a room that does not admit it', () => {
    const { world, player, room, vehicle } = setupVehicleWorld({ kind: 'streets' });

    const events = executeWithValidation(goingAction, goNorth(world));

    expect(refusal(events)).toMatch(/vehicle_cannot_go$/);
    expect(world.getLocation(vehicle.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(vehicle.id);
  });

  test('a streets vehicle steered into an admitting room carries the player there', () => {
    const { world, player, north, vehicle } = setupVehicleWorld({ kind: 'streets' });
    north.getTrait(RoomTrait)!.admits.push(vehicle.id);

    const events = executeWithValidation(goingAction, goNorth(world));

    expect(refusal(events)).toBeUndefined();
    expect(world.getLocation(vehicle.id)).toBe(north.id);
    expect(world.getLocation(player.id)).toBe(vehicle.id);
    expect(world.getContainingRoom(player.id)?.id).toBe(north.id);
  });
});
