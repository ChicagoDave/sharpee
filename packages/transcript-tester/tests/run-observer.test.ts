/**
 * run-observer.test.ts — the runner's live observation seam and the event
 * stream built from it (ADR-277 D1 as amended 2026-08-06).
 *
 * Derived from the Behavior Statement. The assertions are on the ORDER and
 * CONTENT of what the runner announced while running, not on the returned
 * result — a suite that only checked the return value would pass against the
 * old post-hoc construction and prove nothing about liveness, which is the
 * whole point of the change.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { RunEvent } from '@sharpee/ide-protocol';
import { parseTranscript } from '../src/parser.js';
import { runTranscript } from '../src/runner.js';
import { RunEventStream, ndjsonEventLine } from '../src/run-event-stream.js';
import type { CommandResult, RunObserver } from '../src/types.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-observer-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(source: string, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

/** Minimal story layer: echoes the command back. */
function echoEngine() {
  return {
    executeCommand: (cmd: string) => `You ${cmd}.`,
    world: {},
    engine: {
      registerSaveRestoreHooks() {
        /* unused */
      },
      async save() {
        return true;
      },
      async restore() {
        return true;
      },
      getMasterSeed: () => 42,
    },
  };
}

/** Records the observer callbacks in the order they arrive. */
function recordingObserver() {
  const calls: string[] = [];
  const commands: CommandResult[] = [];
  let started: { file: string; commandCount: number } | undefined;
  const observer: RunObserver = {
    onTranscriptStart: (info) => {
      started = info;
      calls.push(`start:${path.basename(info.file)}:${info.commandCount}`);
    },
    onCommandResult: (result) => {
      commands.push(result);
      calls.push(`command:${result.command.input}`);
    },
  };
  return {
    observer,
    calls,
    commands,
    get started() {
      return started;
    },
  };
}

describe('the runner announces a transcript before it runs', () => {
  it('fires onTranscriptStart before the first command, with the parsed command count', async () => {
    const transcript = fixture('title: T\n---\n> north\n[OK: contains "north"]\n> south\n[OK: contains "south"]\n');
    const spy = recordingObserver();

    await runTranscript(transcript, echoEngine() as never, { observer: spy.observer });

    expect(spy.calls[0]).toBe('start:fixture.transcript:2');
    expect(spy.started?.commandCount).toBe(2);
    expect(spy.calls).toEqual(['start:fixture.transcript:2', 'command:north', 'command:south']);
  });

  it('announces a transcript that fails validation and never executes', async () => {
    // A parse error means AC-4 executes nothing — but the transcript was still
    // attempted, so it must be announced rather than surfacing only as an error.
    const transcript = fixture('title: T\n---\n> north\n[WHILE: dark]\n');
    expect(transcript.parseErrors?.length ?? 0).toBeGreaterThan(0);
    const spy = recordingObserver();

    const result = await runTranscript(transcript, echoEngine() as never, { observer: spy.observer });

    expect(result.status).toBe('error');
    expect(spy.calls).toEqual(['start:fixture.transcript:1']);
  });

  it('leaves the run untouched when no observer is supplied', async () => {
    const transcript = fixture('title: T\n---\n> north\n[OK: contains "north"]\n');

    const observed = await runTranscript(transcript, echoEngine() as never, {
      observer: recordingObserver().observer,
    });
    const bare = await runTranscript(transcript, echoEngine() as never, {});

    expect(bare.status).toBe(observed.status);
    expect(bare.commands.map((c) => c.command.input)).toEqual(observed.commands.map((c) => c.command.input));
    expect(bare.passed).toBe(observed.passed);
  });
});

describe('the announced sequence is the returned sequence', () => {
  it('matches TranscriptResult.commands exactly, including a directive failure', async () => {
    // A failed directive fails the transcript unconditionally (D5) and pushes a
    // synthesized result — the live sequence must carry it too, or a consumer
    // rebuilding the transcript from events would be missing the row that
    // explains the failure.
    const transcript = fixture('title: T\n---\n> north\n[OK: contains "north"]\n$restore missing-save\n> south\n[OK: contains "south"]\n');
    const spy = recordingObserver();

    const result = await runTranscript(transcript, echoEngine() as never, {
      observer: spy.observer,
      savesDirectory: dir,
    });

    expect(result.status).toBe('failed');
    expect(spy.commands.map((c) => c.command.input)).toEqual(result.commands.map((c) => c.command.input));
    expect(spy.commands.length).toBe(result.commands.length);
  });

  it('announces every command of a passing run in execution order', async () => {
    const transcript = fixture(
      'title: T\n---\n> north\n[OK: contains "north"]\n> east\n[OK: contains "east"]\n> west\n[OK: contains "west"]\n',
    );
    const spy = recordingObserver();

    const result = await runTranscript(transcript, echoEngine() as never, { observer: spy.observer });

    expect(result.status).toBe('passed');
    expect(spy.commands.map((c) => c.command.input)).toEqual(['north', 'east', 'west']);
    expect(spy.commands.map((c) => c.command.input)).toEqual(result.commands.map((c) => c.command.input));
  });
});

