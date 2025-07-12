// Debug script to understand why containers aren't being found
const { WorldModel } = require('./packages/world-model/dist/world/WorldModel');
const { TraitType } = require('./packages/world-model/dist/traits/trait-types');
const { SceneryTrait } = require('./packages/world-model/dist/traits/scenery/sceneryTrait');
const { OpenableTrait } = require('./packages/world-model/dist/traits/openable/openableTrait');
const { WearableTrait } = require('./packages/world-model/dist/traits/wearable/wearableTrait');

console.log('=== Test 1: Invisible Scenery Container ===');
{
  const world = new WorldModel();
  
  // Create entities
  const room = world.createEntity('Office', 'room');
  const player = world.createEntity('Player', 'actor');
  const desk = world.createEntity('Office Desk', 'supporter');
  const drawer = world.createEntity('Desk Drawer', 'container');
  
  // Add traits
  const drawerScenery = new SceneryTrait();
  drawerScenery.visible = false;
  drawer.add(drawerScenery);
  drawer.add(new OpenableTrait());
  
  // Move entities
  world.moveEntity(player.id, room.id);
  world.moveEntity(desk.id, room.id);
  world.moveEntity(drawer.id, desk.id);
  
  console.log('Drawer ID:', drawer.id);
  console.log('Drawer type:', drawer.type);
  console.log('Has CONTAINER trait:', drawer.hasTrait(TraitType.CONTAINER));
  console.log('Has SCENERY trait:', drawer.hasTrait(TraitType.SCENERY));
  console.log('Scenery visible:', drawer.getTrait(TraitType.SCENERY).visible);
  
  // Test queries
  console.log('\nAll entities:');
  world.getAllEntities().forEach(e => {
    console.log(`  ${e.id}: ${e.type} - Container: ${e.hasTrait(TraitType.CONTAINER)}, Scenery: ${e.hasTrait(TraitType.SCENERY)}`);
  });
  
  console.log('\nfindByTrait CONTAINER (no options):');
  const containers1 = world.findByTrait(TraitType.CONTAINER);
  console.log('  Found:', containers1.map(e => e.id));
  
  console.log('\nfindByTrait CONTAINER (includeInvisible: false):');
  const containers2 = world.findByTrait(TraitType.CONTAINER, { includeInvisible: false });
  console.log('  Found:', containers2.map(e => e.id));
  
  console.log('\nfindByTrait CONTAINER (includeInvisible: true):');
  const containers3 = world.findByTrait(TraitType.CONTAINER, { includeInvisible: true });
  console.log('  Found:', containers3.map(e => e.id));
  
  console.log('\nfindByTrait CONTAINER (includeScenery: true, includeInvisible: true):');
  const containers4 = world.findByTrait(TraitType.CONTAINER, { includeScenery: true, includeInvisible: true });
  console.log('  Found:', containers4.map(e => e.id));
}

console.log('\n\n=== Test 2: Wearable with Container ===');
{
  const world = new WorldModel();
  
  // Create entities
  const room = world.createEntity('Room', 'room');
  const player = world.createEntity('Player', 'actor');
  const coat = world.createEntity('Winter Coat', 'item');
  const pocket = world.createEntity('Coat Pocket', 'container');
  const wallet = world.createEntity('Wallet', 'item');
  
  // Add wearable trait to coat
  const wearableTrait = new WearableTrait();
  wearableTrait.isWorn = true;
  wearableTrait.wornBy = player.id;
  coat.add(wearableTrait);
  
  // Setup containment
  world.moveEntity(player.id, room.id);
  world.moveEntity(coat.id, player.id);
  world.moveEntity(pocket.id, coat.id);
  world.moveEntity(wallet.id, pocket.id);
  
  console.log('Coat worn:', coat.getTrait(TraitType.WEARABLE).isWorn);
  console.log('Coat location:', world.getLocation(coat.id));
  console.log('Pocket location:', world.getLocation(pocket.id));
  
  console.log('\ngetAllContents of player (includeWorn: false):');
  const contents1 = world.getAllContents(player.id, { recursive: true, includeWorn: false });
  console.log('  Found:', contents1.map(e => `${e.id} (${e.type})`));
  
  console.log('\ngetAllContents of player (includeWorn: true):');
  const contents2 = world.getAllContents(player.id, { recursive: true, includeWorn: true });
  console.log('  Found:', contents2.map(e => `${e.id} (${e.type})`));
}
