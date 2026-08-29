/**
 * multi-object-actor.test.ts — the multi-object expander builds its candidate
 * set from the command's ACTOR (ADR-328 Phase 4), never from the player: an
 * NPC's `take all` in another room expands from the NPC's room and the items
 * land in the NPC; an NPC's `drop all` expands from the NPC's own hands.
 *
 * REAL-PATH: real WorldModel, the real context factory with a non-player
 * actor, the real taking/dropping actions. Assertions are on world state.
 */
import { describe, it, expect } from 'vitest';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  type IFEntity,
} from '@sharpee/world-model';
import { takingAction } from '../../../src/actions/standard/taking';
import { droppingAction } from '../../../src/actions/standard/dropping';
import { IFActions } from '../../../src/actions/constants';
import { createActionContext } from '../../../src/actions/enhanced-context';
import { expandMultiObject } from '../../../src/helpers/multi-object-handler';
import { createCommand } from '../../test-utils';
import { createFixtureRandomService } from '../../test-utils/fixture-random-service';

function buildWorld() {
  const world = new WorldModel();
  const hall = world.createEntity('Hall', EntityType.ROOM);
  hall.add(new RoomTrait());
  const cellar = world.createEntity('Cellar', EntityType.ROOM);
  cellar.add(new RoomTrait());

  const player = world.createEntity('You', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.moveEntity(player.id, hall.id);
  world.setPlayer(player.id);

  const npc = world.createEntity('mercenary', EntityType.ACTOR);
  npc.add(new ActorTrait());
  npc.add(new ContainerTrait());
  world.moveEntity(npc.id, cellar.id);

  const coin = world.createEntity('copper coin', EntityType.OBJECT);
  world.moveEntity(coin.id, hall.id);
  const gem = world.createEntity('green gem', EntityType.OBJECT);
  world.moveEntity(gem.id, cellar.id);
  const rope = world.createEntity('rope', EntityType.OBJECT);
  world.moveEntity(rope.id, cellar.id);

  return { world, hall, cellar, player, npc, coin, gem, rope };
}

function allCommand(actionId: string, entity: IFEntity) {
  const command = createCommand(actionId, { entity, rawInput: 'all' });
  (command.parsed.structure.directObject as { isAll?: boolean }).isAll = true;
  return command;
}

describe('multi-object expansion runs from the actor (ADR-328 Phase 4)', () => {
  it("`take all` as the NPC expands from the NPC's room, not the player's", () => {
    const { world, player, npc, gem, rope, coin } = buildWorld();
    const command = allCommand(IFActions.TAKING, gem);
    const context = createActionContext(world, player, takingAction, command, createFixtureRandomService(1), undefined, npc);

    const names = expandMultiObject(context, { scope: 'reachable' }).map(i => i.entity.name).sort();

    expect(names).toEqual([gem.name, rope.name].sort());
    expect(names).not.toContain(coin.name);
  });

  it("`take all` as the NPC lands the NPC's room's items in the NPC and leaves the player's room alone", () => {
    const { world, hall, cellar, player, npc, gem, rope, coin } = buildWorld();
    const command = allCommand(IFActions.TAKING, gem);
    const context = createActionContext(world, player, takingAction, command, createFixtureRandomService(1), undefined, npc);

    expect(world.getLocation(gem.id)).toBe(cellar.id);
    expect(takingAction.validate(context).valid).toBe(true);
    takingAction.execute(context);

    expect(world.getLocation(gem.id)).toBe(npc.id);
    expect(world.getLocation(rope.id)).toBe(npc.id);
    expect(world.getLocation(coin.id)).toBe(hall.id);
    expect(world.getContents(player.id)).toHaveLength(0);
  });

  it("`drop all` as the NPC expands from the NPC's hands and drops into the NPC's room", () => {
    const { world, cellar, player, npc, gem, coin } = buildWorld();
    world.moveEntity(gem.id, npc.id);
    world.moveEntity(coin.id, player.id);
    const command = allCommand(IFActions.DROPPING, gem);
    const context = createActionContext(world, player, droppingAction, command, createFixtureRandomService(1), undefined, npc);

    expect(droppingAction.validate(context).valid).toBe(true);
    droppingAction.execute(context);

    expect(world.getLocation(gem.id)).toBe(cellar.id);
    // The player's coin was never a candidate.
    expect(world.getLocation(coin.id)).toBe(player.id);
  });
});
