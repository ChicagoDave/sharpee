/**
 * test-lens.test.ts — `sharpee test`'s examinable-lens tier (ADR-408 D7, D8)
 * at the command surface, through the real command over the real test story
 * `test-stories/scullery` (OB-54 to OB-61): its tree runs, then the lens
 * runs at the tree's seed on its own budget, its findings and summary ride
 * the stream before `run-end` with every span resolved, its report is the
 * lens's own words, and no lens outcome moves the exit code. The refusal of
 * a language with no extractor is unreachable from a `.story` file (Chord
 * writes every IR as `en-US`), so it is driven at `runLensTier` with an IR
 * copy whose language has none, as the spike's OB-60 built one (AC-4).
 *
 * Owner context: devkit test suite.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { StoryIR } from '@sharpee/chord';
import { isLensFindingEvent, isLensSummaryEvent, isRunEvent, type LensFindingEvent, type LensSummaryEvent, type RunEvent } from '@sharpee/ide-protocol';
import { compileChordStory } from '../src/standalone/author-game.js';
import { runTestCommand } from '../src/commands/test.js';
import { LENS_TIER_MAX_SECONDS, runLensTier, type LensFindingRow, type LensSummaryRow } from '../src/commands/test-lens.js';

const SCULLERY = path.resolve(__dirname, '..', '..', '..', 'test-stories', 'scullery');
const SCULLERY_STORY = path.join(SCULLERY, 'scullery.story');

/** Runs `sharpee test <dir> --json`, returning the exit code, the decoded events, and stderr. */
async function runStreaming(dir: string): Promise<{ code: number; events: RunEvent[]; stderr: string[] }> {
  const chunks: string[] = [];
  const write = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const code = await runTestCommand([dir, '--json']);
    const events = chunks.join('').split('\n').filter((line) => line.trim() !== '').map((line) => JSON.parse(line) as RunEvent);
    return { code, events, stderr: error.mock.calls.map((call) => call.join(' ')) };
  } finally {
    write.mockRestore();
    log.mockRestore();
    error.mockRestore();
  }
}

describe('sharpee test — the examinable lens tier on scullery (ADR-408 D8, OB-61)', () => {
  it('emits the whetstone\'s finding with its passage span, target id and declaration span, then the summary, before run-end, and exits 0', async () => {
    const { code, events } = await runStreaming(SCULLERY);
    expect(code).toBe(0);
    expect(events.every(isRunEvent)).toBe(true);

    const findings = events.filter(isLensFindingEvent);
    const summaries = events.filter(isLensSummaryEvent);
    // Re-recorded 2026-11-28 (thing-answers-both-numbers Phase 4): 20 → 16, as
    // jar, crock, whetstones and cheeses now resolve (scullery's OB-56, OB-58).
    expect(findings).toHaveLength(16);
    expect(summaries).toHaveLength(1);

    const whetstone = findings.find((finding) => finding.phrase === 'whetstone' && finding.kind === 'resolved-default') as LensFindingEvent;
    expect(whetstone).toMatchObject({ target: 'whetstone', targetId: 'whetstone', targetSpan: { line: 35 } });
    // The passage's region, and the phrase's own span inside it with its UTF-16 length (ADR-408 D9).
    expect(whetstone.sources).toEqual([
      {
        key: 'scullery.description', kind: 'description', ownerId: 'scullery', ownerName: 'Scullery',
        span: expect.objectContaining({ line: 18, endLine: 19 }),
        at: { line: 19, column: 3, endLine: 19, endColumn: 12 },
        length: 9,
      },
    ]);
    expect(readFileSync(SCULLERY_STORY, 'utf8').split('\n')[18].slice(2, 2 + 9)).toBe('whetstone');

    // The tree document's seed and the tier's own budget, every room reached.
    const summary = summaries[0] as LensSummaryEvent;
    expect(summary).toMatchObject({ seed: 42, maxSeconds: LENS_TIER_MAX_SECONDS, phrasesExecuted: 42 });
    expect(summary.reach).toMatchObject({ roomsReached: 2, roomsDeclared: 2, unreached: [], stoppedBy: 'every-route', maxSeconds: 30 });
    expect(summary.refusal).toBeUndefined();

    // Order: the claims and derived tiers' events, then every finding, then the summary, then run-end.
    const seqOf = (type: string) => events.filter((event) => event.type === type).map((event) => event.seq);
    const derivedSummary = Math.max(...seqOf('derived-summary'));
    expect(Math.min(...seqOf('lens-finding'))).toBeGreaterThan(derivedSummary);
    expect(summary.seq).toBeGreaterThan(Math.max(...seqOf('lens-finding')));
    expect(Math.max(...seqOf('run-end'))).toBeGreaterThan(summary.seq);
  }, 120_000);

  it('prints the lens\'s own report on stderr under --json, each source with its file and line', async () => {
    const { stderr } = await runStreaming(SCULLERY);
    const heading = stderr.indexOf('Examinable lens:');
    expect(heading).toBeGreaterThan(0);
    expect(stderr.slice(heading).join('\n')).toContain('from: Scullery description at scullery.story:18');
    expect(stderr.slice(heading).join('\n')).toContain('Absence is not proof');
  }, 120_000);
});

describe('runLensTier — a language with no extractor (ADR-408 AC-4, AC-5)', () => {
  it('is one lens-summary carrying the refusal and no measurements, no finding is emitted, and the game is never booted', async () => {
    const ir = compileChordStory(SCULLERY_STORY);
    const foreign: StoryIR = { ...ir, phrases: { ...ir.phrases, defaultLocale: 'xx-YY' } };
    const requireHere = createRequire(__filename);
    const { resolveNounExtractor } = requireHere('@sharpee/if-domain/nouns') as typeof import('@sharpee/if-domain/nouns');
    const findings: LensFindingRow[] = [];
    const summaries: LensSummaryRow[] = [];
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await runLensTier({
        storyFile: SCULLERY_STORY,
        ir: foreign,
        seed: 42,
        json: true,
        verbose: false,
        stream: { lensFinding: (row) => findings.push(row), lensSummary: (row) => summaries.push(row) },
        lookup: (code) => resolveNounExtractor(code, (name) => requireHere(name) as import('@sharpee/if-domain/nouns').NounsModule),
      });
    } finally {
      error.mockRestore();
    }
    expect(findings).toEqual([]);
    expect(summaries).toEqual([{
      lens: 'examinable',
      seed: 42,
      maxSeconds: 30,
      refusal: "No noun extractor for language 'xx-YY': @sharpee/lang-xx-yy/nouns does not provide one.",
    }]);
  });
});
