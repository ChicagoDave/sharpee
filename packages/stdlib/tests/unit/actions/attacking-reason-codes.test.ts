/**
 * Ineffective-attack reason codes (platform-issue-sweep Phase 3c).
 *
 * World-model's AttackBehavior emits reason CODES on failure (never English);
 * the attacking action maps each code to a lang-en-us message ID. The old
 * contract returned hardcoded English prose whose trailing period satisfied
 * the includes('.') "fully-qualified message ID" heuristic, so the raw
 * sentence was emitted as a message ID the text service could not resolve —
 * every ineffective attack rendered blank.
 *
 * Also covers the tightened heuristic's prose routing: AUTHOR trait prose
 * (destructible damageMessage etc.) is emitted as inline `message` (rendered
 * verbatim by the pipeline's fallback), never mistaken for a message ID.
 */

import { describe, test, expect } from 'vitest';
import { attackingAction } from '../../../src/actions/standard/attacking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, EntityType } from '@sharpee/world-model';
import {
  createRealTestContext,
  expectEvent,
  executeWithValidation,
  createCommand,
  setupBasicWorld
} from '../../test-utils';

describe('attacking — ineffective reason codes (Phase 3c)', () => {
  test('no combat traits → attack_ineffective, never blank', () => {
    const { world, player, room } = setupBasicWorld();
    const statue = world.createEntity('bronze statue', EntityType.OBJECT);
    world.moveEntity(statue.id, room.id);

    const command = createCommand(IFActions.ATTACKING, { entity: statue });
    const context = createRealTestContext(attackingAction, world, command);
    const events = executeWithValidation(attackingAction, context);

    expectEvent(events, 'if.event.attacked', {
      messageId: 'if.action.attacking.attack_ineffective',
      params: expect.objectContaining({
        target: expect.objectContaining({ name: 'bronze statue' })
      })
    });
  });

  test('destructible requiring a weapon, attacked unarmed → attack_requires_weapon', () => {
    const { world, player, room } = setupBasicWorld();
    const wall = world.createEntity('cracked wall', EntityType.OBJECT);
    wall.add({
      type: TraitType.DESTRUCTIBLE,
      hitPoints: 10,
      maxHitPoints: 10,
      armor: 0,
      requiresWeapon: true
    });
    world.moveEntity(wall.id, room.id);

    const command = createCommand(IFActions.ATTACKING, { entity: wall });
    const context = createRealTestContext(attackingAction, world, command);
    const events = executeWithValidation(attackingAction, context);

    expectEvent(events, 'if.event.attacked', {
      messageId: 'if.action.attacking.attack_requires_weapon'
    });
  });

  test('wrong weapon type → attack_wrong_weapon_type', () => {
    const { world, player, room } = setupBasicWorld();
    const wall = world.createEntity('cracked wall', EntityType.OBJECT);
    wall.add({
      type: TraitType.DESTRUCTIBLE,
      hitPoints: 10,
      maxHitPoints: 10,
      armor: 0,
      requiresWeapon: true,
      requiresType: 'blunt'
    });
    world.moveEntity(wall.id, room.id);

    const sword = world.createEntity('steel sword', EntityType.OBJECT);
    sword.add({ type: TraitType.WEAPON, weaponType: 'blade', minDamage: 1, maxDamage: 3 });
    world.moveEntity(sword.id, player.id);

    const command = createCommand(IFActions.ATTACKING, {
      entity: wall,
      secondEntity: sword,
      preposition: 'with'
    });
    const context = createRealTestContext(attackingAction, world, command);
    const events = executeWithValidation(attackingAction, context);

    expectEvent(events, 'if.event.attacked', {
      messageId: 'if.action.attacking.attack_wrong_weapon_type'
    });
  });

  test('invulnerable destructible → attack_invulnerable', () => {
    const { world, player, room } = setupBasicWorld();
    const monolith = world.createEntity('black monolith', EntityType.OBJECT);
    monolith.add({
      type: TraitType.DESTRUCTIBLE,
      hitPoints: 10,
      maxHitPoints: 10,
      armor: 0,
      invulnerable: true
    });
    world.moveEntity(monolith.id, room.id);

    const command = createCommand(IFActions.ATTACKING, { entity: monolith });
    const context = createRealTestContext(attackingAction, world, command);
    const events = executeWithValidation(attackingAction, context);

    expectEvent(events, 'if.event.attacked', {
      messageId: 'if.action.attacking.attack_invulnerable'
    });
  });

  test('author trait prose (damageMessage) is emitted as inline message, not a messageId', () => {
    const { world, player, room } = setupBasicWorld();
    const vase = world.createEntity('porcelain vase', EntityType.OBJECT);
    vase.add({
      type: TraitType.DESTRUCTIBLE,
      hitPoints: 5,
      maxHitPoints: 5,
      armor: 0,
      damageMessage: 'A hairline crack spreads across the porcelain.'
    });
    world.moveEntity(vase.id, room.id);

    const command = createCommand(IFActions.ATTACKING, { entity: vase });
    const context = createRealTestContext(attackingAction, world, command);
    const events = executeWithValidation(attackingAction, context);

    const attacked = events.filter(e => e.type === 'if.event.attacked');
    expect(attacked.length).toBeGreaterThan(0);
    const data = attacked[0].data as Record<string, unknown>;
    // The prose renders via the pipeline's inline `message` fallback — it is
    // NEVER emitted as a messageId (the old heuristic bug).
    expect(data.message).toBe('A hairline crack spreads across the porcelain.');
    expect(data.messageId).toBeUndefined();
  });
});
