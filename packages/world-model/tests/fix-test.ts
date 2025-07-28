// fix-test.ts - Create a minimal reproducible test

import { WorldModel } from '../src/world/WorldModel';
import { TraitType } from '../src/traits/trait-types';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { OpenableTrait } from '../src/traits/openable/openableTrait';
import { RoomTrait } from '../src/traits/room/roomTrait';
import { IdentityTrait } from '../src/traits/identity/identityTrait';
import { ActorTrait } from '../src/traits/actor/actorTrait';

// Create world
const world = new WorldModel();

// Create room manually (not using test helpers)
const room = world.createEntity('Room', 'room');
room.add(new RoomTrait());
room.add(new ContainerTrait());

// Create player manually
const player = world.createEntity('Player', 'actor');
player.add(new ActorTrait());
player.add(new ContainerTrait());

// Create cabinet manually with explicit traits
const cabinet = world.createEntity('Cabinet', 'container');
const containerTrait = new ContainerTrait({ isTransparent: false });
cabinet.add(containerTrait);
const openableTrait = new OpenableTrait({ isOpen: false });
cabinet.add(openableTrait);

// Create medicine
const medicine = world.createEntity('Medicine', 'item');

// Set up locations
world.moveEntity(player.id, room.id);
world.moveEntity(cabinet.id, room.id);
world.moveEntity(medicine.id, cabinet.id);

console.log('=== Initial State (Cabinet Closed) ===');
console.log('Cabinet traits:', {
  hasContainer: cabinet.hasTrait(TraitType.CONTAINER),
  hasOpenable: cabinet.hasTrait(TraitType.OPENABLE),
  isTransparent: (cabinet.getTrait(TraitType.CONTAINER) as any)?.isTransparent,
  isOpen: (cabinet.getTrait(TraitType.OPENABLE) as any)?.isOpen
});

let visible = world.getVisible(player.id);
console.log('Visible entities:', visible.map(e => e.id + ' (' + e.name + ')'));
console.log('Medicine visible?', visible.some(e => e.id === medicine.id));

// Open the cabinet
console.log('\n=== Opening Cabinet ===');
const openable = cabinet.getTrait(TraitType.OPENABLE);
if (openable) {
  (openable as any).isOpen = true;
  console.log('Set isOpen to true');
}

// Verify the change
console.log('Cabinet traits after opening:', {
  hasContainer: cabinet.hasTrait(TraitType.CONTAINER),
  hasOpenable: cabinet.hasTrait(TraitType.OPENABLE),
  isTransparent: (cabinet.getTrait(TraitType.CONTAINER) as any)?.isTransparent,
  isOpen: (cabinet.getTrait(TraitType.OPENABLE) as any)?.isOpen
});

visible = world.getVisible(player.id);
console.log('\nVisible entities:', visible.map(e => e.id + ' (' + e.name + ')'));
console.log('Medicine visible?', visible.some(e => e.id === medicine.id));

// Direct visibility check
import { VisibilityBehavior } from '../src/world/VisibilityBehavior';
console.log('\n=== Direct Visibility Checks ===');
console.log('canSee(player, room):', VisibilityBehavior.canSee(player, room, world));
console.log('canSee(player, cabinet):', VisibilityBehavior.canSee(player, cabinet, world));
console.log('canSee(player, medicine):', VisibilityBehavior.canSee(player, medicine, world));

// Check if medicine is in scope
const inScope = world.getInScope(player.id);
console.log('\n=== Scope ===');
console.log('In scope:', inScope.map(e => e.id + ' (' + e.name + ')'));
console.log('Medicine in scope?', inScope.some(e => e.id === medicine.id));

// Manually trace the visibility calculation
console.log('\n=== Manual Trace ===');
console.log('Medicine location:', world.getLocation(medicine.id));
console.log('Medicine containing room:', world.getContainingRoom(medicine.id)?.id);
console.log('Player containing room:', world.getContainingRoom(player.id)?.id);

// Check isVisible
console.log('isVisible(medicine):', VisibilityBehavior.isVisible(medicine, world));
