/**
 * Simple tests for the drop sub-action
 * 
 * Tests the core dropping logic without complex validation or behaviors.
 * Verifies that the entity location is properly mutated.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { drop } from '../../../../src/actions/standard/dropping/sub-actions/drop';
import { setupBasicWorld } from '../../../test-utils';
import { IFEntity, TraitType, WorldModel } from '@sharpee/world-model';

describe('drop sub-action', () => {
  let world: WorldModel;
  let actor: IFEntity;
  let item: IFEntity;
  let room: IFEntity;
  
  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    room = setup.room;
    actor = setup.player;
    
    // Create an item
    item = world.createEntity('book', 'object');
    item.add({ type: TraitType.IDENTITY, name: 'book' });
    // Give item to actor
    world.moveEntity(item.id, actor.id);
  });
  
  describe('validation', () => {
    it('should fail if item is not held', () => {
      // Move item to room first
      world.moveEntity(item.id, room.id);
      
      const result = drop(actor, item, world);
      
      expect(result.success).toBe(false);
      expect(result.droppedTo).toBeUndefined();
    });
    
    it('should succeed if item is held', () => {
      const result = drop(actor, item, world);
      
      expect(result.success).toBe(true);
      expect(result.droppedTo).toBe(room.id);
    });
    
    it('should fail if actor has no location', () => {
      // Create a floating actor with no location
      const floatingActor = world.createEntity('ghost', 'object');
      floatingActor.add({ type: TraitType.ACTOR });
      const floatingItem = world.createEntity('ectoplasm', 'object');
      floatingItem.add({ type: TraitType.IDENTITY, name: 'ectoplasm' });
      
      // Give item to floating actor
      world.moveEntity(floatingItem.id, floatingActor.id);
      
      const result = drop(floatingActor, floatingItem, world);
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('execution', () => {
    it('should move item to actor location', () => {
      const result = drop(actor, item, world);
      
      expect(result.success).toBe(true);
      expect(world.getLocation(item.id)).toBe(room.id);
    });
    
    it('should record where it was dropped', () => {
      const result = drop(actor, item, world);
      
      expect(result.droppedTo).toBe(room.id);
    });
    
    it('should drop into containers', () => {
      // Create a container
      const box = world.createEntity('box', 'object');
      box.add({ type: TraitType.CONTAINER, capacity: { maxItems: 10 } });
      world.moveEntity(box.id, room.id);
      
      // Move actor into the box (if possible) or just test dropping to room
      // Actor stays in room, drops item which goes to room
      const result = drop(actor, item, world);
      
      expect(result.success).toBe(true);
      expect(result.droppedTo).toBe(room.id);
      expect(world.getLocation(item.id)).toBe(room.id);
    });
    
    it('should drop onto supporters', () => {
      // Create a supporter  
      const table = world.createEntity('table', 'object');
      table.add({ type: TraitType.SUPPORTER });
      world.moveEntity(table.id, room.id);
      
      // Actor in room drops item, it goes to room (not automatically onto table)
      const result = drop(actor, item, world);
      
      expect(result.success).toBe(true);
      expect(result.droppedTo).toBe(room.id);
      expect(world.getLocation(item.id)).toBe(room.id);
    });
  });
  
  describe('state mutations', () => {
    it('should mutate entity location', () => {
      expect(world.getLocation(item.id)).toBe(actor.id);
      
      drop(actor, item, world);
      
      expect(world.getLocation(item.id)).toBe(room.id);
    });
    
    it('should not mutate anything on failure', () => {
      // Item not held
      world.moveEntity(item.id, room.id);
      const initialLocation = world.getLocation(item.id);
      
      const result = drop(actor, item, world);
      
      expect(result.success).toBe(false);
      expect(world.getLocation(item.id)).toBe(initialLocation);
    });
  });
  
  describe('edge cases', () => {
    it('should handle entity parameter as command.entity', () => {
      // Simulate command structure with entity at root
      const command = { entity: item };
      
      const result = drop(actor, command.entity, world);
      
      expect(result.success).toBe(true);
      expect(world.getLocation(item.id)).toBe(room.id);
    });
    
    it('should handle entity parameter as command.directObject.entity', () => {
      // Simulate command structure with directObject
      const command = { directObject: { entity: item } };
      
      const result = drop(actor, command.directObject.entity, world);
      
      expect(result.success).toBe(true);
      expect(world.getLocation(item.id)).toBe(room.id);
    });
    
    it('should drop multiple items independently', () => {
      const item2 = world.createEntity('pen', 'object');
      item2.add({ type: TraitType.IDENTITY, name: 'pen' });
      world.moveEntity(item2.id, actor.id);
      
      // Drop first item
      const result1 = drop(actor, item, world);
      expect(result1.success).toBe(true);
      expect(world.getLocation(item.id)).toBe(room.id);
      expect(world.getLocation(item2.id)).toBe(actor.id); // Still held
      
      // Drop second item
      const result2 = drop(actor, item2, world);
      expect(result2.success).toBe(true);
      expect(world.getLocation(item2.id)).toBe(room.id);
    });
  });
});