// Fixed container-state-visibility.test.ts - Properly set up test

import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { VisibilityBehavior } from '../../../src/world/VisibilityBehavior';

describe('Container State Change Visibility', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity; 
  let cabinet: IFEntity;
  let medicine: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    
    // Create room
    room = world.createEntity('Test Room', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());
    
    // Create player
    player = world.createEntity('Player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    
    // Create cabinet - opaque container that starts OPEN so we can put things in it
    cabinet = world.createEntity('Cabinet', 'container');
    cabinet.add(new ContainerTrait({ isTransparent: false }));
    cabinet.add(new OpenableTrait({ isOpen: true })); // Start open!
    
    // Create medicine
    medicine = world.createEntity('Medicine', 'item');
    
    // Set up locations
    world.moveEntity(player.id, room.id);
    world.moveEntity(cabinet.id, room.id);
    world.moveEntity(medicine.id, cabinet.id); // This will work now
    
    // NOW close the cabinet for the tests
    const openableTrait = cabinet.getTrait(TraitType.OPENABLE) as OpenableTrait;
    (openableTrait as any).isOpen = false;
  });

  it('should not see medicine when cabinet is closed', () => {
    const visible = world.getVisible(player.id);
    
    expect(visible).toContainEqual(room);
    expect(visible).toContainEqual(cabinet);
    expect(visible).not.toContainEqual(medicine);
  });

  it('should see medicine when cabinet is open', () => {
    // Open the cabinet
    const openableTrait = cabinet.getTrait(TraitType.OPENABLE) as OpenableTrait;
    (openableTrait as any).isOpen = true;
    
    const visible = world.getVisible(player.id);
    
    expect(visible).toContainEqual(room);
    expect(visible).toContainEqual(cabinet);
    expect(visible).toContainEqual(medicine);
  });

  it('should handle multiple state changes', () => {
    const openableTrait = cabinet.getTrait(TraitType.OPENABLE) as OpenableTrait;
    
    // Initially closed
    let visible = world.getVisible(player.id);
    expect(visible).not.toContainEqual(medicine);
    
    // Open
    (openableTrait as any).isOpen = true;
    visible = world.getVisible(player.id);
    expect(visible).toContainEqual(medicine);
    
    // Close again
    (openableTrait as any).isOpen = false;
    visible = world.getVisible(player.id);
    expect(visible).not.toContainEqual(medicine);
  });

  it('should verify canSee works correctly', () => {
    const openableTrait = cabinet.getTrait(TraitType.OPENABLE) as OpenableTrait;
    
    // Closed
    expect(VisibilityBehavior.canSee(player, medicine, world)).toBe(false);
    
    // Open
    (openableTrait as any).isOpen = true;
    expect(VisibilityBehavior.canSee(player, medicine, world)).toBe(true);
  });

  it('should verify medicine is in scope regardless of cabinet state', () => {
    const openableTrait = cabinet.getTrait(TraitType.OPENABLE) as OpenableTrait;
    
    // Check scope when closed
    let inScope = world.getInScope(player.id);
    expect(inScope).toContainEqual(room);
    expect(inScope).toContainEqual(cabinet);
    expect(inScope).toContainEqual(medicine); // Should be in scope even when cabinet is closed
    
    // Open and check again
    (openableTrait as any).isOpen = true;
    inScope = world.getInScope(player.id);
    expect(inScope).toContainEqual(medicine);
  });
});
