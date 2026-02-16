/**
 * Diagnostic script: parse wt-13a save JSON and check scope-relevant
 * data for "braided wire" and "hook" entities.
 *
 * Reads the serialized world state directly (no engine needed) and
 * applies the same logic as StandardScopeResolver.
 *
 * Usage: node scripts/debug-scope.js
 */

const fs = require('fs');
const path = require('path');

const savePath = path.resolve(__dirname, '..', 'stories/dungeo/saves/wt-13a.json');
if (!fs.existsSync(savePath)) {
  console.error('Save file not found:', savePath);
  process.exit(1);
}

const save = JSON.parse(fs.readFileSync(savePath, 'utf-8'));

// ── Build lookup structures from save format ────────────────────

// Entity map: id → entity data (inner .entity object)
const entityMap = new Map();
for (const entry of save.entities) {
  entityMap.set(entry.id, entry.entity);
}

// Spatial index: childToParent map (child → parent)
const childToParent = new Map();
const spatialEntries = save.spatialIndex?.childToParent || [];
for (const [child, parent] of spatialEntries) {
  childToParent.set(child, parent);
}

// ── Helpers ─────────────────────────────────────────────────────

function getEntity(id) { return entityMap.get(id); }
function getLocation(id) { return childToParent.get(id) || null; }

function getTrait(e, type) {
  return e.traits?.find(t => t.type === type) || null;
}

function getName(e) {
  const identity = getTrait(e, 'identity');
  return identity?.name || e.attributes?.name || e.id;
}

function getAliases(e) {
  return getTrait(e, 'identity')?.aliases || [];
}

function getAdjectives(e) {
  return getTrait(e, 'identity')?.adjectives || [];
}

function isConcealed(e) {
  return getTrait(e, 'identity')?.concealed === true;
}

function isRoom(e) { return !!getTrait(e, 'room'); }
function hasVehicle(e) { return !!getTrait(e, 'vehicle'); }
function hasContainer(e) { return !!getTrait(e, 'container'); }

function getContainingRoom(entityId) {
  let current = entityId;
  let depth = 0;
  while (current && depth < 10) {
    const ent = getEntity(current);
    if (!ent) return null;
    if (isRoom(ent)) return ent;
    current = getLocation(current);
    depth++;
  }
  return null;
}

function getMinimumScopes(e) {
  return e.minimumScopes || {};
}

function getMinimumScope(e, roomId) {
  const scopes = getMinimumScopes(e);
  if (roomId && scopes[roomId] !== undefined) return scopes[roomId];
  if (scopes['*'] !== undefined) return scopes['*'];
  return 0;
}

const SCOPE_NAMES = { 0: 'UNAWARE', 1: 'AWARE', 2: 'VISIBLE', 3: 'REACHABLE', 4: 'CARRIED' };
function scopeName(level) { return SCOPE_NAMES[level] || String(level); }

// ── Find entities by name/alias ─────────────────────────────────

function findByNameOrAlias(searchTerm) {
  const term = searchTerm.toLowerCase();
  const results = [];
  for (const [id, e] of entityMap) {
    if (isRoom(e)) continue;
    const name = getName(e).toLowerCase();
    if (name === term) { results.push(e); continue; }
    const aliases = getAliases(e);
    if (aliases.some(a => a.toLowerCase() === term)) { results.push(e); }
  }
  return results;
}

// ── Simulate scope resolution ───────────────────────────────────

function simulateScope(actorId, targetId) {
  const actor = getEntity(actorId);
  const target = getEntity(targetId);
  if (!actor || !target) return { physical: 0, minimum: 0, final: 0 };

  let physical = 0;

  // Check carried (target's parent is actor)
  const targetLoc = getLocation(targetId);
  if (targetLoc === actorId) {
    physical = 4; // CARRIED
  } else {
    const actorRoom = getContainingRoom(actorId);
    const targetRoom = getContainingRoom(targetId);
    if (actorRoom && targetRoom && actorRoom.id === targetRoom.id) {
      physical = 3; // REACHABLE (simplified)
    }
  }

  // Minimum scope
  const actorRoom = getContainingRoom(actorId);
  const minimum = getMinimumScope(target, actorRoom?.id ?? null);

  return {
    physical,
    minimum,
    final: Math.max(physical, minimum)
  };
}

