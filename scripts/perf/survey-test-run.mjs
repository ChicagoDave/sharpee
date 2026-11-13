#!/usr/bin/env node
/**
 * survey-test-run.mjs — where a `sharpee test` run spends its time, measured
 * from outside the packages (engine-test-performance plan, Phase 2).
 *
 * Purpose: an ON-DEMAND instrument. It is not a test, sits outside
 * `scripts/__tests__/` and every turbo task, and asserts no time anywhere
 * (ADR-395 D7, D8). Every count is taken by wrapping the built packages'
 * loaders, engines and worlds; nothing under `packages/` is edited for it.
 * Build first (`./repokit build dungeo`): it reads `dist/`.
 *
 * Public interface (one mode per invocation; `<story>` is a story directory):
 *   --run <story> [--digest <file>]   one clean `sharpee test --json` run: wall
 *                                     time by tier, and the tree's authored and
 *                                     replayed commands. With --digest, also
 *                                     writes the timing-free verdict digest.
 *   --counts <story>                  one instrumented in-process run: boots,
 *                                     compiles, turns, serializations, saves,
 *                                     restores, trait checks and player-role
 *                                     scans, with the time inside each, by tier.
 *   --primitives <story>              compile, boot, a turn by kind, the undo
 *                                     snapshot's share, save, restore, serialize.
 *   --equivalence <story>             at every fork of the story's tree: a
 *                                     restored world against a replayed one,
 *                                     then the next turns' events.
 *   --self-check                      hands the boot counter a doubled loader on
 *                                     test-stories/ferry. Exit 1: the doubling
 *                                     was detected and reported (the instrument
 *                                     works). Exit 2: the counter did not see it.
 *   Every mode prints one JSON object on stdout; --equivalence exits 1 when a
 *   fork differs.
 *
 * Owner context: repo tooling (performance survey). Not shipped.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = (relative) => require(path.join(REPO, 'packages', relative));

const authorGame = dist('devkit/dist/standalone/author-game.js');
const treeCommand = dist('devkit/dist/commands/test-tree-document.js');
const branchTester = dist('branch-tester/dist/index.js');
const { captureSave, restoreSave } = dist('transcript-tester/dist/index.js');

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const round = (value, places = 2) => Number(value.toFixed(places));

/** The story's `.story` file, its tree lines and its pinned seed. */
function readStory(storyDir) {
  const dir = path.resolve(storyDir);
  const storyFile = authorGame.findStoryFile(dir);
  const treePath = treeCommand.findTreeDirectory(dir);
  if (!treePath) return { dir, storyFile, seed: 1209, lines: [] };
  const read = branchTester.assembleTree(treeCommand.readTreeFiles(treePath));
  if (read.status !== 'ok') throw new Error(`${treePath}: ${read.message}`);
  return { dir, storyFile, seed: read.document.seed, lines: branchTester.flattenTreeLines(read.document).lines };
}

const commandsOf = (line) => line.cards.map((card) => card.command).filter((command) => typeof command === 'string');

// ---------------------------------------------------------------- run / digest

/** Fields of a run event that differ from run to run at one seed: sequence, clocks and durations. */
const VOLATILE_EVENT_FIELDS = new Set(['seq', 'elapsedMs', 'schemaVersion', 'duration', 'totalDuration', 'totalWalkMs']);

function digestOf(events) {
  return events
    .filter((event) => event.type !== 'run-start' && event.type !== 'transcript-start')
    .map((event) => JSON.stringify(Object.fromEntries(Object.entries(event).filter(([field]) => !VOLATILE_EVENT_FIELDS.has(field)))))
    .join('\n') + '\n';
}

