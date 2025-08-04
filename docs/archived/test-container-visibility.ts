// test-container-visibility.ts - Minimal test to debug container visibility

import { WorldModel } from '../src/world/WorldModel';
import { TraitType } from '../src/traits/trait-types';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { OpenableTrait } from '../src/traits/openable/openableTrait';
import { RoomTrait } from '../src/traits/room/roomTrait';

// Create world
const world = new WorldModel();

// Create room
const room = world.createEntity('Test Room', 'room');
room.add(new RoomTrait());
room.add(new ContainerTrait());

// Create player
const player = world.createEntity('Player', 'actor');
player.add(new ContainerTrait());

// Create cabinet  
const cabinet = world.createEntity('Cabinet', 'container');
cabinet.add(new ContainerTrait({ isTransparent: false }));
const openableTrait = new OpenableTrait({ isOpen: false });
cabinet.add(openableTrait);

// Create medicine
const medicine = world.createEntity('Medicine', 'item');

// Set up locations
world.moveEntity(player.id, room.id);
world.moveEntity(cabinet.id, room.id);
world.moveEntity(medicine.id, cabinet.id);

console.log('=== Initial State ===');
console.log('Cabinet open?', openableTrait.isOpen);
console.log('Medicine location:', world.getLocation(medicine.id));

// Check visibility when closed
let visible = world.getVisible(player.id);
console.log('\n=== Closed Cabinet ===');
console.log('Visible entities:', visible.map(e => `${e.id} (${e.name})`));
console.log('Medicine visible?', visible.includes(medicine));

// Open cabinet by directly modifying trait
(cabinet.getTrait(TraitType.OPENABLE) as any).isOpen = true;

// Check visibility when open
visible = world.getVisible(player.id);
console.log('\n=== Open Cabinet ===');
console.log('Cabinet open?', (cabinet.getTrait(TraitType.OPENABLE) as any).isOpen);
console.log('Visible entities:', visible.map(e => `${e.id} (${e.name})`));
console.log('Medicine visible?', visible.includes(medicine));

// Let's also check the visibility methods directly
import { VisibilityBehavior } from '../src/world/VisibilityBehavior';
console.log('\n=== Direct Visibility Checks ===');
console.log('Can see cabinet?', VisibilityBehavior.canSee(player, cabinet, world));
console.log('Can see medicine?', VisibilityBehavior.canSee(player, medicine, world));
console.log('Is medicine visible?', VisibilityBehavior.isVisible(medicine, world));