// ── 1. Player info ──────────────────────────────────────────────

const playerId = save.playerId;
const playerEntity = getEntity(playerId);
if (!playerEntity) {
  console.error('Player entity not found! playerId:', playerId);
  process.exit(1);
}

const playerLoc = getLocation(playerId);
const playerLocEnt = getEntity(playerLoc);

console.log('=== PLAYER LOCATION ===');
console.log('  Player ID:', playerId);
console.log('  Direct location:', playerLoc, '→', playerLocEnt ? getName(playerLocEnt) : '??');
if (playerLocEnt) {
  console.log('    [room=%s, vehicle=%s, container=%s]',
    isRoom(playerLocEnt), hasVehicle(playerLocEnt), hasContainer(playerLocEnt));
}

// Walk containment chain
let cur = playerLoc;
let d = 0;
const chain = [];
while (cur && d < 10) {
  const ent = getEntity(cur);
  if (!ent) break;
  chain.push(`${cur} (${getName(ent)}) [room=${isRoom(ent)}]`);
  if (isRoom(ent)) break;
  cur = getLocation(cur);
  d++;
}
console.log('  Containment chain:', chain.join(' → '));

const actorRoom = getContainingRoom(playerId);
console.log('  Containing room:', actorRoom?.id, '→', actorRoom ? getName(actorRoom) : '??');
console.log();

// ── 2. Braided wire ─────────────────────────────────────────────

console.log('=== BRAIDED WIRE ===');
const wires = findByNameOrAlias('braided wire');
if (wires.length === 0) {
  console.log('  No "braided wire" found by name/alias.');
  const allWires = findByNameOrAlias('wire');
  console.log('  "wire" matches:', allWires.map(w => `${w.id} (${getName(w)})`).join(', ') || 'none');
} else {
  for (const wire of wires) {
    const wireLoc = getLocation(wire.id);
    const wireLocEnt = getEntity(wireLoc);
    const wireRoom = getContainingRoom(wire.id);
    const scope = simulateScope(playerId, wire.id);

    console.log('  Entity ID:', wire.id);
    console.log('  Name:', getName(wire));
    console.log('  Adjectives:', getAdjectives(wire));
    console.log('  Aliases:', getAliases(wire));
    console.log('  Concealed:', isConcealed(wire));
    console.log('  Direct location:', wireLoc, '→', wireLocEnt ? getName(wireLocEnt) : '??');
    console.log('  Containing room:', wireRoom?.id, '→', wireRoom ? getName(wireRoom) : '??');
    console.log('  minimumScopes:', JSON.stringify(getMinimumScopes(wire)));
    console.log('  Scope from player:',
      `physical=${scope.physical}(${scopeName(scope.physical)})`,
      `minimum=${scope.minimum}(${scopeName(scope.minimum)})`,
      `final=${scope.final}(${scopeName(scope.final)})`);
    console.log();
  }
}

// ── 3. Hooks ────────────────────────────────────────────────────

console.log('=== HOOKS ===');
const hooks = findByNameOrAlias('hook');
if (hooks.length === 0) {
  console.log('  No hooks found!');
} else {
  for (const hook of hooks) {
    const hookLoc = getLocation(hook.id);
    const hookLocEnt = getEntity(hookLoc);
    const hookRoom = getContainingRoom(hook.id);
    const scope = simulateScope(playerId, hook.id);

    console.log('  Entity ID:', hook.id);
    console.log('  Name:', getName(hook));
    console.log('  Adjectives:', getAdjectives(hook));
    console.log('  Aliases:', getAliases(hook));
    console.log('  Concealed:', isConcealed(hook));
    console.log('  hookId attr:', hook.attributes?.hookId);
    console.log('  Direct location:', hookLoc, '→', hookLocEnt ? getName(hookLocEnt) : '??');
    console.log('  Containing room:', hookRoom?.id, '→', hookRoom ? getName(hookRoom) : '??');
    console.log('  minimumScopes:', JSON.stringify(getMinimumScopes(hook)));
    console.log('  minimumScope for actor room ("%s"):', actorRoom?.id || 'null',
      getMinimumScope(hook, actorRoom?.id ?? null));
    console.log('  Scope from player:',
      `physical=${scope.physical}(${scopeName(scope.physical)})`,
      `minimum=${scope.minimum}(${scopeName(scope.minimum)})`,
      `final=${scope.final}(${scopeName(scope.final)})`);
    console.log();
  }
}

