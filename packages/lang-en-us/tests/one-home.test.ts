/**
 * one-home.test.ts — a language's words are declared once, in the language
 * (ADR-387 D1, D7).
 *
 * The structural readers test: every word list the parser, the matcher and the
 * validator read has exactly one declaration under `packages/*\/src`, in
 * `packages/lang-en-us/src/data/words.ts`, and parser-en-us imports no
 * lang-en-us data. A second declaration anywhere, or a new data import in the
 * parser, fails here before it can drift.
 *
 * The direction table is one of the lists (ADR-387 D5): parser-en-us imports
 * nothing from lang-en-us.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const PACKAGES = join(REPO, 'packages');
const TABLE = 'packages/lang-en-us/src/data/words.ts';
/** Generated from the table and held fresh by `./repokit manifest --check`: a derived copy, not a second home. */
const GENERATED_FROM_TABLE = ['packages/chord/src/stdlib-manifest.ts'];

/** Every source file under packages/*\/src, repo-relative, the umbrella's generated docs excluded. */
function sourceFiles(): string[] {
  const out: string[] = [];
  for (const pkg of readdirSync(PACKAGES)) {
    if (pkg === 'sharpee' || pkg.startsWith('_')) continue;
    const src = join(PACKAGES, pkg, 'src');
    try {
      if (!statSync(src).isDirectory()) continue;
    } catch {
      continue;
    }
    walk(src, out);
  }
  return out;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.ts$/.test(entry) && !/\.test\.ts$/.test(entry) && !/\.d\.ts$/.test(entry)) {
      out.push(relative(REPO, full));
    }
  }
}

/** A regex that matches the list's words written as consecutive quoted literals, in order. */
function literalList(words: readonly string[]): RegExp {
  return new RegExp(words.map((w) => `(['"])${w}\\1`).join(String.raw`\s*,\s*`));
}

const LISTS: ReadonlyArray<{ name: string; words: readonly string[] }> = [
  { name: 'articles', words: ['a', 'an', 'the'] },
  { name: 'self words', words: ['me', 'myself', 'self', 'yourself'] },
  { name: 'name stopwords', words: ['the', 'a', 'an', 'of'] },
  { name: 'all words', words: ['all', 'everything', 'every'] },
  { name: 'except words', words: ['except', 'but'] },
  { name: 'list separators', words: ['and', ','] },
  { name: 'manner adverbs', words: ['carefully', 'quietly', 'quickly', 'slowly'] },
];

/** Symbols that were a second home for a word list; none may exist in any package source. */
const RETIRED_SYMBOLS = [
  'SELF_WORDS', 'NAME_VOCABULARY_STOPWORDS', 'PLAYER_ROLE_ALIASES', 'specialVocabulary', 'standardDirections',
  'LIST_CONJUNCTION', 'LIST_COMMA', 'ACTOR_POSSESSIVE', 'MANNER_ADVERBS', 'parserErrors', 'getParserErrorMessage',
  'directionMap', 'DirectionWords', 'DirectionAbbreviations',
];

describe('ADR-387 D1, D7: a language\'s words have one home', () => {
  const files = sourceFiles();
  // Comments are read out before matching: a doc comment may name the words it describes.
  const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  const contents = new Map(files.map((f) => [f, stripComments(readFileSync(join(REPO, f), 'utf8'))]));

  it('reads every package source', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(contents.has(TABLE)).toBe(true);
  });

  for (const list of LISTS) {
    it(`declares the ${list.name} only in the language table`, () => {
      const pattern = literalList(list.words);
      const declaringFiles = files.filter((f) => !GENERATED_FROM_TABLE.includes(f) && pattern.test(contents.get(f)!));
      expect(declaringFiles).toEqual([TABLE]);
    });
  }

  it('leaves no retired word-list symbol in any package source', () => {
    const hits: string[] = [];
    for (const [file, text] of contents) {
      for (const symbol of RETIRED_SYMBOLS) {
        if (new RegExp(String.raw`\b${symbol}\b`).test(text)) hits.push(`${file}: ${symbol}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('lets the parser import nothing from lang-en-us', () => {
    const offenders: string[] = [];
    for (const [file, text] of contents) {
      if (!file.startsWith('packages/parser-en-us/src/')) continue;
      if (/from\s*['"]@sharpee\/lang-en-us(\/[^'"]+)?['"]/.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('declares the player-input direction table only in the language table', () => {
    // The parser's two old maps (word → Direction constant, abbreviation → word), by their shape.
    // Chord's author-side compass tables read story source, not player input, and stay (ADR-387 D8).
    const abbreviationPairs = /\[\s*['"]n['"]\s*,\s*['"]north['"]\s*\]\s*,\s*\[\s*['"]s['"]\s*,\s*['"]south['"]\s*\]/;
    const wordToConstant = /['"]north['"]\s*:\s*Direction\.NORTH/;
    const declaringFiles = files.filter((f) => f !== TABLE && (abbreviationPairs.test(contents.get(f)!) || wordToConstant.test(contents.get(f)!)));
    expect(declaringFiles).toEqual([]);
  });
});
