#!/usr/bin/env node
/**
 * scripts/make-story-artifacts.mjs — generate a story's recorded test tree and
 * its old-school walkthrough FROM A REAL RUN of the shipped bundle.
 *
 * Public interface:
 *   node scripts/make-story-artifacts.mjs <recipe.json> [--tests-out <path>] [--walkthrough-out <path>]
 *
 * WHY THIS EXISTS, AND WHY IT GENERATES RATHER THAN TRANSCRIBES. Both artifacts
 * quote the game's prose, and prose that is hand-copied goes stale the moment a
 * phrase is edited — the same hand-maintained-duplicate failure that has bitten
 * this repo repeatedly (version strings in the docs, `chord.ebnf` in two places).
 * Everything here is driven through `dist/cli/sharpee.js --exec` and captured
 * from stdout: an assertion that is not in the real transcript cannot appear in
 * the output, and regenerating is the fix for any drift.
 *
 * The tests document is a TREE (ADR-302 shape, the same one Chord Writer's
 * Testing tab records): a spine of `turn` cards under an `opening`/`boot` pair,
 * where a card may carry `branches` — alternate continuations replayed from that
 * point. Branch prefixes are re-run from the beginning rather than forked in
 * memory, because the engine's state is the authority on what a branch sees.
 *
 * Recipe shape:
 *   {
 *     "story":  "branch-stories/fernhill/fernhill.story",
 *     "id":     "fernhill",           // the tests document's `story` field
 *     "title":  "The Folly at Fernhill",
 *     "seed":   42,
 *     "spine":  ["north", "…"],       // the winning path, in order
 *     "branches": [                    // optional, each replayed from `after`
 *       { "after": 3, "commands": ["west"], "note": "the greenhouse" }
 *     ]
 *   }
 *
 * Owner context: repo-root tooling; drives the built bundle, writes into the
 * story's own directory.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = resolve(REPO, 'dist/cli/sharpee.js');

/** Drive the real engine and split stdout into [{command, output}]. */
function run(story, commands, seed) {
  const stdout = execFileSync(
    'node',
    [BUNDLE, '--exec', commands.join('/'), '--story', story, '--seed', String(seed)],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  const blocks = [];
  let current = null;
  let buffer = [];
  for (const line of stdout.split('\n')) {
    const m = /^> (.*)$/.exec(line);
    if (m) {
      if (current !== null) blocks.push({ command: current, output: buffer.join('\n').trim() });
      current = m[1];
      buffer = [];
    } else if (current !== null) {
      buffer.push(line);
    }
  }
  if (current !== null) blocks.push({ command: current, output: buffer.join('\n').trim() });
  return blocks;
}

/**
 * The banner (title / version / description / `By …`) precedes the first
 * command's own output. Boot asserts the opening ROOM, so split them apart.
 */
function splitBanner(text) {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => l.startsWith('By '));
  if (i === -1) return { banner: '', body: text };
  return { banner: lines.slice(0, i + 1).join('\n').trim(), body: lines.slice(i + 1).join('\n').trim() };
}

/**
 * Lines that recur across the run are AMBIENT — `on every turn` atmosphere and
 * scheduled sequence beats ("the church bell counts another quarter hour").
 * They fire on turn position, not on the command, so a branch that reaches the
 * same move at a different turn count sees a different one. Asserting them
 * makes a card fail for a reason that has nothing to do with what it tests, so
 * they are excluded by frequency rather than by pattern-matching prose.
 */
function ambientLines(blocks) {
  const seen = new Map();
  const leads = new Set();
  for (const b of blocks) {
    const lines = b.output.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) leads.add(lines[0]);
    for (const line of new Set(lines)) seen.set(line, (seen.get(line) ?? 0) + 1);
  }
  // Recurring AND never the primary response. A room heading recurs too — you
  // walk back through rooms — but it always leads its turn, so the lead-line
  // exemption keeps headings assertable while still dropping atmosphere.
  return new Set([...seen].filter(([l, n]) => n > 1 && !leads.has(l)).map(([l]) => l));
}

/**
 * Assertion strings for one turn: the heading line plus the longest remaining
 * sentence. Selective on purpose — asserting the whole output would pin every
 * incidental line and turn any prose edit into a test failure.
 */
