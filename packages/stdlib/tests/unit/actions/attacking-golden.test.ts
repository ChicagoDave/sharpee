/**
 * Golden test for attacking action - demonstrates testing combat/destruction
 * 
 * This shows patterns for testing actions that:
 * - Handle hostile actions against NPCs or objects
 * - Support armed and unarmed attacks
 * - Check weapon possession
 * - Prevent self-harm
 * - Use FRAGILE and BREAKABLE traits for destructible objects
 * - Generate appropriate NPC reactions
 * - Respect peaceful game settings
 */

import { describe, test, expect } from 'vitest';
import { attackingAction } from '../../../src/actions/standard/attacking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, EntityType } from '@sharpee/world-model';
import {
  createRealTestContext,
  expectEvent,
  executeWithValidation,
  expectTraitValue,
  createCommand,
  setupBasicWorld
} from '../../test-utils';

describe('attackingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(attackingAction.id).toBe(IFActions.ATTACKING);
    });

    test('should declare required messages', () => {
      expect(attackingAction.requiredMessages).toContain('no_target');
      expect(attackingAction.requiredMessages).toContain('not_visible');
      expect(attackingAction.requiredMessages).toContain('not_reachable');
      expect(attackingAction.requiredMessages).toContain('self');
      expect(attackingAction.requiredMessages).toContain('not_holding_weapon');
      // 'indestructible' message removed with FRAGILE trait
      // expect(attackingAction.requiredMessages).toContain('indestructible');
      expect(attackingAction.requiredMessages).toContain('attacked');
      expect(attackingAction.requiredMessages).toContain('attacked_with');
      expect(attackingAction.requiredMessages).toContain('hit');
      expect(attackingAction.requiredMessages).toContain('hit_with');
      expect(attackingAction.requiredMessages).toContain('struck');
      expect(attackingAction.requiredMessages).toContain('struck_with');
      expect(attackingAction.requiredMessages).toContain('punched');
      expect(attackingAction.requiredMessages).toContain('kicked');
      expect(attackingAction.requiredMessages).toContain('unarmed_attack');
      // 'broke' message removed with FRAGILE trait
      // expect(attackingAction.requiredMessages).toContain('broke');
      expect(attackingAction.requiredMessages).toContain('smashed');
      expect(attackingAction.requiredMessages).toContain('destroyed');
      expect(attackingAction.requiredMessages).toContain('shattered');
      expect(attackingAction.requiredMessages).toContain('defends');
      expect(attackingAction.requiredMessages).toContain('dodges');
      expect(attackingAction.requiredMessages).toContain('retaliates');
      expect(attackingAction.requiredMessages).toContain('flees');
      expect(attackingAction.requiredMessages).toContain('peaceful_solution');
      // 'no_fighting' message removed in simplification
      // expect(attackingAction.requiredMessages).toContain('no_fighting');
      expect(attackingAction.requiredMessages).toContain('unnecessary_violence');
      // 'needs_tool' message removed with BREAKABLE trait
      // expect(attackingAction.requiredMessages).toContain('needs_tool');
      // 'not_strong_enough' message removed with BREAKABLE trait
      // expect(attackingAction.requiredMessages).toContain('not_strong_enough');
      expect(attackingAction.requiredMessages).toContain('already_damaged');
      expect(attackingAction.requiredMessages).toContain('partial_break');
    });

    test('should belong to interaction group', () => {
      expect(attackingAction.group).toBe('interaction');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.ATTACKING);
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = executeWithValidation(attackingAction, context);
      
      expectEvent(events, 'if.event.attacked', {
        messageId: 'if.action.attacking.no_target',
        blocked: true
      });
    });

    test('should prevent attacking self', () => {
      const { world, player } = setupBasicWorld();
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: player
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = executeWithValidation(attackingAction, context);
      
      expectEvent(events, 'if.event.attacked', {
        messageId: 'if.action.attacking.self',
        blocked: true
      });
    });

    test('should report ineffective attack on non-combatant NPC', () => {
      const { world, player, room } = setupBasicWorld();

      const npc = world.createEntity('innocent child', EntityType.ACTOR);
      npc.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(npc.id, room.id);

      const command = createCommand(IFActions.ATTACKING, {
        entity: npc
      });
      const context = createRealTestContext(attackingAction, world, command);

      const events = executeWithValidation(attackingAction, context);

      // Non-combatant actors have no combat traits, so AttackBehavior returns ineffective.
      expect(events.length).toBeGreaterThan(0);
      const attackEvent = events.find(e => e.type === 'if.event.attacked');
      expect(attackEvent).toBeDefined();
    });
  });

  describe('Attacking Objects with BREAKABLE trait', () => {
    test('should break a breakable object', () => {
      const { world, player, room } = setupBasicWorld();

      const gate = world.createEntity('iron gate', EntityType.OBJECT);
      gate.add({
        type: TraitType.BREAKABLE
      });
      world.moveEntity(gate.id, room.id);

      const command = createCommand(IFActions.ATTACKING, {
        entity: gate
      });
      const context = createRealTestContext(attackingAction, world, command);

      const events = executeWithValidation(attackingAction, context);

      // Breakable entity is broken in a single hit
      expectEvent(events, 'if.event.attacked', {
        messageId: 'if.action.attacking.target_broke',
        target: gate.id,
        targetName: 'iron gate'
      });
    });
  });

  /**
   * World State Mutations
   *
   * These tests verify that the attacking action actually mutates world state,
   * not just emits events.
   */
  describe('World State Mutations', () => {
    test('should set broken flag to true on breakable object after attack', () => {
      const { world, player, room } = setupBasicWorld();

      const vase = world.createEntity('ceramic vase', EntityType.OBJECT);
      vase.add({ type: TraitType.BREAKABLE, broken: false });
      world.moveEntity(vase.id, room.id);

      // VERIFY PRECONDITION: vase is not broken
      expectTraitValue(vase, TraitType.BREAKABLE, 'broken', false);

      const command = createCommand(IFActions.ATTACKING, { entity: vase });
      const context = createRealTestContext(attackingAction, world, command);

      const validation = attackingAction.validate(context);
      expect(validation.valid).toBe(true);
      attackingAction.execute(context);

      // VERIFY POSTCONDITION: vase is now broken
      expectTraitValue(vase, TraitType.BREAKABLE, 'broken', true);
    });

    test('should reduce hitPoints on destructible object after attack', () => {
      const { world, player, room } = setupBasicWorld();

      const wall = world.createEntity('cracked wall', EntityType.OBJECT);
      wall.add({
        type: TraitType.DESTRUCTIBLE,
        hitPoints: 3,
        maxHitPoints: 3,
        armor: 0,
        invulnerable: false,
        requiresWeapon: false
      });
      world.moveEntity(wall.id, room.id);

      // VERIFY PRECONDITION: wall has full hit points
      expectTraitValue(wall, TraitType.DESTRUCTIBLE, 'hitPoints', 3);

      const command = createCommand(IFActions.ATTACKING, { entity: wall });
      const context = createRealTestContext(attackingAction, world, command);

      const validation = attackingAction.validate(context);
      expect(validation.valid).toBe(true);
      attackingAction.execute(context);

      // VERIFY POSTCONDITION: hitPoints reduced (unarmed does 1 damage by default)
      const destructible = wall.get(TraitType.DESTRUCTIBLE);
      expect(destructible.hitPoints).toBeLessThan(3);
    });

    test('should NOT mutate non-attackable entity', () => {
      const { world, player } = setupBasicWorld();

      // VERIFY PRECONDITION: player has no breakable/destructible traits
      expect(player.get(TraitType.BREAKABLE)).toBeUndefined();
      expect(player.get(TraitType.DESTRUCTIBLE)).toBeUndefined();

      const command = createCommand(IFActions.ATTACKING, { entity: player });
      const context = createRealTestContext(attackingAction, world, command);

      // Self-attack should be blocked at validation
      const validation = attackingAction.validate(context);
      expect(validation.valid).toBe(false);
    });
  });
});

