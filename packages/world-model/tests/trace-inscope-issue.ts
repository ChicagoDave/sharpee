// trace-inscope-issue.ts - Trace why medicine is not in scope

import { WorldModel } from '../src/world/WorldModel';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { OpenableTrait } from '../src/traits/openable/openableTrait';
import { RoomTrait } from '../src/traits/room/roomTrait';
import { ActorTrait } from '../src/traits/actor/actorTrait';

// Create world
const world = new WorldModel();

// Create entities
const room = world.createEntity('Room', 'room');
room.add(new RoomTrait());
room.add(new ContainerTrait());

const player = world.createEntity('Player', 'actor');
player.add(new ActorTrait());
player.add(new ContainerTrait());

const cabinet = world.createEntity('Cabinet', 'container');
cabinet.add(new ContainerTrait({ isTransparent: false }));
cabinet.add(new OpenableTrait({ isOpen: false }));

const medicine = world.createEntity('Medicine', 'item');

// Set up locations
world.moveEntity(player.id, room.id);
world.moveEntity(cabinet.id, room.id);
world.moveEntity(medicine.id, cabinet.id);

console.log('=== Entity IDs ===');
console.log('Room ID:', room.id);
console.log('Player ID:', player.id);
console.log('Cabinet ID:', cabinet.id);
console.log('Medicine ID:', medicine.id);

console.log('\n=== Locations ===');
console.log('Player location:', world.getLocation(player.id));
console.log('Cabinet location:', world.getLocation(cabinet.id));
console.log('Medicine location:', world.getLocation(medicine.id));

// Test getContents at each level
console.log('\n=== getContents (non-recursive) ===');
const roomContents = world.getContents(room.id);
console.log('Room contents:', roomContents.map(e => ({ id: e.id, name: e.name })));

const cabinetContents = world.getContents(cabinet.id);
console.log('Cabinet contents:', cabinetContents.map(e => ({ id: e.id, name: e.name })));

// Test getAllContents
console.log('\n=== getAllContents (recursive) ===');
const allRoomContents = world.getAllContents(room.id, { recursive: true });
console.log('All room contents:', allRoomContents.map(e => ({ id: e.id, name: e.name })));

// Now test getInScope
console.log('\n=== getInScope ===');
const inScope = world.getInScope(player.id);
console.log('In scope:', inScope.map(e => ({ id: e.id, name: e.name })));

// Check if medicine is specifically in the results
console.log('\n=== Medicine checks ===');
console.log('Medicine in room contents?', roomContents.some(e => e.id === medicine.id));
console.log('Medicine in cabinet contents?', cabinetContents.some(e => e.id === medicine.id));
console.log('Medicine in all room contents?', allRoomContents.some(e => e.id === medicine.id));
console.log('Medicine in scope?', inScope.some(e => e.id === medicine.id));

// Let's manually trace getAllContents
console.log('\n=== Manual trace of getAllContents ===');
console.log('Getting all contents of room recursively...');

// Access the private spatial index through the world methods
console.log('Room children:', world.getContents(room.id).map(e => e.id));
console.log('Cabinet children:', world.getContents(cabinet.id).map(e => e.id));

// Check spatial index directly
import { SpatialIndex } from '../src/world/SpatialIndex';
console.log('\n=== Spatial Index Check ===');
// We can't access private members, but we can verify through public methods
console.log('Medicine parent (should be cabinet):', world.getLocation(medicine.id));
console.log('Cabinet parent (should be room):', world.getLocation(cabinet.id));
console.log('Player parent (should be room):', world.getLocation(player.id));
