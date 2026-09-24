/**
 * explore.js — a measurement spike for ADR-294 D20 ("the explorer — bounded
 * exhaustive play"): walk a story's reachable state space breadth-first and
 * report how fast it grows.
 *
 * This answers ONE question — is a real story's state space walkable in
 * single-digit minutes — and is deliberately not a product. It uses only
 * public surfaces: `loadAuthorGame` to boot, and the engine's save/restore
 * hooks as the fork primitive (the pattern `transcript-tester/src/search.ts`
 * already uses for ADR-293 D12's outcome search). No `packages/` code is
 * touched.
 *
 * What it does NOT do, deliberately: no outcome forcing at choice points
 * (ADR-293 `materialize`), so randomness is sampled at the pinned seed rather
 * than branched per declared class; no conversation topics; no multi-object
 * commands beyond a capped put-in/put-on. Each of those makes the space
 * larger, so every number here is a LOWER bound on the real walk.
 *
 * Since issue #508 the walk is also the shared room-reachability substrate
 * for the testing-explorer's lenses: `explore()` is exported and takes an
 * `onRoomFirstSeen` hook (see its doc comment). The CLI is unchanged.
 *
 * Public interface: CLI — `node tools/explorer-probe/explore.js <story> [opts]`;
 * module — `explore(storyPath, opts)`.
 * Owner context: tools/ — a spike, outside the published packages.
 */

const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.resolve(__dirname, '..', '..');
const { loadAuthorGame } = require(path.join(REPO, 'packages/devkit/dist/standalone/author-game.js'));
const wm = require(path.join(REPO, 'packages/world-model/dist/index.js'));
const { loadStoryIR, deriveDimensions, deriveCommandVocabulary, actionVerbTemplates } = require('./dimensions.js');

const T = wm.TraitType;

/** Chord's own state-key spelling, from `@sharpee/story-loader/state-keys`. */
const CHORD_STATE_PREFIX = 'chord.state.';
const CHORD_STORY_STATE_KEY = 'chord.story.state';
const CHORD_IR_ID_ATTRIBUTE = 'chordIrId';

// ---------------------------------------------------------------------------
// Candidate generation — the "likely commands" heuristic
// ---------------------------------------------------------------------------

/**
 * The verb that consumes a trait's declared instrument. `feedable "kipper"`
 * means `feed <target> with kipper`, and so on — the trait names the action.
 */
const INSTRUMENT_VERBS = {
  openable: 'open', lockable: 'unlock', cuttable: 'cut', feedable: 'feed',
};

/** Directions a room's exits declare, lowercased to command words. */
function exitCommands(world, room) {
  const trait = room && room.get && room.get(T.ROOM);
  if (!trait || !trait.exits) return [];
  return Object.keys(trait.exits).map((d) => String(d).toLowerCase());
}

/** True when the entity is plausibly a portable object rather than fixture. */
function isPortable(entity) {
  if (entity.has(T.ROOM) || entity.has(T.ACTOR) || entity.has(T.DOOR)) return false;
  if (entity.has(T.SCENERY)) return false;
  return true;
}

/**
 * The commands worth trying in the current world state.
 *
 * Derived from exits plus each in-scope entity's traits — the trait IS the
 * affordance, which is what makes this cheaper than grammar x vocabulary.
 *
 * @param world   the live world model
 * @param breadth 'basic' (one verb per affordance) or 'full' (adds the
 *                combinatorial put-in/put-on and lock/unlock pairs)
 * @returns command strings, deduplicated, in a stable order
 */
