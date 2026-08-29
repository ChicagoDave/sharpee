/**
 * The stealing action (ADR-328 D5): a theft out of another actor's
 * possession in the same room. REAL-PATH: real WorldModel, the real
 * action context with the thief as actor, the real four phases.
 * Assertions are on world state (where the item is) and on the reported
 * fact (`if.event.taken` with the victim as `fromLocation`); every refusal
 * leaves the item where it was.
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
import { createActionContext, type ValidatedCommand } from '@sharpee/stdlib';
import { createFixtureRandomService } from '../../test-support/fixture-random-service';
import { stealingAction } from './stealing-action';
import { STEAL_ACTION_ID, StealMessages } from './types';

function actor(world: WorldModel, name: string, room: IFEntity, isPlayer = false): IFEntity {
  const a = world.createEntity(name, EntityType.ACTOR);
  a.add(new ActorTrait(isPlayer ? { isPlayer: true } : {}));
  a.add(new ContainerTrait());
  world.moveEntity(a.id, room.id);
  return a;
}

function room(world: WorldModel, name: string): IFEntity {
  const r = world.createEntity(name, EntityType.ROOM);
  r.add(new RoomTrait());
  r.add(new ContainerTrait());
  return r;
}

function stage() {
  const world = new WorldModel();
  const cellar = room(world, 'Cellar');
  const attic = room(world, 'Attic');
  const player = actor(world, 'yourself', cellar, true);
  world.setPlayer(player.id);
  const thief = actor(world, 'thief', cellar);
  const coins = world.createEntity('bag of coins', EntityType.OBJECT);
  world.moveEntity(coins.id, player.id);
  return { world, cellar, attic, player, thief, coins };
}

/** Run the stealing action as `thief` on `item` (or with no object); returns the phase outcome. */
function steal(world: WorldModel, player: IFEntity, thief: IFEntity, item?: IFEntity) {
  const command: ValidatedCommand = {
    parsed: {
      rawInput: item ? `steal ${item.name}` : 'steal',
      action: STEAL_ACTION_ID,
      tokens: [],
      structure: { verb: { tokens: [0], text: 'steal', head: 'steal' } },
      pattern: 'PROGRAMMATIC',
      confidence: 1.0,
    },
    actionId: STEAL_ACTION_ID,
    ...(item ? { directObject: { entity: item, parsed: { text: item.name, candidates: [item.name] } } } : {}),
  };
  const context = createActionContext(world, player, stealingAction, command, createFixtureRandomService(1), undefined, thief);
  const validation = stealingAction.validate(context);
  if (!validation.valid) return { valid: false as const, error: validation.error, events: stealingAction.blocked!(context, validation) };
  stealingAction.execute(context);
  return { valid: true as const, events: stealingAction.report!(context) };
}

describe('stealing — a theft out of another actor’s possession (ADR-328 D5)', () => {
  it('moves the item into the thief and reports if.event.taken with the victim as fromLocation', () => {
    const { world, player, thief, coins } = stage();

    const result = steal(world, player, thief, coins);

    expect(result.valid).toBe(true);
    expect(world.getLocation(coins.id)).toBe(thief.id);
    const taken = result.events.find((e) => e.type === 'if.event.taken')!;
    expect(taken.entities.actor).toBe(thief.id);
    expect(taken.data).toMatchObject({ itemId: coins.id, fromLocation: player.id, actorId: thief.id });
    // The behavior narrates; the fact itself is silent.
    expect((taken.data as { messageId?: string }).messageId).toBeUndefined();
  });

  it('refuses with no target, and nothing moves', () => {
    const { world, player, thief, coins } = stage();

    const result = steal(world, player, thief);

    expect(result).toMatchObject({ valid: false, error: StealMessages.NO_TARGET });
    expect(world.getLocation(coins.id)).toBe(player.id);
  });

  it('refuses an item nobody holds — the floor is taking’s business, not stealing’s', () => {
    const { world, cellar, player, thief, coins } = stage();
    world.moveEntity(coins.id, cellar.id);

    const result = steal(world, player, thief, coins);

    expect(result).toMatchObject({ valid: false, error: StealMessages.NOT_HELD });
    expect(world.getLocation(coins.id)).toBe(cellar.id);
  });

  it('refuses when the holder is in another room, and the refusal is silent', () => {
    const { world, attic, player, thief, coins } = stage();
    world.moveEntity(player.id, attic.id);

    const result = steal(world, player, thief, coins);

    expect(result).toMatchObject({ valid: false, error: StealMessages.NOT_HERE });
    expect(world.getLocation(coins.id)).toBe(player.id);
    expect(result.events).toHaveLength(1);
    expect((result.events[0].data as { messageId?: string }).messageId).toBeUndefined();
  });
});
