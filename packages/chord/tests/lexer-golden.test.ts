/**
 * lexer-golden.test.ts — ADR-258 D7: the committed golden token stream that
 * pins `lexer.ts` for the Swift `ChordLexer` port.
 *
 * The corpus (`tests/fixtures/lexer-golden/*.story`) covers the shipped
 * Chord 2.0.0 surface the D7 amendment names; the golden file
 * (`lexer-golden.json`) records `lex()`'s exact `Line[]` output per corpus
 * file. A `lexer.ts` change that alters the stream turns this test red in
 * the CI that exists today — REGENERATE THE GOLDEN deliberately
 * (`UPDATE_GOLDEN=1 pnpm --filter @sharpee/chord test:ci lexer-golden`,
 * or the `golden:lexer` package script) and update the Swift port to match:
 * the golden artifact is the thing both lexers agree on.
 *
 * Owner context: @sharpee/chord test suite.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lex, type Line } from '../src/lexer.js';
import { DiagnosticBag } from '../src/diagnostics.js';

const FIXTURE_DIR = join(__dirname, 'fixtures', 'lexer-golden');
const GOLDEN_PATH = join(FIXTURE_DIR, 'lexer-golden.json');

/** Corpus files, sorted for a deterministic golden layout. */
function corpusFiles(): string[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.story'))
    .sort();
}

/** Lex one corpus file, asserting the corpus itself is lex-clean. */
function lexCorpusFile(name: string): Line[] {
  const bag = new DiagnosticBag();
  const lines = lex(readFileSync(join(FIXTURE_DIR, name), 'utf-8'), bag);
  expect(bag.all(), `corpus file ${name} must lex clean — the golden pins tokens, not errors`).toEqual([]);
  return lines;
}

function currentGolden(): Record<string, Line[]> {
  const golden: Record<string, Line[]> = {};
  for (const name of corpusFiles()) golden[name] = lexCorpusFile(name);
  return golden;
}

describe('ADR-258 D7 — lexer golden conformance pin', () => {
  it('the committed golden matches lex() exactly (regenerate with UPDATE_GOLDEN=1 on deliberate lexer changes)', () => {
    const fresh = currentGolden();
    if (process.env.UPDATE_GOLDEN === '1') {
      writeFileSync(GOLDEN_PATH, JSON.stringify(fresh, null, 2) + '\n');
      return;
    }
    const committed: unknown = JSON.parse(readFileSync(GOLDEN_PATH, 'utf-8'));
    expect(
      fresh,
      'lexer.ts output drifted from the committed golden. If the change is deliberate, ' +
        'regenerate (UPDATE_GOLDEN=1) and update the Swift ChordLexer port against the new golden (ADR-258 D7).'
    ).toEqual(committed);
  });

  it('the corpus covers every construct the D7 amendment names (drift guard on the fixture set)', () => {
    const sources = corpusFiles().map((f) => readFileSync(join(FIXTURE_DIR, f), 'utf-8'));
    const all = sources.join('\n');
    const constructs: Record<string, RegExp> = {
      'grammar header': /^grammar "/m,
      'slot spellings': /\bthe (target|item|container|recipient)\b/,
      'or-alternation': /\b(in or inside|with or using)\b/,
      'optional words': /\[(carefully|around)\]/,
      'typed slot: topic': /^ {2}the topic is a topic$/m,
      'typed slot: instrument': /^ {2}the tool is an instrument$/m,
      means: /^ {6}means position /m,
      'directions (compass)': /^ {4}north or n$/m,
      'directions (non-compass)': /^ {4}port or p$/m,
      'extend action': /^extend action /m,
      'remove from action': /^remove from action /m,
      'counter comparison (symbolic)': />=|<=|< \d|> \d/,
      'counter comparison (word)': /\bis at least\b/,
    };
    for (const [construct, pattern] of Object.entries(constructs)) {
      expect(pattern.test(all), `corpus no longer exercises: ${construct}`).toBe(true);
    }
    // And the interesting token kinds actually appear in the golden stream —
    // coverage of the OUTPUT, not just the input text.
    const kinds = new Set(
      Object.values(currentGolden())
        .flat()
        .flatMap((line) => line.tokens.map((t) => t.kind))
    );
    for (const kind of ['word', 'number', 'string', 'colon', 'comma', 'lbracket', 'rbracket', 'lbrace', 'rbrace', 'compare', 'punct'] as const) {
      expect(kinds.has(kind), `golden stream carries no '${kind}' token`).toBe(true);
    }
  });
});
