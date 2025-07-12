// Debug test for container contents
import { WorldModel } from '../packages/world-model/src/world/WorldModel';
import { createTestRoom, createTestContainer, createTestActor } from '../packages/world-model/tests/fixtures/test-entities';

const world = new WorldModel();
const room1 = createTestRoom(world, 'Room 1');
const suitcase = createTestContainer(world, 'Suitcase');
const clothes = world.createEntity('Clothes', 'item');

console.log('=== Initial setup ===');
world.moveEntity(suitcase.id, room1.id);
world.moveEntity(clothes.id, suitcase.id);

console.log('Suitcase location:', world.getLocation(suitcase.id)); // Should be room1.id
console.log('Clothes location:', world.getLocation(clothes.id)); // Should be suitcase.id
console.log('Suitcase contents:', world.getContents(suitcase.id).map(e => e.id)); // Should include clothes

console.log('\n=== After moving suitcase ===');
world.moveEntity(suitcase.id, null); // Remove from world
console.log('Suitcase location:', world.getLocation(suitcase.id)); // Should be undefined
console.log('Clothes location:', world.getLocation(clothes.id)); // Should still be suitcase.id
console.log('Suitcase contents:', world.getContents(suitcase.id).map(e => e.id)); // Should still include clothes

console.log('\n=== Put suitcase back ===');
world.moveEntity(suitcase.id, room1.id);
console.log('Suitcase location:', world.getLocation(suitcase.id)); // Should be room1.id
console.log('Clothes location:', world.getLocation(clothes.id)); // Should still be suitcase.id
console.log('Suitcase contents:', world.getContents(suitcase.id).map(e => e.id)); // Should still include clothes
