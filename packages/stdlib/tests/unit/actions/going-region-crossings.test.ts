/**
 * The going action's region boundary events (ADR-149; ADR-360 D5).
 *
 * A room is in at most one region, so a move leaves at most one region and
 * enters at most one: going emits at most one `if.event.region_exited` and one
 * `if.event.region_entered`, each naming the other side, and nothing for a move
 * within one region. Every test also asserts the player actually moved.
 * Owner context: @sharpee/stdlib — going action
 */

import { describe, test, expect } from 'vitest';
import { goingAction } from '../../../src/actions/standard/going';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, Direction, RoomTrait, EntityType } from '@sharpee/world-model';
import { createRealTestContext, executeWithValidation, createCommand } from '../../test-utils';

/** Two rooms joined north/south, each optionally assigned to a region. */
function twoRooms(fromRegion?: string, toRegion?: string) {
  const world = new WorldModel();
  world.createRegion('reg-forest', { name: 'Forest' });
  world.createRegion('reg-underground', { name: 'Underground' });

  const player = world.createEntity('yourself', 'object');
  player.add({ type: TraitType.ACTOR, isPlayer: true });
  world.setPlayer(player.id);

  const from = world.createEntity('Clearing', EntityType.ROOM);
  const to = world.createEntity('Cellar', EntityType.ROOM);
  from.add(new RoomTrait({ exits: { [Direction.NORTH]: { destination: to.id } } }));
  to.add(new RoomTrait({ exits: { [Direction.SOUTH]: { destination: from.id } }, visited: true }));
  if (fromRegion) world.assignRoom(from.id, fromRegion);
  if (toRegion) world.assignRoom(to.id, toRegion);
  world.moveEntity(player.id, from.id);

  const command = createCommand(IFActions.GOING);
  command.parsed.extras = { direction: Direction.NORTH };
  const events = executeWithValidation(goingAction, createRealTestContext(goingAction, world, command));

  expect(world.getLocation(player.id)).toBe(to.id);
  return { player, events };
}

const crossings = (events: { type: string; data?: unknown }[]) =>
  events
    .filter(e => e.type === 'if.event.region_exited' || e.type === 'if.event.region_entered')
    .map(e => [e.type, e.data]);

describe('goingAction — region boundary events', () => {
  test('a move between two regions emits one exited then one entered, each naming the other', () => {
    const { player, events } = twoRooms('reg-forest', 'reg-underground');

    expect(crossings(events)).toEqual([
      ['if.event.region_exited', { actorId: player.id, regionId: 'reg-forest', toRegionId: 'reg-underground' }],
      ['if.event.region_entered', { actorId: player.id, regionId: 'reg-underground', fromRegionId: 'reg-forest' }],
    ]);
  });

  test('a move into a region from a room with none emits only entered', () => {
    const { player, events } = twoRooms(undefined, 'reg-underground');

    expect(crossings(events)).toEqual([
      ['if.event.region_entered', { actorId: player.id, regionId: 'reg-underground', fromRegionId: undefined }],
    ]);
  });

  test('a move out of a region into a room with none emits only exited', () => {
    const { player, events } = twoRooms('reg-forest', undefined);

    expect(crossings(events)).toEqual([
      ['if.event.region_exited', { actorId: player.id, regionId: 'reg-forest', toRegionId: undefined }],
    ]);
  });

  test('a move within one region emits no region event', () => {
    const { events } = twoRooms('reg-underground', 'reg-underground');

    expect(crossings(events)).toEqual([]);
  });
});
