/**
 * world-index.test.ts — `sharpee world-index` behavior: a compiled story yields
 * an analysis document on stdout at exit 0, and every failure yields a document
 * naming its cause at exit 1.
 *
 * The analysis itself is @sharpee/world-index's to test; what is asserted here
 * is that the CLI face keeps the contract Chord Writer's World tab decodes
 * against — one JSON document, always, and an exit code that says which kind.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { noNounExtractorRefusal } from '@sharpee/if-domain/nouns';
import { runCompose } from './compose.js';
import { nounExtractorLookup, runWorldIndex } from './world-index.js';

const CHORD_FIXTURES = join(__dirname, '..', '..', '..', 'chord', 'tests', 'fixtures');
const OUT_DIR = mkdtempSync(join(tmpdir(), 'world-index-test-'));

afterAll(() => rmSync(OUT_DIR, { recursive: true, force: true }));

/** Runs the command, capturing the one document it writes to stdout. */
function runCapturing(args: string[]): { code: number; document: Record<string, unknown>; lines: number } {
  const written: string[] = [];
  const stdout = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => {
      written.push(String(chunk));
      return true;
    });
  try {
    const code = runWorldIndex(args);
    const output = written.join('');
    return {
      code,
      document: JSON.parse(output) as Record<string, unknown>,
      lines: output.trimEnd().split('\n').length,
    };
  } finally {
    stdout.mockRestore();
  }
}

describe('sharpee world-index', () => {
  it('analyzes a compiled story and exits 0', async () => {
    const ir = join(OUT_DIR, 'analyzed.ir.json');
    expect(await runCompose([join(CHORD_FIXTURES, 'ac5-random.story'), '-o', ir])).toBe(0);

    const { code, document } = runCapturing([ir]);
    expect(code).toBe(0);
    expect(document.schema).toBe('world-index/4');
    expect(document.ok).toBe(true);
    expect(document).toHaveProperty('map');
    expect(document).toHaveProperty('reach');
    expect(document).toHaveProperty('incomplete');
  });

  it('answers a missing path with a usage failure at exit 1', () => {
    const { code, document } = runCapturing([]);
    expect(code).toBe(1);
    expect(document.ok).toBe(false);
    expect((document.failure as { cause: string }).cause).toBe('usage');
  });

  it('answers an absent file with an unreadable-ir failure at exit 1', () => {
    const { code, document } = runCapturing([join(OUT_DIR, 'never-written.ir.json')]);
    expect(code).toBe(1);
    expect((document.failure as { cause: string }).cause).toBe('unreadable-ir');
  });

  it('answers JSON that is not a Story IR with a malformed-ir failure at exit 1', () => {
    const junk = join(OUT_DIR, 'junk.ir.json');
    writeFileSync(junk, '{"not":"a story"}');

    const { code, document } = runCapturing([junk]);
    expect(code).toBe(1);
    expect((document.failure as { cause: string }).cause).toBe('malformed-ir');
    expect((document.failure as { path: string }).path).toBe(junk);
  });

  // ADR-407 D6, AC-2: the story's language (the IR's phrases.defaultLocale) has no
  // @sharpee/lang-<code>/nouns, so the command refuses by name before reading prose.
  // The lookup runs for real through require; the IR is a temporary copy.
  it('refuses a story whose language has no noun extractor, naming the code, at exit 1', async () => {
    const ir = join(OUT_DIR, 'english.ir.json');
    expect(await runCompose([join(CHORD_FIXTURES, 'ac5-random.story'), '-o', ir])).toBe(0);
    const compiled = JSON.parse(readFileSync(ir, 'utf8')) as { phrases: Record<string, unknown> };
    const foreign = join(OUT_DIR, 'foreign.ir.json');
    writeFileSync(foreign, JSON.stringify({ ...compiled, phrases: { ...compiled.phrases, defaultLocale: 'xx-YY' } }));

    const { code, document, lines } = runCapturing([foreign]);
    expect(code).toBe(1);
    expect(lines).toBe(1);
    expect(document.ok).toBe(false);
    expect(document.failure).toEqual({
      cause: 'no-noun-extractor',
      message: noNounExtractorRefusal('xx-YY'),
      path: foreign,
    });
  });

  it('finds the English extractor for en-US through a real require', () => {
    const resolution = nounExtractorLookup('en-US');
    expect(resolution.found).toBe(true);
    if (resolution.found) expect(resolution.extractor.languageCode).toBe('en-US');
    expect(nounExtractorLookup('xx-YY')).toEqual({ found: false, refusal: noNounExtractorRefusal('xx-YY') });
  });
});
