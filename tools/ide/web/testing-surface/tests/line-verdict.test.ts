/**
 * line-verdict.test.ts — the outline's last-run verdicts (ADR-357 D4).
 *
 * The first two describes pin the mapping from the wire's per-line status to
 * the five verdicts, and the heading roll-up's order. The last runs a REAL
 * `sharpee test --tree --json` over a scratch copy of fernhill with one claim
 * planted to fail (rule 13a — the fold is of the CLI's own stream, nothing
 * hand-written), and checks AC-1: the planted line and its fork heading read
 * fail, every other line reads pass. It also runs a tree the CLI refuses, the
 * case where every line reads "no result" exactly as a never-run tree does,
 * and checks the run column's note is there to say so. The real fernhill is
 * read, never written; scratch copies are planted through the narrative
 * suites' edit path (`scripts/__tests__/support/scratch-story.ts`).
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// The one way test code writes a tree: the narrative suites' edit path.
import { copyStoryToScratch, editTree, readTree } from '../../../../../scripts/__tests__/support/scratch-story';
import { rollUpVerdicts, verdictOfResult, type LineVerdict } from '../src/line-verdict';
import { outlineOf, type Outline } from '../src/outline';
import { spawnCli } from './spawn-cli';
import {
  beginRun,
  createRunState,
  finishRun,
  foldRunLine,
  type RunColumnState,
  type TranscriptRunResult,
} from '../src/run';

const result = (status: TranscriptRunResult['status']): TranscriptRunResult =>
  ({ status, passed: 0, failed: 0, commands: [], moreFailures: 0 });

describe('verdictOfResult — the wire status mapping', () => {
  it('reads passed as pass', () => {
    expect(verdictOfResult(result('passed'))).toBe('pass');
  });

  it('reads failed and error as fail', () => {
    expect(verdictOfResult(result('failed'))).toBe('fail');
    expect(verdictOfResult(result('error'))).toBe('fail');
  });

  it('reads unreached as its own verdict, not as fail', () => {
    expect(verdictOfResult(result('unreached'))).toBe('unreached');
  });

  it('reads skipped and a missing result as no result', () => {
    expect(verdictOfResult(result('skipped'))).toBe('none');
    expect(verdictOfResult(undefined)).toBe('none');
  });
});

describe('rollUpVerdicts — a heading takes the worst of its lines', () => {
  it('orders fail over unreached over stale over none over pass', () => {
    const order: LineVerdict[] = ['fail', 'unreached', 'stale', 'none', 'pass'];
    for (let worst = 0; worst < order.length; worst++) {
      const lines = order.slice(worst).reverse();
      expect(rollUpVerdicts(lines)).toBe(order[worst]);
    }
  });

  it('reads pass only when every line passed', () => {
    expect(rollUpVerdicts(['pass', 'pass', 'pass'])).toBe('pass');
    expect(rollUpVerdicts(['pass', 'none', 'pass'])).toBe('none');
  });

  it('reads none for a fork with no lines', () => {
    expect(rollUpVerdicts([])).toBe('none');
  });
});

const testsDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testsDir, '../../../../..');
const devkitCli = join(repoRoot, 'packages/devkit/dist/cli.js');
const fernhillDir = join(repoRoot, 'branch-stories/fernhill');
const available = existsSync(devkitCli) && existsSync(join(fernhillDir, 'fernhill.story'));

/** Text no fernhill turn prints, so a `contains` claim on it must fail. */
const PLANTED = 'a sentence fernhill never prints, planted to fail';

/** The Testing tab's exact spawn (TestRunner.treeRunArguments), folded the way the tab folds it. */
async function runAndFold(storyDir: string): Promise<{ state: RunColumnState; status: number | null; events: number }> {
  const run = await spawnCli(
    [devkitCli, 'test', join(storyDir, 'fernhill.story'), '--tree', '--capture-output', '--capture-world', '--json'],
    storyDir,
  );
  expect(run.error).toBeUndefined();
  const lines = run.stdout.split('\n').filter((line) => line.trim() !== '');
  const state = createRunState();
  beginRun(state);
  for (const line of lines) foldRunLine(state, line);
  finishRun(state, run.status === 0);
  return { state, status: run.status, events: lines.length };
}