function modeRun(storyDir, digestFile) {
  const story = readStory(storyDir);
  const started = performance.now();
  const child = spawnSync(process.execPath, [path.join(REPO, 'packages/devkit/dist/cli.js'), 'test', story.dir, '--json'], { encoding: 'utf8', maxBuffer: 1 << 30 });
  const wallMs = performance.now() - started;
  const events = child.stdout.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const lastOf = (type) => events.filter((event) => event.type === type).at(-1);
  const treeEnd = lastOf('transcript-end')?.elapsedMs ?? 0;
  const derivedEnd = lastOf('derived-summary')?.elapsedMs ?? treeEnd;
  const claimsEnd = lastOf('claims-summary')?.elapsedMs ?? derivedEnd;
  const runEnd = lastOf('run-end')?.elapsedMs ?? claimsEnd;
  const derived = events.filter((event) => event.type === 'derived-branch');
  const byStatus = {};
  for (const row of derived) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  if (digestFile) {
    mkdirSync(path.dirname(path.resolve(digestFile)), { recursive: true });
    writeFileSync(digestFile, digestOf(events));
  }
  return {
    mode: 'run', story: path.basename(story.dir), exitCode: child.status,
    wallMs: round(wallMs, 0), processStartAndCompileMs: round(wallMs - runEnd, 0),
    treeMs: treeEnd, derivedMs: derivedEnd - treeEnd, claimsMs: claimsEnd - derivedEnd,
    tree: {
      lines: story.lines.length,
      authoredCommands: story.lines.reduce((total, line) => total + commandsOf(line).length, 0),
      replayedPrefixCommands: story.lines.reduce((total, line) => total + line.prefix.length, 0),
      deepestPrefix: Math.max(0, ...story.lines.map((line) => line.prefix.length)),
      cardsReported: events.filter((event) => event.type === 'command-result').length,
    },
    derived: { rows: derived.length, byStatus, msPerRow: derived.length ? round((derivedEnd - treeEnd) / derived.length, 1) : 0 },
    claims: { declared: lastOf('claims-summary')?.declared ?? 0, walks: lastOf('claims-summary')?.walks ?? 0, totalWalkMs: lastOf('claims-summary')?.totalWalkMs ?? 0 },
    ...(digestFile ? { digest: digestFile } : {}),
  };
}

// ---------------------------------------------------------------------- counts

/** Commands that only read the world, by their first word. An estimate: the verb, not the outcome. */
const READ_ONLY_VERBS = new Set(['look', 'l', 'examine', 'x', 'read', 'inventory', 'i', 'search', 'listen', 'smell']);

/**
 * Wrap the built packages' functions so each call is counted and timed under
 * the tier that is running. Returns the counters and a restore function.
 */
function installCounters() {
  const tiers = {};
  let tier = 'outside';
  const cell = (name) => ((tiers[tier] ??= {})[name] ??= { calls: 0, ms: 0 });
  const undoTyped = [];
  const restores = [];
  const wrap = (owner, name, counter, { tierName, inspect, timed = true } = {}) => {
    const original = owner[name];
    if (typeof original !== 'function') throw new Error(`survey: nothing to wrap at ${counter} (${name})`);
    owner[name] = function wrapped(...args) {
      const previous = tier;
      if (tierName) tier = tierName;
      const slot = cell(counter);
      slot.calls++;
      if (inspect) inspect(args);
      if (!timed) return original.apply(this, args);
      const started = performance.now();
      const finish = () => { slot.ms += performance.now() - started; tier = previous; };
      let result;
      try { result = original.apply(this, args); } catch (error) { finish(); throw error; }
      if (result && typeof result.then === 'function') return result.finally(finish);
      finish();
      return result;
    };
    restores.push(() => { owner[name] = original; });
  };

  const { WorldModel, IFEntity } = dist('world-model/dist/index.js');
  const { GameEngine } = dist('engine/dist/game-engine.js');
  const { SaveRestoreService } = dist('engine/dist/session/save-restore-service.js');
  wrap(dist('branch-tester/dist/tree-walker.js'), 'runTreeDocument', 'tier', { tierName: 'tree' });
  wrap(dist('branch-tester/dist/derived-runner.js'), 'runDerivedSuite', 'tier', { tierName: 'derived' });
  wrap(dist('branch-tester/dist/claims/claims-runner.js'), 'runClaims', 'tier', { tierName: 'claims' });
  wrap(dist('bootstrap/dist/index.js'), 'assembleGame', 'boots');
  wrap(dist('chord/dist/index.js'), 'compile', 'compiles');
  wrap(dist('chord/dist/claims.js'), 'compileClaims', 'claimCompiles');
  wrap(GameEngine.prototype, 'executeTurn', 'turns', { inspect: ([input]) => { if (/^undo\b/i.test(String(input).trim())) undoTyped.push({ tier, input }); } });
  wrap(GameEngine.prototype, 'save', 'saves');
  wrap(GameEngine.prototype, 'restore', 'restores');
  wrap(SaveRestoreService.prototype, 'createUndoSnapshot', 'undoSnapshots');
  wrap(WorldModel.prototype, 'toJSON', 'worldSerializations');
  wrap(WorldModel.prototype, 'loadJSON', 'worldDeserializations');
  wrap(WorldModel.prototype, 'playerRoleHolders', 'playerRoleScans');
  wrap(IFEntity.prototype, 'has', 'traitChecks', { timed: false });
  return { tiers, undoTyped, uninstall: () => { for (const restore of restores.reverse()) restore(); } };
}

