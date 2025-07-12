// Debug the wearable container issue
const { WorldModel } = require('./packages/world-model/dist/world/WorldModel');
const { TraitType } = require('./packages/world-model/dist/traits/trait-types');
const { WearableTrait } = require('./packages/world-model/dist/traits/wearable/wearableTrait');

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

// Setup initial containment
world.moveEntity(player.id, room.id);
world.moveEntity(coat.id, room.id);
world.moveEntity(pocket.id, coat.id);
world.moveEntity(wallet.id, pocket.id);

console.log('=== Initial Setup ===');
console.log('Player location:', world.getLocation(player.id));
console.log('Coat location:', world.getLocation(coat.id));
console.log('Pocket location:', world.getLocation(pocket.id));
console.log('Wallet location:', world.getLocation(wallet.id));

console.log('\n=== Moving coat to player ===');
world.moveEntity(coat.id, player.id);

console.log('Coat location after move:', world.getLocation(coat.id));
console.log('Pocket location after move:', world.getLocation(pocket.id));
console.log('Wallet location after move:', world.getLocation(wallet.id));

console.log('\n=== Direct contents of player ===');
const directContents = world.getContents(player.id, { includeWorn: true });
console.log('Direct contents:', directContents.map(e => `${e.id} (${e.attributes.displayName})`));

console.log('\n=== Direct contents of coat ===');
const coatContents = world.getContents(coat.id);
console.log('Coat contents:', coatContents.map(e => `${e.id} (${e.attributes.displayName})`));

console.log('\n=== All contents of player (recursive, includeWorn: true) ===');
const allContents = world.getAllContents(player.id, { recursive: true, includeWorn: true });
console.log('All contents:', allContents.map(e => `${e.id} (${e.attributes.displayName})`));

// Let's manually trace through getAllContents
console.log('\n=== Manual trace of getAllContents ===');
const visited = new Set();
const result = [];

function traverse(id, depth = 0) {
  console.log('  '.repeat(depth) + `Traversing ${id}`);
  if (visited.has(id)) {
    console.log('  '.repeat(depth) + '  Already visited');
    return;
  }
  visited.add(id);
  
  const contents = world.getContents(id, { includeWorn: true });
  console.log('  '.repeat(depth) + `  Found ${contents.length} items:`, contents.map(e => e.id));
  result.push(...contents);
  
  contents.forEach(item => traverse(item.id, depth + 1));
}

traverse(player.id);
console.log('Final result:', result.map(e => `${e.id} (${e.attributes.displayName})`));
