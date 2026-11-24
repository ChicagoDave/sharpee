/**
 * lens-real-path.test.ts — the examinable lens's tier, folded from a REAL
 * `sharpee test --tree --json` run of a real story (rule 13a — nothing
 * stubbed; ADR-408 D8).
 *
 * The story is the test story `test-stories/scullery` (OB-54 to OB-61), read
 * and never written; the run uses the Testing tab's exact arguments. What is
 * asserted: every `lens-finding` line decodes and folds to a row; the one
 * `lens-summary` folds into the section's reported state; the whetstone's
 * row carries the passage span and declaration span the section's card
 * needs; and the run's exit stays the tree's (D7).
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { lensCardRequest, lensDescriptionRequest, lensStatusOf, openSourcePost } from '../src/lens';
import { beginRun, createRunState, finishRun, foldRunLine } from '../src/run';
import { spawnCli } from './spawn-cli';

const testsDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testsDir, '../../../../..');
const devkitCli = join(repoRoot, 'packages/devkit/dist/cli.js');
const storyDir = join(repoRoot, 'test-stories/scullery');
const storyFile = join(storyDir, 'scullery.story');

const available = existsSync(devkitCli) && existsSync(storyFile);

describe.skipIf(!available)('the lens tier from a real run of the scullery test story', () => {
  it('folds every lens-finding and the summary, and the whetstone row carries the spans its card needs', async () => {
    const run = await spawnCli(
      [devkitCli, 'test', storyFile, '--tree', '--capture-output', '--capture-world', '--json'],
      storyDir,
    );
    expect(run.error).toBeUndefined();

    const state = createRunState();
    beginRun(state);
    const lines = run.stdout.split('\n').filter((line) => line.trim() !== '');
    for (const line of lines) foldRunLine(state, line);
    finishRun(state, run.status === 0);

    const findingLines = lines.filter((line) => line.includes('"type":"lens-finding"'));
    expect(findingLines).toHaveLength(20);
    expect(state.lensFindings).toHaveLength(20);

    const status = lensStatusOf(state);
    expect(status.kind).toBe('reported');
    if (status.kind !== 'reported') return;
    expect(status.summary).toMatchObject({ seed: 42, maxSeconds: 30, phrasesExecuted: 42 });
    expect(status.summary.reach).toMatchObject({ roomsReached: 2, roomsDeclared: 2, stoppedBy: 'every-route' });
    expect(state.lensAbsence).toBeUndefined();

    const whetstone = state.lensFindings.find((row) => row.phrase === 'whetstone' && row.kind === 'resolved-default');
    expect(whetstone).toMatchObject({ targetId: 'whetstone', targetSpan: { line: 35 } });
    expect(whetstone?.sources[0]).toMatchObject({ key: 'scullery.description', span: { line: 18, endLine: 19 } });

    // The card's activation asks for the phrase's range devkit located (ADR-408 D9), and its
    // "Write the description" offer for the whetstone's declaration line (D10).
    const request = lensCardRequest(whetstone!);
    expect(request).toEqual({ file: null, line: 19, range: { column: 3, length: 9 } });
    expect(openSourcePost(request!.file, request!.line, request!.range)).toEqual({ file: null, line: 19, column: 3, length: 9 });
    expect(readFileSync(storyFile, 'utf8').split('\n')[18].slice(3 - 1, 3 - 1 + 9)).toBe('whetstone');
    expect(lensDescriptionRequest(whetstone!)).toEqual({ file: null, line: 35 });

    // A lens never gates (ADR-408 D7): findings are present and the exit is the tree's.
    expect(run.status).toBe(0);
  }, 120_000);
});
