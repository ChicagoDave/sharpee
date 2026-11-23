/**
 * nouns.test.ts — the English noun extractor (ADR-407 D3, D4, D8).
 *
 * Every case runs through the real `compromise`, never a stub. The heuristic
 * cases are the extractor-level D6b and D16 cases that lived in
 * `packages/world-index/tests/incomplete.test.ts`, copied here with the
 * heuristic (ADR-407 D8); world-index's copy goes when its extractor does.
 * The built-subpath cases spawn Node on `dist/` and `dist-esm/`, because the
 * vitest aliases resolve to source and would never exercise the exports map.
 *
 * Owner context: @sharpee/lang-en-us — tests.
 *
 * @see ADR-407 D3, D4, D8, AC-3, AC-4; ADR-321 D6b, D16
 */

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { nounExtractor } from '../src/nouns/index.js';
import { extractHeuristicPhrases, tokenize } from '../src/nouns/heuristic.js';
import { extractTaggedPhrases } from '../src/nouns/tagger.js';

const PACKAGE = join(__dirname, '..');

/** The heuristic's phrases, as the joined words world-index's `phrase` field carried. */
function heuristic(text: string): string[] {
  return extractHeuristicPhrases(text).map((phrase) => phrase.words.join(' '));
}

/** The extractor's candidates, as joined words. */
function union(text: string): string[] {
  return nounExtractor.extract(text).map((candidate) => candidate.words.join(' '));
}

const REFECTORY =
  'Three long tables, each with its row of candles, and a hearth you could stable a horse in. ' +
  'The benches are stacked against the wall, where someone left them for the holidays. ' +
  'The cloister is back to the west.';

/** Passages the superset case reads: the moved D6b cases, the Refectory, and the candles. */
const PASSAGES = [
  REFECTORY,
  'Stubs of tallow in iron prickets down the middle of each table.',
  'The brass key lies on the worn doormat.',
  'A very old cracked leather satchel.',
  'The quiet moment. The far corner. The shape standing.',
  'The brass key. The tin lid.',
  'Someone left the ball here.',
  'The hurricane lamp burns.',
  'The tiring-house door stands west; the yard is south.',
  "The house's first play is chalked on the plot-board.",
  'A broad woman in a leather apron, with a pry bar through her belt.',
];

describe('the heuristic reads noun phrases, not clauses (moved from world-index, ADR-321 D6b)', () => {
  it('starts at an article and stops at a boundary word', () => {
    expect(heuristic('The brass key lies on the worn doormat.')).toEqual(['brass key', 'worn doormat']);
  });

  it('drops a run longer than three words', () => {
    expect(heuristic('A very old cracked leather satchel.')).toEqual([]);
  });

  it('drops a head that is a direction, an abstraction, or a participle', () => {
    expect(heuristic('The quiet moment. The far corner. The shape standing.')).toEqual([]);
  });

  it('keeps a three-letter head — interactive fiction is full of them', () => {
    expect(heuristic('The brass key. The tin lid.')).toEqual(['brass key', 'tin lid']);
  });

  it('stops at a locative rather than heading the phrase on it', () => {
    expect(heuristic('Someone left the ball here.')).toEqual(['ball']);
  });

  it('loses a phrase to a verb the boundary list does not name — the documented limit', () => {
    expect(heuristic('The hurricane lamp burns.')).toEqual(['hurricane lamp burns']);
    expect(heuristic('The hurricane lamp stands.')).toEqual(['hurricane lamp']);
  });

  it('reports each distinct phrase once', () => {
    expect(heuristic('The brass key. The brass key again.')).toEqual(['brass key']);
  });

  it('reads a hyphenated compound as the one word the author wrote (D16)', () => {
    expect(heuristic('The tiring-house door stands west; the yard is south.')).toContain('tiring-house door');
  });

  it('stops a phrase at a possessive rather than naming one (D16)', () => {
    expect(heuristic("The house's first play is chalked on the plot-board.")).not.toContain("house's first play");
  });

  it('records where each phrase starts and ends in the passage', () => {
    const text = 'The brass key lies on the worn doormat.';
    expect(extractHeuristicPhrases(text).map((phrase) => text.slice(phrase.offset, phrase.end))).toEqual([
      'brass key',
      'worn doormat',
    ]);
  });
});

