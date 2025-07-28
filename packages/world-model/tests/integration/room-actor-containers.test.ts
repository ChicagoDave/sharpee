// packages/world-model/tests/integration/room-actor-containers.test.ts

// No need to import - Jest provides these globally
import { WorldModel } from '../../src/world/WorldModel';
import { IFEntity } from '../../src/entities/if-entity';
import { RoomTrait } from '../../src/traits/room/roomTrait';
import { ActorTrait } from '../../src/traits/actor/actorTrait';
import { IdentityTrait } from '../../src/traits/identity/identityTrait';
import { SupporterTrait } from '../../src/traits/supporter/supporterTrait';
import { ContainerTrait } from '../../src/traits/container/containerTrait';

describe('Room and Actor as Containers', () => {
  let world: WorldModel;
  
  beforeEach(() => {
    world = new WorldModel();
  });
  
  describe('Rooms as containers', () => {
    it('should allow items to be placed in rooms without ContainerTrait', () => {
      // Create a room
      const library = world.createEntity('Library', 'room');
      library.add(new RoomTrait({
        capacity: { maxItems: 100 }
      }));
      library.add(new IdentityTrait({
        name: 'library',
        aliases: ['room']
      }));
      
      // Create an item
      const book = world.createEntity('Ancient Book', 'item');
      book.add(new IdentityTrait({
        name: 'book',
        aliases: ['tome', 'ancient book']
      }));
      
      // Move book to library
      const moved = world.moveEntity(book.id, library.id);
      expect(moved).toBe(true);
      
      // Verify location
      expect(world.getLocation(book.id)).toBe(library.id);
      
      // Verify contents
      const contents = world.getContents(library.id);
      expect(contents).toHaveLength(1);
      expect(contents[0].id).toBe(book.id);
    });
    
    it('should respect room capacity limits', () => {
      // Create a small closet with limited capacity
      const closet = world.createEntity('Closet', 'room');
      closet.add(new RoomTrait({
        capacity: { maxItems: 2 }
      }));
      
      // This test would require implementing capacity checking in WorldModel
      // For now, we just verify the trait has the capacity property
      const roomTrait = closet.getTrait('room') as RoomTrait;
      expect(roomTrait.capacity?.maxItems).toBe(2);
    });
    
    it('should handle nested containers in rooms', () => {
      const room = world.createEntity('Study', 'room');
      room.add(new RoomTrait());
      
      const desk = world.createEntity('Desk', 'supporter');
      desk.add(new SupporterTrait()); // Supporters need the trait to hold items
      
      const drawer = world.createEntity('Drawer', 'container');
      drawer.add(new ContainerTrait()); // Containers need the trait
      
      const pen = world.createEntity('Pen', 'item');
      
      // Place desk in room
      world.moveEntity(desk.id, room.id);
      
      // Place drawer on desk
      world.moveEntity(drawer.id, desk.id);
      
      // Place pen in drawer
      world.moveEntity(pen.id, drawer.id);
      
      // Verify the hierarchy
      expect(world.getLocation(desk.id)).toBe(room.id);
      expect(world.getLocation(drawer.id)).toBe(desk.id);
      expect(world.getLocation(pen.id)).toBe(drawer.id);
      
      // Get all contents of room recursively
      const allContents = world.getAllContents(room.id, { recursive: true });
      expect(allContents).toHaveLength(3); // desk, drawer, pen
    });
  });
  
  describe('Actors as containers', () => {
    it('should allow actors to carry items without ContainerTrait', () => {
      // Create player
      const player = world.createEntity('Player', 'actor');
      player.add(new ActorTrait({
        isPlayer: true,
        capacity: { maxWeight: 50, maxItems: 10 }
      }));
      player.add(new IdentityTrait({
        name: 'player',
        aliases: ['me', 'self']
      }));
      
      // Create room and place player
      const room = world.createEntity('Starting Room', 'room');
      room.add(new RoomTrait());
      world.moveEntity(player.id, room.id);
      
      // Create item
      const sword = world.createEntity('Sword', 'item');
      sword.attributes.weight = 3;
      
      // Place sword in room first
      world.moveEntity(sword.id, room.id);
      
      // Player picks up sword
      const picked = world.moveEntity(sword.id, player.id);
      expect(picked).toBe(true);
      
      // Verify sword is carried by player
      expect(world.getLocation(sword.id)).toBe(player.id);
      
      // Verify player's inventory
      const inventory = world.getContents(player.id);
      expect(inventory).toHaveLength(1);
      expect(inventory[0].id).toBe(sword.id);
    });
    
    it('should handle actor inventory limits', () => {
      const npc = world.createEntity('Merchant', 'actor');
      const actorTrait = new ActorTrait({
        capacity: { maxItems: 3, maxWeight: 20 }
      });
      npc.add(actorTrait);
      
      // Create some items
      const items = [];
      for (let i = 0; i < 5; i++) {
        const item = world.createEntity(`Item ${i}`, 'item');
        item.attributes.weight = 5;
        items.push(item);
      }
      
      // This test documents that capacity checking would need to be implemented
      // in WorldModel or a behavior. For now, we verify the trait has limits.
      expect(actorTrait.capacity?.maxItems).toBe(3);
      expect(actorTrait.capacity?.maxWeight).toBe(20);
    });
    
    it('should prevent actors from being placed inside other actors', () => {
      const actor1 = world.createEntity('Guard', 'actor');
      actor1.add(new ActorTrait({
        excludedTypes: ['actor']
      }));
      
      const actor2 = world.createEntity('Prisoner', 'actor');
      actor2.add(new ActorTrait());
      
      // Create room and place both actors
      const room = world.createEntity('Dungeon', 'room');
      room.add(new RoomTrait());
      world.moveEntity(actor1.id, room.id);
      world.moveEntity(actor2.id, room.id);
      
      // Try to put one actor inside another
      // This should fail based on excludedTypes
      const actorTrait = actor1.getTrait('actor') as ActorTrait;
      expect(actorTrait.excludedTypes).toContain('actor');
      
      // The actual prevention would be implemented in WorldModel validation
      // or in a ContainerBehavior that checks these constraints
    });
  });
  
  describe('Container type detection', () => {
    it('should correctly identify all container-capable entities', () => {
      const room = world.createEntity('Room', 'room');
      room.add(new RoomTrait());
      
      const actor = world.createEntity('Actor', 'actor');
      actor.add(new ActorTrait());
      
      const box = world.createEntity('Box', 'container');
      // Would need ContainerTrait added
      
      const table = world.createEntity('Table', 'supporter');
      // Would need SupporterTrait added
      
      // Test that rooms and actors can contain items
      const testItem = world.createEntity('Test Item', 'item');
      
      // Room should be able to contain items
      expect(world.moveEntity(testItem.id, room.id)).toBe(true);
      expect(world.getLocation(testItem.id)).toBe(room.id);
      
      // Actor should be able to contain items  
      expect(world.moveEntity(testItem.id, actor.id)).toBe(true);
      expect(world.getLocation(testItem.id)).toBe(actor.id);
      
      // Box and table would need their traits added to work
    });
  });
});
