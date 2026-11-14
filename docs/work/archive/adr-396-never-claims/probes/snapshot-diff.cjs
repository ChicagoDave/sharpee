#!/usr/bin/env node
/**
 * snapshot-diff.cjs — which parts of the world snapshot change from one turn
 * to the next (ADR-396 Context; GH #717).
 *
 * Boots a Chord story the way `sharpee test` does, plays the commands given,
 * and prints every snapshot key whose value differs after each one. A key
 * that changes on every turn makes every turn a new state to the claims
 * walk, unless `IDENTITY_IGNORES` names it.
 *
 * Reads the BUILT devkit package (`./repokit build` first).
 *
 * Usage:
 *   node docs/work/adr-396-never-claims/probes/snapshot-diff.cjs <story.story> "<command>" ["<command>" ...]
 *
 * Owner context: ADR-396 evidence. Not a test and not run by any gate.
 */
const path = require('node:path');

const repo = path.resolve(__dirname, '..', '..', '..', '..');
const { loadAuthorGame } = require(path.join(repo, 'packages', 'devkit', 'dist', 'standalone', 'author-game.js'));

/** Flatten a snapshot to `path -> JSON`, keying array rows by id or name where they have one. */
function flatten(value, prefix, out) {
  if (value === null || typeof value !== 'object') {
    out[prefix] = JSON.stringify(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const key = item && typeof item === 'object' && (item.id || item.name) ? `${prefix}[${item.id || item.name}]` : `${prefix}[${index}]`;
      flatten(item, key, out);
    });
    return;
  }
  for (const key of Object.keys(value)) flatten(value[key], `${prefix}.${key}`, out);
}

(async () => {
  const [story, ...commands] = process.argv.slice(2);
  if (!story || commands.length === 0) {
    console.error('usage: snapshot-diff.cjs <story.story> "<command>" ["<command>" ...]');
    process.exit(2);
  }
  const game = await loadAuthorGame(story, { seed: 42, undoSnapshots: 0 });
  await game.executeCommand('look');
  let before = {};
  flatten(JSON.parse(game.world.toJSON()), '', before);
  for (const command of commands) {
    await game.executeCommand(command);
    const after = {};
    flatten(JSON.parse(game.world.toJSON()), '', after);
    console.log(`== after "${command}"`);
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (before[key] !== after[key]) console.log(`  ${key}: ${String(before[key]).slice(0, 60)} -> ${String(after[key]).slice(0, 60)}`);
    }
    before = after;
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