/** Run `sharpee test --json` in this process with stdout captured. */
async function runTestInProcess(storyDir) {
  const { runTestCommand } = dist('devkit/dist/commands/test.js');
  const lines = [];
  const write = process.stdout.write;
  const log = console.log;
  const error = console.error;
  process.stdout.write = (chunk) => { lines.push(String(chunk)); return true; };
  console.log = (...args) => { lines.push(`${args.join(' ')}\n`); };
  console.error = () => {};
  try {
    const exitCode = await runTestCommand([path.resolve(storyDir), '--json']);
    return { exitCode, events: lines.join('').split('\n').filter((line) => line.startsWith('{')).map((line) => JSON.parse(line)) };
  } finally {
    process.stdout.write = write;
    console.log = log;
    console.error = error;
  }
}

async function modeCounts(storyDir) {
  const counters = installCounters();
  let run;
  try { run = await runTestInProcess(storyDir); } finally { counters.uninstall(); }
  const tiers = {};
  for (const [name, cells] of Object.entries(counters.tiers)) {
    const row = {};
    for (const [counter, value] of Object.entries(cells)) row[counter] = counter === 'traitChecks' ? { calls: value.calls } : { calls: value.calls, ms: round(value.ms, 0) };
    const turns = cells.turns?.calls ?? 0;
    if (turns > 0) {
      row.perTurn = {
        turnMs: round(cells.turns.ms / turns),
        undoSnapshotShare: cells.undoSnapshots ? round(cells.undoSnapshots.ms / cells.turns.ms, 3) : 0,
        worldSerializations: round((cells.worldSerializations?.calls ?? 0) / turns),
        playerRoleScans: round((cells.playerRoleScans?.calls ?? 0) / turns, 1),
        playerRoleScanShare: cells.playerRoleScans ? round(cells.playerRoleScans.ms / cells.turns.ms, 3) : 0,
        traitChecks: round((cells.traitChecks?.calls ?? 0) / turns, 0),
      };
    }
    tiers[name] = row;
  }
  const derived = run.events.filter((event) => event.type === 'derived-branch');
  const withCommand = derived.filter((row) => typeof row.command === 'string');
  const typedInTree = run.events.filter((event) => event.type === 'command-result' && /^undo\b/i.test(String(event.input).trim())).length;
  return {
    mode: 'counts', story: path.basename(path.resolve(storyDir)), exitCode: run.exitCode, tiers,
    derivedRows: {
      total: derived.length,
      withCommand: withCommand.length,
      readOnlyByVerb: withCommand.filter((row) => READ_ONLY_VERBS.has(row.command.trim().split(/\s+/)[0].toLowerCase())).length,
      boots: counters.tiers.derived?.boots?.calls ?? 0,
    },
    undo: { typedByTreeCards: typedInTree, turnsThatTypedUndo: counters.undoTyped },
  };
}

