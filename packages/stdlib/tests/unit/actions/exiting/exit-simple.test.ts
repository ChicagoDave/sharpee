/**
 * Tests for the exit sub-action
 * 
 * These tests verify the core exit logic works correctly for various
 * container types: containers, supporters, and objects with ENTRY trait.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  WorldModel,
  IFEntity, 
  TraitType, 
  ContainerTrait, 
  SupporterTrait,
  EntryTrait 
} from '@sharpee/world-model';
import { exit } from '../../../../src/actions/standard/exiting/sub-actions/exit';

describe('exit sub-action', () => {
  let world: WorldModel;
  let actor: IFEntity;
  let room: IFEntity;
  
  beforeEach(() => {
    world = new WorldModel();
    
    // Create a room
    room = world.createEntity('Test Room', 'room');
    
    // Create an actor
    actor = world.createEntity('Player', 'object');
    actor.add({ type: TraitType.ACTOR });
  });
  
  describe('exiting containers', () => {
    it('should exit from a container', () => {
      // Create container in room
      const box = world.createEntity('Large Box', 'object');
      box.add({ type: TraitType.CONTAINER, enterable: true });
      world.moveEntity(box.id, room.id);
      
      // Put actor in container
      world.moveEntity(actor.id, box.id);
      
      // Exit the container
      const result = exit(actor, world);
      
      // Verify success
      expect(result.success).toBe(true);
      expect(result.fromLocation).toBe(box.id);
      expect(result.toLocation).toBe(room.id);
      expect(result.preposition).toBe('out of');
      
      // Verify actor is back in the room
      expect(world.getLocation(actor.id)).toBe(room.id);
    });
    
    it('should fail if no parent location', () => {
      // Put actor directly in a container with no parent
      const voidBox = world.createEntity('Void Box', 'object');
      voidBox.add({ type: TraitType.CONTAINER });
      world.moveEntity(actor.id, voidBox.id);
      
      // Try to exit
      const result = exit(actor, world);
      
      // Should fail
      expect(result.success).toBe(false);
      expect(result.fromLocation).toBe(voidBox.id);
      expect(result.toLocation).toBeUndefined();
    });
  });
  
  describe('exiting supporters', () => {
    it('should exit from a supporter', () => {
      // Create supporter in room
      const bed = world.createEntity('Bed', 'object');
      bed.add({ type: TraitType.SUPPORTER, enterable: true });
      world.moveEntity(bed.id, room.id);
      
      // Put actor on supporter
      world.moveEntity(actor.id, bed.id);
      
      // Exit (get off) the supporter
      const result = exit(actor, world);
      
      // Verify success
      expect(result.success).toBe(true);
      expect(result.fromLocation).toBe(bed.id);
      expect(result.toLocation).toBe(room.id);
      expect(result.preposition).toBe('off');
      
      // Verify actor is back in the room
      expect(world.getLocation(actor.id)).toBe(room.id);
    });
  });
  
  describe('exiting objects with ENTRY trait', () => {
    it('should exit and update occupants list', () => {
      // Create object with ENTRY trait (also needs SUPPORTER for world model)
      const chair = world.createEntity('Armchair', 'object');
      chair.add({ type: TraitType.SUPPORTER, enterable: true });
      const entryTrait: EntryTrait = {
        canEnter: true,
        preposition: 'on',
        posture: 'sitting',
        maxOccupants: 1,
        occupants: [actor.id]  // Actor already in occupants
      };
      chair.add({ type: TraitType.ENTRY, ...entryTrait });
      world.moveEntity(chair.id, room.id);
      
      // Put actor in the chair
      world.moveEntity(actor.id, chair.id);
      
      // Exit the chair
      const result = exit(actor, world);
      
      // Verify success
      expect(result.success).toBe(true);
      expect(result.fromLocation).toBe(chair.id);
      expect(result.toLocation).toBe(room.id);
      
      // Verify actor removed from occupants
      const updatedTrait = chair.get(TraitType.ENTRY) as EntryTrait;
      expect(updatedTrait.occupants).not.toContain(actor.id);
      expect(updatedTrait.occupants).toHaveLength(0);
      
      // Verify actor is back in the room
      expect(world.getLocation(actor.id)).toBe(room.id);
    });
    
    it('should handle multiple occupants correctly', () => {
      // Create vehicle with ENTRY trait (also needs CONTAINER for world model)
      const car = world.createEntity('Car', 'object');
      car.add({ type: TraitType.CONTAINER, enterable: true });
      const entryTrait: EntryTrait = {
        canEnter: true,
        preposition: 'in',
        maxOccupants: 4,
        occupants: []
      };
      car.add({ type: TraitType.ENTRY, ...entryTrait });
      world.moveEntity(car.id, room.id);
      
      // Create another actor
      const passenger = world.createEntity('Passenger', 'object');
      passenger.add({ type: TraitType.ACTOR });
      
      // Put both actors in the car
      world.moveEntity(actor.id, car.id);
      world.moveEntity(passenger.id, car.id);
      const carEntry = car.get(TraitType.ENTRY) as EntryTrait;
      carEntry.occupants = [actor.id, passenger.id];
      
      // Exit only the main actor
      const result = exit(actor, world);
      
      // Should succeed
      expect(result.success).toBe(true);
      
      // Check occupants list - passenger should remain
      const updatedCarEntry = car.get(TraitType.ENTRY) as EntryTrait;
      expect(updatedCarEntry.occupants).not.toContain(actor.id);
      expect(updatedCarEntry.occupants).toContain(passenger.id);
      expect(updatedCarEntry.occupants).toHaveLength(1);
      
      // Verify locations
      expect(world.getLocation(actor.id)).toBe(room.id);
      expect(world.getLocation(passenger.id)).toBe(car.id);
    });
  });
  
  describe('edge cases', () => {
    it('should handle actor with no location', () => {
      // Create actor with no location
      const lostActor = world.createEntity('Lost', 'object');
      
      // Try to exit
      const result = exit(lostActor, world);
      
      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.fromLocation).toBeUndefined();
      expect(result.toLocation).toBeUndefined();
    });
    
    it('should use correct preposition for nested containers', () => {
      // Create nested containers
      const outerBox = world.createEntity('Outer Box', 'object');
      outerBox.add({ type: TraitType.CONTAINER, enterable: true });
      world.moveEntity(outerBox.id, room.id);
      
      const innerBox = world.createEntity('Inner Box', 'object');
      innerBox.add({ type: TraitType.CONTAINER, enterable: true });
      world.moveEntity(innerBox.id, outerBox.id);
      
      // Put actor in inner box
      world.moveEntity(actor.id, innerBox.id);
      
      // Exit to outer box
      const result = exit(actor, world);
      
      expect(result.success).toBe(true);
      expect(result.preposition).toBe('out of');
      expect(result.toLocation).toBe(outerBox.id);
      
      // Actor should be in outer box now
      expect(world.getLocation(actor.id)).toBe(outerBox.id);
    });
  });
});