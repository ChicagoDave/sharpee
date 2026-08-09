/**
 * failure-field.test.ts — a failed command carries its first assertion's
 * message as `CommandResult.failure` (ADR-306 Phase 6).
 *
 * The field is the one-line answer minimal consumers (the testing surface's
 * run column, the tab's detail pane) show without re-deriving it —
 * `assertionResults` never crosses the wire. Derived from the Behavior
 * Statement: present exactly when an assertion failed (first failed
 * message, verbatim); absent on passing results; runtime throws keep
 * riding `error` instead. Same optional-field pattern as `turn`/`ending`.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseTranscript } from '../src/parser.js';
import { runTranscript } from '../src/runner.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-failure-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(source: string, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

/** The story layer only — every command echoes, so assertions decide. */
function echoEngine() {
  return {
    executeCommand: (cmd: string) => `You ${cmd}.`,
    world: {}
  };
}

describe('CommandResult.failure (the run column\'s one-line source)', () => {
  it('a failed contains-assertion carries the runner\'s own message, verbatim', async () => {
    const transcript = fixture(
      'title: T\n---\n> east\n[OK: contains "Boiler Shed"]\n'
    );

    const result = await runTranscript(transcript, echoEngine() as never, {});

    expect(result.status).toBe('failed');
    expect(result.commands[0].failure).toBe('Output does not contain "Boiler Shed"');
  });

  it('the FIRST failed assertion\'s message wins when several fail', async () => {
    const transcript = fixture(
      'title: T\n---\n> east\n[OK: contains "first missing"]\n[OK: contains "second missing"]\n'
    );

    const result = await runTranscript(transcript, echoEngine() as never, {});

    expect(result.commands[0].failure).toBe('Output does not contain "first missing"');
  });

  it('a passing command carries no failure key at all', async () => {
    const transcript = fixture(
      'title: T\n---\n> east\n[OK: contains "You east"]\n'
    );

    const result = await runTranscript(transcript, echoEngine() as never, {});

    expect(result.status).toBe('passed');
    expect('failure' in result.commands[0]).toBe(false);
  });

  it('a failed opening assertion carries its message the same way', async () => {
    const transcript = fixture(
      'title: T\n---\n[OK: contains "a banner that never printed"]\n\n> east\n[OK: contains "You east"]\n'
    );

    const result = await runTranscript(transcript, echoEngine() as never, {});

    const opening = result.commands.find((c) => c.command.input === '(opening)');
    expect(opening?.passed).toBe(false);
    expect(opening?.failure).toBe('Output does not contain "a banner that never printed"');
  });

  it('a runtime throw rides error, not failure', async () => {
    const crashing = {
      executeCommand: () => { throw new Error('engine exploded'); },
      world: {}
    };
    const transcript = fixture(
      'title: T\n---\n> east\n[OK: contains "anything"]\n'
    );

    const result = await runTranscript(transcript, crashing as never, {});

    expect(result.commands[0].error).toBe('engine exploded');
  });
});
