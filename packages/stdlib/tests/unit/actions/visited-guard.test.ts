/**
 * visited-guard.test.ts — `RoomTrait.visited` is the reader's first look
 * (Chord's `first time` prose lowers to `initialDescription`), so only the
 * player's own arrival or look marks it (ADR-328 Phase 4). A non-player actor
 * walking into or looking at a room moves and reports as itself but leaves
 * the flag untouched, so the player's first-visit description is not spent.
 *
 * REAL-PATH: real WorldModel, the real context factory with a non-player
 * actor, the real going/looking actions. Assertions are on world state.
 */
import { describe, it, expect } from 'vitest';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  RoomBehavior,
  Direction,
} from '@sharpee/world-model';
import { goingAction } from '../../../src/actions/standard/going';
import { lookingAction } from '../../../src/actions/standard/looking';
import { IFActions } from '../../../src/actions/constants';
import { createActionContext } from '../../../src/actions/enhanced-context';
import { createCommand } from '../../test-utils';
import { createFixtureRandomService } from '../../test-utils/fixture-random-service';

function buildWorld() {
  const world = new WorldModel();
  const hall = world.createEntity('Hall', EntityType.ROOM);
  const cellar = world.createEntity('Cellar', EntityType.ROOM);
  hall.add(new RoomTrait({ exits: { [Direction.NORTH]: { destination: cellar.id } } }));
  cellar.add(new RoomTrait({ exits: { [Direction.SOUTH]: { destination: hall.id } } }));

  const player = world.createEntity('You', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.moveEntity(player.id, hall.id);
  world.setPlayer(player.id);

  const npc = world.createEntity('mercenary', EntityType.ACTOR);
  npc.add(new ActorTrait());
  npc.add(new ContainerTrait());
  world.moveEntity(npc.id, hall.id);

  return { world, hall, cellar, player, npc };
}

describe('`visited` is marked only by the player (ADR-328 Phase 4)', () => {
  it('an NPC walking into a room arrives but does not mark it visited; the player then does', () => {
    const { world, cellar, player, npc } = buildWorld();
    const random = createFixtureRandomService(1);

    const asNpc = createCommand(IFActions.GOING);
    asNpc.parsed.extras = { direction: Direction.NORTH };
    const npcContext = createActionContext(world, player, goingAction, asNpc, random, undefined, npc);
    expect(goingAction.validate(npcContext).valid).toBe(true);
    goingAction.execute(npcContext);

    expect(world.getLocation(npc.id)).toBe(cellar.id);
    expect(RoomBehavior.hasBeenVisited(cellar)).toBe(false);

    const asPlayer = createCommand(IFActions.GOING);
    asPlayer.parsed.extras = { direction: Direction.NORTH };
    const playerContext = createActionContext(world, player, goingAction, asPlayer, random);
    expect(goingAction.validate(playerContext).valid).toBe(true);
    goingAction.execute(playerContext);

    expect(world.getLocation(player.id)).toBe(cellar.id);
    expect(RoomBehavior.hasBeenVisited(cellar)).toBe(true);
  });

  it('an NPC looking at its room does not mark it visited; the player looking at theirs does', () => {
    const { world, hall, cellar, player, npc } = buildWorld();
    const random = createFixtureRandomService(1);
    world.moveEntity(npc.id, cellar.id);

    const npcContext = createActionContext(world, player, lookingAction, createCommand(IFActions.LOOKING), random, undefined, npc);
    expect(lookingAction.validate(npcContext).valid).toBe(true);
    lookingAction.execute(npcContext);
    expect(RoomBehavior.hasBeenVisited(cellar)).toBe(false);

    const playerContext = createActionContext(world, player, lookingAction, createCommand(IFActions.LOOKING), random);
    expect(lookingAction.validate(playerContext).valid).toBe(true);
    lookingAction.execute(playerContext);
    expect(RoomBehavior.hasBeenVisited(hall)).toBe(true);
    expect(RoomBehavior.hasBeenVisited(cellar)).toBe(false);
  });
});
