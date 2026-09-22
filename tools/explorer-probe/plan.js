/**
 * plan.js — answer "is this ending reachable, and how" by PLANNING over the
 * story's declared causality, instead of enumerating played states.
 *
 * Why this exists: the breadth-first walker in `explore.js` executed 715,903
 * commands over 900 seconds on fernhill and never found a 29-command winning
 * path that is written down in the repository. BFS reaches depth 29 only after
 * enumerating everything shallower, at a branching factor of 5-10. Ending
 * reachability is not a search-budget problem; enumeration is the wrong
 * algorithm for it.
 *
 * What makes planning possible here is that Chord's causality is DECLARATIVE
 * and sits in the compiled IR (Sharpee's standard actions are not — `validate`
 * is arbitrary TypeScript — so their effects come from a hand-written table
 * below, which is platform semantics and stable across stories):
 *
 *   machines[]              state + trigger action -> target state, with
 *                           `onEnter` effects. fernhill's boiler puzzle IS a
 *                           STRIPS operator chain already.
 *   entity.onClauses[]      `on <action> when <condition>` -> body effects;
 *                           a `refuse` body is a PRECONDITION, negated.
 *   entity.topics[]         `ask <actor> about <topic>` -> body effects.
 *   actions[]               story-declared verbs (`prune <target>`).
 *   the `win` / `lose` statement and its enclosing condition = the GOAL.
 *
 * SOUNDNESS: this is a model of the engine, and ADR-293 D12 deliberately
 * rejected modelling the engine ("search executes the real engine"). Nothing
 * here claims otherwise. A plan is a HYPOTHESIS: `--verify` replays it through
 * the real engine, and only an executed plan proves anything. A plan the
 * engine refuses is itself a finding — model and engine disagree, and one of
 * them is wrong.
 *
 * Public interface: CLI — `node tools/explorer-probe/plan.js <story> [--verify]`.
 * Owner context: tools/ — the explorer spike, outside the published packages.
 */

const path = require('node:path');
const { loadStoryIR, deriveDimensions } = require('./dimensions.js');

const REPO = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// The abstract state
// ---------------------------------------------------------------------------

/**
 * A planning state is a small record of only what preconditions read: where
 * the player is, what they hold, what is open, each entity's declared state,
 * each machine's state, and the story state. It is orders of magnitude smaller
 * than the engine's world snapshot, which is the entire point.
 */
function stateKey(s) {
  return [
    s.at,
    [...s.has].sort().join(','),
    [...s.open].sort().join(','),
    [...s.est.entries()].sort().map(([k, v]) => k + '=' + v).join(','),
    [...s.machine.entries()].sort().map(([k, v]) => k + '=' + v).join(','),
    s.story || '',
  ].join('|');
}

function cloneState(s) {
  return {
    at: s.at,
    has: new Set(s.has),
    open: new Set(s.open),
    est: new Map(s.est),
    machine: new Map(s.machine),
    story: s.story,
    where: new Map(s.where),
  };
}

// ---------------------------------------------------------------------------
// Condition evaluation over the abstract state
// ---------------------------------------------------------------------------

/**
 * Evaluate an IR condition tree against a planning state.
 *
 * Unknown node kinds evaluate to `true` rather than `false`: an unmodelled
 * guard must not make a genuinely reachable ending look unreachable. The cost
 * is a plan the engine may refuse, which `--verify` catches and reports.
 *
 * @param c condition node, or null (always true)
 * @param s the planning state
 * @returns whether the condition holds
 */