// ------------------------------------------------------------------ primitives

const DIRECTIONS = new Set(['north', 'south', 'east', 'west', 'up', 'down', 'in', 'out', 'n', 's', 'e', 'w', 'u', 'd', 'ne', 'nw', 'se', 'sw', 'northeast', 'northwest', 'southeast', 'southwest', 'go', 'enter', 'exit', 'climb']);
const META_VERBS = new Set(['inventory', 'i', 'score', 'wait', 'z', 'about', 'help', 'again', 'g']);

/** The kind of a command, from the turn's result first and its first word second. */
function kindOf(command, result) {
  const events = result?.events ?? [];
  if (result?.success === false || events.some((event) => /blocked|command\.failed|parse/.test(event.type))) return 'refused or unparsed';
  const verb = command.trim().split(/\s+/)[0].toLowerCase();
  if (DIRECTIONS.has(verb)) return 'movement';
  if (READ_ONLY_VERBS.has(verb) && !META_VERBS.has(verb)) return 'look and examine';
  if (META_VERBS.has(verb)) return 'meta';
  return 'manipulation';
}

async function modePrimitives(storyDir) {
  const story = readStory(storyDir);
  const time = (fn) => { const started = performance.now(); const value = fn(); return [performance.now() - started, value]; };
  const timeAsync = async (fn) => { const started = performance.now(); const value = await fn(); return [performance.now() - started, value]; };

  const compileMs = [];
  for (let i = 0; i < 5; i++) compileMs.push(time(() => authorGame.compileChordStory(story.storyFile))[0]);
  const bootMs = [];
  let game;
  for (let i = 0; i < 5; i++) { const [ms, loaded] = await timeAsync(() => authorGame.loadAuthorGame(story.dir, { seed: story.seed })); bootMs.push(ms); game = loaded; }

  // The longest line's whole command stream, replayed once on the last boot.
  const longest = [...story.lines].sort((a, b) => (b.prefix.length + b.cards.length) - (a.prefix.length + a.cards.length))[0];
  const stream = longest ? [...longest.prefix, ...commandsOf(longest)] : ['look'];
  const { SaveRestoreService } = dist('engine/dist/session/save-restore-service.js');
  const originalUndo = SaveRestoreService.prototype.createUndoSnapshot;
  let undoMs = 0;
  SaveRestoreService.prototype.createUndoSnapshot = function timed(...args) { const started = performance.now(); try { return originalUndo.apply(this, args); } finally { undoMs += performance.now() - started; } };
  // The player-role scan, timed alone: the counts mode also wraps the trait
  // check the scan calls for every entity, which inflates the scan's share there.
  const { WorldModel } = dist('world-model/dist/index.js');
  const originalScan = WorldModel.prototype.playerRoleHolders;
  let scanMs = 0;
  let scans = 0;
  WorldModel.prototype.playerRoleHolders = function timed(...args) { const started = performance.now(); try { return originalScan.apply(this, args); } finally { scanMs += performance.now() - started; scans++; } };
  const kinds = {};
  let turnMs = 0;
  try {
    for (const command of stream) {
      let result;
      const [ms] = await timeAsync(async () => { try { result = await game.engine.executeTurn(command); } catch { result = { success: false }; } });
      turnMs += ms;
      const kind = (kinds[kindOf(command, result)] ??= { turns: 0, ms: 0 });
      kind.turns++;
      kind.ms += ms;
    }
  } finally { SaveRestoreService.prototype.createUndoSnapshot = originalUndo; WorldModel.prototype.playerRoleHolders = originalScan; }

  const saveMs = [];
  const restoreMs = [];
  const serializeMs = [];
  const parseMs = [];
  let save;
  let json = '';
  for (let i = 0; i < 15; i++) {
    const [saved, payload] = await timeAsync(() => captureSave(game.engine));
    saveMs.push(saved); save = payload;
    restoreMs.push((await timeAsync(() => restoreSave(game.engine, save)))[0]);
    const [serialized, text] = time(() => game.world.toJSON());
    serializeMs.push(serialized); json = text;
    parseMs.push(time(() => JSON.parse(json))[0]);
  }
  return {
    mode: 'primitives', story: path.basename(story.dir),
    entities: game.world.getAllEntities().length,
    compileMs: round(median(compileMs)), bootMs: round(median(bootMs)), bootLessCompileMs: round(median(bootMs) - median(compileMs)),
    turns: stream.length, turnMs: round(turnMs / stream.length), undoSnapshotShare: round(undoMs / turnMs, 3),
    playerRoleScansPerTurn: round(scans / stream.length, 1), playerRoleScanShare: round(scanMs / turnMs, 3),
    turnMsByKind: Object.fromEntries(Object.entries(kinds).map(([kind, value]) => [kind, { turns: value.turns, ms: round(value.ms / value.turns) }])),
    saveMs: round(median(saveMs)), saveBytes: JSON.stringify(save).length, restoreMs: round(median(restoreMs)),
    worldSerializeMs: round(median(serializeMs)), worldBytes: json.length, worldParseMs: round(median(parseMs)),
  };
}

