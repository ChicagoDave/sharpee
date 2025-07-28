/**
 * Golden test for inserting action - demonstrates testing container-specific placement
 * 
 * This shows patterns for testing actions that:
 * - Delegate to other actions (putting)
 * - Are container-specific
 * - Ensure consistent behavior with related actions
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
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
import type { EnhancedActionContext } from '../../../src/actions/enhanced-types';

describe('insertingAction (Golden Pattern)', () => {
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
      let delegatedContext: EnhancedActionContext | null = null;
      
      puttingAction.execute = jest.fn((context) => {
        delegatedContext = context;
        return originalExecute.call(puttingAction, context);
      });
      
      const command = createCommand(IFActions.INSERTING, {
        entity: ball,
        secondEntity: box
      });
      const context = createRealTestContext(insertingAction, world, command);
      
      try {
        const events = insertingAction.execute(context);
        
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
      
      const events = insertingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
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
      
      const events = insertingAction.execute(context);
      
      expectEvent(events, 'action.error', {
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
      
      const events = insertingAction.execute(context);
      
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
      
      const events = insertingAction.execute(context);
      
      expectEvent(events, 'action.error', {
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
      
      const events = insertingAction.execute(context);
      
      // Should fail because inserting is container-specific
      expectEvent(events, 'action.error', {
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
      
      const events = insertingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_room'),
        params: { container: 'small pouch' }
      });
    });

    test('should fail when item not held', () => {
      const { world, player, room } = setupBasicWorld();
      
      const key = world.createEntity('brass key', 'object');
      const drawer = world.createEntity('desk drawer', 'container');
      drawer.add({ type: TraitType.CONTAINER });
      
      world.moveEntity(key.id, room.id);  // Key on floor
      world.moveEntity(drawer.id, room.id);
      
      const command = createCommand(IFActions.INSERTING, {
        entity: key,
        secondEntity: drawer
      });
      const context = createRealTestContext(insertingAction, world, command);
      
      const events = insertingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_held'),
        params: { item: 'brass key' }
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
      
      const events = insertingAction.execute(context);
      
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
    
    const insertEvents = insertingAction.execute(insertContext);
    
    // Reset for putting test
    world.moveEntity(item.id, player.id);
    
    // Execute putting with 'in' preposition
    const putCommand = createCommand(IFActions.PUTTING, {
      entity: item,
      secondEntity: container,
      preposition: 'in'
    });
    const putContext = createRealTestContext(puttingAction, world, putCommand);
    
    const putEvents = puttingAction.execute(putContext);
    
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
    
    const events = insertingAction.execute(context);
    
    expectEvent(events, 'if.event.put_in', {
      itemId: smallBox.id,
      targetId: largeBox.id
    });
  });
});
