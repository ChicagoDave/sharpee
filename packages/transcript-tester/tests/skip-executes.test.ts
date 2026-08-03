/**
 * skip-executes.test.ts — `[SKIP]`/`[TODO]` execute their command.
 *
 * ADR-294 D2: "`[SKIP]` survives for commands whose output is deliberately
 * not asserted" — output not asserted, command still run. Pinned here after
 * the pre-fix runner returned before execution (a `[SKIP]`ed `> north`
 * before `$save` produced a turn-0 save — ok-any-default plan, Finding 13).
 *
 * Derived from the Behavior Statement: a skipped turn advances world state
 * and captures output/events without evaluating assertions; an engine error
 * during the skipped turn still fails the transcript.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EngineRandomService } from '@sharpee/engine';
import { parseTranscript } from '../src/parser.js';
import { runTranscript } from '../src/runner.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-skip-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(source: string, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

/**
 * Stub story layer with observable state: `> north` mutates `position`,
 * `> where` reads it back, `> crash` throws. Real EngineRandomService per
 * the suite's convention (no draws occur here).
 */
function statefulEngine() {
  const service = new EngineRandomService(42);
  const executed: string[] = [];
  let position = 0;
  return {
    executed,
    executeCommand: (cmd: string) => {
      executed.push(cmd);
      if (cmd === 'north') {
        position += 1;
        return 'You go north.';
      }
      if (cmd === 'where') {
        return `Position ${position}.`;
      }
      if (cmd === 'crash') {
        throw new Error('engine exploded');
      }
      return `You ${cmd}.`;
    },
    world: {},
    engine: {
      registerSaveRestoreHooks() { /* unused */ },
      async save() { return true; },
      async restore() { return true; },
      getMasterSeed: () => 42,
      getRandomService: () => service,
      setRandomTraceEnabled() { /* unused */ }
    }
  };
}

describe('[SKIP]/[TODO] execute their command (ADR-294 D2)', () => {
  it('a [SKIP]ed command runs and advances state visible to the next turn', async () => {
    const transcript = fixture(
      'title: T\n---\n> north\n[SKIP]\n\n> where\n[OK: contains "Position 1"]\n'
    );
    const engine = statefulEngine();

    const result = await runTranscript(transcript, engine as never, {});

    expect(engine.executed).toEqual(['north', 'where']);
    expect(result.status).toBe('passed');
    expect(result.commands[0].skipped).toBe(true);
    expect(result.commands[0].passed).toBe(true);
    expect(result.skipped).toBe(1);
  });

  it('captures the skipped turn output without asserting on it', async () => {
    const transcript = fixture('title: T\n---\n> north\n[SKIP]\n');
    const engine = statefulEngine();

    const result = await runTranscript(transcript, engine as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].actualOutput).toBe('You go north.');
    expect(result.commands[0].assertionResults).toHaveLength(1);
    expect(result.commands[0].assertionResults[0].assertion.type).toBe('skip');
  });

  it('a [TODO] command runs and advances state exactly like [SKIP]', async () => {
    const transcript = fixture(
      'title: T\n---\n> north\n[TODO: tighten later]\n\n> where\n[OK: contains "Position 1"]\n'
    );
    const engine = statefulEngine();

    const result = await runTranscript(transcript, engine as never, {});

    expect(engine.executed).toEqual(['north', 'where']);
    expect(result.status).toBe('passed');
    expect(result.commands[0].skipped).toBe(true);
  });

  it('an engine error during a [SKIP]ed turn still fails the transcript', async () => {
    const transcript = fixture('title: T\n---\n> crash\n[SKIP]\n');
    const engine = statefulEngine();

    const result = await runTranscript(transcript, engine as never, {});

    expect(result.status).toBe('failed');
    expect(result.commands[0].skipped).toBe(false);
    expect(result.commands[0].passed).toBe(false);
    expect(result.commands[0].assertionResults[0].message).toMatch(
      /Engine error during skipped command: engine exploded/
    );
  });
});
