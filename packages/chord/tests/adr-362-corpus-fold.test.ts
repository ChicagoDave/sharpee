/**
 * adr-362-corpus-fold.test.ts — ADR-362 AC-1: folding is parsing only.
 *
 * Every corpus story is compiled as written and after a mechanical fold (D1
 * on every `create` block whose kind line can move onto the head, D2 on every
 * block with two or more exit lines, fragments included), and the two IRs
 * are identical apart from spans, with each room's exits compared as a set
 * keyed by direction (an `exits:` line and an `exits, one-way:` line can
 * reorder a room's mixed exits, and exit order carries no meaning). The
 * diagnostics' codes must match too, so a story that does not compile today
 * still proves the fold changed nothing.
 *
 * One IR value is a span in disguise: the analyzer names an inline
 * `kill the player` phrase `death-at-<file>-<line>-<column>`
 * (`inlineKillKey`, analyzer.ts), so a fold that removes a line above it
 * moves the key. The comparison blanks the line part of that key, where it
 * is used and where the phrases table declares it; two inline deaths in one
 * file at the same column would alias, and none do today.
 *
 * The corpus is read from the repository at test time; a story missing from
 * a checkout is skipped, never faked. The fold is textual and deliberately
 * naive: it is the guard, not a tool.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const REPO = resolve(__dirname, '..', '..', '..');

const CORPUS = [
  'branch-stories/fernhill/fernhill.story',
  'branch-stories/ides-of-march/ides-of-march.story',
  'branch-stories/secret-letter/secret-letter.story',
  'branch-stories/upps/upps.story',
  'stories/cloak-of-darkness/cloak.story',
  'stories/counter-demo/counter-demo.story',
  'stories/friendly-zoo/zoo.story',
  'stories/grammar-alterations/grammar-alterations.story',
  'stories/hunger-demo/hunger-demo.story',
  'stories/nautical/nautical.story',
  'stories/presence-test/presence-test.story',
  'stories/thealderman/chord/thealderman.story',
  'stories/character-acceptance/chord/character-acceptance.story',
  'packages/chord/tests/fixtures/maze-sixteen.story',
];

const DIRECTIONS = 'north|south|east|west|northeast|northwest|southeast|southwest|up|down';
const KIND_LINE = /^(\s+)(an? (?:thing|room|door|person|container|supporter|region)\b.*)$/;
const EXIT_LINE = new RegExp(`^(\\s+)(${DIRECTIONS}) to (.+?)(, one-way)?\\s*$`);

interface Folded {
  text: string;
  heads: number;
  exitLines: number;
}

/** Fold one source text: the kind line onto each head, exit lines onto `exits:` lines. */
function fold(text: string): Folded {
  const lines = text.split('\n');
  const out: string[] = [];
  let heads = 0;
  let exitLines = 0;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!/^create /.test(line) || line.includes(',')) {
      out.push(line);
      i++;
      continue;
    }
    let j = i + 1;
    while (j < lines.length && (lines[j] === '' || /^\s/.test(lines[j]))) j++;
    const body = lines.slice(i + 1, j);

    let head = line;
    const firstBlank = body.indexOf('');
    const preBlank = firstBlank === -1 ? body.length : firstBlank;
    const kindIndex = body.findIndex((l, k) => k < preBlank && KIND_LINE.test(l));
    if (kindIndex !== -1) {
      head = `${line}, ${body[kindIndex].trim()}`;
      body.splice(kindIndex, 1);
      heads++;
    }

    // Only the structural lines before the block's first blank: a prose
    // paragraph can continue `north to Lord's Keep, a mile or so…`.
    const structural = body.indexOf('') === -1 ? body.length : body.indexOf('');
    const exitIndexes = body.map((l, k) => (k < structural && EXIT_LINE.test(l) ? k : -1)).filter((k) => k !== -1);
    if (exitIndexes.length >= 2) {
      const plain: string[] = [];
      const oneWay: string[] = [];
      for (const k of exitIndexes) {
        const m = EXIT_LINE.exec(body[k])!;
        (m[4] ? oneWay : plain).push(`${m[2]} to ${m[3]}`);
      }
      const indent = /^\s+/.exec(body[exitIndexes[0]])![0];
      const folded: string[] = [];
      if (plain.length) folded.push(`${indent}exits: ${plain.join(', ')}`);
      if (oneWay.length) folded.push(`${indent}exits, one-way: ${oneWay.join(', ')}`);
      const rebuilt: string[] = [];
      body.forEach((l, k) => {
        if (k === exitIndexes[0]) rebuilt.push(...folded);
        else if (!exitIndexes.includes(k)) rebuilt.push(l);
      });
      body.splice(0, body.length, ...rebuilt);
      exitLines++;
    }
    out.push(head, ...body);
    i = j;
  }
  return { text: out.join('\n'), heads, exitLines };
}

const INLINE_KILL_KEY = /^death-at-(.*?)(\d+)-(\d+)$/;

/** A `death-at-<file>-<line>-<column>` key with its line blanked; anything else unchanged. */
const stableKey = (s: string): string => s.replace(INLINE_KILL_KEY, 'death-at-$1*-$3');

/** The IR with every span removed, inline-kill keys line-blanked, and each entity's exits as a sorted set. */
function comparable(value: unknown): unknown {
  if (typeof value === 'string') return stableKey(value);
  if (Array.isArray(value)) return value.map(comparable);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'span') continue;
      const k = stableKey(key);
      if (k === 'exits' && Array.isArray(v)) {
        out[k] = (v as Array<Record<string, unknown>>)
          .map((e) => comparable(e) as Record<string, unknown>)
          .sort((a, b) => JSON.stringify([a.direction, a.to, a.via]).localeCompare(JSON.stringify([b.direction, b.to, b.via])));
        continue;
      }
      out[k] = comparable(v);
    }
    return out;
  }
  return value;
}

describe('ADR-362 AC-1 — a folded corpus compiles to the same IR', () => {
  const present = CORPUS.filter((p) => existsSync(join(REPO, p)));
  const totals = { heads: 0, exitLines: 0 };

  for (const relative of CORPUS) {
    const path = join(REPO, relative);
    it.skipIf(!existsSync(path))(`${relative}: identical IR apart from spans, exits as a set`, () => {
      const dir = dirname(path);
      const original = compile(readFileSync(path, 'utf8'), {
        importResolver: (name) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), 'utf8') : null),
      });
      const main = fold(readFileSync(path, 'utf8'));
      let heads = main.heads;
      let exitLines = main.exitLines;
      const folded = compile(main.text, {
        importResolver: (name) => {
          if (!existsSync(join(dir, name))) return null;
          const fragment = fold(readFileSync(join(dir, name), 'utf8'));
          heads += fragment.heads;
          exitLines += fragment.exitLines;
          return fragment.text;
        },
      });
      totals.heads += heads;
      totals.exitLines += exitLines;

      expect(folded.diagnostics.map((d) => d.code).sort()).toEqual(original.diagnostics.map((d) => d.code).sort());
      expect(comparable(folded.ir)).toEqual(comparable(original.ir));
      expect(heads, 'the fold moved at least one kind line').toBeGreaterThan(0);
    });
  }

  it('the fold exercised both forms across the corpus', () => {
    expect(present.length).toBeGreaterThan(0);
    expect(totals.heads).toBeGreaterThan(0);
    expect(totals.exitLines, 'at least one block had two or more exit lines to fold').toBeGreaterThan(0);
  });
});
