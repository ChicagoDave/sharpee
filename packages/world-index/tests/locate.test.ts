/**
 * locate.test.ts — every phrase the analyzer reads, at its own source span.
 *
 * Derived from the Behavior Statements for `locatePhrase` and for the `.story`
 * input of `analyzeStoryIR`. The stories are compiled by the real Chord
 * compiler, read from real files, and analyzed with the real English noun
 * extractor; nothing stands in for any of them.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 D17, AC-18: a phrase is resolved inside its passage
 */

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compile, type Span, type StoryIR } from '@sharpee/chord';
import type { NounExtractorLookup } from '@sharpee/if-domain';
import { nounExtractor as english } from '@sharpee/lang-en-us/nouns';
import { analyzeStoryIR, type StoryCompiler } from '../src/analyze.js';
import { WORLD_INDEX_SCHEMA, type WorldIndexDocument, type WorldIndexResponse } from '../src/document.js';
import { deriveIncomplete, type IncompleteResult } from '../src/incomplete.js';
import { locatePhrase } from '../src/locate.js';
import { compileSource } from './corpus.js';

/** Repository root, resolved from this file rather than the working directory. */
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** The scullery test story, whose whetstone opens line 19. */
const SCULLERY = join(REPO_ROOT, 'test-stories/scullery/scullery.story');

/** The player every fixture needs, placed in its Hall; appended, so no line above it moves. */
const PLAYER = [
  'create Wren',
  '  a person',
  '  playable',
  '  starts in the Hall',
  '',
  '  You.',
  '',
  'before the game starts',
  '  change the player to Wren',
  'end before',
  '',
];

/** Every story here is English. */
const lookup: NounExtractorLookup = () => ({ found: true, extractor: english });

/**
 * The real compile path in `compileChordStory`'s shape: imports resolve against
 * the story's directory, and a story the gates refuse throws with their
 * diagnostics.
 */
const compileFile: StoryCompiler = (storyPath) => {
  const directory = dirname(resolve(storyPath));
  const result = compile(readFileSync(storyPath, 'utf8'), {
    importResolver: (fragment) => {
      try {
        return readFileSync(resolve(directory, fragment), 'utf8');
      } catch {
        return null;
      }
    },
  });
  if (!result.ok) {
    const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    throw new Error(`gate failed: ${errors.map((diagnostic) => diagnostic.code).join(', ')}`);
  }
  return result.ir;
};

/**
 * Narrow a response to an analysis, failing the test loudly when it is not one.
 *
 * @param response the analyzer's answer
 * @returns the analysis
 */
function analysis(response: WorldIndexResponse): WorldIndexDocument {
  if (!response.ok) throw new Error(`expected an analysis, got ${response.failure.cause}: ${response.failure.message}`);
  return response;
}

/**
 * Every phrase record in an Incomplete result, findings and edges together.
 *
 * @param incomplete the Incomplete view
 * @returns each record with its phrase, passage and `at`
 */
function records(incomplete: IncompleteResult): Array<{ phrase: string; site: { key: string }; at?: Span }> {
  return [...incomplete.missingWord, ...incomplete.ambiguous, ...incomplete.noObject, ...incomplete.edges];
}

/**
 * The text a span covers, read straight from the source.
 *
 * @param source the file's text
 * @param span a span inside it
 * @returns the covered characters, lines joined by `\n`
 */
function textAt(source: string, span: Span): string {
  const lines = source.split(/\r\n|\n|\r/);
  const covered: string[] = [];
  for (let line = span.line; line <= span.endLine; line += 1) {
    const raw = lines[line - 1];
    const from = line === span.line ? span.column - 1 : 0;
    const to = line === span.endLine ? span.endColumn - 1 : raw.length;
    covered.push(raw.slice(from, to));
  }
  return covered.join('\n');
}

/**
 * Write files into a fresh temporary directory.
 *
 * @param files file name to text
 * @returns the directory
 */
