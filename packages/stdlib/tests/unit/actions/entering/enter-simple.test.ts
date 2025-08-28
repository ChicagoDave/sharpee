/**
 * Tests for the enter sub-action
 * 
 * These tests verify the core enter logic works correctly for various
 * target types: containers, supporters, and objects with ENTRY trait.
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
import { enter } from '../../../../src/actions/standard/entering/sub-actions/enter';

describe('enter sub-action', () => {
  let world: WorldModel;
  let actor: IFEntity;
  let room: IFEntity;
  
  beforeEach(() => {
    world = new WorldModel();
    
    // Create a room
    room = world.createEntity('Test Room', 'room');
    
    // Create an actor in the room
    actor = world.createEntity('Player', 'object');
    actor.add({ type: TraitType.ACTOR });
    world.moveEntity(actor.id, room.id);
  });
  
  describe('entering containers', () => {
    it('should enter an enterable container', () => {
      // Create an enterable container
      const box = world.createEntity('Large Box', 'object');
      const containerTrait: ContainerTrait = {
        maxCapacity: 10,
        enterable: true
      };
      box.add({ type: TraitType.CONTAINER, ...containerTrait });
      world.moveEntity(box.id, room.id);
      
      // Enter the container
      const result = enter(actor, box, world);
      
      // Verify success
      expect(result.success).toBe(true);
      expect(result.preposition).toBe('in');
      expect(result.previousLocation).toBe(room.id);
      
      // Verify actor is now in the container
      expect(world.getLocation(actor.id)).toBe(box.id);
    });
    
    it('should fail to enter if already inside', () => {
      // Create container and put actor in it
      const box = world.createEntity('Box', 'object');
      box.add({ type: TraitType.CONTAINER, enterable: true });
      world.moveEntity(box.id, room.id);
      world.moveEntity(actor.id, box.id);
      
      // Try to enter again
      const result = enter(actor, box, world);
      
      // Should fail
      expect(result.success).toBe(false);
      expect(result.previousLocation).toBe(box.id);
    });
  });
  
  describe('entering supporters', () => {
    it('should enter an enterable supporter', () => {
      // Create an enterable supporter
      const bed = world.createEntity('Comfortable Bed', 'object');
      const supporterTrait: SupporterTrait = {
        maxCapacity: 5,
        enterable: true
      };
      bed.add({ type: TraitType.SUPPORTER, ...supporterTrait });
      world.moveEntity(bed.id, room.id);
      
      // Enter (get on) the supporter
      const result = enter(actor, bed, world);
      
      // Verify success
      expect(result.success).toBe(true);
      expect(result.preposition).toBe('on');
      expect(result.previousLocation).toBe(room.id);
      
      // Verify actor is now on the supporter
      expect(world.getLocation(actor.id)).toBe(bed.id);
    });
  });
  
  describe('entering objects with ENTRY trait', () => {
    it('should enter with specified preposition and posture', () => {
      // Create an object with ENTRY trait (also needs SUPPORTER for world model)
      const chair = world.createEntity('Armchair', 'object');
      chair.add({ type: TraitType.SUPPORTER, enterable: true });
      const entryTrait: EntryTrait = {
        canEnter: true,
        preposition: 'on',
        posture: 'sitting',
        maxOccupants: 1,
        occupants: []
      };
      chair.add({ type: TraitType.ENTRY, ...entryTrait });
      world.moveEntity(chair.id, room.id);
      
      // Enter the chair
      const result = enter(actor, chair, world);
      
      // Debug: check if chair has the trait
      expect(chair.has(TraitType.ENTRY)).toBe(true);
      
      // Verify success
      expect(result.success).toBe(true);
      expect(result.preposition).toBe('on');
      expect(result.posture).toBe('sitting');
      expect(result.previousLocation).toBe(room.id);
      
      // Verify actor is in the chair
      expect(world.getLocation(actor.id)).toBe(chair.id);
      
      // Verify occupants list updated
      const updatedTrait = chair.get(TraitType.ENTRY) as EntryTrait;
      expect(updatedTrait.occupants).toContain(actor.id);
    });
    
    it('should handle occupants list properly', () => {
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
      world.moveEntity(passenger.id, room.id);
      
      // Both enter the car
      const result1 = enter(actor, car, world);
      const result2 = enter(passenger, car, world);
      
      // Both should succeed
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Check occupants list
      const updatedTrait = car.get(TraitType.ENTRY) as EntryTrait;
      expect(updatedTrait.occupants).toHaveLength(2);
      expect(updatedTrait.occupants).toContain(actor.id);
      expect(updatedTrait.occupants).toContain(passenger.id);
      
      // Both actors should be in the car
      expect(world.getLocation(actor.id)).toBe(car.id);
      expect(world.getLocation(passenger.id)).toBe(car.id);
    });
  });
});