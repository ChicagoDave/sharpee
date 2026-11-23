/**
 * language-boundary.test.ts — world-index names no language (ADR-407 D8).
 *
 * The package reads prose only through the `NounExtractor` its caller hands it.
 * These checks fail the moment a source file imports a language package or
 * grows its own extractor, tokenizer or stopword list again, which is how the
 * heuristic would get a second home (ADR-407 D8, ADR-321 D16). lang-en-us is a
 * devDependency for tests only (plan D-2); `src/` may not use it, and `cli.ts`
 * loads a language only by the convention `resolveNounExtractor` applies.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-407 D8; GH #622 (ADR-210's direction rule)
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** This package's source directory. */
const SRC = fileURLToPath(new URL('../src', import.meta.url));

/** Every TypeScript source file under `src/`, with its text. */
function sources(): Array<{ file: string; text: string }> {
  return readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({ file, text: readFileSync(join(SRC, file), 'utf8') }));
}

/** The module specifiers a file imports or requires. */
function specifiers(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g)) {
    found.push(match[1]);
  }
  return found;
}

describe('world-index names no language (ADR-407 D8)', () => {
  it('reads its own sources (a check over nothing would pass)', () => {
    const files = sources().map((source) => source.file);
    expect(files).toContain('incomplete.ts');
    expect(files).toContain('cli.ts');
    expect(specifiers("import { a } from '@sharpee/lang-en-us/nouns';")).toEqual(['@sharpee/lang-en-us/nouns']);
  });

  it('imports no language package anywhere under src/', () => {
    const offenders = sources().flatMap(({ file, text }) =>
      specifiers(text)
        .filter((specifier) => /^@sharpee\/lang-/.test(specifier))
        .map((specifier) => `${file}: ${specifier}`),
    );
    expect(offenders).toEqual([]);
  });

  it('defines no extractor, tokenizer or stopword list of its own', () => {
    const shapes = [
      /function\s+extractNounPhrases\b/,
      /function\s+tokenize\w*\s*\(/,
      /\bBOUNDARY_WORDS\b/,
      /\bHEAD_STOPWORDS\b/,
      /\bconst\s+ARTICLES\b/,
    ];
    const offenders = sources().flatMap(({ file, text }) =>
      shapes.filter((shape) => shape.test(text)).map((shape) => `${file}: ${shape}`),
    );
    expect(offenders).toEqual([]);
  });
});
