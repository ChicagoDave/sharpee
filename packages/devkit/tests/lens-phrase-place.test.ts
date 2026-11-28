/**
 * lens-phrase-place.test.ts — where each lens finding's phrase sits inside its
 * passage (ADR-408 D2, D9): devkit, as the consumer, finds the phrase with
 * world-index's words rule clipped to the keyed passage, and ships its span
 * (`at`) and its UTF-16 length beside the passage's span.
 *
 * The real path (DEVARCH 13a): the real compiler, the real engine at the
 * seed, English's extractor and the real source files of the test stories
 * `test-stories/scullery` and `test-stories/orchard` (ADR-395); nothing
 * injected and nothing under them edited.
 *
 * Owner context: devkit test suite.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Span } from '@sharpee/chord';
import type { ExaminableFinding, LensOutput } from '@sharpee/ide-protocol';
import { compileChordStory } from '../src/standalone/author-game.js';
import { runLensCommand } from '../src/commands/lens.js';
import { lensSourceReader, locateSourcePhrase, resolveSourceSpan, utf16Length } from '../src/commands/lens-sources.js';
import { lensFindingEventOf } from '../src/commands/test-lens.js';
import { runWorldIndex } from '../src/commands/world-index.js';

const TEST_STORIES = path.resolve(__dirname, '..', '..', '..', 'test-stories');
const SCULLERY = path.join(TEST_STORIES, 'scullery', 'scullery.story');
const ORCHARD = path.join(TEST_STORIES, 'orchard', 'orchard.story');

/** The lens document's findings for a story, through `sharpee lens examinable --json`. */
async function lensFindings(story: string): Promise<ExaminableFinding[]> {
  let stdout = '';
  const out = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => { stdout += String(chunk); return true; });
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(await runLensCommand(['examinable', story, '--seed', '42', '--json'])).toBe(0);
  } finally {
    out.mockRestore();
    err.mockRestore();
  }
  const output = JSON.parse(stdout) as LensOutput;
  if (!output.report) throw new Error(`the lens refused ${story}`);
  return output.report.findings;
}

/** The source text a span covers, its lines joined by one space. */
function textAt(source: string, at: Span): string {
  const lines = source.split(/\r\n|\n|\r/);
  const pieces: string[] = [];
  for (let line = at.line; line <= at.endLine; line += 1) {
    const raw = lines[line - 1];
    const start = line === at.line ? at.column - 1 : 0;
    const end = line === at.endLine ? at.endColumn - 1 : raw.length;
    pieces.push(raw.slice(start, end).trim());
  }
  return pieces.join(' ');
}

