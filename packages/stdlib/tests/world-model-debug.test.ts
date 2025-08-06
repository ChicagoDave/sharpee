/**
 * Debug test to understand world model behavior
 */

import { describe, expect, it } from 'vitest';
import { WorldModel, TraitType, EntityType } from '@sharpee/world-model';

describe('World Model Debug', () => {
  it('should properly track entity locations', () => {
    const world = new WorldModel();
    
    // Create a room
    const room = world.createEntity('Test Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    
    // Create a player
    const player = world.createEntity('player', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR, isPlayer: true });
    
    // Set player as the active player
    world.setPlayer(player.id);
    
    console.log('Before move:');
    console.log('Player location:', world.getLocation(player.id));
    console.log('Room location:', world.getLocation(room.id));
    
    // Move player to room
    const moveResult = world.moveEntity(player.id, room.id);
    console.log('Move result:', moveResult);
    
    console.log('\nAfter move:');
    console.log('Player location:', world.getLocation(player.id));
    console.log('Room location:', world.getLocation(room.id));
    
    // Check contents
    const roomContents = world.getContents(room.id);
    console.log('Room contents:', roomContents.map(e => e.id));
    
    // Check if player can be found
    const allEntities = world.getAllEntities();
    console.log('All entities:', allEntities.map(e => ({
      id: e.id,
      type: e.type,
      location: world.getLocation(e.id)
    })));
    
    expect(world.getLocation(player.id)).toBe(room.id);
  });
  
  it('should track nested locations', () => {
    const world = new WorldModel();
    
    const room = world.createEntity('Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    
    const box = world.createEntity('box', EntityType.CONTAINER);
    box.add({ type: TraitType.CONTAINER, open: false });
    
    const coin = world.createEntity('coin', EntityType.OBJECT);
    
    // Move box to room
    world.moveEntity(box.id, room.id);
    // Move coin to box
    world.moveEntity(coin.id, box.id);
    
    console.log('Box location:', world.getLocation(box.id));
    console.log('Coin location:', world.getLocation(coin.id));
    console.log('Box contents:', world.getContents(box.id).map(e => e.id));
    
    expect(world.getLocation(box.id)).toBe(room.id);
    expect(world.getLocation(coin.id)).toBe(box.id);
  });
});