/**
 * rerecord-review.test.ts — a re-record carries its before/after per turn.
 *
 * R6 (Phase 5 slice 5b): a re-record is a review, not a blind overwrite.
 * Record mode never stops at a divergence, so when a recording already
 * exists, every captured turn is diffed against it and the divergence rides
 * that turn's PASSING result — while the new recording still lands on disk.
 * Derived from the Behavior Statement: diff present exactly when a prior
 * parseable recording has the same command at that index and the output
 * changed; first records, unparseable priors, command mismatches and
 * unchanged turns all say nothing.
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
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-rerecord-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(source: string, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

/** Echo engine whose per-command output `respond` can override run-to-run. */
function echoEngine(respond?: (cmd: string) => string | undefined) {
  const service = new EngineRandomService(42);
  return {
    executeCommand: (cmd: string) => respond?.(cmd) ?? `You ${cmd}.`,
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

const SOURCE = 'title: T\nstory: t\nseed: 42\n---\n> north\n\n> east\n';

describe('re-record carries the review (R6)', () => {
  it('a changed turn carries recorded-vs-actual on a PASSING result, and the new recording lands', async () => {
    const transcript = fixture(SOURCE);
    const goldenPath = path.join(dir, 'fixture.golden');
    const first = await runTranscript(transcript, echoEngine() as never, { bless: true });
    expect(first.status).toBe('passed');
    const before = fs.readFileSync(goldenPath, 'utf-8');

    const changed = echoEngine((cmd) => (cmd === 'east' ? 'A wall bars the way.' : undefined));
    const second = await runTranscript(transcript, changed as never, { bless: true });

    expect(second.status).toBe('passed');
    // The unchanged turn says nothing; the changed turn carries both sides.
    expect('diff' in second.commands[0]).toBe(false);
    expect(second.commands[1].passed).toBe(true);
    expect(second.commands[1].diff?.recorded).toEqual(['You east.']);
    expect(second.commands[1].diff?.actual).toEqual(['A wall bars the way.']);
    // The overwrite still happened — review never blocks the recording.
    const after = fs.readFileSync(goldenPath, 'utf-8');
    expect(after).not.toBe(before);
    expect(after).toContain('A wall bars the way.');
  });

  it('a first record has no prior recording and no turn says anything', async () => {
    const transcript = fixture(SOURCE);

    const result = await runTranscript(transcript, echoEngine() as never, { bless: true });

    expect(result.status).toBe('passed');
    expect(result.commands.every((c) => !('diff' in c))).toBe(true);
  });

  it('a command that changed in the transcript is not compared — the file itself shows that edit', async () => {
    const transcript = fixture(SOURCE);
    await runTranscript(transcript, echoEngine() as never, { bless: true });

    // Same file on disk, edited source: the second command is now `west`.
    const edited = fixture('title: T\nstory: t\nseed: 42\n---\n> north\n\n> west\n');
    const result = await runTranscript(edited, echoEngine() as never, { bless: true });

    expect(result.status).toBe('passed');
    expect('diff' in result.commands[0]).toBe(false);
    expect('diff' in result.commands[1]).toBe(false);
  });

  it('an unparseable prior recording has nothing comparable to say, and is replaced', async () => {
    const transcript = fixture(SOURCE);
    const goldenPath = path.join(dir, 'fixture.golden');
    fs.writeFileSync(goldenPath, 'not a recording at all\n', 'utf-8');

    const result = await runTranscript(transcript, echoEngine() as never, { bless: true });

    expect(result.status).toBe('passed');
    expect(result.commands.every((c) => !('diff' in c))).toBe(true);
    expect(fs.readFileSync(goldenPath, 'utf-8')).toContain('You north.');
  });
});
