/**
 * Golden test for inserting action - demonstrates testing container-specific placement
 * 
 * This shows patterns for testing actions that:
 * - Delegate to other actions (putting)
 * - Are container-specific
 * - Ensure consistent behavior with related actions
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { insertingAction } from '../../../src/actions/standard/inserting';
import { puttingAction } from '../../../src/actions/standard/putting';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';
import type { ISemanticEvent } from '@sharpee/core';
import { SemanticEvent } from '@sharpee/core';

// Helper to execute action using the four-phase pattern
function executeAction(action: any, context: ActionContext): ISemanticEvent[] {
  // Four-phase pattern: validate -> execute/blocked -> report
  const validationResult = action.validate(context);

  if (!validationResult.valid) {
    // Use blocked() for validation failures
    return action.blocked(context, validationResult);
  }

  // Execute mutations (returns void)
  action.execute(context);

  // Report generates success events
  return action.report(context);
}

describe('insertingAction (Golden Pattern)', () => {
  describe('Three-Phase Pattern Compliance', () => {
    test('should have required methods for three-phase pattern', () => {
      expect(insertingAction.validate).toBeDefined();
      expect(insertingAction.execute).toBeDefined();
      expect(insertingAction.report).toBeDefined();
    });

    test('should use report() for ALL event generation', () => {
      const { world, player, room } = setupBasicWorld();
      const item = world.createEntity('test item', 'object');
      world.moveEntity(item.id, room.id);
      
      const command = createCommand(IFActions.INSERTING, {
        entity: item,
        text: 'test item'
      });
      const context = createRealTestContext(insertingAction, world, command);
      
      // The executeAction helper properly tests the three-phase pattern
      const events = executeAction(insertingAction, context);
      
      // All events should be generated via report()
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(insertingAction.id).toBe(IFActions.INSERTING);
    });

    test('should declare required messages', () => {
      expect(insertingAction.requiredMessages).toContain('no_target');
      expect(insertingAction.requiredMessages).toContain('no_destination');
      expect(insertingAction.requiredMessages).toContain('not_held');
      expect(insertingAction.requiredMessages).toContain('not_insertable');
      expect(insertingAction.requiredMessages).toContain('not_container');
      expect(insertingAction.requiredMessages).toContain('already_there');
      expect(insertingAction.requiredMessages).toContain('inserted');
      expect(insertingAction.requiredMessages).toContain('wont_fit');
      expect(insertingAction.requiredMessages).toContain('container_closed');
    });

    test('should belong to object_manipulation group', () => {
      expect(insertingAction.group).toBe('object_manipulation');
    });
  });

  describe('Delegation to Putting Action', () => {
    test('should delegate to putting action with in preposition', () => {
      const { world, player, room } = setupBasicWorld();
      
      const ball = world.createEntity('red ball', 'object');
      const box = world.createEntity('wooden box', 'container');
      box.add({ type: TraitType.CONTAINER });
      
      world.moveEntity(ball.id, player.id);  // Player holds ball
      world.moveEntity(box.id, room.id);
      
      // Mock putting action to verify delegation
      const originalExecute = puttingAction.execute;
      let delegatedContext: ActionContext | null = null;
      
      puttingAction.execute = vi.fn((context) => {
        delegatedContext = context;
        return originalExecute.call(puttingAction, context);
      });
      
      const command = createCommand(IFActions.INSERTING, {
        entity: ball,
        secondEntity: box
      });
      const context = createRealTestContext(insertingAction, world, command);
      
      try {
        const events = executeAction(insertingAction, context);
        
        // Verify delegation occurred
        expect(puttingAction.execute).toHaveBeenCalled();
        
        // Verify preposition was set to 'in'
        expect(delegatedContext?.command.parsed.preposition).toBe('in');
        
        // Should get same result as putting with 'in'
        expectEvent(events, 'if.event.put_in', {
          itemId: ball.id,
          targetId: box.id,
          preposition: 'in'
        });
      } finally {
        puttingAction.execute = originalExecute;
      }
    });

    test('should handle no target error from putting', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.INSERTING);
      const context = createRealTestContext(insertingAction, world, command);
      
      const events = executeAction(insertingAction, context);
      
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('no_target')
      });
    });

    test('should handle no destination error from putting', () => {
      const { world, player, room } = setupBasicWorld();
      const ball = world.createEntity('ball', 'object');
      world.moveEntity(ball.id, player.id);
      
      const command = createCommand(IFActions.INSERTING, {
        entity: ball
        // No indirect object
      });
      const context = createRealTestContext(insertingAction, world, command);
      
      const events = executeAction(insertingAction, context);
      
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('no_destination')
      });
    });
  });

  describe('Container-Specific Behavior', () => {
    test('should successfully insert into open container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const gem = world.createEntity('ruby', 'object');
      const box = world.createEntity('jewel box', 'container');
      box.add({ type: TraitType.CONTAINER });
      box.add({ 
        type: TraitType.OPENABLE,
        isOpen: true
      });
      
      world.moveEntity(gem.id, player.id);
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(IFActions.INSERTING, {
        entity: gem,
        secondEntity: box
      });
      const context = createRealTestContext(insertingAction, world, command);
      
      const events = executeAction(insertingAction, context);
      
      expectEvent(events, 'if.event.put_in', {
        itemId: gem.id,
        targetId: box.id
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('put_in'),
        params: { 
          item: 'ruby',
          container: 'jewel box'
        }
      });
    });

    test('should fail when container is closed', () => {
      const { world, player, room } = setupBasicWorld();
      
      const coin = world.createEntity('gold coin', 'object');
      const chest = world.createEntity('treasure chest', 'container');
      chest.add({ type: TraitType.CONTAINER });
      chest.add({ 
        type: TraitType.OPENABLE,
        isOpen: false  // Closed
      });
      
      world.moveEntity(coin.id, player.id);
      world.moveEntity(chest.id, room.id);
      
      const command = createCommand(IFActions.INSERTING, {
        entity: coin,
        secondEntity: chest
      });
      const context = createRealTestContext(insertingAction, world, command);
      
      const events = executeAction(insertingAction, context);
      
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('container_closed'),
        params: { container: 'treasure chest' }
      });
    });

    test('should fail when target is not a container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const paper = world.createEntity('piece of paper', 'object');
      const table = world.createEntity('wooden table', 'supporter');
      table.add({ type: TraitType.SUPPORTER });
      
      world.moveEntity(paper.id, player.id);
      world.moveEntity(table.id, room.id);
      
      const command = createCommand(IFActions.INSERTING, {
        entity: paper,
        secondEntity: table
      });
      const context = createRealTestContext(insertingAction, world, command);
      
      const events = executeAction(insertingAction, context);
      
      // Should fail because inserting is container-specific
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('not_container'),
        params: { destination: 'wooden table' }
      });
    });
  });

  describe('Capacity and State Checks', () => {
    test('should respect container capacity', () => {
      const { world, player, room } = setupBasicWorld();
      
      const newItem = world.createEntity('glass marble', 'object');
      const pouch = world.createEntity('small pouch', 'container');
      pouch.add({ 
        type: TraitType.CONTAINER,
        capacity: { maxItems: 3 }
      });
      
      // Create existing items in pouch
      const coin1 = world.createEntity('copper coin', 'object');
      const coin2 = world.createEntity('silver coin', 'object');
      const coin3 = world.createEntity('gold coin', 'object');
      
      world.moveEntity(newItem.id, player.id);
      world.moveEntity(pouch.id, room.id);
      world.moveEntity(coin1.id, pouch.id);
      world.moveEntity(coin2.id, pouch.id);
      world.moveEntity(coin3.id, pouch.id);
      
      const command = createCommand(IFActions.INSERTING, {
        entity: newItem,
        secondEntity: pouch
      });
      const context = createRealTestContext(insertingAction, world, command);
      
      const events = executeAction(insertingAction, context);
      
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('no_room'),
        params: { container: 'small pouch' }
      });
    });

  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      
      const letter = world.createEntity('letter', 'object');
      const envelope = world.createEntity('envelope', 'container');
      envelope.add({ type: TraitType.CONTAINER });
      
      world.moveEntity(letter.id, player.id);
      world.moveEntity(envelope.id, room.id);
      
      const command = createCommand(IFActions.INSERTING, {
        entity: letter,
        secondEntity: envelope
      });
      const context = createRealTestContext(insertingAction, world, command);
      
      const events = executeAction(insertingAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(letter.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Inserting Action Integration', () => {
  test('should maintain consistency with putting action', () => {
    const { world, player, room } = setupBasicWorld();
    
    const item = world.createEntity('small item', 'object');
    const container = world.createEntity('container', 'container');
    container.add({ type: TraitType.CONTAINER });
    
    world.moveEntity(item.id, player.id);
    world.moveEntity(container.id, room.id);
    
    // Execute inserting
    const insertCommand = createCommand(IFActions.INSERTING, {
      entity: item,
      secondEntity: container
    });
    const insertContext = createRealTestContext(insertingAction, world, insertCommand);
    
    const insertEvents = executeAction(insertingAction, insertContext);
    
    // Reset for putting test
    world.moveEntity(item.id, player.id);
    
    // Execute putting with 'in' preposition
    const putCommand = createCommand(IFActions.PUTTING, {
      entity: item,
      secondEntity: container,
      preposition: 'in'
    });
    const putContext = createRealTestContext(puttingAction, world, putCommand);
    
    const putEvents = executeAction(puttingAction, putContext);
    
    // Both should produce same event types
    expect(insertEvents.map(e => e.type).sort()).toEqual(
      putEvents.map(e => e.type).sort()
    );
  });

  test('should handle container within container', () => {
    const { world, player, room } = setupBasicWorld();

    const smallBox = world.createEntity('small box', 'container');
    smallBox.add({ type: TraitType.CONTAINER });

    const largeBox = world.createEntity('large box', 'container');
    largeBox.add({
      type: TraitType.CONTAINER,
      capacity: { maxItems: 5 }
    });

    world.moveEntity(smallBox.id, player.id);
    world.moveEntity(largeBox.id, room.id);

    const command = createCommand(IFActions.INSERTING, {
      entity: smallBox,
      secondEntity: largeBox
    });
    const context = createRealTestContext(insertingAction, world, command);

    const events = executeAction(insertingAction, context);

    expectEvent(events, 'if.event.put_in', {
      itemId: smallBox.id,
      targetId: largeBox.id
    });
  });
});

/**
 * CRITICAL: World State Mutation Verification Tests
 *
 * These tests verify that the inserting action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually move item into container', () => {
    const { world, player, room } = setupBasicWorld();

    const gem = world.createEntity('emerald', 'object');
    const box = world.createEntity('velvet box', 'container');
    box.add({ type: TraitType.CONTAINER });

    world.moveEntity(gem.id, player.id);
    world.moveEntity(box.id, room.id);

    // VERIFY PRECONDITION: gem is in player's inventory
    expect(world.getLocation(gem.id)).toBe(player.id);

    const command = createCommand(IFActions.INSERTING, {
      entity: gem,
      secondEntity: box
    });
    const context = createRealTestContext(insertingAction, world, command);

    const validation = insertingAction.validate(context);
    expect(validation.valid).toBe(true);
    insertingAction.execute(context);

    // VERIFY POSTCONDITION: gem is now in the box
    expect(world.getLocation(gem.id)).toBe(box.id);
  });

  test('should actually move item into open container with openable trait', () => {
    const { world, player, room } = setupBasicWorld();

    const coin = world.createEntity('gold doubloon', 'object');
    const chest = world.createEntity('pirate chest', 'container');
    chest.add({ type: TraitType.CONTAINER });
    chest.add({ type: TraitType.OPENABLE, isOpen: true });

    world.moveEntity(coin.id, player.id);
    world.moveEntity(chest.id, room.id);

    // VERIFY PRECONDITION: coin is in player's inventory
    expect(world.getLocation(coin.id)).toBe(player.id);

    const command = createCommand(IFActions.INSERTING, {
      entity: coin,
      secondEntity: chest
    });
    const context = createRealTestContext(insertingAction, world, command);

    const validation = insertingAction.validate(context);
    expect(validation.valid).toBe(true);
    insertingAction.execute(context);

    // VERIFY POSTCONDITION: coin is now in the chest
    expect(world.getLocation(coin.id)).toBe(chest.id);
  });

  test('should NOT move item when container is closed', () => {
    const { world, player, room } = setupBasicWorld();

    const ring = world.createEntity('diamond ring', 'object');
    const casket = world.createEntity('jewelry casket', 'container');
    casket.add({ type: TraitType.CONTAINER });
    casket.add({ type: TraitType.OPENABLE, isOpen: false });

    world.moveEntity(ring.id, player.id);
    world.moveEntity(casket.id, room.id);

    // VERIFY PRECONDITION: ring is in player's inventory
    expect(world.getLocation(ring.id)).toBe(player.id);

    const command = createCommand(IFActions.INSERTING, {
      entity: ring,
      secondEntity: casket
    });
    const context = createRealTestContext(insertingAction, world, command);

    // Validation should fail
    const validation = insertingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('container_closed');

    // VERIFY POSTCONDITION: ring still in player's inventory (no change)
    expect(world.getLocation(ring.id)).toBe(player.id);
  });

  test('should NOT move item when container is full', () => {
    const { world, player, room } = setupBasicWorld();

    const newCoin = world.createEntity('platinum coin', 'object');
    const pouch = world.createEntity('leather pouch', 'container');
    pouch.add({
      type: TraitType.CONTAINER,
      capacity: { maxItems: 2 }
    });

    // Fill the pouch
    const coin1 = world.createEntity('copper coin', 'object');
    const coin2 = world.createEntity('silver coin', 'object');
    world.moveEntity(coin1.id, pouch.id);
    world.moveEntity(coin2.id, pouch.id);

    world.moveEntity(newCoin.id, player.id);
    world.moveEntity(pouch.id, room.id);

    // VERIFY PRECONDITION: newCoin is in player's inventory
    expect(world.getLocation(newCoin.id)).toBe(player.id);

    const command = createCommand(IFActions.INSERTING, {
      entity: newCoin,
      secondEntity: pouch
    });
    const context = createRealTestContext(insertingAction, world, command);

    // Validation should fail
    const validation = insertingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('no_room');

    // VERIFY POSTCONDITION: coin still in player's inventory (no change)
    expect(world.getLocation(newCoin.id)).toBe(player.id);
  });

  test('should move nested container into another container', () => {
    const { world, player, room } = setupBasicWorld();

    const innerBox = world.createEntity('small tin box', 'container');
    innerBox.add({ type: TraitType.CONTAINER });

    const outerBox = world.createEntity('large wooden crate', 'container');
    outerBox.add({
      type: TraitType.CONTAINER,
      capacity: { maxItems: 10 }
    });

    world.moveEntity(innerBox.id, player.id);
    world.moveEntity(outerBox.id, room.id);

    // VERIFY PRECONDITION: innerBox is in player's inventory
    expect(world.getLocation(innerBox.id)).toBe(player.id);

    const command = createCommand(IFActions.INSERTING, {
      entity: innerBox,
      secondEntity: outerBox
    });
    const context = createRealTestContext(insertingAction, world, command);

    const validation = insertingAction.validate(context);
    expect(validation.valid).toBe(true);
    insertingAction.execute(context);

    // VERIFY POSTCONDITION: innerBox is now in outerBox
    expect(world.getLocation(innerBox.id)).toBe(outerBox.id);
  });
});
