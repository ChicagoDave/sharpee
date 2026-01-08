/**
 * Golden test for unlocking action - demonstrates testing unlock manipulation
 * 
 * This shows patterns for testing actions that:
 * - Unlock containers and doors
 * - Require specific keys
 * - Handle auto-open behavior
 * - Support multiple valid keys
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { unlockingAction } from '../../../src/actions/standard/unlocking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { 
  createRealTestContext, 
  expectEvent,
  TestData,
  createCommand,
  setupBasicWorld,
  findEntityByName
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

// Helper to execute action with four-phase pattern (mimics CommandExecutor flow)
const executeWithValidation = (action: any, context: ActionContext) => {
  const validation = action.validate(context);
  if (!validation.valid) {
    // Use blocked() for validation failures
    if (action.blocked) {
      return action.blocked(context, validation);
    }
    return [context.event('action.error', {
      actionId: action.id,
      messageId: validation.error || 'validation_failed',
      reason: validation.error || 'validation_failed',
      params: validation.params || {}
    })];
  }
  // Execute mutations (returns void)
  action.execute(context);
  // Report generates events
  return action.report(context);
};

describe('unlockingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(unlockingAction.id).toBe(IFActions.UNLOCKING);
    });

    test('should declare required messages', () => {
      expect(unlockingAction.requiredMessages).toContain('no_target');
      expect(unlockingAction.requiredMessages).toContain('not_lockable');
      expect(unlockingAction.requiredMessages).toContain('no_key');
      expect(unlockingAction.requiredMessages).toContain('wrong_key');
      expect(unlockingAction.requiredMessages).toContain('already_unlocked');
      expect(unlockingAction.requiredMessages).toContain('unlocked');
      expect(unlockingAction.requiredMessages).toContain('unlocked_with');
      expect(unlockingAction.requiredMessages).toContain('cant_reach');
      expect(unlockingAction.requiredMessages).toContain('key_not_held');
      expect(unlockingAction.requiredMessages).toContain('still_locked');
    });

    test('should belong to lock_manipulation group', () => {
      expect(unlockingAction.group).toBe('lock_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.UNLOCKING);
      const context = createRealTestContext(unlockingAction, world, command);

      const events = executeWithValidation(unlockingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'no_target'
      });
    });

    test('should fail when target is not lockable', () => {
      const { world, player, room, object: box } = TestData.withObject('wooden box', {
        [TraitType.OPENABLE]: {
          type: TraitType.OPENABLE,
          isOpen: false
        }
        // No lockable trait
      });
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: box
        })
      );

      const events = executeWithValidation(unlockingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'not_lockable',
        params: { item: 'wooden box' }
      });
    });

    test('should fail when already unlocked', () => {
      const { world, player, room, object: chest } = TestData.withObject('treasure chest', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: false,  // Already unlocked
          keyId: 'golden_key'
        }
      });
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: chest
        })
      );

      const events = executeWithValidation(unlockingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'already_unlocked',
        params: { item: 'treasure chest' }
      });
    });
  });

  describe('Key Requirements', () => {
    test('should fail when key required but not provided', () => {
      const { world, player, room } = TestData.withObject('oak door', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true,
          keyId: 'brass_key'  // Requires key
        }
      });

      const door = findEntityByName(world, 'oak door')!;
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: door
        })
        // No indirect object (key)
      );

      const events = executeWithValidation(unlockingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'no_key'
      });
    });

    test('should fail when key not held by player', () => {
      const { world, player, room } = TestData.withObject('safe', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true,
          keyId: 'safe_key'
        }
      });

      const safe = findEntityByName(world, 'safe')!;
      const key = world.createEntity('safe key', 'object');
      world.moveEntity(key.id, room.id);  // Key in room, not held

      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: safe,
          secondEntity: key,
          preposition: 'with'
        })
      );

      const events = executeWithValidation(unlockingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'key_not_held',
        params: { key: 'safe key' }
      });
    });

    test('should fail with wrong key', () => {
      const { world, player, room } = TestData.withObject('cabinet', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true,
          keyId: 'cabinet_key'  // Requires specific key
        }
      });

      const cabinet = findEntityByName(world, 'cabinet')!;
      const wrongKey = world.createEntity('desk key', 'object');
      world.moveEntity(wrongKey.id, player.id);  // Player has wrong key

      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: cabinet,
          secondEntity: wrongKey,
          preposition: 'with'
        })
      );

      const events = executeWithValidation(unlockingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'wrong_key',
        params: {
          key: 'desk key',
          item: 'cabinet'
        }
      });
    });
  });

  describe('Successful Unlocking', () => {
    test('should unlock object without key requirement', () => {
      const { world, player, room } = TestData.withObject('simple latch', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true
          // No keyId - doesn't require key
        }
      });
      
      const latch = findEntityByName(world, 'simple latch')!;
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: latch
        })
      );
      
      const events = executeWithValidation(unlockingAction, context);
      
      expectEvent(events, 'if.event.unlocked', {
        targetId: latch.id
      });
      
      expectEvent(events, 'action.success', {
        messageId: 'unlocked',
        params: { item: 'simple latch' }
      });
    });

    test.skip('should unlock with correct key', () => {
      const { world, player, room } = TestData.withObject('iron chest', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true,
          keyId: 'iron_key'
        },
        [TraitType.CONTAINER]: {
          type: TraitType.CONTAINER
        }
      });

      const chest = findEntityByName(world, 'iron chest')!;
      const key = world.createEntity('iron key', 'object');

      // Update the chest's lockable trait to use the actual key ID
      chest.add({
        type: TraitType.LOCKABLE,
        isLocked: true,
        keyId: key.id  // Use actual entity ID
      });

      world.moveEntity(key.id, player.id);  // Player has key

      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: chest,
          secondEntity: key,
          preposition: 'with'
        })
      );

      const events = executeWithValidation(unlockingAction, context);

      expectEvent(events, 'if.event.unlocked', {
        targetId: chest.id,
        keyId: key.id
      });

      expectEvent(events, 'action.success', {
        messageId: 'unlocked_with',
        params: {
          item: 'iron chest',
          key: 'iron key',
          isContainer: true
        }
      });
    });

    test.skip('should unlock door and note room connection', () => {
      const { world, player, room } = TestData.withObject('heavy door', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true,
          keyId: 'dungeon_key'
        },
        [TraitType.DOOR]: {
          type: TraitType.DOOR,
          connectsTo: 'dungeon'
        }
      });
      
      const door = findEntityByName(world, 'heavy door')!;
      const key = world.createEntity('dungeon key', 'object');
      
      // Update the door's lockable trait to use the actual key ID
      door.add({
        type: TraitType.LOCKABLE,
        isLocked: true,
        keyId: key.id  // Use actual entity ID
      });
      door.add({
        type: TraitType.DOOR,
        connectsTo: 'dungeon'
      });
      
      world.moveEntity(key.id, player.id);
      
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: door,
          secondEntity: key,
          preposition: 'with'
        })
      );
      
      const events = executeWithValidation(unlockingAction, context);
      
      expectEvent(events, 'if.event.unlocked', {
        targetId: door.id,
        keyId: key.id
      });
      
      expectEvent(events, 'action.success', {
        params: { 
          item: 'heavy door',
          key: 'dungeon key',
          isDoor: true,
          connectsRooms: true
        }
      });
    });

    test('should handle multiple valid keys', () => {
      const { world, player, room } = TestData.withObject('iron gate', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true,
          keyIds: ['gate_key', 'master_key', 'guard_key']  // Multiple valid keys
        }
      });
      
      const gate = findEntityByName(world, 'iron gate')!;
      const key1 = world.createEntity('gate key', 'object');
      const key2 = world.createEntity('master key', 'object');
      const key3 = world.createEntity('guard key', 'object');
      
      // Update the gate's lockable trait to use actual key IDs
      // Get the existing trait and modify it
      const lockableTrait = gate.get(TraitType.LOCKABLE) as any;
      lockableTrait.keyIds = [key1.id, key2.id, key3.id];  // Use actual entity IDs
      
      world.moveEntity(key2.id, player.id);  // Player has master key
      
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: gate,
          secondEntity: key2,
          preposition: 'with'
        })
      );
      
      const events = executeWithValidation(unlockingAction, context);
      
      expectEvent(events, 'if.event.unlocked', {
        targetId: gate.id,
        keyId: key2.id
      });
    });

    test.skip('should include unlock sound if specified', () => {
      const { world, player, room } = TestData.withObject('bank vault', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true,
          unlockSound: 'mechanical whirring',
          keyId: 'vault_key'
        }
      });
      
      const vault = findEntityByName(world, 'bank vault')!;
      const key = world.createEntity('vault key', 'object');
      
      // Update the vault's lockable trait to use the actual key ID
      vault.add({
        type: TraitType.LOCKABLE,
        isLocked: true,
        unlockSound: 'mechanical whirring',
        keyId: key.id  // Use actual entity ID
      });
      
      world.moveEntity(key.id, player.id);
      
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: vault,
          secondEntity: key,
          preposition: 'with'
        })
      );
      
      const events = executeWithValidation(unlockingAction, context);
      
      expectEvent(events, 'if.event.unlocked', {
        targetId: vault.id,
        sound: 'mechanical whirring'
      });
      
      expectEvent(events, 'action.success', {
        params: { 
          sound: 'mechanical whirring'
        }
      });
    });

    test.skip('should note container with contents', () => {
      const { world, player, room } = setupBasicWorld();
      
      const box = world.createEntity('locked box', 'object');
      box.add({
        type: TraitType.LOCKABLE,
        isLocked: true
      });
      box.add({
        type: TraitType.CONTAINER
      });
      
      const treasure = world.createEntity('gold coins', 'object');
      
      world.moveEntity(box.id, room.id);
      world.moveEntity(treasure.id, box.id);
      
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: box
        })
      );
      
      const events = executeWithValidation(unlockingAction, context);
      
      expectEvent(events, 'action.success', {
        params: { 
          isContainer: true,
          hasContents: true
        }
      });
    });
  });

  describe('Auto-Open Behavior', () => {
    test.skip('should detect auto-open on unlock', () => {
      const { world, player, room } = TestData.withObject('medicine cabinet', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true
        },
        [TraitType.OPENABLE]: {
          type: TraitType.OPENABLE,
          isOpen: false,
          autoOpenOnUnlock: true  // Will auto-open
        }
      });
      
      const cabinet = findEntityByName(world, 'medicine cabinet')!;
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: cabinet
        })
      );
      
      const events = executeWithValidation(unlockingAction, context);
      
      expectEvent(events, 'if.event.unlocked', {
        targetId: cabinet.id,
        willAutoOpen: true
      });
      
      expectEvent(events, 'action.success', {
        params: { 
          willAutoOpen: true
        }
      });
    });

    test.skip('should not auto-open if not configured', () => {
      const { world, player, room } = TestData.withObject('chest', {
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true
        },
        [TraitType.OPENABLE]: {
          type: TraitType.OPENABLE,
          isOpen: false
          // No autoOpenOnUnlock
        }
      });
      
      const chest = findEntityByName(world, 'chest')!;
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: chest
        })
      );
      
      const events = executeWithValidation(unlockingAction, context);
      
      const unlockedEvent = events.find(e => e.type === 'if.event.unlocked');
      expect(unlockedEvent?.data.willAutoOpen).toBeUndefined();
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = TestData.withObject('padlock', {
        [TraitType.LOCKABLE]: { 
          type: TraitType.LOCKABLE,
          isLocked: true
        }
      });
      
      const padlock = findEntityByName(world, 'padlock')!;
      const context = createRealTestContext(unlockingAction, world,
        createCommand(IFActions.UNLOCKING, {
          entity: padlock
        })
      );
      
      const events = executeWithValidation(unlockingAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(padlock.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Unlocking Action Edge Cases', () => {
  test('should handle lockable without openable trait', () => {
    const { world, player, room } = TestData.withObject('iron shackles', {
      [TraitType.LOCKABLE]: {
        type: TraitType.LOCKABLE,
        isLocked: true
      }
      // No openable trait - just a lockable thing
    });
    
    const shackles = findEntityByName(world, 'iron shackles')!;
    const context = createRealTestContext(unlockingAction, world,
      createCommand(IFActions.UNLOCKING, {
        entity: shackles
      })
    );

    const events = executeWithValidation(unlockingAction, context);

    // Should succeed
    expectEvent(events, 'if.event.unlocked', {
      targetId: shackles.id
    });
  });

  test.skip('should prefer keyId over keyIds when both present', () => {
    const { world, player, room } = TestData.withObject('safe', {
      [TraitType.LOCKABLE]: {
        type: TraitType.LOCKABLE,
        isLocked: true,
        keyId: 'safe_key',  // Primary key
        keyIds: ['master_key', 'manager_key']  // Also has backup keys
      }
    });
    
    const safe = findEntityByName(world, 'safe')!;
    const primaryKey = world.createEntity('safe key', 'object');
    world.moveEntity(primaryKey.id, player.id);
    
    const context = createRealTestContext(unlockingAction, world,
      createCommand(IFActions.UNLOCKING, {
        entity: safe,
        secondEntity: primaryKey,
        preposition: 'with'
      })
    );
    
    const events = unlockingAction.execute(context);
    
    // Should succeed with primary key
    expectEvent(events, 'if.event.unlocked', {
      targetId: safe.id,
      keyId: primaryKey.id
    });
  });

  test.skip('should work with backup key when primary not available', () => {
    const { world, player, room } = TestData.withObject('locker', {
      [TraitType.LOCKABLE]: {
        type: TraitType.LOCKABLE,
        isLocked: true,
        keyIds: ['locker_key', 'janitor_key', 'admin_key']
      }
    });
    
    const locker = findEntityByName(world, 'locker')!;
    const janitorKey = world.createEntity('janitor key', 'object');
    world.moveEntity(janitorKey.id, player.id);
    
    const context = createRealTestContext(unlockingAction, world,
      createCommand(IFActions.UNLOCKING, {
        entity: locker,
        secondEntity: janitorKey,
        preposition: 'with'
      })
    );
    
    const events = unlockingAction.execute(context);
    
    expectEvent(events, 'if.event.unlocked', {
      targetId: locker.id,
      keyId: janitorKey.id
    });
  });

  test.skip('should handle empty container unlock', () => {
    const { world, player, room } = TestData.withObject('empty safe', {
      [TraitType.LOCKABLE]: {
        type: TraitType.LOCKABLE,
        isLocked: true
      },
      [TraitType.CONTAINER]: {
        type: TraitType.CONTAINER
      }
    });

    const safe = findEntityByName(world, 'empty safe')!;
    // No contents added - container is empty

    const context = createRealTestContext(unlockingAction, world,
      createCommand(IFActions.UNLOCKING, {
        entity: safe
      })
    );

    const events = unlockingAction.execute(context);

    expectEvent(events, 'action.success', {
      params: {
        isContainer: true,
        hasContents: false
      }
    });
  });
});

/**
 * World State Mutation Tests
 *
 * These tests verify that the unlocking action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually set isLocked to false after unlocking', () => {
    const { world, player, room } = setupBasicWorld();
    const box = world.createEntity('small box', 'object');
    box.add({
      type: TraitType.LOCKABLE,
      isLocked: true
    });
    world.moveEntity(box.id, room.id);

    // VERIFY PRECONDITION: box is locked
    const lockableBefore = box.get(TraitType.LOCKABLE) as any;
    expect(lockableBefore.isLocked).toBe(true);

    const command = createCommand(IFActions.UNLOCKING, {
      entity: box
    });
    const context = createRealTestContext(unlockingAction, world, command);

    const validation = unlockingAction.validate(context);
    expect(validation.valid).toBe(true);
    unlockingAction.execute(context);

    // VERIFY POSTCONDITION: box is now unlocked
    const lockableAfter = box.get(TraitType.LOCKABLE) as any;
    expect(lockableAfter.isLocked).toBe(false);
  });

  test('should actually set isLocked to false when using correct key', () => {
    const { world, player, room } = setupBasicWorld();
    const chest = world.createEntity('treasure chest', 'object');
    chest.add({
      type: TraitType.OPENABLE,
      isOpen: false
    });
    const key = world.createEntity('golden key', 'object');
    chest.add({
      type: TraitType.LOCKABLE,
      isLocked: true,
      keyId: key.id
    });
    world.moveEntity(chest.id, room.id);
    world.moveEntity(key.id, player.id);

    // VERIFY PRECONDITION: chest is locked
    const lockableBefore = chest.get(TraitType.LOCKABLE) as any;
    expect(lockableBefore.isLocked).toBe(true);

    const command = createCommand(IFActions.UNLOCKING, {
      entity: chest,
      secondEntity: key,
      preposition: 'with'
    });
    const context = createRealTestContext(unlockingAction, world, command);

    const validation = unlockingAction.validate(context);
    expect(validation.valid).toBe(true);
    unlockingAction.execute(context);

    // VERIFY POSTCONDITION: chest is now unlocked
    const lockableAfter = chest.get(TraitType.LOCKABLE) as any;
    expect(lockableAfter.isLocked).toBe(false);
  });

  test('should NOT change isLocked when already unlocked', () => {
    const { world, player, room } = setupBasicWorld();
    const safe = world.createEntity('wall safe', 'object');
    safe.add({
      type: TraitType.LOCKABLE,
      isLocked: false // Already unlocked
    });
    world.moveEntity(safe.id, room.id);

    // VERIFY PRECONDITION: safe is unlocked
    const lockableBefore = safe.get(TraitType.LOCKABLE) as any;
    expect(lockableBefore.isLocked).toBe(false);

    const command = createCommand(IFActions.UNLOCKING, {
      entity: safe
    });
    const context = createRealTestContext(unlockingAction, world, command);

    // Validation should fail
    const validation = unlockingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('already_unlocked');

    // VERIFY POSTCONDITION: safe is still unlocked (no change)
    const lockableAfter = safe.get(TraitType.LOCKABLE) as any;
    expect(lockableAfter.isLocked).toBe(false);
  });

  test('should NOT change isLocked when wrong key provided', () => {
    const { world, player, room } = setupBasicWorld();
    const cabinet = world.createEntity('cabinet', 'object');
    const correctKey = world.createEntity('cabinet key', 'object');
    const wrongKey = world.createEntity('desk key', 'object');
    cabinet.add({
      type: TraitType.LOCKABLE,
      isLocked: true,
      keyId: correctKey.id
    });
    world.moveEntity(cabinet.id, room.id);
    world.moveEntity(wrongKey.id, player.id); // Player has wrong key

    // VERIFY PRECONDITION: cabinet is locked
    const lockableBefore = cabinet.get(TraitType.LOCKABLE) as any;
    expect(lockableBefore.isLocked).toBe(true);

    const command = createCommand(IFActions.UNLOCKING, {
      entity: cabinet,
      secondEntity: wrongKey,
      preposition: 'with'
    });
    const context = createRealTestContext(unlockingAction, world, command);

    // Validation should fail
    const validation = unlockingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('wrong_key');

    // VERIFY POSTCONDITION: cabinet is still locked (no change)
    const lockableAfter = cabinet.get(TraitType.LOCKABLE) as any;
    expect(lockableAfter.isLocked).toBe(true);
  });

  test('should NOT change state when target is not lockable', () => {
    const { world, player, room } = setupBasicWorld();
    const rock = world.createEntity('solid rock', 'object');
    // No lockable trait
    world.moveEntity(rock.id, room.id);

    const command = createCommand(IFActions.UNLOCKING, {
      entity: rock
    });
    const context = createRealTestContext(unlockingAction, world, command);

    // Validation should fail
    const validation = unlockingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not_lockable');

    // Object should not have lockable trait at all
    expect(rock.has(TraitType.LOCKABLE)).toBe(false);
  });

  test('should actually unlock a door with key', () => {
    const { world, player, room } = setupBasicWorld();
    const door = world.createEntity('oak door', 'object');
    door.add({
      type: TraitType.OPENABLE,
      isOpen: false
    });
    door.add({
      type: TraitType.DOOR,
      connectsTo: 'room2'
    });
    const key = world.createEntity('brass key', 'object');
    door.add({
      type: TraitType.LOCKABLE,
      isLocked: true,
      keyId: key.id
    });
    world.moveEntity(door.id, room.id);
    world.moveEntity(key.id, player.id);

    // VERIFY PRECONDITION: door is locked
    const lockableBefore = door.get(TraitType.LOCKABLE) as any;
    expect(lockableBefore.isLocked).toBe(true);

    const command = createCommand(IFActions.UNLOCKING, {
      entity: door,
      secondEntity: key,
      preposition: 'with'
    });
    const context = createRealTestContext(unlockingAction, world, command);

    const validation = unlockingAction.validate(context);
    expect(validation.valid).toBe(true);
    unlockingAction.execute(context);

    // VERIFY POSTCONDITION: door is now unlocked
    const lockableAfter = door.get(TraitType.LOCKABLE) as any;
    expect(lockableAfter.isLocked).toBe(false);
  });
});
