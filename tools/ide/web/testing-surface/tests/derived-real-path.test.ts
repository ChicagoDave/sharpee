/**
 * derived-real-path.test.ts — the derived tier's wire, folded from a REAL
 * `sharpee test --tree --json` run of a real story (rule 13a — nothing
 * stubbed), and the run column's report lines pinned to the CLI's own
 * stderr report for the same run (GH #524 Phase 2).
 *
 * The story is the test story `test-stories/orchard` (OB-33), read and
 * never written: the run consumes its `.story` and `.tests.json` exactly as
 * the Testing tab's Run button does, with the tab's exact arguments. What is
 * asserted: every `derived-branch` line decodes and folds to a row; the one
 * `derived-summary` folds and its numbers agree with the rows; and the text
 * the tab would print for the summary is, line for line, the tail of what
 * the CLI printed on stderr — so a change to either renderer that the other
 * does not follow fails here.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { derivedReportLines, groupDerivedRows } from '../src/derived';
import { beginRun, createRunState, finishRun, foldRunLine } from '../src/run';
import { spawnCli } from './spawn-cli';

const testsDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testsDir, '../../../../..');
const devkitCli = join(repoRoot, 'packages/devkit/dist/cli.js');
const storyDir = join(repoRoot, 'test-stories/orchard');
const storyFile = join(storyDir, 'orchard.story');

const available = existsSync(devkitCli) && existsSync(storyFile);

describe.skipIf(!available)('the derived tier from a real run of the orchard test story', () => {
  it('folds every derived-branch and the summary, and the tab\'s report lines are the CLI\'s stderr tail', async () => {
    // The Testing tab's exact spawn (TestRunner.treeRunArguments; the
    // Avalonia head's RunTreeTestsForSurfaceAsync).
    const run = await spawnCli(
      [devkitCli, 'test', storyFile, '--tree', '--capture-output', '--capture-world', '--json'],
      storyDir,
    );
    expect(run.error).toBeUndefined();

    const state = createRunState();
    beginRun(state);
    const stdoutLines = run.stdout.split('\n').filter(line => line.trim() !== '');
    for (const line of stdoutLines) foldRunLine(state, line);
    finishRun(state, run.status === 0);

    // Every derived-branch line on the wire is a row — none rejected by the guard.
    const branchLines = stdoutLines.filter(line => line.includes('"type":"derived-branch"'));
    expect(branchLines.length).toBeGreaterThan(0);
    expect(state.derived).toHaveLength(branchLines.length);

    // The one summary, and it agrees with the rows it summarises.
    const summary = state.derivedSummary;
    expect(summary).toBeDefined();
    if (!summary) return;
    const groups = groupDerivedRows(state.derived);
    expect(summary.branches.declared).toBe(state.derived.length);
    expect(summary.branches.passed).toBe(groups.passed);
    expect(summary.branches.failed).toBe(groups.failed);
    expect(summary.branches.exercised).toBe(groups.passed + groups.failed);
    expect(summary.branches.gaps).toHaveLength(groups.skipped + groups.errors);
    expect(state.tally?.rules).toEqual({
      passed: groups.passed, failed: groups.failed, skipped: groups.skipped, errors: groups.errors,
    });

    // The CLI's own report on stderr: from the blank line before
    // `Branches exercised:` to the end is exactly what the tab prints.
    const stderrLines = run.stderr.split('\n');
    while (stderrLines.length > 0 && stderrLines[stderrLines.length - 1] === '') stderrLines.pop();
    const at = stderrLines.findIndex(line => line.startsWith('Branches exercised:'));
    expect(at).toBeGreaterThan(0);
    const expected = derivedReportLines(summary, 'orchard.story');
    expect(stderrLines.slice(at - 1, at - 1 + expected.length)).toEqual(expected);
    // The orchard's manifest selects no claims fragment, so the derived
    // report is the end of stderr: nothing follows it.
    expect(stderrLines.slice(at - 1 + expected.length)).toEqual([]);
  }, 300_000);
});
