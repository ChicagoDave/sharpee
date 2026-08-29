/**
 * The carousel spins for the player alone (ADR-295 resolver; ADR-328 D5).
 * MDL's CAROUSEL-EXIT is the player's exit function and ROBBER never
 * traverses exits, so a non-player mover through the spinning Round Room
 * crosses the static topology and draws nothing on `dungeo.round-room.exit`
 * — the player's stream is not disturbed by the thief's comings and goings.
 *
 * REAL-PATH: real WorldModel with the resolver registered as the story
 * registers it, the real going action run as the NPC and as the player, a
 * real EngineRandomService. Assertions on the mover's location and on the
 * point's stream state.
 */

import { describe, it, expect } from 'vitest';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  NpcTrait,
  RoomTrait,
  Direction,
  type IFEntity,
} from '@sharpee/world-model';
import { EngineRandomService } from '@sharpee/engine';
import { createActionContext, goingAction, IFActions, type ValidatedCommand } from '@sharpee/stdlib';
import { RoundRoomTrait } from '../traits/round-room-trait';
import { registerCarouselExits } from './carousel-exit-resolver';

const POINT = 'dungeo.round-room.exit';

function stage() {
  const world = new WorldModel();
  const roundRoom = world.createEntity('Round Room', EntityType.ROOM);
  const north = world.createEntity('North Cave', EntityType.ROOM);
  const south = world.createEntity('South Cave', EntityType.ROOM);
  for (const r of [north, south]) {
    r.add(new RoomTrait());
    r.add(new ContainerTrait());
  }
  roundRoom.add(new RoomTrait({
    exits: {
      [Direction.NORTH]: { destination: north.id },
      [Direction.SOUTH]: { destination: south.id },
    },
  }));
  roundRoom.add(new ContainerTrait());
  roundRoom.add(new RoundRoomTrait({ isFixed: false }));
  registerCarouselExits(world, { roundRoom: roundRoom.id, lowRoom: '', machineRoom: '', teaRoom: '' });

  const player = world.createEntity('yourself', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.moveEntity(player.id, south.id);
  world.setPlayer(player.id);

  const thief = world.createEntity('thief', EntityType.ACTOR);
  thief.add(new ActorTrait());
  thief.add(new ContainerTrait());
  thief.add(new NpcTrait({ canMove: true }));
  world.moveEntity(thief.id, roundRoom.id);

  return { world, roundRoom, north, south, player, thief };
}

function goNorth(world: WorldModel, player: IFEntity, actor: IFEntity, random: EngineRandomService) {
  const command: ValidatedCommand = {
    parsed: {
      rawInput: 'north',
      action: IFActions.GOING,
      tokens: [],
      structure: { verb: { tokens: [0], text: 'north', head: 'north' } },
      pattern: 'PROGRAMMATIC',
      confidence: 1.0,
      extras: { direction: Direction.NORTH },
    },
    actionId: IFActions.GOING,
  };
  const context = createActionContext(world, player, goingAction, command, random, undefined, actor);
  expect(goingAction.validate(context).valid).toBe(true);
  goingAction.execute(context);
}

describe('the carousel spins for the player alone (ADR-328 D5)', () => {
  it('an NPC leaving the spinning Round Room crosses the static topology and draws nothing', () => {
    const { world, north, player, thief } = stage();
    const random = new EngineRandomService(7);

    goNorth(world, player, thief, random);

    expect(world.getLocation(thief.id)).toBe(north.id);
    expect(random.serializeStreamStates()[POINT]).toBeUndefined();
  });

  it('the player leaving the spinning Round Room draws the carousel exit', () => {
    const { world, roundRoom, north, south, player } = stage();
    world.moveEntity(player.id, roundRoom.id);
    const random = new EngineRandomService(7);

    goNorth(world, player, player, random);

    expect([north.id, south.id]).toContain(world.getLocation(player.id));
    expect(random.serializeStreamStates()[POINT]).toBeDefined();
  });
});