function scratch(files: Record<string, string>): string {
  const directory = mkdtempSync(join(tmpdir(), 'world-index-locate-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(directory, name), text);
  return directory;
}

/** A hall whose lamp is named across a line break (lines 11 and 12). */
const WRAPPED = [
  'story',
  '  title: Wrapped',
  '  authors:',
  '    Test Story',
  '  id: wrapped',
  '  story-version: 0.0.1',
  '',
  'create the Hall',
  '  a room',
  '',
  '  A long hall. On the floor lies a brass',
  '  lamp, dented and cold.',
  '',
  'create the brass lamp',
  '  a thing, singular',
  '  in the Hall',
  '',
  ...PLAYER,
].join('\n');

describe('a .story input publishes each phrase at its own span', () => {
  it("places scullery's whetstone at line 19, columns 3 to 12", () => {
    const document = analysis(analyzeStoryIR(SCULLERY, 'test', lookup, compileFile));
    expect(document.schema).toBe(WORLD_INDEX_SCHEMA);
    expect(document.schema).toBe('world-index/4');

    const whetstone = document.incomplete.edges.find(
      (edge) => edge.phrase === 'whetstone' && edge.site.key === 'scullery.description',
    );
    expect(whetstone?.entity).toBe('whetstone');
    expect(whetstone?.at).toEqual({ line: 19, column: 3, endLine: 19, endColumn: 12 });
    expect(textAt(readFileSync(SCULLERY, 'utf8'), whetstone!.at!)).toBe('whetstone');
  });

  it('spans two lines when the author broke the phrase across them', () => {
    const ir = compileSource(WRAPPED);
    const lamp = deriveIncomplete(ir, english, undefined, () => WRAPPED).edges.find(
      (edge) => edge.entity === 'brass-lamp' && edge.site.kind === 'description',
    );
    expect(lamp?.phrase).toBe('brass lamp');
    expect(lamp?.at).toEqual({ line: 11, column: 36, endLine: 12, endColumn: 7 });
    expect(textAt(WRAPPED, lamp!.at!)).toBe('brass\n  lamp');
  });

  it("reads an imported fragment's passage from that fragment, and names its file", () => {
    const main = [
      'story',
      '  title: Annexed',
      '  authors:',
      '    Test Story',
      '  id: annexed',
      '  story-version: 0.0.1',
      '',
      'import "annex"',
      '',
      'create the Hall',
      '  a room',
      '  east to the Annex',
      '',
      '  A long hall.',
      '',
      ...PLAYER,
    ].join('\n');
    const annex = [
      'create the Annex',
      '  a room',
      '  west to the Hall',
      '',
      '  A narrow annex. A ledger rests on the sill.',
      '',
      'create the ledger',
      '  a thing, singular',
      '  in the Annex',
      '',
    ].join('\n');
    const directory = scratch({ 'annexed.story': main, 'annex.chord': annex });

    const document = analysis(analyzeStoryIR(join(directory, 'annexed.story'), 'test', lookup, compileFile));
    const ledger = document.incomplete.edges.find((edge) => edge.entity === 'ledger');
    expect(ledger?.at).toEqual({ file: 'annex.chord', line: 5, column: 21, endLine: 5, endColumn: 27 });
    expect(textAt(annex, ledger!.at!)).toBe('ledger');
  });

  it('leaves `at` off every record when the reader cannot supply the file', () => {
    const ir = compileSource(WRAPPED);
    const result = deriveIncomplete(ir, english, undefined, () => null);
    expect(result.edges.length).toBeGreaterThan(0);
    expect(records(result).filter((record) => 'at' in record)).toEqual([]);
  });
});

/**
 * The census pin (2026-11-23): every phrase record in every test story is located.
 *
 * Measured by reading each story through `analyzeStoryIR` with the real compile:
 * 219 of 219. A drop here is a phrase the analyzer read and can no longer place.
 * The corpus stories are measured, not pinned (ADR-395 D7): 513 of 514 for
 * Fernhill, 377 of 379 for The Alderman, 644 of 648 for Ides of March, each miss
 * a phrase the extractor read out of a hyphenated or quoted word
 * (`floor-to-ceiling curtains`, `'Peace`), which the longer-word rule refuses.
 */
const TEST_STORY_CENSUS: ReadonlyArray<[story: string, records: number]> = [
  ['bazaar', 20],
  ['ferry', 31],
  ['lodge', 55],
  ['orchard', 83], // 82 before ADR-409 (David's ruling "a", 2026-11-28, session a1ecea): `old apple trees` now names the apple tree, a missing-word record
  ['quay', 12],
  ['scullery', 19],
];

describe('every phrase in every test story is located', () => {
  it.each(TEST_STORY_CENSUS)('%s: all %i phrase records carry `at`', (story, count) => {
    const path = join(REPO_ROOT, `test-stories/${story}/${story}.story`);
    const all = records(analysis(analyzeStoryIR(path, 'test', lookup, compileFile)).incomplete);
    expect(all.length).toBe(count);
    expect(all.filter((record) => record.at === undefined).map((record) => record.phrase)).toEqual([]);
  });
});

describe('a built IR publishes no `at`', () => {
  it('carries no `at` key on any finding or edge for a .ir.json of the same story', () => {
    const fromSource = analysis(analyzeStoryIR(SCULLERY, 'test', lookup, compileFile));
    const located = records(fromSource.incomplete).filter((record) => record.at !== undefined);
    expect(located.length).toBeGreaterThan(0);

    const directory = scratch({ 'scullery.ir.json': JSON.stringify(compileFile(SCULLERY)) });
    const fromIR = analysis(analyzeStoryIR(join(directory, 'scullery.ir.json'), 'test', lookup, compileFile));
    expect(fromIR.schema).toBe('world-index/4');
    const all = records(fromIR.incomplete);
    expect(all.length).toBe(records(fromSource.incomplete).length);
    expect(all.filter((record) => 'at' in record)).toEqual([]);
  });

  it('carries no `at` key when deriveIncomplete is given no reader', () => {
    const result = deriveIncomplete(compileSource(WRAPPED), english);
    expect(result.edges.length).toBeGreaterThan(0);
    expect(records(result).filter((record) => 'at' in record)).toEqual([]);
  });
});

describe('a .story that cannot be analyzed is named, never thrown', () => {
  it('answers usage, naming `sharpee world-index`, when no compile function is given', () => {
    const response = analyzeStoryIR(SCULLERY, 'test', lookup);
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.failure.cause).toBe('usage');
    expect(response.failure.path).toBe(SCULLERY);
    expect(response.failure.message).toContain('sharpee world-index');
  });

  it('answers unreadable-ir for a .story path that names no file', () => {
    const missing = join(scratch({}), 'gone.story');
    const response = analyzeStoryIR(missing, 'test', lookup, compileFile);
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.failure).toEqual({
      cause: 'unreadable-ir',
      message: `No story could be read at ${missing}.`,
      path: missing,
    });
  });

  it("answers uncompilable-story, carrying the gates' message, for a story they refuse", () => {
    const broken = join(scratch({ 'broken.story': 'story\n  title: Broken\n\nimport "nowhere"\n' }), 'broken.story');
    const response = analyzeStoryIR(broken, 'test', lookup, compileFile);
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.failure.cause).toBe('uncompilable-story');
    expect(response.failure.path).toBe(broken);
    expect(response.failure.message).toMatch(/^gate failed: /);
  });
});

