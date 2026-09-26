/**
 * narrative-support.test.ts — the narrative-walk suite's support module,
 * `support/fernhill-run.ts`: one spawn per process for fernhill's run
 * (proved by counting, not assumed), and a malformed or unfinished process
 * rejected by name rather than read as an empty result.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  resetFernhillMemo,
  runFernhillTest,
  runTestJson,
  runWorldIndex,
  spawnCli,
  type Spawner,
} from './support/fernhill-run';

describe('runFernhillTest', () => {
  beforeAll(() => resetFernhillMemo());

  it('spawns fernhill\'s test --json once and shares the run', () => {
    let spawns = 0;
    const counting: Spawner = (args, cwd) => {
      spawns += 1;
      return spawnCli(args, cwd);
    };
    const first = runFernhillTest(counting);
    const second = runFernhillTest(counting);
    expect(spawns).toBe(1);
    expect(second).toBe(first);
    expect(first.events[0]?.type).toBe('run-start');
    expect(first.events.at(-1)?.type).toBe('run-end');
  }, 60_000);
});

describe('runTestJson rejects what is not a run', () => {
  it('a stdout line that is not a run event throws naming the line', () => {
    const garbage: Spawner = () => ({ status: 0, stdout: '{"type":"run-start"}\nnot json\n', stderr: '' });
    expect(() => runTestJson('/nowhere', garbage)).toThrow(/line 1 is not a run event/);
  });

  it('a process that never exited throws as a timeout, never as an empty run', () => {
    const hung: Spawner = () => ({ status: null, stdout: '', stderr: 'killed' });
    expect(() => runTestJson('/nowhere', hung)).toThrow(/did not exit/);
  });

  it('a non-zero exit is a result, not a throw — exit 1 is what the beats assert on', () => {
    const failing: Spawner = () => ({
      status: 1,
      stdout: '{"schemaVersion":2,"seq":0,"elapsedMs":0,"type":"run-start","mode":"tree"}\n',
      stderr: 'Derived failures: 1\n',
    });
    const run = runTestJson('/nowhere', failing);
    expect(run.status).toBe(1);
    expect(run.events).toHaveLength(1);
    expect(run.stderr).toContain('Derived failures: 1');
  });
});

describe('runWorldIndex', () => {
  it('stdout that is not JSON throws, since the command promises a document either way', () => {
    const broken: Spawner = () => ({ status: 1, stdout: 'Error: boom', stderr: '' });
    expect(() => runWorldIndex('/nowhere.ir.json', broken)).toThrow(/not JSON/);
  });
});
