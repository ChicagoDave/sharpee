/**
 * Tests for the grue death action's execute path (ADR-227 Phase 1
 * mutation-verification follow-up).
 *
 * The transformer tests (handlers/grue-handler.test.ts) cover the redirect
 * decision; these cover what happens after the redirect: `execute()` must
 * actually apply the lethal transition (HealthTrait mutation, cause 'grue')
 * and `report()` must emit the canonical death event with the messageId
 * matching how the grue struck (walked_into vs slithered).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel, TraitType, HealthTrait, EntityType } from '@sharpee/world-model';
import { PLAYER_DIED_EVENT } from '@sharpee/stdlib';
import type { ActionContext } from '@sharpee/stdlib';
import { grueDeathAction } from './grue-death-action';
import { GrueDeathMessages } from './types';

function makeContext(
  world: WorldModel,
  player: ReturnType<WorldModel['createEntity']>,
  grueDeathType?: string
): ActionContext {
  return {
    world,
    player,
    command: { parsed: { extras: grueDeathType ? { grueDeathType } : {} } },
    sharedData: {},
  } as unknown as ActionContext;
}

describe('grueDeathAction — execute applies the lethal transition', () => {
  let world: WorldModel;
  let room: ReturnType<WorldModel['createEntity']>;
  let player: ReturnType<WorldModel['createEntity']>;

  beforeEach(() => {
    world = new WorldModel();
    room = world.createEntity('Dark Room', EntityType.ROOM);
    room.add({ type: 'room' });
    player = world.createEntity('player', EntityType.ACTOR);
    player.add({ type: 'actor' });
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
  });

  it('kills the player terminally with cause "grue" (HealthTrait mutation)', () => {
    const context = makeContext(world, player, 'walked_into');

    expect(grueDeathAction.validate(context).valid).toBe(true);
    grueDeathAction.execute(context);

    const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
    expect(health?.dead).toBe(true);
    expect(health?.causeOfDeath).toBe('grue');
  });

  it('report() emits the canonical death event with the walked_into message by default', () => {
    const context = makeContext(world, player);

    grueDeathAction.execute(context);
    const events = grueDeathAction.report!(context);

    const death = events.find((e) => e.type === PLAYER_DIED_EVENT);
    expect(death).toBeDefined();
    expect(death!.data).toMatchObject({
      cause: 'grue',
      messageId: GrueDeathMessages.WALKED_INTO_GRUE,
    });
  });

  it('report() carries the slithered message when the grue came through a blocked exit', () => {
    const context = makeContext(world, player, 'slithered');

    grueDeathAction.execute(context);
    const events = grueDeathAction.report!(context);

    const death = events.find((e) => e.type === PLAYER_DIED_EVENT);
    expect(death!.data).toMatchObject({
      cause: 'grue',
      messageId: GrueDeathMessages.SLITHERED_INTO_ROOM,
    });
  });
});
