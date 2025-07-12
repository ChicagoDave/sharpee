// Debug container move test
const { WorldModel } = require('../packages/world-model/dist/world/WorldModel');
const { createTestRoom, createTestContainer, createTestActor } = require('../packages/world-model/dist/tests/fixtures/test-entities');

const world = new WorldModel();
const room1 = createTestRoom(world, 'Room 1');
const player = createTestActor(world, 'Player'); 
const suitcase = createTestContainer(world, 'Suitcase');
const clothes = world.createEntity('Clothes', 'item');

console.log('Suitcase ID:', suitcase.id);
console.log('Clothes ID:', clothes.id);

// Setup
world.moveEntity(player.id, room1.id);
world.moveEntity(suitcase.id, room1.id);
world.moveEntity(clothes.id, suitcase.id);

console.log('\nInitial state:');
console.log('- Clothes location:', world.getLocation(clothes.id));
console.log('- Suitcase location:', world.getLocation(suitcase.id));

// Move suitcase to player
const moveResult = world.moveEntity(suitcase.id, player.id);
console.log('\nAfter moving suitcase to player:');
console.log('- Move successful?', moveResult);
console.log('- Clothes location:', world.getLocation(clothes.id));
console.log('- Suitcase location:', world.getLocation(suitcase.id));
console.log('- Player contents:', world.getContents(player.id).map(e => e.id));
console.log('- Suitcase contents:', world.getContents(suitcase.id).map(e => e.id));