/** Every line id the outline holds, the main line first. */
function lineIdsOf(outline: Outline): string[] {
  return [outline.root.lineId, ...outline.forks.flatMap((fork) => fork.lines.map((line) => line.lineId))];
}

describe.skipIf(!available)('AC-1 — the tint from a real fernhill run with one planted failure', () => {
  it('reads the planted line and its fork heading as fail, and every other line as pass', async () => {
    const scratch = copyStoryToScratch(fernhillDir, 'ts-verdict-');
    try {
      const treeDir = join(scratch.dir, 'fernhill.tests');

      // Plant through the edit path the narrative suites use: load, change the
      // claim in memory, save as the Testing tab saves — so the canonical gate passes.
      const plantedLine = editTree(treeDir, (document) => {
        const branch = document.cards.find((card) => (card.branches ?? []).length > 0)!.branches![0];
        const card = branch.cards.find((c) => c.type === 'turn')!;
        card.assertions = { ...(card.assertions ?? {}), contains: [...(card.assertions?.contains ?? []), PLANTED] };
        return branch.id;
      });

      const { state, events } = await runAndFold(scratch.dir);
      // The run happened before anything about the tint is believed: a refused
      // tree produces no events, and every line would read "no result".
      expect(events).toBeGreaterThan(0);
      expect(state.results.size).toBeGreaterThan(0);

      const outline = outlineOf(readTree(treeDir));
      const verdictOf = (lineId: string) => verdictOfResult(state.results.get(lineId));

      expect(lineIdsOf(outline)).toContain(plantedLine);
      expect(verdictOf(plantedLine)).toBe('fail');
      for (const lineId of lineIdsOf(outline)) {
        if (lineId !== plantedLine) expect({ lineId, verdict: verdictOf(lineId) }).toEqual({ lineId, verdict: 'pass' });
      }

      const plantedFork = outline.forks.find((fork) => fork.lines.some((l) => l.lineId === plantedLine));
      expect(rollUpVerdicts(plantedFork!.lines.map((l) => verdictOf(l.lineId)))).toBe('fail');
      for (const fork of outline.forks) {
        if (fork !== plantedFork) expect(rollUpVerdicts(fork.lines.map((l) => verdictOf(l.lineId)))).toBe('pass');
      }
    } finally {
      scratch.cleanup();
    }
  }, 300_000);

  it('a run the CLI refuses leaves every line untinted and carries the pipeline note', async () => {
    const scratch = copyStoryToScratch(fernhillDir, 'ts-verdict-refused-');
    try {
      const treeDir = join(scratch.dir, 'fernhill.tests');
      // Deliberately outside the edit path: re-indent one segment so it is no
      // longer canonical, which the CLI refuses before running anything.
      const segment = readdirSync(treeDir).find((name) => name.endsWith('.json') && name !== 'manifest.json')!;
      const text = readFileSync(join(treeDir, segment), 'utf8');
      writeFileSync(join(treeDir, segment), JSON.stringify(JSON.parse(text), null, 4));

      const { state, status, events } = await runAndFold(scratch.dir);
      expect(status).not.toBe(0);
      expect(events).toBe(0);

      // To the outline a refused run looks exactly like a tree never run.
      const outline = outlineOf(readTree(treeDir));
      for (const lineId of lineIdsOf(outline)) expect(verdictOfResult(state.results.get(lineId))).toBe('none');
      // So the run column's note is the only thing telling the author it did not
      // run, and it must be there.
      expect(state.note).toBeDefined();
    } finally {
      scratch.cleanup();
    }
  }, 300_000);
});
