/**
 * golden-runner.test.ts — the golden tier (ADR-294 D1/D3/D5/D6/D7).
 *
 * Derived from the runner's Behavior Statement: bless writes a provenance-
 * stamped recording of verbatim output; replay diffs against it and stops at
 * the first divergence; staleness (provenance or command-list drift) is a
 * named error, never a content diff; directive failures fail the transcript
 * unconditionally; parse errors execute nothing.
 *
 * Scaffolding note (rule 13a): the engine here is a stub because the unit
 * under test is the runner's recording/diffing, not the engine. The real-path
 * proof — bless + replay through the shipped bundle against dungeo at a
 * pinned seed — is the Phase 2 exit evidence (scripts/__tests__ and the
 * plan's AC-1..AC-5 fixture pass).
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SEED_DERIVATION_VERSION } from '@sharpee/core';
import { SAVE_FORMAT_VERSION } from '@sharpee/engine';
import { parseTranscript } from '../src/parser.js';
import { runTranscript, goldenPathFor } from '../src/runner.js';
import { parseGoldenFile } from '../src/golden.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-golden-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const SOURCE = 'title: T\nstory: teststory\nseed: 42\n---\n> look\n> north\n';

function fixture(source: string = SOURCE, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

/** Deterministic stub engine: output is a pure function of the command. */
function stubEngine(
  respond: (cmd: string) => string = (cmd) => `You ${cmd}.\nNothing happens.`,
  seed = 42,
  lastEvents?: Array<{ type: string; data?: object }>
) {
  const calls: string[] = [];
  const engine = {
    calls,
    executeCommand: (cmd: string) => {
      calls.push(cmd);
      return respond(cmd);
    },
    world: {},
    lastEvents,
    engine: {
      registerSaveRestoreHooks() { /* unused in golden tests */ },
      async save() { return true; },
      async restore() { return true; },
      getMasterSeed: () => seed
    }
  };
  return engine;
}

describe('bless (record mode, D1/D3/D7)', () => {
  it('writes a provenance-stamped recording of verbatim output', async () => {
    const transcript = fixture();
    const engine = stubEngine();
    const result = await runTranscript(transcript, engine as never, { bless: true });

    expect(result.status).toBe('passed');
    expect(result.tier).toBe('golden');
    expect(result.blessed).toBe(true);

    const goldenPath = goldenPathFor(transcript.filePath);
    expect(fs.existsSync(goldenPath)).toBe(true);
    const recording = parseGoldenFile(goldenPath);
    expect(recording.provenance).toEqual({
      transcript: 'fixture.transcript',
      story: 'teststory',
      seed: 42,
      derivation: SEED_DERIVATION_VERSION,
      saveFormat: SAVE_FORMAT_VERSION,
      channels: ['main'],
      events: false,
      locale: 'en-US',
      forces: []
    });
    expect(recording.turns).toEqual([
      { command: 'look', output: ['You look.', 'Nothing happens.'] },
      { command: 'north', output: ['You north.', 'Nothing happens.'] }
    ]);
  });

  it('refuses to bless a standalone transcript with no seed pin (D3)', async () => {
    const transcript = fixture('title: T\nstory: s\n---\n> look\n');
    const result = await runTranscript(transcript, stubEngine() as never, { bless: true });

    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/must pin a seed.*seed: N/);
    expect(fs.existsSync(goldenPathFor(transcript.filePath))).toBe(false);
  });

  it('refuses to bless when the session seed disagrees with the pin', async () => {
    const transcript = fixture();
    const result = await runTranscript(transcript, stubEngine(undefined, 777) as never, { bless: true });

    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/session seed 777 disagrees with the transcript's pin 42/);
  });

  it('does NOT write a recording when a directive fails (D5)', async () => {
    const transcript = fixture('title: T\nstory: s\nseed: 42\n---\n> look\n$restore ghost\n> north\n');
    const engine = stubEngine();
    const result = await runTranscript(transcript, engine as never, {
      bless: true,
      savesDirectory: path.join(dir, 'saves')
    });

    expect(result.status).toBe('failed');
    expect(result.commands.at(-1)!.error).toContain('Save file not found');
    expect(fs.existsSync(goldenPathFor(transcript.filePath))).toBe(false);
    // Nothing after the failed directive executed.
    expect(engine.calls).toEqual(['look']);
  });

  it('rejects a channels: declaration that disagrees with the assembled session (D15)', async () => {
    // Channel scoping shipped (D15 — see golden-channels.test.ts); the guard
    // that remains is assembly consistency: the capability profile and
    // capture set are fixed when the game is built, so a transcript declaring
    // a different set is a named failure, never a silent partial capture.
    const channels = fixture('title: T\nseed: 42\nchannels: main, status\n---\n> look\n');
    const channelsResult = await runTranscript(channels, stubEngine() as never, {
      bless: true, assembledChannels: ['main']
    });
    expect(channelsResult.status).toBe('error');
    expect(channelsResult.errorMessage).toMatch(/assembled with channels: main —.*identical channels.*D15/);
  });
});

