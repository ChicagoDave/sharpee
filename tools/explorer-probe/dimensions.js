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
    requiredInstruments: new Set(),
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

  // Required instruments: resolve the NAME a trait config gives to the entity
  // it refers to, and make that entity's placement load-bearing.
  const idByName = new Map();
  for (const entity of ir.entities || []) {
    if (typeof entity.name === 'string') idByName.set(entity.name.toLowerCase(), entity.id);
    idByName.set(String(entity.id).replace(/-/g, ' ').toLowerCase(), entity.id);
  }
  for (const entity of ir.entities || []) {
    for (const trait of entity.traits || []) {
      for (const cfg of trait.config || []) {
        if (!cfg || cfg.valueKind !== 'name' || typeof cfg.value !== 'string') continue;
        const resolved = idByName.get(cfg.value.toLowerCase());
        if (resolved) {
          refs.placementRead.add(resolved);
          refs.requiredInstruments.add(resolved);
        }
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
    requiredInstruments: [...refs.requiredInstruments].sort(),
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

/**
 * Derive the story's own declared command vocabulary from its IR.
 *
 * The trait-implied verbs (open, take, push) cover the platform's standard
 * actions, but a story's endings routinely depend on verbs and conversation
 * the story itself declares. fernhill's winning walkthrough needs
 * `prune vine` (a declared `pruning` action) and `ask tobias about the folly`
 * (a declared topic) — neither is derivable from traits, and without them the
 * walk reaches every room and no ending.
 *
 * Measured IR shapes (fernhill, 2026-09-22):
 *   action   {name, patterns:[{parts:[{kind:'word',word}|{kind:'slot',word}]}],
 *             constraints:[{slot, requirement:'reachable'}]}
 *   topic    entity.topics[] with filter {kind:'entity',id}
 *                            or filter {kind:'text',primary,aliases[]}
 *
 * Only single-slot action patterns are emitted; multi-slot patterns would
 * cross the vocabulary with itself, which is the combinatorial blow-up this
 * whole spike exists to avoid.
 *
 * @param ir the parsed Story IR
 * @returns {{actions: Array, topics: Object}} templates and per-NPC topics
 */
function deriveCommandVocabulary(ir) {
  const actions = [];
  for (const action of ir.actions || []) {
    for (const pattern of action.patterns || []) {
      const parts = pattern.parts || [];
      if (parts.filter((p) => p && p.kind === 'slot').length !== 1) continue;
      actions.push({ name: action.name, parts });
    }
  }

  const topics = {};
  for (const entity of ir.entities || []) {
    if (!Array.isArray(entity.topics) || entity.topics.length === 0) continue;
    const list = [];
    for (const topic of entity.topics) {
      const filter = topic && topic.filter;
      if (!filter) continue;
      if (filter.kind === 'entity' && typeof filter.id === 'string') {
        list.push({ kind: 'entity', id: filter.id });
      } else if (filter.kind === 'text' && typeof filter.primary === 'string') {
        list.push({ kind: 'text', text: filter.primary });
      }
    }
    if (list.length) topics[entity.id] = list;
  }

  // An entity's `on <action>` clauses name the actions it responds to — the
  // story's own affordance declaration, which trait inference cannot see.
  const entityActions = {};
  const openWith = {};
  for (const entity of ir.entities || []) {
    const names = new Set();
    for (const clause of entity.onClauses || []) {
      if (clause && typeof clause.action === 'string') names.add(clause.action);
    }
    if (names.size) entityActions[entity.id] = [...names];

    // A trait config that NAMES an entity declares a required instrument:
    // `openable "silver locket"`, `cuttable "garden shears"`. The story is
    // stating the tool the action needs, and the tool must be carried — so
    // its placement is load-bearing even though no condition reads it.
    // Without this, fernhill reaches the Folly and only ever dies to the
    // fuse: holding the shears hashed the same as not holding them.
    for (const trait of entity.traits || []) {
      if (!trait || !Array.isArray(trait.config)) continue;
      for (const cfg of trait.config) {
        if (cfg && cfg.valueKind === 'name' && typeof cfg.value === 'string') {
          (openWith[entity.id] || (openWith[entity.id] = []))
            .push({ trait: trait.name, instrument: cfg.value });
        }
      }
    }
  }

  return { actions, topics, entityActions, openWith };
}

module.exports.deriveCommandVocabulary = deriveCommandVocabulary;

/**
 * Map a Chord action name to a surface command template.
 *
 * An entity's `onClauses[].action` is the story stating, directly, which
 * action that entity responds to — a better affordance signal than trait
 * inference, because an entity can respond to an action without carrying the
 * trait that would imply it. fernhill's stopcock is declared only `scenery`
 * yet carries `on turning`, so no trait-derived verb can ever reach it, and
 * `turn stopcock` is on the winning path.
 *
 * Verbs come from `@sharpee/lang-en-us`, which owns every user-facing word
 * (each action exports `{actionId, patterns:['turn [something]', ...]}`).
 * Deriving "turn" from "turning" by string surgery would be guesswork the
 * language layer already answers.
 *
 * @returns Map from Chord action name (e.g. 'turning') to a template whose
 *   `[something]` slot takes an entity name
 */
function actionVerbTemplates(langModule) {
  const byAction = new Map();
  for (const value of Object.values(langModule || {})) {
    if (!value || typeof value !== 'object') continue;
    const { actionId, patterns } = value;
    if (typeof actionId !== 'string' || !Array.isArray(patterns)) continue;
    const pattern = patterns.find((p) => typeof p === 'string' && p.includes('[something]'));
    if (!pattern) continue;
    // 'if.action.turning' -> 'turning', the name Chord's onClauses use.
    const chordName = actionId.split('.').pop();
    if (chordName && !byAction.has(chordName)) byAction.set(chordName, pattern);
  }
  return byAction;
}

module.exports.actionVerbTemplates = actionVerbTemplates;
