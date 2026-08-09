/**
 * ending-field.test.ts — the command that ends the story says so.
 *
 * R9 (Phase 5, terminal marking's clean case): a file whose LAST command ends
 * the story leaves no dead tail to observe, so the runner maps the engine's
 * own `game.ended` announcement onto that command's result as `ending`.
 * Derived from the Behavior Statement: the field is set exactly when the
 * per-command event capture holds a `game.ended` whose type is a real ending
 * (victory/defeat/quit); `restart` (the harness reboots in place — the story
 * continues) and `abort` (a runtime failure, not an ending) never set it, and
 * a seam without events never guesses.
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
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-ending-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(source: string, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

/**
 * Stub engine that mirrors bootstrap's per-command event capture: every
 * command replaces `lastEvents` the way `executeCommand` replaces the event
 * buffer. `die` ends the story the way the real engine announces it —
 * `game.ending` then `game.ended` with a typed ending. `reboot` stops with
 * `restart` (the story continues), `explode` with `abort` (a failure, not an
 * ending). `crash` throws BEFORE touching the capture — the previous
 * command's events stay behind, the stale-read hazard the runner must not
 * fall for.
 */
function endingEngine(respond?: (cmd: string) => string | undefined) {
  const service = new EngineRandomService(42);
  let currentTurn = 1;
  const endings: Record<string, string> = { die: 'defeat', win: 'victory', quit: 'quit', reboot: 'restart', explode: 'abort' };
  const game = {
    lastTurnResult: null as { turn: number } | null,
    lastEvents: [] as Array<{ type: string; data?: any }>,
    executeCommand: (cmd: string) => {
      if (cmd === 'crash') throw new Error('engine exploded');
      game.lastTurnResult = { turn: currentTurn };
      currentTurn += 1;
      const ending = endings[cmd];
      game.lastEvents = ending
        ? [
            { type: 'game.ending', data: { gameState: 'ending' } },
            { type: 'game.ended', data: { gameState: 'ended', ending: { type: ending } } },
          ]
        : [{ type: 'action.performed', data: {} }];
      return respond?.(cmd) ?? `You ${cmd}.`;
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

/** The same stub with no `lastEvents` at all — an older seam never guesses. */
function eventlessEngine() {
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

describe('the ending command carries the story ending (R9)', () => {
  it('sets `ending` on exactly the command the engine announced game.ended for', async () => {
    const transcript = fixture(
      'title: T\n---\n> north\n[OK: contains "north"]\n\n> die\n[OK: contains "die"]\n'
    );

    const result = await runTranscript(transcript, endingEngine() as never, {});

    expect(result.status).toBe('passed');
    expect('ending' in result.commands[0]).toBe(false);
    expect(result.commands[1].ending).toBe('defeat');
  });

  it('carries victory and quit the same way', async () => {
    const win = await runTranscript(
      fixture('title: T\n---\n> win\n[OK: contains "win"]\n', 'win.transcript'),
      endingEngine() as never, {});
    expect(win.commands[0].ending).toBe('victory');

    const quit = await runTranscript(
      fixture('title: T\n---\n> quit\n[OK: contains "quit"]\n', 'quit.transcript'),
      endingEngine() as never, {});
    expect(quit.commands[0].ending).toBe('quit');
  });

  it('never maps restart or abort to an ending — one continues, the other failed', async () => {
    const reboot = await runTranscript(
      fixture('title: T\n---\n> reboot\n[OK: contains "reboot"]\n', 'reboot.transcript'),
      endingEngine() as never, {});
    expect('ending' in reboot.commands[0]).toBe(false);

    const abort = await runTranscript(
      fixture('title: T\n---\n> explode\n[OK: contains "explode"]\n', 'abort.transcript'),
      endingEngine() as never, {});
    expect('ending' in abort.commands[0]).toBe(false);
  });

  it('a [SKIP]ed ending command still carries it — the story ended regardless of assertions', async () => {
    const transcript = fixture('title: T\n---\n> die\n[SKIP]\n');

    const result = await runTranscript(transcript, endingEngine() as never, {});

    expect(result.commands[0].skipped).toBe(true);
    expect(result.commands[0].ending).toBe('defeat');
  });

  it('omits the field against a seam that does not expose events', async () => {
    const transcript = fixture('title: T\n---\n> die\n[OK: contains "die"]\n');

    const result = await runTranscript(transcript, eventlessEngine() as never, {});

    expect(result.status).toBe('passed');
    expect('ending' in result.commands[0]).toBe(false);
  });

  it('a crash never inherits the previous command\'s ending as its own', async () => {
    // `crash` throws before the stub touches its capture, so `lastEvents`
    // still holds `die`'s game.ended. Reading it after the catch would stamp
    // the crashed command with an ending it never reached — a stale lie.
    const transcript = fixture(
      'title: T\n---\n> die\n[OK: contains "die"]\n\n> crash\n[SKIP]\n'
    );

    const result = await runTranscript(transcript, endingEngine() as never, {});

    expect(result.commands[0].ending).toBe('defeat');
    expect(result.commands[1].error).toBe('engine exploded');
    expect('ending' in result.commands[1]).toBe(false);
  });

});