describe('replay (D1/D6)', () => {
  it('passes when output matches the recording byte-for-byte', async () => {
    const transcript = fixture();
    await runTranscript(transcript, stubEngine() as never, { bless: true });

    const result = await runTranscript(transcript, stubEngine() as never, {});
    expect(result.status).toBe('passed');
    expect(result.tier).toBe('golden');
    expect(result.blessed).toBeFalsy();
    expect(result.passed).toBe(2);
  });

  it('fails with the diff at the first divergence and stops executing', async () => {
    const transcript = fixture();
    await runTranscript(transcript, stubEngine() as never, { bless: true });

    const engine = stubEngine((cmd) =>
      cmd === 'look' ? 'You look.\nSomething CHANGED.' : `You ${cmd}.\nNothing happens.`);
    const result = await runTranscript(transcript, engine as never, {});

    expect(result.status).toBe('failed');
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].diff).toEqual({
      recorded: ['You look.', 'Nothing happens.'],
      actual: ['You look.', 'Something CHANGED.'],
      // D15: the diff names the diverged surface; prose is 'main'.
      channel: 'main'
    });
    // Divergence stops the replay — 'north' never ran.
    expect(engine.calls).toEqual(['look']);
  });

  it('masks only the build-date banner line (D6)', async () => {
    const transcript = fixture();
    const record = stubEngine((cmd) =>
      cmd === 'look' ? 'Story v4.3.0 (built 2026-08-01)\nWest of House' : 'ok');
    await runTranscript(transcript, record as never, { bless: true });

    // A different build date replays green…
    const rebuilt = stubEngine((cmd) =>
      cmd === 'look' ? 'Story v4.3.0 (built 2026-09-30)\nWest of House' : 'ok');
    expect((await runTranscript(transcript, rebuilt as never, {})).status).toBe('passed');

    // …but any other line change still fails.
    const drifted = stubEngine((cmd) =>
      cmd === 'look' ? 'Story v4.3.0 (built 2026-09-30)\nEast of House' : 'ok');
    expect((await runTranscript(transcript, drifted as never, {})).status).toBe('failed');
  });

  it('re-bless repairs a diverged recording', async () => {
    const transcript = fixture();
    await runTranscript(transcript, stubEngine() as never, { bless: true });

    const changed = (cmd: string) => `You ${cmd}.\nA new description.`;
    expect((await runTranscript(transcript, stubEngine(changed) as never, {})).status).toBe('failed');
    await runTranscript(transcript, stubEngine(changed) as never, { bless: true });
    expect((await runTranscript(transcript, stubEngine(changed) as never, {})).status).toBe('passed');
  });
});

