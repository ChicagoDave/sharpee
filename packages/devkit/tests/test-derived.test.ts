/**
 * test-derived.test.ts — `sharpee test`'s derived rule-test tier (ADR-356
 * D5a) at the command surface: the suite runs by default beside the tree
 * document, prints the branches ratio and the gap list, a SKIPPED branch
 * leaves the exit code at 0, and a derived failure exits 1. Each case runs
 * the real command function over a real fixture project — the compiled
 * `@sharpee/branch-tester` and its engine behind it, no stub.
 *
 * Owner context: devkit test suite.
 */
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { isRunEvent, type DerivedBranchEvent, type DerivedRunSummaryEvent, type RunEvent } from '@sharpee/ide-protocol';
import { runTestCommand } from '../src/commands/test.js';

const PASS_PROJECT = path.resolve(__dirname, 'fixtures', 'derived-pass');
const FAIL_PROJECT = path.resolve(__dirname, 'fixtures', 'derived-fail');

async function runCapturing(args: string[]): Promise<{ code: number; stdout: string[]; stderr: string[] }> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const code = await runTestCommand(args);
    return {
      code,
      stdout: log.mock.calls.map((call) => call.join(' ')),
      stderr: error.mock.calls.map((call) => call.join(' ')),
    };
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
}

describe('sharpee test — the derived tier runs by default (ADR-356 D5a)', () => {
  it('prints the ratio and the gap list, and a SKIPPED branch leaves the exit code at 0', async () => {
    const { code, stdout } = await runCapturing([PASS_PROJECT]);
    expect(code).toBe(0);
    expect(stdout).toContain('Derived rule tests (ADR-356): 4 branches');
    expect(stdout).toContain('Branches exercised: 3 / 4');
    expect(stdout).toContain('Not exercised (1):');
    expect(stdout.some((line) => /^ {2}derived-skip\.story:\d+ · brass lamp · on smelling — predicate-is/.test(line))).toBe(true);
    expect(stdout.some((line) => line.startsWith('✓ brass lamp · on touching'))).toBe(true);
    // D5's other two ratios, printed in the same report: the fixture declares
    // no ending and one room, which both tiers stand in.
    expect(stdout).toContain('Endings reached: 0 / 0');
    expect(stdout).toContain('Rooms entered: 1 / 1');
  }, 60_000);

  it('a derived failure exits 1 and names the branch and the parse failure', async () => {
    const { code, stdout } = await runCapturing([FAIL_PROJECT]);
    expect(code).toBe(1);
    expect(stdout).toContain('Derived failures: 1');
    expect(stdout.some((line) => line.startsWith('✗ mat · on entering_room — parse failure: no language pattern for if.action.entering_room'))).toBe(true);
  }, 60_000);

  it('under --json the report goes to stderr and the exit code still carries the failure', async () => {
    const { code, stdout, stderr } = await runCapturing([FAIL_PROJECT, '--json']);
    expect(code).toBe(1);
    expect(stdout.some((line) => line.includes('Derived rule tests'))).toBe(false);
    expect(stderr).toContain('Derived failures: 1');
  }, 60_000);
});

/** Run the real command with `--json`, capturing the NDJSON stream stdout carries and the text stderr carries. */
async function runStreaming(args: string[]): Promise<{ code: number; events: RunEvent[]; stderr: string[] }> {
  const chunks: string[] = [];
  const write = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const code = await runTestCommand([...args, '--json']);
    const lines = chunks.join('').split('\n').filter((line) => line.length > 0);
    const events = lines.map((line) => {
      const parsed: unknown = JSON.parse(line);
      if (!isRunEvent(parsed)) throw new Error(`not a run event: ${line}`);
      return parsed;
    });
    return { code, events, stderr: error.mock.calls.map((call) => call.join(' ')) };
  } finally {
    write.mockRestore();
    log.mockRestore();
    error.mockRestore();
  }
}

