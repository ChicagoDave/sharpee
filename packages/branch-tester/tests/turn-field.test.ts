/**
 * turn-field.test.ts — executed commands carry the engine's turn number.
 *
 * R4 (Phase 5 slice 4): turn numbers are engine knowledge — meta commands
 * share a turn, a refused action consumes one — so the runner reads each
 * command's turn off the engine wrapper's own `lastTurnResult` rather than
 * counting commands. Derived from the Behavior Statement: every executed
 * command's result carries `turn` when the seam reports it; a result built
 * without an execution, or against a seam that does not report turns,
 * carries none.
 *
 * Owner context: branch-tester test suite (tooling).
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
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-turn-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(source: string, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

/**
 * Stub engine that keeps a turn counter the way the real engine does:
 * `lastTurnResult.turn` is the turn the command executed AS, `score` is a
 * meta command that does not advance the counter, everything else does.
 * `crash` throws BEFORE updating the record — the previous command's turn
 * stays behind, exactly the stale-read hazard the runner must not fall for.
 * `respond` overrides a command's output (blank output, replay divergence).
 */
function turnCountingEngine(respond?: (cmd: string) => string | undefined) {
  const service = new EngineRandomService(42);
  let currentTurn = 1;
  const game = {
    lastTurnResult: null as { turn: number } | null,
    executeCommand: (cmd: string) => {
      if (cmd === 'crash') throw new Error('engine exploded');
      game.lastTurnResult = { turn: currentTurn };
      if (cmd !== 'score') currentTurn += 1;
      const overridden = respond?.(cmd);
      if (overridden !== undefined) return overridden;
      if (cmd === 'score') return 'Your score is 0.';
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
  return game;
}

/** The same stub with no `lastTurnResult` at all — an older seam. */
function turnlessEngine() {
  const service = new EngineRandomService(42);
  return {
    executeCommand: (cmd: string) => `You ${cmd}.`,
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

describe('command results carry the engine turn (R4)', () => {
  it('reads each turn off the engine record, meta commands sharing a number', async () => {
    const transcript = fixture(
      'title: T\n---\n> north\n[OK: contains "north"]\n\n> score\n[OK: contains "score"]\n\n> east\n[OK: contains "east"]\n'
    );

    const result = await runTranscript(transcript, turnCountingEngine() as never, {});

    expect(result.status).toBe('passed');
    // north runs as turn 1 and advances; score runs as turn 2 and does NOT
    // advance; east runs as the same turn 2. The runner must report what the
    // engine said, not a per-command count.
    expect(result.commands.map((c) => c.turn)).toEqual([1, 2, 2]);
  });

  it('a [SKIP]ed command still carries the turn it executed as', async () => {
    const transcript = fixture('title: T\n---\n> north\n[SKIP]\n\n> east\n[OK: contains "east"]\n');

    const result = await runTranscript(transcript, turnCountingEngine() as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].skipped).toBe(true);
    expect(result.commands[0].turn).toBe(1);
    expect(result.commands[1].turn).toBe(2);
  });

  it('omits the field against a seam that does not report turns', async () => {
    const transcript = fixture('title: T\n---\n> north\n[OK: contains "north"]\n');

    const result = await runTranscript(transcript, turnlessEngine() as never, {});

    expect(result.status).toBe('passed');
    expect('turn' in result.commands[0]).toBe(false);
  });

  it('golden record mode carries the turn on every recorded command', async () => {
    const transcript = fixture('title: T\nstory: t\nseed: 42\n---\n> north\n\n> east\n', 'golden.transcript');

    const result = await runTranscript(transcript, turnCountingEngine() as never, { bless: true });

    expect(result.status).toBe('passed');
    expect(result.commands.map((c) => c.turn)).toEqual([1, 2]);
  });

  it('a crash mid-transcript never reports the previous command\'s turn as its own', async () => {
    // `crash` throws before the engine updates its record, so `lastTurnResult`
    // still holds `north`'s turn. Reading it after the catch would stamp the
    // crashed command with turn 1 — a stale lie. The field must be absent.
    const transcript = fixture(
      'title: T\n---\n> north\n[OK: contains "north"]\n\n> crash\n[SKIP]\n'
    );

    const result = await runTranscript(transcript, turnCountingEngine() as never, {});

    expect(result.status).toBe('failed');
    expect(result.commands[0].turn).toBe(1);
    expect(result.commands[1].error).toBe('engine exploded');
    expect('turn' in result.commands[1]).toBe(false);
  });

  it('blank output and expected failure still carry the turn they executed as', async () => {
    // Blank output is a failed result and [FAIL] an inverted one — both
    // executed a real turn, and the turn budget needs it either way.
    const transcript = fixture(
      'title: T\n---\n> whisper\n[OK: contains "anything"]\n\n> shout\n[FAIL: not implemented]\n'
    );
    const engine = turnCountingEngine((cmd) => (cmd === 'whisper' ? '' : undefined));

    const result = await runTranscript(transcript, engine as never, {});

    expect(result.commands[0].error).toBe('blank output');
    expect(result.commands[0].turn).toBe(1);
    expect(result.commands[1].expectedFailure).toBe(true);
    expect(result.commands[1].turn).toBe(2);
  });

  it('golden replay carries the turn on matching and diverging commands alike', async () => {
    const source = 'title: T\nstory: t\nseed: 42\n---\n> north\n\n> east\n';
    const transcript = fixture(source, 'replay.transcript');
    const blessed = await runTranscript(transcript, turnCountingEngine() as never, { bless: true });
    expect(blessed.status).toBe('passed');

    // Matching replay: every command carries its turn.
    const replay = await runTranscript(transcript, turnCountingEngine() as never, {});
    expect(replay.status).toBe('passed');
    expect(replay.tier).toBe('golden');
    expect(replay.commands.map((c) => c.turn)).toEqual([1, 2]);

    // Diverging replay: the diverging command still says which turn diverged.
    const diverging = turnCountingEngine((cmd) => (cmd === 'east' ? 'A wall.' : undefined));
    const diverged = await runTranscript(transcript, diverging as never, {});
    expect(diverged.status).toBe('failed');
    expect(diverged.commands[1].diff).toBeDefined();
    expect(diverged.commands[1].turn).toBe(2);
  });

  it('golden record mode omits the field against a turnless seam', async () => {
    const transcript = fixture('title: T\nstory: t\nseed: 42\n---\n> north\n', 'turnless.transcript');

    const result = await runTranscript(transcript, turnlessEngine() as never, { bless: true });

    expect(result.status).toBe('passed');
    expect('turn' in result.commands[0]).toBe(false);
  });
});