function holds(c, s, self) {
  if (!c) return true;
  switch (c.kind) {
    case 'and': return (c.operands || []).every((o) => holds(o, s, self));
    case 'or': return (c.operands || []).some((o) => holds(o, s, self));
    case 'not': return !holds(c.operand, s, self);
    case 'story-state': return s.story === c.state;
    case 'predicate': {
      const subj = c.subject || {};
      const obj = c.object || {};
      let value;
      if (c.pred === 'is') {
        // `<entity> is <symbol>` — a declared-state test. `it` is the entity
        // the clause is bound to (trait clauses are written against `it`).
        const id = subj.kind === 'it' ? self : (subj.kind === 'entity' ? subj.id : null);
        value = id != null && s.est.get(id) === obj.name;
      } else if (c.pred === 'has' || c.pred === 'holds') {
        // `the player must hold the garden shears` — the precondition that
        // makes an instrument load-bearing, stated outright.
        value = subj.kind === 'player' && obj.kind === 'entity' && s.has.has(obj.id);
      } else if (c.pred === 'is-in' || c.pred === 'is-here') {
        if (subj.kind === 'player') value = obj.kind === 'entity' && s.at === obj.id;
        else if (subj.kind === 'entity') value = s.has.has(subj.id) || s.where.get(subj.id) === s.at;
        else if (subj.kind === 'it') value = self != null && (s.has.has(self) || s.where.get(self) === s.at);
        else value = true;
      } else {
        return true;
      }
      return c.negated ? !value : value;
    }
    default: return true;
  }
}

/**
 * Apply a rule body's state effects to a planning state, in place.
 *
 * @param body the rule body
 * @param s    the planning state
 * @param self the entity the clause is bound to — what `{kind:'it'}` means.
 *             Trait clauses are written against `it` (`change it to fruiting`)
 *             because one definition serves every entity carrying the trait.
 */
function applyBody(body, s, self) {
  for (const st of body || []) {
    if (!st) continue;
    if (st.kind === 'change') {
      const target = st.entity || {};
      if (target.kind === 'story') s.story = st.state;
      else if (target.kind === 'it' && self) s.est.set(self, st.state);
      else if (target.kind === 'entity') s.est.set(target.id, st.state);
    } else if (st.kind === 'move' && st.entity) {
      // `move the silver locket to the Greenhouse` names its destination;
      // without a named place, the player's room is the only destination the
      // abstract state can represent.
      const id = st.entity.kind === 'it' ? self : st.entity.id;
      const place = st.place || {};
      const dest = place.kind === 'entity' ? place.id
        : place.kind === 'player' ? null
        : s.at;
      if (!id) continue;
      if (dest === null) { s.has.add(id); s.where.delete(id); }
      else s.where.set(id, dest);
    } else if (st.kind === 'select-on') {
      // `select on its state` — dispatch on the bound entity's declared
      // state, running only the matching arm.
      const current = s.est.get(self);
      const arm = (st.arms || []).find((a) => a && a.value === current);
      if (arm) applyBody(arm.body, s, self);
    }
  }
}

/**
 * Does this body refuse the action in this state? A refusal is a
 * precondition, negated.
 *
 * `refuse-when` carries its OWN condition, separate from the clause's — the
 * boiler refuses `switching_on` only while it is cold or filled, and is
 * switchable once primed. Treating every refusal as unconditional makes the
 * action permanently unavailable, which is what silently broke the boiler
 * chain and with it every plan to the winning ending.
 *
 * @param body the rule body
 * @param s    the planning state the refusal is evaluated against
 */
function refuses(body, s, self) {
  return (body || []).some((st) => {
    if (!st) return false;
    if (st.kind === 'refuse') return true;
    if (st.kind === 'refuse-when') return holds(st.condition, s, self);
    // `the player must hold the garden shears` — a must is a precondition
    // that refuses when unmet. This is where fernhill states the shears
    // requirement outright, rather than leaving it to be inferred.
    if (st.kind === 'must') return !holds(st.condition, s, self);
    return false;
  });
}

/** Does this body win? */
function winsWith(body) {
  return (body || []).find((st) => st && st.kind === 'win');
}

// ---------------------------------------------------------------------------
// Building the operator set from the IR
// ---------------------------------------------------------------------------

/**
 * Standard-action effects the platform owns. Chord declares none of these —
 * `validate`/`execute` are TypeScript — so they are stated once here. This is
 * the hand-written half of the model, and it is story-independent.
 */
const STANDARD = {
  taking: (s, e) => { s.has.add(e); s.where.delete(e); },
  dropping: (s, e) => { s.has.delete(e); s.where.set(e, s.at); },
  opening: (s, e) => { s.open.add(e); },
  closing: (s, e) => { s.open.delete(e); },
  unlocking: (s, e) => { s.open.add(e); },
};