function candidates(world, breadth, vocab, nameByIrId) {
  const player = world.getPlayer();
  const room = world.getContainingRoom(player.id);
  const out = [];

  for (const dir of exitCommands(world, room)) out.push(dir);

  const visible = world.getVisible(player.id) || [];
  const carriedIds = new Set(world.getContents(player.id).map((e) => e.id));

  for (const e of visible) {
    if (e.has(T.ROOM)) continue;
    if (e.id === player.id) continue;
    const n = e.name;
    const carried = carriedIds.has(e.id);

    out.push('examine ' + n);

    if (e.has(T.READABLE)) out.push('read ' + n);
    if (e.has(T.PUSHABLE)) out.push('push ' + n);
    if (e.has(T.PULLABLE)) out.push('pull ' + n);
    if (e.has(T.CLIMBABLE)) out.push('climb ' + n);
    if (e.has(T.EDIBLE)) out.push('eat ' + n);

    if (e.has(T.OPENABLE)) {
      const t = e.get(T.OPENABLE);
      out.push(t && t.isOpen ? 'close ' + n : 'open ' + n);
    }
    if (e.has(T.SWITCHABLE)) {
      const t = e.get(T.SWITCHABLE);
      out.push(t && t.isOn ? 'turn off ' + n : 'turn on ' + n);
    }
    if (e.has(T.WEARABLE)) {
      const t = e.get(T.WEARABLE);
      out.push(t && t.worn ? 'take off ' + n : 'wear ' + n);
    }
    if (e.has(T.CONTAINER) || e.has(T.SUPPORTER)) out.push('search ' + n);

    if (carried) out.push('drop ' + n);
    else if (isPortable(e)) out.push('take ' + n);

    // Instrument verbs, bounded by the carried set (small) and by the trait
    // that makes the verb meaningful. fernhill's ending needs two of these —
    // `cut fuse with shears` and `open deed box with locket` — and no
    // trait-implied single-object verb can reach either.
    if (e.has(T.CUTTABLE)) {
      for (const key of carriedIds) {
        const k = world.getEntity(key);
        if (k) out.push('cut ' + n + ' with ' + k.name);
      }
    }
    if (e.has(T.LOCKABLE)) {
      for (const key of carriedIds) {
        const k = world.getEntity(key);
        if (!k) continue;
        out.push('unlock ' + n + ' with ' + k.name);
        out.push('open ' + n + ' with ' + k.name);
      }
    }
    if (e.has(T.ACTOR)) {
      for (const key of carriedIds) {
        const k = world.getEntity(key);
        if (k) out.push('give ' + k.name + ' to ' + n);
      }
    }

    // Conversation the story itself declares: `ask <npc> about <topic>`.
    const irId = e.attributes && e.attributes[CHORD_IR_ID_ATTRIBUTE];
    for (const topic of (vocab && irId && vocab.topics[irId]) || []) {
      const about = topic.kind === 'text' ? topic.text : nameByIrId.get(topic.id);
      if (about) out.push('ask ' + n + ' about ' + about);
    }

    // Story-declared action patterns (`prune <target>`, `wind up <target>`).
    for (const action of (vocab && vocab.actions) || []) {
      out.push(action.parts.map((p) => (p.kind === 'word' ? p.word : n)).join(' '));
    }

    // Actions this entity's own `on` clauses declare it responds to. This is
    // the story naming its affordances directly, and it reaches entities no
    // trait implies: fernhill's stopcock is only `scenery` but carries
    // `on turning`, and `turn stopcock` is on the winning path.
    for (const actionName of (vocab && irId && vocab.entityActions[irId]) || []) {
      const template = vocab.verbTemplates.get(actionName);
      if (template) out.push(template.replace('[something]', n));
    }

    // A trait config naming an instrument (`cuttable "garden shears"`,
    // `openable "silver locket"`) gives the exact command the story expects.
    for (const req of (vocab && irId && vocab.openWith[irId]) || []) {
      const verb = INSTRUMENT_VERBS[req.trait];
      if (verb) out.push(verb + ' ' + n + ' with ' + req.instrument);
    }

    if (breadth === 'full') {
      if (e.has(T.CONTAINER) && !carried) {
        for (const key of carriedIds) {
          const k = world.getEntity(key);
          if (k) out.push('put ' + k.name + ' in ' + n);
        }
      }
      if (e.has(T.SUPPORTER) && !carried) {
        for (const key of carriedIds) {
          const k = world.getEntity(key);
          if (k) out.push('put ' + k.name + ' on ' + n);
        }
      }
    }
  }

  return [...new Set(out)];
}

