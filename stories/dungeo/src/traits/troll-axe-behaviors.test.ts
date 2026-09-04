/**
 * The troll's axe (ADR-118 interceptor; ADR-328 D5): white-hot to anyone
 * else while the troll lives — but the troll recovers his own axe through
 * the same real taking action. REAL-PATH: real WorldModel, the interceptor
 * registered as the story registers it, the real taking action run as the
 * troll and as the player. Assertions on where the axe is.
 */

import { describe, it, expect } from 'vitest';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  HealthTrait,
  RoomTrait,
  WeaponTrait,
  type IFEntity,
} from '@sharpee/world-model';
import { createActionContext, takingAction, IFActions, type ValidatedCommand } from '@sharpee/stdlib';
import { createFixtureRandomService } from '../test-support/fixture-random-service';
import { TrollAxeTrait } from './troll-axe-trait';
import { TrollAxeTakingInterceptor, TrollAxeMessages } from './troll-axe-behaviors';

function stage() {
  const world = new WorldModel();
  const room = world.createEntity('Troll Room', EntityType.ROOM);
  room.add(new RoomTrait());
  room.add(new ContainerTrait());
  world.registerActionInterceptor(TrollAxeTrait.type, IFActions.TAKING, TrollAxeTakingInterceptor);

  const player = world.createEntity('yourself', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.moveEntity(player.id, room.id);
  world.setPlayer(player.id);

  const troll = world.createEntity('troll', EntityType.ACTOR);
  troll.add(new ActorTrait());
  troll.add(new ContainerTrait());
  troll.add(new HealthTrait({ health: 100, maxHealth: 100 }));
  world.moveEntity(troll.id, room.id);

  const axe = world.createEntity('bloody axe', EntityType.OBJECT);
  axe.add(new WeaponTrait({}));
  axe.add(new TrollAxeTrait({ guardianId: troll.id }));
  world.moveEntity(axe.id, room.id);
  return { world, room, player, troll, axe };
}

function takeAxe(world: WorldModel, player: IFEntity, axe: IFEntity, actor: IFEntity) {
  const command: ValidatedCommand = {
    parsed: {
      rawInput: 'take axe',
      action: IFActions.TAKING,
      tokens: [],
      structure: { verb: { tokens: [0], text: 'take', head: 'take' } },
      pattern: 'PROGRAMMATIC',
      confidence: 1.0,
    },
    actionId: IFActions.TAKING,
    directObject: { entity: axe, parsed: { text: 'axe', candidates: ['axe'] } },
  };
  const context = createActionContext(world, player, takingAction, command, createFixtureRandomService(1), undefined, actor);
  const validation = takingAction.validate(context);
  if (validation.valid) takingAction.execute(context);
  return validation;
}

describe("the troll's axe: white-hot to others, recoverable by the guardian (ADR-328 D5)", () => {
  it('the player is refused while the troll lives, and the axe stays on the floor', () => {
    const { world, room, player, axe } = stage();

    const validation = takeAxe(world, player, axe, player);

    expect(validation).toMatchObject({ valid: false, error: TrollAxeMessages.WHITE_HOT });
    expect(world.getLocation(axe.id)).toBe(room.id);
  });

  it('the troll takes his own axe through the same action', () => {
    const { world, player, troll, axe } = stage();

    const validation = takeAxe(world, player, axe, troll);

    expect(validation.valid).toBe(true);
    expect(world.getLocation(axe.id)).toBe(troll.id);
  });
});