// ----------------------------------------------------------------- equivalence

/**
 * World fields that differ between a restored world and a replayed one
 * without the worlds differing: each is a wall-clock reading.
 */
const VOLATILE_WORLD_FIELDS = [
  { field: 'timestamp', why: 'the command history stamps each row with the wall clock' },
  { field: 'schema', why: 'a capability\'s schema is its shape, not state; and the command history\'s schema default is one array shared by every game in the process (GH #689), so it differs by how many games the process has booted' },
];

/**
 * Capabilities left out of the comparison whole, each for a named defect and
 * not because the field is harmless.
 */
const VOLATILE_CAPABILITIES = [
  { name: 'commandHistory', why: 'GH #689: every world in a process shares one history array until a restore gives a world its own, so a freshly booted game already holds the commands of the games booted before it. The replayed side is the wrong one here, not the restored side.' },
];

function comparableWorld(world) {
  const snapshot = JSON.parse(world.toJSON());
  snapshot.capabilities = (snapshot.capabilities ?? []).filter((capability) => !VOLATILE_CAPABILITIES.some((entry) => entry.name === capability.name));
  return snapshot;
}

function flatten(value, prefix, out) {
  if (value === null || typeof value !== 'object') { out.set(prefix, JSON.stringify(value)); return out; }
  const keys = Array.isArray(value) ? value.map((_, index) => index) : Object.keys(value).sort();
  for (const key of keys) {
    if (VOLATILE_WORLD_FIELDS.some((entry) => entry.field === key)) continue;
    flatten(value[key], `${prefix}/${key}`, out);
  }
  return out;
}

function worldDifferences(a, b) {
  const left = flatten(comparableWorld(a), '', new Map());
  const right = flatten(comparableWorld(b), '', new Map());
  const out = [];
  for (const key of new Set([...left.keys(), ...right.keys()])) if (left.get(key) !== right.get(key)) out.push(`${key}: replayed ${left.get(key)} / restored ${right.get(key)}`);
  return out;
}

const eventTrace = (result) => (result?.events ?? []).map((event) => `${event.type}|${event.data?.messageId ?? ''}`).join(',');