// ── 4. Shiny wire (for comparison) ──────────────────────────────

console.log('=== SHINY WIRE (for comparison) ===');
const shinyWires = findByNameOrAlias('shiny wire');
if (shinyWires.length === 0) {
  const allWireLike = [];
  for (const [id, e] of entityMap) {
    if (getName(e).toLowerCase().includes('wire') && !isRoom(e)) {
      allWireLike.push(e);
    }
  }
  console.log('  No "shiny wire" found. All wire-like:', allWireLike.map(w => `${w.id} (${getName(w)})`).join(', '));
} else {
  for (const wire of shinyWires) {
    const scope = simulateScope(playerId, wire.id);
    console.log('  Entity ID:', wire.id, '| Name:', getName(wire),
      '| Adj:', getAdjectives(wire),
      '| Loc:', getLocation(wire.id),
      '| Scope:', `${scope.final}(${scopeName(scope.final)})`);
  }
}
console.log();

// ── 5. Balloon info ─────────────────────────────────────────────

console.log('=== BALLOON ===');
const balloons = findByNameOrAlias('balloon');
for (const b of balloons) {
  const vt = getTrait(b, 'vehicle');
  const bLoc = getLocation(b.id);
  const bLocEnt = getEntity(bLoc);
  console.log('  Entity ID:', b.id);
  console.log('  Location:', bLoc, '→', bLocEnt ? getName(bLocEnt) : '??');
  console.log('  Vehicle trait:', vt ? { currentPosition: vt.currentPosition, isOperational: vt.isOperational } : 'none');
  console.log('  positionRooms:', vt?.positionRooms || {});
}
console.log();

// ── 6. Summary / diagnosis ──────────────────────────────────────

console.log('=== DIAGNOSIS ===');
const wire1 = wires?.[0];
const hook1 = hooks?.find(h => h.attributes?.hookId === 'hook1');
const hook2 = hooks?.find(h => h.attributes?.hookId === 'hook2');

if (wire1) {
  const s = simulateScope(playerId, wire1.id);
  const ok = s.final >= 2;
  console.log(`  braided wire: final scope ${s.final} (${scopeName(s.final)}) → ${ok ? 'RESOLVABLE' : 'NOT RESOLVABLE'}`);
} else {
  console.log('  braided wire: NOT FOUND');
}

if (hook1) {
  const s = simulateScope(playerId, hook1.id);
  const ok = s.final >= 2;
  console.log(`  hook1: final scope ${s.final} (${scopeName(s.final)}) → ${ok ? 'RESOLVABLE' : 'NOT RESOLVABLE'}`);
  if (!ok) {
    console.log(`    hook1 minimumScopes: ${JSON.stringify(getMinimumScopes(hook1))}`);
    console.log(`    actor containing room: ${actorRoom?.id} (${actorRoom ? getName(actorRoom) : '??'})`);
    console.log(`    MISMATCH: hook1 needs room key "${Object.keys(getMinimumScopes(hook1)).join(',')}" but actor is in "${actorRoom?.id}"`);
  }
}

if (hook2) {
  const s = simulateScope(playerId, hook2.id);
  const ok = s.final >= 2;
  console.log(`  hook2: final scope ${s.final} (${scopeName(s.final)}) → ${ok ? 'RESOLVABLE' : 'NOT RESOLVABLE'}`);
}
