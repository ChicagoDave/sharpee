/**
 * test-json.test.ts — ADR-277 D1/D3: `sharpee test --json` through the REAL
 * runTestCommand path (rule 13a — no stubs of the compile/load/run chain).
 *
 * Pins: the NDJSON record stream (validated via ide-protocol's own guards —
 * rule 8b, one declaration), the error-status record a validation-broken
 * transcript now gets instead of vanishing (with exit 1), the `.story`-file
 * argument resolving to its containing folder, the `--chain` walkthroughs/
 * scan with real state persistence across files, and the bare run never
 * touching walkthroughs/.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  isTestResultRecord,
  type CommandResultRecord,
  type RunEndRecord,
  type RunStartRecord,
  type TestResultRecord,
  type TranscriptEndRecord,
} from '@sharpee/ide-protocol';
import { runTestCommand } from '../src/commands/test.js';

const STORY = `story "Mini" by "T"
  id: mini
  version: 0.0.1

create the Den
  a room

  A small square den.

create the brass lamp
  in the Den

  It gleams dully.

create the player
  starts in the Den

  You.
`;

const PASSING_TRANSCRIPT = `title: Mini smoke
---

> look
[OK: contains "A small square den"]

> examine the brass lamp
[OK: contains "gleams dully"]
`;

// `> look` with no assertion and no expected output → validateTranscript error.
const BROKEN_TRANSCRIPT = `title: Mini broken
---

> look
`;

// NOTE: bare [OK] is exact-match-vs-expected-output (empty here → always
// fails); contains is the right presence assertion. ADR-277 Q4b's capture
// format assumed [OK] was presence-only — flagged for a Phase 4 correction.
const WT_01 = `title: Chain step 1
---

> take the brass lamp
[OK: contains "Taken"]
`;

const WT_02 = `title: Chain step 2
---

> inventory
[OK: contains "brass lamp"]
`;

let projectDir: string;

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'devkit-test-json-'));
  writeFileSync(join(projectDir, 'mini.story'), STORY);
  mkdirSync(join(projectDir, 'tests', 'transcripts'), { recursive: true });
  writeFileSync(join(projectDir, 'tests', 'transcripts', 'a-smoke.transcript'), PASSING_TRANSCRIPT);
  mkdirSync(join(projectDir, 'walkthroughs'), { recursive: true });
  writeFileSync(join(projectDir, 'walkthroughs', 'wt-01-take.transcript'), WT_01);
  writeFileSync(join(projectDir, 'walkthroughs', 'wt-02-carry.transcript'), WT_02);
});

afterAll(() => rmSync(projectDir, { recursive: true, force: true }));

/** Run runTestCommand capturing stdout (NDJSON) and stderr; muting console.log. */
async function run(args: string[]): Promise<{ code: number; records: TestResultRecord[]; err: string }> {
  let stdout = '';
  const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: unknown) => {
    stdout += String(chunk);
    return true;
  }) as never);
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const errs: string[] = [];
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    errs.push(a.map(String).join(' '));
  });
  try {
    const code = await runTestCommand(args);
    const records = stdout
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line): TestResultRecord => {
        const parsed: unknown = JSON.parse(line);
        expect(isTestResultRecord(parsed), `guard-valid record: ${line}`).toBe(true);
        return parsed as TestResultRecord;
      });
    return { code, records, err: errs.join('\n') };
  } finally {
    outSpy.mockRestore();
    logSpy.mockRestore();
    errSpy.mockRestore();
  }
}

const ofType = <T extends TestResultRecord>(records: TestResultRecord[], type: T['type']): T[] =>
  records.filter((r): r is T => r.type === type);