// ---------------------------------------------------------------------------
// State identity
// ---------------------------------------------------------------------------

function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

/**
 * Capability names that carry history or presentation bookkeeping rather
 * than game state. Measured on fernhill, 2026-09-22: `commandHistory` is the
 * command log (and carries wall-clock timestamps, so it is not even stable
 * run-to-run); `textState` is Chord's prose-variation cycling counter. Both
 * change on every single turn, so leaving either in the identity means no
 * two states are ever equal and dedup never fires.
 */
const NON_STATE_CAPABILITIES = new Set(['commandHistory', 'textState']);

/**
 * World-state keys that advance every turn regardless of what happened, and
 * therefore destroy dedup on their own. Each was found by measurement, not by
 * reading code, and each was found on a DIFFERENT story — which is the point:
 *
 *   `chord.rng`       — the Chord evaluator's RNG stream (found on fernhill)
 *   `character.turn`  — the character tick's turn counter (found on
 *                       secret-letter; fernhill never exercises it)
 *
 * Together with the two non-state capabilities and the occurrence counters,
 * that is five independent carriers across two stories. A hand-maintained
 * blocklist is the wrong shape for this in a product — see the spike notes.
 */
const VOLATILE_STATE_KEYS = ['chord.rng', 'character.turn'];

/** Prefix of Chord's occurrence counters ("the third time you enter"). */
const OCCURRENCE_PREFIX = 'chord.occurrence.';

/**
 * Traits whose data is game state a player can change, and which therefore
 * distinguish two worlds. Everything else on an entity (identity prose,
 * scenery marking, a room's visited flag) is either immutable or presentation.
 */
const STATEFUL_TRAITS = new Set([
  'openable', 'lockable', 'switchable', 'wearable', 'edible', 'health',
  'container', 'supporter', 'lightSource', 'equipped', 'combatant',
]);

/**
 * Hash the world as one state, under one of three identity rules.
 *
 * - `full`   — the canonical snapshot verbatim. This is what ADR-294 D20
 *              proposes ("a hash of the canonical snapshot deduplicates
 *              states") and it does NOT work: the snapshot embeds a command
 *              log, prose-cycling counters and an RNG stream, so every state
 *              is unique by construction.
 * - `coarse` — strips the three volatile carriers above but KEEPS Chord's
 *              occurrence counters, which are real game state (a rule may
 *              fire on the third visit).
 * - `play`   — also strips occurrence counters. Coarser than is strictly
 *              sound; measured to show what occurrence-sensitivity costs.
 *
 * @param world the live world model
 * @param mode  'full' | 'coarse' | 'play'
 * @returns a hex digest
 */
function declaredHash(snap, sig, profile) {
  const playerId = snap.playerId;

  // Runtime entity id -> the IR id the Chord loader stamped on it.
  const irIdOf = new Map();
  for (const row of snap.entities || []) {
    const attrs = (row && row.entity && row.entity.attributes) || {};
    if (attrs[CHORD_IR_ID_ATTRIBUTE]) irIdOf.set(row.id, attrs[CHORD_IR_ID_ATTRIBUTE]);
  }

  const pairs = [];
  for (const row of (snap.spatialIndex && snap.spatialIndex.parentToChildren) || []) {
    for (const child of row.children || []) {
      if (child === playerId) { pairs.push(row.parent + '>' + child); continue; }
      const ir = irIdOf.get(child);
      if (ir && sig.placement.has(ir)) pairs.push(row.parent + '>' + child);
    }
  }
  pairs.sort();

  const state = snap.state || {};
  const kept = [];
  for (const [key, value] of Object.entries(state)) {
    if (key === CHORD_STORY_STATE_KEY) { kept.push([key, value]); continue; }
    if (!key.startsWith(CHORD_STATE_PREFIX)) continue;
    const ir = key.slice(CHORD_STATE_PREFIX.length);
    if (sig.state.has(ir)) kept.push([key, value]);
  }
  kept.sort((a, b) => (a[0] < b[0] ? -1 : 1));

  const flags = [];
  for (const row of snap.entities || []) {
    const ir = irIdOf.get(row.id);
    if (!ir || !(sig.state.has(ir) || sig.placement.has(ir))) continue;
    const keep = [];
    for (const trait of (row.entity && row.entity.traits) || []) {
      if (trait && STATEFUL_TRAITS.has(trait.type)) keep.push(JSON.stringify(trait));
    }
    if (keep.length) flags.push(row.id + '=' + keep.sort().join(','));
  }
  flags.sort();

  const parts = {
    loc: pairs.join(','),
    state: JSON.stringify(kept),
    score: JSON.stringify(snap.scoreLedger || null),
    flags: flags.join(';'),
  };
  if (profile) {
    for (const [key, value] of Object.entries(parts)) {
      (profile[key] || (profile[key] = new Set())).add(sha1(value));
    }
  }
  return sha1(Object.entries(parts).map(([k, v]) => k + ':' + v).join('|'));
}

