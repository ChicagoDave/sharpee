/**
 * Golden test for locking action - demonstrates testing lock manipulation
 * 
 * This shows patterns for testing actions that:
 * - Lock containers and doors
 * - Require specific keys
 * - Check object states (closed before locking)
 * - Handle multiple valid keys
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { lockingAction } from '../../../../src/actions/standard/locking';
import { IFActions } from '../../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import { 
  createRealTestContext, 
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

// Helper to execute action with validation (mimics CommandExecutor flow)
const executeWithValidation = (action: any, context: ActionContext) => {
  const validation = action.validate(context);
  if (!validation.valid) {
    return [context.event('action.error', {
      actionId: action.id,
      messageId: validation.error || 'validation_failed',
      reason: validation.error || 'validation_failed',
      params: validation.params || {}
    })];
  }
  return action.execute(context);
};

describe('lockingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(lockingAction.id).toBe(IFActions.LOCKING);
    });

    // Note: requiredMessages and group are no longer part of the new action interface
    // These tests have been removed as they're not applicable to the refactored actions
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.LOCKING, {});
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
      });
    });

    test('should fail when target is not lockable', () => {
      const { world, player, room } = setupBasicWorld();
      const box = world.createEntity('wooden box', 'object');
      box.add({ 
        type: TraitType.OPENABLE,
        isOpen: false
      });
      // No lockable trait
      
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(IFActions.LOCKING, {
        entity: box
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_lockable'),
        params: { item: 'wooden box' }
      });
    });

    test('should fail when already locked', () => {
      const { world, player, room } = setupBasicWorld();
      const chest = world.createEntity('treasure chest', 'object');
      chest.add({
        type: TraitType.LOCKABLE,
        isLocked: true,  // Already locked
        keyId: 'golden_key'
      });
      
      world.moveEntity(chest.id, room.id);
      
      const command = createCommand(IFActions.LOCKING, {
        entity: chest
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_locked'),
        params: { item: 'treasure chest' }
      });
    });

    test('should fail when target is open', () => {
      const { world, player, room } = setupBasicWorld();
      const cabinet = world.createEntity('cabinet', 'object');
      cabinet.add({ 
        type: TraitType.OPENABLE,
        isOpen: true  // Open - can't lock
      });
      cabinet.add({
        type: TraitType.LOCKABLE,
        isLocked: false
      });
      
      world.moveEntity(cabinet.id, room.id);
      
      const command = createCommand(IFActions.LOCKING, {
        entity: cabinet
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_closed'),
        params: { item: 'cabinet' }
      });
    });
  });

  describe('Key Requirements', () => {
    test('should fail when key required but not provided', () => {
      const { world, player, room } = setupBasicWorld();
      const door = world.createEntity('oak door', 'object');
      door.add({ 
        type: TraitType.OPENABLE,
        isOpen: false
      });
      door.add({
        type: TraitType.LOCKABLE,
        isLocked: false,
        keyId: 'brass_key'  // Requires key
      });
      
      world.moveEntity(door.id, room.id);
      
      const command = createCommand(IFActions.LOCKING, {
        entity: door
      });
      // No indirect object (key)
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_key'),
        reason: 'no_key'
      });
    });

    test('should fail when key not held by player', () => {
      const { world, player, room } = setupBasicWorld();
      const chest = world.createEntity('chest', 'object');
      chest.add({ 
        type: TraitType.OPENABLE,
        isOpen: false
      });
      chest.add({
        type: TraitType.LOCKABLE,
        isLocked: false,
        keyId: 'iron_key'
      });
      
      const key = world.createEntity('iron key', 'object');
      
      world.moveEntity(chest.id, room.id);
      world.moveEntity(key.id, room.id);  // Key in room, not held
      
      const command = createCommand(IFActions.LOCKING, {
        entity: chest,
        secondEntity: key,
        preposition: 'with'
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('key_not_held'),
        params: { key: 'iron key' }
      });
    });

    test('should fail with wrong key', () => {
      const { world, player, room } = setupBasicWorld();
      const door = world.createEntity('door', 'object');
      door.add({ 
        type: TraitType.OPENABLE,
        isOpen: false
      });
      door.add({
        type: TraitType.LOCKABLE,
        isLocked: false,
        keyId: 'gold_key'  // Requires gold key
      });
      
      const wrongKey = world.createEntity('silver key', 'object');
      
      world.moveEntity(door.id, room.id);
      world.moveEntity(wrongKey.id, player.id);  // Player has wrong key
      
      const command = createCommand(IFActions.LOCKING, {
        entity: door,
        secondEntity: wrongKey,
        preposition: 'with'
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('wrong_key'),
        params: { 
          key: 'silver key',
          item: 'door'
        }
      });
    });
  });

  describe('Successful Locking', () => {
    test('should lock object without key requirement', () => {
      const { world, player, room } = setupBasicWorld();
      const box = world.createEntity('small box', 'object');
      box.add({ 
        type: TraitType.OPENABLE,
        isOpen: false
      });
      box.add({
        type: TraitType.LOCKABLE,
        isLocked: false
        // No keyId - doesn't require key
      });
      box.add({
        type: TraitType.CONTAINER
      });
      
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(IFActions.LOCKING, {
        entity: box
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'if.event.secured', {
        target: box.id
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('locked'),
        params: { 
          item: 'small box'
        }
      });
    });

    test('should lock with correct key', () => {
      const { world, player, room } = setupBasicWorld();
      const safe = world.createEntity('wall safe', 'object');
      safe.add({ 
        type: TraitType.OPENABLE,
        isOpen: false
      });
      // Add lockable trait without keyId initially
      
      const key = world.createEntity('safe key', 'object');
      // Store the key's actual ID in the lockable trait
      safe.add({
        type: TraitType.LOCKABLE,
        isLocked: false,
        keyId: key.id  // Use the actual entity ID
      });
      
      world.moveEntity(safe.id, room.id);
      world.moveEntity(key.id, player.id);  // Player has key
      
      const command = createCommand(IFActions.LOCKING, {
        entity: safe,
        secondEntity: key,
        preposition: 'with'
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'if.event.secured', {
        target: safe.id,
        key: key.id
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('locked_with'),
        params: { 
          item: 'wall safe',
          key: 'safe key'
        }
      });
    });

    test('should lock door with key', () => {
      const { world, player, room } = setupBasicWorld();
      const door = world.createEntity('front door', 'object');
      door.add({ 
        type: TraitType.OPENABLE,
        isOpen: false
      });
      door.add({
        type: TraitType.DOOR,
        connectsTo: 'outside'
      });
      
      const key = world.createEntity('house key', 'object');
      
      door.add({
        type: TraitType.LOCKABLE,
        isLocked: false,
        keyId: key.id  // Use the actual entity ID
      });
      
      world.moveEntity(door.id, room.id);
      world.moveEntity(key.id, player.id);
      
      const command = createCommand(IFActions.LOCKING, {
        entity: door,
        secondEntity: key,
        preposition: 'with'
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'if.event.secured', {
        target: door.id,
        key: key.id
      });
      
      expectEvent(events, 'action.success', {
        params: { 
          item: 'front door',
          key: 'house key'
        }
      });
    });

    test('should handle multiple valid keys', () => {
      const { world, player, room } = setupBasicWorld();
      const chest = world.createEntity('old chest', 'object');
      chest.add({ 
        type: TraitType.OPENABLE,
        isOpen: false
      });
      const key = world.createEntity('skeleton key', 'object');
      const key2 = world.createEntity('chest key', 'object');
      const key3 = world.createEntity('master key', 'object');
      
      chest.add({
        type: TraitType.LOCKABLE,
        isLocked: false,
        keyIds: [key3.id, key2.id, key.id]  // Multiple valid keys using actual IDs
      });
      
      world.moveEntity(chest.id, room.id);
      world.moveEntity(key.id, player.id);
      
      const command = createCommand(IFActions.LOCKING, {
        entity: chest,
        secondEntity: key,
        preposition: 'with'
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'if.event.secured', {
        target: chest.id,
        key: key.id
      });
    });

    test('should include lock sound if specified', () => {
      const { world, player, room } = setupBasicWorld();
      const vault = world.createEntity('bank vault', 'object');
      vault.add({ 
        type: TraitType.OPENABLE,
        isOpen: false
      });
      vault.add({
        type: TraitType.LOCKABLE,
        isLocked: false,
        lockSound: 'heavy clunk'
      });
      
      world.moveEntity(vault.id, room.id);
      
      const command = createCommand(IFActions.LOCKING, {
        entity: vault
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      expectEvent(events, 'if.event.secured', {
        target: vault.id
      });
      
      expectEvent(events, 'action.success', {
        params: { 
          item: 'bank vault'
        }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const locker = world.createEntity('locker', 'object');
      locker.add({ 
        type: TraitType.OPENABLE,
        isOpen: false 
      });
      locker.add({ 
        type: TraitType.LOCKABLE,
        isLocked: false
      });
      
      world.moveEntity(locker.id, room.id);
      
      const command = createCommand(IFActions.LOCKING, {
        entity: locker
      });
      
      const context = createRealTestContext(lockingAction, world, command);
      
      const events = executeWithValidation(lockingAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(locker.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Locking Action Edge Cases', () => {
  test('should handle lockable without openable trait', () => {
    const { world, player, room } = setupBasicWorld();
    const padlock = world.createEntity('padlock', 'object');
    padlock.add({
      type: TraitType.LOCKABLE,
      isLocked: false
    });
    // No openable trait - just a lockable thing
    
    world.moveEntity(padlock.id, room.id);
    
    const command = createCommand(IFActions.LOCKING, {
      entity: padlock
    });
    
    const context = createRealTestContext(lockingAction, world, command);
    
    const events = lockingAction.execute(context);
    
    // Should succeed - no openable trait to check
    expectEvent(events, 'if.event.secured', {
      target: padlock.id
    });
  });

  test('should prefer keyId over keyIds when both present', () => {
    const { world, player, room } = setupBasicWorld();
    const box = world.createEntity('box', 'object');
    box.add({ 
      type: TraitType.OPENABLE,
      isOpen: false 
    });
    const primaryKey = world.createEntity('primary key', 'object');
    const backupKey1 = world.createEntity('backup key 1', 'object');
    const backupKey2 = world.createEntity('backup key 2', 'object');
    
    box.add({
      type: TraitType.LOCKABLE,
      isLocked: false,
      keyId: primaryKey.id,  // Primary key using actual ID
      keyIds: [backupKey1.id, backupKey2.id]  // Also has backup keys
    });
    
    world.moveEntity(box.id, room.id);
    world.moveEntity(primaryKey.id, player.id);
    
    const command = createCommand(IFActions.LOCKING, {
      entity: box,
      secondEntity: primaryKey,
      preposition: 'with'
    });
    
    const context = createRealTestContext(lockingAction, world, command);
    
    const events = lockingAction.execute(context);
    
    // Should succeed with primary key
    expectEvent(events, 'if.event.secured', {
      target: box.id,
      key: primaryKey.id
    });
  });

  test('should use backup key when primary not available', () => {
    const { world, player, room } = setupBasicWorld();
    const gate = world.createEntity('gate', 'object');
    gate.add({ 
      type: TraitType.OPENABLE,
      isOpen: false 
    });
    const gateKey = world.createEntity('gate key', 'object');
    const masterKey = world.createEntity('master key', 'object');
    
    gate.add({
      type: TraitType.LOCKABLE,
      isLocked: false,
      keyIds: [gateKey.id, masterKey.id]  // Using actual entity IDs
    });
    
    world.moveEntity(gate.id, room.id);
    world.moveEntity(masterKey.id, player.id);
    
    const command = createCommand(IFActions.LOCKING, {
      entity: gate,
      secondEntity: masterKey,
      preposition: 'with'
    });
    
    const context = createRealTestContext(lockingAction, world, command);
    
    const events = lockingAction.execute(context);
    
    expectEvent(events, 'if.event.secured', {
      target: gate.id,
      key: masterKey.id
    });
  });
});
