/**
 * lens.test.ts — `sharpee lens examinable` through its real path: the real
 * compiler, the real engine at the seed, and English's extractor found by
 * the same lookup `sharpee world-index` uses (ADR-408 AC-1, D7).
 *
 * The stories are the test stories `test-stories/orchard` and
 * `test-stories/scullery` (ADR-395); nothing under them is edited.
 *
 * Owner context: @sharpee/devkit — the author CLI.
 */

import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExaminableLensReport } from '@sharpee/branch-tester';
import { runLensCommand } from './lens.js';

const TEST_STORIES = resolve(__dirname, '../../../../test-stories');
const ORCHARD = join(TEST_STORIES, 'orchard/orchard.story');
const SCULLERY = join(TEST_STORIES, 'scullery/scullery.story');

/** Runs the command and captures what it wrote to stdout and stderr. */
async function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  const out = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => { stdout += String(chunk); return true; });
  const err = vi.spyOn(console, 'error').mockImplementation((...parts: string[]) => { stderr += `${parts.join(' ')}\n`; });
  try {
    const code = await runLensCommand(args);
    return { code, stdout, stderr };
  } finally {
    out.mockRestore();
    err.mockRestore();
  }
}

describe('sharpee lens examinable — the real path', () => {
  afterEach(() => vi.restoreAllMocks());

  it('prints orchard\'s soundness header: every room reached and 92 forms examined, and exits 0', async () => {
    const { code, stdout } = await run(['examinable', ORCHARD, '--seed', '42']);
    expect(code).toBe(0);
    expect(stdout).toContain('rooms reached     5 of 5 declared');
    expect(stdout).toContain('phrases examined  92');
    expect(stdout).toContain('by class          not-in-scope 40, resolved-described 6, number-form 6');
    expect(stdout).toContain('Absence is not proof');
  }, 120_000);

  it('reports scullery\'s whetstone as answering with no text, as JSON, and exits 0 with findings present', async () => {
    const { code, stdout } = await run(['examinable', SCULLERY, '--seed', '42', '--json']);
    expect(code).toBe(0);
    const report = JSON.parse(stdout) as ExaminableLensReport;
    expect(report.reach).toMatchObject({ roomsReached: 2, roomsDeclared: 2, unreached: [] });
    expect(report.phrasesExecuted).toBe(42);
    const whetstone = report.findings.find((finding) => finding.phrase === 'whetstone');
    expect(whetstone).toMatchObject({ kind: 'resolved-default', target: 'whetstone', sources: ['room'] });
    expect(report.findings.length).toBe(20);
  }, 120_000);

  // The refusal of a language with no extractor is not reachable from a
  // `.story` file: Chord writes every IR's language as `en-US`, and this
  // command compiles the story itself. It is pinned where it is reachable,
  // on an IR whose language is changed, in branch-tester's
  // `examinable-lens-real-path.test.ts` ("the language guard").

  it('a place with no .story file is exit 2, naming the place, and nothing is walked', async () => {
    const nowhere = resolve(TEST_STORIES, 'no-such-story-here');
    const { code, stdout, stderr } = await run(['examinable', nowhere]);
    expect(code).toBe(2);
    expect(stdout).toBe('');
    expect(stderr.trim()).toBe(`lens: no .story file found at ${nowhere}`);
  });

  it('rejects an unknown lens and a bad budget as usage errors, exit 2', async () => {
    expect((await run(['declared-state', ORCHARD])).code).toBe(2);
    const bad = await run(['examinable', ORCHARD, '--max-seconds', '0']);
    expect(bad.code).toBe(2);
    expect(bad.stderr).toContain('--max-seconds takes a whole number of at least 1');
    // The walk's flags went with the walk (ADR-408 Amendment 1).
    expect((await run(['examinable', ORCHARD, '--max-states', '600'])).code).toBe(2);
  });
});
