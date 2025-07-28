// debug-inscope.ts - Debug if items in containers are in scope

import { WorldModel } from '../src/world/WorldModel';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { OpenableTrait } from '../src/traits/openable/openableTrait';
import { RoomTrait } from '../src/traits/room/roomTrait';
import { ActorTrait } from '../src/traits/actor/actorTrait';

// Create world
const world = new WorldModel();

// Create room
const room = world.createEntity('Room', 'room');
room.add(new RoomTrait());
room.add(new ContainerTrait());

// Create player
const player = world.createEntity('Player', 'actor');
player.add(new ActorTrait());
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

console.log('=== Setup ===');
console.log('Player in room:', world.getLocation(player.id) === room.id);
console.log('Cabinet in room:', world.getLocation(cabinet.id) === room.id);
console.log('Medicine in cabinet:', world.getLocation(medicine.id) === cabinet.id);

// Check what getContents returns
console.log('\n=== getContents ===');
const roomContents = world.getContents(room.id);
console.log('Room contents:', roomContents.map(e => e.name));

const cabinetContents = world.getContents(cabinet.id);
console.log('Cabinet contents:', cabinetContents.map(e => e.name));

// Check getAllContents
console.log('\n=== getAllContents (recursive) ===');
const allRoomContents = world.getAllContents(room.id, { recursive: true });
console.log('All room contents:', allRoomContents.map(e => e.name));

// Check getInScope
console.log('\n=== getInScope ===');
const inScope = world.getInScope(player.id);
console.log('In scope count:', inScope.length);
console.log('In scope:', inScope.map(e => ({ id: e.id, name: e.name })));

// Look for medicine specifically
const medicineInScope = inScope.find(e => e.id === medicine.id);
console.log('Medicine in scope?', !!medicineInScope);

// Check containing room
console.log('\n=== Containing Room ===');
console.log('Player room:', world.getContainingRoom(player.id)?.name);
console.log('Cabinet room:', world.getContainingRoom(cabinet.id)?.name);
console.log('Medicine room:', world.getContainingRoom(medicine.id)?.name);
