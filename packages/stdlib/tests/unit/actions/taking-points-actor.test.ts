/**
 * taking-points-actor.test.ts — ADR-129 take-points belong to the
 * protagonist (ADR-328 Phase 6). A non-player actor taking a pointed item
 * through the same taking action moves it but awards nothing; the player
 * taking it awards its points once.
 *
 * REAL-PATH: real WorldModel (its score ledger), the real context factory
 * with a non-player actor, the real taking action. Assertions are on
 * world state — the item's location and `world.getScore()`.
 */
import { describe, it, expect } from 'vitest';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  IdentityTrait,
  RoomTrait,
} from '@sharpee/world-model';
import { takingAction } from '../../../src/actions/standard/taking';
import { IFActions } from '../../../src/actions/constants';
import { createActionContext } from '../../../src/actions/enhanced-context';
import { createCommand } from '../../test-utils';
import { createFixtureRandomService } from '../../test-utils/fixture-random-service';

function buildWorld() {
  const world = new WorldModel();
  const vault = world.createEntity('Vault', EntityType.ROOM);
  vault.add(new RoomTrait());

  const player = world.createEntity('You', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.moveEntity(player.id, vault.id);
  world.setPlayer(player.id);

  const thief = world.createEntity('thief', EntityType.ACTOR);
  thief.add(new ActorTrait());
  thief.add(new ContainerTrait());
  world.moveEntity(thief.id, vault.id);

  const jewel = world.createEntity('jewel', EntityType.OBJECT);
  jewel.add(new IdentityTrait({ name: 'jewel', points: 10, pointsDescription: 'Found the jewel' }));
  world.moveEntity(jewel.id, vault.id);

  return { world, vault, player, thief, jewel };
}

function take(world: WorldModel, player: ReturnType<typeof buildWorld>['player'], item: ReturnType<typeof buildWorld>['jewel'], actor?: ReturnType<typeof buildWorld>['thief']) {
  const command = createCommand(IFActions.TAKING, { entity: item });
  const context = createActionContext(world, player, takingAction, command, createFixtureRandomService(1), undefined, actor);
  expect(takingAction.validate(context).valid).toBe(true);
  takingAction.execute(context);
}

describe('take-points belong to the protagonist (ADR-129; ADR-328)', () => {
  it('a non-player actor taking a pointed item moves it and awards nothing', () => {
    const { world, thief, jewel } = buildWorld();
    expect(world.getScore()).toBe(0);

    take(world, world.getPlayer()!, jewel, thief);

    expect(world.getLocation(jewel.id)).toBe(thief.id);
    expect(world.getScore()).toBe(0);
  });

  it('the player taking the same item awards its points', () => {
    const { world, player, jewel } = buildWorld();

    take(world, player, jewel);

    expect(world.getLocation(jewel.id)).toBe(player.id);
    expect(world.getScore()).toBe(10);
  });
});