function salient(text, ambient = new Set()) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  // Every command card must carry an assertion (ADR-294 D2), so if the ambient
  // filter would leave nothing, keep the primary response line regardless.
  const usable = lines.filter((l) => !ambient.has(l));
  const pool = usable.length > 0 ? usable : lines.slice(0, 1);
  if (pool.length === 0) return [];
  const picks = [pool[0]];
  const rest = pool.slice(1).filter((l) => l.length > 40);
  if (rest.length > 0) picks.push(rest.reduce((a, b) => (b.length > a.length ? b : a)));
  return picks;
}

function turnCard(command, output, ambient) {
  const a = salient(output, ambient);
  return { ...(a.length > 0 ? { assertions: { contains: a } } : { assertions: {} }), command, type: 'turn' };
}

function buildTests(recipe) {
  const { story, seed, spine } = recipe;
  // A leading `look` captures the STARTING room, which is what the boot card
  // asserts — the first spine move has usually left it already. The probe is
  // not emitted as a card; the runner supplies boot itself.
  const probed = run(story, ['look', ...spine], seed);
  const { body } = splitBanner(probed[0].output);
  const blocks = probed.slice(1);

  // Branches replay the spine prefix for real, then diverge. Replaying rather
  // than forking in memory keeps the engine the authority on what a branch sees.
  const branchRuns = (recipe.branches ?? []).map((branch) => {
    const prefix = spine.slice(0, branch.after + 1);
    const replayed = run(story, [...prefix, ...branch.commands], seed);
    return { branch, tail: replayed.slice(prefix.length), all: replayed };
  });

  // Ambient is judged across EVERY run, not per run. A short branch may see an
  // atmospheric line only once, which would let it escape a per-run filter and
  // then fail on replay at a different turn count.
  const ambient = ambientLines([...probed, ...branchRuns.flatMap((r) => r.all)]);

  const cards = [
    { assertions: {}, type: 'opening' },
    { assertions: { contains: salient(body, ambient) }, type: 'boot' },
    ...blocks.map((b) => turnCard(b.command, b.output, ambient)),
  ];

  for (const { branch, tail } of branchRuns) {
    // +2 for the opening/boot pair that precedes the spine's first turn card.
    const host = cards[branch.after + 2];
    host.branches ??= [];
    host.branches.push({
      branch: host.branches.length + 1,
      cards: tail.map((b) => turnCard(b.command, b.output, ambient)),
    });
  }

  return { cards, seed, story: recipe.id, version: 1 };
}

function buildWalkthrough(recipe) {
  const { story, seed, spine, title } = recipe;
  // Same `look` probe as buildTests: without it the opening room would be
  // printed above the first command, when it is that command's RESULT.
  const probed = run(story, ['look', ...spine], seed);
  const { banner, body } = splitBanner(probed[0].output);
  const blocks = probed.slice(1);

  const out = [];
  out.push(`${title} — walkthrough`);
  out.push('='.repeat(`${title} — walkthrough`.length));
  out.push('');
  out.push('A complete playthrough to the winning ending, with every response the');
  out.push(`game gives. Generated from a real run at seed ${seed}; regenerate with`);
  out.push('scripts/make-story-artifacts.mjs rather than editing by hand.');
  out.push('');
  out.push('SPOILERS: this is the whole story, start to finish.');
  out.push('');
  out.push('-'.repeat(72));
  out.push('');
  if (banner) out.push(banner, '');
  out.push(body, '');
  for (const b of blocks) {
    out.push(`> ${b.command}`);
    out.push('');
    out.push(b.output);
    out.push('');
  }
  return out.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n') + '\n';
}

const recipePath = process.argv[2];
if (!recipePath) {
  console.error('usage: make-story-artifacts.mjs <recipe.json> [--tests-out <p>] [--walkthrough-out <p>]');
  process.exit(2);
}
const recipe = JSON.parse(readFileSync(recipePath, 'utf8'));
const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};

const testsOut = arg('--tests-out');
if (testsOut) {
  const doc = buildTests(recipe);
  writeFileSync(testsOut, JSON.stringify(doc, null, 2) + '\n');
  const branches = doc.cards.reduce((n, c) => n + (c.branches?.length ?? 0), 0);
  console.log(`tests:       ${testsOut} — ${doc.cards.length} cards, ${branches} branch(es)`);
}

const walkOut = arg('--walkthrough-out');
if (walkOut) {
  writeFileSync(walkOut, buildWalkthrough(recipe));
  console.log(`walkthrough: ${walkOut} — ${recipe.spine.length} moves`);
}
