// Debug visibility test
import { WorldModel } from '../src/world/WorldModel';
import { createTestRoom, createTestContainer, createTestActor } from './fixtures/test-entities';

const world = new WorldModel();
const room = createTestRoom(world, 'room', 'Room');
const player = createTestActor(world, 'player', 'Player');
const cabinet = createTestContainer(world, 'cabinet', 'Cabinet');

console.log('Room:', room);
console.log('Room ID:', room.id);
console.log('Room has ROOM trait:', room.hasTrait('room'));
console.log('Player:', player);
console.log('Cabinet:', cabinet);

world.moveEntity('player', 'room');
world.moveEntity('cabinet', 'room');

console.log('\nAfter moving:');
console.log('Player location:', world.getLocation('player'));
console.log('Cabinet location:', world.getLocation('cabinet'));
console.log('Player containing room:', world.getContainingRoom('player'));

console.log('\nIn scope:');
const inScope = world.getInScope('player');
console.log('In scope count:', inScope.length);
console.log('In scope IDs:', inScope.map(e => e.id));

console.log('\nVisible:');
const visible = world.getVisible('player');
console.log('Visible count:', visible.length);
console.log('Visible IDs:', visible.map(e => e.id));

console.log('\nCan see tests:');
console.log('Can see self:', world.canSee('player', 'player'));
console.log('Can see room:', world.canSee('player', 'room'));
console.log('Can see cabinet:', world.canSee('player', 'cabinet'));
