/**
 * golden-dimensions.test.ts — Phase 3 diff dimensions: seed matrices
 * (ADR-294 D8) and divergence saves (D18).
 *
 * Derived from the Behavior Statement: a matrix blesses one recording per
 * seed and each replay diffs only against its own; a divergence writes the
 * pre-divergence engine save with a working restore hint, and a green
 * replay clears stale divergence saves.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseTranscript } from '../src/parser.js';
import { runTranscript, goldenPathFor, divergencePathFor } from '../src/runner.js';
import { parseGoldenFile } from '../src/golden.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-dim-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const MATRIX_SOURCE = 'title: M\nstory: teststory\nseeds: 42, 777\n---\n> look\n';
const SINGLE_SOURCE = 'title: S\nstory: teststory\nseed: 42\n---\n> look\n> north\n';

function fixture(source: string, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

/**
 * Stub engine whose output varies by seed (like real RNG would) and whose
 * save payload records how many commands have executed — so a divergence
 * save's "captured before the divergent command" timing is assertable.
 */
function stubEngine(seed: number, respond?: (cmd: string) => string, saveBroken = false) {
  const calls: string[] = [];
  return {
    calls,
    executeCommand: (cmd: string) => {
      calls.push(cmd);
      return respond ? respond(cmd) : `[seed ${seed}] You ${cmd}.`;
    },
    world: {},
    engine: {
      hooks: null as null | { onSaveRequested(data: unknown): Promise<void> },
      registerSaveRestoreHooks(h: { onSaveRequested(data: unknown): Promise<void>; onRestoreRequested(): Promise<unknown | null> }) {
        this.hooks = h;
      },
      async save() {
        if (saveBroken) throw new Error('save unavailable');
        await this.hooks!.onSaveRequested({ version: '3.0.0', executed: calls.length });
        return true;
      },
      async restore() { return true; },
      getMasterSeed: () => seed
    }
  };
}

describe('seed matrices (D8, AC-7)', () => {
  it('blesses one recording per seed, named <name>.<seed>.golden', async () => {
    const transcript = fixture(MATRIX_SOURCE);

    const at42 = await runTranscript(transcript, stubEngine(42) as never, { bless: true });
    const at777 = await runTranscript(transcript, stubEngine(777) as never, { bless: true });

    expect(at42.status).toBe('passed');
    expect(at777.status).toBe('passed');
    expect(at42.goldenPath).toBe(path.join(dir, 'fixture.42.golden'));
    expect(at777.goldenPath).toBe(path.join(dir, 'fixture.777.golden'));
    expect(fs.existsSync(path.join(dir, 'fixture.golden'))).toBe(false);

    expect(parseGoldenFile(at42.goldenPath!).provenance.seed).toBe(42);
    expect(parseGoldenFile(at777.goldenPath!).provenance.seed).toBe(777);
    expect(parseGoldenFile(at42.goldenPath!).turns[0].output).toEqual(['[seed 42] You look.']);
    expect(parseGoldenFile(at777.goldenPath!).turns[0].output).toEqual(['[seed 777] You look.']);
  });

  it('each replay diffs only against its own seed\'s recording', async () => {
    const transcript = fixture(MATRIX_SOURCE);
    await runTranscript(transcript, stubEngine(42) as never, { bless: true });
    await runTranscript(transcript, stubEngine(777) as never, { bless: true });

    // Tamper 777's recording; 42's replay must not care.
    const path777 = goldenPathFor(transcript.filePath, 777);
    fs.writeFileSync(path777, fs.readFileSync(path777, 'utf-8').replace('You look.', 'You gawk.'));

    const at42 = await runTranscript(transcript, stubEngine(42) as never, {});
    expect(at42.status).toBe('passed');
    expect(at42.goldenPath).toBe(goldenPathFor(transcript.filePath, 42));

    const at777 = await runTranscript(transcript, stubEngine(777) as never, {});
    expect(at777.status).toBe('failed');
  });

  it('rejects a session seed outside the matrix by name', async () => {
    const transcript = fixture(MATRIX_SOURCE);
    const result = await runTranscript(transcript, stubEngine(5) as never, { bless: true });

    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/session seed 5 is not in the transcript's seeds: matrix \(42, 777\)/);
  });
});

describe('divergence saves (D18, AC-6)', () => {
  it('writes the pre-divergence save and reports the restore command', async () => {
    const transcript = fixture(SINGLE_SOURCE);
    await runTranscript(transcript, stubEngine(42) as never, { bless: true });

    // Diverge on the SECOND command only.
    const engine = stubEngine(42, (cmd) =>
      cmd === 'north' ? '[seed 42] Something NEW happens.' : `[seed 42] You ${cmd}.`);
    const result = await runTranscript(transcript, engine as never, {});

    expect(result.status).toBe('failed');
    const divergencePath = divergencePathFor(transcript.filePath);
    expect(result.divergenceSavePath).toBe(divergencePath);
    expect(fs.existsSync(divergencePath)).toBe(true);

    // Captured BEFORE the divergent command: exactly one command ('look')
    // had executed — the author lands at the last matching turn.
    expect(JSON.parse(fs.readFileSync(divergencePath, 'utf-8'))).toEqual({
      version: '3.0.0',
      executed: 1
    });

    const error = result.commands.at(-1)!.error!;
    expect(error).toContain(`--restore ${divergencePath} --seed 42`);
    expect(error).toContain('then replay: north');
  });

  it('a green replay clears a stale divergence save', async () => {
    const transcript = fixture(SINGLE_SOURCE);
    await runTranscript(transcript, stubEngine(42) as never, { bless: true });

    const divergencePath = divergencePathFor(transcript.filePath);
    fs.writeFileSync(divergencePath, '{"stale":true}');

    const result = await runTranscript(transcript, stubEngine(42) as never, {});
    expect(result.status).toBe('passed');
    expect(fs.existsSync(divergencePath)).toBe(false);
  });

  it('degrades to no divergence save when the platform save throws — the diff failure stands', async () => {
    const transcript = fixture(SINGLE_SOURCE);
    await runTranscript(transcript, stubEngine(42) as never, { bless: true });

    const engine = stubEngine(42, (cmd) =>
      cmd === 'north' ? 'CHANGED' : `[seed 42] You ${cmd}.`, /* saveBroken */ true);
    const result = await runTranscript(transcript, engine as never, {});

    expect(result.status).toBe('failed');
    expect(result.divergenceSavePath).toBeUndefined();
    expect(fs.existsSync(divergencePathFor(transcript.filePath))).toBe(false);
    expect(result.commands.at(-1)!.diff).toBeDefined();
  });
});
