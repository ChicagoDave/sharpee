/**
 * noun-extractor.test.ts — the lookup every reader of prose uses to find a
 * story language's noun extractor (ADR-407 D3, D6; Amendment 1, D-3).
 *
 * The three outcomes: found, no module, and a module whose extractor is for
 * another language or is not an extractor. The loader is the caller's, so the
 * cases hand the helper loaders that behave the way `require` does.
 *
 * Owner context: @sharpee/if-domain — tests.
 */

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  languageMismatchRefusal,
  noNounExtractorRefusal,
  nounExtractorModule,
  resolveNounExtractor,
  type NounExtractor,
  type NounsModule,
} from '../src/nouns';

/** A minimal extractor for a given language. */
function extractorFor(languageCode: string): NounExtractor {
  return {
    languageCode,
    filters: { headStopwords: ['north'], minHeadLength: 3, maxPhraseWords: 3 },
    extract: () => [],
    tokenize: () => [],
  };
}

/** A loader that answers one module name and throws for every other, as `require` does. */
function loaderFor(moduleName: string, module: NounsModule): (name: string) => NounsModule {
  return (name: string) => {
    if (name === moduleName) return module;
    throw Object.assign(new Error(`Cannot find module '${name}'`), { code: 'MODULE_NOT_FOUND' });
  };
}

describe('the module a language code names (ADR-407 D3)', () => {
  it('is @sharpee/lang-<code lowercased>/nouns', () => {
    expect(nounExtractorModule('en-US')).toBe('@sharpee/lang-en-us/nouns');
    expect(nounExtractorModule('fr-FR')).toBe('@sharpee/lang-fr-fr/nouns');
  });
});

describe('resolveNounExtractor (ADR-407 D3, D6)', () => {
  it('finds the extractor a module exports for the code asked for', () => {
    const english = extractorFor('en-US');
    const result = resolveNounExtractor('en-US', loaderFor('@sharpee/lang-en-us/nouns', { nounExtractor: english }));
    expect(result).toEqual({ found: true, extractor: english });
    if (result.found) expect(result.extractor).toBe(english);
  });

  it('refuses by name when the module cannot be loaded', () => {
    const asked: string[] = [];
    const result = resolveNounExtractor('xx-YY', (name) => {
      asked.push(name);
      throw new Error(`Cannot find module '${name}'`);
    });
    expect(asked).toEqual(['@sharpee/lang-xx-yy/nouns']);
    expect(result).toEqual({ found: false, refusal: noNounExtractorRefusal('xx-YY') });
  });

  it('refuses when the module exports an extractor for another language', () => {
    const result = resolveNounExtractor(
      'en-US',
      loaderFor('@sharpee/lang-en-us/nouns', { nounExtractor: extractorFor('en-GB') }),
    );
    expect(result).toEqual({ found: false, refusal: noNounExtractorRefusal('en-US') });
  });

  it('refuses when the module exports no extractor, or something that is not one', () => {
    expect(resolveNounExtractor('en-US', loaderFor('@sharpee/lang-en-us/nouns', {})).found).toBe(false);
    // A module whose export has no tokenize: what an older or foreign module might ship.
    const notAnExtractor = { languageCode: 'en-US', extract: () => [] } as Partial<NounExtractor> as NounExtractor;
    expect(
      resolveNounExtractor('en-US', loaderFor('@sharpee/lang-en-us/nouns', { nounExtractor: notAnExtractor })),
    ).toEqual({ found: false, refusal: noNounExtractorRefusal('en-US') });
  });

  it('refuses an extractor whose filters are missing or not the NounFilters shape (Amendment 3)', () => {
    const english = extractorFor('en-US');
    const withFilters = (filters: object | undefined): NounsModule => ({
      nounExtractor: { ...english, filters } as NounExtractor,
    });
    const shapes: Array<object | undefined> = [
      undefined,
      { minHeadLength: 3, maxPhraseWords: 3 },
      { headStopwords: ['north', 7], minHeadLength: 3, maxPhraseWords: 3 },
      { headStopwords: [], minHeadLength: 0, maxPhraseWords: 3 },
      { headStopwords: [], minHeadLength: 3, maxPhraseWords: 2.5 },
    ];
    for (const filters of shapes) {
      expect(resolveNounExtractor('en-US', loaderFor('@sharpee/lang-en-us/nouns', withFilters(filters)))).toEqual({
        found: false,
        refusal: noNounExtractorRefusal('en-US'),
      });
    }
  });
});

describe('the lookup lives outside the story runtime (ADR-407 AC-3)', () => {
  const PACKAGE = join(__dirname, '..');
  const runNode = (args: string[]) =>
    execFileSync(process.execPath, args, { cwd: PACKAGE, encoding: 'utf8' }).trim();
  const NAMES = ['resolveNounExtractor', 'nounExtractorModule', 'noNounExtractorRefusal', 'languageMismatchRefusal'];

  it('has been built — these cases read dist/ and dist-esm/', () => {
    expect(existsSync(join(PACKAGE, 'dist', 'nouns.js')), 'run ./repokit build first').toBe(true);
    expect(existsSync(join(PACKAGE, 'dist-esm', 'nouns.js')), 'run ./repokit build first').toBe(true);
  });

  it('exports no noun-extraction value from the package root, under require or import', () => {
    const probe = `console.log(${JSON.stringify(NAMES)}.filter((name) => name in root).join(',') || 'none')`;
    expect(runNode(['-e', `const root = require('@sharpee/if-domain'); ${probe}`])).toBe('none');
    expect(
      runNode(['--input-type=module', '-e', `import * as root from '@sharpee/if-domain'; ${probe}`]),
    ).toBe('none');
  });

  it('exports the lookup from the nouns subpath, under require and import', () => {
    const probe = `console.log(${JSON.stringify(NAMES)}.filter((name) => typeof sub[name] === 'function').length)`;
    expect(runNode(['-e', `const sub = require('@sharpee/if-domain/nouns'); ${probe}`])).toBe('4');
    expect(
      runNode(['--input-type=module', '-e', `import * as sub from '@sharpee/if-domain/nouns'; ${probe}`]),
    ).toBe('4');
  });
});

describe('the refusal lines every reader prints (ADR-407 D6, AC-2)', () => {
  it('names the code on one line', () => {
    const line = noNounExtractorRefusal('xx-YY');
    expect(line).toContain("'xx-YY'");
    expect(line).toContain('No noun extractor');
    expect(line).not.toContain('\n');
  });

  it('names both codes on one line when the engine is not the story language', () => {
    const line = languageMismatchRefusal('fr-FR', 'en-US');
    expect(line).toContain("'fr-FR'");
    expect(line).toContain("'en-US'");
    expect(line).not.toContain('\n');
  });
});
