// test-getallcontents.ts - Test if getAllContents works correctly

import { WorldModel } from '../src/world/WorldModel';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { RoomTrait } from '../src/traits/room/roomTrait';

const world = new WorldModel();

// Create a simple hierarchy
const room = world.createEntity('Room', 'room');
room.add(new RoomTrait());
room.add(new ContainerTrait());

const box = world.createEntity('Box', 'container');
box.add(new ContainerTrait());

const item = world.createEntity('Item', 'item');

// Setup
world.moveEntity(box.id, room.id);
world.moveEntity(item.id, box.id);

console.log('=== Setup ===');
console.log('Box in room:', world.getLocation(box.id) === room.id);
console.log('Item in box:', world.getLocation(item.id) === box.id);

// Test getAllContents
console.log('\n=== getAllContents of room (recursive: false) ===');
const nonRecursive = world.getAllContents(room.id, { recursive: false });
console.log('Contents:', nonRecursive.map(e => e.name));
console.log('Should be: [Box]');

console.log('\n=== getAllContents of room (recursive: true) ===');
const recursive = world.getAllContents(room.id, { recursive: true });
console.log('Contents:', recursive.map(e => e.name));
console.log('Should be: [Box, Item]');

// Test with deeper nesting
const innerBox = world.createEntity('Inner Box', 'container');
innerBox.add(new ContainerTrait());
const deepItem = world.createEntity('Deep Item', 'item');

world.moveEntity(innerBox.id, box.id);
world.moveEntity(deepItem.id, innerBox.id);

console.log('\n=== Deeper nesting ===');
console.log('Inner box in box:', world.getLocation(innerBox.id) === box.id);
console.log('Deep item in inner box:', world.getLocation(deepItem.id) === innerBox.id);

console.log('\n=== getAllContents of room (recursive: true, deeper) ===');
const deepRecursive = world.getAllContents(room.id, { recursive: true });
console.log('Contents:', deepRecursive.map(e => e.name));
console.log('Should be: [Box, Item, Inner Box, Deep Item]');
