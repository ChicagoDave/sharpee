/**
 * runner-forces.test.ts — ADR-293 Phase C session instruments in the runner:
 * `forces:` loading and the unfired-`once` hard failure (D8/D9), `point-seed:`
 * overrides (D11), trace opt-in (D16), and chain instrument hygiene.
 *
 * Derived from the Behavior Statement. The random service here is the REAL
 * `EngineRandomService` (the owned dependency under test runs its real path);
 * only the story-output layer is a stub, because the unit under test is the
 * runner's instrument wiring, not prose generation. The full-bundle real-path
 * proof is the dungeo fixture transcript (Phase 2 exit evidence).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { definePoint, createSeededRandom, deriveStreamSeed } from '@sharpee/core';
import { EngineRandomService } from '@sharpee/engine';
import { parseTranscript } from '../src/parser.js';
import { runTranscript } from '../src/runner.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-forces-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

// Real catalog points, unique to this file (the catalog is process-global).
const STEAL = definePoint('tt-forces.steal', { classes: ['yes', 'no'] as const });
const PLAIN = definePoint('tt-forces.plain');

function fixture(source: string, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

/**
 * Stub story layer over a REAL EngineRandomService. `> steal` draws the
 * STEAL point at probability 0 (so an unforced draw is always "no") and
 * prints the outcome; `> walk` draws nothing.
 */
function forcingEngine(seed = 42) {
  const service = new EngineRandomService(seed);
  const traceCalls: boolean[] = [];
  return {
    traceCalls,
    service,
    executeCommand: (cmd: string) => {
      if (cmd === 'steal') {
        return service.chance(STEAL, 0) ? 'The thief steals it.' : 'The thief hesitates.';
      }
      if (cmd === 'roll') {
        return `You roll ${service.int(PLAIN, 0, 1000000)}.`;
      }
      return `You ${cmd}.`;
    },
    world: {},
    engine: {
      registerSaveRestoreHooks() { /* unused */ },
      async save() { return true; },
      async restore() { return true; },
      getMasterSeed: () => seed,
      getRandomService: () => service,
      setRandomTraceEnabled: (enabled: boolean) => { traceCalls.push(enabled); }
    }
  };
}

describe('forces: loading and firing (D8/D9)', () => {
  it('loads the header forces and a matching draw fires the forced class', async () => {
    const transcript = fixture(
      'title: T\nforces: tt-forces.steal=yes\n---\n> steal\n[OK: contains "steals"]\n'
    );
    const engine = forcingEngine();

    const result = await runTranscript(transcript, engine as never, {});

    // Probability 0 would always print "hesitates" — the force flipped it,
    // and the transcript passes including the fired-force end check.
    expect(result.status).toBe('passed');
    expect(engine.service.getForceReport()).toEqual([
      { spec: { point: 'tt-forces.steal', cls: 'yes', mode: 'once' }, fireCount: 1 }
    ]);
  });

  it('an unfired once force fails an otherwise-passing run with a named error (AC-9)', async () => {
    const transcript = fixture(
      'title: T\nforces: tt-forces.steal=yes\n---\n> walk\n[OK: contains "walk"]\n'
    );

    const result = await runTranscript(transcript, forcingEngine() as never, {});

    expect(result.status).toBe('failed');
    const failure = result.commands.find((c) => !c.passed);
    expect(failure?.error).toMatch(/unfired once force\(s\): tt-forces\.steal=yes/);
    expect(failure?.error).toMatch(/ADR-293 D9/);
  });

  it('a force naming an unknown point is a named error-status result with file:line', async () => {
    const transcript = fixture(
      'title: T\nforces: tt-forces.never-declared=yes\n---\n> walk\n[OK: contains "walk"]\n'
    );

    const result = await runTranscript(transcript, forcingEngine() as never, {});

    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/fixture\.transcript:2:.*unknown point 'tt-forces\.never-declared'/);
  });

  it('a force naming an undeclared class is a named error-status result', async () => {
    const transcript = fixture(
      'title: T\nforces: tt-forces.steal=KILLED\n---\n> walk\n[OK: contains "walk"]\n'
    );

    const result = await runTranscript(transcript, forcingEngine() as never, {});

    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/undeclared class 'KILLED'/);
  });

  it('instruments declared without a platform random service is a named error', async () => {
    const transcript = fixture(
      'title: T\nforces: tt-forces.steal=yes\n---\n> walk\n[OK: contains "walk"]\n'
    );
    const engine = forcingEngine() as { engine: Record<string, unknown> };
    delete engine.engine.getRandomService;

    const result = await runTranscript(transcript as never, engine as never, {});

    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/need the platform engine/);
  });
});

