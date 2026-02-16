/**
 * Diagnostic script: restore wt-13a save and check scope resolution
 * for "braided wire" and "hook".
 *
 * Usage: node scripts/debug-scope-13a.js
 *
 * Does NOT start the engine — only loads WorldModel + ScopeResolver.
 */

const path = require('path');
const fs = require('fs');

// Load just what we need from the bundle
const sharpee = require('../dist/cli/sharpee.js');
const { WorldModel, EntityType, StandardScopeResolver } = sharpee;

// ---- helpers ----
function label(scopeLevel) {
  const names = ['UNAWARE', 'AWARE', 'VISIBLE', 'REACHABLE', 'CARRIED'];
  return names[scopeLevel] || `UNKNOWN(${scopeLevel})`;
}

function getContainingRoom(world, entityId) {
  let current = entityId;
  let maxDepth = 10;
  while (current && maxDepth-- > 0) {
    const entity = world.getEntity(current);
    if (!entity) return null;
    if (entity.has && entity.has('room')) return entity;
    const location = world.getLocation(current);
    if (!location) return null;
    current = location;
  }
  return null;
}

function locationChain(world, entityId, depth = 0) {
  if (depth > 10) return ['... (cycle)'];
  const loc = world.getLocation(entityId);
  if (!loc) return ['(no location)'];
  const locEntity = world.getEntity(loc);
  const locName = locEntity ? (locEntity.name || loc) : loc;
  const hasRoom = locEntity && locEntity.has && locEntity.has('room');
  const chain = [`${locName} [${loc}]${hasRoom ? ' (ROOM)' : ''}`];
  if (!hasRoom && loc) {
    chain.push(...locationChain(world, loc, depth + 1));
  }
  return chain;
}

// ---- main ----
const storyPath = path.resolve(__dirname, '..', 'stories', 'dungeo');
const savePath = path.join(storyPath, 'saves', 'wt-13a.json');

if (!fs.existsSync(savePath)) {
  console.error('Save file not found:', savePath);
  process.exit(1);
}

// Create a fresh world, load save into it
const world = new WorldModel();
const worldState = fs.readFileSync(savePath, 'utf-8');
world.loadJSON(worldState);

console.log('=== wt-13a restored ===\n');

// ---- Player ----
const p = world.getPlayer();
if (!p) {
  console.error('No player found in save!');
  process.exit(1);
}
console.log('Player ID:', p.id);
console.log('Player location chain:', locationChain(world, p.id).join(' -> '));

const playerRoom = getContainingRoom(world, p.id);
console.log('Player containing room:', playerRoom ? `${playerRoom.name} [${playerRoom.id}]` : '(null!)');
console.log();

// ---- Scope resolver ----
const scopeResolver = new StandardScopeResolver(world);

// ---- Find entities of interest ----
const allEntities = world.getAllEntities();

// Find wires
const wires = allEntities.filter(e => {
  const name = (e.name || '').toLowerCase();
  const identity = e.get ? e.get('identity') : null;
  const aliases = identity && identity.aliases ? identity.aliases : [];
  return name.includes('wire') || aliases.some(a => a.toLowerCase().includes('wire'));
});

// Find hooks
const hooks = allEntities.filter(e => {
  const name = (e.name || '').toLowerCase();
  const identity = e.get ? e.get('identity') : null;
  const aliases = identity && identity.aliases ? identity.aliases : [];
  return name === 'hook' || aliases.some(a => a.toLowerCase().includes('hook'));
});

