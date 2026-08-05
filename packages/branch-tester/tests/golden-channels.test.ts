/**
 * golden-channels.test.ts — ADR-294 D15 channel-scoped recordings (AC-8).
 *
 * Derived from the Behavior Statement: the `◦ <id> <line>` capture form
 * round-trips losslessly; `◦` classification is gated on the provenance
 * declaring channels beyond `main` (main-only recordings parse byte-identically
 * to before); record captures the declared set; replay diffs it, names the
 * diverged surface, and treats absence as divergence; an assembly/declaration
 * mismatch is a named failure.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseTranscript } from '../src/parser.js';
import { runTranscript, goldenPathFor } from '../src/runner.js';
import { parseGolden, parseGoldenFile, serializeGolden, GoldenFormatError } from '../src/golden.js';
import type { GoldenRecording } from '../src/types.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-channels-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const SOURCE =
  'title: T\nstory: teststory\nseed: 42\nchannels: score\n---\n> look\n> north\n';

function fixture(source: string = SOURCE, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

/**
 * Stub engine that also captures channels: `score` emits its running count
 * of executed commands, the shape bootstrap's capture would deliver.
 */
function channelEngine(seed = 42, opts?: { silentScore?: boolean }) {
  let moves = 0;
  const engine: any = {
    executeCommand: (cmd: string) => {
      moves += 1;
      engine.lastChannels = opts?.silentScore
        ? {}
        : { score: [`{"current":${moves},"max":null}`] };
      return `You ${cmd}.`;
    },
    world: {},
    lastChannels: {},
    engine: {
      registerSaveRestoreHooks() { /* unused */ },
      async save() { return true; },
      async restore() { return true; },
      getMasterSeed: () => seed
    }
  };
  return engine;
}

describe('golden format (D15)', () => {
  const recording: GoldenRecording = {
    provenance: {
      transcript: 't.transcript',
      story: 's',
      seed: 42,
      derivation: 1,
      saveFormat: '3.0.0',
      channels: ['score'],
      events: false,
      locale: 'en-US',
      forces: []
    },
    turns: [
      {
        command: 'look',
        output: ['A room.'],
        channels: { score: ['{"current":1,"max":null}', ''] }
      },
      { command: 'wait', output: ['Time passes.'] }
    ]
  };

  it('serializes channel captures as ◦ lines and round-trips losslessly', () => {
    const text = serializeGolden(recording);
    expect(text).toContain('◦ score {"current":1,"max":null}');
    // An empty captured line serializes without a trailing space.
    expect(text).toContain('\n◦ score\n');

    const parsed = parseGolden(text);
    expect(parsed.turns).toEqual(recording.turns);
    // Byte-stable round trip: parse → serialize reproduces the file.
    expect(serializeGolden(parsed)).toBe(text);
  });

  it('treats ◦ lines as prose when the recording declares no channels (gating precedent)', () => {
    const mainOnly: GoldenRecording = {
      provenance: { ...recording.provenance, channels: [] },
      turns: [{ command: 'look', output: ['◦ score looks like a channel line but is prose'] }]
    };
    const text = serializeGolden(mainOnly);
    const parsed = parseGolden(text);
    expect(parsed.turns[0].output).toEqual(['◦ score looks like a channel line but is prose']);
    expect(parsed.turns[0].channels).toBeUndefined();
  });

  it('rejects a channel line for an undeclared channel', () => {
    const text = serializeGolden(recording).replace('◦ score {', '◦ audio {');
    expect(() => parseGolden(text)).toThrow(GoldenFormatError);
    expect(() => parseGolden(text)).toThrow(/undeclared channel 'audio'/);
  });

  it('rejects output after channel lines — captures close the turn', () => {
    const text = serializeGolden(recording).replace(
      '◦ score {"current":1,"max":null}',
      '◦ score {"current":1,"max":null}\nstray prose'
    );
    expect(() => parseGolden(text)).toThrow(/channel captures must come last/);
  });
});

describe('record + replay (AC-8)', () => {
  it('records the declared channel and replays green', async () => {
    const transcript = fixture();
    const record = await runTranscript(transcript, channelEngine() as never, {
      bless: true, assembledChannels: ['score']
    });
    expect(record.status).toBe('passed');

    const golden = parseGoldenFile(goldenPathFor(transcript.filePath));
    expect(golden.provenance.channels).toEqual(['score']);
    expect(golden.turns[0].channels).toEqual({ score: ['{"current":1,"max":null}'] });
    expect(golden.turns[1].channels).toEqual({ score: ['{"current":2,"max":null}'] });

    const replay = await runTranscript(fixture(), channelEngine() as never, {
      assembledChannels: ['score']
    });
    expect(replay.status).toBe('passed');
  });

  it('fails a tampered channel line and names the channel', async () => {
    const transcript = fixture();
    await runTranscript(transcript, channelEngine() as never, {
      bless: true, assembledChannels: ['score']
    });
    const goldenPath = goldenPathFor(transcript.filePath);
    fs.writeFileSync(goldenPath,
      fs.readFileSync(goldenPath, 'utf-8').replace('{"current":2', '{"current":99'), 'utf-8');

    const replay = await runTranscript(fixture(), channelEngine() as never, {
      assembledChannels: ['score']
    });
    expect(replay.status).toBe('failed');
    const failedCommand = replay.commands.find((c) => !c.passed);
    expect(failedCommand?.error).toMatch(/channel 'score' diverged/);
  });

  it('treats a channel that stops emitting as a divergence (absence is diffed)', async () => {
    const transcript = fixture();
    await runTranscript(transcript, channelEngine() as never, {
      bless: true, assembledChannels: ['score']
    });

    const replay = await runTranscript(fixture(), channelEngine(42, { silentScore: true }) as never, {
      assembledChannels: ['score']
    });
    expect(replay.status).toBe('failed');
    const failedCommand = replay.commands.find((c) => !c.passed);
    expect(failedCommand?.error).toMatch(/channel 'score' diverged/);
  });

  it('refuses a transcript whose channels: disagrees with the assembled session', async () => {
    const transcript = fixture();
    const result = await runTranscript(transcript, channelEngine() as never, {
      bless: true, assembledChannels: []
    });
    expect(result.status).toBe('error');
    expect(result.errorMessage).toMatch(/assembled with channels: \(none\) —/);
    expect(fs.existsSync(goldenPathFor(transcript.filePath))).toBe(false);
  });
});