describe('sharpee test --json — the derived tier rides the run-event stream (GH #524)', () => {
  it('emits one derived-branch per branch after the tree and one derived-summary before run-end, every line a valid event', async () => {
    const { code, events } = await runStreaming([PASS_PROJECT]);
    expect(code).toBe(0);

    const branches = events.filter((event): event is DerivedBranchEvent => event.type === 'derived-branch');
    const summaries = events.filter((event): event is DerivedRunSummaryEvent => event.type === 'derived-summary');
    expect(branches).toHaveLength(4);
    expect(summaries).toHaveLength(1);

    // Order on the wire: every tree event, then the branches as they complete, then the summary, then run-end.
    const lastTreeSeq = Math.max(...events.filter((event) => event.type === 'transcript-end').map((event) => event.seq));
    const runEnd = events.find((event) => event.type === 'run-end')!;
    expect(Math.min(...branches.map((event) => event.seq))).toBeGreaterThan(lastTreeSeq);
    expect(summaries[0].seq).toBeGreaterThan(Math.max(...branches.map((event) => event.seq)));
    expect(runEnd.seq).toBeGreaterThan(summaries[0].seq);
    expect(events.at(-1)!.type).toBe('run-end');

    // D5a on the wire: the SKIPPED branch is its own status with a named shape, and it did not fail the run.
    const skipped = branches.find((event) => event.status === 'skipped')!;
    expect(skipped.label).toBe('brass lamp · on smelling');
    expect(skipped.shape).toBe('predicate-is');
    expect(skipped.span?.line).toEqual(expect.any(Number));
    expect(branches.filter((event) => event.status === 'passed')).toHaveLength(3);
  }, 60_000);

  it('the summary carries the ratios the text report prints, and the text report on stderr is unchanged', async () => {
    const { events, stderr } = await runStreaming([PASS_PROJECT]);
    const summary = events.find((event): event is DerivedRunSummaryEvent => event.type === 'derived-summary')!;
    expect(summary.branches).toMatchObject({ declared: 4, exercised: 3, passed: 3, failed: 0 });
    expect(summary.branches.gaps.map((gap) => [gap.label, gap.status, gap.shape])).toEqual([
      ['brass lamp · on smelling', 'skipped', 'predicate-is'],
    ]);
    expect(summary.endings).toEqual({ declared: 0, reached: 0, unreached: [], unnamed: [] });
    expect(summary.rooms).toEqual({ declared: 1, entered: 1, unentered: [] });

    // The stderr report under --json is the same text the plain run prints on stdout, line for line.
    expect(stderr).toContain(`Branches exercised: ${summary.branches.exercised} / ${summary.branches.declared}`);
    expect(stderr).toContain(`Endings reached: ${summary.endings.reached} / ${summary.endings.declared}`);
    expect(stderr).toContain(`Rooms entered: ${summary.rooms.entered} / ${summary.rooms.declared}`);
    const { stdout: plain } = await runCapturing([PASS_PROJECT]);
    const start = plain.findIndex((line) => line.startsWith('Derived rule tests'));
    expect(start).toBeGreaterThan(0);
    expect(stderr).toEqual(plain.slice(start - 1));
  }, 120_000);

  it('a failed branch carries its failure line with status failed, and run-end carries exit code 1', async () => {
    const { code, events } = await runStreaming([FAIL_PROJECT]);
    expect(code).toBe(1);
    const failed = events.filter((event): event is DerivedBranchEvent => event.type === 'derived-branch' && event.status === 'failed');
    expect(failed).toHaveLength(1);
    expect(failed[0].label).toBe('mat · on entering_room');
    expect(failed[0].failure).toBe('parse failure: no language pattern for if.action.entering_room');
    expect(Object.keys(failed[0])).not.toContain('shape');
    const summary = events.find((event): event is DerivedRunSummaryEvent => event.type === 'derived-summary')!;
    expect(summary.branches.failed).toBe(1);
    expect(summary.branches.gaps).toEqual([]);
    const runEnd = events.find((event) => event.type === 'run-end')!;
    expect(runEnd.type === 'run-end' && runEnd.exitCode).toBe(1);
  }, 60_000);
});
