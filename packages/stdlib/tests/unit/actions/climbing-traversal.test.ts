/**
 * climbing-traversal.test.ts — a climb up or down is the walker's traversal
 * (alignment finding D21; ADR-378 D7, ADR-379): climbing delegates to going,
 * so the traversal system's gates stop a climber exactly as they stop a
 * walker — a blocked way, a closed or locked hatch overhead, a hidden way —
 * and a computed way up is drawn once.
 *
 * Every case drives the action through the phase runner on a real
 * WorldModel and asserts on where the climber is afterwards.
 */

import { describe, test, expect } from 'vitest';
import {
  Direction,
  type DirectionType,
  RoomTrait,
  DoorTrait,
  OpenableTrait,
  LockableTrait,
  WorldModel,
  IFEntity,
  exitBlockedKey,
  exitHiddenKey,
  exitMessageKey,
} from '@sharpee/world-model';
import { climbingAction } from '../../../src/actions/standard/climbing';
import { IFActions } from '../../../src/actions/constants';
import {
  setupBasicWorld,
  createRealTestContext,
  createCommand,
  executeWithValidation,
} from '../../test-utils';

/** room --up--> loft (and down again), the player in room. */
function setup(options: { hatch?: 'closed' | 'locked' } = {}): { world: WorldModel; player: IFEntity; room: IFEntity; loft: IFEntity } {
  const { world, player, room } = setupBasicWorld();
  const loft = world.createEntity('Loft', 'room');
  loft.add(new RoomTrait());
  let hatch: IFEntity | undefined;
  if (options.hatch) {
    hatch = world.createEntity('hatch', 'door');
    hatch.add(new DoorTrait({ room1: room.id, room2: loft.id }));
    hatch.add(new OpenableTrait({ isOpen: false }));
    if (options.hatch === 'locked') hatch.add(new LockableTrait({ isLocked: true }));
  }
  world.connectRooms(room.id, loft.id, Direction.UP, hatch?.id);
  return { world, player, room, loft };
}

function climb(world: WorldModel, direction: DirectionType) {
  const command = createCommand(IFActions.CLIMBING);
  command.parsed.extras = { direction };
  return executeWithValidation(climbingAction, createRealTestContext(climbingAction, world, command));
}

const messageIds = (events: { data?: any }[]) => events.map((e) => e.data?.messageId).filter(Boolean) as string[];

describe('climb up / climb down ask traversal (D21)', () => {
  test('an open way: the climber is in the loft, with the climbed line and going\'s arrival', () => {
    const { world, player, room, loft } = setup();

    const events = climb(world, Direction.UP);

    expect(world.getLocation(player.id)).toBe(loft.id);
    expect(messageIds(events)).toContain('if.action.climbing.climbed_up');
    expect(events.find((e) => e.type === 'if.event.actor_moved')?.data).toMatchObject({ fromRoom: room.id, toRoom: loft.id });

    climb(world, Direction.DOWN);
    expect(world.getLocation(player.id)).toBe(room.id);
  });

  test('a blocked way up stops the climber with its phrase', () => {
    const { world, player, room } = setup();
    world.registerEvaluator(exitBlockedKey(room.id, Direction.UP), () => true);
    world.registerEvaluator(exitMessageKey(room.id, Direction.UP), () => 'The ladder is roped off.');

    const events = climb(world, Direction.UP);

    expect(world.getLocation(player.id)).toBe(room.id);
    expect(events.find((e) => e.data?.params?.message === 'The ladder is roped off.')).toBeDefined();
  });

  test('a closed hatch overhead stops the climber in going\'s words', () => {
    const { world, player, room } = setup({ hatch: 'closed' });

    const events = climb(world, Direction.UP);

    expect(world.getLocation(player.id)).toBe(room.id);
    expect(messageIds(events)).toContain('if.action.going.door_closed');
    expect(messageIds(events)).not.toContain('if.action.climbing.climbed_up');
  });

  test('a locked hatch overhead stops the climber in going\'s words', () => {
    const { world, player, room } = setup({ hatch: 'locked' });

    const events = climb(world, Direction.UP);

    expect(world.getLocation(player.id)).toBe(room.id);
    expect(messageIds(events)).toContain('if.action.going.door_locked');
  });

  test('a hidden way, or none at all, is climbing\'s own "can\'t climb up from here"', () => {
    const { world, player, room } = setup();
    world.registerEvaluator(exitHiddenKey(room.id, Direction.UP), () => true);

    expect(messageIds(climb(world, Direction.UP))).toContain('if.action.climbing.cant_go_that_way');
    expect(world.getLocation(player.id)).toBe(room.id);
    expect(messageIds(climb(world, Direction.DOWN))).toContain('if.action.climbing.cant_go_that_way');
    expect(world.getLocation(player.id)).toBe(room.id);
  });

  test('a computed way up is drawn once and the climber lands where it drew', () => {
    const { world, player, room, loft } = setup();
    const roof = world.createEntity('Roof', 'room');
    roof.add(new RoomTrait());
    room.add({ type: 'test.trait.shifting-ladder', computedExits: { [Direction.UP]: { candidates: [loft.id, roof.id] } } } as never);
    let draws = 0;
    world.registerExitResolver('test.trait.shifting-ladder', () => {
      draws += 1;
      return { kind: 'exit', destination: roof.id };
    });

    climb(world, Direction.UP);

    expect(world.getLocation(player.id)).toBe(roof.id);
    expect(draws).toBe(1);
  });
});