/**
 * Compile the IR into a model the searcher can expand.
 *
 * @param ir the parsed Story IR
 * @returns {{rooms, entities, clauses, machines, topics, actions, goal}}
 */
function compile(ir) {
  const entities = new Map();
  for (const e of ir.entities || []) entities.set(e.id, e);

  // Where each entity starts. The IR puts this on the entity itself as
  // `placement: {relation:'in'|'on'|'starts-in', place:<id>}` — NOT as a
  // `containing` list on the room, which only holds region membership.
  const initialWhere = new Map();
  for (const e of ir.entities || []) {
    const p = e.placement;
    if (p && typeof p.place === 'string') initialWhere.set(e.id, p.place);
  }
  // An object placed ON another object (the key on the doormat) is reachable
  // wherever that object is; flatten one level so `present` finds it.
  for (const [id, place] of [...initialWhere]) {
    const host = initialWhere.get(place);
    if (host) initialWhere.set(id, host);
  }

  // Every `on <action>` clause, indexed by the entity it is attached to.
  const clauses = [];
  for (const e of ir.entities || []) {
    for (const oc of e.onClauses || []) {
      if (typeof oc.action !== 'string') continue;
      clauses.push({ entity: e.id, action: oc.action, condition: oc.condition, body: oc.body || [] });
    }
  }

  // Topic bodies: `ask <actor> about <topic>` carries effects of its own.
  const topics = [];
  for (const e of ir.entities || []) {
    for (const t of e.topics || []) {
      const f = t.filter || {};
      const label = f.kind === 'text' ? f.primary : (entities.get(f.id) || {}).name;
      if (!label) continue;
      topics.push({ actor: e.id, label, body: t.body || [] });
    }
  }

  const machines = (ir.machines || []).map((m) => {
    const roles = new Map((m.roles || []).map((r) => [r.name, r.entity]));
    return { name: m.name, initial: m.initialState, roles, states: m.states || [] };
  });

  // The goal: the clause carrying a `win`, and the condition guarding it.
  let goal = null;
  for (const c of clauses) {
    const win = winsWith(c.body);
    if (win) goal = { entity: c.entity, action: c.action, condition: c.condition, key: win.phraseKey };
  }

  // The FIFTH causal surface: `define trait X / on the player <action>`.
  // One definition serves every entity carrying the trait, so its clauses are
  // written against `it`. fernhill puts the vine's ripening, the shears
  // requirement and the locket grant here, and a model that reads only
  // entity.onClauses cannot reach the ending at all.
  const traitClauses = new Map();
  for (const t of ir.traits || []) {
    const list = [];
    for (const oc of t.onClauses || []) {
      if (typeof oc.action === 'string') list.push(oc);
    }
    if (list.length) traitClauses.set(t.name, list);
  }
  const traitsOf = new Map();
  for (const e of ir.entities || []) {
    traitsOf.set(e.id, (e.traits || []).map((t) => t.name));
  }

  const dims = deriveDimensions(ir);
  const carryable = new Set(dims.placementEntityIds);

  return { ir, entities, initialWhere, clauses, topics, machines, goal,
           carryable, traitClauses, traitsOf, actions: ir.actions || [] };
}

// ---------------------------------------------------------------------------
// Expansion
// ---------------------------------------------------------------------------

/**
 * Every command applicable in a planning state, with the successor it yields.
 *
 * @param model the compiled model
 * @param s     the planning state
 * @returns array of {command, next}
 */