describe('RunEventStream sequences what the observer reports', () => {
  const collect = () => {
    const events: RunEvent[] = [];
    let clock = 0;
    const stream = new RunEventStream(
      (event) => events.push(event),
      () => (clock += 10),
    );
    return { events, stream };
  };

  it('emits a transcript-start before any command-result for that file', async () => {
    const transcript = fixture('title: T\n---\n> north\n[OK: contains "north"]\n> south\n[OK: contains "south"]\n');
    const { events, stream } = collect();

    stream.runStart('tests', 1);
    const result = await runTranscript(transcript, echoEngine() as never, {
      observer: {
        onTranscriptStart: (info) => stream.transcriptStart(info.file, 0, { commandCount: info.commandCount }),
        onCommandResult: (command) => stream.commandResult(transcript.filePath, command),
      },
    });
    stream.transcriptEnd(result);
    stream.runEnd(
      {
        transcripts: [result],
        totalPassed: result.passed,
        totalFailed: result.failed,
        totalExpectedFailures: result.expectedFailures,
        totalSkipped: result.skipped,
        totalErrors: 0,
        totalDuration: result.duration,
      },
      0,
    );

    expect(events.map((e) => e.type)).toEqual([
      'run-start',
      'transcript-start',
      'command-result',
      'command-result',
      'transcript-end',
      'run-end',
    ]);
  });

  it('numbers events monotonically from zero and stamps a rising clock', () => {
    const { events, stream } = collect();

    stream.runStart('chain', 3);
    stream.phase('load', 'started');
    stream.phase('load', 'finished');
    stream.progress('transcripts', 1, { total: 3 });

    expect(events.map((e) => e.seq)).toEqual([0, 1, 2, 3]);
    // The injected clock ticks on construction too (that call sets the origin),
    // so the first event is one tick in, not zero. Rising and evenly spaced is
    // the property; the exact offset is the fake clock's, not the stream's.
    expect(events.map((e) => e.elapsedMs)).toEqual([10, 20, 30, 40]);
  });

  it('carries actualOutput on failures by default and on every command under capture', async () => {
    const transcript = fixture('title: T\n---\n> north\n[OK: contains "north"]\n');
    const { events, stream } = collect();
    const result = await runTranscript(transcript, echoEngine() as never, {});
    const passing = result.commands[0];

    stream.commandResult('/t/a.transcript', passing);
    stream.commandResult('/t/a.transcript', passing, true);
    stream.commandResult('/t/a.transcript', { ...passing, passed: false });

    const outputs = events.map((e) => (e.type === 'command-result' ? e.actualOutput : undefined));
    expect(outputs[0]).toBeUndefined();
    expect(outputs[1]).toBe(passing.actualOutput);
    expect(outputs[2]).toBe(passing.actualOutput);
  });

  it('carries the engine turn when the result reports one, and omits it when not', async () => {
    const transcript = fixture('title: T\n---\n> north\n[OK: contains "north"]\n');
    const { events, stream } = collect();
    const result = await runTranscript(transcript, echoEngine() as never, {});
    const passing = result.commands[0];

    stream.commandResult('/t/a.transcript', { ...passing, turn: 7 });
    stream.commandResult('/t/a.transcript', passing);

    const turns = events.map((e) => (e.type === 'command-result' ? e.turn : undefined));
    expect(turns[0]).toBe(7);
    expect(turns[1]).toBeUndefined();
    // The key is ABSENT, not present-and-undefined — the wire is NDJSON and
    // JSON.stringify would keep an explicit undefined key out either way, but
    // the guard-facing shape should already be clean.
    expect('turn' in (events[1] as object)).toBe(false);
  });

  it('carries the story ending when the result reports one, and omits it when not', async () => {
    const transcript = fixture('title: T\n---\n> north\n[OK: contains "north"]\n');
    const { events, stream } = collect();
    const result = await runTranscript(transcript, echoEngine() as never, {});
    const passing = result.commands[0];

    stream.commandResult('/t/a.transcript', { ...passing, ending: 'victory' });
    stream.commandResult('/t/a.transcript', passing);

    const endings = events.map((e) => (e.type === 'command-result' ? e.ending : undefined));
    expect(endings[0]).toBe('victory');
    expect(endings[1]).toBeUndefined();
    // Key-absence for the same reason as `turn` above.
    expect('ending' in (events[1] as object)).toBe(false);
  });

  it('carries the golden diff when the result reports one, and omits it when not', async () => {
    const transcript = fixture('title: T\n---\n> north\n[OK: contains "north"]\n');
    const { events, stream } = collect();
    const result = await runTranscript(transcript, echoEngine() as never, {});
    const passing = result.commands[0];
    const diff = { recorded: ['You north.'], actual: ['A wall.'] };

    stream.commandResult('/t/a.transcript', { ...passing, diff });
    stream.commandResult('/t/a.transcript', passing);

    expect(events[0].type === 'command-result' ? events[0].diff : undefined).toEqual(diff);
    // Key-absence for the same reason as `turn` above.
    expect('diff' in (events[1] as object)).toBe(false);
  });

  it('carries the world snapshot on command results and transcript starts, and omits it when not reported', async () => {
    const transcript = fixture('title: T\n---\n> north\n[OK: contains "north"]\n');
    const { events, stream } = collect();
    const result = await runTranscript(transcript, echoEngine() as never, {});
    const passing = result.commands[0];
    const world = { location: { name: 'Hall', token: 'hall' }, inventory: [] };

    stream.commandResult('/t/a.transcript', { ...passing, world });
    stream.commandResult('/t/a.transcript', passing);
    stream.transcriptStart('/t/a.transcript', 0, { world });
    stream.transcriptStart('/t/a.transcript', 1);

    expect(events[0].type === 'command-result' ? events[0].world : undefined).toEqual(world);
    expect('world' in (events[1] as object)).toBe(false);
    expect(events[2].type === 'transcript-start' ? events[2].world : undefined).toEqual(world);
    expect('world' in (events[3] as object)).toBe(false);
  });

  it('serializes one newline-terminated JSON object per event', () => {
    const { events, stream } = collect();
    stream.runStart('tests', 1);

    const line = ndjsonEventLine(events[0]);
    expect(line.endsWith('\n')).toBe(true);
    expect(line.trimEnd().includes('\n')).toBe(false);
    expect(JSON.parse(line)).toEqual(events[0]);
  });
});