describe('tokenize is the one English tokenizer (ADR-321 D16, ADR-407 Amendment 1)', () => {
  it('keeps a hyphenated compound whole and keeps a possessive as its own word', () => {
    expect(tokenize("The tiring-house door; the house's play.")).toEqual([
      'the',
      'tiring-house',
      'door',
      'the',
      "house's",
      'play',
    ]);
  });

  it('ends a run at a possessive, so the head after it is read and the owner is not', () => {
    const words = union("The house's first play is chalked on the plot-board.");
    expect(words).not.toContain("house's first play");
    expect(words).not.toContain('house');
    // The tagger reads past the owner to the play; `first` is an ordinal, and D4
    // strips leading numbers.
    expect(words).toContain('play');
  });

  it('is the extractor’s tokenize, and every candidate’s words are words it returns', () => {
    expect(nounExtractor.tokenize).toBeTypeOf('function');
    for (const text of PASSAGES) {
      const words = new Set(nounExtractor.tokenize(text));
      for (const candidate of nounExtractor.extract(text)) {
        for (const word of candidate.words) expect(words.has(word), `${word} in "${text}"`).toBe(true);
      }
    }
  });

  it('returns [] for an empty or punctuation-only passage', () => {
    expect(nounExtractor.tokenize('')).toEqual([]);
    expect(nounExtractor.tokenize('... — !?')).toEqual([]);
  });
});

describe('the tagger finds what the article cannot (ADR-407 D4)', () => {
  it('reads the Refectory: tables, candles and hearth, and no pronoun alone', () => {
    const candidates = nounExtractor.extract(REFECTORY);
    const heads = candidates.map((candidate) => candidate.head);
    expect(heads).toEqual(expect.arrayContaining(['tables', 'candles', 'hearth']));
    // No candidate is a pronoun on its own. `hearth you` is the heuristic's, whose
    // phrase AC-4 forbids the union to lose; the tagger's own pieces never end in one.
    const alone = candidates.filter((candidate) => candidate.words.length === 1).map((candidate) => candidate.head);
    for (const pronoun of ['its', 'someone', 'you', 'them']) expect(alone).not.toContain(pronoun);
    for (const phrase of extractTaggedPhrases(REFECTORY)) {
      expect(['its', 'someone', 'you', 'them']).not.toContain(phrase.words[phrase.words.length - 1]);
    }
  });

  it('strips a leading number and splits X of Y so each head is tried', () => {
    const words = union(REFECTORY);
    expect(words).toContain('long tables');
    expect(words).not.toContain('three long tables');
    expect(words).toContain('candles');
  });

  it('finds the prickets, which no article introduces', () => {
    const text = 'Stubs of tallow in iron prickets down the middle of each table.';
    expect(heuristic(text)).toEqual([]);
    const prickets = nounExtractor.extract(text).find((candidate) => candidate.head === 'prickets');
    expect(prickets).toEqual({ text: 'iron prickets', words: ['iron', 'prickets'], head: 'prickets', offset: 19 });
  });

  it('drops a possessive determiner and keeps the noun it modifies', () => {
    const words = union('A broad woman in a leather apron, with a pry bar through her belt.');
    expect(words).toContain('belt');
    expect(words).not.toContain('her belt');
  });
});