function successors(model, s) {
  const out = [];
  const roomEntity = model.entities.get(s.at);

  /** Run every clause that fires for `action` on `entity`; null = refused. */
  const fire = (next, action, entity) => {
    for (const c of model.clauses) {
      if (c.entity !== entity || c.action !== action) continue;
      if (!holds(c.condition, next, entity)) continue;
      if (refuses(c.body, next, entity)) return null;
      applyBody(c.body, next, entity);
    }
    for (const traitName of model.traitsOf.get(entity) || []) {
      for (const oc of model.traitClauses.get(traitName) || []) {
        if (oc.action !== action) continue;
        if (!holds(oc.condition, next, entity)) continue;
        if (refuses(oc.body, next, entity)) return null;
        applyBody(oc.body, next, entity);
      }
    }
    // Machine transitions triggered by this action on this entity.
    for (const m of model.machines) {
      const cur = next.machine.get(m.name);
      const state = m.states.find((x) => x.name === cur);
      for (const t of (state && state.transitions) || []) {
        const trig = t.trigger || {};
        if (trig.kind !== 'action' || trig.action !== action) continue;
        let target = trig.target;
        if (typeof target === 'string' && target.startsWith('$')) {
          target = m.roles.get(target.slice(1));
        }
        if (target !== entity) continue;
        if (!holds(t.condition, next)) continue;
        next.machine.set(m.name, t.target);
        const entered = m.states.find((x) => x.name === t.target);
        applyBody((entered && entered.onEnter) || [], next, null);
      }
    }
    return next;
  };

  const propose = (command, mutate) => {
    const next = cloneState(s);
    const result = mutate(next);
    if (result === null) return;
    out.push({ command, next });
  };

  // Movement, including a door that gates the exit.
  for (const exit of (roomEntity && roomEntity.exits) || []) {
    if (exit.via && !s.open.has(exit.via)) continue;
    propose(String(exit.direction).toLowerCase(), (n) => {
      n.at = exit.to;
      return fire(n, 'entering', exit.to);
    });
  }

  // Things present: in the room, or held — plus any door this room's exits
  // name with `via`. Such a door has NO placement and often no traits at all
  // (fernhill's `folly-door` is both): it exists only as an exit reference,
  // so a model built from placement alone never sees it, never opens it, and
  // silently loses every room behind it. Same shape as the Pantry finding on
  // the executed walk.
  const present = [];
  for (const [id, where] of s.where) if (where === s.at) present.push(id);
  for (const id of s.has) present.push(id);
  for (const exit of (roomEntity && roomEntity.exits) || []) {
    if (exit.via && !present.includes(exit.via)) {
      present.push(exit.via);
      if (!s.open.has(exit.via)) {
        const door = model.entities.get(exit.via);
        const dname = (door && door.name) || exit.via;
        propose('open ' + dname, (n) => {
          n.open.add(exit.via);
          return fire(n, 'opening', exit.via);
        });
      }
    }
  }

  for (const id of present) {
    const e = model.entities.get(id);
    if (!e) continue;
    const name = e.name || id;
    const traits = new Set((e.traits || []).map((t) => t.name));
    const held = s.has.has(id);

    // Only load-bearing objects are worth carrying. Taking everything
    // reintroduces the inventory powerset that made the executed walk
    // hopeless (measured here: 446,818 abstract states without this bound).
    // The significance set is the same one `dimensions.js` derives — required
    // instruments, entities whose placement some rule reads, and the goal's
    // own object.
    if (!held && !traits.has('scenery') && model.carryable.has(id)) {
      propose('take ' + name, (n) => { STANDARD.taking(n, id); return fire(n, 'taking', id); });
    }
    if (traits.has('openable') && !s.open.has(id)) {
      const cfg = (e.traits || []).find((t) => t.name === 'openable');
      const key = ((cfg && cfg.config) || []).find((c) => c.valueKind === 'name');
      if (key) {
        propose('open ' + name + ' with ' + key.value, (n) => {
          STANDARD.opening(n, id); return fire(n, 'opening', id);
        });
      } else {
        propose('open ' + name, (n) => { STANDARD.opening(n, id); return fire(n, 'opening', id); });
      }
    }
    if (traits.has('cuttable')) {
      const cfg = (e.traits || []).find((t) => t.name === 'cuttable');
      const key = ((cfg && cfg.config) || []).find((c) => c.valueKind === 'name');
      const suffix = key ? ' with ' + key.value : '';
      propose('cut ' + name + suffix, (n) => fire(n, 'cutting', id));
    }

    // Any action some clause or machine transition names for this entity.
    const verbs = new Set();
    for (const c of model.clauses) if (c.entity === id) verbs.add(c.action);
    for (const traitName of model.traitsOf.get(id) || []) {
      for (const oc of model.traitClauses.get(traitName) || []) verbs.add(oc.action);
    }
    for (const m of model.machines) {
      for (const st of m.states) {
        for (const t of st.transitions || []) {
          const trig = t.trigger || {};
          let target = trig.target;
          if (typeof target === 'string' && target.startsWith('$')) target = m.roles.get(target.slice(1));
          if (target === id && trig.action) verbs.add(trig.action);
        }
      }
    }
    for (const action of verbs) {
      const surface = VERB_SURFACE[action];
      if (!surface) continue;
      propose(surface.replace('%s', name), (n) => fire(n, action, id));
    }

    // Story-declared verbs (`prune <target>`).
    for (const a of model.actions) {
      for (const p of a.patterns || []) {
        const parts = p.parts || [];
        if (parts.filter((x) => x.kind === 'slot').length !== 1) continue;
        const cmd = parts.map((x) => (x.kind === 'word' ? x.word : name)).join(' ');
        propose(cmd, (n) => fire(n, a.name, id));
      }
    }

    // Conversation, and giving a held item to an actor present.
    for (const t of model.topics) {
      if (t.actor !== id) continue;
      propose('ask ' + name + ' about ' + t.label, (n) => {
        applyBody(t.body, n, id);
        return fire(n, 'asking', id);
      });
    }
    for (const carried of s.has) {
      const c = model.entities.get(carried);
      if (!c || carried === id) continue;
      if (!(e.kinds || []).some((k) => k.name === 'person') && !traits.has('proper')) continue;
      propose('give ' + (c.name || carried) + ' to ' + name, (n) => {
        n.has.delete(carried);
        return fire(n, 'giving', id);
      });
    }
  }

  return out;
}

