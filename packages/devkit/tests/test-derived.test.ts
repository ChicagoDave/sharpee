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
    expect(stdout).toContain('Derived rule tests (ADR-356): 3 branches');
    expect(stdout).toContain('Branches exercised: 2 / 3');
    expect(stdout).toContain('Not exercised (1):');
    expect(stdout.some((line) => /^ {2}derived-skip\.story:\d+ · brass lamp · on examining — timer-phase/.test(line))).toBe(true);
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
