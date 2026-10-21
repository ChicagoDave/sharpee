/**
 * claims-real-path.test.ts — the claims tier's wire, folded from a REAL
 * `sharpee test --tree --json` run of a real story (rule 13a — nothing
 * stubbed), and the run column's claim lines pinned to the CLI's own stderr
 * report for the same run (ADR-365 D6, ADR-367 D6; GH #555).
 *
 * The story is the repo's fernhill (`branch-stories/fernhill`), read and
 * never written: the run uses the Testing tab's exact arguments. What is
 * asserted: every `claim-result` line decodes and folds to a row; the one
 * `claims-summary` folds and agrees with the rows; the locked claim's row
 * carries its lock with the card to visit; and the text the tab would print
 * for every claim and every lock is, line for line, what the CLI printed on
 * stderr after the walks — so a change to either vocabulary that the other
 * does not follow fails here.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { claimHeadline, claimsRatioLine } from '@sharpee/branch-tester/claim-report';
import { claimLockText, claimWhyText } from '../src/claims';
import { beginRun, createRunState, finishRun, foldRunLine } from '../src/run';
import { spawnCli } from './spawn-cli';

const testsDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testsDir, '../../../../..');
const devkitCli = join(repoRoot, 'packages/devkit/dist/cli.js');
const fernhillDir = join(repoRoot, 'branch-stories/fernhill');
const fernhillStory = join(fernhillDir, 'fernhill.story');

const available = existsSync(devkitCli) && existsSync(fernhillStory);

describe.skipIf(!available)('the claims tier from a real fernhill run', () => {
  it('folds every claim-result and the summary, the lock names its card, and the tab\'s lines are the CLI\'s stderr lines', async () => {
    const run = await spawnCli(
      [devkitCli, 'test', fernhillStory, '--tree', '--capture-output', '--capture-world', '--json'],
      fernhillDir,
    );
    expect(run.error).toBeUndefined();

    const state = createRunState();
    beginRun(state);
    const stdoutLines = run.stdout.split('\n').filter(line => line.trim() !== '');
    for (const line of stdoutLines) foldRunLine(state, line);
    finishRun(state, run.status === 0);

    const claimLines = stdoutLines.filter(line => line.includes('"type":"claim-result"'));
    expect(claimLines.length).toBe(10);
    expect(state.claims).toHaveLength(10);
    const summary = state.claimsSummary;
    expect(summary).toBeDefined();
    if (!summary) return;
    expect(summary.source).toBe('fernhill.claims.chord');
    expect(summary.declared).toBe(state.claims.length);
    expect(summary.held).toBe(state.claims.filter(row => row.verdict === 'held').length);
    expect(summary.violated).toBe(state.claims.filter(row => row.verdict === 'violated').length);
    expect(summary.floored).toBe(true);

    // The locked claim (Phase 16's lock on fernhill) carries its lock and the card it visits.
    const locked = state.claims.find(row => row.name === 'the deed box is open');
    expect(locked?.locks).toHaveLength(1);
    expect(locked?.locks?.[0]).toMatchObject({ lineId: 'hpjuaufx', turn: 22, outcome: 'held' });
    expect(locked?.locks?.[0]?.cardId).toBeDefined();

    // Claims never gate (ADR-365 D9): the exit code is the tree's.
    expect(run.status).toBe(0);

    // The CLI's own report on stderr, from the ratio line: the ratio, then
    // the walk lines (timings vary), then every claim and every lock — the
    // tab's words for the last two, line for line.
    const stderrLines = run.stderr.split('\n');
    const at = stderrLines.findIndex(line => line.startsWith('claims: '));
    expect(at).toBeGreaterThan(0);
    expect(stderrLines[at]).toBe(claimsRatioLine(summary));
    const firstClaim = stderrLines.findIndex((line, index) => index > at && /^(HELD|VIOLATED|UNPROVEN) {2}/.test(line));
    expect(firstClaim).toBeGreaterThan(at);
    const expected = [
      ...state.claims.map(row => `${claimHeadline(row)} — ${claimWhyText(row)}`),
      ...state.claims.flatMap(row => (row.locks ?? []).map(pin => `  ${claimLockText(row, pin)}`)),
    ];
    expect(stderrLines.slice(firstClaim, firstClaim + expected.length)).toEqual(expected);
  }, 300_000);
});
