/**
 * Deadly-room death action (ADR-224 / ADR-227).
 *
 * The generic redirect target the deadly-room and deadly-exit transformers
 * send lethal commands to. Verifies `execute()` actually applies the lethal
 * transition (HealthTrait mutation — not just event emission) with the
 * cause/messageId threaded through the parsed command's extras, and that
 * `report()` emits the canonical death event `execute()` produced.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { deadlyRoomDeathAction } from '../../../src/actions/standard/deadly-room-death/deadly-room-death';
import {
  DEADLY_ROOM_DEATH_ACTION_ID,
  DEADLY_ROOM_CAUSE_KEY,
  DEADLY_ROOM_MESSAGE_KEY,
  PLAYER_DIED_EVENT,
} from '../../../src/death';
import { TraitType, WorldModel, IFEntity, HealthTrait } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

describe('deadlyRoomDeathAction — the generic death redirect target', () => {
  let world: WorldModel;
  let player: IFEntity;
  let context: ActionContext;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    player = setup.player;
  });

  test('execute() kills the player with the extras-threaded cause (state mutation, not just events)', () => {
    const command = createCommand(DEADLY_ROOM_DEATH_ACTION_ID, {
      extras: {
        [DEADLY_ROOM_CAUSE_KEY]: 'aragain_falls',
        [DEADLY_ROOM_MESSAGE_KEY]: 'dungeo.falls.death',
      },
    });
    context = createRealTestContext(deadlyRoomDeathAction, world, command);

    expect(deadlyRoomDeathAction.validate(context).valid).toBe(true);
    deadlyRoomDeathAction.execute(context);

    // THE mutation: the player's HealthTrait is terminally dead with this cause.
    const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
    expect(health?.dead).toBe(true);
    expect(health?.causeOfDeath).toBe('aragain_falls');

    // report() emits the canonical event execute() produced.
    const events = deadlyRoomDeathAction.report(context);
    const death = events.find((e) => e.type === PLAYER_DIED_EVENT);
    expect(death).toBeDefined();
    expect(death!.data).toMatchObject({
      cause: 'aragain_falls',
      messageId: 'dungeo.falls.death',
    });
  });

  test('execute() defaults the cause to "hazard" when extras carry none', () => {
    const command = createCommand(DEADLY_ROOM_DEATH_ACTION_ID);
    context = createRealTestContext(deadlyRoomDeathAction, world, command);

    deadlyRoomDeathAction.execute(context);

    const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
    expect(health?.dead).toBe(true);
    expect(health?.causeOfDeath).toBe('hazard');
  });
});