describe('the union never loses a candidate (ADR-407 D4, AC-4 unit half)', () => {
  it('contains every phrase the heuristic alone produces', () => {
    let compared = 0;
    for (const text of PASSAGES) {
      const all = new Set(union(text));
      for (const phrase of heuristic(text)) {
        expect(all.has(phrase), `"${phrase}" from "${text}"`).toBe(true);
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(10);
  });

  it('gives each candidate its passage text, its head, and its offset', () => {
    const text = 'The tiring-house door stands west; the yard is south.';
    for (const candidate of nounExtractor.extract(text)) {
      expect(text.slice(candidate.offset, candidate.offset + candidate.text.length)).toBe(candidate.text);
      expect(candidate.text.toLowerCase().startsWith(candidate.words[0])).toBe(true);
      expect(candidate.head).toBe(candidate.words[candidate.words.length - 1]);
    }
    expect(union(text)).toEqual(['tiring-house door', 'yard']);
  });

  it('lists each distinct phrase once, in reading order', () => {
    const candidates = nounExtractor.extract('The brass key. The brass key again. A tin lid.');
    expect(candidates.map((candidate) => candidate.words.join(' '))).toEqual(['brass key', 'tin lid']);
    expect(candidates[0].offset).toBe(4);
  });

  it('returns [] for an empty or punctuation-only passage and never throws on prose', () => {
    expect(nounExtractor.extract('')).toEqual([]);
    expect(nounExtractor.extract('   ')).toEqual([]);
    expect(nounExtractor.extract('...!? — ;;')).toEqual([]);
    expect(() => nounExtractor.extract('\u0000￿ 1234 ☃ — "\'"')).not.toThrow();
  });

  it('is the English extractor', () => {
    expect(nounExtractor.languageCode).toBe('en-US');
  });
});

/**
 * Run a script in a fresh Node from the package directory, so the package's own
 * exports map resolves `@sharpee/lang-en-us/...` against `dist/` and `dist-esm/`.
 */
function runNode(args: string[]): string {
  return execFileSync(process.execPath, args, { cwd: PACKAGE, encoding: 'utf8' }).trim();
}

describe('the built subpath, outside the story runtime (ADR-407 D3, AC-3)', () => {
  it('has been built — these cases read dist/ and dist-esm/', () => {
    expect(existsSync(join(PACKAGE, 'dist', 'nouns', 'index.js')), 'run ./repokit build first').toBe(true);
    expect(existsSync(join(PACKAGE, 'dist-esm', 'nouns', 'index.js')), 'run ./repokit build first').toBe(true);
  });

  it('requires the CJS subpath and gets the English extractor', () => {
    const out = runNode([
      '-e',
      "const { nounExtractor } = require('@sharpee/lang-en-us/nouns');" +
        "console.log(nounExtractor.languageCode + ' ' + nounExtractor.extract('Stubs of tallow in iron prickets.').map((c) => c.head).join(','));",
    ]);
    expect(out).toBe('en-US stubs,tallow,prickets');
  });

  it('imports the ESM subpath and gets the English extractor', () => {
    const out = runNode([
      '--input-type=module',
      '-e',
      "import { nounExtractor } from '@sharpee/lang-en-us/nouns';" +
        "console.log(nounExtractor.languageCode + ' ' + nounExtractor.extract('Stubs of tallow in iron prickets.').map((c) => c.head).join(','));",
    ]);
    expect(out).toBe('en-US stubs,tallow,prickets');
  });

  it('keeps compromise out of the main entry, under require', () => {
    const out = runNode([
      '-e',
      "require('@sharpee/lang-en-us');" +
        "const loaded = Object.keys(require.cache);" +
        "console.log(loaded.filter((f) => f.includes('compromise')).length + ' of ' + loaded.length);",
    ]);
    const [compromiseCount, , total] = out.split(' ');
    expect(Number(total)).toBeGreaterThan(10);
    expect(compromiseCount).toBe('0');
  });

  it('keeps compromise out of the main entry, under import', () => {
    // Every module the ESM graph resolves goes through this hook; none may be compromise.
    const out = runNode([
      '--input-type=module',
      '-e',
      "import { registerHooks } from 'node:module';" +
        'const seen = [];' +
        'registerHooks({ resolve(specifier, context, next) { const r = next(specifier, context); seen.push(r.url); return r; } });' +
        "await import('@sharpee/lang-en-us');" +
        "console.log(seen.filter((u) => u.includes('compromise')).length + ' of ' + seen.length);",
    ]);
    const [compromiseCount, , total] = out.split(' ');
    expect(Number(total)).toBeGreaterThan(10);
    expect(compromiseCount).toBe('0');
  });

  it("is what if-domain's lookup finds for en-US, through a real require", () => {
    const out = runNode([
      '-e',
      "const { resolveNounExtractor } = require('@sharpee/if-domain/nouns');" +
        "const { nounExtractor } = require('@sharpee/lang-en-us/nouns');" +
        "const found = resolveNounExtractor('en-US', require);" +
        "const missing = resolveNounExtractor('xx-YY', require);" +
        "console.log(JSON.stringify([found.found && found.extractor === nounExtractor, missing.found, missing.refusal]));",
    ]);
    expect(JSON.parse(out)).toEqual([
      true,
      false,
      "No noun extractor for language 'xx-YY': @sharpee/lang-xx-yy/nouns does not provide one.",
    ]);
  });

  it('is not imported by the main entry source', () => {
    const out = runNode([
      '-e',
      "const src = require('node:fs').readFileSync('src/index.ts', 'utf8'); console.log(/nouns/.test(src.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')));",
    ]);
    expect(out).toBe('false');
  });
});