describe('a lens finding\'s phrase, placed inside its passage (ADR-408 D9)', () => {
  it('JOIN — scullery\'s whetstone sits where `sharpee world-index` places it for the same .story, nine code units long', async () => {
    const findings = await lensFindings(SCULLERY);
    const whetstone = findings.find((finding) => finding.phrase === 'whetstone' && finding.kind === 'resolved-default')!;
    const row = lensFindingEventOf(whetstone, compileChordStory(SCULLERY), lensSourceReader(SCULLERY));

    let indexOut = '';
    const out = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => { indexOut += String(chunk); return true; });
    try { expect(runWorldIndex([SCULLERY])).toBe(0); } finally { out.mockRestore(); }
    const incomplete = (JSON.parse(indexOut) as { incomplete: Record<string, Array<{ entity?: string; site: { key: string }; at?: Span }>> }).incomplete;
    const edge = [...incomplete.missingWord, ...incomplete.ambiguous, ...incomplete.noObject, ...incomplete.edges]
      .find((record) => record.entity === 'whetstone' && record.site.key === 'scullery.description');

    expect(edge?.at).toEqual({ line: 19, column: 3, endLine: 19, endColumn: 12 });
    expect(row.sources[0].at).toEqual(edge!.at);
    expect(row.sources[0].length).toBe(9);
  }, 120_000);

  // Widened 2026-11-28 (thing-answers-both-numbers Phase 4, David "a"): this
  // read only orchard's number-form findings, and orchard has none now that a
  // thing answers to both numbers. It now places every finding; the fall-through
  // to the resolved form keeps its unit case below until the Singular/plural
  // finding brings real number-form rows back.
  it('orchard — every finding\'s keyed source reads its phrase or its resolved form at `at`, and `length` spans exactly that text', async () => {
    const findings = await lensFindings(ORCHARD);
    const ir = compileChordStory(ORCHARD);
    const source = readFileSync(ORCHARD, 'utf8');
    expect(findings.length).toBe(38);

    let keyed = 0;
    for (const finding of findings) {
      const row = lensFindingEventOf(finding, ir, lensSourceReader(ORCHARD));
      for (const placed of row.sources) {
        if (placed.key === null) {
          expect(placed.at).toBeUndefined();
          expect('length' in placed).toBe(false);
          continue;
        }
        keyed += 1;
        expect(placed.at, `${finding.phrase} in ${placed.key}`).toBeDefined();
        const read = textAt(source, placed.at!).toLowerCase().replace(/\s+/g, ' ');
        expect([finding.phrase, finding.resolvedForm].map((form) => form?.toLowerCase())).toContain(read);
        expect(placed.length).toBe(utf16Length(source, placed.at!));
      }
    }
    expect(keyed).toBeGreaterThan(0);
  }, 120_000);

  it('a source with no key gets no place even when its owner\'s declaration holds the words, and neither does one whose file cannot be read or whose words are not there', () => {
    const read = lensSourceReader(SCULLERY);
    const scullery = { kind: 'description' as const, ownerId: 'scullery', ownerName: 'Scullery' };
    const passage = resolveSourceSpan(compileChordStory(SCULLERY), { ...scullery, key: 'scullery.description' })!;
    // The premise: the same words, keyed, are found.
    expect(locateSourcePhrase({ ...scullery, key: 'scullery.description' }, passage, ['whetstone'], read)?.at).toMatchObject({ line: 19, column: 3 });
    // The whetstone's declaration (line 35) names the whetstone; a keyless source there is never searched.
    expect(locateSourcePhrase({ key: null, kind: 'state', ownerId: 'whetstone', ownerName: 'whetstone' }, { line: 35, column: 1, endLine: 37, endColumn: 17 }, ['whetstone'], read)).toBeUndefined();
    expect(locateSourcePhrase({ ...scullery, key: 'scullery.description' }, null, ['whetstone'], read)).toBeUndefined();
    expect(locateSourcePhrase({ ...scullery, key: 'scullery.description' }, { ...passage, file: 'no-such-file.story' }, ['whetstone'], read)).toBeUndefined();
    expect(locateSourcePhrase({ ...scullery, key: 'scullery.description' }, passage, ['cheese'], read)).toBeUndefined();
  });

  it('tries the forms in order: a phrase the prose did not write falls through to the resolved form it did', () => {
    const read = lensSourceReader(SCULLERY);
    const source = { key: 'scullery.description', kind: 'description' as const, ownerId: 'scullery', ownerName: 'Scullery' };
    const passage = resolveSourceSpan(compileChordStory(SCULLERY), source)!;
    // Line 18 reads "  Jars and crocks crowd the shelf …": "crock" alone is never inside a longer word.
    const place = locateSourcePhrase(source, passage, ['crock', undefined, 'crocks'], read);
    expect(place).toEqual({ at: { line: 18, column: 12, endLine: 18, endColumn: 18 }, length: 6 });
  });

  it('utf16Length counts a wrapped phrase\'s line break as the source writes it, and refuses a span outside the source', () => {
    const at: Span = { line: 1, column: 5, endLine: 2, endColumn: 5 };
    expect(utf16Length('the brass\nlamp is here', at)).toBe('brass\nlamp'.length);
    expect(utf16Length('the brass\r\nlamp is here', at)).toBe('brass\r\nlamp'.length);
    expect(utf16Length('a wheel of cheese', { line: 1, column: 3, endLine: 1, endColumn: 8 })).toBe(5);
    expect(() => utf16Length('one line', { line: 1, column: 1, endLine: 3, endColumn: 2 })).toThrow(RangeError);
    expect(() => utf16Length('one line', { line: 1, column: 6, endLine: 1, endColumn: 2 })).toThrow(RangeError);
  });
});