/**
 * Hash the world as one state, under one of the identity rules.
 *
 * `declared` is the factored rule: hash only what the story's own rules read
 * (containment for entities whose placement is tested, state for entities
 * whose state is tested, plus story state, score and significant trait
 * flags). Everything else is set dressing that cannot distinguish two worlds
 * behaviourally. The other modes are the measurement baseline — see the
 * block comment above each.
 */
function stateHash(world, mode, profile, sig) {
  if (mode === 'full') return sha1(world.toJSON());

  const snap = JSON.parse(world.toJSON());
  if (mode === 'declared') return declaredHash(snap, sig, profile);

  const state = { ...(snap.state || {}) };
  for (const key of VOLATILE_STATE_KEYS) delete state[key];
  if (mode === 'play' || mode === 'place') {
    for (const key of Object.keys(state)) {
      if (key.startsWith(OCCURRENCE_PREFIX)) delete state[key];
    }
  }

  const caps = [];
  for (const raw of Object.values(snap.capabilities || {})) {
    if (!raw || NON_STATE_CAPABILITIES.has(raw.name)) continue;
    caps.push(raw.name + '=' + JSON.stringify(raw.data));
  }
  caps.sort();

  // Containment lives in the spatial index, as {parent, children[]} rows —
  // NOT in `relationships`, which is empty on these stories. Normalized to
  // sorted parent>child pairs so row order can never change the identity.
  //
  // In `place` mode only the PLAYER's containment is kept, and every other
  // object's position is discarded. That is deliberately unsound as a test
  // identity — where you left the key matters — and exists to measure one
  // thing: how much of the state space is object-placement permutation
  // rather than story progress.
  const playerId = snap.playerId;
  const pairs = [];
  for (const row of (snap.spatialIndex && snap.spatialIndex.parentToChildren) || []) {
    for (const child of row.children || []) {
      if (mode === 'place' && child !== playerId) continue;
      pairs.push(row.parent + '>' + child);
    }
  }
  pairs.sort();

  // Traits serialize as an ARRAY of objects carrying their own `type`.
  const flags = [];
  for (const row of snap.entities || []) {
    const id = row && row.id;
    const traits = (row && row.entity && row.entity.traits) || [];
    const keep = [];
    for (const trait of traits) {
      if (!trait || !STATEFUL_TRAITS.has(trait.type)) continue;
      keep.push(JSON.stringify(trait));
    }
    if (keep.length) flags.push(id + '=' + keep.sort().join(','));
  }
  flags.sort();

  const parts = {
    loc: pairs.join(','),
    state: JSON.stringify(Object.keys(state).sort().map((k) => [k, state[k]])),
    score: JSON.stringify(snap.scoreLedger || null),
    caps: caps.join(';'),
    flags: flags.join(';'),
  };

  // Entropy profiling (--profile): count how many DISTINCT values each
  // component of the identity takes across the whole walk. The component with
  // the largest cardinality is the one driving the explosion, and is
  // therefore the one worth abstracting over. Without this the answer is
  // guesswork — placement was fernhill's driver and is measurably NOT
  // secret-letter's.
  if (profile) {
    for (const [key, value] of Object.entries(parts)) {
      (profile[key] || (profile[key] = new Set())).add(sha1(value));
    }
    // Which individual state KEYS vary, so a driver inside `state` is named
    // rather than lumped.
    for (const [key, value] of Object.entries(state)) {
      const bucket = 'state.' + key;
      (profile[bucket] || (profile[bucket] = new Set())).add(sha1(JSON.stringify(value)));
    }
  }

  return sha1([
    'loc:' + parts.loc, 'state:' + parts.state, 'score:' + parts.score,
    'caps:' + parts.caps, 'flags:' + parts.flags,
  ].join('|'));
}