console.log('--- WIRES ---');
for (const wire of wires) {
  const identity = wire.get ? wire.get('identity') : null;
  const adjectives = identity && identity.adjectives ? identity.adjectives : [];
  const aliases = identity && identity.aliases ? identity.aliases : [];
  const scope = scopeResolver.getScope(p, wire);
  const canSee = scopeResolver.canSee(p, wire);
  const canReach = scopeResolver.canReach(p, wire);
  const minScope = wire.getMinimumScope ? wire.getMinimumScope(playerRoom ? playerRoom.id : null) : 'N/A';

  console.log(`  ${wire.name} [${wire.id}]`);
  console.log(`    adjectives: [${adjectives.join(', ')}]`);
  console.log(`    aliases:    [${aliases.join(', ')}]`);
  console.log(`    location:   ${locationChain(world, wire.id).join(' -> ')}`);
  console.log(`    scope:      ${label(scope)} (${scope})`);
  console.log(`    canSee:     ${canSee}`);
  console.log(`    canReach:   ${canReach}`);
  console.log(`    minScope:   ${minScope} (for room ${playerRoom ? playerRoom.id : 'null'})`);
  console.log();
}

console.log('--- HOOKS ---');
for (const hook of hooks) {
  const identity = hook.get ? hook.get('identity') : null;
  const adjectives = identity && identity.adjectives ? identity.adjectives : [];
  const aliases = identity && identity.aliases ? identity.aliases : [];
  const scope = scopeResolver.getScope(p, hook);
  const canSee = scopeResolver.canSee(p, hook);
  const canReach = scopeResolver.canReach(p, hook);
  const minScope = hook.getMinimumScope ? hook.getMinimumScope(playerRoom ? playerRoom.id : null) : 'N/A';
  const allMinScopes = hook.getMinimumScopes ? hook.getMinimumScopes() : {};
  const hookAttr = hook.attributes || {};

  console.log(`  ${hook.name} [${hook.id}]  (hookId: ${hookAttr.hookId || '?'})`);
  console.log(`    adjectives:   [${adjectives.join(', ')}]`);
  console.log(`    aliases:      [${aliases.join(', ')}]`);
  console.log(`    location:     ${locationChain(world, hook.id).join(' -> ')}`);
  console.log(`    scope:        ${label(scope)} (${scope})`);
  console.log(`    canSee:       ${canSee}`);
  console.log(`    canReach:     ${canReach}`);
  console.log(`    minScope:     ${minScope} (for room ${playerRoom ? playerRoom.id : 'null'})`);
  console.log(`    allMinScopes: ${JSON.stringify(allMinScopes)}`);
  console.log();
}

// ---- Balloon info ----
const balloons = allEntities.filter(e => (e.name || '').toLowerCase().includes('balloon'));
for (const balloon of balloons) {
  console.log('--- BALLOON ---');
  console.log(`  ${balloon.name} [${balloon.id}]`);
  console.log(`  location: ${locationChain(world, balloon.id).join(' -> ')}`);
  console.log(`  has vehicle: ${!!(balloon.has && balloon.has('vehicle'))}`);
  console.log(`  has room:    ${!!(balloon.has && balloon.has('room'))}`);
  console.log(`  has enterable: ${!!(balloon.has && balloon.has('enterable'))}`);
  // Check contents
  const contents = world.getContents ? world.getContents(balloon.id) : [];
  console.log(`  contents: [${contents.map(c => `${c.name}(${c.id})`).join(', ')}]`);
  console.log();
}

// ---- Summary ----
console.log('=== DIAGNOSIS ===');

const braidedWire = wires.find(w => {
  const id = w.get ? w.get('identity') : null;
  return id && id.adjectives && id.adjectives.includes('braided');
});
if (braidedWire) {
  const s = scopeResolver.getScope(p, braidedWire);
  console.log(`braided wire: scope=${label(s)} — ${s >= 3 ? 'REACHABLE (ok)' : 'PROBLEM (not reachable)'}`);
} else {
  console.log('braided wire: NOT FOUND in world');
}

for (const hook of hooks) {
  const hookAttr = hook.attributes || {};
  const s = scopeResolver.getScope(p, hook);
  console.log(`${hookAttr.hookId || hook.id}: scope=${label(s)} — ${s >= 3 ? 'REACHABLE (ok)' : 'PROBLEM (not reachable)'}`);
}
