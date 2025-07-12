// Debug script to understand the test failures
const { WorldModel } = require('./packages/world-model/dist/world/WorldModel');
const { AuthorModel } = require('./packages/world-model/dist/world/AuthorModel');
const { TraitType } = require('./packages/world-model/dist/traits/trait-types');
const { OpenableTrait } = require('./packages/world-model/dist/traits/openable/openableTrait');
const { SceneryTrait } = require('./packages/world-model/dist/traits/scenery/sceneryTrait');

const world = new WorldModel();
const author = new AuthorModel(world.getDataStore(), world);

// Create entities from failing test
const room = world.createEntity('Office', 'room');
const player = world.createEntity('Player', 'actor');
const desk = world.createEntity('Office Desk', 'supporter');
const drawer = world.createEntity('Desk Drawer', 'container');

// Add traits
desk.add(new SceneryTrait());
drawer.add(new OpenableTrait());
const drawerScenery = new SceneryTrait();
drawerScenery.visible = false;  // Set visible to false
drawer.add(drawerScenery);

// Move entities
world.moveEntity(player.id, room.id);
world.moveEntity(desk.id, room.id);
world.moveEntity(drawer.id, desk.id);

// Test queries
console.log('\n=== Debug Info ===');
console.log('Drawer ID:', drawer.id);
console.log('Drawer has CONTAINER trait:', drawer.hasTrait(TraitType.CONTAINER));
console.log('Drawer has SCENERY trait:', drawer.hasTrait(TraitType.SCENERY));
console.log('Drawer scenery visible:', drawer.getTrait(TraitType.SCENERY).visible);

console.log('\n=== Find by trait tests ===');
const visibleContainers = world.findByTrait(TraitType.CONTAINER, { includeInvisible: false });
console.log('Visible containers:', visibleContainers.map(e => e.id));

const allContainers = world.findByTrait(TraitType.CONTAINER, { includeInvisible: true });
console.log('All containers (includeInvisible: true):', allContainers.map(e => e.id));

console.log('\n=== All entities ===');
world.getAllEntities().forEach(e => {
  console.log(`${e.id}: ${e.attributes.displayName} (${e.type})`);
  if (e.hasTrait(TraitType.CONTAINER)) console.log('  - Has CONTAINER trait');
  if (e.hasTrait(TraitType.SCENERY)) console.log('  - Has SCENERY trait, visible:', e.getTrait(TraitType.SCENERY).visible);
});