describe('locatePhrase finds words, not offsets, and only inside the passage', () => {
  const source = ['A whetstone on the shelf.', '  The Whetstone is grey.', '  whetstones, stone, and more.'].join('\n');

  it('ignores casing', () => {
    expect(locatePhrase(source, { line: 2, column: 3, endLine: 2, endColumn: 25 }, ['whetstone'])).toEqual({
      line: 2,
      column: 7,
      endLine: 2,
      endColumn: 16,
    });
  });

  it('does not match words outside the passage, on another line or before its column', () => {
    expect(locatePhrase(source, { line: 3, column: 3, endLine: 3, endColumn: 31 }, ['shelf'])).toBeNull();
    expect(locatePhrase(source, { line: 1, column: 4, endLine: 1, endColumn: 26 }, ['a'])).toBeNull();
    expect(locatePhrase(source, { line: 1, column: 1, endLine: 1, endColumn: 11 }, ['whetstone'])).toBeNull();
  });

  it('refuses a match inside a longer word', () => {
    expect(locatePhrase(source, { line: 3, column: 3, endLine: 3, endColumn: 15 }, ['whetstone'])).toBeNull();
    expect(locatePhrase(source, { line: 1, column: 1, endLine: 1, endColumn: 26 }, ['stone'])).toBeNull();
    expect(locatePhrase(source, { line: 3, column: 3, endLine: 3, endColumn: 31 }, ['stone'])).toEqual({
      line: 3,
      column: 15,
      endLine: 3,
      endColumn: 20,
    });
  });

  it('gives null for a phrase that is not there, for no words, and for a span past the source', () => {
    expect(locatePhrase(source, { line: 1, column: 1, endLine: 3, endColumn: 31 }, ['kettle'])).toBeNull();
    expect(locatePhrase(source, { line: 1, column: 1, endLine: 3, endColumn: 31 }, [])).toBeNull();
    expect(locatePhrase(source, { line: 4, column: 1, endLine: 5, endColumn: 2 }, ['whetstone'])).toBeNull();
  });

  it("carries the passage's file onto the phrase's span", () => {
    expect(locatePhrase(source, { file: 'annex.chord', line: 1, column: 1, endLine: 1, endColumn: 26 }, ['shelf'])).toEqual({
      file: 'annex.chord',
      line: 1,
      column: 20,
      endLine: 1,
      endColumn: 25,
    });
  });
});