describe('sharpee test --json (real story, real runner)', () => {
  it('emits run-start → transcript records → run-end, all guard-valid, exit 0', async () => {
    const { code, records } = await run(['--json', projectDir]);
    expect(code).toBe(0);
    const first = records[0] as RunStartRecord;
    expect(first.type).toBe('run-start');
    expect(first.mode).toBe('tests');
    expect(first.transcriptCount).toBe(1);
    const last = records[records.length - 1] as RunEndRecord;
    expect(last.type).toBe('run-end');
    expect(last.exitCode).toBe(0);
    expect(last.totalErrors).toBe(0);
    const ends = ofType<TranscriptEndRecord>(records, 'transcript-end');
    expect(ends).toHaveLength(1);
    expect(ends[0].status).toBe('passed');
    const commands = ofType<CommandResultRecord>(records, 'command-result');
    expect(commands.map((c) => c.input)).toEqual(['look', 'examine the brass lamp']);
    // Click-through carriage: `> look` sits on line 4 of the transcript file.
    expect(commands[0].line).toBe(4);
    expect(commands[0].file).toEqual(ends[0].file);
  });

  it('a validation-broken transcript is an error record with exit 1 — it never vanishes', async () => {
    const broken = join(projectDir, 'tests', 'transcripts', 'b-broken.transcript');
    writeFileSync(broken, BROKEN_TRANSCRIPT);
    try {
      const { code, records, err } = await run(['--json', projectDir]);
      expect(code).toBe(1);
      const ends = ofType<TranscriptEndRecord>(records, 'transcript-end');
      expect(ends).toHaveLength(2); // both transcripts present — the old code dropped one
      const errorEnd = ends.find((e) => e.status === 'error');
      expect(errorEnd).toBeDefined();
      expect(errorEnd!.file).toBe(broken);
      expect(errorEnd!.errorMessage).toContain('validation failed');
      expect(ends.some((e) => e.status === 'passed')).toBe(true);
      const last = records[records.length - 1] as RunEndRecord;
      expect(last.totalErrors).toBe(1);
      expect(last.exitCode).toBe(1);
      expect(err).toContain('Errors in');
    } finally {
      rmSync(broken);
    }
  });

  it('accepts a .story FILE argument, resolving the containing folder (D1)', async () => {
    const viaFile = await run(['--json', join(projectDir, 'mini.story')]);
    const viaDir = await run(['--json', projectDir]);
    expect(viaFile.code).toBe(0);
    const files = (r: typeof viaFile) =>
      ofType<TranscriptEndRecord>(r.records, 'transcript-end').map((e) => e.file);
    expect(files(viaFile)).toEqual(files(viaDir));
  });
});

describe('sharpee test --chain (walkthroughs/, D3)', () => {
  it('with no file args runs walkthroughs/ in filename order with state persisting', async () => {
    const { code, records } = await run(['--json', '--chain', projectDir]);
    expect(code).toBe(0);
    const start = records[0] as RunStartRecord;
    expect(start.mode).toBe('chain');
    const ends = ofType<TranscriptEndRecord>(records, 'transcript-end');
    expect(ends.map((e) => e.file)).toEqual([
      join(projectDir, 'walkthroughs', 'wt-01-take.transcript'),
      join(projectDir, 'walkthroughs', 'wt-02-carry.transcript'),
    ]);
    // wt-02's inventory assertion only passes if wt-01's take persisted.
    expect(ends.map((e) => e.status)).toEqual(['passed', 'passed']);
  });

  it('a bare run never touches walkthroughs/', async () => {
    const only = mkdtempSync(join(tmpdir(), 'devkit-wt-only-'));
    try {
      writeFileSync(join(only, 'mini.story'), STORY);
      mkdirSync(join(only, 'walkthroughs'), { recursive: true });
      writeFileSync(join(only, 'walkthroughs', 'wt-01-take.transcript'), WT_01);
      const { code, err } = await run([only]);
      expect(code).toBe(2); // no tests/ → nothing found; walkthroughs/ not scanned
      expect(err).toContain('no transcript files found');
    } finally {
      rmSync(only, { recursive: true, force: true });
    }
  });
});
