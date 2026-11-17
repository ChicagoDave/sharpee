#!/usr/bin/env node
/**
 * verify.mjs — runtime verification harness for the stdlib cookbook
 * (docs/reference/stdlib-cookbook.md).
 *
 * Purpose: prove every worked example in the cookbook is genuine engine
 * output, not invented text. Where chord-language-reference's
 * verify-examples.mjs proves fixtures *compile*, this harness goes further:
 * it compiles each fixture with @sharpee/chord, loads it through
 * @sharpee/story-loader + @sharpee/bootstrap (the same path `sharpee
 * compose` and the CLI bundle use), REPLAYS every `> command` line of every
 * transcript fence against the running engine, and diffs the doc's shown
 * output against what the engine actually said.
 *
 * Public interface:
 *   node verify.mjs                      — verify the doc (both directions:
 *                                          story fences are verbatim fixture
 *                                          excerpts; transcript fences replay
 *                                          byte-identically)
 *   node verify.mjs --run <fixture> cmd… — author mode: run commands against
 *                                          one fixture and print the engine's
 *                                          real output (used to CAPTURE the
 *                                          transcripts that go in the doc)
 *
 * Doc conventions (mirrors chord-language-reference):
 *   ```story fences are preceded by  <!-- fixture: <relpath> -->  and must be
 *   verbatim excerpts of that fixture (uniform indent shift allowed).
 *   ```transcript fences are preceded by  <!-- transcript: <relpath> -->  and
 *   replay against a FRESH load of that fixture, seeded (seed 1) so Chord's
 *   own random stream is stable. Lines starting with `> ` are commands; the
 *   lines below each command (until the next `>` or fence end) are the
 *   expected output.
 *
 * RNG tolerance: fixtures/manifest.json may map "<relpath>" →
 *   { "anyOf": { "<command>": ["alt output", …] } } for commands whose
 *   stdlib outcome rolls unseeded dice (throwing). The doc shows one genuine
 *   captured run; verification accepts the enumerated alternatives — the
 *   transcript-logic-gate remedy, never a disabled RNG.
 *
 * Owner context: docs tooling (stdlib-cookbook work target); reads built
 * platform packages, never modifies them.
 */
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const require = createRequire(import.meta.url);

const chordDist = path.join(repoRoot, 'packages', 'chord', 'dist', 'index.js');
const loaderDist = path.join(repoRoot, 'packages', 'story-loader', 'dist', 'index.js');
const bootstrapDist = path.join(repoRoot, 'packages', 'bootstrap', 'dist', 'index.js');
for (const dist of [chordDist, loaderDist, bootstrapDist]) {
  if (!existsSync(dist)) {
    console.error(`verify: built package not found at ${dist} — build the platform first (./repokit build).`);
    process.exit(2);
  }
}
const { compile } = require(chordDist);
const { createStory } = require(loaderDist);
const { assembleGame } = require(bootstrapDist);

