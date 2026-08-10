/**
 * skip-executes.test.ts — skip/todo claims execute their command.
 *
 * ADR-294 D2: a skip survives for commands whose output is deliberately not
 * asserted — output not asserted, command still run. Pinned here after the
 * pre-fix runner returned before execution (a skipped `> north` before
 * `$save` produced a turn-0 save — ok-any-default plan, Finding 13).
 *
 * Derived from the Behavior Statement: a skipped turn advances world state
 * and captures output/events without evaluating assertions; an engine error
 * during the skipped turn still fails the transcript. Transcripts are built
 * in memory, the same shape the tree-walker synthesizes from document lines
 * (a document card's `skip: true` becomes a `skip` assertion).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { EngineRandomService } from '@sharpee/engine';
import { runTranscript } from '../src/runner.js';
import type { Assertion, Transcript, TranscriptCommand, TranscriptItem } from '../src/types.js';

/** Build an in-memory transcript the way the tree-walker does from a line. */
function transcriptOf(...commands: Array<{ input: string; assertions?: Assertion[] }>): Transcript {
  const built: TranscriptCommand[] = commands.map((c) => ({
    lineNumber: 0,
    input: c.input,
    expectedOutput: [],
    assertions: c.assertions ?? [],
  }));
  const items: TranscriptItem[] = built.map((command) => ({ type: 'command', command }));
  return { filePath: '', header: {}, commands: built, items, comments: [] };
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

describe('skip/todo claims execute their command (ADR-294 D2)', () => {
  it('a skipped command runs and advances state visible to the next turn', async () => {
    const transcript = transcriptOf(
      { input: 'north', assertions: [{ type: 'skip' }] },
      { input: 'where', assertions: [{ type: 'ok-contains', value: 'Position 1' }] },
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
    const transcript = transcriptOf({ input: 'north', assertions: [{ type: 'skip' }] });
    const engine = statefulEngine();

    const result = await runTranscript(transcript, engine as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].actualOutput).toBe('You go north.');
    expect(result.commands[0].assertionResults).toHaveLength(1);
    expect(result.commands[0].assertionResults[0].assertion.type).toBe('skip');
  });

  it('a todo command runs and advances state exactly like skip', async () => {
    const transcript = transcriptOf(
      { input: 'north', assertions: [{ type: 'todo', reason: 'tighten later' }] },
      { input: 'where', assertions: [{ type: 'ok-contains', value: 'Position 1' }] },
    );
    const engine = statefulEngine();

    const result = await runTranscript(transcript, engine as never, {});

    expect(engine.executed).toEqual(['north', 'where']);
    expect(result.status).toBe('passed');
    expect(result.commands[0].skipped).toBe(true);
  });

  it('an engine error during a skipped turn still fails the transcript', async () => {
    const transcript = transcriptOf({ input: 'crash', assertions: [{ type: 'skip' }] });
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