/** Surface forms for actions the model triggers directly. */
const VERB_SURFACE = {
  turning: 'turn %s',
  pushing: 'push %s',
  pulling: 'pull %s',
  switching_on: 'switch on %s',
  switching_off: 'switch off %s',
  reading: 'read %s',
  asking: 'ask %s about it',
  taking: 'take %s',
  opening: 'open %s',
  cutting: 'cut %s',
  giving: 'give it to %s',
  pruning: 'prune %s',
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Shortest-path distance from every room to `target`, over the exit graph,
 * ignoring door gates. Used only to order the search, never to prune, so
 * treating a locked door as passable is safe: it can make the heuristic
 * optimistic, which is exactly what a search heuristic should be.
 *
 * @param model  the compiled model
 * @param target the goal room id
 * @returns Map from room id to hop count
 */
function roomDistances(model, target) {
  const dist = new Map();
  if (!target) return dist;
  const back = new Map();
  for (const e of model.ir.entities || []) {
    for (const x of e.exits || []) {
      if (!back.has(x.to)) back.set(x.to, []);
      back.get(x.to).push(e.id);
    }
  }
  dist.set(target, 0);
  let layer = [target];
  while (layer.length) {
    const next = [];
    for (const room of layer) {
      for (const prev of back.get(room) || []) {
        if (dist.has(prev)) continue;
        dist.set(prev, dist.get(room) + 1);
        next.push(prev);
      }
    }
    layer = next;
  }
  return dist;
}

/**
 * Goal-directed best-first search over the ABSTRACT state.
 *
 * Breadth-first is adequate here for the reason it was hopeless in
 * `explore.js`: the abstract state has a handful of dimensions rather than a
 * world snapshot, so the space is thousands of states rather than 10^12.
 *
 * @param model the compiled model
 * @param limit maximum states to expand
 * @returns {{found, plan, expanded, seen}}
 */
function plan(model, limit = 200000) {
  const start = {
    at: null,
    has: new Set(),
    open: new Set(),
    est: new Map(),
    machine: new Map(model.machines.map((m) => [m.name, m.initial])),
    story: ((model.ir.story || {}).states || [])[0],
    where: new Map(model.initialWhere),
  };
  for (const e of model.ir.entities || []) {
    if (Array.isArray(e.startsStates) && e.startsStates.length) {
      start.est.set(e.id, e.startsStates[0]);
    } else if (Array.isArray(e.states) && e.states.length) {
      start.est.set(e.id, e.states[0]);
    }
    if (e.isPlayable) {
      start.at = start.where.get(e.id) || start.at;
      start.where.delete(e.id);
      // `carries` is a list of entity ids, as plain strings.
      for (const c of e.carries || []) {
        if (typeof c === 'string') start.has.add(c);
        else if (c && c.id) start.has.add(c.id);
      }
    }
  }
  if (!start.at) {
    const firstRoom = (model.ir.entities || []).find((e) => (e.kinds || []).some((k) => k.name === 'room'));
    start.at = firstRoom && firstRoom.id;
  }

  const goal = model.goal;
  const seen = new Set([stateKey(start)]);
  let expanded = 0;

  // Goal-directed ordering. Blind breadth-first reaches every causal link on
  // fernhill and then runs out of budget walking the deed back out of the
  // folly — the model is complete and the SEARCH ORDER is what fails. The
  // heuristic is deliberately cheap and admissible-ish: how many of the
  // goal's own conditions are unmet, plus room-graph distance to the goal
  // room. It never prunes, so nothing becomes unreachable; it only decides
  // what to look at first.
  const dist = roomDistances(model, goal && goal.entity);
  const score = (s) => (holds(goal && goal.condition, s) ? 0 : 50)
    + (dist.get(s.at) ?? 99);

  /** A tiny binary heap keyed on `score` — a sort per pop is the bottleneck. */
  const open = [{ s: start, path: [], f: score(start) }];
  const pop = () => {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const node = open[best];
    open[best] = open[open.length - 1];
    open.pop();
    return node;
  };

  while (open.length && expanded < limit) {
    {
      const node = pop();
      expanded++;
      for (const { command, next: ns } of successors(model, node.s)) {
        // Goal: the winning clause's action happened on its entity with its
        // condition satisfied. Movement into the goal room is the common case.
        if (goal && ns.at === goal.entity && holds(goal.condition, ns)) {
          return { found: true, plan: [...node.path, command], expanded, seen: seen.size };
        }
        const k = stateKey(ns);
        if (seen.has(k)) continue;
        seen.add(k);
        open.push({ s: ns, path: [...node.path, command], f: score(ns) });
      }
    }
  }
  return { found: false, plan: null, expanded, seen: seen.size };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function verifyPlan(storyPath, commands) {
  const { loadAuthorGame } = require(path.join(REPO, 'packages/devkit/dist/standalone/author-game.js'));
  const game = await loadAuthorGame(storyPath, { seed: 42 });
  await game.executeCommand('look');
  for (const c of commands) {
    await game.executeCommand(c);
  }
  return game.world.storyEnding || null;
}

async function main() {
  const args = process.argv.slice(2);
  const storyPath = path.resolve(args.find((a) => !a.startsWith('--')) || '');
  const doVerify = args.includes('--verify');
  if (!storyPath) {
    console.error('usage: node tools/explorer-probe/plan.js <story.story> [--verify]');
    process.exit(2);
  }

  const model = compile(loadStoryIR(storyPath));
  console.log('');
  console.log('goal              ' + (model.goal ? model.goal.key + '  (' + model.goal.action + ' ' + model.goal.entity + ')' : 'NONE FOUND'));
  console.log('clauses           ' + model.clauses.length);
  console.log('machines          ' + model.machines.length);
  console.log('topics            ' + model.topics.length);
  console.log('declared actions  ' + model.actions.length);

  const t0 = Date.now();
  const result = plan(model);
  const ms = Date.now() - t0;
  console.log('');
  console.log('states expanded   ' + result.expanded + '  (distinct ' + result.seen + ')');
  console.log('search time       ' + ms + 'ms');
  console.log('result            ' + (result.found ? 'PLAN FOUND (' + result.plan.length + ' commands)' : 'no plan within budget'));
  if (result.found) {
    console.log('');
    result.plan.forEach((c, i) => console.log('  ' + String(i + 1).padStart(2) + '. ' + c));
  }

  if (doVerify && result.found) {
    console.log('');
    console.log('verifying against the real engine...');
    const ending = await verifyPlan(storyPath, result.plan);
    console.log('engine ending     ' + (ending ? JSON.stringify(ending) : 'NONE — the model and the engine disagree'));
  }
  console.log('');
}

module.exports = { compile, plan, successors, holds, stateKey };

if (require.main === module) {
  main().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
}
