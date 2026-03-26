/**
 * Unit tests for attacking action three-phase implementation
 * 
 * Tests the core mechanics of the attacking action:
 * - Three-phase pattern compliance
 * - Validation logic
 * - Weapon inference
 * - Shared data handling
 * - Event generation
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { attackingAction } from '../../../src/actions/standard/attacking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, EntityType, IFEntity, AttackBehavior } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  createCommand,
  expectEvent
} from '../../test-utils';
import type { ActionContext, ValidationResult } from '../../../src/actions/enhanced-types';
import type { ISemanticEvent } from '@sharpee/core';
import { ScopeLevel } from '../../../src/scope/types';

describe('attackingAction - Three-Phase Implementation', () => {
  let world: WorldModel;
  let player: IFEntity;
  let room: IFEntity;
  let target: IFEntity;
  let weapon: IFEntity;
  let context: ActionContext;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    player = setup.player;
    room = setup.room;
    
    // Create a target
    target = world.createEntity('goblin', EntityType.ACTOR);
    world.moveEntity(target.id, room.id);
    
    // Create a weapon
    weapon = world.createEntity('sword', EntityType.OBJECT);
    weapon.add({
      type: TraitType.WEAPON,
      minDamage: 5,
      maxDamage: 10,
      weaponType: 'blade'
    });
    world.moveEntity(weapon.id, player.id); // Player is holding it
  });

  describe('Three-Phase Pattern Compliance', () => {
    test('should have required methods', () => {
      expect(attackingAction.validate).toBeDefined();
      expect(attackingAction.execute).toBeDefined();
      expect(attackingAction.report).toBeDefined();
      expect(typeof attackingAction.validate).toBe('function');
      expect(typeof attackingAction.execute).toBe('function');
      expect(typeof attackingAction.report).toBe('function');
    });

    test('validate should return ValidationResult', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        text: 'goblin'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      const result = attackingAction.validate(context);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
    });

    test('execute should return void', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        text: 'goblin'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      const result = attackingAction.execute(context);
      
      expect(result).toBeUndefined();
    });

    test('report should return ISemanticEvent array', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        text: 'goblin'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      // Execute first to populate shared data
      attackingAction.execute(context);
      
      const events = attackingAction.report(context);
      
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      events.forEach(event => {
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('data');
      });
    });
  });

  describe('Validation Logic', () => {
    test('should fail without target', () => {
      const command = createCommand(IFActions.ATTACKING, {});
      context = createRealTestContext(attackingAction, world, command);
      
      const result = attackingAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_target');
    });

    test('should fail if target not visible', () => {
      const hiddenTarget = world.createEntity('hidden', EntityType.ACTOR);
      // Don't move it to the room - it's nowhere, thus not visible
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: hiddenTarget,
        text: 'hidden'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      const result = attackingAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('not_visible');
    });

    test('should fail if target not reachable', () => {
      // Create target in a different room
      const otherRoom = world.createEntity('other room', EntityType.ROOM);
      const farTarget = world.createEntity('distant goblin', EntityType.ACTOR);
      world.moveEntity(farTarget.id, otherRoom.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: farTarget,
        text: 'distant goblin'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      // Mock canSee to return true but canReach to return false
      context.canSee = () => true;
      context.canReach = () => false;
      
      const result = attackingAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('not_reachable');
    });

    test('should fail when attacking self', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: player,
        text: 'myself'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      const result = attackingAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('self');
    });

    test('should fail if specified weapon not reachable', () => {
      // Place weapon in a different room so implicit take can't reach it
      const otherRoom = world.createEntity('other room', EntityType.ROOM);
      const otherWeapon = world.createEntity('axe', EntityType.OBJECT);
      otherWeapon.add({
        type: TraitType.WEAPON,
        minDamage: 3,
        maxDamage: 8,
        weaponType: 'blade'
      });
      world.moveEntity(otherWeapon.id, otherRoom.id); // In a different room, not reachable

      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        secondEntity: otherWeapon,
        preposition: 'with'
      });
      context = createRealTestContext(attackingAction, world, command);

      const result = attackingAction.validate(context);

      // requireCarriedOrImplicitTake returns a scope error when weapon is not reachable
      expect(result.valid).toBe(false);
    });

    test('should pass validation with valid target', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        text: 'goblin'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      const result = attackingAction.validate(context);
      
      expect(result.valid).toBe(true);
    });

    test('should pass validation with held weapon', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        secondEntity: weapon,
        preposition: 'with'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      const result = attackingAction.validate(context);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Weapon Inference', () => {
    test('should infer weapon for stab verb', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        text: 'goblin'
      });
      command.parsed.action = 'stab';
      context = createRealTestContext(attackingAction, world, command);
      
      attackingAction.execute(context);
      
      expect(context.sharedData.weaponUsed).toBe(weapon.id);
      expect(context.sharedData.weaponInferred).toBe(true);
    });

    test('should infer weapon for slash verb', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        text: 'goblin'
      });
      command.parsed.action = 'slash';
      context = createRealTestContext(attackingAction, world, command);
      
      attackingAction.execute(context);
      
      expect(context.sharedData.weaponUsed).toBe(weapon.id);
      expect(context.sharedData.weaponInferred).toBe(true);
    });

    test('should infer weapon for cut verb', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        text: 'goblin'
      });
      command.parsed.action = 'cut';
      context = createRealTestContext(attackingAction, world, command);
      
      attackingAction.execute(context);
      
      expect(context.sharedData.weaponUsed).toBe(weapon.id);
      expect(context.sharedData.weaponInferred).toBe(true);
    });

    test('should not infer weapon for generic attack verb', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        text: 'goblin'
      });
      command.parsed.action = 'attack';
      context = createRealTestContext(attackingAction, world, command);
      
      attackingAction.execute(context);
      
      expect(context.sharedData.weaponUsed).toBeUndefined();
      expect(context.sharedData.weaponInferred).toBe(false);
    });

    test('should not infer weapon if explicitly specified', () => {
      // Add combat trait to target
      target.add({
        type: TraitType.COMBATANT,
        health: 100,
        maxHealth: 100
      });
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        secondEntity: weapon,
        preposition: 'with'
      });
      command.parsed.action = 'stab';
      context = createRealTestContext(attackingAction, world, command);
      
      attackingAction.execute(context);
      
      expect(context.sharedData.weaponUsed).toBe(weapon.id);
      // When weapon is explicitly specified, weaponInferred is false (not inferred)
      expect(context.sharedData.weaponInferred).toBe(false);
    });
  });

  describe('Shared Data Handling', () => {
    test('should store attack result in shared data', () => {
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        text: 'goblin'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      attackingAction.execute(context);
      
      expect(context.sharedData.attackResult).toBeDefined();
      expect(context.sharedData.attackResult).toHaveProperty('success');
      expect(context.sharedData.attackResult).toHaveProperty('type');
    });

    test('should store weapon used in shared data', () => {
      // Add combat trait to target so attack succeeds
      target.add({
        type: TraitType.COMBATANT,
        health: 100,
        maxHealth: 100
      });
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        secondEntity: weapon,
        preposition: 'with'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      attackingAction.execute(context);
      
      expect(context.sharedData.weaponUsed).toBe(weapon.id);
    });

    test('should store custom message if provided', () => {
      // Create a breakable target that will have a custom message
      const vase = world.createEntity('vase', EntityType.OBJECT);
      vase.add({
        type: TraitType.BREAKABLE,
        broken: false
      });
      world.moveEntity(vase.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: vase,
        text: 'vase'
      });
      context = createRealTestContext(attackingAction, world, command);
      
      attackingAction.execute(context);
      
      // customMessage may or may not be defined depending on AttackBehavior
      expect(context.sharedData).toHaveProperty('customMessage');
    });
  });

  describe('Event Generation', () => {
    test('should generate attacked event on success', () => {
      // Use a breakable target (non-combatant) so AttackBehavior handles it
      const vase = world.createEntity('vase', EntityType.OBJECT);
      vase.add({
        type: TraitType.BREAKABLE,
        broken: false
      });
      world.moveEntity(vase.id, room.id);

      const command = createCommand(IFActions.ATTACKING, {
        entity: vase,
        text: 'vase'
      });
      context = createRealTestContext(attackingAction, world, command);

      attackingAction.execute(context);
      const events = attackingAction.report(context);

      const attackedEvent = events.find(e => e.type === 'if.event.attacked');
      expect(attackedEvent).toBeDefined();
      expect(attackedEvent?.data).toHaveProperty('target', vase.id);
      expect(attackedEvent?.data).toHaveProperty('targetName', 'vase');
      expect(attackedEvent?.data).toHaveProperty('unarmed', true);
    });

    test('should generate attacked event with messageId', () => {
      // Use a breakable target (non-combatant) so AttackBehavior handles it
      const vase = world.createEntity('vase', EntityType.OBJECT);
      vase.add({
        type: TraitType.BREAKABLE,
        broken: false
      });
      world.moveEntity(vase.id, room.id);

      const command = createCommand(IFActions.ATTACKING, {
        entity: vase,
        text: 'vase'
      });
      context = createRealTestContext(attackingAction, world, command);

      attackingAction.execute(context);
      const events = attackingAction.report(context);

      // The action emits if.event.attacked (not action.success) with a messageId
      const attackedEvent = events.find(e => e.type === 'if.event.attacked');
      expect(attackedEvent).toBeDefined();
      expect(attackedEvent?.data).toHaveProperty('messageId');
    });

    test('should generate blocked event on validation failure', () => {
      const command = createCommand(IFActions.ATTACKING, {});
      context = createRealTestContext(attackingAction, world, command);

      const validationResult = attackingAction.validate(context);
      expect(validationResult.valid).toBe(false);

      // Validation failures go through the blocked() method, not report()
      const events = attackingAction.blocked(context, validationResult);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('if.event.attacked');
      expect(events[0].data).toHaveProperty('blocked', true);
      expect(events[0].data).toHaveProperty('reason', 'no_target');
    });

    test('should include weapon in attacked event when used', () => {
      // Use a breakable target (non-combatant) so AttackBehavior handles it
      const vase = world.createEntity('vase', EntityType.OBJECT);
      vase.add({
        type: TraitType.BREAKABLE,
        broken: false
      });
      world.moveEntity(vase.id, room.id);

      const command = createCommand(IFActions.ATTACKING, {
        entity: vase,
        secondEntity: weapon,
        preposition: 'with'
      });
      context = createRealTestContext(attackingAction, world, command);

      attackingAction.execute(context);
      const events = attackingAction.report(context);

      const attackedEvent = events.find(e => e.type === 'if.event.attacked');
      expect(attackedEvent).toBeDefined();
      expect(attackedEvent?.data).toHaveProperty('weapon', weapon.id);
      expect(attackedEvent?.data).toHaveProperty('weaponName', 'sword');
      expect(attackedEvent?.data).toHaveProperty('unarmed', false);
    });

    test('should generate blocked event via blocked() method', () => {
      // Test the blocked path when validation explicitly fails
      const command = createCommand(IFActions.ATTACKING, {
        entity: target,
        text: 'goblin'
      });
      context = createRealTestContext(attackingAction, world, command);

      const validationResult = { valid: false as const, error: 'not_reachable', params: { target: 'goblin' } };
      const events = attackingAction.blocked(context, validationResult);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('if.event.attacked');
      expect(events[0].data).toHaveProperty('blocked', true);
      expect(events[0].data).toHaveProperty('reason', 'not_reachable');
      expect(events[0].data).toHaveProperty('targetName', 'goblin');
    });
  });

  describe('Attack Result Types', () => {
    test('should handle broke result type', () => {
      const vase = world.createEntity('vase', EntityType.OBJECT);
      vase.add({
        type: TraitType.BREAKABLE,
        broken: false
      });
      world.moveEntity(vase.id, room.id);

      const command = createCommand(IFActions.ATTACKING, {
        entity: vase,
        text: 'vase'
      });
      context = createRealTestContext(attackingAction, world, command);

      attackingAction.execute(context);
      const events = attackingAction.report(context);

      // The action emits if.event.attacked with a messageId containing target_broke
      const attackedEvent = events.find(e => e.type === 'if.event.attacked');
      expect(attackedEvent).toBeDefined();
      expect(attackedEvent?.data.messageId).toContain('target_broke');
    });

    test('should handle ineffective attack', () => {
      // Create an entity with no combat traits and no breakable trait
      const rock = world.createEntity('rock', EntityType.OBJECT);
      world.moveEntity(rock.id, room.id);

      const command = createCommand(IFActions.ATTACKING, {
        entity: rock,
        text: 'rock'
      });
      context = createRealTestContext(attackingAction, world, command);

      attackingAction.execute(context);
      const events = attackingAction.report(context);

      // Ineffective attacks emit if.event.attacked with failed: true
      const attackedEvent = events.find(e => e.type === 'if.event.attacked');
      expect(attackedEvent).toBeDefined();
      expect(attackedEvent?.data).toHaveProperty('failed', true);
      expect(attackedEvent?.data).toHaveProperty('messageId');
    });
  });

  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(attackingAction.id).toBe(IFActions.ATTACKING);
    });

    test('should have correct group', () => {
      expect(attackingAction.group).toBe('interaction');
    });

    test('should require direct object', () => {
      expect(attackingAction.metadata.requiresDirectObject).toBe(true);
    });

    test('should not require indirect object', () => {
      expect(attackingAction.metadata.requiresIndirectObject).toBe(false);
    });

    test('should have reachable scope for direct object', () => {
      expect(attackingAction.metadata.directObjectScope).toBe(ScopeLevel.REACHABLE);
    });

    test('should declare all required messages', () => {
      const requiredMessages = [
        'no_target', 'not_visible', 'not_reachable', 'self',
        'not_holding_weapon', 'attacked', 'attacked_with',
        'hit', 'hit_with', 'struck', 'struck_with',
        'punched', 'kicked', 'unarmed_attack',
        'defends', 'dodges', 'retaliates', 'flees',
        'peaceful_solution', 'unnecessary_violence'
      ];
      
      requiredMessages.forEach(msg => {
        expect(attackingAction.requiredMessages).toContain(msg);
      });
    });
  });
});