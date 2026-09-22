/**
 * dimensions.js — derive a story's LOAD-BEARING state dimensions from its
 * compiled Story IR.
 *
 * The explorer spike measured that a story's state space is a product of
 * mostly-independent dimensions (~20 independently-takeable market wares =
 * 2^20), and that breadth-first search spends its whole budget crossing
 * dimensions that never interact. This module answers the prerequisite
 * question: which dimensions can affect story behaviour at all?
 *
 * The rule is derivable rather than authored, which is the Chord payoff: an
 * entity or state named in a condition, an `on` clause, a timer or an exit
 * guard is load-bearing; one that carries only a description is not. A state
 * nothing reads cannot change what the story does, so it cannot distinguish
 * two states for testing purposes.
 *
 * Public interface: loadStoryIR(), deriveDimensions().
 * Owner context: tools/ — the explorer spike, outside the published packages.
 */

const path = require('node:path');
const fs = require('node:fs');

/**
 * Locate and parse a story's compiled IR.
 *
 * @param storyFile path to the `.story` source
 * @returns the parsed IR document
 * @throws when no `dist/<id>.ir.json` exists beside the story
 */
function loadStoryIR(storyFile) {
  const dir = path.dirname(storyFile);
  const stem = path.basename(storyFile, '.story');
  const irPath = path.join(dir, 'dist', stem + '.ir.json');
  if (!fs.existsSync(irPath)) {
    throw new Error('no compiled IR at ' + irPath + ' — build the story first');
  }
  return JSON.parse(fs.readFileSync(irPath, 'utf-8'));
}

/** The entity id a subject/object node names, when it names one. */
function entityIdOf(node) {
  return node && node.kind === 'entity' && typeof node.id === 'string' ? node.id : null;
}

/**
 * Walk any IR subtree and collect what rules READ.
 *
 * A dimension is load-bearing when some rule reads it. A rule that only
 * WRITES a state (`change`) does not make that state observable — something
 * has to test it for it to affect behaviour. The distinction is the whole
 * point: on secret-letter, matching on bare state names instead marks every
 * stall load-bearing, because "trading" and "blocked" are shared vocabulary
 * across forty entities rather than one entity's private enum.
 *
 * Measured IR shapes (secret-letter, 2026-09-22):
 *   state read   {kind:'predicate', pred:'is', subject:{kind:'entity',id},
 *                 object:{kind:'symbol', name}}
 *   story state  {kind:'story-state', state:'hunted'}
 *   placement    pred 'is-in' | 'is-here' | 'has', over entity subject/object
 *   state write  {kind:'change', entity:{kind:'entity',id}, state:'loose'}
 *
 * Soundness note: a MISSED read makes the identity unsound (two
 * behaviourally different worlds collapse to one hash), while a spurious one
 * only costs states. Unrecognized predicate kinds are therefore treated as
 * reads of both their operands rather than ignored.
 *
 * @param node any IR node
 * @param refs accumulator from {@link emptyRefs}
 */
function harvest(node, refs) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) harvest(child, refs);
    return;
  }

  if (node.kind === 'story-state') refs.storyStateRead = true;

  if (node.kind === 'predicate' && typeof node.pred === 'string') {
    const subject = entityIdOf(node.subject);
    const object = entityIdOf(node.object);
    if (node.pred === 'is') {
      // Reading an entity's state symbol.
      if (subject) refs.stateRead.add(subject);
    } else if (node.pred === 'is-in' || node.pred === 'is-here' || node.pred === 'has') {
      if (subject) refs.placementRead.add(subject);
      if (object) refs.placementRead.add(object);
    } else {
      // Unknown predicate: assume it reads everything it names.
      if (subject) { refs.stateRead.add(subject); refs.placementRead.add(subject); }
      if (object) { refs.stateRead.add(object); refs.placementRead.add(object); }
    }
  }

  if (node.kind === 'change' && entityIdOf(node.entity)) {
    refs.stateWritten.add(entityIdOf(node.entity));
  }

  for (const value of Object.values(node)) harvest(value, refs);
}

function emptyRefs() {
  return {
    stateRead: new Set(),
    placementRead: new Set(),
    stateWritten: new Set(),
    gatingDoors: new Set(),
    storyStateRead: false,
  };
}