// ---------------------------------------------------------------------------
// Fork primitive — the engine's own save/restore hooks
// ---------------------------------------------------------------------------

async function captureSave(platform) {
  let captured = null;
  platform.registerSaveRestoreHooks({
    onSaveRequested: async (data) => { captured = data; },
    onRestoreRequested: async () => null,
  });
  const ok = await platform.save();
  return ok ? captured : null;
}

async function restoreSave(platform, payload) {
  platform.registerSaveRestoreHooks({
    onSaveRequested: async () => {},
    onRestoreRequested: async () => payload,
  });
  return platform.restore();
}

/**
 * How many rooms the story declares. Measured IR shape (fernhill,
 * 2026-09-23): `entity.kinds[]` is a list of `{name, config, condition}`
 * records and a room is the entity whose kinds include `room`.
 */
function countDeclaredRooms(ir) {
  let n = 0;
  for (const entity of ir.entities || []) {
    if ((entity.kinds || []).some((k) => k && k.name === 'room')) n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

/**
 * Walk a story's reachable state space breadth-first.
 *
 * Also the shared room-reachability substrate for the testing-explorer's
 * lenses (issue #508): a lens passes `opts.onRoomFirstSeen` and is called
 * once per room, the first time the walk discovers it, with the world in the
 * state the walk arrived in. The hook may run commands freely — the walk
 * restores its own save before every command it issues, so nothing the hook
 * does leaks into the walk's identity or frontier.
 *
 * @param storyPath absolute path to the `.story` file
 * @param opts.seed / hash / breadth / maxStates / maxSeconds / maxDepth /
 *   profile / declaredVocab — the CLI flags of the same names
 * @param opts.onRoomFirstSeen optional `async ({ game, world, room, save,
 *   restore, path }) => void`; `restore()` puts the world back to the state
 *   the room was first seen in, `path` is the command list that reached it
 * @param opts.stopWhenAllRoomsSeen stop with reason `all-rooms-reached` once
 *   every room the IR declares has been seen (declared mode only — the count
 *   comes from the IR)
 * @returns the walk report; `roomsDeclared` is present in declared mode so a
 *   reader can compare rooms reached against the total
 */
async function explore(storyPath, opts) {
  const started = Date.now();
  const game = await loadAuthorGame(storyPath, { seed: opts.seed });
  const world = game.world;
  const platform = game.engine;
  const loadMs = Date.now() - started;

  await game.executeCommand('look');

  const roomsSeen = new Set();
  const endings = new Set();
  /** Records the player's room and any ending; returns the room if newly seen. */
  const noteFacts = () => {
    const p = world.getPlayer();
    if (!p) return null;
    const r = world.getContainingRoom(p.id);
    let firstSeen = null;
    if (r) {
      const key = r.id + ':' + r.name;
      if (!roomsSeen.has(key)) { roomsSeen.add(key); firstSeen = r; }
    }
    const ending = world.storyEnding || (world.getStoryEnding && world.getStoryEnding());
    if (ending) endings.add(typeof ending === 'string' ? ending : JSON.stringify(ending));
    return firstSeen;
  };
  const rootRoom = noteFacts();

  const rootSave = await captureSave(platform);
  const profile = opts.profile ? {} : null;

  const hook = typeof opts.onRoomFirstSeen === 'function' ? opts.onRoomFirstSeen : null;
  const fireHook = async (room, save, cmdPath) => {
    if (!hook || !room) return;
    const restore = () => restoreSave(platform, save);
    await hook({ game, world, room, save, restore, path: cmdPath });
  };
  await fireHook(rootRoom, rootSave, []);
  // The root identity is hashed below; undo anything the hook did first.
  if (hook) await restoreSave(platform, rootSave);

  // The factored identity needs the story's own declarations. Derived once,
  // from the compiled IR beside the .story file.
  let sig = { placement: new Set(), state: new Set() };
  let dims = null;
  let vocab = null;
  let roomsDeclared = null;
  const nameByIrId = new Map();
  if (opts.hash === 'declared' || opts.declaredVocab) {
    const ir = loadStoryIR(storyPath);
    vocab = deriveCommandVocabulary(ir);
    vocab.verbTemplates = actionVerbTemplates(
      require(path.join(REPO, 'packages/lang-en-us/dist/index.js')));
    for (const e of world.getAllEntities() || []) {
      const irId = e.attributes && e.attributes[CHORD_IR_ID_ATTRIBUTE];
      if (irId) nameByIrId.set(irId, e.name);
    }
    dims = deriveDimensions(ir);
    sig = {
      placement: new Set(dims.placementEntityIds),
      state: new Set(dims.loadBearingDimensions.map((d) => d.id)),
    };
    // Rooms the story declares, so "rooms reached" can be read against a
    // total (ADR-322 D7: a report never implies exhaustiveness).
    roomsDeclared = countDeclaredRooms(ir);
  }

  const rootHash = stateHash(world, opts.hash, profile, sig);
  const allRoomsSeen = () =>
    opts.stopWhenAllRoomsSeen && roomsDeclared !== null && roomsSeen.size >= roomsDeclared;

  const seen = new Set([rootHash]);
  let queue = [{ save: rootSave, path: [], depth: 0 }];

  let commandsExecuted = 0;
  let restores = 0;
  let saves = 1;
  let deadEnds = 0;
  const frontierByDepth = { 0: 1 };
  const walkStart = Date.now();
  let stopReason = 'frontier-exhausted';

  if (allRoomsSeen()) { stopReason = 'all-rooms-reached'; queue = []; }

  while (queue.length > 0) {
    const elapsed = (Date.now() - walkStart) / 1000;
    if (seen.size >= opts.maxStates) { stopReason = 'max-states'; break; }
    if (elapsed >= opts.maxSeconds) { stopReason = 'max-seconds'; break; }

    const node = queue.shift();
    if (node.depth >= opts.maxDepth) { stopReason = 'max-depth-reached'; continue; }

    await restoreSave(platform, node.save);
    restores++;
    const cmds = candidates(world, opts.breadth, vocab, nameByIrId);
    if (cmds.length === 0) deadEnds++;

    for (const cmd of cmds) {
      if (seen.size >= opts.maxStates) { stopReason = 'max-states'; break; }
      if ((Date.now() - walkStart) / 1000 >= opts.maxSeconds) { stopReason = 'max-seconds'; break; }

      await restoreSave(platform, node.save);
      restores++;
      try {
        await game.executeCommand(cmd);
      } catch (err) {
        // A refused turn is information, not a crash of the walk.
      }
      commandsExecuted++;
      const newRoom = noteFacts();

      const h = stateHash(world, opts.hash, profile, sig);
      let save = null;
      if (!seen.has(h)) {
        seen.add(h);
        save = await captureSave(platform);
        saves++;
        const depth = node.depth + 1;
        frontierByDepth[depth] = (frontierByDepth[depth] || 0) + 1;
        queue.push({ save, path: [...node.path, cmd], depth });
      }

      // The hook runs AFTER the new state's save is in the queue, so whatever
      // it does to the world cannot reach the frontier; the next iteration
      // restores `node.save` regardless. A new room always means a new state
      // (the player's containment is in every identity), but the fallback
      // capture keeps the hook honest if that ever stops being true.
      if (newRoom && hook) {
        if (!save) { save = await captureSave(platform); saves++; }
        await fireHook(newRoom, save, [...node.path, cmd]);
        if (allRoomsSeen()) { stopReason = 'all-rooms-reached'; queue = []; break; }
      }
    }
  }

  const walkMs = Date.now() - walkStart;
  return {
    story: path.basename(storyPath),
    seed: opts.seed,
    hashMode: opts.hash,
    breadth: opts.breadth,
    budgets: { maxStates: opts.maxStates, maxSeconds: opts.maxSeconds, maxDepth: opts.maxDepth },
    stopReason,
    loadMs,
    walkMs,
    statesDiscovered: seen.size,
    commandsExecuted,
    restores,
    saves,
    queueRemaining: queue.length,
    deadEnds,
    commandsPerSecond: Math.round(commandsExecuted / (walkMs / 1000)),
    newStatesPerCommand: +(seen.size / Math.max(commandsExecuted, 1)).toFixed(4),
    roomsReached: roomsSeen.size,
    ...(roomsDeclared !== null ? { roomsDeclared } : {}),
    rooms: [...roomsSeen].sort(),
    endingsReached: [...endings],
    frontierByDepth,
    ...(dims ? { dimensions: {
      declared: dims.dimensionsDeclared,
      loadBearing: dims.dimensionsLoadBearing,
      inert: dims.inertDimensions.length,
      placementSignificant: dims.placementLoadBearing,
      fullProduct: dims.fullProduct,
      loadBearingProduct: dims.loadBearingProduct,
    } } : {}),
    ...(profile ? { componentCardinality: Object.fromEntries(
      Object.entries(profile).map(([k, v]) => [k, v.size]).sort((a, b) => b[1] - a[1]).slice(0, 20)) } : {}),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    story: null, seed: 1209, hash: 'coarse', breadth: 'basic',
    maxStates: 5000, maxSeconds: 120, maxDepth: 40, json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed') opts.seed = Number(argv[++i]);
    else if (a === '--hash') opts.hash = argv[++i];
    else if (a === '--breadth') opts.breadth = argv[++i];
    else if (a === '--max-states') opts.maxStates = Number(argv[++i]);
    else if (a === '--max-seconds') opts.maxSeconds = Number(argv[++i]);
    else if (a === '--max-depth') opts.maxDepth = Number(argv[++i]);
    else if (a === '--json') opts.json = true;
    else if (a === '--profile') opts.profile = true;
    else if (a === '--declared-vocab') opts.declaredVocab = true;
    else if (!opts.story) opts.story = a;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.story) {
    console.error('usage: node tools/explorer-probe/explore.js <story.story> [--seed N] [--hash full|coarse] [--breadth basic|full] [--max-states N] [--max-seconds N] [--max-depth N] [--json]');
    process.exit(2);
  }
  const result = await explore(path.resolve(opts.story), opts);
  if (opts.json) { console.log(JSON.stringify(result, null, 2)); return; }

  console.log('');
  console.log('story             ' + result.story + '  (seed ' + result.seed + ')');
  console.log('hash / breadth    ' + result.hashMode + ' / ' + result.breadth);
  console.log('stopped because   ' + result.stopReason);
  console.log('');
  console.log('states            ' + result.statesDiscovered);
  console.log('commands          ' + result.commandsExecuted);
  console.log('walk time         ' + (result.walkMs / 1000).toFixed(1) + 's   (' + result.commandsPerSecond + ' cmd/s)');
  console.log('new states/cmd    ' + result.newStatesPerCommand);
  console.log('queue remaining   ' + result.queueRemaining);
  console.log('rooms reached     ' + result.roomsReached);
  console.log('endings reached   ' + (result.endingsReached.length || 0));
  console.log('');
  console.log('frontier by depth');
  for (const [d, n] of Object.entries(result.frontierByDepth)) console.log('  depth ' + d + ': ' + n);
  console.log('');
}

module.exports.__candidates = candidates;
module.exports.explore = explore;

if (require.main === module) {
  main().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
}