describe('staleness (D3) — named errors, never content diffs', () => {
  it('fails a provenance mismatch with "stale recording — re-bless" naming the field', async () => {
    const transcript = fixture();
    await runTranscript(transcript, stubEngine() as never, { bless: true });

    const goldenPath = goldenPathFor(transcript.filePath);
    const text = fs.readFileSync(goldenPath, 'utf-8').replace('save-format: 3.0.0', 'save-format: 2.0.0');
    fs.writeFileSync(goldenPath, text);

    const engine = stubEngine();
    const result = await runTranscript(transcript, engine as never, {});
    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/stale recording — re-bless/);
    expect(result.errorMessage).toMatch(/save-format recorded 2\.0\.0/);
    // Staleness is detected before anything executes.
    expect(engine.calls).toEqual([]);
    expect(result.commands).toEqual([]);
  });

  it('treats command-list drift as the same stale class, detected before execution', async () => {
    await runTranscript(fixture(), stubEngine() as never, { bless: true });

    const edited = fixture('title: T\nstory: teststory\nseed: 42\n---\n> look\n> north\n> east\n');
    const engine = stubEngine();
    const result = await runTranscript(edited, engine as never, {});

    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/stale recording — re-bless/);
    expect(result.errorMessage).toMatch(/3 command\(s\).*2 turn\(s\)/);
    expect(engine.calls).toEqual([]);
  });

  it('refuses to replay a chain-member recording standalone (D7)', async () => {
    // A seedless transcript records legally in chain mode…
    const member = fixture('title: T\nstory: teststory\n---\n> look\n', 'wt-02.transcript');
    const blessed = await runTranscript(member, stubEngine() as never, { bless: true, chain: true });
    expect(blessed.blessed).toBe(true);

    // …but replaying it outside a chain is refused by name.
    const result = await runTranscript(member, stubEngine() as never, {});
    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/chain-member recording.*--chain/);
  });
});

describe('events recording (D6 opt-in)', () => {
  it('records and replays event lines when events: true', async () => {
    const source = 'title: T\nstory: s\nseed: 42\nevents: true\n---\n> push button\n';
    const events = [{ type: 'if.event.pushed', data: { target: 'y09' } }];
    const transcript = fixture(source);
    await runTranscript(transcript, stubEngine(() => 'Click.', 42, events) as never, { bless: true });

    const goldenText = fs.readFileSync(goldenPathFor(transcript.filePath), 'utf-8');
    expect(goldenText).toContain('• if.event.pushed {"target":"y09"}');

    // Same events replay green; a changed payload diverges.
    expect((await runTranscript(transcript, stubEngine(() => 'Click.', 42, events) as never, {})).status)
      .toBe('passed');
    const changed = [{ type: 'if.event.pushed', data: { target: 'y10' } }];
    const diverged = await runTranscript(transcript, stubEngine(() => 'Click.', 42, changed) as never, {});
    expect(diverged.status).toBe('failed');
    expect(diverged.commands[0].diff!.recorded).toContain('• if.event.pushed {"target":"y09"}');
  });
});

describe('the tier boundary and unconditional failure (D2/D5)', () => {
  it('fails an assertion-less command when no recording exists', async () => {
    const transcript = fixture('title: T\n---\n> look\n');
    const engine = stubEngine();
    const result = await runTranscript(transcript, engine as never, {});

    expect(result.tier).toBe('assertion');
    expect(result.status).toBe('failed');
    expect(result.commands[0].error).toMatch(/no assertion and no recording.*--bless/);
    expect(engine.calls).toEqual([]);
  });

  it('fails a directive unconditionally in the assertion tier — no --stop-on-failure involved', async () => {
    const transcript = fixture('title: T\n---\n> look\n[OK: contains "look"]\n$restore ghost\n> north\n[OK: contains "north"]\n');
    const engine = stubEngine();
    const result = await runTranscript(transcript, engine as never, {
      savesDirectory: path.join(dir, 'saves')
      // deliberately NO stopOnFailure
    });

    expect(result.status).toBe('failed');
    const restoreResult = result.commands.find(c => c.command.input.startsWith('$restore'));
    expect(restoreResult?.error).toContain('Save file not found');
    // Execution stopped at the failed directive — 'north' never ran.
    expect(engine.calls).toEqual(['look']);
  });

  it('executes nothing when the transcript has parse errors (AC-4)', async () => {
    const transcript = fixture('title: T\nseed: 42\n---\n> look\n[OK: any]\n> north\n');
    const engine = stubEngine();
    const result = await runTranscript(transcript, engine as never, { bless: true });

    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/parse error.*\[OK: any\] was removed/);
    expect(engine.calls).toEqual([]);
    expect(fs.existsSync(goldenPathFor(transcript.filePath))).toBe(false);
  });
});
