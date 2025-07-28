// debug-container-vis.ts - Debug container visibility issue

import { WorldModel } from '../src/world/WorldModel';
import { TraitType } from '../src/traits/trait-types';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { OpenableTrait } from '../src/traits/openable/openableTrait';
import { RoomTrait } from '../src/traits/room/roomTrait';
import { VisibilityBehavior } from '../src/world/VisibilityBehavior';

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
cabinet.add(new OpenableTrait({ isOpen: false }));

// Create medicine
const medicine = world.createEntity('Medicine', 'item');

// Set up locations
world.moveEntity(player.id, room.id);
world.moveEntity(cabinet.id, room.id);
world.moveEntity(medicine.id, cabinet.id);

console.log('=== Setup Complete ===');
console.log('Player in room:', world.getLocation(player.id) === room.id);
console.log('Cabinet in room:', world.getLocation(cabinet.id) === room.id);
console.log('Medicine in cabinet:', world.getLocation(medicine.id) === cabinet.id);

// Check initial visibility
console.log('\n=== Closed Cabinet ===');
const openableTrait = cabinet.getTrait(TraitType.OPENABLE) as any;
console.log('Cabinet isOpen:', openableTrait.isOpen);

let visible = world.getVisible(player.id);
console.log('Visible count:', visible.length);
console.log('Visible:', visible.map(e => e.name));
console.log('Contains medicine?', visible.includes(medicine));

// Debug hasLineOfSight
console.log('\n=== Debug hasLineOfSight (closed) ===');
const canSeeMedicine = VisibilityBehavior.canSee(player, medicine, world);
console.log('canSee medicine:', canSeeMedicine);

// Open cabinet
console.log('\n=== Opening Cabinet ===');
openableTrait.isOpen = true;
console.log('Cabinet isOpen after change:', openableTrait.isOpen);

// Check visibility again
visible = world.getVisible(player.id);
console.log('\n=== Open Cabinet ===');
console.log('Visible count:', visible.length);
console.log('Visible:', visible.map(e => e.name));
console.log('Contains medicine?', visible.includes(medicine));

// Debug again
console.log('\n=== Debug hasLineOfSight (open) ===');
const canSeeMedicineOpen = VisibilityBehavior.canSee(player, medicine, world);
console.log('canSee medicine:', canSeeMedicineOpen);

// Check if medicine is in scope
console.log('\n=== Scope Check ===');
const inScope = world.getInScope(player.id);
console.log('In scope count:', inScope.length);
console.log('In scope:', inScope.map(e => e.name));
console.log('Medicine in scope?', inScope.includes(medicine));
