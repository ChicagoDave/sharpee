// Debug the getAllContents issue
const { WorldModel } = require('./packages/world-model/dist/world/WorldModel');
const { TraitType } = require('./packages/world-model/dist/traits/trait-types');
const { WearableTrait } = require('./packages/world-model/dist/traits/wearable/wearableTrait');

const world = new WorldModel();

// Create the same scenario as the failing test
const room = world.createEntity('Room', 'room');
const player = world.createEntity('Player', 'actor');
const coat = world.createEntity('Winter Coat', 'item');
const pocket = world.createEntity('Coat Pocket', 'container');
const wallet = world.createEntity('Wallet', 'item');

// Add wearable trait to coat
const wearableTrait = new WearableTrait();
wearableTrait.isWorn = false;
wearableTrait.wornBy = null;
coat.add(wearableTrait);

// Set up initial positions
world.moveEntity(player.id, room.id);
world.moveEntity(coat.id, room.id);
world.moveEntity(pocket.id, coat.id);
world.moveEntity(wallet.id, pocket.id);

console.log('=== Initial Setup ===');
console.log(`Player (${player.id}) in:`, world.getLocation(player.id));
console.log(`Coat (${coat.id}) in:`, world.getLocation(coat.id));
console.log(`Pocket (${pocket.id}) in:`, world.getLocation(pocket.id));
console.log(`Wallet (${wallet.id}) in:`, world.getLocation(wallet.id));

// Pick up and wear coat
world.moveEntity(coat.id, player.id);
const wearable = coat.getTrait(TraitType.WEARABLE);
wearable.isWorn = true;
wearable.wornBy = player.id;

console.log('\n=== After wearing coat ===');
console.log('Coat isWorn:', wearable.isWorn);
console.log('Coat worn:', wearable.worn);
console.log('Coat wornBy:', wearable.wornBy);
console.log(`Coat (${coat.id}) in:`, world.getLocation(coat.id));
console.log(`Pocket (${pocket.id}) in:`, world.getLocation(pocket.id));

console.log('\n=== getContents tests ===');
const playerDirect = world.getContents(player.id, { includeWorn: false });
console.log('Player contents (includeWorn: false):', playerDirect.map(e => e.id));

const playerWithWorn = world.getContents(player.id, { includeWorn: true });
console.log('Player contents (includeWorn: true):', playerWithWorn.map(e => e.id));

const coatContents = world.getContents(coat.id);
console.log('Coat contents:', coatContents.map(e => e.id));

console.log('\n=== getAllContents test ===');
const allContents = world.getAllContents(player.id, { recursive: true, includeWorn: true });
console.log('All player contents:', allContents.map(e => `${e.id} (${e.attributes.displayName})`));

// Manual debug of getAllContents logic
console.log('\n=== Manual getAllContents trace ===');
const visited = new Set();

function debugTraverse(id, depth = 0, isRoot = false) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}Traversing ${id} (isRoot: ${isRoot})`);
  
  if (visited.has(id)) {
    console.log(`${indent}  Already visited`);
    return [];
  }
  visited.add(id);
  
  const options = isRoot ? 
    { includeWorn: true } : 
    { includeWorn: true };
    
  console.log(`${indent}  Getting contents with:`, options);
  const contents = world.getContents(id, options);
  console.log(`${indent}  Found:`, contents.map(e => e.id));
  
  let result = [...contents];
  contents.forEach(item => {
    const subContents = debugTraverse(item.id, depth + 1, false);
    result.push(...subContents);
  });
  
  return result;
}

const debugResult = debugTraverse(player.id, 0, true);
console.log('\nFinal result:', debugResult.map(e => `${e.id} (${e.attributes?.displayName || 'unknown'})`));
