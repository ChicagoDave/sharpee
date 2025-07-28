// Simple visibility debug test
import { WorldModel } from '../src/world/WorldModel';
import { TraitType } from '../src/traits/trait-types';
import { RoomTrait } from '../src/traits/room/roomTrait';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { IdentityTrait } from '../src/traits/identity/identityTrait';
import { ActorTrait } from '../src/traits/actor/actorTrait';

const world = new WorldModel();

// Create room manually
const room = world.createEntity('test-room', 'Test Room');
room.add(new RoomTrait());
room.add(new ContainerTrait());
room.add(new IdentityTrait());

// Create player manually
const player = world.createEntity('test-player', 'Test Player');
player.add(new ActorTrait());
player.add(new ContainerTrait());
player.add(new IdentityTrait());

// Create item
const item = world.createEntity('test-item', 'Test Item');

console.log('Created entities:');
console.log('- Room:', room.id, 'has ROOM trait:', room.hasTrait(TraitType.ROOM));
console.log('- Player:', player.id, 'has ACTOR trait:', player.hasTrait(TraitType.ACTOR));
console.log('- Item:', item.id);

// Move entities
console.log('\nMoving entities...');
world.moveEntity('test-player', 'test-room');
world.moveEntity('test-item', 'test-room');

console.log('\nLocations:');
console.log('- Player location:', world.getLocation('test-player'));
console.log('- Item location:', world.getLocation('test-item'));

console.log('\nContaining room:');
const playerRoom = world.getContainingRoom('test-player');
console.log('- Player room:', playerRoom?.id);

console.log('\nRoom contents:');
const roomContents = world.getContents('test-room');
console.log('- Count:', roomContents.length);
console.log('- IDs:', roomContents.map(e => e.id));

console.log('\nIn scope for player:');
const inScope = world.getInScope('test-player');
console.log('- Count:', inScope.length);
console.log('- IDs:', inScope.map(e => e.id));

console.log('\nVisible to player:');
const visible = world.getVisible('test-player');
console.log('- Count:', visible.length);
console.log('- IDs:', visible.map(e => e.id));

console.log('\nDirect visibility checks:');
console.log('- Player can see room:', world.canSee('test-player', 'test-room'));
console.log('- Player can see item:', world.canSee('test-player', 'test-item'));
console.log('- Player can see self:', world.canSee('test-player', 'test-player'));