/**
 * Derive the load-bearing dimensions of a story.
 *
 * @param ir the parsed Story IR
 * @returns a report naming every declared dimension, which are referenced,
 *   and the size of the full versus the load-bearing product
 */
function deriveDimensions(ir) {
  const refs = emptyRefs();

  harvest(ir.conditions || [], refs);
  harvest(ir.story || {}, refs);
  harvest(ir.timers || [], refs);
  harvest(ir.actions || [], refs);
  harvest(ir.startBlock || {}, refs);
  harvest(ir.chapters || [], refs);
  for (const entity of ir.entities || []) {
    harvest(entity.onClauses || [], refs);
    harvest(entity.blockedExits || [], refs);
    harvest(entity.deadlyExits || [], refs);

    // An exit declared `via <door>` is gated by that door's own openable /
    // lockable state, so the door is load-bearing even though no condition
    // names it. Found by measurement: without this, fernhill's Pantry becomes
    // unreachable — opening the pantry door did not change the identity, so
    // the opened state deduped against the closed one and `north` from the
    // Kitchen was never explored. A lost ROOM is what an unsound identity
    // looks like from the outside, which is why the walk reports room counts.
    for (const exit of entity.exits || []) {
      if (exit && typeof exit.via === 'string') {
        refs.stateRead.add(exit.via);
        refs.placementRead.add(exit.via);
        refs.gatingDoors.add(exit.via);
      }
    }
  }

  const declared = [];
  for (const entity of ir.entities || []) {
    if (!Array.isArray(entity.states) || entity.states.length < 2) continue;
    declared.push({
      id: entity.id,
      name: entity.name,
      values: entity.states.length,
      // Load-bearing ONLY when some rule reads this entity's state. Written
      // but never read is inert: nothing can branch on it.
      referenced: refs.stateRead.has(entity.id),
      writtenOnly: refs.stateWritten.has(entity.id) && !refs.stateRead.has(entity.id),
    });
  }

  const storyStates = (ir.story && ir.story.states) || [];
  const loadBearing = declared.filter((d) => d.referenced);
  const product = (rows) => rows.reduce((acc, d) => acc * d.values, 1);
  const storyFactor = refs.storyStateRead ? Math.max(storyStates.length, 1) : 1;

  return {
    entitiesTotal: (ir.entities || []).length,
    conditionsDeclared: (ir.conditions || []).length,
    storyStates: storyStates.length,
    storyStateRead: refs.storyStateRead,
    dimensionsDeclared: declared.length,
    dimensionsLoadBearing: loadBearing.length,
    placementLoadBearing: refs.placementRead.size,
    gatingDoors: [...refs.gatingDoors].sort(),
    fullProduct: product(declared) * Math.max(storyStates.length, 1),
    loadBearingProduct: product(loadBearing) * storyFactor,
    loadBearingDimensions: loadBearing,
    placementEntityIds: [...refs.placementRead].sort(),
    inertDimensions: declared.filter((d) => !d.referenced),
  };
}

module.exports = { loadStoryIR, deriveDimensions };

if (require.main === module) {
  const target = process.argv[2];
  if (!target) { console.error('usage: node tools/explorer-probe/dimensions.js <story.story>'); process.exit(2); }
  const report = deriveDimensions(loadStoryIR(path.resolve(target)));
  console.log('');
  console.log('entities in IR          ' + report.entitiesTotal);
  console.log('named conditions        ' + report.conditionsDeclared);
  console.log('story states            ' + report.storyStates);
  console.log('');
  console.log('placement load-bearing  ' + report.placementLoadBearing + ' entities');
  console.log('');
  console.log('declared dimensions     ' + report.dimensionsDeclared);
  console.log('load-bearing            ' + report.dimensionsLoadBearing);
  console.log('inert (nothing reads)   ' + report.inertDimensions.length);
  console.log('');
  console.log('full product            ' + report.fullProduct.toExponential(2));
  console.log('load-bearing product    ' + report.loadBearingProduct.toExponential(2));
  console.log('');
  console.log('inert dimensions:');
  for (const d of report.inertDimensions.slice(0, 25)) console.log('  ' + d.id + ' (' + d.values + ')');
  if (report.inertDimensions.length > 25) console.log('  ...and ' + (report.inertDimensions.length - 25) + ' more');
  console.log('');
}
