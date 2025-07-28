// test-debug-container.ts - Detailed debug of container visibility

import { WorldModel } from '../src/world/WorldModel';
import { TraitType } from '../src/traits/trait-types';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { OpenableTrait } from '../src/traits/openable/openableTrait';
import { RoomTrait } from '../src/traits/room/roomTrait';
import { IdentityTrait } from '../src/traits/identity/identityTrait';
import { createTestRoom, createTestContainer, createTestActor } from './fixtures/test-entities';

// Create world
const world = new WorldModel();

// Use the test factories like the failing test does
const room = createTestRoom(world, 'Room');
const player = createTestActor(world, 'Player');

const cabinet = createTestContainer(world, 'Cabinet');
const openableTrait = new OpenableTrait();
(openableTrait as any).isOpen = false;
cabinet.add(openableTrait);

const medicine = world.createEntity('Medicine', 'item');

world.moveEntity(player.id, room.id);
world.moveEntity(cabinet.id, room.id);
world.moveEntity(medicine.id, cabinet.id);

console.log('=== Container Traits ===');
const containerTrait = cabinet.getTrait(TraitType.CONTAINER) as any;
console.log('Cabinet has container trait:', !!containerTrait);
console.log('Container isTransparent:', containerTrait?.isTransparent);
console.log('Cabinet has openable trait:', cabinet.hasTrait(TraitType.OPENABLE));
const cabOpenable = cabinet.getTrait(TraitType.OPENABLE) as any;
console.log('Openable isOpen:', cabOpenable?.isOpen);

console.log('\n=== Initial Visibility (closed) ===');
let visible = world.getVisible(player.id);
console.log('Visible entities:', visible.map(e => ({ id: e.id, name: e.name })));
console.log('Medicine visible?', visible.includes(medicine));

// Open the cabinet
console.log('\n=== Opening Cabinet ===');
(cabinet.getTrait(TraitType.OPENABLE) as any).isOpen = true;

// Check the trait after modification
const openableAfter = cabinet.getTrait(TraitType.OPENABLE) as any;
console.log('Openable isOpen after change:', openableAfter?.isOpen);

console.log('\n=== Visibility after opening ===');
visible = world.getVisible(player.id);
console.log('Visible entities:', visible.map(e => ({ id: e.id, name: e.name })));
console.log('Medicine visible?', visible.includes(medicine));

// Let's trace through the visibility calculation
import { VisibilityBehavior } from '../src/world/VisibilityBehavior';

console.log('\n=== Detailed Visibility Check ===');
console.log('Can player see cabinet?', VisibilityBehavior.canSee(player, cabinet, world));
console.log('Can player see medicine?', VisibilityBehavior.canSee(player, medicine, world));

// Check if medicine is in scope
console.log('\n=== Scope Check ===');
const inScope = world.getInScope(player.id);
console.log('Entities in scope:', inScope.map(e => ({ id: e.id, name: e.name })));
console.log('Medicine in scope?', inScope.some(e => e.id === medicine.id));

// Check containment path
console.log('\n=== Containment Path ===');
console.log('Medicine location:', world.getLocation(medicine.id));
console.log('Cabinet location:', world.getLocation(cabinet.id));
console.log('Player location:', world.getLocation(player.id));
console.log('Medicine room:', world.getContainingRoom(medicine.id)?.name);
