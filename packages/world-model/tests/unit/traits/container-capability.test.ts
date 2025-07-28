// packages/world-model/tests/unit/traits/container-capability.test.ts

// No need to import - Jest provides these globally
import { IFEntity } from '../../../src/entities/if-entity';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { 
  canContain, 
  getContainerTrait, 
  isContainerCapable 
} from '../../../src/traits/container/container-utils';
import { TraitType } from '../../../src/traits/trait-types';

describe('Container Capability', () => {
  describe('RoomTrait', () => {
    it('should have container properties', () => {
      const room = new RoomTrait({
        capacity: { maxItems: 100 },
        allowedTypes: ['item', 'actor']
      });
      
      expect(room.isTransparent).toBe(true);
      expect(room.enterable).toBe(true);
      expect(room.capacity?.maxItems).toBe(100);
      expect(room.allowedTypes).toEqual(['item', 'actor']);
    });
    
    it('should be recognized as container capable', () => {
      const room = new RoomTrait();
      expect(isContainerCapable(room)).toBe(true);
    });
    
    it('should work with canContain utility', () => {
      const entity = new IFEntity('room1', 'room');
      entity.add(new RoomTrait());
      
      expect(canContain(entity)).toBe(true);
    });
  });
  
  describe('ActorTrait', () => {
    it('should have container properties', () => {
      const actor = new ActorTrait({
        capacity: { maxWeight: 50, maxItems: 10 },
        excludedTypes: ['actor'] // Can't carry other actors
      });
      
      expect(actor.isTransparent).toBe(false);
      expect(actor.enterable).toBe(false);
      expect(actor.capacity?.maxWeight).toBe(50);
      expect(actor.capacity?.maxItems).toBe(10);
      expect(actor.excludedTypes).toEqual(['actor']);
    });
    
    it('should be recognized as container capable', () => {
      const actor = new ActorTrait();
      expect(isContainerCapable(actor)).toBe(true);
    });
    
    it('should work with canContain utility', () => {
      const entity = new IFEntity('player', 'actor');
      entity.add(new ActorTrait());
      
      expect(canContain(entity)).toBe(true);
    });
    
    it('should update capacity through setInventoryLimit', () => {
      const actor = new ActorTrait();
      actor.setInventoryLimit({ maxWeight: 30, maxItems: 5 });
      
      expect(actor.capacity?.maxWeight).toBe(30);
      expect(actor.capacity?.maxItems).toBe(5);
    });
  });
  
  describe('getContainerTrait', () => {
    it('should get container trait from room', () => {
      const entity = new IFEntity('room1', 'room');
      const roomTrait = new RoomTrait({ capacity: { maxItems: 50 } });
      entity.add(roomTrait);
      
      const containerTrait = getContainerTrait(entity);
      expect(containerTrait).toBe(roomTrait);
      expect(containerTrait?.capacity?.maxItems).toBe(50);
    });
    
    it('should get container trait from actor', () => {
      const entity = new IFEntity('npc', 'actor');
      const actorTrait = new ActorTrait({ capacity: { maxWeight: 20 } });
      entity.add(actorTrait);
      
      const containerTrait = getContainerTrait(entity);
      expect(containerTrait).toBe(actorTrait);
      expect(containerTrait?.capacity?.maxWeight).toBe(20);
    });
    
    it('should get explicit container trait first', () => {
      const entity = new IFEntity('box', 'container');
      const containerTrait = new ContainerTrait({ capacity: { maxVolume: 10 } });
      entity.add(containerTrait);
      
      // Even if we add a room trait, container trait takes precedence
      entity.add(new RoomTrait());
      
      const found = getContainerTrait(entity);
      expect(found).toBe(containerTrait);
      expect(found?.capacity?.maxVolume).toBe(10);
    });
    
    it('should return undefined for non-container entities', () => {
      const entity = new IFEntity('sword', 'item');
      // No container-capable traits
      
      const containerTrait = getContainerTrait(entity);
      expect(containerTrait).toBeUndefined();
    });
  });
  
  describe('Integration with World Model', () => {
    it('should allow moving items into rooms without explicit ContainerTrait', async () => {
      // This test would require WorldModel, but we can at least verify
      // that our traits are set up correctly for it
      const room = new IFEntity('library', 'room');
      room.add(new RoomTrait({
        capacity: { maxItems: 1000 }
      }));
      
      const book = new IFEntity('book', 'item');
      
      // Verify room can contain
      expect(canContain(room)).toBe(true);
      
      // Verify room has proper container properties
      const containerTrait = getContainerTrait(room);
      expect(containerTrait).toBeDefined();
      expect(containerTrait?.isTransparent).toBe(true);
      expect(containerTrait?.capacity?.maxItems).toBe(1000);
    });
    
    it('should allow actors to carry items without explicit ContainerTrait', () => {
      const player = new IFEntity('player', 'actor');
      player.add(new ActorTrait({
        isPlayer: true,
        capacity: { maxWeight: 50, maxItems: 20 }
      }));
      
      // Verify actor can contain
      expect(canContain(player)).toBe(true);
      
      // Verify actor has proper container properties
      const containerTrait = getContainerTrait(player);
      expect(containerTrait).toBeDefined();
      expect(containerTrait?.isTransparent).toBe(false); // Can't see inside inventory
      expect(containerTrait?.capacity?.maxWeight).toBe(50);
    });
  });
});
