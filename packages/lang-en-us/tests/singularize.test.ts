/**
 * singularize.test.ts — English noun number: the singular side and both forms
 * (ADR-407 D5, Amendment 4).
 *
 * The cases are the ones that sent D5 to an amendment: `lemmatize` turned
 * `candles` into `candl` and `shed` into `sh`. The built-graph case spawns Node
 * on `dist/`, because the vitest aliases resolve to source.
 *
 * Owner context: @sharpee/lang-en-us — tests.
 *
 * @see ADR-407 D5, Amendment 4, AC-3
 */

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { numberForms, singularize } from '../src/singularize.js';
import { pluralize } from '../src/pluralize.js';
import { nounExtractor } from '../src/nouns/index.js';

const PACKAGE = join(__dirname, '..');

describe('singularize gives the singular a player would type', () => {
  it('reads the Refectory: candles, prickets and tables, where lemmatize gave candl and tabl', () => {
    expect(singularize('candles')).toBe('candle');
    expect(singularize('prickets')).toBe('pricket');
    expect(singularize('tables')).toBe('table');
  });

  it('leaves a singular alone, including the ones lemmatize cut down (shed, string, pudding)', () => {
    for (const word of ['shed', 'string', 'pudding', 'candle', 'bed', 'glass', 'bus', 'iris']) {
      expect(singularize(word), word).toBe(word);
    }
  });

  it('takes -es off a sibilant plural and -ies back to -y', () => {
    expect(singularize('glasses')).toBe('glass');
    expect(singularize('boxes')).toBe('box');
    expect(singularize('benches')).toBe('bench');
    expect(singularize('dishes')).toBe('dish');
    expect(singularize('flies')).toBe('fly');
  });

  it('takes only the s off an -es plural whose singular ends in e', () => {
    expect(singularize('houses')).toBe('house');
    expect(singularize('shoes')).toBe('shoe');
    expect(singularize('gloves')).toBe('glove');
  });

  it("reads the irregulars from the language's one table, in both directions", () => {
    expect(singularize('geese')).toBe('goose');
    expect(singularize('knives')).toBe('knife');
    expect(singularize('goose')).toBe('goose');
    expect(singularize('child')).toBe('child');
  });

  it('knows the lone-s singulars and their plurals', () => {
    expect(singularize('lens')).toBe('lens');
    expect(singularize('lenses')).toBe('lens');
    expect(singularize('canvas')).toBe('canvas');
  });

  it('lowercases, and returns an empty word as it is', () => {
    expect(singularize('Candles')).toBe('candle');
    expect(singularize('')).toBe('');
  });
});

describe('numberForms gives both numbers of one noun', () => {
  it('reads a plural as its own plural with its singular', () => {
    expect(numberForms('candles')).toEqual({ singular: 'candle', plural: 'candles' });
    expect(numberForms('Prickets')).toEqual({ singular: 'pricket', plural: 'prickets' });
  });

  it("reads a singular with the plural pluralize gives, the formatter's own plural", () => {
    expect(numberForms('valve')).toEqual({ singular: 'valve', plural: 'valves' });
    expect(numberForms('press')).toEqual({ singular: 'press', plural: 'presses' });
    expect(numberForms('goose')).toEqual({ singular: 'goose', plural: 'geese' });
    expect(numberForms('lens')).toEqual({ singular: 'lens', plural: 'lenses' });
    for (const word of ['valve', 'press', 'shed', 'bench']) {
      expect(numberForms(word).plural, word).toBe(pluralize(word));
    }
  });

  it('returns a noun the same in both numbers twice, so there is no other form to try', () => {
    expect(numberForms('sheep')).toEqual({ singular: 'sheep', plural: 'sheep' });
    expect(numberForms('series')).toEqual({ singular: 'series', plural: 'series' });
  });

  it('never invents a singular for a noun that has none (bellows, tongs)', () => {
    expect(numberForms('bellows')).toEqual({ singular: 'bellows', plural: 'bellows' });
    expect(numberForms('tongs')).toEqual({ singular: 'tongs', plural: 'tongs' });
  });

  it("is the English extractor's numberForms", () => {
    expect(nounExtractor.numberForms).toBe(numberForms);
  });
});

describe('the story runtime does not carry it (ADR-407 AC-3)', () => {
  it('has been built — this case reads dist/', () => {
    expect(existsSync(join(PACKAGE, 'dist', 'singularize.js')), 'run ./repokit build first').toBe(true);
  });

  it('is not in the main entry module graph, under require', () => {
    const out = execFileSync(
      process.execPath,
      [
        '-e',
        "require('@sharpee/lang-en-us');" +
          'const loaded = Object.keys(require.cache);' +
          "console.log(loaded.filter((file) => file.endsWith('singularize.js')).length, loaded.filter((file) => file.includes('lang-en-us')).length);",
      ],
      { cwd: PACKAGE, encoding: 'utf8' },
    ).trim();
    const [singularizeCount, total] = out.split(' ').map(Number);
    expect(total).toBeGreaterThan(10);
    expect(singularizeCount).toBe(0);
  });
});