async function modeEquivalence(storyDir, turnsAfter = 25) {
  const story = readStory(storyDir);
  const byId = new Map(story.lines.map((line) => [line.id, line]));
  const boot = () => authorGame.loadAuthorGame(story.dir, { seed: story.seed });
  const play = async (game, commands) => { for (const command of commands) { try { await game.engine.executeTurn(command); } catch { /* a refused turn is still a turn */ } } };
  const forks = [];
  for (const line of story.lines) {
    if (line.parentId === undefined) continue;
    const parent = byId.get(line.parentId);
    // Replayed: a fresh boot plays the prefix. Restored: one game plays the
    // prefix, saves, plays on down the parent line, and is restored.
    const replayed = await boot();
    await play(replayed, line.prefix);
    const restored = await boot();
    await play(restored, line.prefix);
    const save = await captureSave(restored.engine);
    // What it plays on with: the parent line's cards after the fork and, so
    // that the world always moves before the restore, the branch's own opening.
    const afterFork = parent.cards.slice((line.forkIndex ?? 0) + 1).map((card) => card.command).filter((command) => typeof command === 'string');
    const onward = [...afterFork, ...commandsOf(line)].slice(0, turnsAfter);
    await play(restored, onward);
    const ok = await restoreSave(restored.engine, save);
    const differences = ok ? worldDifferences(replayed.world, restored.world) : ['the restore was refused'];
    const next = commandsOf(line).slice(0, turnsAfter);
    let turnsCompared = 0;
    for (const command of next) {
      let a; let b;
      try { a = await replayed.engine.executeTurn(command); } catch { a = undefined; }
      try { b = await restored.engine.executeTurn(command); } catch { b = undefined; }
      turnsCompared++;
      if (eventTrace(a) !== eventTrace(b)) { differences.push(`turn ${turnsCompared} "${command}": events differ`); break; }
    }
    if (differences.length === 0) differences.push(...worldDifferences(replayed.world, restored.world).map((difference) => `after ${turnsCompared} turns — ${difference}`));
    forks.push({ line: line.id, prefix: line.prefix.length, playedOnBeforeRestore: onward.length, turnsCompared, equivalent: differences.length === 0, differences: differences.slice(0, 8), differenceCount: differences.length });
  }
  return {
    mode: 'equivalence', story: path.basename(story.dir), volatileFields: VOLATILE_WORLD_FIELDS, volatileCapabilities: VOLATILE_CAPABILITIES,
    forks: forks.length, equivalent: forks.filter((fork) => fork.equivalent).length,
    different: forks.filter((fork) => !fork.equivalent),
  };
}

// ------------------------------------------------------------------ self-check

async function modeSelfCheck() {
  const ferry = path.join(REPO, 'test-stories/ferry');
  const honest = await modeCounts(ferry);
  const boots = (result) => Object.values(result.tiers).reduce((total, tier) => total + (tier.boots?.calls ?? 0), 0);
  // The defect: a loader that boots every game twice and hands back the second.
  const original = authorGame.loadAuthorGame;
  authorGame.loadAuthorGame = async function doubled(...args) { await original.apply(this, args); return original.apply(this, args); };
  let doubled;
  try { doubled = await modeCounts(ferry); } finally { authorGame.loadAuthorGame = original; }
  const detected = boots(doubled) === 2 * boots(honest) && boots(honest) > 0;
  return { mode: 'self-check', story: 'ferry', honestBoots: boots(honest), doubledLoaderBoots: boots(doubled), detected, exit: detected ? 1 : 2 };
}

// ------------------------------------------------------------------------ main

const args = process.argv.slice(2);
const valueOf = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const modes = {
  '--run': () => modeRun(valueOf('--run'), valueOf('--digest')),
  '--counts': () => modeCounts(valueOf('--counts')),
  '--primitives': () => modePrimitives(valueOf('--primitives')),
  '--equivalence': () => modeEquivalence(valueOf('--equivalence')),
  '--self-check': () => modeSelfCheck(),
};
const mode = Object.keys(modes).find((flag) => args.includes(flag));
if (!mode) {
  console.error('usage: survey-test-run.mjs --run <story> [--digest <file>] | --counts <story> | --primitives <story> | --equivalence <story> | --self-check');
  process.exit(64);
}
const result = await modes[mode]();
console.log(JSON.stringify(result, null, 2));
process.exit(result.mode === 'self-check' ? result.exit : result.mode === 'equivalence' && result.different.length > 0 ? 1 : 0);
