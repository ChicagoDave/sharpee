// get-in-scope.test.ts - Unit tests for getInScope method

import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';

describe('WorldModel.getInScope', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    
    // Create basic room
    room = world.createEntity('Test Room', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());
    
    // Create player
    player = world.createEntity('Player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    
    // Place player in room
    world.moveEntity(player.id, room.id);
  });

  it('should include the room the observer is in', () => {
    const inScope = world.getInScope(player.id);
    expect(inScope).toContainEqual(room);
  });

  it('should include items in the same room', () => {
    const item = world.createEntity('Item', 'item');
    world.moveEntity(item.id, room.id);
    
    const inScope = world.getInScope(player.id);
    expect(inScope).toContainEqual(item);
  });

  it('should include items in containers in the room', () => {
    const box = world.createEntity('Box', 'container');
    box.add(new ContainerTrait());
    const item = world.createEntity('Item', 'item');
    
    world.moveEntity(box.id, room.id);
    world.moveEntity(item.id, box.id);
    
    const inScope = world.getInScope(player.id);
    expect(inScope).toContainEqual(box);
    expect(inScope).toContainEqual(item);
  });

  it('should include deeply nested items', () => {
    const outerBox = world.createEntity('Outer Box', 'container');
    outerBox.add(new ContainerTrait());
    const innerBox = world.createEntity('Inner Box', 'container');
    innerBox.add(new ContainerTrait());
    const item = world.createEntity('Item', 'item');
    
    world.moveEntity(outerBox.id, room.id);
    world.moveEntity(innerBox.id, outerBox.id);
    world.moveEntity(item.id, innerBox.id);
    
    const inScope = world.getInScope(player.id);
    expect(inScope).toContainEqual(outerBox);
    expect(inScope).toContainEqual(innerBox);
    expect(inScope).toContainEqual(item);
  });

  it('should include items carried by the observer', () => {
    const item = world.createEntity('Carried Item', 'item');
    world.moveEntity(item.id, player.id);
    
    const inScope = world.getInScope(player.id);
    expect(inScope).toContainEqual(item);
  });

  it('should include items in containers carried by the observer', () => {
    const bag = world.createEntity('Bag', 'container');
    bag.add(new ContainerTrait());
    const item = world.createEntity('Item in Bag', 'item');
    
    world.moveEntity(bag.id, player.id);
    world.moveEntity(item.id, bag.id);
    
    const inScope = world.getInScope(player.id);
    expect(inScope).toContainEqual(bag);
    expect(inScope).toContainEqual(item);
  });

  it('should include the observer itself', () => {
    const inScope = world.getInScope(player.id);
    expect(inScope).toContainEqual(player);
  });

  it('should handle empty room', () => {
    const inScope = world.getInScope(player.id);
    expect(inScope).toContainEqual(room);
    expect(inScope).toContainEqual(player);
    expect(inScope.length).toBe(2); // Just room and player
  });

  it('should return empty array if observer not in a room', () => {
    const floatingEntity = world.createEntity('Floating', 'actor');
    const inScope = world.getInScope(floatingEntity.id);
    expect(inScope).toEqual([]);
  });

  it('should handle unique entities (no duplicates)', () => {
    const item = world.createEntity('Item', 'item');
    world.moveEntity(item.id, room.id);
    
    const inScope = world.getInScope(player.id);
    const itemCount = inScope.filter(e => e.id === item.id).length;
    expect(itemCount).toBe(1);
  });
});