describe('chain instrument hygiene (D9 — session state scoped to the declaring transcript)', () => {
  it('a later chain member without point-seed clears the previous member\'s overrides', async () => {
    const engine = forcingEngine();
    // Member 1 declares an override but never draws the point — the stream
    // stays unmaterialized, so member 2's draw shows which map applies.
    const first = fixture(
      'title: A\npoint-seed: tt-forces.plain=777001\n---\n> walk\n[OK: contains "walk"]\n',
      'a.transcript'
    );
    const second = fixture('title: B\n---\n> roll\n[OK: contains "roll"]\n', 'b.transcript');

    await runTranscript(first, engine as never, { chain: true });
    const secondResult = await runTranscript(second, engine as never, { chain: true });

    // The reset applied: member 2 derives from the master seed, not the
    // stale override.
    expect(secondResult.commands[0].actualOutput).toBe(
      `You roll ${createSeededRandom(deriveStreamSeed(42, 'tt-forces.plain')).int(0, 1000000)}.`
    );
  });

  it('a later chain member without forces clears the previous member\'s table', async () => {
    const engine = forcingEngine();
    const first = fixture(
      'title: A\nforces: tt-forces.steal=yes\n---\n> steal\n[OK: contains "steals"]\n', 'a.transcript'
    );
    const second = fixture(
      'title: B\n---\n> steal\n[OK: contains "hesitates"]\n', 'b.transcript'
    );

    const firstResult = await runTranscript(first, engine as never, { chain: true });
    const secondResult = await runTranscript(second, engine as never, { chain: true });

    expect(firstResult.status).toBe('passed');
    // The second member draws naturally (probability 0 → "hesitates"):
    // the first member's force table did not leak.
    expect(secondResult.status).toBe('passed');
    expect(engine.service.getForceReport()).toEqual([]);
  });
});

describe('an earlier failure suppresses the unfired-force check', () => {
  it('a failed assertion before the force fires reports that failure alone', async () => {
    const transcript = fixture(
      'title: T\nforces: tt-forces.steal=yes\n---\n> walk\n[OK: contains "xyzzy"]\n'
    );

    const result = await runTranscript(transcript, forcingEngine() as never, {});

    expect(result.status).toBe('failed');
    const failures = result.commands.filter((c) => !c.passed && !c.skipped);
    expect(failures).toHaveLength(1);
    expect(failures[0].command.input).toBe('walk');
    expect(result.commands.some((c) => c.error?.includes('unfired'))).toBe(false);
  });
});

describe('point-seed: overrides (D11)', () => {
  it('moves the named point\'s stream start; the draw is real', async () => {
    const OVERRIDE = 777001;
    const transcript = fixture(
      `title: T\npoint-seed: tt-forces.plain=${OVERRIDE}\n---\n> roll\n[OK: contains "roll"]\n`
    );
    const engine = forcingEngine();

    const result = await runTranscript(transcript, engine as never, {});

    expect(result.status).toBe('passed');
    const rolled = result.commands[0].actualOutput;
    expect(rolled).toBe(`You roll ${createSeededRandom(OVERRIDE).int(0, 1000000)}.`);
    // And NOT the master-seed derivation — the override genuinely moved it.
    expect(rolled).not.toBe(
      `You roll ${createSeededRandom(deriveStreamSeed(42, 'tt-forces.plain')).int(0, 1000000)}.`
    );
  });

  it('a point-seed naming an unknown point is a named error (D2 typo trap)', async () => {
    const transcript = fixture(
      'title: T\npoint-seed: tt-forces.never-declared=1\n---\n> walk\n[OK: contains "walk"]\n'
    );

    const result = await runTranscript(transcript, forcingEngine() as never, {});

    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/point-seed: names unknown point 'tt-forces\.never-declared'/);
  });
});

describe('trace opt-in (D16)', () => {
  it('the runner enables trace on every run', async () => {
    const transcript = fixture('title: T\n---\n> walk\n[OK: contains "walk"]\n');
    const engine = forcingEngine();

    await runTranscript(transcript, engine as never, {});

    expect(engine.traceCalls).toEqual([true]);
  });
});
