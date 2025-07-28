// Minimal visibility test
import { WorldModel } from '../src/world/WorldModel';
import { RoomTrait } from '../src/traits/room/roomTrait';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { ActorTrait } from '../src/traits/actor/actorTrait';

describe('Minimal Visibility Test', () => {
  it('should see items in the same room', () => {
    const world = new WorldModel();
    
    // Create room
    const room = world.createEntity('Test Room', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());
    
    // Create player
    const player = world.createEntity('Player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    
    // Create item
    const item = world.createEntity('Item', 'item');
    
    // Place entities
    world.moveEntity(player.id, room.id);
    world.moveEntity(item.id, room.id);
    
    // Check visibility
    const visible = world.getVisible(player.id);
    console.log('Visible entities:', visible.map(e => e.id));
    
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.some(e => e.id === room.id)).toBe(true);
    expect(visible.some(e => e.id === item.id)).toBe(true);
  });
});