const fixturesDir = path.join(here, 'fixtures');
const docPath = path.join(repoRoot, 'docs', 'reference', 'stdlib-cookbook.md');
const manifestPath = path.join(fixturesDir, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf-8')) : {};

/** Compile + load a fixture into a runnable game (fresh world, seeded). */
async function loadFixture(rel) {
  const source = readFileSync(path.join(fixturesDir, rel), 'utf-8');
  const result = compile(source);
  if (!result.ok) {
    const lines = result.diagnostics.map((d) => `  ${rel}:${d.span.line}:${d.span.column} ${d.severity} [${d.code}] ${d.message}`);
    throw new Error(`fixture ${rel} does not compile:\n${lines.join('\n')}`);
  }
  const story = createStory(result.ir, { seed: 1 });
  const game = assembleGame(story);
  // Absorb the story banner + opening room description (the CLI's --play does
  // the same priming look before its REPL) so transcripts start at a prompt.
  await game.executeCommand('look');
  return game;
}

// ---------------------------------------------------------------- author mode
if (process.argv[2] === '--run') {
  const rel = process.argv[3];
  const commands = process.argv.slice(4);
  const game = await loadFixture(rel);
  for (const command of commands) {
    const output = await game.executeCommand(command);
    console.log(`> ${command}`);
    console.log(output.trimEnd());
    console.log();
  }
  process.exit(0);
}

// ---------------------------------------------------------------- verify mode
if (!existsSync(docPath)) {
  console.error(`verify: doc not found at ${docPath}`);
  process.exit(2);
}
const docLines = readFileSync(docPath, 'utf-8').split('\n');

/** Strip the common leading whitespace shared by every non-blank line. */
function dedent(lines) {
  const indents = lines.filter((l) => l.trim() !== '').map((l) => l.match(/^\s*/)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n');
}

/** True iff `block` (array of lines) is a contiguous run of `source`, up to a uniform indent shift. */
function isExcerpt(block, source) {
  const src = source.split('\n');
  const needle = dedent(block);
  for (let i = 0; i + block.length <= src.length; i++) {
    if (dedent(src.slice(i, i + block.length)) === needle) return true;
  }
  return false;
}

/** Parse a transcript fence body into [{ command, expected }] pairs. */
function parseTranscript(lines) {
  const pairs = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith('> ')) {
      if (current) pairs.push(current);
      current = { command: line.slice(2).trim(), expected: [] };
    } else if (current) {
      current.expected.push(line);
    }
  }
  if (current) pairs.push(current);
  for (const pair of pairs) {
    while (pair.expected.length && pair.expected[0].trim() === '') pair.expected.shift();
    while (pair.expected.length && pair.expected[pair.expected.length - 1].trim() === '') pair.expected.pop();
  }
  return pairs;
}

const failures = [];
let storyBlocks = 0;
let transcriptBlocks = 0;
let commandsReplayed = 0;
const cited = new Set();

for (let i = 0; i < docLines.length; i++) {
  const fence = docLines[i].trim();
  if (fence !== '```story' && fence !== '```transcript') continue;
  const kind = fence === '```story' ? 'story' : 'transcript';
  const markerRe = kind === 'story' ? /^<!-- fixture: (.+?) -->$/ : /^<!-- transcript: (.+?) -->$/;
  const marker = i > 0 ? docLines[i - 1].trim().match(markerRe) : null;
  const start = i + 1;
  let end = start;
  while (end < docLines.length && docLines[end].trim() !== '```') end++;
  const block = docLines.slice(start, end);
  i = end;

  if (!marker) {
    failures.push(`doc:${start}: ${kind} fence has no <!-- ${kind === 'story' ? 'fixture' : 'transcript'}: … --> marker directly above it`);
    continue;
  }
  const rel = marker[1];
  cited.add(rel);
  const fixturePath = path.join(fixturesDir, rel);
  if (!existsSync(fixturePath)) {
    failures.push(`doc:${start}: marker names missing fixture ${rel}`);
    continue;
  }

  if (kind === 'story') {
    storyBlocks++;
    if (!isExcerpt(block, readFileSync(fixturePath, 'utf-8'))) {
      failures.push(`doc:${start}: story block is not a verbatim excerpt of ${rel} (drift)`);
    }
    continue;
  }

  transcriptBlocks++;
  const pairs = parseTranscript(block);
  if (pairs.length === 0) {
    failures.push(`doc:${start}: transcript fence contains no > commands`);
    continue;
  }
  let game;
  try {
    game = await loadFixture(rel);
  } catch (error) {
    failures.push(String(error.message ?? error));
    continue;
  }
  const anyOf = manifest[rel]?.anyOf ?? {};
  for (const pair of pairs) {
    commandsReplayed++;
    const actual = (await game.executeCommand(pair.command)).trimEnd();
    const expected = pair.expected.join('\n').trimEnd();
    if (actual === expected) continue;
    const alternatives = anyOf[pair.command] ?? [];
    if (alternatives.some((alt) => alt.trimEnd() === actual)) continue;
    failures.push(
      `doc transcript (${rel}) \`> ${pair.command}\`:\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
    );
  }
}

console.log(`story fences: ${storyBlocks} (verbatim-checked)`);
console.log(`transcript fences: ${transcriptBlocks} (${commandsReplayed} commands replayed against the engine)`);
if (failures.length) {
  console.error(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('\nOK — every story fence is a verbatim fixture excerpt; every transcript line is genuine engine output.');
