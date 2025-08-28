/**
 * Simple tests for the take sub-action
 * 
 * Tests the core taking logic without complex validation or behaviors.
 * Verifies that the entity location is properly mutated.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { take } from '../../../../src/actions/standard/taking/sub-actions/take';
import { setupBasicWorld } from '../../../test-utils';
import { IFEntity, TraitType, WorldModel } from '@sharpee/world-model';

describe('take sub-action', () => {
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
    world.moveEntity(item.id, room.id);
  });
  
  describe('validation', () => {
    it('should fail if item is already held', () => {
      // Move item to actor first
      world.moveEntity(item.id, actor.id);
      
      const result = take(actor, item, world);
      
      expect(result.success).toBe(false);
      expect(result.previousLocation).toBe(actor.id);
    });
    
    it('should succeed if item is not held', () => {
      const result = take(actor, item, world);
      
      expect(result.success).toBe(true);
      expect(result.previousLocation).toBe(room.id);
    });
  });
  
  describe('execution', () => {
    it('should move item to actor', () => {
      const result = take(actor, item, world);
      
      expect(result.success).toBe(true);
      expect(world.getLocation(item.id)).toBe(actor.id);
    });
    
    it('should record previous location', () => {
      const result = take(actor, item, world);
      
      expect(result.previousLocation).toBe(room.id);
    });
    
    it('should handle taking from containers', () => {
      // Create a container
      const container = world.createEntity('box', 'object');
      container.add({ type: TraitType.CONTAINER, capacity: { maxItems: 10 } });
      world.moveEntity(container.id, room.id);
      
      // Put item in container
      world.moveEntity(item.id, container.id);
      
      const result = take(actor, item, world);
      
      expect(result.success).toBe(true);
      expect(result.previousLocation).toBe(container.id);
      expect(world.getLocation(item.id)).toBe(actor.id);
    });
    
    it('should handle taking from supporters', () => {
      // Create a supporter
      const table = world.createEntity('table', 'object');
      table.add({ type: TraitType.SUPPORTER });
      world.moveEntity(table.id, room.id);
      
      // Put item on table
      world.moveEntity(item.id, table.id);
      
      const result = take(actor, item, world);
      
      expect(result.success).toBe(true);
      expect(result.previousLocation).toBe(table.id);
      expect(world.getLocation(item.id)).toBe(actor.id);
    });
  });
  
  describe('state mutations', () => {
    it('should mutate entity location', () => {
      expect(world.getLocation(item.id)).toBe(room.id);
      
      take(actor, item, world);
      
      expect(world.getLocation(item.id)).toBe(actor.id);
    });
    
    it('should not mutate anything on failure', () => {
      // Item already held
      world.moveEntity(item.id, actor.id);
      const initialLocation = world.getLocation(item.id);
      
      const result = take(actor, item, world);
      
      expect(result.success).toBe(false);
      expect(world.getLocation(item.id)).toBe(initialLocation);
    });
  });
  
  describe('edge cases', () => {
    it('should handle entity parameter as command.entity', () => {
      // Simulate command structure with entity at root
      const command = { entity: item };
      
      const result = take(actor, command.entity, world);
      
      expect(result.success).toBe(true);
      expect(world.getLocation(item.id)).toBe(actor.id);
    });
    
    it('should handle entity parameter as command.directObject.entity', () => {
      // Simulate command structure with directObject
      const command = { directObject: { entity: item } };
      
      const result = take(actor, command.directObject.entity, world);
      
      expect(result.success).toBe(true);
      expect(world.getLocation(item.id)).toBe(actor.id);
    });
  });
});