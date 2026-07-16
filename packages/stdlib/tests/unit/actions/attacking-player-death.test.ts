/**
 * Attacking → player death re-point (ADR-224 Phase 3).
 *
 * The generic attacking action's lethal branch now routes a *player* target through
 * `killPlayer` (canonical `if.event.player.died`, `cause:'combat'`) instead of the
 * generic `if.event.death`; an NPC target is unchanged. Drives `report()` directly
 * with a `killed` attackResult (self-attack is grammar-blocked in normal play, so
 * this branch is exercised at the report level, not end-to-end).
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { attackingAction } from '../../../src/actions/standard/attacking';
import { IFActions } from '../../../src/actions/constants';
import { PLAYER_DIED_EVENT } from '../../../src/death';
import { TraitType, WorldModel, EntityType, IFEntity, HealthTrait } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

describe('attackingAction — player-death re-point (ADR-224)', () => {
  let world: WorldModel;
  let player: IFEntity;
  let room: IFEntity;
  let npc: IFEntity;
  let context: ActionContext;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    player = setup.player;
    room = setup.room;
    npc = world.createEntity('goblin', EntityType.ACTOR);
    world.moveEntity(npc.id, room.id);
  });

  test('a lethal attack on the PLAYER emits if.event.player.died (cause combat), not if.event.death', () => {
    const command = createCommand(IFActions.ATTACKING, { entity: player, text: 'yourself' });
    context = createRealTestContext(attackingAction, world, command);
    context.sharedData.attackResult = { success: true, type: 'killed', targetKilled: true } as any;

    const events = attackingAction.report(context);
    const types = events.map((e) => e.type);

    expect(types).toContain(PLAYER_DIED_EVENT);
    expect(types).not.toContain('if.event.death');

    const death = events.find((e) => e.type === PLAYER_DIED_EVENT)!;
    expect(death.data).toMatchObject({ cause: 'combat', messageId: 'combat.player_died' });

    // State mutation: the player's HealthTrait is now terminally dead.
    const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
    expect(health?.dead).toBe(true);
    expect(health?.causeOfDeath).toBe('combat');
  });

  test('a lethal attack on an NPC still emits the generic if.event.death (regression)', () => {
    const command = createCommand(IFActions.ATTACKING, { entity: npc, text: 'goblin' });
    context = createRealTestContext(attackingAction, world, command);
    context.sharedData.attackResult = { success: true, type: 'killed', targetKilled: true } as any;

    const events = attackingAction.report(context);
    const types = events.map((e) => e.type);

    expect(types).toContain('if.event.death');
    expect(types).not.toContain(PLAYER_DIED_EVENT);
    // The player is untouched.
    expect(player.get(TraitType.HEALTH)).toBeUndefined();
  });
});
